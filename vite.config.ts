import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@/components': path.resolve(__dirname, './src/renderer/components'),
      '@/lib': path.resolve(__dirname, './src/renderer/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/database': path.resolve(__dirname, './src/database')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  clearScreen: false
})