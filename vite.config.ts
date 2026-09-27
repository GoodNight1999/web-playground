import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署在 /web-playground/ 子路径下；本地开发和预览也用同一路径，避免线上线下不一致
  base: '/web-playground/',
  plugins: [react(), tailwindcss()],
  build: {
    // 多页面：每个独立页面一个 HTML 入口，部署后是真实目录，不需要 SPA 路由回退
    rolldownOptions: {
      input: {
        main: page('./index.html'),
        zeta: page('./zeta/index.html'),
      },
    },
  },
})
