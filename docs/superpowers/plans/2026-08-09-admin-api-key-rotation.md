# Safe Admin API Key Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an administrator securely recover or rotate an API key from Login or Settings while atomically replacing the server key and persisting the replacement only after verification succeeds.

**Architecture:** The website gains a minimal `pg` transaction runner, and the init route performs active-key revocation plus replacement insert inside one callback. The admin app adds narrowly typed rotation/verification helpers and a shared in-memory-only rotation component used by both Login and Settings; its parent persists the key only after the component has verified it.

**Tech Stack:** Next.js 16 route handlers, `pg`, TypeScript, React 19, Vite 6, Electron 33, Vitest, jsdom, React Testing Library.

## Global Constraints

- Work only in the dedicated Git worktree; do not modify `main` directly.
- Do not edit `.env`, `.env.*`, `auth/`, `payments/`, `secrets/`, or `credentials/`.
- Do not push, merge, deploy, mutate production, or perform P2 work.
- `ADMIN_INIT_TOKEN` is typed manually for every new rotation request, held only in React memory, never prefilled, never logged, and cleared on both success and failure.
- A new rotation request is `POST /api/admin/init` with body `{ "force": true }` and header `X-Admin-Init-Token`; the token never appears in a URL or request body.
- The forced server path must revoke active keys and insert exactly one replacement in one database transaction. A failure rolls back so the old key remains valid.
- Verify the candidate through `/api/admin/verify` before any `localStorage`, profile, or visible-current-key update. A verify transport failure keeps the candidate only in current component memory and offers retry.
- Rotation UI must prevent duplicate submission and must not expose token values, full API keys, raw HTTP bodies, or raw server exception text.
- Preserve the existing API-key and profile `localStorage` behavior after successful verification. Do not add a credential vault or schema migration.
- Each task is independent enough for one fresh implementation subagent and ends with its own tests and commit.

---

## Files and interfaces

| Path | Responsibility |
| --- | --- |
| `website/package.json` | Add only the website test command and Vitest development dependency. |
| `website/vitest.config.ts` | Configure Node tests and the existing `@` source alias. |
| `website/src/db/index.ts` | Export a testable transaction runner while retaining `query()`. |
| `website/src/db/index.test.ts` | Test commit and rollback/release behavior with a fake `pg` client. |
| `website/src/app/api/admin/init/route.ts` | Use the transaction runner, retain init-token authorization, and return only safe errors. |
| `website/src/app/api/admin/init/route.test.ts` | Test forced atomic order, authorization, and safe failure response. |
| `admin-app/package.json` | Add only the admin test command and required test development dependencies. |
| `admin-app/vitest.config.ts` | Configure jsdom tests. |
| `admin-app/src/lib/api.ts` | Add rotation-only request and tri-state verification helpers without changing normal key helpers. |
| `admin-app/src/lib/api.test.ts` | Test init headers/body and verification result classification. |
| `admin-app/src/components/AdminKeyRotation.tsx` | Own token/candidate/retry/duplicate-submit UI state. |
| `admin-app/src/components/AdminKeyRotation.test.tsx` | Test clear, retry, and verify-before-callback behavior. |
| `admin-app/src/pages/Login.tsx` | Add the recovery/rotation entry and persist/login callback. |
| `admin-app/src/pages/Login.test.tsx` | Test successful rotation invokes login only after verification. |
| `admin-app/src/pages/Settings.tsx` | Keep the Settings entry and persist only verified replacement keys. |
| `admin-app/src/pages/Settings.test.tsx` | Test the Settings entry and delayed stored/visible key update. |
| `admin-app/src/lib/i18n-admin.ts` | Add neutral Traditional Chinese and English labels/messages used only by the rotation UI. |

