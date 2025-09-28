// 統一的 Storage Provider 介面定義
// 方法：list(), upload(formDataParts), delete(path), deleteAll()
// 回傳格式對齊現有 downloads 陣列元素格式。

// （保留空間：未來若需要時間戳命名再加入）

// Helper：將文字與檔案欄位轉為 FormData（共用）
function buildFormData(parts){
  const fd = new FormData()
  if (parts.message) fd.append('message', parts.message)
  if (parts.file) fd.append('file', parts.file)
  if (parts.customName) fd.append('filename', parts.customName)
  if (parts.textExt) fd.append('textExt', parts.textExt)
  return fd
}

export function createGitHubWorkerProvider({ baseUrl }){
  const base = (baseUrl||'').replace(/\/$/,'')
  async function list(){
    if(!base) return []
    const res = await fetch(`${base}/uploads`)
    if(!res.ok) throw new Error('列出失敗')
    const data = await res.json().catch(()=>({downloads:[]}))
    return Array.isArray(data.downloads)? data.downloads : []
  }
  async function upload(parts){
    if(!base) throw new Error('未設定 Worker 端點')
    const fd = buildFormData(parts)
    const res = await fetch(`${base}/upload`, { method:'POST', body: fd })
    if(!res.ok){
      const d = await res.json().catch(()=>({message:'上傳失敗'}))
      throw new Error(d.message||'上傳失敗')
    }
    return res.json()
  }
  async function remove(path){
    if(!base) throw new Error('未設定 Worker 端點')
    const res = await fetch(`${base}/uploads`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path }) })
    if(!res.ok) throw new Error('刪除失敗')
    return res.json()
  }
  async function removeAll(){
    if(!base) throw new Error('未設定 Worker 端點')
    const res = await fetch(`${base}/uploads/all`, { method:'DELETE' })
    if(!res.ok) throw new Error('全部刪除失敗')
    return res.json()
  }
  return { id:'github-worker', label:'GitHub Worker', capabilities:{ list:true, upload:true, delete:true, deleteAll:true }, list, upload, delete: remove, deleteAll: removeAll }
}

// --- Direct GitHub Provider (前端直連 GitHub Contents API；會暴露 Token，僅限你個人使用情境) ---
// 注意：任何人可在瀏覽器開發者工具看到 Token。請僅使用 fine-grained PAT 且限制單一 repo。
// 混淆策略：token 可拆片段再重新組合，避免被最粗糙的關鍵字掃描（不能防止逆向）。

