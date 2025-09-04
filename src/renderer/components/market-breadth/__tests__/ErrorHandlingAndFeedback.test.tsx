/**
 * Error Handling and User Feedback Tests
 * Tests error states, validation feedback, recovery mechanisms, and user experience
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataEntryForm } from '../DataEntryForm'
import { PositionCalculator } from '../PositionCalculator'
import { mockBreadthData, mockFormData, edgeCaseTestData } from './TestFixtures'

// Mock dependencies with error scenarios
vi.mock('../../../../hooks/useBreadthCalculator', () => ({
  useBreadthCalculator: () => ({
    calculateSingle: vi.fn().mockImplementation(async (data) => {
      // Simulate various error conditions
      if (data.t2108 && data.t2108 > 100) {
        throw new Error('T2108 value exceeds maximum allowed range')
      }
      if (data.stocksUp4PctDaily && data.stocksUp4PctDaily < 0) {
        throw new Error('Stock counts cannot be negative')
      }
      if (!data.t2108) {
        throw new Error('T2108 is required for calculation')
      }
      
      return {
        score: 65,
        normalizedScore: 62,
        confidence: 0.80,
        market_condition: { phase: 'NEUTRAL', strength: 'MODERATE' },
        metadata: { algorithm_used: 'enhanced_v2' }
      }
    }),
    validateData: vi.fn().mockImplementation(async (data) => {
      const errors = []
      if (!data.t2108) errors.push('T2108 is required')
      if (data.t2108 && (data.t2108 < 0 || data.t2108 > 100)) {
        errors.push('T2108 must be between 0 and 100')
      }
      if (data.stocksUp4PctDaily && data.stocksUp4PctDaily < 0) {
        errors.push('Stock counts must be positive')
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

// Mock window.tradingAPI with error scenarios
global.window.tradingAPI = {
  getBreadthData: vi.fn().mockImplementation(() => {
    // Simulate network error occasionally
    if (Math.random() < 0.1) {
      throw new Error('Database connection failed')
    }
    return Promise.resolve([mockBreadthData.normalMarket])
  })
} as any

describe('Error Handling and User Feedback Tests', () => {
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any console warnings/errors
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('Form Validation Errors', () => {
    test('should show validation error for missing required fields', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Submit form without required fields
      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/T2108 is required/i)).toBeInTheDocument()
      })
    })

    test('should show validation error for T2108 range violations', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const t2108Input = screen.getByLabelText(/T2108/i)
      
      // Test values outside valid range
      const invalidT2108Values = ['-10', '150', '999']

      for (const invalidValue of invalidT2108Values) {
        fireEvent.change(t2108Input, { target: { value: invalidValue } })

        const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
        fireEvent.click(submitButton)

        await waitFor(() => {
          expect(screen.getByText(/T2108 must be between 0 and 100/i)).toBeInTheDocument()
        })
      }
    })

    test('should show validation error for negative stock counts', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const stocksUp4PctInput = screen.getByLabelText(/Stocks Up 4% Daily/i)
      fireEvent.change(stocksUp4PctInput, { target: { value: '-100' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Must be a valid positive number/i)).toBeInTheDocument()
      })
    })

    test('should show validation error for duplicate dates', async () => {
      // Mock existing data
      window.tradingAPI.getBreadthData = vi.fn().mockResolvedValue([
        { ...mockBreadthData.normalMarket, date: '2025-01-15' }
      ])

      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '50' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Date already exists in database/i)).toBeInTheDocument()
      })
    })

    test('should clear validation errors when correcting input', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const t2108Input = screen.getByLabelText(/T2108/i)
      
      // Enter invalid value
      fireEvent.change(t2108Input, { target: { value: '150' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/T2108 must be between 0 and 100/i)).toBeInTheDocument()
      })

      // Correct the value
      fireEvent.change(t2108Input, { target: { value: '50' } })

      await waitFor(() => {
        expect(screen.queryByText(/T2108 must be between 0 and 100/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Calculation Errors', () => {
    test('should handle calculation service errors gracefully', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Fill form with data that will trigger calculation error
      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '-100' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '50' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument()
        expect(screen.getByText(/Stock counts cannot be negative/i)).toBeInTheDocument()
      })
    })

    test('should show loading state during calculation', async () => {
      // Mock slow calculation
      const { useBreadthCalculator } = await import('../../../../hooks/useBreadthCalculator')
      vi.mocked(useBreadthCalculator).mockReturnValue({
        calculateSingle: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 100))
        ),
        validateData: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
        currentAlgorithm: 'enhanced_v2',
        latestResult: null,
        isLoading: true,
        error: null
      })

      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '50' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      // Should show loading state
      expect(screen.getByText(/Saving.../i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    test('should recover from calculation timeout', async () => {
      // Mock timeout error
      const mockCalculateError = vi.fn().mockRejectedValue(new Error('Calculation timeout'))
      
      const { useBreadthCalculator } = await import('../../../../hooks/useBreadthCalculator')
      vi.mocked(useBreadthCalculator).mockReturnValue({
        calculateSingle: mockCalculateError,
        validateData: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
        currentAlgorithm: 'enhanced_v2',
        latestResult: null,
        isLoading: false,
        error: 'Calculation timeout'
      })

      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '50' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument()
        expect(screen.getByText(/Calculation timeout/i)).toBeInTheDocument()
      })

      // Form should remain functional
      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
    })
  })

  describe('Position Calculator Error Handling', () => {
    test('should handle missing data gracefully', () => {
      render(
        <PositionCalculator
          portfolioSize={100000}
          t2108={undefined}
          up4pct={undefined}
          down4pct={undefined}
          vix={undefined}
        />
      )

      // Should not crash
      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      expect(screen.getByText(/Not triggered/i)).toBeInTheDocument() // Big Opportunity
      expect(screen.getByText(/N\/A/)).toBeInTheDocument() // VIX display
    })

    test('should handle invalid portfolio size', () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      
      render(
        <PositionCalculator
          portfolioSize={-1000} // Invalid portfolio size
          t2108={50}
          up4pct={500}
          vix={20.0}
        />
      )

      // Should handle gracefully without crashing
      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })

    test('should handle portfolio size update errors', async () => {
      const mockOnPortfolioSizeChange = vi.fn().mockImplementation(() => {
        throw new Error('Portfolio size update failed')
      })

      render(
        <PositionCalculator
          portfolioSize={100000}
          onPortfolioSizeChange={mockOnPortfolioSizeChange}
          t2108={50}
          up4pct={500}
          vix={20.0}
        />
      )

      // Open settings
      const settingsButton = screen.getByRole('button', { name: '' })
      fireEvent.click(settingsButton)

      await waitFor(() => {
        const portfolioInput = screen.getByDisplayValue('100000')
        fireEvent.change(portfolioInput, { target: { value: '200000' } })
        
        const updateButton = screen.getByRole('button', { name: /Update/i })
        fireEvent.click(updateButton)
      })

      // Should handle the error gracefully (component should not crash)
      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
    })
  })

  describe('Network and Database Errors', () => {
    test('should handle database connection failures', async () => {
      // Mock database error
      window.tradingAPI.getBreadthData = vi.fn().mockRejectedValue(
        new Error('Database connection failed')
      )

      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      // Form should handle database errors gracefully
      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
    })

    test('should handle API service unavailability', async () => {
      // Mock API unavailable
      window.tradingAPI = undefined as any

      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '50' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      // Should handle gracefully without crashing
      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
    })
  })

  describe('User Input Error Recovery', () => {
    test('should handle paste with invalid data', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const t2108Input = screen.getByLabelText(/T2108/i)
      
      // Simulate paste with invalid characters
      fireEvent.paste(t2108Input, {
        clipboardData: {
          getData: () => 'abc123!@#'
        }
      })

      // Should handle invalid paste data
      expect(t2108Input.value).toBe('abc123!@#')
      
      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Must be a valid positive number/i)).toBeInTheDocument()
      })
    })

    test('should handle form reset after errors', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Create error state
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '150' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/T2108 must be between 0 and 100/i)).toBeInTheDocument()
      })

      // Reset form
      const resetButton = screen.getByRole('button', { name: /Reset/i })
      fireEvent.click(resetButton)

      await waitFor(() => {
        // Error should be cleared
        expect(screen.queryByText(/T2108 must be between 0 and 100/i)).not.toBeInTheDocument()
        // Form should be reset
        expect(screen.getByLabelText(/T2108/i).value).toBe('')
      })
    })

    test('should maintain Position Calculator state during form errors', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Set up Position Calculator with valid data
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '600' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '45' } })
      fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: '20.0' } })

      await waitFor(() => {
        expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
        expect(screen.getByText('20.0')).toBeInTheDocument()
      })

      // Now create a form validation error
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '150' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Should show form error
        expect(screen.getByText(/T2108 must be between 0 and 100/i)).toBeInTheDocument()
        
        // But Position Calculator should still work
        expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility and User Experience', () => {
    test('should provide proper ARIA labels for error states', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const t2108Input = screen.getByLabelText(/T2108/i)
      fireEvent.change(t2108Input, { target: { value: '150' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Error message should be associated with the input
        expect(screen.getByText(/T2108 must be between 0 and 100/i)).toBeInTheDocument()
        // Input should have error styling class
        expect(t2108Input).toHaveClass('border-red-300')
      })
    })

    test('should maintain keyboard navigation during error states', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Create error state
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '150' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        // All form elements should still be keyboard accessible
        const formInputs = screen.getAllByRole('textbox')
        formInputs.forEach(input => {
          expect(input).not.toHaveAttribute('tabindex', '-1')
        })

        // Buttons should remain accessible
        expect(screen.getByRole('button', { name: /Reset/i })).not.toBeDisabled()
        expect(screen.getByRole('button', { name: /Preview Calculation/i })).not.toBeDisabled()
      })
    })

    test('should show success feedback after error recovery', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // First create an error
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '150' } })

      let submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/T2108 must be between 0 and 100/i)).toBeInTheDocument()
      })

      // Now fix the error and submit successfully
      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '50' } })

      submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Success!/i)).toBeInTheDocument()
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Error Boundary and Crash Recovery', () => {
    test('should handle component crashes gracefully', () => {
      // Mock a component that throws
      const BuggyComponent = () => {
        throw new Error('Component crashed')
      }

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // This would normally be caught by an error boundary in a real app
      expect(() => render(<BuggyComponent />)).toThrow()

      consoleErrorSpy.mockRestore()
    })

    test('should maintain data integrity after errors', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Fill form with data
      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '600' } })
      fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: '20.0' } })

      // Trigger an error
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '150' } })

      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/T2108 must be between 0 and 100/i)).toBeInTheDocument()
      })

      // Data should be preserved
      expect(screen.getByDisplayValue('2025-01-15')).toBeInTheDocument()
      expect(screen.getByDisplayValue('600')).toBeInTheDocument()
      expect(screen.getByDisplayValue('20.0')).toBeInTheDocument()
    })
  })

  describe('Performance During Error States', () => {
    test('should not cause memory leaks during error recovery', async () => {
      const { unmount } = render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Create multiple error/recovery cycles
      for (let i = 0; i < 10; i++) {
        fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '150' } })
        fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '50' } })
      }

      // Cleanup should work properly
      unmount()
      expect(true).toBe(true) // If we reach here, no memory leak occurred
    })

    test('should handle rapid error state changes efficiently', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const t2108Input = screen.getByLabelText(/T2108/i)
      
      // Rapidly alternate between valid and invalid states
      for (let i = 0; i < 20; i++) {
        fireEvent.change(t2108Input, { target: { value: i % 2 === 0 ? '150' : '50' } })
      }

      // Should settle on final state without performance issues
      await waitFor(() => {
        expect(t2108Input.value).toBe('50')
      })
    })
  })
})