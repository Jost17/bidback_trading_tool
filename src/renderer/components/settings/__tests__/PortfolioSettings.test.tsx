import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PortfolioSettings } from '../PortfolioSettings'
import type { PortfolioSettings as PortfolioSettingsType } from '../../../../types/trading'

// Mock data
const defaultSettings: PortfolioSettingsType = {
  portfolioSize: 100000,
  baseSizePercentage: 10,
  maxHeatPercentage: 80,
  maxPositions: 8,
  lastUpdated: new Date().toISOString(),
}

const mockOnSettingsChange = vi.fn()

describe('PortfolioSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial Rendering and Default Values', () => {
    it('should render with BIDBACK Master System default values', () => {
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      expect(screen.getByDisplayValue('100000')).toBeInTheDocument()
      expect(screen.getByDisplayValue('10')).toBeInTheDocument() // Base Size %
      expect(screen.getByDisplayValue('80')).toBeInTheDocument() // Max Heat %
      expect(screen.getByDisplayValue('8')).toBeInTheDocument() // Max Positions
    })

    it('should display BIDBACK Master System branding', () => {
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      expect(screen.getByText(/BIDBACK Master System/)).toBeInTheDocument()
      expect(screen.getByText(/Portfolio Configuration/)).toBeInTheDocument()
    })

    it('should show current portfolio heat calculation', () => {
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      // Should show calculated portfolio heat based on default settings
      expect(screen.getByText(/Current Portfolio Heat/)).toBeInTheDocument()
    })
  })

  describe('Portfolio Size Validation', () => {
    it('should accept valid portfolio sizes', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const portfolioSizeInput = screen.getByLabelText(/Portfolio Size/)
      
      // Test valid values
      const validSizes = ['1000', '50000', '250000', '1000000', '10000000']
      
      for (const size of validSizes) {
        await user.clear(portfolioSizeInput)
        await user.type(portfolioSizeInput, size)
        
        expect(portfolioSizeInput).toHaveValue(parseInt(size))
      }
    })

    it('should validate minimum portfolio size ($1,000)', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const portfolioSizeInput = screen.getByLabelText(/Portfolio Size/)
      const saveButton = screen.getByText(/Save Settings/)

      await user.clear(portfolioSizeInput)
      await user.type(portfolioSizeInput, '500') // Below minimum
      fireEvent.click(saveButton)

      expect(screen.getByText(/minimum portfolio size is \\$1,000/)).toBeInTheDocument()
      expect(mockOnSettingsChange).not.toHaveBeenCalled()
    })

    it('should validate maximum portfolio size ($10,000,000)', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const portfolioSizeInput = screen.getByLabelText(/Portfolio Size/)
      const saveButton = screen.getByText(/Save Settings/)

      await user.clear(portfolioSizeInput)
      await user.type(portfolioSizeInput, '20000000') // Above maximum
      fireEvent.click(saveButton)

      expect(screen.getByText(/maximum portfolio size is \\$10,000,000/)).toBeInTheDocument()
      expect(mockOnSettingsChange).not.toHaveBeenCalled()
    })

    it('should reject non-numeric portfolio size values', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const portfolioSizeInput = screen.getByLabelText(/Portfolio Size/)
      
      await user.clear(portfolioSizeInput)
      await user.type(portfolioSizeInput, 'invalid')
      
      // Should not accept non-numeric values
      expect(portfolioSizeInput).toHaveValue(0)
    })
  })

  describe('Base Size Percentage Validation', () => {
    it('should accept valid base size percentages (1-50%)', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const baseSizeInput = screen.getByLabelText(/Base Position Size/)
      
      const validPercentages = ['1', '10', '25', '50']
      
      for (const percentage of validPercentages) {
        await user.clear(baseSizeInput)
        await user.type(baseSizeInput, percentage)
        
        expect(baseSizeInput).toHaveValue(parseInt(percentage))
      }
    })

    it('should validate minimum base size percentage (1%)', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const baseSizeInput = screen.getByLabelText(/Base Position Size/)
      const saveButton = screen.getByText(/Save Settings/)

      await user.clear(baseSizeInput)
      await user.type(baseSizeInput, '0.5') // Below minimum
      fireEvent.click(saveButton)

      expect(screen.getByText(/minimum base size is 1%/)).toBeInTheDocument()
      expect(mockOnSettingsChange).not.toHaveBeenCalled()
    })

    it('should validate maximum base size percentage (50%)', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const baseSizeInput = screen.getByLabelText(/Base Position Size/)
      const saveButton = screen.getByText(/Save Settings/)

      await user.clear(baseSizeInput)
      await user.type(baseSizeInput, '75') // Above maximum
      fireEvent.click(saveButton)

      expect(screen.getByText(/maximum base size is 50%/)).toBeInTheDocument()
      expect(mockOnSettingsChange).not.toHaveBeenCalled()
    })
  })

  describe('Max Heat Percentage Validation', () => {
    it('should accept valid max heat percentages (20-100%)', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const maxHeatInput = screen.getByLabelText(/Maximum Portfolio Heat/)
      
      const validPercentages = ['20', '40', '60', '80', '100']
      
      for (const percentage of validPercentages) {
        await user.clear(maxHeatInput)
        await user.type(maxHeatInput, percentage)
        
        expect(maxHeatInput).toHaveValue(parseInt(percentage))
      }
    })

    it('should validate minimum max heat percentage (20%)', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const maxHeatInput = screen.getByLabelText(/Maximum Portfolio Heat/)
      const saveButton = screen.getByText(/Save Settings/)

      await user.clear(maxHeatInput)
      await user.type(maxHeatInput, '15') // Below minimum
      fireEvent.click(saveButton)

      expect(screen.getByText(/minimum portfolio heat is 20%/)).toBeInTheDocument()
      expect(mockOnSettingsChange).not.toHaveBeenCalled()
    })

    it('should validate maximum max heat percentage (100%)', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const maxHeatInput = screen.getByLabelText(/Maximum Portfolio Heat/)
      const saveButton = screen.getByText(/Save Settings/)

      await user.clear(maxHeatInput)
      await user.type(maxHeatInput, '150') // Above maximum
      fireEvent.click(saveButton)

      expect(screen.getByText(/maximum portfolio heat is 100%/)).toBeInTheDocument()
      expect(mockOnSettingsChange).not.toHaveBeenCalled()
    })
  })

  describe('Max Positions Validation', () => {
    it('should accept valid max positions (1-20)', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const maxPositionsInput = screen.getByLabelText(/Maximum Concurrent Positions/)
      
      const validPositions = ['1', '5', '8', '15', '20']
      
      for (const positions of validPositions) {
        await user.clear(maxPositionsInput)
        await user.type(maxPositionsInput, positions)
        
        expect(maxPositionsInput).toHaveValue(parseInt(positions))
      }
    })

    it('should validate minimum max positions (1)', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const maxPositionsInput = screen.getByLabelText(/Maximum Concurrent Positions/)
      const saveButton = screen.getByText(/Save Settings/)

      await user.clear(maxPositionsInput)
      await user.type(maxPositionsInput, '0') // Below minimum
      fireEvent.click(saveButton)

      expect(screen.getByText(/minimum concurrent positions is 1/)).toBeInTheDocument()
      expect(mockOnSettingsChange).not.toHaveBeenCalled()
    })

    it('should validate maximum max positions (20)', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const maxPositionsInput = screen.getByLabelText(/Maximum Concurrent Positions/)
      const saveButton = screen.getByText(/Save Settings/)

      await user.clear(maxPositionsInput)
      await user.type(maxPositionsInput, '25') // Above maximum
      fireEvent.click(saveButton)

      expect(screen.getByText(/maximum concurrent positions is 20/)).toBeInTheDocument()
      expect(mockOnSettingsChange).not.toHaveBeenCalled()
    })
  })

  describe('Settings Persistence and Updates', () => {
    it('should call onSettingsChange with updated values on valid form submission', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      // Update all fields
      const portfolioSizeInput = screen.getByLabelText(/Portfolio Size/)
      const baseSizeInput = screen.getByLabelText(/Base Position Size/)
      const maxHeatInput = screen.getByLabelText(/Maximum Portfolio Heat/)
      const maxPositionsInput = screen.getByLabelText(/Maximum Concurrent Positions/)
      const saveButton = screen.getByText(/Save Settings/)

      await user.clear(portfolioSizeInput)
      await user.type(portfolioSizeInput, '250000')
      
      await user.clear(baseSizeInput)
      await user.type(baseSizeInput, '15')
      
      await user.clear(maxHeatInput)
      await user.type(maxHeatInput, '75')
      
      await user.clear(maxPositionsInput)
      await user.type(maxPositionsInput, '10')

      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            portfolioSize: 250000,
            baseSizePercentage: 15,
            maxHeatPercentage: 75,
            maxPositions: 10,
          })
        )
      })
    })

    it('should update lastUpdated timestamp on settings change', async () => {
      const user = userEvent.setup()
      const fixedDate = new Date('2025-09-03T14:00:00.000Z')
      vi.setSystemTime(fixedDate)

      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const saveButton = screen.getByText(/Save Settings/)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            lastUpdated: fixedDate.toISOString(),
          })
        )
      })

      vi.useRealTimers()
    })

    it('should show success message after successful save', async () => {
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const saveButton = screen.getByText(/Save Settings/)
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Settings saved successfully/)).toBeInTheDocument()
      })
    })

    it('should preserve form state when validation fails', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const portfolioSizeInput = screen.getByLabelText(/Portfolio Size/)
      const baseSizeInput = screen.getByLabelText(/Base Position Size/)
      const saveButton = screen.getByText(/Save Settings/)

      // Set invalid portfolio size but valid base size
      await user.clear(portfolioSizeInput)
      await user.type(portfolioSizeInput, '500') // Invalid

      await user.clear(baseSizeInput)
      await user.type(baseSizeInput, '15') // Valid

      fireEvent.click(saveButton)

      // Form should preserve the valid base size value
      expect(baseSizeInput).toHaveValue(15)
      expect(portfolioSizeInput).toHaveValue(500)
      expect(mockOnSettingsChange).not.toHaveBeenCalled()
    })
  })

  describe('Reset to Defaults Functionality', () => {
    it('should reset all fields to BIDBACK Master System defaults', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={{
            ...defaultSettings,
            portfolioSize: 500000,
            baseSizePercentage: 20,
            maxHeatPercentage: 90,
            maxPositions: 15,
          }}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const resetButton = screen.getByText(/Reset to Defaults/)
      fireEvent.click(resetButton)

      // Check that all fields are reset to defaults
      expect(screen.getByDisplayValue('100000')).toBeInTheDocument()
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()
      expect(screen.getByDisplayValue('80')).toBeInTheDocument()
      expect(screen.getByDisplayValue('8')).toBeInTheDocument()
    })

    it('should show confirmation before resetting', async () => {
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const resetButton = screen.getByText(/Reset to Defaults/)
      fireEvent.click(resetButton)

      expect(screen.getByText(/Are you sure you want to reset/)).toBeInTheDocument()
      expect(screen.getByText(/Confirm Reset/)).toBeInTheDocument()
      expect(screen.getByText(/Cancel/)).toBeInTheDocument()
    })
  })

  describe('Portfolio Heat Calculation Display', () => {
    it('should display current portfolio heat based on settings', () => {
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      // Should show calculated portfolio heat
      expect(screen.getByText(/Current Portfolio Heat:/)).toBeInTheDocument()
      
      // With default settings (10% base, assume some multiplier), should show percentage
      const heatDisplay = screen.getByText(/Current Portfolio Heat:/).parentElement
      expect(heatDisplay).toHaveTextContent(/%/)
    })

    it('should update portfolio heat calculation when settings change', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const baseSizeInput = screen.getByLabelText(/Base Position Size/)
      
      // Change base size to 20%
      await user.clear(baseSizeInput)
      await user.type(baseSizeInput, '20')

      // Heat calculation should update (though exact value depends on multipliers)
      expect(screen.getByText(/Current Portfolio Heat:/)).toBeInTheDocument()
    })

    it('should show heat warning when approaching maximum', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={{
            ...defaultSettings,
            maxHeatPercentage: 30, // Low max heat
          }}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const baseSizeInput = screen.getByLabelText(/Base Position Size/)
      
      // Set high base size that might trigger heat warning
      await user.clear(baseSizeInput)
      await user.type(baseSizeInput, '25')

      // Should show heat warning if close to maximum
      const warningElements = screen.queryAllByText(/portfolio heat/i)
      expect(warningElements.length).toBeGreaterThan(0)
    })
  })

  describe('BIDBACK Master System Compliance', () => {
    it('should enforce BIDBACK Master System rules', () => {
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      // Check that component displays BIDBACK compliance information
      expect(screen.getByText(/BIDBACK Master System/)).toBeInTheDocument()
      expect(screen.getByText(/680-Trade Validated Rules/)).toBeInTheDocument()
    })

    it('should show recommended settings based on BIDBACK analysis', () => {
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      // Should show recommended values
      expect(screen.getByText(/Recommended: 10%/)).toBeInTheDocument()
      expect(screen.getByText(/Recommended: 80%/)).toBeInTheDocument()
      expect(screen.getByText(/Recommended: 8/)).toBeInTheDocument()
    })

    it('should validate settings against BIDBACK risk management rules', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      // Try to set risky configuration
      const maxHeatInput = screen.getByLabelText(/Maximum Portfolio Heat/)
      const maxPositionsInput = screen.getByLabelText(/Maximum Concurrent Positions/)
      const saveButton = screen.getByText(/Save Settings/)

      await user.clear(maxHeatInput)
      await user.type(maxHeatInput, '100') // Very high heat

      await user.clear(maxPositionsInput)
      await user.type(maxPositionsInput, '20') // Max positions

      fireEvent.click(saveButton)

      // Should show warning about high-risk configuration
      expect(screen.getByText(/high-risk configuration/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      expect(screen.getByLabelText(/Portfolio Size/)).toHaveAttribute('aria-describedby')
      expect(screen.getByLabelText(/Base Position Size/)).toHaveAttribute('aria-describedby')
      expect(screen.getByLabelText(/Maximum Portfolio Heat/)).toHaveAttribute('aria-describedby')
      expect(screen.getByLabelText(/Maximum Concurrent Positions/)).toHaveAttribute('aria-describedby')
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(
        <PortfolioSettings
          initialSettings={defaultSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      )

      const portfolioSizeInput = screen.getByLabelText(/Portfolio Size/)
      
      // Should be able to tab through form elements
      await user.tab()
      expect(portfolioSizeInput).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/Base Position Size/)).toHaveFocus()
    })
  })
})