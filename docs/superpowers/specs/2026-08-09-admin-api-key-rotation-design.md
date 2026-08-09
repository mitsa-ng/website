# Safe Admin API Key Rotation Design

## Goal

Allow an administrator who knows the deployment's `ADMIN_INIT_TOKEN` to recover or rotate the admin API key from the desktop admin app, without ever persisting that token and without replacing a locally stored key until the replacement has been verified.

## Scope and invariants

- The Login screen adds a **Recover / rotate admin key** entry point. The Settings screen keeps a rotation entry point for future use.
- Every new rotation request requires the operator to manually type `ADMIN_INIT_TOKEN`. The input is a password field held only in React component state. It is never read from, written to, or prefilled from `localStorage`; it is never logged; and it is cleared after both successful and failed submission attempts.
- A rotation request is `POST /api/admin/init` with JSON body `{ "force": true }` and header `X-Admin-Init-Token: <typed token>`.
- Existing API-key persistence remains unchanged: the verified API key and existing profile records continue to use the current `localStorage` behavior. This feature does not introduce a credential vault or change other credential storage.
- No `.env` file, production system, push, merge, deployment, database migration, or P2 work is in scope.

## Existing integration points

The desktop client already has `initApiKey(serverUrl, force, initToken)`, key/server storage helpers, and `POST /api/admin/verify`. `POST /api/admin/init` already checks `ADMIN_INIT_TOKEN` when the environment variable is configured, but its forced path currently revokes rows and inserts a replacement in separate queries. `api_keys` already contains `key_hash`, `key_prefix`, `label`, and `revoked`, so rotation needs no schema change.

## Architecture

### Server-side atomic rotation

`website/src/db/index.ts` gains a small transaction runner that acquires one `pg` client, issues `BEGIN`, provides a query function bound to that client, and then issues exactly one of `COMMIT` or `ROLLBACK` before releasing the client. It is the only new database abstraction; normal `query()` behavior remains unchanged.

The init route keeps its established authentication and response shape. After validating the optional deployment token and parsing the request, it runs the active-key check, any forced revocation, and replacement insert through one transaction callback:

1. Read active keys through the transaction-scoped query.
2. If active keys exist and `force` is false, finish the callback with the existing `400 { error: "api key already exists" }` outcome and do not insert.
3. If `force` is true, mark every currently active key revoked through that same transaction-scoped query.
4. Call the existing `generateApiKey(label)` once and insert its hash, prefix, and label through the same callback.
5. Commit only after the insert succeeds. If revocation, generation, or insertion fails, roll back; the prior active key remains active.

The route returns the raw replacement key only in the successful response body, as it does today. Database exceptions return a stable generic error body and never serialize exception text. The route must not log request headers, request bodies, the raw key, or the init token.

### Client rotation state machine

Both entry points render one shared `AdminKeyRotation` UI component. Its state is intentionally component-local:

| State | Stored values | User action | Result |
| --- | --- | --- | --- |
| `ready` | empty token, no candidate key | Type token and submit | disables controls and requests a new key |
| `requesting` | typed token | request in flight | duplicate submits are disabled |
| `verifying` | candidate raw key in a React ref only; token already cleared | automatic verify | no `localStorage` write yet |
| `retryable` | candidate raw key in the same React ref only | Retry verification | reuses candidate; never asks the API to rotate again |
| `ready` after success | no candidate, empty token | completion callback | verified key is persisted and the app logs in or stays logged in |
| `ready` after non-retryable failure or close | no candidate, empty token | begin again | user may manually submit a new token |

The sequence is fixed:

1. The component rejects an empty token locally and sets `requesting` before starting I/O.
2. It calls a dedicated client helper that always sends `force: true` and `X-Admin-Init-Token`.
3. In a `finally` block, it clears the token input regardless of request outcome.
4. Once a raw candidate arrives, it remains in an in-memory ref only and the component calls `POST /api/admin/verify` with `{ key: candidate }`.
5. Only a successful verification calls the supplied persistence callback. Login's callback saves the existing server URL/API key/profile and invokes its existing `onLogin`; Settings' callback saves the existing key/profile and keeps the authenticated view.
6. A verify transport failure keeps the candidate in memory, displays a generic retry affordance, and does not write it to storage. Closing the component drops that in-memory candidate; recovery then requires a new manually entered init token and new rotation request.
7. A rejected verification, malformed success payload, or rotation request failure discards the candidate and displays a generic safe message.

The reusable helper distinguishes only `verified`, `rejected`, and `unreachable` for the rotation flow. It never passes an HTTP response body or an exception message to the UI. Existing boolean `verifyApiKey` behavior remains available for the normal login/session checks.

### UI entry points

