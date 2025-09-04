// Core Market Data interface - matches database schema
export interface MarketData {
  id?: number;
  date: string;
  stocks_up_4pct: number | null;
  stocks_down_4pct: number | null;
  stocks_up_20pct: number | null;          // Manual entry
  stocks_down_20pct: number | null;        // Manual entry
  stocks_up_20dollar: number | null;       // Manual entry
  stocks_down_20dollar: number | null;     // Manual entry
  ratio_5day: number | null;               // Auto-calculated
  ratio_10day: number | null;              // Auto-calculated
  ratio_25day: number | null;              // Auto-calculated
  ratio_50day: number | null;              // Auto-calculated
  ratio_100day: number | null;             // Auto-calculated
  ratio_200day: number | null;             // Auto-calculated
  stocks_up_25pct_quarter: number | null;
  stocks_down_25pct_quarter: number | null;
  stocks_up_25pct_month: number | null;
  stocks_down_25pct_month: number | null;
  stocks_up_50pct_month: number | null;
  stocks_down_50pct_month: number | null;
  stocks_up_13pct_34days: number | null;
  stocks_down_13pct_34days: number | null;
  worden_universe: number | null;
  t2108: number | null;                    // 0-100
  sp500: number | null;                    // Numeric value, not string
  breadth_score: number | null;            // Auto-calculated
  breadth_score_normalized: number | null; // Auto-calculated
  source_file?: string;
  import_format?: string;
  data_quality_score?: number;
  created_at?: string;
  updated_at?: string;
}

// Frontend-formatted version with camelCase fields
export interface FormattedMarketData extends Omit<MarketData, 'breadth_score'> {
  breadthScore?: number; // Camel case version for frontend consistency
}

// Input types for forms and API requests
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
  stocks_up_20pct?: string;
  stocks_down_20pct?: string;
  stocks_up_20dollar?: string;
  stocks_down_20dollar?: string;
}

// API filter parameters
export interface MarketDataFilters {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: keyof MarketData;
  sortOrder?: 'ASC' | 'DESC';
  includeNullBreadthScore?: boolean;
}

// Market status types
export type MarketStatus = 'bullish' | 'bearish' | 'neutral';
export type TrendDirection = 'up' | 'down' | 'stable';
export type ActivityLevel = 'High' | 'Medium' | 'Low';
export type TimeRange = '1W' | '1M' | '3M' | '1Y';
export type ThemeType = 'modern' | 'dark' | 'minimal';

// Enhanced API Response types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    timestamp: string;
    [key: string]: any;
  };
  pagination?: PaginationInfo;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
    timestamp: string;
    validation?: ValidationError[];
    details?: any;
  };
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface UploadResponse {
  success: boolean;
  imported: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
  columnMapping: string[];
  message: string;
}

// Dashboard and component types
export interface BreadthScoreData {
  score: number;
  status: MarketStatus;
  lastUpdated: string;
  trend: TrendDirection;
  change: number;
}

export interface MarketPulse {
  bullsPercent: number;
  bearsPercent: number;
  t2108: number;
  activity: ActivityLevel;
  totalMovers: number;
}

export interface ChartData {
  labels: string[];
  data: number[];
}

// Hook return types
export interface MarketDataHook {
  data: MarketData[];
  currentStatus: BreadthScoreData | null;
  loading: 'idle' | 'loading' | 'error';
  error: string | null;
  fetchData: (limit?: number) => Promise<void>;
  refreshData: () => Promise<void>;
  getMarketStatus: () => MarketStatus;
  getBreadthStatus: (score?: number) => MarketStatus;
  isMarketOpen: () => boolean;
}

export interface ChartDataHook {
  chartData: ChartData | null;
  loading: boolean;
  error: string | null;
  fetchChartData: (timeRange: TimeRange) => Promise<void>;
}

// OCR and Screenshot types
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
}

export interface OCRResponse {
  success: boolean;
  data: {
    data: ExtractedData;
    metadata: {
      confidence: number;
      extractedFields: number;
      totalFields: number;
      processingTime: number;
    };
  };
  message: string;
}

// Component prop types
export interface DashboardTheme {
  name: string;
  containerClass: string;
  cardClass: string;
  textPrimary: string;
  textSecondary: string;
  buttonClass: string;
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  status?: MarketStatus;
  theme: DashboardTheme;
}

// Table and data management types
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  format?: (value: any) => string;
  className?: string;
}

export interface TableSort {
  column: string;
  direction: 'ASC' | 'DESC';
}

// Performance monitoring types
export interface PerformanceMetrics {
  apiCalls: number;
  avgResponseTime: number;
  cacheHits: number;
  totalRenderTime: number;
  lastUpdate: string;
}
