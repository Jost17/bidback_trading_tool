/**
 * API Integration for Breadth Score Calculator
 * Provides REST endpoints and IPC handlers for the calculator system
 */

import type { 
  BreadthCalculationConfig,
  BreadthResult,
  AlgorithmType,
  RecalculationOptions
} from '../types/breadth-calculation-config';
import type { RawMarketBreadthData } from '../types/breadth-raw-data';
import type { EnhancedBreadthResult } from '../types/trading';
import { IntegratedBreadthCalculator, type CalculationWithStorage, type BulkCalculationResult } from './integrated-breadth-calculator';

export interface CalculationRequest {
  data: RawMarketBreadthData;
  algorithm?: AlgorithmType;
  config?: BreadthCalculationConfig;
  includeHistorical?: boolean;
  saveToDatabase?: boolean;
}

export interface BulkCalculationRequest {
  dates?: string[];
  startDate?: string;
  endDate?: string;
  algorithm?: AlgorithmType;
  config?: BreadthCalculationConfig;
  batchSize?: number;
  saveResults?: boolean;
}

export interface ConfigurationRequest {
  algorithm: AlgorithmType;
  name?: string;
  description?: string;
  weights?: Partial<BreadthCalculationConfig['weights']>;
  scaling?: Partial<BreadthCalculationConfig['scaling']>;
  indicators?: Partial<BreadthCalculationConfig['indicators']>;
  market_conditions?: Partial<BreadthCalculationConfig['market_conditions']>;
  custom_formula?: string;
  custom_parameters?: Record<string, number>;
}

/**
 * API Controller for Breadth Calculator operations
 */
export class BreadthCalculatorAPI {
  private calculator: IntegratedBreadthCalculator;

  constructor(calculator: IntegratedBreadthCalculator) {
    this.calculator = calculator;
  }

