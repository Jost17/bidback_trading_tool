/**
 * BIDBACK Calculations Test Suite
 * Testing the core BIDBACK Master System calculation logic:
 * - Big Opportunity Detection (T2108 < 20 + Up4% > 1000)
 * - Avoid Entry Signals (Up4% < 150)
 * - VIX-based Position Multipliers (0.8x - 1.4x)
 * - Position Sizing Calculations
 * - VIX-based Exit Price Calculations
 */

import { describe, it, expect, vi } from 'vitest'
import { 
  calculateBigOpportunity,
  calculateAvoidEntry,
  calculateVixMultiplier,
  calculatePositionSize,
  calculateBidbackSignals,
  VIXLevel,
  BidbackCalculationInput,
  BidbackCalculationResult
} from './bidback-calculations'

describe('BIDBACK Master System Calculations', () => {
  describe('Big Opportunity Detection', () => {
    it('should detect Big Opportunity when T2108 < 20 AND Up4% > 1000', () => {
      // Classic Big Opportunity scenario
      expect(calculateBigOpportunity(15.5, 1250)).toBe(true)
      expect(calculateBigOpportunity(19.9, 1001)).toBe(true)
      expect(calculateBigOpportunity(20.0, 1000)).toBe(false) // Boundary case
      expect(calculateBigOpportunity(19.9, 1000)).toBe(false) // Boundary case
    })

    it('should detect Big Opportunity when T2108 < 30 AND Up4% > 1000 (extended criteria)', () => {
      // Extended Big Opportunity criteria from SPXL example
      expect(calculateBigOpportunity(28.5, 1250)).toBe(true)
      expect(calculateBigOpportunity(29.9, 1001)).toBe(true)
      expect(calculateBigOpportunity(30.1, 1250)).toBe(false)
      expect(calculateBigOpportunity(28.5, 999)).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(calculateBigOpportunity(0, 2000)).toBe(true) // Extreme bearish with high momentum
      expect(calculateBigOpportunity(5.5, 1500)).toBe(true) // Strong bearish conditions
      expect(calculateBigOpportunity(35.0, 800)).toBe(false) // Normal T2108, low momentum
    })
  })

  describe('Avoid Entry Detection', () => {
    it('should trigger Avoid Entry when Up4% < 150', () => {
      expect(calculateAvoidEntry(120, 45, 75.5)).toBe(true)
      expect(calculateAvoidEntry(149, 200, 60.2)).toBe(true)
      expect(calculateAvoidEntry(150, 50, 80.0)).toBe(false) // Boundary case
      expect(calculateAvoidEntry(420, 180, 68.2)).toBe(false) // Normal conditions
    })

    it('should consider additional avoid entry criteria', () => {
      // Additional criteria: T2108 > 80 (overbought)
      expect(calculateAvoidEntry(200, 100, 85.5)).toBe(true) // High T2108 override
      expect(calculateAvoidEntry(180, 120, 82.0)).toBe(true) // High T2108 with weak breadth
      expect(calculateAvoidEntry(300, 80, 75.0)).toBe(false) // Strong breadth, normal T2108
    })

    it('should handle extreme market conditions', () => {
      expect(calculateAvoidEntry(50, 300, 90.0)).toBe(true) // Weak Up4%, overbought
      expect(calculateAvoidEntry(2000, 25, 95.0)).toBe(true) // Strong Up4% but extreme overbought
      expect(calculateAvoidEntry(1500, 500, 45.0)).toBe(false) // Strong conditions, reasonable T2108
    })
  })

  describe('VIX Multiplier Calculations', () => {
    it('should apply correct VIX multipliers based on VIX levels', () => {
      // Ultra-Low: VIX < 12 → 0.8x
      expect(calculateVixMultiplier(8.5)).toEqual({ level: 'ultra-low', multiplier: 0.8 })
      expect(calculateVixMultiplier(11.9)).toEqual({ level: 'ultra-low', multiplier: 0.8 })
      
      // Low: VIX 12-15 → 0.9x
      expect(calculateVixMultiplier(12.0)).toEqual({ level: 'low', multiplier: 0.9 })
      expect(calculateVixMultiplier(14.9)).toEqual({ level: 'low', multiplier: 0.9 })
      
      // Normal: VIX 15-20 → 1.0x
      expect(calculateVixMultiplier(15.0)).toEqual({ level: 'normal', multiplier: 1.0 })
      expect(calculateVixMultiplier(19.9)).toEqual({ level: 'normal', multiplier: 1.0 })
      
      // Elevated: VIX 20-25 → 1.1x
      expect(calculateVixMultiplier(20.0)).toEqual({ level: 'elevated', multiplier: 1.1 })
      expect(calculateVixMultiplier(24.9)).toEqual({ level: 'elevated', multiplier: 1.1 })
      
      // High: VIX 25-30 → 1.2x
      expect(calculateVixMultiplier(25.0)).toEqual({ level: 'high', multiplier: 1.2 })
      expect(calculateVixMultiplier(29.9)).toEqual({ level: 'high', multiplier: 1.2 })
      
      // Very High: VIX 30-40 → 1.3x
      expect(calculateVixMultiplier(30.0)).toEqual({ level: 'very-high', multiplier: 1.3 })
      expect(calculateVixMultiplier(39.9)).toEqual({ level: 'very-high', multiplier: 1.3 })
      
      // Extreme: VIX > 40 → 1.4x
      expect(calculateVixMultiplier(40.0)).toEqual({ level: 'extreme', multiplier: 1.4 })
      expect(calculateVixMultiplier(75.0)).toEqual({ level: 'extreme', multiplier: 1.4 })
    })

    it('should handle edge cases and invalid inputs', () => {
      expect(calculateVixMultiplier(0)).toEqual({ level: 'ultra-low', multiplier: 0.8 })
      expect(calculateVixMultiplier(-5)).toEqual({ level: 'ultra-low', multiplier: 0.8 }) // Invalid but handled
    })
  })

  describe('Position Size Calculations', () => {
    const basePosition = 10000

    it('should calculate position size for Big Opportunity scenarios', () => {
      const input: BidbackCalculationInput = {
        basePosition,
        t2108: 28.5,
        vix: 22.4,
        up4pct: 1250,
        down4pct: 85
      }

      const result = calculatePositionSize(input)
      
      expect(result.isBigOpportunity).toBe(true)
      expect(result.isAvoidEntry).toBe(false)
      expect(result.vixMultiplier).toBe(1.1) // VIX 20-25
      expect(result.bigOpportunityMultiplier).toBe(2.0) // Big Opportunity override
      expect(result.finalPosition).toBe(20000) // 10000 * 2.0
      expect(result.portfolioHeatPercent).toBeGreaterThan(10)
    })

    it('should calculate position size for normal VIX conditions', () => {
      const input: BidbackCalculationInput = {
        basePosition,
        t2108: 68.2,
        vix: 11.8,
        up4pct: 420,
        down4pct: 180
      }

      const result = calculatePositionSize(input)
      
      expect(result.isBigOpportunity).toBe(false)
      expect(result.isAvoidEntry).toBe(false)
      expect(result.vixMultiplier).toBe(0.8) // VIX < 12
      expect(result.bigOpportunityMultiplier).toBe(1.0) // No Big Opportunity
      expect(result.finalPosition).toBe(8000) // 10000 * 0.8
      expect(result.portfolioHeatPercent).toBeLessThan(10)
    })

    it('should calculate zero position for Avoid Entry conditions', () => {
      const input: BidbackCalculationInput = {
        basePosition,
        t2108: 82.5,
        vix: 15.2,
        up4pct: 120, // < 150 = Avoid Entry
        down4pct: 45
      }

      const result = calculatePositionSize(input)
      
      expect(result.isBigOpportunity).toBe(false)
      expect(result.isAvoidEntry).toBe(true)
      expect(result.vixMultiplier).toBe(1.0) // VIX 15-20
      expect(result.finalPosition).toBe(0) // Avoid Entry override
      expect(result.portfolioHeatPercent).toBe(0)
    })

    it('should handle extreme VIX scenarios', () => {
      const extremeVixInput: BidbackCalculationInput = {
        basePosition,
        t2108: 45.0,
        vix: 50.0, // Extreme VIX
        up4pct: 300,
        down4pct: 400
      }

      const result = calculatePositionSize(extremeVixInput)
      
      expect(result.vixMultiplier).toBe(1.4) // Extreme VIX
      expect(result.finalPosition).toBe(14000) // 10000 * 1.4
    })
  })

  describe('Integrated BIDBACK Signals', () => {
    it('should calculate comprehensive BIDBACK signals for SPXL example', () => {
      const spxlInput: BidbackCalculationInput = {
        basePosition: 10000,
        t2108: 28.5,
        vix: 22.4,
        up4pct: 1250,
        down4pct: 85,
        portfolioSize: 100000
      }

      const result = calculateBidbackSignals(spxlInput)
      
      expect(result.signals.bigOpportunity).toBe(true)
      expect(result.signals.avoidEntry).toBe(false)
      expect(result.signals.vixRegime).toBe('elevated')
      expect(result.position.finalPosition).toBe(20000) // Big Opportunity 2.0x
      expect(result.position.portfolioHeatPercent).toBe(20.0) // 20000/100000
      
      // Exit calculations based on VIX 20-25
      expect(result.exits.stopLossPercent).toBe(-10)
      expect(result.exits.profitTarget1Percent).toBe(9)
      expect(result.exits.profitTarget2Percent).toBe(20)
      expect(result.exits.maxHoldDays).toBe(5)
    })

    it('should calculate comprehensive BIDBACK signals for TQQQ example', () => {
      const tqqqInput: BidbackCalculationInput = {
        basePosition: 10000,
        t2108: 68.2,
        vix: 11.8,
        up4pct: 420,
        down4pct: 180,
        portfolioSize: 100000
      }

      const result = calculateBidbackSignals(tqqqInput)
      
      expect(result.signals.bigOpportunity).toBe(false)
      expect(result.signals.avoidEntry).toBe(false)
      expect(result.signals.vixRegime).toBe('ultra-low')
      expect(result.position.finalPosition).toBe(8000) // VIX ultra-low 0.8x
      expect(result.position.portfolioHeatPercent).toBe(8.0)
      
      // Exit calculations based on VIX < 12
      expect(result.exits.stopLossPercent).toBe(-4)
      expect(result.exits.profitTarget1Percent).toBe(4)
      expect(result.exits.profitTarget2Percent).toBe(10)
      expect(result.exits.maxHoldDays).toBe(3)
    })

    it('should calculate comprehensive BIDBACK signals for SOXL Avoid Entry example', () => {
      const soxlInput: BidbackCalculationInput = {
        basePosition: 10000,
        t2108: 82.5,
        vix: 15.2,
        up4pct: 120, // Triggers Avoid Entry
        down4pct: 45,
        portfolioSize: 100000
      }

      const result = calculateBidbackSignals(soxlInput)
      
      expect(result.signals.bigOpportunity).toBe(false)
      expect(result.signals.avoidEntry).toBe(true)
      expect(result.signals.vixRegime).toBe('normal')
      expect(result.position.finalPosition).toBe(0) // Avoid Entry
      expect(result.position.portfolioHeatPercent).toBe(0)
      
      // Exit calculations still calculated for reference
      expect(result.exits.stopLossPercent).toBe(-8)
      expect(result.exits.profitTarget1Percent).toBe(7)
      expect(result.exits.profitTarget2Percent).toBe(15)
      expect(result.exits.maxHoldDays).toBe(5) // VIX 15-20 = 5 days max hold
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing or invalid input values', () => {
      const invalidInput: BidbackCalculationInput = {
        basePosition: 0,
        t2108: -5, // Invalid
        vix: 200, // Extreme but possible
        up4pct: -10, // Invalid
        down4pct: -20 // Invalid
      }

      const result = calculateBidbackSignals(invalidInput)
      
      // Should still return valid result structure
      expect(result.position.finalPosition).toBe(0)
      expect(result.signals).toBeDefined()
      expect(result.exits).toBeDefined()
    })

    it('should handle extreme market conditions gracefully', () => {
      const extremeInput: BidbackCalculationInput = {
        basePosition: 50000,
        t2108: 5.0, // Extreme bearish
        vix: 80.0, // Market crash scenario
        up4pct: 3000, // Extreme momentum
        down4pct: 50
      }

      const result = calculateBidbackSignals(extremeInput)
      
      expect(result.signals.bigOpportunity).toBe(true) // T2108 < 30, Up4% > 1000
      expect(result.signals.vixRegime).toBe('extreme')
      expect(result.position.vixMultiplier).toBe(1.4)
      expect(result.position.bigOpportunityMultiplier).toBe(2.0)
      expect(result.position.finalPosition).toBe(100000) // 50000 * 2.0 (Big Opp overrides VIX)
    })
  })

  describe('Performance and Optimization', () => {
    it('should calculate results efficiently for bulk operations', () => {
      const startTime = performance.now()
      
      // Calculate 1000 scenarios
      for (let i = 0; i < 1000; i++) {
        const input: BidbackCalculationInput = {
          basePosition: 10000 + (i * 100),
          t2108: Math.random() * 100,
          vix: Math.random() * 60 + 8,
          up4pct: Math.random() * 2000,
          down4pct: Math.random() * 1000
        }
        calculateBidbackSignals(input)
      }
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // Should complete 1000 calculations in reasonable time (<100ms)
      expect(executionTime).toBeLessThan(100)
    })

    it('should have consistent results for identical inputs', () => {
      const input: BidbackCalculationInput = {
        basePosition: 10000,
        t2108: 25.5,
        vix: 18.2,
        up4pct: 850,
        down4pct: 220
      }

      const result1 = calculateBidbackSignals(input)
      const result2 = calculateBidbackSignals(input)
      const result3 = calculateBidbackSignals(input)
      
      // Compare all fields except timing-sensitive metadata
      expect(result1.signals).toEqual(result2.signals)
      expect(result1.position).toEqual(result2.position)
      expect(result1.exits).toEqual(result2.exits)
      expect(result1.metadata.algorithm).toBe(result2.metadata.algorithm)
      expect(result1.metadata.confidence).toBe(result2.metadata.confidence)
      
      expect(result2.signals).toEqual(result3.signals)
      expect(result2.position).toEqual(result3.position)
      expect(result2.exits).toEqual(result3.exits)
    })
  })
})