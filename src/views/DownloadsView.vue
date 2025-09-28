<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue'
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
hljs.registerLanguage('xml', xml) // html 使用 xml 高亮
hljs.registerLanguage('python', python)
hljs.registerLanguage('css', cssLang)
import { useSiteContent } from '../composables/useSiteContent.js'

// 取得站內下載清單
const { downloads, isLoading, error, refreshDownloads } = useSiteContent()
onMounted(() => { refreshDownloads() })

const searchTerm = ref('')

// 基本篩選（不做排序，保持上游順序：通常是最近更新在前）
const filteredDownloads = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  if (!keyword) return downloads.value
  return downloads.value.filter(file => {
    const haystack = [file.name, file.extension, file.path].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(keyword)
  })
})

function formatSize(size){
  if(size == null) return '0B'
  if(size < 1024) return size + 'B'
  if(size < 1024*1024) return (size/1024).toFixed(1)+'KB'
  if(size < 1024*1024*1024) return (size/1024/1024).toFixed(1)+'MB'
  return (size/1024/1024/1024).toFixed(1)+'GB'
}

function formatDate(iso){
  if(!iso) return ''
  try { return new Date(iso).toLocaleString() } catch(e){ return iso }
}

// 去除時間戳前綴：格式假設為 YYYY-MM-DDThh-mm-ss-msZ-
function displayName(name){
  if(!name) return ''
  const stripped = name.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z[-_]/,'')
  return stripped.replace(/\.txt$/i,'')
}

// 文字副檔白名單（與 worker 部分交集，前端保守再定義一次）
const TEXT_EXTENSIONS = new Set(['txt','md','markdown','json','log','csv','tsv','js','ts','css','html','py'])
const CODE_EXTENSIONS = new Set(['js','ts','css','html','json','py'])
const IMAGE_EXTENSIONS = new Set(['png','jpg','jpeg','gif','webp','svg','bmp','avif'])

function languageLabel(ext){
  const map = { js:'JavaScript', ts:'TypeScript', css:'CSS', html:'HTML', json:'JSON', md:'Markdown', markdown:'Markdown', py:'Python' }
  if(ext==='txt') return ''
  return map[ext] || ext.toUpperCase()
}

function isTextLike(file){
  if(file.isText) return true
  return file.extension && TEXT_EXTENSIONS.has(file.extension.toLowerCase())
}

// 內部暫存動態補抓的文字內容 (key = file.path)
const dynamicTextCache = ref({})
const fetchingAll = ref(false)

async function prefetchAllText(){
  const list = downloads.value
  const targets = list.filter(f => isTextLike(f) && !f.textContent && !dynamicTextCache.value[f.path])
  if(!targets.length) return
  fetchingAll.value = true
  await Promise.all(targets.map(async f => {
    try {
      const res = await fetch(f.downloadUrl)
      if(res.ok){
        const txt = await res.text()
        dynamicTextCache.value = { ...dynamicTextCache.value, [f.path]: txt }
      }
    } catch(e){ /* ignore */ }
  }))
  fetchingAll.value = false
}

function getText(file){ return file.textContent || dynamicTextCache.value[file.path] || '' }
onMounted(async () => {
  await refreshDownloads({ full:true })
  prefetchAllText()
})

// 高亮處理：在文字載入後對 code 區塊套用 highlight.js
function highlightAll(){
  nextTick(()=>{
    document.querySelectorAll('[data-code-block] pre code').forEach(el => {
      try { hljs.highlightElement(el) } catch(e){ /* ignore */ }
    })
  })
}

// 觀察 dynamicTextCache 變化重新高亮
watch(dynamicTextCache, () => highlightAll(), { deep: true })
onMounted(() => highlightAll())

// 複製文字內容
async function copyText(text){
  if(!text) return
  try { await navigator.clipboard.writeText(text) } catch(e) { /* ignore */ }
}

// 強制下載（避免瀏覽器直接開啟）
async function triggerDownload(file){
  try {
    const res = await fetch(file.downloadUrl)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = displayName(file.name) || file.name
    document.body.appendChild(a)
    a.click()
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove() }, 2000)
  } catch(e){ /* ignore */ }
}
</script>

