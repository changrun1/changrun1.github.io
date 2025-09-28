<div align="center">

# 檔案分享 / 文字貼系統 (Vue + Cloudflare Worker + GitHub)

一個「免資料庫、前後端分離」的檔案與純文字分享平台。前端為 SPA，後端以 Cloudflare Worker 直接寫入 GitHub Repository，達成：上傳 / 列表 / 預覽 / 下載 / 刪除 全流程。適合個人或小組臨時交換內容、貼程式片段、傳遞附檔。 

<sub>Chinese primary documentation. English summary below.</sub>

</div>

---

## ✨ 核心特色
* 無資料庫：檔案與文字即檔案，直接 commit 進指定 GitHub Repo。
* 前端即時顯示：文字類內容全量預抓，貼上立即可複製。
* 語法高亮 + 行號：支援常見程式碼（js/ts/css/html/json/py 等）。
* 圖片可預覽，其他檔案直接下載。
* 自訂純文字副檔名（txt / md / 自訂英數 1–12）。
* 自訂檔名；同名檔衝突時回傳 409。
* 批次刪除 / 單檔刪除。
* 無使用者資料蒐集；僅檔案層級。

---

## 🧱 技術架構
| 層 | 技術 | 位置 | 說明 |
|----|------|------|------|
| 前端 SPA | Vue 3 + Vite + Tailwind | `site/src` | UI / 上傳 / 預覽 / 管理 |
| 後端 | Cloudflare Worker (TypeScript) | `site/cloudflare/worker` | 收上傳、寫 GitHub、列出、刪除 |
| 儲存 | GitHub Repository | `site/uploads` | 檔案即資料，不需 DB |
| 語法上色 | highlight.js (按需載入) | 前端 | Downloads / Preview 高亮 |

### 目錄概覽
```
site/
	src/
		views/ (Downloads / Manage / Preview / Upload)
		components/UploadPanel.vue
		composables/useSiteContent.js   # 前端設定與資料來源
		services/ (GitHub / Worker API 呼叫)
	cloudflare/worker/src/index.ts   # Worker 入口
	uploads/                         # 上傳後生成的檔案（部署後不必手動編輯）
```

---

## 🚦 運作流程
1. 前端上傳（文字或檔案）→ 呼叫 Worker `/upload`。
2. Worker 驗證、組檔名（時間戳 + 選填自訂名），Base64 commit 至 GitHub。
3. 前端拉取 `/uploads`（Worker 或直接 GitHub API Fallback）。
4. 文字類：若大小在閾值內 Worker 會附 `textContent` → 前端快取顯示。
5. 下載：強制以 Blob 觸發瀏覽器下載，不直接開啟。
6. 刪除：Worker 依檔案 path 刪除 GitHub 對應版本。

---

## ⚙️ 前端開發
```bash
cd site
npm install
npm run dev
```
建置與預覽：
```bash
npm run build
npm run preview
```

---

## ☁️ Cloudflare Worker 部署
```bash
cd site/cloudflare/worker
npm install
wrangler deploy
```
設定 Secrets / Variables（Dashboard 或 CLI）：
| 名稱 | 說明 | 必填 |
|------|------|------|
| GITHUB_TOKEN | PAT，需 repo content 權限 | ✅ |
| GITHUB_OWNER | GitHub 使用者或 Org | ✅ |
| GITHUB_REPO  | 目標 Repo 名稱 | ✅ |
| GITHUB_BRANCH | 分支，預設 main | ⛔ 可省略 |
| MAX_FILE_SIZE | 上傳大小（Bytes），預設 10MB | 可選 |
| ALLOWED_EXTENSIONS | 允許副檔名白名單 | 可選 |

部署成功後取得 Worker URL，例如：`https://xxx.workers.dev`。

---

