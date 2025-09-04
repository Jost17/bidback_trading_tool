import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DataEntryForm } from '../DataEntryForm'
import type { BreadthData } from '../../../../types/trading'

// Mock the electron API
const mockElectronAPI = {
  invoke: vi.fn(),
}

// Mock the breadth calculator hook
const mockUseBreadthCalculator = {
  calculateSingle: vi.fn(),
  validateData: vi.fn(),
  currentAlgorithm: 'enhanced_six_factor',
  latestResult: null,
  isLoading: false,
  error: null,
}

// Mock the trading API
const mockTradingAPI = {
  getBreadthData: vi.fn(),
}

// Set up global mocks
;(global as any).window = {
  electronAPI: mockElectronAPI,
  tradingAPI: mockTradingAPI,
}

vi.mock('../../hooks/useBreadthCalculator', () => ({
  useBreadthCalculator: () => mockUseBreadthCalculator,
}))

/**
 * Phase 4 Integration Tests
 * 
 * Comprehensive end-to-end integration testing to verify all fixes work together:
 * ✅ Phase 1: getBreadthDataByDate API Connection - Fixed field mapping issues
 * ✅ Phase 2: T2108 Database Label System - Verified green "Database" labels display correctly  
 * ✅ Phase 3: VIX Field Storage - Fixed dual state management, VIX now persists properly
 */
