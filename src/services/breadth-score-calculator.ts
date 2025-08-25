/**
 * Flexible Breadth Score Calculator
 * Supports multiple configurable algorithms for market breadth analysis
 */

import type { 
  BreadthCalculationConfig, 
  BreadthResult, 
  AlgorithmImplementation,
  AlgorithmType,
  ValidationResult,
  RecalculationOptions,
  PerformanceMetrics,
  DEFAULT_CONFIGS
} from '../types/breadth-calculation-config';
import type { 
  RawMarketBreadthData, 
  StandardizedBreadthData,
  FIELD_PRIORITY_MAP,
  MINIMUM_REQUIRED_FIELDS
} from '../types/breadth-raw-data';
import { SixFactorAlgorithm } from './algorithms/six-factor-algorithm';
import { NormalizedAlgorithm } from './algorithms/normalized-algorithm';
import { SectorWeightedAlgorithm } from './algorithms/sector-weighted-algorithm';
import { CustomAlgorithm } from './algorithms/custom-algorithm';
import { BreadthConfigurationManager } from './breadth-configuration-manager';

/**
 * Main Breadth Score Calculator Class
 * Provides configurable, real-time calculation with multiple algorithms
 */
export class BreadthScoreCalculator {
  private algorithms: Map<AlgorithmType, AlgorithmImplementation>;
  private currentConfig: BreadthCalculationConfig;
  private configManager?: BreadthConfigurationManager;
  private performanceMetrics: PerformanceMetrics[] = [];

  constructor(initialConfig?: BreadthCalculationConfig, db?: any) {
    this.algorithms = new Map();
    this.initializeAlgorithms();
    
    // Initialize configuration manager if database provided
    if (db) {
      this.configManager = new BreadthConfigurationManager(db);
    }
    
    // Use provided config or default six-factor
    this.currentConfig = initialConfig || this.getDefaultConfig('six_factor');
  }

  /**
   * Initialize all available algorithm implementations
   */
  private initializeAlgorithms(): void {
    this.algorithms.set('six_factor', new SixFactorAlgorithm());
    this.algorithms.set('normalized', new NormalizedAlgorithm());
    this.algorithms.set('sector_weighted', new SectorWeightedAlgorithm());
    this.algorithms.set('custom', new CustomAlgorithm());
  }

