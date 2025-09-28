<template>
  <section class="space-y-6">
    <header class="space-y-1">
      <h2 class="text-lg font-semibold text-slate-900">上傳檔案或留言</h2>
      <p class="text-sm text-slate-500">支援純文字與任意檔案格式，完成後會立即出現在清單中。</p>
    </header>
    <form class="space-y-5 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm" @submit.prevent="handleSubmit">
      <div class="flex items-center gap-3 text-xs font-medium text-slate-600">
        <button type="button" @click="mode='text'" :class="mode==='text' ? activeTabClass : tabClass">文字</button>
        <button type="button" @click="mode='file'" :class="mode==='file' ? activeTabClass : tabClass">檔案</button>
      </div>
      <div v-if="mode==='text'" class="space-y-4">
        <div class="flex items-center justify-between text-sm text-slate-600 gap-3">
          <span class="flex-1">純文字內容（必填）</span>
          <div class="flex items-center gap-2">
            <select v-model="form.textExt" class="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              <option value="txt">.txt</option>
              <option value="md">.md</option>
              <option value="custom">自訂</option>
            </select>
            <input
              v-if="form.textExt==='custom'"
              v-model="form.customTextExt"
              type="text"
              placeholder="副檔名"
              class="w-28 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              maxlength="12"
            />
          </div>
        </div>
        <textarea
          v-model="form.message"
          ref="messageInput"
          @input="autoGrow"
          class="min-h-[240px] w-full resize-none rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="輸入文字內容 (支援多行、會自動伸縮)"
          maxlength="5000"
        />
        <div class="flex justify-between text-xs text-slate-400">
          <span>最多 5000 字元</span>
          <span v-if="form.message.length">{{ form.message.length }}/5000</span>
        </div>
      </div>
      <div v-else class="space-y-4 text-sm text-slate-600">
        <div>
          <span class="block mb-2">檔案（最大 {{ formatSize(maxFileSize) }}）</span>
          <input ref="fileInput" type="file" :accept="acceptAttr" class="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 file:hidden focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" @change="handleFileChange" />
          <span v-if="form.fileName" class="mt-2 block text-xs text-slate-500">已選擇：{{ form.fileName }}</span>
          <span v-else class="mt-2 block text-xs text-slate-400">未選擇檔案</span>
        </div>
      </div>
      <div class="space-y-2 text-sm text-slate-600">
        <span class="block leading-snug">
          自訂檔名（選填，不含副檔名）<br/>
          例如：meeting-notes<br/>
          若同名將上傳失敗（409），請改名再送出。<br/>
          文字模式：可選 .txt / .md 或自訂副檔名（僅英數 1-12 字，請勿加點）。
        </span>
        <input v-model="form.customName" type="text" placeholder="例如：meeting-notes" class="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" maxlength="80" />
      </div>
      <div class="flex flex-wrap items-center justify-end gap-4 text-xs text-slate-500">
        <button
          type="submit"
          :disabled="isSubmitting"
          class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span v-if="!isSubmitting">送出上傳</span>
          <span v-else>上傳中…</span>
        </button>
      </div>
      <p v-if="feedback.message" :class="feedbackClass" role="status">
        {{ feedback.message }}
      </p>
    </form>
  </section>
</template>

<script setup>
import { computed, reactive, ref, onMounted, watch } from 'vue'

const props = defineProps({
  endpoint: {
    type: String,
    default: '',
  },
  uploadProvider: {
    type: Object,
    default: null,
  },
  maxFileSize: {
    type: Number,
    default: 10 * 1024 * 1024,
  },
  acceptedTypes: {
    type: Array,
    default: () => [],
  },
  rateLimitPerHour: {
    type: Number,
    default: 5,
  },
})

const emit = defineEmits(['upload-success'])

const form = reactive({
  message: '',
  file: null,
  fileName: '',
  customName: '',
  textExt: 'txt',
  customTextExt: '',
})

const mode = ref('text') // 'text' | 'file'
const tabClass = 'rounded-full border px-4 py-1 bg-white/60 border-slate-200 hover:bg-white/90 transition'
const activeTabClass = 'rounded-full border px-4 py-1 bg-slate-900 text-white border-slate-900 shadow'

const fileInput = ref(null)
const isSubmitting = ref(false)
const feedback = reactive({ type: '', message: '' })
const messageInput = ref(null)