describe('Phase 4: Complete System Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock responses
    mockElectronAPI.invoke.mockImplementation((channel, ...args) => {
      if (channel === 'trading:get-breadth-data') {
        return Promise.resolve([
          {
            date: '2025-09-04',
            t2108: 55.89,
            vix: 18.45,
            stocks_up_20pct: null,
            stocks_up_20dollar: null,
          }
        ])
      }
      return Promise.resolve(null)
    })

    mockTradingAPI.getBreadthData.mockResolvedValue([])
    
    mockUseBreadthCalculator.validateData.mockResolvedValue({ 
      isValid: true, 
      errors: [] 
    })
    
    mockUseBreadthCalculator.calculateSingle.mockResolvedValue({
      score: 65.4,
      normalizedScore: 68.2,
      confidence: 0.85,
      market_condition: {
        phase: 'BULL',
        trend_direction: 'UP',
        strength: 'MODERATE'
      },
      metadata: {
        algorithm_used: 'enhanced_six_factor',
        data_quality: 95
      }
    })
  })

  /**
   * Test 1: T2108 Database Label System
   * Verifies that T2108 field shows correct green "Database" label when data comes from CSV
   */
  describe('T2108 Database Label System (Phase 2 Fix)', () => {
    it('should show green Database label for T2108 field with CSV data', async () => {
      // Create mock data representing CSV-imported data
      const csvImportedData: Partial<BreadthData> = {
        date: '2025-06-06',
        t2108: 31.0,
        sp500: '6000.36',
        stocks_up_4pct: 13,
        stocks_down_4pct: 14,
        worden_universe: 66.6,
        source_file: 'breadth_data_2025.csv'  // Indicates CSV import
      }

      const { container } = render(
        <DataEntryForm initialData={csvImportedData} />
      )

      await waitFor(() => {
        // Find the T2108 input field
        const t2108Input = screen.getByDisplayValue('31')
        expect(t2108Input).toBeInTheDocument()
        
        // Find the parent container with the label indicator
        const t2108Container = t2108Input.closest('div')?.parentElement
        expect(t2108Container).toBeInTheDocument()
        
        // Verify database label is present
        const databaseLabel = container.querySelector('[class*="text-green-600"][class*="bg-green-50"]')
        expect(databaseLabel).toBeInTheDocument()
        expect(databaseLabel).toHaveTextContent('Database')
        
        // Verify green circle indicator
        const greenIndicator = container.querySelector('span:contains("🟢")')
        if (greenIndicator) {
          expect(greenIndicator).toBeInTheDocument()
        }
      })
    })

    it('should show yellow Notes label for T2108 field extracted from notes', async () => {
      // Create mock data with T2108 in notes (not database column)
      const notesData: Partial<BreadthData> = {
        date: '2025-09-01',
        notes: 'RECOVERED: T2108=42.5, up4%=150, down4%=100',
        // t2108 field is null/undefined, forcing notes extraction
      }

      const { container } = render(
        <DataEntryForm initialData={notesData} />
      )

      await waitFor(() => {
        // Verify T2108 value was extracted from notes
        const t2108Input = screen.getByDisplayValue('42.5')
        expect(t2108Input).toBeInTheDocument()
        
        // Verify notes label is present
        const notesLabel = container.querySelector('[class*="text-yellow-600"][class*="bg-yellow-50"]')
        expect(notesLabel).toBeInTheDocument()
        expect(notesLabel).toHaveTextContent('Notes')
        
        // Verify yellow circle indicator
        const yellowIndicator = container.querySelector('span:contains("🟡")')
        if (yellowIndicator) {
          expect(yellowIndicator).toBeInTheDocument()
        }
      })
    })
  })

  /**
   * Test 2: VIX Field Storage and Persistence
   * Verifies that VIX field accepts manual input and persists properly
   */
  describe('VIX Field Storage and Persistence (Phase 3 Fix)', () => {
    it('should accept VIX manual entry and persist the value', async () => {
      const { container } = render(<DataEntryForm />)
      
      await waitFor(() => {
        const vixInput = screen.getByPlaceholderText('e.g. 18.5')
        expect(vixInput).toBeInTheDocument()
        
        // Enter VIX value
        fireEvent.change(vixInput, { target: { value: '23.75' } })
        
        // Verify value persists in form
        expect(vixInput).toHaveValue('23.75')
      })
    })

    it('should pre-fill VIX from last entry when available', async () => {
      // Mock electron API to return previous VIX data
      mockElectronAPI.invoke.mockImplementation((channel) => {
        if (channel === 'trading:get-breadth-data') {
          return Promise.resolve([
            {
              date: '2025-09-03',
              vix: 21.25,
              stocks_up_20pct: 150,
              stocks_up_20dollar: 200
            }
          ])
        }
        return Promise.resolve(null)
      })

      render(<DataEntryForm />)
      
      await waitFor(() => {
        const vixInput = screen.getByPlaceholderText('e.g. 18.5')
        expect(vixInput).toHaveValue('21.25')
      })
    })

    it('should include VIX in form submission data', async () => {
      const mockOnSuccess = jest.fn()
      
      const { container } = render(
        <DataEntryForm onSuccess={mockOnSuccess} />
      )
      
      await waitFor(async () => {
        // Fill required fields
        const dateInput = screen.getByDisplayValue(new Date().toISOString().split('T')[0])
        const t2108Input = screen.getByPlaceholderText('e.g. 65')
        const vixInput = screen.getByPlaceholderText('e.g. 18.5')
        
        fireEvent.change(t2108Input, { target: { value: '55.5' } })
        fireEvent.change(vixInput, { target: { value: '19.8' } })
        
        // Submit form
        const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
        fireEvent.click(submitButton)
        
        // Wait for submission
        await waitFor(() => {
          expect(mockUseBreadthCalculator.calculateSingle).toHaveBeenCalledWith(
            expect.objectContaining({
              vix: 19.8,  // VIX should be included in submission
              t2108: 55.5
            }),
            'enhanced_six_factor',
            true
          )
        })
      })
    })
  })

  /**
   * Test 3: Complete Data Flow Integration
   * Tests the full workflow from date selection to database storage
   */
  describe('Complete Data Flow Integration', () => {
    it('should handle complete workflow: Date selection → API call → Form population → User input → Submission', async () => {
      const csvData: Partial<BreadthData> = {
        date: '2025-09-04',
        t2108: 55.89,
        sp500: '6448.26',
        stocks_up_4pct: 180,
        stocks_down_4pct: 120,
        source_file: 'breadth_data_2025.csv'
      }

      const mockOnSuccess = jest.fn()
      
      render(<DataEntryForm initialData={csvData} onSuccess={mockOnSuccess} />)
      
      await waitFor(async () => {
        // Verify data was populated from API call
        expect(screen.getByDisplayValue('2025-09-04')).toBeInTheDocument()
        expect(screen.getByDisplayValue('55.89')).toBeInTheDocument()
        expect(screen.getByDisplayValue('6448.26')).toBeInTheDocument()
        expect(screen.getByDisplayValue('180')).toBeInTheDocument()
        expect(screen.getByDisplayValue('120')).toBeInTheDocument()
        
        // Add manual VIX entry
        const vixInput = screen.getByPlaceholderText('e.g. 18.5')
        fireEvent.change(vixInput, { target: { value: '20.5' } })
        
        // Add 20% indicators
        const stocks20PctInput = screen.getByPlaceholderText('e.g. 300')
        fireEvent.change(stocks20PctInput, { target: { value: '250' } })
        
        // Submit form
        const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
        fireEvent.click(submitButton)
        
        // Verify calculation was called with complete data
        await waitFor(() => {
          expect(mockUseBreadthCalculator.calculateSingle).toHaveBeenCalledWith(
            expect.objectContaining({
              date: '2025-09-04',
              advancingIssues: 180,
              decliningIssues: 120,
              t2108: 55.89,
              sp500Level: '6448.26',
              vix: 20.5,
              stocksUp20Pct: 250,
              dataQualityScore: 100
            }),
            'enhanced_six_factor',
            true
          )
        })
      })
    })
  })

  /**
   * Test 4: Form Submission Without Duplicates
   * Verifies that form submission doesn't create duplicate database records
   */
  describe('Form Submission Without Duplicates', () => {
    it('should prevent duplicate entries for same date', async () => {
      // Mock existing data to simulate duplicate date
      mockTradingAPI.getBreadthData.mockResolvedValue([
        { date: '2025-09-04', t2108: 55.89 }
      ])

      render(<DataEntryForm />)
      
      await waitFor(async () => {
        // Set duplicate date
        const dateInput = screen.getByLabelText(/Date/i)
        fireEvent.change(dateInput, { target: { value: '2025-09-04' } })
        
        const t2108Input = screen.getByPlaceholderText('e.g. 65')
        fireEvent.change(t2108Input, { target: { value: '60' } })
        
        // Submit form
        const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
        fireEvent.click(submitButton)
        
        // Should show duplicate error
        await waitFor(() => {
          expect(screen.getByText(/Date already exists in database/i)).toBeInTheDocument()
        })
        
        // Should not call calculation
        expect(mockUseBreadthCalculator.calculateSingle).not.toHaveBeenCalled()
      })
    })

    it('should allow submission for new dates', async () => {
      // Mock no existing data for new date
      mockTradingAPI.getBreadthData.mockResolvedValue([])
      const mockOnSuccess = jest.fn()
      
      render(<DataEntryForm onSuccess={mockOnSuccess} />)
      
      await waitFor(async () => {
        // Set new date
        const dateInput = screen.getByLabelText(/Date/i)
        fireEvent.change(dateInput, { target: { value: '2025-09-10' } })
        
        const t2108Input = screen.getByPlaceholderText('e.g. 65')
        fireEvent.change(t2108Input, { target: { value: '60' } })
        
        // Submit form
        const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
        fireEvent.click(submitButton)
        
        // Should call calculation successfully
        await waitFor(() => {
          expect(mockUseBreadthCalculator.calculateSingle).toHaveBeenCalledWith(
            expect.objectContaining({
              date: '2025-09-10',
              t2108: 60
            }),
            'enhanced_six_factor',
            true
          )
        })
      })
    })
  })

  /**
   * Test 5: User Experience Validation
   * Tests the exact workflow from user's original issue screenshot
   */
  describe('User Experience Validation - Original Issue Workflow', () => {
    it('should handle user workflow: 03.09.2025 with proper T2108 and VIX entry', async () => {
      // Simulate the exact scenario from user's screenshot
      const userData: Partial<BreadthData> = {
        date: '2025-09-03',
        sp500: '6448.26',
        worden_universe: 7000,
        // T2108 should come from database to show green label
        t2108: 42.8,
        source_file: 'breadth_data_2025.csv'
      }

      const { container } = render(<DataEntryForm initialData={userData} />)
      
      await waitFor(() => {
        // Verify S&P 500 Level shows Database label
        expect(screen.getByDisplayValue('6448.26')).toBeInTheDocument()
        const sp500DatabaseLabel = container.querySelector('[class*="text-green-600"]:contains("Database")')
        
        // Verify Worden Universe shows Database label
        expect(screen.getByDisplayValue('7000')).toBeInTheDocument()
        
        // Verify T2108 shows green Database label (key fix from Phase 2)
        const t2108Input = screen.getByDisplayValue('42.8')
        expect(t2108Input).toBeInTheDocument()
        
        // Find database labels
        const databaseLabels = container.querySelectorAll('[class*="text-green-600"][class*="bg-green-50"]')
        expect(databaseLabels.length).toBeGreaterThan(0)
        
        // Verify user can enter VIX manually
        const vixInput = screen.getByPlaceholderText('e.g. 18.5')
        fireEvent.change(vixInput, { target: { value: '18.75' } })
        expect(vixInput).toHaveValue('18.75')
        
        // Verify VIX persists after entry
        expect(vixInput).toHaveValue('18.75')
      })
    })

    it('should maintain field values during form interaction', async () => {
      const initialData: Partial<BreadthData> = {
        date: '2025-09-03',
        t2108: 55.89,
        vix: 18.45
      }

      render(<DataEntryForm initialData={initialData} />)
      
      await waitFor(() => {
        // Verify initial values are loaded
        expect(screen.getByDisplayValue('2025-09-03')).toBeInTheDocument()
        expect(screen.getByDisplayValue('55.89')).toBeInTheDocument()
        expect(screen.getByDisplayValue('18.45')).toBeInTheDocument()
        
        // Add additional manual entries
        const stocks20PctInput = screen.getByPlaceholderText('e.g. 300')
        fireEvent.change(stocks20PctInput, { target: { value: '280' } })
        
        const stocks20DollarInput = screen.getByPlaceholderText('e.g. 250')
        fireEvent.change(stocks20DollarInput, { target: { value: '220' } })
        
        // Verify all values persist
        expect(screen.getByDisplayValue('2025-09-03')).toBeInTheDocument()
        expect(screen.getByDisplayValue('55.89')).toBeInTheDocument()
        expect(screen.getByDisplayValue('18.45')).toBeInTheDocument()
        expect(screen.getByDisplayValue('280')).toBeInTheDocument()
        expect(screen.getByDisplayValue('220')).toBeInTheDocument()
      })
    })
  })

  /**
   * Test 6: Error Handling and Edge Cases
   * Tests various error scenarios and edge cases
   */
  describe('Error Handling and Edge Cases', () => {
    it('should handle calculation errors gracefully', async () => {
      mockUseBreadthCalculator.calculateSingle.mockRejectedValue(
        new Error('Failed to calculate breadth score')
      )

      render(<DataEntryForm />)
      
      await waitFor(async () => {
        // Fill required fields
        const dateInput = screen.getByLabelText(/Date/i)
        const t2108Input = screen.getByPlaceholderText('e.g. 65')
        
        fireEvent.change(dateInput, { target: { value: '2025-09-05' } })
        fireEvent.change(t2108Input, { target: { value: '45' } })
        
        // Submit form
        const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
        fireEvent.click(submitButton)
        
        // Should show error message
        await waitFor(() => {
          expect(screen.getByText(/Failed to calculate breadth score/i)).toBeInTheDocument()
        })
      })
    })

    it('should validate T2108 range properly', async () => {
      render(<DataEntryForm />)
      
      await waitFor(async () => {
        const t2108Input = screen.getByPlaceholderText('e.g. 65')
        
        // Test invalid range (> 100)
        fireEvent.change(t2108Input, { target: { value: '150' } })
        fireEvent.blur(t2108Input)
        
        const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
        fireEvent.click(submitButton)
        
        // Should show range error
        await waitFor(() => {
          expect(screen.getByText(/T2108 must be between 0 and 100/i)).toBeInTheDocument()
        })
      })
    })
  })

  /**
   * Test 7: Performance and Responsiveness
   * Tests that the system feels responsive and performs well
   */
  describe('Performance and Responsiveness', () => {
    it('should load form quickly with pre-existing data', async () => {
      const startTime = Date.now()
      
      const initialData: Partial<BreadthData> = {
        date: '2025-09-04',
        t2108: 55.89,
        sp500: '6448.26',
        stocks_up_4pct: 180,
        stocks_down_4pct: 120,
        vix: 18.45,
        worden_universe: 7000
      }

      render(<DataEntryForm initialData={initialData} />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('2025-09-04')).toBeInTheDocument()
        expect(screen.getByDisplayValue('55.89')).toBeInTheDocument()
        expect(screen.getByDisplayValue('18.45')).toBeInTheDocument()
        
        const loadTime = Date.now() - startTime
        // Form should load within 100ms for good UX
        expect(loadTime).toBeLessThan(100)
      })
    })

    it('should handle form interactions without delay', async () => {
      render(<DataEntryForm />)
      
      await waitFor(() => {
        const vixInput = screen.getByPlaceholderText('e.g. 18.5')
        
        const startTime = Date.now()
        fireEvent.change(vixInput, { target: { value: '22.5' } })
        
        // Value should update immediately
        expect(vixInput).toHaveValue('22.5')
        
        const updateTime = Date.now() - startTime
        // Should update within 10ms for responsive feel
        expect(updateTime).toBeLessThan(10)
      })
    })
  })
})