```ts
// website/src/db/index.ts
export interface TransactionClient {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>
  release(): void
}
export type TransactionQuery = <T>(text: string, params?: unknown[]) => Promise<T[]>
export type TransactionWork<T> = (query: TransactionQuery) => Promise<T>
export function createTransactionRunner(
  acquireClient: () => Promise<TransactionClient>,
): <T>(work: TransactionWork<T>) => Promise<T>
export const transaction: <T>(work: TransactionWork<T>) => Promise<T>

// admin-app/src/lib/api.ts
export type RotationVerification = 'verified' | 'rejected' | 'unreachable'
export async function rotateAdminApiKey(serverUrl: string, initToken: string): Promise<string>
export async function verifyRotatedApiKey(
  key: string,
  serverUrl: string,
): Promise<RotationVerification>

// admin-app/src/components/AdminKeyRotation.tsx
export interface AdminKeyRotationProps {
  serverUrl: string
  onVerified: (rawKey: string) => Promise<void>
  onClose: () => void
}
```

### Task 1: Establish package-local Vitest support

**Files:**
- Modify: `website/package.json`
- Create: `website/vitest.config.ts`
- Modify: `admin-app/package.json`
- Create: `admin-app/vitest.config.ts`

**Interfaces:**
- Consumes: existing package-local `pnpm-lock.yaml`, TypeScript configuration, and the website `@` import alias.
- Produces: `pnpm --dir website test` for Node route/unit tests and `pnpm --dir admin-app test` for jsdom component/unit tests.

- [ ] **Step 1: Write a deliberately failing smoke test in each package before adding the runner**

Create `website/src/test-runner.smoke.test.ts` and `admin-app/src/test-runner.smoke.test.ts` with these exact contents:

```ts
import { expect, test } from 'vitest'

test('Vitest is configured', () => {
  expect(true).toBe(true)
})
```

- [ ] **Step 2: Run each new test to verify it fails because the runner is absent**

Run: `pnpm --dir website test --run src/test-runner.smoke.test.ts`

Expected: command fails because `website/package.json` has no `test` script.

Run: `pnpm --dir admin-app test --run src/test-runner.smoke.test.ts`

Expected: command fails because `admin-app/package.json` has no `test` script.

- [ ] **Step 3: Add the minimum runner configuration and dependencies**

In `website/package.json`, add script `"test": "vitest run"` and dev dependency `"vitest"`. Create `website/vitest.config.ts`:

```ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { environment: 'node' },
})
```

In `admin-app/package.json`, add script `"test": "vitest run"` and dev dependencies `vitest`, `jsdom`, `@testing-library/react`, and `@testing-library/user-event`. Create `admin-app/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'jsdom', clearMocks: true, restoreMocks: true },
})
```

Run `pnpm --dir website add -D vitest` and `pnpm --dir admin-app add -D vitest jsdom @testing-library/react @testing-library/user-event`; accept only the corresponding package manifests and lockfiles as dependency-generated changes.

- [ ] **Step 4: Run both test commands to verify they pass**

Run: `pnpm --dir website test --run src/test-runner.smoke.test.ts && pnpm --dir admin-app test --run src/test-runner.smoke.test.ts`

Expected: both one-test suites pass. Remove the two temporary smoke tests immediately after this command; later tasks add the real tests.

- [ ] **Step 5: Commit the test foundation**

```bash
git add website/package.json website/pnpm-lock.yaml website/vitest.config.ts admin-app/package.json admin-app/pnpm-lock.yaml admin-app/vitest.config.ts
git commit -m "test: add rotation test runners"
```

### Task 2: Add an atomic, testable website transaction runner

**Files:**
- Modify: `website/src/db/index.ts`
- Create: `website/src/db/index.test.ts`

**Interfaces:**
- Consumes: `getPool()` and the existing `query<T>()` contract.
- Produces: `createTransactionRunner()` and `transaction()` as declared in the interface table; subsequent route work receives one `TransactionQuery` for all rotation SQL.

- [ ] **Step 1: Write failing commit and rollback tests**

Create `website/src/db/index.test.ts`. Supply a fake client that records commands and make the two assertions below:

```ts
it('commits work on one client and releases it', async () => {
  const client = fakeClient([['UPDATE api_keys'], ['INSERT INTO api_keys']])
  const run = createTransactionRunner(async () => client)
  await run(async query => {
    await query('UPDATE api_keys SET revoked = true')
    await query('INSERT INTO api_keys DEFAULT VALUES')
  })
  expect(client.calls).toEqual(['BEGIN', 'UPDATE api_keys SET revoked = true', 'INSERT INTO api_keys DEFAULT VALUES', 'COMMIT', 'RELEASE'])
})

it('rolls back and releases when work rejects', async () => {
  const client = fakeClient([new Error('insert failed')])
  const run = createTransactionRunner(async () => client)
  await expect(run(async query => query('INSERT INTO api_keys DEFAULT VALUES'))).rejects.toThrow('insert failed')
  expect(client.calls).toEqual(['BEGIN', 'INSERT INTO api_keys DEFAULT VALUES', 'ROLLBACK', 'RELEASE'])
})
```

- [ ] **Step 2: Run the website DB test to verify it fails**

Run: `pnpm --dir website test --run src/db/index.test.ts`

Expected: FAIL because `createTransactionRunner` is not exported.

- [ ] **Step 3: Implement the smallest transaction runner**

Add the structural types and helper below to `website/src/db/index.ts`; keep the existing `query<T>()` unchanged for non-transaction callers:

```ts
export function createTransactionRunner(acquireClient: () => Promise<TransactionClient>) {
  return async function runTransaction<T>(work: TransactionWork<T>): Promise<T> {
    const client = await acquireClient()
    try {
      await client.query('BEGIN')
      const result = await work(async <Row>(text, params) => {
        const response = await client.query(text, params)
        return response.rows as Row[]
      })
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

export const transaction = createTransactionRunner(() => getPool().connect())
```

- [ ] **Step 4: Run the DB tests to verify green behavior**

Run: `pnpm --dir website test --run src/db/index.test.ts`

Expected: both tests pass, proving exactly one commit on success and rollback/release on failure.

- [ ] **Step 5: Commit the transaction helper**

```bash
git add website/src/db/index.ts website/src/db/index.test.ts
git commit -m "feat: add atomic database transaction helper"
```

### Task 3: Make forced admin init atomic and safe to expose to the client

**Files:**
- Modify: `website/src/app/api/admin/init/route.ts`
- Create: `website/src/app/api/admin/init/route.test.ts`

**Interfaces:**
- Consumes: `transaction(work)`, `generateApiKey(label)`, the existing constant-time init-token comparison, and `corsResponse`.
- Produces: unchanged successful `{ raw, label, warning }` response; forced requests use one transaction callback; database failures return `500 { error: "unable to initialize api key" }` without exception text.

- [ ] **Step 1: Write failing route tests for authorization, atomic SQL order, and safe rollback response**

Mock `@/db` to capture the `transaction` callback and provide a transaction query spy, and mock `@/lib/api-key` so its generated raw value is fixed. Add these cases to `website/src/app/api/admin/init/route.test.ts`:

```ts
it('requires the configured init token before entering the transaction', async () => {
  process.env.ADMIN_INIT_TOKEN = 'server-token'
  const response = await POST(new Request('http://test/api/admin/init', { method: 'POST', body: JSON.stringify({ force: true }) }))
  expect(response.status).toBe(401)
  expect(transaction).not.toHaveBeenCalled()
})

it('revokes then inserts inside one forced transaction', async () => {
  process.env.ADMIN_INIT_TOKEN = 'server-token'
  const response = await POST(requestWithToken('server-token', { force: true }))
  expect(response.status).toBe(200)
  expect(transactionQueries).toEqual([
    'SELECT id FROM api_keys WHERE revoked = false LIMIT 1',
    'UPDATE api_keys SET revoked = true WHERE revoked = false',
    'INSERT INTO api_keys (key_hash, key_prefix, label) VALUES ($1, $2, $3)',
  ])
})

it('returns a generic error when the transaction rejects', async () => {
  transaction.mockRejectedValueOnce(new Error('database connection password=secret'))
  const response = await POST(requestWithToken('server-token', { force: true }))
  expect(response.status).toBe(500)
  await expect(response.json()).resolves.toEqual({ error: 'unable to initialize api key' })
})
```

