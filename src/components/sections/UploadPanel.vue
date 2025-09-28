<template>
  <section id="upload" class="mx-auto max-w-4xl space-y-8">
    <header class="space-y-2 text-center text-slate-600">
      <p class="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Upload</p>
      <h2 class="text-2xl font-semibold text-slate-900 md:text-3xl">上傳新的共享檔案</h2>
      <p class="text-sm">
        檔案會即時同步到分享清單。請勿上傳違法或含機敏資訊的內容。
      </p>
    </header>
    <form class="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" @submit.prevent="handleSubmit">
      <div class="grid gap-6 md:grid-cols-2">
        <label class="flex flex-col gap-2 text-sm text-slate-600">
          <span>文字內容（選填）</span>
          <textarea
            v-model="form.message"
            class="min-h-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="分享你的想法、建議，或是給社群的留言"
            maxlength="2000"
          />
          <span class="text-xs text-slate-400">最多 2000 字元。純文字會存成 Markdown。</span>
        </label>
        <label class="flex flex-col gap-2 text-sm text-slate-600">
          <span>檔案（選填，最多 10MB）</span>
          <input
            ref="fileInput"
            type="file"
            :accept="acceptAttr"
            class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 file:hidden focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            @change="handleFileChange"
          />
          <span v-if="form.fileName" class="text-xs text-slate-500">已選擇：{{ form.fileName }}</span>
          <span class="text-xs text-slate-400">支援任意副檔名，請自行確認安全性。</span>
        </label>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <p>
          每個 IP 每小時最多 {{ rateLimitPerHour }} 次。上傳即代表你同意將內容公開。
        </p>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-500/10 px-6 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
import { computed, reactive, ref } from 'vue'

const props = defineProps({
  endpoint: {
    type: String,
    default: '',
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
})

const fileInput = ref(null)
const isSubmitting = ref(false)
const feedback = reactive({ type: '', message: '' })

const acceptAttr = computed(() => (props.acceptedTypes.length ? props.acceptedTypes.join(',') : undefined))

const feedbackClass = computed(() => {
  if (!feedback.type) return 'text-center text-sm text-slate-500'
  return feedback.type === 'success'
    ? 'text-center text-sm font-semibold text-emerald-600'
    : 'text-center text-sm font-semibold text-rose-500'
})

const resetForm = () => {
  form.message = ''
  form.file = null
  form.fileName = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleFileChange = (event) => {
  const [file] = event.target.files || []
  form.file = file ?? null
  form.fileName = file ? file.name : ''
}

const handleSubmit = async () => {
  if (!props.endpoint) {
    feedback.type = 'error'
    feedback.message = '未配置上傳服務端點，請通知站長。'
    return
  }
  if (!form.message && !form.file) {
    feedback.type = 'error'
    feedback.message = '請輸入文字內容或選擇檔案。'
    return
  }
  if (form.file && form.file.size > props.maxFileSize) {
    feedback.type = 'error'
    feedback.message = '檔案大小超出限制，請壓縮或重新選擇。'
    return
  }

  isSubmitting.value = true
  feedback.type = ''
  feedback.message = ''

  try {
    const payload = new FormData()
    if (form.message) payload.append('message', form.message)
    if (form.file) payload.append('file', form.file)

    const response = await fetch(props.endpoint, {
      method: 'POST',
      body: payload,
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: '上傳失敗，請稍後再試。' }))
      throw new Error(data.message || '上傳失敗，請稍後再試。')
    }

    const result = await response.json()
    feedback.type = 'success'
    feedback.message = result.message || '上傳完成，感謝你的分享！'
    resetForm()
    emit('upload-success')
  } catch (error) {
    feedback.type = 'error'
    feedback.message = error.message || '上傳失敗，請稍後再試。'
  } finally {
    isSubmitting.value = false
  }
}
</script>
