<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import UploadPanel from '../components/UploadPanel.vue'
import { useSiteContent } from '../composables/useSiteContent.js'
import { useStorageProvider } from '../composables/useStorageProvider.js'

const { downloads, isLoading, error, config, refreshDownloads } = useSiteContent()
// Runtime Token：使用者在瀏覽器自行輸入 (localStorage: gh:token)
const ghTokenRaw = ref(localStorage.getItem('gh:token') || '')
const tokenReady = computed(() => ghTokenRaw.value.trim().length > 0)
function saveToken(){
  localStorage.setItem('gh:token', ghTokenRaw.value.trim())
  window.location.reload()
}
function clearToken(){
  localStorage.removeItem('gh:token')
  ghTokenRaw.value = ''
  window.location.reload()
}

// 轉成 provider 使用的分段（避免直接出現完整字串於搜尋）
const directTokenParts = computed(() => {
  const t = ghTokenRaw.value.trim()
  if(!t) return []
  // 簡單切片：每 6 個字元一段
  const parts = []
  for (let i=0; i<t.length; i+=6){ parts.push(t.slice(i,i+6)) }
  return parts
})

const storage = useStorageProvider({
  baseUrl: '',
  directTokenParts: directTokenParts.value,
  owner: config.value.owner,
  repo: config.value.repo,
  branch: config.value.branch,
})

const searchTerm = ref('')
const selectedPath = ref('')
const deleteState = reactive({ pending: false, message: '' })
let messageTimer = null

const normalizedWorkerBase = computed(() => {
  const base = config.value.workerBase || ''
  return base ? base.replace(/\/$/, '') : ''
})

const uploadEndpoint = computed(() => (normalizedWorkerBase.value ? `${normalizedWorkerBase.value}/upload` : ''))
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
  const ok = window.confirm(`確定刪除 ${file.name} ?`)
  if(!ok) return
  try {
    await storage.remove(file.path)
    await refreshDownloads({ full:true })
    setMessage('刪除完成。')
  } catch(e){
    setMessage(e instanceof Error ? e.message : '刪除失敗。')
  }
}
const bulkDelete = async () => {
  const ok = window.confirm('確定刪除全部上傳檔案？此動作不可復原。')
  if (!ok) return
  deleteState.pending = true
  try {
    await storage.removeAll()
    await refreshDownloads({ full: true })
    setMessage('全部刪除完成。')
  } catch(e){
    setMessage(e instanceof Error ? e.message : '全部刪除失敗。')
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
      <!-- Token Input Panel -->
      <div class="rounded-3xl border border-amber-200/70 bg-amber-50/80 p-6 shadow-sm space-y-4" v-if="!tokenReady">
        <h2 class="text-sm font-semibold text-amber-800">輸入 GitHub Token</h2>
        <p class="text-xs leading-relaxed text-amber-700">此專案採前端直連 GitHub，請貼入 fine-grained PAT（僅限該 repo Content 權限）。Token 只存於你的瀏覽器 localStorage，不會提交到程式碼。</p>
        <input v-model="ghTokenRaw" type="password" placeholder="github_pat_xxx..." class="w-full rounded-xl border border-amber-300 bg-white/80 px-3 py-2 text-sm" />
        <div class="flex gap-2">
          <button @click="saveToken" :disabled="!ghTokenRaw.trim()" class="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">儲存並重新載入</button>
          <button @click="ghTokenRaw=''" class="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-white/70">清除</button>
        </div>
        <p class="text-[10px] text-amber-600">提示：若你不想再手動輸入，可改在程式中硬寫，但會被掃描風險（不建議）。</p>
      </div>

      <div v-else class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center justify-between text-[11px] text-emerald-700">
        <span class="truncate">已載入 Token（長度 {{ ghTokenRaw.length }}）</span>
        <div class="flex gap-2">
          <button @click="clearToken" class="rounded border border-emerald-400 px-2 py-0.5 text-[10px] font-medium bg-white/70 hover:bg-white">移除</button>
          <button @click="refreshDownloads()" class="rounded border border-emerald-400 px-2 py-0.5 text-[10px] font-medium bg-white/70 hover:bg-white">重新整理清單</button>
        </div>
      </div>
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
          <div v-if="storage.providers.value.length > 1" class="flex items-center gap-1">
            <label class="text-[10px] text-slate-500">儲存後端</label>
            <select v-model="storage.selectedId.value" class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs">
              <option v-for="p in storage.providers.value" :key="p.id" :value="p.id">{{ p.label }}</option>
            </select>
          </div>
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
