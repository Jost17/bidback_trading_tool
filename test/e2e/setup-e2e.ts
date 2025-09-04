/**
 * End-to-End Test Setup Configuration
 * 
 * Enhanced setup for E2E testing including performance monitoring,
 * memory management, and production-like environment simulation.
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Enhanced Electron API mocking for E2E tests
const createEnhancedElectronAPI = () => ({
  // Database operations with realistic delays
  saveBreadthData: vi.fn().mockImplementation((data) => 
    new Promise(resolve => setTimeout(() => resolve(Date.now()), 50))
  ),
  getBreadthHistory: vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve([]), 30))
  ),
  updateBreadthData: vi.fn().mockImplementation((id, data) => 
    new Promise(resolve => setTimeout(() => resolve(true), 40))
  ),
  deleteBreadthData: vi.fn().mockImplementation((id) => 
    new Promise(resolve => setTimeout(() => resolve(true), 35))
  ),
  
  // CSV operations with file system simulation
  importBreadthCSV: vi.fn().mockImplementation((filePath) => 
    new Promise(resolve => setTimeout(() => resolve({ 
      success: true, 
      imported: Math.floor(Math.random() * 100) + 50 
    }), 200))
  ),
  exportBreadthCSV: vi.fn().mockImplementation((data) => 
    new Promise(resolve => setTimeout(() => resolve({ 
      success: true, 
      filePath: '/tmp/export.csv' 
    }), 150))
  ),
  
  // Portfolio settings with validation
  savePortfolioSettings: vi.fn().mockImplementation((settings) => 
    new Promise(resolve => setTimeout(() => {
      if (settings.portfolioSize < 0) {
        resolve({ success: false, error: 'Portfolio size must be positive' })
      } else {
        resolve({ success: true })
      }
    }, 60))
  ),
  getPortfolioSettings: vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve({
      portfolioSize: 100000,
      baseAllocation: 10,
      riskTolerance: 'Moderate'
    }), 40))
  ),
  
  // Trading operations
  savePlannedTrade: vi.fn().mockImplementation((trade) => 
    new Promise(resolve => setTimeout(() => resolve(Date.now()), 70))
  ),
  getPlannedTrades: vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve([]), 45))
  ),
  executeTrade: vi.fn().mockImplementation((tradeId) => 
    new Promise(resolve => setTimeout(() => resolve({ 
      success: true, 
      executionId: `exec-${Date.now()}` 
    }), 100))
  ),
  
  // Position management
  getOpenPositions: vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve([]), 50))
  ),
  updatePosition: vi.fn().mockImplementation((positionId, updates) => 
    new Promise(resolve => setTimeout(() => resolve(true), 55))
  ),
  closePosition: vi.fn().mockImplementation((positionId) => 
    new Promise(resolve => setTimeout(() => resolve({ 
      success: true, 
      closedAt: new Date().toISOString() 
    }), 80))
  ),
  
  // File operations with security validation
  openFile: vi.fn().mockImplementation((filters) => 
    new Promise(resolve => setTimeout(() => resolve({
      filePath: '/mock/file.csv',
      content: 'Date,T2108,VIX,Up4%,Down4%\n2025-01-01,25.3,18.5,950,180'
    }), 100))
  ),
  saveFile: vi.fn().mockImplementation((content, defaultPath) => 
    new Promise(resolve => setTimeout(() => {
      // Simulate security validation
      if (content.includes('<script>')) {
        resolve({ success: false, error: 'Invalid content detected' })
      } else {
        resolve({ success: true, filePath: '/mock/saved-file.csv' })
      }
    }, 120))
  ),
  
  // System operations
  showMessage: vi.fn().mockResolvedValue(0),
  showError: vi.fn().mockResolvedValue(undefined),
  showWarning: vi.fn().mockResolvedValue(undefined),
  getAppVersion: vi.fn().mockReturnValue('1.0.0-e2e'),
  getSystemInfo: vi.fn().mockResolvedValue({
    platform: 'darwin',
    arch: 'x64',
    memory: 16 * 1024 * 1024 * 1024 // 16GB
  }),
  quit: vi.fn(),
  
  // Performance monitoring
  getPerformanceMetrics: vi.fn().mockImplementation(() => 
    Promise.resolve({
      memoryUsage: process.memoryUsage?.() || { heapUsed: 50 * 1024 * 1024 },
      cpuUsage: { user: 1000, system: 500 },
      uptime: Date.now()
    })
  ),
  
  // Holiday calendar integration
  getHolidays: vi.fn().mockImplementation((year) => 
    Promise.resolve([
      { date: `${year}-01-01`, name: 'New Year\'s Day', marketClosed: true },
      { date: `${year}-07-04`, name: 'Independence Day', marketClosed: true },
      { date: `${year}-12-25`, name: 'Christmas Day', marketClosed: true }
    ])
  ),
  calculateBusinessDays: vi.fn().mockImplementation((start, end) => 
    Promise.resolve(Math.max(1, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24 * 7 / 5))))
  )
})

// Global test environment setup
beforeAll(() => {
  // Mock window.electronAPI with enhanced functionality
  ;(global as any).window = global.window || {}
  ;(global.window as any).electronAPI = createEnhancedElectronAPI()
  
  // Mock performance API for detailed monitoring
  if (typeof global.performance === 'undefined') {
    ;(global as any).performance = {
      now: vi.fn().mockImplementation(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn().mockReturnValue([]),
      clearMarks: vi.fn(),
      clearMeasures: vi.fn()
    }
  }
  
  // Mock IntersectionObserver for virtual scrolling tests
  global.IntersectionObserver = vi.fn().mockImplementation((callback, options) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '0px',
    thresholds: [0]
  }))
  
  // Mock ResizeObserver for responsive component tests
  global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
  
  // Mock crypto for secure operations
  if (typeof global.crypto === 'undefined') {
    ;(global as any).crypto = {
      randomUUID: vi.fn().mockImplementation(() => 
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0
          const v = c === 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
      ),
      getRandomValues: vi.fn().mockImplementation((array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256)
        }
        return array
      })
    }
  }
  
  // Enhanced console methods for E2E test debugging
  const originalConsole = { ...console }
  console.debug = vi.fn()
  console.info = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn((...args) => {
    // Still log errors in E2E tests for debugging
    originalConsole.error('[E2E Test Error]', ...args)
  })
  
  // Set up test environment flags
  process.env.NODE_ENV = 'test'
  process.env.VITE_E2E_TESTING = 'true'
  
  console.log('🧪 E2E Test Environment Initialized')
})

// Test setup for each test
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
  
  // Reset performance markers
  if (global.performance?.clearMarks) {
    global.performance.clearMarks()
    global.performance.clearMeasures()
  }
  
  // Clear any stored test data
  if (global.window?.electronAPI) {
    // Reset mock implementations to defaults if needed
    const electronAPI = global.window.electronAPI as any
    electronAPI.getBreadthHistory.mockResolvedValue([])
    electronAPI.getPlannedTrades.mockResolvedValue([])
    electronAPI.getOpenPositions.mockResolvedValue([])
  }
})

// Test cleanup after each test
afterEach(() => {
  // Force garbage collection if available (testing environment)
  if (global.gc) {
    global.gc()
  }
  
  // Clear any timers
  vi.clearAllTimers()
  
  // Reset DOM
  document.body.innerHTML = ''
})

// Global cleanup
afterAll(() => {
  // Restore console methods
  console.debug = console.debug
  console.info = console.info
  console.warn = console.warn
  console.error = console.error
  
  // Clean up global mocks
  vi.restoreAllMocks()
  
  console.log('🧹 E2E Test Environment Cleaned Up')
})

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Type declarations for enhanced testing
declare global {
  interface Window {
    electronAPI: ReturnType<typeof createEnhancedElectronAPI>
  }
  
  namespace NodeJS {
    interface Global {
      gc?: () => void
    }
  }
}

export { createEnhancedElectronAPI }