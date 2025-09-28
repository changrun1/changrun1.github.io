<script setup>
import { computed, ref, onMounted } from 'vue'
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

// 去除時間戳前綴：格式假設為 2025-09-28T13-57-42-817Z-xxxx
function displayName(name){
  if(!name) return ''
  return name.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z[-_]/,'')
}

// 文字副檔白名單（與 worker 部分交集，前端保守再定義一次）
const TEXT_EXTENSIONS = new Set(['txt','md','markdown','json','log','csv','tsv','js','ts','css','html'])

function isTextLike(file){
  if(file.isText) return true
  return file.extension && TEXT_EXTENSIONS.has(file.extension.toLowerCase())
}

// 複製文字內容
async function copyText(text){
  if(!text) return
  try { await navigator.clipboard.writeText(text) } catch(e) { /* ignore */ }
}

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
              <p class="mt-1 text-[11px] font-medium text-slate-500">
                <span class="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">{{ file.extension || 'none' }}</span>
                <span class="ml-2">{{ formatSize(file.size) }}</span>
                <span class="ml-2">更新 {{ formatDate(file.updatedAt) }}</span>
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <button @click="triggerDownload(file)" type="button" class="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:text-indigo-700">下載</button>
              <button
                v-if="isTextLike(file) && file.textContent"
                type="button"
                class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300"
                @click="copyText(file.textContent)"
              >複製</button>
            </div>
          </div>
          <div
            v-if="isTextLike(file) && file.textContent"
            class="mt-4 max-h-56 overflow-y-auto rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-[13px] leading-relaxed text-slate-800 shadow-inner"
          >
            <pre class="whitespace-pre-wrap">{{ file.textContent }}</pre>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 無動畫需求，保留空間供後續需要 */
</style>
