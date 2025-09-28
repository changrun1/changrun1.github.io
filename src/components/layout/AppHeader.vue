<template>
  <header class="sticky top-0 z-40 backdrop-blur bg-slate-950/80 border-b border-slate-800">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <a href="#top" class="text-lg font-semibold tracking-tight text-slate-100">
        {{ title }}
      </a>
      <nav class="hidden gap-6 text-sm font-medium text-slate-300 md:flex">
        <a v-for="item in links" :key="item.href" :href="item.href" class="transition hover:text-sky-400">
          {{ item.label }}
        </a>
      </nav>
      <button
        class="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:border-sky-500/80 hover:bg-sky-500/20"
        type="button"
        @click="$emit('cta-click')"
      >
        <span>{{ ctaLabel }}</span>
        <span aria-hidden="true">→</span>
      </button>
    </div>
  </header>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: 'changrun1.dev',
  },
  links: {
    type: Array,
    default: () => [
      { label: '關於我', href: '#about' },
      { label: '文章', href: '#writing' },
      { label: '作品集', href: '#projects' },
      { label: '檔案分享', href: '#downloads' },
      { label: '匿名上傳', href: '#upload' },
    ],
  },
  ctaLabel: {
    type: String,
    default: '聯絡我',
  },
})
</script>
