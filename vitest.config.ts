/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'source'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'src/main/**', // Electron main process
        'dist/',
        'build/'
      ],
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
  }
})