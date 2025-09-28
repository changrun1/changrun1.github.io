# Paste Hub Starter

> 這是可直接 Fork / Clone 來自架的模板倉庫 README 範本。請在建立新公開 repo 後把內容調整成你的實際名稱與連結。

## 功能
- 匿名/半匿名上傳純文字或小檔案 (以 Git 儲存)
- 列出 / 刪除已上傳項目
- 靜態前端 + Cloudflare Worker 代理 GitHub API

## 技術棧
| 層 | 技術 | 說明 |
|----|------|------|
| Frontend | Vue 3 + Vite | 單頁應用，呼叫 Worker API |
| Edge API | Cloudflare Worker | 接受上傳 / 轉發至 GitHub REST |
| Storage | Git Repository | 內容即檔案；保留歷史版本 |

## 快速開始
### 1. 建立個人存放 Repo
可直接使用本 Repo 或再開一個獨立 `paste-hub-data` 儲存檔案。

### 2. 取得 GitHub Token
Settings → Developer settings → Personal access tokens → 建立 (Fine-grained: Content write)。記下 Token。

### 3. 佈署 Cloudflare Worker
```
npm install -g wrangler
wrangler login
cd cloudflare/worker
wrangler secret put GITHUB_TOKEN
wrangler deploy
```
設定 `wrangler.toml` 內 `GITHUB_OWNER / GITHUB_REPO / GITHUB_BRANCH`。

### 4. 設定前端環境變數
建立 `.env`：
```
VITE_API_BASE=https://<your-worker>.workers.dev
VITE_APP_TITLE=Paste Hub
```

### 5. 本地開發
```
npm install
npm run dev
```

### 6. 建置 + GitHub Pages
Push 後 GitHub Actions 會自動 build + 部署 (已含 workflow)。首次需到 Settings → Pages 啟用。

## API (摘要)
| Method | Path | 說明 |
|--------|------|------|
| GET | /uploads | 列表 |
| POST | /upload | 上傳文字/檔案 |
| DELETE | /uploads/:id | 刪除 |

## Worker 實作提示
1. 上傳：`PUT /repos/{owner}/{repo}/contents/uploads/<filename>` (base64)  
2. 列表：`GET /repos/{owner}/{repo}/contents/uploads`  
3. 刪除：先 `GET` 取 `sha`，再 `DELETE` 同路徑  
4. 檔名：`<ISO>-<slug>.<ext>`

## 檢查清單
- [ ] 能上傳並於 Git 看到新檔
- [ ] 列表顯示新項目
- [ ] 刪除後檔案消失
- [ ] Pages 網站可正常使用

## 授權
MIT

---
(將此檔案放在新模板 Repo，並更新此處連結於原本主專案的 README。)
