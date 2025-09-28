<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSiteContent } from '../composables/useSiteContent.js'

const route = useRoute()
const router = useRouter()
const { downloads, refreshDownloads, isLoading } = useSiteContent()

const targetPath = computed(()=> route.query.path || '')
const file = computed(()=> downloads.value.find(f=> f.path === targetPath.value))

function displayName(name){
  if(!name) return ''
  return name.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z[-_]/,'')
}

const state = ref({ fetching:false, rawText:null, error:'' })

async function ensureData(){
  if(!file.value){
    await refreshDownloads({ full:true })
  }
  if(!file.value){
    state.value.error = '找不到檔案或已被刪除。'
    return
  }
  // 若是文字但沒有 textContent (可能超過閾值或舊資料)，嘗試抓原始內容
  if((file.value.isText || /\.(txt|md|markdown|json|log|csv|tsv)$/i.test(file.value.name)) && !file.value.textContent){
    try {
      state.value.fetching = true
      const res = await fetch(file.value.downloadUrl)
      if(res.ok){
        const txt = await res.text()
        state.value.rawText = txt
      }
    } catch(e) { /* ignore */ } finally { state.value.fetching = false }
  }
}

onMounted(()=>{ ensureData() })

async function copyAll(){
  const content = file.value?.textContent || state.value.rawText
  if(!content) return
  try { await navigator.clipboard.writeText(content) } catch(e){}
}

async function triggerDownload(){
  if(!file.value) return
  try {
    const res = await fetch(file.value.downloadUrl)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = displayName(file.value.name) || file.value.name
    document.body.appendChild(a)
    a.click()
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove() }, 2000)
  } catch(e){}
}

const isImage = computed(()=> file.value && /\.(png|jpe?g|gif|webp|svg)$/i.test(file.value.name))
const isPDF = computed(()=> file.value && /\.pdf$/i.test(file.value.name))
const isLikelyText = computed(()=> file.value && (file.value.isText || /\.(txt|md|markdown|json|log|csv|tsv|js|ts|css|html)$/i.test(file.value.name)))
</script>

<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-slate-800">預覽</h2>
      <button type="button" class="text-xs text-slate-500 hover:text-slate-700" @click="router.back()">← 返回</button>
    </div>

    <div v-if="!file && !isLoading" class="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">{{ state.error || '載入中或檔案不存在。' }}</div>
    <div v-else-if="isLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">讀取中…</div>

    <div v-else class="space-y-4">
      <header class="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
        <div class="min-w-0 flex-1">
          <h3 class="truncate text-base font-semibold text-slate-900" :title="file.name">{{ displayName(file.name) }}</h3>
          <p class="mt-0.5 text-[11px] text-slate-500">{{ file.extension || '無副檔名' }}</p>
        </div>
        <div class="flex items-center gap-2">
          <button @click="triggerDownload" type="button" class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-indigo-600 hover:border-indigo-300 hover:text-indigo-700">下載</button>
          <button v-if="isLikelyText" @click="copyAll" type="button" class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 hover:border-emerald-300">複製全文</button>
        </div>
      </header>

      <!-- Sticky note style text -->
      <div v-if="isLikelyText" class="relative">
        <div class="rounded-3xl border border-amber-300/70 bg-gradient-to-br from-amber-50 to-amber-100 p-6 shadow-inner">
          <pre class="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">{{ file.textContent || state.rawText || (state.fetching ? '載入文字內容中…' : '（無文字內容）') }}</pre>
        </div>
        <div class="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-amber-400/30"></div>
      </div>

      <div v-else-if="isImage" class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
        <img :src="file.downloadUrl" :alt="file.name" class="mx-auto max-h-[70vh] object-contain" />
      </div>

      <div v-else-if="isPDF" class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <iframe :src="file.downloadUrl" class="h-[70vh] w-full" title="pdf" />
      </div>

      <div v-else class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">此檔案格式無法預覽，請直接下載。</div>
    </div>
  </section>
</template>

<style scoped>
</style>
