/**
 * Breadth Score Calculation Configuration Types
 * Supports multiple algorithms with configurable parameters
 */

export type AlgorithmType = 'six_factor' | 'normalized' | 'sector_weighted' | 'custom';
export type NormalizationType = 'linear' | 'logarithmic' | 'sigmoid';
export type MarketPhase = 'BULL' | 'BEAR' | 'NEUTRAL' | 'TRANSITION';
export type StrengthLevel = 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME';
export type TrendDirection = 'UP' | 'DOWN' | 'SIDEWAYS';

/**
 * Configuration interface for breadth score calculations
 * Allows runtime modification without database schema changes
 */
export interface BreadthCalculationConfig {
  version: string;
  algorithm: AlgorithmType;
  name?: string;
  description?: string;
  
  // Configurable weights for different indicator categories
  weights: {
    primary_indicators: number;     // 0.0-1.0 - Default: 0.40 (40%)
    secondary_indicators: number;   // 0.0-1.0 - Default: 0.35 (35%)
    reference_data: number;         // 0.0-1.0 - Default: 0.25 (25%)
    sector_data: number;           // 0.0-1.0 - Default: 0.0 (sector-specific)
  };
  
  // Score scaling and normalization
  scaling: {
    min_score: number;              // Default: 0
    max_score: number;              // Default: 100
    normalization: NormalizationType; // Default: 'linear'
    confidence_threshold: number;    // Default: 0.7
  };
  
  // Algorithm-specific indicators and thresholds
  indicators: {
    t2108_threshold: number;        // Default: 50 (50%)
    sector_count_threshold: number; // Min sectors required - Default: 6
    volatility_adjustment: boolean; // Default: false
    momentum_lookback_days: number; // Default: 5
    ratio_smoothing: boolean;       // Default: true
  };
  
  // Market condition classification thresholds
  market_conditions: {
    strong_bull_threshold: number;  // Default: 75
    bull_threshold: number;         // Default: 60
    bear_threshold: number;         // Default: 40
    strong_bear_threshold: number;  // Default: 25
    trend_strength_multiplier: number; // Default: 2.0
  };
  
  // Custom formula support (for custom algorithm)
  custom_formula?: string;
  custom_parameters?: Record<string, number>;
  
  // Metadata
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_default: boolean;
}

/**
 * Default configurations for different algorithm types
 */
export const DEFAULT_CONFIGS: Record<AlgorithmType, Omit<BreadthCalculationConfig, 'version' | 'created_at' | 'updated_at'>> = {
  six_factor: {
    algorithm: 'six_factor',
    name: '6-Factor Breadth Score',
    description: 'Standard 6-factor breadth calculation based on advance/decline ratios, new highs/lows, volume, 4% movers, T2108, and momentum',
    weights: {
      primary_indicators: 0.40,
      secondary_indicators: 0.35,
      reference_data: 0.25,
      sector_data: 0.0
    },
    scaling: {
      min_score: 0,
      max_score: 100,
      normalization: 'linear',
      confidence_threshold: 0.7
    },
    indicators: {
      t2108_threshold: 50,
      sector_count_threshold: 6,
      volatility_adjustment: false,
      momentum_lookback_days: 5,
      ratio_smoothing: true
    },
    market_conditions: {
      strong_bull_threshold: 75,
      bull_threshold: 60,
      bear_threshold: 40,
      strong_bear_threshold: 25,
      trend_strength_multiplier: 2.0
    },
    is_active: true,
    is_default: true
  },
  
  normalized: {
    algorithm: 'normalized',
    name: 'Normalized Statistical Score',
    description: 'Statistical normalization with z-scores and percentile ranking for better distribution',
    weights: {
      primary_indicators: 0.35,
      secondary_indicators: 0.30,
      reference_data: 0.25,
      sector_data: 0.10
    },
    scaling: {
      min_score: 0,
      max_score: 100,
      normalization: 'sigmoid',
      confidence_threshold: 0.8
    },
    indicators: {
      t2108_threshold: 50,
      sector_count_threshold: 8,
      volatility_adjustment: true,
      momentum_lookback_days: 10,
      ratio_smoothing: true
    },
    market_conditions: {
      strong_bull_threshold: 80,
      bull_threshold: 65,
      bear_threshold: 35,
      strong_bear_threshold: 20,
      trend_strength_multiplier: 1.8
    },
    is_active: true,
    is_default: false
  },
  
  sector_weighted: {
    algorithm: 'sector_weighted',
    name: 'Sector-Weighted Analysis',
    description: 'Emphasizes sector rotation and distribution for institutional trading patterns',
    weights: {
      primary_indicators: 0.25,
      secondary_indicators: 0.25,
      reference_data: 0.20,
      sector_data: 0.30
    },
    scaling: {
      min_score: 0,
      max_score: 100,
      normalization: 'linear',
      confidence_threshold: 0.75
    },
    indicators: {
      t2108_threshold: 45,
      sector_count_threshold: 9,
      volatility_adjustment: true,
      momentum_lookback_days: 7,
      ratio_smoothing: false
    },
    market_conditions: {
      strong_bull_threshold: 78,
      bull_threshold: 62,
      bear_threshold: 38,
      strong_bear_threshold: 22,
      trend_strength_multiplier: 2.2
    },
    is_active: true,
    is_default: false
  },
  
  custom: {
    algorithm: 'custom',
    name: 'Custom Formula',
    description: 'User-defined formula with custom parameters and weights',
    weights: {
      primary_indicators: 0.40,
      secondary_indicators: 0.35,
      reference_data: 0.25,
      sector_data: 0.0
    },
    scaling: {
      min_score: 0,
      max_score: 100,
      normalization: 'linear',
      confidence_threshold: 0.7
    },
    indicators: {
      t2108_threshold: 50,
      sector_count_threshold: 6,
      volatility_adjustment: false,
      momentum_lookback_days: 5,
      ratio_smoothing: true
    },
    market_conditions: {
      strong_bull_threshold: 75,
      bull_threshold: 60,
      bear_threshold: 40,
      strong_bear_threshold: 25,
      trend_strength_multiplier: 2.0
    },
    custom_formula: '(primary * 0.4) + (secondary * 0.35) + (reference * 0.25)',
    custom_parameters: {},
    is_active: true,
    is_default: false
  }
};