- [ ] **Step 2: Run the init-route test to verify it fails**

Run: `pnpm --dir website test --run src/app/api/admin/init/route.test.ts`

Expected: FAIL because the route imports and calls standalone `query()` and serializes `String(e)`.

- [ ] **Step 3: Route all key-state changes through the transaction callback**

Replace the standalone active-key query, forced update, and insert with one `await transaction(async query => { ... })` callback. Perform the active-key `SELECT` and forced `UPDATE` with the callback's `query`; call `generateApiKey(label)` and insert with that same callback. Preserve `400 { error: 'api key already exists' }` for a non-forced existing key. In the outer catch, log only `Init error` and return exactly:

```ts
return corsResponse({ error: 'unable to initialize api key' }, { status: 500 })
```

Do not log `req.headers`, the parsed body, raw key, or caught exception detail.

- [ ] **Step 4: Run route and transaction tests to verify green behavior**

Run: `pnpm --dir website test --run src/db/index.test.ts src/app/api/admin/init/route.test.ts`

Expected: all transaction, authorization, ordering, and generic-error tests pass.

- [ ] **Step 5: Commit the atomic init route**

```bash
git add website/src/app/api/admin/init/route.ts website/src/app/api/admin/init/route.test.ts
git commit -m "fix: rotate admin keys atomically"
```

### Task 4: Add safe client rotation and verification helpers

**Files:**
- Modify: `admin-app/src/lib/api.ts`
- Create: `admin-app/src/lib/api.test.ts`

**Interfaces:**
- Consumes: existing `platformFetch`, `absUrl`, `getServerUrl`, and normal `verifyApiKey` behavior.
- Produces: `rotateAdminApiKey()` for new forced requests and `verifyRotatedApiKey()` returning `RotationVerification`; neither function writes local storage.

- [ ] **Step 1: Write failing client helper tests**

Mock browser `fetch` and localStorage. In `admin-app/src/lib/api.test.ts`, assert the request contract and the tri-state result:

```ts
it('sends force and the init token only in the header', async () => {
  fetchMock.mockResolvedValue(jsonResponse({ raw: 'pw_candidate_checksum' }))
  await expect(rotateAdminApiKey('https://admin.example', 'typed-token')).resolves.toBe('pw_candidate_checksum')
  expect(fetchMock).toHaveBeenCalledWith('https://admin.example/api/admin/init', expect.objectContaining({
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Init-Token': 'typed-token' },
    body: JSON.stringify({ force: true }),
  }))
})

it.each([
  [jsonResponse({ valid: true }), 'verified'],
  [new Response(JSON.stringify({ valid: false }), { status: 401 }), 'rejected'],
  [new TypeError('network down'), 'unreachable'],
])('classifies rotated-key verification as %s', async (reply, expected) => {
  fetchMock.mockImplementationOnce(() => reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply))
  await expect(verifyRotatedApiKey('pw_candidate_checksum', 'https://admin.example')).resolves.toBe(expected)
})
```

- [ ] **Step 2: Run the client helper test to verify it fails**

Run: `pnpm --dir admin-app test --run src/lib/api.test.ts`

Expected: FAIL because `rotateAdminApiKey` and `verifyRotatedApiKey` do not exist.

- [ ] **Step 3: Implement the two rotation-only helpers**

Add `rotateAdminApiKey(serverUrl, initToken)` that rejects an empty token, invokes `/api/admin/init` with the exact `POST`, JSON body, and headers above, verifies that `data.raw` is a non-empty string, and otherwise throws `new Error('rotation-request-failed')`. It must not call `setApiKey`, `setServerUrl`, `addProfile`, or `console`.

