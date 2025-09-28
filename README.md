# Lightweight Paste & File Share<div align="center">



一個極簡的前端 + 無伺服器 (Serverless) 後端範例：前端使用 Vite + Vue 3，後端用 Cloudflare Worker 轉發並儲存內容到遠端 Git 平台 (例如 GitHub Repository)。可用來分享文字片段、Markdown、或小型檔案。# 瑼??澈 / ??鞎潛頂蝯?(Vue + Cloudflare Worker + GitHub)



> 本 README 不含任何個人資訊，全部教學以「你自己全新建立」為前提。銝??鞈?摨怒?敺垢???瑼??????澈撟喳??蝡舐 SPA嚗?蝡臭誑 Cloudflare Worker ?湔撖怠 GitHub Repository嚗???銝 / ?” / ?汗 / 銝? / ?芷 ?冽?蝔?犖??蝯?漱?摰嫘票蝔??挾???瑼?



---<sub>Chinese primary documentation. English summary below.</sub>

## 功能概要

- 上傳文字 / 檔案，產生條目 (entries)</div>

- 列表檢視與刪除

- 簡單語法高亮 (前端)---

- 後端不直接存使用者資料，只透過 API 寫入指定儲存庫

- 可修改擴充：改接不同的儲存 Provider (S3/R2/Git 服務等)## ???詨??寡

* ?∟??澈嚗?獢????單?獢??湔 commit ?脫?摰?GitHub Repo??* ?垢?單?憿舐內嚗?摮??批捆?券???嚗票銝??喳銴ˊ??* 隤?擃漁 + 銵?嚗?游虜閬?撘Ⅳ嚗s/ts/css/html/json/py 蝑???* ???舫?閬踝??嗡?瑼??湔銝???* ?芾?蝝?摮瑼?嚗xt / md / ?芾??望 1??2嚗?* ?芾?瑼?嚗???銵?????409??* ?寞活?芷 / ?格??芷??* ?∩蝙?刻???????獢惜蝝?* ?舀??摮惜?嗆?嚗??? GitHub嚗靘?游? R2 / S3嚗?

------

## 架構概念<div align="center">

```

[Browser SPA(Vue)] --fetch--> [Cloudflare Worker] --API--> [Git Provider (e.g. GitHub Repo)]# 檔案分享 / 文字貼系統 (Vue + Cloudflare Worker + GitHub)

```

- 前端：打包為靜態檔 (dist)；可部署到 GitHub Pages / 任何靜態空間一個「免資料庫、前後端分離」的檔案與純文字分享平台。前端為單頁 SPA，後端以 Cloudflare Worker 直接寫入 GitHub Repository，實作：上傳 / 列表 / 預覽 / 下載 / 刪除 全流程。適合個人或小組臨時交換內容、貼程式片段、傳遞附件。

- Worker：接受前端請求 (list / upload / delete)，再呼叫 Git 平台 API 建立 / 刪除檔案

- 儲存層：用每個 entry 一個檔案 (如 JSON / txt / 原始上傳資料)<sub>Chinese primary documentation. English summary below.</sub>



---</div>

## 專案目錄 (精簡)

```---

root

├─ src/                # Vue 3 前端程式碼## ✨ 功能特色

├─ public/             # 靜態資源* 無資料庫：檔案與文字即檔案 (commit 進 GitHub Repo)

├─ cloudflare/worker/  # Worker 原始碼 & wrangler 設定* 文字類貼上即顯示：小型文字內容預抓快取

├─ uploads/            # (執行中使用) 避免提交，可自訂忽略* 語法高亮 + 行號（精選語言：js / ts / css / html / json / py ...）

├─ package.json* 圖片預覽 / 其他格式直接下載

├─ vite.config.js* 自訂純文字副檔名（txt / md / 自訂英數 1–12）

└─ tailwind.config.js (若有使用 Tailwind)* 自訂檔名；同名檔衝突回傳 409

```* 批次刪除 / 單檔刪除 / 全清空

* 不蒐集使用者資料（僅檔案層級）

---* 可插拔儲存層架構（目前僅 GitHub，未來可擴充 R2 / S3）

## 你要準備什麼

