import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  define: { global: 'globalThis' },
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5175,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
