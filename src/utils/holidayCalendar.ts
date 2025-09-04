// Holiday Calendar Utilities for Bidback Trading System

import { Holiday, TradingDay, VixExitMatrix, US_HOLIDAYS_2025, VIX_EXIT_MATRIX } from '../types/calendar'

/**
 * Check if a given date is a US market holiday
 */
export function isMarketHoliday(date: Date | string): boolean {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  return US_HOLIDAYS_2025.some(holiday => holiday.date === dateStr)
}

/**
 * Check if a given date is an early close day
 */
export function isEarlyCloseDay(date: Date | string): boolean {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  const holiday = US_HOLIDAYS_2025.find(h => h.date === dateStr)
  return holiday?.type === 'early_close' || false
}

/**
 * Get holiday information for a specific date
 */
export function getHolidayInfo(date: Date | string): Holiday | null {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
  return US_HOLIDAYS_2025.find(holiday => holiday.date === dateStr) || null
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6 // Sunday = 0, Saturday = 6
}

/**
 * Check if a date is a trading day (not weekend, not holiday)
 */
export function isTradingDay(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isWeekend(dateObj)) return false
  if (isMarketHoliday(dateObj)) return false
  
  return true
}

/**
 * Get the next trading day from a given date
 */
export function getNextTradingDay(date: Date): Date {
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  
  while (!isTradingDay(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1)
  }
  
  return nextDay
}

/**
 * Get the previous trading day from a given date
 */
export function getPreviousTradingDay(date: Date): Date {
  const prevDay = new Date(date)
  prevDay.setDate(prevDay.getDate() - 1)
  
  while (!isTradingDay(prevDay)) {
    prevDay.setDate(prevDay.getDate() - 1)
  }
  
  return prevDay
}

/**
 * Add trading days to a date, skipping weekends and holidays
 */
export function addTradingDays(startDate: Date, tradingDaysToAdd: number): Date {
  let currentDate = new Date(startDate)
  let remainingDays = tradingDaysToAdd
  
  while (remainingDays > 0) {
    currentDate.setDate(currentDate.getDate() + 1)
    if (isTradingDay(currentDate)) {
      remainingDays--
    }
  }
  
  return currentDate
}

/**
 * Count trading days between two dates
 */
export function countTradingDays(startDate: Date, endDate: Date): number {
  let count = 0
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    if (isTradingDay(currentDate)) {
      count++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return count
}

/**
 * Get VIX-based exit parameters from the Bidback Master System
 */
export function getVixExitMatrix(vix: number): VixExitMatrix {
  if (vix < 12) return VIX_EXIT_MATRIX[0] // Ultra-Low
  if (vix < 15) return VIX_EXIT_MATRIX[1] // Low
  if (vix < 20) return VIX_EXIT_MATRIX[2] // Normal
  if (vix < 25) return VIX_EXIT_MATRIX[3] // Elevated
  if (vix < 30) return VIX_EXIT_MATRIX[4] // High
  if (vix < 40) return VIX_EXIT_MATRIX[5] // Very High
  return VIX_EXIT_MATRIX[6] // Extreme
}

/**
 * Calculate holiday-adjusted exit date based on VIX and entry date
 * This is the core Bidback Master System logic
 */
export function calculateExitDate(entryDate: Date, vix: number): Date {
  const vixMatrix = getVixExitMatrix(vix)
  const maxHoldDays = vixMatrix.maxHoldDays
  
  // Add trading days, automatically skipping holidays and weekends
  return addTradingDays(entryDate, maxHoldDays)
}

/**
 * Calculate stop loss and profit targets based on VIX
 */
export function calculateExitPrices(entryPrice: number, vix: number): {
  stopLoss: number
  profitTarget1: number
  profitTarget2: number
  vixMatrix: VixExitMatrix
} {
  const vixMatrix = getVixExitMatrix(vix)
  
  return {
    stopLoss: entryPrice * (1 + vixMatrix.stopLossPercent / 100),
    profitTarget1: entryPrice * (1 + vixMatrix.profitTarget1Percent / 100),
    profitTarget2: entryPrice * (1 + vixMatrix.profitTarget2Percent / 100),
    vixMatrix
  }
}

/**
 * Get all holidays for display purposes
 */
export function getAllHolidays(): Holiday[] {
  return US_HOLIDAYS_2025
}

/**
 * Get trading day info for a specific date
 */
export function getTradingDayInfo(date: Date | string): TradingDay {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const dateStr = dateObj.toISOString().split('T')[0]
  const holiday = getHolidayInfo(dateStr)
  
  return {
    date: dateStr,
    isHoliday: !!holiday,
    isEarlyClose: holiday?.type === 'early_close' || false,
    holiday: holiday || undefined
  }
}

/**
 * Get the days remaining until market exit (excluding non-trading days)
 */
export function getDaysToExit(exitDate: Date | string): number {
  const today = new Date()
  const exit = typeof exitDate === 'string' ? new Date(exitDate) : exitDate
  
  return countTradingDays(today, exit)
}