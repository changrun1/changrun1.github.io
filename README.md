<div align="center">

# 瑼??澈 / ??鞎潛頂蝯?(Vue + Cloudflare Worker + GitHub)

銝??鞈?摨怒?敺垢???瑼??????澈撟喳??蝡舐 SPA嚗?蝡臭誑 Cloudflare Worker ?湔撖怠 GitHub Repository嚗???銝 / ?” / ?汗 / 銝? / ?芷 ?冽?蝔?犖??蝯?漱?摰嫘票蝔??挾???瑼?

<sub>Chinese primary documentation. English summary below.</sub>

</div>

---

## ???詨??寡
* ?∟??澈嚗?獢????單?獢??湔 commit ?脫?摰?GitHub Repo??* ?垢?單?憿舐內嚗?摮??批捆?券???嚗票銝??喳銴ˊ??* 隤?擃漁 + 銵?嚗?游虜閬?撘Ⅳ嚗s/ts/css/html/json/py 蝑???* ???舫?閬踝??嗡?瑼??湔銝???* ?芾?蝝?摮瑼?嚗xt / md / ?芾??望 1??2嚗?* ?芾?瑼?嚗???銵?????409??* ?寞活?芷 / ?格??芷??* ?∩蝙?刻???????獢惜蝝?* ?舀??摮惜?嗆?嚗??? GitHub嚗靘?游? R2 / S3嚗?
---
<div align="center">

# 檔案分享 / 文字貼系統 (Vue + Cloudflare Worker + GitHub)

一個「免資料庫、前後端分離」的檔案與純文字分享平台。前端為單頁 SPA，後端以 Cloudflare Worker 直接寫入 GitHub Repository，實作：上傳 / 列表 / 預覽 / 下載 / 刪除 全流程。適合個人或小組臨時交換內容、貼程式片段、傳遞附件。

<sub>Chinese primary documentation. English summary below.</sub>

</div>

---

## ✨ 功能特色
* 無資料庫：檔案與文字即檔案 (commit 進 GitHub Repo)
* 文字類貼上即顯示：小型文字內容預抓快取
* 語法高亮 + 行號（精選語言：js / ts / css / html / json / py ...）
* 圖片預覽 / 其他格式直接下載
* 自訂純文字副檔名（txt / md / 自訂英數 1–12）
* 自訂檔名；同名檔衝突回傳 409
* 批次刪除 / 單檔刪除 / 全清空
* 不蒐集使用者資料（僅檔案層級）
* 可插拔儲存層架構（目前僅 GitHub，未來可擴充 R2 / S3）

---

## 🧱 技術架構
| 層 | 技術 | 路徑 | 說明 |
|----|------|------|------|
| 前端 SPA | Vue 3 + Vite + Tailwind | `src/` | UI / 上傳 / 管理 / 預覽 |
| 後端 | Cloudflare Worker (TypeScript) | `cloudflare/worker/` | 接收上傳、呼叫 GitHub API、列出與刪除 |
| 儲存 | GitHub Repository | `uploads/` (動態產生) | 檔案即資料，不需 DB |
| 語法上色 | highlight.js (on-demand) | 前端 | Downloads / Preview 高亮 |

### 目錄概覽
```
src/
	views/               # Downloads / Manage / Preview / Upload
	components/          # UI 元件（含 UploadPanel）
	composables/         # 狀態與資料取得 (useSiteContent, useStorageProvider)
	services/            # GitHub / Worker API 呼叫封裝
cloudflare/worker/     # Worker 入口與邏輯
public/                # 靜態資源
uploads/               # 上傳後（部署執行時）生成的檔案（git 忽略）
```

---

## 🚦 運作流程
1. 前端上傳（文字或檔案）→ 呼叫 Worker `/upload`
2. Worker 驗證後組檔名（時間戳 + 可選自訂）→ Base64 commit 至 GitHub
3. 前端呼叫 `/uploads` 取得列表（Worker / GitHub API fallback）
4. 純文字小檔案 Worker 直接附帶 `textContent` 供即時顯示
5. 下載：透過 Blob 觸發瀏覽器下載，不直接打開原始檔路徑
6. 刪除：Worker 依路徑刪除 GitHub 版本；支援批次與全刪

