/**
 * Bidback Master System Calculation Engine
 * 
 * This module implements the core Bidback trading system calculations including:
 * - Big Opportunity Detection (T2108 < 30 + Up4% > 1000 → 2.0x multiplier)
 * - Avoid Entry Signals (Up4% < 150 → no position)
 * - VIX-based Position Multipliers (0.8x - 1.4x based on VIX levels)
 * - Position Sizing with Portfolio Heat calculations
 * - VIX-based Exit Price and Time calculations
 */

import { getVixExitMatrix } from './holidayCalendar'
import { VixExitMatrix } from '../types/calendar'

export type VIXLevel = 'ultra-low' | 'low' | 'normal' | 'elevated' | 'high' | 'very-high' | 'extreme'

export interface BidbackCalculationInput {
  basePosition: number
  t2108: number
  vix: number
  up4pct: number
  down4pct: number
  portfolioSize?: number
}

export interface VixMultiplierResult {
  level: VIXLevel
  multiplier: number
}

export interface BidbackSignals {
  bigOpportunity: boolean
  avoidEntry: boolean
  vixRegime: VIXLevel
  breadthStrength: 'weak' | 'moderate' | 'strong'
  positionDeterioration: number
}

export interface PositionCalculationResult {
  basePosition: number
  vixMultiplier: number
  bigOpportunityMultiplier: number
  finalPosition: number
  portfolioHeatPercent: number
  isBigOpportunity: boolean
  isAvoidEntry: boolean
}

export interface ExitCalculationResult {
  stopLossPercent: number
  profitTarget1Percent: number
  profitTarget2Percent: number
  maxHoldDays: number
  vixMatrix: VixExitMatrix
}

export interface BidbackCalculationResult {
  signals: BidbackSignals
  position: PositionCalculationResult
  exits: ExitCalculationResult
  metadata: {
    calculationTime: number
    algorithm: string
    confidence: number
  }
}

/**
 * Detect Big Opportunity conditions
 * Rules: T2108 < 30 AND Up4% > 1000 = Big Opportunity (2.0x multiplier)
 */
export function calculateBigOpportunity(t2108: number, up4pct: number): boolean {
  // Extended criteria: T2108 < 30 AND Up4% > 1000
  // This captures more opportunities than the strict T2108 < 20
  return t2108 < 30 && up4pct > 1000
}

/**
 * Detect Avoid Entry conditions
 * Rules: Up4% < 150 OR T2108 > 80 (overbought) = Avoid Entry
 */
export function calculateAvoidEntry(up4pct: number, down4pct: number, t2108: number): boolean {
  // Primary rule: Up4% < 150 indicates weak breadth momentum
  if (up4pct < 150) return true
  
  // Secondary rule: T2108 > 80 indicates overbought conditions
  if (t2108 > 80) return true
  
  // Additional rule: Down4% > Up4% indicates deteriorating conditions
  if (down4pct > up4pct && up4pct < 300) return true
  
  return false
}

/**
 * Calculate VIX-based position multiplier
 * VIX Ranges and Multipliers:
 * - VIX < 12: Ultra-Low (0.8x)
 * - VIX 12-15: Low (0.9x)
 * - VIX 15-20: Normal (1.0x)
 * - VIX 20-25: Elevated (1.1x)
 * - VIX 25-30: High (1.2x)
 * - VIX 30-40: Very High (1.3x)
 * - VIX > 40: Extreme (1.4x)
 */
export function calculateVixMultiplier(vix: number): VixMultiplierResult {
  if (vix < 12) return { level: 'ultra-low', multiplier: 0.8 }
  if (vix < 15) return { level: 'low', multiplier: 0.9 }
  if (vix < 20) return { level: 'normal', multiplier: 1.0 }
  if (vix < 25) return { level: 'elevated', multiplier: 1.1 }
  if (vix < 30) return { level: 'high', multiplier: 1.2 }
  if (vix < 40) return { level: 'very-high', multiplier: 1.3 }
  return { level: 'extreme', multiplier: 1.4 }
}

/**
 * Calculate breadth strength based on momentum indicators
 */
export function calculateBreadthStrength(up4pct: number, down4pct: number, t2108: number): 'weak' | 'moderate' | 'strong' {
  const upDownRatio = down4pct > 0 ? up4pct / down4pct : up4pct
  
  if (up4pct > 1000 && upDownRatio > 5 && t2108 < 40) return 'strong'
  if (up4pct > 500 && upDownRatio > 2.5 && t2108 < 70) return 'moderate'
  return 'weak'
}

/**
 * Calculate position deterioration score (0-100)
 * Higher scores indicate worse conditions for holding positions
 */
export function calculatePositionDeterioration(up4pct: number, down4pct: number, t2108: number): number {
  let score = 0
  
  // Weak breadth momentum (Up4% declining)
  if (up4pct < 150) score += 30
  else if (up4pct < 300) score += 15
  
  // High T2108 (overbought)
  if (t2108 > 80) score += 25
  else if (t2108 > 70) score += 15
  
  // Down4% exceeding Up4%
  if (down4pct > up4pct) score += 20
  else if (down4pct > up4pct * 0.7) score += 10
  
  // Extreme overbought with weak momentum
  if (t2108 > 85 && up4pct < 200) score += 25
  
  return Math.min(score, 100)
}

/**
 * Calculate position size based on all Bidback rules
 */
