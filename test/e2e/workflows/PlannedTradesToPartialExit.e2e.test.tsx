/**
 * End-to-End Tests: Planned Trades → Open Positions → Partial Exit
 * 
 * Tests the complete workflow from planned trade execution through position
 * monitoring, profit target achievements, and partial exit strategies.
 * Validates trade execution, position management, and exit logic.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import { 
  performanceMonitor, 
  userSimulator, 
  validateStatePersistence,
  validateRealTimeUpdates,
  simulateErrorAndRecover,
  renderWithRouter
} from '../utils/TestUtils'
import { TradingContext } from '../../../src/renderer/context/TradingContext'
import { PlannedTrades } from '../../../src/renderer/components/trading/PlannedTrades'
import { OpenPositions } from '../../../src/renderer/components/trading/OpenPositions'
import { TradingDashboard } from '../../../src/renderer/components/trading/TradingDashboard'

interface MockTrade {
  id: string
  symbol: string
  strategy: string
  entryPrice: number
  quantity: number
  positionSize: number
  stopLoss: number
  profitTarget1: number
  profitTarget2: number
  maxHoldDays: number
  createdAt: Date
  status: 'ready' | 'executing' | 'executed' | 'failed'
}

interface MockPosition {
  id: string
  symbol: string
  strategy: string
  entryPrice: number
  currentPrice: number
  quantity: number
  positionSize: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  stopLoss: number
  profitTarget1: number
  profitTarget2: number
  daysHeld: number
  maxHoldDays: number
  entryDate: Date
  status: 'open' | 'partial-exit' | 'closed' | 'stop-loss-triggered'
  partialExits?: Array<{
    date: Date
    quantity: number
    price: number
    realizedPnL: number
  }>
}

// Sample planned trades for testing
const mockPlannedTrades: MockTrade[] = [
  {
    id: 'planned-001',
    symbol: 'SPY',
    strategy: 'BIDBACK Normal',
    entryPrice: 425.00,
    quantity: 24,
    positionSize: 10200,
    stopLoss: 411.25,
    profitTarget1: 446.25,
    profitTarget2: 467.50,
    maxHoldDays: 7,
    createdAt: new Date(),
    status: 'ready'
  },
  {
    id: 'planned-002',
    symbol: 'QQQ',
    strategy: 'BIDBACK Big Opportunity',
    entryPrice: 350.00,
    quantity: 69,
    positionSize: 24150,
    stopLoss: 337.75,
    profitTarget1: 378.70,
    profitTarget2: 410.50,
    maxHoldDays: 5,
    createdAt: new Date(),
    status: 'ready'
  }
]

const createMockTradingContext = (customState = {}) => ({
  portfolioSize: 100000,
  baseAllocation: 10,
  riskTolerance: 'Moderate' as const,
  breadthData: null,
  positionCalculations: null,
  plannedTrades: mockPlannedTrades,
  openPositions: [] as MockPosition[],
  heatMapData: [],
  updatePortfolioSettings: vi.fn(),
  updateBreadthData: vi.fn(),
  addPlannedTrade: vi.fn(),
  executeTradeFromPlan: vi.fn(),
  updateOpenPosition: vi.fn(),
  closePosition: vi.fn(),
  executePartialExit: vi.fn(),
  monitorPositions: vi.fn(),
  ...customState
})

describe('E2E: Planned Trades → Open Positions → Partial Exit', () => {
  let mockContextValue: ReturnType<typeof createMockTradingContext>

  beforeEach(() => {
    vi.clearAllMocks()
    mockContextValue = createMockTradingContext()
    performanceMonitor.startMonitoring('planned-to-exit-workflow')
  })

  afterEach(() => {
    cleanup()
    const memoryLeak = performanceMonitor.checkMemoryLeak('planned-to-exit-workflow')
    expect(memoryLeak).toBeLessThan(1024 * 1024) // Less than 1MB memory increase
  })

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <TradingContext.Provider value={mockContextValue}>
        {children}
      </TradingContext.Provider>
    )
  }

  test('Planned Trade Execution: Ready → Executing → Open Position', async () => {
    mockContextValue.executeTradeFromPlan = vi.fn().mockImplementation((tradeId) => {
      const plannedTrade = mockPlannedTrades.find(t => t.id === tradeId)
      if (!plannedTrade) throw new Error('Trade not found')

      return {
        success: true,
        executedPosition: {
          id: `pos-${tradeId}`,
          symbol: plannedTrade.symbol,
          strategy: plannedTrade.strategy,
          entryPrice: plannedTrade.entryPrice,
          currentPrice: plannedTrade.entryPrice,
          quantity: plannedTrade.quantity,
          positionSize: plannedTrade.positionSize,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          stopLoss: plannedTrade.stopLoss,
          profitTarget1: plannedTrade.profitTarget1,
          profitTarget2: plannedTrade.profitTarget2,
          daysHeld: 0,
          maxHoldDays: plannedTrade.maxHoldDays,
          entryDate: new Date(),
          status: 'open' as const
        }
      }
    })

    performanceMonitor.measureRenderTime('planned-to-exit-workflow', () =>
      renderWithRouter(
        <TestWrapper>
          <div data-testid="trading-dashboard-page">
            <TradingDashboard />
          </div>
          <div data-testid="planned-trades-component">
            <PlannedTrades />
          </div>
          <div data-testid="open-positions-component">
            <OpenPositions />
          </div>
        </TestWrapper>
      )
    )

    // Verify planned trades are displayed
    await waitFor(() => {
      expect(screen.getByTestId('planned-trade-planned-001')).toBeInTheDocument()
      expect(screen.getByTestId('planned-trade-planned-002')).toBeInTheDocument()
    })

    // Execute first planned trade
    await performanceMonitor.measureInteractionLatency('planned-to-exit-workflow', async () => {
      const executeButton = screen.getByTestId('execute-button-planned-001')
      await userSimulator.user.click(executeButton)
    })

    // Verify execution process
    await waitFor(() => {
      expect(screen.getByTestId('execution-status-planned-001')).toHaveTextContent(/executing/i)
    })

    // Wait for execution completion
    await waitFor(() => {
      expect(screen.getByTestId('execution-confirmation')).toBeInTheDocument()
      expect(screen.getByTestId('execution-success')).toHaveTextContent(/successfully.*executed/i)
    }, { timeout: 3000 })

    // Verify open position was created
    await waitFor(() => {
      expect(screen.getByTestId('open-position-pos-planned-001')).toBeInTheDocument()
      expect(screen.getByTestId('position-symbol-spy')).toHaveTextContent('SPY')
      expect(screen.getByTestId('position-size-display')).toHaveTextContent('$10,200')
      expect(screen.getByTestId('current-pnl')).toHaveTextContent('$0.00')
    })

    // Verify planned trade was removed
    expect(screen.queryByTestId('planned-trade-planned-001')).not.toBeInTheDocument()
  })

  test('Position Monitoring: Price Updates → P&L Changes → Target Alerts', async () => {
    // Setup with open position
    const mockOpenPosition: MockPosition = {
      id: 'pos-001',
      symbol: 'SPY',
      strategy: 'BIDBACK Normal',
      entryPrice: 425.00,
      currentPrice: 435.50, // Up $10.50
      quantity: 24,
      positionSize: 10200,
      unrealizedPnL: 252, // $10.50 * 24 shares
      unrealizedPnLPercent: 2.47,
      stopLoss: 411.25,
      profitTarget1: 446.25,
      profitTarget2: 467.50,
      daysHeld: 1,
      maxHoldDays: 7,
      entryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      status: 'open'
    }

    mockContextValue.openPositions = [mockOpenPosition]

    renderWithRouter(
      <TestWrapper>
        <div data-testid="open-positions-component">
          <OpenPositions />
        </div>
      </TestWrapper>
    )

    // Verify initial position display
    await waitFor(() => {
      expect(screen.getByTestId('position-current-price')).toHaveTextContent('$435.50')
      expect(screen.getByTestId('unrealized-pnl')).toHaveTextContent('$252.00')
      expect(screen.getByTestId('unrealized-pnl-percent')).toHaveTextContent('2.47%')
      expect(screen.getByTestId('profit-target-progress')).toBeInTheDocument()
    })

    // Simulate price movement toward profit target 1
    mockContextValue.updateOpenPosition = vi.fn().mockImplementation(() => ({
      ...mockOpenPosition,
      currentPrice: 444.00, // Near profit target 1
      unrealizedPnL: 456, // $19.00 * 24
      unrealizedPnLPercent: 4.47
    }))

    // Trigger real-time update
    await validateRealTimeUpdates(
      async () => {
        const refreshButton = screen.getByTestId('refresh-positions-button')
        await userSimulator.user.click(refreshButton)
      },
      [
        'position-current-price',
        'unrealized-pnl',
        'unrealized-pnl-percent'
      ]
    )

    // Verify near-target alert
    await waitFor(() => {
      expect(screen.getByTestId('near-profit-target-alert')).toBeInTheDocument()
      expect(screen.getByTestId('target-proximity')).toHaveTextContent(/2\.25.*points.*to.*target.*1/i)
    })
  })

  test('Profit Target 1 Achievement → Partial Exit Decision → 50% Exit', async () => {
    // Setup position at profit target 1
    const mockPositionAtTarget1: MockPosition = {
      id: 'pos-002',
      symbol: 'QQQ',
      strategy: 'BIDBACK Big Opportunity',
      entryPrice: 350.00,
      currentPrice: 378.70, // Exactly at profit target 1
      quantity: 69,
      positionSize: 24150,
      unrealizedPnL: 1980.30, // $28.70 * 69 shares
      unrealizedPnLPercent: 8.20,
      stopLoss: 337.75,
      profitTarget1: 378.70,
      profitTarget2: 410.50,
      daysHeld: 2,
      maxHoldDays: 5,
      entryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'open'
    }

    mockContextValue.openPositions = [mockPositionAtTarget1]
    mockContextValue.executePartialExit = vi.fn().mockImplementation((positionId, percentage) => {
      const position = mockContextValue.openPositions.find(p => p.id === positionId)
      if (!position) throw new Error('Position not found')

      const sharesToExit = Math.floor(position.quantity * percentage / 100)
      const realizedPnL = (position.currentPrice - position.entryPrice) * sharesToExit

      return {
        success: true,
        exitDetails: {
          sharesToExit,
          exitPrice: position.currentPrice,
          realizedPnL,
          realizedPnLPercent: (realizedPnL / (position.entryPrice * sharesToExit)) * 100,
          remainingShares: position.quantity - sharesToExit,
          remainingPositionValue: (position.quantity - sharesToExit) * position.currentPrice
        }
      }
    })

    renderWithRouter(
      <TestWrapper>
        <div data-testid="open-positions-component">
          <OpenPositions />
        </div>
      </TestWrapper>
    )

    // Verify profit target 1 achievement
    await waitFor(() => {
      expect(screen.getByTestId('profit-target-1-achieved')).toBeInTheDocument()
      expect(screen.getByTestId('target-achievement-alert')).toHaveTextContent(/profit.*target.*1.*reached/i)
      expect(screen.getByTestId('unrealized-pnl')).toHaveTextContent('$1,980.30')
    })

    // Verify partial exit option is available
    await waitFor(() => {
      expect(screen.getByTestId('partial-exit-options')).toBeInTheDocument()
      expect(screen.getByTestId('partial-exit-50-button')).toBeEnabled()
      expect(screen.getByTestId('partial-exit-75-button')).toBeEnabled()
      expect(screen.getByTestId('hold-for-target-2-button')).toBeEnabled()
    })

    // Execute 50% partial exit
    await userSimulator.executePartialExit(50)

    // Verify exit confirmation dialog
    await waitFor(() => {
      expect(screen.getByTestId('partial-exit-confirmation-dialog')).toBeInTheDocument()
      expect(screen.getByTestId('exit-shares-preview')).toHaveTextContent('34 shares') // 50% of 69
      expect(screen.getByTestId('exit-value-preview')).toHaveTextContent('$12,875.80')
      expect(screen.getByTestId('realized-profit-preview')).toHaveTextContent('$975.80')
    })

    // Confirm the exit
    const confirmButton = screen.getByTestId('confirm-partial-exit-button')
    await userSimulator.user.click(confirmButton)

    // Verify exit execution
    await waitFor(() => {
      expect(screen.getByTestId('partial-exit-success')).toBeInTheDocument()
      expect(screen.getByTestId('exit-execution-details')).toBeInTheDocument()
    })

    // Verify remaining position
    await waitFor(() => {
      expect(screen.getByTestId('remaining-shares')).toHaveTextContent('35') // 69 - 34
      expect(screen.getByTestId('remaining-position-value')).toHaveTextContent('$13,254.50')
      expect(screen.getByTestId('position-status')).toHaveTextContent(/partial.*exit/i)
      expect(screen.getByTestId('realized-profit-total')).toHaveTextContent('$975.80')
    })
  })

  test('Multiple Partial Exits: Target 1 → 50% Exit → Target 2 → 75% of Remaining Exit', async () => {
    // Setup position that has already had one partial exit
    const mockPositionAfterFirstExit: MockPosition = {
      id: 'pos-003',
      symbol: 'SPY',
      strategy: 'BIDBACK Normal',
      entryPrice: 425.00,
      currentPrice: 467.50, // At profit target 2
      quantity: 12, // Remaining after 50% exit from original 24
      positionSize: 5100, // Remaining position value
      unrealizedPnL: 510, // $42.50 * 12 shares
      unrealizedPnLPercent: 10.0,
      stopLoss: 411.25,
      profitTarget1: 446.25,
      profitTarget2: 467.50,
      daysHeld: 4,
      maxHoldDays: 7,
      entryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      status: 'partial-exit',
      partialExits: [{
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        quantity: 12,
        price: 446.25,
        realizedPnL: 255 // $21.25 * 12 shares from first exit
      }]
    }

    mockContextValue.openPositions = [mockPositionAfterFirstExit]

    renderWithRouter(
      <TestWrapper>
        <div data-testid="open-positions-component">
          <OpenPositions />
        </div>
      </TestWrapper>
    )

    // Verify profit target 2 achievement
    await waitFor(() => {
      expect(screen.getByTestId('profit-target-2-achieved')).toBeInTheDocument()
      expect(screen.getByTestId('target-2-achievement-alert')).toHaveTextContent(/profit.*target.*2.*reached/i)
      expect(screen.getByTestId('total-realized-profit')).toHaveTextContent('$255.00') // From first exit
      expect(screen.getByTestId('unrealized-pnl')).toHaveTextContent('$510.00') // Current unrealized
    })

    // Verify exit history is displayed
    await waitFor(() => {
      expect(screen.getByTestId('exit-history-panel')).toBeInTheDocument()
      expect(screen.getByTestId('previous-exit-1')).toHaveTextContent(/12.*shares.*@.*446\.25/i)
    })

    // Execute second partial exit (75% of remaining = 9 shares)
    const partialExit75Button = screen.getByTestId('partial-exit-75-remaining-button')
    await userSimulator.user.click(partialExit75Button)

    // Verify second exit preview
    await waitFor(() => {
      expect(screen.getByTestId('exit-shares-preview')).toHaveTextContent('9 shares') // 75% of 12
      expect(screen.getByTestId('final-remaining-shares')).toHaveTextContent('3 shares')
    })

    // Confirm second exit
    const confirmSecondExit = screen.getByTestId('confirm-second-partial-exit')
    await userSimulator.user.click(confirmSecondExit)

    // Verify final position state
    await waitFor(() => {
      expect(screen.getByTestId('remaining-shares')).toHaveTextContent('3')
      expect(screen.getByTestId('total-realized-profit')).toHaveTextContent(/637\.50/i) // $255 + $382.50
      expect(screen.getByTestId('exit-count')).toHaveTextContent('2 partial exits')
    })
  })

  test('Deterioration Signal Detection → Exit Recommendation', async () => {
    // Setup position showing deterioration signals
    const mockDeterioratingPosition: MockPosition = {
      id: 'pos-004',
      symbol: 'QQQ',
      strategy: 'BIDBACK Big Opportunity',
      entryPrice: 350.00,
      currentPrice: 365.00, // Still profitable but showing weakness
      quantity: 45, // After partial exits
      positionSize: 16425,
      unrealizedPnL: 675, // $15.00 * 45
      unrealizedPnLPercent: 4.29,
      stopLoss: 337.75,
      profitTarget1: 378.70,
      profitTarget2: 410.50,
      daysHeld: 4,
      maxHoldDays: 5, // Near max hold
      entryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      status: 'partial-exit'
    }

    // Mock deterioration signals
    mockContextValue.detectDeteriorationSignals = vi.fn().mockReturnValue({
      signals: [
        { type: 'max-hold-approaching', severity: 'medium', description: 'Approaching max hold period' },
        { type: 'momentum-weakening', severity: 'low', description: 'Price momentum showing weakness' },
        { type: 'breadth-deterioration', severity: 'medium', description: 'Market breadth showing deterioration' }
      ],
      recommendation: 'consider-exit',
      confidence: 65
    })

    mockContextValue.openPositions = [mockDeterioratingPosition]

    renderWithRouter(
      <TestWrapper>
        <div data-testid="open-positions-component">
          <OpenPositions />
        </div>
      </TestWrapper>
    )

    // Verify deterioration signals are detected and displayed
    await waitFor(() => {
      expect(screen.getByTestId('deterioration-signals-panel')).toBeInTheDocument()
      expect(screen.getByTestId('max-hold-warning')).toHaveTextContent(/1.*day.*remaining/i)
      expect(screen.getByTestId('momentum-weakness-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('breadth-deterioration-warning')).toBeInTheDocument()
    })

    // Verify exit recommendation
    await waitFor(() => {
      expect(screen.getByTestId('exit-recommendation')).toBeInTheDocument()
      expect(screen.getByTestId('recommendation-text')).toHaveTextContent(/consider.*exit/i)
      expect(screen.getByTestId('recommendation-confidence')).toHaveTextContent('65%')
    })

    // Verify recommended action buttons
    await waitFor(() => {
      expect(screen.getByTestId('exit-remaining-position-button')).toBeInTheDocument()
      expect(screen.getByTestId('hold-one-more-day-button')).toBeInTheDocument()
      expect(screen.getByTestId('ignore-recommendation-button')).toBeInTheDocument()
    })

    // Test exit on deterioration signal
    const exitButton = screen.getByTestId('exit-remaining-position-button')
    await userSimulator.user.click(exitButton)

    // Verify exit confirmation with deterioration context
    await waitFor(() => {
      expect(screen.getByTestId('deterioration-exit-confirmation')).toBeInTheDocument()
      expect(screen.getByTestId('exit-reason')).toHaveTextContent(/deterioration.*signals/i)
    })
  })

  test('Error Recovery During Partial Exit Execution', async () => {
    const mockPosition: MockPosition = {
      id: 'pos-error-test',
      symbol: 'SPY',
      strategy: 'BIDBACK Normal',
      entryPrice: 420.00,
      currentPrice: 441.00,
      quantity: 50,
      positionSize: 21000,
      unrealizedPnL: 1050,
      unrealizedPnLPercent: 5.0,
      stopLoss: 406.00,
      profitTarget1: 441.00,
      profitTarget2: 462.00,
      daysHeld: 2,
      maxHoldDays: 7,
      entryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'open'
    }

    mockContextValue.openPositions = [mockPosition]

    renderWithRouter(
      <TestWrapper>
        <div data-testid="open-positions-component">
          <OpenPositions />
        </div>
      </TestWrapper>
    )

    // Test error recovery during partial exit
    await simulateErrorAndRecover(
      'network',
      async () => {
        // Click retry partial exit
        const retryButton = screen.getByRole('button', { name: /retry.*exit/i })
        await userSimulator.user.click(retryButton)
      }
    )

    // Verify position remains unchanged after error
    await waitFor(() => {
      expect(screen.getByTestId('position-shares')).toHaveTextContent('50') // Original quantity
      expect(screen.getByTestId('position-status')).toHaveTextContent(/open/i)
      expect(screen.getByTestId('exit-retry-available')).toBeInTheDocument()
    })
  })

  test('Performance During High-Frequency Position Updates', async () => {
    const performanceTestName = 'high-frequency-updates'
    performanceMonitor.startMonitoring(performanceTestName)

    // Setup multiple positions
    const multiplePositions: MockPosition[] = Array.from({ length: 5 }, (_, i) => ({
      id: `pos-perf-${i}`,
      symbol: `TEST${i}`,
      strategy: 'BIDBACK Normal',
      entryPrice: 100 + i * 10,
      currentPrice: 105 + i * 10,
      quantity: 10 + i * 5,
      positionSize: (100 + i * 10) * (10 + i * 5),
      unrealizedPnL: 5 * (10 + i * 5),
      unrealizedPnLPercent: 5.0,
      stopLoss: (100 + i * 10) * 0.97,
      profitTarget1: (100 + i * 10) * 1.05,
      profitTarget2: (100 + i * 10) * 1.10,
      daysHeld: 1,
      maxHoldDays: 7,
      entryDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'open' as const
    }))

    mockContextValue.openPositions = multiplePositions

    renderWithRouter(
      <TestWrapper>
        <div data-testid="open-positions-component">
          <OpenPositions />
        </div>
      </TestWrapper>
    )

    // Simulate rapid position updates
    for (let update = 0; update < 10; update++) {
      await performanceMonitor.measureInteractionLatency(performanceTestName, async () => {
        const refreshButton = screen.getByTestId('refresh-positions-button')
        await userSimulator.user.click(refreshButton)
        
        await waitFor(() => {
          multiplePositions.forEach((_, i) => {
            expect(screen.getByTestId(`position-pos-perf-${i}`)).toBeInTheDocument()
          })
        })
      })
    }

    // Validate performance remained acceptable
    performanceMonitor.validatePerformance(performanceTestName, {
      interactionLatency: 300, // Max 300ms per update cycle
      componentRenderTime: 100 // Max 100ms render time
    })

    // Check for memory leaks during rapid updates
    const memoryIncrease = performanceMonitor.checkMemoryLeak(performanceTestName)
    expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024) // Less than 2MB increase
  })
})