import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8090',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  test: {
    exclude: [
      '**/node_modules/**',
      '**/.worktrees/**',
      'tests/account-slot-position.test.mjs',
    ],
  }
})
