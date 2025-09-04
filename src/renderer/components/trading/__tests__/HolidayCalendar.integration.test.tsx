// Holiday Calendar Integration Tests - BIDBACK Trading System
// End-to-end integration tests for Holiday Calendar system

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HolidayCalendar } from '../HolidayCalendar'
import { US_HOLIDAYS_2025 } from '../../../types/calendar'

// Real integration tests without mocking utility functions
describe('Holiday Calendar Integration Tests', () => {
  
  beforeEach(() => {
    // Set consistent date for testing
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-15T10:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ===== Full System Integration Tests =====
  describe('Complete Holiday Calendar System', () => {
    test('should correctly identify and display all 2025 US Market Holidays', async () => {
      render(<HolidayCalendar />)
      
      // Test January holidays
      expect(screen.getByText('January 2025')).toBeInTheDocument()
      
      // New Year's Day (Jan 1) should be styled as market closed
      const newYearCell = screen.getByText('1').closest('div')
      expect(newYearCell).toHaveClass('bg-red-100', 'border-red-300', 'text-red-800')
      
      // MLK Day (Jan 20) should be styled as market closed
      const mlkCell = screen.getByText('20').closest('div')
      expect(mlkCell).toHaveClass('bg-red-100', 'border-red-300', 'text-red-800')
      
      // Navigate to July to test Independence Day
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      
      // Navigate to July (6 months forward)
      for (let i = 0; i < 6; i++) {
        fireEvent.click(nextButton!)
      }
      
      await waitFor(() => {
        expect(screen.getByText('July 2025')).toBeInTheDocument()
      })
      
      // July 3 (Independence Day observed) should be early close
      const july3Cell = screen.getByText('3').closest('div')
      expect(july3Cell).toHaveClass('bg-yellow-100', 'border-yellow-300', 'text-yellow-800')
      
      // July 4 (Independence Day) should be market closed
      const july4Cell = screen.getByText('4').closest('div')
      expect(july4Cell).toHaveClass('bg-red-100', 'border-red-300', 'text-red-800')
    })

    test('should correctly handle weekend and holiday exclusions for trading days', () => {
      render(<HolidayCalendar />)
      
      // Test weekend styling (assuming Jan 4-5, 2025 are Sat-Sun)
      const saturday = screen.getByText('4').closest('div') // Jan 4, 2025 is Saturday
      const sunday = screen.getByText('5').closest('div')   // Jan 5, 2025 is Sunday
      
      expect(saturday).toHaveClass('bg-gray-100', 'text-gray-500')
      expect(sunday).toHaveClass('bg-gray-100', 'text-gray-500')
      
      // Test regular trading days
      const tuesday = screen.getByText('7').closest('div')  // Jan 7, 2025 is Tuesday
      expect(tuesday).toHaveClass('bg-green-50', 'border-green-200')
      
      // Test that New Year's Day (holiday) is not a trading day
      const newYear = screen.getByText('1').closest('div')
      expect(newYear).toHaveClass('bg-red-100', 'border-red-300', 'text-red-800')
    })

    test('should display all early close days with correct timing', async () => {
      render(<HolidayCalendar />)
      
      // Navigate through months to find all early close days
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      
      // Test July 3 (Independence Day observed)
      for (let i = 0; i < 6; i++) {
        fireEvent.click(nextButton!)
      }
      
      await waitFor(() => {
        expect(screen.getByText('July 2025')).toBeInTheDocument()
      })
      
      const july3Cell = screen.getByText('3').closest('div')
      expect(july3Cell).toHaveClass('bg-yellow-100', 'border-yellow-300', 'text-yellow-800')
      expect(july3Cell?.querySelector('[data-lucide="clock"]')).toBeInTheDocument()
      
      // Navigate to November for Thanksgiving Friday
      for (let i = 0; i < 4; i++) {
        fireEvent.click(nextButton!)
      }
      
      await waitFor(() => {
        expect(screen.getByText('November 2025')).toBeInTheDocument()
      })
      
      const nov28Cell = screen.getByText('28').closest('div')
      expect(nov28Cell).toHaveClass('bg-yellow-100', 'border-yellow-300', 'text-yellow-800')
      
      // Navigate to December for Christmas Eve
      fireEvent.click(nextButton!)
      
      await waitFor(() => {
        expect(screen.getByText('December 2025')).toBeInTheDocument()
      })
      
      const dec24Cell = screen.getByText('24').closest('div')
      expect(dec24Cell).toHaveClass('bg-yellow-100', 'border-yellow-300', 'text-yellow-800')
    })

    test('should correctly show upcoming holidays in sidebar', () => {
      render(<HolidayCalendar />)
      
      // From January 15, 2025, upcoming holidays should include:
      expect(screen.getByText('Martin Luther King Jr. Day')).toBeInTheDocument()
      expect(screen.getByText('Presidents\' Day')).toBeInTheDocument()
      expect(screen.getByText('Good Friday')).toBeInTheDocument()
      
      // Check date formatting
      expect(screen.getByText('Monday, Jan 20')).toBeInTheDocument() // MLK Day
      expect(screen.getByText('Monday, Feb 17')).toBeInTheDocument() // Presidents Day
      
      // Check status badges
      const closedBadges = screen.getAllByText('CLOSED')
      expect(closedBadges.length).toBeGreaterThan(0)
    })

    test('should display complete VIX Exit Matrix with correct parameters', () => {
      render(<HolidayCalendar />)
      
      // Verify all 7 VIX tiers are displayed
      expect(screen.getByText('VIX < 12 (Ultra-Low)')).toBeInTheDocument()
      expect(screen.getByText('VIX 12-15 (Low)')).toBeInTheDocument()
      expect(screen.getByText('VIX 15-20 (Normal)')).toBeInTheDocument()
      expect(screen.getByText('VIX 20-25 (Elevated)')).toBeInTheDocument()
      expect(screen.getByText('VIX 25-30 (High)')).toBeInTheDocument()
      expect(screen.getByText('VIX 30-40 (Very High)')).toBeInTheDocument()
      expect(screen.getByText('VIX > 40 (Extreme)')).toBeInTheDocument()
      
      // Verify specific parameters for Ultra-Low VIX
      expect(screen.getByText('Stop: -4%')).toBeInTheDocument()
      expect(screen.getByText('Target: 10%')).toBeInTheDocument()
      expect(screen.getByText('Days: 3')).toBeInTheDocument()
      expect(screen.getByText('Mult: 0.8x')).toBeInTheDocument()
      
      // Verify extreme VIX parameters
      expect(screen.getByText('Stop: -18%')).toBeInTheDocument()
      expect(screen.getByText('Target: 35%')).toBeInTheDocument()
      expect(screen.getByText('Days: 10')).toBeInTheDocument()
      expect(screen.getByText('Mult: 1.4x')).toBeInTheDocument()
    })
  })

  // ===== Navigation Flow Tests =====
  describe('Calendar Navigation Flow', () => {
    test('should handle complete year navigation correctly', async () => {
      render(<HolidayCalendar />)
      
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      const prevButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-left'
      )
      
      // Start at January 2025
      expect(screen.getByText('January 2025')).toBeInTheDocument()
      
      // Navigate through entire year
      const months = [
        'February 2025', 'March 2025', 'April 2025', 'May 2025',
        'June 2025', 'July 2025', 'August 2025', 'September 2025',
        'October 2025', 'November 2025', 'December 2025'
      ]
      
      for (const month of months) {
        fireEvent.click(nextButton!)
        await waitFor(() => {
          expect(screen.getByText(month)).toBeInTheDocument()
        })
      }
      
      // Navigate to January 2026
      fireEvent.click(nextButton!)
      await waitFor(() => {
        expect(screen.getByText('January 2026')).toBeInTheDocument()
      })
      
      // Navigate back to December 2025
      fireEvent.click(prevButton!)
      await waitFor(() => {
        expect(screen.getByText('December 2025')).toBeInTheDocument()
      })
    })

    test('should maintain correct holiday display across navigation', async () => {
      render(<HolidayCalendar />)
      
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      
      // Navigate to November for Thanksgiving
      for (let i = 0; i < 10; i++) {
        fireEvent.click(nextButton!)
      }
      
      await waitFor(() => {
        expect(screen.getByText('November 2025')).toBeInTheDocument()
      })
      
      // Thanksgiving (Nov 27) should be market closed
      const thanksgiving = screen.getByText('27').closest('div')
      expect(thanksgiving).toHaveClass('bg-red-100', 'border-red-300', 'text-red-800')
      
      // Day after Thanksgiving (Nov 28) should be early close
      const blackFriday = screen.getByText('28').closest('div')
      expect(blackFriday).toHaveClass('bg-yellow-100', 'border-yellow-300', 'text-yellow-800')
      
      // Navigate to December
      fireEvent.click(nextButton!)
      
      await waitFor(() => {
        expect(screen.getByText('December 2025')).toBeInTheDocument()
      })
      
      // Christmas Eve (Dec 24) should be early close
      const christmasEve = screen.getByText('24').closest('div')
      expect(christmasEve).toHaveClass('bg-yellow-100', 'border-yellow-300', 'text-yellow-800')
      
      // Christmas Day (Dec 25) should be market closed
      const christmas = screen.getByText('25').closest('div')
      expect(christmas).toHaveClass('bg-red-100', 'border-red-300', 'text-red-800')
    })
  })

  // ===== Today Highlighting Tests =====
  describe('Today Highlighting', () => {
    test('should correctly highlight today across different months', async () => {
      // Test with different "today" dates
      jest.setSystemTime(new Date('2025-07-15T10:00:00Z'))
      
      render(<HolidayCalendar />)
      
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      
      // Navigate to July
      for (let i = 0; i < 6; i++) {
        fireEvent.click(nextButton!)
      }
      
      await waitFor(() => {
        expect(screen.getByText('July 2025')).toBeInTheDocument()
      })
      
      // July 15 should be highlighted as today
      const todayCell = screen.getByText('15').closest('div')
      expect(todayCell).toHaveClass('bg-blue-100', 'border-blue-300', 'font-semibold')
    })

    test('should not highlight today when viewing different month', () => {
      jest.setSystemTime(new Date('2025-01-15T10:00:00Z'))
      
      render(<HolidayCalendar />)
      
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      
      // Navigate to February
      fireEvent.click(nextButton!)
      
      expect(screen.getByText('February 2025')).toBeInTheDocument()
      
      // February 15 should NOT be highlighted (today is Jan 15)
      const feb15Cell = screen.getByText('15').closest('div')
      expect(feb15Cell).not.toHaveClass('bg-blue-100', 'border-blue-300', 'font-semibold')
    })
  })

  // ===== Error Resilience Tests =====
  describe('Error Resilience', () => {
    test('should handle invalid dates gracefully', () => {
      // Set an edge case date
      jest.setSystemTime(new Date('2025-02-29T10:00:00Z')) // Invalid date (2025 is not leap year)
      
      // Component should still render without crashing
      expect(() => render(<HolidayCalendar />)).not.toThrow()
    })

    test('should handle month boundaries correctly', () => {
      render(<HolidayCalendar />)
      
      const prevButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-left'
      )
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      
      // Start at January, go to December, then back to January
      expect(screen.getByText('January 2025')).toBeInTheDocument()
      
      fireEvent.click(prevButton!)
      expect(screen.getByText('December 2024')).toBeInTheDocument()
      
      fireEvent.click(nextButton!)
      expect(screen.getByText('January 2025')).toBeInTheDocument()
    })
  })

  // ===== Performance Integration Tests =====
  describe('Performance Integration', () => {
    test('should handle rapid navigation without issues', async () => {
      render(<HolidayCalendar />)
      
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      
      // Rapidly click through multiple months
      for (let i = 0; i < 12; i++) {
        fireEvent.click(nextButton!)
      }
      
      await waitFor(() => {
        expect(screen.getByText('January 2026')).toBeInTheDocument()
      }, { timeout: 3000 })
      
      // Should not crash and should display correct month
      expect(screen.getByText('January 2026')).toBeInTheDocument()
    })

    test('should maintain responsive UI during navigation', () => {
      render(<HolidayCalendar />)
      
      const nextButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'chevron-right'
      )
      
      // Multiple rapid clicks
      fireEvent.click(nextButton!)
      fireEvent.click(nextButton!)
      fireEvent.click(nextButton!)
      
      // Should still be responsive
      expect(screen.getByText('April 2025')).toBeInTheDocument()
      
      // Calendar should still show all required elements
      expect(screen.getByText('Sun')).toBeInTheDocument()
      expect(screen.getByText('Trading Day')).toBeInTheDocument()
      expect(screen.getByText('VIX Exit Matrix')).toBeInTheDocument()
    })
  })

  // ===== Holiday Calendar Data Integrity Tests =====
  describe('Holiday Data Integrity', () => {
    test('should validate all 13 required US holidays are present', () => {
      render(<HolidayCalendar />)
      
      // Verify we have exactly 13 holidays in the data
      expect(US_HOLIDAYS_2025).toHaveLength(13)
      
      // Verify specific required holidays
      const holidayNames = US_HOLIDAYS_2025.map(h => h.name)
      const requiredHolidays = [
        'New Year\'s Day',
        'Martin Luther King Jr. Day',
        'Presidents\' Day',
        'Good Friday',
        'Memorial Day',
        'Juneteenth',
        'Independence Day',
        'Labor Day',
        'Thanksgiving Day',
        'Christmas Day'
      ]
      
      requiredHolidays.forEach(holiday => {
        expect(holidayNames).toContain(holiday)
      })
    })

    test('should validate early close days have correct times', () => {
      const earlyCloseHolidays = US_HOLIDAYS_2025.filter(h => h.type === 'early_close')
      
      expect(earlyCloseHolidays).toHaveLength(3) // July 3, Nov 28, Dec 24
      
      earlyCloseHolidays.forEach(holiday => {
        expect(holiday.earlyCloseTime).toBe('13:00')
      })
    })
  })
})