import { parseFrontMatter } from './githubContent.js'

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) {
    throw new Error('未設定 Worker 服務位址。')
  }
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

async function fetchFromWorker(url) {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Worker 回應錯誤 (${response.status}): ${message || '未知錯誤'}`)
  }
  return response.json()
}

function mapPosts(rawPosts = []) {
  return rawPosts
    .map((post) => {
      if (!post || typeof post !== 'object') return null
      const source = typeof post.content === 'string' ? post.content : ''
      const { data, content } = parseFrontMatter(source)
      const slug = typeof post.slug === 'string' ? post.slug : post.name?.replace(/\.md$/i, '')

      return {
        slug: slug || 'untitled',
        title: data.title ?? post.name ?? slug ?? '未命名文章',
        excerpt: data.excerpt ?? content.slice(0, 140),
        tags: Array.isArray(data.tags) ? data.tags : [],
        category: data.category ?? 'Note',
        updatedAt: data.updatedAt ?? post.updatedAt ?? null,
        url:
          data.externalUrl && String(data.externalUrl).trim()
            ? data.externalUrl
            : post.downloadUrl,
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
}

export async function fetchSiteContentFromWorker({ baseUrl }) {
  const normalized = normalizeBaseUrl(baseUrl)
  const payload = await fetchFromWorker(`${normalized}/content`)

  return {
    profile: payload.profile && typeof payload.profile === 'object' ? payload.profile : null,
    posts: mapPosts(payload.posts),
    projects: Array.isArray(payload.projects) ? payload.projects : [],
    downloads: Array.isArray(payload.downloads) ? payload.downloads : [],
  }
}

export async function fetchUploadsFromWorker({ baseUrl, query = '' }) {
  const normalized = normalizeBaseUrl(baseUrl)
  const q = query || ''
  const payload = await fetchFromWorker(`${normalized}/uploads${q}`)
  return Array.isArray(payload.downloads) ? payload.downloads : []
}