/**
 * Result interface for breadth score calculations
 */
export interface BreadthResult {
  // Core results
  date: string;
  score: number;
  normalizedScore: number;
  confidence: number;
  
  // Component breakdown
  components: {
    primary_score: number;
    secondary_score: number;
    reference_score: number;
    sector_score: number;
  };
  
  // Market condition analysis
  market_condition: {
    phase: MarketPhase;
    strength: StrengthLevel;
    trend_direction: TrendDirection;
    confidence_level: number;
  };
  
  // Metadata
  metadata: {
    algorithm_used: string;
    config_version: string;
    calculation_time: number;
    data_quality: number;
    missing_indicators: string[];
    warnings?: string[];
  };
}

/**
 * Validation result for breadth data
 */
export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100 data quality score
  errors: string[];
  warnings: string[];
  missingFields: string[];
  fieldCoverage: number; // percentage of expected fields present
}

/**
 * Algorithm implementation interface
 */
export interface AlgorithmImplementation {
  name: string;
  type: AlgorithmType;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  
  // Core calculation method
  calculate(
    data: import('./breadth-raw-data').RawMarketBreadthData, 
    config: BreadthCalculationConfig,
    historicalData?: import('./breadth-raw-data').RawMarketBreadthData[]
  ): BreadthResult;
  
  // Validation method
  validate(data: import('./breadth-raw-data').RawMarketBreadthData): ValidationResult;
  
  // Configuration validation
  validateConfig(config: Partial<BreadthCalculationConfig>): { valid: boolean; errors: string[] };
}

/**
 * Historical recalculation options
 */
export interface RecalculationOptions {
  startDate?: string;
  endDate?: string;
  algorithm?: AlgorithmType;
  config?: BreadthCalculationConfig;
  batchSize?: number; // Default: 100
  progressCallback?: (progress: { completed: number; total: number; currentDate: string }) => void;
}

/**
 * Configuration management interface
 */
export interface ConfigurationManager {
  // Config CRUD operations
  createConfig(config: Omit<BreadthCalculationConfig, 'version' | 'created_at' | 'updated_at'>): Promise<string>;
  getConfig(version: string): Promise<BreadthCalculationConfig | null>;
  updateConfig(version: string, updates: Partial<BreadthCalculationConfig>): Promise<boolean>;
  deleteConfig(version: string): Promise<boolean>;
  
  // Config listing and management
  listConfigs(activeOnly?: boolean): Promise<BreadthCalculationConfig[]>;
  getDefaultConfig(algorithm?: AlgorithmType): Promise<BreadthCalculationConfig>;
  setDefaultConfig(version: string): Promise<boolean>;
  
  // Config validation
  validateConfig(config: Partial<BreadthCalculationConfig>): ValidationResult;
  cloneConfig(version: string, newName?: string): Promise<string>;
}

/**
 * Performance metrics for calculation optimization
 */
export interface PerformanceMetrics {
  calculationTime: number; // milliseconds
  recordsProcessed: number;
  recordsPerSecond: number;
  memoryUsage: number; // MB
  algorithm: AlgorithmType;
  batchSize?: number;
  timestamp: string;
}