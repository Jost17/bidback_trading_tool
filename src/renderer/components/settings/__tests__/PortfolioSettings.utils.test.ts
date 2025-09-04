import { describe, it, expect } from 'vitest'

/**
 * Utility functions for Portfolio Settings calculations
 * These mirror the logic in the PortfolioSettings component
 */

interface PortfolioSettings {
  portfolioSize: number
  baseSizePercentage: number
  maxHeatPercentage: number
  maxPositions: number
  lastUpdated: string
}

// Calculate derived values from portfolio settings
export function calculateDerivedValues(settings: PortfolioSettings) {
  return {
    basePositionSize: (settings.portfolioSize * settings.baseSizePercentage) / 100,
    maxHeatDollar: (settings.portfolioSize * settings.maxHeatPercentage) / 100,
    maxSinglePosition: settings.portfolioSize * 0.30, // 30% max single position per BIDBACK rules
    avgPositionSize: (settings.portfolioSize * settings.maxHeatPercentage) / 100 / settings.maxPositions
  }
}

// Validate portfolio settings according to BIDBACK rules
export function validateBIDBackSettings(settings: PortfolioSettings): Record<string, string> {
  const errors: Record<string, string> = {}
  
  // Portfolio size validation
  if (settings.portfolioSize < 1000) {
    errors.portfolioSize = 'Portfolio size must be at least $1,000'
  }
  if (settings.portfolioSize > 50000000) {
    errors.portfolioSize = 'Portfolio size seems unreasonably high'
  }
  
  // Base size validation
  if (settings.baseSizePercentage < 1 || settings.baseSizePercentage > 50) {
    errors.baseSizePercentage = 'Base size must be between 1% and 50%'
  }
  
  // Heat validation
  if (settings.maxHeatPercentage < 10 || settings.maxHeatPercentage > 100) {
    errors.maxHeatPercentage = 'Max heat must be between 10% and 100%'
  }
  
  // Positions validation
  if (settings.maxPositions < 1 || settings.maxPositions > 20) {
    errors.maxPositions = 'Max positions must be between 1 and 20'
  }
  
  return errors
}

// Calculate position size with BIDBACK multipliers
export function calculatePositionSize(
  basePosition: number,
  vixMultiplier: number,
  breadthMultiplier: number,
  opportunityMultiplier: number = 1.0,
  maxSinglePosition: number
): number {
  const calculatedSize = basePosition * vixMultiplier * breadthMultiplier * opportunityMultiplier
  return Math.min(calculatedSize, maxSinglePosition)
}

// Get VIX multiplier based on VIX level
export function getVixMultiplier(vix: number): number {
  if (vix < 15) return 1.4
  if (vix < 20) return 1.2
  if (vix < 25) return 1.0
  if (vix < 30) return 0.9
  if (vix < 40) return 0.8
  return 0.6
}

// Get breadth multiplier based on breadth score
export function getBreadthMultiplier(breadthScore: number): number {
  if (breadthScore > 70) return 2.5
  if (breadthScore > 50) return 2.0
  if (breadthScore > 30) return 1.5
  if (breadthScore > 10) return 1.0
  if (breadthScore > 0) return 0.5
  return 0.0 // No new positions in terrible market conditions
}

