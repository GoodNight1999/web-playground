import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署在 /web-playground/ 子路径下；本地开发和预览也用同一路径，避免线上线下不一致
  base: '/web-playground/',
  plugins: [react(), tailwindcss()],
})
