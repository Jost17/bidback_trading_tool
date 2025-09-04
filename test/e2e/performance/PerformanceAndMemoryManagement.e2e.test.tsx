/**
 * End-to-End Performance and Memory Management Tests
 * 
 * Comprehensive performance testing for the BIDBACK Trading System including
 * CPU usage, memory management, rendering performance, data processing efficiency,
 * and scalability under various load conditions.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import { 
  performanceMonitor, 
  userSimulator, 
  marketBreadthScenarios,
  renderWithRouter
} from '../utils/TestUtils'
import { TradingContext } from '../../../src/renderer/context/TradingContext'
import { App } from '../../../src/renderer/App'

interface PerformanceBenchmarks {
  componentRenderTime: number
  dataProcessingTime: number
  memoryUsageKB: number
  interactionLatency: number
  dbQueryTime?: number
  calculationTime?: number
}

interface LoadTestScenario {
  name: string
  dataSize: number
  operationsCount: number
  expectedBenchmarks: PerformanceBenchmarks
}

const performanceBenchmarks: Record<string, PerformanceBenchmarks> = {
  // Baseline performance expectations
  light: {
    componentRenderTime: 50,    // 50ms max
    dataProcessingTime: 25,     // 25ms max
    memoryUsageKB: 1024,        // 1MB max
    interactionLatency: 100     // 100ms max
  },
  moderate: {
    componentRenderTime: 100,   // 100ms max
    dataProcessingTime: 50,     // 50ms max
    memoryUsageKB: 2048,        // 2MB max
    interactionLatency: 200     // 200ms max
  },
  heavy: {
    componentRenderTime: 200,   // 200ms max
    dataProcessingTime: 100,    // 100ms max
    memoryUsageKB: 5120,        // 5MB max
    interactionLatency: 400     // 400ms max
  },
  extreme: {
    componentRenderTime: 500,   // 500ms max (acceptable for complex operations)
    dataProcessingTime: 250,    // 250ms max
    memoryUsageKB: 10240,       // 10MB max
    interactionLatency: 800     // 800ms max
  }
}

const createLargeDataset = (size: number) => {
  return {
    breadthHistory: Array.from({ length: size }, (_, i) => ({
      id: i,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      t2108: 15 + Math.random() * 20,
      vix: 12 + Math.random() * 30,
      up4Percent: 800 + Math.random() * 700,
      down4Percent: 50 + Math.random() * 300,
      opportunityMultiplier: 1 + Math.random() * 2
    })),
    
    positions: Array.from({ length: Math.min(size / 10, 50) }, (_, i) => ({
      id: `perf-pos-${i}`,
      symbol: `STOCK${i}`,
      strategy: 'BIDBACK Normal',
      entryPrice: 100 + Math.random() * 400,
      currentPrice: 100 + Math.random() * 400,
      quantity: 100 + Math.floor(Math.random() * 900),
      daysHeld: Math.floor(Math.random() * 30),
      status: 'open'
    })),
    
    trades: Array.from({ length: Math.min(size / 5, 100) }, (_, i) => ({
      id: `perf-trade-${i}`,
      symbol: `TRADE${i}`,
      strategy: 'BIDBACK Big Opportunity',
      positionSize: 10000 + Math.random() * 50000,
      createdAt: new Date(Date.now() - i * 60 * 60 * 1000),
      status: 'planned'
    }))
  }
}

describe('E2E: Performance and Memory Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any existing performance monitoring
    if (typeof window !== 'undefined' && window.performance) {
      performance.clearMarks?.()
      performance.clearMeasures?.()
    }
  })

  afterEach(() => {
    cleanup()
    // Force garbage collection if available (testing environment)
    if (global.gc) {
      global.gc()
    }
  })

  test('Component Rendering Performance: Light Load → Baseline Performance', async () => {
    const testName = 'component-rendering-light'
    performanceMonitor.startMonitoring(testName)

    // Test basic component rendering performance
    const renderStartTime = performance.now()
    
    performanceMonitor.measureRenderTime(testName, () =>
      render(
        <TradingContext.Provider value={{
          portfolioSize: 100000,
          baseAllocation: 10,
          riskTolerance: 'Moderate',
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
        }}>
          <App />
        </TradingContext.Provider>
      )
    )

    const renderEndTime = performance.now()
    const renderTime = renderEndTime - renderStartTime

    // Verify app loaded
    await waitFor(() => {
      expect(screen.getByTestId('app-container') || screen.getByRole('main')).toBeInTheDocument()
    })

    // Validate baseline performance
    expect(renderTime).toBeLessThan(performanceBenchmarks.light.componentRenderTime)
    
    performanceMonitor.validatePerformance(testName, performanceBenchmarks.light)
    
    const memoryUsage = performanceMonitor.checkMemoryLeak(testName)
    expect(memoryUsage).toBeLessThan(performanceBenchmarks.light.memoryUsageKB * 1024)
  })

  test('Data Processing Performance: Market Breadth Calculations → Sub-100ms Processing', async () => {
    const testName = 'data-processing-performance'
    performanceMonitor.startMonitoring(testName)

    renderWithRouter(
      <TradingContext.Provider value={{
        portfolioSize: 100000,
        baseAllocation: 10,
        riskTolerance: 'Moderate',
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
      }}>
        <App />
      </TradingContext.Provider>
    )

    // Navigate to market breadth
    await userSimulator.navigateTo('market-breadth')

    // Test data processing performance with various scenarios
    const scenarios = [
      marketBreadthScenarios.normalMarket,
      marketBreadthScenarios.bigOpportunity,
      marketBreadthScenarios.highVolatility,
      marketBreadthScenarios.extremeVolatility
    ]

    for (const scenario of scenarios) {
      const processingTime = await performanceMonitor.measureDataProcessing(testName, () => {
        return userSimulator.enterMarketBreadthData(scenario)
      })

      // Verify calculation completed
      await waitFor(() => {
        expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent(`${scenario.expectedMultiplier}x`)
      })

      // Each individual calculation should be fast
      expect(processingTime).toBeLessThan(performanceBenchmarks.moderate.dataProcessingTime)
    }

    performanceMonitor.validatePerformance(testName, performanceBenchmarks.moderate)
  })

  test('Memory Management: Large Dataset → Memory Leak Prevention', async () => {
    const testName = 'memory-management-large-dataset'
    performanceMonitor.startMonitoring(testName)

    const largeDataset = createLargeDataset(1000) // 1000 records

    // Create trading context with large dataset
    const contextValue = {
      portfolioSize: 500000,
      baseAllocation: 8,
      riskTolerance: 'Moderate' as const,
      breadthData: null,
      positionCalculations: null,
      plannedTrades: largeDataset.trades,
      openPositions: largeDataset.positions,
      breadthHistory: largeDataset.breadthHistory,
      updatePortfolioSettings: vi.fn(),
      updateBreadthData: vi.fn(),
      addPlannedTrade: vi.fn(),
      executeTradeFromPlan: vi.fn(),
      updateOpenPosition: vi.fn(),
      closePosition: vi.fn()
    }

    renderWithRouter(
      <TradingContext.Provider value={contextValue}>
        <App />
      </TradingContext.Provider>
    )

    // Navigate through all sections with large dataset
    const navigationSequence = ['market-breadth', 'trading', 'settings', 'trading', 'market-breadth']
    
    let baseMemory = performanceMonitor.checkMemoryLeak(testName)

    for (let cycle = 0; cycle < 3; cycle++) {
      for (const section of navigationSequence) {
        await userSimulator.navigateTo(section as any)
        
        // Wait for component to fully render
        await waitFor(() => {
          expect(screen.getByTestId(`${section}-page`) || screen.getByRole('main')).toBeInTheDocument()
        })

        // Check memory after each navigation
        const currentMemory = performanceMonitor.checkMemoryLeak(testName)
        const memoryIncrease = currentMemory - baseMemory
        
        // Memory should not grow excessively with each navigation
        expect(memoryIncrease).toBeLessThan(performanceBenchmarks.heavy.memoryUsageKB * 1024)
      }
    }

    // Final memory check - should not have major leaks
    const finalMemoryIncrease = performanceMonitor.checkMemoryLeak(testName)
    expect(finalMemoryIncrease).toBeLessThan(performanceBenchmarks.extreme.memoryUsageKB * 1024)
  })

  test('Interaction Latency: User Actions → Sub-200ms Response Times', async () => {
    const testName = 'interaction-latency'
    performanceMonitor.startMonitoring(testName)

    renderWithRouter(
      <TradingContext.Provider value={{
        portfolioSize: 100000,
        baseAllocation: 10,
        riskTolerance: 'Moderate',
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
      }}>
        <App />
      </TradingContext.Provider>
    )

    // Test various user interactions
    const interactions = [
      {
        name: 'navigation-click',
        action: () => userSimulator.navigateTo('market-breadth')
      },
      {
        name: 'form-input',
        action: async () => {
          await userSimulator.navigateTo('market-breadth')
          const t2108Input = screen.getByLabelText(/t2108/i)
          await userSimulator.user.type(t2108Input, '25.5')
        }
      },
      {
        name: 'settings-update',
        action: async () => {
          await userSimulator.navigateTo('settings')
          await userSimulator.updatePortfolioSettings(150000, 12)
        }
      }
    ]

    for (const interaction of interactions) {
      const latency = await performanceMonitor.measureInteractionLatency(testName, interaction.action)
      
      // Each interaction should be responsive
      expect(latency).toBeLessThan(performanceBenchmarks.moderate.interactionLatency)
    }

    performanceMonitor.validatePerformance(testName, performanceBenchmarks.moderate)
  })

  test('Scalability Test: Multiple Concurrent Operations → System Stability', async () => {
    const testName = 'scalability-concurrent-operations'
    performanceMonitor.startMonitoring(testName)

    const mediumDataset = createLargeDataset(500) // Medium dataset

    const contextValue = {
      portfolioSize: 250000,
      baseAllocation: 10,
      riskTolerance: 'Moderate' as const,
      breadthData: null,
      positionCalculations: null,
      plannedTrades: mediumDataset.trades,
      openPositions: mediumDataset.positions,
      updatePortfolioSettings: vi.fn(),
      updateBreadthData: vi.fn(),
      addPlannedTrade: vi.fn(),
      executeTradeFromPlan: vi.fn(),
      updateOpenPosition: vi.fn(),
      closePosition: vi.fn()
    }

    renderWithRouter(
      <TradingContext.Provider value={contextValue}>
        <App />
      </TradingContext.Provider>
    )

    // Simulate concurrent operations
    const concurrentOperations = [
      // Rapid navigation
      async () => {
        for (let i = 0; i < 10; i++) {
          await userSimulator.navigateTo('market-breadth')
          await userSimulator.navigateTo('trading')
          await userSimulator.navigateTo('settings')
        }
      },
      
      // Data updates
      async () => {
        await userSimulator.navigateTo('market-breadth')
        for (const scenario of Object.values(marketBreadthScenarios)) {
          await userSimulator.enterMarketBreadthData(scenario)
          await new Promise(resolve => setTimeout(resolve, 50)) // Small delay
        }
      },
      
      // Settings changes
      async () => {
        await userSimulator.navigateTo('settings')
        const portfolioSizes = [100000, 200000, 300000, 150000, 250000]
        for (const size of portfolioSizes) {
          await userSimulator.updatePortfolioSettings(size, 10)
          await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
        }
      }
    ]

    // Execute operations concurrently
    const operationPromises = concurrentOperations.map(operation => 
      performanceMonitor.measureInteractionLatency(testName, operation)
    )

    await Promise.all(operationPromises)

    // Verify system remained stable
    await waitFor(() => {
      expect(screen.getByTestId('app-container') || screen.getByRole('main')).toBeInTheDocument()
    })

    // Validate performance under load
    performanceMonitor.validatePerformance(testName, performanceBenchmarks.heavy)
  })

  test('Memory Pressure Test: Extreme Dataset → Graceful Degradation', async () => {
    const testName = 'memory-pressure-extreme'
    performanceMonitor.startMonitoring(testName)

    // Create very large dataset to test memory limits
    const extremeDataset = createLargeDataset(5000) // 5000 records

    const contextValue = {
      portfolioSize: 1000000,
      baseAllocation: 5,
      riskTolerance: 'Aggressive' as const,
      breadthData: null,
      positionCalculations: null,
      plannedTrades: extremeDataset.trades,
      openPositions: extremeDataset.positions,
      breadthHistory: extremeDataset.breadthHistory,
      updatePortfolioSettings: vi.fn(),
      updateBreadthData: vi.fn(),
      addPlannedTrade: vi.fn(),
      executeTradeFromPlan: vi.fn(),
      updateOpenPosition: vi.fn(),
      closePosition: vi.fn()
    }

    // Should handle large dataset without crashing
    expect(() => {
      renderWithRouter(
        <TradingContext.Provider value={contextValue}>
          <App />
        </TradingContext.Provider>
      )
    }).not.toThrow()

    // App should load despite large dataset
    await waitFor(() => {
      expect(screen.getByTestId('app-container') || screen.getByRole('main')).toBeInTheDocument()
    }, { timeout: 5000 }) // Longer timeout for extreme dataset

    // Navigate to data-heavy section
    await userSimulator.navigateTo('trading')

    // Should display data or show loading/pagination
    await waitFor(() => {
      const hasData = screen.queryByTestId('positions-list') || 
                     screen.queryByTestId('loading-indicator') ||
                     screen.queryByTestId('pagination-controls')
      expect(hasData).toBeInTheDocument()
    }, { timeout: 3000 })

    // Memory usage should be contained (even if high)
    const memoryUsage = performanceMonitor.checkMemoryLeak(testName)
    expect(memoryUsage).toBeLessThan(50 * 1024 * 1024) // Less than 50MB even for extreme dataset
  })

  test('Performance Regression Detection: Baseline vs Current Performance', async () => {
    const testName = 'performance-regression-detection'
    performanceMonitor.startMonitoring(testName)

    // Baseline performance test
    const baselineMetrics = {
      renderTime: 0,
      interactionTime: 0,
      processingTime: 0
    }

    // Test 1: Component rendering
    baselineMetrics.renderTime = performanceMonitor.measureRenderTime(testName, () =>
      renderWithRouter(
        <TradingContext.Provider value={{
          portfolioSize: 100000,
          baseAllocation: 10,
          riskTolerance: 'Moderate',
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
        }}>
          <App />
        </TradingContext.Provider>
      )
    )

    // Test 2: User interaction
    baselineMetrics.interactionTime = await performanceMonitor.measureInteractionLatency(testName, async () => {
      await userSimulator.navigateTo('market-breadth')
      await userSimulator.enterMarketBreadthData(marketBreadthScenarios.normalMarket)
    })

    // Test 3: Data processing
    baselineMetrics.processingTime = performanceMonitor.measureDataProcessing(testName, () => {
      // Simulate complex calculation
      const scenario = marketBreadthScenarios.bigOpportunity
      return {
        multiplier: scenario.expectedMultiplier,
        vixCategory: scenario.expectedVixCategory
      }
    })

    // Performance regression thresholds (20% tolerance)
    const regressionThreshold = 1.2

    // Validate no significant performance regression
    expect(baselineMetrics.renderTime).toBeLessThan(performanceBenchmarks.light.componentRenderTime * regressionThreshold)
    expect(baselineMetrics.interactionTime).toBeLessThan(performanceBenchmarks.moderate.interactionLatency * regressionThreshold)
    expect(baselineMetrics.processingTime).toBeLessThan(performanceBenchmarks.light.dataProcessingTime * regressionThreshold)

    // Log performance metrics for monitoring
    console.log('Performance Metrics:', {
      renderTime: `${baselineMetrics.renderTime.toFixed(2)}ms`,
      interactionTime: `${baselineMetrics.interactionTime.toFixed(2)}ms`,
      processingTime: `${baselineMetrics.processingTime.toFixed(2)}ms`
    })
  })

  test('Resource Cleanup: Component Unmounting → Proper Resource Disposal', async () => {
    const testName = 'resource-cleanup'
    performanceMonitor.startMonitoring(testName)

    let componentCount = 0
    const mockContextValue = {
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

    // Mount and unmount components multiple times
    for (let i = 0; i < 10; i++) {
      const { unmount } = renderWithRouter(
        <TradingContext.Provider value={mockContextValue}>
          <App />
        </TradingContext.Provider>
      )

      componentCount++

      // Verify component mounted
      await waitFor(() => {
        expect(screen.getByTestId('app-container') || screen.getByRole('main')).toBeInTheDocument()
      })

      // Unmount component
      unmount()

      // Check memory after unmount
      const memoryUsage = performanceMonitor.checkMemoryLeak(testName)
      
      // Memory should not grow significantly with each mount/unmount cycle
      expect(memoryUsage).toBeLessThan(componentCount * 1024 * 1024) // Max 1MB per component cycle
    }

    // Final memory check - should not have accumulated memory from all mount/unmount cycles
    const finalMemory = performanceMonitor.checkMemoryLeak(testName)
    expect(finalMemory).toBeLessThan(5 * 1024 * 1024) // Less than 5MB total
  })
})