## 🛠 前端連線設定
編輯 `src/composables/useSiteContent.js`：
```js
const config = ref({
  owner: 'your-github',
  repo: 'your-repo',
  branch: 'main',
  workerBase: 'https://your-worker.workers.dev',
  uploadsDir: 'site/uploads',
})
```
重新建置或直接重新整理即生效。

---

## 📤 上傳規則
| 類型 | 檔名模式 | 備註 |
|------|----------|------|
| 文字貼 | `timestamp-base.txt|md|<custom>` | timestamp ISO 去冒號/點 |
| 檔案 | `timestamp-base.ext` / `base.ext` | 自訂名衝突 → 409 |
| 自訂副檔名 | 限英數 1–12，不含 `.` | 會自動轉小寫 |

純文字（含程式碼）在可預覽大小內會攜帶 `textContent`。

---

## 🔐 安全建議
| 主題 | 現況 | 可加強 |
|------|------|--------|
| 認證 | 無 | Worker 驗證 Header / Token |
| 濫用防護 | 無頻率限制 | Cloudflare Turnstile / IP 限制 |
| 檔案掃描 | 無 | 接入防毒 / 型別白名單 |
| 大檔策略 | Git 直接存 | 大檔轉 R2 / S3，留 meta 指標 |

---

## 🧪 手動測試清單
| 項目 | 步驟 | 預期 |
|------|------|------|
| 上傳 txt | 輸入文字送出 | Downloads 立即顯示，檔名不含 .txt，僅複製功能 |
| 上傳 md | 選 md 副檔名 | 可下載 + 預覽內容 |
| 上傳程式碼 js | 貼程式碼 | 高亮 + 行號 + 下載 + 預覽 |
| 上傳圖片 | 選 png | 有預覽 + 下載 |
| 自訂副檔名 note1 | 選 custom→note1 | 檔案以 .note1 儲存，可下載 |
| 同名衝突 | 重複自訂相同檔名 | 第二次回傳 409 |
| 刪除單檔 | Manage 刪除 | 清單更新消失 |
| 全刪 | Manage 全部刪除 | uploads 清空 |

---

## ❓ FAQ
**為何沒有 `.env`?** 前端不需要敏感資料；敏感值在 Worker 環境變數。  
**為何載入有時延遲?** 等待 GitHub API commit 完成；可加暫存層或 Queue。  
**可改用其他儲存?** 可，Worker 改寫為 R2/S3 Put + 產生清單 JSON。  
**可加登入?** 可自行在 Worker 加 Header 金鑰；本版本已移除 OAuth/CMS。  
**可支援更多語言高亮?** 引入對應 highlight.js 語言模組並註冊。

---

## 📌 近期變更摘要（簡化）
| 項目 | 說明 |
|------|------|
| 語法上色 | Downloads / Preview 高亮 + 行號 |
| 自訂副檔名 | 前端文字上傳支援 custom 副檔名 |
| 批次刪除 | Manage 支援全刪 |
| 隱藏 .txt | Downloads 顯示移除 .txt 尾綴 |
| 圖片預覽 | 圖片顯示縮放適應框 |

---

## 🧩 擴充建議
* 行號開關 / 主題切換 (light/dark)
* WebSocket / SSE 即時更新清單
* 內容全文搜尋（前端索引 / Worker 提供）
* Metadata（標籤 / 備註）側欄
* 上傳佇列 / 進度列 / 拖放

---

## 🪪 授權
MIT（可依需求自由調整，無附帶擔保）。

---

### English Summary (Brief)
This project is a database‑less file & text sharing platform: Vue 3 SPA frontend + Cloudflare Worker backend committing directly to a GitHub repository. Features include code highlighting with line numbers, custom text extensions, image preview, direct download forcing, and bulk deletion. Deploy by: (1) setting Worker with GitHub token, (2) pointing frontend config to Worker base, (3) building static assets for any static host. Security hardening (auth / rate limit / storage offloading) is intentionally minimal and can be layered on easily.

---

若需英文完整版或額外自動化腳本，可再提出需求。
