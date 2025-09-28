type Env = {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  GITHUB_BRANCH?: string
  MAX_FILE_SIZE?: string
  ALLOWED_EXTENSIONS?: string
}

const GITHUB_API_BASE = 'https://api.github.com'
const RAW_BASE = 'https://raw.githubusercontent.com'
const UPLOADS_DIR = 'site/uploads'
const MAX_TEXT_PREVIEW_SIZE = 64 * 1024
const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'js',
  'ts',
  'tsx',
  'jsx',
  'css',
  'scss',
  'sass',
  'less',
  'html',
  'htm',
  'xml',
  'yaml',
  'yml',
  'toml',
  'ini',
  'conf',
  'cfg',
  'log',
  'csv',
  'tsv',
  'py',
  'java',
  'kt',
  'rb',
  'go',
  'rs',
  'php',
  'c',
  'cc',
  'cpp',
  'cs',
  'sql',
  'env',
])

// 已移除頻率限制與 CMS/OAuth，簡化為僅提供匿名檔案/文字分享 API。

type RepoContentEntry = {
  type: string
  name: string
  path: string
  sha: string
  size: number
  download_url?: string
  html_url?: string
}

type RepoContentFile = RepoContentEntry & {
  content?: string
  encoding?: string
}

type RepoPost = {
  slug: string
  path: string
  name: string
  content: string
  downloadUrl: string
  updatedAt: string | null
}

type RepoDownload = {
  name: string
  path: string
  size: number
  downloadUrl: string
  htmlUrl?: string
  updatedAt: string | null
  extension: string
  isText: boolean
  textContent?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return createCorsResponse(null, 204)
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return createCorsResponse(
        jsonResponse({ status: 'ok', message: 'file-share worker ready' }),
        200
      )
    }

    // /content 已不再聚合 profile/posts/projects，保留兼容性僅回傳 downloads。
    if (url.pathname === '/content' && request.method === 'GET') {
      return await handleContent(env)
    }

    if (url.pathname === '/uploads' && request.method === 'GET') {
      return await handleUploads(env, request)
    }

    if (url.pathname === '/uploads' && request.method === 'DELETE') {
      return await handleDeleteUpload(request, env)
    }
    if (url.pathname === '/uploads/all' && request.method === 'DELETE') {
      return await handleDeleteAll(env)
    }

    if (url.pathname === '/upload' && request.method === 'POST') {
      return await handleUpload(request, env)
    }

    // 所有 /cms/* 路徑已移除

    return createCorsResponse(jsonResponse({ message: 'Not found' }), 404)
  },
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  try {
    // 已移除頻率限制：此服務僅私人使用情境，放寬限制

    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return createCorsResponse(jsonResponse({ message: '請使用 multipart/form-data 進行上傳。' }), 400)
    }

    const formData = await request.formData()
  const message = typeof formData.get('message') === 'string' ? String(formData.get('message')).trim() : ''
  const customNameRaw = typeof formData.get('filename') === 'string' ? String(formData.get('filename')).trim() : ''
  const textExtRaw = typeof formData.get('textExt') === 'string' ? String(formData.get('textExt')).trim().toLowerCase() : ''
  const textExt = ['md', 'txt'].includes(textExtRaw) ? textExtRaw : 'txt'
    const file = formData.get('file')
    const fileObject = file instanceof File ? file : null

    if (!message && !fileObject) {
      return createCorsResponse(jsonResponse({ message: '請輸入文字內容或選擇檔案。' }), 400)
    }

    const maxFileSize = Number(env.MAX_FILE_SIZE ?? 10 * 1024 * 1024)

    const uploadFiles: Array<{ path: string; content: string }> = []

    const branch = env.GITHUB_BRANCH || 'main'
    const uploadsDir = UPLOADS_DIR
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    if (fileObject) {
      if (fileObject.size > maxFileSize) {
        return createCorsResponse(jsonResponse({ message: '檔案大小超出限制。' }), 400)
      }
      const arrayBuffer = await fileObject.arrayBuffer()
      const base64Content = arrayBufferToBase64(arrayBuffer)
      const baseOriginal = customNameRaw ? sanitizeFilename(customNameRaw) : sanitizeFilename(fileObject.name)
  const pathBase = baseOriginal.replace(/\.[^.]+$/,'') // 去除原本副檔名（稍後保留原檔案本身副檔名）
      const originalExt = (() => { const n = fileObject.name; const i = n.lastIndexOf('.'); return i>0 ? n.slice(i+1) : '' })()
      const finalExt = originalExt ? `.${originalExt}` : ''
      let candidate: string
      if (customNameRaw) {
        candidate = `${uploadsDir}/${pathBase}${finalExt}`
        if (await fetchRepoFile(env, candidate, branch)) {
          return createCorsResponse(jsonResponse({ message: '檔名已存在，請換一個檔名。' }), 409)
        }
      } else {
        candidate = `${uploadsDir}/${timestamp}-${pathBase}${finalExt}`
        if (await fetchRepoFile(env, candidate, branch)) {
          // 極低機率時間戳衝突，加一個短隨機碼
          candidate = `${uploadsDir}/${timestamp}-${pathBase}-${Math.random().toString(36).slice(2,6)}${finalExt}`
        }
      }
      const path = candidate
      uploadFiles.push({ path, content: base64Content })
    }

    if (message) {
      const body = (message.endsWith('\n') ? message : message + '\n')
      const rawBase = customNameRaw ? sanitizeFilename(customNameRaw) : createNoteFilename(message).replace(/\.(md|txt)$/i,'')
      const base = rawBase.replace(/\.[^.]+$/,'')
      let finalPath: string
      if (customNameRaw) {
        finalPath = `${uploadsDir}/${base}.${textExt}`
        if (await fetchRepoFile(env, finalPath, branch)) {
          return createCorsResponse(jsonResponse({ message: '檔名已存在，請換一個檔名。' }), 409)
        }
      } else {
        const filenameCore = `${timestamp}-${base}`
        finalPath = `${uploadsDir}/${filenameCore}.${textExt}`
        if (await fetchRepoFile(env, finalPath, branch)) {
          finalPath = `${uploadsDir}/${filenameCore}-${Math.random().toString(36).slice(2,6)}.${textExt}`
        }
      }
      const noteBuffer = new TextEncoder().encode(body)
      uploadFiles.push({ path: finalPath, content: arrayBufferToBase64(noteBuffer) })
    }

    const results = []
    for (const fileEntry of uploadFiles) {
      const response = await commitFileToGitHub({
        env,
        path: fileEntry.path,
        content: fileEntry.content,
        branch,
      })
      results.push(response)
    }

    return createCorsResponse(
      jsonResponse({
        message: '上傳完成，檔案已送出審閱。',
        results: results.map((item) => ({
          path: item.content?.path,
          downloadUrl: item.content?.download_url,
        })),
      })
    )
  } catch (error) {
    console.error('Upload error', error)
    return createCorsResponse(
      jsonResponse({ message: error instanceof Error ? error.message : '上傳失敗，請稍後再試。' }),
      500
    )
  }
}

