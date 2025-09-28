import { ref, computed, watch } from 'vue'
import { listProviders } from '../services/storageProviders.js'

const selectedId = ref(localStorage.getItem('storage:provider') || 'github-direct')
const providersRef = ref([])

// options: { baseUrl?, directTokenParts?, owner, repo, branch, useEmbeddedToken? }
export function useStorageProvider(options){
  const {
    baseUrl = '',
    directTokenParts = [],
    owner = 'changrun1',
    repo = 'changrun1.github.io',
    branch = 'main',
    useEmbeddedToken = false,
  } = typeof options === 'object' ? options : { baseUrl: options }

  providersRef.value = listProviders({ baseUrl, directTokenParts: useEmbeddedToken ? [] : directTokenParts, owner, repo, branch, useEmbeddedToken })
  const provider = computed(() => providersRef.value.find(p => p.id === selectedId.value) || providersRef.value[0])

  function setProvider(id){
    if (providersRef.value.some(p => p.id === id)) {
      selectedId.value = id
    }
  }

  watch(selectedId, (id) => {
    localStorage.setItem('storage:provider', id)
  })

  async function list(){ return provider.value.list() }
  async function upload(parts){ return provider.value.upload(parts) }
  async function remove(path){ return provider.value.delete(path) }
  async function removeAll(){ return provider.value.deleteAll() }

  return {
    providers: providersRef,
    provider,
    selectedId,
    setProvider,
    list,
    upload,
    remove,
    removeAll,
  }
}