<template>
  <section class="space-y-8">
    <!-- Header / 搜尋 -->
    <header class="flex flex-col gap-6 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold text-slate-900 sm:text-3xl">即時共享清單</h2>
        <p class="text-sm text-slate-500">文字即貼即顯示，可直接複製；其他檔案可立即下載。</p>
      </div>
      <div class="flex flex-col gap-2 text-sm text-slate-500 lg:items-end">
        <label class="relative">
          <span class="sr-only">搜尋檔案</span>
          <input
            v-model="searchTerm"
            type="search"
            placeholder="搜尋檔名 / 副檔名 / 路徑..."
            class="w-full rounded-full border border-slate-200 bg-white/90 px-4 py-2 pr-10 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-300">🔍</span>
        </label>
        <button
          type="button"
          class="self-end rounded-full border border-slate-200 bg-white/70 px-4 py-1 text-xs font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600"
          @click="refreshDownloads"
        >重新整理</button>
      </div>
    </header>

    <!-- 狀態顯示 -->
    <div v-if="isLoading" class="rounded-3xl border border-white/70 bg-white/80 p-10 text-center text-sm text-slate-500 shadow-sm">資料載入中...</div>
    <div v-else-if="error" class="rounded-3xl border border-rose-100 bg-rose-50 p-10 text-center text-sm font-semibold text-rose-500 shadow-sm">{{ error }}</div>

    <!-- 內容清單 -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between text-xs text-slate-500">
        <span>共 {{ filteredDownloads.length }} 件檔案</span>
      </div>
      <div v-if="!filteredDownloads.length" class="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-8 text-center text-xs text-slate-400">尚未有共享檔案，可至管理面板新增。</div>
      <div class="space-y-4">
        <div
          v-for="file in filteredDownloads"
          :key="file.path"
          class="group rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm transition hover:border-indigo-200"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-base font-semibold text-slate-900" :title="file.name">{{ displayName(file.name) }}</h3>
              <p class="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-medium text-slate-500">
                <template v-if="CODE_EXTENSIONS.has((file.extension||'').toLowerCase())">
                  <span class="inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-700">{{ languageLabel((file.extension||'').toLowerCase()) }}</span>
                </template>
                <template v-else-if="!isTextLike(file) && file.extension && file.extension.toLowerCase()!=='txt'">
                  <span class="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">{{ file.extension }}</span>
                </template>
                <span>{{ formatSize(file.size) }}</span>
                <span class="ml-2">更新 {{ formatDate(file.updatedAt) }}</span>
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <!-- 行為按鈕：規則
                   1. 文字(txt/md等) 不顯示下載/預覽，只保留底部單一複製按鈕
                   2. 其他所有非 txt 類型 應有 下載
                   3. 程式或可預覽（文字類以外圖片等）有 預覽
                   4. 複製只在下方內容區 (整合) -->
              <template v-if="!isTextLike(file)">
                <RouterLink
                  v-if="IMAGE_EXTENSIONS.has((file.extension||'').toLowerCase()) || CODE_EXTENSIONS.has((file.extension||'').toLowerCase())"
                  :to="{ name: 'preview', query: { path: file.path } }"
                  class="rounded-full border px-3 py-1 text-xs font-semibold transition border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                >預覽</RouterLink>
                <button
                  v-if="file.extension && file.extension.toLowerCase()!=='txt'"
                  @click="triggerDownload(file)"
                  type="button"
                  class="rounded-full border px-3 py-1 text-xs font-semibold transition border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >下載</button>
              </template>
              <template v-else>
                <!-- 若是文字 (含 code )，程式碼允許預覽與下載；純 txt 僅下方複製 -->
                <RouterLink
                  v-if="CODE_EXTENSIONS.has((file.extension||'').toLowerCase())"
                  :to="{ name: 'preview', query: { path: file.path } }"
                  class="rounded-full border px-3 py-1 text-xs font-semibold transition border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                >預覽</RouterLink>
                <button
                  v-if="isTextLike(file) && (file.extension||'').toLowerCase() !== 'txt'"
                  @click="triggerDownload(file)"
                  type="button"
                  class="rounded-full border px-3 py-1 text-xs font-semibold transition border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >下載</button>
              </template>
            </div>
          </div>
          <div v-if="isTextLike(file)" class="mt-4 relative">
            <div v-if="CODE_EXTENSIONS.has((file.extension||'').toLowerCase())" data-code-block
                 class="relative group/code max-h-80 overflow-y-auto rounded-2xl border border-slate-300 bg-white p-0 text-[13px] font-mono leading-relaxed">
              <button
                v-if="getText(file)"
                class="absolute right-3 top-2 rounded-md border px-2 py-0.5 text-[11px] font-medium shadow-sm transition border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                @click="copyText(getText(file))"
              >複製</button>
              <pre class="m-0 overflow-visible"><code :class="'language-' + (file.extension||'')">
{{ getText(file) || (fetchingAll ? '載入中…' : '（無內容）') }}
              </code></pre>
              <div v-if="getText(file)" class="pointer-events-none absolute inset-0 font-mono text-[11px] leading-relaxed text-slate-400 select-none">
                <div class="inline-block h-full px-0 py-3 pl-3 pr-0">
                  <template v-for="(line, idx) in (getText(file).split(/\n/).length)" :key="idx">
                    <div class="text-right pr-4 tabular-nums">{{ idx + 1 }}</div>
                  </template>
                </div>
              </div>
            </div>
            <div v-else class="group/code max-h-56 overflow-y-auto rounded-2xl border border-slate-300 bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-800">
              <button
                v-if="getText(file)"
                class="absolute right-3 top-2 rounded-md border px-2 py-0.5 text-[11px] font-medium shadow-sm transition border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                @click="copyText(getText(file))"
              >複製</button>
              <pre class="whitespace-pre-wrap pr-10">{{ getText(file) || (fetchingAll ? '載入中…' : '（無內容）') }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* highlight.js 基本配色微調（使用內嵌 minimal 風格覆蓋） */
:deep(.hljs){ color:#334155; background:transparent; }
:deep(.hljs-keyword){ color:#2563eb; }
:deep(.hljs-string){ color:#15803d; }
:deep(.hljs-number){ color:#db2777; }
:deep(.hljs-comment){ color:#94a3b8; font-style:italic; }
:deep(.hljs-attr),:deep(.hljs-attribute){ color:#b45309; }
:deep(.hljs-function){ color:#7e22ce; }
[data-code-block] pre{ padding:12px 16px 16px 56px; }
[data-code-block] pre code{ display:block; }
[data-code-block]{ position:relative; }
[data-code-block] > div:first-of-type{ width:48px; background:linear-gradient(to right,#ffffff,#ffffff); }
</style>
