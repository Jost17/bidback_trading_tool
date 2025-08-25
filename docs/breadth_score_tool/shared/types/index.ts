/**
 * Shared TypeScript Type Definitions
 * Common interfaces and types used across frontend and backend
 */

// Core Market Data Interface
export interface MarketData {
  id?: number;
  date: string;
  
  // Primary Breadth Indicators
  stocks_up_4pct?: number | null;
  stocks_down_4pct?: number | null;
  ratio_5day?: number | null;
  ratio_10day?: number | null;
  stocks_up_25pct_quarter?: number | null;
  stocks_down_25pct_quarter?: number | null;
  
  // Secondary Breadth Indicators
  stocks_up_25pct_month?: number | null;
  stocks_down_25pct_month?: number | null;
  stocks_up_50pct_month?: number | null;
  stocks_down_50pct_month?: number | null;
  stocks_up_13pct_34days?: number | null;
  stocks_down_13pct_34days?: number | null;
  
  // Reference Data
  worden_universe?: number | null;
  t2108?: number | null;
  sp500?: string | null;
  
  // Sector Data
  basic_materials_sector?: number | null;
  consumer_cyclical_sector?: number | null;
  financial_services_sector?: number | null;
  real_estate_sector?: number | null;
  consumer_defensive_sector?: number | null;
  healthcare_sector?: number | null;
  utilities_sector?: number | null;
  communication_services_sector?: number | null;
  energy_sector?: number | null;
  industrials_sector?: number | null;
  technology_sector?: number | null;
  
  // Legacy Fields
  stocks_up_20pct?: number | null;
  stocks_down_20pct?: number | null;
  stocks_up_20dollar?: number | null;
  stocks_down_20dollar?: number | null;
  
  // Calculated Fields
  breadth_score?: number | null;
  breadth_score_normalized?: number | null;
  
  // Metadata
  source_file?: string | null;
  import_format?: string | null;
  data_quality_score?: number | null;
  created_at?: string;
  updated_at?: string;
}

// Market Data Input for Forms
export interface MarketDataInput {
  date: string;
  stocks_up_4pct: string;
  stocks_down_4pct: string;
  stocks_up_25pct_quarter: string;
  stocks_down_25pct_quarter: string;
  stocks_up_25pct_month: string;
  stocks_down_25pct_month: string;
  stocks_up_50pct_month: string;
  stocks_down_50pct_month: string;
  stocks_up_13pct_34days: string;
  stocks_down_13pct_34days: string;
  worden_universe: string;
  sp500: string;
  t2108: string;
  basic_materials_sector: string;
  consumer_cyclical_sector: string;
  financial_services_sector: string;
  real_estate_sector: string;
  consumer_defensive_sector: string;
  healthcare_sector: string;
  utilities_sector: string;
  communication_services_sector: string;
  energy_sector: string;
  industrials_sector: string;
  technology_sector: string;
}

// OCR Extracted Data
export interface ExtractedData {
  mm_4_bullish?: number;
  mm_4_bearish?: number;
  mm_25_up_quarter?: number;
  mm_25_down_quarter?: number;
  mm_25_up_month?: number;
  mm_25_down_month?: number;
  mm_50_up_month?: number;
  mm_50_down_month?: number;
  mm_up13_in34days?: number;
  mm_down13_in34days?: number;
  us_common_stocks?: number;
  sp500?: number;
  t2108?: number;
  basic_materials_sector?: number;
  consumer_cyclical_sector?: number;
  financial_services_sector?: number;
  real_estate_sector?: number;
  consumer_defensive_sector?: number;
  healthcare_sector?: number;
  utilities_sector?: number;
  communication_services_sector?: number;
  energy_sector?: number;
  industrials_sector?: number;
  technology_sector?: number;
}

// Screenshot Types
export type ScreenshotType = 'market_monitor' | 't2108';

// OCR Processing Result
export interface OCRResult {
  success: boolean;
  data: ExtractedData;
  metadata: {
    confidence: number;
    extractedFields: number;
    totalFields: number;
    processingTime: number;
    fileType?: ScreenshotType;
    extractedText?: string;
  };
  error?: string;
}

// API Response Interfaces
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string[];
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Validation Interfaces
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Query Interfaces
export interface MarketDataQuery {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: keyof MarketData;
  sortOrder?: 'ASC' | 'DESC';
  includeNullBreadthScore?: boolean;
}

// Field Metadata
export interface FieldMetadata {
  key: keyof MarketData;
  label: string;
  type: 'date' | 'number' | 'text';
  required?: boolean;
  min?: number;
  max?: number;
  group?: string;
}

// Table Configuration
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  format?: (value: any) => string;
  className?: string;
  width?: string;
}

export interface TableConfig<T = any> {
  columns: TableColumn<T>[];
  sortable?: boolean;
  paginated?: boolean;
  searchable?: boolean;
  exportable?: boolean;
}

// Chart Data Interfaces
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area';
}

// Theme and Styling
export interface ThemeColors {
  bullish: string;
  bearish: string;
  neutral: string;
  background: string;
  text: string;
  border: string;
  accent: string;
}

export interface MarketCondition {
  type: 'bullish' | 'bearish' | 'neutral';
  strength: 'weak' | 'moderate' | 'strong' | 'extreme';
  score: number;
  description: string;
}

// File Upload Interfaces
export interface FileUploadConfig {
  maxSize: number;
  allowedTypes: string[];
  multiple?: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResult {
  success: boolean;
  filename?: string;
  size?: number;
  error?: string;
}

// CSV Import Interfaces
export interface CSVImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
  columnMapping: string[];
  message: string;
}

export interface CSVFieldMapping {
  csvField: string;
  dbField: keyof MarketData;
  required: boolean;
  dataType: 'string' | 'number' | 'date';
}

// Database Service Interfaces
export interface DatabaseConnection {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number }>;
  transaction<T>(callback: () => Promise<T>): Promise<T>;
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

// Error Types
export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR' 
  | 'FILE_UPLOAD_ERROR'
  | 'OCR_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export interface AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: any;
}

// Configuration Interfaces
export interface AppConfig {
  env: 'development' | 'staging' | 'production';
  api: {
    baseUrl: string;
    timeout: number;
  };
  database: {
    path: string;
    backupDir: string;
  };
  upload: {
    maxSize: number;
    allowedTypes: string[];
    tempDir: string;
  };
  ocr: {
    timeout: number;
    minConfidence: number;
    maxRetries: number;
  };
}

// Breadth Score Calculation
export interface BreadthCalculation {
  score: number;
  normalizedScore: number;
  condition: MarketCondition;
  components: {
    primary: number;
    secondary: number;
    sectors: number;
  };
  confidence: number;
}

// Component Props Interfaces
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface DataTableProps<T = MarketData> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string;
  onSort?: (column: keyof T, direction: 'ASC' | 'DESC') => void;
  onFilter?: (filters: Partial<T>) => void;
  onSelect?: (items: T[]) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export interface FormFieldProps extends BaseComponentProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea';
  value: any;
  onChange: (value: any) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: Array<{ value: any; label: string }>;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Export all types as a namespace as well
export namespace Types {
  export type MarketData = MarketData;
  export type MarketDataInput = MarketDataInput;
  export type ExtractedData = ExtractedData;
  export type ScreenshotType = ScreenshotType;
  export type OCRResult = OCRResult;
  export type APIResponse<T> = APIResponse<T>;
  export type ValidationResult = ValidationResult;
  export type MarketCondition = MarketCondition;
  export type ErrorCode = ErrorCode;
  export type AppError = AppError;
}

export default Types;