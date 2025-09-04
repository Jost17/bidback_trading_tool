/**
 * End-to-End Cross-Component Integration Tests
 * 
 * Tests the complete integration between all BIDBACK system components.
 * Validates data flow, state management, real-time updates, and workflow
 * continuity across the entire application ecosystem.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { 
  performanceMonitor, 
  userSimulator, 
  marketBreadthScenarios,
  validateRealTimeUpdates,
  validateStatePersistence,
  simulateErrorAndRecover,
  renderWithRouter,
  type TradingWorkflowData
} from '../utils/TestUtils'
import { TradingContext } from '../../../src/renderer/context/TradingContext'
import { App } from '../../../src/renderer/App'

// Full application state for integration testing
interface FullApplicationState {
  // Portfolio Settings
  portfolioSize: number
  baseAllocation: number
  riskTolerance: 'Conservative' | 'Moderate' | 'Aggressive'
  
  // Market Breadth Data
  breadthData: {
    t2108: number
    vix: number
    up4Percent: number
    down4Percent: number
    timestamp: Date
  } | null
  
  // Position Calculations
  positionCalculations: {
    baseSize: number
    opportunityMultiplier: number
    vixAdjustment: number
    finalPositionSize: number
    riskAmount: number
    stopLoss: number
    profitTarget1: number
    profitTarget2: number
    maxHoldDays: number
  } | null
  
  // Trading State
  plannedTrades: Array<{
    id: string
    symbol: string
    strategy: string
    positionSize: number
    createdAt: Date
    status: string
  }>
  
  openPositions: Array<{
    id: string
    symbol: string
    currentPrice: number
    unrealizedPnL: number
    daysHeld: number
    status: string
  }>
  
  // System State
  isLoading: boolean
  errors: string[]
  lastUpdate: Date
}

const createFullApplicationState = (): FullApplicationState => ({
  portfolioSize: 100000,
  baseAllocation: 10,
  riskTolerance: 'Moderate',
  breadthData: null,
  positionCalculations: null,
  plannedTrades: [],
  openPositions: [],
  isLoading: false,
  errors: [],
  lastUpdate: new Date()
})

describe('E2E: Cross-Component Integration Tests', () => {
  let applicationState: FullApplicationState

  beforeEach(() => {
    vi.clearAllMocks()
    applicationState = createFullApplicationState()
    performanceMonitor.startMonitoring('cross-component-integration')
  })

  afterEach(() => {
    cleanup()
    const memoryLeak = performanceMonitor.checkMemoryLeak('cross-component-integration')
    expect(memoryLeak).toBeLessThan(2 * 1024 * 1024) // Less than 2MB memory increase
  })

  test('Complete BIDBACK Master System Pipeline: Breadth → Calculator → Planned Trade → Execution', async () => {
    const masterWorkflow: TradingWorkflowData = {
      portfolioSize: 250000,
      baseAllocation: 12,
      riskTolerance: 'Moderate',
      marketBreadth: marketBreadthScenarios.bigOpportunity,
      plannedTrade: {
        symbol: 'QQQ',
        strategy: 'BIDBACK Big Opportunity',
        entryPrice: 350.00,
        quantity: 103 // ~$36K position from calculations
      }
    }

    // Render full application
    performanceMonitor.measureRenderTime('cross-component-integration', () =>
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )
    )

    // Step 1: Configure Portfolio Settings
    await userSimulator.navigateTo('settings')
    await userSimulator.updatePortfolioSettings(
      masterWorkflow.portfolioSize, 
      masterWorkflow.baseAllocation
    )

    // Verify settings propagation
    await waitFor(() => {
      expect(screen.getByTestId('portfolio-size-display')).toHaveTextContent('$250,000')
      expect(screen.getByTestId('base-allocation-display')).toHaveTextContent('12%')
    })

    // Step 2: Navigate to Market Breadth and Enter Data
    await userSimulator.navigateTo('market-breadth')
    await userSimulator.enterMarketBreadthData(masterWorkflow.marketBreadth)

    // Verify breadth calculations
    await waitFor(() => {
      expect(screen.getByTestId('opportunity-type')).toHaveTextContent(/big.*opportunity/i)
      expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent('2.0x')
    })

    // Step 3: Verify Position Calculator Updates
    await waitFor(() => {
      // $250K * 12% * 2.0x = $60K base, but VIX adjustment brings it down
      expect(screen.getByTestId('calculated-position-size')).toHaveTextContent(/36,000|40,000/i)
      expect(screen.getByTestId('vix-adjustment-applied')).toBeInTheDocument()
    })

    // Step 4: Create Planned Trade from Calculations
    const createTradeButton = screen.getByTestId('create-planned-trade-from-calculation')
    await userSimulator.user.click(createTradeButton)

    // Fill in trade details using calculated values
    await userSimulator.createPlannedTrade(masterWorkflow.plannedTrade)

    // Step 5: Navigate to Trading Dashboard
    await userSimulator.navigateTo('trading')

    // Verify planned trade appears with all calculated data
    await waitFor(() => {
      expect(screen.getByTestId('planned-trade-entry')).toBeInTheDocument()
      expect(screen.getByTestId('trade-symbol')).toHaveTextContent('QQQ')
      expect(screen.getByTestId('trade-strategy')).toHaveTextContent(/big.*opportunity/i)
      expect(screen.getByTestId('calculated-stop-loss')).toBeInTheDocument()
      expect(screen.getByTestId('calculated-profit-targets')).toBeInTheDocument()
    })

    // Step 6: Execute Planned Trade
    const executeButton = screen.getByTestId('execute-planned-trade')
    await userSimulator.user.click(executeButton)

    // Verify execution and open position creation
    await waitFor(() => {
      expect(screen.getByTestId('execution-success')).toBeInTheDocument()
      expect(screen.getByTestId('open-position-created')).toBeInTheDocument()
    })

    // Step 7: Verify Cross-Component State Consistency
    await validateStatePersistence(
      [
        'portfolio-settings-component',
        'market-breadth-component', 
        'position-calculator-component',
        'planned-trades-component',
        'open-positions-component'
      ],
      {
        'portfolio-settings-data': 250000,
        'market-breadth-data': 2.0,
        'position-calculator-data': 36000,
        'planned-trades-data': 0, // Should be empty after execution
        'open-positions-data': 1   // Should have one open position
      }
    )

    // Validate end-to-end performance
    performanceMonitor.validatePerformance('cross-component-integration', {
      componentRenderTime: 200,
      interactionLatency: 500,
      dataProcessingTime: 150
    })
  })

  test('State Persistence Across Navigation: Data Integrity Throughout App Usage', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    // Initialize data in each component
    const testData = {
      portfolioSize: 150000,
      baseAllocation: 8,
      marketBreadth: marketBreadthScenarios.normalMarket
    }

    // Settings
    await userSimulator.navigateTo('settings')
    await userSimulator.updatePortfolioSettings(testData.portfolioSize, testData.baseAllocation)
    const settingsSnapshot = {
      portfolioSize: screen.getByTestId('portfolio-size-display').textContent,
      allocation: screen.getByTestId('base-allocation-display').textContent
    }

    // Market Breadth
    await userSimulator.navigateTo('market-breadth')
    await userSimulator.enterMarketBreadthData(testData.marketBreadth)
    const breadthSnapshot = {
      multiplier: screen.getByTestId('opportunity-multiplier').textContent,
      vixCategory: screen.getByTestId('vix-category').textContent
    }

    // Trading
    await userSimulator.navigateTo('trading')
    const tradingSnapshot = {
      availableCapital: screen.getByTestId('available-capital').textContent
    }

    // Navigate through all sections multiple times
    const navigationSequence = ['settings', 'market-breadth', 'trading', 'settings', 'trading', 'market-breadth']
    
    for (const section of navigationSequence) {
      await userSimulator.navigateTo(section as any)
      
      // Small delay to allow for any asynchronous state updates
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Verify data persistence in each component
    await userSimulator.navigateTo('settings')
    expect(screen.getByTestId('portfolio-size-display')).toHaveTextContent(settingsSnapshot.portfolioSize!)
    expect(screen.getByTestId('base-allocation-display')).toHaveTextContent(settingsSnapshot.allocation!)

    await userSimulator.navigateTo('market-breadth')
    expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent(breadthSnapshot.multiplier!)
    expect(screen.getByTestId('vix-category')).toHaveTextContent(breadthSnapshot.vixCategory!)

    await userSimulator.navigateTo('trading')
    expect(screen.getByTestId('available-capital')).toHaveTextContent(tradingSnapshot.availableCapital!)
  })

  test('Real-Time Data Propagation: Changes Flow Instantly Across All Components', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    // Open multiple components in split view (if supported) or use rapid navigation
    await userSimulator.navigateTo('market-breadth')
    
    // Initial state
    const scenario1 = marketBreadthScenarios.normalMarket
    await userSimulator.enterMarketBreadthData(scenario1)
    
    // Capture initial calculated position size
    const initialPositionSize = screen.getByTestId('calculated-position-size').textContent

    // Change to big opportunity scenario
    const scenario2 = marketBreadthScenarios.bigOpportunity
    await userSimulator.enterMarketBreadthData(scenario2)

    // Validate real-time updates
    await validateRealTimeUpdates(
      async () => {
        // The data change itself triggers the update
      },
      [
        'opportunity-multiplier',
        'calculated-position-size',
        'vix-category',
        'profit-target-1',
        'profit-target-2',
        'max-hold-days'
      ]
    )

    // Verify the change was significant
    const newPositionSize = screen.getByTestId('calculated-position-size').textContent
    expect(newPositionSize).not.toBe(initialPositionSize)
    expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent('2.0x')
  })

  test('Error Handling and Recovery Across Components: Graceful Degradation', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    await userSimulator.navigateTo('market-breadth')

    // Test network error during breadth data save
    await simulateErrorAndRecover(
      'network',
      async () => {
        // Navigate to different section and back
        await userSimulator.navigateTo('trading')
        await userSimulator.navigateTo('market-breadth')
        
        // Re-enter data
        const scenario = marketBreadthScenarios.normalMarket
        await userSimulator.enterMarketBreadthData(scenario)
      }
    )

    // Verify system recovered and is functional
    await waitFor(() => {
      expect(screen.getByTestId('system-status')).toHaveTextContent(/operational/i)
      expect(screen.getByTestId('error-indicator')).not.toBeInTheDocument()
    })

    // Verify cross-component functionality still works
    await userSimulator.navigateTo('trading')
    await waitFor(() => {
      expect(screen.getByTestId('trading-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('calculated-data-available')).toBeInTheDocument()
    })
  })

  test('Memory Management During Extended Usage: No Memory Leaks Across Sessions', async () => {
    const memoryTestName = 'extended-usage-memory'
    performanceMonitor.startMonitoring(memoryTestName)

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    // Simulate extended usage patterns
    const usagePatterns = [
      // Morning routine: Settings → Market Breadth → Position Planning
      async () => {
        await userSimulator.navigateTo('settings')
        await userSimulator.updatePortfolioSettings(120000, 9)
        await userSimulator.navigateTo('market-breadth')
        await userSimulator.enterMarketBreadthData(marketBreadthScenarios.normalMarket)
      },
      
      // Mid-day updates: Market changes
      async () => {
        await userSimulator.enterMarketBreadthData(marketBreadthScenarios.bigOpportunity)
        await userSimulator.navigateTo('trading')
      },
      
      // End-of-day: Position reviews
      async () => {
        await userSimulator.navigateTo('trading')
        // Simulate position updates
        const refreshButton = screen.queryByTestId('refresh-positions-button')
        if (refreshButton) {
          await userSimulator.user.click(refreshButton)
        }
      }
    ]

    // Run patterns multiple times to simulate extended usage
    for (let cycle = 0; cycle < 5; cycle++) {
      for (const pattern of usagePatterns) {
        await performanceMonitor.measureInteractionLatency(memoryTestName, pattern)
        
        // Check memory after each pattern
        const memoryIncrease = performanceMonitor.checkMemoryLeak(memoryTestName)
        expect(memoryIncrease).toBeLessThan(1024 * 1024 * (cycle + 1)) // Linear growth limit
      }
    }

    // Final memory check - should not have excessive growth
    const finalMemoryIncrease = performanceMonitor.checkMemoryLeak(memoryTestName)
    expect(finalMemoryIncrease).toBeLessThan(5 * 1024 * 1024) // Less than 5MB total increase
  })

  test('Concurrent Operations: Multiple Components Processing Simultaneously', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    // Setup scenario with multiple concurrent operations
    const concurrentOperations = [
      // Operation 1: Portfolio settings update
      async () => {
        await userSimulator.navigateTo('settings')
        await userSimulator.updatePortfolioSettings(200000, 15)
      },
      
      // Operation 2: Market breadth calculation
      async () => {
        await userSimulator.navigateTo('market-breadth')
        await userSimulator.enterMarketBreadthData(marketBreadthScenarios.extremeVolatility)
      },
      
      // Operation 3: Trade planning
      async () => {
        await userSimulator.navigateTo('trading')
        // Simulate trade creation if possible
      }
    ]

    // Execute operations in rapid succession
    const operationPromises = concurrentOperations.map(async (operation, index) => {
      // Stagger operations slightly
      await new Promise(resolve => setTimeout(resolve, index * 100))
      return operation()
    })

    // Wait for all operations to complete
    await Promise.all(operationPromises)

    // Verify system remains stable and consistent
    await waitFor(() => {
      expect(screen.getByTestId('system-status')).toHaveTextContent(/operational/i)
    }, { timeout: 3000 })

    // Verify final state is consistent
    await userSimulator.navigateTo('market-breadth')
    expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent('3.0x') // Extreme volatility

    await userSimulator.navigateTo('settings')
    expect(screen.getByTestId('portfolio-size-display')).toHaveTextContent('$200,000')
  })

  test('Database Consistency: All Components Use Same Data Source', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    // Create data in one component
    await userSimulator.navigateTo('market-breadth')
    const testScenario = marketBreadthScenarios.bigOpportunity
    await userSimulator.enterMarketBreadthData(testScenario)

    // Create planned trade based on this data
    await userSimulator.navigateTo('trading')
    const createTradeButton = screen.queryByTestId('create-planned-trade-button')
    if (createTradeButton) {
      await userSimulator.user.click(createTradeButton)
      await userSimulator.createPlannedTrade({
        symbol: 'SPY',
        strategy: 'BIDBACK Big Opportunity',
        entryPrice: 420.00,
        quantity: 48
      })
    }

    // Verify data consistency across navigation
    await userSimulator.navigateTo('market-breadth')
    expect(screen.getByTestId('t2108-input')).toHaveValue(testScenario.t2108.toString())
    expect(screen.getByTestId('vix-input')).toHaveValue(testScenario.vix.toString())

    await userSimulator.navigateTo('trading')
    if (screen.queryByTestId('planned-trade-entry')) {
      expect(screen.getByTestId('trade-symbol')).toHaveTextContent('SPY')
      expect(screen.getByTestId('trade-strategy')).toHaveTextContent(/big.*opportunity/i)
    }

    // Verify calculations remain consistent
    await userSimulator.navigateTo('market-breadth')
    expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent('2.0x')
  })

  test('Performance Under Load: Multiple Users Simulation', async () => {
    const loadTestName = 'multiple-users-simulation'
    performanceMonitor.startMonitoring(loadTestName)

    // Simulate multiple concurrent user sessions
    const simulateUserSession = async (sessionId: number) => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )

      const userScenarios = Object.values(marketBreadthScenarios)
      const scenarioIndex = sessionId % userScenarios.length

      await userSimulator.navigateTo('market-breadth')
      await userSimulator.enterMarketBreadthData(userScenarios[scenarioIndex])
      
      await userSimulator.navigateTo('settings')
      await userSimulator.updatePortfolioSettings(100000 + sessionId * 50000, 8 + sessionId * 2)
      
      await userSimulator.navigateTo('trading')
      
      cleanup() // Clean up this session
    }

    // Run multiple sessions
    const sessionCount = 3 // Limited for test environment
    const sessionPromises = Array.from({ length: sessionCount }, (_, i) => 
      performanceMonitor.measureInteractionLatency(loadTestName, () => simulateUserSession(i))
    )

    await Promise.all(sessionPromises)

    // Validate performance remained acceptable under load
    performanceMonitor.validatePerformance(loadTestName, {
      interactionLatency: 2000, // Max 2s per user session
      componentRenderTime: 500   // Max 500ms render time under load
    })
  })

  test('Production Readiness: Full System Validation', async () => {
    const productionTestName = 'production-readiness'
    performanceMonitor.startMonitoring(productionTestName)

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    // Test complete production workflow
    const productionWorkflow = async () => {
      // 1. Initial setup
      await userSimulator.navigateTo('settings')
      await userSimulator.updatePortfolioSettings(500000, 6)
      
      // 2. Market analysis
      await userSimulator.navigateTo('market-breadth')
      await userSimulator.enterMarketBreadthData(marketBreadthScenarios.bigOpportunity)
      
      // 3. Trade planning
      await userSimulator.navigateTo('trading')
      
      // 4. Position monitoring simulation
      const refreshButton = screen.queryByTestId('refresh-positions-button')
      if (refreshButton) {
        await userSimulator.user.click(refreshButton)
      }
      
      // 5. Final validation
      await userSimulator.navigateTo('market-breadth')
    }

    await performanceMonitor.measureInteractionLatency(productionTestName, productionWorkflow)

    // Production-level performance validation
    performanceMonitor.validatePerformance(productionTestName, {
      componentRenderTime: 100,  // Production: <100ms renders
      interactionLatency: 300,   // Production: <300ms interactions
      dataProcessingTime: 100    // Production: <100ms calculations
    })

    // Verify no errors occurred
    const errorElements = screen.queryAllByTestId(/error/)
    expect(errorElements).toHaveLength(0)

    // Verify system is in healthy state
    await waitFor(() => {
      expect(screen.getByTestId('app-container')).toBeInTheDocument()
    })

    // Final memory check
    const memoryIncrease = performanceMonitor.checkMemoryLeak(productionTestName)
    expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024) // Production: <2MB memory increase
  })
})