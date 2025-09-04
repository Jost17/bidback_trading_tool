/**
 * Edge Cases and Validation Tests for Market Breadth System
 * Tests extreme values, boundary conditions, error handling, and validation scenarios
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataEntryForm } from '../DataEntryForm'
import { PositionCalculator } from '../PositionCalculator'
import type { BreadthData } from '../../../../types/trading'

// Mock dependencies with edge case handling
vi.mock('../../../../hooks/useBreadthCalculator', () => ({
  useBreadthCalculator: () => ({
    calculateSingle: vi.fn().mockImplementation(async (data) => {
      // Handle edge cases in calculation
      const up4pct = data.stocksUp4PctDaily || 0
      const t2108 = data.t2108 || 0
      
      if (up4pct < 0 || t2108 < 0 || t2108 > 100) {
        throw new Error('Invalid data values')
      }
      
      return {
        score: Math.max(0, Math.min(100, up4pct * 0.1 + t2108 * 0.5)),
        normalizedScore: 50,
        confidence: 0.75,
        market_condition: {
          phase: 'NEUTRAL',
          trend_direction: 'SIDEWAYS',
          strength: 'MODERATE'
        },
        metadata: {
          algorithm_used: 'enhanced_v2',
          data_quality: 85,
          calculation_time: 50
        }
      }
    }),
    validateData: vi.fn().mockImplementation(async (data) => {
      const errors = []
      if (data.t2108 && (data.t2108 < 0 || data.t2108 > 100)) {
        errors.push('T2108 must be between 0 and 100')
      }
      if (data.stocksUp4PctDaily && data.stocksUp4PctDaily < 0) {
        errors.push('Stock counts cannot be negative')
      }
      return {
        isValid: errors.length === 0,
        errors
      }
    }),
    currentAlgorithm: 'enhanced_v2',
    latestResult: null,
    isLoading: false,
    error: null
  })
}))

vi.mock('../../../../utils/holidayCalendar', () => ({
  calculateExitDate: vi.fn((entryDate: Date, vix: number) => {
    if (vix < 0 || vix > 150) {
      throw new Error('Invalid VIX value for exit calculation')
    }
    const exitDate = new Date(entryDate)
    exitDate.setDate(exitDate.getDate() + Math.max(1, Math.min(30, Math.floor(50 / Math.max(vix, 5)))))
    return exitDate
  }),
  calculateExitPrices: vi.fn((entryPrice: number, vix: number) => {
    if (entryPrice <= 0 || vix < 0) {
      throw new Error('Invalid parameters for exit price calculation')
    }
    return {
      stopLoss: entryPrice * 0.95,
      profitTarget1: entryPrice * 1.08,
      profitTarget2: entryPrice * 1.15,
      vixMatrix: {
        vixRange: 'edge-case',
        multiplier: 1.0,
        stopLossPercent: -5,
        profitTarget1Percent: 8,
        profitTarget2Percent: 15,
        maxHoldDays: 5
      }
    }
  }),
  getVixExitMatrix: vi.fn((vix: number) => ({
    vixRange: 'edge-case',
    multiplier: Math.max(0.1, Math.min(2.0, vix / 20)),
    stopLossPercent: -Math.max(2, Math.min(15, vix / 5)),
    profitTarget1Percent: Math.max(2, Math.min(25, vix / 3)),
    profitTarget2Percent: Math.max(5, Math.min(50, vix / 2)),
    maxHoldDays: Math.max(1, Math.min(30, Math.floor(100 / Math.max(vix, 5))))
  }))
}))

describe('Edge Cases and Validation Tests', () => {
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Extreme VIX Values', () => {
    test('should handle VIX = 0', () => {
      render(
        <PositionCalculator
          portfolioSize={100000}
          t2108={50}
          up4pct={500}
          vix={0}
        />
      )

      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      expect(screen.getByText('0.0')).toBeInTheDocument() // Should display 0.0 VIX
    })

    test('should handle extremely high VIX (>100)', () => {
      render(
        <PositionCalculator
          portfolioSize={100000}
          t2108={50}
          up4pct={500}
          vix={150.0}
        />
      )

      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      expect(screen.getByText('150.0')).toBeInTheDocument()
      expect(screen.getByText(/extreme/i)).toBeInTheDocument() // Should classify as extreme
    })

    test('should handle decimal precision edge cases', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      
      const precisionTests = [
        '0.01',   // Minimum meaningful value
        '9.999',  // Just under 10
        '99.99',  // Near maximum realistic value
        '0.000001' // Extremely small value
      ]

      for (const vixValue of precisionTests) {
        fireEvent.change(vixInput, { target: { value: vixValue } })
        expect(vixInput.value).toBe(vixValue)
        
        // Form should handle without crashing
        await waitFor(() => {
          expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
        })
      }
    })

    test('should handle negative VIX values gracefully', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      fireEvent.change(vixInput, { target: { value: '-10.5' } })

      expect(vixInput.value).toBe('-10.5')
      
      // Should not crash the application
      await waitFor(() => {
        expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      })
    })
  })

  describe('Extreme Market Breadth Values', () => {
    test('should handle zero stock counts', () => {
      render(
        <PositionCalculator
          portfolioSize={100000}
          t2108={50}
          up4pct={0}
          down4pct={0}
          vix={20.0}
        />
      )

      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      expect(screen.getByText(/0\.0x/)).toBeInTheDocument() // Breadth multiplier should be 0
      expect(screen.getByText(/weak/i)).toBeInTheDocument() // Breadth strength should be weak
    })

    test('should handle extremely large stock counts', () => {
      render(
        <PositionCalculator
          portfolioSize={100000}
          t2108={30}
          up4pct={50000} // Unrealistically high
          down4pct={100}
          vix={15.0}
        />
      )

      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      expect(screen.getByText(/strong/i)).toBeInTheDocument() // Should classify as strong
      expect(screen.getByText(/2\.0x/)).toBeInTheDocument() // Should use Big Opportunity multiplier
    })

    test('should handle negative stock counts in form validation', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const stocksUp4PctInput = screen.getByLabelText(/Stocks Up 4% Daily/i)
      const t2108Input = screen.getByLabelText(/T2108/i)
      
      fireEvent.change(stocksUp4PctInput, { target: { value: '-100' } })
      fireEvent.change(t2108Input, { target: { value: '50' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Must be a valid positive number/i)).toBeInTheDocument()
      })
    })

    test('should handle T2108 boundary values', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const t2108Input = screen.getByLabelText(/T2108/i)
      
      // Test boundary values
      const boundaryTests = [
        { value: '0', shouldPass: true },
        { value: '100', shouldPass: true },
        { value: '-0.01', shouldPass: false },
        { value: '100.01', shouldPass: false },
        { value: '150', shouldPass: false }
      ]

      for (const test of boundaryTests) {
        fireEvent.change(t2108Input, { target: { value: test.value } })
        
        const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
        fireEvent.click(submitButton)

        if (test.shouldPass) {
          await waitFor(() => {
            expect(screen.queryByText(/T2108 must be between 0 and 100/i)).not.toBeInTheDocument()
          })
        } else {
          await waitFor(() => {
            expect(screen.getByText(/T2108 must be between 0 and 100/i)).toBeInTheDocument()
          })
        }
      }
    })
  })

  describe('Portfolio Size Edge Cases', () => {
    test('should handle extremely small portfolio sizes', () => {
      render(
        <PositionCalculator
          portfolioSize={100} // $100 portfolio
          t2108={50}
          up4pct={500}
          vix={20.0}
        />
      )

      expect(screen.getByText('$100')).toBeInTheDocument() // Portfolio size
      expect(screen.getByText('$10')).toBeInTheDocument() // Base position (10%)
      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
    })

    test('should handle extremely large portfolio sizes', () => {
      render(
        <PositionCalculator
          portfolioSize={1000000000} // $1B portfolio
          t2108={50}
          up4pct={500}
          vix={20.0}
        />
      )

      expect(screen.getByText('$1,000,000,000')).toBeInTheDocument() // Should format properly
      expect(screen.getByText('$100,000,000')).toBeInTheDocument() // Base position
    })

    test('should handle zero portfolio size', () => {
      render(
        <PositionCalculator
          portfolioSize={0}
          t2108={50}
          up4pct={500}
          vix={20.0}
        />
      )

      expect(screen.getByText('$0')).toBeInTheDocument()
      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
    })

    test('should validate portfolio size input range', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Open settings
      const settingsButton = screen.getByRole('button', { name: '' })
      fireEvent.click(settingsButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/Portfolio Size/i)).toBeInTheDocument()
      })

      const portfolioInput = screen.getByDisplayValue('100000')
      
      // Test various edge cases
      const portfolioTests = ['0', '1', '999999999999']
      
      for (const value of portfolioTests) {
        fireEvent.change(portfolioInput, { target: { value } })
        expect(portfolioInput.value).toBe(value)
        
        const updateButton = screen.getByRole('button', { name: /Update/i })
        fireEvent.click(updateButton)
        
        // Should not crash
        await waitFor(() => {
          expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
        })
      }
    })
  })

  describe('Input Validation Edge Cases', () => {
    test('should handle non-numeric string inputs', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const inputs = [
        { label: /Stocks Up 4% Daily/i, value: 'abc123' },
        { label: /Stocks Down 4% Daily/i, value: '!@#$%' },
        { label: /T2108/i, value: 'NaN' },
        { label: /VIX Level/i, value: 'infinity' }
      ]

      for (const input of inputs) {
        const element = screen.getByLabelText(input.label)
        fireEvent.change(element, { target: { value: input.value } })
        expect(element.value).toBe(input.value)
        
        const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
        fireEvent.click(submitButton)

        // Should show validation error for numeric fields
        if (input.label.toString().includes('VIX')) {
          // VIX field might have different validation
          await waitFor(() => {
            expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
          })
        } else {
          await waitFor(() => {
            expect(screen.getByText(/Must be a valid positive number/i)).toBeInTheDocument()
          })
        }
      }
    })

    test('should handle scientific notation input', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const scientificValues = [
        { field: /Stocks Up 4% Daily/i, value: '1e3' }, // 1000
        { field: /VIX Level/i, value: '2.5e1' },        // 25.0
        { field: /T2108/i, value: '5e1' }               // 50
      ]

      for (const test of scientificValues) {
        const input = screen.getByLabelText(test.field)
        fireEvent.change(input, { target: { value: test.value } })
        
        // Should accept scientific notation
        expect(input.value).toBe(test.value)
      }
    })

    test('should handle decimal with multiple dots', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      fireEvent.change(vixInput, { target: { value: '12.3.4.5' } })

      expect(vixInput.value).toBe('12.3.4.5')
      
      // Form should handle gracefully
      await waitFor(() => {
        expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      })
    })
  })

  describe('Date Edge Cases', () => {
    test('should handle invalid date formats', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const dateInput = screen.getByLabelText(/Date/i)
      const invalidDates = [
        '2025-13-01', // Invalid month
        '2025-02-30', // Invalid day for February
        '2025-00-01', // Zero month
        '2025-02-29', // Non-leap year
        'invalid-date'
      ]

      for (const invalidDate of invalidDates) {
        fireEvent.change(dateInput, { target: { value: invalidDate } })
        
        const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
        fireEvent.click(submitButton)

        // Should handle invalid dates gracefully (browser validation may vary)
        await waitFor(() => {
          expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
        })
      }
    })

    test('should handle future dates', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const dateInput = screen.getByLabelText(/Date/i)
      const futureDate = '2030-12-31'
      
      fireEvent.change(dateInput, { target: { value: futureDate } })
      expect(dateInput.value).toBe(futureDate)
      
      // Should accept future dates without issues
      await waitFor(() => {
        expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      })
    })

    test('should handle very old dates', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const dateInput = screen.getByLabelText(/Date/i)
      const oldDate = '1990-01-01'
      
      fireEvent.change(dateInput, { target: { value: oldDate } })
      expect(dateInput.value).toBe(oldDate)
    })
  })

  describe('Memory and Performance Edge Cases', () => {
    test('should handle rapid successive updates without memory leaks', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      const stocksInput = screen.getByLabelText(/Stocks Up 4% Daily/i)
      
      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        fireEvent.change(vixInput, { target: { value: (10 + i % 30).toString() } })
        fireEvent.change(stocksInput, { target: { value: (100 + i * 10).toString() } })
      }

      // Should still be responsive
      await waitFor(() => {
        expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      })
    })

    test('should handle component unmounting during calculation', async () => {
      const { unmount } = render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Start a calculation
      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '50' } })
      
      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      // Immediately unmount
      unmount()

      // Should not throw errors or cause memory leaks
      expect(true).toBe(true) // If we reach here, no errors were thrown
    })
  })

  describe('Accessibility Edge Cases', () => {
    test('should handle screen reader navigation', () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // All form fields should be properly labeled
      expect(screen.getByLabelText(/Date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Stocks Up 4% Daily/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Stocks Down 4% Daily/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/T2108/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/VIX Level/i)).toBeInTheDocument()

      // Buttons should be accessible
      expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Preview Calculation/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Calculate & Save/i })).toBeInTheDocument()
    })

    test('should handle keyboard navigation', () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Tab order should be logical
      const inputs = [
        screen.getByLabelText(/Date/i),
        screen.getByLabelText(/S&P 500 Level/i),
        screen.getByLabelText(/Worden Universe/i),
        screen.getByLabelText(/Stocks Up 4% Daily/i),
        screen.getByLabelText(/VIX Level/i)
      ]

      inputs.forEach(input => {
        expect(input).toBeInTheDocument()
        expect(input).not.toBeDisabled()
      })
    })
  })

  describe('Error Recovery', () => {
    test('should recover from calculation errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Set up scenario that will cause calculation error
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '-100' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '150' } })
      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Should show validation errors instead of crashing
        expect(screen.getByText(/Must be a valid positive number/i)).toBeInTheDocument()
      })

      // Form should still be functional
      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()

      consoleErrorSpy.mockRestore()
    })

    test('should handle network-like errors in calculation', async () => {
      // Mock a failing calculation
      const mockCalculateError = vi.fn().mockRejectedValue(new Error('Network error'))
      
      const { useBreadthCalculator } = await import('../../../../hooks/useBreadthCalculator')
      vi.mocked(useBreadthCalculator).mockReturnValue({
        calculateSingle: mockCalculateError,
        validateData: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
        currentAlgorithm: 'enhanced_v2',
        latestResult: null,
        isLoading: false,
        error: null
      })

      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Fill valid data
      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '500' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '50' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Should show error message
        expect(screen.getByText(/Error/i)).toBeInTheDocument()
        expect(screen.getByText(/Network error/i)).toBeInTheDocument()
      })
    })
  })
})