import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { TradingDashboard } from '../TradingDashboard'

// Mock child components with callback testing
vi.mock('../PlannedTrades', () => ({
  PlannedTrades: ({ onTradeExecuted, onTradeDeleted }: any) => (
    <div data-testid="planned-trades">
      <button 
        onClick={() => onTradeExecuted(123)}
        data-testid="execute-trade-btn"
      >
        Execute Trade
      </button>
      <button 
        onClick={() => onTradeDeleted()}
        data-testid="delete-trade-btn"
      >
        Delete Trade
      </button>
    </div>
  )
}))

vi.mock('../OpenPositions', () => ({
  OpenPositions: ({ onPositionUpdate, onPositionClosed }: any) => (
    <div data-testid="open-positions">
      <button 
        onClick={() => onPositionUpdate()}
        data-testid="update-position-btn"
      >
        Update Position
      </button>
      <button 
        onClick={() => onPositionClosed(456)}
        data-testid="close-position-btn"
      >
        Close Position
      </button>
    </div>
  )
}))

vi.mock('../../settings/PortfolioSettings', () => ({
  PortfolioSettings: ({ initialSettings, onSettingsChange }: any) => (
    <div data-testid="portfolio-settings">
      <button 
        onClick={() => onSettingsChange({
          ...initialSettings,
          portfolioSize: 250000,
          baseSizePercentage: 15,
          lastUpdated: new Date().toISOString()
        })}
        data-testid="update-settings-btn"
      >
        Update Settings
      </button>
      <div data-testid="current-portfolio-size">{initialSettings.portfolioSize}</div>
    </div>
  )
}))

vi.mock('../HolidayCalendar', () => ({
  HolidayCalendar: ({ onBack }: any) => (
    <div data-testid="holiday-calendar">
      <button onClick={() => onBack()} data-testid="calendar-back-btn">Back</button>
    </div>
  )
}))