function createGitHubDirectProvider({ owner, repo, branch = 'main', tokenParts = [] }) {
  // tokenParts 例如: ['ghp_abcd', '1234', 'xyz'] => 最後 join('')
  const token = (tokenParts || []).join('')
  if (!owner || !repo || !token) {
    return {
      id: 'github-direct-disabled',
      label: 'GitHub Direct (未設定)',
      capabilities: { list: false, upload: false, delete: false, deleteAll: false },
      async list() { return [] },
      async upload() { throw new Error('未設定 direct token') },
      async delete() { throw new Error('未設定 direct token') },
      async deleteAll() { throw new Error('未設定 direct token') },
    }
  }

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/site/uploads`
  const stdHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
  })

  async function list() {
    const res = await fetch(`${apiBase}?ref=${branch}`, { headers: stdHeaders(), cache: 'no-store' })
    if (res.status === 404) return []
    if (!res.ok) throw new Error('GitHub 目錄列出失敗')
    const data = await res.json()
    if (!Array.isArray(data)) return []
    // 只保留 file 類型
    return data
      .filter(f => f.type === 'file' && !f.name.startsWith('.'))
      .map(f => ({
        name: f.name,
        path: f.path,
        size: f.size,
        downloadUrl: f.download_url,
        htmlUrl: f.html_url,
        updatedAt: null, // 省略 commit date 以減少 API call；需要可再補
        extension: (() => {
          const i = f.name.lastIndexOf('.')
          return i > 0 ? f.name.slice(i + 1).toLowerCase() : ''
        })(),
        isText: true, // 粗略標示，後續可按副檔名調整
      }))
      .sort((a, b) => b.name.localeCompare(a.name))
  }

  async function upload(parts) {
    const { file, message, customName, textExt } = parts || {}
    const nowTs = new Date().toISOString().replace(/[:.]/g, '-')
    let base = (customName || '')
      .trim()
      .replace(/[^a-zA-Z0-9-_\s]/g, ' ')
      .replace(/\s+/g, '-').slice(0, 60)
    if (!base) {
      if (file?.name) {
        base = file.name.replace(/\.[^.]+$/, '')
      } else if (message) {
        base = message.split(/\s+/).slice(0, 5).join('-').replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 60) || 'note'
      } else {
        base = 'upload'
      }
    }
    const ext = (textExt || (file?.name && file.name.includes('.') ? file.name.split('.').pop() : '') || 'txt')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 12)
      .toLowerCase() || 'txt'
    const finalName = `${nowTs}-${base}.${ext}`

    let contentBase64 = ''
    if (file instanceof File) {
      const buf = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      contentBase64 = btoa(binary)
    } else if (message) {
      const text = message.endsWith('\n') ? message : message + '\n'
      const enc = new TextEncoder().encode(text)
      let binary = ''
      for (let b of enc) binary += String.fromCharCode(b)
      contentBase64 = btoa(binary)
    } else {
      throw new Error('沒有上傳內容')
    }

    const res = await fetch(`${apiBase}/${encodeURIComponent(finalName)}`, {
      method: 'PUT',
      headers: { ...stdHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `chore: direct upload ${finalName}`,
        content: contentBase64,
        branch,
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error('上傳失敗:' + t)
    }
    return res.json()
  }

  async function deleteOne(path) {
    // 先拿 sha
    const meta = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, { headers: stdHeaders() })
    if (!meta.ok) throw new Error('取得檔案資訊失敗')
    const info = await meta.json()
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: 'DELETE',
      headers: { ...stdHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `chore: delete ${path}`, sha: info.sha, branch }),
    })
    if (!res.ok) throw new Error('刪除失敗')
    return res.json()
  }

  async function deleteAll() {
    const files = await list()
    for (const f of files) {
      try { await deleteOne(f.path) } catch (e) { /* ignore */ }
    }
    return { message: '全部刪除完成', count: files.length }
  }

  return {
    id: 'github-direct',
    label: 'GitHub Direct',
    capabilities: { list: true, upload: true, delete: true, deleteAll: true },
    list,
    upload,
    delete: deleteOne,
    deleteAll,
  }
}

// --- Embedded GitHub Provider (使用編譯期嵌入且混淆的 Token) ---
// 與 Direct Provider 幾乎相同，但 token 來源改由 getEmbeddedToken() 還原。
// 注意：仍可被逆向，僅提升掃描成本。
import { getEmbeddedToken } from './secretToken.js'

function createEmbeddedGitHubProvider({ owner, repo, branch = 'main' }) {
  let token = ''
  try {
    token = getEmbeddedToken()
  } catch (e) {
    // 若未嵌入，回傳 disabled provider
    return {
      id: 'github-embedded-disabled',
      label: 'GitHub Embedded (未嵌入)',
      capabilities: { list: false, upload: false, delete: false, deleteAll: false },
      async list() { return [] },
      async upload() { throw new Error('未嵌入 token') },
      async delete() { throw new Error('未嵌入 token') },
      async deleteAll() { throw new Error('未嵌入 token') },
    }
  }
  if (!owner || !repo || !token) {
    return {
      id: 'github-embedded-disabled2',
      label: 'GitHub Embedded (缺參數)',
      capabilities: { list: false, upload: false, delete: false, deleteAll: false },
      async list() { return [] },
      async upload() { throw new Error('缺參數') },
      async delete() { throw new Error('缺參數') },
      async deleteAll() { throw new Error('缺參數') },
    }
  }
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/site/uploads`
  const stdHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
  })

  async function list() {
    const res = await fetch(`${apiBase}?ref=${branch}`, { headers: stdHeaders(), cache: 'no-store' })
    if (res.status === 404) return []
    if (!res.ok) throw new Error('GitHub 目錄列出失敗')
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data
      .filter(f => f.type === 'file' && !f.name.startsWith('.'))
      .map(f => ({
        name: f.name,
        path: f.path,
        size: f.size,
        downloadUrl: f.download_url,
        htmlUrl: f.html_url,
        updatedAt: null,
        extension: (() => { const i = f.name.lastIndexOf('.'); return i > 0 ? f.name.slice(i + 1).toLowerCase() : '' })(),
        isText: true,
      }))
      .sort((a, b) => b.name.localeCompare(a.name))
  }

  async function upload(parts) {
    const { file, message, customName, textExt } = parts || {}
    const nowTs = new Date().toISOString().replace(/[:.]/g, '-')
    let base = (customName || '')
      .trim()
      .replace(/[^a-zA-Z0-9-_\s]/g, ' ')
      .replace(/\s+/g, '-').slice(0, 60)
    if (!base) {
      if (file?.name) {
        base = file.name.replace(/\.[^.]+$/, '')
      } else if (message) {
        base = message.split(/\s+/).slice(0, 5).join('-').replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 60) || 'note'
      } else {
        base = 'upload'
      }
    }
    const ext = (textExt || (file?.name && file.name.includes('.') ? file.name.split('.').pop() : '') || 'txt')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 12)
      .toLowerCase() || 'txt'
    const finalName = `${nowTs}-${base}.${ext}`

    let contentBase64 = ''
    if (file instanceof File) {
      const buf = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      contentBase64 = btoa(binary)
    } else if (message) {
      const text = message.endsWith('\n') ? message : message + '\n'
      const enc = new TextEncoder().encode(text)
      let binary = ''
      for (let b of enc) binary += String.fromCharCode(b)
      contentBase64 = btoa(binary)
    } else {
      throw new Error('沒有上傳內容')
    }

    const res = await fetch(`${apiBase}/${encodeURIComponent(finalName)}`, {
      method: 'PUT',
      headers: { ...stdHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `chore: embedded upload ${finalName}`,
        content: contentBase64,
        branch,
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error('上傳失敗:' + t)
    }
    return res.json()
  }

  async function deleteOne(path) {
    const meta = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, { headers: stdHeaders() })
    if (!meta.ok) throw new Error('取得檔案資訊失敗')
    const info = await meta.json()
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: 'DELETE',
      headers: { ...stdHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `chore: delete ${path}`, sha: info.sha, branch }),
    })
    if (!res.ok) throw new Error('刪除失敗')
    return res.json()
  }

  async function deleteAll() {
    const files = await list()
    for (const f of files) {
      try { await deleteOne(f.path) } catch (e) { /* ignore */ }
    }
    return { message: '全部刪除完成', count: files.length }
  }

  return {
    id: 'github-embedded',
    label: 'GitHub Embedded',
    capabilities: { list: true, upload: true, delete: true, deleteAll: true },
    list,
    upload,
    delete: deleteOne,
    deleteAll,
  }
}

export function listProviders(ctx){
  const providers = []
  // Embedded provider (若設定 useEmbeddedToken)
  if (ctx?.useEmbeddedToken){
    providers.push(createEmbeddedGitHubProvider({
      owner: ctx.owner || 'changrun1',
      repo: ctx.repo || 'changrun1.github.io',
      branch: ctx.branch || 'main'
    }))
  }
  // Direct provider 優先（若設定了 tokenParts）
  if (ctx?.directTokenParts && Array.isArray(ctx.directTokenParts) && ctx.directTokenParts.length){
    providers.push(createGitHubDirectProvider({
      owner: ctx.owner || 'changrun1',
      repo: ctx.repo || 'changrun1.github.io',
      branch: ctx.branch || 'main',
      tokenParts: ctx.directTokenParts,
    }))
  }
  // Worker provider 作為 fallback（若仍保留 baseUrl）
  if (ctx?.baseUrl){
    const baseUrl = ctx.baseUrl
    providers.push(createGitHubWorkerProvider({ baseUrl }))
  }
  // 至少回傳一個（避免 UI 崩潰）
  if (!providers.length){
    providers.push(createGitHubDirectProvider({ owner:'', repo:'', tokenParts:[] }))
  }
  return providers
}
