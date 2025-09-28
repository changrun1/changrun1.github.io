# 快速部署範本 (Minimal Paste Share)

> 目標：5~10 分鐘內從零建立「前端 + Worker + Git 儲存」的可用環境。
> 僅保留必要檔案與指令，全部可複製後直接修改。

---
## 1. 最小檔案結構
```
project-root/
  package.json
  vite.config.js
  tailwind.config.js (可選)
  postcss.config.js (可選)
  index.html
  src/
    main.js
    App.vue
    services/api.js
  .env                # 實際部署填入 (不進版控)
  .env.example        # 範例 (進版控)
  cloudflare/
    worker/
      wrangler.toml
      src/
        index.ts
  .github/
    workflows/
      deploy.yml       # (GitHub Pages 部署流程)
```

---
## 2. package.json (最小)
```json
{
  "name": "paste-share",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.21"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^6.0.1",
    "vite": "^7.1.7"
  }
}
```
(你現有的可直接用，不必硬砍。)

---
## 3. .env / .env.example
```
VITE_API_BASE=https://<your-worker>.workers.dev
VITE_APP_TITLE=Paste Share
```
> 部署時複製 `.env.example` 為 `.env`，修改 Worker URL。

---
## 4. Cloudflare Worker 設定
`cloudflare/worker/wrangler.toml`
```toml
name = "paste-share-worker"
main = "src/index.ts"
compatibility_date = "2024-09-30"
compatibility_flags = ["nodejs_compat"]
workers_dev = true

[vars]
GITHUB_OWNER = "<your-gh-user>"
GITHUB_REPO = "<your-gh-repo>"       # 可用同一個或獨立儲存專案
GITHUB_BRANCH = "main"
MAX_FILE_SIZE = "10485760"
```
> Secrets 另外設定：`GITHUB_TOKEN`

新增程式 `cloudflare/worker/src/index.ts` (簡化示例)：
```ts
export default { async fetch(req: Request): Promise<Response> {
  const url = new URL(req.url)
  if (url.pathname === '/uploads' && req.method === 'GET') {
    // TODO: 呼叫 GitHub API list
    return json([])
  }
  if (url.pathname === '/upload' && req.method === 'POST') {
    const body = await req.json().catch(()=>null)
    // body: { type:'text'|'file', content(base64或純文字), filename? }
    // TODO: 轉成 base64 -> PUT /repos/:o/:r/contents/uploads/<file>
    return json({ id: 'demo', name: body?.filename || 'note.txt' })
  }
  if (url.pathname.startsWith('/uploads/') && req.method === 'DELETE') {
    // TODO: DELETE API 需 sha
    return json({ deleted: true })
  }
  return json({ error: 'NOT_FOUND' }, 404)
}}
function json(d: any, s=200){return new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json'}})}
```
部署流程：
```
cd cloudflare/worker
wrangler login
wrangler secret put GITHUB_TOKEN   # PAT (repo content write)
wrangler deploy
```
拿到：`https://paste-share-worker.<sub>.workers.dev`

---
## 5. 前端最小程式
`src/services/api.js`
```js
const base = import.meta.env.VITE_API_BASE
export const listUploads = () => fetch(base + '/uploads').then(r=>r.json())
export const uploadText = (text, filename='note.txt') => fetch(base + '/upload', {
  method:'POST', headers:{'Content-Type':'application/json'},
  body: JSON.stringify({ type:'text', content: text, filename })
}).then(r=>r.json())
export const deleteOne = id => fetch(base + '/uploads/' + id, { method:'DELETE'}).then(r=>r.json())
```
`src/main.js`
```js
import { createApp } from 'vue'
import App from './App.vue'
createApp(App).mount('#app')
```
`src/App.vue`
```vue
<script setup>
import { ref, onMounted } from 'vue'
import { listUploads, uploadText, deleteOne } from './services/api'
const text = ref('')
const list = ref([])
async function refresh(){ list.value = await listUploads() }
async function doUpload(){
  if(!text.value.trim()) return
  await uploadText(text.value)
  text.value=''
  await refresh()
}
onMounted(refresh)
</script>
<template>
  <h1>{{ import.meta.env.VITE_APP_TITLE }}</h1>
  <textarea v-model="text" placeholder="貼上文字"></textarea>
  <button @click="doUpload">上傳</button>
  <ul>
    <li v-for="f in list" :key="f.id">
      {{ f.name }} <button @click="deleteOne(f.id).then(refresh)">刪</button>
    </li>
  </ul>
</template>
<style>
textarea{width:100%;height:120px;margin:8px 0;}
</style>
```
啟動：
```
npm install
npm run dev
```

---
## 6. GitHub Pages 部署 (Actions)
`.github/workflows/deploy.yml`
```yml
name: pages
on: { push: { branches: [ main ] } }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
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
    environment: { name: github-pages }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
Settings -> Pages -> Source 選 GitHub Actions。
(若 SPA 刷新 404，複製 `index.html` 為 `404.html`)

---
## 7. 你需要自己補完的 (Worker 真實功能)
- 產生唯一檔名：ISO 時間戳 + slug
- base64 編碼文字內容 (`btoa(unescape(encodeURIComponent(text)))`)
- PUT 建立：`PUT /repos/{owner}/{repo}/contents/uploads/<file>` (body: {message, content, branch})
- 列表：`GET /repos/{owner}/{repo}/contents/uploads?ref=branch`
- 刪除：先查檔案取得 sha，再 `DELETE /repos/{owner}/{repo}/contents/uploads/<file>`

---
## 8. 驗證 Checklist
- [ ] 前端能上傳文字拿到 id
- [ ] GitHub repo `uploads/` 看到新檔
- [ ] 列表能顯示檔名
- [ ] 刪除後檔案從 Git 消失
- [ ] Pages 網站可瀏覽並操作

---
## 9. 常見錯誤
| 情況 | 排查 |
|------|------|
| 401 Unauthorized (GitHub) | PAT scope 不足或沒設 secret |
| 404 列表為空 | `uploads/` 尚未建立；先上傳一個檔案 |
| CORS | 確認 Worker 回應加上 `Access-Control-Allow-Origin: *` |

---
## 10. 一行重建 (選擇性 / macOS or WSL)
```bash
# scaffold
npm create vite@latest paste-share -- --template vue && cd paste-share \
&& mkdir -p cloudflare/worker/src .github/workflows src/services \
&& printf "VITE_API_BASE=\nVITE_APP_TITLE=Paste Share\n" > .env.example \
&& npm i vue \
&& npm i -D @vitejs/plugin-vue vite
```
(Windows PowerShell 可分行執行，不強求一行。)

---
完成。把這個檔案複製到你的新專案即可快速啟動。
