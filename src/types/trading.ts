// Market Breadth Types
export interface BreadthData {
  id?: number
  date: string
  timestamp: string
  advancingIssues: number
  decliningIssues: number
  newHighs: number
  newLows: number
  upVolume: number
  downVolume: number
  breadthScore: number
  trendStrength?: number
  marketPhase?: string
  dataSource: 'manual' | 'imported' | 'api'
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface BreadthCalculation {
  breadthScore: number
  trendStrength: number
  marketPhase: string
}

// Trade Journaling Types
export interface Trade {
  id?: number
  tradeId: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  entryPrice: number
  exitPrice?: number
  entryDatetime: string
  exitDatetime?: string
  grossPnl?: number
  commission: number
  netPnl?: number
  positionSizePercent?: number
  riskAmount?: number
  stopLoss?: number
  targetPrice?: number
  accountType: 'CASH' | 'MARGIN'
  accountBalance: number
  setupType?: string
  strategy?: string
  tradeNotes?: string
  outcomeAnalysis?: string
  marketBreadthScore?: number
  spyPrice?: number
  vixLevel?: number
  createdAt?: string
  updatedAt?: string
}

export interface TradeFilters {
  symbol?: string
  startDate?: string
  endDate?: string
  strategy?: string
  minPnl?: number
  maxPnl?: number
  side?: 'BUY' | 'SELL'
  accountType?: 'CASH' | 'MARGIN'
}

// Account Management Types
export interface AccountSnapshot {
  id?: number
  date: string
  accountBalance: number
  cashBalance: number
  marginUsed: number
  buyingPower: number
  dayPnl: number
  totalPnl: number
  createdAt?: string
}

export interface PerformanceStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalPnl: number
  avgWin: number
  avgLoss: number
  largestWin: number
  largestLoss: number
  profitFactor: number
  sharpeRatio?: number
  maxDrawdown: number
  currentBalance: number
}

// Market Indices Types
export interface MarketIndex {
  id?: number
  date: string
  symbol: string
  price: number
  changePercent?: number
  volume?: number
  ma20?: number
  ma50?: number
  ma200?: number
  rsi?: number
  createdAt?: string
}

// Interactive Brokers Types
export interface IBOrder {
  symbol: string
  action: 'BUY' | 'SELL'
  quantity: number
  orderType: 'MKT' | 'LMT' | 'STP'
  limitPrice?: number
  stopPrice?: number
  timeInForce?: 'DAY' | 'GTC' | 'IOC' | 'FOK'
}

export interface IBPosition {
  symbol: string
  position: number
  avgCost: number
  marketPrice: number
  marketValue: number
  unrealizedPNL: number
  realizedPNL?: number
}

export interface IBConnection {
  connected: boolean
  account?: string
  serverVersion?: number
  connectionTime?: string
}

// CSV Import/Export Types
export interface CSVImportResult {
  success: boolean
  importedCount: number
  skippedCount: number
  errorCount: number
  errors?: string[]
  duplicates?: string[]
}

export interface CSVExportResult {
  success: boolean
  data: string
  filename: string
  recordCount: number
}

// Database Types
export interface DatabaseInfo {
  version: string
  size: number
  tables: string[]
  lastBackup?: string
  recordCounts: Record<string, number>
}

export interface BackupResult {
  success: boolean
  filename: string
  path: string
  size: number
  timestamp: string
}

// UI Component Types
export interface ChartDataPoint {
  date: string
  breadthScore: number
  trendStrength?: number
  volume?: number
  [key: string]: any
}

export interface TableColumn<T = any> {
  key: keyof T
  label: string
  sortable?: boolean
  formatter?: (value: any) => string
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'date' | 'datetime-local'
  required?: boolean
  options?: Array<{ value: string | number; label: string }>
  placeholder?: string
  min?: number
  max?: number
  step?: number
  validation?: any // Zod schema
}

// Global Window Interface Extension
declare global {
  interface Window {
    tradingAPI: {
      // Market Breadth API
      getBreadthData: (startDate?: string, endDate?: string) => Promise<BreadthData[]>
      saveBreadthData: (data: BreadthData) => Promise<number>
      updateBreadthData: (id: number, data: Partial<BreadthData>) => Promise<boolean>
      deleteBreadthData: (id: number) => Promise<boolean>
      
      // Trade Journaling API
      saveTrade: (trade: Trade) => Promise<number>
      getTrades: (filters?: TradeFilters) => Promise<Trade[]>
      updateTrade: (id: number, trade: Partial<Trade>) => Promise<boolean>
      deleteTrade: (id: number) => Promise<boolean>
      
      // Account Management API
      getAccountBalance: () => Promise<number>
      getPerformanceStats: (startDate?: string, endDate?: string) => Promise<PerformanceStats>
      
      // CSV Import/Export API
      importCSVBreadth: (csvData: string) => Promise<CSVImportResult>
      exportCSVBreadth: (startDate?: string, endDate?: string) => Promise<CSVExportResult>
      
      // Database Management API
      backupDatabase: () => Promise<BackupResult>
      getDatabaseInfo: () => Promise<DatabaseInfo>
      
      // IB Integration API
      connectIB: () => Promise<IBConnection>
      placeOrder: (order: IBOrder) => Promise<any>
      getPositions: () => Promise<IBPosition[]>
      
      // Event listeners
      onBreadthUpdate: (callback: (data: BreadthData) => void) => () => void
      onTradeUpdate: (callback: (trade: Trade) => void) => () => void
      onWindowFocus: (callback: () => void) => () => void
    }
    
    versions: {
      node: string
      chrome: string
      electron: string
      app: string
    }
    
    platform: {
      os: string
      arch: string
    }
  }
}