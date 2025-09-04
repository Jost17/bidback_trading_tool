/**
 * VIX Exit Matrix Validation & Edge Cases Test Suite
 * 
 * Advanced validation tests for:
 * - Market stress scenarios
 * - Data integrity validation
 * - Edge case handling
 * - Error boundary testing
 * - Performance under extreme conditions
 * - Mathematical consistency validation
 */

import { describe, it, expect } from 'vitest'
import { 
  getVixExitMatrix, 
  calculateExitPrices, 
  calculateExitDate,
  addTradingDays 
} from '../holidayCalendar'
import { 
  calculateBidbackSignals,
  validateBidbackInput,
  BidbackCalculationInput 
} from '../bidback-calculations'
import { VIX_EXIT_MATRIX } from '../../types/calendar'

describe('VIX Exit Matrix Validation & Edge Cases', () => {

  describe('Market Stress Scenario Testing', () => {
    
    it('should handle 2008-style market crash conditions', () => {
      const crashScenario: BidbackCalculationInput = {
        basePosition: 25000,
        t2108: 8.5, // Extreme bearish
        vix: 89.0, // Market crash VIX
        up4pct: 2500, // Extreme momentum after crash
        down4pct: 150,
        portfolioSize: 200000
      }

      const result = calculateBidbackSignals(crashScenario)
      
      // Should detect Big Opportunity during crash
      expect(result.signals.bigOpportunity).toBe(true)
      expect(result.signals.vixRegime).toBe('extreme')
      expect(result.position.finalPosition).toBe(50000) // 2.0x Big Opportunity
      
      // Exit parameters should use extreme VIX settings
      expect(result.exits.stopLossPercent).toBe(-18)
      expect(result.exits.profitTarget2Percent).toBe(35)
      expect(result.exits.maxHoldDays).toBe(10)
      
      // Portfolio heat should be substantial but managed
      expect(result.position.portfolioHeatPercent).toBe(25.0) // 50000/200000
    })

    it('should handle COVID-2020 style volatility spike', () => {
      const covidScenario: BidbackCalculationInput = {
        basePosition: 15000,
        t2108: 12.0, // Extreme bearish
        vix: 82.7, // COVID peak VIX
        up4pct: 1800, // Recovery momentum
        down4pct: 95,
        portfolioSize: 150000
      }

      const result = calculateBidbackSignals(covidScenario)
      
      expect(result.signals.bigOpportunity).toBe(true)
      expect(result.signals.vixRegime).toBe('extreme')
      expect(result.position.finalPosition).toBe(30000) // Big Opportunity override
      expect(result.exits.maxHoldDays).toBe(10) // Extended hold for extreme conditions
      
      // Calculate exit prices for typical COVID-era stock
      const covidExitPrices = calculateExitPrices(250.00, covidScenario.vix)
      expect(covidExitPrices.stopLoss).toBeCloseTo(205.00, 2) // -18%
      expect(covidExitPrices.profitTarget2).toBeCloseTo(337.50, 2) // +35%
    })

    it('should handle dot-com bubble burst conditions', () => {
      const dotcomScenario: BidbackCalculationInput = {
        basePosition: 20000,
        t2108: 3.2, // Extreme bearish (historical low)
        vix: 45.2, // Tech crash VIX
        up4pct: 3200, // Extreme rebound momentum
        down4pct: 80,
        portfolioSize: 180000
      }

      const result = calculateBidbackSignals(dotcomScenario)
      
      expect(result.signals.bigOpportunity).toBe(true)
      expect(result.signals.breadthStrength).toBe('strong')
      expect(result.position.finalPosition).toBe(40000) // Big Opportunity
      expect(result.exits.vixMatrix.vixRange).toBe('VIX > 40 (Extreme)')
    })

    it('should handle extended low volatility periods', () => {
      const lowVolScenario: BidbackCalculationInput = {
        basePosition: 18000,
        t2108: 75.5, // Bullish but not extreme
        vix: 9.2, // Historic low VIX
        up4pct: 320, // Moderate momentum
        down4pct: 180,
        portfolioSize: 200000
      }

      const result = calculateBidbackSignals(lowVolScenario)
      
      expect(result.signals.vixRegime).toBe('ultra-low')
      expect(result.position.vixMultiplier).toBe(0.8) // Reduced position in low vol
      expect(result.position.finalPosition).toBe(14400) // 18000 * 0.8
      expect(result.exits.maxHoldDays).toBe(3) // Short hold period
      expect(result.exits.stopLossPercent).toBe(-4) // Tight stops in low vol
    })
  })

  describe('Data Integrity & Mathematical Consistency', () => {
    
    it('should validate VIX_EXIT_MATRIX data structure integrity', () => {
      expect(VIX_EXIT_MATRIX).toHaveLength(7) // 7 VIX regimes
      
      VIX_EXIT_MATRIX.forEach((matrix, index) => {
        // Required fields
        expect(matrix).toHaveProperty('vixRange')
        expect(matrix).toHaveProperty('stopLossPercent')
        expect(matrix).toHaveProperty('profitTarget1Percent')
        expect(matrix).toHaveProperty('profitTarget2Percent')
        expect(matrix).toHaveProperty('maxHoldDays')
        expect(matrix).toHaveProperty('multiplier')
        
        // Value ranges
        expect(matrix.stopLossPercent).toBeLessThan(0) // Negative
        expect(matrix.stopLossPercent).toBeGreaterThan(-25) // Reasonable limit
        
        expect(matrix.profitTarget1Percent).toBeGreaterThan(0) // Positive
        expect(matrix.profitTarget1Percent).toBeLessThan(20) // Reasonable limit
        
        expect(matrix.profitTarget2Percent).toBeGreaterThan(matrix.profitTarget1Percent)
        expect(matrix.profitTarget2Percent).toBeLessThan(40) // Reasonable limit
        
        expect(matrix.maxHoldDays).toBeGreaterThan(0)
        expect(matrix.maxHoldDays).toBeLessThanOrEqual(10)
        
        expect(matrix.multiplier).toBeGreaterThan(0)
        expect(matrix.multiplier).toBeLessThanOrEqual(1.5) // Reasonable limit
      })
    })

    it('should have progressive risk parameters across VIX regimes', () => {
      // Stop losses should become more lenient with higher VIX
      for (let i = 1; i < VIX_EXIT_MATRIX.length; i++) {
        const current = VIX_EXIT_MATRIX[i]
        const previous = VIX_EXIT_MATRIX[i - 1]
        
        expect(Math.abs(current.stopLossPercent)).toBeGreaterThan(Math.abs(previous.stopLossPercent))
        expect(current.profitTarget2Percent).toBeGreaterThan(previous.profitTarget2Percent)
        expect(current.multiplier).toBeGreaterThanOrEqual(previous.multiplier)
      }
    })

    it('should maintain mathematical relationships in exit calculations', () => {
      const testPrices = [10.00, 25.50, 45.75, 67.20, 123.45, 250.00, 500.00]
      const testVixValues = [8.5, 13.2, 17.8, 22.4, 28.9, 35.6, 52.1]
      
      testVixValues.forEach(vix => {
        testPrices.forEach(price => {
          const result = calculateExitPrices(price, vix)
          
          // Mathematical consistency
          expect(result.stopLoss).toBeLessThan(price) // Stop below entry
          expect(result.profitTarget1).toBeGreaterThan(price) // Target above entry
          expect(result.profitTarget2).toBeGreaterThan(result.profitTarget1) // T2 > T1
          
          // Percentage relationships
          const matrix = getVixExitMatrix(vix)
          const expectedStop = price * (1 + matrix.stopLossPercent / 100)
          const expectedT1 = price * (1 + matrix.profitTarget1Percent / 100)
          const expectedT2 = price * (1 + matrix.profitTarget2Percent / 100)
          
          expect(result.stopLoss).toBeCloseTo(expectedStop, 2)
          expect(result.profitTarget1).toBeCloseTo(expectedT1, 2)
          expect(result.profitTarget2).toBeCloseTo(expectedT2, 2)
        })
      })
    })
  })

  describe('Edge Cases & Boundary Conditions', () => {
    
    it('should handle extremely small VIX values', () => {
      const extremelyLowVix = [0.01, 0.5, 1.0, 2.5]
      
      extremelyLowVix.forEach(vix => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix.vixRange).toBe('VIX < 12 (Ultra-Low)')
        expect(matrix.multiplier).toBe(0.8)
        
        const prices = calculateExitPrices(100.00, vix)
        expect(prices.stopLoss).toBe(96.00) // -4%
        expect(prices.profitTarget2).toBe(110.00) // +10%
      })
    })

    it('should handle extremely high VIX values', () => {
      const extremelyHighVix = [100, 150, 200, 999]
      
      extremelyHighVix.forEach(vix => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix.vixRange).toBe('VIX > 40 (Extreme)')
        expect(matrix.multiplier).toBe(1.4)
        
        const prices = calculateExitPrices(100.00, vix)
        expect(prices.stopLoss).toBe(82.00) // -18%
        expect(prices.profitTarget2).toBe(135.00) // +35%
      })
    })

    it('should handle penny stocks with extreme VIX', () => {
      const pennyStocks = [0.01, 0.05, 0.25, 0.99]
      
      pennyStocks.forEach(price => {
        const extremeVix = 75.0
        const result = calculateExitPrices(price, extremeVix)
        
        expect(result.stopLoss).toBeGreaterThan(0)
        expect(result.profitTarget1).toBeGreaterThan(price)
        expect(result.profitTarget2).toBeGreaterThan(result.profitTarget1)
        
        // Verify percentage calculations
        expect(result.stopLoss / price).toBeCloseTo(0.82, 2) // -18%
        expect(result.profitTarget2 / price).toBeCloseTo(1.35, 2) // +35%
      })
    })

    it('should handle high-priced stocks with all VIX regimes', () => {
      const highPricedStocks = [1000, 2500, 5000, 10000]
      const allVixRegimes = [10, 13, 17, 22, 27, 35, 50]
      
      highPricedStocks.forEach(price => {
        allVixRegimes.forEach(vix => {
          const result = calculateExitPrices(price, vix)
          
          expect(result.stopLoss).toBeGreaterThan(0)
          expect(result.stopLoss).toBeLessThan(price)
          expect(result.profitTarget1).toBeGreaterThan(price)
          expect(result.profitTarget2).toBeGreaterThan(result.profitTarget1)
          
          // Reasonable bounds even for high prices
          expect(result.stopLoss).toBeGreaterThan(price * 0.75) // Not more than -25%
          expect(result.profitTarget2).toBeLessThan(price * 1.5) // Not more than +50%
        })
      })
    })

    it('should handle invalid or negative entry prices gracefully', () => {
      const invalidPrices = [-100, -1, 0, NaN, Infinity]
      
      invalidPrices.forEach(price => {
        expect(() => {
          const result = calculateExitPrices(price, 20)
          // Should either handle gracefully or throw expected error
          if (!isNaN(result.stopLoss)) {
            expect(result.stopLoss).not.toBeNaN()
            expect(result.profitTarget1).not.toBeNaN()
            expect(result.profitTarget2).not.toBeNaN()
          }
        }).not.toThrow()
      })
    })
  })

  describe('Input Validation & Error Handling', () => {
    
    it('should validate BIDBACK input parameters correctly', () => {
      const validInput: BidbackCalculationInput = {
        basePosition: 10000,
        t2108: 50.0,
        vix: 20.0,
        up4pct: 500,
        down4pct: 200,
        portfolioSize: 100000
      }

      const validation = validateBidbackInput(validInput)
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect invalid BIDBACK input parameters', () => {
      const invalidInputs = [
        {
          input: { basePosition: -1000, t2108: 50, vix: 20, up4pct: 500, down4pct: 200 },
          expectedErrors: ['Base position must be greater than 0']
        },
        {
          input: { basePosition: 10000, t2108: -10, vix: 20, up4pct: 500, down4pct: 200 },
          expectedErrors: ['T2108 must be between 0 and 100']
        },
        {
          input: { basePosition: 10000, t2108: 50, vix: -5, up4pct: 500, down4pct: 200 },
          expectedErrors: ['VIX must be between 0 and 200']
        },
        {
          input: { basePosition: 10000, t2108: 50, vix: 20, up4pct: -100, down4pct: 200 },
          expectedErrors: ['Up 4% count cannot be negative']
        },
        {
          input: { basePosition: 0, t2108: 110, vix: 300, up4pct: -50, down4pct: -30, portfolioSize: -1000 },
          expectedErrors: [
            'Base position must be greater than 0',
            'T2108 must be between 0 and 100',
            'VIX must be between 0 and 200',
            'Up 4% count cannot be negative',
            'Down 4% count cannot be negative',
            'Portfolio size must be greater than 0'
          ]
        }
      ]

      invalidInputs.forEach(({ input, expectedErrors }) => {
        const validation = validateBidbackInput(input as BidbackCalculationInput)
        expect(validation.isValid).toBe(false)
        expectedErrors.forEach(error => {
          expect(validation.errors).toContain(error)
        })
      })
    })

    it('should handle missing or undefined input values', () => {
      const incompleteInputs = [
        { t2108: 50, vix: 20, up4pct: 500, down4pct: 200 }, // Missing basePosition
        { basePosition: 10000, vix: 20, up4pct: 500, down4pct: 200 }, // Missing t2108
        { basePosition: 10000, t2108: 50, up4pct: 500, down4pct: 200 }, // Missing vix
        { basePosition: 10000, t2108: 50, vix: 20, down4pct: 200 }, // Missing up4pct
        { basePosition: 10000, t2108: 50, vix: 20, up4pct: 500 } // Missing down4pct
      ]

      incompleteInputs.forEach(input => {
        expect(() => {
          calculateBidbackSignals(input as BidbackCalculationInput)
        }).not.toThrow() // Should handle gracefully or provide valid defaults
      })
    })
  })

  describe('Performance & Stress Testing', () => {
    
    it('should handle rapid VIX changes efficiently', () => {
      const startTime = performance.now()
      
      // Simulate rapid VIX changes (like during market volatility)
      const vixSequence = []
      for (let i = 0; i < 10000; i++) {
        vixSequence.push(10 + Math.sin(i / 100) * 30) // Oscillating VIX 10-40
      }
      
      vixSequence.forEach(vix => {
        getVixExitMatrix(vix)
        calculateExitPrices(100.00, vix)
      })
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      expect(executionTime).toBeLessThan(100) // Should handle 10k VIX changes quickly
    })

    it('should handle memory efficiently for large datasets', () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Process large number of scenarios
      const scenarios = []
      for (let i = 0; i < 5000; i++) {
        const scenario = {
          basePosition: 10000 + (i * 100),
          t2108: Math.random() * 100,
          vix: 8 + Math.random() * 60,
          up4pct: Math.random() * 2000,
          down4pct: Math.random() * 1000,
          portfolioSize: 100000 + (i * 1000)
        }
        
        const result = calculateBidbackSignals(scenario)
        const exitPrices = calculateExitPrices(50 + (i * 0.1), scenario.vix)
        
        scenarios.push({ result, exitPrices })
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024 // MB
      
      // Memory increase should be reasonable for 5000 scenarios
      expect(memoryIncrease).toBeLessThan(100) // Less than 100MB
      expect(scenarios).toHaveLength(5000)
    })

    it('should maintain precision across many calculations', () => {
      let cumulativeError = 0
      const iterations = 1000
      
      for (let i = 0; i < iterations; i++) {
        const entryPrice = 100.00
        const vix = 20.0
        
        const result = calculateExitPrices(entryPrice, vix)
        const matrix = getVixExitMatrix(vix)
        
        // Calculate expected values
        const expectedStop = entryPrice * (1 + matrix.stopLossPercent / 100)
        const expectedT1 = entryPrice * (1 + matrix.profitTarget1Percent / 100)
        const expectedT2 = entryPrice * (1 + matrix.profitTarget2Percent / 100)
        
        // Accumulate precision errors
        cumulativeError += Math.abs(result.stopLoss - expectedStop)
        cumulativeError += Math.abs(result.profitTarget1 - expectedT1)
        cumulativeError += Math.abs(result.profitTarget2 - expectedT2)
      }
      
      const averageError = cumulativeError / (iterations * 3)
      expect(averageError).toBeLessThan(0.001) // Very small cumulative precision error
    })
  })

  describe('Real-World Integration Validation', () => {
    
    it('should handle complete trading day workflow', () => {
      const tradingDate = new Date('2025-03-15')
      
      const morningScenarios = [
        { vix: 12.5, t2108: 65.2, up4pct: 380, description: 'Market Open' },
        { vix: 15.8, t2108: 58.7, up4pct: 520, description: 'Mid Morning' },
        { vix: 18.2, t2108: 52.3, up4pct: 680, description: 'Late Morning' },
        { vix: 22.1, t2108: 48.9, up4pct: 850, description: 'Midday' },
        { vix: 19.7, t2108: 55.1, up4pct: 720, description: 'Afternoon' },
        { vix: 16.3, t2108: 61.8, up4pct: 590, description: 'Market Close' }
      ]

      morningScenarios.forEach(({ vix, t2108, up4pct, description }) => {
        const input: BidbackCalculationInput = {
          basePosition: 15000,
          t2108,
          vix,
          up4pct,
          down4pct: 200,
          portfolioSize: 150000
        }

        const result = calculateBidbackSignals(input)
        const exitPrices = calculateExitPrices(75.50, vix)
        const exitDate = calculateExitDate(tradingDate, vix)

        // Validate complete trading plan for each time
        expect(result.signals).toBeDefined()
        expect(result.position.finalPosition).toBeGreaterThanOrEqual(0)
        expect(exitPrices.stopLoss).toBeGreaterThan(0)
        expect(exitDate.getTime()).toBeGreaterThan(tradingDate.getTime())
        
        console.log(`${description}: VIX ${vix}, Position ${result.position.finalPosition}, Exit Date ${exitDate.toDateString()}`)
      })
    })

    it('should validate against historical market events', () => {
      const historicalEvents = [
        {
          date: '2008-10-10', // Lehman Crisis
          scenario: { basePosition: 20000, t2108: 5.2, vix: 89.5, up4pct: 2800, down4pct: 120 },
          entryPrice: 150.00,
          description: '2008 Financial Crisis'
        },
        {
          date: '2020-03-20', // COVID Crash
          scenario: { basePosition: 18000, t2108: 8.7, vix: 82.7, up4pct: 2100, down4pct: 95 },
          entryPrice: 220.00,
          description: 'COVID Market Crash'
        },
        {
          date: '2018-02-06', // VIX Spike
          scenario: { basePosition: 12000, t2108: 35.8, vix: 50.3, up4pct: 950, down4pct: 380 },
          entryPrice: 185.50,
          description: 'VIX Spike Event'
        },
        {
          date: '2017-07-15', // Low Vol Period
          scenario: { basePosition: 15000, t2108: 72.3, vix: 9.8, up4pct: 320, down4pct: 180 },
          entryPrice: 95.75,
          description: 'Extended Low Volatility'
        }
      ]

      historicalEvents.forEach(({ date, scenario, entryPrice, description }) => {
        const input: BidbackCalculationInput = {
          ...scenario,
          portfolioSize: 200000
        }

        const result = calculateBidbackSignals(input)
        const exitPrices = calculateExitPrices(entryPrice, scenario.vix)
        const entryDate = new Date(date)
        const exitDate = calculateExitDate(entryDate, scenario.vix)

        // Validate historical scenario handling
        expect(result).toBeDefined()
        expect(exitPrices).toBeDefined()
        expect(exitDate).toBeDefined()
        
        // Log historical validation
        console.log(`${description}: Big Opp: ${result.signals.bigOpportunity}, VIX Regime: ${result.signals.vixRegime}, Position: ${result.position.finalPosition}`)
      })
    })
  })
})