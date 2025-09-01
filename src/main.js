import { createApp } from 'vue'
import { createPinia } from 'pinia' // 1. Pinia import
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia() // 2. Pinia 인스턴스 생성

app.use(pinia) // 3. 앱에 Pinia 등록
app.use(router)

app.mount('#app')