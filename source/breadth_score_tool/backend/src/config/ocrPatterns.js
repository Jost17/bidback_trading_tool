/**
 * OCR Pattern Configuration
 * Centralized patterns for extracting market data from screenshots
 */

import { MARKET_DATA_FIELDS } from './constants.js';

/**
 * Base pattern builders for common OCR variations
 */
const PatternBuilder = {
  // Flexible whitespace and separator patterns
  ws: '[_\\s]*',           // whitespace or underscore
  sep: '[:\\s]*',          // separator (colon or space)
  num: '([\\d,]+\\.?\\d*)', // number with optional commas and decimals
  intNum: '(\\d+)',        // integer number only
  
  // Build pattern with multiple variations
  buildPattern: (variants) => variants.map(v => new RegExp(v, 'i')),
  
  // Common field pattern builders
  percentage: (pct, direction, period) => [
    `mm${PatternBuilder.ws}${pct}%${PatternBuilder.ws}${direction}${PatternBuilder.ws}${period}${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `${pct}%${PatternBuilder.ws}${direction}${PatternBuilder.ws}${period}${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `${direction}${PatternBuilder.ws}${pct}%${PatternBuilder.ws}${period}${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `${period}${PatternBuilder.ws}${pct}%${PatternBuilder.ws}${direction}${PatternBuilder.sep}${PatternBuilder.intNum}`
  ],
  
  sector: (sectorName) => [
    `${sectorName}${PatternBuilder.ws}Sector${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `${sectorName}${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `${sectorName}${PatternBuilder.ws}sector${PatternBuilder.sep}${PatternBuilder.intNum}`
  ]
};

/**
 * Market Monitor Screenshot Patterns
 */
export const MARKET_MONITOR_PATTERNS = {
  // 4% Patterns
  [MARKET_DATA_FIELDS.PRIMARY.STOCKS_UP_4PCT]: PatternBuilder.buildPattern([
    ...PatternBuilder.percentage('4', 'bullish', ''),
    ...PatternBuilder.percentage('4', 'up', ''),
    `mm${PatternBuilder.ws}4${PatternBuilder.ws}bullish${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `4%${PatternBuilder.ws}bullish${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `bullish${PatternBuilder.ws}4%${PatternBuilder.sep}${PatternBuilder.intNum}`
  ]),
  
  [MARKET_DATA_FIELDS.PRIMARY.STOCKS_DOWN_4PCT]: PatternBuilder.buildPattern([
    ...PatternBuilder.percentage('4', 'bearish', ''),
    ...PatternBuilder.percentage('4', 'down', ''),
    `mm${PatternBuilder.ws}4${PatternBuilder.ws}bearish${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `4%${PatternBuilder.ws}bearish${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `bearish${PatternBuilder.ws}4%${PatternBuilder.sep}${PatternBuilder.intNum}`
  ]),
  
  // 25% Quarter Patterns (including "in a quarter" variations)
  [MARKET_DATA_FIELDS.PRIMARY.STOCKS_UP_25PCT_QUARTER]: PatternBuilder.buildPattern([
    ...PatternBuilder.percentage('25', 'up', 'quarter'),
    `25%${PatternBuilder.ws}up${PatternBuilder.ws}in${PatternBuilder.ws}a?${PatternBuilder.ws}quarter${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `25%${PatternBuilder.ws}upinaquarter${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `up${PatternBuilder.ws}25%${PatternBuilder.ws}quarter${PatternBuilder.sep}${PatternBuilder.intNum}`
  ]),
  
  [MARKET_DATA_FIELDS.PRIMARY.STOCKS_DOWN_25PCT_QUARTER]: PatternBuilder.buildPattern([
    ...PatternBuilder.percentage('25', 'down', 'quarter'),
    `25%${PatternBuilder.ws}down${PatternBuilder.ws}in${PatternBuilder.ws}a?${PatternBuilder.ws}quarter${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `25%${PatternBuilder.ws}downinaquarter${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `down${PatternBuilder.ws}25%${PatternBuilder.ws}quarter${PatternBuilder.sep}${PatternBuilder.intNum}`
  ]),
  
  // Monthly Patterns
  [MARKET_DATA_FIELDS.SECONDARY.STOCKS_UP_25PCT_MONTH]: PatternBuilder.buildPattern([
    ...PatternBuilder.percentage('25', 'up', 'month'),
    `month${PatternBuilder.ws}25%${PatternBuilder.ws}up${PatternBuilder.sep}${PatternBuilder.intNum}`
  ]),
  
  [MARKET_DATA_FIELDS.SECONDARY.STOCKS_DOWN_25PCT_MONTH]: PatternBuilder.buildPattern([
    ...PatternBuilder.percentage('25', 'down', 'month'),
    `month${PatternBuilder.ws}25%${PatternBuilder.ws}down${PatternBuilder.sep}${PatternBuilder.intNum}`
  ]),
  
  [MARKET_DATA_FIELDS.SECONDARY.STOCKS_UP_50PCT_MONTH]: PatternBuilder.buildPattern([
    ...PatternBuilder.percentage('50', 'up', 'month'),
    `month${PatternBuilder.ws}50%${PatternBuilder.ws}up${PatternBuilder.sep}${PatternBuilder.intNum}`
  ]),
  
  [MARKET_DATA_FIELDS.SECONDARY.STOCKS_DOWN_50PCT_MONTH]: PatternBuilder.buildPattern([
    ...PatternBuilder.percentage('50', 'down', 'month'),
    `month${PatternBuilder.ws}50%${PatternBuilder.ws}down${PatternBuilder.sep}${PatternBuilder.intNum}`
  ]),
  
  // 34 Days Patterns
  [MARKET_DATA_FIELDS.SECONDARY.STOCKS_UP_13PCT_34DAYS]: PatternBuilder.buildPattern([
    `mm${PatternBuilder.ws}#?${PatternBuilder.ws}up${PatternBuilder.ws}13%${PatternBuilder.ws}in${PatternBuilder.ws}34${PatternBuilder.ws}days${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `up${PatternBuilder.ws}13%${PatternBuilder.ws}34${PatternBuilder.ws}days${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `13%${PatternBuilder.ws}up${PatternBuilder.ws}34${PatternBuilder.ws}days${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `13%${PatternBuilder.ws}34${PatternBuilder.ws}days${PatternBuilder.ws}up${PatternBuilder.sep}${PatternBuilder.intNum}`
  ]),
  
  [MARKET_DATA_FIELDS.SECONDARY.STOCKS_DOWN_13PCT_34DAYS]: PatternBuilder.buildPattern([
    `mm${PatternBuilder.ws}#?${PatternBuilder.ws}down${PatternBuilder.ws}13%${PatternBuilder.ws}in${PatternBuilder.ws}34${PatternBuilder.ws}days${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `down${PatternBuilder.ws}13%${PatternBuilder.ws}34${PatternBuilder.ws}days${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `13%${PatternBuilder.ws}down${PatternBuilder.ws}34${PatternBuilder.ws}days${PatternBuilder.sep}${PatternBuilder.intNum}`,
    `13%${PatternBuilder.ws}34${PatternBuilder.ws}days${PatternBuilder.ws}down${PatternBuilder.sep}${PatternBuilder.intNum}`
  ]),
  
  // Reference Data Patterns
  [MARKET_DATA_FIELDS.REFERENCE.WORDEN_UNIVERSE]: PatternBuilder.buildPattern([
    `US${PatternBuilder.ws}Common${PatternBuilder.ws}Stocks${PatternBuilder.sep}${PatternBuilder.num}`,
    `Common${PatternBuilder.ws}Stocks${PatternBuilder.sep}${PatternBuilder.num}`,
    `US${PatternBuilder.ws}Stocks${PatternBuilder.sep}${PatternBuilder.num}`,
    `Worden${PatternBuilder.ws}Universe${PatternBuilder.sep}${PatternBuilder.num}`
  ]),
  
  [MARKET_DATA_FIELDS.REFERENCE.SP500]: PatternBuilder.buildPattern([
    `SP${PatternBuilder.ws}-?${PatternBuilder.ws}500${PatternBuilder.sep}${PatternBuilder.num}`,
    `S&P${PatternBuilder.ws}500${PatternBuilder.sep}${PatternBuilder.num}`,
    `S&P${PatternBuilder.ws}-?${PatternBuilder.ws}500${PatternBuilder.sep}${PatternBuilder.num}`,
    `SP500${PatternBuilder.sep}${PatternBuilder.num}`
  ]),
  
  [MARKET_DATA_FIELDS.REFERENCE.T2108]: PatternBuilder.buildPattern([
    `T${PatternBuilder.ws}2108${PatternBuilder.sep}${PatternBuilder.num}`,
    `T-2108${PatternBuilder.sep}${PatternBuilder.num}`,
    `T2108${PatternBuilder.sep}${PatternBuilder.num}`
  ])
};

/**
 * Sector Data Patterns
 */
export const SECTOR_PATTERNS = {
  [MARKET_DATA_FIELDS.SECTORS.BASIC_MATERIALS]: PatternBuilder.buildPattern([
    ...PatternBuilder.sector('Basic Material'),
    ...PatternBuilder.sector('Basic Materials'),
    ...PatternBuilder.sector('Materials')
  ]),
  
  [MARKET_DATA_FIELDS.SECTORS.CONSUMER_CYCLICAL]: PatternBuilder.buildPattern([
    ...PatternBuilder.sector('Consumer Cyclical'),
    ...PatternBuilder.sector('Cyclical'),
    ...PatternBuilder.sector('Consumer Cyc')
  ]),
  
  [MARKET_DATA_FIELDS.SECTORS.FINANCIAL_SERVICES]: PatternBuilder.buildPattern([
    ...PatternBuilder.sector('Financial Services'),
    ...PatternBuilder.sector('Financial'),
    ...PatternBuilder.sector('Financials')
  ]),
  
  [MARKET_DATA_FIELDS.SECTORS.REAL_ESTATE]: PatternBuilder.buildPattern([
    ...PatternBuilder.sector('Real Estate'),
    ...PatternBuilder.sector('Real Est'),
    ...PatternBuilder.sector('Estate')
  ]),
  
  [MARKET_DATA_FIELDS.SECTORS.CONSUMER_DEFENSIVE]: PatternBuilder.buildPattern([
    ...PatternBuilder.sector('Consumer Defensive'),
    ...PatternBuilder.sector('Defensive'),
    ...PatternBuilder.sector('Consumer Def')
  ]),
  
  [MARKET_DATA_FIELDS.SECTORS.HEALTHCARE]: PatternBuilder.buildPattern([
    ...PatternBuilder.sector('Healthcare'),
    ...PatternBuilder.sector('Health Care'),
    ...PatternBuilder.sector('Health')
  ]),
  
  [MARKET_DATA_FIELDS.SECTORS.UTILITIES]: PatternBuilder.buildPattern([
    ...PatternBuilder.sector('Utilities'),
    ...PatternBuilder.sector('Utility'),
    ...PatternBuilder.sector('Utils')
  ]),
  
  [MARKET_DATA_FIELDS.SECTORS.COMMUNICATION_SERVICES]: PatternBuilder.buildPattern([
    ...PatternBuilder.sector('Communication Services'),
    ...PatternBuilder.sector('Communications'),
    ...PatternBuilder.sector('Communication'),
    ...PatternBuilder.sector('Comm Services')
  ]),
  
  [MARKET_DATA_FIELDS.SECTORS.ENERGY]: PatternBuilder.buildPattern([
    ...PatternBuilder.sector('Energy')
  ]),
  
  [MARKET_DATA_FIELDS.SECTORS.INDUSTRIALS]: PatternBuilder.buildPattern([
    ...PatternBuilder.sector('Industrials'),
    ...PatternBuilder.sector('Industrial'),
    ...PatternBuilder.sector('Indust')
  ]),
  
  [MARKET_DATA_FIELDS.SECTORS.TECHNOLOGY]: PatternBuilder.buildPattern([
    ...PatternBuilder.sector('Technology'),
    ...PatternBuilder.sector('Tech'),
    ...PatternBuilder.sector('Technology Sector')
  ])
};

/**
 * T2108 Specific Patterns
 */
export const T2108_PATTERNS = {
  [MARKET_DATA_FIELDS.REFERENCE.T2108]: PatternBuilder.buildPattern([
    `T2108${PatternBuilder.sep}${PatternBuilder.num}`,
    `T-2108${PatternBuilder.sep}${PatternBuilder.num}`,
    `T${PatternBuilder.ws}2108${PatternBuilder.sep}${PatternBuilder.num}`,
    `Telechart${PatternBuilder.ws}T2108${PatternBuilder.sep}${PatternBuilder.num}`
  ]),
  
  // T2108 often comes with additional context
  t2108_percentage: PatternBuilder.buildPattern([
    `T2108${PatternBuilder.ws}Percentage${PatternBuilder.sep}${PatternBuilder.num}`,
    `T2108${PatternBuilder.ws}%${PatternBuilder.sep}${PatternBuilder.num}`,
    `Percent${PatternBuilder.ws}Above${PatternBuilder.ws}40MA${PatternBuilder.sep}${PatternBuilder.num}`
  ])
};

/**
 * Pattern matching priority order
 * More specific patterns should be tried first
 */
export const PATTERN_PRIORITY = [
  'exact_match',      // Exact field name matches
  'specific_context', // Patterns with multiple context words
  'common_variations',// Common OCR misreads
  'fallback'         // Simple keyword matches
];

/**
 * Get all patterns for a screenshot type
 */
export const getPatternsByType = (screenshotType) => {
  switch (screenshotType) {
    case 'market_monitor':
      return { 
        ...MARKET_MONITOR_PATTERNS, 
        ...SECTOR_PATTERNS 
      };
    case 't2108':
      return { 
        ...T2108_PATTERNS,
        // Include basic market data patterns for T2108 screenshots
        [MARKET_DATA_FIELDS.REFERENCE.WORDEN_UNIVERSE]: MARKET_MONITOR_PATTERNS[MARKET_DATA_FIELDS.REFERENCE.WORDEN_UNIVERSE],
        [MARKET_DATA_FIELDS.REFERENCE.SP500]: MARKET_MONITOR_PATTERNS[MARKET_DATA_FIELDS.REFERENCE.SP500]
      };
    default:
      return MARKET_MONITOR_PATTERNS;
  }
};

/**
 * Pattern validation helpers
 */
export const PatternValidator = {
  // Validate extracted number is reasonable for field type
  validateValue: (fieldName, value) => {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue < 0) {
      return false;
    }
    
    // Field-specific validation
    if (fieldName === MARKET_DATA_FIELDS.REFERENCE.T2108) {
      return numValue >= 0 && numValue <= 100;
    }
    
    // Most market data should be reasonable numbers
    if (numValue > 999999) {
      return false;
    }
    
    return true;
  },
  
  // Clean extracted text before parsing
  cleanValue: (text) => {
    return text.replace(/[,\s]/g, '').trim();
  }
};

/**
 * OCR confidence scoring based on pattern type
 */
export const CONFIDENCE_SCORING = {
  EXACT_MATCH: 1.0,
  SPECIFIC_CONTEXT: 0.9,
  COMMON_VARIATION: 0.8,
  PARTIAL_MATCH: 0.6,
  FALLBACK: 0.4
};

export default {
  MARKET_MONITOR_PATTERNS,
  SECTOR_PATTERNS,
  T2108_PATTERNS,
  getPatternsByType,
  PatternValidator,
  CONFIDENCE_SCORING,
  PATTERN_PRIORITY
};