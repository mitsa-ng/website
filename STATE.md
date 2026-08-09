# Loop State — My Project

Last run: 2026-08-10 (L2 admin key rotation final-review fix wave)

## High Priority (loop is acting or waiting on human)

- **Admin key rotation awaiting integration approval**: branch `codex/admin-key-rotation` in worktree `/Users/mac/Documents/personal-web-key-rotation`, HEAD `6e0d532`. Implemented, reviewed, tested, NOT pushed, NOT merged, NOT deployed.
- **Production handoff pending**: merge/push/deploy approval is required before rotating the production key or replacing `/Applications/Personal Web Admin.app`. Rotation also requires the existing `ADMIN_INIT_TOKEN`; never persist or echo it.
- **P2 awaiting review/merge separately**: branch `fix/p2-validation-deps` in worktree `/Users/mac/Documents/personal-web-p2-fix`, commit `13cf16b`.

## Watch List

- P2: zod schema 驗證已在 `fix/p2-validation-deps` 完成，待 review/merge。
- P2: 統一 Postgres driver（website 用 pg Pool、render-service 用 Neon HTTP；Vercel serverless 宜用 Neon HTTP，`@neondatabase/serverless` 已在 deps 但 website 未用）
- P2: next-auth 死依賴已在 `fix/p2-validation-deps` 移除，待 review/merge。

## Recent Noise (ignored this run)

- Lint 既有 `any` 型別錯誤（65 problems）— 全為既有問題，P1 改動未引入新問題。

---

## 本次修復內容（fix/p1-security-hardening）

### P1-1: API key 雜湊升級（customHash → scrypt）
- `website/src/lib/api-key.ts`: 移除自製 FNV `customHash`，改用 `crypto.scryptSync`（N=32768/r=8/p=1，OWASP 建議值）。新格式 `scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>`，16-byte 隨機 salt，`timingSafeEqual` 常數時間比較。`verifyApiKeyHash` 對非 `scrypt$` 格式（含舊 customHash）回傳 false（舊金鑰自動失效），整體 try/catch 包裹防範 DB 畸形資料導致 500。
- `website/src/lib/auth.ts` + `website/src/app/api/admin/verify/route.ts`: SELECT 加 `WHERE key_prefix = $1` 篩選，避免全表 scrypt 比對。
- `website/src/app/api/admin/init/route.ts`: 修正 X-Setup-Warning header 的 em-dash 為 ASCII（ByteString 限制）。
- **既有金鑰須作廢重發**（raw key 不儲存，無法原地遷移）。

### P1-2: CORS 白名單（* → 受控）
- `website/src/lib/cors.ts`: 新增 `ALLOWED_ORIGINS` 環境變數 + `resolveAllowedOrigin(origin)`。白名單內反射 Origin；未設 fallback `*`（本機開發不變）；白名單外不設 ACAO。
- `website/src/proxy.ts`: `cors()` 改接收 request，精準反射 Origin（含 preflight OPTIONS）。
- `website/.env.example` + `README.md`: 加 `ALLOWED_ORIGINS` 說明。Electron（無 Origin）不受 CORS 影響。

### P1-3: verify 頁 Node crypto → Web Crypto API
- `website/src/app/verify/[slug]/page.tsx`: 移除 `import { createHash } from 'crypto'`（client component 不能用 Node crypto），`handleVerify` 改 async + `crypto.subtle.digest('SHA-256')`，輸出 lowercase hex 與服務端 signer 一致。

## 測試證據
- `pnpm build`: 成功，Proxy middleware 正常
- `pnpm lint`: 65 problems，與 main 一致（零新增）
- P1-1: init 產生 `scrypt$...` 格式；verify 新 key → valid:true；舊格式 hash → 自動拒絕；DB 植入畸形 hash 不再導致 500
- P1-2: 白名單內 Origin → 反射；白名單外 → 無 ACAO；無 Origin → 無 ACAO（Electron 不受影響）；未設 ALLOWED_ORIGINS → fallback `*`
- P1-3: Web Crypto SHA-256 hex 與服務端 Node crypto 完全一致（同輸入同輸出）
- verifier sub-agent: PASS-WITH-NOTES → 兩個 MINOR（verifyApiKeyHash 防禦性強化）已修正並重新驗證

---
Run log:
- 2026-08-10 — Controller verification: admin 32/32 tests + lint + signed DMG build; website 24/24 unit tests + TypeScript + build; Electron smoke opened the real recovery dialog, focused the token field, and restored focus on Escape. Final scoped review PASS; no credentials entered.
- 2026-08-10 — L2 admin-key-rotation final-review fix wave: init token clears before verification; unmounted/stale rotation continuations are invalidated before verify/persistence; PostgreSQL integration tests require a loopback disposable marker and use one random schema. Admin 32 tests/lint/build, website 18 unit tests/build/TypeScript, and real PostgreSQL 18 integration 2 tests passed. The unique disposable container was removed; no push/merge/deploy/production/P2.
- 2026-08-09 — L2 P0 fix (deploy blockers), merged to main, pushed
- 2026-08-09 — L2 P1 fix (security hardening), merged to main and pushed (`e1d62d8`)
