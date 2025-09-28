<script setup>
import UploadPanel from '../components/UploadPanel.vue'
import { useSiteContent } from '../composables/useSiteContent.js'
import { useStorageProvider } from '../composables/useStorageProvider.js'
import { computed, ref } from 'vue'

const { config, refreshDownloads } = useSiteContent()
const ghTokenRaw = ref(localStorage.getItem('gh:token') || '')
const directTokenParts = computed(() => {
  const t = ghTokenRaw.value.trim()
  if(!t) return []
  const parts = []
  for (let i=0; i<t.length; i+=6){ parts.push(t.slice(i,i+6)) }
  return parts
})
const providerApi = useStorageProvider({
  baseUrl: '',
  directTokenParts: directTokenParts.value,
  owner: config.value.owner,
  repo: config.value.repo,
  branch: config.value.branch,
})

const uploadEndpoint = computed(()=> {
  return '' // endpoint 不再使用（直接透過 provider）
})
</script>

<template>
  <section class="space-y-8">
    <header class="rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-sm">
      <h2 class="text-xl font-semibold text-slate-800">上傳</h2>
      <p class="mt-1 text-xs text-slate-500">文字與檔案二選一，送出後將立即出現在下載清單與管理頁。</p>
    </header>

    <div class="rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-sm">
      <UploadPanel :endpoint="uploadEndpoint" @upload-success="() => refreshDownloads()" />
    </div>
  </section>
</template>
