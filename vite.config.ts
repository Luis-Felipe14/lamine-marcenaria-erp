import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    proxy: {
      '/api/pdf': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts')) return 'vendor-charts'
          if (id.includes('jspdf')) return 'vendor-pdf'
          if (id.includes('xlsx')) return 'vendor-xlsx'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@tanstack/react-query')) return 'vendor-query'
          if (id.includes('react-router') || id.includes('/react-dom/') || id.includes('/react/')) return 'vendor-react'
        },
      },
    },
  },
})
