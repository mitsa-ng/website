# Nati's Personal Web

個人品牌網站與作品集系統，包含公開網站、後台管理桌面應用、以及背景排程服務。

## 系統架構

```
┌─────────────────┐     ┌──────────────────┐
│   website/      │     │   admin-app/     │
│  Next.js 16     │◄────│  Electron + React │
│  公開網站 + API  │     │  桌面後台管理     │
└────────┬────────┘     └──────────────────┘
         │                        │
         │     ┌──────────────────┘
         ▼     ▼
┌──────────────────┐
│   PostgreSQL     │
│   (Neon)         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ render-service/  │
│ 背景排程服務     │
│ 發佈文章 + 郵件通知│
└──────────────────┘
```

| 元件 | 技術 | 部署平台 |
|------|------|---------|
| **website/** | Next.js 16 + React 19 + Tailwind CSS 4 + Drizzle ORM | Vercel |
| **admin-app/** | Electron + React 19 + Vite 6 | macOS DMG (electron-builder) |
| **render-service/** | Express + node-cron + Nodemailer | Render.com Worker |
| **資料庫** | PostgreSQL (Neon Serverless) | Neon |

---

## 目錄

- [前置需求](#前置需求)
- [資料庫部署](#資料庫部署)
- [Website 部署 (Vercel)](#website-部署-vercel)
- [Render Service 部署 (Render.com)](#render-service-部署-rendercom)
- [Admin App 打包與使用](#admin-app-打包與使用)
- [本地開發](#本地開發)
- [環境變數總表](#環境變數總表)
- [使用教學](#使用教學)

---

## 前置需求

- **Node.js** ≥ 20
- **pnpm** ≥ 9（專案使用 pnpm workspace）
- **PostgreSQL** 資料庫（建議使用 [Neon](https://neon.tech)）
- **Vercel** 帳號（部署網站）
- **Render.com** 帳號（部署背景服務，可選）
- **SMTP** 服務（聯絡表單郵件通知，可選）

---

## 資料庫部署

### 1. 建立 Neon 專案

前往 [Neon Console](https://console.neon.tech) → Create Project → 選擇區域。

取得連線字串：

```
postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
```

### 2. 建立資料表

Schema 定義在 `website/src/db/schema.ts`，包含以下資料表：

- **posts** — 部落格文章（雙語、支援排程發佈）
- **projects** — 作品集
- **services** — 服務項目
- **contacts** — 聯絡表單留言
- **api_keys** — API 金鑰管理

使用 Drizzle Kit 推送 Schema：

```bash
cd website
pnpm add -g drizzle-kit
drizzle-kit push
```

或直接執行 `website/src/db/schema.ts` 中的 SQL 到資料庫。

---

## Website 部署 (Vercel)

### 1. 準備環境變數

在 Vercel Project Settings → Environment Variables 中設定：

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `AUTH_SECRET` | NextAuth.js 加密密鑰（`openssl rand -base64 32` 產生） |
| `NEXT_PUBLIC_SITE_URL` | 網站公開網址 |

### 2. 部署步驟

```bash
# 安裝 Vercel CLI（選用）
pnpm add -g vercel

# 登入 Vercel
vercel login

# 一鍵部署
cd website
vercel --prod
```

或直接連接 GitHub 倉儲 → Vercel Import → 設定 Framework 為 Next.js → 填入環境變數 → Deploy。

### 3. 初始化管理員金鑰

部署完成後，呼叫初始化 API 取得管理員 API Key：

```bash
curl -X POST https://<your-domain>/api/admin/init
```

回傳的 `raw` 即為管理員金鑰，**請立即儲存**（僅顯示一次）。

---

## Render Service 部署 (Render.com)

背景服務負責：

- **每分鐘**：檢查並發佈排程文章
- **每 5 分鐘**：寄送新聯絡表單的通知郵件

### 1. 使用 render.yaml 一鍵部署

`render-service/render.yaml` 已預先配置。在 Render.com Dashboard：

1. → Blueprint → 連結 GitHub 倉儲
2. Render 會自動讀取 `render.yaml`
3. 填入以下 Secret Files：

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | 同 Website 使用的 Neon 連線字串 |
| `SMTP_HOST` | SMTP 伺服器 |
| `SMTP_PORT` | SMTP 埠號（預設 587） |
| `SMTP_USER` | SMTP 帳號 |
| `SMTP_PASS` | SMTP 密碼 |
| `NOTIFY_EMAIL` | 接收通知的 Email |

### 2. 手動部署

```bash
cd render-service
pnpm install
pnpm build
pnpm start
```

或使用 Docker（自行撰寫 Dockerfile）：

```bash
docker run -e DATABASE_URL=... -e SMTP_HOST=... ... node:20-alpine node dist/index.js
```

---

## Admin App 打包與使用

桌面後台管理應用，連線到 Website 的 API 進行內容管理。

### 打包成 macOS DMG

```bash
cd admin-app
pnpm install
pnpm build:mac
```

產出檔案在 `admin-app/release/Personal Web Admin-<version>.dmg`。

### 開發模式

```bash
cd admin-app
pnpm dev
```

### 初次使用

1. 開啟 Admin App
2. 輸入 Website 網址（如 `https://your-domain.vercel.app`）
3. 輸入從 `/api/admin/init` 取得的管理員 API Key
4. 開始管理內容（文章、作品、服務、聯絡留言）

支援多組 Profile 切換（Multiple Server / API Key）。

---

## 本地開發

### 1. 啟動資料庫

```bash
# 使用 Docker 啟動 PostgreSQL
docker run -d --name personal-web-db \
  -e POSTGRES_USER=dev \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=personal_web_dev \
  -p 5432:5432 postgres:16-alpine
```

### 2. 設定環境變數

```bash
cp website/.env.local website/.env.local
# 編輯 DATABASE_URL
```

### 3. 安裝相依套件

```bash
# 在根目錄安裝所有子專案
pnpm install

# 或分別安裝
cd website && pnpm install
cd admin-app && pnpm install
cd render-service && pnpm install
```

### 4. 啟動開發伺服器

```bash
# Terminal 1 — 網站
cd website
pnpm dev          # http://localhost:3000

# Terminal 2 — 背景服務
cd render-service
pnpm dev          # http://localhost:3001

# Terminal 3 — 後台管理（可選）
cd admin-app
pnpm dev
```

### 5. 初始化資料庫

Schema 推送：

```bash
cd website
npx drizzle-kit push
```

初始化管理員金鑰：

```bash
curl -X POST http://localhost:3000/api/admin/init
```

---

## 環境變數總表

### website/

| 變數 | 必要 | 說明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串 |
| `AUTH_SECRET` | ✅ | NextAuth.js 加密密鑰 |
| `NEXT_PUBLIC_SITE_URL` | | 網站公開網址 |

### render-service/

| 變數 | 必要 | 說明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串 |
| `SMTP_HOST` | | SMTP 伺服器 |
| `SMTP_PORT` | | SMTP 埠號（預設 587） |
| `SMTP_USER` | | SMTP 帳號 |
| `SMTP_PASS` | | SMTP 密碼 |
| `NOTIFY_EMAIL` | | 通知收件者 Email |

---

## 使用教學

### 前台網站

**網址**：`https://<your-domain>.vercel.app`

功能：

- **關於我** — 個人簡介與經歷
- **作品集** — 專案作品展示（由 Admin 後台管理）
- **部落格** — 雙語文章（支援排程發佈）
- **服務項目** — 收費服務介紹
- **聯絡表單** — 訪客留言（透過 Render Service 發送 Email 通知）

### 後台管理 (Admin App)

**首次設定**：

1. 開啟 App → 輸入 Server URL（如 `https://your-domain.vercel.app`）
2. 取得 API Key：`curl -X POST https://your-domain.vercel.app/api/admin/init`
3. 輸入 API Key → 登入成功

**管理功能**：

| 功能 | 說明 |
|------|------|
| **Dashboard** | 總覽統計（文章、作品、服務數量） |
| **Posts** | 文章列表 → 新增/編輯/刪除，支援草稿/排程發佈/雙語內容 |
| **Projects** | 作品管理 → 標題、描述、標籤、連結、圖片 |
| **Services** | 服務項目管理 → 價格、圖示、排序、上架/下架 |
| **Contacts** | 聯絡表單留言檢視 |
| **Settings** | 多 Profile 切換、API Key 管理 |

**文章編輯器支援**：

- Markdown 語法（react-markdown）
- 中英文雙語內容分開編輯
- 排程發佈（設定未來時間，由 Render Service 自動發佈）
- 草稿模式

### 背景排程服務

部署 Render Service 後會自動執行：

- **每分鐘**：掃描 `draft=true` 且 `publishAt <= now` 的文章 → 自動設為已發佈
- **每 5 分鐘**：掃描未通知的聯絡表單 → 透過 SMTP 發送 Email 通知

健康檢查：`GET https://<render-service-url>/health`

---

## 專案結構

```
personal web/
├── index.html              # 獨立手機版品牌頁面 (PWA style)
├── website/                # Next.js 16 公開網站 + API
│   └── src/
│       ├── app/            # App Router 頁面與 API Routes
│       ├── components/     # 共用元件
│       ├── db/             # Drizzle ORM Schema & 連線
│       └── lib/            # 工具函式
├── admin-app/              # Electron 桌面後台管理
│   ├── electron/           # Electron main/preload
│   └── src/                # React 前端
│       ├── pages/          # 管理頁面
│       ├── components/     # 共用元件
│       └── lib/            # API client, i18n, store
├── render-service/         # Express 背景排程服務
│   └── src/
│       ├── index.ts        # Express 服務 + Cron jobs
│       ├── db.ts           # 資料庫連線
│       └── schema.ts       # 共用 Schema (posts, contacts)
└── open-design/            # 獨立開源專案 (非本系統)
```
