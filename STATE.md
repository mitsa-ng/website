# Loop State — My Project

Last run: 2026-08-09 (L2 fix attempt — P0 deploy blockers)

## High Priority (loop is acting or waiting on human)

- **PR awaiting human review/merge**: branch `fix/p0-deploy-blockers` in worktree `/Users/mac/Documents/personal-web-p0-fix`. NOT pushed, NOT merged. Diff summary below.

## Watch List

- P1 (deferred from analysis, not done this run): API key 自製 FNV 雜湊 → bcrypt/argon2（需金鑰遷移）
- P1: CORS 全開 → 白名單（需協調 admin-app 來源）
- P1: verify/[slug] client component 匯入 Node crypto（runtime 壞）
- P2: 引入 zod schema 驗證（型別與 Drizzle schema 脫鉤）
- P2: 統一 Postgres driver（website 用 pg Pool、render-service 用 Neon HTTP）
- P2: next-auth 死依賴仍在 package.json（本次僅從 README/環境變數移除，未移除 dependency）

## Recent Noise (ignored this run)

- Lint 既有 `any` 型別錯誤（48 errors）— 全為既有問題，本次改動未引入新 `any`。

---

## 本次修復內容（fix/p0-deploy-blockers）

### P0-A: site_settings 表未宣告（部署阻塞，整站 500）
- `website/src/db/schema.ts`: 新增 `siteSettings` pgTable
- `website/drizzle/0002_add_site_settings.sql`: CREATE TABLE migration
- `website/drizzle/meta/_journal.json`: 新增 idx 2

### P0-B: projects.image_url migration 缺漏
- `website/drizzle/0003_add_projects_image_url.sql`: ALTER TABLE ADD COLUMN
- `website/drizzle/meta/_journal.json`: 新增 idx 3

### P0-C: /api/admin/init 無驗證（首打者佔領）
- `website/src/app/api/admin/init/route.ts`: ADMIN_INIT_TOKEN 環境變數檢查 + timingSafeEqual 常數時間比較 + 未設時 X-Setup-Warning header
- `website/src/lib/cors.ts` + `website/src/proxy.ts`: CORS 允許 X-Admin-Init-Token header
- `admin-app/src/lib/api.ts`: initApiKey 新增第 3 個選填參數 initToken
- `admin-app/src/pages/Login.tsx`: init 模式加選填 Deploy Token 欄位

### 附帶修復
- `?drafts=true` 驗證閘道（`api/posts`、`api/projects`、`api/services`）: 匿名帶 drafts 旗標時靜默降級為已發佈內容
- `website/.env.example`（新檔）+ `website/.gitignore` 加 `!.env.example` 例外
- `website/package.json`: 新增 db:push / db:migrate / db:setup scripts
- `README.md`: 移除 AUTH_SECRET、加 ADMIN_INIT_TOKEN、修正 db:setup 指令、修 .env.local 範例錯誤

## 測試證據
- `pnpm lint`: 既有錯誤（無新增）
- `pnpm build`: 成功，所有路由編譯，Proxy middleware 正常
- `drizzle-kit push` 對乾淨 Postgres: 6 表建立（含 site_settings）
- `drizzle-kit migrate` 對乾淨 Postgres: 4 個 migration 套用，6 表建立
- API 測試（dev server + 測試 DB）:
  - init 無令牌 → 401
  - init 錯令牌 → 401
  - init 正確令牌 → 200 + raw key
  - 匿名 GET /api/settings → 200（不再 500）
  - 匿名 ?drafts=true → 只回已發佈（草稿不洩露）
  - admin ?drafts=true → 回含草稿
- verifier sub-agent: PASS-WITH-NOTES → 所有 blocker/minor 已修正並重新驗證

---
Run log: 2026-08-09 — L2 P0 fix, 9 files modified + 3 new files, verified, awaiting review