export function calculatePositionSize(input: BidbackCalculationInput): PositionCalculationResult {
  const { basePosition, t2108, vix, up4pct, down4pct, portfolioSize = 100000 } = input
  
  const isBigOpportunity = calculateBigOpportunity(t2108, up4pct)
  const isAvoidEntry = calculateAvoidEntry(up4pct, down4pct, t2108)
  const vixResult = calculateVixMultiplier(vix)
  
  let finalPosition = 0
  let effectiveMultiplier = 1.0
  
  if (isAvoidEntry) {
    // Avoid Entry: Zero position regardless of other factors
    finalPosition = 0
    effectiveMultiplier = 0
  } else if (isBigOpportunity) {
    // Big Opportunity: 2.0x multiplier overrides VIX multiplier
    finalPosition = basePosition * 2.0
    effectiveMultiplier = 2.0
  } else {
    // Normal conditions: Apply VIX multiplier
    finalPosition = basePosition * vixResult.multiplier
    effectiveMultiplier = vixResult.multiplier
  }
  
  const portfolioHeatPercent = (finalPosition / portfolioSize) * 100
  
  return {
    basePosition,
    vixMultiplier: vixResult.multiplier,
    bigOpportunityMultiplier: isBigOpportunity ? 2.0 : 1.0,
    finalPosition: Math.round(finalPosition),
    portfolioHeatPercent: Math.round(portfolioHeatPercent * 10) / 10,
    isBigOpportunity,
    isAvoidEntry
  }
}

/**
 * Calculate VIX-based exit parameters
 */
export function calculateExitParameters(vix: number): ExitCalculationResult {
  const vixMatrix = getVixExitMatrix(vix)
  
  return {
    stopLossPercent: vixMatrix.stopLossPercent,
    profitTarget1Percent: vixMatrix.profitTarget1Percent,
    profitTarget2Percent: vixMatrix.profitTarget2Percent,
    maxHoldDays: vixMatrix.maxHoldDays,
    vixMatrix
  }
}

/**
 * Main Bidback calculation function - returns comprehensive results
 */
export function calculateBidbackSignals(input: BidbackCalculationInput): BidbackCalculationResult {
  const startTime = performance.now()
  
  const { t2108, vix, up4pct, down4pct } = input
  
  // Calculate all signals
  const bigOpportunity = calculateBigOpportunity(t2108, up4pct)
  const avoidEntry = calculateAvoidEntry(up4pct, down4pct, t2108)
  const vixResult = calculateVixMultiplier(vix)
  const breadthStrength = calculateBreadthStrength(up4pct, down4pct, t2108)
  const positionDeterioration = calculatePositionDeterioration(up4pct, down4pct, t2108)
  
  // Calculate position sizing
  const positionResult = calculatePositionSize(input)
  
  // Calculate exit parameters
  const exitResult = calculateExitParameters(vix)
  
  const endTime = performance.now()
  
  // Calculate confidence score based on signal clarity
  let confidence = 80 // Base confidence
  if (bigOpportunity) confidence += 15 // Clear Big Opportunity
  if (avoidEntry) confidence += 10 // Clear Avoid signal
  if (breadthStrength === 'strong') confidence += 10
  if (breadthStrength === 'weak') confidence -= 5
  if (vixResult.level === 'extreme') confidence -= 10 // Extreme conditions less predictable
  
  return {
    signals: {
      bigOpportunity,
      avoidEntry,
      vixRegime: vixResult.level,
      breadthStrength,
      positionDeterioration
    },
    position: positionResult,
    exits: exitResult,
    metadata: {
      calculationTime: Math.round((endTime - startTime) * 1000) / 1000, // microseconds
      algorithm: 'Bidback-v1.0',
      confidence: Math.min(confidence, 100)
    }
  }
}

/**
 * Utility function to format Bidback signals for display
 */
export function formatBidbackResult(result: BidbackCalculationResult): string {
  const { signals, position } = result
  
  let description = ''
  
  if (signals.avoidEntry) {
    description = `Avoid Entry: ${signals.positionDeterioration > 50 ? 'High deterioration' : 'Weak breadth momentum'}`
  } else if (signals.bigOpportunity) {
    description = `Big Opportunity: ${position.bigOpportunityMultiplier}x position (${signals.breadthStrength} breadth)`
  } else {
    description = `Normal conditions: ${position.vixMultiplier}x VIX multiplier (${signals.vixRegime} regime)`
  }
  
  return description
}

/**
 * Validate Bidback calculation input
 */
export function validateBidbackInput(input: BidbackCalculationInput): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!input.basePosition || input.basePosition <= 0) {
    errors.push('Base position must be greater than 0')
  }
  
  if (input.t2108 < 0 || input.t2108 > 100) {
    errors.push('T2108 must be between 0 and 100')
  }
  
  if (input.vix < 0 || input.vix > 200) {
    errors.push('VIX must be between 0 and 200')
  }
  
  if (input.up4pct < 0) {
    errors.push('Up 4% count cannot be negative')
  }
  
  if (input.down4pct < 0) {
    errors.push('Down 4% count cannot be negative')
  }
  
  if (input.portfolioSize && input.portfolioSize <= 0) {
    errors.push('Portfolio size must be greater than 0')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Create a Bidback calculation summary for logging/debugging
 */
export function createBidbackSummary(input: BidbackCalculationInput, result: BidbackCalculationResult): string {
  const { signals, position, exits, metadata } = result
  
  return `
Bidback Calculation Summary:
Input: T2108=${input.t2108}%, VIX=${input.vix}, Up4%=${input.up4pct}, Down4%=${input.down4pct}
Signals: BigOpp=${signals.bigOpportunity}, Avoid=${signals.avoidEntry}, Regime=${signals.vixRegime}
Position: Base=${input.basePosition} → Final=${position.finalPosition} (${position.portfolioHeatPercent}% heat)
Exits: Stop=${exits.stopLossPercent}%, PT1=${exits.profitTarget1Percent}%, PT2=${exits.profitTarget2Percent}%
Meta: Confidence=${metadata.confidence}%, Time=${metadata.calculationTime}ms
`.trim()
}

// Types are already exported above - no need for re-export