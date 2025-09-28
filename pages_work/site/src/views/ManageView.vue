<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import UploadPanel from '../components/UploadPanel.vue'
import { useSiteContent } from '../composables/useSiteContent.js'

const { downloads, isLoading, error, config, refreshDownloads } = useSiteContent()

const searchTerm = ref('')
const selectedPath = ref('')
const deleteState = reactive({ pending: false, message: '' })
let messageTimer = null

const normalizedWorkerBase = computed(() => {
  const base = config.value.workerBase || ''
  return base ? base.replace(/\/$/, '') : ''
})

const uploadEndpoint = computed(() => (normalizedWorkerBase.value ? `${normalizedWorkerBase.value}/upload` : '')) // reserved if needed elsewhere
const deleteEndpoint = computed(() => (normalizedWorkerBase.value ? `${normalizedWorkerBase.value}/uploads` : ''))

const sortKey = ref('time') // time | name | size
const sortDesc = ref(true)

const sortFiles = (list) => {
  return [...list].sort((a,b)=>{
    if (sortKey.value === 'name') return (a.name.localeCompare(b.name)) * (sortDesc.value?-1:1)
    if (sortKey.value === 'size') return (b.size - a.size) * (sortDesc.value?1:-1)
    // time
    return (new Date(b.updatedAt||0) - new Date(a.updatedAt||0)) * (sortDesc.value?1:-1)
  })
}

const filteredDownloads = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  let base = downloads.value
  if (keyword) base = base.filter((file) => {
    const haystack = [file.name, file.extension, file.path].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(keyword)
  })
  return sortFiles(base)
})

const selectedFile = computed(() => {
  if (!filteredDownloads.value.length) return null
  return filteredDownloads.value.find((file) => file.path === selectedPath.value) ?? filteredDownloads.value[0]
})

watch(
  () => filteredDownloads.value,
  (list) => {
    if (!list.length) {
      selectedPath.value = ''
      return
    }
    if (!list.some((file) => file.path === selectedPath.value)) {
      selectedPath.value = list[0].path
  }
  }
)

function selectFile(file){
  selectedPath.value = file.path
}

function highlightMatch(name){
  const kw = searchTerm.value.trim()
  if(!kw) return name
  const safe = kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  return name.replace(new RegExp(`(${safe})`,'ig'),'<mark class="bg-yellow-200/70 rounded px-0.5">$1</mark>')
}

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

function displayName(name){
  if(!name) return ''
  return name.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z[-_]/,'')
}

function setMessage(msg){
  deleteState.message = msg
  if(messageTimer) clearTimeout(messageTimer)
  messageTimer = setTimeout(()=>{ deleteState.message = '' }, 4000)
}

async function copyPreview(){
  if(!selectedFile.value?.textContent) return
  try {
    await navigator.clipboard.writeText(selectedFile.value.textContent)
    setMessage('文字已複製。')
  } catch(e){
    setMessage('複製失敗。')
  }
}

async function deleteFile(file){
  const base = deleteEndpoint.value
  if(!base) return
  const ok = window.confirm(`確定刪除 ${file.name} ?`)
  if(!ok) return
  try {
    const res = await fetch(base, { method:'DELETE', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ path: file.path }) })
    if(!res.ok) throw new Error('刪除失敗')
    await refreshDownloads({ full:true })
    setMessage('刪除完成。')
  } catch(e){
    setMessage('刪除失敗。')
  }
}
const bulkDelete = async () => {
  const base = config.value.workerBase?.replace(/\/$/,'')
  if (!base) {
    setMessage('尚未設定端點。')
    return
  }
  const ok = window.confirm('確定刪除全部上傳檔案？此動作不可復原。')
  if (!ok) return
  deleteState.pending = true
  try {
    const res = await fetch(`${base}/uploads/all`, { method: 'DELETE' })
    if (!res.ok) throw new Error('刪除失敗')
    await refreshDownloads({ full: true })
    setMessage('全部刪除完成。')
  } catch(e){
    setMessage('全部刪除失敗。')
  } finally {
    deleteState.pending = false
  }
}