Add `verifyRotatedApiKey(key, serverUrl)` using a status-preserving request path: `200` plus `{ valid: true }` returns `'verified'`; `401` returns `'rejected'`; malformed payloads, other HTTP failures, and transport exceptions return `'unreachable'`. It must not surface a response body or exception message. Keep the existing boolean `verifyApiKey` unchanged for normal session/login checks.

- [ ] **Step 4: Run the client helper test to verify green behavior**

Run: `pnpm --dir admin-app test --run src/lib/api.test.ts`

Expected: all header/body and tri-state verification cases pass with no localStorage writes.

- [ ] **Step 5: Commit the client API boundary**

```bash
git add admin-app/src/lib/api.ts admin-app/src/lib/api.test.ts
git commit -m "feat: add safe admin key rotation client"
```

### Task 5: Build one memory-only rotation component and connect Login and Settings

**Files:**
- Create: `admin-app/src/components/AdminKeyRotation.tsx`
- Create: `admin-app/src/components/AdminKeyRotation.test.tsx`
- Modify: `admin-app/src/pages/Login.tsx`
- Create: `admin-app/src/pages/Login.test.tsx`
- Modify: `admin-app/src/pages/Settings.tsx`
- Create: `admin-app/src/pages/Settings.test.tsx`
- Modify: `admin-app/src/lib/i18n-admin.ts`

**Interfaces:**
- Consumes: `rotateAdminApiKey`, `verifyRotatedApiKey`, `AdminKeyRotationProps`, existing Login profile helpers, Settings key/profile helpers, and localized copy.
- Produces: Login recovery/rotation that calls `onLogin` only after verified persistence; Settings rotation that changes neither stored nor displayed key before verification.

- [ ] **Step 1: Write failing component and entry-point tests**

Mock the two rotation helpers. In `AdminKeyRotation.test.tsx`, render the component with a spy `onVerified` and cover these exact assertions:

```tsx
it('clears the typed token and persists only after verification', async () => {
  rotateAdminApiKey.mockResolvedValueOnce('pw_new_checksum')
  verifyRotatedApiKey.mockResolvedValueOnce('verified')
  render(<AdminKeyRotation serverUrl="https://admin.example" onVerified={onVerified} onClose={onClose} />)
  await user.type(screen.getByLabelText('Admin init token'), 'typed-token')
  await user.click(screen.getByRole('button', { name: 'Rotate admin key' }))
  expect(screen.getByLabelText('Admin init token')).toHaveValue('')
  await waitFor(() => expect(onVerified).toHaveBeenCalledWith('pw_new_checksum'))
})

it('keeps a candidate only in memory and retries verification without a second rotation', async () => {
  rotateAdminApiKey.mockResolvedValueOnce('pw_new_checksum')
  verifyRotatedApiKey.mockResolvedValueOnce('unreachable').mockResolvedValueOnce('verified')
  render(<AdminKeyRotation serverUrl="https://admin.example" onVerified={onVerified} onClose={onClose} />)
  await user.type(screen.getByLabelText('Admin init token'), 'typed-token')
  await user.click(screen.getByRole('button', { name: 'Rotate admin key' }))
  await user.click(screen.getByRole('button', { name: 'Retry verification' }))
  expect(rotateAdminApiKey).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(onVerified).toHaveBeenCalledWith('pw_new_checksum'))
})
```

In `Login.test.tsx`, assert that the recovery entry opens the component, then that `setApiKey`, profile persistence, and `onLogin` happen only after mocked verification resolves `'verified'`. In `Settings.test.tsx`, seed `localStorage.api_key = 'pw_old_checksum'`, open the retained Settings entry, hold verification pending, and assert the rendered/stored key remains old until resolving `'verified'`; then assert it becomes the new key. Also assert a second click while either request is pending calls the rotation helper once.

- [ ] **Step 2: Run component and page tests to verify they fail**

Run: `pnpm --dir admin-app test --run src/components/AdminKeyRotation.test.tsx src/pages/Login.test.tsx src/pages/Settings.test.tsx`

