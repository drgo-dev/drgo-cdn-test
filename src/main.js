import { createApp } from 'vue'
import App from './App.vue'
// 1. 방금 만든 라우터 설정 파일을 가져옵니다.
import router from './router'

const app = createApp(App)

// 2. 앱이 라우터를 사용하도록 등록합니다.
app.use(router)

app.mount('#app')