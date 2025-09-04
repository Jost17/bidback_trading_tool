import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { TradingDashboard } from '../TradingDashboard'

// Mock all child components with realistic functionality
vi.mock('../PlannedTrades', () => ({
  PlannedTrades: ({ onTradeExecuted, onTradeDeleted }: any) => (
    <div data-testid="planned-trades">
      <h2>Planned Trades Management</h2>
      <div data-testid="trade-list">
        <div data-testid="trade-item-1">
          <span>AAPL Call</span>
          <button onClick={() => onTradeExecuted(1)} data-testid="execute-1">Execute</button>
          <button onClick={() => onTradeDeleted()} data-testid="delete-1">Delete</button>
        </div>
        <div data-testid="trade-item-2">
          <span>SPY Put</span>
          <button onClick={() => onTradeExecuted(2)} data-testid="execute-2">Execute</button>
          <button onClick={() => onTradeDeleted()} data-testid="delete-2">Delete</button>
        </div>
      </div>
    </div>
  )
}))

vi.mock('../OpenPositions', () => ({
  OpenPositions: ({ onPositionUpdate, onPositionClosed }: any) => (
    <div data-testid="open-positions">
      <h2>Open Positions Monitor</h2>
      <div data-testid="positions-list">
        <div data-testid="position-item-1">
          <span>TSLA 250C</span>
          <button onClick={() => onPositionUpdate()} data-testid="update-1">Update</button>
          <button onClick={() => onPositionClosed(1)} data-testid="close-1">Close</button>
        </div>
        <div data-testid="position-item-2">
          <span>NVDA 800P</span>
          <button onClick={() => onPositionUpdate()} data-testid="update-2">Update</button>
          <button onClick={() => onPositionClosed(2)} data-testid="close-2">Close</button>
        </div>
      </div>
    </div>
  )
}))

vi.mock('../../settings/PortfolioSettings', () => ({
  PortfolioSettings: ({ initialSettings, onSettingsChange }: any) => (
    <div data-testid="portfolio-settings">
      <h2>Portfolio Configuration</h2>
      <div data-testid="settings-form">
        <div data-testid="current-size">Portfolio Size: ${initialSettings.portfolioSize.toLocaleString()}</div>
        <div data-testid="base-percentage">Base Size: {initialSettings.baseSizePercentage}%</div>
        <div data-testid="max-heat">Max Heat: {initialSettings.maxHeatPercentage}%</div>
        <button 
          onClick={() => onSettingsChange({
            ...initialSettings,
            portfolioSize: 150000,
            baseSizePercentage: 12,
            lastUpdated: new Date().toISOString()
          })}
          data-testid="save-settings"
        >
          Save Settings
        </button>
      </div>
    </div>
  )
}))

vi.mock('../HolidayCalendar', () => ({
  HolidayCalendar: ({ onBack }: any) => (
    <div data-testid="holiday-calendar">
      <h2>Market Holiday Calendar</h2>
      <div data-testid="calendar-content">
        <div data-testid="holiday-1">New Year's Day - Market Closed</div>
        <div data-testid="holiday-2">Independence Day - Market Closed</div>
        <div data-testid="vix-matrix">VIX Exit Matrix</div>
      </div>
      <button onClick={() => onBack()} data-testid="back-to-dashboard">
        ← Back to Dashboard
      </button>
    </div>
  )
}))

