import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    // 이 'base' 설정을 추가합니다.
    // 빌드 시 모든 경로를 상대 경로로 만들어줍니다.
    base: './',
    build: {
        outDir: 'dist'
    }
})