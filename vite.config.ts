import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig(() => {
  return {
    // สำหรับ GitHub Pages
    base: '/dental-record-system/',

    plugins: [
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },

    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var
      // Do not modify
      hmr: process.env.DISABLE_HMR === 'true',

      // Disable file watching when DISABLE_HMR is true
      watch: process.env.DISABLE_HMR === 'true'
        ? null
        : {},
    },
  }
})