const iconFor = (file) => {
  const ext = (file.extension||'').toLowerCase()
  if(['png','jpg','jpeg','gif','webp','svg','bmp','avif'].includes(ext)) return '🖼'
  if(['zip','rar','7z','tar','gz'].includes(ext)) return '🗜'
  if(['pdf'].includes(ext)) return '📄'
  if(file.isText) return '📝'
  return '📦'
}
const IMAGE_EXTENSIONS = new Set(['png','jpg','jpeg','gif','webp','svg','bmp','avif'])
const CODE_EXTENSIONS = new Set(['js','ts','css','html','json','py'])
// 判斷預覽：圖片、程式碼、以及 txt 純文字都允許預覽
function canPreview(file){
  const ext = (file.extension||'').toLowerCase()
  if(ext === 'txt') return true
  return IMAGE_EXTENSIONS.has(ext) || CODE_EXTENSIONS.has(ext)
}

// 下載：除 txt 可視需求也能下載，但依照目前規則 txt 不下載；保留原規則
async function triggerDownload(file){
  try {
    const res = await fetch(file.downloadUrl)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = displayName(file.name) || file.name
    document.body.appendChild(a)
    a.click()
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove() }, 1500)
  } catch(e) { /* ignore */ }
}

onBeforeUnmount(() => {
  if (messageTimer) {
    clearTimeout(messageTimer)
  }
})
</script>

<template>
  <section class="space-y-10">
    <!-- （已移除上傳表單，改至獨立 Upload 頁面） -->

    <!-- 控制列 -->
    <div class="rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-sm space-y-4">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-medium text-slate-500 mb-1">搜尋檔案</label>
          <div class="relative">
            <input
              v-model="searchTerm"
              type="search"
              placeholder="搜尋名稱、路徑或副檔名"
              class="w-full rounded-full border border-slate-200 bg-white/90 px-4 py-2 pr-10 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-300">🔍</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <select v-model="sortKey" class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs">
            <option value="time">時間</option>
            <option value="name">名稱</option>
            <option value="size">大小</option>
          </select>
          <button type="button" class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs" @click="sortDesc = !sortDesc">{{ sortDesc ? '↓' : '↑' }}</button>
          <button type="button" class="rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600" @click="() => refreshDownloads()">重新整理</button>
          <button type="button" class="rounded-full border border-rose-200 bg-rose-50 px-4 py-1 text-xs font-semibold text-rose-500 transition hover:border-rose-300" :disabled="deleteState.pending" @click="bulkDelete">全部刪除</button>
        </div>
      </div>
      <div v-if="deleteState.message" class="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">{{ deleteState.message }}</div>
      <p class="text-xs text-slate-400">共 {{ filteredDownloads.length }} 件檔案</p>
    </div>

    <!-- 檔案列表 -->
    <div class="rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-sm">
      <h2 class="mb-4 text-sm font-semibold text-slate-600">檔案列表</h2>
      <!-- 新增高度限制與滾動，使右側預覽更常駐在視窗內 -->
      <div class="space-y-2 max-h-[420px] overflow-y-auto pr-1" v-if="filteredDownloads.length">
        <div
          v-for="file in filteredDownloads"
          :key="file.path"
          class="group flex items-start gap-2 rounded-xl border px-3 py-2 transition hover:bg-indigo-50/60"
          :class="file.path === selectedFile?.path ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white/60'"
          @click="selectFile(file)"
        >
          <div class="mt-0.5 text-lg">{{ iconFor(file) }}</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-800" v-html="highlightMatch(displayName(file.name))"></p>
            <p class="truncate text-[11px] text-slate-500">{{ formatSize(file.size) }} · {{ file.extension || '無副檔名' }}</p>
          </div>
          <RouterLink
            v-if="canPreview(file)"
            :to="{ name: 'preview', query: { path: file.path } }"
            class="rounded-full border px-2 py-1 text-[11px] font-semibold transition border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            @click.stop
          >預覽</RouterLink>
          <button
            type="button"
            class="rounded-full border px-2 py-1 text-[11px] font-semibold transition border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            @click.stop="triggerDownload(file)"
          >下載</button>
          <button
            type="button"
            class="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-100"
            :disabled="deleteState.pending"
            @click.stop="deleteFile(file)"
          >刪除</button>
        </div>
      </div>
      <p v-else class="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-10 text-center text-sm text-slate-400">尚未有檔案，先上傳一個。</p>
    </div>

    <!-- 預覽功能已移除 -->

    <div v-if="isLoading" class="rounded-3xl border border-white/70 bg-white/80 p-10 text-center text-sm text-slate-500 shadow-sm">資料載入中...</div>
    <div v-else-if="error" class="rounded-3xl border border-rose-100 bg-rose-50 p-10 text-center text-sm font-semibold text-rose-500 shadow-sm">{{ error }}</div>
  </section>
</template>
