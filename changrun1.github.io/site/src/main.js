import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

import DownloadsView from './views/DownloadsView.vue'
import ManageView from './views/ManageView.vue'
import PreviewView from './views/PreviewView.vue'
import UploadPanel from './components/UploadPanel.vue'
import { useSiteContent } from './composables/useSiteContent.js'

const routes = [
  { path: '/', component: DownloadsView },
  { path: '/manage', component: ManageView },
  { path: '/preview', component: PreviewView },
  { path: '/upload', component: {
      setup(){
        const { config, refreshDownloads } = useSiteContent()
        return { config, refreshDownloads }
      },
      components:{ UploadPanel },
      template:`<div class='max-w-2xl mx-auto'><UploadPanel :endpoint="config.workerBase ? config.workerBase.replace(/\/$/,'') + '/upload' : ''" @upload-success="refreshDownloads({full:true})" /></div>`
    }
  },
]

const router = createRouter({ history: createWebHashHistory(), routes })

// 簡易 provide store：用 composable 內部單例保持
const app = createApp(App)
app.use(router)
app.mount('#app')