1. 一個全新的 GitHub 帳號 (或你自己的組織倉庫) — 用來存放程式碼 & 建置頁面---

2. 另一個 Git Repository (可以同一個) 內作為『儲存資料的 Repo』 (或也可共用同一 Repo 的特定資料夾)；此範例假設資料與程式同一 Repo，但你可拆分

3. Cloudflare 帳號 + 已啟用 Workers + 產生 API Token (具 Workers KV/Deploy 權限若需)## 🧱 技術架構

4. GitHub Personal Access Token (若 Worker 要呼叫 GitHub API 建檔) — 建議範圍：repo (最小化再自行調整)| 層 | 技術 | 路徑 | 說明 |

|----|------|------|------|

---| 前端 SPA | Vue 3 + Vite + Tailwind | `src/` | UI / 上傳 / 管理 / 預覽 |

## 步驟總覽| 後端 | Cloudflare Worker (TypeScript) | `cloudflare/worker/` | 接收上傳、呼叫 GitHub API、列出與刪除 |

1. Fork 或 Clone 專案模板 (或直接用本目錄結構自建)| 儲存 | GitHub Repository | `uploads/` (動態產生) | 檔案即資料，不需 DB |

2. 安裝依賴並跑本地開發| 語法上色 | highlight.js (on-demand) | 前端 | Downloads / Preview 高亮 |

3. 建立 GitHub Personal Access Token

4. 建立 Cloudflare Worker 並設定環境變數 (儲存 Git Token、Repo 名稱等)### 目錄概覽

5. 建置前端並部署到 GitHub Pages (或其他靜態空間)```

6. 測試前端是否能透過 Worker 寫入 Repositorysrc/

7. (選用) 增加其他儲存 Provider	views/               # Downloads / Manage / Preview / Upload

	components/          # UI 元件（含 UploadPanel）

---	composables/         # 狀態與資料取得 (useSiteContent, useStorageProvider)

## 詳細教學	services/            # GitHub / Worker API 呼叫封裝

### 1. 取得程式碼cloudflare/worker/     # Worker 入口與邏輯

你可以：public/                # 靜態資源

- 直接 `git init` + 建立對應檔案 (複製此 README 所示結構)uploads/               # 上傳後（部署執行時）生成的檔案（git 忽略）

- 或從一個空白模板開始 (如 `npm create vite@latest` 選 Vue)，再加上 `cloudflare/worker` 目錄```



### 2. 安裝依賴 (前端)---

```

npm install## 🚦 運作流程

npm run dev1. 前端上傳（文字或檔案）→ 呼叫 Worker `/upload`

```2. Worker 驗證後組檔名（時間戳 + 可選自訂）→ Base64 commit 至 GitHub

