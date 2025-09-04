/**
 * Application Constants and Configuration
 * Centralized configuration for field mappings, thresholds, and application settings
 */

// Market Data Field Definitions
export const MARKET_DATA_FIELDS = {
  // Primary Fields
  PRIMARY: {
    DATE: 'date',
    STOCKS_UP_4PCT: 'stocks_up_4pct',
    STOCKS_DOWN_4PCT: 'stocks_down_4pct',
    STOCKS_UP_25PCT_QUARTER: 'stocks_up_25pct_quarter',
    STOCKS_DOWN_25PCT_QUARTER: 'stocks_down_25pct_quarter',
    RATIO_5DAY: 'ratio_5day',
    RATIO_10DAY: 'ratio_10day'
  },
  
  // Secondary Fields
  SECONDARY: {
    STOCKS_UP_25PCT_MONTH: 'stocks_up_25pct_month',
    STOCKS_DOWN_25PCT_MONTH: 'stocks_down_25pct_month',
    STOCKS_UP_50PCT_MONTH: 'stocks_up_50pct_month',
    STOCKS_DOWN_50PCT_MONTH: 'stocks_down_50pct_month',
    STOCKS_UP_13PCT_34DAYS: 'stocks_up_13pct_34days',
    STOCKS_DOWN_13PCT_34DAYS: 'stocks_down_13pct_34days'
  },
  
  // Reference Fields
  REFERENCE: {
    WORDEN_UNIVERSE: 'worden_universe',
    T2108: 't2108',
    SP500: 'sp500'
  },
  
  // Sector Fields
  SECTORS: {
    BASIC_MATERIALS: 'basic_materials_sector',
    CONSUMER_CYCLICAL: 'consumer_cyclical_sector',
    FINANCIAL_SERVICES: 'financial_services_sector',
    REAL_ESTATE: 'real_estate_sector',
    CONSUMER_DEFENSIVE: 'consumer_defensive_sector',
    HEALTHCARE: 'healthcare_sector',
    UTILITIES: 'utilities_sector',
    COMMUNICATION_SERVICES: 'communication_services_sector',
    ENERGY: 'energy_sector',
    INDUSTRIALS: 'industrials_sector',
    TECHNOLOGY: 'technology_sector'
  },
  
  // Legacy Fields
  LEGACY: {
    STOCKS_UP_20PCT: 'stocks_up_20pct',
    STOCKS_DOWN_20PCT: 'stocks_down_20pct',
    STOCKS_UP_20DOLLAR: 'stocks_up_20dollar',
    STOCKS_DOWN_20DOLLAR: 'stocks_down_20dollar'
  },
  
  // Metadata Fields
  METADATA: {
    SOURCE_FILE: 'source_file',
    IMPORT_FORMAT: 'import_format',
    DATA_QUALITY_SCORE: 'data_quality_score',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  }
};

// Get all field names as flat array
export const ALL_FIELD_NAMES = Object.values(MARKET_DATA_FIELDS).flatMap(group => 
  typeof group === 'object' ? Object.values(group) : [group]
);

// Numeric fields for validation
export const NUMERIC_FIELDS = [
  ...Object.values(MARKET_DATA_FIELDS.PRIMARY).filter(f => f !== 'date'),
  ...Object.values(MARKET_DATA_FIELDS.SECONDARY),
  ...Object.values(MARKET_DATA_FIELDS.REFERENCE).filter(f => f !== 'sp500'),
  ...Object.values(MARKET_DATA_FIELDS.SECTORS),
  ...Object.values(MARKET_DATA_FIELDS.LEGACY)
];

