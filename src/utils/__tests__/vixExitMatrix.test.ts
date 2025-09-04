/**
 * VIX Exit Matrix System - Comprehensive Test Suite
 * 
 * This test suite validates the complete BIDBACK Master System VIX Exit Logic
 * covering all 7 Volatility Regimes with comprehensive boundary testing,
 * real-world scenarios, and integration testing.
 * 
 * VIX Exit Matrix (7-Tier System):
 * - VIX < 12 (Ultra-Low): -4% stop, 4% target1, 10% target2, 3 days, 0.8x multiplier
 * - VIX 12-15 (Low): -6% stop, 6% target1, 12% target2, 4 days, 0.9x multiplier  
 * - VIX 15-20 (Normal): -8% stop, 7% target1, 15% target2, 5 days, 1.0x multiplier
 * - VIX 20-25 (Elevated): -10% stop, 9% target1, 20% target2, 5 days, 1.1x multiplier
 * - VIX 25-30 (High): -12% stop, 10% target1, 25% target2, 6 days, 1.2x multiplier
 * - VIX 30-40 (Very High): -15% stop, 12% target1, 30% target2, 7 days, 1.3x multiplier
 * - VIX > 40 (Extreme): -18% stop, 15% target1, 35% target2, 10 days, 1.4x multiplier
 */

import { describe, it, expect } from 'vitest'
import { 
  getVixExitMatrix, 
  calculateExitPrices, 
  calculateExitDate, 
  addTradingDays 
} from '../holidayCalendar'
import { VixExitMatrix } from '../../types/calendar'