async function handleContent(env: Env): Promise<Response> {
  // 兼容舊前端：僅回傳 downloads
  try {
    const branch = env.GITHUB_BRANCH || 'main'
    const downloads = await fetchUploadsFromRepo(env, branch)
    const response = jsonResponse({
      profile: null,
      posts: [],
      projects: [],
      downloads,
      fetchedAt: new Date().toISOString(),
      legacy: true,
    })
    response.headers.set('Cache-Control', 'public, max-age=30')
    return createCorsResponse(response)
  } catch (error) {
    console.error('Content fetch error', error)
    return createCorsResponse(
      jsonResponse({ message: error instanceof Error ? error.message : '內容載入失敗，請稍後再試。' }),
      500
    )
  }
}

async function handleUploads(env: Env, request: Request): Promise<Response> {
  try {
    const branch = env.GITHUB_BRANCH || 'main'
    // 前端需求：永遠回傳文字內容（若大小在限制內）
    const downloads = await fetchUploadsFromRepo(env, branch, { includeContent: true })
    const response = jsonResponse({
      downloads,
      fetchedAt: new Date().toISOString(),
    })
    response.headers.set('Cache-Control', 'public, max-age=30')
    return createCorsResponse(response)
  } catch (error) {
    console.error('Uploads fetch error', error)
    return createCorsResponse(
      jsonResponse({ message: error instanceof Error ? error.message : '下載清單載入失敗，請稍後再試。' }),
      500
    )
  }
}

