// Holiday Calendar Component Tests - BIDBACK Trading System
// Comprehensive test suite for HolidayCalendar.tsx

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HolidayCalendar } from '../HolidayCalendar'
import { US_HOLIDAYS_2025, VIX_EXIT_MATRIX } from '../../../types/calendar'
import * as holidayUtils from '../../../utils/holidayCalendar'

// Mock the holiday utilities
jest.mock('../../../utils/holidayCalendar', () => ({
  ...jest.requireActual('../../../utils/holidayCalendar'),
  getAllHolidays: jest.fn(),
  isTradingDay: jest.fn(),
  isEarlyCloseDay: jest.fn(),
  getVixExitMatrix: jest.fn()
}))

const mockGetAllHolidays = holidayUtils.getAllHolidays as jest.MockedFunction<typeof holidayUtils.getAllHolidays>
const mockIsTradingDay = holidayUtils.isTradingDay as jest.MockedFunction<typeof holidayUtils.isTradingDay>
const mockIsEarlyCloseDay = holidayUtils.isEarlyCloseDay as jest.MockedFunction<typeof holidayUtils.isEarlyCloseDay>

describe('HolidayCalendar Component', () => {
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    
    // Set up default mock implementations
    mockGetAllHolidays.mockReturnValue(US_HOLIDAYS_2025)
    mockIsTradingDay.mockImplementation((date) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      const dayOfWeek = dateObj.getDay()
      const dateStr = dateObj.toISOString().split('T')[0]
      
      // Weekend check
      if (dayOfWeek === 0 || dayOfWeek === 6) return false
      
      // Holiday check
      if (US_HOLIDAYS_2025.some(h => h.date === dateStr)) return false
      
      return true
    })
    
    mockIsEarlyCloseDay.mockImplementation((date) => {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
      return US_HOLIDAYS_2025.some(h => h.date === dateStr && h.type === 'early_close')
    })
    
    // Mock current date to ensure consistent testing
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-15T10:00:00Z')) // Mid-January for testing
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  // ===== Basic Rendering Tests =====
  describe('Basic Rendering', () => {
    test('should render the calendar component with correct title', () => {
      render(<HolidayCalendar />)
      
      expect(screen.getByText('BIDBACK Trading Calendar')).toBeInTheDocument()
      expect(screen.getByText('US Market Holidays & Trading Days')).toBeInTheDocument()
    })

    test('should render back button when onBack prop is provided', () => {
      const mockOnBack = jest.fn()
      render(<HolidayCalendar onBack={mockOnBack} />)
      
      const backButton = screen.getByText('Back to Trading')
      expect(backButton).toBeInTheDocument()
      
      fireEvent.click(backButton)
      expect(mockOnBack).toHaveBeenCalledTimes(1)
    })

    test('should not render back button when onBack prop is not provided', () => {
      render(<HolidayCalendar />)
      
      expect(screen.queryByText('Back to Trading')).not.toBeInTheDocument()
    })

    test('should render current month and year in header', () => {
      render(<HolidayCalendar />)
      
      // Should show January 2025 (based on mocked date)
      expect(screen.getByText('January 2025')).toBeInTheDocument()
    })
  })

  // ===== Calendar Navigation Tests =====
  describe('Calendar Navigation', () => {
    test('should navigate to previous month when clicking left arrow', () => {
      render(<HolidayCalendar />)
      
      // Should start with January 2025
      expect(screen.getByText('January 2025')).toBeInTheDocument()
      
      // Click previous month
      const prevButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-left'
      )
      fireEvent.click(prevButton!)
      
      // Should now show December 2024
      expect(screen.getByText('December 2024')).toBeInTheDocument()
    })

    test('should navigate to next month when clicking right arrow', () => {
      render(<HolidayCalendar />)
      
      // Should start with January 2025
      expect(screen.getByText('January 2025')).toBeInTheDocument()
      
      // Click next month
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      fireEvent.click(nextButton!)
      
      // Should now show February 2025
      expect(screen.getByText('February 2025')).toBeInTheDocument()
    })

    test('should handle year transitions correctly', () => {
      render(<HolidayCalendar />)
      
      // Navigate to December 2024
      const prevButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-left'
      )
      fireEvent.click(prevButton!)
      expect(screen.getByText('December 2024')).toBeInTheDocument()
      
      // Navigate back to January 2025
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      fireEvent.click(nextButton!)
      expect(screen.getByText('January 2025')).toBeInTheDocument()
    })
  })

  // ===== Calendar Grid Tests =====
  describe('Calendar Grid', () => {
    test('should render weekday headers', () => {
      render(<HolidayCalendar />)
      
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      weekdays.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument()
      })
    })

    test('should render all days of the month', () => {
      render(<HolidayCalendar />)
      
      // January 2025 has 31 days
      for (let day = 1; day <= 31; day++) {
        expect(screen.getByText(day.toString())).toBeInTheDocument()
      }
    })

    test('should highlight today correctly', () => {
      // Set system time to a specific date in January
      jest.setSystemTime(new Date('2025-01-15T10:00:00Z'))
      
      render(<HolidayCalendar />)
      
      // Find the day cell for January 15
      const todayCell = screen.getByText('15').closest('div')
      expect(todayCell).toHaveClass('bg-blue-100', 'border-blue-300', 'font-semibold')
    })

    test('should properly style holiday days', () => {
      render(<HolidayCalendar />)
      
      // January 1, 2025 is New Year's Day (market_closed)
      const newYearCell = screen.getByText('1').closest('div')
      expect(newYearCell).toHaveClass('bg-red-100', 'border-red-300', 'text-red-800')
      
      // January 20, 2025 is MLK Day (market_closed)
      const mlkCell = screen.getByText('20').closest('div')
      expect(mlkCell).toHaveClass('bg-red-100', 'border-red-300', 'text-red-800')
    })

    test('should properly style early close days', () => {
      // Navigate to July to test Independence Day (observed)
      render(<HolidayCalendar />)
      
      // Navigate to July
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      
      for (let i = 0; i < 6; i++) {
        fireEvent.click(nextButton!)
      }
      
      expect(screen.getByText('July 2025')).toBeInTheDocument()
      
      // July 3, 2025 is early close day
      const earlyCloseCell = screen.getByText('3').closest('div')
      expect(earlyCloseCell).toHaveClass('bg-yellow-100', 'border-yellow-300', 'text-yellow-800')
    })

    test('should display holiday icons correctly', () => {
      render(<HolidayCalendar />)
      
      // New Year's Day should have a warning icon (market closed)
      const newYearCell = screen.getByText('1').closest('div')
      expect(newYearCell?.querySelector('[data-lucide="alert-triangle"]')).toBeInTheDocument()
    })
  })

  // ===== Legend Tests =====
  describe('Calendar Legend', () => {
    test('should render all legend items', () => {
      render(<HolidayCalendar />)
      
      expect(screen.getByText('Trading Day')).toBeInTheDocument()
      expect(screen.getByText('Market Closed')).toBeInTheDocument()
      expect(screen.getByText('Early Close')).toBeInTheDocument()
      expect(screen.getByText('Today')).toBeInTheDocument()
    })

    test('should have correct color indicators in legend', () => {
      render(<HolidayCalendar />)
      
      const legend = screen.getByText('Trading Day').closest('div')?.previousSibling as HTMLElement
      expect(legend).toHaveClass('bg-green-50', 'border-green-200')
      
      const marketClosedLegend = screen.getByText('Market Closed').closest('div')?.previousSibling as HTMLElement
      expect(marketClosedLegend).toHaveClass('bg-red-100', 'border-red-300')
      
      const earlyCloseLegend = screen.getByText('Early Close').closest('div')?.previousSibling as HTMLElement
      expect(earlyCloseLegend).toHaveClass('bg-yellow-100', 'border-yellow-300')
      
      const todayLegend = screen.getByText('Today').closest('div')?.previousSibling as HTMLElement
      expect(todayLegend).toHaveClass('bg-blue-100', 'border-blue-300')
    })
  })

  // ===== Upcoming Holidays Tests =====
  describe('Upcoming Holidays Sidebar', () => {
    test('should render upcoming holidays section', () => {
      render(<HolidayCalendar />)
      
      expect(screen.getByText('Upcoming Holidays')).toBeInTheDocument()
    })

    test('should display upcoming holidays correctly', () => {
      // Set date to early 2025 to see upcoming holidays
      jest.setSystemTime(new Date('2025-01-10T10:00:00Z'))
      
      render(<HolidayCalendar />)
      
      // Should show MLK Day as upcoming
      expect(screen.getByText('Martin Luther King Jr. Day')).toBeInTheDocument()
      expect(screen.getByText('Presidents\' Day')).toBeInTheDocument()
    })

    test('should format holiday dates correctly', () => {
      render(<HolidayCalendar />)
      
      // MLK Day should be formatted as "Monday, Jan 20"
      const mlkDate = screen.getByText('Monday, Jan 20')
      expect(mlkDate).toBeInTheDocument()
    })

    test('should display correct holiday status badges', () => {
      render(<HolidayCalendar />)
      
      // Find all CLOSED and EARLY badges
      const closedBadges = screen.getAllByText('CLOSED')
      const earlyBadges = screen.getAllByText('EARLY')
      
      expect(closedBadges.length).toBeGreaterThan(0)
      expect(earlyBadges.length).toBeGreaterThan(0)
    })
  })

  // ===== VIX Exit Matrix Tests =====
  describe('VIX Exit Matrix Sidebar', () => {
    test('should render VIX Exit Matrix section', () => {
      render(<HolidayCalendar />)
      
      expect(screen.getByText('VIX Exit Matrix')).toBeInTheDocument()
      expect(screen.getByText('BIDBACK Master System exit parameters based on VIX levels')).toBeInTheDocument()
    })

    test('should display all VIX ranges', () => {
      render(<HolidayCalendar />)
      
      const expectedRanges = [
        'VIX < 12 (Ultra-Low)',
        'VIX 12-15 (Low)',
        'VIX 15-20 (Normal)',
        'VIX 20-25 (Elevated)',
        'VIX 25-30 (High)',
        'VIX 30-40 (Very High)',
        'VIX > 40 (Extreme)'
      ]
      
      expectedRanges.forEach(range => {
        expect(screen.getByText(range)).toBeInTheDocument()
      })
    })

    test('should display correct VIX matrix parameters', () => {
      render(<HolidayCalendar />)
      
      // Test Ultra-Low VIX parameters
      const ultraLowMatrix = VIX_EXIT_MATRIX[0]
      expect(screen.getByText(`Stop: ${ultraLowMatrix.stopLossPercent}%`)).toBeInTheDocument()
      expect(screen.getByText(`Target: ${ultraLowMatrix.profitTarget2Percent}%`)).toBeInTheDocument()
      expect(screen.getByText(`Days: ${ultraLowMatrix.maxHoldDays}`)).toBeInTheDocument()
      expect(screen.getByText(`Mult: ${ultraLowMatrix.multiplier}x`)).toBeInTheDocument()
    })

    test('should display all VIX matrix entries', () => {
      render(<HolidayCalendar />)
      
      // Should have 7 VIX matrix entries
      VIX_EXIT_MATRIX.forEach((matrix, index) => {
        expect(screen.getByText(matrix.vixRange)).toBeInTheDocument()
      })
    })
  })

  // ===== Utility Functions Integration Tests =====
  describe('Utility Functions Integration', () => {
    test('should call getAllHolidays on component mount', () => {
      render(<HolidayCalendar />)
      
      expect(mockGetAllHolidays).toHaveBeenCalledTimes(1)
    })

    test('should call isTradingDay for each calendar day', () => {
      render(<HolidayCalendar />)
      
      // Should be called for each day in January (31 days)
      expect(mockIsTradingDay).toHaveBeenCalledTimes(31)
    })

    test('should call isEarlyCloseDay for each calendar day', () => {
      render(<HolidayCalendar />)
      
      // Should be called for each day in January (31 days)
      expect(mockIsEarlyCloseDay).toHaveBeenCalledTimes(31)
    })

    test('should recalculate calendar data when month changes', () => {
      render(<HolidayCalendar />)
      
      // Clear previous calls
      jest.clearAllMocks()
      
      // Navigate to next month
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      fireEvent.click(nextButton!)
      
      // Should recalculate for February (28 days in 2025)
      expect(mockIsTradingDay).toHaveBeenCalledTimes(28)
      expect(mockIsEarlyCloseDay).toHaveBeenCalledTimes(28)
    })
  })

  // ===== Error Handling Tests =====
  describe('Error Handling', () => {
    test('should handle empty holidays array gracefully', () => {
      mockGetAllHolidays.mockReturnValue([])
      
      render(<HolidayCalendar />)
      
      // Component should still render without crashing
      expect(screen.getByText('BIDBACK Trading Calendar')).toBeInTheDocument()
      expect(screen.getByText('January 2025')).toBeInTheDocument()
    })

    test('should handle utility function errors gracefully', () => {
      mockIsTradingDay.mockImplementation(() => {
        throw new Error('Utility function error')
      })
      
      // Component should handle errors and not crash
      expect(() => render(<HolidayCalendar />)).not.toThrow()
    })
  })

  // ===== Accessibility Tests =====
  describe('Accessibility', () => {
    test('should have proper button accessibility', () => {
      const mockOnBack = jest.fn()
      render(<HolidayCalendar onBack={mockOnBack} />)
      
      const backButton = screen.getByRole('button', { name: /back to trading/i })
      expect(backButton).toBeInTheDocument()
      
      // Navigation buttons should be accessible
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(1) // At least back + navigation buttons
    })

    test('should have proper heading structure', () => {
      render(<HolidayCalendar />)
      
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('BIDBACK Trading Calendar')
      
      const subHeadings = screen.getAllByRole('heading', { level: 2, level: 3 })
      expect(subHeadings.length).toBeGreaterThan(0)
    })

    test('should have proper color contrast for different day types', () => {
      render(<HolidayCalendar />)
      
      // Holiday days should have sufficient contrast
      const holidayCell = screen.getByText('1').closest('div')
      expect(holidayCell).toHaveClass('text-red-800') // Dark text on light background
    })
  })

  // ===== Performance Tests =====
  describe('Performance', () => {
    test('should memoize holidays calculation', () => {
      const { rerender } = render(<HolidayCalendar />)
      
      // First render
      expect(mockGetAllHolidays).toHaveBeenCalledTimes(1)
      
      // Rerender with same props
      rerender(<HolidayCalendar />)
      
      // Should not call getAllHolidays again due to useMemo
      expect(mockGetAllHolidays).toHaveBeenCalledTimes(1)
    })

    test('should handle month navigation efficiently', () => {
      render(<HolidayCalendar />)
      
      // Clear initial calls
      jest.clearAllMocks()
      
      // Navigate multiple months
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      
      fireEvent.click(nextButton!)
      fireEvent.click(nextButton!)
      fireEvent.click(nextButton!)
      
      // Should only call utilities for the visible month
      expect(mockGetAllHolidays).toHaveBeenCalledTimes(0) // Memoized
    })
  })
})