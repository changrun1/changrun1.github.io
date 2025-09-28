<template>
  <footer class="border-t border-slate-800 bg-slate-950/90">
    <div class="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
      <p class="font-medium text-slate-300">© {{ new Date().getFullYear() }} {{ owner }}. 保留所有權利。</p>
      <div class="flex flex-wrap gap-3 text-xs uppercase tracking-wide">
        <slot name="links">
          <a
            v-for="item in links"
            :key="item.href"
            :href="item.href"
            class="transition hover:text-sky-400"
            target="_blank"
            rel="noreferrer"
          >
            {{ item.label }}
          </a>
        </slot>
      </div>
    </div>
  </footer>
</template>

<script setup>
const props = defineProps({
  owner: {
    type: String,
    default: 'changrun1',
  },
  links: {
    type: Array,
    default: () => [
      { label: 'GitHub', href: 'https://github.com/changrun1' },
      { label: 'LinkedIn', href: '#' },
      { label: 'Email', href: 'mailto:hello@example.com' },
    ],
  },
})
</script>