async function handleDeleteUpload(request: Request, env: Env): Promise<Response> {
  try {
    const branch = env.GITHUB_BRANCH || 'main'
    const payload = await request.json().catch(() => null)
    const pathInput = typeof payload?.path === 'string' ? payload.path.trim() : ''

    if (!pathInput) {
      return createCorsResponse(jsonResponse({ message: '缺少檔案路徑。' }), 400)
    }

    let normalizedPath: string
    try {
      normalizedPath = sanitizeUploadPath(pathInput)
    } catch (error) {
      return createCorsResponse(jsonResponse({ message: '路徑不合法。' }), 400)
    }
    const file = await fetchRepoFile(env, normalizedPath, branch)

    if (!file) {
      return createCorsResponse(jsonResponse({ message: '找不到指定檔案。' }), 404)
    }

    await deleteFileFromGitHub({ env, path: normalizedPath, sha: file.sha, branch })

    return createCorsResponse(jsonResponse({ message: '檔案已刪除。', path: normalizedPath }))
  } catch (error) {
    console.error('Delete upload error', error)
    return createCorsResponse(
      jsonResponse({ message: error instanceof Error ? error.message : '刪除失敗，請稍後再試。' }),
      500
    )
  }
}

async function handleDeleteAll(env: Env): Promise<Response> {
  try {
    const branch = env.GITHUB_BRANCH || 'main'
    const entries = await fetchRepoDirectory(env, UPLOADS_DIR, branch)
    const files = entries.filter((e) => e.type === 'file')
    const deleted: string[] = []
    for (const file of files) {
      try {
        await deleteFileFromGitHub({ env, path: file.path, sha: file.sha, branch })
        deleted.push(file.path)
      } catch (e) {
        // ignore single failure, continue
      }
    }
    return createCorsResponse(jsonResponse({ message: '全部刪除完成', deletedCount: deleted.length }))
  } catch (error) {
    console.error('Delete all error', error)
    return createCorsResponse(jsonResponse({ message: '全部刪除失敗' }), 500)
  }
}

// 已刪除：fetchProfileFromRepo / fetchProjectsFromRepo / fetchPostsFromRepo

async function fetchUploadsFromRepo(
  env: Env,
  branch: string,
  options: { includeContent?: boolean } = {}
): Promise<RepoDownload[]> {
  const entries = await fetchRepoDirectory(env, UPLOADS_DIR, branch)
  if (!entries.length) {
    return []
  }

  const files = entries.filter((entry) => entry.type === 'file' && !entry.name.startsWith('.'))

  const downloads = await Promise.all(
    files.map(async (entry) => {
      const updatedAt = await fetchLatestCommitDate(env, entry.path)
      const extension = getExtension(entry.name)
      const isText = isTextExtension(extension)
      let textContent: string | undefined

      if (options.includeContent && isText && entry.size <= MAX_TEXT_PREVIEW_SIZE) {
        const file = await fetchRepoFile(env, entry.path, branch)
        if (file?.content) {
          textContent = decodeBase64(file.content)
        }
      }
      return {
        name: entry.name,
        path: entry.path,
        size: entry.size,
        downloadUrl: entry.download_url ?? buildRawUrl(env, entry.path, branch),
        htmlUrl: entry.html_url,
        updatedAt,
        extension,
        isText,
        textContent,
      }
    })
  )

  return downloads.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
}

async function fetchRepoDirectory(env: Env, path: string, branch: string): Promise<RepoContentEntry[]> {
  const owner = env.GITHUB_OWNER
  const repo = env.GITHUB_REPO
  const response = await githubRequest(env, `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`)
  if (response.status === 404) {
    return []
  }

  const data = await response.json()
  return Array.isArray(data) ? (data as RepoContentEntry[]) : []
}

async function fetchRepoFile(env: Env, path: string, branch: string): Promise<RepoContentFile | null> {
  const owner = env.GITHUB_OWNER
  const repo = env.GITHUB_REPO
  const response = await githubRequest(env, `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`)
  if (response.status === 404) {
    return null
  }

  const data = await response.json()
  if (Array.isArray(data)) {
    throw new Error(`指定的路徑為目錄而非檔案：${path}`)
  }

  return data as RepoContentFile
}

async function fetchLatestCommitDate(env: Env, path: string): Promise<string | null> {
  const owner = env.GITHUB_OWNER
  const repo = env.GITHUB_REPO
  const response = await githubRequest(
    env,
    `/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`
  )
  if (response.status === 404) {
    return null
  }

  const commits = await response.json()
  if (!Array.isArray(commits) || commits.length === 0) {
    return null
  }

  return commits[0]?.commit?.committer?.date ?? commits[0]?.commit?.author?.date ?? null
}

