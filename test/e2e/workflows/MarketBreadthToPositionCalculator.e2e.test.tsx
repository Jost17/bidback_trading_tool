/**
 * End-to-End Tests: Market Breadth Entry → Position Calculator → Exit Strategy
 * 
 * Tests complete user workflows from market breadth data entry through position
 * calculation and exit strategy determination. Validates data flow, real-time
 * updates, and workflow integrity across components.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import { 
  performanceMonitor, 
  userSimulator, 
  marketBreadthScenarios,
  validateStatePersistence,
  validateRealTimeUpdates,
  renderWithRouter
} from '../utils/TestUtils'
import { TradingContext } from '../../../src/renderer/context/TradingContext'
import { MarketBreadthDashboard } from '../../../src/renderer/components/market-breadth/MarketBreadthDashboard'
import { PositionCalculator } from '../../../src/renderer/components/market-breadth/PositionCalculator'
import { TradingDashboard } from '../../../src/renderer/components/trading/TradingDashboard'

// Mock trading context state
const mockTradingContextValue = {
  portfolioSize: 100000,
  baseAllocation: 10,
  riskTolerance: 'Moderate' as const,
  breadthData: null,
  positionCalculations: null,
  plannedTrades: [],
  openPositions: [],
  updatePortfolioSettings: vi.fn(),
  updateBreadthData: vi.fn(),
  addPlannedTrade: vi.fn(),
  executeTradeFromPlan: vi.fn(),
  updateOpenPosition: vi.fn(),
  closePosition: vi.fn()
}

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <TradingContext.Provider value={mockTradingContextValue}>
      {children}
    </TradingContext.Provider>
  )
}

describe('E2E: Market Breadth → Position Calculator → Exit Strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    performanceMonitor.startMonitoring('market-breadth-workflow')
  })

  afterEach(() => {
    cleanup()
    const memoryLeak = performanceMonitor.checkMemoryLeak('market-breadth-workflow')
    expect(memoryLeak).toBeLessThan(1024 * 1024) // Less than 1MB memory increase
  })

  test('Normal Market Scenario: T2108: 25.3, VIX: 18.5 → Normal multiplier', async () => {
    const scenario = marketBreadthScenarios.normalMarket

    // Render the complete workflow
    const { rerender } = performanceMonitor.measureRenderTime('market-breadth-workflow', () =>
      renderWithRouter(
        <TestWrapper>
          <div data-testid="market-breadth-page">
            <MarketBreadthDashboard />
          </div>
          <div data-testid="position-calculator-component">
            <PositionCalculator />
          </div>
        </TestWrapper>
      )
    )

    // Step 1: Enter market breadth data
    await performanceMonitor.measureInteractionLatency('market-breadth-workflow', async () => {
      await userSimulator.enterMarketBreadthData(scenario)
    })

    // Step 2: Verify BIDBACK calculations
    await waitFor(() => {
      expect(screen.getByTestId('breadth-score-display')).toHaveTextContent(/normal/i)
      expect(screen.getByTestId('vix-category')).toHaveTextContent(/normal/i)
      expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent('1.0x')
    })

    // Step 3: Verify position calculator updates
    await validateRealTimeUpdates(
      async () => {
        // Trigger position calculation
        const calculateButton = screen.getByRole('button', { name: /calculate.*position/i })
        await userSimulator.user.click(calculateButton)
      },
      [
        'position-size-display',
        'risk-amount-display',
        'expected-return-display'
      ]
    )

    // Step 4: Verify exit strategy display
    await waitFor(() => {
      expect(screen.getByTestId('exit-strategy-panel')).toBeInTheDocument()
      expect(screen.getByTestId('stop-loss-price')).toBeInTheDocument()
      expect(screen.getByTestId('profit-target-1')).toBeInTheDocument()
      expect(screen.getByTestId('profit-target-2')).toBeInTheDocument()
      expect(screen.getByTestId('max-hold-days')).toHaveTextContent(/7-10.*days/i)
    })

    // Validate performance
    performanceMonitor.validatePerformance('market-breadth-workflow', {
      componentRenderTime: 100, // 100ms max render time
      interactionLatency: 200,   // 200ms max interaction response
      dataProcessingTime: 50     // 50ms max calculation time
    })
  })

  test('Big Opportunity Detection: T2108: 18.2, VIX: 26.7 → 2.0x multiplier, $24,000 position', async () => {
    const scenario = marketBreadthScenarios.bigOpportunity

    performanceMonitor.measureRenderTime('big-opportunity-workflow', () =>
      renderWithRouter(
        <TestWrapper>
          <div data-testid="market-breadth-page">
            <MarketBreadthDashboard />
          </div>
          <div data-testid="position-calculator-component">
            <PositionCalculator />
          </div>
        </TestWrapper>
      )
    )

    // Enter market breadth data for big opportunity
    await userSimulator.enterMarketBreadthData(scenario)

    // Verify big opportunity detection
    await waitFor(() => {
      expect(screen.getByTestId('opportunity-type')).toHaveTextContent(/big.*opportunity/i)
      expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent('2.0x')
      expect(screen.getByTestId('vix-category')).toHaveTextContent(/high/i)
    })

    // Verify enhanced position sizing
    await waitFor(() => {
      const positionSize = screen.getByTestId('calculated-position-size')
      expect(positionSize).toHaveTextContent(/20,000|24,000/i) // $100k * 10% base * 2.0x = $20k, with VIX adjustment ~$24k
    })

    // Verify VIX-adjusted exit strategy
    await waitFor(() => {
      expect(screen.getByTestId('vix-matrix-display')).toBeInTheDocument()
      expect(screen.getByTestId('vix-range')).toHaveTextContent(/25-35/i)
      expect(screen.getByTestId('max-hold-days')).toHaveTextContent(/5.*days/i)
    })

    // Validate state persistence across components
    await validateStatePersistence(
      ['breadth-score-component', 'position-calculator-component', 'exit-strategy-component'],
      {
        'breadth-score-data': scenario.expectedMultiplier,
        'position-calculator-data': 24000,
        'exit-strategy-data': '5 days'
      }
    )
  })

  test('Extreme Volatility Scenario: VIX > 40 → Maximum position sizing with tight stops', async () => {
    const scenario = marketBreadthScenarios.extremeVolatility

    renderWithRouter(
      <TestWrapper>
        <div data-testid="market-breadth-page">
          <MarketBreadthDashboard />
        </div>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
      </TestWrapper>
    )

    // Enter extreme volatility data
    await userSimulator.enterMarketBreadthData(scenario)

    // Verify extreme volatility handling
    await waitFor(() => {
      expect(screen.getByTestId('vix-category')).toHaveTextContent(/extreme/i)
      expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent('3.0x')
      expect(screen.getByTestId('volatility-warning')).toBeInTheDocument()
    })

    // Verify maximum position sizing with risk controls
    await waitFor(() => {
      const positionSize = screen.getByTestId('calculated-position-size')
      expect(positionSize).toHaveTextContent(/30,000/i) // Base * 3.0x multiplier
      
      const riskWarning = screen.getByTestId('risk-warning')
      expect(riskWarning).toHaveTextContent(/extreme.*volatility/i)
    })

    // Verify tight exit strategy
    await waitFor(() => {
      expect(screen.getByTestId('max-hold-days')).toHaveTextContent(/3.*days/i)
      expect(screen.getByTestId('stop-loss-tight')).toBeInTheDocument()
      expect(screen.getByTestId('profit-targets-expanded')).toBeInTheDocument()
    })
  })

  test('Data Flow Integrity: Changes propagate correctly across all components', async () => {
    renderWithRouter(
      <TestWrapper>
        <div data-testid="market-breadth-page">
          <MarketBreadthDashboard />
        </div>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
        <div data-testid="trading-dashboard-page">
          <TradingDashboard />
        </div>
      </TestWrapper>
    )

    // Test real-time data propagation
    const scenario1 = marketBreadthScenarios.normalMarket
    await userSimulator.enterMarketBreadthData(scenario1)

    // Verify initial state
    await waitFor(() => {
      expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent('1.0x')
    })

    // Change to big opportunity scenario
    const scenario2 = marketBreadthScenarios.bigOpportunity
    await userSimulator.enterMarketBreadthData(scenario2)

    // Validate all components update in real-time
    await validateRealTimeUpdates(
      async () => {
        // No additional action needed, data should update automatically
      },
      [
        'opportunity-multiplier',
        'calculated-position-size',
        'max-hold-days',
        'stop-loss-price',
        'profit-target-1'
      ]
    )

    // Verify no stale data remains
    await waitFor(() => {
      expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent('2.0x')
      expect(screen.getByTestId('opportunity-multiplier')).not.toHaveTextContent('1.0x')
    })
  })

  test('Component State Persistence During Navigation', async () => {
    renderWithRouter(
      <TestWrapper>
        <div data-testid="market-breadth-page">
          <MarketBreadthDashboard />
        </div>
        <div data-testid="trading-dashboard-page" style={{ display: 'none' }}>
          <TradingDashboard />
        </div>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
      </TestWrapper>
    )

    // Enter data
    const scenario = marketBreadthScenarios.bigOpportunity
    await userSimulator.enterMarketBreadthData(scenario)

    // Capture current state
    const initialMultiplier = screen.getByTestId('opportunity-multiplier').textContent
    const initialPositionSize = screen.getByTestId('calculated-position-size').textContent

    // Simulate navigation away and back
    await userSimulator.navigateTo('trading')
    await userSimulator.navigateTo('market-breadth')

    // Verify state persistence
    await waitFor(() => {
      expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent(initialMultiplier!)
      expect(screen.getByTestId('calculated-position-size')).toHaveTextContent(initialPositionSize!)
    })

    // Verify data is still functional
    const newScenario = marketBreadthScenarios.normalMarket
    await userSimulator.enterMarketBreadthData(newScenario)

    await waitFor(() => {
      expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent('1.0x')
      expect(screen.getByTestId('opportunity-multiplier')).not.toHaveTextContent('2.0x')
    })
  })

  test('Performance Under Rapid Data Changes', async () => {
    const performanceTestName = 'rapid-data-changes'
    performanceMonitor.startMonitoring(performanceTestName)

    renderWithRouter(
      <TestWrapper>
        <div data-testid="market-breadth-page">
          <MarketBreadthDashboard />
        </div>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
      </TestWrapper>
    )

    // Rapidly change between scenarios
    const scenarios = Object.values(marketBreadthScenarios)
    
    for (let i = 0; i < scenarios.length; i++) {
      await performanceMonitor.measureInteractionLatency(performanceTestName, async () => {
        await userSimulator.enterMarketBreadthData(scenarios[i])
        
        // Wait for calculations to complete
        await waitFor(() => {
          expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent(`${scenarios[i].expectedMultiplier}x`)
        }, { timeout: 500 })
      })
    }

    // Validate performance remained acceptable
    performanceMonitor.validatePerformance(performanceTestName, {
      interactionLatency: 500, // Max 500ms per scenario change
      dataProcessingTime: 100  // Max 100ms calculation time
    })

    // Check for memory leaks during rapid changes
    const memoryIncrease = performanceMonitor.checkMemoryLeak(performanceTestName)
    expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024) // Less than 2MB increase
  })
})