Login offers the recovery/rotation mode next to normal key entry. It accepts server URL plus a password-style token input and uses the shared component. A successful verified key runs the existing login callback, so `App.tsx` changes `authenticated` to true without requiring an application restart.

Settings retains its key management location, but replaces the current unauthenticated `handleRegen` shortcut with the shared rotation UI. It must collect the token for every new rotation, and must not overwrite `api_key`, active profile data, or the visible key value until verification succeeds. The existing Settings and Login flows retain their existing normal manual-key behavior.

No screen renders an init token or a full API key in status text, alert text, console output, or server-detail error text. Status copy is generic, for example: “Unable to rotate the admin key. Check the token and try again.” and “Unable to verify the new key. Retry verification or close and rotate again.”

## Interfaces

The implementation introduces these named interfaces and keeps all values local to their responsible layer:

```ts
// website/src/db/index.ts
export type TransactionQuery = <T>(text: string, params?: unknown[]) => Promise<T[]>
export type TransactionWork<T> = (query: TransactionQuery) => Promise<T>
export function createTransactionRunner(acquireClient: () => Promise<TransactionClient>): <T>(work: TransactionWork<T>) => Promise<T>
export const transaction: <T>(work: TransactionWork<T>) => Promise<T>

// admin-app/src/lib/api.ts
export type RotationVerification = 'verified' | 'rejected' | 'unreachable'
export async function rotateAdminApiKey(serverUrl: string, initToken: string): Promise<string>
export async function verifyRotatedApiKey(key: string, serverUrl: string): Promise<RotationVerification>

// admin-app/src/components/AdminKeyRotation.tsx
export interface AdminKeyRotationProps {
  serverUrl: string
  onVerified: (rawKey: string) => Promise<void>
  onClose: () => void
}
```

`TransactionClient` is a narrow structural type containing `query(...)` and `release()`, matching the `pg` client methods used by the helper. It is exported only to make the transaction helper unit-testable with a fake client; production callers use `transaction`.

## Error handling and security

- The init route uses the existing constant-time comparison for `ADMIN_INIT_TOKEN`; an absent or wrong header receives only `401 { error: "unauthorized" }`.
- The rotation client always sends the token in the header, not JSON. It constructs no URL containing the token.
- The UI maps all rotation request failures to a fixed generic message. It does not interpolate `Error.message`, response text, raw key, or token.
- The candidate key is never displayed by this workflow. It exists only in the React ref while verify is in progress or retryable.
- The submit, retry, and close controls enforce one in-flight network action. Repeated clicking cannot issue concurrent rotate requests.
- The server transaction preserves the previous active key if the replacement insert fails. It does not add a grace period, retain two active keys, create audit rows, or alter scrypt/key-generation behavior.
- The feature does not alter `ADMIN_INIT_TOKEN` configuration. A server with no configured token retains the existing route semantics, while the client still requires a manually supplied token for the recovery UI.

## Test design

No test framework currently exists in either package. The implementation adds the minimum package-local Vitest setup:

- `website`: `vitest` in `devDependencies`, a `test` script, and `vitest.config.ts` with the existing `@` alias and Node environment. Route tests mock the database/key generator and test transaction order plus route header behavior.
- `admin-app`: `vitest`, `jsdom`, `@testing-library/react`, and `@testing-library/user-event` in `devDependencies`, a `test` script, and `vitest.config.ts` with jsdom. Component tests use mocked API helpers and `localStorage`.

Required evidence is:

| Behavior | Test evidence |
| --- | --- |
| Transaction commit | fake client observes `BEGIN`, transactional revoke/insert work, `COMMIT`, and `release` |
| Transaction rollback | injected insert failure observes `ROLLBACK` and `release`, not `COMMIT`; caller sees rejection |
| Route header and force payload | client helper sends `POST /api/admin/init`, `Content-Type`, `X-Admin-Init-Token`, and body `{ "force": true }` |
| Atomic route path | forced route passes revoke then insert into one transaction callback; an insert rejection returns generic 500 and no raw DB error |
| Verify before store | key remains absent/old until mocked `verifyRotatedApiKey` returns `verified` |
| Automatic login | Login invokes `onLogin` only after persistence callback receives the verified key |
| Settings entry | Settings opens the shared rotation UI and only updates its displayed/stored key after verification |
| Token clearing and retry | token input clears after request success/failure; verify transport failure retains only in-memory candidate and Retry calls verify without another rotate request |
| Packaging | website build, admin typecheck/package build, and a built Electron launch smoke pass |

## Acceptance criteria

The completed change has one atomic server rotation path, a token-required recovery/rotation UI in Login and Settings, verify-before-persist ordering, safe retry behavior, and all required unit/component/build/smoke evidence. It leaves API-key `localStorage` behavior otherwise intact and introduces no source changes outside the documented implementation files, test configuration, tests, and package lockfiles required by the new test dependencies.
