import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('jspdf')) return 'pdf';
        },
      },
    },
  },
  server: {
    hmr: {
      overlay: true
    },
    headers: {
      'Service-Worker-Allowed': '/',
    },
  },
})
