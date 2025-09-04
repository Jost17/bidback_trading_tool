/**
 * End-to-End Real-World Scenario Testing and Stress Tests
 * 
 * Tests realistic trading scenarios and stress conditions including market
 * volatility periods, holiday weeks, multi-day trading cycles, high-frequency
 * operations, and edge cases that occur in production trading environments.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
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

// Real-world trading scenarios
interface MarketScenario {
  name: string
  description: string
  duration: 'intraday' | 'multi-day' | 'weekly' | 'monthly'
  marketConditions: {
    volatility: 'low' | 'medium' | 'high' | 'extreme'
    trend: 'up' | 'down' | 'sideways'
    volume: 'low' | 'normal' | 'high'
    breadthDivergence: boolean
  }
  expectedChallenges: string[]
  successCriteria: string[]
}

const realWorldScenarios: Record<string, MarketScenario> = {
  morningGap: {
    name: 'Morning Gap Opening',
    description: 'Market opens with significant gap, requiring rapid assessment',
    duration: 'intraday',
    marketConditions: {
      volatility: 'high',
      trend: 'up',
      volume: 'high',
      breadthDivergence: false
    },
    expectedChallenges: ['Rapid decision making', 'Elevated VIX', 'Position sizing pressure'],
    successCriteria: ['Quick breadth analysis', 'Appropriate position sizing', 'Risk management active']
  },
  
  earningsWeek: {
    name: 'Earnings Week Volatility',
    description: 'High volatility during major earnings announcements',
    duration: 'weekly',
    marketConditions: {
      volatility: 'extreme',
      trend: 'sideways',
      volume: 'high',
      breadthDivergence: true
    },
    expectedChallenges: ['Extreme VIX readings', 'Conflicting signals', 'Rapid position adjustments'],
    successCriteria: ['Conservative position sizing', 'Tight stops', 'Active monitoring']
  },

  holidayWeek: {
    name: 'Holiday Week Trading',
    description: 'Reduced volume and early closes during holiday periods',
    duration: 'weekly',
    marketConditions: {
      volatility: 'low',
      trend: 'sideways',
      volume: 'low',
      breadthDivergence: false
    },
    expectedChallenges: ['Thin trading', 'Early market closes', 'Extended weekends'],
    successCriteria: ['Adjusted exit timing', 'Holiday calendar integration', 'Liquidity awareness']
  },

  marketStress: {
    name: 'Market Stress Event',
    description: 'Black swan event with market crash conditions',
    duration: 'multi-day',
    marketConditions: {
      volatility: 'extreme',
      trend: 'down',
      volume: 'high',
      breadthDivergence: true
    },
    expectedChallenges: ['VIX > 40', 'Extreme breadth readings', 'System stability'],
    successCriteria: ['No system crashes', 'Appropriate warnings', 'Emergency procedures']
  }
}

// Stress test configurations
interface StressTestConfig {
  name: string
  operations: number
  concurrency: number
  dataSize: number
  duration: number // milliseconds
  expectedMaxLatency: number
  expectedMaxMemory: number // MB
}

const stressTestConfigs: Record<string, StressTestConfig> = {
  lightLoad: {
    name: 'Light Load Test',
    operations: 100,
    concurrency: 2,
    dataSize: 50,
    duration: 10000, // 10 seconds
    expectedMaxLatency: 200,
    expectedMaxMemory: 10
  },
  moderateLoad: {
    name: 'Moderate Load Test', 
    operations: 500,
    concurrency: 5,
    dataSize: 200,
    duration: 30000, // 30 seconds
    expectedMaxLatency: 500,
    expectedMaxMemory: 25
  },
  heavyLoad: {
    name: 'Heavy Load Test',
    operations: 1000,
    concurrency: 10,
    dataSize: 1000,
    duration: 60000, // 60 seconds
    expectedMaxLatency: 1000,
    expectedMaxMemory: 50
  }
}

const createRealisticTradingContext = (scenario: MarketScenario, dataSize: number = 10) => {
  const baseContext = {
    portfolioSize: 250000,
    baseAllocation: 8,
    riskTolerance: 'Moderate' as const,
    breadthData: null,
    positionCalculations: null,
    plannedTrades: [] as any[],
    openPositions: [] as any[],
    updatePortfolioSettings: vi.fn(),
    updateBreadthData: vi.fn(),
    addPlannedTrade: vi.fn(),
    executeTradeFromPlan: vi.fn(),
    updateOpenPosition: vi.fn(),
    closePosition: vi.fn()
  }

  // Add realistic data based on scenario
  if (scenario.marketConditions.volatility === 'high' || scenario.marketConditions.volatility === 'extreme') {
    baseContext.openPositions = Array.from({ length: Math.min(dataSize, 15) }, (_, i) => ({
      id: `stress-pos-${i}`,
      symbol: `VOLATILE${i}`,
      strategy: 'BIDBACK Big Opportunity',
      entryPrice: 100 + Math.random() * 300,
      currentPrice: 100 + Math.random() * 300,
      quantity: 50 + Math.floor(Math.random() * 100),
      unrealizedPnL: -1000 + Math.random() * 2000,
      unrealizedPnLPercent: -10 + Math.random() * 20,
      daysHeld: Math.floor(Math.random() * 7),
      status: 'open'
    }))
  }

  return baseContext
}

describe('E2E: Real-World Scenarios and Stress Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    performanceMonitor.startMonitoring('real-world-scenarios')
  })

  afterEach(() => {
    cleanup()
    const memoryLeak = performanceMonitor.checkMemoryLeak('real-world-scenarios')
    expect(memoryLeak).toBeLessThan(5 * 1024 * 1024) // Less than 5MB memory increase
  })

  test('Morning Gap Opening: Rapid Market Assessment → Quick Position Decision', async () => {
    const scenario = realWorldScenarios.morningGap
    const testName = 'morning-gap-scenario'
    performanceMonitor.startMonitoring(testName)

    const contextValue = createRealisticTradingContext(scenario)
    
    renderWithRouter(
      <TradingContext.Provider value={contextValue}>
        <App />
      </TradingContext.Provider>
    )

    // Simulate morning pre-market routine
    await userSimulator.navigateTo('market-breadth')

    // Morning gap scenario: High VIX, strong breadth
    const gapScenario = {
      ...marketBreadthScenarios.bigOpportunity,
      vix: 28.5, // Elevated but manageable
      up4Percent: 1250 // Strong breadth
    }

    // Time-critical analysis (should be fast)
    const analysisTime = await performanceMonitor.measureInteractionLatency(testName, async () => {
      await userSimulator.enterMarketBreadthData(gapScenario)
    })

    // Verify rapid analysis completion
    expect(analysisTime).toBeLessThan(300) // Must be under 300ms for morning gaps

    await waitFor(() => {
      expect(screen.getByTestId('opportunity-type')).toHaveTextContent(/big.*opportunity/i)
      expect(screen.getByTestId('vix-warning')).toBeInTheDocument() // Should warn about elevated VIX
      expect(screen.getByTestId('gap-opening-detected')).toBeInTheDocument()
    })

    // Quick position planning
    await userSimulator.navigateTo('trading')
    
    const planningTime = await performanceMonitor.measureInteractionLatency(testName, async () => {
      const quickPlanButton = screen.getByTestId('quick-plan-trade-button')
      await userSimulator.user.click(quickPlanButton)
    })

    expect(planningTime).toBeLessThan(200) // Quick planning essential

    // Verify appropriate position sizing for gap conditions
    await waitFor(() => {
      expect(screen.getByTestId('gap-adjusted-position-size')).toBeInTheDocument()
      expect(screen.getByTestId('elevated-vix-adjustment')).toHaveTextContent(/reduced.*size/i)
    })

    performanceMonitor.validatePerformance(testName, {
      componentRenderTime: 100,
      interactionLatency: 300,
      dataProcessingTime: 50
    })
  })

  test('Earnings Week Volatility: Multi-Day Position Management → Dynamic Adjustments', async () => {
    const scenario = realWorldScenarios.earningsWeek
    const testName = 'earnings-week-scenario'
    performanceMonitor.startMonitoring(testName)

    const contextValue = createRealisticTradingContext(scenario, 8)
    
    // Add existing positions with high volatility
    contextValue.openPositions = Array.from({ length: 8 }, (_, i) => ({
      id: `earnings-pos-${i}`,
      symbol: `EARN${i}`,
      strategy: 'BIDBACK Normal',
      entryPrice: 100,
      currentPrice: 100 + (Math.random() - 0.5) * 30, // High volatility
      quantity: 100,
      unrealizedPnL: (Math.random() - 0.5) * 3000,
      unrealizedPnLPercent: (Math.random() - 0.5) * 30,
      daysHeld: 2,
      status: 'open'
    }))

    renderWithRouter(
      <TradingContext.Provider value={contextValue}>
        <App />
      </TradingContext.Provider>
    )

    // Day 1: Initial earnings volatility
    await userSimulator.navigateTo('market-breadth')
    const earningsDay1 = {
      ...marketBreadthScenarios.extremeVolatility,
      vix: 42.3 // Extreme earnings volatility
    }
    
    await userSimulator.enterMarketBreadthData(earningsDay1)

    await waitFor(() => {
      expect(screen.getByTestId('extreme-volatility-warning')).toBeInTheDocument()
      expect(screen.getByTestId('earnings-period-detected')).toBeInTheDocument()
      expect(screen.getByTestId('position-size-restricted')).toBeInTheDocument()
    })

    // Check existing positions
    await userSimulator.navigateTo('trading')
    
    await waitFor(() => {
      expect(screen.getByTestId('high-volatility-position-warnings')).toBeInTheDocument()
      expect(screen.getByTestId('earnings-risk-alerts')).toBeInTheDocument()
    })

    // Day 2: Continued volatility with position adjustments
    const earningsDay2 = {
      ...marketBreadthScenarios.extremeVolatility,
      vix: 38.7 // Still high but declining
    }

    await userSimulator.navigateTo('market-breadth')
    await userSimulator.enterMarketBreadthData(earningsDay2)

    // Verify system handles sustained high volatility
    await waitFor(() => {
      expect(screen.getByTestId('sustained-volatility-mode')).toBeInTheDocument()
      expect(screen.getByTestId('conservative-sizing-active')).toBeInTheDocument()
    })

    // Day 3: Volatility normalizing
    const earningsDay3 = {
      ...marketBreadthScenarios.normalMarket,
      vix: 22.1 // Normalizing
    }

    await userSimulator.enterMarketBreadthData(earningsDay3)

    await waitFor(() => {
      expect(screen.getByTestId('volatility-normalizing')).toBeInTheDocument()
      expect(screen.getByTestId('position-sizing-restored')).toBeInTheDocument()
    })

    performanceMonitor.validatePerformance(testName, {
      componentRenderTime: 150,
      interactionLatency: 400,
      dataProcessingTime: 100
    })
  })

  test('Holiday Week Trading: Calendar Integration → Adjusted Exit Timing', async () => {
    const scenario = realWorldScenarios.holidayWeek
    const testName = 'holiday-week-scenario'
    performanceMonitor.startMonitoring(testName)

    const contextValue = createRealisticTradingContext(scenario, 5)

    // Add positions that would normally exit during holiday week
    contextValue.openPositions = [
      {
        id: 'holiday-pos-1',
        symbol: 'HOLIDAY1',
        strategy: 'BIDBACK Normal',
        entryPrice: 420.00,
        currentPrice: 428.50,
        quantity: 25,
        unrealizedPnL: 212.50,
        unrealizedPnLPercent: 2.02,
        daysHeld: 4,
        maxHoldDays: 7,
        entryDate: new Date('2025-11-24'), // Monday before Thanksgiving
        expectedExitDate: new Date('2025-12-03'), // After holiday adjustments
        status: 'open'
      }
    ]

    renderWithRouter(
      <TradingContext.Provider value={contextValue}>
        <App />
      </TradingContext.Provider>
    )

    // Navigate to positions during holiday week
    await userSimulator.navigateTo('trading')

    await waitFor(() => {
      expect(screen.getByTestId('holiday-week-notice')).toBeInTheDocument()
      expect(screen.getByTestId('adjusted-exit-dates')).toBeInTheDocument()
      expect(screen.getByTestId('thanksgiving-week-warning')).toBeInTheDocument()
    })

    // Verify holiday calendar integration
    await waitFor(() => {
      expect(screen.getByTestId('market-closed-thursday')).toHaveTextContent(/thanksgiving/i)
      expect(screen.getByTestId('early-close-friday')).toHaveTextContent(/early.*close/i)
      expect(screen.getByTestId('exit-date-extended')).toBeInTheDocument()
    })

    // Test position monitoring during holiday
    const refreshButton = screen.getByTestId('refresh-positions-button')
    await userSimulator.user.click(refreshButton)

    await waitFor(() => {
      expect(screen.getByTestId('holiday-adjusted-timeline')).toBeInTheDocument()
      expect(screen.getByTestId('business-days-calculation')).toHaveTextContent(/accounting.*for.*holidays/i)
    })

    performanceMonitor.validatePerformance(testName, {
      componentRenderTime: 120,
      interactionLatency: 300,
      dataProcessingTime: 75
    })
  })

  test('Market Stress Event: Black Swan Conditions → System Stability', async () => {
    const scenario = realWorldScenarios.marketStress
    const testName = 'market-stress-scenario'
    performanceMonitor.startMonitoring(testName)

    const contextValue = createRealisticTradingContext(scenario, 20)

    // Extreme stress conditions
    contextValue.openPositions = Array.from({ length: 20 }, (_, i) => ({
      id: `stress-pos-${i}`,
      symbol: `CRASH${i}`,
      strategy: 'BIDBACK Normal',
      entryPrice: 100,
      currentPrice: 70 + Math.random() * 20, // Major losses
      quantity: 100,
      unrealizedPnL: -3000 - Math.random() * 2000, // Significant losses
      unrealizedPnLPercent: -25 - Math.random() * 15,
      daysHeld: 1,
      status: 'open'
    }))

    renderWithRouter(
      <TradingContext.Provider value={contextValue}>
        <App />
      </TradingContext.Provider>
    )

    // Extreme market stress data
    const crashScenario = {
      t2108: 8.2, // Extreme low
      vix: 52.7, // Panic levels
      up4Percent: 45, // Almost nothing up
      down4Percent: 1890, // Everything down
      expectedMultiplier: 0.5, // System should reduce exposure
      expectedOpportunityType: 'Extreme Risk' as const,
      expectedVixCategory: 'Extreme' as const
    }

    // System should handle extreme conditions without crashing
    await userSimulator.navigateTo('market-breadth')
    
    const stressTime = await performanceMonitor.measureInteractionLatency(testName, async () => {
      await userSimulator.enterMarketBreadthData(crashScenario)
    })

    // System should respond within reasonable time even under stress
    expect(stressTime).toBeLessThan(1000) // 1 second max even in extreme conditions

    // Verify extreme condition handling
    await waitFor(() => {
      expect(screen.getByTestId('market-crash-warning')).toBeInTheDocument()
      expect(screen.getByTestId('extreme-vix-alert')).toBeInTheDocument()
      expect(screen.getByTestId('position-sizing-suspended')).toBeInTheDocument()
      expect(screen.getByTestId('emergency-mode-activated')).toBeInTheDocument()
    })

    // Check position management under stress
    await userSimulator.navigateTo('trading')

    await waitFor(() => {
      expect(screen.getByTestId('mass-stop-loss-warnings')).toBeInTheDocument()
      expect(screen.getByTestId('portfolio-protection-active')).toBeInTheDocument()
      expect(screen.getByTestId('emergency-liquidation-options')).toBeInTheDocument()
    })

    // Verify system stability despite extreme conditions
    expect(screen.getByTestId('app-container') || screen.getByRole('main')).toBeInTheDocument()

    performanceMonitor.validatePerformance(testName, {
      componentRenderTime: 300, // Acceptable delay under extreme stress
      interactionLatency: 1000,
      dataProcessingTime: 200
    })
  })

  test('Stress Test: High-Frequency Operations → System Performance Under Load', async () => {
    const config = stressTestConfigs.moderateLoad
    const testName = 'high-frequency-stress'
    performanceMonitor.startMonitoring(testName)

    const contextValue = createRealisticTradingContext(realWorldScenarios.morningGap, config.dataSize)

    renderWithRouter(
      <TradingContext.Provider value={contextValue}>
        <App />
      </TradingContext.Provider>
    )

    const startTime = Date.now()
    const operationTimes: number[] = []

    // High-frequency operations simulation
    const operations = [
      () => userSimulator.navigateTo('market-breadth'),
      () => userSimulator.enterMarketBreadthData(marketBreadthScenarios.normalMarket),
      () => userSimulator.navigateTo('trading'),
      () => userSimulator.navigateTo('settings'),
      () => userSimulator.updatePortfolioSettings(100000 + Math.random() * 100000, 8 + Math.random() * 4)
    ]

    // Execute high-frequency operations
    for (let i = 0; i < config.operations; i++) {
      const operation = operations[i % operations.length]
      
      const opStartTime = performance.now()
      await operation()
      const opEndTime = performance.now()
      
      operationTimes.push(opEndTime - opStartTime)

      // Brief pause to simulate real usage
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Check if we've exceeded duration limit
      if (Date.now() - startTime > config.duration) break
    }

    // Performance analysis
    const avgOperationTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length
    const maxOperationTime = Math.max(...operationTimes)
    const p95OperationTime = operationTimes.sort((a, b) => a - b)[Math.floor(operationTimes.length * 0.95)]

    // Validate performance under load
    expect(avgOperationTime).toBeLessThan(config.expectedMaxLatency / 2) // Average should be much better
    expect(maxOperationTime).toBeLessThan(config.expectedMaxLatency)
    expect(p95OperationTime).toBeLessThan(config.expectedMaxLatency * 0.8) // 95% should be better than max

    // Memory usage check
    const memoryUsage = performanceMonitor.checkMemoryLeak(testName) / (1024 * 1024) // Convert to MB
    expect(memoryUsage).toBeLessThan(config.expectedMaxMemory)

    // System should still be responsive
    await waitFor(() => {
      expect(screen.getByTestId('app-container') || screen.getByRole('main')).toBeInTheDocument()
    })

    console.log(`Stress Test Results - ${config.name}:`, {
      operationsCompleted: operationTimes.length,
      avgTime: `${avgOperationTime.toFixed(2)}ms`,
      maxTime: `${maxOperationTime.toFixed(2)}ms`,
      p95Time: `${p95OperationTime.toFixed(2)}ms`,
      memoryUsageMB: `${memoryUsage.toFixed(2)}MB`
    })
  })

  test('Extended Trading Session: Full Day Simulation → Memory and Performance Stability', async () => {
    const testName = 'extended-trading-session'
    performanceMonitor.startMonitoring(testName)

    const contextValue = createRealisticTradingContext(realWorldScenarios.morningGap, 15)

    renderWithRouter(
      <TradingContext.Provider value={contextValue}>
        <App />
      </TradingContext.Provider>
    )

    // Simulate full trading day workflow
    const tradingDayEvents = [
      // Pre-market (9:00 AM)
      {
        time: '09:00',
        action: async () => {
          await userSimulator.navigateTo('market-breadth')
          await userSimulator.enterMarketBreadthData(marketBreadthScenarios.normalMarket)
        }
      },
      // Market open volatility (9:30 AM)
      {
        time: '09:30',
        action: async () => {
          await userSimulator.enterMarketBreadthData(marketBreadthScenarios.bigOpportunity)
          await userSimulator.navigateTo('trading')
        }
      },
      // Mid-morning review (10:30 AM)
      {
        time: '10:30',
        action: async () => {
          const refreshButton = screen.queryByTestId('refresh-positions-button')
          if (refreshButton) await userSimulator.user.click(refreshButton)
        }
      },
      // Lunch break settings review (12:00 PM)
      {
        time: '12:00',
        action: async () => {
          await userSimulator.navigateTo('settings')
          await userSimulator.updatePortfolioSettings(300000, 12)
        }
      },
      // Afternoon position check (2:00 PM)
      {
        time: '14:00',
        action: async () => {
          await userSimulator.navigateTo('trading')
        }
      },
      // Market close review (4:00 PM)
      {
        time: '16:00',
        action: async () => {
          await userSimulator.navigateTo('market-breadth')
          await userSimulator.enterMarketBreadthData(marketBreadthScenarios.normalMarket)
        }
      }
    ]

    let memoryBaseline = performanceMonitor.checkMemoryLeak(testName)

    // Execute trading day simulation
    for (const event of tradingDayEvents) {
      const eventTime = await performanceMonitor.measureInteractionLatency(testName, event.action)
      
      // Each event should complete in reasonable time
      expect(eventTime).toBeLessThan(500)
      
      // Memory should not grow excessively
      const currentMemory = performanceMonitor.checkMemoryLeak(testName)
      const memoryIncrease = currentMemory - memoryBaseline
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024) // Less than 5MB increase per event
      
      // Small delay between events
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Final system health check
    await waitFor(() => {
      expect(screen.getByTestId('app-container') || screen.getByRole('main')).toBeInTheDocument()
    })

    // Final memory usage should be reasonable
    const finalMemory = performanceMonitor.checkMemoryLeak(testName) / (1024 * 1024)
    expect(finalMemory).toBeLessThan(20) // Less than 20MB total for full day

    performanceMonitor.validatePerformance(testName, {
      componentRenderTime: 150,
      interactionLatency: 500,
      dataProcessingTime: 100
    })

    console.log('Extended Trading Session Results:', {
      eventsCompleted: tradingDayEvents.length,
      totalMemoryMB: `${finalMemory.toFixed(2)}MB`,
      systemStability: 'Stable'
    })
  })
})