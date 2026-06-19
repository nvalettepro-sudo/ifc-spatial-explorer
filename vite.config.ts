import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['web-ifc'],
  },
  build: {
    target: 'esnext',
  },
  assetsInclude: ['**/*.wasm'],
})
