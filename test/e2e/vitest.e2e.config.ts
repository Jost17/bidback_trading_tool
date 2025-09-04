/**
 * End-to-End Testing Configuration for BIDBACK Trading System
 * 
 * Specialized Vitest configuration for comprehensive E2E testing including
 * performance monitoring, memory management, and production readiness validation.
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // E2E specific configuration
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      './test/setup.ts',
      './test/e2e/setup-e2e.ts'
    ],
    
    // Include only E2E tests
    include: [
      'test/e2e/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'source',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}' // Exclude unit tests
    ],

    // Extended timeouts for E2E tests
    testTimeout: 30000,      // 30 seconds per test
    hookTimeout: 10000,      // 10 seconds for hooks
    teardownTimeout: 5000,   // 5 seconds for cleanup

    // Performance and reliability settings
    retry: 2,                // Retry failed tests twice
    bail: 10,                // Stop after 10 failures
    
    // Reporters for comprehensive output
    reporter: [
      'verbose',
      'json',
      'html'
    ],
    
    // Coverage configuration for E2E tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage/e2e',
      include: [
        'src/renderer/**/*.{js,ts,jsx,tsx}'
      ],
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
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },

    // Pool configuration for E2E tests
    pool: 'forks',           // Use forks for better isolation
    poolOptions: {
      forks: {
        isolate: true,       // Isolate tests for better reliability
        singleFork: false    // Allow parallel execution
      }
    },

    // Test sequencing for complex workflows
    sequence: {
      concurrent: false,     // Run E2E tests sequentially by default
      shuffle: false         // Maintain test order for workflow tests
    },

    // Environment variables for E2E testing
    env: {
      NODE_ENV: 'test',
      VITE_E2E_TESTING: 'true',
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
    }
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src/renderer'),
      '@/components': path.resolve(__dirname, '../../src/renderer/components'),
      '@/lib': path.resolve(__dirname, '../../src/renderer/lib'),
      '@/types': path.resolve(__dirname, '../../src/types'),
      '@/database': path.resolve(__dirname, '../../src/database'),
      '@/test-utils': path.resolve(__dirname, './utils')
    }
  },

  // Development server configuration for E2E testing
  server: {
    port: 3001, // Different port to avoid conflicts
    strictPort: true,
    open: false
  },

  // Build configuration for E2E testing
  build: {
    sourcemap: true, // Enable source maps for better debugging
    minify: false    // Don't minify for easier debugging
  }
})