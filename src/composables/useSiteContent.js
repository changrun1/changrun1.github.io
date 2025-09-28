import { onMounted, ref } from 'vue'
// 只需要下載清單，不再載入 profile/posts/projects
import { fetchUploads } from '../services/githubContent.js'
import { fetchUploadsFromWorker } from '../services/workerContent.js'

const downloads = ref([])
const isLoading = ref(false)
const error = ref(null)

const config = ref({
  owner: 'changrun1',
  repo: 'changrun1.github.io',
  branch: 'main',
  workerBase: '', // 移除預設 worker，改走直接 GitHub 方案
  uploadsDir: 'uploads',
})

let initialized = false
let ongoingPromise = null

const normalizeDownloads = (list = []) => {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => ({
      ...item,
      extension: typeof item.extension === 'string' ? item.extension : '',
      isText: Boolean(item.isText),
      textContent: typeof item.textContent === 'string' ? item.textContent : undefined,
    }))
    .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
}

const loadContent = async () => {
  if (ongoingPromise) {
    return ongoingPromise
  }

  ongoingPromise = (async () => {
    try {
      isLoading.value = true
      error.value = null

  const { workerBase, owner, repo, branch, uploadsDir } = config.value

      // 直接使用 GitHub API
      const downloadsData = await fetchUploads({ owner, repo, branch, uploadsDir })
      downloads.value = normalizeDownloads(downloadsData)

      initialized = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '發生未知錯誤'
    } finally {
      isLoading.value = false
      ongoingPromise = null
    }
  })()

  return ongoingPromise
}

const refreshDownloads = async ({ force = false } = {}) => {
  try {
    const { workerBase, owner, repo, branch, uploadsDir } = config.value
    const refreshed = await fetchUploads({ owner, repo, branch, uploadsDir, force })
    downloads.value = normalizeDownloads(refreshed)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '下載清單更新失敗'
  }
}

export function useSiteContent() {
  onMounted(() => {
    if (!initialized && !isLoading.value) {
      loadContent()
    }
  })

  if (!initialized && !isLoading.value) {
    loadContent()
  }

  return {
    downloads,
    isLoading,
    error,
    config,
    refreshDownloads,
  }
}
