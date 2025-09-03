import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/renderer/components'),
      '@/lib': path.resolve(__dirname, './src/renderer/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/database': path.resolve(__dirname, './src/database'),
      '@/services': path.resolve(__dirname, './src/services')
    }
  },
  // Include all test files in the project
  include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}']
})