/**
 * Integrated Breadth Calculator Service
 * Combines BreadthScoreCalculator with EnhancedBreadthService for complete functionality
 */

import Database from 'better-sqlite3';
import { BreadthScoreCalculator } from './breadth-score-calculator';
import { EnhancedBreadthService } from '../database/services/enhanced-breadth-service';
import { BreadthConfigurationManager } from './breadth-configuration-manager';
import type { 
  BreadthCalculationConfig,
  BreadthResult,
  AlgorithmType,
  RecalculationOptions,
  PerformanceMetrics
} from '../types/breadth-calculation-config';
import type { RawMarketBreadthData } from '../types/breadth-raw-data';

export interface CalculationWithStorage extends BreadthResult {
  saved: boolean;
  database_id?: number;
}

export interface BulkCalculationResult {
  results: BreadthResult[];
  summary: {
    total_calculated: number;
    successful: number;
    failed: number;
    calculation_time: number;
    average_time_per_record: number;
  };
  performance_metrics: PerformanceMetrics;
}

/**
 * Integrated service combining calculation and data persistence
 */
export class IntegratedBreadthCalculator {
  private calculator: BreadthScoreCalculator;
  private breadthService: EnhancedBreadthService;
  private configManager: BreadthConfigurationManager;
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.breadthService = new EnhancedBreadthService(db);
    this.configManager = new BreadthConfigurationManager(db);
    this.calculator = new BreadthScoreCalculator(undefined, db);
  }

  /**
   * Calculate breadth score for new data and optionally save to database
   */
  async calculateAndStore(
    rawData: RawMarketBreadthData,
    saveToDatabase: boolean = true,
    algorithm?: AlgorithmType,
    config?: BreadthCalculationConfig
  ): Promise<CalculationWithStorage> {
    try {
      // Get historical data for momentum calculations
      const historicalData = await this.getHistoricalDataForCalculation(rawData.date);
      
      // Use specified algorithm/config or current defaults
      let useConfig = config;
      if (algorithm && !config) {
        await this.calculator.switchAlgorithm(algorithm);
        useConfig = this.calculator.getCurrentConfig();
      }

      // Calculate breadth score
      const result = this.calculator.calculate(rawData, useConfig, historicalData);

      // Save to database if requested
      let database_id: number | undefined;
      let saved = false;

      if (saveToDatabase) {
        try {
          database_id = await this.breadthService.saveRawBreadthData(rawData);
          saved = true;
        } catch (error) {
          console.error('Failed to save raw data to database:', error);
          // Continue with calculation result even if save fails
        }
      }

      return {
        ...result,
        saved,
        database_id
      };
    } catch (error) {
      throw new Error(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate breadth scores for existing database records
   */
  async calculateFromDatabase(
    startDate?: string,
    endDate?: string,
    algorithm?: AlgorithmType,
    config?: BreadthCalculationConfig
  ): Promise<BreadthResult[]> {
    try {
      // Get data from database
      const rawData = await this.getRawDataFromDatabase(startDate, endDate);
      
      if (rawData.length === 0) {
        return [];
      }

      // Use specified algorithm if provided
      if (algorithm) {
        this.calculator.switchAlgorithm(algorithm, config);
      }

      // Calculate historical breadth scores
      const results = this.calculator.calculateHistorical(rawData, {
        startDate,
        endDate,
        algorithm,
        config
      });

      return results;
    } catch (error) {
      throw new Error(`Database calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk recalculation of historical data with progress tracking
   */
  async bulkRecalculation(
    options: RecalculationOptions & {
      saveResults?: boolean;
      replaceExisting?: boolean;
    } = {}
  ): Promise<BulkCalculationResult> {
    const startTime = performance.now();
    const {
      startDate,
      endDate,
      algorithm,
      config,
      batchSize = 100,
      progressCallback,
      saveResults = false,
      replaceExisting = false
    } = options;

    try {
      // Get raw data from database
      const rawData = await this.getRawDataFromDatabase(startDate, endDate);
      
      if (rawData.length === 0) {
        return {
          results: [],
          summary: {
            total_calculated: 0,
            successful: 0,
            failed: 0,
            calculation_time: 0,
            average_time_per_record: 0
          },
          performance_metrics: {
            calculationTime: 0,
            recordsProcessed: 0,
            recordsPerSecond: 0,
            memoryUsage: 0,
            algorithm: algorithm || 'six_factor',
            timestamp: new Date().toISOString()
          }
        };
      }

      // Use specified algorithm if provided
      if (algorithm) {
        this.calculator.switchAlgorithm(algorithm, config);
      }

      let successful = 0;
      let failed = 0;
      const results: BreadthResult[] = [];

      // Enhanced progress callback
      const enhancedProgressCallback = progressCallback ? (progress: any) => {
        progressCallback({
          ...progress,
          successful,
          failed,
          percentage: (progress.completed / progress.total) * 100
        });
      } : undefined;

      // Calculate historical scores
      const calculationResults = this.calculator.calculateHistorical(rawData, {
        startDate,
        endDate,
        algorithm,
        config,
        batchSize,
        progressCallback: enhancedProgressCallback
      });

      successful = calculationResults.length;
      failed = rawData.length - successful;
      results.push(...calculationResults);

      // TODO: Implement saveResults logic if needed
      // This would involve creating a separate table for calculated scores
      // or updating the existing records with calculated values

      const totalTime = performance.now() - startTime;
      const avgTimePerRecord = successful > 0 ? totalTime / successful : 0;

      return {
        results,
        summary: {
          total_calculated: rawData.length,
          successful,
          failed,
          calculation_time: totalTime,
          average_time_per_record: avgTimePerRecord
        },
        performance_metrics: {
          calculationTime: totalTime,
          recordsProcessed: successful,
          recordsPerSecond: (successful * 1000) / totalTime,
          memoryUsage: this.estimateMemoryUsage(results),
          algorithm: algorithm || this.calculator.getCurrentConfig().algorithm,
          batchSize,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Bulk recalculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get latest breadth calculation
   */
  async getLatestCalculation(algorithm?: AlgorithmType): Promise<CalculationWithStorage | null> {
    const latestData = this.breadthService.getLatestBreadthStatus();
    if (!latestData) {
      return null;
    }

    // Convert to RawMarketBreadthData format
    const rawData: RawMarketBreadthData = {
      date: latestData.date,
      timestamp: latestData.timestamp,
      advancingIssues: latestData.advancingIssues,
      decliningIssues: latestData.decliningIssues,
      newHighs: latestData.newHighs,
      newLows: latestData.newLows,
      upVolume: latestData.upVolume,
      downVolume: latestData.downVolume,
      stocksUp4PctDaily: latestData.stocksUp4PctDaily,
      stocksDown4PctDaily: latestData.stocksDown4PctDaily,
      t2108: latestData.t2108,
      dataQualityScore: latestData.dataQualityScore
    };

    return await this.calculateAndStore(rawData, false, algorithm);
  }

  /**
   * Get available algorithms from calculator
   */
  getAvailableAlgorithms() {
    return this.calculator.getAvailableAlgorithms();
  }

  /**
   * Configuration management delegation
   */
  async createConfig(config: Omit<BreadthCalculationConfig, 'version' | 'created_at' | 'updated_at'>): Promise<string> {
    return await this.configManager.createConfig(config);
  }

  async getConfig(version: string): Promise<BreadthCalculationConfig | null> {
    return await this.configManager.getConfig(version);
  }

  async updateConfig(version: string, updates: Partial<BreadthCalculationConfig>): Promise<boolean> {
    return await this.configManager.updateConfig(version, updates);
  }

  async listConfigs(activeOnly: boolean = true): Promise<BreadthCalculationConfig[]> {
    return await this.configManager.listConfigs(activeOnly);
  }

  async setDefaultConfig(version: string): Promise<boolean> {
    return await this.configManager.setDefaultConfig(version);
  }

  /**
   * Performance monitoring
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.calculator.getPerformanceMetrics();
  }

  clearPerformanceMetrics(): void {
    this.calculator.clearPerformanceMetrics();
  }

  /**
   * Data validation
   */
  validateData(data: RawMarketBreadthData) {
    return this.calculator.validateData(data);
  }

  /**
   * Algorithm switching
   */
  switchAlgorithm(algorithmType: AlgorithmType, customConfig?: Partial<BreadthCalculationConfig>): void {
    this.calculator.switchAlgorithm(algorithmType, customConfig);
  }

  getCurrentConfig(): BreadthCalculationConfig {
    return this.calculator.getCurrentConfig();
  }

  /**
   * Helper method to get historical data for momentum calculations
   */
  private async getHistoricalDataForCalculation(currentDate: string, lookbackDays: number = 15): Promise<RawMarketBreadthData[]> {
    try {
      // Calculate start date for lookback
      const date = new Date(currentDate);
      date.setDate(date.getDate() - lookbackDays);
      const startDate = date.toISOString().split('T')[0];

      // Get raw data from database
      return await this.getRawDataFromDatabase(startDate, currentDate);
    } catch (error) {
      console.warn('Failed to get historical data for calculation:', error);
      return [];
    }
  }

  /**
   * Get raw data from database using enhanced breadth service
   */
  private async getRawDataFromDatabase(startDate?: string, endDate?: string): Promise<RawMarketBreadthData[]> {
    try {
      // Use database query to get raw data
      const start = startDate || '2007-01-01';
      const end = endDate || new Date().toISOString().split('T')[0];
      
      const query = `
        SELECT * FROM market_breadth_raw_data 
        WHERE date BETWEEN ? AND ? 
        ORDER BY date ASC
      `;
      
      const rows = this.db.prepare(query).all(start, end) as any[];
      
      return rows.map(row => this.mapDatabaseRowToRawData(row));
    } catch (error) {
      console.error('Failed to get raw data from database:', error);
      return [];
    }
  }

  /**
   * Map database row to RawMarketBreadthData
   */
  private mapDatabaseRowToRawData(row: any): RawMarketBreadthData {
    return {
      id: row.id,
      date: row.date,
      timestamp: row.timestamp,
      stocksUp4PctDaily: row.stocks_up_4pct_daily,
      stocksDown4PctDaily: row.stocks_down_4pct_daily,
      stocksUp25PctQuarterly: row.stocks_up_25pct_quarterly,
      stocksDown25PctQuarterly: row.stocks_down_25pct_quarterly,
      stocksUp25PctMonthly: row.stocks_up_25pct_monthly,
      stocksDown25PctMonthly: row.stocks_down_25pct_monthly,
      stocksUp50PctMonthly: row.stocks_up_50pct_monthly,
      stocksDown50PctMonthly: row.stocks_down_50pct_monthly,
      stocksUp13Pct34Days: row.stocks_up_13pct_34days,
      stocksDown13Pct34Days: row.stocks_down_13pct_34days,
      wordenUniverse: row.worden_universe,
      t2108: row.t2108,
      sp500Level: row.sp500_level,
      advancingIssues: row.advancing_issues,
      decliningIssues: row.declining_issues,
      newHighs: row.new_highs,
      newLows: row.new_lows,
      upVolume: row.up_volume,
      downVolume: row.down_volume,
      basicMaterialsSector: row.basic_materials_sector,
      consumerCyclicalSector: row.consumer_cyclical_sector,
      financialServicesSector: row.financial_services_sector,
      realEstateSector: row.real_estate_sector,
      consumerDefensiveSector: row.consumer_defensive_sector,
      healthcareSector: row.healthcare_sector,
      utilitiesSector: row.utilities_sector,
      communicationServicesSector: row.communication_services_sector,
      energySector: row.energy_sector,
      industrialsSector: row.industrials_sector,
      technologySector: row.technology_sector,
      sourceFile: row.source_file,
      importFormat: row.import_format,
      dataQualityScore: row.data_quality_score,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Calculate real-time score for current market data
   */
  async calculateRealTime(
    rawData: RawMarketBreadthData,
    algorithm?: AlgorithmType
  ): Promise<BreadthResult> {
    // Get recent historical data for context
    const historicalData = await this.getHistoricalDataForCalculation(rawData.date);
    
    // Use specified algorithm or current
    if (algorithm) {
      this.calculator.switchAlgorithm(algorithm);
    }

    return this.calculator.calculate(rawData, undefined, historicalData);
  }

  /**
   * Update existing data and recalculate
   */
  async updateAndRecalculate(
    date: string,
    updates: Partial<RawMarketBreadthData>,
    algorithm?: AlgorithmType
  ): Promise<CalculationWithStorage> {
    // Get existing data
    const existingData = await this.getDataByDate(date);
    if (!existingData) {
      throw new Error(`No data found for date ${date}`);
    }

    // Merge updates
    const updatedData: RawMarketBreadthData = {
      ...existingData,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Save updated data and calculate
    return await this.calculateAndStore(updatedData, true, algorithm);
  }

  /**
   * Batch calculation for multiple dates
   */
  async batchCalculation(
    dates: string[],
    algorithm?: AlgorithmType,
    config?: BreadthCalculationConfig,
    progressCallback?: (progress: { completed: number; total: number; currentDate: string }) => void
  ): Promise<BulkCalculationResult> {
    const startTime = performance.now();
    const results: BreadthResult[] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      
      try {
        const rawData = await this.getDataByDate(date);
        if (rawData) {
          const result = await this.calculateRealTime(rawData, algorithm);
          results.push(result);
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to calculate for date ${date}:`, error);
        failed++;
      }

      // Report progress
      if (progressCallback && i % 10 === 0) {
        progressCallback({
          completed: i + 1,
          total: dates.length,
          currentDate: date
        });
      }
    }

    const totalTime = performance.now() - startTime;

    return {
      results,
      summary: {
        total_calculated: dates.length,
        successful,
        failed,
        calculation_time: totalTime,
        average_time_per_record: successful > 0 ? totalTime / successful : 0
      },
      performance_metrics: {
        calculationTime: totalTime,
        recordsProcessed: successful,
        recordsPerSecond: (successful * 1000) / totalTime,
        memoryUsage: this.estimateMemoryUsage(results),
        algorithm: algorithm || this.calculator.getCurrentConfig().algorithm,
        batchSize: dates.length,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Configuration management methods
   */
  async saveCalculatorConfig(name: string): Promise<string> {
    return await this.calculator.saveCurrentConfig(name);
  }

  async loadCalculatorConfig(version: string): Promise<boolean> {
    return await this.calculator.loadConfig(version);
  }

  async exportConfigurations(versions?: string[]): Promise<string> {
    return await this.configManager.exportConfigs(versions);
  }

  async importConfigurations(configsJson: string): Promise<{ imported: number; errors: string[] }> {
    return await this.configManager.importConfigs(configsJson);
  }

  /**
   * Data access helpers
   */
  private async getDataByDate(date: string): Promise<RawMarketBreadthData | null> {
    try {
      const query = `SELECT * FROM market_breadth_raw_data WHERE date = ?`;
      const row = this.db.prepare(query).get(date) as any;
      
      return row ? this.mapDatabaseRowToRawData(row) : null;
    } catch (error) {
      console.error(`Failed to get data for date ${date}:`, error);
      return null;
    }
  }

  private async getHistoricalDataForCalculation(currentDate: string, lookbackDays: number = 15): Promise<RawMarketBreadthData[]> {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - lookbackDays);
    const startDate = date.toISOString().split('T')[0];

    return await this.getRawDataFromDatabase(startDate, currentDate);
  }

  private async getRawDataFromDatabase(startDate?: string, endDate?: string): Promise<RawMarketBreadthData[]> {
    try {
      const start = startDate || '2007-01-01';
      const end = endDate || new Date().toISOString().split('T')[0];
      
      const query = `
        SELECT * FROM market_breadth_raw_data 
        WHERE date BETWEEN ? AND ? 
        ORDER BY date ASC
      `;
      
      const rows = this.db.prepare(query).all(start, end) as any[];
      return rows.map(row => this.mapDatabaseRowToRawData(row));
    } catch (error) {
      console.error('Failed to get raw data from database:', error);
      return [];
    }
  }

  private mapDatabaseRowToRawData(row: any): RawMarketBreadthData {
    return {
      id: row.id,
      date: row.date,
      timestamp: row.timestamp,
      stocksUp4PctDaily: row.stocks_up_4pct_daily,
      stocksDown4PctDaily: row.stocks_down_4pct_daily,
      stocksUp25PctQuarterly: row.stocks_up_25pct_quarterly,
      stocksDown25PctQuarterly: row.stocks_down_25pct_quarterly,
      stocksUp25PctMonthly: row.stocks_up_25pct_monthly,
      stocksDown25PctMonthly: row.stocks_down_25pct_monthly,
      stocksUp50PctMonthly: row.stocks_up_50pct_monthly,
      stocksDown50PctMonthly: row.stocks_down_50pct_monthly,
      stocksUp13Pct34Days: row.stocks_up_13pct_34days,
      stocksDown13Pct34Days: row.stocks_down_13pct_34days,
      wordenUniverse: row.worden_universe,
      t2108: row.t2108,
      sp500Level: row.sp500_level,
      advancingIssues: row.advancing_issues,
      decliningIssues: row.declining_issues,
      newHighs: row.new_highs,
      newLows: row.new_lows,
      upVolume: row.up_volume,
      downVolume: row.down_volume,
      basicMaterialsSector: row.basic_materials_sector,
      consumerCyclicalSector: row.consumer_cyclical_sector,
      financialServicesSector: row.financial_services_sector,
      realEstateSector: row.real_estate_sector,
      consumerDefensiveSector: row.consumer_defensive_sector,
      healthcareSector: row.healthcare_sector,
      utilitiesSector: row.utilities_sector,
      communicationServicesSector: row.communication_services_sector,
      energySector: row.energy_sector,
      industrialsSector: row.industrials_sector,
      technologySector: row.technology_sector,
      sourceFile: row.source_file,
      importFormat: row.import_format,
      dataQualityScore: row.data_quality_score,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Estimate memory usage for performance tracking
   */
  private estimateMemoryUsage(results: BreadthResult[]): number {
    // Simplified memory estimation in MB
    const resultSize = JSON.stringify(results).length;
    return Math.round(resultSize / (1024 * 1024));
  }
}