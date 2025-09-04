import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TradingDashboard } from '../TradingDashboard'

// Mock child components for UI testing
vi.mock('../PlannedTrades', () => ({
  PlannedTrades: () => <div data-testid="planned-trades">Planned Trades View</div>
}))

vi.mock('../OpenPositions', () => ({
  OpenPositions: () => <div data-testid="open-positions">Open Positions View</div>
}))

vi.mock('../../settings/PortfolioSettings', () => ({
  PortfolioSettings: () => <div data-testid="portfolio-settings">Portfolio Settings View</div>
}))

vi.mock('../HolidayCalendar', () => ({
  HolidayCalendar: () => <div data-testid="holiday-calendar">Holiday Calendar View</div>
}))

describe('TradingDashboard - UI and Responsiveness Tests', () => {
  const mockOnNavigateHome = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Layout and Visual Structure', () => {
    it('renders main container with proper spacing', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const mainContainer = screen.getByText('BIDBACK Trading Dashboard').closest('.space-y-6')
      expect(mainContainer).toBeInTheDocument()
      expect(mainContainer).toHaveClass('space-y-6')
    })

    it('displays welcome banner with gradient background', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const banner = screen.getByText('BIDBACK Trading Dashboard').closest('.bg-gradient-to-r')
      expect(banner).toBeInTheDocument()
      expect(banner).toHaveClass('bg-gradient-to-r', 'from-green-600', 'to-blue-700', 'text-white')
    })

    it('displays header section with proper typography', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const title = screen.getByText('BIDBACK Trading Dashboard')
      expect(title).toHaveClass('text-3xl', 'font-bold')
      
      const subtitle = screen.getByText('Order Management & Position Tracking System')
      expect(subtitle).toHaveClass('text-green-100', 'mt-2', 'text-lg')
    })

    it('renders navigation tabs with proper styling', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const navigationContainer = screen.getByText('Dashboard').closest('.bg-white')
      expect(navigationContainer).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'border', 'p-1')
      
      const tabsContainer = navigationContainer?.querySelector('.flex.space-x-1')
      expect(tabsContainer).toBeInTheDocument()
    })
  })

  describe('Responsive Grid Layouts', () => {
    it('stats cards use responsive grid layout', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const statsGrid = screen.getByText('Planned Trades').closest('.grid')
      expect(statsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-6', 'gap-4')
    })

    it('quick actions use responsive grid layout', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const quickActionsGrid = screen.getByText('View Planned Trades').closest('.grid')
      expect(quickActionsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-4', 'gap-4')
    })

    it('system status uses responsive grid layout', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const systemStatusGrid = screen.getByText('Position Calculator').closest('.grid')
      expect(systemStatusGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-3', 'gap-6')
    })

    it('applies correct responsive breakpoint classes', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Check for mobile-first responsive design
      const responsiveElements = document.querySelectorAll('.grid-cols-1')
      expect(responsiveElements.length).toBeGreaterThan(0)
      
      const tabletElements = document.querySelectorAll('[class*="md:grid-cols-"]')
      expect(tabletElements.length).toBeGreaterThan(0)
    })
  })

  describe('Color Coding and Visual Indicators', () => {
    it('displays portfolio heat with correct color coding - low heat', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Portfolio heat is 23.5% (low), should be green
      const greenHeatElements = document.querySelectorAll('.text-green-600')
      expect(greenHeatElements.length).toBeGreaterThan(0)
      
      const heatIndicators = document.querySelectorAll('.bg-green-400')
      expect(heatIndicators.length).toBeGreaterThan(0)
    })

    it('displays portfolio heat indicator in banner with proper styling', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const banner = screen.getByText('BIDBACK Trading Dashboard').closest('.bg-gradient-to-r')
      const heatSection = banner?.querySelector('.text-right')
      
      expect(heatSection).toBeInTheDocument()
      const heatLabel = screen.getByText('Portfolio Heat')
      expect(heatLabel).toHaveClass('text-sm', 'text-green-100')
    })

    it('displays P&L values with correct color coding', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Positive unrealized P&L should be green
      const unrealizedPL = screen.getByText('+1,483')
      expect(unrealizedPL).toHaveClass('text-green-600')
      
      // Positive today's P&L should be green
      const todaysPL = screen.getByText('+$234.5')
      expect(todaysPL).toHaveClass('text-green-600')
    })

    it('system status indicators have correct color coding', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Active system - green
      const positionCalculator = screen.getByText('Position Calculator')
      const greenDot = positionCalculator.parentElement?.querySelector('.bg-green-400')
      expect(greenDot).toBeInTheDocument()
      
      // Demo mode - yellow  
      const orderManagement = screen.getByText('Order Management')
      const yellowDot = orderManagement.parentElement?.querySelector('.bg-yellow-400')
      expect(yellowDot).toBeInTheDocument()
      
      // Planned - gray
      const ibIntegration = screen.getByText('IB Integration')
      const grayDot = ibIntegration.parentElement?.querySelector('.bg-gray-400')
      expect(grayDot).toBeInTheDocument()
    })
  })

  describe('Icons and Visual Elements', () => {
    it('displays appropriate icons for each stat card', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Check that stat cards have icons (icons are rendered as SVG elements)
      const statCards = screen.getAllByText(/Planned Trades|Open Positions|Total Value|Unrealized P&L|Today's P&L|Portfolio Heat/)
      
      statCards.forEach(card => {
        const cardContainer = card.closest('.bg-white')
        const icon = cardContainer?.querySelector('svg')
        expect(icon).toBeInTheDocument()
      })
    })

    it('displays navigation tabs with appropriate icons', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const navigationTabs = screen.getAllByRole('button', { 
        name: /Dashboard|Planned Trades|Open Positions|Holiday Calendar|Settings/i 
      })
      
      navigationTabs.forEach(tab => {
        const icon = tab.querySelector('svg')
        expect(icon).toBeInTheDocument()
      })
    })

    it('displays Target icon in main title', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const titleSection = screen.getByText('BIDBACK Trading Dashboard').parentElement
      const targetIcon = titleSection?.querySelector('svg')
      expect(targetIcon).toBeInTheDocument()
    })

    it('displays quick action buttons with proper icons and styling', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const quickActions = [
        'View Planned Trades',
        'Monitor Positions', 
        'Portfolio Settings',
        'Holiday Calendar'
      ]
      
      quickActions.forEach(actionText => {
        const button = screen.getByText(actionText).closest('button')
        expect(button).toHaveClass('flex', 'items-center', 'justify-center', 'space-x-3')
        
        const icon = button?.querySelector('svg')
        expect(icon).toBeInTheDocument()
      })
    })
  })

  describe('Card Styling and Layout', () => {
    it('applies consistent card styling to stat cards', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const statCardTexts = ['Planned Trades', 'Open Positions', 'Total Value', 'Unrealized P&L', "Today's P&L", 'Portfolio Heat']
      
      statCardTexts.forEach(cardText => {
        const card = screen.getByText(cardText).closest('.bg-white')
        expect(card).toHaveClass('bg-white', 'p-6', 'rounded-lg', 'shadow-sm', 'border')
      })
    })

    it('applies consistent styling to quick action cards', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const quickActionButtons = [
        'View Planned Trades',
        'Monitor Positions',
        'Portfolio Settings', 
        'Holiday Calendar'
      ]
      
      quickActionButtons.forEach(buttonText => {
        const button = screen.getByText(buttonText).closest('button')
        expect(button).toHaveClass('p-4', 'border', 'rounded-lg', 'transition-colors')
        expect(button).toHaveClass(expect.stringMatching(/border-(blue|green|purple|orange)-200/))
        expect(button).toHaveClass(expect.stringMatching(/hover:bg-(blue|green|purple|orange)-50/))
      })
    })

    it('applies proper section container styling', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const sectionHeaders = ['Quick Actions', 'BIDBACK System Status']
      
      sectionHeaders.forEach(headerText => {
        const section = screen.getByText(headerText).closest('.bg-white')
        expect(section).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'border', 'p-6')
      })
    })
  })

  describe('Typography and Text Styling', () => {
    it('applies correct typography hierarchy', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Main title
      const mainTitle = screen.getByText('BIDBACK Trading Dashboard')
      expect(mainTitle).toHaveClass('text-3xl', 'font-bold')
      
      // Section headers
      const sectionHeader = screen.getByText('Trading Overview')
      expect(sectionHeader).toHaveClass('text-xl', 'font-semibold', 'text-gray-900')
      
      // Subsection headers
      const subsectionHeader = screen.getByText('Quick Actions')
      expect(subsectionHeader).toHaveClass('text-lg', 'font-semibold', 'text-gray-900')
    })

    it('displays stat values with proper formatting', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Number formatting
      expect(screen.getByText('$23,456')).toBeInTheDocument() // Formatted currency
      expect(screen.getByText('+1,483')).toBeInTheDocument() // Formatted with plus sign
      expect(screen.getAllByText('23.5%').length).toBeGreaterThan(0) // Percentage formatting
    })

    it('applies proper text colors throughout', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Verify text color classes are applied appropriately
      const grayTexts = document.querySelectorAll('.text-gray-600, .text-gray-900')
      expect(grayTexts.length).toBeGreaterThan(0)
      
      const coloredTexts = document.querySelectorAll('.text-green-600, .text-blue-600, .text-red-600')
      expect(coloredTexts.length).toBeGreaterThan(0)
    })
  })

  describe('Interactive Elements Styling', () => {
    it('navigation tabs have proper hover and active states', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      
      // Initial state
      expect(plannedTradesTab).toHaveClass('text-gray-700')
      
      // Click to activate
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(plannedTradesTab).toHaveClass('bg-blue-600', 'text-white')
      })
    })

    it('quick action buttons have proper hover states', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const quickActionButton = screen.getByText('View Planned Trades').closest('button')
      expect(quickActionButton).toHaveClass('hover:bg-blue-50')
      
      const monitorButton = screen.getByText('Monitor Positions').closest('button')
      expect(monitorButton).toHaveClass('hover:bg-green-50')
    })

    it('breadcrumb buttons have proper styling', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigate to a non-dashboard view to see breadcrumbs
      const settingsTab = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsTab)
      
      await waitFor(() => {
        const homeBreadcrumb = screen.getByText('Home')
        expect(homeBreadcrumb).toHaveClass('text-gray-600', 'hover:text-gray-800')
        
        const tradingBreadcrumb = screen.getByText('Trading')
        expect(tradingBreadcrumb).toHaveClass('text-blue-600', 'hover:text-blue-700')
      })
    })
  })

  describe('Accessibility and Visual Hierarchy', () => {
    it('maintains proper visual hierarchy with headings', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Check that there's a clear visual hierarchy
      const h1 = screen.getByText('BIDBACK Trading Dashboard')
      expect(h1.tagName).toBe('H1')
      
      const h2 = screen.getByText('Trading Overview')
      expect(h2.tagName).toBe('H2')
      
      const h3 = screen.getByText('Quick Actions')
      expect(h3.tagName).toBe('H3')
    })

    it('provides sufficient color contrast for readability', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Text should have appropriate contrast classes
      const primaryTexts = document.querySelectorAll('.text-gray-900')
      expect(primaryTexts.length).toBeGreaterThan(0)
      
      const secondaryTexts = document.querySelectorAll('.text-gray-600')
      expect(secondaryTexts.length).toBeGreaterThan(0)
    })

    it('uses semantic HTML structure', () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      // Navigation should use buttons
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(5) // Multiple navigation and action buttons
      
      // Should have proper heading structure
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      expect(headings.length).toBeGreaterThan(2)
    })
  })

  describe('Loading and Transition States', () => {
    it('handles view transitions smoothly', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      
      // Verify smooth transition classes
      expect(plannedTradesTab).toHaveClass('transition-colors')
      
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        expect(screen.getByTestId('planned-trades')).toBeInTheDocument()
      })
    })

    it('maintains consistent styling during view changes', async () => {
      render(<TradingDashboard onNavigateHome={mockOnNavigateHome} />)
      
      const plannedTradesTab = screen.getByRole('button', { name: /planned trades/i })
      fireEvent.click(plannedTradesTab)
      
      await waitFor(() => {
        // Navigation container should maintain styling
        const navContainer = plannedTradesTab.closest('.bg-white')
        expect(navContainer).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'border')
      })
    })
  })
})