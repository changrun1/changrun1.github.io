# File Share (Embedded Obfuscated Token)

此版本：
* 已移除 Cloudflare Worker（備份在分支 `worker-version-backup`）。
* GitHub PAT 以「多層混淆」方式嵌入前端程式（非使用者 runtime 輸入）。
* 混淆目標：避開最粗糙的字串掃描、降低直接搜尋關鍵字 `github_pat_` 或 `ghp_` 被攔截的機率。
* 再次強調：這 **不是安全機制**，任何人能下載 bundle 就能還原。僅用於你本人臨時、低風險、低流量自用情境。

## 功能摘要
* 上傳：`PUT /repos/:owner/:repo/contents/site/uploads/<檔名>`
* 刪除：取得 sha 後 `DELETE /contents/...`
* 列出：`GET /contents/site/uploads`
* 命名：`<ISO 時間戳>-<簡化名稱>.<副檔>` 避免覆蓋
* Provider：`github-embedded` (內嵌混淆 Token)

## 混淆流程概念
1. 使用腳本 `scripts/obfuscate-token.mjs` 將原始 PAT 切片 + 插入假片段。
2. 片段亂序後對真實片段做 XOR → base64。
3. 產出 JSON 結構：`{ v,k,s,o }`：
	* `k`: XOR key (hex)
	* `s`: 切片陣列（含真假片段、各自 base64 編碼）
	* `o`: 真實片段索引序列（還原順序）
4. 貼到 `src/services/secretToken.js` 的 `OBF_DATA`。
5. 執行 build 時 token 會跟著被打包（可逆）。

## 使用方式（嵌入或更新 Token）
1. 建 fine‑grained PAT：限制單一 repo，僅 Content Read/Write。
2. 於專案根目錄執行：
	```bash
	node scripts/obfuscate-token.mjs <你的PAT> ./scripts/obf.json
	```
3. 開啟 `scripts/obf.json` 複製整個 JSON 物件內容。
4. 貼到 `src/services/secretToken.js` 將 `const OBF_DATA = null` 改為：
	```js
	const OBF_DATA = { ...複製的 JSON ... }
	```
5. （可選）刪除 `scripts/obf.json`，避免誤傳。
6. build/deploy。

## 主要檔案
* `scripts/obfuscate-token.mjs`：產生混淆 JSON。
* `src/services/secretToken.js`：還原方法 `getEmbeddedToken()`。
* `src/services/storageProviders.js`：新增 `createEmbeddedGitHubProvider`。
* `src/composables/useStorageProvider.js`：加入 `useEmbeddedToken` 參數。
* `src/views/ManageView.vue`、`UploadView.vue`：移除 runtime token UI。

## 風險 & 限制 (請完整閱讀)
| 項目 | 說明 |
|------|------|
| 洩漏風險 | 任何人可格式化/還原混淆資料取得原始 Token。 |
| Push Protection | GitHub 仍可能偵測到（尤其若 PAT 前綴保留原樣）。如遭阻擋需於 PR / push 介面手動允許（極不建議）。 |
| 濫用 | 網址公開後他人即可代你上傳/刪除。 |
| 撤銷 | 一旦懷疑外流：Revoke PAT → 重新產生 → 重新 obfuscate → 重建部署。 |
| 不適用 | 公開分享、多人協作、商業或任何需要審計/權限控管的場景。 |

## 建議 (仍想用時)
* 使用最小權限、最短期限的 PAT。
* 避免將 repo 設為公開（或另外 fork 私有）。
* 必要時自建簡易後端加一層權杖驗證。 

## 回到 runtime 輸入模式
檢出上一提交或還原 `ManageView.vue`、`UploadView.vue` 內的 token input 區塊，自行改回 `useStorageProvider({ directTokenParts })`。

## 回到 Worker 版本
```bash
git checkout worker-version-backup
```

## 授權
MIT

---
此做法僅供個人快速自用測試示範。不要在任何需要真正安全的情境使用嵌入式 PAT。

