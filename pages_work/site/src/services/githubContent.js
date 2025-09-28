import YAML from 'yaml'

const API_BASE = 'https://api.github.com'
const RAW_BASE = 'https://raw.githubusercontent.com'
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

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
    cache: 'no-store',
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`GitHub API error (${response.status}): ${message}`)
  }

  return response.json()
}

async function fetchRaw(url) {
  const response = await fetch(url, { cache: 'no-store' })
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    const message = await response.text()
    throw new Error(`GitHub raw fetch error (${response.status}): ${message}`)
  }
  return response.text()
}

async function listDirectory({ owner, repo, branch, path }) {
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`
  const result = await fetchJson(url)
  if (!Array.isArray(result)) {
    return []
  }
  return result
}

async function fetchLatestCommitDate({ owner, repo, path }) {
  const url = `${API_BASE}/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`
  const commits = await fetchJson(url)
  if (!Array.isArray(commits) || commits.length === 0) {
    return null
  }
  return commits[0]?.commit?.committer?.date ?? commits[0]?.commit?.author?.date ?? null
}

export async function fetchProfile({ owner, repo, branch, profilePath }) {
  const rawUrl = `${RAW_BASE}/${owner}/${repo}/${branch}/${profilePath}`
  const content = await fetchRaw(rawUrl)
  if (!content) {
    return null
  }
  try {
    return JSON.parse(content)
  } catch (error) {
    throw new Error('無法解析 profile.json，請確認 JSON 格式是否正確。')
  }
}

export async function fetchPosts({ owner, repo, branch, postsDir }) {
  const entries = await listDirectory({ owner, repo, branch, path: postsDir })
  const markdownFiles = entries.filter((entry) => entry.type === 'file' && entry.name.endsWith('.md'))

  const posts = await Promise.all(
    markdownFiles.map(async (entry) => {
      const rawUrl = `${RAW_BASE}/${owner}/${repo}/${branch}/${entry.path}`
      const source = await fetchRaw(rawUrl)
      if (!source) return null
  const { data, content } = parseFrontMatter(source)

      return {
        slug: entry.name.replace(/\.md$/i, ''),
        title: data.title ?? entry.name,
        excerpt: data.excerpt ?? content.slice(0, 140),
        tags: Array.isArray(data.tags) ? data.tags : [],
        category: data.category ?? 'Note',
        updatedAt: data.updatedAt ?? (await fetchLatestCommitDate({ owner, repo, path: entry.path })),
        url: data.externalUrl && String(data.externalUrl).trim()
          ? data.externalUrl
          : `${RAW_BASE}/${owner}/${repo}/${branch}/${entry.path}`,
      }
    })
  )

  return posts
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
}

export function parseFrontMatter(source) {
  if (typeof source !== 'string') {
    return { data: {}, content: '' }
  }

  const frontMatterPattern = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/
  const match = source.match(frontMatterPattern)

  if (!match) {
    return { data: {}, content: source }
  }

  const [, rawFrontMatter] = match
  const content = source.slice(match[0].length)

  if (!rawFrontMatter.trim()) {
    return { data: {}, content }
  }

  try {
    const data = YAML.parse(rawFrontMatter) || {}
    return { data, content }
  } catch (error) {
    throw new Error('無法解析文章的前導資料，請確認 YAML 格式是否正確。')
  }
}

export async function fetchProjects({ owner, repo, branch, projectsIndex }) {
  const rawUrl = `${RAW_BASE}/${owner}/${repo}/${branch}/${projectsIndex}`
  const content = await fetchRaw(rawUrl)
  if (!content) {
    return []
  }

  try {
    const data = JSON.parse(content)
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.projects)) return data.projects
    return []
  } catch (error) {
    throw new Error('無法解析 projects/index.json，請確認 JSON 格式是否正確。')
  }
}

export async function fetchUploads({ owner, repo, branch, uploadsDir }) {
  const entries = await listDirectory({ owner, repo, branch, path: uploadsDir })
  if (!entries.length) return []

  const files = entries.filter(
    (entry) => entry.type === 'file' && !entry.name.startsWith('.') && entry.download_url
  )

  const enriched = await Promise.all(
    files.map(async (entry) => {
      const updatedAt = await fetchLatestCommitDate({ owner, repo, path: entry.path })
      const extension = getExtension(entry.name)
      const isText = TEXT_EXTENSIONS.has(extension)
      let textContent

      if (isText && entry.size <= 64 * 1024) {
        const rawUrl = `${RAW_BASE}/${owner}/${repo}/${branch}/${entry.path}`
        textContent = await fetchRaw(rawUrl)
      }

      return {
        name: entry.name,
        path: entry.path,
        size: entry.size,
        downloadUrl: entry.download_url,
        htmlUrl: entry.html_url,
        updatedAt,
        extension,
        isText,
        textContent,
      }
    })
  )

  return enriched.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
}

function getExtension(filename) {
  if (typeof filename !== 'string') return ''
  const dot = filename.lastIndexOf('.')
  if (dot === -1 || dot === filename.length - 1) {
    return ''
  }
  return filename.slice(dot + 1).toLowerCase()
}
