<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSiteContent } from '../composables/useSiteContent.js'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import jsonLang from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import python from 'highlight.js/lib/languages/python'
import cssLang from 'highlight.js/lib/languages/css'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('json', jsonLang)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('python', python)
hljs.registerLanguage('css', cssLang)

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
const isLikelyText = computed(()=> file.value && (file.value.isText || /\.(txt|md|markdown|json|log|csv|tsv|js|ts|css|html|py)$/i.test(file.value.name)))
const isCode = computed(()=> file.value && /\.(js|ts|css|html|json|py)$/i.test(file.value.name))

function highlightNow(){
  if(!isCode.value) return
  nextTick(()=>{
    document.querySelectorAll('[data-preview-code] pre code').forEach(el=>{
      try { hljs.highlightElement(el) } catch(e){}
    })
  })
}

watch(()=> state.value.rawText, ()=> highlightNow())
watch(()=> file.value?.textContent, ()=> highlightNow())
onMounted(()=> highlightNow())
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

      <!-- Text / Code block -->
      <div v-if="isLikelyText" class="relative rounded-2xl border border-slate-200 bg-white p-0 shadow-sm" :data-preview-code="isCode">
        <button
          v-if="(file.textContent || state.rawText)"
          @click="copyAll"
          type="button"
          class="absolute right-3 top-2 z-10 rounded-md border px-2 py-0.5 text-[11px] font-medium shadow-sm transition border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
        >複製</button>
        <pre v-if="isCode" class="m-0 overflow-visible text-[13px] leading-relaxed"><code :class="'language-' + (file.extension||'')" >
{{ file.textContent || state.rawText || (state.fetching ? '載入文字內容中…' : '（無文字內容）') }}
        </code></pre>
        <pre v-else class="m-0 whitespace-pre-wrap p-6 pr-12 text-[13px] leading-relaxed text-slate-800">{{ file.textContent || state.rawText || (state.fetching ? '載入文字內容中…' : '（無文字內容）') }}</pre>
        <div v-if="isCode && (file.textContent || state.rawText)" class="pointer-events-none absolute inset-0 font-mono text-[11px] leading-relaxed text-slate-400 select-none">
          <div class="inline-block h-full px-0 py-4 pl-3 pr-0">
            <template v-for="(line, idx) in ( (file.textContent || state.rawText || '').split(/\n/).length )" :key="idx">
              <div class="text-right pr-4 tabular-nums">{{ idx + 1 }}</div>
            </template>
          </div>
        </div>
      </div>

      <div v-else-if="isImage" class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
        <img :src="file.downloadUrl" :alt="file.name" class="mx-auto max-h-[70vh] object-contain" />
      </div>

      <!-- PDF 不再嘗試內嵌，視為不支援格式 -->
      <div v-else-if="isPDF" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">此檔案格式無法預覽，請直接下載。</div>

      <div v-else class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">此檔案格式無法預覽，請直接下載。</div>
    </div>
  </section>
</template>

<style scoped>
:deep(.hljs){ color:#334155; background:transparent; }
:deep(.hljs-keyword){ color:#2563eb; }
:deep(.hljs-string){ color:#15803d; }
:deep(.hljs-number){ color:#db2777; }
:deep(.hljs-comment){ color:#94a3b8; font-style:italic; }
:deep(.hljs-attr),:deep(.hljs-attribute){ color:#b45309; }
:deep(.hljs-function){ color:#7e22ce; }
[data-preview-code] pre{ padding:16px 20px 20px 60px; }
[data-preview-code] pre code{ display:block; }
[data-preview-code]{ position:relative; }
[data-preview-code] > div:first-of-type{ width:52px; background:linear-gradient(to right,#ffffff,#ffffff); }
</style>
