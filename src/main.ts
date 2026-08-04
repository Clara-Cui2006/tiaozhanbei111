import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { restoreSession } from './services/auth'


// 引入 Arco Design
import ArcoVue from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'

const app = createApp(App)


app.use(router)
app.use(ArcoVue)

restoreSession().finally(() => app.mount('#app'))