  /**
   * Calculate breadth score for single data point
   */
  async calculateSingle(request: CalculationRequest): Promise<CalculationWithStorage> {
    try {
      const {
        data,
        algorithm,
        config,
        saveToDatabase = false
      } = request;

      // Validate input data
      const validation = this.calculator.validateData(data);
      if (!validation.isValid) {
        throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
      }

      return await this.calculator.calculateAndStore(data, saveToDatabase, algorithm, config);
    } catch (error) {
      throw new Error(`Single calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate breadth scores for multiple dates
   */
  async calculateBulk(request: BulkCalculationRequest): Promise<BulkCalculationResult> {
    try {
      const {
        dates,
        startDate,
        endDate,
        algorithm,
        config,
        batchSize = 100,
        saveResults = false
      } = request;

      if (dates) {
        // Calculate for specific dates
        return await this.calculator.batchCalculation(dates, algorithm, config);
      } else {
        // Calculate for date range
        return await this.calculator.bulkRecalculation({
          startDate,
          endDate,
          algorithm,
          config,
          batchSize,
          saveResults
        });
      }
    } catch (error) {
      throw new Error(`Bulk calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get real-time calculation for latest data
   */
  async calculateRealTime(algorithm?: AlgorithmType): Promise<CalculationWithStorage | null> {
    try {
      return await this.calculator.getLatestCalculation(algorithm);
    } catch (error) {
      throw new Error(`Real-time calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate from existing database records
   */
  async calculateFromDatabase(
    startDate?: string,
    endDate?: string,
    algorithm?: AlgorithmType,
    config?: BreadthCalculationConfig
  ): Promise<BreadthResult[]> {
    try {
      return await this.calculator.calculateFromDatabase(startDate, endDate, algorithm, config);
    } catch (error) {
      throw new Error(`Database calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Algorithm management endpoints
   */
  async getAvailableAlgorithms() {
    return {
      success: true,
      algorithms: this.calculator.getAvailableAlgorithms()
    };
  }

  async switchAlgorithm(algorithm: AlgorithmType, customConfig?: Partial<BreadthCalculationConfig>) {
    try {
      this.calculator.switchAlgorithm(algorithm, customConfig);
      return {
        success: true,
        current_algorithm: algorithm,
        config: this.calculator.getCurrentConfig()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getCurrentConfig() {
    return {
      success: true,
      config: this.calculator.getCurrentConfig()
    };
  }

  /**
   * Configuration management endpoints
   */
  async createConfiguration(request: ConfigurationRequest) {
    try {
      const config: Omit<BreadthCalculationConfig, 'version' | 'created_at' | 'updated_at'> = {
        algorithm: request.algorithm,
        name: request.name || `${request.algorithm} Configuration`,
        description: request.description || `Custom configuration for ${request.algorithm} algorithm`,
        weights: {
          primary_indicators: 0.40,
          secondary_indicators: 0.35,
          reference_data: 0.25,
          sector_data: 0.0,
          ...request.weights
        },
        scaling: {
          min_score: 0,
          max_score: 100,
          normalization: 'linear',
          confidence_threshold: 0.7,
          ...request.scaling
        },
        indicators: {
          t2108_threshold: 50,
          sector_count_threshold: 6,
          volatility_adjustment: false,
          momentum_lookback_days: 5,
          ratio_smoothing: true,
          ...request.indicators
        },
        market_conditions: {
          strong_bull_threshold: 75,
          bull_threshold: 60,
          bear_threshold: 40,
          strong_bear_threshold: 25,
          trend_strength_multiplier: 2.0,
          ...request.market_conditions
        },
        custom_formula: request.custom_formula,
        custom_parameters: request.custom_parameters,
        is_active: true,
        is_default: false
      };

      const version = await this.calculator.createConfig(config);
      
      return {
        success: true,
        version,
        config: await this.calculator.getConfig(version)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getConfiguration(version: string) {
    try {
      const config = await this.calculator.getConfig(version);
      if (!config) {
        return {
          success: false,
          error: 'Configuration not found'
        };
      }

      return {
        success: true,
        config
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async listConfigurations(activeOnly: boolean = true) {
    try {
      const configs = await this.calculator.listConfigs();
      return {
        success: true,
        configs: activeOnly ? configs.filter((c: any) => c.is_active) : configs
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateConfiguration(version: string, updates: Partial<BreadthCalculationConfig>) {
    try {
      const success = await this.calculator.updateConfig(version, updates);
      return {
        success,
        config: success ? await this.calculator.getConfig(version) : null
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async setDefaultConfiguration(version: string) {
    try {
      const success = await this.calculator.setDefaultConfig(version);
      return { success };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Performance and monitoring endpoints
   */
  async getPerformanceMetrics() {
    return {
      success: true,
      metrics: this.calculator.getPerformanceMetrics()
    };
  }

  async clearPerformanceMetrics() {
    this.calculator.clearPerformanceMetrics();
    return { success: true };
  }

  /**
   * Data validation endpoints
   */
  async validateData(data: RawMarketBreadthData) {
    try {
      const validation = this.calculator.validateData(data);
      return {
        success: true,
        validation
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Import/Export endpoints
   */
  async exportConfigurations(versions?: string[]) {
    try {
      const configsJson = await this.calculator.exportConfigurations(versions);
      return {
        success: true,
        data: configsJson,
        filename: `breadth-configs-${new Date().toISOString().split('T')[0]}.json`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async importConfigurations(configsJson: string) {
    try {
      const result = await this.calculator.importConfigurations(configsJson);
      return {
        success: result.imported > 0,
        imported: result.imported,
        errors: result.errors
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Utility method to convert BreadthResult to legacy format for compatibility
   */
  convertToLegacyFormat(result: BreadthResult): EnhancedBreadthResult {
    return {
      date: result.date,
      score: result.score,
      normalizedScore: result.normalizedScore,
      confidence: result.confidence,
      components: result.components,
      market_condition: result.market_condition,
      metadata: result.metadata
    };
  }

  /**
   * Health check endpoint
   */
  async healthCheck() {
    try {
      const algorithms = this.calculator.getAvailableAlgorithms();
      const currentConfig = this.calculator.getCurrentConfig();
      const metrics = this.calculator.getPerformanceMetrics();

      return {
        success: true,
        status: 'healthy',
        algorithms_available: algorithms.length,
        current_algorithm: currentConfig.algorithm,
        recent_calculations: metrics.length,
        version: '1.0.0'
      };
    } catch (error) {
      return {
        success: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}