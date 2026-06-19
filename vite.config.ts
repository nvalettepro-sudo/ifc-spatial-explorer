import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Served at /ifc-spatial-explorer/explorer/ on GitHub Pages
  base: '/ifc-spatial-explorer/explorer/',
  plugins: [react()],
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['web-ifc']
  }
})
