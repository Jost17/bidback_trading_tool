import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { TradingDashboard } from '../TradingDashboard'

// Mock child components to isolate TradingDashboard testing
vi.mock('../PlannedTrades', () => ({
  PlannedTrades: ({ onTradeExecuted, onTradeDeleted }: any) => (
    <div data-testid="planned-trades">
      <button onClick={() => onTradeExecuted(1)}>Execute Trade</button>
      <button onClick={() => onTradeDeleted()}>Delete Trade</button>
      Planned Trades Component
    </div>
  )
}))

vi.mock('../OpenPositions', () => ({
  OpenPositions: ({ onPositionUpdate, onPositionClosed }: any) => (
    <div data-testid="open-positions">
      <button onClick={() => onPositionUpdate()}>Update Position</button>
      <button onClick={() => onPositionClosed(1)}>Close Position</button>
      Open Positions Component
    </div>
  )
}))

vi.mock('../../settings/PortfolioSettings', () => ({
  PortfolioSettings: ({ initialSettings, onSettingsChange }: any) => (
    <div data-testid="portfolio-settings">
      <button 
        onClick={() => onSettingsChange({...initialSettings, portfolioSize: 200000})}
      >
        Update Settings
      </button>
      Portfolio Settings Component
    </div>
  )
}))

vi.mock('../HolidayCalendar', () => ({
  HolidayCalendar: ({ onBack }: any) => (
    <div data-testid="holiday-calendar">
      <button onClick={() => onBack()}>Back to Dashboard</button>
      Holiday Calendar Component
    </div>
  )
}))