  /**
   * Get default configuration for specified algorithm
   */
  public getDefaultConfig(algorithmType: AlgorithmType): BreadthCalculationConfig {
    // Import DEFAULT_CONFIGS properly
    const DEFAULT_CONFIGS = {
      six_factor: {
        algorithm: 'six_factor' as const,
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
          normalization: 'linear' as const,
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
        algorithm: 'normalized' as const,
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
          normalization: 'sigmoid' as const,
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
        algorithm: 'sector_weighted' as const,
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
          normalization: 'linear' as const,
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
        algorithm: 'custom' as const,
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
          normalization: 'linear' as const,
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
    
    const config = DEFAULT_CONFIGS[algorithmType];
    
    return {
      ...config,
      version: this.generateConfigVersion(algorithmType),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Generate unique config version identifier
   */
  private generateConfigVersion(algorithmType: AlgorithmType): string {
    const timestamp = Date.now();
    return `${algorithmType}_v${timestamp}`;
  }

  /**
   * Main calculation method - real-time calculation from raw data
   */
  public calculate(
    rawData: RawMarketBreadthData, 
    config?: BreadthCalculationConfig,
    historicalData?: RawMarketBreadthData[]
  ): BreadthResult {
    const startTime = performance.now();
    const useConfig = config || this.currentConfig;
    
    // Get algorithm implementation
    const algorithm = this.algorithms.get(useConfig.algorithm);
    if (!algorithm) {
      throw new Error(`Algorithm ${useConfig.algorithm} not found`);
    }

    // Validate input data
    const validation = algorithm.validate(rawData);
    if (!validation.isValid) {
      throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
    }

    // Perform calculation
    const result = algorithm.calculate(rawData, useConfig, historicalData);
    
    // Record performance metrics
    const calculationTime = performance.now() - startTime;
    this.recordPerformance({
      calculationTime,
      recordsProcessed: 1,
      recordsPerSecond: 1000 / calculationTime,
      memoryUsage: this.getMemoryUsage(),
      algorithm: useConfig.algorithm,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  /**
   * Calculate historical breadth scores for a date range
   */
  public calculateHistorical(
    historicalData: RawMarketBreadthData[],
    options: RecalculationOptions = {}
  ): BreadthResult[] {
    const startTime = performance.now();
    const {
      startDate,
      endDate,
      algorithm,
      config,
      batchSize = 100,
      progressCallback
    } = options;

    // Filter data by date range if specified
    let filteredData = historicalData;
    if (startDate || endDate) {
      filteredData = historicalData.filter(data => {
        const dataDate = data.date;
        if (startDate && dataDate < startDate) return false;
        if (endDate && dataDate > endDate) return false;
        return true;
      });
    }

    // Use specified config or current config
    const useConfig = config || (algorithm ? this.getDefaultConfig(algorithm) : this.currentConfig);
    const algorithmImpl = this.algorithms.get(useConfig.algorithm)!;

    const results: BreadthResult[] = [];
    const totalRecords = filteredData.length;

    // Process in batches for performance
    for (let i = 0; i < filteredData.length; i += batchSize) {
      const batch = filteredData.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const dataPoint = batch[j];
        const currentIndex = i + j;
        
        try {
          // Get historical context (previous data points)
          const contextData = filteredData.slice(0, currentIndex);
          const result = algorithmImpl.calculate(dataPoint, useConfig, contextData);
          results.push(result);

          // Report progress
          if (progressCallback && currentIndex % 10 === 0) {
            progressCallback({
              completed: currentIndex + 1,
              total: totalRecords,
              currentDate: dataPoint.date
            });
          }
        } catch (error) {
          console.warn(`Failed to calculate breadth score for ${dataPoint.date}:`, error);
          // Continue with next data point
        }
      }
    }

    // Record performance metrics
    const calculationTime = performance.now() - startTime;
    this.recordPerformance({
      calculationTime,
      recordsProcessed: results.length,
      recordsPerSecond: (results.length * 1000) / calculationTime,
      memoryUsage: this.getMemoryUsage(),
      algorithm: useConfig.algorithm,
      batchSize,
      timestamp: new Date().toISOString()
    });

    return results;
  }

  /**
   * Recalculate all historical data with current or specified configuration
   */
  public async recalculateAll(
    dataProvider: () => Promise<RawMarketBreadthData[]>,
    options: RecalculationOptions = {}
  ): Promise<BreadthResult[]> {
    const historicalData = await dataProvider();
    return this.calculateHistorical(historicalData, options);
  }

  /**
   * Update calculator configuration
   */
  public updateConfig(newConfig: Partial<BreadthCalculationConfig>): void {
    // Validate configuration
    const validation = this.validateConfiguration(newConfig);
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    // Merge with current config
    this.currentConfig = {
      ...this.currentConfig,
      ...newConfig,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Get current configuration
   */
  public getCurrentConfig(): BreadthCalculationConfig {
    return { ...this.currentConfig };
  }

  /**
   * Get available algorithms
   */
  public getAvailableAlgorithms(): Array<{
    type: AlgorithmType;
    name: string;
    description: string;
    requiredFields: string[];
    optionalFields: string[];
  }> {
    return Array.from(this.algorithms.entries()).map(([type, algorithm]) => ({
      type,
      name: algorithm.name,
      description: algorithm.description,
      requiredFields: algorithm.requiredFields,
      optionalFields: algorithm.optionalFields
    }));
  }

  /**
   * Validate raw breadth data
   */
  public validateData(data: RawMarketBreadthData): ValidationResult {
    const algorithm = this.algorithms.get(this.currentConfig.algorithm);
    if (!algorithm) {
      return {
        isValid: false,
        score: 0,
        errors: [`Algorithm ${this.currentConfig.algorithm} not available`],
        warnings: [],
        missingFields: [],
        fieldCoverage: 0
      };
    }

    return algorithm.validate(data);
  }

  /**
   * Validate algorithm configuration
   */
  public validateConfiguration(config: Partial<BreadthCalculationConfig>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check algorithm exists
    if (config.algorithm && !this.algorithms.has(config.algorithm)) {
      errors.push(`Algorithm ${config.algorithm} is not supported`);
    }

    // Validate weights sum to reasonable total
    if (config.weights) {
      const totalWeight = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0);
      if (totalWeight > 1.1) {
        errors.push('Total weights exceed 110% - this may cause score inflation');
      }
      if (totalWeight < 0.9) {
        warnings.push('Total weights are less than 90% - scores may be deflated');
      }
    }

    // Validate scaling parameters
    if (config.scaling) {
      if (config.scaling.min_score >= config.scaling.max_score) {
        errors.push('Minimum score must be less than maximum score');
      }
      if (config.scaling.confidence_threshold < 0 || config.scaling.confidence_threshold > 1) {
        errors.push('Confidence threshold must be between 0 and 1');
      }
    }

    // Validate market condition thresholds
    if (config.market_conditions) {
      const thresholds = [
        config.market_conditions.strong_bear_threshold,
        config.market_conditions.bear_threshold,
        config.market_conditions.bull_threshold,
        config.market_conditions.strong_bull_threshold
      ].filter(t => t !== undefined);

      for (let i = 1; i < thresholds.length; i++) {
        if (thresholds[i] <= thresholds[i - 1]) {
          errors.push('Market condition thresholds must be in ascending order');
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      score: errors.length === 0 ? (warnings.length === 0 ? 100 : 85) : 0,
      errors,
      warnings,
      missingFields: [],
      fieldCoverage: 100
    };
  }

  /**
   * Standardize raw breadth data for consistent algorithm input
   */
  public standardizeData(rawData: RawMarketBreadthData): StandardizedBreadthData {
    const { FIELD_PRIORITY_MAP } = require('../types/breadth-raw-data');
    
    const standardized: Partial<StandardizedBreadthData> = {};
    const missingFields: string[] = [];

    // Map fields using priority order
    for (const [standardField, priorityFields] of Object.entries(FIELD_PRIORITY_MAP)) {
      let value: any = undefined;
      
      for (const field of priorityFields) {
        if (rawData.hasOwnProperty(field) && rawData[field as keyof RawMarketBreadthData] !== undefined) {
          value = rawData[field as keyof RawMarketBreadthData];
          break;
        }
      }
      
      if (value !== undefined) {
        if (standardField === 'sp500Level' && typeof value === 'string') {
          // Parse S&P 500 level from string format
          const cleaned = value.replace(/[",]/g, '');
          standardized[standardField as keyof StandardizedBreadthData] = parseFloat(cleaned) || 0;
        } else {
          standardized[standardField as keyof StandardizedBreadthData] = typeof value === 'number' ? value : Number(value) || 0;
        }
      } else {
        missingFields.push(standardField);
      }
    }

    // Add sector data if available
    if (this.hasSectorData(rawData)) {
      standardized.sectors = this.extractSectorData(rawData);
    }

    // Calculate data quality score
    const totalExpectedFields = Object.keys(FIELD_PRIORITY_MAP).length;
    const presentFields = totalExpectedFields - missingFields.length;
    const dataQuality = Math.round((presentFields / totalExpectedFields) * 100);

    return {
      ...standardized,
      missingFields,
      dataQuality
    } as StandardizedBreadthData;
  }

  /**
   * Check if raw data contains sector information
   */
  private hasSectorData(rawData: RawMarketBreadthData): boolean {
    const sectorFields = [
      'basicMaterialsSector',
      'consumerCyclicalSector',
      'financialServicesSector',
      'realEstateSector',
      'consumerDefensiveSector',
      'healthcareSector',
      'utilitiesSector',
      'communicationServicesSector',
      'energySector',
      'industrialsSector',
      'technologySector'
    ];

    return sectorFields.some(field => rawData[field as keyof RawMarketBreadthData] !== undefined);
  }

  /**
   * Extract sector data from raw breadth data
   */
  private extractSectorData(rawData: RawMarketBreadthData) {
    return {
      basicMaterials: rawData.basicMaterialsSector || 0,
      consumerCyclical: rawData.consumerCyclicalSector || 0,
      financialServices: rawData.financialServicesSector || 0,
      realEstate: rawData.realEstateSector || 0,
      consumerDefensive: rawData.consumerDefensiveSector || 0,
      healthcare: rawData.healthcareSector || 0,
      utilities: rawData.utilitiesSector || 0,
      communicationServices: rawData.communicationServicesSector || 0,
      energy: rawData.energySector || 0,
      industrials: rawData.industrialsSector || 0,
      technology: rawData.technologySector || 0
    };
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Clear performance metrics
   */
  public clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
  }

  /**
   * Record performance metrics
   */
  private recordPerformance(metrics: PerformanceMetrics): void {
    this.performanceMetrics.push(metrics);
    
    // Keep only last 100 metrics to prevent memory bloat
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }

  /**
   * Get approximate memory usage (simplified)
   */
  private getMemoryUsage(): number {
    // Simplified memory estimation
    return Math.round(JSON.stringify(this.currentConfig).length / 1024);
  }

  /**
   * Get algorithm-specific info
   */
  public getAlgorithmInfo(algorithmType: AlgorithmType) {
    const algorithm = this.algorithms.get(algorithmType);
    if (!algorithm) {
      return null;
    }

    return {
      name: algorithm.name,
      type: algorithm.type,
      description: algorithm.description,
      requiredFields: algorithm.requiredFields,
      optionalFields: algorithm.optionalFields
    };
  }

  /**
   * Switch to different algorithm with default config
   */
  public switchAlgorithm(algorithmType: AlgorithmType, customConfig?: Partial<BreadthCalculationConfig>): void {
    if (!this.algorithms.has(algorithmType)) {
      throw new Error(`Algorithm ${algorithmType} not available`);
    }

    const defaultConfig = this.getDefaultConfig(algorithmType);
    this.currentConfig = customConfig ? { ...defaultConfig, ...customConfig } : defaultConfig;
  }

  /**
   * Configuration manager integration methods
   */
  public async saveCurrentConfig(name?: string): Promise<string> {
    if (!this.configManager) {
      throw new Error('Configuration manager not initialized - database required');
    }

    const configToSave = {
      ...this.currentConfig,
      name: name || this.currentConfig.name || `${this.currentConfig.algorithm}_config`,
      is_default: false
    };

    // Remove version and timestamps to create new
    delete (configToSave as any).version;
    delete (configToSave as any).created_at;
    delete (configToSave as any).updated_at;

    return await this.configManager.createConfig(configToSave);
  }

  public async loadConfig(version: string): Promise<boolean> {
    if (!this.configManager) {
      throw new Error('Configuration manager not initialized - database required');
    }

    const config = await this.configManager.getConfig(version);
    if (!config) {
      return false;
    }

    this.currentConfig = config;
    return true;
  }

  public async listSavedConfigs(): Promise<BreadthCalculationConfig[]> {
    if (!this.configManager) {
      return [];
    }

    return await this.configManager.listConfigs(true);
  }

  /**
   * Standardize raw breadth data for consistent algorithm input
   */
  public standardizeData(rawData: RawMarketBreadthData): StandardizedBreadthData {
    const standardized: Partial<StandardizedBreadthData> = {};
    const missingFields: string[] = [];

    // Basic required fields
    standardized.date = rawData.date;
    standardized.timestamp = rawData.timestamp || new Date().toISOString();

    // Primary indicators with fallback logic
    standardized.stocksUp4Pct = rawData.stocksUp4PctDaily || rawData.advancingIssues || 0;
    standardized.stocksDown4Pct = rawData.stocksDown4PctDaily || rawData.decliningIssues || 0;
    standardized.stocksUp25PctQuarterly = rawData.stocksUp25PctQuarterly || 0;
    standardized.stocksDown25PctQuarterly = rawData.stocksDown25PctQuarterly || 0;

    // Secondary indicators
    standardized.stocksUp25PctMonthly = rawData.stocksUp25PctMonthly || 0;
    standardized.stocksDown25PctMonthly = rawData.stocksDown25PctMonthly || 0;
    standardized.stocksUp50PctMonthly = rawData.stocksUp50PctMonthly || 0;
    standardized.stocksDown50PctMonthly = rawData.stocksDown50PctMonthly || 0;
    standardized.stocksUp13Pct34Days = rawData.stocksUp13Pct34Days || 0;
    standardized.stocksDown13Pct34Days = rawData.stocksDown13Pct34Days || 0;

    // Legacy breadth data
    standardized.advancingIssues = rawData.advancingIssues || rawData.stocksUp4PctDaily || 0;
    standardized.decliningIssues = rawData.decliningIssues || rawData.stocksDown4PctDaily || 0;
    standardized.newHighs = rawData.newHighs || 0;
    standardized.newLows = rawData.newLows || 0;
    standardized.upVolume = rawData.upVolume || 0;
    standardized.downVolume = rawData.downVolume || 0;

    // Reference data
    standardized.wordenUniverse = rawData.wordenUniverse || 0;
    standardized.t2108 = rawData.t2108 || 50;
    standardized.sp500Level = this.parseS500Level(rawData.sp500Level);

    // Sector data
    if (this.hasSectorData(rawData)) {
      standardized.sectors = this.extractSectorData(rawData);
    }

    // Data quality assessment
    const expectedFields = ['advancingIssues', 'decliningIssues', 'newHighs', 'newLows', 'upVolume', 'downVolume', 't2108'];
    const presentFields = expectedFields.filter(field => {
      const value = rawData[field as keyof RawMarketBreadthData];
      return value !== undefined && value !== null;
    });

    standardized.dataQuality = Math.round((presentFields.length / expectedFields.length) * 100);
    standardized.missingFields = expectedFields.filter(field => !presentFields.includes(field));

    return standardized as StandardizedBreadthData;
  }

  /**
   * Parse S&P 500 level from string format
   */
  private parseS500Level(sp500Str?: string): number {
    if (!sp500Str) return 0;
    const cleaned = sp500Str.replace(/[",]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Check if raw data contains sector information
   */
  private hasSectorData(rawData: RawMarketBreadthData): boolean {
    const sectorFields = [
      'basicMaterialsSector',
      'consumerCyclicalSector', 
      'financialServicesSector',
      'realEstateSector',
      'consumerDefensiveSector',
      'healthcareSector',
      'utilitiesSector',
      'communicationServicesSector',
      'energySector',
      'industrialsSector',
      'technologySector'
    ];

    return sectorFields.some(field => rawData[field as keyof RawMarketBreadthData] !== undefined);
  }

  /**
   * Extract sector data from raw breadth data
   */
  private extractSectorData(rawData: RawMarketBreadthData) {
    return {
      basicMaterials: rawData.basicMaterialsSector || 0,
      consumerCyclical: rawData.consumerCyclicalSector || 0,
      financialServices: rawData.financialServicesSector || 0,
      realEstate: rawData.realEstateSector || 0,
      consumerDefensive: rawData.consumerDefensiveSector || 0,
      healthcare: rawData.healthcareSector || 0,
      utilities: rawData.utilitiesSector || 0,
      communicationServices: rawData.communicationServicesSector || 0,
      energy: rawData.energySector || 0,
      industrials: rawData.industrialsSector || 0,
      technology: rawData.technologySector || 0
    };
  }
}