import { contextBridge, ipcRenderer } from 'electron'
import type { BreadthData, Trade, TradeFilters } from '../types/trading'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('tradingAPI', {
  // Market Breadth API
  getBreadthData: (startDate?: string, endDate?: string) => 
    ipcRenderer.invoke('trading:get-breadth-data', startDate, endDate),
  
  saveBreadthData: (data: BreadthData) => 
    ipcRenderer.invoke('trading:save-breadth-data', data),
  
  updateBreadthData: (id: number, data: Partial<BreadthData>) => 
    ipcRenderer.invoke('trading:update-breadth-data', id, data),
  
  deleteBreadthData: (id: number) => 
    ipcRenderer.invoke('trading:delete-breadth-data', id),

  // Trade Journaling API
  saveTrade: (trade: Trade) => 
    ipcRenderer.invoke('trading:save-trade', trade),
  
  getTrades: (filters?: TradeFilters) => 
    ipcRenderer.invoke('trading:get-trades', filters),
  
  updateTrade: (id: number, trade: Partial<Trade>) => 
    ipcRenderer.invoke('trading:update-trade', id, trade),
  
  deleteTrade: (id: number) => 
    ipcRenderer.invoke('trading:delete-trade', id),

  // Account Management API
  getAccountBalance: () => 
    ipcRenderer.invoke('trading:get-account-balance'),
  
  getPerformanceStats: (startDate?: string, endDate?: string) => 
    ipcRenderer.invoke('trading:get-performance-stats', startDate, endDate),

  // CSV Import/Export API
  importCSVBreadth: (csvData: string) => 
    ipcRenderer.invoke('trading:import-csv-breadth', csvData),
  
  exportCSVBreadth: (startDate?: string, endDate?: string) => 
    ipcRenderer.invoke('trading:export-csv-breadth', startDate, endDate),

  // Database Management API
  backupDatabase: () => 
    ipcRenderer.invoke('trading:backup-database'),
  
  getDatabaseInfo: () => 
    ipcRenderer.invoke('trading:get-database-info'),

  // Enhanced Breadth Calculator API - Calculation Methods
  calculateBreadthSingle: (request: any) => 
    ipcRenderer.invoke('breadth-calculator:calculate-single', request),
  
  calculateBreadthBulk: (request: any) => 
    ipcRenderer.invoke('breadth-calculator:calculate-bulk', request),
  
  calculateBreadthRealtime: (algorithm?: string) => 
    ipcRenderer.invoke('breadth-calculator:calculate-realtime', algorithm),
  
  calculateBreadthFromDatabase: (startDate?: string, endDate?: string, algorithm?: string) => 
    ipcRenderer.invoke('breadth-calculator:calculate-from-database', startDate, endDate, algorithm),

  // Algorithm Management
  getBreadthAlgorithms: () => 
    ipcRenderer.invoke('breadth-calculator:get-algorithms'),
  
  switchBreadthAlgorithm: (algorithm: string, customConfig?: any) => 
    ipcRenderer.invoke('breadth-calculator:switch-algorithm', algorithm, customConfig),
  
  getCurrentBreadthConfig: () => 
    ipcRenderer.invoke('breadth-calculator:get-current-config'),

  // Configuration Management
  createBreadthConfig: (request: any) => 
    ipcRenderer.invoke('breadth-calculator:create-config', request),
  
  getBreadthConfig: (version: string) => 
    ipcRenderer.invoke('breadth-calculator:get-config', version),
  
  listBreadthConfigs: (activeOnly: boolean = true) => 
    ipcRenderer.invoke('breadth-calculator:list-configs', activeOnly),
  
  updateBreadthConfig: (version: string, updates: any) => 
    ipcRenderer.invoke('breadth-calculator:update-config', version, updates),
  
  setDefaultBreadthConfig: (version: string) => 
    ipcRenderer.invoke('breadth-calculator:set-default-config', version),

  // Performance and Monitoring
  getBreadthPerformanceMetrics: () => 
    ipcRenderer.invoke('breadth-calculator:get-performance-metrics'),
  
  clearBreadthPerformanceMetrics: () => 
    ipcRenderer.invoke('breadth-calculator:clear-performance-metrics'),

  // Data Validation and Utilities
  validateBreadthData: (data: any) => 
    ipcRenderer.invoke('breadth-calculator:validate-data', data),
  
  exportBreadthConfigs: (versions?: string[]) => 
    ipcRenderer.invoke('breadth-calculator:export-configs', versions),
  
  importBreadthConfigs: (configsJson: string) => 
    ipcRenderer.invoke('breadth-calculator:import-configs', configsJson),
  
  breadthCalculatorHealthCheck: () => 
    ipcRenderer.invoke('breadth-calculator:health-check'),

  // Generic invoke method (for any additional custom calls)
  invoke: (channel: string, ...args: any[]) => 
    ipcRenderer.invoke(channel, ...args),

  // IB Integration API (future implementation)
  connectIB: () => 
    ipcRenderer.invoke('ib:connect'),
  
  placeOrder: (order: any) => 
    ipcRenderer.invoke('ib:place-order', order),
  
  getPositions: () => 
    ipcRenderer.invoke('ib:get-positions'),

  // Event listeners for real-time updates
  onBreadthUpdate: (callback: (data: BreadthData) => void) => {
    const subscription = (_event: any, data: BreadthData) => callback(data)
    ipcRenderer.on('breadth-data-updated', subscription)
    
    return () => {
      ipcRenderer.removeListener('breadth-data-updated', subscription)
    }
  },

  onTradeUpdate: (callback: (trade: Trade) => void) => {
    const subscription = (_event: any, trade: Trade) => callback(trade)
    ipcRenderer.on('trade-updated', subscription)
    
    return () => {
      ipcRenderer.removeListener('trade-updated', subscription)
    }
  },

  onWindowFocus: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on('window-focus', subscription)
    
    return () => {
      ipcRenderer.removeListener('window-focus', subscription)
    }
  }
})

// Expose versions
contextBridge.exposeInMainWorld('versions', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
  app: process.env.npm_package_version || '1.0.0'
})

// Expose platform info
contextBridge.exposeInMainWorld('platform', {
  os: process.platform,
  arch: process.arch
})