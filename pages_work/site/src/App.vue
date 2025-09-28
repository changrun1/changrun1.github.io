<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 導覽列：下載 / 上傳 / 管理
const navItems = [
  { label: '下載', to: '/' },
  { label: '上傳', to: '/upload' },
  { label: '管理', to: '/manage' },
]

const activeLabel = computed(() => {
  const current = navItems.find((item) => item.to === route.path)
  return current?.label ?? '下載'
})
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <div class="min-h-screen bg-white/85">
      <header class="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div class="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div class="leading-tight">
            <h1 class="text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">常潤檔案分享</h1>
            <p class="mt-1 text-xs text-slate-500">{{ activeLabel }}</p>
          </div>
          <nav class="flex gap-2 rounded-full border border-slate-200 bg-white/60 p-1 text-sm shadow-sm">
            <RouterLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="rounded-full px-4 py-2 font-medium transition"
              :class="route.path === item.to ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-white/80 hover:text-slate-900'"
            >
              {{ item.label }}
            </RouterLink>
          </nav>
        </div>
      </header>

      <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <RouterView />
      </main>

      <footer class="border-t border-slate-200 bg-white/90">
        <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2 text-[11px] leading-tight text-slate-500 sm:px-6">
          <span>© {{ new Date().getFullYear() }} 常潤</span>
          <span class="flex items-center gap-2">
            <span class="hidden sm:inline">Cloudflare Worker · GitHub</span>
            <RouterLink to="/manage" class="text-[10px] text-slate-400 hover:text-slate-600" title="管理">manage</RouterLink>
          </span>
        </div>
      </footer>
    </div>
  </div>
</template>

<script>
// 提供一個鍵盤捷徑：按下 g 再按 m 導向管理頁（不影響主流程）
export default {
  mounted() {
    let sequence = ''
    this._handler = (e) => {
      sequence = (sequence + e.key.toLowerCase()).slice(-2)
      if (sequence === 'gm') {
        this.$router.push('/manage')
      }
    }
    window.addEventListener('keydown', this._handler)
  },
  unmounted() {
    window.removeEventListener('keydown', this._handler)
  },
}
</script>
