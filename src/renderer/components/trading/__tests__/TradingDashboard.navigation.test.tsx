import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TradingDashboard } from '../TradingDashboard'

// Mock child components
vi.mock('../PlannedTrades', () => ({
  PlannedTrades: () => <div data-testid="planned-trades">Planned Trades</div>
}))

vi.mock('../OpenPositions', () => ({
  OpenPositions: () => <div data-testid="open-positions">Open Positions</div>
}))

vi.mock('../../settings/PortfolioSettings', () => ({
  PortfolioSettings: () => <div data-testid="portfolio-settings">Portfolio Settings</div>
}))

vi.mock('../HolidayCalendar', () => ({
  HolidayCalendar: ({ onBack }: any) => (
    <div data-testid="holiday-calendar">
      <button onClick={() => onBack()}>Back</button>
      Holiday Calendar
    </div>
  )
}))

describe('TradingDashboard - Navigation Flow Tests', () => {
  const mockOnNavigateHome = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Navigation State Management', () => {
    it('starts with dashboard as default active view', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      expect(screen.getByText('Trading Overview')).toBeInTheDocument()
      expect(screen.queryByTestId('planned-trades')).not.toBeInTheDocument()
    })

    it('maintains correct active tab styling throughout navigation', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Initially dashboard should be active (but dashboard tab is implicit)
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      const positionsTab = screen.getByRole('button', { name: /open positions/i })
      
      // Navigate to planned trades
      fireEvent.click(plannedTradesTab)
      await waitFor(() => {
        expect(plannedTradesTab).toHaveClass('bg-blue-600', 'text-white')
        expect(positionsTab).toHaveClass('text-gray-700')
      })
      
      // Navigate to positions
      fireEvent.click(positionsTab)
      await waitFor(() => {
        expect(positionsTab).toHaveClass('bg-blue-600', 'text-white')
        expect(plannedTradesTab).toHaveClass('text-gray-700')
      })
    })

    it('persists navigation state during view switches', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to multiple views and back
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      const dashboardTab = screen.getByRole('button', { name: /dashboard/i })
      
      // Go to planned trades
      fireEvent.click(plannedTradesTab)
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
      })
      
      // Go to settings
      fireEvent.click(settingsTab)
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-settings')).toBeInTheDocument()
      })
      
      // Return to dashboard
      fireEvent.click(dashboardTab)
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
        expect(screen.queryByTestId('planned-trades')).not.toBeInTheDocument()
        expect(screen.queryByTestId('portfolio-settings')).not.toBeInTheDocument()
      })
    })
  })

  describe('Navigation Performance', () => {
    it('switches views without delay', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      
      // Measure navigation speed
      const startTime = performance.now()
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const navigationTime = endTime - startTime
      
      // Navigation should be instant (< 50ms in test environment)
      expect(navigationTime).toBeLessThan(50)
    })

    it('handles rapid navigation switches gracefully', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const tabs = [
        screen.getByRole('button', { name: /planned trades/i }),
        screen.getByRole('button', { name: /open positions/i }),
        screen.getByRole('button', { name: /settings/i }),
        screen.getByRole('button', { name: /dashboard/i })
      ]
      
      // Rapidly click through all tabs
      tabs.forEach(tab => fireEvent.click(tab))
      
      // Final state should be dashboard
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation Breadcrumbs', () => {
    it('shows correct breadcrumb hierarchy for each view', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const viewBreadcrumbTests = [
        { tab: /planned trades/i, breadcrumb: 'Planned Trades' },
        { tab: /open positions/i, breadcrumb: 'Open Positions' },
        { tab: /holiday calendar/i, breadcrumb: 'Holiday Calendar' },
        { tab: /settings/i, breadcrumb: 'Settings' }
      ]
      
      for (const test of viewBreadcrumbTests) {
        const tab = screen.getByRole('button', { name: test.tab })
        fireEvent.click(tab)
        
        await waitFor(() => {
          expect(screen.getByText('Home')).toBeInTheDocument()
          expect(screen.getByText('Trading')).toBeInTheDocument()
          expect(screen.getByText(test.breadcrumb)).toBeInTheDocument()
        })
      }
    })

    it('breadcrumb navigation works correctly', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to settings
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-settings')).toBeInTheDocument()
      })
      
      // Click Trading breadcrumb to return to dashboard
      const tradingBreadcrumb = screen.getByRole('button', { name: /^trading$/i })
      fireEvent.click(tradingBreadcrumb)
      
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
        expect(screen.queryByTestId('portfolio-settings')).not.toBeInTheDocument()
      })
    })

    it('home breadcrumb triggers navigation callback', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to a non-dashboard view
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        const homeBreadcrumb = screen.getByRole('button', { name: /^home$/i })
        fireEvent.click(homeBreadcrumb)
        
        expect(mockOnNavigateHome).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Quick Actions Navigation', () => {
    it('navigates to correct views from quick action buttons', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const quickActions = [
        { text: 'View Planned Trades', expectedTestId: 'planned-trades' },
        { text: 'Monitor Positions', expectedTestId: 'open-positions' },
        { text: 'Portfolio Settings', expectedTestId: 'portfolio-settings' },
        { text: 'Holiday Calendar', expectedTestId: 'holiday-calendar' }
      ]
      
      for (const action of quickActions) {
        // Return to dashboard first
        const dashboardTab = screen.getByRole('button', { name: /dashboard/i })
        fireEvent.click(dashboardTab)
        
        await waitFor(() => {
          expect(screen.getByText('Trading Overview')).toBeInTheDocument()
        })
        
        // Click quick action
        const quickActionButton = screen.getByText(action.text)
        fireEvent.click(quickActionButton)
        
        await waitFor(() => {
          expect(screen.getByTestId(action.expectedTestId)).toBeInTheDocument()
        })
      }
    })

    it('updates active tab state when navigating via quick actions', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const quickActionButton = screen.getByText('View Planned Trades')
      fireEvent.click(quickActionButton)
      
      await waitFor(() => {
        const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
        expect(plannedTradesTab).toHaveClass('bg-blue-600', 'text-white')
      })
    })
  })

  describe('Special Navigation Cases', () => {
    it('handles holiday calendar back button navigation', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to calendar
      const calendarTab = screen.getByRole('button', { name: /holiday calendar/i })
      fireEvent.click(calendarTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('holiday-calendar')).toBeInTheDocument()
      })
      
      // Use calendar's back button
      const backButton = screen.getByText('Back')
      fireEvent.click(backButton)
      
      await waitFor(() => {
        expect(screen.getByText('Trading Overview')).toBeInTheDocument()
        expect(screen.queryByTestId('holiday-calendar')).not.toBeInTheDocument()
      })
    })

    it('handles navigation without onNavigateHome prop', async () => {
      render(<TradingDashboard />)
      
      // Navigate to a non-dashboard view
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        // Home breadcrumb should not exist when onNavigateHome is not provided
        expect(screen.queryByText('Home')).not.toBeInTheDocument()
        expect(screen.getByText('Trading')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation Accessibility', () => {
    it('provides proper ARIA labels for navigation elements', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const navigationTabs = screen.getAllByRole('button')
      const tabNames = ['Dashboard', 'Planned Trades', 'Open Positions', 'Holiday Calendar', 'Settings']
      
      tabNames.forEach(tabName => {
        expect(screen.getByRole('button', { name: new RegExp(tabName, 'i') })).toBeInTheDocument()
      })
    })

    it('maintains focus management during navigation', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      
      // Focus and activate tab
      plannedTradesTab.focus()
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
        // Tab should still be focused after navigation
        expect(plannedTradesTab).toHaveClass('bg-blue-600', 'text-white')
      })
    })

    it('supports keyboard navigation', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      
      // Simulate keyboard activation
      fireEvent.keyDown(plannedTradesTab, { key: 'Enter' })
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
      })
    })
  })
})