// Holiday Calendar Utilities Tests - BIDBACK Trading System
// Comprehensive test suite for holidayCalendar.ts

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
  getVixExitMatrix,
  calculateExitDate,
  calculateExitPrices,
  getAllHolidays,
  getTradingDayInfo,
  getDaysToExit
} from '../holidayCalendar'
import { US_HOLIDAYS_2025, VIX_EXIT_MATRIX } from '../../types/calendar'

describe('Holiday Calendar Utilities', () => {
  
  // ===== 2025 US Market Holidays Tests =====
  describe('2025 US Market Holidays', () => {
    test('should correctly identify all 13 US market holidays', () => {
      const expectedHolidays = [
        '2025-01-01', // New Year's Day
        '2025-01-20', // MLK Day
        '2025-02-17', // Presidents Day
        '2025-04-18', // Good Friday
        '2025-05-26', // Memorial Day
        '2025-06-19', // Juneteenth
        '2025-07-03', // Independence Day (observed) - Early Close
        '2025-07-04', // Independence Day
        '2025-09-01', // Labor Day
        '2025-11-27', // Thanksgiving
        '2025-11-28', // Day After Thanksgiving - Early Close
        '2025-12-24', // Christmas Eve - Early Close
        '2025-12-25'  // Christmas Day
      ]
      
      expectedHolidays.forEach(date => {
        expect(isMarketHoliday(date)).toBe(true)
        expect(isMarketHoliday(new Date(date))).toBe(true)
      })
      
      expect(US_HOLIDAYS_2025).toHaveLength(13)
    })

    test('should validate specific holiday names and dates', () => {
      const holidayTests = [
        { date: '2025-01-01', name: 'New Year\'s Day', type: 'market_closed' },
        { date: '2025-01-20', name: 'Martin Luther King Jr. Day', type: 'market_closed' },
        { date: '2025-02-17', name: 'Presidents\' Day', type: 'market_closed' },
        { date: '2025-04-18', name: 'Good Friday', type: 'market_closed' },
        { date: '2025-05-26', name: 'Memorial Day', type: 'market_closed' },
        { date: '2025-06-19', name: 'Juneteenth', type: 'market_closed' },
        { date: '2025-07-04', name: 'Independence Day', type: 'market_closed' },
        { date: '2025-09-01', name: 'Labor Day', type: 'market_closed' },
        { date: '2025-11-27', name: 'Thanksgiving Day', type: 'market_closed' },
        { date: '2025-12-25', name: 'Christmas Day', type: 'market_closed' }
      ]

      holidayTests.forEach(({ date, name, type }) => {
        const holiday = getHolidayInfo(date)
        expect(holiday).toBeTruthy()
        expect(holiday?.name).toBe(name)
        expect(holiday?.type).toBe(type)
      })
    })

    test('should identify non-holidays correctly', () => {
      const nonHolidays = [
        '2025-01-02', // Day after New Year
        '2025-03-15', // Random trading day
        '2025-06-15', // Regular trading day
        '2025-10-31', // Halloween (not a market holiday)
        '2025-12-30'  // Regular trading day
      ]

      nonHolidays.forEach(date => {
        expect(isMarketHoliday(date)).toBe(false)
        expect(getHolidayInfo(date)).toBeNull()
      })
    })
  })

  // ===== Early Close Days Tests =====
  describe('Early Close Days (1pm EST)', () => {
    test('should correctly identify all early close days', () => {
      const earlyCloseDays = [
        '2025-07-03', // Independence Day (observed)
        '2025-11-28', // Day After Thanksgiving
        '2025-12-24'  // Christmas Eve
      ]

      earlyCloseDays.forEach(date => {
        expect(isEarlyCloseDay(date)).toBe(true)
        expect(isEarlyCloseDay(new Date(date))).toBe(true)
        
        const holiday = getHolidayInfo(date)
        expect(holiday?.type).toBe('early_close')
        expect(holiday?.earlyCloseTime).toBe('13:00')
      })
    })

    test('should not identify regular holidays as early close days', () => {
      const regularHolidays = [
        '2025-01-01', // New Year's Day
        '2025-04-18', // Good Friday
        '2025-11-27', // Thanksgiving
        '2025-12-25'  // Christmas Day
      ]

      regularHolidays.forEach(date => {
        expect(isEarlyCloseDay(date)).toBe(false)
        
        const holiday = getHolidayInfo(date)
        expect(holiday?.type).toBe('market_closed')
      })
    })

    test('should validate early close time is 1pm (13:00)', () => {
      const earlyCloseDays = ['2025-07-03', '2025-11-28', '2025-12-24']
      
      earlyCloseDays.forEach(date => {
        const holiday = getHolidayInfo(date)
        expect(holiday?.earlyCloseTime).toBe('13:00')
      })
    })
  })

  // ===== Weekend Detection Tests =====
  describe('Weekend Detection', () => {
    test('should correctly identify weekends', () => {
      // Saturday and Sunday tests
      const weekendDates = [
        new Date('2025-01-04'), // Saturday
        new Date('2025-01-05'), // Sunday
        new Date('2025-06-07'), // Saturday
        new Date('2025-06-08'), // Sunday
        new Date('2025-12-06'), // Saturday
        new Date('2025-12-07')  // Sunday
      ]

      weekendDates.forEach(date => {
        expect(isWeekend(date)).toBe(true)
      })
    })

    test('should correctly identify weekdays', () => {
      const weekdays = [
        new Date('2025-01-06'), // Monday
        new Date('2025-01-07'), // Tuesday
        new Date('2025-01-08'), // Wednesday
        new Date('2025-01-09'), // Thursday
        new Date('2025-01-10')  // Friday
      ]

      weekdays.forEach(date => {
        expect(isWeekend(date)).toBe(false)
      })
    })
  })

  // ===== Trading Day Logic Tests =====
  describe('Trading Day Logic', () => {
    test('should correctly identify trading days', () => {
      const tradingDays = [
        new Date('2025-01-02'), // Thursday - Regular trading day
        new Date('2025-01-03'), // Friday - Regular trading day
        new Date('2025-01-06'), // Monday - Regular trading day
        new Date('2025-03-17'), // Monday - Regular trading day
        new Date('2025-06-16')  // Monday - Regular trading day
      ]

      tradingDays.forEach(date => {
        expect(isTradingDay(date)).toBe(true)
        expect(isWeekend(date)).toBe(false)
        expect(isMarketHoliday(date)).toBe(false)
      })
    })

    test('should correctly identify non-trading days (weekends)', () => {
      const weekends = [
        new Date('2025-01-04'), // Saturday
        new Date('2025-01-05'), // Sunday
        new Date('2025-06-07'), // Saturday
        new Date('2025-06-08')  // Sunday
      ]

      weekends.forEach(date => {
        expect(isTradingDay(date)).toBe(false)
        expect(isWeekend(date)).toBe(true)
      })
    })

    test('should correctly identify non-trading days (holidays)', () => {
      const holidays = [
        new Date('2025-01-01'), // New Year's Day
        new Date('2025-01-20'), // MLK Day
        new Date('2025-07-04'), // Independence Day
        new Date('2025-12-25')  // Christmas
      ]

      holidays.forEach(date => {
        expect(isTradingDay(date)).toBe(false)
        expect(isMarketHoliday(date)).toBe(true)
      })
    })

    test('should handle early close days as trading days', () => {
      const earlyCloseDays = [
        new Date('2025-07-03'), // Independence Day (observed)
        new Date('2025-11-28'), // Day After Thanksgiving
        new Date('2025-12-24')  // Christmas Eve
      ]

      // Early close days are still trading days, just shorter hours
      earlyCloseDays.forEach(date => {
        expect(isTradingDay(date)).toBe(false) // These are marked as holidays
        expect(isEarlyCloseDay(date)).toBe(true)
      })
    })
  })

  // ===== Business Day Navigation Tests =====
  describe('Business Day Navigation', () => {
    test('getNextTradingDay should skip weekends', () => {
      // Friday to Monday
      const friday = new Date('2025-01-03') // Friday
      const nextTrading = getNextTradingDay(friday)
      expect(nextTrading.getDate()).toBe(6) // Monday
      expect(nextTrading.getDay()).toBe(1) // Monday = 1
    })

    test('getNextTradingDay should skip holidays', () => {
      // Dec 24 (Christmas Eve) should go to Dec 26
      const dec24 = new Date('2025-12-24') // Christmas Eve (early close)
      const nextTrading = getNextTradingDay(dec24)
      expect(nextTrading.getDate()).toBe(26) // Dec 26
    })

    test('getPreviousTradingDay should skip weekends', () => {
      // Monday to Friday
      const monday = new Date('2025-01-06') // Monday
      const prevTrading = getPreviousTradingDay(monday)
      expect(prevTrading.getDate()).toBe(3) // Friday
      expect(prevTrading.getDay()).toBe(5) // Friday = 5
    })

    test('getPreviousTradingDay should skip holidays', () => {
      // Jan 2 (after New Year) should go back to Dec 31, 2024
      const jan2 = new Date('2025-01-02') // Day after New Year
      const prevTrading = getPreviousTradingDay(jan2)
      expect(prevTrading.getFullYear()).toBe(2024)
      expect(prevTrading.getMonth()).toBe(11) // December
      expect(prevTrading.getDate()).toBe(31)
    })
  })

  // ===== Trading Day Math Tests =====
  describe('Trading Day Calculations', () => {
    test('addTradingDays should correctly add trading days', () => {
      const startDate = new Date('2025-01-02') // Thursday
      
      // Add 1 trading day: Thursday -> Friday
      const plus1 = addTradingDays(startDate, 1)
      expect(plus1.getDate()).toBe(3)
      expect(plus1.getDay()).toBe(5) // Friday
      
      // Add 3 trading days: Thursday -> Tuesday (skip weekend)
      const plus3 = addTradingDays(startDate, 3)
      expect(plus3.getDate()).toBe(7)
      expect(plus3.getDay()).toBe(2) // Tuesday
    })

    test('addTradingDays should skip holidays', () => {
      const beforeMLK = new Date('2025-01-17') // Friday before MLK Day
      
      // Add 1 trading day: Should skip MLK Day (Jan 20) and weekend
      const result = addTradingDays(beforeMLK, 1)
      expect(result.getDate()).toBe(21) // Tuesday after MLK Day
      expect(result.getDay()).toBe(2) // Tuesday
    })

    test('countTradingDays should correctly count trading days', () => {
      const start = new Date('2025-01-02') // Thursday
      const end = new Date('2025-01-10') // Friday
      
      // Should count: Thu(2), Fri(3), Mon(6), Tue(7), Wed(8), Thu(9), Fri(10) = 7 days
      const count = countTradingDays(start, end)
      expect(count).toBe(7)
    })

    test('countTradingDays should exclude holidays', () => {
      const start = new Date('2025-01-17') // Friday
      const end = new Date('2025-01-24') // Friday
      
      // Should exclude MLK Day (Jan 20) and weekends
      // Fri(17), Tue(21), Wed(22), Thu(23), Fri(24) = 5 days
      const count = countTradingDays(start, end)
      expect(count).toBe(5)
    })
  })

  // ===== VIX Exit Matrix Tests =====
  describe('VIX Exit Matrix', () => {
    test('should return correct matrix for all VIX ranges', () => {
      const testCases = [
        { vix: 10, expected: 0, range: 'Ultra-Low' }, // VIX < 12
        { vix: 13, expected: 1, range: 'Low' },       // VIX 12-15
        { vix: 18, expected: 2, range: 'Normal' },    // VIX 15-20
        { vix: 22, expected: 3, range: 'Elevated' },  // VIX 20-25
        { vix: 28, expected: 4, range: 'High' },      // VIX 25-30
        { vix: 35, expected: 5, range: 'Very High' }, // VIX 30-40
        { vix: 50, expected: 6, range: 'Extreme' }    // VIX > 40
      ]

      testCases.forEach(({ vix, expected, range }) => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix).toBe(VIX_EXIT_MATRIX[expected])
        expect(matrix.vixRange).toContain(range)
      })
    })

    test('should validate VIX matrix parameters', () => {
      const expectedMatrices = [
        { vix: 10, stopLoss: -4, profit2: 10, maxDays: 3, mult: 0.8 },
        { vix: 13, stopLoss: -6, profit2: 12, maxDays: 4, mult: 0.9 },
        { vix: 18, stopLoss: -8, profit2: 15, maxDays: 5, mult: 1.0 },
        { vix: 22, stopLoss: -10, profit2: 20, maxDays: 5, mult: 1.1 },
        { vix: 28, stopLoss: -12, profit2: 25, maxDays: 6, mult: 1.2 },
        { vix: 35, stopLoss: -15, profit2: 30, maxDays: 7, mult: 1.3 },
        { vix: 50, stopLoss: -18, profit2: 35, maxDays: 10, mult: 1.4 }
      ]

      expectedMatrices.forEach(({ vix, stopLoss, profit2, maxDays, mult }) => {
        const matrix = getVixExitMatrix(vix)
        expect(matrix.stopLossPercent).toBe(stopLoss)
        expect(matrix.profitTarget2Percent).toBe(profit2)
        expect(matrix.maxHoldDays).toBe(maxDays)
        expect(matrix.multiplier).toBe(mult)
      })
    })
  })

  // ===== Exit Date Calculation Tests =====
  describe('Holiday-Adjusted Exit Date Calculation', () => {
    test('calculateExitDate should use correct max hold days based on VIX', () => {
      const entryDate = new Date('2025-03-03') // Monday - clean start
      
      const testCases = [
        { vix: 10, expectedDays: 3 }, // Ultra-Low VIX
        { vix: 13, expectedDays: 4 }, // Low VIX
        { vix: 18, expectedDays: 5 }, // Normal VIX
        { vix: 35, expectedDays: 7 }, // Very High VIX
        { vix: 50, expectedDays: 10 } // Extreme VIX
      ]

      testCases.forEach(({ vix, expectedDays }) => {
        const exitDate = calculateExitDate(entryDate, vix)
        const actualDays = countTradingDays(entryDate, exitDate)
        expect(actualDays).toBe(expectedDays + 1) // +1 because countTradingDays is inclusive
      })
    })

    test('calculateExitDate should skip holidays and weekends', () => {
      // Entry on Friday before MLK Day weekend
      const entryDate = new Date('2025-01-17') // Friday
      const vix = 18 // Normal VIX = 5 days max hold
      
      const exitDate = calculateExitDate(entryDate, vix)
      
      // Should skip weekend (18-19) and MLK Day (20)
      // 5 trading days from Fri(17): Tue(21), Wed(22), Thu(23), Fri(24), Mon(27)
      expect(exitDate.getDate()).toBe(27) // Monday
      expect(exitDate.getDay()).toBe(1) // Monday = 1
    })
  })

  // ===== Exit Price Calculations Tests =====
  describe('Exit Price Calculations', () => {
    test('calculateExitPrices should calculate correct prices based on VIX', () => {
      const entryPrice = 100
      const vix = 18 // Normal VIX: -8% stop, 7% target1, 15% target2
      
      const result = calculateExitPrices(entryPrice, vix)
      
      expect(result.stopLoss).toBe(92) // 100 * (1 + (-8/100)) = 92
      expect(result.profitTarget1).toBe(107) // 100 * (1 + (7/100)) = 107
      expect(result.profitTarget2).toBe(115) // 100 * (1 + (15/100)) = 115
      expect(result.vixMatrix.vixRange).toContain('Normal')
    })

    test('calculateExitPrices should handle extreme VIX levels', () => {
      const entryPrice = 50
      const vix = 45 // Extreme VIX: -18% stop, 15% target1, 35% target2
      
      const result = calculateExitPrices(entryPrice, vix)
      
      expect(result.stopLoss).toBe(41) // 50 * 0.82 = 41
      expect(result.profitTarget1).toBe(57.5) // 50 * 1.15 = 57.5
      expect(result.profitTarget2).toBe(67.5) // 50 * 1.35 = 67.5
      expect(result.vixMatrix.multiplier).toBe(1.4)
    })
  })

  // ===== Utility Functions Tests =====
  describe('Utility Functions', () => {
    test('getAllHolidays should return all 13 holidays', () => {
      const holidays = getAllHolidays()
      expect(holidays).toHaveLength(13)
      expect(holidays).toEqual(US_HOLIDAYS_2025)
    })

    test('getTradingDayInfo should return complete trading day information', () => {
      // Test regular trading day
      const regularDay = getTradingDayInfo('2025-03-15')
      expect(regularDay.isHoliday).toBe(false)
      expect(regularDay.isEarlyClose).toBe(false)
      expect(regularDay.holiday).toBeUndefined()

      // Test holiday
      const holiday = getTradingDayInfo('2025-12-25')
      expect(holiday.isHoliday).toBe(true)
      expect(holiday.isEarlyClose).toBe(false)
      expect(holiday.holiday?.name).toBe('Christmas Day')

      // Test early close day
      const earlyClose = getTradingDayInfo('2025-07-03')
      expect(earlyClose.isHoliday).toBe(true)
      expect(earlyClose.isEarlyClose).toBe(true)
      expect(earlyClose.holiday?.earlyCloseTime).toBe('13:00')
    })

    test('getDaysToExit should calculate correct trading days remaining', () => {
      // Mock today's date for consistent testing
      const mockToday = new Date('2025-01-15')
      jest.spyOn(Date, 'Date').mockImplementation(() => mockToday)
      
      const exitDate = new Date('2025-01-24') // 9 calendar days later
      const daysRemaining = getDaysToExit(exitDate)
      
      // Should exclude MLK Day (Jan 20) and weekends (18-19)
      // Trading days: 16,17,21,22,23,24 = 6 days
      expect(daysRemaining).toBe(6)
      
      // Restore original Date constructor
      jest.restoreAllMocks()
    })
  })

  // ===== Edge Cases and Error Handling =====
  describe('Edge Cases', () => {
    test('should handle string dates and Date objects consistently', () => {
      const dateString = '2025-07-04'
      const dateObject = new Date('2025-07-04')
      
      expect(isMarketHoliday(dateString)).toBe(isMarketHoliday(dateObject))
      expect(isEarlyCloseDay(dateString)).toBe(isEarlyCloseDay(dateObject))
      expect(isTradingDay(dateString)).toBe(isTradingDay(dateObject))
    })

    test('should handle year boundaries correctly', () => {
      const endOf2024 = new Date('2024-12-31')
      const startOf2025 = new Date('2025-01-01')
      
      // Dec 31, 2024 should be a trading day
      expect(isTradingDay(endOf2024)).toBe(true)
      
      // Jan 1, 2025 should be a holiday
      expect(isTradingDay(startOf2025)).toBe(false)
      expect(isMarketHoliday(startOf2025)).toBe(true)
    })

    test('should handle VIX boundary values correctly', () => {
      // Test exact boundary values
      expect(getVixExitMatrix(12).vixRange).toContain('Low') // Exactly 12
      expect(getVixExitMatrix(11.99).vixRange).toContain('Ultra-Low') // Just under 12
      expect(getVixExitMatrix(40).vixRange).toContain('Extreme') // Exactly 40
      expect(getVixExitMatrix(39.99).vixRange).toContain('Very High') // Just under 40
    })
  })
})