瀏覽器開啟顯示本地開發頁面 (預設 http://localhost:5173)。3. 前端呼叫 `/uploads` 取得列表（Worker / GitHub API fallback）

4. 純文字小檔案 Worker 直接附帶 `textContent` 供即時顯示

### 3. 設定遠端儲存 (以 GitHub 為例)5. 下載：透過 Blob 觸發瀏覽器下載，不直接打開原始檔路徑

- 到 GitHub → Settings → Developer settings → Personal access tokens → 建立 Token6. 刪除：Worker 依路徑刪除 GitHub 版本；支援批次與全刪

- 勾選最低限度：`repo` (若你要放公開倉庫，可視情況縮減)

- 複製 Token (只會顯示一次)---



### 4. 建立 Cloudflare Worker## 📤 上傳規則

(1) 安裝 Wrangler CLI (若尚未安裝)| 類型 | 檔名模式 | 備註 |

```|------|----------|------|

npm install -g wrangler| 文字貼 | `timestamp-base.txt|md|<custom>` | timestamp ISO（去冒號/點） + 選填名 |

```| 檔案 | `timestamp-base.ext` / `base.ext` | 自訂名衝突 → 409 |

(2) 登入| 自訂副檔名 | 英數 1–12，不含 `.` | 自動轉小寫 |

```

wrangler login純文字（含程式碼）在大小閾值內會攜帶 `textContent`，減少後續再抓取。

```

(3) 編輯 `cloudflare/worker/wrangler.toml`，填入：---

```

name = "your-worker-name"## 🔐 安全與強化建議

main = "src/index.ts"| 面向 | 現況 | 可加強 |

compatibility_date = "2024-05-01"|------|------|--------|

```| 認證 | 無 | Worker Token / Basic Auth / Header Key |

(4) 設定環境變數 (Secrets)| 濫用防護 | 無頻率限制 | Cloudflare Turnstile / KV 計數 / IP 限制 |

```| 檔案型別 | 前端副檔名限制 | Worker MIME 白名單 + 大檔拒絕 |

wrangler secret put GIT_TOKEN| 儲存成本 | 全部進 Git | 大檔轉 R2 / S3，僅留 Metadata 指標 |

wrangler secret put GIT_OWNER          # 例如 your-github-username 或 org| 秘密管理 | PAT 設於 Worker | 可改 GitHub App 安全性更佳 |

wrangler secret put GIT_REPO           # 例如 your-data-repo

wrangler secret put GIT_BRANCH         # 例如 main---

```

如果你在程式碼中還需要 base path，可另外：## 🧩 可插拔儲存層 (Storage Provider)

```目前僅啟用 `GitHub (Worker)`。架構已抽象：

wrangler secret put GIT_BASE_PATH      # 例如 entries/  (可選)1. 新增 provider：`src/services/storageProviders.js`

```2. 實作 `list / deleteOne / deleteMany / (upload)`

(5) 部署 Worker3. 加入 `listProviders()` 回傳陣列

```4. Worker 視需要新增後端路由（或共用 `/upload`）

cd cloudflare/worker5. 多 provider 後 UI 自動顯示下拉選擇

wrangler deploy

```---

取得 Worker 公開 URL，例如：`https://your-worker-name.your-subdomain.workers.dev`

## 🛠 本地開發

### 5. 前端環境變數```

建立 `.env` (或 `.env.production`)：npm install

```npm run dev

VITE_API_BASE=https://your-worker-name.your-subdomain.workers.dev```

```建置預覽：

若前端有要顯示特定標題也可加入：```

```npm run build

VITE_APP_TITLE=Lightweight Paste Sharenpm run preview

``````

重新啟動 dev 伺服器。

Cloudflare Worker：

### 6. 打包與部署前端```

(以 GitHub Pages 為例)cd cloudflare/worker

(1) 在 `package.json` scripts 已存在：npm install

```wrangler deploy

"build": "vite build"```

```

(2) 執行：必要環境變數：`GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, （可選）`GITHUB_BRANCH`, `MAX_FILE_SIZE`, `ALLOWED_EXTENSIONS`

```

npm run build---

```

產出 `dist/`。## 🧪 基本測試清單

(3) 部署方式 A：GitHub Pages (Actions)| 項目 | 步驟 | 預期 |

   - 建立 `.github/workflows/deploy.yml` (若尚未存在) 內容例如：|------|------|------|

```| 上傳 txt | 貼文字 → 上傳 | 立即顯示（不含 .txt 尾綴） |

name: build-and-deploy| 上傳程式碼 | 貼 JS | 高亮 + 行號 |

on:| 上傳圖片 | 選 png | 圖片預覽 |

  push:| 自訂副檔名 | 選 custom→`note1` | 以 .note1 儲存可下載 |

    branches: [ main ]| 同名衝突 | 重覆同自訂檔名 | 第二次 409 |

permissions:| 批次刪除 | 勾選多筆刪除 | 列表同步更新 |

  contents: read| 全部清空 | 一鍵清空 | uploads 清空 |

  pages: write

  id-token: write---

jobs:

  build:## ❓ FAQ（節錄）

    runs-on: ubuntu-latest**為什麼沒有 .env？** 前端不需要敏感值；秘密放 Worker。

    steps:**可以換 R2 / S3 嗎？** 可以，實作新 provider + Worker 路由即可。

      - uses: actions/checkout@v4**可加登入？** Worker 加驗證 Header 或 JWT。

      - uses: actions/setup-node@v4**語言高亮擴充？** 引入對應 highlight.js 語言模組。

        with:

          node-version: 20---

          cache: npm

      - run: npm ci## 🪪 授權

      - run: npm run buildMIT

      - uses: actions/upload-pages-artifact@v3

        with:---

          path: dist

  deploy:### English Summary

    needs: buildThis is a database-less file & text paste platform: Vue 3 SPA + Cloudflare Worker committing directly to a GitHub repository. Features include code highlighting with line numbers, custom text extensions, image preview, bulk deletion, and a pluggable storage provider layer (currently GitHub only). Future storage backends (R2 / S3) can be added by implementing a new provider module and optional Worker routes. Security hardening (auth / rate limiting / file scanning) is intentionally minimal and can be layered later.

    runs-on: ubuntu-latest

    environment:---

      name: github-pages

      url: ${{ steps.deployment.outputs.page_url }}若需要添加更多章節（架構圖 / 截圖 / Roadmap），請提出即可補上。

    steps:### English Summary (Brief)

      - id: deployment

        uses: actions/deploy-pages@v4This project is a database?ess file & text sharing platform: Vue 3 SPA frontend + Cloudflare Worker backend committing directly to a GitHub repository. Features include code highlighting with line numbers, custom text extensions, image preview, direct download forcing, and bulk deletion. Deploy by: (1) setting Worker with GitHub token, (2) pointing frontend config to Worker base, (3) building static assets for any static host. Security hardening (auth / rate limit / storage offloading) is intentionally minimal and can be layered on easily.

```
   - 到 Repo Settings → Pages → Source 選 GitHub Actions

(4) 部署方式 B：任意靜態空間 (如 Cloudflare Pages / Netlify)
   - Build command: `npm run build`
   - Output directory: `dist`

### 7. 測試流程
1. 前端載入後用 UI 上傳一段文字
2. Worker 收到 POST → 轉為檔案 (例如 `timestamp-id.json`) → 呼叫 Git 平台 API 建檔
3. 前端重新取得列表 (GET) 應看到剛剛的條目
4. 測試刪除 (DELETE) 是否成功移除

### 8. 安全與注意事項
- Token 請只放在 Worker Secret；前端絕不直接暴露
- 可在 Worker 加簡易 Rate Limit (例如依 IP 計數)
- 檔名建議使用 timestamp + 隨機字串，避免覆寫
- 若允許檔案上傳，務必檢查大小與類型 (避免可執行檔)；可只允許純文字
- 可以加簽章 / HMAC 作為額外驗證 (前端送隨機 nonce + Worker 驗證)

### 9. 擴充想法
- 第二種儲存：Cloudflare R2 / S3 (抽象 provider interface)
- 加入「唯讀分享連結」模式 (hash 路徑)
- 支援 Markdown 即時預覽
- Webhook 通知 (新增/刪除時觸發)
- 簡單使用者認證 (如 pre-shared token)

### 10. 移除範例 / 客製化建議
- 將 UI 標題 / favicon 改成你的品牌
- 替換任何預設 CSS 配色
- 若不需要刪除功能，可在前端隱藏刪除按鈕，後端保留保護

### 11. 常見問題 (FAQ)
Q: 一定要用 GitHub 嗎？
A: 否，可以改 Worker 呼叫另一個 API（例如上傳到 S3 / R2）。

Q: 為什麼不用直接從前端寫 GitHub？
A: 不安全；Token 不能暴露在瀏覽器。Worker 是受控代理層。

Q: 可以上傳二進位檔嗎？
A: 可以，但需 Worker 調整為 base64 / binary 處理並限制大小。

Q: 佈署後 404？
A: 若使用 GitHub Pages，請確認 SPA fallback：可加 `404.html` 並複製 `index.html` 內容以支援路由重整。

---
## 開發指令速查
```
npm run dev      # 本地開發
npm run build    # 打包
```
(若有 lint / test 可自行擴充 scripts)

---
## 授權
可自由修改再利用；若公開發佈請自行檢查安全性設定。

---
## English Summary
A minimal paste/file share: Vue 3 SPA + Cloudflare Worker proxying writes to a Git-based storage (e.g., GitHub). Follow steps above to provision your own repo, token, worker, and deploy static frontend (Pages or any static host). Extend by adding storage providers or security layers.
