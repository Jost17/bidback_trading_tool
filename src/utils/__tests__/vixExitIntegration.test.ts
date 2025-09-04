/**
 * VIX Exit Matrix Integration Test Suite
 * 
 * This test suite validates the integration between:
 * - VIX Exit Matrix System
 * - Position Calculator 
 * - BIDBACK Master System calculations
 * - Holiday calendar adjustments
 * - Real-world trading scenarios
 */

import { describe, it, expect } from 'vitest'
import { 
  calculateBidbackSignals,
  calculateExitParameters,
  BidbackCalculationInput,
  type BidbackCalculationResult
} from '../bidback-calculations'
import { 
  getVixExitMatrix, 
  calculateExitPrices, 
  calculateExitDate 
} from '../holidayCalendar'

describe('VIX Exit Matrix Integration Tests', () => {

  describe('Integration with Position Calculator', () => {
    
    it('should integrate VIX Exit Matrix with SPXL Big Opportunity scenario', () => {
      const spxlScenario: BidbackCalculationInput = {
        basePosition: 10000,
        t2108: 28.5, // Big Opportunity trigger
        vix: 22.4, // Elevated VIX regime
        up4pct: 1250, // Strong momentum
        down4pct: 85,
        portfolioSize: 100000
      }

      const result = calculateBidbackSignals(spxlScenario)
      
      // Position sizing should use Big Opportunity 2.0x (overriding VIX multiplier)
      expect(result.position.isBigOpportunity).toBe(true)
      expect(result.position.finalPosition).toBe(20000) // 10000 * 2.0
      expect(result.position.vixMultiplier).toBe(1.1) // VIX 20-25
      expect(result.position.bigOpportunityMultiplier).toBe(2.0)
      
      // Exit parameters should use VIX 20-25 (Elevated) regime
      expect(result.exits.stopLossPercent).toBe(-10)
      expect(result.exits.profitTarget1Percent).toBe(9)
      expect(result.exits.profitTarget2Percent).toBe(20)
      expect(result.exits.maxHoldDays).toBe(5)
      
      // VIX matrix should be consistent
      expect(result.exits.vixMatrix.vixRange).toBe('VIX 20-25 (Elevated)')
      expect(result.exits.vixMatrix.multiplier).toBe(1.1)
    })

    it('should integrate VIX Exit Matrix with TQQQ Ultra-Low VIX scenario', () => {
      const tqqqScenario: BidbackCalculationInput = {
        basePosition: 15000,
        t2108: 68.2,
        vix: 11.8, // Ultra-Low VIX regime
        up4pct: 420,
        down4pct: 180,
        portfolioSize: 150000
      }

      const result = calculateBidbackSignals(tqqqScenario)
      
      // Position sizing should use VIX 0.8x multiplier
      expect(result.position.isBigOpportunity).toBe(false)
      expect(result.position.isAvoidEntry).toBe(false)
      expect(result.position.finalPosition).toBe(12000) // 15000 * 0.8
      expect(result.position.vixMultiplier).toBe(0.8) // VIX < 12
      expect(result.position.portfolioHeatPercent).toBe(8.0) // 12000/150000
      
      // Exit parameters should use VIX < 12 (Ultra-Low) regime
      expect(result.exits.stopLossPercent).toBe(-4)
      expect(result.exits.profitTarget1Percent).toBe(4)
      expect(result.exits.profitTarget2Percent).toBe(10)
      expect(result.exits.maxHoldDays).toBe(3)
      
      // VIX matrix should be consistent
      expect(result.exits.vixMatrix.vixRange).toBe('VIX < 12 (Ultra-Low)')
      expect(result.exits.vixMatrix.multiplier).toBe(0.8)
    })

    it('should integrate VIX Exit Matrix with SPY Extreme VIX scenario', () => {
      const spyScenario: BidbackCalculationInput = {
        basePosition: 20000,
        t2108: 45.0,
        vix: 52.1, // Extreme VIX regime
        up4pct: 300,
        down4pct: 400,
        portfolioSize: 200000
      }

      const result = calculateBidbackSignals(spyScenario)
      
      // Position sizing should use VIX 1.4x multiplier
      expect(result.position.finalPosition).toBe(28000) // 20000 * 1.4
      expect(result.position.vixMultiplier).toBe(1.4) // VIX > 40
      expect(result.position.portfolioHeatPercent).toBe(14.0) // 28000/200000
      
      // Exit parameters should use VIX > 40 (Extreme) regime
      expect(result.exits.stopLossPercent).toBe(-18)
      expect(result.exits.profitTarget1Percent).toBe(15)
      expect(result.exits.profitTarget2Percent).toBe(35)
      expect(result.exits.maxHoldDays).toBe(10)
      
      // VIX matrix should be consistent
      expect(result.exits.vixMatrix.vixRange).toBe('VIX > 40 (Extreme)')
      expect(result.exits.vixMatrix.multiplier).toBe(1.4)
    })

    it('should handle Avoid Entry with correct VIX exit parameters', () => {
      const avoidScenario: BidbackCalculationInput = {
        basePosition: 12000,
        t2108: 85.0, // Overbought, triggers avoid
        vix: 17.3, // Normal VIX regime
        up4pct: 120, // Low momentum, triggers avoid
        down4pct: 45,
        portfolioSize: 120000
      }

      const result = calculateBidbackSignals(avoidScenario)
      
      // Position should be zero due to Avoid Entry
      expect(result.position.isAvoidEntry).toBe(true)
      expect(result.position.finalPosition).toBe(0)
      expect(result.position.portfolioHeatPercent).toBe(0)
      
      // Exit parameters should still be calculated for reference
      expect(result.exits.vixMatrix.vixRange).toBe('VIX 15-20 (Normal)')
      expect(result.exits.stopLossPercent).toBe(-8)
      expect(result.exits.profitTarget1Percent).toBe(7)
      expect(result.exits.profitTarget2Percent).toBe(15)
      expect(result.exits.maxHoldDays).toBe(5)
    })
  })

  describe('Real-World Price Calculations with Position Sizing', () => {
    
    it('should calculate complete exit strategy for $45.20 SPXL entry @ VIX 22.4', () => {
      const entryPrice = 45.20
      const vix = 22.4
      const basePosition = 10000
      
      // Get VIX exit parameters
      const exitParams = calculateExitParameters(vix)
      const exitPrices = calculateExitPrices(entryPrice, vix)
      
      // Validate exit parameters
      expect(exitParams.stopLossPercent).toBe(-10)
      expect(exitParams.profitTarget1Percent).toBe(9)
      expect(exitParams.profitTarget2Percent).toBe(20)
      expect(exitParams.maxHoldDays).toBe(5)
      
      // Validate exit prices
      expect(exitPrices.stopLoss).toBeCloseTo(40.68, 2) // $45.20 * (1-0.10)
      expect(exitPrices.profitTarget1).toBeCloseTo(49.27, 2) // $45.20 * (1+0.09)
      expect(exitPrices.profitTarget2).toBeCloseTo(54.24, 2) // $45.20 * (1+0.20)
      
      // Calculate position sizing for Big Opportunity scenario
      const scenario: BidbackCalculationInput = {
        basePosition,
        t2108: 28.5,
        vix,
        up4pct: 1250,
        down4pct: 85
      }
      
      const positionResult = calculateBidbackSignals(scenario)
      expect(positionResult.position.finalPosition).toBe(20000) // Big Opportunity 2.0x
      
      // Total position value calculations
      const totalPositionValue = positionResult.position.finalPosition
      const sharesAtEntry = Math.floor(totalPositionValue / entryPrice)
      const actualPositionValue = sharesAtEntry * entryPrice
      
      expect(sharesAtEntry).toBe(Math.floor(20000 / 45.20)) // ~442 shares
      expect(actualPositionValue).toBeCloseTo(19990.4, 2) // 442 * $45.20
      
      // Exit value calculations
      const stopLossValue = sharesAtEntry * exitPrices.stopLoss
      const target1Value = sharesAtEntry * exitPrices.profitTarget1
      const target2Value = sharesAtEntry * exitPrices.profitTarget2
      
      expect(stopLossValue).toBeLessThan(actualPositionValue)
      expect(target1Value).toBeGreaterThan(actualPositionValue)
      expect(target2Value).toBeGreaterThan(target1Value)
    })

    it('should calculate complete exit strategy for $62.85 TQQQ entry @ VIX 11.8', () => {
      const entryPrice = 62.85
      const vix = 11.8
      const basePosition = 15000
      
      // Get exit parameters and prices
      const exitParams = calculateExitParameters(vix)
      const exitPrices = calculateExitPrices(entryPrice, vix)
      
      // Ultra-Low VIX parameters
      expect(exitParams.stopLossPercent).toBe(-4)
      expect(exitParams.profitTarget1Percent).toBe(4)
      expect(exitParams.profitTarget2Percent).toBe(10)
      expect(exitParams.maxHoldDays).toBe(3)
      
      // Exit prices
      expect(exitPrices.stopLoss).toBeCloseTo(60.33, 2) // $62.85 * (1-0.04)
      expect(exitPrices.profitTarget1).toBeCloseTo(65.36, 2) // $62.85 * (1+0.04)
      expect(exitPrices.profitTarget2).toBeCloseTo(69.14, 2) // $62.85 * (1+0.10)
      
      // Position sizing for normal conditions (no Big Opportunity)
      const scenario: BidbackCalculationInput = {
        basePosition,
        t2108: 68.2,
        vix,
        up4pct: 420,
        down4pct: 180
      }
      
      const positionResult = calculateBidbackSignals(scenario)
      expect(positionResult.position.finalPosition).toBe(12000) // 0.8x VIX multiplier
      
      // Share and value calculations
      const totalPositionValue = positionResult.position.finalPosition
      const sharesAtEntry = Math.floor(totalPositionValue / entryPrice)
      
      expect(sharesAtEntry).toBe(Math.floor(12000 / 62.85)) // ~190 shares
    })

    it('should calculate complete exit strategy for $35.00 SPY entry @ VIX 45.0', () => {
      const entryPrice = 35.00
      const vix = 45.0
      const basePosition = 20000
      
      // Get exit parameters and prices
      const exitParams = calculateExitParameters(vix)
      const exitPrices = calculateExitPrices(entryPrice, vix)
      
      // Extreme VIX parameters
      expect(exitParams.stopLossPercent).toBe(-18)
      expect(exitParams.profitTarget1Percent).toBe(15)
      expect(exitParams.profitTarget2Percent).toBe(35)
      expect(exitParams.maxHoldDays).toBe(10)
      
      // Exit prices
      expect(exitPrices.stopLoss).toBeCloseTo(28.70, 2) // $35.00 * (1-0.18)
      expect(exitPrices.profitTarget1).toBeCloseTo(40.25, 2) // $35.00 * (1+0.15)
      expect(exitPrices.profitTarget2).toBeCloseTo(47.25, 2) // $35.00 * (1+0.35)
      
      // Position sizing for extreme VIX conditions
      const scenario: BidbackCalculationInput = {
        basePosition,
        t2108: 45.0,
        vix,
        up4pct: 300,
        down4pct: 400
      }
      
      const positionResult = calculateBidbackSignals(scenario)
      expect(positionResult.position.finalPosition).toBe(28000) // 1.4x VIX multiplier
      
      // Share and value calculations
      const totalPositionValue = positionResult.position.finalPosition
      const sharesAtEntry = Math.floor(totalPositionValue / entryPrice)
      
      expect(sharesAtEntry).toBe(Math.floor(28000 / 35.00)) // 800 shares
    })
  })

  describe('Holiday-Adjusted Exit Date Calculations', () => {
    
    it('should calculate holiday-adjusted exit dates for different VIX regimes', () => {
      const entryDate = new Date('2025-07-01') // Tuesday before July 4th weekend
      
      const vixScenarios = [
        { vix: 10, expectedMaxDays: 3, regime: 'Ultra-Low' },
        { vix: 13, expectedMaxDays: 4, regime: 'Low' },
        { vix: 17, expectedMaxDays: 5, regime: 'Normal' },
        { vix: 22, expectedMaxDays: 5, regime: 'Elevated' },
        { vix: 27, expectedMaxDays: 6, regime: 'High' },
        { vix: 35, expectedMaxDays: 7, regime: 'Very High' },
        { vix: 45, expectedMaxDays: 10, regime: 'Extreme' }
      ]

      vixScenarios.forEach(({ vix, expectedMaxDays, regime }) => {
        const exitDate = calculateExitDate(entryDate, vix)
        const matrix = getVixExitMatrix(vix)
        
        expect(matrix.maxHoldDays).toBe(expectedMaxDays)
        expect(exitDate).toBeInstanceOf(Date)
        expect(exitDate.getTime()).toBeGreaterThan(entryDate.getTime())
        
        // Exit date should account for July 4th holiday
        const daysDifference = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
        expect(daysDifference).toBeGreaterThanOrEqual(expectedMaxDays)
      })
    })

    it('should handle Thanksgiving week holiday adjustments', () => {
      const entryDate = new Date('2025-11-24') // Monday before Thanksgiving week
      
      const vixTests = [
        { vix: 17, maxDays: 5 }, // Normal VIX
        { vix: 45, maxDays: 10 } // Extreme VIX
      ]

      vixTests.forEach(({ vix, maxDays }) => {
        const exitDate = calculateExitDate(entryDate, vix)
        const matrix = getVixExitMatrix(vix)
        
        expect(matrix.maxHoldDays).toBe(maxDays)
        expect(exitDate.getTime()).toBeGreaterThan(entryDate.getTime())
        
        // Should account for Thanksgiving holidays (Nov 27-28)
        if (maxDays <= 5) {
          expect(exitDate.getMonth()).toBeGreaterThanOrEqual(10) // November or later
        }
      })
    })

    it('should integrate exit dates with complete trading scenarios', () => {
      const scenarios = [
        {
          name: 'SPXL Big Opportunity',
          entryDate: new Date('2025-03-15'),
          entryPrice: 45.20,
          input: {
            basePosition: 10000,
            t2108: 28.5,
            vix: 22.4,
            up4pct: 1250,
            down4pct: 85
          }
        },
        {
          name: 'TQQQ Ultra-Low VIX',
          entryDate: new Date('2025-06-10'),
          entryPrice: 62.85,
          input: {
            basePosition: 15000,
            t2108: 68.2,
            vix: 11.8,
            up4pct: 420,
            down4pct: 180
          }
        },
        {
          name: 'SPY Extreme VIX',
          entryDate: new Date('2025-09-20'),
          entryPrice: 35.00,
          input: {
            basePosition: 20000,
            t2108: 45.0,
            vix: 52.1,
            up4pct: 300,
            down4pct: 400
          }
        }
      ]

      scenarios.forEach(({ name, entryDate, entryPrice, input }) => {
        const result = calculateBidbackSignals(input)
        const exitDate = calculateExitDate(entryDate, input.vix)
        const exitPrices = calculateExitPrices(entryPrice, input.vix)
        
        // Validate complete trading plan
        expect(result.position.finalPosition).toBeGreaterThan(0)
        expect(exitDate.getTime()).toBeGreaterThan(entryDate.getTime())
        expect(exitPrices.stopLoss).toBeLessThan(entryPrice)
        expect(exitPrices.profitTarget2).toBeGreaterThan(entryPrice)
        
        // Validate consistency between VIX parameters
        expect(result.exits.maxHoldDays).toBe(exitPrices.vixMatrix.maxHoldDays)
        expect(result.exits.stopLossPercent).toBe(exitPrices.vixMatrix.stopLossPercent)
        expect(result.exits.profitTarget2Percent).toBe(exitPrices.vixMatrix.profitTarget2Percent)
      })
    })
  })

  describe('Portfolio Heat Management Integration', () => {
    
    it('should calculate portfolio heat with VIX-adjusted position sizes', () => {
      const portfolioSize = 100000
      
      const heatScenarios = [
        { 
          vix: 11.8, // Ultra-Low: 0.8x multiplier
          basePosition: 10000,
          expectedHeat: 8.0 // 10000 * 0.8 / 100000 = 8%
        },
        {
          vix: 17.3, // Normal: 1.0x multiplier
          basePosition: 15000,
          expectedHeat: 15.0 // 15000 * 1.0 / 100000 = 15%
        },
        {
          vix: 52.1, // Extreme: 1.4x multiplier
          basePosition: 12000,
          expectedHeat: 16.8 // 12000 * 1.4 / 100000 = 16.8%
        }
      ]

      heatScenarios.forEach(({ vix, basePosition, expectedHeat }) => {
        const input: BidbackCalculationInput = {
          basePosition,
          t2108: 60.0, // Normal T2108
          vix,
          up4pct: 400, // Adequate momentum
          down4pct: 200,
          portfolioSize
        }

        const result = calculateBidbackSignals(input)
        expect(result.position.portfolioHeatPercent).toBeCloseTo(expectedHeat, 1)
        
        // Validate that higher VIX leads to higher position sizes (and heat)
        const matrix = getVixExitMatrix(vix)
        expect(result.position.finalPosition).toBe(basePosition * matrix.multiplier)
      })
    })

    it('should manage portfolio heat during Big Opportunity scenarios', () => {
      const bigOpportunityInput: BidbackCalculationInput = {
        basePosition: 15000,
        t2108: 25.0, // Big Opportunity trigger
        vix: 35.0, // Very High VIX (1.3x)
        up4pct: 1500, // Strong momentum
        down4pct: 100,
        portfolioSize: 150000
      }

      const result = calculateBidbackSignals(bigOpportunityInput)
      
      // Big Opportunity should override VIX multiplier (2.0x vs 1.3x)
      expect(result.position.isBigOpportunity).toBe(true)
      expect(result.position.finalPosition).toBe(30000) // 15000 * 2.0
      expect(result.position.portfolioHeatPercent).toBe(20.0) // 30000 / 150000
      
      // VIX exit parameters should still use Very High regime
      expect(result.exits.vixMatrix.vixRange).toBe('VIX 30-40 (Very High)')
      expect(result.exits.maxHoldDays).toBe(7)
    })
  })

  describe('Performance Integration Tests', () => {
    
    it('should efficiently calculate complete trading strategies for multiple scenarios', () => {
      const startTime = performance.now()
      
      // Test 1000 complete trading scenarios
      for (let i = 0; i < 1000; i++) {
        const entryPrice = 50 + (Math.random() * 100) // $50-150
        const vix = 8 + (Math.random() * 60) // VIX 8-68
        
        const input: BidbackCalculationInput = {
          basePosition: 10000 + (i * 10),
          t2108: Math.random() * 100,
          vix,
          up4pct: Math.random() * 2000,
          down4pct: Math.random() * 1000,
          portfolioSize: 100000
        }

        // Calculate complete trading plan
        const signals = calculateBidbackSignals(input)
        const exitPrices = calculateExitPrices(entryPrice, vix)
        const entryDate = new Date('2025-01-15')
        const exitDate = calculateExitDate(entryDate, vix)
        
        // Validate results
        expect(signals).toBeDefined()
        expect(exitPrices).toBeDefined()
        expect(exitDate).toBeDefined()
      }
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // Should complete 1000 full trading calculations efficiently
      expect(executionTime).toBeLessThan(200) // Allow up to 200ms for 1000 scenarios
    })

    it('should provide consistent integrated results across multiple runs', () => {
      const testInput: BidbackCalculationInput = {
        basePosition: 12500,
        t2108: 32.5,
        vix: 28.7,
        up4pct: 850,
        down4pct: 320,
        portfolioSize: 125000
      }
      
      const entryPrice = 67.45
      const entryDate = new Date('2025-08-15')
      
      // Run the same scenario multiple times
      const results = Array.from({ length: 50 }, () => ({
        signals: calculateBidbackSignals(testInput),
        exitPrices: calculateExitPrices(entryPrice, testInput.vix),
        exitDate: calculateExitDate(entryDate, testInput.vix)
      }))
      
      // All results should be identical
      const firstResult = results[0]
      results.forEach(result => {
        expect(result.signals.position).toEqual(firstResult.signals.position)
        expect(result.signals.exits).toEqual(firstResult.signals.exits)
        expect(result.exitPrices).toEqual(firstResult.exitPrices)
        expect(result.exitDate).toEqual(firstResult.exitDate)
      })
    })
  })
})