async function githubRequest(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  if (!env.GITHUB_TOKEN) {
    throw new Error('尚未設定 GITHUB_TOKEN。')
  }

  const url = `${GITHUB_API_BASE}${path}`
  const headers = new Headers(init.headers ?? {})
  headers.set('Authorization', `Bearer ${env.GITHUB_TOKEN}`)
  headers.set('User-Agent', 'file-share-worker')
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/vnd.github+json')
  }

  const response = await fetch(url, {
    ...init,
    headers,
  })

  if (response.status === 401) {
    const detail = await response.text()
    throw new Error(`GitHub API 認證失敗：${detail}`)
  }

  if (response.status === 403) {
    const detail = await response.text()
    throw new Error(`GitHub API 權限不足：${detail}`)
  }

  if (!response.ok && response.status !== 404) {
    const message = await response.text()
    throw new Error(`GitHub API 錯誤：${message}`)
  }

  return response
}

function decodeBase64(value: string): string {
  try {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  } catch (error) {
    throw new Error('無法解析 GitHub 檔案內容。')
  }
}

function buildRawUrl(env: Env, path: string, branch: string): string {
  return `${RAW_BASE}/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/${branch}/${path}`
}

// 已刪除：startOAuth / finishOAuth 及相關 HTML 回傳用於 CMS 驗證

async function commitFileToGitHub({
  env,
  path,
  content,
  branch,
}: {
  env: Env
  path: string
  content: string
  branch: string
}) {
  if (!env.GITHUB_TOKEN) {
    throw new Error('尚未設定 GITHUB_TOKEN。')
  }
  const owner = env.GITHUB_OWNER
  const repo = env.GITHUB_REPO
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'file-share-worker',
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `chore: anonymous upload ${path}`,
      content,
      branch,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`GitHub API 錯誤：${message}`)
  }

  return response.json()
}

// function checkRateLimit(...) 已移除

function getClientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
}

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
  })
}

function createCorsResponse(response: Response | null, status = 200): Response {
  const baseHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  }

  if (!response) {
    return new Response(null, { status, headers: baseHeaders })
  }

  baseHeaders['Content-Type'] = response.headers.get('Content-Type') || 'application/json; charset=UTF-8'

  return new Response(response.body, {
    status,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      ...baseHeaders,
    },
  })
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
    },
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 已刪除：OAuth state 清理邏輯

function sanitizeFilename(filename: string): string {
  const normalized = typeof filename === 'string' ? filename.normalize('NFKC') : 'file'
  const lastSegment = normalized.replace(/\\/g, '/').split('/').pop() || 'file'
  const strippedControl = lastSegment.replace(/[\u0000-\u001f\u007f]/g, '').trim() || 'file'

  const lastDot = strippedControl.lastIndexOf('.')
  const base = lastDot > 0 ? strippedControl.slice(0, lastDot) : strippedControl
  const extension = lastDot > 0 ? strippedControl.slice(lastDot + 1) : ''

  const safeBase = base.replace(/[<>:"|?*]/g, '-').replace(/\s+/g, ' ').slice(0, 80) || 'file'
  const safeExtension = extension.replace(/[<>:"|?*]/g, '').slice(0, 20)

  if (safeExtension) {
    return `${safeBase}.${safeExtension}`
  }
  return safeBase
}

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex === -1 || dotIndex === filename.length - 1) {
    return ''
  }
  return filename.slice(dotIndex + 1).toLowerCase()
}

function isTextExtension(extension: string): boolean {
  return extension ? TEXT_EXTENSIONS.has(extension) : false
}

function sanitizeUploadPath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '')
  const segments = normalized.split('/').filter((segment) => segment.length > 0)

  if (segments.some((segment) => segment === '..')) {
    throw new Error('路徑不合法。')
  }

  const rebuiltPath = segments.join('/')
  if (!rebuiltPath.startsWith(`${UPLOADS_DIR}/`)) {
    throw new Error('路徑不合法。')
  }

  return rebuiltPath
}

async function deleteFileFromGitHub({
  env,
  path,
  sha,
  branch,
}: {
  env: Env
  path: string
  sha: string
  branch: string
}): Promise<void> {
  if (!env.GITHUB_TOKEN) {
    throw new Error('尚未設定 GITHUB_TOKEN。')
  }

  const owner = env.GITHUB_OWNER
  const repo = env.GITHUB_REPO
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`

  const response = await fetch(apiUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'file-share-worker',
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `chore: delete upload ${path}`,
      sha,
      branch,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`GitHub API 刪除錯誤：${message}`)
  }
}

function createNoteFilename(message: string): string {
  const sample = message
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join(' ')
    .slice(0, 60)
  const safe = sanitizeFilename(sample ? `${sample}.md` : 'note.md')
  return safe.toLowerCase().endsWith('.md') ? safe : `${safe}.md`
}
