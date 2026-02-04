import { onMounted, ref } from 'vue'
import { listProviders } from '../services/storageProviders.js'

const downloads = ref([])
const isLoading = ref(false)
const error = ref(null)

const config = ref({})

let initialized = false
let ongoingPromise = null

const normalizeDownloads = (list = []) => {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => ({
      ...item,
      extension: typeof item.extension === 'string' ? item.extension : '',
      isText: Boolean(item.isText),
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

      // Use the first available provider (S3)
      const providers = listProviders()
      const provider = providers[0]

      if (!provider) throw new Error('沒有可用的儲存提供者')

      const downloadsData = await provider.list()
      downloads.value = normalizeDownloads(downloadsData)

      initialized = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '發生未知錯誤'
      console.error(err)
    } finally {
      isLoading.value = false
      ongoingPromise = null
    }
  })()

  return ongoingPromise
}

const refreshDownloads = async () => {
  try {
    const providers = listProviders()
    const provider = providers[0]
    if (provider) {
      const refreshed = await provider.list()
      downloads.value = normalizeDownloads(refreshed)
    }
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
