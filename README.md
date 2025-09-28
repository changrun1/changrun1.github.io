# File Share (Direct GitHub Version)

此分支/版本已移除 Cloudflare Worker，改為「前端直接呼叫 GitHub Contents API」上傳 / 列出 / 刪除檔案。純個人自用，不考慮多人 / 公開安全情境。

> 備份：原 Worker 版已建立分支 `worker-version-backup`，需要可切換回去。

## 目前行為
* 上傳：直接以 GitHub API `PUT /repos/:owner/:repo/contents/site/uploads/<檔名>` 寫入。
* 刪除：先 GET 取得 `sha`，再 `DELETE`。
* 列出：`GET /contents/site/uploads` 讀取檔案列表。
* 檔名：`<ISO 時間戳>-<簡化名稱>.<副檔>`，避免覆蓋。

## Token 使用與「混淆」
程式碼內保留一個 `directTokenParts` 陣列，將 GitHub Fine-grained PAT 拆成多段再 `join`。這只是在阻擋最粗糙的全文檢索，並不是真正安全：

```js
const directTokenParts = [ 'ghp_', 'REPLACE', 'ME', '_TOKEN' ]
// 實際使用時自行改成真實 token 片段，例如：
// ['ghp_xxxxx', 'yyyyy', 'zzzzz']
```

任何人只要能載入此瀏覽器程式，就能在 Sources / Network 查看完整 Token。

### 如果真的要稍微降低風險：
1. 使用 fine-grained PAT，僅允許本 repo Content read/write。
2. 定期 rotate。
3. 不要公開此部署網址。
4. 若未來要分享給他人，用 Worker / Proxy 再包一層。

## 主要檔案調整
* `src/services/storageProviders.js` 新增 `github-direct` provider。
* `src/composables/useStorageProvider.js` 支援 `directTokenParts`。
* `src/views/ManageView.vue`、`UploadView.vue` 改用 direct provider。
* `src/composables/useSiteContent.js` 取消 worker fallback。
* `cloudflare/worker/` 仍暫留（備份，之後可刪）。

## 回到舊版（含 Worker）
```bash
git checkout worker-version-backup
```

## 風險聲明
此模式不適合：
* 公開網站
* 匿名多人上傳
* 想避免 token 洩漏

用途僅限作者本機 / 私人使用測試。

## 授權
MIT

---
如果你不是作者本人，請勿複製此做法到公開專案；請改用後端 / 邊緣服務封裝。