describe('Portfolio Settings Utility Functions', () => {
  describe('calculateDerivedValues', () => {
    it('should calculate correct derived values for standard BIDBACK settings', () => {
      const settings: PortfolioSettings = {
        portfolioSize: 100000,
        baseSizePercentage: 10,
        maxHeatPercentage: 80,
        maxPositions: 8,
        lastUpdated: new Date().toISOString()
      }
      
      const derived = calculateDerivedValues(settings)
      
      expect(derived.basePositionSize).toBe(10000) // 10% of 100k
      expect(derived.maxHeatDollar).toBe(80000) // 80% of 100k
      expect(derived.maxSinglePosition).toBe(30000) // 30% of 100k
      expect(derived.avgPositionSize).toBe(10000) // 80k heat / 8 positions
    })
    
    it('should handle edge case calculations correctly', () => {
      const settings: PortfolioSettings = {
        portfolioSize: 250000,
        baseSizePercentage: 15,
        maxHeatPercentage: 90,
        maxPositions: 12,
        lastUpdated: new Date().toISOString()
      }
      
      const derived = calculateDerivedValues(settings)
      
      expect(derived.basePositionSize).toBe(37500) // 15% of 250k
      expect(derived.maxHeatDollar).toBe(225000) // 90% of 250k
      expect(derived.maxSinglePosition).toBe(75000) // 30% of 250k
      expect(derived.avgPositionSize).toBe(18750) // 225k heat / 12 positions
    })
    
    it('should handle decimal percentages precisely', () => {
      const settings: PortfolioSettings = {
        portfolioSize: 150000,
        baseSizePercentage: 12.5,
        maxHeatPercentage: 75.5,
        maxPositions: 6,
        lastUpdated: new Date().toISOString()
      }
      
      const derived = calculateDerivedValues(settings)
      
      expect(derived.basePositionSize).toBe(18750) // 12.5% of 150k
      expect(derived.maxHeatDollar).toBe(113250) // 75.5% of 150k
      expect(derived.maxSinglePosition).toBe(45000) // 30% of 150k
      expect(derived.avgPositionSize).toBe(18875) // 113.25k heat / 6 positions
    })
  })
  
  describe('validateBIDBackSettings', () => {
    it('should pass validation for standard BIDBACK configuration', () => {
      const settings: PortfolioSettings = {
        portfolioSize: 100000,
        baseSizePercentage: 10,
        maxHeatPercentage: 80,
        maxPositions: 8,
        lastUpdated: new Date().toISOString()
      }
      
      const errors = validateBIDBackSettings(settings)
      expect(Object.keys(errors)).toHaveLength(0)
    })
    
    it('should validate portfolio size boundaries correctly', () => {
      // Test minimum boundary
      let settings: PortfolioSettings = {
        portfolioSize: 999,
        baseSizePercentage: 10,
        maxHeatPercentage: 80,
        maxPositions: 8,
        lastUpdated: new Date().toISOString()
      }
      
      let errors = validateBIDBackSettings(settings)
      expect(errors.portfolioSize).toBe('Portfolio size must be at least $1,000')
      
      // Test exactly at minimum
      settings.portfolioSize = 1000
      errors = validateBIDBackSettings(settings)
      expect(errors.portfolioSize).toBeUndefined()
      
      // Test maximum boundary
      settings.portfolioSize = 50000001
      errors = validateBIDBackSettings(settings)
      expect(errors.portfolioSize).toBe('Portfolio size seems unreasonably high')
      
      // Test exactly at maximum
      settings.portfolioSize = 50000000
      errors = validateBIDBackSettings(settings)
      expect(errors.portfolioSize).toBeUndefined()
    })
    
    it('should validate base size percentage boundaries', () => {
      const baseSettings: PortfolioSettings = {
        portfolioSize: 100000,
        baseSizePercentage: 0,
        maxHeatPercentage: 80,
        maxPositions: 8,
        lastUpdated: new Date().toISOString()
      }
      
      // Test below minimum
      baseSettings.baseSizePercentage = 0.5
      let errors = validateBIDBackSettings(baseSettings)
      expect(errors.baseSizePercentage).toBe('Base size must be between 1% and 50%')
      
      // Test at minimum
      baseSettings.baseSizePercentage = 1
      errors = validateBIDBackSettings(baseSettings)
      expect(errors.baseSizePercentage).toBeUndefined()
      
      // Test above maximum
      baseSettings.baseSizePercentage = 51
      errors = validateBIDBackSettings(baseSettings)
      expect(errors.baseSizePercentage).toBe('Base size must be between 1% and 50%')
      
      // Test at maximum
      baseSettings.baseSizePercentage = 50
      errors = validateBIDBackSettings(baseSettings)
      expect(errors.baseSizePercentage).toBeUndefined()
    })
    
    it('should validate heat percentage boundaries', () => {
      const baseSettings: PortfolioSettings = {
        portfolioSize: 100000,
        baseSizePercentage: 10,
        maxHeatPercentage: 0,
        maxPositions: 8,
        lastUpdated: new Date().toISOString()
      }
      
      // Test below minimum
      baseSettings.maxHeatPercentage = 5
      let errors = validateBIDBackSettings(baseSettings)
      expect(errors.maxHeatPercentage).toBe('Max heat must be between 10% and 100%')
      
      // Test at minimum
      baseSettings.maxHeatPercentage = 10
      errors = validateBIDBackSettings(baseSettings)
      expect(errors.maxHeatPercentage).toBeUndefined()
      
      // Test above maximum
      baseSettings.maxHeatPercentage = 101
      errors = validateBIDBackSettings(baseSettings)
      expect(errors.maxHeatPercentage).toBe('Max heat must be between 10% and 100%')
      
      // Test at maximum
      baseSettings.maxHeatPercentage = 100
      errors = validateBIDBackSettings(baseSettings)
      expect(errors.maxHeatPercentage).toBeUndefined()
    })
    
    it('should validate position count boundaries', () => {
      const baseSettings: PortfolioSettings = {
        portfolioSize: 100000,
        baseSizePercentage: 10,
        maxHeatPercentage: 80,
        maxPositions: 0,
        lastUpdated: new Date().toISOString()
      }
      
      // Test below minimum
      baseSettings.maxPositions = 0
      let errors = validateBIDBackSettings(baseSettings)
      expect(errors.maxPositions).toBe('Max positions must be between 1 and 20')
      
      // Test at minimum
      baseSettings.maxPositions = 1
      errors = validateBIDBackSettings(baseSettings)
      expect(errors.maxPositions).toBeUndefined()
      
      // Test above maximum
      baseSettings.maxPositions = 21
      errors = validateBIDBackSettings(baseSettings)
      expect(errors.maxPositions).toBe('Max positions must be between 1 and 20')
      
      // Test at maximum
      baseSettings.maxPositions = 20
      errors = validateBIDBackSettings(baseSettings)
      expect(errors.maxPositions).toBeUndefined()
    })
  })
  
  describe('BIDBACK Position Sizing Calculations', () => {
    describe('calculatePositionSize', () => {
      it('should calculate position sizes with standard multipliers', () => {
        const basePosition = 10000
        const maxSinglePosition = 30000
        
        // Normal market conditions
        const normalSize = calculatePositionSize(basePosition, 1.0, 1.5, 1.0, maxSinglePosition)
        expect(normalSize).toBe(15000) // 10k * 1.0 * 1.5 * 1.0
        
        // Bull market conditions
        const bullSize = calculatePositionSize(basePosition, 1.4, 2.5, 2.0, maxSinglePosition)
        expect(bullSize).toBe(30000) // Would be 70k but capped at 30k
        
        // Bear market conditions
        const bearSize = calculatePositionSize(basePosition, 0.8, 0.5, 1.0, maxSinglePosition)
        expect(bearSize).toBe(4000) // 10k * 0.8 * 0.5 * 1.0
      })
      
      it('should respect maximum single position limit', () => {
        const basePosition = 10000
        const maxSinglePosition = 25000
        
        // Test oversized calculation
        const oversizedCalculation = calculatePositionSize(basePosition, 2.0, 2.0, 2.0, maxSinglePosition)
        expect(oversizedCalculation).toBe(25000) // Capped at max
        
        // Test normal calculation under limit
        const normalCalculation = calculatePositionSize(basePosition, 1.0, 1.0, 2.0, maxSinglePosition)
        expect(normalCalculation).toBe(20000) // Not capped
      })
    })
    
    describe('getVixMultiplier', () => {
      it('should return correct VIX multipliers for different volatility levels', () => {
        // Low volatility
        expect(getVixMultiplier(12)).toBe(1.4)
        expect(getVixMultiplier(14.9)).toBe(1.4)
        
        // Moderate volatility
        expect(getVixMultiplier(15)).toBe(1.2)
        expect(getVixMultiplier(19.9)).toBe(1.2)
        
        // Normal volatility
        expect(getVixMultiplier(20)).toBe(1.0)
        expect(getVixMultiplier(24.9)).toBe(1.0)
        
        // Elevated volatility
        expect(getVixMultiplier(25)).toBe(0.9)
        expect(getVixMultiplier(29.9)).toBe(0.9)
        
        // High volatility
        expect(getVixMultiplier(30)).toBe(0.8)
        expect(getVixMultiplier(39.9)).toBe(0.8)
        
        // Extreme volatility
        expect(getVixMultiplier(40)).toBe(0.6)
        expect(getVixMultiplier(80)).toBe(0.6)
      })
    })
    
    describe('getBreadthMultiplier', () => {
      it('should return correct breadth multipliers for different market conditions', () => {
        // Strong breadth (bull market)
        expect(getBreadthMultiplier(75)).toBe(2.5)
        expect(getBreadthMultiplier(100)).toBe(2.5)
        
        // Good breadth
        expect(getBreadthMultiplier(60)).toBe(2.0)
        expect(getBreadthMultiplier(70)).toBe(2.0)
        
        // Neutral breadth
        expect(getBreadthMultiplier(40)).toBe(1.5)
        expect(getBreadthMultiplier(50)).toBe(1.5)
        
        // Weak breadth
        expect(getBreadthMultiplier(20)).toBe(1.0)
        expect(getBreadthMultiplier(30)).toBe(1.0)
        
        // Poor breadth
        expect(getBreadthMultiplier(5)).toBe(0.5)
        expect(getBreadthMultiplier(10)).toBe(0.5)
        
        // Terrible breadth (no new positions)
        expect(getBreadthMultiplier(-10)).toBe(0.0)
        expect(getBreadthMultiplier(0)).toBe(0.0)
      })
    })
  })
  
  describe('Real-world Portfolio Scenarios', () => {
    it('should handle conservative portfolio configuration', () => {
      const conservativeSettings: PortfolioSettings = {
        portfolioSize: 50000,
        baseSizePercentage: 8,
        maxHeatPercentage: 60,
        maxPositions: 6,
        lastUpdated: new Date().toISOString()
      }
      
      const derived = calculateDerivedValues(conservativeSettings)
      const errors = validateBIDBackSettings(conservativeSettings)
      
      expect(Object.keys(errors)).toHaveLength(0) // Should pass validation
      expect(derived.basePositionSize).toBe(4000)
      expect(derived.maxHeatDollar).toBe(30000)
      expect(derived.avgPositionSize).toBe(5000)
    })
    
    it('should handle aggressive portfolio configuration', () => {
      const aggressiveSettings: PortfolioSettings = {
        portfolioSize: 500000,
        baseSizePercentage: 15,
        maxHeatPercentage: 90,
        maxPositions: 12,
        lastUpdated: new Date().toISOString()
      }
      
      const derived = calculateDerivedValues(aggressiveSettings)
      const errors = validateBIDBackSettings(aggressiveSettings)
      
      expect(Object.keys(errors)).toHaveLength(0) // Should pass validation
      expect(derived.basePositionSize).toBe(75000)
      expect(derived.maxHeatDollar).toBe(450000)
      expect(derived.avgPositionSize).toBe(37500)
    })
    
    it('should calculate realistic position sizes for different market conditions', () => {
      const settings: PortfolioSettings = {
        portfolioSize: 200000,
        baseSizePercentage: 10,
        maxHeatPercentage: 80,
        maxPositions: 8,
        lastUpdated: new Date().toISOString()
      }
      
      const derived = calculateDerivedValues(settings)
      const basePosition = derived.basePositionSize // $20,000
      const maxSingle = derived.maxSinglePosition // $60,000
      
      // Bull market scenario (VIX 15, Breadth 80, Good opportunity)
      const bullPosition = calculatePositionSize(basePosition, 1.2, 2.5, 1.5, maxSingle)
      expect(bullPosition).toBe(60000) // Capped at max single position
      
      // Normal market scenario (VIX 22, Breadth 40, Standard opportunity)
      const normalPosition = calculatePositionSize(basePosition, 1.0, 1.5, 1.0, maxSingle)
      expect(normalPosition).toBe(30000) // 20k * 1.0 * 1.5 * 1.0
      
      // Bear market scenario (VIX 35, Breadth 15, Standard opportunity)
      const bearPosition = calculatePositionSize(basePosition, 0.8, 1.0, 1.0, maxSingle)
      expect(bearPosition).toBe(16000) // 20k * 0.8 * 1.0 * 1.0
      
      // Crisis scenario (VIX 50, Breadth -5)
      const crisisPosition = calculatePositionSize(basePosition, 0.6, 0.0, 1.0, maxSingle)
      expect(crisisPosition).toBe(0) // No positions in crisis
    })
  })
})