Expected: FAIL because `AdminKeyRotation` and the recovery entry do not exist; Settings still calls `initApiKey(url, true)` directly.

- [ ] **Step 3: Implement the shared component and both thin integrations**

Implement `AdminKeyRotation` with `useState` for token, submitting state, and retryable status; keep the raw candidate exclusively in `useRef<string | null>`. Make the token input `type="password"`, label it `Admin init token`, use `autoComplete="off"`, and make a non-empty token mandatory for a new rotation. Disable submit, Retry, and Close while an I/O action is pending.

The submit handler sets pending before I/O, calls `rotateAdminApiKey(serverUrl, initToken)`, stores the returned raw candidate in the ref, and clears the token in `finally`. It immediately verifies the candidate. For `'verified'`, it awaits `onVerified(candidate)`, clears the ref, and calls `onClose`. For `'unreachable'`, it keeps the ref and renders only the generic `Retry verification` action. For `'rejected'` or request failure, it clears the ref and renders a fixed generic error without interpolating an exception, token, or key. The Retry handler calls only `verifyRotatedApiKey` with the ref candidate.

In Login, add a recovery/rotation mode and render the component. Its `onVerified` callback performs the current successful-login storage sequence (`setServerUrl`, `setApiKey`, `saveAsProfile`) and then invokes `onLogin`. In Settings, replace direct `handleRegen` behavior with opening the component. Its `onVerified` callback updates the existing persisted key/profile and calls `setKeyState(rawKey)` only after persistence succeeds. Keep the existing normal manual key/save form unchanged. Add exact neutral localized strings for both supported locales; no message includes server error text, token text, or raw key text.

- [ ] **Step 4: Run all tests, builds, and the local Electron smoke to verify green behavior**

Run: `pnpm --dir website test && pnpm --dir website build && pnpm --dir admin-app test && pnpm --dir admin-app lint && pnpm --dir admin-app build && git diff --check`

Expected: all new API/component/Login/Settings tests pass; `tsc --noEmit`, the website build, and the admin package build exit zero; `git diff --check` prints nothing. The tests prove header forwarding, verify-before-store, Login auto-login, Settings delayed update, retry without a second rotation, duplicate-submit prevention, and token clearing.

After the package build produces its ignored release output, launch this local smoke check and close the window manually:

```bash
pnpm --dir admin-app exec electron .
```

Expected: one desktop window opens from the built `dist`/`dist-electron` assets and reaches the login/configuration screen without a renderer crash. Do not enter a real production token or API key. Then have a fresh-context verifier read the committed diff and test evidence against the Global Constraints, specifically trying to disprove atomic rollback, token clearing, and verify-before-store.

- [ ] **Step 5: Commit the UI flow**

```bash
git add admin-app/src/components/AdminKeyRotation.tsx admin-app/src/components/AdminKeyRotation.test.tsx admin-app/src/pages/Login.tsx admin-app/src/pages/Login.test.tsx admin-app/src/pages/Settings.tsx admin-app/src/pages/Settings.test.tsx admin-app/src/lib/i18n-admin.ts
git commit -m "feat: add verified admin key rotation flow"
```

## Plan self-review

- **Spec coverage:** Tasks 2–3 cover one-client commit/rollback and safe server responses; Task 4 covers the exact forced header/body and tri-state verify result; Task 5 covers Login, Settings, in-memory candidate retry, token clearing, duplicate prevention, delayed storage, automatic login, website build, admin package build, and the local Electron smoke.
- **Placeholder scan:** This plan contains no deferred implementation marker, unspecified test, or implicit error-handling instruction. Every required interface, command, expected failing state, green check, and commit scope is defined above.
- **Type consistency:** `TransactionQuery`, `transaction`, `RotationVerification`, `rotateAdminApiKey`, `verifyRotatedApiKey`, and `AdminKeyRotationProps` use the same names and signatures in the interface table and their consuming tasks.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-09-admin-api-key-rotation.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, with checkpoints for review.

Choose an approach before modifying source code.
