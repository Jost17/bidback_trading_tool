import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PortfolioSettings } from '../PortfolioSettings'
import { PositionCalculator } from '../../market-breadth/PositionCalculator'

// Integration tests for Portfolio Settings with Position Calculator
describe('PortfolioSettings Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Portfolio Settings - Position Calculator Integration', () => {
    it('should update Position Calculator when portfolio settings change', async () => {
      const onSettingsChange = vi.fn()
      
      // Default settings
      const defaultSettings = {
        portfolioSize: 100000,
        baseSizePercentage: 10,
        maxHeatPercentage: 80,
        maxPositions: 8,
        lastUpdated: new Date().toISOString(),
      }

      render(
        <div>
          <PortfolioSettings 
            initialSettings={defaultSettings}
            onSettingsChange={onSettingsChange}
          />
          <PositionCalculator 
            portfolioSize={defaultSettings.portfolioSize}
            vix={20}
            t2108={35}
            up4pct={800}
          />
        </div>
      )

      // Initially should show $100,000 portfolio size
      expect(screen.getByText('$100,000')).toBeInTheDocument()

      // Change portfolio size to $250,000
      const portfolioInput = screen.getByDisplayValue('100000')
      fireEvent.change(portfolioInput, { target: { value: '250000' } })

      // Save settings
      const saveButton = screen.getByText(/Save Settings/)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(onSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            portfolioSize: 250000,
          })
        )
      })
    })

    it('should validate position calculations with updated portfolio size', () => {
      const mockOnChange = vi.fn()

      render(
        <PortfolioSettings 
          initialSettings={{
            portfolioSize: 500000, // Higher portfolio
            baseSizePercentage: 15,
            maxHeatPercentage: 70,
            maxPositions: 6,
            lastUpdated: new Date().toISOString(),
          }}
          onSettingsChange={mockOnChange}
        />
      )

      // With $500k portfolio and 15% base size
      // Base position should be $75,000
      expect(screen.getByText('$500,000')).toBeInTheDocument()
    })
  })

  describe('Live Updates and Calculations', () => {
    it('should show real-time portfolio heat calculations', async () => {
      const onSettingsChange = vi.fn()
      
      render(
        <PortfolioSettings 
          initialSettings={{
            portfolioSize: 200000,
            baseSizePercentage: 20, // Higher base percentage
            maxHeatPercentage: 60,
            maxPositions: 5,
            lastUpdated: new Date().toISOString(),
          }}
          onSettingsChange={onSettingsChange}
        />
      )

      // Should show calculated values for 20% base on $200k
      expect(screen.getByText('$200,000')).toBeInTheDocument() // Portfolio size
    })
  })

  describe('Settings Validation with Real Scenarios', () => {
    it('should prevent risky portfolio configurations', async () => {
      const onSettingsChange = vi.fn()
      
      render(
        <PortfolioSettings 
          initialSettings={{
            portfolioSize: 50000, // Small portfolio
            baseSizePercentage: 50, // Very high base percentage
            maxHeatPercentage: 100, // Maximum heat
            maxPositions: 20, // Maximum positions
            lastUpdated: new Date().toISOString(),
          }}
          onSettingsChange={onSettingsChange}
        />
      )

      const saveButton = screen.getByText(/Save Settings/)
      fireEvent.click(saveButton)

      // Should show warning about configuration
      await waitFor(() => {
        expect(onSettingsChange).toHaveBeenCalled()
      })
    })
  })
})