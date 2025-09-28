import { onMounted, ref } from 'vue'
import { fetchProfile, fetchUploads } from '../services/githubContent.js'
import { fetchSiteContentFromWorker, fetchUploadsFromWorker } from '../services/workerContent.js'

const profile = ref({
  name: '常潤',
  summary: '臨時分享檔案的私人工作區。',
})

const downloads = ref([])
const isLoading = ref(false)
const error = ref(null)

const config = ref({
  owner: 'changrun1',
  repo: 'changrun1.github.io',
  branch: 'main',
  workerBase: 'https://quiet-water-7883.chang71505.workers.dev',
  uploadsDir: 'site/uploads',
  profilePath: 'site/content/profile/profile.json',
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

      const { workerBase, owner, repo, branch, uploadsDir, profilePath } = config.value

      let resolvedViaWorker = false

      if (workerBase) {
        try {
          const workerData = await fetchSiteContentFromWorker({ baseUrl: workerBase })

          if (workerData.profile) {
            profile.value = {
              ...profile.value,
              ...workerData.profile,
            }
          }

          downloads.value = normalizeDownloads(workerData.downloads)
          resolvedViaWorker = true
        } catch (workerError) {
          console.warn('Worker content fetch failed, fallback to GitHub direct API', workerError)
        }
      }

      if (!resolvedViaWorker) {
        const [profileData, downloadsData] = await Promise.all([
          fetchProfile({ owner, repo, branch, profilePath }),
          fetchUploads({ owner, repo, branch, uploadsDir }),
        ])

        if (profileData) {
          profile.value = {
            ...profile.value,
            ...profileData,
          }
        }

        downloads.value = normalizeDownloads(downloadsData)
      }

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

const refreshDownloads = async () => {
  try {
    const { workerBase, owner, repo, branch, uploadsDir } = config.value
  const query = ''

    if (workerBase) {
      try {
  const refreshed = await fetchUploadsFromWorker({ baseUrl: workerBase, query })
        downloads.value = normalizeDownloads(refreshed)
        return
      } catch (workerError) {
        console.warn('Worker downloads refresh failed, fallback to GitHub direct API', workerError)
      }
    }

    const fallback = await fetchUploads({ owner, repo, branch, uploadsDir })
    downloads.value = normalizeDownloads(fallback)
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
    profile,
    downloads,
    isLoading,
    error,
    config,
    refreshDownloads,
  }
}
