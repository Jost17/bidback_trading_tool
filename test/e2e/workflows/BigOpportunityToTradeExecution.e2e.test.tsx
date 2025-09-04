/**
 * End-to-End Tests: Big Opportunity Detection → Position Planning → Trade Execution
 * 
 * Tests the complete workflow from detecting big opportunities through position
 * planning and actual trade execution. Validates signal detection, position
 * sizing, risk management, and execution logic.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import { 
  performanceMonitor, 
  userSimulator, 
  marketBreadthScenarios,
  validateStatePersistence,
  simulateErrorAndRecover,
  renderWithRouter,
  type TradingWorkflowData
} from '../utils/TestUtils'
import { TradingContext } from '../../../src/renderer/context/TradingContext'
import { MarketBreadthDashboard } from '../../../src/renderer/components/market-breadth/MarketBreadthDashboard'
import { PositionCalculator } from '../../../src/renderer/components/market-breadth/PositionCalculator'
import { PlannedTrades } from '../../../src/renderer/components/trading/PlannedTrades'
import { OpenPositions } from '../../../src/renderer/components/trading/OpenPositions'

// Mock trading context with big opportunity state management
const createMockTradingContext = (customState = {}) => ({
  portfolioSize: 100000,
  baseAllocation: 10,
  riskTolerance: 'Moderate' as const,
  breadthData: null,
  positionCalculations: null,
  plannedTrades: [],
  openPositions: [],
  bigOpportunitySignals: [],
  heatMapData: [],
  updatePortfolioSettings: vi.fn(),
  updateBreadthData: vi.fn(),
  addPlannedTrade: vi.fn(),
  executeTradeFromPlan: vi.fn(),
  updateOpenPosition: vi.fn(),
  closePosition: vi.fn(),
  detectBigOpportunity: vi.fn(),
  calculateEnhancedPosition: vi.fn(),
  ...customState
})

describe('E2E: Big Opportunity Detection → Position Planning → Trade Execution', () => {
  let mockContextValue: ReturnType<typeof createMockTradingContext>

  beforeEach(() => {
    vi.clearAllMocks()
    mockContextValue = createMockTradingContext()
    performanceMonitor.startMonitoring('big-opportunity-workflow')
  })

  afterEach(() => {
    cleanup()
    const memoryLeak = performanceMonitor.checkMemoryLeak('big-opportunity-workflow')
    expect(memoryLeak).toBeLessThan(1024 * 1024) // Less than 1MB memory increase
  })

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <TradingContext.Provider value={mockContextValue}>
        {children}
      </TradingContext.Provider>
    )
  }

  test('Big Opportunity Signal Detection: T2108 < 20 + High VIX → Enhanced Position Sizing', async () => {
    const scenario = marketBreadthScenarios.bigOpportunity
    
    // Mock big opportunity detection
    mockContextValue.detectBigOpportunity = vi.fn().mockReturnValue({
      isDetected: true,
      multiplier: 2.0,
      confidence: 85,
      factors: {
        t2108Low: true,
        vixElevated: true,
        breadthDivergence: true,
        sentimentExtreme: false
      },
      riskMetrics: {
        maxPositionSize: 24000,
        stopLossDistance: 3.5,
        profitTarget1: 8.2,
        profitTarget2: 15.8,
        maxHoldDays: 5
      }
    })

    performanceMonitor.measureRenderTime('big-opportunity-workflow', () =>
      renderWithRouter(
        <TestWrapper>
          <div data-testid="market-breadth-page">
            <MarketBreadthDashboard />
          </div>
          <div data-testid="position-calculator-component">
            <PositionCalculator />
          </div>
          <div data-testid="planned-trades-component">
            <PlannedTrades />
          </div>
        </TestWrapper>
      )
    )

    // Step 1: Enter market breadth data that triggers big opportunity
    await performanceMonitor.measureInteractionLatency('big-opportunity-workflow', async () => {
      await userSimulator.enterMarketBreadthData(scenario)
    })

    // Step 2: Verify big opportunity signal detection
    await waitFor(() => {
      expect(screen.getByTestId('big-opportunity-alert')).toBeInTheDocument()
      expect(screen.getByTestId('opportunity-confidence')).toHaveTextContent('85%')
      expect(screen.getByTestId('opportunity-factors')).toBeInTheDocument()
    })

    // Step 3: Verify enhanced position sizing calculations
    await waitFor(() => {
      expect(screen.getByTestId('enhanced-position-size')).toHaveTextContent('$24,000')
      expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent('2.0x')
      expect(screen.getByTestId('risk-reward-ratio')).toHaveTextContent(/1:2\.3|1:2\.4/i)
    })

    // Step 4: Verify risk management parameters
    await waitFor(() => {
      expect(screen.getByTestId('stop-loss-percentage')).toHaveTextContent('3.5%')
      expect(screen.getByTestId('profit-target-1-percentage')).toHaveTextContent('8.2%')
      expect(screen.getByTestId('max-hold-period')).toHaveTextContent('5 days')
    })

    // Validate performance during big opportunity detection
    performanceMonitor.validatePerformance('big-opportunity-workflow', {
      componentRenderTime: 150, // Slightly higher for complex calculations
      interactionLatency: 250,
      dataProcessingTime: 75
    })
  })

  test('Position Planning Workflow: From Signal → Planned Trade Creation', async () => {
    const bigOpportunityData: TradingWorkflowData = {
      portfolioSize: 100000,
      baseAllocation: 10,
      riskTolerance: 'Moderate',
      marketBreadth: marketBreadthScenarios.bigOpportunity,
      plannedTrade: {
        symbol: 'SPY',
        strategy: 'BIDBACK Big Opportunity',
        entryPrice: 420.50,
        quantity: 57 // $24,000 / $420.50 ≈ 57 shares
      }
    }

    renderWithRouter(
      <TestWrapper>
        <div data-testid="market-breadth-page">
          <MarketBreadthDashboard />
        </div>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
        <div data-testid="planned-trades-component">
          <PlannedTrades />
        </div>
      </TestWrapper>
    )

    // Enter big opportunity data
    await userSimulator.enterMarketBreadthData(bigOpportunityData.marketBreadth)

    // Wait for big opportunity detection
    await waitFor(() => {
      expect(screen.getByTestId('big-opportunity-alert')).toBeInTheDocument()
    })

    // Create planned trade based on calculations
    await userSimulator.createPlannedTrade(bigOpportunityData.plannedTrade)

    // Verify planned trade was created with correct parameters
    await waitFor(() => {
      expect(screen.getByTestId('planned-trade-entry')).toBeInTheDocument()
      expect(screen.getByTestId('trade-symbol')).toHaveTextContent('SPY')
      expect(screen.getByTestId('trade-strategy')).toHaveTextContent(/BIDBACK.*Big.*Opportunity/i)
      expect(screen.getByTestId('planned-position-size')).toHaveTextContent('$24,000')
      expect(screen.getByTestId('planned-quantity')).toHaveTextContent('57')
    })

    // Verify risk parameters are attached to planned trade
    await waitFor(() => {
      expect(screen.getByTestId('planned-stop-loss')).toHaveTextContent(/405\.25|405\.30/i) // ~3.5% below entry
      expect(screen.getByTestId('planned-target-1')).toHaveTextContent(/454\.98|455\.00/i) // ~8.2% above entry
      expect(screen.getByTestId('planned-target-2')).toHaveTextContent(/487\.13|487\.15/i) // ~15.8% above entry
    })

    // Verify trade readiness indicators
    await waitFor(() => {
      expect(screen.getByTestId('trade-readiness-status')).toHaveTextContent(/ready.*execute/i)
      expect(screen.getByTestId('execute-trade-button')).toBeEnabled()
    })
  })

  test('Trade Execution Flow: Planned Trade → Open Position → Position Monitoring', async () => {
    // Setup planned trade
    mockContextValue.plannedTrades = [{
      id: 'big-op-001',
      symbol: 'SPY',
      strategy: 'BIDBACK Big Opportunity',
      entryPrice: 420.50,
      quantity: 57,
      positionSize: 24000,
      stopLoss: 405.25,
      profitTarget1: 454.98,
      profitTarget2: 487.13,
      maxHoldDays: 5,
      createdAt: new Date(),
      status: 'ready'
    }]

    mockContextValue.executeTradeFromPlan = vi.fn().mockImplementation((tradeId) => {
      return {
        success: true,
        executedTrade: {
          id: 'pos-001',
          symbol: 'SPY',
          strategy: 'BIDBACK Big Opportunity',
          entryPrice: 420.50,
          currentPrice: 420.50,
          quantity: 57,
          positionSize: 24000,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          stopLoss: 405.25,
          profitTarget1: 454.98,
          profitTarget2: 487.13,
          daysHeld: 0,
          maxHoldDays: 5,
          entryDate: new Date(),
          status: 'open'
        }
      }
    })

    renderWithRouter(
      <TestWrapper>
        <div data-testid="planned-trades-component">
          <PlannedTrades />
        </div>
        <div data-testid="open-positions-component">
          <OpenPositions />
        </div>
      </TestWrapper>
    )

    // Execute the planned trade
    const executeButton = screen.getByTestId('execute-trade-big-op-001')
    await userSimulator.user.click(executeButton)

    // Verify execution confirmation
    await waitFor(() => {
      expect(screen.getByTestId('execution-confirmation')).toBeInTheDocument()
      expect(screen.getByTestId('execution-status')).toHaveTextContent(/successful/i)
    })

    // Verify open position was created
    await waitFor(() => {
      expect(screen.getByTestId('open-position-pos-001')).toBeInTheDocument()
      expect(screen.getByTestId('position-symbol')).toHaveTextContent('SPY')
      expect(screen.getByTestId('position-size')).toHaveTextContent('$24,000')
      expect(screen.getByTestId('current-pnl')).toHaveTextContent('$0.00')
    })

    // Verify position monitoring elements
    await waitFor(() => {
      expect(screen.getByTestId('stop-loss-monitor')).toBeInTheDocument()
      expect(screen.getByTestId('profit-targets-monitor')).toBeInTheDocument()
      expect(screen.getByTestId('days-held-counter')).toHaveTextContent('0 days')
      expect(screen.getByTestId('max-hold-warning')).toHaveTextContent('5 days remaining')
    })

    // Verify planned trade was removed
    expect(screen.queryByTestId('planned-trade-big-op-001')).not.toBeInTheDocument()
  })

  test('Price Movement Simulation: Position → Profit Target 1 Hit → Partial Exit', async () => {
    // Setup open position at profit target 1
    mockContextValue.openPositions = [{
      id: 'pos-001',
      symbol: 'SPY',
      strategy: 'BIDBACK Big Opportunity',
      entryPrice: 420.50,
      currentPrice: 454.98, // At profit target 1
      quantity: 57,
      positionSize: 24000,
      unrealizedPnL: 1964.36, // (454.98 - 420.50) * 57
      unrealizedPnLPercent: 8.18,
      stopLoss: 405.25,
      profitTarget1: 454.98,
      profitTarget2: 487.13,
      daysHeld: 2,
      maxHoldDays: 5,
      entryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: 'open'
    }]

    renderWithRouter(
      <TestWrapper>
        <div data-testid="open-positions-component">
          <OpenPositions />
        </div>
      </TestWrapper>
    )

    // Verify profit target 1 hit indicator
    await waitFor(() => {
      expect(screen.getByTestId('profit-target-1-hit')).toBeInTheDocument()
      expect(screen.getByTestId('profit-target-alert')).toHaveTextContent(/profit.*target.*1.*reached/i)
      expect(screen.getByTestId('unrealized-pnl')).toHaveTextContent('$1,964.36')
      expect(screen.getByTestId('unrealized-pnl-percent')).toHaveTextContent('8.18%')
    })

    // Execute 50% partial exit
    await userSimulator.executePartialExit(50)

    // Verify partial exit confirmation
    await waitFor(() => {
      expect(screen.getByTestId('partial-exit-confirmation')).toBeInTheDocument()
      expect(screen.getByTestId('exit-percentage')).toHaveTextContent('50%')
      expect(screen.getByTestId('shares-sold')).toHaveTextContent('28') // 50% of 57 = 28.5 → 28
      expect(screen.getByTestId('realized-profit')).toHaveTextContent(/965\.44/i) // ~50% of profit
    })

    // Verify remaining position
    await waitFor(() => {
      expect(screen.getByTestId('remaining-quantity')).toHaveTextContent('29') // 57 - 28 = 29
      expect(screen.getByTestId('remaining-position-size')).toHaveTextContent('$12,194.50') // Approximate
      expect(screen.getByTestId('position-status')).toHaveTextContent(/partial.*exit/i)
    })
  })

  test('Risk Management: Stop Loss Trigger → Position Exit', async () => {
    // Setup position near stop loss
    mockContextValue.openPositions = [{
      id: 'pos-001',
      symbol: 'SPY',
      strategy: 'BIDBACK Big Opportunity',
      entryPrice: 420.50,
      currentPrice: 406.00, // Near stop loss (405.25)
      quantity: 57,
      positionSize: 24000,
      unrealizedPnL: -826.50, // (406.00 - 420.50) * 57
      unrealizedPnLPercent: -3.45,
      stopLoss: 405.25,
      profitTarget1: 454.98,
      profitTarget2: 487.13,
      daysHeld: 1,
      maxHoldDays: 5,
      entryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      status: 'open'
    }]

    renderWithRouter(
      <TestWrapper>
        <div data-testid="open-positions-component">
          <OpenPositions />
        </div>
      </TestWrapper>
    )

    // Verify stop loss warning
    await waitFor(() => {
      expect(screen.getByTestId('stop-loss-warning')).toBeInTheDocument()
      expect(screen.getByTestId('stop-loss-proximity')).toHaveTextContent(/0\.75.*points.*away/i)
      expect(screen.getByTestId('unrealized-loss')).toHaveTextContent('-$826.50')
    })

    // Simulate stop loss trigger (price moves to 405.00)
    mockContextValue.updateOpenPosition = vi.fn().mockImplementation(() => {
      return {
        ...mockContextValue.openPositions[0],
        currentPrice: 405.00,
        status: 'stop-loss-triggered',
        unrealizedPnL: -883.50,
        unrealizedPnLPercent: -3.68
      }
    })

    // Trigger position update
    const refreshButton = screen.getByTestId('refresh-positions')
    await userSimulator.user.click(refreshButton)

    // Verify stop loss execution
    await waitFor(() => {
      expect(screen.getByTestId('stop-loss-executed')).toBeInTheDocument()
      expect(screen.getByTestId('exit-reason')).toHaveTextContent(/stop.*loss.*triggered/i)
      expect(screen.getByTestId('final-loss')).toHaveTextContent('-$883.50')
      expect(screen.getByTestId('position-status')).toHaveTextContent(/closed/i)
    })
  })

  test('Error Recovery: Failed Trade Execution → Retry Logic', async () => {
    mockContextValue.plannedTrades = [{
      id: 'big-op-002',
      symbol: 'QQQ',
      strategy: 'BIDBACK Big Opportunity',
      entryPrice: 350.00,
      quantity: 68,
      positionSize: 24000,
      stopLoss: 337.75,
      profitTarget1: 378.70,
      profitTarget2: 405.50,
      maxHoldDays: 5,
      createdAt: new Date(),
      status: 'ready'
    }]

    renderWithRouter(
      <TestWrapper>
        <div data-testid="planned-trades-component">
          <PlannedTrades />
        </div>
      </TestWrapper>
    )

    // Test error recovery during execution
    await simulateErrorAndRecover(
      'network',
      async () => {
        // Click retry button
        const retryButton = screen.getByRole('button', { name: /retry.*execution/i })
        await userSimulator.user.click(retryButton)
      }
    )

    // Verify trade remains in planned state
    await waitFor(() => {
      expect(screen.getByTestId('planned-trade-big-op-002')).toBeInTheDocument()
      expect(screen.getByTestId('execution-retry-available')).toBeInTheDocument()
    })
  })

  test('Performance During Multiple Big Opportunity Executions', async () => {
    const performanceTestName = 'multiple-big-opportunities'
    performanceMonitor.startMonitoring(performanceTestName)

    // Setup multiple big opportunity trades
    const multipleScenarios = [
      marketBreadthScenarios.bigOpportunity,
      marketBreadthScenarios.highVolatility,
      marketBreadthScenarios.extremeVolatility
    ]

    renderWithRouter(
      <TestWrapper>
        <div data-testid="market-breadth-page">
          <MarketBreadthDashboard />
        </div>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
        <div data-testid="planned-trades-component">
          <PlannedTrades />
        </div>
      </TestWrapper>
    )

    // Process multiple big opportunities rapidly
    for (const scenario of multipleScenarios) {
      await performanceMonitor.measureInteractionLatency(performanceTestName, async () => {
        await userSimulator.enterMarketBreadthData(scenario)
        
        await waitFor(() => {
          expect(screen.getByTestId('big-opportunity-alert')).toBeInTheDocument()
        })

        const createTradeButton = screen.getByRole('button', { name: /create.*planned.*trade/i })
        await userSimulator.user.click(createTradeButton)
      })
    }

    // Validate performance remained acceptable
    performanceMonitor.validatePerformance(performanceTestName, {
      interactionLatency: 800, // Max 800ms per big opportunity processing
      dataProcessingTime: 200   // Max 200ms calculation time
    })

    // Check for memory leaks
    const memoryIncrease = performanceMonitor.checkMemoryLeak(performanceTestName)
    expect(memoryIncrease).toBeLessThan(3 * 1024 * 1024) // Less than 3MB increase for multiple operations
  })
})