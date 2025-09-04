/**
 * Holiday Calendar Utilities Test Suite
 * Testing BIDBACK trading system holiday and calendar functions:
 * - Trading day calculations (weekends, holidays)
 * - Holiday-adjusted exit date calculations
 * - VIX-based exit price calculations
 * - Trading day counting and navigation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isMarketHoliday,
  isEarlyCloseDay,
  getHolidayInfo,
  isWeekend,
  isTradingDay,
  getNextTradingDay,
  getPreviousTradingDay,
  addTradingDays,
  countTradingDays,
  calculateExitDate,
  calculateExitPrices,
  getVixExitMatrix,
  getDaysToExit,
  getTradingDayInfo
} from './holidayCalendar'

describe('Holiday Calendar Utilities', () => {
  describe('Market Holiday Detection', () => {
    it('should detect market holidays correctly', () => {
      // New Year's Day 2025
      expect(isMarketHoliday('2025-01-01')).toBe(true)
      expect(isMarketHoliday(new Date('2025-01-01'))).toBe(true)
      
      // MLK Day 2025
      expect(isMarketHoliday('2025-01-20')).toBe(true)
      
      // Good Friday 2025
      expect(isMarketHoliday('2025-04-18')).toBe(true)
      
      // Christmas 2025
      expect(isMarketHoliday('2025-12-25')).toBe(true)
      
      // Regular trading day
      expect(isMarketHoliday('2025-09-03')).toBe(false)
      expect(isMarketHoliday('2025-10-15')).toBe(false)
    })

    it('should detect early close days correctly', () => {
      // Independence Day (observed) - early close
      expect(isEarlyCloseDay('2025-07-03')).toBe(true)
      
      // Day after Thanksgiving - early close
      expect(isEarlyCloseDay('2025-11-28')).toBe(true)
      
      // Christmas Eve - early close
      expect(isEarlyCloseDay('2025-12-24')).toBe(true)
      
      // Full market holidays should not be early close
      expect(isEarlyCloseDay('2025-12-25')).toBe(false)
      
      // Regular trading days
      expect(isEarlyCloseDay('2025-09-03')).toBe(false)
    })

    it('should return correct holiday information', () => {
      const newYear = getHolidayInfo('2025-01-01')
      expect(newYear).toEqual({
        date: '2025-01-01',
        name: 'New Year\'s Day',
        type: 'market_closed'
      })
      
      const july3 = getHolidayInfo('2025-07-03')
      expect(july3).toEqual({
        date: '2025-07-03',
        name: 'Independence Day (observed)',
        type: 'early_close',
        earlyCloseTime: '13:00'
      })
      
      const regularDay = getHolidayInfo('2025-09-03')
      expect(regularDay).toBeNull()
    })
  })

  describe('Weekend Detection', () => {
    it('should detect weekends correctly', () => {
      // Saturday
      expect(isWeekend(new Date('2025-09-06'))).toBe(true) // Saturday
      expect(isWeekend(new Date('2025-09-07'))).toBe(true) // Sunday
      
      // Weekdays
      expect(isWeekend(new Date('2025-09-03'))).toBe(false) // Tuesday
      expect(isWeekend(new Date('2025-09-05'))).toBe(false) // Friday
      expect(isWeekend(new Date('2025-09-08'))).toBe(false) // Monday
    })
  })

  describe('Trading Day Detection', () => {
    it('should detect trading days correctly', () => {
      // Regular weekdays (not holidays)
      expect(isTradingDay('2025-09-03')).toBe(true) // Tuesday
      expect(isTradingDay('2025-09-05')).toBe(true) // Friday
      expect(isTradingDay('2025-10-15')).toBe(true) // Wednesday
      
      // Weekends
      expect(isTradingDay('2025-09-07')).toBe(false) // Sunday
      expect(isTradingDay('2025-09-06')).toBe(false) // Saturday
      
      // Holidays
      expect(isTradingDay('2025-01-01')).toBe(false) // New Year's Day
      expect(isTradingDay('2025-12-25')).toBe(false) // Christmas
      
      // Early close days are still trading days
      expect(isTradingDay('2025-07-03')).toBe(false) // Actually market closed
      expect(isTradingDay('2025-11-28')).toBe(false) // Day after Thanksgiving - early close
    })
  })

  describe('Trading Day Navigation', () => {
    it('should find next trading day correctly', () => {
      // From Friday to next Monday (skipping weekend)
      const friday = new Date('2025-09-05')
      const nextTradingDay = getNextTradingDay(friday)
      expect(nextTradingDay.toISOString().split('T')[0]).toBe('2025-09-08') // Monday
      
      // From regular Tuesday to Wednesday
      const tuesday = new Date('2025-09-03')
      const nextDay = getNextTradingDay(tuesday)
      expect(nextDay.toISOString().split('T')[0]).toBe('2025-09-04') // Wednesday
    })

    it('should skip holidays when finding next trading day', () => {
      // From day before holiday
      const dayBefore = new Date('2024-12-24') // Christmas Eve
      const nextTradingDay = getNextTradingDay(dayBefore)
      // Should skip Christmas Day (12/25) and potentially weekend
      expect(nextTradingDay.getDate()).toBeGreaterThan(25)
    })

    it('should find previous trading day correctly', () => {
      // From Monday to previous Friday (skipping weekend)
      const monday = new Date('2025-09-08')
      const prevTradingDay = getPreviousTradingDay(monday)
      expect(prevTradingDay.toISOString().split('T')[0]).toBe('2025-09-05') // Friday
      
      // From Wednesday to Tuesday
      const wednesday = new Date('2025-09-04')
      const prevDay = getPreviousTradingDay(wednesday)
      expect(prevDay.toISOString().split('T')[0]).toBe('2025-09-03') // Tuesday
    })
  })

  describe('Trading Day Arithmetic', () => {
    it('should add trading days correctly', () => {
      const startDate = new Date('2025-09-03') // Tuesday
      
      // Add 1 trading day: Tuesday → Wednesday
      const plus1 = addTradingDays(startDate, 1)
      expect(plus1.toISOString().split('T')[0]).toBe('2025-09-04')
      
      // Add 3 trading days: Tuesday → Friday
      const plus3 = addTradingDays(startDate, 3)
      expect(plus3.toISOString().split('T')[0]).toBe('2025-09-05')
      
      // Add 5 trading days: Tuesday → next Tuesday (skipping weekend)
      const plus5 = addTradingDays(startDate, 5)
      expect(plus5.toISOString().split('T')[0]).toBe('2025-09-10')
    })

    it('should count trading days correctly', () => {
      const start = new Date('2025-09-03') // Tuesday
      const end = new Date('2025-09-05')   // Friday
      
      // Tuesday to Friday = 3 trading days (Tue, Wed, Thu, Fri)
      expect(countTradingDays(start, end)).toBe(3)
      
      const mondayStart = new Date('2025-09-08') // Monday
      const fridayEnd = new Date('2025-09-12')   // Friday
      
      // Monday to Friday = 5 trading days
      expect(countTradingDays(mondayStart, fridayEnd)).toBe(5)
    })

    it('should handle trading days across holidays', () => {
      // Before and after Labor Day (2025-09-01)
      const beforeHoliday = new Date('2025-08-29') // Friday before Labor Day
      const afterHoliday = new Date('2025-09-03')  // Tuesday after Labor Day
      
      // Should skip Labor Day Monday
      const tradingDaysBetween = countTradingDays(beforeHoliday, afterHoliday)
      expect(tradingDaysBetween).toBe(2) // Friday and Tuesday only
    })
  })

  describe('VIX Exit Matrix', () => {
    it('should return correct VIX matrix for different VIX levels', () => {
      // Ultra-Low VIX < 12
      const ultraLow = getVixExitMatrix(10.5)
      expect(ultraLow.vixRange).toBe('VIX < 12 (Ultra-Low)')
      expect(ultraLow.stopLossPercent).toBe(-4)
      expect(ultraLow.profitTarget1Percent).toBe(4)
      expect(ultraLow.profitTarget2Percent).toBe(10)
      expect(ultraLow.maxHoldDays).toBe(3)
      expect(ultraLow.multiplier).toBe(0.8)
      
      // Normal VIX 15-20
      const normal = getVixExitMatrix(17.5)
      expect(normal.vixRange).toBe('VIX 15-20 (Normal)')
      expect(normal.stopLossPercent).toBe(-8)
      expect(normal.profitTarget1Percent).toBe(7)
      expect(normal.profitTarget2Percent).toBe(15)
      expect(normal.maxHoldDays).toBe(5)
      expect(normal.multiplier).toBe(1.0)
      
      // Elevated VIX 20-25
      const elevated = getVixExitMatrix(22.4)
      expect(elevated.vixRange).toBe('VIX 20-25 (Elevated)')
      expect(elevated.stopLossPercent).toBe(-10)
      expect(elevated.profitTarget1Percent).toBe(9)
      expect(elevated.profitTarget2Percent).toBe(20)
      expect(elevated.maxHoldDays).toBe(5)
      expect(elevated.multiplier).toBe(1.1)
      
      // Extreme VIX > 40
      const extreme = getVixExitMatrix(50.0)
      expect(extreme.vixRange).toBe('VIX > 40 (Extreme)')
      expect(extreme.stopLossPercent).toBe(-18)
      expect(extreme.profitTarget1Percent).toBe(15)
      expect(extreme.profitTarget2Percent).toBe(35)
      expect(extreme.maxHoldDays).toBe(10)
      expect(extreme.multiplier).toBe(1.4)
    })

    it('should handle VIX boundary conditions', () => {
      // Exact boundary values
      expect(getVixExitMatrix(12.0).vixRange).toBe('VIX 12-15 (Low)')
      expect(getVixExitMatrix(15.0).vixRange).toBe('VIX 15-20 (Normal)')
      expect(getVixExitMatrix(20.0).vixRange).toBe('VIX 20-25 (Elevated)')
      expect(getVixExitMatrix(40.0).vixRange).toBe('VIX > 40 (Extreme)')
    })
  })

  describe('Exit Date Calculations', () => {
    it('should calculate holiday-adjusted exit dates', () => {
      const entryDate = new Date('2025-09-03') // Tuesday
      
      // Ultra-low VIX: 3 trading days
      const ultraLowExit = calculateExitDate(entryDate, 10.5)
      expect(ultraLowExit.toISOString().split('T')[0]).toBe('2025-09-08') // Friday (Tue+3 = Fri)
      
      // Normal VIX: 5 trading days
      const normalExit = calculateExitDate(entryDate, 17.5)
      expect(normalExit.toISOString().split('T')[0]).toBe('2025-09-10') // Next Tuesday (skipping weekend)
      
      // High VIX: 6 trading days
      const highExit = calculateExitDate(entryDate, 27.5)
      expect(highExit.toISOString().split('T')[0]).toBe('2025-09-11') // Wednesday
    })

    it('should skip holidays in exit date calculations', () => {
      // Entry before Labor Day weekend
      const entryBeforeHoliday = new Date('2025-08-29') // Friday before Labor Day
      
      // 3 trading days should skip Labor Day Monday
      const exitDate = calculateExitDate(entryBeforeHoliday, 10.5)
      expect(exitDate.getDay()).not.toBe(1) // Should not be Monday (Labor Day)
      expect(exitDate.toISOString().split('T')[0]).toBe('2025-09-04') // Wednesday after Labor Day
    })
  })

  describe('Exit Price Calculations', () => {
    const entryPrice = 100.00

    it('should calculate correct exit prices for different VIX levels', () => {
      // Ultra-low VIX: -4%, +4%, +10%
      const ultraLow = calculateExitPrices(entryPrice, 10.5)
      expect(ultraLow.stopLoss).toBeCloseTo(96.00, 2)
      expect(ultraLow.profitTarget1).toBeCloseTo(104.00, 2)
      expect(ultraLow.profitTarget2).toBeCloseTo(110.00, 2)
      expect(ultraLow.vixMatrix.vixRange).toBe('VIX < 12 (Ultra-Low)')
      
      // Elevated VIX: -10%, +9%, +20%
      const elevated = calculateExitPrices(entryPrice, 22.4)
      expect(elevated.stopLoss).toBeCloseTo(90.00, 2)
      expect(elevated.profitTarget1).toBeCloseTo(109.00, 2)
      expect(elevated.profitTarget2).toBeCloseTo(120.00, 2)
      expect(elevated.vixMatrix.vixRange).toBe('VIX 20-25 (Elevated)')
      
      // Extreme VIX: -18%, +15%, +35%
      const extreme = calculateExitPrices(entryPrice, 50.0)
      expect(extreme.stopLoss).toBeCloseTo(82.00, 2)
      expect(extreme.profitTarget1).toBeCloseTo(115.00, 2)
      expect(extreme.profitTarget2).toBeCloseTo(135.00, 2)
      expect(extreme.vixMatrix.vixRange).toBe('VIX > 40 (Extreme)')
    })

    it('should handle different entry price levels', () => {
      const lowPrice = 10.50
      const highPrice = 450.75
      
      // Test with low price
      const lowResult = calculateExitPrices(lowPrice, 17.5) // Normal VIX
      expect(lowResult.stopLoss).toBeCloseTo(9.66, 2) // 10.50 * 0.92
      expect(lowResult.profitTarget2).toBeCloseTo(12.075, 2) // 10.50 * 1.15
      
      // Test with high price
      const highResult = calculateExitPrices(highPrice, 17.5) // Normal VIX
      expect(highResult.stopLoss).toBeCloseTo(414.69, 2) // 450.75 * 0.92
      expect(highResult.profitTarget2).toBeCloseTo(518.36, 2) // 450.75 * 1.15
    })
  })

  describe('Days to Exit Calculation', () => {
    beforeEach(() => {
      // Mock current date to be consistent
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-09-03T10:00:00Z'))
    })

    it('should calculate days to exit correctly', () => {
      const exitDate = '2025-09-10' // 7 calendar days away, but fewer trading days
      const daysToExit = getDaysToExit(exitDate)
      
      // From Sep 3 (Tue) to Sep 10 (Tue) = 5 trading days
      expect(daysToExit).toBe(5)
    })

    it('should handle same-day exit', () => {
      const todayExit = '2025-09-03'
      const daysToExit = getDaysToExit(todayExit)
      
      expect(daysToExit).toBe(1) // Same day counts as 1 trading day
    })

    it('should handle past exit dates', () => {
      const pastExit = '2025-09-01'
      const daysToExit = getDaysToExit(pastExit)
      
      expect(daysToExit).toBeLessThan(0) // Past dates return negative
    })
  })

  describe('Trading Day Info', () => {
    it('should return complete trading day information', () => {
      // Regular trading day
      const regularDay = getTradingDayInfo('2025-09-03')
      expect(regularDay).toEqual({
        date: '2025-09-03',
        isHoliday: false,
        isEarlyClose: false,
        holiday: undefined
      })
      
      // Holiday
      const holiday = getTradingDayInfo('2025-01-01')
      expect(holiday).toEqual({
        date: '2025-01-01',
        isHoliday: true,
        isEarlyClose: false,
        holiday: {
          date: '2025-01-01',
          name: 'New Year\'s Day',
          type: 'market_closed'
        }
      })
      
      // Early close day
      const earlyClose = getTradingDayInfo('2025-11-28')
      expect(earlyClose).toEqual({
        date: '2025-11-28',
        isHoliday: true,
        isEarlyClose: true,
        holiday: {
          date: '2025-11-28',
          name: 'Day After Thanksgiving',
          type: 'early_close',
          earlyCloseTime: '13:00'
        }
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid dates gracefully', () => {
      // Invalid date strings should not crash
      expect(isMarketHoliday('invalid-date')).toBe(false)
      expect(isEarlyCloseDay('2025-13-45')).toBe(false) // Invalid month/day
    })

    it('should handle extreme VIX values', () => {
      const veryLowVix = getVixExitMatrix(-5) // Negative VIX (impossible but handle gracefully)
      expect(veryLowVix.vixRange).toBe('VIX < 12 (Ultra-Low)')
      
      const extremelyHighVix = getVixExitMatrix(200) // Extreme crisis level
      expect(extremelyHighVix.vixRange).toBe('VIX > 40 (Extreme)')
      expect(extremelyHighVix.multiplier).toBe(1.4)
    })

    it('should handle weekend-only periods', () => {
      const saturday = new Date('2025-09-06')
      const sunday = new Date('2025-09-07')
      
      expect(countTradingDays(saturday, sunday)).toBe(0)
      
      const nextTrading = getNextTradingDay(saturday)
      expect(nextTrading.getDay()).toBe(1) // Should be Monday
    })
  })

  describe('Integration with BIDBACK System', () => {
    it('should support BIDBACK exit timing requirements', () => {
      // SPXL example: VIX 22.4 should give 5-day max hold
      const spxlEntry = new Date('2025-09-03')
      const spxlExit = calculateExitDate(spxlEntry, 22.4)
      const holdDays = countTradingDays(spxlEntry, spxlExit)
      
      expect(holdDays).toBe(5) // Max hold for elevated VIX
      
      // TQQQ example: VIX 11.8 should give 3-day max hold
      const tqqqEntry = new Date('2025-09-03')
      const tqqqExit = calculateExitDate(tqqqEntry, 11.8)
      const tqqqHoldDays = countTradingDays(tqqqEntry, tqqqExit)
      
      expect(tqqqHoldDays).toBe(3) // Max hold for ultra-low VIX
    })

    it('should calculate exit prices consistent with BIDBACK examples', () => {
      // SPXL: Entry $45.20, VIX 22.4
      const spxlPrices = calculateExitPrices(45.20, 22.4)
      expect(spxlPrices.stopLoss).toBeCloseTo(40.68, 2) // -10% stop
      expect(spxlPrices.profitTarget2).toBeCloseTo(54.24, 2) // +20% target
      
      // TQQQ: Entry $62.85, VIX 11.8
      const tqqqPrices = calculateExitPrices(62.85, 11.8)
      expect(tqqqPrices.stopLoss).toBeCloseTo(60.33, 2) // -4% stop
      expect(tqqqPrices.profitTarget2).toBeCloseTo(69.14, 2) // +10% target (approximately)
    })
  })
})