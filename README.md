# File Share (Direct GitHub Runtime Token)

此版本移除 Cloudflare Worker，改為「前端直接呼叫 GitHub Contents API」。Token 不再硬寫在程式碼，而是啟動後由瀏覽器使用者輸入並存在 localStorage（key: `gh:token`）。

> 備份：原 Worker 版在分支 `worker-version-backup`。

## 目前行為
* 上傳：直接以 GitHub API `PUT /repos/:owner/:repo/contents/site/uploads/<檔名>` 寫入。
* 刪除：先 GET 取得 `sha`，再 `DELETE`。
* 列出：`GET /contents/site/uploads` 讀取檔案列表。
* 檔名：`<ISO 時間戳>-<簡化名稱>.<副檔>`，避免覆蓋。

## Token 使用流程 (runtime)
1. 到 GitHub Developer settings 產生 fine‑grained PAT（僅此 repo，Content: Read/Write）。
2. 首次開啟「管理」頁時，輸入 Token 並儲存；頁面會重新載入。
3. Token 會被切片後組合送出 API，僅存於瀏覽器 localStorage，不進入程式碼版本控制。
4. 要移除：管理頁點「移除」按鈕或手動清除 localStorage。

### 風險與提醒
* 前端環境無法真正保護 Token（DevTools 可查看）。
* 避免公開部署網址；若外流立即 Revoke & 重發。
* 不適合多人共用或大量流量情境。

## 主要檔案調整
* `src/services/storageProviders.js` 新增 `github-direct` provider。
* `src/composables/useStorageProvider.js` 支援 `directTokenParts`。
* `src/views/ManageView.vue`、`UploadView.vue` 改用 runtime token direct provider。
* `src/composables/useSiteContent.js` 取消 worker fallback。
* 已移除 `cloudflare/worker/` 目錄（見備份分支）。

## 回到舊版（含 Worker）
```bash
git checkout worker-version-backup
```

## 風險聲明
此模式不適合：
* 公開網站
* 匿名多人上傳
* 想避免 token 洩漏

用途僅限作者本機 / 私人使用測試。若 token 遭濫用：
1. Revoke PAT。
2. 產生新 PAT 並重新輸入。
3. 檢查最近 commit 是否被竄改並 revert。

## 授權
MIT

---
如果你不是作者本人，請勿複製此做法到公開專案；請改用後端 / 邊緣服務封裝。