// Field Labels for UI Display
export const FIELD_LABELS = {
  // Primary Breadth Indicators
  [MARKET_DATA_FIELDS.PRIMARY.DATE]: 'Date',
  [MARKET_DATA_FIELDS.PRIMARY.STOCKS_UP_4PCT]: '4% Bullish',
  [MARKET_DATA_FIELDS.PRIMARY.STOCKS_DOWN_4PCT]: '4% Bearish',
  [MARKET_DATA_FIELDS.PRIMARY.STOCKS_UP_25PCT_QUARTER]: '25% Up (Quarter)',
  [MARKET_DATA_FIELDS.PRIMARY.STOCKS_DOWN_25PCT_QUARTER]: '25% Down (Quarter)',
  [MARKET_DATA_FIELDS.PRIMARY.RATIO_5DAY]: '5-Day Ratio',
  [MARKET_DATA_FIELDS.PRIMARY.RATIO_10DAY]: '10-Day Ratio',
  
  // Secondary Breadth Indicators
  [MARKET_DATA_FIELDS.SECONDARY.STOCKS_UP_25PCT_MONTH]: '25% Up (Month)',
  [MARKET_DATA_FIELDS.SECONDARY.STOCKS_DOWN_25PCT_MONTH]: '25% Down (Month)',
  [MARKET_DATA_FIELDS.SECONDARY.STOCKS_UP_50PCT_MONTH]: '50% Up (Month)',
  [MARKET_DATA_FIELDS.SECONDARY.STOCKS_DOWN_50PCT_MONTH]: '50% Down (Month)',
  [MARKET_DATA_FIELDS.SECONDARY.STOCKS_UP_13PCT_34DAYS]: '13% Up (34 days)',
  [MARKET_DATA_FIELDS.SECONDARY.STOCKS_DOWN_13PCT_34DAYS]: '13% Down (34 days)',
  
  // Reference Data
  [MARKET_DATA_FIELDS.REFERENCE.WORDEN_UNIVERSE]: 'US Common Stocks',
  [MARKET_DATA_FIELDS.REFERENCE.T2108]: 'T2108',
  [MARKET_DATA_FIELDS.REFERENCE.SP500]: 'S&P 500',
  
  // Sector Data
  [MARKET_DATA_FIELDS.SECTORS.BASIC_MATERIALS]: 'Basic Materials Sector',
  [MARKET_DATA_FIELDS.SECTORS.CONSUMER_CYCLICAL]: 'Consumer Cyclical Sector',
  [MARKET_DATA_FIELDS.SECTORS.FINANCIAL_SERVICES]: 'Financial Services Sector',
  [MARKET_DATA_FIELDS.SECTORS.REAL_ESTATE]: 'Real Estate Sector',
  [MARKET_DATA_FIELDS.SECTORS.CONSUMER_DEFENSIVE]: 'Consumer Defensive Sector',
  [MARKET_DATA_FIELDS.SECTORS.HEALTHCARE]: 'Healthcare Sector',
  [MARKET_DATA_FIELDS.SECTORS.UTILITIES]: 'Utilities Sector',
  [MARKET_DATA_FIELDS.SECTORS.COMMUNICATION_SERVICES]: 'Communication Services Sector',
  [MARKET_DATA_FIELDS.SECTORS.ENERGY]: 'Energy Sector',
  [MARKET_DATA_FIELDS.SECTORS.INDUSTRIALS]: 'Industrials Sector',
  [MARKET_DATA_FIELDS.SECTORS.TECHNOLOGY]: 'Technology Sector'
};

// Field Groups for UI Organization
export const FIELD_GROUPS = {
  PRIMARY_BREADTH: {
    title: 'Primary Breadth Indicators',
    fields: [
      MARKET_DATA_FIELDS.PRIMARY.DATE,
      MARKET_DATA_FIELDS.PRIMARY.STOCKS_UP_4PCT,
      MARKET_DATA_FIELDS.PRIMARY.STOCKS_DOWN_4PCT,
      MARKET_DATA_FIELDS.PRIMARY.STOCKS_UP_25PCT_QUARTER,
      MARKET_DATA_FIELDS.PRIMARY.STOCKS_DOWN_25PCT_QUARTER
    ]
  },
  SECONDARY_BREADTH: {
    title: 'Secondary Breadth Indicators',
    fields: [
      MARKET_DATA_FIELDS.SECONDARY.STOCKS_UP_25PCT_MONTH,
      MARKET_DATA_FIELDS.SECONDARY.STOCKS_DOWN_25PCT_MONTH,
      MARKET_DATA_FIELDS.SECONDARY.STOCKS_UP_50PCT_MONTH,
      MARKET_DATA_FIELDS.SECONDARY.STOCKS_DOWN_50PCT_MONTH,
      MARKET_DATA_FIELDS.SECONDARY.STOCKS_UP_13PCT_34DAYS,
      MARKET_DATA_FIELDS.SECONDARY.STOCKS_DOWN_13PCT_34DAYS
    ]
  },
  REFERENCE_DATA: {
    title: 'Reference Data',
    fields: [
      MARKET_DATA_FIELDS.REFERENCE.WORDEN_UNIVERSE,
      MARKET_DATA_FIELDS.REFERENCE.SP500,
      MARKET_DATA_FIELDS.REFERENCE.T2108
    ]
  },
  SECTOR_DATA: {
    title: 'Sector Data',
    fields: Object.values(MARKET_DATA_FIELDS.SECTORS)
  }
};

// Market Analysis Thresholds
export const MARKET_THRESHOLDS = {
  BREADTH_SCORE: {
    BULLISH: 60,
    BEARISH: 40,
    EXTREME_BULLISH: 80,
    EXTREME_BEARISH: 20
  },
  T2108: {
    OVERBOUGHT: 70,
    OVERSOLD: 30,
    EXTREME_OVERBOUGHT: 80,
    EXTREME_OVERSOLD: 20
  },
  RATIO: {
    BULLISH: 1.5,
    BEARISH: 0.67,
    STRONG_BULLISH: 2.0,
    STRONG_BEARISH: 0.5
  }
};

