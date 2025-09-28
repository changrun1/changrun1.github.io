# Minimal Paste Share

極簡、可自架的「文字 / 小檔案分享」示例。

---
## 功能
﻿# Minimal Paste Share

專注：給想「快速看懂 & 立刻自己架一個」的人。其他花俏、延伸、安全強化先不談。

---
## 這是什麼？
一個最小可行的「文字 / 小檔案分享」服務：
前端 (Vue 3 + Vite) 只打 API；後端用 Cloudflare Worker 將上傳內容 commit 到你的 Git Repository。

---
## 為什麼這樣設計？
- Git 當儲存：免資料庫，歷史版本天然存在
- Worker 代理：不在前端暴露 Token
- 前端純靜態：可放 Pages / 任意 CDN

---
## 部署重點六步（詳細展開）

### 1. 建立 Git Repository（程式 + 前端）
1. GitHub 建立空 Repo，例如 `paste-share`
2. Clone 到本地：
```
git clone https://github.com/<you>/paste-share.git
cd paste-share
```
3. （若空）初始化前端：
```
npm create vite@latest . -- --template vue
npm install
```
4. 建立目錄 `cloudflare/worker/src`

### 2. 產生 GitHub Personal Access Token（PAT）
1. GitHub → Settings → Developer settings → Tokens
2. 建立 Fine-grained 或 classic（最小：repo content write）
3. 複製一次性 Token（後面放 Worker Secret）

### 3. 建立 Cloudflare Worker + Secrets
1. 安裝與登入：
```
npm install -g wrangler
wrangler login
```
2. 建立 `cloudflare/worker/wrangler.toml`：
```
name = "your-worker-name"
main = "src/index.ts"
compatibility_date = "2024-05-01"
```
3. 建立最小程式 `cloudflare/worker/src/index.ts`：
```ts
export default { async fetch(req) {
  const u = new URL(req.url)
  if (u.pathname === '/uploads' && req.method === 'GET') {
    return json([]) // TODO: 列出 Git 內檔案
  }
  if (u.pathname === '/upload' && req.method === 'POST') {
    const b = await req.json() // b.type, b.content, b.filename
    // TODO: 轉成 Git commit API 請求
    return json({ id: 'demo', name: b.filename || 'note.txt' })
  }
  if (u.pathname.startsWith('/uploads/') && req.method === 'DELETE') {
    // TODO: Git 刪除 API
    return json({ deleted: true })
  }
  return json({ error: 'NOT_FOUND' }, 404)
}}
function json(d, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json'}})}
```
4. 設定 Secrets（以 GitHub 為例）：
```
wrangler secret put GIT_TOKEN
wrangler secret put GIT_OWNER      # your github username
wrangler secret put GIT_REPO       # e.g. paste-share (或另一個 data repo)
wrangler secret put GIT_BRANCH     # main
wrangler secret put BASE_PATH      # uploads/
```
5. 部署：
```
cd cloudflare/worker
wrangler deploy
```
取得 Worker URL，例如：`https://your-worker-name.<subdomain>.workers.dev`

### 4. 前端 `.env` 指向 Worker URL
在專案根目錄建立 `.env`：
```
VITE_API_BASE=https://your-worker-name.<subdomain>.workers.dev
VITE_APP_TITLE=Paste Share
```

### 5. 本地測試 upload / list / delete
新增 `src/services/api.js`：
```js
const base = import.meta.env.VITE_API_BASE
export const listUploads = () => fetch(base + '/uploads').then(r=>r.json())
export const uploadText = (content, filename) => fetch(base + '/upload', {
  method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ type:'text', content, filename })
}).then(r=>r.json())
export const deleteOne = id => fetch(base + '/uploads/' + id, { method:'DELETE'}).then(r=>r.json())
```
啟動：
```
npm run dev
```
開瀏覽器：輸入文字 → 上傳（暫時 demo 回傳假資料）→ 確認無錯誤。

（此時你需要把 Worker 補完：實際呼叫 GitHub API 做 create/update、list、delete —— 仍留 TODO 標記，保證 README 不膨脹）

### 6. Build 並部署靜態檔
```
npm run build
```
輸出 `dist/`。

GitHub Pages（Actions）快速設定：建立 `.github/workflows/deploy.yml`：
```yml
name: pages
on: { push: { branches: [ main ] } }
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
GitHub Repo → Settings → Pages → Source 選 GitHub Actions。若 SPA 刷新 404：複製 `index.html` → `404.html`。

---
## 最小 API 介面（僅供前端你實作）
| 方法 | 路徑 | 用途 | 回傳示例 |
|------|------|------|----------|
| GET | /uploads | 取得列表 | `[ { id, name, size } ]` |
| POST | /upload | 上傳文字/檔案 | `{ id, name }` |
| DELETE | /uploads/:id | 刪除 | `{ deleted: true }` |

錯誤統一：`{ "error": "NOT_FOUND" }` / `{ "error": "BAD_REQUEST" }` 等。

---
## 你要補完的 TODO（Worker 內）
- 呼叫 GitHub REST API 建立檔案：`PUT /repos/{owner}/{repo}/contents/{path}` (base64 content)
- 列表：`GET /repos/{owner}/{repo}/contents/{basePath}`
- 刪除：`DELETE /repos/{owner}/{repo}/contents/{path}` (需 sha)
- 產生唯一檔名：時間戳 + slug；衝突回 409

---
## 完成後你應該能：
1. 在前端貼一段文字 → 立刻看到回傳 id
2. 列表顯示剛剛檔名
3. 刪除後列表更新
4. Git Repo 內可看到新增檔案 commit

---
（如需再加「安全建議 / 擴充方向」再說，不先塞。）


