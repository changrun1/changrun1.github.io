## ✨ Chang Run Personal Hub

一個部署在 GitHub Pages 的現代化個人介紹站，整合內容展示、Decap CMS 後台，以及經由 Cloudflare Worker 代理的匿名檔案共享流程。所有內容皆儲存在 `changrun1/changrun1.github.io` repo，無需資料庫即可管理。

### 主要功能

- **Vue 3 + Tailwind** 打造的高質感首頁、作品集、文章列表與下載區。
- **內容驅動架構**：前端透過 Cloudflare Worker 以 PAT 代理 GitHub API，取得 Markdown / JSON / uploads，更新檔案即可即時生效且不受 Rate Limit 影響。
- **Decap CMS** 後台（`/admin`），經 GitHub OAuth 驗證後可在瀏覽器編輯文章、作品、個人資訊。
- **匿名上傳管道**：訪客透過表單上傳檔案或文字，由 Cloudflare Worker 持有 PAT 轉存到 GitHub `uploads/` 目錄並公開下載。
- **GitHub Actions** 自動化部署，每次推送 `main` 都會編譯並發佈至 GitHub Pages。

---

## 📁 專案結構

```
├─ site/
│  ├─ content/               # Markdown / JSON 內容，可直接編輯或透過 CMS 管理
│  │  ├─ posts/              # 文章（front matter + Markdown 正文）
│  │  ├─ projects/index.json # 作品集資料（CMS 透過 list widget 編輯）
│  │  └─ profile/profile.json# 個人基本資訊與聯絡連結
│  ├─ uploads/               # 匿名上傳後儲存的檔案（Cloudflare Worker 會寫入）
│  ├─ public/                # 靜態資源與 Decap CMS admin
│  │  └─ admin/
│  ├─ src/
│  │  ├─ components/         # UI 模組
│  │  ├─ composables/useSiteContent.js # 內容狀態管理，優先走 Worker 回傳資料
│  │  ├─ services/githubContent.js     # 與 GitHub API 直接互動（備援用途）
│  │  └─ services/workerContent.js     # 透過 Worker 彙整並回傳站點資料
│  └─ cloudflare/worker/     # Workers 端程式與 wrangler 設定
├─ .github/workflows/        # GitHub Pages 部署流程（於根目錄）
└─ README.md（此檔案）
```

---

## 🛠️ 開發流程

使用 PowerShell：

```powershell
cd site
npm install
npm run dev
```

若需打包與本地預覽：

```powershell
cd site
npm run build
npm run preview
```

> GitHub Pages 會透過自動化 workflow 執行 `npm run build`，再將 `dist/` 發佈。

- `vite.config.js` 的 `base` 預設為 `/`，若切換到子路徑部署，再調整 `VITE_BASE_PATH`。

---

## 🧩 內容管理

1. **直接編輯檔案**：
	- 文章：`site/content/posts/*.md`（支援 front matter）
	- 作品：修改 `site/content/projects/index.json` 的 `projects` 陣列
	- 個人資料：`site/content/profile/profile.json`
2. **Decap CMS 後台**：造訪 `https://changrun1.github.io/admin/` 和 GitHub OAuth 登入後，就能透過表單編輯上述檔案並自動 commit。
3. **匿名上傳列**：Cloudflare Worker 寫入的檔案會即時出現在 `UploadPanel`，不需重新部署。

---

## 🌐 GitHub Pages 部署

1. 於 repo **Settings → Pages**，將 Source 設為 **GitHub Actions**。
2. Workflow `deploy.yml` 會在推送 `main` 時：
	- 於 `site/` 下安裝依賴並執行 `npm run build`
	- 上傳 `site/dist/` 成品並部署至 Pages
3. 首次部署完成後，網站會出現在 `https://changrun1.github.io/`。

---

## ✍️ GitHub OAuth App 設定（Decap CMS 登入）

