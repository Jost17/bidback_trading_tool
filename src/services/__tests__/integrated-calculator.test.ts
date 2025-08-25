/**
 * Integration tests for the complete Breadth Calculator system
 * Tests the full integration between calculator, database, and API layers
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { IntegratedBreadthCalculator } from '../integrated-breadth-calculator';
import { BreadthCalculatorAPI } from '../breadth-calculator-api';
import type { RawMarketBreadthData } from '../../types/breadth-raw-data';

describe('Integrated Breadth Calculator System', () => {
  let db: Database.Database;
  let integratedCalculator: IntegratedBreadthCalculator;
  let calculatorAPI: BreadthCalculatorAPI;

  const sampleData: RawMarketBreadthData = {
    date: '2025-08-25',
    timestamp: '2025-08-25T10:00:00Z',
    advancingIssues: 1200,
    decliningIssues: 800,
    newHighs: 150,
    newLows: 50,
    upVolume: 2500000000,
    downVolume: 1500000000,
    stocksUp4PctDaily: 180,
    stocksDown4PctDaily: 120,
    stocksUp25PctQuarterly: 450,
    stocksDown25PctQuarterly: 200,
    t2108: 65,
    sp500Level: '5,847',
    wordenUniverse: 2500,
    basicMaterialsSector: 75,
    consumerCyclicalSector: 80,
    financialServicesSector: 85,
    technologySector: 92,
    dataQualityScore: 95
  };

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    
    // Initialize integrated system
    integratedCalculator = new IntegratedBreadthCalculator(db);
    calculatorAPI = new BreadthCalculatorAPI(integratedCalculator);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Full System Integration', () => {
    test('should initialize complete system successfully', async () => {
      const healthCheck = await calculatorAPI.healthCheck();
      expect(healthCheck.success).toBe(true);
      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.algorithms_available).toBe(4);
    });

    test('should validate data through API layer', async () => {
      const response = await calculatorAPI.validateData(sampleData);
      expect(response.success).toBe(true);
      expect(response.validation.isValid).toBe(true);
      expect(response.validation.score).toBeGreaterThan(80);
    });

    test('should perform single calculation through API', async () => {
      const response = await calculatorAPI.calculateSingle({
        data: sampleData,
        algorithm: 'six_factor',
        saveToDatabase: true
      });

      expect(response.date).toBe('2025-08-25');
      expect(response.score).toBeGreaterThan(0);
      expect(response.score).toBeLessThanOrEqual(100);
      expect(response.saved).toBe(true);
      expect(response.database_id).toBeDefined();
      expect(response.metadata.algorithm_used).toBe('6-Factor Breadth Score');
    });

    test('should calculate from database records', async () => {
      // First, save some data
      await calculatorAPI.calculateSingle({
        data: sampleData,
        saveToDatabase: true
      });

      // Add another data point
      const additionalData = {
        ...sampleData,
        date: '2025-08-24',
        advancingIssues: 1100,
        decliningIssues: 900
      };

      await calculatorAPI.calculateSingle({
        data: additionalData,
        saveToDatabase: true
      });

      // Calculate from database
      const results = await calculatorAPI.calculateFromDatabase('2025-08-24', '2025-08-25');
      expect(results.length).toBe(2);
      expect(results[0].date).toBe('2025-08-24');
      expect(results[1].date).toBe('2025-08-25');
    });
  });

  describe('Algorithm Switching Integration', () => {
    test('should switch algorithms and maintain data consistency', async () => {
      // Calculate with six-factor
      const sixFactorResult = await calculatorAPI.calculateSingle({
        data: sampleData,
        algorithm: 'six_factor'
      });

      // Switch to normalized algorithm
      const switchResponse = await calculatorAPI.switchAlgorithm('normalized');
      expect(switchResponse.success).toBe(true);
      expect(switchResponse.current_algorithm).toBe('normalized');

      // Calculate with normalized
      const normalizedResult = await calculatorAPI.calculateSingle({
        data: sampleData,
        algorithm: 'normalized'
      });

      // Results should be different but both valid
      expect(sixFactorResult.metadata.algorithm_used).toBe('6-Factor Breadth Score');
      expect(normalizedResult.metadata.algorithm_used).toBe('Normalized Statistical Score');
      expect(sixFactorResult.score).not.toBe(normalizedResult.score);
    });

    test('should handle sector-weighted algorithm with sector data', async () => {
      const response = await calculatorAPI.calculateSingle({
        data: sampleData,
        algorithm: 'sector_weighted'
      });

      expect(response.metadata.algorithm_used).toBe('Sector-Weighted Analysis');
      expect(response.components.sector_score).toBeGreaterThan(0);
    });

    test('should execute custom formula algorithm', async () => {
      // Create custom configuration
      const customConfigResponse = await calculatorAPI.createConfiguration({
        algorithm: 'custom',
        name: 'Test Custom Formula',
        custom_formula: '(primary * 0.6) + (reference * 0.4)',
        custom_parameters: { test_param: 1.5 }
      });

      expect(customConfigResponse.success).toBe(true);

      // Calculate with custom algorithm
      const result = await calculatorAPI.calculateSingle({
        data: sampleData,
        algorithm: 'custom'
      });

      expect(result.metadata.algorithm_used).toBe('Custom Formula');
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management Integration', () => {
    test('should create and manage configurations', async () => {
      const createResponse = await calculatorAPI.createConfiguration({
        algorithm: 'six_factor',
        name: 'Test Configuration',
        description: 'Test configuration for integration testing',
        weights: {
          primary_indicators: 0.5,
          secondary_indicators: 0.3,
          reference_data: 0.2,
          sector_data: 0.0
        }
      });

      expect(createResponse.success).toBe(true);
      expect(createResponse.version).toBeDefined();

      // Get the created configuration
      const getResponse = await calculatorAPI.getConfiguration(createResponse.version!);
      expect(getResponse.success).toBe(true);
      expect(getResponse.config?.name).toBe('Test Configuration');
      expect(getResponse.config?.weights.primary_indicators).toBe(0.5);

      // Update the configuration
      const updateResponse = await calculatorAPI.updateConfiguration(createResponse.version!, {
        description: 'Updated test configuration'
      });

      expect(updateResponse.success).toBe(true);
      expect(updateResponse.config?.description).toBe('Updated test configuration');

      // List configurations
      const listResponse = await calculatorAPI.listConfigurations();
      expect(listResponse.success).toBe(true);
      expect(listResponse.configs.length).toBeGreaterThan(0);
      expect(listResponse.configs.some(c => c.version === createResponse.version)).toBe(true);
    });

    test('should handle configuration export/import', async () => {
      // Create a test configuration
      const createResponse = await calculatorAPI.createConfiguration({
        algorithm: 'normalized',
        name: 'Export Test Config',
        weights: {
          primary_indicators: 0.4,
          secondary_indicators: 0.4,
          reference_data: 0.2,
          sector_data: 0.0
        }
      });

      expect(createResponse.success).toBe(true);

      // Export configurations
      const exportResponse = await calculatorAPI.exportConfigurations([createResponse.version!]);
      expect(exportResponse.success).toBe(true);
      expect(exportResponse.data).toBeDefined();

      // Import configurations (would create new versions)
      const importResponse = await calculatorAPI.importConfigurations(exportResponse.data!);
      expect(importResponse.success).toBe(true);
      expect(importResponse.imported).toBeGreaterThan(0);
    });
  });

  describe('Performance and Error Handling', () => {
    test('should track performance metrics', async () => {
      // Perform multiple calculations
      for (let i = 0; i < 5; i++) {
        await calculatorAPI.calculateSingle({
          data: {
            ...sampleData,
            date: `2025-08-${String(20 + i).padStart(2, '0')}`
          }
        });
      }

      // Get performance metrics
      const metricsResponse = await calculatorAPI.getPerformanceMetrics();
      expect(metricsResponse.success).toBe(true);
      expect(metricsResponse.metrics.length).toBeGreaterThan(0);

      const metrics = metricsResponse.metrics;
      expect(metrics.every(m => m.calculationTime > 0)).toBe(true);
      expect(metrics.every(m => m.recordsProcessed > 0)).toBe(true);

      // Clear metrics
      const clearResponse = await calculatorAPI.clearPerformanceMetrics();
      expect(clearResponse.success).toBe(true);

      // Verify metrics cleared
      const clearedMetricsResponse = await calculatorAPI.getPerformanceMetrics();
      expect(clearedMetricsResponse.metrics).toHaveLength(0);
    });

    test('should handle invalid data gracefully', async () => {
      const invalidData: RawMarketBreadthData = {
        date: 'invalid-date'
        // Missing required fields
      };

      try {
        await calculatorAPI.calculateSingle({
          data: invalidData
        });
        expect.fail('Should have thrown error for invalid data');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error instanceof Error ? error.message : '').toContain('validation failed');
      }
    });

    test('should handle missing algorithm gracefully', async () => {
      const switchResponse = await calculatorAPI.switchAlgorithm('invalid_algorithm' as any);
      expect(switchResponse.success).toBe(false);
      expect(switchResponse.error).toBeDefined();
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle complete trading day workflow', async () => {
      // 1. Validate morning data
      const validation = await calculatorAPI.validateData(sampleData);
      expect(validation.success).toBe(true);

      // 2. Calculate and store morning breadth
      const morningCalculation = await calculatorAPI.calculateSingle({
        data: sampleData,
        algorithm: 'six_factor',
        saveToDatabase: true
      });
      expect(morningCalculation.saved).toBe(true);

      // 3. Update data with afternoon values
      const afternoonData = {
        ...sampleData,
        advancingIssues: 1400,
        decliningIssues: 600,
        newHighs: 200,
        newLows: 30,
        t2108: 72
      };

      const afternoonCalculation = await calculatorAPI.calculateSingle({
        data: afternoonData,
        algorithm: 'six_factor',
        saveToDatabase: true
      });

      // 4. Compare results
      expect(afternoonCalculation.score).toBeGreaterThan(morningCalculation.score);
      expect(afternoonCalculation.market_condition.phase).toBeDefined();

      // 5. Get real-time calculation
      const realTimeResult = await calculatorAPI.calculateRealTime('six_factor');
      expect(realTimeResult).toBeDefined();
    });

    test('should handle multi-algorithm comparison', async () => {
      const algorithms: AlgorithmType[] = ['six_factor', 'normalized', 'sector_weighted'];
      const results: { [key: string]: any } = {};

      // Calculate with each algorithm
      for (const algorithm of algorithms) {
        const result = await calculatorAPI.calculateSingle({
          data: sampleData,
          algorithm
        });
        results[algorithm] = result;
      }

      // Verify all calculations completed
      expect(Object.keys(results)).toHaveLength(3);
      
      // Each algorithm should produce different scores
      const scores = Object.values(results).map(r => r.score);
      const uniqueScores = new Set(scores);
      expect(uniqueScores.size).toBeGreaterThan(1); // At least some variation

      // All results should be valid
      Object.values(results).forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });

    test('should handle bulk historical recalculation', async () => {
      // Prepare historical data
      const historicalData = Array.from({ length: 10 }, (_, i) => ({
        ...sampleData,
        date: `2025-08-${String(16 + i).padStart(2, '0')}`,
        advancingIssues: 1000 + (i * 50),
        decliningIssues: 1000 - (i * 30),
        t2108: 50 + (i * 2)
      }));

      // Save all historical data
      for (const data of historicalData) {
        await calculatorAPI.calculateSingle({
          data,
          saveToDatabase: true
        });
      }

      // Perform bulk recalculation
      const bulkResult = await calculatorAPI.calculateBulk({
        startDate: '2025-08-16',
        endDate: '2025-08-25',
        algorithm: 'six_factor',
        batchSize: 5
      });

      expect(bulkResult.summary.total_calculated).toBe(10);
      expect(bulkResult.summary.successful).toBe(10);
      expect(bulkResult.summary.failed).toBe(0);
      expect(bulkResult.results).toHaveLength(10);
      expect(bulkResult.performance_metrics.recordsProcessed).toBe(10);
      expect(bulkResult.performance_metrics.calculationTime).toBeGreaterThan(0);
    });
  });

  describe('Configuration Persistence Integration', () => {
    test('should persist and retrieve configurations', async () => {
      // Create custom configuration
      const configResponse = await calculatorAPI.createConfiguration({
        algorithm: 'six_factor',
        name: 'Integration Test Config',
        description: 'Configuration for integration testing',
        weights: {
          primary_indicators: 0.45,
          secondary_indicators: 0.35,
          reference_data: 0.20,
          sector_data: 0.0
        },
        indicators: {
          t2108_threshold: 55,
          sector_count_threshold: 7,
          volatility_adjustment: true,
          momentum_lookback_days: 7,
          ratio_smoothing: true
        }
      });

      expect(configResponse.success).toBe(true);
      const version = configResponse.version!;

      // Use the configuration for calculation
      const result = await calculatorAPI.calculateSingle({
        data: sampleData,
        algorithm: 'six_factor'
      });

      expect(result.metadata.config_version).toBeDefined();

      // Verify configuration persisted
      const savedConfig = await calculatorAPI.getConfiguration(version);
      expect(savedConfig.success).toBe(true);
      expect(savedConfig.config?.name).toBe('Integration Test Config');
      expect(savedConfig.config?.weights.primary_indicators).toBe(0.45);
    });

    test('should handle default configuration management', async () => {
      // Create a new configuration
      const configResponse = await calculatorAPI.createConfiguration({
        algorithm: 'normalized',
        name: 'New Default Config',
        weights: {
          primary_indicators: 0.4,
          secondary_indicators: 0.3,
          reference_data: 0.2,
          sector_data: 0.1
        }
      });

      expect(configResponse.success).toBe(true);
      const version = configResponse.version!;

      // Set as default
      const setDefaultResponse = await calculatorAPI.setDefaultConfiguration(version);
      expect(setDefaultResponse.success).toBe(true);

      // Verify it's now default
      const configsList = await calculatorAPI.listConfigurations();
      expect(configsList.success).toBe(true);
      
      const defaultConfig = configsList.configs.find(c => c.is_default && c.algorithm === 'normalized');
      expect(defaultConfig).toBeDefined();
      expect(defaultConfig?.version).toBe(version);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    test('should handle database connection issues gracefully', async () => {
      // Close database to simulate connection issue
      db.close();

      try {
        await calculatorAPI.calculateSingle({
          data: sampleData,
          saveToDatabase: true
        });
        expect.fail('Should have thrown error for closed database');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle incomplete data sets', async () => {
      const incompleteData: RawMarketBreadthData = {
        date: '2025-08-25',
        advancingIssues: 1200,
        decliningIssues: 800
        // Missing most optional fields
      };

      const result = await calculatorAPI.calculateSingle({
        data: incompleteData,
        algorithm: 'six_factor'
      });

      expect(result.score).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.8); // Lower confidence for incomplete data
      expect(result.metadata.missing_indicators.length).toBeGreaterThan(0);
      expect(result.metadata.warnings?.length).toBeGreaterThan(0);
    });

    test('should handle extreme market conditions', async () => {
      // Test extreme bull market
      const extremeBullData: RawMarketBreadthData = {
        date: '2025-08-25',
        advancingIssues: 1900,
        decliningIssues: 100,
        newHighs: 400,
        newLows: 5,
        upVolume: 5000000000,
        downVolume: 200000000,
        stocksUp4PctDaily: 380,
        stocksDown4PctDaily: 20,
        t2108: 95
      };

      const bullResult = await calculatorAPI.calculateSingle({
        data: extremeBullData,
        algorithm: 'six_factor'
      });

      expect(bullResult.score).toBeGreaterThan(80);
      expect(bullResult.market_condition.phase).toBe('BULL');
      expect(['STRONG', 'EXTREME']).toContain(bullResult.market_condition.strength);

      // Test extreme bear market
      const extremeBearData: RawMarketBreadthData = {
        date: '2025-08-25',
        advancingIssues: 100,
        decliningIssues: 1900,
        newHighs: 5,
        newLows: 400,
        upVolume: 200000000,
        downVolume: 5000000000,
        stocksUp4PctDaily: 20,
        stocksDown4PctDaily: 380,
        t2108: 5
      };

      const bearResult = await calculatorAPI.calculateSingle({
        data: extremeBearData,
        algorithm: 'six_factor'
      });

      expect(bearResult.score).toBeLessThan(20);
      expect(bearResult.market_condition.phase).toBe('BEAR');
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain performance with multiple rapid calculations', async () => {
      const calculations = [];
      const startTime = performance.now();

      // Perform 50 rapid calculations
      for (let i = 0; i < 50; i++) {
        const testData = {
          ...sampleData,
          date: `2025-08-${String(25).padStart(2, '0')}`,
          advancingIssues: 1000 + Math.random() * 1000,
          decliningIssues: 1000 + Math.random() * 1000,
          t2108: 30 + Math.random() * 40
        };

        calculations.push(calculatorAPI.calculateSingle({
          data: testData,
          algorithm: 'six_factor'
        }));
      }

      const results = await Promise.all(calculations);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerCalculation = totalTime / 50;

      expect(results).toHaveLength(50);
      expect(results.every(r => r.score >= 0 && r.score <= 100)).toBe(true);
      expect(avgTimePerCalculation).toBeLessThan(100); // Average under 100ms
      
      console.log(`Performance test: ${avgTimePerCalculation.toFixed(2)}ms average per calculation`);
    });
  });
});

// Helper function to simulate realistic market data
function generateRealisticMarketData(date: string, trend: 'bull' | 'bear' | 'neutral'): RawMarketBreadthData {
  const base = {
    date,
    timestamp: new Date().toISOString(),
    wordenUniverse: 2500,
    sp500Level: '5,847'
  };

  switch (trend) {
    case 'bull':
      return {
        ...base,
        advancingIssues: 1400 + Math.random() * 400,
        decliningIssues: 400 + Math.random() * 300,
        newHighs: 180 + Math.random() * 120,
        newLows: 20 + Math.random() * 40,
        upVolume: 3000000000 + Math.random() * 2000000000,
        downVolume: 800000000 + Math.random() * 700000000,
        stocksUp4PctDaily: 220 + Math.random() * 80,
        stocksDown4PctDaily: 60 + Math.random() * 60,
        t2108: 70 + Math.random() * 25
      };

    case 'bear':
      return {
        ...base,
        advancingIssues: 400 + Math.random() * 300,
        decliningIssues: 1400 + Math.random() * 400,
        newHighs: 20 + Math.random() * 40,
        newLows: 180 + Math.random() * 120,
        upVolume: 800000000 + Math.random() * 700000000,
        downVolume: 3000000000 + Math.random() * 2000000000,
        stocksUp4PctDaily: 60 + Math.random() * 60,
        stocksDown4PctDaily: 220 + Math.random() * 80,
        t2108: 15 + Math.random() * 25
      };

    default: // neutral
      return {
        ...base,
        advancingIssues: 900 + Math.random() * 200,
        decliningIssues: 900 + Math.random() * 200,
        newHighs: 80 + Math.random() * 60,
        newLows: 80 + Math.random() * 60,
        upVolume: 1800000000 + Math.random() * 800000000,
        downVolume: 1800000000 + Math.random() * 800000000,
        stocksUp4PctDaily: 120 + Math.random() * 60,
        stocksDown4PctDaily: 120 + Math.random() * 60,
        t2108: 45 + Math.random() * 15
      };
  }
}