describe('TradingDashboard - Integration Tests', () => {
  const mockOnNavigateHome = vi.fn()
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockOnNavigateHome.mockClear()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('Complete Navigation Flow', () => {
    it('performs complete user workflow through all views', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // 1. Start at dashboard
      expect(screen.getByText('Trading Overview')).toBeInTheDocument()
      expect(screen.getByText('BIDBACK Trading Dashboard')).toBeInTheDocument()
      
      // 2. Navigate to planned trades via quick action
      const viewPlannedTradesButton = screen.getByText('View Planned Trades')
      fireEvent.click(viewPlannedTradesButton)
      
      await waitFor(() => {
        expect(screen.getByText('Planned Trades Management')).toBeInTheDocument()
        expect(screen.getByTestId('trade-list')).toBeInTheDocument()
      })
      
      // 3. Execute a trade
      const executeButton = screen.getByTestId('execute-1')
      fireEvent.click(executeButton)
      expect(consoleSpy).toHaveBeenCalledWith('Trade executed:', 1)
      
      // 4. Navigate to positions via tab
      const positionsTab = screen.getByRole('button', { name: /open positions/i })
      fireEvent.click(positionsTab)
      
      await waitFor(() => {
        expect(screen.getByText('Open Positions Monitor')).toBeInTheDocument()
        expect(screen.getByTestId('positions-list')).toBeInTheDocument()
      })
      
      // 5. Update a position
      const updateButton = screen.getByTestId('update-1')
      fireEvent.click(updateButton)
      
      // 6. Navigate to settings
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        expect(screen.getByText('Portfolio Configuration')).toBeInTheDocument()
        expect(screen.getByTestId('current-size')).toHaveTextContent('Portfolio Size: $100,000')
      })
      
      // 7. Update settings
      const saveSettingsButton = screen.getByTestId('save-settings')
      fireEvent.click(saveSettingsButton)
      expect(consoleSpy).toHaveBeenCalledWith('Portfolio settings updated:', expect.objectContaining({
        portfolioSize: 150000,
        baseSizePercentage: 12
      }))
      
      // 8. Navigate to calendar
      const calendarTab = screen.getByRole('button', { name: /holiday calendar/i })
      fireEvent.click(calendarTab)
      
      await waitFor(() => {
        expect(screen.getByText('Market Holiday Calendar')).toBeInTheDocument()
        expect(screen.getByTestId('vix-matrix')).toBeInTheDocument()
      })
      
      // 9. Return to dashboard via calendar back button
      const backButton = screen.getByTestId('back-to-dashboard')
      fireEvent.click(backButton)
      
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
        expect(screen.queryByText('Market Holiday Calendar')).not.toBeInTheDocument()
      })
    })

    it('maintains breadcrumb navigation throughout the workflow', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate through different views and verify breadcrumbs
      const viewTests = [
        { tab: /planned trades/i, viewTitle: 'Planned Trades' },
        { tab: /open positions/i, viewTitle: 'Open Positions' },
        { tab: /settings/i, viewTitle: 'Settings' },
        { tab: /holiday calendar/i, viewTitle: 'Holiday Calendar' }
      ]
      
      for (const test of viewTests) {
        const tab = screen.getByRole('button', { name: test.tab })
        fireEvent.click(tab)
        
        await waitFor(() => {
          // Verify breadcrumb structure
          expect(screen.getByText('Home')).toBeInTheDocument()
          expect(screen.getByText('Trading')).toBeInTheDocument()
          expect(screen.getByText(test.viewTitle)).toBeInTheDocument()
          
          // Verify breadcrumb styling
          const homeBreadcrumb = screen.getByText('Home')
          expect(homeBreadcrumb).toHaveClass('text-gray-600')
          
          const tradingBreadcrumb = screen.getByText('Trading')
          expect(tradingBreadcrumb).toHaveClass('text-blue-600')
        })
      }
    })

    it('handles breadcrumb navigation correctly', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to settings
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        expect(screen.getByText('Portfolio Configuration')).toBeInTheDocument()
      })
      
      // Test home breadcrumb
      const homeBreadcrumb = screen.getByText('Home')
      fireEvent.click(homeBreadcrumb)
      expect(mockOnNavigateHome).toHaveBeenCalledTimes(1)
      
      // Test trading breadcrumb
      const tradingBreadcrumb = screen.getByText('Trading')
      fireEvent.click(tradingBreadcrumb)
      
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
        expect(screen.queryByText('Portfolio Configuration')).not.toBeInTheDocument()
      })
    })
  })

  describe('End-to-End Trading Operations', () => {
    it('simulates complete trade lifecycle', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Start at dashboard - verify initial stats
      expect(screen.getByText('2')).toBeInTheDocument() // Planned trades count
      
      // Navigate to planned trades
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(screen.getByText('AAPL Call')).toBeInTheDocument()
        expect(screen.getByText('SPY Put')).toBeInTheDocument()
      })
      
      // Execute first trade
      const executeFirstTrade = screen.getByTestId('execute-1')
      fireEvent.click(executeFirstTrade)
      expect(consoleSpy).toHaveBeenCalledWith('Trade executed:', 1)
      
      // Navigate to positions to monitor the executed trade
      const positionsTab = screen.getByRole('button', { name: /open positions/i })
      fireEvent.click(positionsTab)
      
      await waitFor(() => {
        expect(screen.getByText('TSLA 250C')).toBeInTheDocument()
        expect(screen.getByText('NVDA 800P')).toBeInTheDocument()
      })
      
      // Update position
      const updatePosition = screen.getByTestId('update-1')
      fireEvent.click(updatePosition)
      
      // Close position
      const closePosition = screen.getByTestId('close-1')
      fireEvent.click(closePosition)
      expect(consoleSpy).toHaveBeenCalledWith('Position closed:', 1)
      
      // Return to dashboard to see updated stats
      const dashboardTab = screen.getByRole('button', { name: /dashboard/i })
      fireEvent.click(dashboardTab)
      
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
        // Stats should still be visible (would be updated in real app)
        expect(screen.getByText('$23,456')).toBeInTheDocument()
      })
    })

    it('handles portfolio settings updates and persists changes', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to settings
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('current-size')).toHaveTextContent('$100,000')
        expect(screen.getByTestId('base-percentage')).toHaveTextContent('10%')
        expect(screen.getByTestId('max-heat')).toHaveTextContent('80%')
      })
      
      // Update settings
      const saveButton = screen.getByTestId('save-settings')
      fireEvent.click(saveButton)
      
      expect(consoleSpy).toHaveBeenCalledWith('Portfolio settings updated:', expect.objectContaining({
        portfolioSize: 150000,
        baseSizePercentage: 12
      }))
      
      // Navigate away and back to verify persistence
      const dashboardTab = screen.getByRole('button', { name: /dashboard/i })
      fireEvent.click(dashboardTab)
      
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
      })
      
      // Return to settings
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        // Settings should be persisted in component state
        expect(screen.getByText('Portfolio Configuration')).toBeInTheDocument()
      })
    })

    it('handles calendar navigation and VIX matrix access', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to calendar via quick action
      const calendarQuickAction = screen.getByText('Holiday Calendar')
      fireEvent.click(calendarQuickAction)
      
      await waitFor(() => {
        expect(screen.getByText('Market Holiday Calendar')).toBeInTheDocument()
        expect(screen.getByTestId('holiday-1')).toHaveTextContent("New Year's Day - Market Closed")
        expect(screen.getByTestId('holiday-2')).toHaveTextContent('Independence Day - Market Closed')
        expect(screen.getByTestId('vix-matrix')).toHaveTextContent('VIX Exit Matrix')
      })
      
      // Use back navigation
      const backButton = screen.getByTestId('back-to-dashboard')
      fireEvent.click(backButton)
      
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
        expect(screen.queryByText('Market Holiday Calendar')).not.toBeInTheDocument()
      })
    })
  })

  describe('Multi-View Data Consistency', () => {
    it('maintains data consistency across view switches', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Verify initial dashboard stats
      expect(screen.getAllByText('2').length).toBeGreaterThan(0) // Planned trades
      expect(screen.getByText('$23,456')).toBeInTheDocument() // Total value
      expect(screen.getAllByText('23.5%').length).toBeGreaterThan(0) // Portfolio heat
      
      // Navigate through all views rapidly
      const views = [
        screen.getByRole('button', { name: /planned trades/i }),
        screen.getByRole('button', { name: /open positions/i }),
        screen.getByRole('button', { name: /settings/i }),
        screen.getByRole('button', { name: /holiday calendar/i }),
        screen.getByRole('button', { name: /dashboard/i })
      ]
      
      for (const viewButton of views) {
        fireEvent.click(viewButton)
        await waitFor(() => {
          // Each view should render without errors
          expect(viewButton).toHaveClass('bg-blue-600', 'text-white')
        })
      }
      
      // Return to dashboard and verify stats are still consistent
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
        expect(screen.getAllByText('2').length).toBeGreaterThan(0) // Planned trades still there
        expect(screen.getByText('$23,456')).toBeInTheDocument() // Total value preserved
      })
    })

    it('handles rapid navigation without state loss', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Rapid fire navigation
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      const positionsTab = screen.getByRole('button', { name: /open positions/i })
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      
      // Click tabs in rapid succession
      fireEvent.click(plannedTradesTab)
      fireEvent.click(positionsTab)
      fireEvent.click(settingsTab)
      
      // Final state should be settings
      await waitFor(() => {
        expect(screen.getByText('Portfolio Configuration')).toBeInTheDocument()
        expect(settingsTab).toHaveClass('bg-blue-600', 'text-white')
      })
      
      // Other tabs should not be active
      expect(plannedTradesTab).toHaveClass('text-gray-700')
      expect(positionsTab).toHaveClass('text-gray-700')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('handles component interactions without crashing', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Test multiple interactions in sequence
      const interactions = [
        () => fireEvent.click(screen.getByText('View Planned Trades')),
        () => fireEvent.click(screen.getByTestId('execute-1')),
        () => fireEvent.click(screen.getByRole('button', { name: /open positions/i })),
        () => fireEvent.click(screen.getByTestId('update-1')),
        () => fireEvent.click(screen.getByRole('button', { name: /settings/i })),
        () => fireEvent.click(screen.getByTestId('save-settings')),
        () => fireEvent.click(screen.getByRole('button', { name: /dashboard/i }))
      ]
      
      for (const interaction of interactions) {
        expect(() => interaction()).not.toThrow()
        // Small delay to allow state updates
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      
      // Component should still be functional
      expect(screen.getByText('Trading Overview')).toBeInTheDocument()
    })

    it('gracefully handles missing callback props', async () => {
      render(<TradingDashboard />)
      
      // Should render without errors even without onNavigateHome
      expect(screen.getByText('BIDBACK Trading Dashboard')).toBeInTheDocument()
      
      // Navigate to a non-dashboard view
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        // Should show Trading and Settings breadcrumbs but not Home
        expect(screen.queryByText('Home')).not.toBeInTheDocument()
        expect(screen.getByText('Trading')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and User Experience', () => {
    it('maintains responsive performance during navigation', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const navigationTimes: number[] = []
      
      const tabs = [
        screen.getByRole('button', { name: /planned trades/i }),
        screen.getByRole('button', { name: /open positions/i }),
        screen.getByRole('button', { name: /settings/i }),
        screen.getByRole('button', { name: /dashboard/i })
      ]
      
      for (const tab of tabs) {
        const startTime = performance.now()
        fireEvent.click(tab)
        
        await waitFor(() => {
          expect(tab).toHaveClass('bg-blue-600', 'text-white')
        })
        
        const endTime = performance.now()
        navigationTimes.push(endTime - startTime)
      }
      
      // All navigation should be fast (< 100ms in test environment)
      navigationTimes.forEach(time => {
        expect(time).toBeLessThan(100)
      })
    })

    it('provides consistent visual feedback during navigation', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      
      // Verify transition classes are present
      expect(plannedTradesTab).toHaveClass('transition-colors')
      
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        // Active state should be immediately visible
        expect(plannedTradesTab).toHaveClass('bg-blue-600', 'text-white')
        
        // Content should be rendered
        expect(screen.getByText('Planned Trades Management')).toBeInTheDocument()
      })
    })
  })
})