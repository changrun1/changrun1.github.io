
## 極簡檔案 / 文字貼分享系統部署指南

Vue 3 + Cloudflare Worker + GitHub Repository。無資料庫、可 Fork、幾分鐘完成自有匿名（或私用）分享站：上傳 / 預覽 / 下載 / 刪除 / 語法高亮 / 圖片預覽。


<div align="center">

# File Share 子系統部署指南 (Chinese Primary)

最小化、免資料庫、可自行 Fork 與快速部署的「檔案 / 純文字貼」分享系統。你將獲得：上傳、預覽、下載、刪除、程式碼語法高亮、圖片預覽。整套只依賴：前端 (Vue 3 SPA) + Cloudflare Worker + GitHub Repo。

</div>




## 總覽

現代化個人站點 + 匿名檔案/訊息分享：

<div align="center">

# File Share 子系統部署指南 (Chinese Primary)

最小化、免資料庫、可自行 Fork 與快速部署的「檔案 / 純文字貼」分享系統。你將獲得：上傳、預覽、下載、刪除、程式碼語法高亮、圖片預覽。整套只依賴：前端 (Vue 3 SPA) + Cloudflare Worker + GitHub Repo。

</div>

---

## 🎯 目標
跟著本文一步一步做，完成「自己的」檔案分享站：
1. 建立儲存用 GitHub Repo
2. 部署 Cloudflare Worker（持有 PAT）
3. 修改前端設定 → Build → 上線
4. 驗證上傳 / 預覽 / 刪除

---

## ⚙️ 系統概念速覽
| 元件 | 說明 | 你要做什麼 |
|------|------|-----------|
| GitHub Repo | 存所有上傳檔案 | 建一個空 repo (public/private 均可) |
| Cloudflare Worker | 代收上傳，commit 到 GitHub | 建 Worker + 設 secrets |
| 前端 (Vue) | 顯示列表、預覽、操作 | Build 後放任何靜態空間 |
| highlight.js | 程式碼區塊語法上色 | 無需設定（已內建） |

---

## 🧩 目錄（在此倉庫內）
```
site/
  src/                # 前端程式碼
  cloudflare/worker/  # Worker 程式碼
```
若只想要子系統，可直接複製上述兩個資料夾即可。

---

## 🛠 前置需求
| 工具 | 版本建議 | 用途 |
|------|----------|------|
| Node.js | >= 18 | 前端建置 |
| npm | 對應 Node | 套件管理 |
| GitHub 帳號 | - | 儲存與托管 |
| Cloudflare 帳號 | - | 部署 Worker |
| wrangler CLI | 3.x | Worker 部署 |

安裝 wrangler：
```bash
npm install -g wrangler
```

---

## ① 建立 GitHub Repo
1. 到 GitHub → New Repository。
2. Name：自訂，例如 `my-file-share`。
3. README / .gitignore 可勾也可不勾。
4. 建好後記下 owner/repo 名稱。
5. （可選）先建立空資料夾結構：`site/uploads/`（Worker 會自動建立，不建也行）。

---

## ② 建立 Personal Access Token (PAT)
1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens。
2. Resource 選剛建立的 repo；權限給：Contents = Read & Write。
3. 設定有效期限（建議 90 天或自訂）。
4. 產生後複製 Token（只會顯示一次）。

---

## ③ 部署 Cloudflare Worker
1. 進入專案：
```bash
cd site/cloudflare/worker
npm install
```
2. 編輯 `wrangler.toml`（若需要）：確認以下 vars 是否存在（無則加）：
```toml
[vars]
GITHUB_OWNER = "your-github"
GITHUB_REPO = "my-file-share"
GITHUB_BRANCH = "main"        # 可改
MAX_FILE_SIZE = 10485760       # 10MB，可調
```
3. 設定 Secrets：
```bash
wrangler secret put GITHUB_TOKEN
# 貼剛剛建立的 PAT
```
4. 部署：
```bash
wrangler deploy
```
5. 拿到 Worker URL，例如：`https://your-worker-subdomain.workers.dev`

驗證：瀏覽器開 `https://<worker>/uploads` 應回傳 JSON（可能為空陣列）。

---

## ④ 修改前端設定
1. 編輯 `site/src/composables/useSiteContent.js`
2. 調整：
```js
const config = ref({
  owner: 'your-github',
  repo: 'my-file-share',
  branch: 'main',
  workerBase: 'https://your-worker-subdomain.workers.dev',
  uploadsDir: 'site/uploads',
})
```
3. 儲存後即可 `npm run build`。

---


# 極簡檔案分享 / Minimal Paste & Files

Vue 3 + Cloudflare Worker + GitHub Repo：數分鐘部署的極簡檔案 / 文字貼分享系統，提供 上傳・即時文字預覽・語法高亮・圖片預覽・下載・刪除，無資料庫、可 Fork、易擴充。

<sub>Chinese primary documentation. English summary can be added if needed.</sub>

---

## 總覽

最小化、免資料庫、可自行 Fork 與快速部署的「檔案 / 純文字貼」分享系統。整套只依賴：前端 (Vue 3 SPA) + Cloudflare Worker + GitHub Repo。

## ⑦ 功能驗證
| 測試 | 操作 | 預期 |
|------|------|------|
| 上傳純文字 | 在 Upload 輸入並送出 | Downloads 立刻顯示貼紙樣式，內容可複製 |
| 上傳程式碼 | 貼 js / py | 語法高亮 + 行號 + 可下載 |
| 上傳圖片 | 選擇 png | 有預覽與下載 |
| 自訂副檔名 | 選 custom → 輸入 note1 | 檔案以 `.note1` 儲存，可下載 |
| 同名衝突 | 連續用同檔名 | 第二次回 409（前端應顯示提示） |
| 刪除單檔 | Manage → 刪除 | 立即從列表消失 |
| 全部刪除 | Manage → 全刪 | uploads 清空 |

---

## 🔐 安全強化（選做）
| 需求 | 作法方向 |
|------|----------|
| 限制上傳 | 在 Worker 檢查 `Content-Type` / 副檔名清單 |
| 私用保護 | 自訂 Header（如 `X-UPLOAD-KEY`）不符即 401 |
| 防濫用 | 加 Cloudflare Turnstile / Simple 速率限制（KV 計數） |
| 大檔分離 | 二進位走 R2，GitHub 只留 meta JSON |
| 更多語言高亮 | 新增 highlight.js 語言模組並註冊 |

---

## 📄 檔名與分類規則
| 類型 | 命名模式 | 備註 |
|------|----------|------|
| 文字 | `<ISO時間>-<slug>.txt|md|<custom>` | `.txt` 於下載列表隱藏副檔名顯示 |
| 檔案 | `<ISO時間>-<slug>.<ext>` | slug 來源：自訂 or 原始檔名去空白 |
| 衝突 | 再次上傳同名 | 409 或自動隨機碼（看前端策略） |

---

## 🪪 授權
MIT（可自由使用、修改、再散佈，不附保證）。

---

完成以上 7 個步驟，你就擁有自己的極簡檔案 / 文字貼分享系統。若需要自動化腳本、Docker 化、或安全強化範例，可再提出需求。

Enjoy.
