import { ref, computed, watch } from 'vue'
import { listProviders } from '../services/storageProviders.js'

const selectedId = ref(localStorage.getItem('storage:provider') || 'github-worker')
const providersRef = ref([])

export function useStorageProvider(baseUrl){
  providersRef.value = listProviders({ baseUrl })
  const provider = computed(()=> providersRef.value.find(p=> p.id === selectedId.value) || providersRef.value[0])

  function setProvider(id){
    if (providersRef.value.some(p=> p.id === id)) {
      selectedId.value = id
    }
  }

  watch(selectedId, (id)=>{
    localStorage.setItem('storage:provider', id)
  })

  async function list(){
    return provider.value.list()
  }
  async function upload(parts){
    return provider.value.upload(parts)
  }
  async function remove(path){
    return provider.value.delete(path)
  }
  async function removeAll(){
    return provider.value.deleteAll()
  }

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