---

## 📤 上傳規則
| 類型 | 檔名模式 | 備註 |
|------|----------|------|
| 文字貼 | `timestamp-base.txt|md|<custom>` | timestamp ISO（去冒號/點） + 選填名 |
| 檔案 | `timestamp-base.ext` / `base.ext` | 自訂名衝突 → 409 |
| 自訂副檔名 | 英數 1–12，不含 `.` | 自動轉小寫 |

純文字（含程式碼）在大小閾值內會攜帶 `textContent`，減少後續再抓取。

---

## 🔐 安全與強化建議
| 面向 | 現況 | 可加強 |
|------|------|--------|
| 認證 | 無 | Worker Token / Basic Auth / Header Key |
| 濫用防護 | 無頻率限制 | Cloudflare Turnstile / KV 計數 / IP 限制 |
| 檔案型別 | 前端副檔名限制 | Worker MIME 白名單 + 大檔拒絕 |
| 儲存成本 | 全部進 Git | 大檔轉 R2 / S3，僅留 Metadata 指標 |
| 秘密管理 | PAT 設於 Worker | 可改 GitHub App 安全性更佳 |

---

## 🧩 可插拔儲存層 (Storage Provider)
目前僅啟用 `GitHub (Worker)`。架構已抽象：
1. 新增 provider：`src/services/storageProviders.js`
2. 實作 `list / deleteOne / deleteMany / (upload)`
3. 加入 `listProviders()` 回傳陣列
4. Worker 視需要新增後端路由（或共用 `/upload`）
5. 多 provider 後 UI 自動顯示下拉選擇

---

## 🛠 本地開發
```
npm install
npm run dev
```
建置預覽：
```
npm run build
npm run preview
```

Cloudflare Worker：
```
cd cloudflare/worker
npm install
wrangler deploy
```

必要環境變數：`GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, （可選）`GITHUB_BRANCH`, `MAX_FILE_SIZE`, `ALLOWED_EXTENSIONS`

---

## 🧪 基本測試清單
| 項目 | 步驟 | 預期 |
|------|------|------|
| 上傳 txt | 貼文字 → 上傳 | 立即顯示（不含 .txt 尾綴） |
| 上傳程式碼 | 貼 JS | 高亮 + 行號 |
| 上傳圖片 | 選 png | 圖片預覽 |
| 自訂副檔名 | 選 custom→`note1` | 以 .note1 儲存可下載 |
| 同名衝突 | 重覆同自訂檔名 | 第二次 409 |
| 批次刪除 | 勾選多筆刪除 | 列表同步更新 |
| 全部清空 | 一鍵清空 | uploads 清空 |

---

## ❓ FAQ（節錄）
**為什麼沒有 .env？** 前端不需要敏感值；秘密放 Worker。
**可以換 R2 / S3 嗎？** 可以，實作新 provider + Worker 路由即可。
**可加登入？** Worker 加驗證 Header 或 JWT。
**語言高亮擴充？** 引入對應 highlight.js 語言模組。

---

## 🪪 授權
MIT

---

### English Summary
This is a database-less file & text paste platform: Vue 3 SPA + Cloudflare Worker committing directly to a GitHub repository. Features include code highlighting with line numbers, custom text extensions, image preview, bulk deletion, and a pluggable storage provider layer (currently GitHub only). Future storage backends (R2 / S3) can be added by implementing a new provider module and optional Worker routes. Security hardening (auth / rate limiting / file scanning) is intentionally minimal and can be layered later.

---

若需要添加更多章節（架構圖 / 截圖 / Roadmap），請提出即可補上。
### English Summary (Brief)

This project is a database?ess file & text sharing platform: Vue 3 SPA frontend + Cloudflare Worker backend committing directly to a GitHub repository. Features include code highlighting with line numbers, custom text extensions, image preview, direct download forcing, and bulk deletion. Deploy by: (1) setting Worker with GitHub token, (2) pointing frontend config to Worker base, (3) building static assets for any static host. Security hardening (auth / rate limit / storage offloading) is intentionally minimal and can be layered on easily.
