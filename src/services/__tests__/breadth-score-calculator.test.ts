/**
 * Comprehensive tests for Breadth Score Calculator system
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { BreadthScoreCalculator } from '../breadth-score-calculator';
import { IntegratedBreadthCalculator } from '../integrated-breadth-calculator';
import type { RawMarketBreadthData, BreadthCalculationConfig } from '../../types';

describe('BreadthScoreCalculator', () => {
  let calculator: BreadthScoreCalculator;
  let db: Database.Database;
  let integratedCalculator: IntegratedBreadthCalculator;

  const sampleRawData: RawMarketBreadthData = {
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
    dataQualityScore: 95
  };

  const sampleHistoricalData: RawMarketBreadthData[] = [
    {
      date: '2025-08-24',
      advancingIssues: 1100,
      decliningIssues: 900,
      stocksUp4PctDaily: 160,
      stocksDown4PctDaily: 140,
      t2108: 62
    },
    {
      date: '2025-08-23',
      advancingIssues: 1050,
      decliningIssues: 950,
      stocksUp4PctDaily: 155,
      stocksDown4PctDaily: 145,
      t2108: 58
    },
    {
      date: '2025-08-22',
      advancingIssues: 1300,
      decliningIssues: 700,
      stocksUp4PctDaily: 200,
      stocksDown4PctDaily: 100,
      t2108: 70
    },
    {
      date: '2025-08-21',
      advancingIssues: 1250,
      decliningIssues: 750,
      stocksUp4PctDaily: 190,
      stocksDown4PctDaily: 110,
      t2108: 68
    }
  ];

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    
    // Initialize calculator
    calculator = new BreadthScoreCalculator();
    integratedCalculator = new IntegratedBreadthCalculator(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Basic Calculator Functionality', () => {
    test('should initialize with default six-factor algorithm', () => {
      const config = calculator.getCurrentConfig();
      expect(config.algorithm).toBe('six_factor');
      expect(config.name).toBe('6-Factor Breadth Score');
    });

    test('should list available algorithms', () => {
      const algorithms = calculator.getAvailableAlgorithms();
      expect(algorithms).toHaveLength(4);
      expect(algorithms.map(a => a.type)).toEqual(['six_factor', 'normalized', 'sector_weighted', 'custom']);
    });

    test('should calculate breadth score with six-factor algorithm', () => {
      const result = calculator.calculate(sampleRawData);
      
      expect(result.date).toBe('2025-08-25');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.normalizedScore).toBeGreaterThan(0);
      expect(result.normalizedScore).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      
      // Check components
      expect(result.components.primary_score).toBeGreaterThan(0);
      expect(result.components.secondary_score).toBeGreaterThan(0);
      expect(result.components.reference_score).toBeGreaterThan(0);
      
      // Check market condition
      expect(['BULL', 'BEAR', 'NEUTRAL', 'TRANSITION']).toContain(result.market_condition.phase);
      expect(['WEAK', 'MODERATE', 'STRONG', 'EXTREME']).toContain(result.market_condition.strength);
      expect(['UP', 'DOWN', 'SIDEWAYS']).toContain(result.market_condition.trend_direction);
      
      // Check metadata
      expect(result.metadata.algorithm_used).toBe('6-Factor Breadth Score');
      expect(result.metadata.calculation_time).toBeGreaterThan(0);
      expect(result.metadata.data_quality).toBe(95);
    });

    test('should calculate breadth score with historical data for momentum', () => {
      const result = calculator.calculate(sampleRawData, undefined, sampleHistoricalData);
      
      expect(result.score).toBeGreaterThan(0);
      expect(result.metadata.calculation_time).toBeGreaterThan(0);
      
      // Momentum should be calculated when historical data is provided
      // This should result in a different score than without historical data
      const resultWithoutHistory = calculator.calculate(sampleRawData);
      expect(result.score).not.toBe(resultWithoutHistory.score);
    });
  });

  describe('Algorithm Switching', () => {
    test('should switch to normalized algorithm', () => {
      calculator.switchAlgorithm('normalized');
      const config = calculator.getCurrentConfig();
      expect(config.algorithm).toBe('normalized');
      expect(config.name).toBe('Normalized Statistical Score');
    });

    test('should switch to sector-weighted algorithm', () => {
      calculator.switchAlgorithm('sector_weighted');
      const config = calculator.getCurrentConfig();
      expect(config.algorithm).toBe('sector_weighted');
      expect(config.name).toBe('Sector-Weighted Analysis');
    });

    test('should switch to custom algorithm', () => {
      calculator.switchAlgorithm('custom');
      const config = calculator.getCurrentConfig();
      expect(config.algorithm).toBe('custom');
      expect(config.name).toBe('Custom Formula');
    });

    test('should throw error for invalid algorithm', () => {
      expect(() => {
        calculator.switchAlgorithm('invalid_algorithm' as any);
      }).toThrow('Algorithm invalid_algorithm not available');
    });
  });

  describe('Data Validation', () => {
    test('should validate complete data successfully', () => {
      const validation = calculator.validateData(sampleRawData);
      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(80);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect missing required fields', () => {
      const incompleteData: RawMarketBreadthData = {
        date: '2025-08-25'
        // Missing required advancing/declining issues
      };

      const validation = calculator.validateData(incompleteData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should detect invalid date format', () => {
      const invalidData: RawMarketBreadthData = {
        ...sampleRawData,
        date: '08/25/2025' // Invalid format
      };

      const validation = calculator.validateData(invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('date'))).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration successfully', () => {
      const updates: Partial<BreadthCalculationConfig> = {
        weights: {
          primary_indicators: 0.5,
          secondary_indicators: 0.3,
          reference_data: 0.2,
          sector_data: 0.0
        }
      };

      calculator.updateConfig(updates);
      const config = calculator.getCurrentConfig();
      expect(config.weights.primary_indicators).toBe(0.5);
      expect(config.weights.secondary_indicators).toBe(0.3);
    });

    test('should validate configuration updates', () => {
      const invalidUpdates: Partial<BreadthCalculationConfig> = {
        weights: {
          primary_indicators: 1.5, // Invalid - exceeds 1.0
          secondary_indicators: 0.5,
          reference_data: 0.3,
          sector_data: 0.0
        }
      };

      expect(() => {
        calculator.updateConfig(invalidUpdates);
      }).toThrow('Configuration validation failed');
    });
  });

  describe('Historical Calculations', () => {
    test('should calculate historical breadth scores', () => {
      const results = calculator.calculateHistorical(sampleHistoricalData);
      
      expect(results).toHaveLength(sampleHistoricalData.length);
      results.forEach((result, index) => {
        expect(result.date).toBe(sampleHistoricalData[index].date);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    test('should handle empty historical data gracefully', () => {
      const results = calculator.calculateHistorical([]);
      expect(results).toHaveLength(0);
    });

    test('should filter by date range', () => {
      const results = calculator.calculateHistorical(sampleHistoricalData, {
        startDate: '2025-08-23',
        endDate: '2025-08-24'
      });
      
      expect(results).toHaveLength(2);
      expect(results[0].date).toBe('2025-08-23');
      expect(results[1].date).toBe('2025-08-24');
    });
  });

  describe('Data Standardization', () => {
    test('should standardize raw data correctly', () => {
      const standardized = calculator.standardizeData(sampleRawData);
      
      expect(standardized.date).toBe('2025-08-25');
      expect(standardized.stocksUp4Pct).toBe(180);
      expect(standardized.stocksDown4Pct).toBe(120);
      expect(standardized.advancingIssues).toBe(1200);
      expect(standardized.decliningIssues).toBe(800);
      expect(standardized.t2108).toBe(65);
      expect(standardized.sp500Level).toBe(5847);
      expect(standardized.dataQuality).toBeGreaterThan(0);
    });

    test('should handle missing optional fields', () => {
      const minimalData: RawMarketBreadthData = {
        date: '2025-08-25',
        advancingIssues: 1200,
        decliningIssues: 800
      };

      const standardized = calculator.standardizeData(minimalData);
      expect(standardized.date).toBe('2025-08-25');
      expect(standardized.stocksUp4Pct).toBe(1200); // Fallback to advancing issues
      expect(standardized.newHighs).toBe(0); // Default value
      expect(standardized.missingFields.length).toBeGreaterThan(0);
    });

    test('should parse S&P 500 levels correctly', () => {
      const testCases = [
        { input: '5,847', expected: 5847 },
        { input: '5847', expected: 5847 },
        { input: '"5,847"', expected: 5847 },
        { input: undefined, expected: 0 },
        { input: 'invalid', expected: 0 }
      ];

      testCases.forEach(({ input, expected }) => {
        const data: RawMarketBreadthData = {
          ...sampleRawData,
          sp500Level: input
        };
        const standardized = calculator.standardizeData(data);
        expect(standardized.sp500Level).toBe(expected);
      });
    });
  });

  describe('Performance Metrics', () => {
    test('should track performance metrics', () => {
      // Perform some calculations
      calculator.calculate(sampleRawData);
      calculator.calculate(sampleRawData);
      
      const metrics = calculator.getPerformanceMetrics();
      expect(metrics).toHaveLength(2);
      
      metrics.forEach(metric => {
        expect(metric.calculationTime).toBeGreaterThan(0);
        expect(metric.recordsProcessed).toBe(1);
        expect(metric.algorithm).toBe('six_factor');
        expect(metric.timestamp).toBeDefined();
      });
    });

    test('should clear performance metrics', () => {
      calculator.calculate(sampleRawData);
      expect(calculator.getPerformanceMetrics()).toHaveLength(1);
      
      calculator.clearPerformanceMetrics();
      expect(calculator.getPerformanceMetrics()).toHaveLength(0);
    });
  });

  describe('Algorithm-Specific Tests', () => {
    test('six-factor algorithm should calculate all 6 factors', () => {
      calculator.switchAlgorithm('six_factor');
      const result = calculator.calculate(sampleRawData, undefined, sampleHistoricalData);
      
      // Should have calculated primary, secondary, and reference components
      expect(result.components.primary_score).toBeGreaterThan(0);
      expect(result.components.secondary_score).toBeGreaterThan(0);
      expect(result.components.reference_score).toBeGreaterThan(0);
      expect(result.components.sector_score).toBe(0); // Six-factor doesn't use sectors
    });

    test('normalized algorithm should handle statistical calculations', () => {
      calculator.switchAlgorithm('normalized');
      const result = calculator.calculate(sampleRawData, undefined, sampleHistoricalData);
      
      expect(result.metadata.algorithm_used).toBe('Normalized Statistical Score');
      expect(result.confidence).toBeGreaterThan(0);
      
      // Normalized algorithm should handle edge cases better
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    test('sector-weighted algorithm should emphasize sector data', () => {
      const dataWithSectors: RawMarketBreadthData = {
        ...sampleRawData,
        basicMaterialsSector: 75,
        consumerCyclicalSector: 80,
        financialServicesSector: 85,
        realEstateSector: 70,
        consumerDefensiveSector: 65,
        healthcareSector: 90,
        utilitiesSector: 60,
        communicationServicesSector: 85,
        energySector: 55,
        industrialsSector: 78,
        technologySector: 92
      };

      calculator.switchAlgorithm('sector_weighted');
      const result = calculator.calculate(dataWithSectors, undefined, sampleHistoricalData);
      
      expect(result.metadata.algorithm_used).toBe('Sector-Weighted Analysis');
      expect(result.components.sector_score).toBeGreaterThan(0);
      
      // Should have different score than without sector data
      const resultWithoutSectors = calculator.calculate(sampleRawData, undefined, sampleHistoricalData);
      expect(result.score).not.toBe(resultWithoutSectors.score);
    });

    test('custom algorithm should use custom formula', () => {
      const customConfig = calculator.getDefaultConfig('custom');
      customConfig.custom_formula = '(primary * 0.6) + (reference * 0.4)';
      
      calculator.switchAlgorithm('custom', customConfig);
      const result = calculator.calculate(sampleRawData, undefined, sampleHistoricalData);
      
      expect(result.metadata.algorithm_used).toBe('Custom Formula');
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle data with all zeros', () => {
      const zeroData: RawMarketBreadthData = {
        date: '2025-08-25',
        advancingIssues: 0,
        decliningIssues: 0,
        newHighs: 0,
        newLows: 0,
        upVolume: 0,
        downVolume: 0
      };

      const result = calculator.calculate(zeroData);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThan(0.5); // Low confidence for zero data
    });

    test('should handle missing historical data', () => {
      const result = calculator.calculate(sampleRawData, undefined, []);
      expect(result.score).toBeGreaterThan(0);
      expect(result.metadata.warnings?.some(w => w.includes('momentum'))).toBeTruthy();
    });

    test('should validate invalid algorithm switch', () => {
      expect(() => {
        calculator.switchAlgorithm('invalid' as any);
      }).toThrow();
    });

    test('should handle malformed configuration gracefully', () => {
      const invalidConfig: Partial<BreadthCalculationConfig> = {
        weights: {
          primary_indicators: 2.0, // Invalid - exceeds 1.0
          secondary_indicators: 0.5,
          reference_data: 0.3,
          sector_data: 0.0
        }
      };

      expect(() => {
        calculator.updateConfig(invalidConfig);
      }).toThrow();
    });
  });

  describe('Real-world Data Scenarios', () => {
    test('should handle bull market conditions', () => {
      const bullData: RawMarketBreadthData = {
        date: '2025-08-25',
        advancingIssues: 1800,
        decliningIssues: 200,
        newHighs: 250,
        newLows: 10,
        upVolume: 4000000000,
        downVolume: 500000000,
        stocksUp4PctDaily: 300,
        stocksDown4PctDaily: 50,
        t2108: 85
      };

      const result = calculator.calculate(bullData);
      expect(result.score).toBeGreaterThan(70);
      expect(result.market_condition.phase).toBe('BULL');
      expect(['STRONG', 'EXTREME']).toContain(result.market_condition.strength);
    });

    test('should handle bear market conditions', () => {
      const bearData: RawMarketBreadthData = {
        date: '2025-08-25',
        advancingIssues: 200,
        decliningIssues: 1800,
        newHighs: 5,
        newLows: 300,
        upVolume: 500000000,
        downVolume: 4000000000,
        stocksUp4PctDaily: 40,
        stocksDown4PctDaily: 350,
        t2108: 15
      };

      const result = calculator.calculate(bearData);
      expect(result.score).toBeLessThan(30);
      expect(result.market_condition.phase).toBe('BEAR');
    });

    test('should handle neutral market conditions', () => {
      const neutralData: RawMarketBreadthData = {
        date: '2025-08-25',
        advancingIssues: 1000,
        decliningIssues: 1000,
        newHighs: 100,
        newLows: 100,
        upVolume: 2000000000,
        downVolume: 2000000000,
        stocksUp4PctDaily: 150,
        stocksDown4PctDaily: 150,
        t2108: 50
      };

      const result = calculator.calculate(neutralData);
      expect(result.score).toBeGreaterThan(40);
      expect(result.score).toBeLessThan(60);
      expect(result.market_condition.phase).toBe('NEUTRAL');
    });
  });

  describe('Performance Benchmarks', () => {
    test('should calculate single record in under 100ms', () => {
      const startTime = performance.now();
      const result = calculator.calculate(sampleRawData);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.metadata.calculation_time).toBeLessThan(100);
    });

    test('should handle batch calculations efficiently', () => {
      const startTime = performance.now();
      const results = calculator.calculateHistorical(sampleHistoricalData);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const avgTimePerRecord = totalTime / sampleHistoricalData.length;
      
      expect(avgTimePerRecord).toBeLessThan(50); // Should be under 50ms per record
      expect(results).toHaveLength(sampleHistoricalData.length);
    });
  });

  describe('Integration with Database', () => {
    test('should create integrated calculator with database', () => {
      expect(integratedCalculator).toBeDefined();
      expect(integratedCalculator.getAvailableAlgorithms()).toHaveLength(4);
    });

    test('should validate data through integrated calculator', () => {
      const validation = integratedCalculator.validateData(sampleRawData);
      expect(validation.isValid).toBe(true);
    });
  });
});

describe('Real-time Calculation Performance', () => {
  test('should maintain performance under load', async () => {
    const calculator = new BreadthScoreCalculator();
    const iterations = 100;
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      calculator.calculate({
        ...sampleRawData,
        date: `2025-08-${String(i % 28 + 1).padStart(2, '0')}`
      });
      const endTime = performance.now();
      results.push(endTime - startTime);
    }

    const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const maxTime = Math.max(...results);

    expect(avgTime).toBeLessThan(50); // Average under 50ms
    expect(maxTime).toBeLessThan(200); // No calculation over 200ms
  });
});