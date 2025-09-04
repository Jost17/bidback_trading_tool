/**
 * Signal Detection Integration Tests
 * Tests Big Opportunity Detection, Avoid Entry Signals, and Market Signal Integration
 * Validates the complete BIDBACK Master System signal detection workflow
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PositionCalculator } from '../PositionCalculator'
import { DataEntryForm } from '../DataEntryForm'
import type { MarketSignals } from '../../../../types/trading'

// Mock dependencies with signal-specific logic
vi.mock('../../../../utils/holidayCalendar', () => ({
  calculateExitDate: vi.fn((entryDate: Date, vix: number) => {
    const exitDate = new Date(entryDate)
    exitDate.setDate(exitDate.getDate() + (vix < 20 ? 7 : vix < 30 ? 5 : 3))
    return exitDate
  }),
  calculateExitPrices: vi.fn(),
  getVixExitMatrix: vi.fn()
}))

vi.mock('../../../../hooks/useBreadthCalculator', () => ({
  useBreadthCalculator: () => ({
    calculateSingle: vi.fn().mockResolvedValue({
      score: 75,
      normalizedScore: 72,
      confidence: 0.90,
      market_condition: { phase: 'BULL', strength: 'STRONG' },
      metadata: { algorithm_used: 'enhanced_v2' }
    }),
    validateData: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
    currentAlgorithm: 'enhanced_v2',
    latestResult: null,
    isLoading: false,
    error: null
  })
}))

describe('Signal Detection Integration Tests', () => {
  const defaultProps = {
    portfolioSize: 100000,
    onPortfolioSizeChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Big Opportunity Signal Detection', () => {
    test('should detect Big Opportunity with exact threshold values', () => {
      // Test exact boundary conditions
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={19.9}  // Just under 20
          up4pct={1001} // Just over 1000
          down4pct={200}
          vix={20.0}
        />
      )

      expect(screen.getByText(/✅ T2108 < 20 \+ Up4% > 1000/i)).toBeInTheDocument()
      expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
      expect(screen.getByText(/2\.0x/)).toBeInTheDocument() // Should show 2.0x multiplier
    })

    test('should not detect Big Opportunity at threshold boundaries', () => {
      const boundaryTestCases = [
        { t2108: 20.0, up4pct: 1001, description: 'T2108 at boundary (20.0)' },
        { t2108: 19.9, up4pct: 1000, description: 'Up4% at boundary (1000)' },
        { t2108: 20.0, up4pct: 1000, description: 'Both at boundaries' }
      ]

      boundaryTestCases.forEach(testCase => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={testCase.t2108}
            up4pct={testCase.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(/Not triggered/i)).toBeInTheDocument()
        expect(screen.queryByText(/Big Opportunity detected!/i)).not.toBeInTheDocument()

        unmount()
      })
    })

    test('should detect Big Opportunity with strong signals', () => {
      const strongBigOpportunityScenarios = [
        { t2108: 15, up4pct: 1200, description: 'Strong signal' },
        { t2108: 10, up4pct: 1500, description: 'Very strong signal' },
        { t2108: 5, up4pct: 2000, description: 'Extreme signal' }
      ]

      strongBigOpportunityScenarios.forEach(scenario => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={scenario.t2108}
            up4pct={scenario.up4pct}
            down4pct={100}
            vix={18.0}
          />
        )

        // Should show Big Opportunity
        expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
        expect(screen.getByText(/2\.0x/)).toBeInTheDocument()
        
        // Should also show strong breadth
        expect(screen.getByText(/strong/i)).toBeInTheDocument()

        unmount()
      })
    })

    test('should handle Big Opportunity with different VIX levels', () => {
      const vixLevels = [10.0, 15.0, 20.0, 25.0, 30.0, 40.0]

      vixLevels.forEach(vix => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={15}    // Big Opportunity T2108
            up4pct={1200} // Big Opportunity Up4%
            down4pct={100}
            vix={vix}
          />
        )

        // Should maintain Big Opportunity regardless of VIX
        expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
        expect(screen.getByText(/2\.0x/)).toBeInTheDocument() // Breadth multiplier

        // VIX multiplier should still apply
        const expectedVixMultiplier = vix < 12 ? '0.8' : vix < 15 ? '0.9' : 
                                     vix < 20 ? '1.0' : vix < 25 ? '1.1' : 
                                     vix < 35 ? '1.2' : '1.4'
        expect(screen.getByText(`${expectedVixMultiplier}x`)).toBeInTheDocument()

        unmount()
      })
    })
  })

  describe('Avoid Entry Signal Detection', () => {
    test('should detect Avoid Entry with Up4% threshold', () => {
      const avoidEntryUp4Cases = [
        { up4pct: 149, t2108: 30, description: 'Just below 150' },
        { up4pct: 100, t2108: 40, description: 'At lower threshold' },
        { up4pct: 50, t2108: 50, description: 'Well below threshold' }
      ]

      avoidEntryUp4Cases.forEach(testCase => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={testCase.t2108}
            up4pct={testCase.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument()
        expect(screen.getByText(/Entry not recommended/i)).toBeInTheDocument()

        unmount()
      })
    })

    test('should detect Avoid Entry with T2108 threshold', () => {
      const avoidEntryT2108Cases = [
        { t2108: 71, up4pct: 500, description: 'Just above 70' },
        { t2108: 80, up4pct: 600, description: 'High T2108' },
        { t2108: 95, up4pct: 800, description: 'Very high T2108' }
      ]

      avoidEntryT2108Cases.forEach(testCase => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={testCase.t2108}
            up4pct={testCase.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument()
        expect(screen.getByText(/Entry not recommended/i)).toBeInTheDocument()

        unmount()
      })
    })

    test('should detect Avoid Entry with both conditions', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={80}  // Above 70 (avoid entry)
          up4pct={120} // Below 150 (avoid entry)
          down4pct={300}
          vix={25.0}
        />
      )

      expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument()
      expect(screen.getByText(/Entry not recommended/i)).toBeInTheDocument()
    })

    test('should not trigger Avoid Entry at favorable boundaries', () => {
      const favorableBoundaryTests = [
        { t2108: 70, up4pct: 150, description: 'Both at favorable boundaries' },
        { t2108: 69, up4pct: 151, description: 'Both just inside favorable range' },
        { t2108: 50, up4pct: 200, description: 'Both well within favorable range' }
      ]

      favorableBoundaryTests.forEach(testCase => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={testCase.t2108}
            up4pct={testCase.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(/✅ Entry OK/i)).toBeInTheDocument()
        expect(screen.queryByText(/Entry not recommended/i)).not.toBeInTheDocument()

        unmount()
      })
    })
  })

  describe('Signal Priority and Conflicts', () => {
    test('should handle conflicting signals (Big Opportunity vs Avoid Entry)', () => {
      // This is a theoretical edge case: T2108 < 20 but Up4% < 150
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={15}  // Would trigger Big Opportunity condition
          up4pct={120} // But Up4% < 150 triggers Avoid Entry
          down4pct={200}
          vix={20.0}
        />
      )

      // Avoid Entry should take precedence (safety first)
      expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument()
      expect(screen.queryByText(/Big Opportunity detected!/i)).not.toBeInTheDocument()
    })

    test('should handle edge case where both Big Opportunity criteria met but other avoid conditions exist', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={15}   // Big Opportunity: T2108 < 20 ✓
          up4pct={1200} // Big Opportunity: Up4% > 1000 ✓
          down4pct={200}
          vix={20.0}
        />
      )

      // Big Opportunity should be detected (both criteria met and no avoid conditions)
      expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
      expect(screen.getByText(/✅ T2108 < 20 \+ Up4% > 1000/i)).toBeInTheDocument()
    })
  })

  describe('Signal-Based Position Sizing', () => {
    test('should apply 2.0x multiplier for Big Opportunity', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          portfolioSize={100000}
          t2108={18}
          up4pct={1100}
          down4pct={150}
          vix={20.0} // 1.0x VIX multiplier
        />
      )

      expect(screen.getByText(/2\.0x/)).toBeInTheDocument() // Breadth multiplier
      expect(screen.getByText(/1\.0x/)).toBeInTheDocument() // VIX multiplier
      
      // Final position: $10k base * 2.0 * 1.0 = $20k
      expect(screen.getByText('$20,000')).toBeInTheDocument()
    })

    test('should apply 0.0x multiplier for NO ENTRY conditions', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          portfolioSize={100000}
          t2108={50}
          up4pct={80} // Below 100 = NO ENTRY
          down4pct={200}
          vix={15.0}
        />
      )

      expect(screen.getByText(/0\.0x/)).toBeInTheDocument() // Breadth multiplier
      expect(screen.getByText('$0')).toBeInTheDocument() // Final position
    })

    test('should combine signal-based sizing with VIX multipliers', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          portfolioSize={100000}
          t2108={15}    // Big Opportunity
          up4pct={1300} // Big Opportunity  
          down4pct={100}
          vix={12.0}    // Ultra-low VIX (0.8x)
        />
      )

      expect(screen.getByText(/2\.0x/)).toBeInTheDocument() // Big Opportunity multiplier
      expect(screen.getByText(/0\.8x/)).toBeInTheDocument() // Ultra-low VIX multiplier
      
      // Final position: $10k * 2.0 * 0.8 = $16k
      expect(screen.getByText('$16,000')).toBeInTheDocument()
    })
  })

  describe('Real-time Signal Updates', () => {
    test('should update signals dynamically as form values change', async () => {
      render(<DataEntryForm onSuccess={vi.fn()} />)

      const stocksUp4PctInput = screen.getByLabelText(/Stocks Up 4% Daily/i)
      const t2108Input = screen.getByLabelText(/T2108/i)
      const vixInput = screen.getByLabelText(/VIX Level/i)

      // Start with normal conditions
      fireEvent.change(stocksUp4PctInput, { target: { value: '400' } })
      fireEvent.change(t2108Input, { target: { value: '50' } })
      fireEvent.change(vixInput, { target: { value: '18.0' } })

      await waitFor(() => {
        expect(screen.getByText(/✅ Entry OK/i)).toBeInTheDocument()
      })

      // Change to Big Opportunity
      fireEvent.change(stocksUp4PctInput, { target: { value: '1200' } })
      fireEvent.change(t2108Input, { target: { value: '15' } })

      await waitFor(() => {
        expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
        expect(screen.getByText(/2\.0x/)).toBeInTheDocument()
      })

      // Change to Avoid Entry
      fireEvent.change(stocksUp4PctInput, { target: { value: '100' } })
      fireEvent.change(t2108Input, { target: { value: '80' } })

      await waitFor(() => {
        expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument()
        expect(screen.queryByText(/Big Opportunity detected!/i)).not.toBeInTheDocument()
      })
    })

    test('should handle rapid signal changes without lag', async () => {
      render(<DataEntryForm onSuccess={vi.fn()} />)

      const stocksUp4PctInput = screen.getByLabelText(/Stocks Up 4% Daily/i)
      const t2108Input = screen.getByLabelText(/T2108/i)

      // Rapidly cycle through different signal states
      const rapidSignalChanges = [
        { up4pct: '1200', t2108: '15' }, // Big Opportunity
        { up4pct: '100', t2108: '80' },  // Avoid Entry
        { up4pct: '500', t2108: '45' },  // Normal
        { up4pct: '1500', t2108: '10' }, // Strong Big Opportunity
        { up4pct: '50', t2108: '90' }    // Strong Avoid Entry
      ]

      for (const change of rapidSignalChanges) {
        fireEvent.change(stocksUp4PctInput, { target: { value: change.up4pct } })
        fireEvent.change(t2108Input, { target: { value: change.t2108 } })
      }

      // Should settle on the final state
      await waitFor(() => {
        expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument()
      })
    })
  })

  describe('Signal Persistence and State Management', () => {
    test('should maintain signal state during form preview', async () => {
      render(<DataEntryForm onSuccess={vi.fn()} />)

      // Set up Big Opportunity scenario
      fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: '2025-01-15' } })
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '1200' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '15' } })
      fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: '20.0' } })

      await waitFor(() => {
        expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
      })

      // Trigger preview calculation
      const previewButton = screen.getByRole('button', { name: /Preview Calculation/i })
      fireEvent.click(previewButton)

      await waitFor(() => {
        // Signal should remain visible
        expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
        expect(screen.getByText(/Calculation Preview/i)).toBeInTheDocument()
      })
    })

    test('should preserve signal state during portfolio size changes', async () => {
      render(<DataEntryForm onSuccess={vi.fn()} />)

      // Set up signal scenario
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '800' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '35' } })
      fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: '25.0' } })

      await waitFor(() => {
        expect(screen.getByText(/1\.5x/)).toBeInTheDocument() // Should show 1.5x multiplier
      })

      // Change portfolio size
      const settingsButton = screen.getByRole('button', { name: '' })
      fireEvent.click(settingsButton)

      await waitFor(() => {
        const portfolioInput = screen.getByDisplayValue('100000')
        fireEvent.change(portfolioInput, { target: { value: '200000' } })
        
        const updateButton = screen.getByRole('button', { name: /Update/i })
        fireEvent.click(updateButton)
      })

      await waitFor(() => {
        // Signal multiplier should remain the same
        expect(screen.getByText(/1\.5x/)).toBeInTheDocument()
        // But position size should double
        expect(screen.getByText('$200,000')).toBeInTheDocument()
      })
    })
  })

  describe('Signal Validation and Error Handling', () => {
    test('should handle undefined/null values gracefully', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={undefined}
          up4pct={undefined}
          down4pct={undefined}
          vix={20.0}
        />
      )

      // Should not crash and should show default states
      expect(screen.getByText(/Not triggered/i)).toBeInTheDocument() // Big Opportunity
      expect(screen.getByText(/✅ Entry OK/i)).toBeInTheDocument() // No avoid entry conditions met
    })

    test('should handle extreme values in signal calculations', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={999}    // Unrealistic high value
          up4pct={50000} // Unrealistic high value
          down4pct={0}
          vix={200.0}    // Unrealistic high VIX
        />
      )

      // Should not crash and should handle gracefully
      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      // Extreme T2108 should trigger avoid entry
      expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument()
    })

    test('should handle negative values in signal detection', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={-10}  // Negative T2108
          up4pct={-500} // Negative Up4%
          down4pct={200}
          vix={20.0}
        />
      )

      // Should handle gracefully without crashing
      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
    })
  })

  describe('Signal Documentation and User Feedback', () => {
    test('should show clear signal explanations', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={15}
          up4pct={1200}
          down4pct={150}
          vix={20.0}
        />
      )

      // Should show explanatory text
      expect(screen.getByText(/✅ T2108 < 20 \+ Up4% > 1000/i)).toBeInTheDocument()
      expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
      expect(screen.getByText(/Consider maximum position size/i)).toBeInTheDocument()
    })

    test('should provide quick reference for signal thresholds', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={50}
          up4pct={500}
          vix={20.0}
        />
      )

      // Should show reference information
      expect(screen.getByText(/Entry Rules:/i)).toBeInTheDocument()
      expect(screen.getByText(/Big Opportunity if T2108 < 20 \+ Up 4% > 1000/i)).toBeInTheDocument()
      expect(screen.getByText(/Avoid if Up 4% < 150/i)).toBeInTheDocument()
    })
  })
})