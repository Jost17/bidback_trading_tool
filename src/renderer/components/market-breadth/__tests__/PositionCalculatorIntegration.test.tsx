/**
 * Position Calculator Integration Tests
 * Tests the BIDBACK Master System position sizing calculations, 
 * market signal detection, and integration with Market Breadth data
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PositionCalculator } from '../PositionCalculator'
import type { VIXLevel, MarketSignals } from '../../../../types/trading'

// Mock holiday calendar utilities
vi.mock('../../../../utils/holidayCalendar', () => ({
  calculateExitDate: vi.fn((entryDate: Date, vix: number) => {
    const exitDate = new Date(entryDate)
    const daysToAdd = vix < 15 ? 7 : vix < 25 ? 5 : 3
    exitDate.setDate(exitDate.getDate() + daysToAdd)
    return exitDate
  }),
  calculateExitPrices: vi.fn((entryPrice: number, vix: number) => ({
    stopLoss: entryPrice * 0.95,
    profitTarget1: entryPrice * 1.08,
    profitTarget2: entryPrice * 1.15,
    vixMatrix: {
      vixRange: vix < 15 ? '< 15' : vix < 25 ? '15-25' : '> 25',
      multiplier: vix < 15 ? 0.9 : vix < 25 ? 1.0 : 1.2,
      stopLossPercent: -5,
      profitTarget1Percent: 8,
      profitTarget2Percent: 15,
      maxHoldDays: vix < 15 ? 7 : vix < 25 ? 5 : 3
    }
  })),
  getVixExitMatrix: vi.fn((vix: number) => ({
    vixRange: vix < 15 ? '< 15' : vix < 25 ? '15-25' : '> 25',
    multiplier: vix < 15 ? 0.9 : vix < 25 ? 1.0 : 1.2,
    stopLossPercent: -5,
    profitTarget1Percent: 8,
    profitTarget2Percent: 15,
    maxHoldDays: vix < 15 ? 7 : vix < 25 ? 5 : 3
  }))
}))

describe('Position Calculator Integration Tests', () => {
  const defaultProps = {
    portfolioSize: 100000,
    onPortfolioSizeChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('BIDBACK Master System Rules', () => {
    test('should detect Big Opportunity condition (T2108 < 20 + Up4% > 1000)', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={15}
          up4pct={1200}
          down4pct={100}
          vix={18.5}
        />
      )

      expect(screen.getByText(/Big Opportunity/i)).toBeInTheDocument()
      expect(screen.getByText(/T2108 < 20 \+ Up4% > 1000/i)).toBeInTheDocument()
      expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
    })

    test('should not trigger Big Opportunity when conditions not met', () => {
      const testCases = [
        { t2108: 25, up4pct: 1200, description: 'T2108 too high' },
        { t2108: 15, up4pct: 800, description: 'Up4% too low' },
        { t2108: 25, up4pct: 800, description: 'Both conditions not met' }
      ]

      testCases.forEach(testCase => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={testCase.t2108}
            up4pct={testCase.up4pct}
            down4pct={200}
            vix={18.5}
          />
        )

        expect(screen.getByText(/Not triggered/i)).toBeInTheDocument()
        expect(screen.queryByText(/Big Opportunity detected!/i)).not.toBeInTheDocument()

        unmount()
      })
    })

    test('should detect Avoid Entry conditions', () => {
      const avoidEntryCases = [
        { up4pct: 100, t2108: 50, description: 'Up4% < 150' },
        { up4pct: 120, t2108: 50, description: 'Up4% < 150' },
        { up4pct: 500, t2108: 75, description: 'T2108 > 70' },
        { up4pct: 100, t2108: 75, description: 'Both conditions trigger avoidance' }
      ]

      avoidEntryCases.forEach(testCase => {
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

    test('should show Entry OK when conditions are favorable', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={45}
          up4pct={300}
          down4pct={150}
          vix={18.0}
        />
      )

      expect(screen.getByText(/✅ Entry OK/i)).toBeInTheDocument()
      expect(screen.queryByText(/Entry not recommended/i)).not.toBeInTheDocument()
    })
  })

  describe('Position Sizing Logic', () => {
    test('should calculate base position as 10% of portfolio', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          portfolioSize={100000}
          t2108={50}
          up4pct={500}
          vix={18.0}
        />
      )

      expect(screen.getByText('$100,000')).toBeInTheDocument() // Portfolio size
      expect(screen.getByText('$10,000')).toBeInTheDocument() // Base position (10%)
      expect(screen.getByText('Base Position (10%)')).toBeInTheDocument()
    })

    test('should apply breadth multipliers correctly', () => {
      const breadthMultiplierTests = [
        { up4pct: 50, t2108: 50, expectedMultiplier: '0.0', description: 'NO ENTRY (Up4% < 100)' },
        { up4pct: 120, t2108: 50, expectedMultiplier: '0.3', description: 'Low breadth (Up4% < 150)' },
        { up4pct: 180, t2108: 50, expectedMultiplier: '0.5', description: 'Weak breadth (Up4% < 200)' },
        { up4pct: 400, t2108: 50, expectedMultiplier: '1.0', description: 'Normal breadth' },
        { up4pct: 700, t2108: 35, expectedMultiplier: '1.5', description: 'Strong breadth (Up4% > 500, T2108 < 40)' },
        { up4pct: 1200, t2108: 25, expectedMultiplier: '2.0', description: 'Big Opportunity (Up4% > 1000, T2108 < 30)' }
      ]

      breadthMultiplierTests.forEach(test => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={test.t2108}
            up4pct={test.up4pct}
            down4pct={200}
            vix={18.0}
          />
        )

        expect(screen.getByText(new RegExp(`${test.expectedMultiplier}x`))).toBeInTheDocument()

        unmount()
      })
    })

    test('should cap position at 30% of portfolio maximum', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          portfolioSize={100000}
          t2108={15} // Big Opportunity
          up4pct={1500} // Very strong breadth
          vix={35.0} // High VIX multiplier (1.4x)
        />
      )

      // Base: $10k * 2.0 (breadth) * 1.4 (VIX) = $28k, but should cap at $30k (30% of $100k)
      const recommendedPositions = screen.getAllByText(/\$\d{1,2},\d{3}/)
      const finalPosition = recommendedPositions[recommendedPositions.length - 1]
      
      // Should show final position and percentage
      expect(screen.getByText(/30\.0% of portfolio/)).toBeInTheDocument()
    })

    test('should handle portfolio size changes', async () => {
      const mockOnPortfolioSizeChange = vi.fn()
      
      render(
        <PositionCalculator
          {...defaultProps}
          portfolioSize={100000}
          onPortfolioSizeChange={mockOnPortfolioSizeChange}
          t2108={50}
          up4pct={500}
          vix={18.0}
        />
      )

      // Open settings
      const settingsButton = screen.getByRole('button', { name: '' }) // Settings icon button
      fireEvent.click(settingsButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/Portfolio Size/i)).toBeInTheDocument()
      })

      const portfolioInput = screen.getByDisplayValue('100000')
      fireEvent.change(portfolioInput, { target: { value: '200000' } })

      const updateButton = screen.getByRole('button', { name: /Update/i })
      fireEvent.click(updateButton)

      expect(mockOnPortfolioSizeChange).toHaveBeenCalledWith(200000)
    })
  })

  describe('VIX Integration', () => {
    test('should classify VIX levels correctly', () => {
      const vixLevelTests = [
        { vix: 10.0, expectedLevel: 'ultra-low' },
        { vix: 13.5, expectedLevel: 'low' },
        { vix: 17.8, expectedLevel: 'normal' },
        { vix: 22.3, expectedLevel: 'elevated' },
        { vix: 28.7, expectedLevel: 'high' },
        { vix: 45.1, expectedLevel: 'extreme' }
      ]

      vixLevelTests.forEach(test => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={50}
            up4pct={500}
            vix={test.vix}
          />
        )

        expect(screen.getByText(new RegExp(test.expectedLevel, 'i'))).toBeInTheDocument()
        expect(screen.getByText(`(${test.vix.toFixed(1)})`)).toBeInTheDocument()

        unmount()
      })
    })

    test('should apply VIX multipliers correctly', () => {
      const vixMultiplierTests = [
        { vix: 10.0, expectedMultiplier: '0.8' }, // ultra-low
        { vix: 14.0, expectedMultiplier: '0.9' }, // low
        { vix: 18.0, expectedMultiplier: '1.0' }, // normal
        { vix: 23.0, expectedMultiplier: '1.1' }, // elevated
        { vix: 30.0, expectedMultiplier: '1.2' }, // high
        { vix: 40.0, expectedMultiplier: '1.4' }  // extreme
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

        unmount()
      })
    })
  })

  describe('Market Breadth Strength Classification', () => {
    test('should classify breadth strength correctly', () => {
      const breadthStrengthTests = [
        { up4pct: 200, expectedStrength: 'weak' },
        { up4pct: 750, expectedStrength: 'moderate' },
        { up4pct: 1200, expectedStrength: 'strong' }
      ]

      breadthStrengthTests.forEach(test => {
        const { unmount } = render(
          <PositionCalculator
            {...defaultProps}
            t2108={50}
            up4pct={test.up4pct}
            down4pct={200}
            vix={18.0}
          />
        )

        expect(screen.getByText(new RegExp(test.expectedStrength, 'i'))).toBeInTheDocument()

        unmount()
      })
    })
  })

  describe('Exit Strategy Integration', () => {
    test('should display exit strategy when VIX is provided', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={45}
          up4pct={500}
          vix={20.0}
        />
      )

      expect(screen.getByText(/Exit Strategy/i)).toBeInTheDocument()
      expect(screen.getByText(/Holiday-Adjusted/i)).toBeInTheDocument()
      expect(screen.getByText(/Stop Loss/i)).toBeInTheDocument()
      expect(screen.getByText(/Profit Target 1/i)).toBeInTheDocument()
      expect(screen.getByText(/Profit Target 2/i)).toBeInTheDocument()
      expect(screen.getByText(/Max Hold Days/i)).toBeInTheDocument()
    })

    test('should show exit date calculation', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={45}
          up4pct={500}
          vix={25.0}
        />
      )

      expect(screen.getByText(/Time Exit Date:/i)).toBeInTheDocument()
      // Should show a formatted date
      expect(screen.getByText(/\w{3},? \w{3} \d{1,2},? \d{4}/)).toBeInTheDocument()
    })

    test('should not show exit strategy when VIX is undefined', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={45}
          up4pct={500}
          vix={undefined}
        />
      )

      expect(screen.queryByText(/Exit Strategy/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Holiday-Adjusted/i)).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing breadth data gracefully', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={undefined}
          up4pct={undefined}
          down4pct={undefined}
          vix={20.0}
        />
      )

      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      expect(screen.getByText(/Not triggered/i)).toBeInTheDocument() // Big Opportunity should be false
    })

    test('should handle zero values correctly', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={0}
          up4pct={0}
          down4pct={0}
          vix={0}
        />
      )

      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      // Should show 0.0x breadth multiplier for up4pct = 0 (NO ENTRY)
      expect(screen.getByText(/0\.0x/)).toBeInTheDocument()
    })

    test('should handle extremely large values', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          portfolioSize={10000000} // $10M portfolio
          t2108={15}
          up4pct={5000}
          vix={50.0}
        />
      )

      expect(screen.getByText(/BIDBACK Position Calculator/i)).toBeInTheDocument()
      expect(screen.getByText('$10,000,000')).toBeInTheDocument() // Should format large numbers
    })

    test('should provide quick reference information', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={45}
          up4pct={500}
          vix={20.0}
        />
      )

      expect(screen.getByText(/VIX Levels:/i)).toBeInTheDocument()
      expect(screen.getByText(/Entry Rules:/i)).toBeInTheDocument()
      expect(screen.getByText(/<12 \(Ultra-Low\)/)).toBeInTheDocument()
      expect(screen.getByText(/Big Opportunity if T2108 < 20/)).toBeInTheDocument()
    })
  })

  describe('Position Deterioration Detection', () => {
    test('should calculate position deterioration score', () => {
      // Test high deterioration scenario
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={70}    // High T2108 (adds 1 to deterioration)
          up4pct={100}  // Low Up4% (adds 2 to deterioration)
          down4pct={400} // Down4% > Up4% (adds 1 to deterioration)
          vix={20.0}
        />
      )

      // Should trigger avoid entry due to multiple deterioration factors
      expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument()
    })

    test('should show favorable conditions with low deterioration', () => {
      render(
        <PositionCalculator
          {...defaultProps}
          t2108={40}    // Moderate T2108
          up4pct={600}  // Good Up4%
          down4pct={150} // Down4% < Up4%
          vix={18.0}
        />
      )

      expect(screen.getByText(/✅ Entry OK/i)).toBeInTheDocument()
    })
  })
})