/**
 * BIDBACK Master System Rules Validation Tests
 * Tests all BIDBACK Master System trading rules, conditions, and signal detection
 * Validates position sizing logic, entry/exit conditions, and risk management
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PositionCalculator } from '../PositionCalculator'
import { DataEntryForm } from '../DataEntryForm'
import type { MarketSignals, VIXLevel } from '../../../../types/trading'

// Mock holiday calendar for BIDBACK rules
vi.mock('../../../../utils/holidayCalendar', () => ({
  calculateExitDate: vi.fn((entryDate: Date, vix: number) => {
    // BIDBACK VIX-based hold periods
    const vixHoldDays = {
      'ultra-low': 10,  // VIX < 12
      'low': 8,         // VIX 12-15
      'normal': 6,      // VIX 15-20
      'elevated': 5,    // VIX 20-25
      'high': 4,        // VIX 25-35
      'extreme': 2      // VIX > 35
    }
    
    const regime = vix < 12 ? 'ultra-low' : vix < 15 ? 'low' : vix < 20 ? 'normal' : 
                  vix < 25 ? 'elevated' : vix < 35 ? 'high' : 'extreme'
    
    const exitDate = new Date(entryDate)
    exitDate.setDate(exitDate.getDate() + vixHoldDays[regime])
    return exitDate
  }),
  calculateExitPrices: vi.fn((entryPrice: number, vix: number) => {
    // BIDBACK VIX-based exit targets
    const stopLossPercent = vix < 20 ? -4 : vix < 30 ? -6 : -8
    const profitTarget1Percent = vix < 20 ? 6 : vix < 30 ? 9 : 12
    const profitTarget2Percent = vix < 20 ? 12 : vix < 30 ? 18 : 24
    
    return {
      stopLoss: entryPrice * (1 + stopLossPercent / 100),
      profitTarget1: entryPrice * (1 + profitTarget1Percent / 100),
      profitTarget2: entryPrice * (1 + profitTarget2Percent / 100),
      vixMatrix: {
        vixRange: vix < 20 ? '< 20' : vix < 30 ? '20-30' : '> 30',
        multiplier: vix < 20 ? 0.9 : vix < 30 ? 1.1 : 1.3,
        stopLossPercent,
        profitTarget1Percent,
        profitTarget2Percent,
        maxHoldDays: vix < 20 ? 8 : vix < 30 ? 5 : 3
      }
    }
  }),
  getVixExitMatrix: vi.fn()
}))

describe('BIDBACK Master System Rules Validation', () => {
  const defaultProps = {
    portfolioSize: 100000,
    onPortfolioSizeChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Big Opportunity Detection Rules', () => {
    test('should trigger Big Opportunity when T2108 < 20 AND Up4% > 1000', () => {
      const bigOpportunityScenarios = [
        { t2108: 19, up4pct: 1001, description: 'Just meets both criteria' },
        { t2108: 15, up4pct: 1200, description: 'Strong signal' },
        { t2108: 10, up4pct: 1500, description: 'Very strong signal' },
        { t2108: 5, up4pct: 2000, description: 'Extreme opportunity' }
      ]

      bigOpportunityScenarios.forEach(scenario => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={scenario.t2108}
            up4pct={scenario.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(/Big Opportunity/i)).toBeInTheDocument()
        expect(screen.getByText(/✅ T2108 < 20 \+ Up4% > 1000/i)).toBeInTheDocument()
        expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
        expect(screen.getByText(/2\.0x/)).toBeInTheDocument() // Big Opportunity multiplier

        unmount()
      })
    })

    test('should NOT trigger Big Opportunity when criteria are not fully met', () => {
      const noBigOpportunityScenarios = [
        { t2108: 20, up4pct: 1500, description: 'T2108 at boundary (not < 20)' },
        { t2108: 25, up4pct: 1200, description: 'T2108 too high' },
        { t2108: 15, up4pct: 1000, description: 'Up4% at boundary (not > 1000)' },
        { t2108: 10, up4pct: 800, description: 'Up4% too low' },
        { t2108: 30, up4pct: 500, description: 'Both criteria fail' }
      ]

      noBigOpportunityScenarios.forEach(scenario => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={scenario.t2108}
            up4pct={scenario.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(/Not triggered/i)).toBeInTheDocument()
        expect(screen.queryByText(/Big Opportunity detected!/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/2\.0x/)).not.toBeInTheDocument() // No Big Opportunity multiplier

        unmount()
      })
    })
  })

  describe('Avoid Entry Rules', () => {
    test('should trigger Avoid Entry when Up4% < 150', () => {
      const avoidEntryUp4Scenarios = [
        { up4pct: 149, t2108: 50, description: 'Just below 150' },
        { up4pct: 100, t2108: 30, description: 'Well below threshold' },
        { up4pct: 50, t2108: 20, description: 'Very low up4%' },
        { up4pct: 0, t2108: 10, description: 'Zero up4%' }
      ]

      avoidEntryUp4Scenarios.forEach(scenario => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={scenario.t2108}
            up4pct={scenario.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument()
        expect(screen.getByText(/Entry not recommended/i)).toBeInTheDocument()

        unmount()
      })
    })

    test('should trigger Avoid Entry when T2108 > 70', () => {
      const avoidEntryT2108Scenarios = [
        { t2108: 71, up4pct: 500, description: 'Just above 70' },
        { t2108: 80, up4pct: 800, description: 'High T2108' },
        { t2108: 90, up4pct: 1200, description: 'Very high T2108' },
        { t2108: 100, up4pct: 1500, description: 'Maximum T2108' }
      ]

      avoidEntryT2108Scenarios.forEach(scenario => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={scenario.t2108}
            up4pct={scenario.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument()
        expect(screen.getByText(/Entry not recommended/i)).toBeInTheDocument()

        unmount()
      })
    })

    test('should show Entry OK when conditions are favorable', () => {
      const favorableScenarios = [
        { t2108: 50, up4pct: 300, description: 'Moderate conditions' },
        { t2108: 40, up4pct: 500, description: 'Good conditions' },
        { t2108: 30, up4pct: 800, description: 'Strong conditions' },
        { t2108: 70, up4pct: 150, description: 'Boundary case - T2108=70, Up4%=150' }
      ]

      favorableScenarios.forEach(scenario => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={scenario.t2108}
            up4pct={scenario.up4pct}
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

  describe('Position Sizing Rules', () => {
    test('should apply NO ENTRY rule when Up4% < 100', () => {
      const noEntryScenarios = [
        { up4pct: 99, t2108: 50 },
        { up4pct: 50, t2108: 30 },
        { up4pct: 0, t2108: 20 }
      ]

      noEntryScenarios.forEach(scenario => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={scenario.t2108}
            up4pct={scenario.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(/0\.0x/)).toBeInTheDocument() // Breadth multiplier = 0
        expect(screen.getByText(/\$0/)).toBeInTheDocument() // Final position = 0

        unmount()
      })
    })

    test('should apply 0.3x multiplier when 100 ≤ Up4% < 150', () => {
      const lowBreadthScenarios = [
        { up4pct: 100, t2108: 50 },
        { up4pct: 125, t2108: 40 },
        { up4pct: 149, t2108: 60 }
      ]

      lowBreadthScenarios.forEach(scenario => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={scenario.t2108}
            up4pct={scenario.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(/0\.3x/)).toBeInTheDocument() // Breadth multiplier = 0.3

        unmount()
      })
    })

    test('should apply 0.5x multiplier when 150 ≤ Up4% < 200', () => {
      const weakBreadthScenarios = [
        { up4pct: 150, t2108: 50 },
        { up4pct: 175, t2108: 45 },
        { up4pct: 199, t2108: 55 }
      ]

      weakBreadthScenarios.forEach(scenario => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={scenario.t2108}
            up4pct={scenario.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(/0\.5x/)).toBeInTheDocument() // Breadth multiplier = 0.5

        unmount()
      })
    })

    test('should apply 1.5x multiplier when Up4% > 500 AND T2108 < 40', () => {
      const strongBreadthScenarios = [
        { up4pct: 501, t2108: 39 },
        { up4pct: 700, t2108: 35 },
        { up4pct: 800, t2108: 25 }
      ]

      strongBreadthScenarios.forEach(scenario => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={scenario.t2108}
            up4pct={scenario.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(/1\.5x/)).toBeInTheDocument() // Breadth multiplier = 1.5

        unmount()
      })
    })

    test('should cap position at 30% of portfolio', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          portfolioSize={100000}
          t2108={15}    // Big Opportunity
          up4pct={1500} // Big Opportunity
          vix={40.0}    // Extreme VIX (1.4x multiplier)
        />
      )

      // Base: $10k * 2.0 (Big Opportunity) * 1.4 (VIX) = $28k (under 30% cap)
      // But if it were higher, should cap at $30k
      expect(screen.getByText(/30\.0% of portfolio/)).toBeInTheDocument()
    })
  })

  describe('VIX Multiplier Rules', () => {
    test('should apply correct VIX multipliers according to BIDBACK matrix', () => {
      const vixMultiplierTests = [
        { vix: 10.0, expectedMultiplier: '0.8', expectedRegime: 'ultra-low' },
        { vix: 13.5, expectedMultiplier: '0.9', expectedRegime: 'low' },
        { vix: 17.5, expectedMultiplier: '1.0', expectedRegime: 'normal' },
        { vix: 22.0, expectedMultiplier: '1.1', expectedRegime: 'elevated' },
        { vix: 28.0, expectedMultiplier: '1.2', expectedRegime: 'high' },
        { vix: 40.0, expectedMultiplier: '1.4', expectedRegime: 'extreme' }
      ]

      vixMultiplierTests.forEach(test => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={50}
            up4pct={500}
            vix={test.vix}
          />
        )

        expect(screen.getByText(`${test.expectedMultiplier}x`)).toBeInTheDocument()
        expect(screen.getByText(new RegExp(test.expectedRegime, 'i'))).toBeInTheDocument()

        unmount()
      })
    })
  })

  describe('Position Deterioration Rules', () => {
    test('should calculate deterioration score correctly', () => {
      // High deterioration scenario: T2108 > 65 (+1), Down4% > Up4% (+1), Up4% < 150 (+2) = 4 points
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={70}
          up4pct={100}
          down4pct={300}
          vix={20.0}
        />
      )

      // Should trigger avoid entry due to multiple deterioration factors
      expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument()
    })

    test('should show low deterioration for good conditions', () => {
      // Low deterioration: T2108 < 65, Up4% > Down4%, Up4% > 150
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={45}
          up4pct={600}
          down4pct={200}
          vix={18.0}
        />
      )

      expect(screen.getByText(/✅ Entry OK/i)).toBeInTheDocument()
    })
  })

  describe('Breadth Strength Classification Rules', () => {
    test('should classify breadth strength according to BIDBACK rules', () => {
      const breadthClassificationTests = [
        { up4pct: 200, expectedStrength: 'weak' },
        { up4pct: 400, expectedStrength: 'weak' },
        { up4pct: 600, expectedStrength: 'moderate' },
        { up4pct: 800, expectedStrength: 'moderate' },
        { up4pct: 1200, expectedStrength: 'strong' },
        { up4pct: 2000, expectedStrength: 'strong' }
      ]

      breadthClassificationTests.forEach(test => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={50}
            up4pct={test.up4pct}
            down4pct={200}
            vix={20.0}
          />
        )

        expect(screen.getByText(new RegExp(test.expectedStrength, 'i'))).toBeInTheDocument()

        unmount()
      })
    })
  })

  describe('Complete BIDBACK Rule Integration', () => {
    test('should handle perfect Big Opportunity scenario', async () => {
      render(<DataEntryForm onSuccess={vi.fn()} />)

      // Set up perfect Big Opportunity
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '1200' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '15' } })
      fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: '12.0' } })

      await waitFor(() => {
        // Should show Big Opportunity
        expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
        expect(screen.getByText(/2\.0x/)).toBeInTheDocument() // Big Opportunity multiplier
        expect(screen.getByText(/0\.8x/)).toBeInTheDocument() // Ultra-low VIX multiplier
        expect(screen.getByText(/strong/i)).toBeInTheDocument() // Breadth strength
        expect(screen.getByText(/ultra-low/i)).toBeInTheDocument() // VIX regime
      })
    })

    test('should handle perfect Avoid Entry scenario', async () => {
      render(<DataEntryForm onSuccess={vi.fn()} />)

      // Set up perfect Avoid Entry
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '80' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '85' } })
      fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: '45.0' } })

      await waitFor(() => {
        // Should show Avoid Entry
        expect(screen.getByText(/Entry not recommended/i)).toBeInTheDocument()
        expect(screen.getByText(/0\.0x/)).toBeInTheDocument() // No entry multiplier
        expect(screen.getByText(/weak/i)).toBeInTheDocument() // Breadth strength
        expect(screen.getByText(/extreme/i)).toBeInTheDocument() // VIX regime
      })
    })

    test('should handle moderate market conditions', async () => {
      render(<DataEntryForm onSuccess={vi.fn()} />)

      // Set up moderate conditions
      fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { target: { value: '400' } })
      fireEvent.change(screen.getByLabelText(/T2108/i), { target: { value: '50' } })
      fireEvent.change(screen.getByLabelText(/VIX Level/i), { target: { value: '18.0' } })

      await waitFor(() => {
        // Should show normal conditions
        expect(screen.getByText(/✅ Entry OK/i)).toBeInTheDocument()
        expect(screen.getByText(/1\.0x/)).toBeInTheDocument() // Normal breadth multiplier
        expect(screen.getByText(/1\.0x/)).toBeInTheDocument() // Normal VIX multiplier
        expect(screen.getByText(/weak/i)).toBeInTheDocument() // Breadth strength
        expect(screen.getByText(/normal/i)).toBeInTheDocument() // VIX regime
      })
    })
  })

  describe('Exit Strategy Rules', () => {
    test('should show VIX-based exit strategy parameters', () => {
      const exitStrategyTests = [
        { vix: 15.0, expectedHoldDays: '8' },
        { vix: 22.0, expectedHoldDays: '5' },
        { vix: 35.0, expectedHoldDays: '3' }
      ]

      exitStrategyTests.forEach(test => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={45}
            up4pct={500}
            vix={test.vix}
          />
        )

        expect(screen.getByText(/Exit Strategy/i)).toBeInTheDocument()
        expect(screen.getByText(test.expectedHoldDays)).toBeInTheDocument() // Max hold days

        unmount()
      })
    })
  })

  describe('Risk Management Rules', () => {
    test('should enforce 30% portfolio maximum rule', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          portfolioSize={50000}
          t2108={10}     // Extreme Big Opportunity
          up4pct={2000}  // Extreme breadth
          vix={50.0}     // Extreme VIX
        />
      )

      // Should cap at 30% regardless of multipliers
      expect(screen.getByText(/30\.0% of portfolio/)).toBeInTheDocument()
    })

    test('should show position heat percentage correctly', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          portfolioSize={100000}
          t2108={40}
          up4pct={600}
          vix={20.0}
        />
      )

      // Should show portfolio heat percentage
      const heatPercentage = screen.getByText(/\d+\.\d+% of portfolio/)
      expect(heatPercentage).toBeInTheDocument()
    })
  })

  describe('Quick Reference Validation', () => {
    test('should display BIDBACK rules reference', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={50}
          up4pct={500}
          vix={20.0}
        />
      )

      expect(screen.getByText(/VIX Levels:/i)).toBeInTheDocument()
      expect(screen.getByText(/Entry Rules:/i)).toBeInTheDocument()
      expect(screen.getByText(/Big Opportunity if T2108 < 20 \+ Up 4% > 1000/i)).toBeInTheDocument()
      expect(screen.getByText(/No entry if Up 4% < 100/i)).toBeInTheDocument()
    })
  })
})