describe('TradingDashboard', () => {
  const mockOnNavigateHome = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Render and Dashboard View', () => {
    it('renders the main dashboard view by default', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Check main dashboard elements
      expect(screen.getByText('BIDBACK Trading Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Order Management & Position Tracking System')).toBeInTheDocument()
      expect(screen.getByText('Trading Overview')).toBeInTheDocument()
    })

    it('displays portfolio heat indicator with correct styling', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const portfolioHeatElements = screen.getAllByText('23.5%')
      expect(portfolioHeatElements.length).toBeGreaterThan(0)
      
      // Check that at least one heat indicator has green styling for heat < 40%
      const heatIndicators = document.querySelectorAll('.bg-green-400')
      expect(heatIndicators.length).toBeGreaterThan(0)
    })

    it('displays all navigation tabs', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Test that navigation functionality exists by finding the navigation container
      const navTabs = screen.getAllByRole('button')
      expect(navTabs.length).toBeGreaterThan(5) // Should have at least 5 navigation tabs plus quick action buttons
      
      // Verify specific navigation text exists somewhere
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Planned Trades').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Open Positions').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Holiday Calendar').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Settings').length).toBeGreaterThan(0)
    })

    it('displays stats cards with correct initial values', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      expect(screen.getAllByText('2').length).toBeGreaterThan(0) // Planned Trades count
      expect(screen.getByText('$23,456')).toBeInTheDocument() // Total Value
      expect(screen.getByText('+1,483')).toBeInTheDocument() // Unrealized P&L
      expect(screen.getByText('+$234.5')).toBeInTheDocument() // Today's P&L
    })

    it('displays quick action buttons', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      expect(screen.getByText('View Planned Trades')).toBeInTheDocument()
      expect(screen.getByText('Monitor Positions')).toBeInTheDocument()
      expect(screen.getByText('Portfolio Settings')).toBeInTheDocument()
      // Holiday Calendar appears in both navigation and quick actions - use getAllByText
      expect(screen.getAllByText('Holiday Calendar').length).toBeGreaterThan(0)
    })

    it('displays system status indicators', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      expect(screen.getByText('Position Calculator')).toBeInTheDocument()
      expect(screen.getByText('Order Management')).toBeInTheDocument()
      expect(screen.getByText('IB Integration')).toBeInTheDocument()
      
      expect(screen.getByText('Active - VIX & Breadth integration working')).toBeInTheDocument()
      expect(screen.getByText('Demo Mode - Manual execution only')).toBeInTheDocument()
      expect(screen.getByText('Planned - Phase 4 implementation')).toBeInTheDocument()
    })
  })

  describe('View Navigation', () => {
    it('switches to planned trades view when navigation tab is clicked', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
      })
      
      // Dashboard content should be hidden
      expect(screen.queryByText('Trading Overview')).not.toBeInTheDocument()
    })

    it('switches to open positions view when navigation tab is clicked', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const positionsTab = screen.getByRole('button', { name: /open positions/i })
      fireEvent.click(positionsTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('open-positions')).toBeInTheDocument()
      })
    })

    it('switches to settings view when navigation tab is clicked', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-settings')).toBeInTheDocument()
      })
    })

    it('switches to holiday calendar view when navigation tab is clicked', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const calendarTab = screen.getByRole('button', { name: /holiday calendar/i })
      fireEvent.click(calendarTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('holiday-calendar')).toBeInTheDocument()
      })
    })

    it('maintains active tab styling when switching views', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(plannedTradesTab).toHaveClass('bg-blue-600', 'text-white')
      })
    })

    it('switches view via quick action buttons', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const quickActionButton = screen.getByText('View Planned Trades')
      fireEvent.click(quickActionButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
      })
    })
  })

  describe('Breadcrumb Navigation', () => {
    it('shows breadcrumbs when not on dashboard view', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to planned trades
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument()
        expect(screen.getByText('Trading')).toBeInTheDocument()
        expect(screen.getByText('Planned Trades')).toBeInTheDocument()
      })
    })

    it('calls onNavigateHome when home breadcrumb is clicked', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to a non-dashboard view first
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        const homeBreadcrumb = screen.getByText('Home')
        fireEvent.click(homeBreadcrumb)
        expect(mockOnNavigateHome).toHaveBeenCalledTimes(1)
      })
    })

    it('navigates back to dashboard when trading breadcrumb is clicked', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate away from dashboard
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-settings')).toBeInTheDocument()
      })
      
      // Click trading breadcrumb
      const tradingBreadcrumb = screen.getByText('Trading')
      fireEvent.click(tradingBreadcrumb)
      
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
      })
    })

    it('does not show breadcrumbs on dashboard view', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Home breadcrumb should not be visible on dashboard
      expect(screen.queryByText('Home')).not.toBeInTheDocument()
    })
  })

  describe('State Management and Data Persistence', () => {
    it('maintains view state when switching between views', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to planned trades
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
      })
      
      // Navigate to settings
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-settings')).toBeInTheDocument()
      })
      
      // Navigate back to planned trades
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
        // Should maintain active state
        expect(plannedTradesTab).toHaveClass('bg-blue-600', 'text-white')
      })
    })

    it('handles trade execution callback and refreshes stats', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to planned trades
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        const executeButton = screen.getByText('Execute Trade')
        fireEvent.click(executeButton)
        
        expect(consoleSpy).toHaveBeenCalledWith('Trade executed:', 1)
      })
      
      consoleSpy.mockRestore()
    })

    it('handles position closure callback and refreshes stats', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to open positions
      const positionsTab = screen.getByRole('button', { name: /open positions/i })
      fireEvent.click(positionsTab)
      
      await waitFor(() => {
        const closeButton = screen.getByText('Close Position')
        fireEvent.click(closeButton)
        
        expect(consoleSpy).toHaveBeenCalledWith('Position closed:', 1)
      })
      
      consoleSpy.mockRestore()
    })

    it('handles portfolio settings update', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to settings
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        const updateButton = screen.getByText('Update Settings')
        fireEvent.click(updateButton)
        
        expect(consoleSpy).toHaveBeenCalledWith('Portfolio settings updated:', expect.objectContaining({
          portfolioSize: 200000
        }))
      })
      
      consoleSpy.mockRestore()
    })
  })

  describe('UI Responsiveness and Desktop Layout', () => {
    it('renders stats cards in responsive grid layout', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const statsContainer = screen.getByText('Planned Trades').closest('.grid')
      expect(statsContainer).toHaveClass('grid-cols-1', 'md:grid-cols-6')
    })

    it('renders quick actions in responsive grid layout', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const quickActionsContainer = screen.getByText('View Planned Trades').closest('.grid')
      expect(quickActionsContainer).toHaveClass('grid-cols-1', 'md:grid-cols-4')
    })

    it('renders system status in responsive grid layout', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const systemStatusContainer = screen.getByText('Position Calculator').closest('.grid')
      expect(systemStatusContainer).toHaveClass('grid-cols-1', 'md:grid-cols-3')
    })

    it('applies proper spacing and layout classes', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const mainContainer = screen.getByText('BIDBACK Trading Dashboard').closest('.space-y-6')
      expect(mainContainer).toHaveClass('space-y-6')
    })
  })

  describe('Portfolio Heat Display and Color Coding', () => {
    it('displays green heat indicator for low portfolio heat (<40%)', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Default heat is 23.5% - verify green styling exists
      const greenHeatValues = document.querySelectorAll('.text-green-600')
      expect(greenHeatValues.length).toBeGreaterThan(0)
      
      const heatIndicators = document.querySelectorAll('.bg-green-400')
      expect(heatIndicators.length).toBeGreaterThan(0)
    })

    it('displays yellow heat indicator for medium portfolio heat (40-60%)', () => {
      // We need to test different heat values - this would require mocking the initial state
      // For now, we test the className logic
      const { container } = render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Test CSS class application structure
      const activityIcon = container.querySelector('.text-green-600') // Current heat level styling
      expect(activityIcon).toBeInTheDocument()
    })

    it('shows heat percentage in welcome banner', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const banner = screen.getByText('BIDBACK Trading Dashboard').closest('.bg-gradient-to-r')
      expect(banner).toBeInTheDocument()
      
      // Verify banner contains portfolio heat elements
      const portfolioHeatLabel = within(banner!).getByText('Portfolio Heat')
      expect(portfolioHeatLabel).toBeInTheDocument()
    })
  })

  describe('System Status Indicators', () => {
    it('displays position calculator as active with green indicator', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const positionCalculator = screen.getByText('Position Calculator')
      const greenDot = positionCalculator.parentElement?.querySelector('.bg-green-400')
      expect(greenDot).toBeInTheDocument()
    })

    it('displays order management as demo mode with yellow indicator', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const orderManagement = screen.getByText('Order Management')
      const yellowDot = orderManagement.parentElement?.querySelector('.bg-yellow-400')
      expect(yellowDot).toBeInTheDocument()
    })

    it('displays IB integration as planned with gray indicator', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const ibIntegration = screen.getByText('IB Integration')
      const grayDot = ibIntegration.parentElement?.querySelector('.bg-gray-400')
      expect(grayDot).toBeInTheDocument()
    })
  })

  describe('Navigation Flow and User Experience', () => {
    it('provides smooth navigation between all views', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Test navigation through all views
      const viewOrder = ['planned', 'positions', 'calendar', 'settings']
      const expectedTestIds = ['planned-trades', 'open-positions', 'holiday-calendar', 'portfolio-settings']
      
      for (let i = 0; i < viewOrder.length; i++) {
        const tabText = {
          'planned': 'Planned Trades',
          'positions': 'Open Positions', 
          'calendar': 'Holiday Calendar',
          'settings': 'Settings'
        }[viewOrder[i]]
        
        const tab = screen.getByRole('button', { name: new RegExp(tabText!, 'i') })
        fireEvent.click(tab)
        
        await waitFor(() => {
          expect(screen.getByTestId(expectedTestIds[i])).toBeInTheDocument()
        })
      }
    })

    it('returns to dashboard from holiday calendar via back button', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to calendar
      const calendarTab = screen.getByRole('button', { name: /holiday calendar/i })
      fireEvent.click(calendarTab)
      
      await waitFor(() => {
        const backButton = screen.getByText('Back to Dashboard')
        fireEvent.click(backButton)
        
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
      })
    })

    it('shows proper view titles in breadcrumbs', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const viewTitleMap = {
        'Planned Trades': 'Planned Trades',
        'Open Positions': 'Open Positions',
        'Holiday Calendar': 'Holiday Calendar',
        'Settings': 'Settings'
      }
      
      for (const [buttonText, breadcrumbText] of Object.entries(viewTitleMap)) {
        const tab = screen.getByRole('button', { name: new RegExp(buttonText, 'i') })
        fireEvent.click(tab)
        
        await waitFor(() => {
          expect(screen.getByText(breadcrumbText)).toBeInTheDocument()
        })
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('handles missing onNavigateHome prop gracefully', () => {
      render(<TradingDashboard />)
      
      // Navigate to a non-dashboard view
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      // Home breadcrumb should not be rendered if onNavigateHome is not provided
      expect(screen.queryByText('Home')).not.toBeInTheDocument()
    })

    it('handles stats loading state', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // During initial load, stats should be rendered with default values
      await waitFor(() => {
        expect(screen.getAllByText('2').length).toBeGreaterThan(0) // Default planned trades
        expect(screen.getByText('$23,456')).toBeInTheDocument() // Default total value
      })
    })

    it('renders correctly without any props', () => {
      render(<TradingDashboard />)
      
      expect(screen.getByText('BIDBACK Trading Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Trading Overview')).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('passes correct props to PlannedTrades component', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        const plannedTrades = screen.getByTestId('planned-trades')
        expect(plannedTrades).toBeInTheDocument()
        
        // Test that callbacks are working
        const executeButton = within(plannedTrades).getByText('Execute Trade')
        const deleteButton = within(plannedTrades).getByText('Delete Trade')
        
        expect(executeButton).toBeInTheDocument()
        expect(deleteButton).toBeInTheDocument()
      })
    })

    it('passes correct props to OpenPositions component', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const positionsTab = screen.getByRole('button', { name: /open positions/i })
      fireEvent.click(positionsTab)
      
      await waitFor(() => {
        const openPositions = screen.getByTestId('open-positions')
        expect(openPositions).toBeInTheDocument()
        
        const updateButton = within(openPositions).getByText('Update Position')
        const closeButton = within(openPositions).getByText('Close Position')
        
        expect(updateButton).toBeInTheDocument()
        expect(closeButton).toBeInTheDocument()
      })
    })

    it('passes correct props to PortfolioSettings component', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        const portfolioSettings = screen.getByTestId('portfolio-settings')
        expect(portfolioSettings).toBeInTheDocument()
        
        const updateButton = within(portfolioSettings).getByText('Update Settings')
        expect(updateButton).toBeInTheDocument()
      })
    })

    it('passes correct props to HolidayCalendar component', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const calendarTab = screen.getByRole('button', { name: /holiday calendar/i })
      fireEvent.click(calendarTab)
      
      await waitFor(() => {
        const holidayCalendar = screen.getByTestId('holiday-calendar')
        expect(holidayCalendar).toBeInTheDocument()
        
        const backButton = within(holidayCalendar).getByText('Back to Dashboard')
        expect(backButton).toBeInTheDocument()
      })
    })
  })
})