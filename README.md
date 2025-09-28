# File Share Service

一個極簡「本人自用」的小型檔案分享 / 暫存服務。前端 (Vue + Vite + Tailwind) 直接把文字或檔案上傳到本 repo 的 `uploads/` 資料夾（原 `site/uploads/` 已改名），生成時間戳檔名，並提供管理/下載/刪除介面。

> 注意：這個倉庫存在的唯一目的就是承載這個上傳服務。不要 fork、不要 clone、不要複製架構去做公開服務。

## 為什麼做這個？
臨時跨裝置傳文字 / 一兩個小檔，不想開雲端硬碟，也不想再寫後端，乾脆用 GitHub repo 當儲存載體。

## 技術堆疊
* Vue 3 + Vite
* Tailwind CSS
* GitHub Contents API (直接呼叫)
* Token 以「混淆後嵌入」方式存在（可逆還原，僅為了避免GitHub Push Protection）

## 使用方式（作者自用流程）
1. 產生 fine‑grained PAT（限定此 repo，Contents: Read/Write）。
2. `node scripts/obfuscate-token.mjs <PAT> ./scripts/obf.json`
3. 把輸出 JSON 貼入 `src/services/secretToken.js` 的 `OBF_DATA`。
4. Build / 部署（GitHub Pages）。
5. 介面直接使用，不需再輸入 Token。

## 檔名規則
`<ISO時間戳>-<處理後名稱>.<副檔>`，避免覆蓋與亂碼，名稱來自：
* 自訂檔名或訊息前幾個詞
* 若為檔案上傳則取原檔名主體

## 主要目錄
* `src/views/*` 上傳 / 管理 / 預覽頁
* `src/services/storageProviders.js` GitHub provider 實作（路徑已改為 `uploads/`）
* `src/services/secretToken.js` 嵌入混淆 token（已載入）
* `scripts/obfuscate-token.mjs` 產生混淆資料

## 不要 Fork / Clone
這不是一個「給別人用」的專案：
* 沒有真正安全防護
* 沒有使用者隔離 / 驗證
* Token 可以被還原或攔截
* 功能刻意單純，只滿足個人習慣

如果你需要類似服務：請自己寫後端或用現成的檔案分享平台，不建議照抄此模式。

## 最簡短的安全備註（只講一次）
嵌入的 Token 可以被還原，也可以被網路攔截。若壞掉 / 被濫用就直接 Revoke PAT 重嵌。這裡不做更多防護，也不接受安全 issue。

## 回復舊架構
* Worker 版本：`git checkout worker-version-backup`
* Runtime 輸入 Token：復原舊的 token 輸入欄位邏輯即可。

## 授權
MIT（只是表示程式碼授權寬鬆，仍請不要直接複製部署公開服務）

---