在 <https://github.com/settings/developers> 建立新的 OAuth App，欄位建議如下：

| 欄位 | 建議值 |
| --- | --- |
| **Application name** | `Chang Run CMS`（自訂皆可） |
| **Homepage URL** | `https://changrun1.github.io/` |
| **Application description** | `CMS for changrun1 personal site`（可留空） |
| **Authorization callback URL** | `https://quiet-water-7883.chang71505.workers.dev/cms/callback` |
| **Enable Device Flow** | 不勾選（Decap CMS 用不到） |

建立後，請記下 `Client ID` 與 `Client Secret`，稍後會寫入 Cloudflare Worker secrets。

---

## ☁️ Cloudflare Worker（匿名上傳 + OAuth Proxy）

專案中的 `site/cloudflare/worker/` 已包含：

- `wrangler.toml`：設定 worker 名稱、GitHub Repo、檔案限制、Rate limit 等。
- `src/index.ts`：
	- `POST /upload`：驗證檔案後以 GitHub API 新增到 `site/uploads/` 目錄。
	- `GET /content`：使用 PAT 聚合 profile / posts / projects / uploads，回傳前端所需資料。
	- `GET /uploads`：提供匿名分享清單，供前端即時刷新。
	- `GET /cms/auth`、`GET /cms/callback`：代理 GitHub OAuth，提供 Decap CMS 登入。
	- `POST /cms/auth/refresh`：回覆 CMS 的 refresh 請求。

### 安裝 wrangler（若尚未安裝）

```powershell
npm install -g wrangler
```

### 設定 Secrets

```powershell
cd site/cloudflare/worker
wrangler secret put GITHUB_TOKEN           # 輸入具有 repo 權限的 PAT
wrangler secret put GITHUB_OAUTH_CLIENT_ID
wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
wrangler secret put OAUTH_REDIRECT_URI     # 例如 https://quiet-water-7883.chang71505.workers.dev/cms/callback
```

> **安全性提醒**：只將 Token 寫入 Cloudflare Secrets，請勿提交至 Git。

### 調整變數

- 若要修改允許的副檔名、檔案大小或速率限制，可在 `wrangler.toml` 的 `[vars]` 更新。
- 預設會把訪客留言存成 `site/uploads/<timestamp>-note.md`，檔案則命名為 `site/uploads/<timestamp>-<slug>.<ext>`。

### 部署 Worker

```powershell
cd site/cloudflare/worker
wrangler deploy
```

部署完成後，公開端點即為 `https://quiet-water-7883.chang71505.workers.dev`：

- 匿名上傳：`POST /upload`
- CMS OAuth：`GET /cms/auth`、`GET /cms/callback`
- 內容 API：`GET /content`（主站載入時使用）
- 匿名分享列表：`GET /uploads`

> **提醒**：凡調整 Worker 程式（如內容 API 邏輯），請重新執行 `wrangler deploy` 以套用最新程式。

---

## 🔐 GitHub Personal Access Token 提醒

- 提供的 PAT 具有 `repo` 權限，建議僅用於 Worker，並在 GitHub 設定頁設定過期日與定期輪替。
- 若想限制匿名檔案大小，可調整 Worker 的 `MAX_FILE_SIZE`，目前預設 10MB。
- 若需更嚴格的流量控管，可將 in-memory rate limit 改寫成 Cloudflare KV / Durable Object（程式已預留資料結構，可延伸）。

---

## ✅ 待辦檢查與最佳實踐

- [x] 以 GitHub Actions 自動部署 Pages。
- [x] Cloudflare Worker 封裝 GitHub API，持有 Token 並保護於 Secrets。
- [x] Decap CMS 後台連動 GitHub OAuth。
- [x] 內容直接讀取 repo 檔案，更新即生效。

接下來只需填入真實的個人資料、作品與文章，就能正式對外公開此站。歡迎依需求調整樣式、段落與附加功能。祝使用順利！