describe('VIX Exit Matrix System - Comprehensive Test Suite', () => {
  
  describe('VIX Classification Accuracy', () => {
    
    describe('Ultra-Low VIX Regime (VIX < 12)', () => {
      it('should classify VIX values correctly in ultra-low range', () => {
        const testValues = [0, 5.5, 8.5, 10.0, 11.99]
        
        testValues.forEach(vix => {
          const matrix = getVixExitMatrix(vix)
          expect(matrix.vixRange).toBe('VIX < 12 (Ultra-Low)')
          expect(matrix.stopLossPercent).toBe(-4)
          expect(matrix.profitTarget1Percent).toBe(4)
          expect(matrix.profitTarget2Percent).toBe(10)
          expect(matrix.maxHoldDays).toBe(3)
          expect(matrix.multiplier).toBe(0.8)
        })
      })

      it('should handle ultra-low boundary condition precisely', () => {
        expect(getVixExitMatrix(11.99).vixRange).toBe('VIX < 12 (Ultra-Low)')
        expect(getVixExitMatrix(12.00).vixRange).toBe('VIX 12-15 (Low)')
      })
    })

    describe('Low VIX Regime (VIX 12-15)', () => {
      it('should classify VIX values correctly in low range', () => {
        const testValues = [12.0, 12.5, 13.8, 14.0, 14.99]
        
        testValues.forEach(vix => {
          const matrix = getVixExitMatrix(vix)
          expect(matrix.vixRange).toBe('VIX 12-15 (Low)')
          expect(matrix.stopLossPercent).toBe(-6)
          expect(matrix.profitTarget1Percent).toBe(6)
          expect(matrix.profitTarget2Percent).toBe(12)
          expect(matrix.maxHoldDays).toBe(4)
          expect(matrix.multiplier).toBe(0.9)
        })
      })

      it('should handle low boundary conditions precisely', () => {
        expect(getVixExitMatrix(11.99).vixRange).toBe('VIX < 12 (Ultra-Low)')
        expect(getVixExitMatrix(12.00).vixRange).toBe('VIX 12-15 (Low)')
        expect(getVixExitMatrix(14.99).vixRange).toBe('VIX 12-15 (Low)')
        expect(getVixExitMatrix(15.00).vixRange).toBe('VIX 15-20 (Normal)')
      })
    })

    describe('Normal VIX Regime (VIX 15-20)', () => {
      it('should classify VIX values correctly in normal range', () => {
        const testValues = [15.0, 16.2, 17.5, 18.7, 19.99]
        
        testValues.forEach(vix => {
          const matrix = getVixExitMatrix(vix)
          expect(matrix.vixRange).toBe('VIX 15-20 (Normal)')
          expect(matrix.stopLossPercent).toBe(-8)
          expect(matrix.profitTarget1Percent).toBe(7)
          expect(matrix.profitTarget2Percent).toBe(15)
          expect(matrix.maxHoldDays).toBe(5)
          expect(matrix.multiplier).toBe(1.0)
        })
      })

      it('should handle normal boundary conditions precisely', () => {
        expect(getVixExitMatrix(14.99).vixRange).toBe('VIX 12-15 (Low)')
        expect(getVixExitMatrix(15.00).vixRange).toBe('VIX 15-20 (Normal)')
        expect(getVixExitMatrix(19.99).vixRange).toBe('VIX 15-20 (Normal)')
        expect(getVixExitMatrix(20.00).vixRange).toBe('VIX 20-25 (Elevated)')
      })
    })

    describe('Elevated VIX Regime (VIX 20-25)', () => {
      it('should classify VIX values correctly in elevated range', () => {
        const testValues = [20.0, 21.5, 22.4, 23.8, 24.99]
        
        testValues.forEach(vix => {
          const matrix = getVixExitMatrix(vix)
          expect(matrix.vixRange).toBe('VIX 20-25 (Elevated)')
          expect(matrix.stopLossPercent).toBe(-10)
          expect(matrix.profitTarget1Percent).toBe(9)
          expect(matrix.profitTarget2Percent).toBe(20)
          expect(matrix.maxHoldDays).toBe(5)
          expect(matrix.multiplier).toBe(1.1)
        })
      })

      it('should handle elevated boundary conditions precisely', () => {
        expect(getVixExitMatrix(19.99).vixRange).toBe('VIX 15-20 (Normal)')
        expect(getVixExitMatrix(20.00).vixRange).toBe('VIX 20-25 (Elevated)')
        expect(getVixExitMatrix(24.99).vixRange).toBe('VIX 20-25 (Elevated)')
        expect(getVixExitMatrix(25.00).vixRange).toBe('VIX 25-30 (High)')
      })
    })

    describe('High VIX Regime (VIX 25-30)', () => {
      it('should classify VIX values correctly in high range', () => {
        const testValues = [25.0, 26.5, 27.8, 28.2, 29.99]
        
        testValues.forEach(vix => {
          const matrix = getVixExitMatrix(vix)
          expect(matrix.vixRange).toBe('VIX 25-30 (High)')
          expect(matrix.stopLossPercent).toBe(-12)
          expect(matrix.profitTarget1Percent).toBe(10)
          expect(matrix.profitTarget2Percent).toBe(25)
          expect(matrix.maxHoldDays).toBe(6)
          expect(matrix.multiplier).toBe(1.2)
        })
      })

      it('should handle high boundary conditions precisely', () => {
        expect(getVixExitMatrix(24.99).vixRange).toBe('VIX 20-25 (Elevated)')
        expect(getVixExitMatrix(25.00).vixRange).toBe('VIX 25-30 (High)')
        expect(getVixExitMatrix(29.99).vixRange).toBe('VIX 25-30 (High)')
        expect(getVixExitMatrix(30.00).vixRange).toBe('VIX 30-40 (Very High)')
      })
    })

    describe('Very High VIX Regime (VIX 30-40)', () => {
      it('should classify VIX values correctly in very high range', () => {
        const testValues = [30.0, 32.5, 35.0, 37.8, 39.99]
        
        testValues.forEach(vix => {
          const matrix = getVixExitMatrix(vix)
          expect(matrix.vixRange).toBe('VIX 30-40 (Very High)')
          expect(matrix.stopLossPercent).toBe(-15)
          expect(matrix.profitTarget1Percent).toBe(12)
          expect(matrix.profitTarget2Percent).toBe(30)
          expect(matrix.maxHoldDays).toBe(7)
          expect(matrix.multiplier).toBe(1.3)
        })
      })

      it('should handle very high boundary conditions precisely', () => {
        expect(getVixExitMatrix(29.99).vixRange).toBe('VIX 25-30 (High)')
        expect(getVixExitMatrix(30.00).vixRange).toBe('VIX 30-40 (Very High)')
        expect(getVixExitMatrix(39.99).vixRange).toBe('VIX 30-40 (Very High)')
        expect(getVixExitMatrix(40.00).vixRange).toBe('VIX > 40 (Extreme)')
      })
    })

    describe('Extreme VIX Regime (VIX > 40)', () => {
      it('should classify VIX values correctly in extreme range', () => {
        const testValues = [40.0, 45.0, 52.1, 68.0, 85.0]
        
        testValues.forEach(vix => {
          const matrix = getVixExitMatrix(vix)
          expect(matrix.vixRange).toBe('VIX > 40 (Extreme)')
          expect(matrix.stopLossPercent).toBe(-18)
          expect(matrix.profitTarget1Percent).toBe(15)
          expect(matrix.profitTarget2Percent).toBe(35)
          expect(matrix.maxHoldDays).toBe(10)
          expect(matrix.multiplier).toBe(1.4)
        })
      })

      it('should handle extreme boundary condition precisely', () => {
        expect(getVixExitMatrix(39.99).vixRange).toBe('VIX 30-40 (Very High)')
        expect(getVixExitMatrix(40.00).vixRange).toBe('VIX > 40 (Extreme)')
        expect(getVixExitMatrix(100.0).vixRange).toBe('VIX > 40 (Extreme)')
      })
    })
  })

  describe('Exit Parameters Validation', () => {
    
    it('should provide correct stop loss percentages across all VIX regimes', () => {
      const expectedStops = [-4, -6, -8, -10, -12, -15, -18]
      const vixValues = [10, 13, 17, 22, 27, 35, 45]
      
      vixValues.forEach((vix, index) => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix.stopLossPercent).toBe(expectedStops[index])
      })
    })

    it('should provide correct profit target 1 percentages across all VIX regimes', () => {
      const expectedTargets1 = [4, 6, 7, 9, 10, 12, 15]
      const vixValues = [10, 13, 17, 22, 27, 35, 45]
      
      vixValues.forEach((vix, index) => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix.profitTarget1Percent).toBe(expectedTargets1[index])
      })
    })

    it('should provide correct profit target 2 percentages across all VIX regimes', () => {
      const expectedTargets2 = [10, 12, 15, 20, 25, 30, 35]
      const vixValues = [10, 13, 17, 22, 27, 35, 45]
      
      vixValues.forEach((vix, index) => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix.profitTarget2Percent).toBe(expectedTargets2[index])
      })
    })

    it('should provide correct max hold days across all VIX regimes', () => {
      const expectedDays = [3, 4, 5, 5, 6, 7, 10]
      const vixValues = [10, 13, 17, 22, 27, 35, 45]
      
      vixValues.forEach((vix, index) => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix.maxHoldDays).toBe(expectedDays[index])
      })
    })

    it('should provide correct position multipliers across all VIX regimes', () => {
      const expectedMultipliers = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4]
      const vixValues = [10, 13, 17, 22, 27, 35, 45]
      
      vixValues.forEach((vix, index) => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix.multiplier).toBe(expectedMultipliers[index])
      })
    })
  })

  describe('Price Calculation Tests - Real-World Scenarios', () => {
    
    describe('SPXL Entry Scenario: $45.20 @ VIX 22.4', () => {
      const entryPrice = 45.20
      const vix = 22.4 // Elevated VIX regime
      
      it('should calculate correct exit prices for SPXL elevated VIX scenario', () => {
        const result = calculateExitPrices(entryPrice, vix)
        
        // VIX 20-25 (Elevated): -10% stop, 9% target1, 20% target2
        expect(result.stopLoss).toBeCloseTo(40.68, 2) // 45.20 * (1 - 0.10)
        expect(result.profitTarget1).toBeCloseTo(49.27, 2) // 45.20 * (1 + 0.09)
        expect(result.profitTarget2).toBeCloseTo(54.24, 2) // 45.20 * (1 + 0.20)
        
        expect(result.vixMatrix.vixRange).toBe('VIX 20-25 (Elevated)')
        expect(result.vixMatrix.maxHoldDays).toBe(5)
      })
    })

    describe('TQQQ Entry Scenario: $62.85 @ VIX 11.8', () => {
      const entryPrice = 62.85
      const vix = 11.8 // Ultra-Low VIX regime
      
      it('should calculate correct exit prices for TQQQ ultra-low VIX scenario', () => {
        const result = calculateExitPrices(entryPrice, vix)
        
        // VIX < 12 (Ultra-Low): -4% stop, 4% target1, 10% target2
        expect(result.stopLoss).toBeCloseTo(60.33, 2) // 62.85 * (1 - 0.04)
        expect(result.profitTarget1).toBeCloseTo(65.36, 2) // 62.85 * (1 + 0.04)
        expect(result.profitTarget2).toBeCloseTo(69.14, 2) // 62.85 * (1 + 0.10)
        
        expect(result.vixMatrix.vixRange).toBe('VIX < 12 (Ultra-Low)')
        expect(result.vixMatrix.maxHoldDays).toBe(3)
      })
    })

    describe('SPY Entry Scenario: $35.00 @ VIX 45.0', () => {
      const entryPrice = 35.00
      const vix = 45.0 // Extreme VIX regime
      
      it('should calculate correct exit prices for SPY extreme VIX scenario', () => {
        const result = calculateExitPrices(entryPrice, vix)
        
        // VIX > 40 (Extreme): -18% stop, 15% target1, 35% target2
        expect(result.stopLoss).toBeCloseTo(28.70, 2) // 35.00 * (1 - 0.18)
        expect(result.profitTarget1).toBeCloseTo(40.25, 2) // 35.00 * (1 + 0.15)
        expect(result.profitTarget2).toBeCloseTo(47.25, 2) // 35.00 * (1 + 0.35)
        
        expect(result.vixMatrix.vixRange).toBe('VIX > 40 (Extreme)')
        expect(result.vixMatrix.maxHoldDays).toBe(10)
      })
    })

    describe('Additional Real-World Price Calculations', () => {
      it('should calculate precise exit prices for various entry prices and VIX levels', () => {
        const scenarios = [
          { entry: 123.45, vix: 8.5, regime: 'VIX < 12 (Ultra-Low)' },
          { entry: 89.12, vix: 13.2, regime: 'VIX 12-15 (Low)' },
          { entry: 156.78, vix: 17.3, regime: 'VIX 15-20 (Normal)' },
          { entry: 234.56, vix: 23.7, regime: 'VIX 20-25 (Elevated)' },
          { entry: 67.89, vix: 28.4, regime: 'VIX 25-30 (High)' },
          { entry: 345.67, vix: 36.8, regime: 'VIX 30-40 (Very High)' },
          { entry: 98.76, vix: 52.1, regime: 'VIX > 40 (Extreme)' }
        ]

        scenarios.forEach(scenario => {
          const result = calculateExitPrices(scenario.entry, scenario.vix)
          
          expect(result.vixMatrix.vixRange).toBe(scenario.regime)
          
          // All prices should be positive and different from entry
          expect(result.stopLoss).toBeGreaterThan(0)
          expect(result.profitTarget1).toBeGreaterThan(0)
          expect(result.profitTarget2).toBeGreaterThan(0)
          
          expect(result.stopLoss).toBeLessThan(scenario.entry)
          expect(result.profitTarget1).toBeGreaterThan(scenario.entry)
          expect(result.profitTarget2).toBeGreaterThan(scenario.entry)
          expect(result.profitTarget2).toBeGreaterThan(result.profitTarget1)
        })
      })
    })
  })

  describe('Boundary Testing - Critical VIX Thresholds', () => {
    
    it('should handle exact boundary values correctly', () => {
      const boundaries = [
        { vix: 11.99, expected: 'VIX < 12 (Ultra-Low)' },
        { vix: 12.00, expected: 'VIX 12-15 (Low)' },
        { vix: 14.99, expected: 'VIX 12-15 (Low)' },
        { vix: 15.00, expected: 'VIX 15-20 (Normal)' },
        { vix: 19.99, expected: 'VIX 15-20 (Normal)' },
        { vix: 20.00, expected: 'VIX 20-25 (Elevated)' },
        { vix: 24.99, expected: 'VIX 20-25 (Elevated)' },
        { vix: 25.00, expected: 'VIX 25-30 (High)' },
        { vix: 29.99, expected: 'VIX 25-30 (High)' },
        { vix: 30.00, expected: 'VIX 30-40 (Very High)' },
        { vix: 39.99, expected: 'VIX 30-40 (Very High)' },
        { vix: 40.00, expected: 'VIX > 40 (Extreme)' }
      ]

      boundaries.forEach(({ vix, expected }) => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix.vixRange).toBe(expected)
      })
    })

    it('should handle floating point precision in boundary calculations', () => {
      // Test near-boundary values that might cause floating point issues
      const precisionTests = [
        { vix: 11.999999, expected: 'VIX < 12 (Ultra-Low)' },
        { vix: 12.000001, expected: 'VIX 12-15 (Low)' },
        { vix: 14.999999, expected: 'VIX 12-15 (Low)' },
        { vix: 15.000001, expected: 'VIX 15-20 (Normal)' },
        { vix: 19.999999, expected: 'VIX 15-20 (Normal)' },
        { vix: 20.000001, expected: 'VIX 20-25 (Elevated)' },
        { vix: 24.999999, expected: 'VIX 20-25 (Elevated)' },
        { vix: 25.000001, expected: 'VIX 25-30 (High)' },
        { vix: 29.999999, expected: 'VIX 25-30 (High)' },
        { vix: 30.000001, expected: 'VIX 30-40 (Very High)' },
        { vix: 39.999999, expected: 'VIX 30-40 (Very High)' },
        { vix: 40.000001, expected: 'VIX > 40 (Extreme)' }
      ]

      precisionTests.forEach(({ vix, expected }) => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix.vixRange).toBe(expected)
      })
    })
  })

  describe('Position Multiplier Tests', () => {
    
    it('should apply correct position multipliers for different VIX regimes', () => {
      const multiplierTests = [
        { vix: 8.5, expected: 0.8, description: 'Ultra-Low VIX reduces position sizing' },
        { vix: 13.5, expected: 0.9, description: 'Low VIX slightly reduces position sizing' },
        { vix: 17.3, expected: 1.0, description: 'Normal VIX maintains standard position sizing' },
        { vix: 22.4, expected: 1.1, description: 'Elevated VIX slightly increases position sizing' },
        { vix: 27.8, expected: 1.2, description: 'High VIX increases position sizing' },
        { vix: 35.2, expected: 1.3, description: 'Very High VIX significantly increases position sizing' },
        { vix: 52.1, expected: 1.4, description: 'Extreme VIX maximizes opportunity position sizing' }
      ]

      multiplierTests.forEach(({ vix, expected, description }) => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix.multiplier).toBe(expected)
        
        // Verify that the multiplier logic makes sense
        if (vix < 15) {
          expect(matrix.multiplier).toBeLessThan(1.0) // Reduce exposure in low vol
        } else if (vix > 25) {
          expect(matrix.multiplier).toBeGreaterThan(1.0) // Increase exposure for opportunities
        }
      })
    })

    it('should calculate position impact correctly', () => {
      const basePosition = 10000
      
      const positionTests = [
        { vix: 10, multiplier: 0.8, expectedPosition: 8000 },
        { vix: 13, multiplier: 0.9, expectedPosition: 9000 },
        { vix: 17, multiplier: 1.0, expectedPosition: 10000 },
        { vix: 22, multiplier: 1.1, expectedPosition: 11000 },
        { vix: 27, multiplier: 1.2, expectedPosition: 12000 },
        { vix: 35, multiplier: 1.3, expectedPosition: 13000 },
        { vix: 45, multiplier: 1.4, expectedPosition: 14000 }
      ]

      positionTests.forEach(({ vix, multiplier, expectedPosition }) => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix.multiplier).toBe(multiplier)
        expect(basePosition * matrix.multiplier).toBe(expectedPosition)
      })
    })
  })

  describe('Integration Tests with Holiday Calendar', () => {
    
    it('should calculate holiday-adjusted exit dates correctly', () => {
      // Test exit date calculation with holiday calendar integration
      const entryDate = new Date('2025-07-01') // Tuesday before July 4th weekend
      
      const vixScenarios = [
        { vix: 10, maxDays: 3, description: 'Ultra-Low VIX' },
        { vix: 13, maxDays: 4, description: 'Low VIX' },
        { vix: 17, maxDays: 5, description: 'Normal VIX' },
        { vix: 22, maxDays: 5, description: 'Elevated VIX' },
        { vix: 27, maxDays: 6, description: 'High VIX' },
        { vix: 35, maxDays: 7, description: 'Very High VIX' },
        { vix: 45, maxDays: 10, description: 'Extreme VIX' }
      ]

      vixScenarios.forEach(({ vix, maxDays, description }) => {
        const exitDate = calculateExitDate(entryDate, vix)
        expect(exitDate).toBeInstanceOf(Date)
        expect(exitDate.getTime()).toBeGreaterThan(entryDate.getTime())
        
        // The exit date should account for holidays and weekends
        // July 4th is a holiday in 2025, so actual trading days may be extended
      })
    })

    it('should handle holiday periods correctly in exit calculations', () => {
      // Test around Thanksgiving 2025 (Nov 27-28)
      const entryDate = new Date('2025-11-24') // Monday before Thanksgiving week
      const vix = 17 // Normal VIX should give 5 trading days
      
      const exitDate = calculateExitDate(entryDate, vix)
      
      // Should skip Thursday Nov 27 (Thanksgiving) and Friday Nov 28 (early close/holiday)
      // Plus weekend, so exit should be in early December
      expect(exitDate.getMonth()).toBeGreaterThanOrEqual(10) // November or December
      expect(exitDate.getTime()).toBeGreaterThan(entryDate.getTime())
    })

    it('should integrate with addTradingDays function correctly', () => {
      const startDate = new Date('2025-01-02') // Thursday
      
      [3, 4, 5, 6, 7, 10].forEach(days => {
        const result = addTradingDays(startDate, days)
        expect(result).toBeInstanceOf(Date)
        expect(result.getTime()).toBeGreaterThan(startDate.getTime())
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    
    it('should handle negative VIX values gracefully', () => {
      const negativeVix = -5
      const matrix = getVixExitMatrix(negativeVix)
      
      // Should default to ultra-low regime
      expect(matrix.vixRange).toBe('VIX < 12 (Ultra-Low)')
      expect(matrix.multiplier).toBe(0.8)
    })

    it('should handle extremely high VIX values', () => {
      const extremeVix = 150
      const matrix = getVixExitMatrix(extremeVix)
      
      // Should use extreme regime
      expect(matrix.vixRange).toBe('VIX > 40 (Extreme)')
      expect(matrix.multiplier).toBe(1.4)
    })

    it('should handle zero and very small entry prices', () => {
      const scenarios = [
        { entry: 0.01, vix: 20 },
        { entry: 0.50, vix: 30 },
        { entry: 1.00, vix: 40 }
      ]

      scenarios.forEach(({ entry, vix }) => {
        const result = calculateExitPrices(entry, vix)
        
        expect(result.stopLoss).toBeGreaterThan(0)
        expect(result.profitTarget1).toBeGreaterThan(entry)
        expect(result.profitTarget2).toBeGreaterThan(result.profitTarget1)
      })
    })

    it('should handle very high entry prices', () => {
      const highEntry = 9999.99
      const vix = 25
      
      const result = calculateExitPrices(highEntry, vix)
      
      expect(result.stopLoss).toBeLessThan(highEntry)
      expect(result.profitTarget1).toBeGreaterThan(highEntry)
      expect(result.profitTarget2).toBeGreaterThan(result.profitTarget1)
      
      // All values should be reasonable
      expect(result.stopLoss).toBeGreaterThan(highEntry * 0.7) // Not too far below
      expect(result.profitTarget2).toBeLessThan(highEntry * 2.0) // Not too far above
    })
  })

  describe('Performance and Consistency Tests', () => {
    
    it('should calculate VIX classifications efficiently for bulk operations', () => {
      const startTime = performance.now()
      
      // Test 10000 VIX values
      for (let i = 0; i < 10000; i++) {
        const randomVix = Math.random() * 80 + 5 // VIX 5-85
        getVixExitMatrix(randomVix)
      }
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // Should complete 10000 classifications quickly (<50ms)
      expect(executionTime).toBeLessThan(50)
    })

    it('should provide consistent results for identical VIX values', () => {
      const testVix = 22.4
      
      // Run classification multiple times
      const results = Array.from({ length: 100 }, () => getVixExitMatrix(testVix))
      
      // All results should be identical
      const firstResult = results[0]
      results.forEach(result => {
        expect(result).toEqual(firstResult)
      })
    })

    it('should provide consistent price calculations for identical inputs', () => {
      const entryPrice = 45.20
      const vix = 22.4
      
      // Run price calculations multiple times
      const results = Array.from({ length: 100 }, () => calculateExitPrices(entryPrice, vix))
      
      // All results should be identical
      const firstResult = results[0]
      results.forEach(result => {
        expect(result.stopLoss).toBe(firstResult.stopLoss)
        expect(result.profitTarget1).toBe(firstResult.profitTarget1)
        expect(result.profitTarget2).toBe(firstResult.profitTarget2)
        expect(result.vixMatrix).toEqual(firstResult.vixMatrix)
      })
    })
  })

  describe('VIX Exit Matrix Data Integrity', () => {
    
    it('should have all required fields in each VIX regime', () => {
      const allVixValues = [5, 12, 15, 20, 25, 30, 45]
      
      allVixValues.forEach(vix => {
        const matrix = getVixExitMatrix(vix)
        
        expect(matrix).toHaveProperty('vixRange')
        expect(matrix).toHaveProperty('stopLossPercent')
        expect(matrix).toHaveProperty('profitTarget1Percent')
        expect(matrix).toHaveProperty('profitTarget2Percent')
        expect(matrix).toHaveProperty('maxHoldDays')
        expect(matrix).toHaveProperty('multiplier')
        
        expect(typeof matrix.vixRange).toBe('string')
        expect(typeof matrix.stopLossPercent).toBe('number')
        expect(typeof matrix.profitTarget1Percent).toBe('number')
        expect(typeof matrix.profitTarget2Percent).toBe('number')
        expect(typeof matrix.maxHoldDays).toBe('number')
        expect(typeof matrix.multiplier).toBe('number')
      })
    })

    it('should have logical relationships between parameters', () => {
      const allVixValues = [5, 12, 15, 20, 25, 30, 45]
      
      allVixValues.forEach(vix => {
        const matrix = getVixExitMatrix(vix)
        
        // Stop loss should be negative
        expect(matrix.stopLossPercent).toBeLessThan(0)
        
        // Profit targets should be positive
        expect(matrix.profitTarget1Percent).toBeGreaterThan(0)
        expect(matrix.profitTarget2Percent).toBeGreaterThan(0)
        
        // Target 2 should be higher than target 1
        expect(matrix.profitTarget2Percent).toBeGreaterThan(matrix.profitTarget1Percent)
        
        // Max hold days should be positive
        expect(matrix.maxHoldDays).toBeGreaterThan(0)
        
        // Multiplier should be positive
        expect(matrix.multiplier).toBeGreaterThan(0)
      })
    })
  })
})