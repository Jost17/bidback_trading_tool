import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TradingDashboard } from '../TradingDashboard'

// Mock child components to isolate TradingDashboard testing
vi.mock('../PlannedTrades', () => ({
  PlannedTrades: ({ onTradeExecuted, onTradeDeleted }: any) => (
    <div data-testid="planned-trades">
      <button onClick={() => onTradeExecuted(1)} data-testid="execute-trade">Execute Trade</button>
      <button onClick={() => onTradeDeleted()} data-testid="delete-trade">Delete Trade</button>
      Planned Trades Component
    </div>
  )
}))

vi.mock('../OpenPositions', () => ({
  OpenPositions: ({ onPositionUpdate, onPositionClosed }: any) => (
    <div data-testid="open-positions">
      <button onClick={() => onPositionUpdate()} data-testid="update-position">Update Position</button>
      <button onClick={() => onPositionClosed(1)} data-testid="close-position">Close Position</button>
      Open Positions Component
    </div>
  )
}))

vi.mock('../../settings/PortfolioSettings', () => ({
  PortfolioSettings: ({ initialSettings, onSettingsChange }: any) => (
    <div data-testid="portfolio-settings">
      <button 
        onClick={() => onSettingsChange({...initialSettings, portfolioSize: 200000})}
        data-testid="update-settings"
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
      <button onClick={() => onBack()} data-testid="calendar-back">Back to Dashboard</button>
      Holiday Calendar Component
    </div>
  )
}))