// Screenshot Processing Types
export const SCREENSHOT_TYPES = {
  MARKET_MONITOR: 'market_monitor',
  T2108: 't2108'
};

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png'],
  SCREENSHOT_DIR: 'uploads/screenshots/',
  CSV_DIR: 'uploads/csv/'
};

// Database Configuration
export const DATABASE_CONFIG = {
  DB_PATH: process.env.DB_PATH || 'data/market_monitor.db',
  BACKUP_DIR: 'data/backups/',
  QUERY_TIMEOUT: 30000, // 30 seconds
  CONNECTION_POOL_SIZE: 10
};

// API Configuration
export const API_CONFIG = {
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 1000,
  DEFAULT_OFFSET: 0,
  PAGINATION_MAX_PAGES: 1000
};

// OCR Configuration
export const OCR_CONFIG = {
  MIN_CONFIDENCE: 60,
  PROCESSING_TIMEOUT: 120000, // 2 minutes
  MAX_RETRY_ATTEMPTS: 3,
  IMAGE_PREPROCESSING: {
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080,
    QUALITY: 90
  }
};

// Validation Rules
export const VALIDATION_RULES = {
  DATE: {
    REQUIRED: true,
    FORMAT: 'YYYY-MM-DD',
    MIN_YEAR: 2000,
    MAX_YEAR: 2030
  },
  T2108: {
    MIN: 0,
    MAX: 100
  },
  WORDEN_UNIVERSE: {
    MIN: 0.001
  },
  NUMERIC_FIELD: {
    MIN: 0,
    MAX: 999999
  }
};

// Error Messages
export const ERROR_MESSAGES = {
  VALIDATION: {
    REQUIRED_FIELD: (field) => `${field} is required`,
    INVALID_DATE: 'Invalid date format. Use YYYY-MM-DD',
    INVALID_NUMBER: (field) => `${field} must be a valid number`,
    OUT_OF_RANGE: (field, min, max) => `${field} must be between ${min} and ${max}`,
    DUPLICATE_DATE: 'Date already exists in database'
  },
  DATABASE: {
    CONNECTION_FAILED: 'Database connection failed',
    QUERY_FAILED: 'Database query failed',
    CONSTRAINT_VIOLATION: 'Database constraint violation'
  },
  FILE_UPLOAD: {
    NO_FILE: 'No file uploaded',
    INVALID_TYPE: 'Invalid file type',
    FILE_TOO_LARGE: 'File size exceeds limit',
    PROCESSING_FAILED: 'File processing failed'
  },
  OCR: {
    PROCESSING_FAILED: 'OCR processing failed',
    LOW_CONFIDENCE: 'OCR confidence too low',
    NO_DATA_FOUND: 'No market data found in image'
  }
};

// Success Messages
export const SUCCESS_MESSAGES = {
  DATA_CREATED: 'Market data created successfully',
  DATA_UPDATED: 'Market data updated successfully',
  DATA_DELETED: 'Market data deleted successfully',
  FILE_UPLOADED: 'File uploaded successfully',
  OCR_COMPLETED: (fields, confidence) => 
    `OCR completed successfully! Found ${fields} fields with ${confidence}% confidence`
};

// Default Values
export const DEFAULT_VALUES = {
  DATA_QUALITY_SCORE: {
    MANUAL_ENTRY: 1.0,
    CSV_IMPORT: 0.9,
    OCR_HIGH_CONFIDENCE: 0.8,
    OCR_MEDIUM_CONFIDENCE: 0.6,
    OCR_LOW_CONFIDENCE: 0.4
  },
  SOURCE_FILES: {
    MANUAL_ENTRY: 'manual_entry',
    CSV_IMPORT: 'csv_import',
    SCREENSHOT_EXTRACT: 'screenshot_extract'
  },
  IMPORT_FORMATS: {
    MANUAL_V2: 'manual_v2',
    CSV_IMPORT_V2: 'csv_import_v2',
    SCREENSHOT_V1: 'screenshot_v1'
  }
};

// Environment Configuration
export const ENV_CONFIG = {
  DEVELOPMENT: {
    LOG_LEVEL: 'debug',
    CORS_ORIGINS: [
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:5175',
      'http://localhost:3000'
    ]
  },
  PRODUCTION: {
    LOG_LEVEL: 'warn',
    CORS_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || []
  }
};

export default {
  MARKET_DATA_FIELDS,
  ALL_FIELD_NAMES,
  NUMERIC_FIELDS,
  FIELD_LABELS,
  FIELD_GROUPS,
  MARKET_THRESHOLDS,
  SCREENSHOT_TYPES,
  UPLOAD_CONFIG,
  DATABASE_CONFIG,
  API_CONFIG,
  OCR_CONFIG,
  VALIDATION_RULES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  DEFAULT_VALUES,
  ENV_CONFIG
};