const acceptAttr = computed(() => (props.acceptedTypes.length ? props.acceptedTypes.join(',') : undefined))

const feedbackClass = computed(() => {
  if (!feedback.type) return 'text-center text-sm text-slate-500'
  return feedback.type === 'success'
    ? 'text-center text-sm font-semibold text-emerald-600'
    : 'text-center text-sm font-semibold text-rose-500'
})

const formatSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value.toFixed(value < 10 && index > 0 ? 1 : 0)} ${units[index]}`
}

const resetForm = () => {
  form.message = ''
  form.file = null
  form.fileName = ''
  form.customName = ''
  form.textExt = 'txt'
  form.customTextExt = ''
  mode.value = 'text'
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  nextTickAutoGrow()
}

const handleFileChange = (event) => {
  const [file] = event.target.files || []
  form.file = file ?? null
  form.fileName = file ? file.name : ''
  if (file) {
    // 清空文字區以維持互斥
    form.message = ''
  }
  nextTickAutoGrow()
}

const handleSubmit = async () => {
  // 若無 endpoint 則嘗試使用 provider 模式
  if (!props.endpoint && !props.uploadProvider) {
    feedback.type = 'error'
    feedback.message = '尚未設定上傳端點。'
    return
  }
  if (mode.value === 'text') {
    if (!form.message.trim()) {
      feedback.type = 'error'
      feedback.message = '請輸入文字內容。'
      return
    }
    form.file = null
    form.fileName = ''
    if (form.textExt === 'custom') {
      const raw = (form.customTextExt || '').trim()
      if (!raw) {
        feedback.type = 'error'
        feedback.message = '請輸入自訂副檔名。'
        return
      }
      const normalized = raw.replace(/^\.+/, '') // 去除前導點
        .toLowerCase()
      const valid = /^[a-z0-9]{1,12}$/.test(normalized)
      if (!valid) {
        feedback.type = 'error'
        feedback.message = '副檔名僅限英數 1-12 字，且不含點與其他符號。'
        return
      }
      form.customTextExt = normalized
    }
  } else {
    if (!form.file) {
      feedback.type = 'error'
      feedback.message = '請選擇檔案。'
      return
    }
    form.message = ''
  }
  // 互斥：若有檔案就忽略文字；若有文字就忽略檔案（已在 UI 禁用）
  if (form.file && form.file.size > props.maxFileSize) {
    feedback.type = 'error'
    feedback.message = '檔案大小超出限制，請重新選擇。'
    return
  }

  isSubmitting.value = true
  feedback.type = ''
  feedback.message = ''

  try {
    if (props.uploadProvider && !props.endpoint) {
      // Provider 模式
      const effectiveExt = form.textExt === 'custom' ? form.customTextExt : form.textExt
      const result = await props.uploadProvider.upload({
        file: form.file,
        message: mode.value === 'text' ? form.message : '',
        customName: form.customName,
        textExt: effectiveExt,
      })
      feedback.type = 'success'
      feedback.message = (result && result.message) || '上傳完成。'
      resetForm()
      emit('upload-success')
    } else {
      // 舊 endpoint 模式（保留兼容）
      const payload = new FormData()
      if (form.message) payload.append('message', form.message)
      if (form.file) payload.append('file', form.file)
      if (form.customName) payload.append('filename', form.customName)
      if (form.message && form.textExt) {
        const ext = form.textExt === 'custom' ? form.customTextExt : form.textExt
        payload.append('textExt', ext)
      }
      const response = await fetch(props.endpoint, { method: 'POST', body: payload })
      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: '上傳失敗，請稍後再試。' }))
        throw new Error(data.message || '上傳失敗，請稍後再試。')
      }
      const result = await response.json()
      feedback.type = 'success'
      feedback.message = result.message || '上傳完成。'
      resetForm()
      emit('upload-success')
    }
  } catch (error) {
    feedback.type = 'error'
    feedback.message = error instanceof Error ? error.message : '上傳失敗，請稍後再試。'
  } finally {
    isSubmitting.value = false
  }
}

function autoGrow(){
  if(!messageInput.value) return
  const el = messageInput.value
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 800) + 'px'
}

function nextTickAutoGrow(){
  requestAnimationFrame(()=> autoGrow())
}

onMounted(()=>{ autoGrow() })
watch(()=> form.message, ()=> autoGrow())
</script>
