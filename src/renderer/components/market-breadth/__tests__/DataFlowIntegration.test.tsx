/**
 * Market Breadth Data Flow Integration Tests
 * Tests the complete workflow: Market Breadth Form → Position Calculator → Exit Strategy
 * Validates data propagation, real-time updates, and workflow integrity
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataEntryForm } from '../DataEntryForm'
import type { BreadthData } from '../../../../types/trading'

// Mock holiday calendar with realistic calculations
vi.mock('../../../../utils/holidayCalendar', () => ({
  calculateExitDate: vi.fn((entryDate: Date, vix: number) => {
    const exitDate = new Date(entryDate)
    const businessDaysToAdd = vix < 15 ? 10 : vix < 25 ? 7 : vix < 35 ? 5 : 3
    // Add business days (simplified)
    let daysAdded = 0
    while (daysAdded < businessDaysToAdd) {
      exitDate.setDate(exitDate.getDate() + 1)
      const dayOfWeek = exitDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
        daysAdded++
      }
    }
    return exitDate
  }),
  calculateExitPrices: vi.fn((entryPrice: number, vix: number) => {
    const volatilityFactor = vix / 20 // Base volatility factor
    return {
      stopLoss: entryPrice * (1 - Math.min(0.03 + volatilityFactor * 0.02, 0.10)),
      profitTarget1: entryPrice * (1 + Math.min(0.05 + volatilityFactor * 0.03, 0.15)),
      profitTarget2: entryPrice * (1 + Math.min(0.10 + volatilityFactor * 0.05, 0.25)),
      vixMatrix: {
        vixRange: vix < 15 ? '< 15' : vix < 25 ? '15-25' : vix < 35 ? '25-35' : '> 35',
        multiplier: vix < 15 ? 0.8 : vix < 25 ? 1.0 : vix < 35 ? 1.2 : 1.4,
        stopLossPercent: -(3 + volatilityFactor * 2),
        profitTarget1Percent: 5 + volatilityFactor * 3,
        profitTarget2Percent: 10 + volatilityFactor * 5,
        maxHoldDays: vix < 15 ? 10 : vix < 25 ? 7 : vix < 35 ? 5 : 3
      }
    }
  }),
  getVixExitMatrix: vi.fn((vix: number) => {
    const volatilityFactor = vix / 20
    return {
      vixRange: vix < 15 ? '< 15' : vix < 25 ? '15-25' : vix < 35 ? '25-35' : '> 35',
      multiplier: vix < 15 ? 0.8 : vix < 25 ? 1.0 : vix < 35 ? 1.2 : 1.4,
      stopLossPercent: -(3 + volatilityFactor * 2),
      profitTarget1Percent: 5 + volatilityFactor * 3,
      profitTarget2Percent: 10 + volatilityFactor * 5,
      maxHoldDays: vix < 15 ? 10 : vix < 25 ? 7 : vix < 35 ? 5 : 3
    }
  }),
  isMarketHoliday: vi.fn(() => false),
  isTradingDay: vi.fn(() => true)
}))

// Mock breadth calculator
vi.mock('../../../../hooks/useBreadthCalculator', () => ({
  useBreadthCalculator: () => ({
    calculateSingle: vi.fn().mockImplementation(async (data) => {
      // Simulate realistic breadth calculation based on input data
      const up4pct = data.stocksUp4PctDaily || 0
      const down4pct = data.stocksDown4PctDaily || 0
      const t2108 = data.t2108 || 50
      
      const ratio = up4pct > 0 ? up4pct / (up4pct + down4pct) : 0.5
      const rawScore = (ratio * 50) + (t2108 * 0.5) + Math.random() * 10
      
      return {
        score: rawScore,
        normalizedScore: Math.min(Math.max(rawScore * 0.8, 0), 100),
        confidence: 0.85 + Math.random() * 0.10,
        market_condition: {
          phase: t2108 > 60 ? 'BULL' : t2108 < 30 ? 'BEAR' : 'NEUTRAL',
          trend_direction: up4pct > down4pct ? 'UP' : 'DOWN',
          strength: up4pct > 800 ? 'STRONG' : up4pct > 400 ? 'MODERATE' : 'WEAK'
        },
        metadata: {
          algorithm_used: 'enhanced_v2',
          data_quality: 95 + Math.random() * 5,
          calculation_time: Math.random() * 100
        }
      }
    }),
    validateData: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
    currentAlgorithm: 'enhanced_v2',
    latestResult: null,
    isLoading: false,
    error: null
  })
}))

describe('Market Breadth Data Flow Integration', () => {
  const mockOnSuccess = vi.fn()
  const mockOnPortfolioSizeChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Workflow Integration', () => {
    test('should propagate market breadth data to position calculator', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Fill in market breadth form
      const dateInput = screen.getByLabelText(/Date/i)
      const stocksUp4PctInput = screen.getByLabelText(/Stocks Up 4% Daily/i)
      const stocksDown4PctInput = screen.getByLabelText(/Stocks Down 4% Daily/i)
      const t2108Input = screen.getByLabelText(/T2108/i)
      const vixInput = screen.getByLabelText(/VIX Level/i)

      fireEvent.change(dateInput, { target: { value: '2025-01-15' } })
      fireEvent.change(stocksUp4PctInput, { target: { value: '800' } })
      fireEvent.change(stocksDown4PctInput, { target: { value: '200' } })
      fireEvent.change(t2108Input, { target: { value: '35' } })
      fireEvent.change(vixInput, { target: { value: '22.5' } })

      await waitFor(() => {
        // Data should be reflected in Position Calculator
        expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
        expect(screen.getByText('22.5')).toBeInTheDocument() // VIX value
        expect(screen.getByText(/elevated/i)).toBeInTheDocument() // VIX regime
        expect(screen.getByText(/strong/i)).toBeInTheDocument() // Breadth strength (up4pct > 500)
      })
    })

    test('should update position calculator in real-time when form values change', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const stocksUp4PctInput = screen.getByLabelText(/Stocks Up 4% Daily/i)
      const t2108Input = screen.getByLabelText(/T2108/i)
      const vixInput = screen.getByLabelText(/VIX Level/i)

      // Start with low values
      fireEvent.change(stocksUp4PctInput, { target: { value: '100' } })
      fireEvent.change(t2108Input, { target: { value: '75' } })
      fireEvent.change(vixInput, { target: { value: '12.0' } })

      await waitFor(() => {
        expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument() // Should avoid entry
        expect(screen.getByText(/ultra-low/i)).toBeInTheDocument() // VIX regime
      })

      // Change to Big Opportunity scenario
      fireEvent.change(stocksUp4PctInput, { target: { value: '1200' } })
      fireEvent.change(t2108Input, { target: { value: '15' } })
      fireEvent.change(vixInput, { target: { value: '25.0' } })

      await waitFor(() => {
        expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
        expect(screen.getByText(/high/i)).toBeInTheDocument() // VIX regime changed
        expect(screen.getByText(/2\.0x/)).toBeInTheDocument() // Breadth multiplier for big opportunity
      })
    })

    test('should display exit strategy when VIX is provided', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const stocksUp4PctInput = screen.getByLabelText(/Stocks Up 4% Daily/i)
      const t2108Input = screen.getByLabelText(/T2108/i)
      const vixInput = screen.getByLabelText(/VIX Level/i)

      fireEvent.change(stocksUp4PctInput, { target: { value: '600' } })
      fireEvent.change(t2108Input, { target: { value: '45' } })
      fireEvent.change(vixInput, { target: { value: '20.0' } })

      await waitFor(() => {
        expect(screen.getByText(/Exit Strategy/i)).toBeInTheDocument()
        expect(screen.getByText(/Holiday-Adjusted/i)).toBeInTheDocument()
        expect(screen.getByText(/Time Exit Date:/i)).toBeInTheDocument()
        expect(screen.getByText(/Stop Loss/i)).toBeInTheDocument()
        expect(screen.getByText(/Profit Target 1/i)).toBeInTheDocument()
        expect(screen.getByText(/Profit Target 2/i)).toBeInTheDocument()
      })
    })

    test('should hide exit strategy when VIX is removed', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)

      // First add VIX
      fireEvent.change(vixInput, { target: { value: '20.0' } })

      await waitFor(() => {
        expect(screen.getByText(/Exit Strategy/i)).toBeInTheDocument()
      })

      // Then remove VIX
      fireEvent.change(vixInput, { target: { value: '' } })

      await waitFor(() => {
        expect(screen.queryByText(/Exit Strategy/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Calculation Preview Workflow', () => {
    test('should show calculation preview with market breadth data', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Fill form with good data
      const dateInput = screen.getByLabelText(/Date/i)
      const stocksUp4PctInput = screen.getByLabelText(/Stocks Up 4% Daily/i)
      const stocksDown4PctInput = screen.getByLabelText(/Stocks Down 4% Daily/i)
      const t2108Input = screen.getByLabelText(/T2108/i)

      fireEvent.change(dateInput, { target: { value: '2025-01-15' } })
      fireEvent.change(stocksUp4PctInput, { target: { value: '650' } })
      fireEvent.change(stocksDown4PctInput, { target: { value: '250' } })
      fireEvent.change(t2108Input, { target: { value: '42' } })

      // Trigger preview calculation
      const previewButton = screen.getByRole('button', { name: /Preview Calculation/i })
      fireEvent.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText(/Calculation Preview/i)).toBeInTheDocument()
        expect(screen.getByText(/Raw Score/i)).toBeInTheDocument()
        expect(screen.getByText(/Normalized Score/i)).toBeInTheDocument()
        expect(screen.getByText(/Confidence/i)).toBeInTheDocument()
        expect(screen.getByText(/Market Phase/i)).toBeInTheDocument()
      })
    })

    test('should preserve position calculator state during preview', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      const stocksUp4PctInput = screen.getByLabelText(/Stocks Up 4% Daily/i)
      const t2108Input = screen.getByLabelText(/T2108/i)

      fireEvent.change(vixInput, { target: { value: '25.0' } })
      fireEvent.change(stocksUp4PctInput, { target: { value: '800' } })
      fireEvent.change(t2108Input, { target: { value: '40' } })

      // Verify position calculator shows correct values
      await waitFor(() => {
        expect(screen.getByText('25.0')).toBeInTheDocument()
        expect(screen.getByText(/high/i)).toBeInTheDocument()
      })

      // Trigger preview
      const previewButton = screen.getByRole('button', { name: /Preview Calculation/i })
      fireEvent.click(previewButton)

      await waitFor(() => {
        // Position calculator should still show the same values
        expect(screen.getByText('25.0')).toBeInTheDocument()
        expect(screen.getByText(/high/i)).toBeInTheDocument()
        expect(screen.getByText(/Exit Strategy/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission Workflow', () => {
    test('should maintain position calculator display after successful submission', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Fill complete form
      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '700' } })
      fireEvent.change(screen.getByLabelText(/Stocks Down 4% Daily/i), { target: { value: '180' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '38' } })
      fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: '19.5' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/Success!/i)).toBeInTheDocument()
        // Position calculator should still be visible
        expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
        expect(screen.getByText('19.5')).toBeInTheDocument()
      })
    })
  })

  describe('Data Consistency Validation', () => {
    test('should maintain data consistency across components', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const testScenarios = [
        {
          name: 'Conservative Market',
          up4pct: '300',
          down4pct: '400',
          t2108: '65',
          vix: '15.5',
          expectedBreadthStrength: 'weak',
          expectedVixRegime: 'normal'
        },
        {
          name: 'Strong Market',
          up4pct: '900',
          down4pct: '150',
          t2108: '35',
          vix: '12.8',
          expectedBreadthStrength: 'moderate',
          expectedVixRegime: 'low'
        },
        {
          name: 'Volatile Market',
          up4pct: '1200',
          down4pct: '100',
          t2108: '18',
          vix: '35.0',
          expectedBreadthStrength: 'strong',
          expectedVixRegime: 'extreme'
        }
      ]

      for (const scenario of testScenarios) {
        // Set values
        fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: scenario.up4pct } })
        fireEvent.change(screen.getByLabelText(/Stocks Down 4% Daily/i), { target: { value: scenario.down4pct } })
        fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: scenario.t2108 } })
        fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: scenario.vix } })

        await waitFor(() => {
          // Verify breadth strength
          expect(screen.getByText(new RegExp(scenario.expectedBreadthStrength, 'i'))).toBeInTheDocument()
          
          // Verify VIX regime
          expect(screen.getByText(new RegExp(scenario.expectedVixRegime, 'i'))).toBeInTheDocument()
          
          // Verify VIX value display
          expect(screen.getByText(scenario.vix)).toBeInTheDocument()
        })
      }
    })

    test('should handle partial data entry correctly', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Only fill some fields
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '500' } })
      fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: '20.0' } })

      await waitFor(() => {
        // Position calculator should handle undefined t2108
        expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
        expect(screen.getByText('20.0')).toBeInTheDocument()
        // Should not crash with undefined values
        expect(screen.getByText(/Not triggered/i)).toBeInTheDocument() // Big Opportunity
      })
    })
  })

  describe('Real-time Updates and Responsiveness', () => {
    test('should handle rapid value changes without lag', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      const rapidVixValues = ['10.0', '15.0', '20.0', '25.0', '30.0', '35.0', '40.0']

      // Rapidly change values
      for (const vix of rapidVixValues) {
        fireEvent.change(vixInput, { target: { value: vix } })
      }

      await waitFor(() => {
        // Should show the final value
        expect(vixInput.value).toBe('40.0')
        expect(screen.getByText(/extreme/i)).toBeInTheDocument()
      })
    })

    test('should debounce calculations appropriately', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const stocksUp4PctInput = screen.getByLabelText(/Stocks Up 4% Daily/i)
      
      // Rapidly change values
      fireEvent.change(stocksUp4PctInput, { target: { value: '100' } })
      fireEvent.change(stocksUp4PctInput, { target: { value: '200' } })
      fireEvent.change(stocksUp4PctInput, { target: { value: '300' } })
      fireEvent.change(stocksUp4PctInput, { target: { value: '400' } })
      fireEvent.change(stocksUp4PctInput, { target: { value: '500' } })

      await waitFor(() => {
        // Should show final calculated state
        expect(stocksUp4PctInput.value).toBe('500')
        expect(screen.getByText(/moderate/i)).toBeInTheDocument() // Breadth strength
      })
    })
  })

  describe('Portfolio Size Integration', () => {
    test('should propagate portfolio size changes to position calculations', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Set up scenario
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '600' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '45' } })
      fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: '18.0' } })

      // Open portfolio settings
      const settingsButton = screen.getByRole('button', { name: '' })
      fireEvent.click(settingsButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/Portfolio Size/i)).toBeInTheDocument()
      })

      // Change portfolio size
      const portfolioInput = screen.getByDisplayValue('100000')
      fireEvent.change(portfolioInput, { target: { value: '250000' } })
      
      const updateButton = screen.getByRole('button', { name: /Update/i })
      fireEvent.click(updateButton)

      await waitFor(() => {
        // Should show updated portfolio size
        expect(screen.getByText('$250,000')).toBeInTheDocument()
        expect(screen.getByText('$25,000')).toBeInTheDocument() // New base position (10%)
      })
    })
  })

  describe('Error State Propagation', () => {
    test('should handle form validation errors without affecting position calculator', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      // Enter invalid T2108 value
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '150' } }) // > 100
      fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: '20.0' } })

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /Calculate & Save/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Should show validation error
        expect(screen.getByText(/T2108 must be between 0 and 100/i)).toBeInTheDocument()
        
        // Position calculator should still work
        expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
        expect(screen.getByText('20.0')).toBeInTheDocument()
      })
    })
  })
})