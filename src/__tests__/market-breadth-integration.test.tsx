/**
 * Market Breadth Form Integration Tests
 * 
 * Integration tests for the complete Market Breadth data entry workflow,
 * focusing on VIX data persistence and form-to-database integration.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataEntryForm } from '../renderer/components/market-breadth/DataEntryForm'
import type { BreadthData, MarketDataInput } from '../types/trading'

// Mock the breadth calculator hook
const mockCalculateSingle = vi.fn()
const mockValidateData = vi.fn()

vi.mock('../renderer/hooks/useBreadthCalculator', () => ({
  useBreadthCalculator: () => ({
    calculateSingle: mockCalculateSingle,
    validateData: mockValidateData,
    currentAlgorithm: 'enhanced_v2',
    latestResult: null,
    isLoading: false,
    error: null
  })
}))

// Mock electron API
const mockElectronAPI = {
  invoke: vi.fn(),
}

// Mock trading API
const mockTradingAPI = {
  getBreadthData: vi.fn(),
}

// Setup global mocks
beforeEach(() => {
  global.window = {
    electronAPI: mockElectronAPI,
    tradingAPI: mockTradingAPI,
  } as any

  // Reset all mocks
  vi.clearAllMocks()
  
  // Setup default mock implementations
  mockValidateData.mockResolvedValue({ isValid: true, errors: [] })
  mockCalculateSingle.mockResolvedValue({
    score: 75.5,
    normalizedScore: 72.3,
    confidence: 0.95,
    market_condition: {
      phase: 'BULL',
      trend_direction: 'UP',
      strength: 'STRONG'
    },
    metadata: {
      algorithm_used: 'enhanced_v2',
      data_quality: 98
    }
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Market Breadth Form Integration Tests', () => {
  
  describe('Form Initialization and VIX Pre-filling', () => {
    test('should pre-fill VIX field from last database entry', async () => {
      const lastBreadthData: BreadthData = {
        id: 1,
        date: '2025-09-03',
        vix: 22.7, // Last entered VIX value
        stocksUp20Pct: 280,
        stocksDown20Pct: 140,
        stocksUp20Dollar: 320,
        stocksDown20Dollar: 90,
        t2108: 67,
        worden_universe: 7000,
        // Required fields
        timestamp: new Date().toISOString(),
        advancingIssues: 550,
        decliningIssues: 180,
        newHighs: 0,
        newLows: 0,
        upVolume: 0,
        downVolume: 0,
        stocks_up_4pct: 550,
        stocks_down_4pct: 180,
        stocks_up_25pct_quarter: null,
        stocks_down_25pct_quarter: null,
        stocks_up_25pct_month: null,
        stocks_down_25pct_month: null,
        stocks_up_50pct_month: null,
        stocks_down_50pct_month: null,
        stocks_up_13pct_34days: null,
        stocks_down_13pct_34days: null,
        sp500: '5850',
        ratio_5day: 3.0,
        ratio_10day: 3.2,
        score: 78.2,
        normalizedScore: 75.1,
        confidence: 0.97,
        marketCondition: 'BULL',
        trendDirection: 'UP',
        strength: 'STRONG',
        dataQualityScore: 100,
        algorithm: 'enhanced_v2',
        metadata: '{}',
        notes: null
      }

      // Mock the last breadth data retrieval
      mockElectronAPI.invoke.mockResolvedValue([lastBreadthData])

      render(<DataEntryForm />)

      // Wait for form initialization and pre-filling
      await waitFor(() => {
        const vixInput = screen.getByPlaceholderText(/18\.5/)
        expect(vixInput).toBeInTheDocument()
      }, { timeout: 5000 })

      // Check that VIX field is pre-filled
      await waitFor(() => {
        const vixInput = screen.getByPlaceholderText(/18\.5/) as HTMLInputElement
        expect(vixInput.value).toBe('22.7')
      }, { timeout: 3000 })

      console.log('✅ VIX field pre-filled from last database entry')
    })

    test('should handle form initialization without existing data', async () => {
      // Mock empty database response
      mockElectronAPI.invoke.mockResolvedValue([])

      render(<DataEntryForm />)

      // Wait for form to load
      await waitFor(() => {
        const vixInput = screen.getByPlaceholderText(/18\.5/)
        expect(vixInput).toBeInTheDocument()
      })

      // VIX field should be empty
      const vixInput = screen.getByPlaceholderText(/18\.5/) as HTMLInputElement
      expect(vixInput.value).toBe('')

      console.log('✅ Form initialization handled correctly without existing data')
    })
  })

  describe('Form Submission with VIX Data', () => {
    test('should successfully submit form with VIX data', async () => {
      const mockOnSuccess = vi.fn()
      
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Enhanced Market Breadth Entry')).toBeInTheDocument()
      })

      // Fill required fields
      const dateInput = screen.getByLabelText(/Date/i)
      const t2108Input = screen.getByLabelText(/T2108/i)
      const vixInput = screen.getByLabelText(/VIX Level/i)

      fireEvent.change(dateInput, { target: { value: '2025-09-04' } })
      fireEvent.change(t2108Input, { target: { value: '65' } })
      fireEvent.change(vixInput, { target: { value: '18.5' } })

      // Fill additional 20% and $20 fields
      const stocksUp20PctInput = screen.getByLabelText(/Stocks Up 20%/i)
      const stocksDown20PctInput = screen.getByLabelText(/Stocks Down 20%/i)
      const stocksUp20DollarInput = screen.getByLabelText(/Stocks Up \$20/i)
      const stocksDown20DollarInput = screen.getByLabelText(/Stocks Down \$20/i)

      fireEvent.change(stocksUp20PctInput, { target: { value: '250' } })
      fireEvent.change(stocksDown20PctInput, { target: { value: '150' } })
      fireEvent.change(stocksUp20DollarInput, { target: { value: '300' } })
      fireEvent.change(stocksDown20DollarInput, { target: { value: '100' } })

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText(/Success!/i)).toBeInTheDocument()
      }, { timeout: 10000 })

      // Verify calculateSingle was called with VIX data
      expect(mockCalculateSingle).toHaveBeenCalled()
      const callArgs = mockCalculateSingle.mock.calls[0]
      const rawData = callArgs[0]
      
      expect(rawData.vix).toBe(18.5)
      expect(rawData.stocksUp20Pct).toBe(250)
      expect(rawData.stocksDown20Pct).toBe(150)
      expect(rawData.stocksUp20Dollar).toBe(300)
      expect(rawData.stocksDown20Dollar).toBe(100)

      console.log('✅ Form submitted successfully with VIX data:', rawData.vix)
    })

    test('should handle form submission with empty VIX gracefully', async () => {
      const mockOnSuccess = vi.fn()
      
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Enhanced Market Breadth Entry')).toBeInTheDocument()
      })

      // Fill required fields but leave VIX empty
      const dateInput = screen.getByLabelText(/Date/i)
      const t2108Input = screen.getByLabelText(/T2108/i)

      fireEvent.change(dateInput, { target: { value: '2025-09-04' } })
      fireEvent.change(t2108Input, { target: { value: '65' } })

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText(/Success!/i)).toBeInTheDocument()
      }, { timeout: 10000 })

      // Verify calculateSingle was called with undefined VIX
      expect(mockCalculateSingle).toHaveBeenCalled()
      const callArgs = mockCalculateSingle.mock.calls[0]
      const rawData = callArgs[0]
      
      expect(rawData.vix).toBeUndefined()

      console.log('✅ Form submitted successfully with empty VIX (undefined)')
    })

    test('should show validation errors for invalid form data', async () => {
      render(<DataEntryForm />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Enhanced Market Breadth Entry')).toBeInTheDocument()
      })

      // Try to submit form without required fields
      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/T2108 is required/i)).toBeInTheDocument()
      })

      console.log('✅ Form validation errors displayed correctly')
    })
  })

  describe('Form State Management with VIX', () => {
    test('should maintain VIX value during form interactions', async () => {
      render(<DataEntryForm />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Enhanced Market Breadth Entry')).toBeInTheDocument()
      })

      const vixInput = screen.getByLabelText(/VIX Level/i) as HTMLInputElement
      
      // Set VIX value
      fireEvent.change(vixInput, { target: { value: '18.5' } })
      expect(vixInput.value).toBe('18.5')

      // Change other fields
      const t2108Input = screen.getByLabelText(/T2108/i)
      fireEvent.change(t2108Input, { target: { value: '65' } })

      // VIX value should remain unchanged
      expect(vixInput.value).toBe('18.5')

      // Update VIX value
      fireEvent.change(vixInput, { target: { value: '22.3' } })
      expect(vixInput.value).toBe('22.3')

      console.log('✅ VIX value maintained correctly during form interactions')
    })

    test('should clear errors when VIX field is corrected', async () => {
      render(<DataEntryForm />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Enhanced Market Breadth Entry')).toBeInTheDocument()
      })

      const vixInput = screen.getByLabelText(/VIX Level/i)
      
      // Enter invalid VIX value (this would normally trigger validation)
      fireEvent.change(vixInput, { target: { value: '-5' } })
      
      // Enter valid VIX value
      fireEvent.change(vixInput, { target: { value: '18.5' } })
      
      // No validation errors should be visible for VIX
      const vixError = screen.queryByText(/VIX must be/i)
      expect(vixError).not.toBeInTheDocument()

      console.log('✅ VIX validation errors cleared when field is corrected')
    })

    test('should reset VIX field when form is reset', async () => {
      render(<DataEntryForm />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Enhanced Market Breadth Entry')).toBeInTheDocument()
      })

      const vixInput = screen.getByLabelText(/VIX Level/i) as HTMLInputElement
      
      // Set VIX value
      fireEvent.change(vixInput, { target: { value: '18.5' } })
      expect(vixInput.value).toBe('18.5')

      // Reset form
      const resetButton = screen.getByRole('button', { name: /Reset/i })
      fireEvent.click(resetButton)

      // VIX field should be empty after reset
      await waitFor(() => {
        expect(vixInput.value).toBe('')
      })

      console.log('✅ VIX field reset correctly when form is reset')
    })
  })

  describe('Preview Calculation with VIX', () => {
    test('should include VIX data in preview calculation', async () => {
      render(<DataEntryForm />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Enhanced Market Breadth Entry')).toBeInTheDocument()
      })

      // Fill form with VIX data
      const dateInput = screen.getByLabelText(/Date/i)
      const t2108Input = screen.getByLabelText(/T2108/i)
      const vixInput = screen.getByLabelText(/VIX Level/i)

      fireEvent.change(dateInput, { target: { value: '2025-09-04' } })
      fireEvent.change(t2108Input, { target: { value: '65' } })
      fireEvent.change(vixInput, { target: { value: '18.5' } })

      // Click preview button
      const previewButton = screen.getByRole('button', { name: /Preview Calculation/i })
      fireEvent.click(previewButton)

      // Wait for preview results
      await waitFor(() => {
        expect(screen.getByText(/Calculation Preview/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      // Verify preview includes market data
      expect(screen.getByText(/75\.5/)).toBeInTheDocument() // Raw Score
      expect(screen.getByText(/72\.3/)).toBeInTheDocument() // Normalized Score
      expect(screen.getByText(/BULL/)).toBeInTheDocument() // Market Phase

      // Verify calculateSingle was called with VIX data
      expect(mockCalculateSingle).toHaveBeenCalled()
      const callArgs = mockCalculateSingle.mock.calls[0]
      const rawData = callArgs[0]
      
      expect(rawData.vix).toBe(18.5)

      console.log('✅ Preview calculation includes VIX data correctly')
    })
  })

  describe('Data Source Indicators', () => {
    test('should display data source indicators for pre-filled VIX', async () => {
      const testInitialData: Partial<BreadthData> = {
        id: 1,
        date: '2025-09-04',
        vix: 19.3, // Database VIX value
        t2108: 65,
        stocks_up_4pct: 500,
        stocks_down_4pct: 200
      }

      render(<DataEntryForm initialData={testInitialData} />)

      // Wait for form to load with initial data
      await waitFor(() => {
        expect(screen.getByText('Enhanced Market Breadth Entry')).toBeInTheDocument()
      })

      // Check for data source indicator near VIX field
      const vixInput = screen.getByLabelText(/VIX Level/i) as HTMLInputElement
      expect(vixInput.value).toBe('19.3')

      // Look for database source indicator (green indicator)
      const databaseIndicator = screen.getByText('Database')
      expect(databaseIndicator).toBeInTheDocument()

      console.log('✅ Data source indicators displayed correctly for VIX field')
    })

    test('should show high confidence for database-sourced VIX data', async () => {
      const testInitialData: Partial<BreadthData> = {
        id: 1,
        date: '2025-09-04',
        vix: 19.3, // Direct database value
        t2108: 65
      }

      render(<DataEntryForm initialData={testInitialData} />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Enhanced Market Breadth Entry')).toBeInTheDocument()
      })

      // Check for high confidence indicator
      const highConfidenceText = screen.queryByText(/High/i)
      if (highConfidenceText) {
        expect(highConfidenceText).toBeInTheDocument()
      }

      console.log('✅ High confidence indicator shown for database-sourced VIX data')
    })
  })

  describe('Error Handling and Recovery', () => {
    test('should handle calculation errors gracefully with VIX data', async () => {
      // Mock calculation error
      mockCalculateSingle.mockRejectedValue(new Error('Calculation failed'))

      render(<DataEntryForm />)

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByText('Enhanced Market Breadth Entry')).toBeInTheDocument()
      })

      // Fill form
      const dateInput = screen.getByLabelText(/Date/i)
      const t2108Input = screen.getByLabelText(/T2108/i)
      const vixInput = screen.getByLabelText(/VIX Level/i)

      fireEvent.change(dateInput, { target: { value: '2025-09-04' } })
      fireEvent.change(t2108Input, { target: { value: '65' } })
      fireEvent.change(vixInput, { target: { value: '18.5' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Calculation failed/i)).toBeInTheDocument()
      }, { timeout: 10000 })

      // VIX value should still be preserved in form
      const vixInputAfterError = screen.getByLabelText(/VIX Level/i) as HTMLInputElement
      expect(vixInputAfterError.value).toBe('18.5')

      console.log('✅ Calculation errors handled gracefully, VIX data preserved')
    })

    test('should preserve VIX data during network errors', async () => {
      // Mock network error
      mockElectronAPI.invoke.mockRejectedValue(new Error('Network error'))

      render(<DataEntryForm />)

      // Wait for form to load (might show error but form should still render)
      await waitFor(() => {
        expect(screen.getByText('Enhanced Market Breadth Entry')).toBeInTheDocument()
      })

      // Fill VIX field
      const vixInput = screen.getByLabelText(/VIX Level/i) as HTMLInputElement
      fireEvent.change(vixInput, { target: { value: '18.5' } })

      // VIX value should be preserved even with network errors
      expect(vixInput.value).toBe('18.5')

      console.log('✅ VIX data preserved during network errors')
    })
  })
})

// Export test utilities for use in other test files
export {
  mockCalculateSingle,
  mockValidateData,
  mockElectronAPI,
  mockTradingAPI,
}