// Enhanced Market Breadth Types - Integrated from breadth_score_tool
export interface BreadthData {
  id?: number
  date: string
  timestamp: string
  
  // Legacy fields (maintaining compatibility)
  advancingIssues: number
  decliningIssues: number
  newHighs: number
  newLows: number
  upVolume: number
  downVolume: number
  breadthScore: number
  trendStrength?: number
  marketPhase?: string
  
  // Enhanced fields from breadth_score_tool integration
  stocks_up_4pct?: number | null
  stocks_down_4pct?: number | null
  ratio_5day?: number | null
  ratio_10day?: number | null
  stocks_up_25pct_quarter?: number | null
  stocks_down_25pct_quarter?: number | null
  stocks_up_25pct_month?: number | null
  stocks_down_25pct_month?: number | null
  stocks_up_50pct_month?: number | null
  stocks_down_50pct_month?: number | null
  stocks_up_13pct_34days?: number | null
  stocks_down_13pct_34days?: number | null
  
  // Reference Data
  worden_universe?: number | null
  t2108?: number | null
  sp500?: string | null
  
  // Sector Data
  basic_materials_sector?: number | null
  consumer_cyclical_sector?: number | null
  financial_services_sector?: number | null
  real_estate_sector?: number | null
  consumer_defensive_sector?: number | null
  healthcare_sector?: number | null
  utilities_sector?: number | null
  communication_services_sector?: number | null
  energy_sector?: number | null
  industrials_sector?: number | null
  technology_sector?: number | null
  
  // Legacy compatibility fields
  stocks_up_20pct?: number | null
  stocks_down_20pct?: number | null
  stocks_up_20dollar?: number | null
  stocks_down_20dollar?: number | null
  
  // Calculated fields (real-time only, not stored)
  breadth_score_normalized?: number | null
  
  // Metadata
  dataSource: 'manual' | 'imported' | 'api'
  source_file?: string | null
  import_format?: string | null
  data_quality_score?: number | null
  notes?: string
  createdAt?: string
  updatedAt?: string
}

// Market Data Input for Forms (integrated from breadth_score_tool)
export interface MarketDataInput {
  date: string
  stocks_up_4pct: string
  stocks_down_4pct: string
  stocks_up_25pct_quarter: string
  stocks_down_25pct_quarter: string
  stocks_up_25pct_month: string
  stocks_down_25pct_month: string
  stocks_up_50pct_month: string
  stocks_down_50pct_month: string
  stocks_up_13pct_34days: string
  stocks_down_13pct_34days: string
  ratio_5day: string
  ratio_10day: string
  t2108: string
  worden_t2108: string
  sp_reference: string
  stocks_up_20pct: string
  stocks_down_20pct: string
  stocks_up_20dollar: string
  stocks_down_20dollar: string
  // Legacy fields for compatibility
  worden_universe?: string
  sp500?: string
}

// OCR Extracted Data (from breadth_score_tool)
export interface ExtractedData {
  mm_4_bullish?: number
  mm_4_bearish?: number
  mm_25_up_quarter?: number
  mm_25_down_quarter?: number
  mm_25_up_month?: number
  mm_25_down_month?: number
  mm_50_up_month?: number
  mm_50_down_month?: number
  mm_up13_in34days?: number
  mm_down13_in34days?: number
  us_common_stocks?: number
  sp500?: number
  t2108?: number
  basic_materials_sector?: number
  consumer_cyclical_sector?: number
  financial_services_sector?: number
  real_estate_sector?: number
  consumer_defensive_sector?: number
  healthcare_sector?: number
  utilities_sector?: number
  communication_services_sector?: number
  energy_sector?: number
  industrials_sector?: number
  technology_sector?: number
}

// Screenshot Types
export type ScreenshotType = 'market_monitor' | 't2108'

// OCR Processing Result
export interface OCRResult {
  success: boolean
  data: ExtractedData
  metadata: {
    confidence: number
    extractedFields: number
    totalFields: number
    processingTime: number
    fileType?: ScreenshotType
    extractedText?: string
  }
  error?: string
}

export interface BreadthCalculation {
  breadthScore: number
  trendStrength: number
  marketPhase: string
}

