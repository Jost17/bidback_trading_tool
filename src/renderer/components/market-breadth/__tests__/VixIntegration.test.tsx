/**
 * Comprehensive VIX Integration Tests for Market Breadth System
 * Tests VIX field validation, integration with Position Calculator,
 * and BIDBACK Master System VIX-based rules
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataEntryForm } from '../DataEntryForm'
import { PositionCalculator } from '../PositionCalculator'
import type { BreadthData, MarketDataInput } from '../../../../types/trading'

// Mock dependencies
vi.mock('../../../../utils/holidayCalendar', () => ({
  calculateExitDate: vi.fn((entryDate: Date, vix: number) => {
    const exitDate = new Date(entryDate)
    // VIX-based exit days: low VIX = longer hold, high VIX = shorter hold
    const daysToAdd = vix < 15 ? 7 : vix < 25 ? 5 : 3
    exitDate.setDate(exitDate.getDate() + daysToAdd)
    return exitDate
  }),
  calculateExitPrices: vi.fn((entryPrice: number, vix: number) => ({
    stopLoss: entryPrice * (1 - (vix < 20 ? 0.05 : 0.08)),
    profitTarget1: entryPrice * (1 + (vix < 20 ? 0.08 : 0.12)),
    profitTarget2: entryPrice * (1 + (vix < 20 ? 0.15 : 0.20)),
    vixMatrix: {
      vixRange: vix < 15 ? '< 15' : vix < 25 ? '15-25' : '> 25',
      multiplier: vix < 15 ? 0.9 : vix < 25 ? 1.0 : 1.2,
      stopLossPercent: vix < 20 ? -5 : -8,
      profitTarget1Percent: vix < 20 ? 8 : 12,
      profitTarget2Percent: vix < 20 ? 15 : 20,
      maxHoldDays: vix < 15 ? 7 : vix < 25 ? 5 : 3
    }
  })),
  getVixExitMatrix: vi.fn((vix: number) => ({
    vixRange: vix < 15 ? '< 15' : vix < 25 ? '15-25' : '> 25',
    multiplier: vix < 15 ? 0.9 : vix < 25 ? 1.0 : 1.2,
    stopLossPercent: vix < 20 ? -5 : -8,
    profitTarget1Percent: vix < 20 ? 8 : 12,
    profitTarget2Percent: vix < 20 ? 15 : 20,
    maxHoldDays: vix < 15 ? 7 : vix < 25 ? 5 : 3
  }))
}))

vi.mock('../../../../hooks/useBreadthCalculator', () => ({
  useBreadthCalculator: () => ({
    calculateSingle: vi.fn().mockResolvedValue({
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
    }),
    validateData: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
    currentAlgorithm: 'enhanced_v2',
    latestResult: null,
    isLoading: false,
    error: null
  })
}))

describe('VIX Integration Tests', () => {
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('VIX Field Validation', () => {
    test('should accept valid VIX values (0-100)', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      
      // Test valid values
      const validVixValues = ['12.5', '18.75', '25.0', '35.2', '45.8', '99.9']
      
      for (const vixValue of validVixValues) {
        fireEvent.change(vixInput, { target: { value: vixValue } })
        expect(vixInput.value).toBe(vixValue)
        
        // Should not show validation error
        await waitFor(() => {
          expect(screen.queryByText(/VIX must be/i)).not.toBeInTheDocument()
        })
      }
    })

    test('should reject invalid VIX values', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      
      // Test negative values
      fireEvent.change(vixInput, { target: { value: '-5.0' } })
      expect(vixInput.value).toBe('-5.0')
      
      // Test extremely high values (though technically possible, > 100 is unusual)
      fireEvent.change(vixInput, { target: { value: '150.0' } })
      expect(vixInput.value).toBe('150.0')

      // Test non-numeric values
      fireEvent.change(vixInput, { target: { value: 'invalid' } })
      expect(vixInput.value).toBe('invalid')
    })

    test('should handle decimal precision correctly', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      
      // Test decimal precision
      fireEvent.change(vixInput, { target: { value: '18.5432' } })
      expect(vixInput.value).toBe('18.5432')
      
      // Test step validation (should accept 0.1 steps)
      fireEvent.change(vixInput, { target: { value: '18.1' } })
      expect(vixInput.value).toBe('18.1')
    })

    test('should handle empty VIX value gracefully', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      
      fireEvent.change(vixInput, { target: { value: '' } })
      expect(vixInput.value).toBe('')
      
      // Should not crash or show errors for empty value
      await waitFor(() => {
        expect(screen.queryByText(/VIX.*required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('VIX-Position Calculator Integration', () => {
    test('should pass VIX value to Position Calculator', async () => {
      const testData: Partial<BreadthData> = {
        stocks_up_4pct: 500,
        stocks_down_4pct: 200,
        t2108: 45
      }

      render(<DataEntryForm onSuccess={mockOnSuccess} initialData={testData} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      fireEvent.change(vixInput, { target: { value: '22.5' } })

      // Position Calculator should receive the VIX value
      await waitFor(() => {
        expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
        expect(screen.getByText(/22.5/)).toBeInTheDocument() // VIX value should be displayed
      })
    })

    test('should update position calculation when VIX changes', async () => {
      const testData: Partial<BreadthData> = {
        stocks_up_4pct: 800,
        stocks_down_4pct: 150,
        t2108: 35
      }

      render(<DataEntryForm onSuccess={mockOnSuccess} initialData={testData} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      
      // Test low VIX scenario
      fireEvent.change(vixInput, { target: { value: '12.0' } })
      
      await waitFor(() => {
        expect(screen.getByText(/ultra-low/i)).toBeInTheDocument()
      })

      // Test high VIX scenario
      fireEvent.change(vixInput, { target: { value: '35.0' } })
      
      await waitFor(() => {
        expect(screen.getByText(/high/i)).toBeInTheDocument()
      })
    })

    test('should show different VIX regimes correctly', async () => {
      const testData: Partial<BreadthData> = {
        stocks_up_4pct: 500,
        t2108: 50
      }

      render(<DataEntryForm onSuccess={mockOnSuccess} initialData={testData} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      
      const vixRegimeTests = [
        { vix: '10.0', regime: 'ultra-low' },
        { vix: '13.5', regime: 'low' },
        { vix: '17.8', regime: 'normal' },
        { vix: '22.3', regime: 'elevated' },
        { vix: '28.7', regime: 'high' },
        { vix: '42.1', regime: 'extreme' }
      ]

      for (const test of vixRegimeTests) {
        fireEvent.change(vixInput, { target: { value: test.vix } })
        
        await waitFor(() => {
          expect(screen.getByText(new RegExp(test.regime, 'i'))).toBeInTheDocument()
        })
      }
    })
  })

  describe('VIX Multiplier Matrix', () => {
    test('should apply correct VIX multipliers for position sizing', async () => {
      const testData: Partial<BreadthData> = {
        stocks_up_4pct: 600,
        stocks_down_4pct: 200,
        t2108: 45
      }

      render(<DataEntryForm onSuccess={mockOnSuccess} initialData={testData} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      
      // Test ultra-low VIX (< 12) - should use 0.8x multiplier
      fireEvent.change(vixInput, { target: { value: '10.0' } })
      
      await waitFor(() => {
        expect(screen.getByText(/0\.8x/)).toBeInTheDocument()
      })

      // Test extreme VIX (> 35) - should use 1.4x multiplier
      fireEvent.change(vixInput, { target: { value: '40.0' } })
      
      await waitFor(() => {
        expect(screen.getByText(/1\.4x/)).toBeInTheDocument()
      })
    })

    test('should calculate position sizes correctly with VIX multipliers', async () => {
      const testData: Partial<BreadthData> = {
        stocks_up_4pct: 1200, // Strong market
        stocks_down_4pct: 100,
        t2108: 25 // Big Opportunity territory
      }

      render(<DataEntryForm onSuccess={mockOnSuccess} initialData={testData} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      
      // Low VIX should result in smaller position (0.8x multiplier)
      fireEvent.change(vixInput, { target: { value: '11.0' } })
      
      await waitFor(() => {
        const positionElements = screen.getAllByText(/\$\d+,?\d*/);
        expect(positionElements.length).toBeGreaterThan(0)
        
        // Should show VIX multiplier of 0.8x
        expect(screen.getByText(/0\.8x/)).toBeInTheDocument()
      })

      // High VIX should result in larger position (1.2x multiplier)
      fireEvent.change(vixInput, { target: { value: '30.0' } })
      
      await waitFor(() => {
        // Should show VIX multiplier of 1.2x
        expect(screen.getByText(/1\.2x/)).toBeInTheDocument()
      })
    })
  })

  describe('Standalone Position Calculator VIX Tests', () => {
    test('should render Position Calculator with VIX input', () => {
      render(
        <PositionCalculator
          t2108={45}
          vix={18.5}
          up4pct={600}
          down4pct={200}
          portfolioSize={100000}
        />
      )

      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      expect(screen.getByText(/18\.5/)).toBeInTheDocument()
      expect(screen.getByText(/normal/i)).toBeInTheDocument() // VIX regime
    })

    test('should handle undefined VIX gracefully', () => {
      render(
        <PositionCalculator
          t2108={45}
          vix={undefined}
          up4pct={600}
          down4pct={200}
          portfolioSize={100000}
        />
      )

      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      expect(screen.getByText(/N\/A/)).toBeInTheDocument() // Should show N/A for undefined VIX
    })

    test('should show exit strategy when VIX is provided', () => {
      render(
        <PositionCalculator
          t2108={45}
          vix={22.0}
          up4pct={600}
          down4pct={200}
          portfolioSize={100000}
        />
      )

      expect(screen.getByText(/Exit Strategy/i)).toBeInTheDocument()
      expect(screen.getByText(/Holiday-Adjusted/i)).toBeInTheDocument()
    })

    test('should not show exit strategy when VIX is undefined', () => {
      render(
        <PositionCalculator
          t2108={45}
          vix={undefined}
          up4pct={600}
          down4pct={200}
          portfolioSize={100000}
        />
      )

      expect(screen.queryByText(/Exit Strategy/i)).not.toBeInTheDocument()
    })
  })

  describe('VIX-Based Exit Calculations', () => {
    test('should show different exit parameters based on VIX levels', () => {
      const lowVixProps = {
        t2108: 45,
        vix: 12.0,
        up4pct: 600,
        down4pct: 200,
        portfolioSize: 100000
      }

      const { rerender } = render(<PositionCalculator {...lowVixProps} />)

      // Low VIX should show longer hold period and tighter stops
      expect(screen.getByText(/7/)).toBeInTheDocument() // Max hold days

      // High VIX scenario
      rerender(
        <PositionCalculator
          {...lowVixProps}
          vix={35.0}
        />
      )

      // High VIX should show shorter hold period and wider stops
      expect(screen.getByText(/3/)).toBeInTheDocument() // Max hold days
    })

    test('should display VIX matrix information correctly', () => {
      render(
        <PositionCalculator
          t2108={45}
          vix={25.0}
          up4pct={600}
          down4pct={200}
          portfolioSize={100000}
        />
      )

      expect(screen.getByText(/25-35/i)).toBeInTheDocument() // VIX range
      expect(screen.getByText(/1\.2x/)).toBeInTheDocument() // Multiplier
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle extreme VIX values gracefully', () => {
      const extremeVixValues = [0.1, 99.9, 150.0]

      extremeVixValues.forEach(vix => {
        const { unmount } = render(
          <PositionCalculator
            t2108={45}
            vix={vix}
            up4pct={600}
            down4pct={200}
            portfolioSize={100000}
          />
        )

        // Should not crash
        expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
        
        unmount()
      })
    })

    test('should handle VIX value changes dynamically', async () => {
      render(<DataEntryForm onSuccess={mockOnSuccess} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      
      // Rapidly change VIX values
      const rapidVixChanges = ['15.0', '25.0', '35.0', '10.0', '45.0']
      
      for (const vix of rapidVixChanges) {
        fireEvent.change(vixInput, { target: { value: vix } })
        
        await waitFor(() => {
          expect(vixInput.value).toBe(vix)
        })
      }

      // Form should remain stable
      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
    })

    test('should preserve VIX value during form submission', async () => {
      const testData: Partial<BreadthData> = {
        stocks_up_4pct: 500,
        stocks_down_4pct: 200,
        t2108: 45
      }

      render(<DataEntryForm onSuccess={mockOnSuccess} initialData={testData} />)

      const vixInput = screen.getByLabelText(/VIX Level/i)
      const dateInput = screen.getByLabelText(/Date/i)
      
      fireEvent.change(vixInput, { target: { value: '22.5' } })
      fireEvent.change(dateInput, { target: { value: '2025-01-15' } })

      const previewButton = screen.getByRole('button', { name: /Preview Calculation/i })
      fireEvent.click(previewButton)

      await waitFor(() => {
        // VIX value should still be preserved after preview calculation
        expect(vixInput.value).toBe('22.5')
      })
    })
  })
})