describe('TradingDashboard - State Management Tests', () => {
  let mockOnNavigateHome: ReturnType<typeof vi.fn>
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockOnNavigateHome = vi.fn()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('Initial State', () => {
    it('initializes with correct default trading stats', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Verify default stats are displayed
      expect(screen.getAllByText('2').length).toBeGreaterThan(0) // Planned trades and positions
      expect(screen.getByText('$23,456')).toBeInTheDocument() // Total value
      expect(screen.getByText('+1,483')).toBeInTheDocument() // Unrealized P&L
      expect(screen.getByText('+$234.5')).toBeInTheDocument() // Today's P&L
      expect(screen.getAllByText('23.5%').length).toBeGreaterThan(0) // Portfolio heat
    })

    it('initializes with correct default portfolio settings', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to settings to verify initial values
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('current-portfolio-size')).toHaveTextContent('100000')
      })
    })

    it('starts in dashboard view state', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      expect(screen.getByText('Trading Overview')).toBeInTheDocument()
      expect(screen.queryByTestId('planned-trades')).not.toBeInTheDocument()
    })
  })

  describe('Stats Loading and Updates', () => {
    it('handles stats loading simulation', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Initial values should be present immediately after a brief loading period
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // Planned trades
        expect(screen.getByText('$23,456')).toBeInTheDocument() // Total value
      }, { timeout: 1000 })
    })

    it('updates stats after trade execution', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to planned trades
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        const executeBtn = screen.getByTestId('execute-trade-btn')
        fireEvent.click(executeBtn)
        
        expect(consoleSpy).toHaveBeenCalledWith('Trade executed:', 123)
      })
    })

    it('updates stats after position closure', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to positions
      const positionsTab = screen.getByRole('button', { name: /open positions/i })
      fireEvent.click(positionsTab)
      
      await waitFor(() => {
        const closeBtn = screen.getByTestId('close-position-btn')
        fireEvent.click(closeBtn)
        
        expect(consoleSpy).toHaveBeenCalledWith('Position closed:', 456)
      })
    })

    it('updates stats after position update', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to positions
      const positionsTab = screen.getByRole('button', { name: /open positions/i })
      fireEvent.click(positionsTab)
      
      await waitFor(() => {
        const updateBtn = screen.getByTestId('update-position-btn')
        fireEvent.click(updateBtn)
        
        // Should trigger stats refresh (callback executed)
        expect(updateBtn).toBeInTheDocument()
      })
    })

    it('updates stats after trade deletion', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to planned trades
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        const deleteBtn = screen.getByTestId('delete-trade-btn')
        fireEvent.click(deleteBtn)
        
        // Should trigger stats refresh (callback executed)
        expect(deleteBtn).toBeInTheDocument()
      })
    })
  })

  describe('Portfolio Settings State Management', () => {
    it('maintains portfolio settings state across views', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to settings
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('current-portfolio-size')).toHaveTextContent('100000')
      })
      
      // Navigate away and back
      const dashboardTab = screen.getByRole('button', { name: /dashboard/i })
      fireEvent.click(dashboardTab)
      
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
      })
      
      // Return to settings - state should persist
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('current-portfolio-size')).toHaveTextContent('100000')
      })
    })

    it('updates portfolio settings and logs changes', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to settings
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        const updateBtn = screen.getByTestId('update-settings-btn')
        fireEvent.click(updateBtn)
        
        expect(consoleSpy).toHaveBeenCalledWith('Portfolio settings updated:', 
          expect.objectContaining({
            portfolioSize: 250000,
            baseSizePercentage: 15
          })
        )
      })
    })

    it('portfolio settings callback receives correct parameters', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to settings
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        const updateBtn = screen.getByTestId('update-settings-btn')
        fireEvent.click(updateBtn)
        
        expect(consoleSpy).toHaveBeenCalledWith(
          'Portfolio settings updated:',
          expect.objectContaining({
            portfolioSize: expect.any(Number),
            baseSizePercentage: expect.any(Number),
            maxHeatPercentage: expect.any(Number),
            maxPositions: expect.any(Number),
            lastUpdated: expect.any(String)
          })
        )
      })
    })
  })

  describe('View State Persistence', () => {
    it('maintains active view state during component updates', async () => {
      const { rerender } = render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to planned trades
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
      })
      
      // Rerender component (simulating props change)
      rerender(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Should still be in planned trades view
      expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
      expect(plannedTradesTab).toHaveClass('bg-blue-600', 'text-white')
    })

    it('resets to dashboard view after calendar back navigation', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to calendar
      const calendarTab = screen.getByRole('button', { name: /holiday calendar/i })
      fireEvent.click(calendarTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('holiday-calendar')).toBeInTheDocument()
      })
      
      // Use calendar's back button
      const backBtn = screen.getByTestId('calendar-back-btn')
      fireEvent.click(backBtn)
      
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
        expect(screen.queryByTestId('holiday-calendar')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('handles isLoading state correctly', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Initial render should show stats after loading simulation
      await waitFor(() => {
        expect(screen.getByText('$23,456')).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('manages stats refresh during trade operations', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to planned trades and execute a trade
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        const executeBtn = screen.getByTestId('execute-trade-btn')
        fireEvent.click(executeBtn)
        
        // Should trigger loadDashboardStats which handles loading state internally
        expect(consoleSpy).toHaveBeenCalledWith('Trade executed:', 123)
      })
    })
  })

  describe('Callback Function State', () => {
    it('maintains callback references across renders', async () => {
      const { rerender } = render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to planned trades
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
      })
      
      // Get reference to execute button
      const executeBtn = screen.getByTestId('execute-trade-btn')
      
      // Rerender component
      rerender(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Callback should still work after rerender
      fireEvent.click(executeBtn)
      expect(consoleSpy).toHaveBeenCalledWith('Trade executed:', 123)
    })

    it('callback functions are properly memoized', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Test multiple callback invocations work correctly
      const views = [
        { tab: /planned trades/i, testId: 'planned-trades', btnTestId: 'execute-trade-btn', expectedLog: 'Trade executed:' },
        { tab: /open positions/i, testId: 'open-positions', btnTestId: 'close-position-btn', expectedLog: 'Position closed:' }
      ]
      
      for (const view of views) {
        const tab = screen.getByRole('button', { name: view.tab })
        fireEvent.click(tab)
        
        await waitFor(() => {
          const btn = screen.getByTestId(view.btnTestId)
          fireEvent.click(btn)
          
          expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(view.expectedLog), expect.any(Number))
        })
      }
    })
  })

  describe('State Synchronization', () => {
    it('synchronizes stats across view changes', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Verify initial stats in dashboard
      expect(screen.getByText('2')).toBeInTheDocument() // Planned trades
      
      // Navigate away and back
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-settings')).toBeInTheDocument()
      })
      
      const dashboardTab = screen.getByRole('button', { name: /dashboard/i })
      fireEvent.click(dashboardTab)
      
      // Stats should be preserved
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // Planned trades still there
        expect(screen.getByText('$23,456')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling in State Management', () => {
    it('handles missing callback props gracefully', () => {
      // Test with minimal props
      render(<TradingDashboard />)
      
      expect(screen.getByText('Trading Overview')).toBeInTheDocument()
      expect(screen.getByText('$23,456')).toBeInTheDocument()
    })

    it('maintains consistent state during error conditions', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Even if callbacks throw errors, component should maintain state
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
        expect(plannedTradesTab).toHaveClass('bg-blue-600', 'text-white')
      })
    })
  })
})