import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock Electron APIs
global.window = global.window || {}
global.document = global.document || {}

// Mock the Electron IPC renderer
window.electronAPI = {
  // Mock database operations
  saveBreadthData: vi.fn().mockResolvedValue(1),
  getBreadthHistory: vi.fn().mockResolvedValue([]),
  updateBreadthData: vi.fn().mockResolvedValue(true),
  deleteBreadthData: vi.fn().mockResolvedValue(true),
  importBreadthCSV: vi.fn().mockResolvedValue({ success: true, imported: 0 }),
  exportBreadthCSV: vi.fn().mockResolvedValue({ success: true, data: '' }),
  
  // Mock file operations
  openFile: vi.fn().mockResolvedValue(null),
  saveFile: vi.fn().mockResolvedValue(null),
  showMessage: vi.fn().mockResolvedValue(0),
  
  // Mock app operations
  getAppVersion: vi.fn().mockReturnValue('1.0.0'),
  quit: vi.fn()
}

// Mock global performance if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: vi.fn().mockReturnValue(Date.now())
  } as any
}