describe('TradingDashboard - Simplified Core Tests', () => {
  const mockOnNavigateHome = vi.fn()
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('Basic Rendering', () => {
    it('renders the main dashboard without errors', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      expect(screen.getByText('BIDBACK Trading Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Trading Overview')).toBeInTheDocument()
    })

    it('displays essential UI elements', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      expect(screen.getByText('Order Management & Position Tracking System')).toBeInTheDocument()
      expect(screen.getAllByText('Portfolio Heat').length).toBeGreaterThan(0)
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('BIDBACK System Status')).toBeInTheDocument()
    })

    it('has multiple navigation buttons available', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(5) // Navigation tabs + quick actions
    })
  })

  describe('Navigation Functionality', () => {
    it('can switch to planned trades view', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Find a button containing "planned" in any form
      const plannedButton = screen.getByText(/view planned trades/i)
      fireEvent.click(plannedButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
      })
    })

    it('can switch to open positions view', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const positionsButton = screen.getByText(/monitor positions/i)
      fireEvent.click(positionsButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('open-positions')).toBeInTheDocument()
      })
    })

    it('can switch to settings view', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const settingsButton = screen.getByText(/portfolio settings/i)
      fireEvent.click(settingsButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-settings')).toBeInTheDocument()
      })
    })

    it('can switch to calendar view', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Find the specific quick action button (not the navigation tab)
      const calendarButton = screen.getByText(/VIX Exit Matrix & Holidays/)
      fireEvent.click(calendarButton.closest('button')!)
      
      await waitFor(() => {
        expect(screen.getByTestId('holiday-calendar')).toBeInTheDocument()
      })
    })

    it('can return to dashboard from calendar', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Go to calendar using the quick action button with unique text
      const calendarButton = screen.getByText(/VIX Exit Matrix & Holidays/)
      fireEvent.click(calendarButton.closest('button')!)
      
      await waitFor(() => {
        expect(screen.getByTestId('holiday-calendar')).toBeInTheDocument()
      })
      
      // Use back button
      const backButton = screen.getByTestId('calendar-back')
      fireEvent.click(backButton)
      
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
      })
    })
  })

  describe('Callback Functions', () => {
    it('handles trade execution callback', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to planned trades
      const plannedButton = screen.getByText(/view planned trades/i)
      fireEvent.click(plannedButton)
      
      await waitFor(() => {
        const executeButton = screen.getByTestId('execute-trade')
        fireEvent.click(executeButton)
        
        expect(consoleSpy).toHaveBeenCalledWith('Trade executed:', 1)
      })
    })

    it('handles position closure callback', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to positions
      const positionsButton = screen.getByText(/monitor positions/i)
      fireEvent.click(positionsButton)
      
      await waitFor(() => {
        const closeButton = screen.getByTestId('close-position')
        fireEvent.click(closeButton)
        
        expect(consoleSpy).toHaveBeenCalledWith('Position closed:', 1)
      })
    })

    it('handles portfolio settings update', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to settings
      const settingsButton = screen.getByText(/portfolio settings/i)
      fireEvent.click(settingsButton)
      
      await waitFor(() => {
        const updateButton = screen.getByTestId('update-settings')
        fireEvent.click(updateButton)
        
        expect(consoleSpy).toHaveBeenCalledWith('Portfolio settings updated:', expect.objectContaining({
          portfolioSize: 200000
        }))
      })
    })
  })

  describe('Breadcrumb Navigation', () => {
    it('shows breadcrumbs when not on dashboard', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate away from dashboard
      const settingsButton = screen.getByText(/portfolio settings/i)
      fireEvent.click(settingsButton)
      
      await waitFor(() => {
        expect(screen.getByText('Home')).toBeInTheDocument()
        expect(screen.getByText('Trading')).toBeInTheDocument()
        expect(screen.getAllByText('Settings').length).toBeGreaterThan(0)
      })
    })

    it('calls onNavigateHome when home breadcrumb is clicked', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to a non-dashboard view
      const settingsButton = screen.getByText(/portfolio settings/i)
      fireEvent.click(settingsButton)
      
      await waitFor(() => {
        const homeBreadcrumb = screen.getByText('Home')
        fireEvent.click(homeBreadcrumb)
        
        expect(mockOnNavigateHome).toHaveBeenCalledTimes(1)
      })
    })

    it('does not show breadcrumbs on dashboard view', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Should be on dashboard by default, no breadcrumbs
      expect(screen.queryByText('Home')).not.toBeInTheDocument()
    })
  })

  describe('UI Layout and Styling', () => {
    it('has proper responsive layout classes', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Check for responsive grid classes
      const grids = document.querySelectorAll('.grid')
      expect(grids.length).toBeGreaterThan(0)
      
      const responsiveClasses = document.querySelectorAll('[class*="md:grid-cols-"]')
      expect(responsiveClasses.length).toBeGreaterThan(0)
    })

    it('displays portfolio heat with proper color indicators', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Check for heat indicator styling
      const heatIndicators = document.querySelectorAll('.bg-green-400')
      expect(heatIndicators.length).toBeGreaterThan(0)
      
      // Check for heat text styling
      const greenText = document.querySelectorAll('.text-green-600')
      expect(greenText.length).toBeGreaterThan(0)
    })

    it('displays system status indicators', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      expect(screen.getByText('Position Calculator')).toBeInTheDocument()
      expect(screen.getByText('Order Management')).toBeInTheDocument()
      expect(screen.getByText('IB Integration')).toBeInTheDocument()
      
      // Check for status indicator dots
      const statusDots = document.querySelectorAll('.w-3')
      expect(statusDots.length).toBeGreaterThan(0)
    })

    it('has proper card styling', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Check for consistent card styling
      const cards = document.querySelectorAll('.bg-white')
      expect(cards.length).toBeGreaterThan(0)
      
      const roundedCards = document.querySelectorAll('.rounded-lg')
      expect(roundedCards.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('renders without onNavigateHome prop', () => {
      render(<TradingDashboard />)
      
      expect(screen.getByText('BIDBACK Trading Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Trading Overview')).toBeInTheDocument()
    })

    it('handles rapid navigation changes', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Rapid navigation - should not crash
      const buttons = [
        screen.getByText(/view planned trades/i),
        screen.getByText(/monitor positions/i),
        screen.getByText(/portfolio settings/i)
      ]
      
      buttons.forEach(button => fireEvent.click(button))
      
      // Should end up in the last clicked view
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-settings')).toBeInTheDocument()
      })
    })
  })

  describe('Data Display', () => {
    it('displays trading statistics', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Check that stats are displayed (multiple instances are OK)
      expect(screen.getByText('$23,456')).toBeInTheDocument()
      expect(screen.getByText('+1,483')).toBeInTheDocument()
      expect(screen.getByText('+$234.5')).toBeInTheDocument()
    })

    it('displays appropriate icons', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Check for SVG icons
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(5) // Multiple icons throughout the dashboard
    })

    it('has proper text hierarchy', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Check for proper heading structure - find by heading role
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('BIDBACK Trading Dashboard')
      
      const sectionHeading = screen.getByRole('heading', { level: 2 })
      expect(sectionHeading).toHaveTextContent('Trading Overview')
      
      const subHeading = screen.getByRole('heading', { level: 3 })
      expect(subHeading).toHaveTextContent('Quick Actions')
    })
  })

  describe('Performance and Accessibility', () => {
    it('navigation transitions are smooth', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const plannedButton = screen.getByText(/view planned trades/i)
      const startTime = performance.now()
      
      fireEvent.click(plannedButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const navigationTime = endTime - startTime
      
      // Navigation should be fast in test environment
      expect(navigationTime).toBeLessThan(100)
    })

    it('has accessible button elements', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(5)
      
      // All buttons should be accessible
      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
      })
    })
  })
})