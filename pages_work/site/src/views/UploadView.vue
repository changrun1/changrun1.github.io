<script setup>
import UploadPanel from '../components/UploadPanel.vue'
import { useSiteContent } from '../composables/useSiteContent.js'
import { useStorageProvider } from '../composables/useStorageProvider.js'
import { computed } from 'vue'

const { config, refreshDownloads } = useSiteContent()
const providerApi = useStorageProvider(computed(()=> config.value.workerBase).value)

const uploadEndpoint = computed(()=> {
  // 仍沿用舊 UploadPanel 需要的 endpoint（GitHub Worker）
  const base = config.value.workerBase || ''
  if(providerApi.provider.value.id !== 'github-worker'){
    return '' // 禁用按鈕，改成 provider layer 直接呼叫（下個版本可重構 UploadPanel）
  }
  return base ? base.replace(/\/$/,'') + '/upload' : ''
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
