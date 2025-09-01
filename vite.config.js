import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    plugins: [vue()],
    server: { // ❗️ 이 server 옵션을 추가합니다.
        proxy: {
            // '/api'로 시작하는 모든 요청을 대상으로 합니다.
            '/api': {
                // ❗️ 실제 배포된 Cloudflare Pages 주소로 변경해주세요.
                target: 'https://drgo-cdn-test.pages.dev',
                changeOrigin: true,
            },
        },
    },
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
        dedupe: ['vue'],
    },
    base: '/',
})
