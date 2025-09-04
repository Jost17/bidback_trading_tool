/**
 * Application constants for consistent values across components
 */

// Breadth Score Thresholds
export const BREADTH_SCORE_THRESHOLDS = {
  BULLISH: 60,
  BEARISH: 40,
  EXTREMELY_BULLISH: 80,
  EXTREMELY_BEARISH: 20
} as const;

// Market Status Values
export const MARKET_STATUS = {
  BULLISH: 'bullish',
  BEARISH: 'bearish', 
  NEUTRAL: 'neutral'
} as const;

// Chart Time Ranges
export const TIME_RANGES = {
  ONE_WEEK: '1W',
  ONE_MONTH: '1M',
  THREE_MONTHS: '3M',
  ONE_YEAR: '1Y'
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? process.env.REACT_APP_API_URL || 'http://localhost:3001'
    : 'http://localhost:3001',
  MARKET_DATA: '/api/market-data',
  CURRENT_STATUS: '/api/current-status',
  BREADTH_SCORES: '/api/breadth-scores',
  YEARLY_SUMMARIES: '/api/yearly-summaries',
  STATS: '/api/stats',
  AVAILABLE_DATES: '/api/available-dates',
  CSV_IMPORT: '/api/csv-import',
  SCREENSHOT_EXTRACT: '/api/screenshot-extract'
} as const;

// Market Hours (Eastern Time)
export const MARKET_HOURS = {
  OPEN_HOUR: 9,
  OPEN_MINUTE: 30,
  CLOSE_HOUR: 16,
  CLOSE_MINUTE: 0,
  WEEKDAYS: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
} as const;

// Data Refresh Intervals
export const REFRESH_INTERVALS = {
  LIVE_DATA: 120000, // 2 minutes
  CHART_DATA: 300000, // 5 minutes
  STATUS_CHECK: 60000 // 1 minute
} as const;

// Chart Colors
export const CHART_COLORS = {
  BREADTH_SCORE: '#3B82F6', // Blue
  BULLISH: '#10B981', // Green
  BEARISH: '#EF4444', // Red
  NEUTRAL: '#6B7280', // Gray
  GRID: '#374151', // Dark gray
  TEXT: '#F9FAFB' // Light gray
} as const;

// Table Pagination
export const TABLE_DEFAULTS = {
  PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,
  INITIAL_PAGE: 1
} as const;

// File Upload Limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['text/csv', 'application/vnd.ms-excel'],
  MAX_IMAGE_SIZE: 5 * 1024 * 1024 // 5MB for screenshots
} as const;

// Theme Options
export const THEMES = {
  MODERN: 'modern',
  DARK: 'dark',
  MINIMAL: 'minimal'
} as const;

// Validation Rules
export const VALIDATION = {
  MIN_BREADTH_SCORE: 0,
  MAX_BREADTH_SCORE: 100,
  MIN_STOCK_COUNT: 0,
  MAX_STOCK_COUNT: 10000,
  DATE_FORMAT: 'YYYY-MM-DD'
} as const;

// Error Codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  API_ERROR: 'API_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT'
} as const;

// Status Colors for UI
export const STATUS_COLORS = {
  [MARKET_STATUS.BULLISH]: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    icon: 'text-green-600'
  },
  [MARKET_STATUS.BEARISH]: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: 'text-red-600'
  },
  [MARKET_STATUS.NEUTRAL]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: 'text-yellow-600'
  }
} as const;

export type BreadthScoreThreshold = typeof BREADTH_SCORE_THRESHOLDS[keyof typeof BREADTH_SCORE_THRESHOLDS];
export type MarketStatus = typeof MARKET_STATUS[keyof typeof MARKET_STATUS];
export type TimeRange = typeof TIME_RANGES[keyof typeof TIME_RANGES];
export type ThemeType = typeof THEMES[keyof typeof THEMES];
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];