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

export function listProviders(ctx){
  const baseUrl = ctx?.baseUrl
  return [
    createGitHubWorkerProvider({ baseUrl }),
  ]
}