// Enhanced Market Condition interface (integrated)
export interface MarketCondition {
  type: 'bullish' | 'bearish' | 'neutral'
  strength: 'weak' | 'moderate' | 'strong' | 'extreme'
  score: number
  description: string
}

// Enhanced Breadth Result (from new calculator system)
export interface EnhancedBreadthResult {
  date: string
  score: number
  normalizedScore: number
  confidence: number
  components: {
    primary_score: number
    secondary_score: number
    reference_score: number
    sector_score: number
  }
  market_condition: {
    phase: 'BULL' | 'BEAR' | 'NEUTRAL' | 'TRANSITION'
    strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME'
    trend_direction: 'UP' | 'DOWN' | 'SIDEWAYS'
    confidence_level: number
  }
  metadata: {
    algorithm_used: string
    config_version: string
    calculation_time: number
    data_quality: number
    missing_indicators: string[]
    warnings?: string[]
  }
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

// CSV Import/Export Types (Enhanced from breadth_score_tool)
export interface CSVImportResult {
  success: boolean
  imported: number
  importedCount: number  // Legacy compatibility
  skipped: number
  skippedCount: number   // Legacy compatibility
  errors: number
  errorCount: number     // Legacy compatibility
  errorDetails: string[]
  columnMapping: string[]
  message: string
  duplicates?: string[]  // Legacy compatibility
}

export interface CSVFieldMapping {
  csvField: string
  dbField: keyof BreadthData
  required: boolean
  dataType: 'string' | 'number' | 'date'
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

// Enhanced UI Component Types (Integrated from breadth_score_tool)
export interface ChartDataPoint {
  date: string
  value: number
  breadthScore?: number  // Legacy compatibility (optional)
  trendStrength?: number
  volume?: number
  label?: string
  [key: string]: any
}

export interface ChartSeries {
  name: string
  data: ChartDataPoint[]
  color?: string
  type?: 'line' | 'bar' | 'area'
}

export interface TableColumn<T = any> {
  key: keyof T
  label: string
  sortable?: boolean
  format?: (value: any) => string  // Enhanced from breadth_score_tool
  formatter?: (value: any) => string  // Legacy compatibility
  className?: string
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface TableConfig<T = any> {
  columns: TableColumn<T>[]
  sortable?: boolean
  paginated?: boolean
  searchable?: boolean
  exportable?: boolean
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

// Enhanced Form Field Props (from breadth_score_tool)
export interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea'
  value: any
  onChange: (value: any) => void
  error?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  options?: Array<{ value: any; label: string }>
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

// Field Metadata (from breadth_score_tool)
export interface FieldMetadata {
  key: keyof BreadthData
  label: string
  type: 'date' | 'number' | 'text'
  required?: boolean
  min?: number
  max?: number
  group?: string
}

// Enhanced API Response Interfaces (from breadth_score_tool)
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  details?: string[]
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

// Validation Interfaces (from breadth_score_tool)
export interface ValidationError {
  field: string
  message: string
  code?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// Enhanced Query Interfaces (from breadth_score_tool)
export interface MarketDataQuery {
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
  sortBy?: keyof BreadthData
  sortOrder?: 'ASC' | 'DESC'
  includeNullBreadthScore?: boolean
}

// File Upload Interfaces (from breadth_score_tool)
export interface FileUploadConfig {
  maxSize: number
  allowedTypes: string[]
  multiple?: boolean
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface FileUploadResult {
  success: boolean
  filename?: string
  size?: number
  error?: string
}

// Database Service Interfaces (from breadth_score_tool)
export interface DatabaseConnection {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number }>
  transaction<T>(callback: () => Promise<T>): Promise<T>
}

export interface ServiceResult<T = any> {
  success: boolean
  data?: T
  error?: string
  metadata?: Record<string, any>
}

// Enhanced Error Types (from breadth_score_tool)
export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR' 
  | 'FILE_UPLOAD_ERROR'
  | 'OCR_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'

export interface AppError extends Error {
  code: ErrorCode
  statusCode: number
  details?: any
}

// Configuration Interfaces (from breadth_score_tool)
export interface AppConfig {
  env: 'development' | 'staging' | 'production'
  api: {
    baseUrl: string
    timeout: number
  }
  database: {
    path: string
    backupDir: string
  }
  upload: {
    maxSize: number
    allowedTypes: string[]
    tempDir: string
  }
  ocr: {
    timeout: number
    minConfidence: number
    maxRetries: number
  }
}

// Theme and Styling (from breadth_score_tool)
export interface ThemeColors {
  bullish: string
  bearish: string
  neutral: string
  background: string
  text: string
  border: string
  accent: string
}

// Enhanced Component Props (from breadth_score_tool)
export interface BaseComponentProps {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

export interface DataTableProps<T = BreadthData> extends BaseComponentProps {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  error?: string
  onSort?: (column: keyof T, direction: 'ASC' | 'DESC') => void
  onFilter?: (filters: Partial<T>) => void
  onSelect?: (items: T[]) => void
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
}

// Utility Types (from breadth_score_tool)
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Global Window Interface Extension
declare global {
  interface Window {
    tradingAPI: {
      // Market Breadth API (Legacy)
      getBreadthData: (startDate?: string, endDate?: string) => Promise<BreadthData[]>
      saveBreadthData: (data: BreadthData) => Promise<number>
      updateBreadthData: (id: number, data: Partial<BreadthData>) => Promise<boolean>
      deleteBreadthData: (id: number) => Promise<boolean>
      
      // Enhanced Breadth Calculator API - Calculation Methods
      calculateBreadthSingle: (request: any) => Promise<any>
      calculateBreadthBulk: (request: any) => Promise<any>
      calculateBreadthRealtime: (algorithm?: string) => Promise<any>
      calculateBreadthFromDatabase: (startDate?: string, endDate?: string, algorithm?: string) => Promise<any[]>
      
      // Algorithm Management
      getBreadthAlgorithms: () => Promise<any[]>
      switchBreadthAlgorithm: (algorithm: string, customConfig?: any) => Promise<any>
      getCurrentBreadthConfig: () => Promise<any>
      
      // Configuration Management
      createBreadthConfig: (request: any) => Promise<any>
      getBreadthConfig: (version: string) => Promise<any>
      listBreadthConfigs: (activeOnly?: boolean) => Promise<any[]>
      updateBreadthConfig: (version: string, updates: any) => Promise<any>
      setDefaultBreadthConfig: (version: string) => Promise<void>
      
      // Performance and Monitoring
      getBreadthPerformanceMetrics: () => Promise<any>
      clearBreadthPerformanceMetrics: () => Promise<void>
      
      // Data Validation and Utilities
      validateBreadthData: (data: any) => Promise<any>
      exportBreadthConfigs: (versions?: string[]) => Promise<string>
      importBreadthConfigs: (configsJson: string) => Promise<any>
      breadthCalculatorHealthCheck: () => Promise<any>
      
      // Generic invoke method (for any additional custom calls)
      invoke: (channel: string, ...args: any[]) => Promise<any>
      
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

// Export all types as a namespace (from breadth_score_tool compatibility)
export namespace BreadthToolTypes {
  export type MarketData = BreadthData
  export type MarketDataInputForm = MarketDataInput
  export type ExtractedOCRData = ExtractedData
  export type ImageType = ScreenshotType
  export type OCRProcessResult = OCRResult
  export type Response<T> = APIResponse<T>
  export type Validation = ValidationResult
  export type Market = MarketCondition
  export type Error = ErrorCode
  export type AppErr = AppError
  export type CSVImport = CSVImportResult
  export type ChartData = ChartDataPoint
  export type Chart = ChartSeries
  export type Column<T> = TableColumn<T>
  export type Config<T> = TableConfig<T>
  export type FormProps = FormFieldProps
  export type Field = FieldMetadata
  export type Colors = ThemeColors
  export type Props = BaseComponentProps
  export type TableProps<T> = DataTableProps<T>
  export type Partial<T> = DeepPartial<T>
  export type Required<T, K extends keyof T> = RequiredFields<T, K>
  export type Opt<T, K extends keyof T> = Optional<T, K>
}

export default BreadthToolTypes