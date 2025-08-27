import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Cloudflare Pages에 서브도메인/루트 모두 대응
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist'
  }
})