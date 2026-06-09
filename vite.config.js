import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

const BUILD_TIMESTAMP = Date.now().toString()

// Plugin : injecte le timestamp de build dans le cache name du Service Worker (dist/sw.js)
function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const swPath = `${process.cwd()}/dist/sw.js`
      try {
        if (fs.existsSync(swPath)) {
          let content = fs.readFileSync(swPath, 'utf8')
          content = content.replace(/sikagestion-v[\w.]+/, `sikagestion-v${BUILD_TIMESTAMP}`)
          fs.writeFileSync(swPath, content)
          console.log(`\n[SIKA BUILD] SW cache version: sikagestion-v${BUILD_TIMESTAMP}\n`)
        }
      } catch (e) {
        console.warn('[SIKA BUILD] SW stamp failed:', e.message)
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), stampServiceWorker()],
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIMESTAMP),
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks: (id) => {
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('jspdf')) return 'pdf';
          if (id.includes('xlsx')) return 'xlsx';
          if (id.includes('html2canvas')) return 'canvas';
          if (id.includes('supabase')) return 'supabase';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  server: {
    hmr: {
      overlay: true
    },
    headers: {
      'Service-Worker-Allowed': '/',
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
