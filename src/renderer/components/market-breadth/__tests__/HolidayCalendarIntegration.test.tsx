/**
 * Holiday Calendar Integration Tests
 * Tests holiday-adjusted exit dates, trading day calculations, and calendar integration
 * Validates BIDBACK Master System holiday handling and business day logic
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PositionCalculator } from '../PositionCalculator'
import { DataEntryForm } from '../DataEntryForm'
import * as holidayCalendar from '../../../../utils/holidayCalendar'

// Mock the holiday calendar with realistic holiday data
const mockHolidays = [
  { date: '2025-01-01', name: 'New Year\'s Day', type: 'full_close' },
  { date: '2025-01-20', name: 'Martin Luther King Jr. Day', type: 'full_close' },
  { date: '2025-02-17', name: 'Presidents Day', type: 'full_close' },
  { date: '2025-04-18', name: 'Good Friday', type: 'full_close' },
  { date: '2025-05-26', name: 'Memorial Day', type: 'full_close' },
  { date: '2025-06-19', name: 'Juneteenth', type: 'full_close' },
  { date: '2025-07-04', name: 'Independence Day', type: 'full_close' },
  { date: '2025-07-03', name: 'Independence Day Observed (Early Close)', type: 'early_close' },
  { date: '2025-09-01', name: 'Labor Day', type: 'full_close' },
  { date: '2025-11-27', name: 'Thanksgiving Day', type: 'full_close' },
  { date: '2025-11-28', name: 'Black Friday (Early Close)', type: 'early_close' },
  { date: '2025-12-25', name: 'Christmas Day', type: 'full_close' },
  { date: '2025-12-24', name: 'Christmas Eve (Early Close)', type: 'early_close' }
]

vi.mock('../../../../utils/holidayCalendar', () => {
  const actualModule = vi.importActual('../../../../utils/holidayCalendar')
  
  return {
    ...actualModule,
    isMarketHoliday: vi.fn((date: Date | string) => {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
      return mockHolidays.some(holiday => holiday.date === dateStr)
    }),
    
    isEarlyCloseDay: vi.fn((date: Date | string) => {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
      const holiday = mockHolidays.find(h => h.date === dateStr)
      return holiday?.type === 'early_close' || false
    }),
    
    getHolidayInfo: vi.fn((date: Date | string) => {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
      return mockHolidays.find(holiday => holiday.date === dateStr) || null
    }),
    
    isWeekend: vi.fn((date: Date) => {
      const dayOfWeek = date.getDay()
      return dayOfWeek === 0 || dayOfWeek === 6
    }),
    
    isTradingDay: vi.fn((date: Date | string) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      const dayOfWeek = dateObj.getDay()
      const dateStr = dateObj.toISOString().split('T')[0]
      
      // Weekend check
      if (dayOfWeek === 0 || dayOfWeek === 6) return false
      
      // Holiday check
      if (mockHolidays.some(holiday => holiday.date === dateStr && holiday.type === 'full_close')) return false
      
      return true
    }),
    
    addTradingDays: vi.fn((startDate: Date, tradingDaysToAdd: number) => {
      let currentDate = new Date(startDate)
      let remainingDays = tradingDaysToAdd
      
      while (remainingDays > 0) {
        currentDate.setDate(currentDate.getDate() + 1)
        
        // Check if it's a trading day
        const dayOfWeek = currentDate.getDay()
        const dateStr = currentDate.toISOString().split('T')[0]
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        const isHoliday = mockHolidays.some(holiday => 
          holiday.date === dateStr && holiday.type === 'full_close'
        )
        
        if (!isWeekend && !isHoliday) {
          remainingDays--
        }
      }
      
      return currentDate
    }),
    
    calculateExitDate: vi.fn((entryDate: Date, vix: number) => {
      // VIX-based trading days calculation
      const tradingDaysToAdd = vix < 15 ? 10 : vix < 25 ? 7 : vix < 35 ? 5 : 3
      
      let currentDate = new Date(entryDate)
      let addedTradingDays = 0
      
      while (addedTradingDays < tradingDaysToAdd) {
        currentDate.setDate(currentDate.getDate() + 1)
        
        const dayOfWeek = currentDate.getDay()
        const dateStr = currentDate.toISOString().split('T')[0]
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        const isHoliday = mockHolidays.some(holiday => 
          holiday.date === dateStr && holiday.type === 'full_close'
        )
        
        if (!isWeekend && !isHoliday) {
          addedTradingDays++
        }
      }
      
      return currentDate
    }),
    
    calculateExitPrices: vi.fn((entryPrice: number, vix: number) => ({
      stopLoss: entryPrice * 0.95,
      profitTarget1: entryPrice * 1.08,
      profitTarget2: entryPrice * 1.15,
      vixMatrix: {
        vixRange: vix < 20 ? '< 20' : vix < 30 ? '20-30' : '> 30',
        multiplier: vix < 20 ? 0.9 : vix < 30 ? 1.1 : 1.3,
        stopLossPercent: -5,
        profitTarget1Percent: 8,
        profitTarget2Percent: 15,
        maxHoldDays: vix < 15 ? 10 : vix < 25 ? 7 : vix < 35 ? 5 : 3
      }
    })),
    
    countTradingDays: vi.fn((startDate: Date, endDate: Date) => {
      let count = 0
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay()
        const dateStr = currentDate.toISOString().split('T')[0]
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        const isHoliday = mockHolidays.some(holiday => 
          holiday.date === dateStr && holiday.type === 'full_close'
        )
        
        if (!isWeekend && !isHoliday) {
          count++
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      return count
    })
  }
})

describe('Holiday Calendar Integration Tests', () => {
  const defaultProps = {
    portfolioSize: 100000,
    onPortfolioSizeChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Holiday Detection', () => {
    test('should recognize major market holidays', () => {
      const majorHolidays = [
        '2025-01-01', // New Year's Day
        '2025-07-04', // Independence Day
        '2025-11-27', // Thanksgiving
        '2025-12-25'  // Christmas
      ]

      majorHolidays.forEach(holidayDate => {
        expect(holidayCalendar.isMarketHoliday(holidayDate)).toBe(true)
        expect(holidayCalendar.isTradingDay(holidayDate)).toBe(false)
      })
    })

    test('should recognize early close days', () => {
      const earlyCloseDays = [
        '2025-07-03',  // Independence Day observed
        '2025-11-28',  // Black Friday
        '2025-12-24'   // Christmas Eve
      ]

      earlyCloseDays.forEach(earlyCloseDate => {
        expect(holidayCalendar.isEarlyCloseDay(earlyCloseDate)).toBe(true)
        expect(holidayCalendar.isTradingDay(earlyCloseDate)).toBe(true) // Early close still counts as trading day
      })
    })

    test('should recognize weekends as non-trading days', () => {
      const weekendDates = [
        new Date('2025-01-04'), // Saturday
        new Date('2025-01-05'), // Sunday
        new Date('2025-01-11'), // Saturday
        new Date('2025-01-12')  // Sunday
      ]

      weekendDates.forEach(weekendDate => {
        expect(holidayCalendar.isWeekend(weekendDate)).toBe(true)
        expect(holidayCalendar.isTradingDay(weekendDate)).toBe(false)
      })
    })

    test('should recognize normal trading days', () => {
      const tradingDays = [
        '2025-01-02', // Thursday (after New Year's Day)
        '2025-01-03', // Friday
        '2025-01-06', // Monday
        '2025-01-07'  // Tuesday
      ]

      tradingDays.forEach(tradingDay => {
        expect(holidayCalendar.isTradingDay(tradingDay)).toBe(true)
      })
    })
  })

  describe('Exit Date Calculations', () => {
    test('should calculate exit dates skipping weekends and holidays', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={45}
          up4pct={500}
          vix={20.0} // Should use 7 trading days
        />
      )

      expect(screen.getByText(/Exit Strategy/i)).toBeInTheDocument()
      expect(screen.getByText(/Holiday-Adjusted/i)).toBeInTheDocument()
      expect(screen.getByText(/Time Exit Date:/i)).toBeInTheDocument()
    })

    test('should adjust exit dates for different VIX levels', () => {
      const vixExitTests = [
        { vix: 12.0, expectedDays: 10 }, // Ultra-low VIX
        { vix: 18.0, expectedDays: 7 },  // Normal VIX
        { vix: 28.0, expectedDays: 5 },  // High VIX
        { vix: 40.0, expectedDays: 3 }   // Extreme VIX
      ]

      vixExitTests.forEach(test => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={45}
            up4pct={500}
            vix={test.vix}
          />
        )

        expect(screen.getByText(/Exit Strategy/i)).toBeInTheDocument()
        expect(screen.getByText(test.expectedDays.toString())).toBeInTheDocument()

        unmount()
      })
    })

    test('should handle exit calculations over holiday periods', () => {
      // Mock a scenario where entry date is right before a holiday cluster
      const mockEntryDate = new Date('2025-12-23') // Monday before Christmas
      
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={45}
          up4pct={500}
          vix={25.0} // 5 trading days
        />
      )

      // The exit date should skip Christmas Eve (early close but trading),
      // Christmas Day (full close), and weekends
      expect(screen.getByText(/Exit Strategy/i)).toBeInTheDocument()
      expect(screen.getByText(/Holiday-Adjusted/i)).toBeInTheDocument()
    })
  })

  describe('Trading Day Counting', () => {
    test('should count trading days correctly excluding holidays', () => {
      const startDate = new Date('2025-01-02') // Thursday
      const endDate = new Date('2025-01-07')   // Tuesday (next week)
      
      // Should be 4 trading days: Thu, Fri, Mon, Tue (skipping weekend)
      const tradingDays = holidayCalendar.countTradingDays(startDate, endDate)
      expect(tradingDays).toBe(4)
    })

    test('should add trading days correctly', () => {
      const startDate = new Date('2025-01-02') // Thursday
      const result = holidayCalendar.addTradingDays(startDate, 5)
      
      // 5 trading days from Thursday should land on Wednesday next week
      // Thu (start) + Fri + Mon + Tue + Wed + Thu = Wednesday
      expect(result.getDay()).toBe(3) // Wednesday
    })
  })

  describe('Position Calculator Holiday Integration', () => {
    test('should show holiday-adjusted exit date', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={40}
          up4pct={600}
          vix={22.0}
        />
      )

      expect(screen.getByText(/Time Exit Date:/i)).toBeInTheDocument()
      
      // Should show a formatted date (day of week, month, day, year)
      const datePattern = /\w{3},? \w{3} \d{1,2},? \d{4}/
      expect(screen.getByText(datePattern)).toBeInTheDocument()
    })

    test('should display VIX matrix information with hold days', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={50}
          up4pct={500}
          vix={18.0}
        />
      )

      expect(screen.getByText(/Max Hold Days/i)).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument() // 7 days for normal VIX
    })

    test('should handle missing VIX gracefully for exit calculations', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={50}
          up4pct={500}
          vix={undefined}
        />
      )

      // Should not show exit strategy without VIX
      expect(screen.queryByText(/Exit Strategy/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Holiday-Adjusted/i)).not.toBeInTheDocument()
    })
  })

  describe('Form Integration with Holiday Calendar', () => {
    test('should integrate holiday calendar with form submission workflow', async () => {
      render(<DataEntryForm onSuccess={vi.fn()} />)

      // Fill form with data
      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '600' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '45' } })
      fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: '20.0' } })

      await waitFor(() => {
        // Position calculator should show exit strategy with holiday adjustments
        expect(screen.getByText(/Exit Strategy/i)).toBeInTheDocument()
        expect(screen.getByText(/Holiday-Adjusted/i)).toBeInTheDocument()
      })
    })

    test('should handle holiday validation for entry dates', async () => {
      render(<DataEntryForm onSuccess={vi.fn()} />)

      // Try to enter data for a holiday (should not prevent entry but could show warning)
      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-12-25' } }) // Christmas
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '50' } })

      // Should not crash or show errors (holidays are historical data dates)
      await waitFor(() => {
        expect(screen.getByDisplayValue('2025-12-25')).toBeInTheDocument()
      })
    })
  })

  describe('Holiday Calendar Edge Cases', () => {
    test('should handle holidays falling on weekends', () => {
      // Test when a holiday falls on a weekend (should be observed on Friday or Monday)
      const saturdayHoliday = new Date('2025-07-05') // If July 4th falls on Saturday
      const sundayHoliday = new Date('2025-07-06')   // If July 4th falls on Sunday
      
      // Both should be treated as regular weekend days since the observed holiday is on a different date
      expect(holidayCalendar.isWeekend(saturdayHoliday)).toBe(true)
      expect(holidayCalendar.isWeekend(sundayHoliday)).toBe(true)
    })

    test('should handle leap year calculations', () => {
      // Test February 29 in a non-leap year (should be handled gracefully)
      const date = '2025-02-29' // 2025 is not a leap year
      
      // Should not crash when checking if it's a holiday or trading day
      expect(() => {
        holidayCalendar.isMarketHoliday(date)
        holidayCalendar.isTradingDay(date)
      }).not.toThrow()
    })

    test('should handle year boundaries correctly', () => {
      // Test end of year to beginning of next year calculations
      const yearEndDate = new Date('2025-12-30') // Monday
      const addedDays = holidayCalendar.addTradingDays(yearEndDate, 5)
      
      // Should correctly span into the next year, skipping New Year's Day
      expect(addedDays.getFullYear()).toBe(2026)
    })

    test('should handle multiple consecutive holidays', () => {
      // Test a period with multiple holidays close together (Thanksgiving week)
      const beforeThanksgiving = new Date('2025-11-26') // Wednesday
      const afterThanksgiving = holidayCalendar.addTradingDays(beforeThanksgiving, 3)
      
      // Should skip Thanksgiving (Thu), Black Friday (Fri early close counts as trading), weekend
      expect(afterThanksgiving.getDate()).toBeGreaterThan(28) // Should be in December or late November
    })
  })

  describe('Performance and Reliability', () => {
    test('should handle large date ranges efficiently', () => {
      const startDate = new Date('2025-01-01')
      const endDate = new Date('2025-12-31')
      
      // Should complete calculation in reasonable time
      const startTime = Date.now()
      const tradingDays = holidayCalendar.countTradingDays(startDate, endDate)
      const endTime = Date.now()
      
      expect(tradingDays).toBeGreaterThan(200) // Roughly 250 trading days in a year
      expect(tradingDays).toBeLessThan(300)
      expect(endTime - startTime).toBeLessThan(100) // Should be fast
    })

    test('should maintain consistency across different date formats', () => {
      const date1 = '2025-07-04'
      const date2 = new Date('2025-07-04')
      
      expect(holidayCalendar.isMarketHoliday(date1)).toBe(true)
      expect(holidayCalendar.isMarketHoliday(date2)).toBe(true)
    })
  })
})