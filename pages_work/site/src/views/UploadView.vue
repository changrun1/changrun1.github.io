<script setup>
import UploadPanel from '../components/UploadPanel.vue'
import { useSiteContent } from '../composables/useSiteContent.js'
import { computed } from 'vue'

// 取得 worker base 以便傳入 endpoint（與 ManageView 做法一致但精簡）
const { config, refreshDownloads } = useSiteContent()
const uploadEndpoint = computed(() => {
  const base = config.value.workerBase || ''
  return base ? base.replace(/\/$/, '') + '/upload' : ''
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
