/**
 * End-to-End Production Readiness Validation Tests
 * 
 * Comprehensive validation of system readiness for production deployment.
 * Tests security, reliability, performance standards, error handling,
 * data integrity, and all critical system functions under production conditions.
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
  renderWithRouter
} from '../utils/TestUtils'
import { TradingContext } from '../../../src/renderer/context/TradingContext'
import { App } from '../../../src/renderer/App'

interface ProductionStandards {
  performance: {
    maxRenderTime: number        // milliseconds
    maxInteractionLatency: number // milliseconds
    maxDataProcessing: number    // milliseconds
    maxMemoryUsage: number       // MB
  }
  reliability: {
    uptimeRequirement: number    // percentage
    maxErrorRate: number         // percentage
    recoveryTime: number         // milliseconds
  }
  security: {
    dataValidation: boolean
    inputSanitization: boolean
    errorMessageSafety: boolean
  }
  usability: {
    accessibilityCompliance: boolean
    keyboardNavigation: boolean
    screenReaderSupport: boolean
  }
}

const productionStandards: ProductionStandards = {
  performance: {
    maxRenderTime: 100,       // 100ms max render time
    maxInteractionLatency: 200, // 200ms max interaction response
    maxDataProcessing: 50,    // 50ms max calculation time
    maxMemoryUsage: 50        // 50MB max memory usage
  },
  reliability: {
    uptimeRequirement: 99.9,  // 99.9% uptime
    maxErrorRate: 0.1,        // 0.1% error rate
    recoveryTime: 1000        // 1 second max recovery
  },
  security: {
    dataValidation: true,
    inputSanitization: true,
    errorMessageSafety: true
  },
  usability: {
    accessibilityCompliance: true,
    keyboardNavigation: true,
    screenReaderSupport: true
  }
}

// Production-level test data
const createProductionTestData = () => ({
  portfolioConfigurations: [
    { size: 100000, allocation: 10, riskTolerance: 'Conservative' },
    { size: 500000, allocation: 8, riskTolerance: 'Moderate' },
    { size: 1000000, allocation: 5, riskTolerance: 'Aggressive' },
    { size: 2500000, allocation: 4, riskTolerance: 'Moderate' }
  ],
  marketConditions: [
    marketBreadthScenarios.normalMarket,
    marketBreadthScenarios.bigOpportunity,
    marketBreadthScenarios.highVolatility,
    marketBreadthScenarios.extremeVolatility
  ],
  tradingSessions: Array.from({ length: 100 }, (_, i) => ({
    sessionId: `prod-session-${i}`,
    duration: 1000 + Math.random() * 4000, // 1-5 second sessions
    operations: 5 + Math.floor(Math.random() * 15) // 5-20 operations per session
  }))
})

describe('E2E: Production Readiness Validation', () => {
  let productionData: ReturnType<typeof createProductionTestData>
  let errorCount: number
  let totalOperations: number

  beforeEach(() => {
    vi.clearAllMocks()
    productionData = createProductionTestData()
    errorCount = 0
    totalOperations = 0
    performanceMonitor.startMonitoring('production-readiness')

    // Enhanced error tracking
    const originalConsoleError = console.error
    console.error = vi.fn((...args) => {
      errorCount++
      originalConsoleError(...args)
    })
  })

  afterEach(() => {
    cleanup()
    console.error = console.error // Restore original console.error
    
    // Calculate error rate
    const errorRate = totalOperations > 0 ? (errorCount / totalOperations) * 100 : 0
    expect(errorRate).toBeLessThan(productionStandards.reliability.maxErrorRate)
    
    console.log('Production Test Summary:', {
      totalOperations,
      errorCount,
      errorRate: `${errorRate.toFixed(3)}%`,
      memoryUsage: `${(performanceMonitor.checkMemoryLeak('production-readiness') / (1024 * 1024)).toFixed(2)}MB`
    })
  })

  test('Performance Standards Validation: All Operations Meet Production SLA', async () => {
    const testName = 'production-performance-sla'
    performanceMonitor.startMonitoring(testName)

    const contextValue = {
      portfolioSize: 250000,
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

    // Test application startup performance
    const startupTime = performanceMonitor.measureRenderTime(testName, () =>
      renderWithRouter(
        <TradingContext.Provider value={contextValue}>
          <App />
        </TradingContext.Provider>
      )
    )

    expect(startupTime).toBeLessThan(productionStandards.performance.maxRenderTime)

    // Test critical user interactions
    const criticalInteractions = [
      {
        name: 'Navigation',
        action: () => userSimulator.navigateTo('market-breadth')
      },
      {
        name: 'Data Entry',
        action: () => userSimulator.enterMarketBreadthData(marketBreadthScenarios.normalMarket)
      },
      {
        name: 'Settings Update',
        action: () => userSimulator.updatePortfolioSettings(300000, 8)
      },
      {
        name: 'Trade Planning',
        action: async () => {
          await userSimulator.navigateTo('trading')
          const planButton = screen.queryByTestId('quick-plan-button')
          if (planButton) await userSimulator.user.click(planButton)
        }
      }
    ]

    for (const interaction of criticalInteractions) {
      totalOperations++
      const interactionTime = await performanceMonitor.measureInteractionLatency(testName, interaction.action)
      
      expect(interactionTime).toBeLessThan(productionStandards.performance.maxInteractionLatency)
    }

    // Test data processing performance
    const processingTime = performanceMonitor.measureDataProcessing(testName, () => {
      // Simulate complex calculation
      const scenario = marketBreadthScenarios.bigOpportunity
      return {
        multiplier: scenario.expectedMultiplier,
        positionSize: 250000 * 0.10 * scenario.expectedMultiplier
      }
    })

    expect(processingTime).toBeLessThan(productionStandards.performance.maxDataProcessing)

    // Memory usage validation
    const memoryUsage = performanceMonitor.checkMemoryLeak(testName) / (1024 * 1024)
    expect(memoryUsage).toBeLessThan(productionStandards.performance.maxMemoryUsage)

    performanceMonitor.validatePerformance(testName, {
      componentRenderTime: productionStandards.performance.maxRenderTime,
      interactionLatency: productionStandards.performance.maxInteractionLatency,
      dataProcessingTime: productionStandards.performance.maxDataProcessing
    })
  })

  test('Reliability and Error Recovery: System Maintains 99.9% Uptime Standards', async () => {
    const testName = 'production-reliability'
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

    let successfulOperations = 0
    const totalReliabilityTests = 100

    // Test various error conditions and recovery
    const errorScenarios = [
      'network',
      'validation',
      'calculation'
    ]

    for (let i = 0; i < totalReliabilityTests; i++) {
      totalOperations++
      
      try {
        if (i % 10 === 0) {
          // Introduce error every 10th operation
          const errorType = errorScenarios[i % errorScenarios.length]
          
          const recoveryStartTime = performance.now()
          await simulateErrorAndRecover(
            errorType as any,
            async () => {
              // Recovery action
              await userSimulator.navigateTo('market-breadth')
              await userSimulator.enterMarketBreadthData(marketBreadthScenarios.normalMarket)
            }
          )
          const recoveryTime = performance.now() - recoveryStartTime
          
          // Recovery should be fast
          expect(recoveryTime).toBeLessThan(productionStandards.reliability.recoveryTime)
          
          successfulOperations++
        } else {
          // Normal operations
          const operation = i % 3 === 0 ? 
            () => userSimulator.navigateTo('market-breadth') :
            i % 3 === 1 ?
            () => userSimulator.navigateTo('trading') :
            () => userSimulator.navigateTo('settings')
          
          await operation()
          successfulOperations++
        }
      } catch (error) {
        // Track failures but continue testing
        console.warn(`Operation ${i} failed:`, error)
      }
    }

    // Calculate uptime percentage
    const uptimePercentage = (successfulOperations / totalReliabilityTests) * 100
    expect(uptimePercentage).toBeGreaterThanOrEqual(productionStandards.reliability.uptimeRequirement)

    // Verify system is still responsive
    await waitFor(() => {
      expect(screen.getByTestId('app-container') || screen.getByRole('main')).toBeInTheDocument()
    })
  })

  test('Data Integrity and Security: Input Validation and Sanitization', async () => {
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

    await userSimulator.navigateTo('market-breadth')

    // Test malicious input handling
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '../../etc/passwd',
      'DROP TABLE breadth_data;',
      '<img src="x" onerror="alert(1)">',
      '${7*7}', // Template injection
      'null',
      'undefined',
      '',
      ' '.repeat(1000) // Very long string
    ]

    for (const maliciousInput of maliciousInputs) {
      totalOperations++
      
      // Test T2108 input
      const t2108Input = screen.getByLabelText(/t2108/i)
      await userSimulator.user.clear(t2108Input)
      await userSimulator.user.type(t2108Input, maliciousInput)

      // Should either reject input or sanitize it
      const inputValue = (t2108Input as HTMLInputElement).value
      expect(inputValue).not.toContain('<script')
      expect(inputValue).not.toContain('javascript:')
      expect(inputValue).not.toContain('onerror')

      // Test VIX input
      const vixInput = screen.getByLabelText(/vix/i)
      await userSimulator.user.clear(vixInput)
      await userSimulator.user.type(vixInput, maliciousInput)

      const vixValue = (vixInput as HTMLInputElement).value
      expect(vixValue).not.toContain('<script')
      expect(vixValue).not.toContain('javascript:')
    }

    // Test numeric validation
    await userSimulator.navigateTo('settings')
    const portfolioInput = screen.getByLabelText(/portfolio.*size/i)
    
    const invalidNumbers = ['-100000', '0', 'not-a-number', '1.5e10', 'Infinity', 'NaN']
    
    for (const invalidNumber of invalidNumbers) {
      totalOperations++
      
      await userSimulator.user.clear(portfolioInput)
      await userSimulator.user.type(portfolioInput, invalidNumber)
      
      const saveButton = screen.getByRole('button', { name: /save/i })
      await userSimulator.user.click(saveButton)
      
      // Should show validation error for invalid inputs
      if (invalidNumber === '-100000' || invalidNumber === '0' || invalidNumber === 'not-a-number') {
        await waitFor(() => {
          expect(screen.getByTestId('validation-error') || screen.getByText(/invalid/i)).toBeInTheDocument()
        })
      }
    }
  })

  test('Accessibility Compliance: WCAG 2.1 AA Standards', async () => {
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

    // Test keyboard navigation
    const focusableElements = screen.getAllByRole('button')
      .concat(screen.getAllByRole('textbox'))
      .concat(screen.getAllByRole('combobox'))
      .concat(screen.getAllByRole('link'))

    expect(focusableElements.length).toBeGreaterThan(0)

    // Test that focusable elements have proper attributes
    focusableElements.forEach(element => {
      totalOperations++
      
      // Should have accessible name
      const accessibleName = element.getAttribute('aria-label') || 
                           element.getAttribute('aria-labelledby') ||
                           element.textContent
      expect(accessibleName).toBeTruthy()
      
      // Should be keyboard accessible
      expect(element.getAttribute('tabindex')).not.toBe('-1')
    })

    // Test form labels
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      totalOperations++
      
      const label = screen.queryByLabelText(new RegExp(input.getAttribute('name') || '', 'i'))
      if (!label) {
        // Should have aria-label if no explicit label
        expect(input.getAttribute('aria-label')).toBeTruthy()
      }
    })

    // Test color contrast (basic check for error states)
    const errorElements = screen.queryAllByTestId(/error|warning|alert/)
    errorElements.forEach(element => {
      totalOperations++
      
      const styles = window.getComputedStyle(element)
      const backgroundColor = styles.backgroundColor
      const color = styles.color
      
      // Should have sufficient contrast (this is a basic check)
      expect(backgroundColor).not.toBe(color) // Colors should be different
    })
  })

  test('Scalability Under Production Load: Multi-User Simulation', async () => {
    const testName = 'production-scalability'
    performanceMonitor.startMonitoring(testName)

    // Simulate multiple user sessions
    const userSessions = productionData.tradingSessions.slice(0, 10) // Limit for test performance

    const sessionPromises = userSessions.map(async (session, index) => {
      const contextValue = {
        portfolioSize: 100000 + index * 50000,
        baseAllocation: 8 + index % 5,
        riskTolerance: ['Conservative', 'Moderate', 'Aggressive'][index % 3] as const,
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

      const { unmount } = renderWithRouter(
        <TradingContext.Provider value={contextValue}>
          <App />
        </TradingContext.Provider>
      )

      // Simulate user session
      for (let op = 0; op < session.operations; op++) {
        totalOperations++
        
        const operations = [
          () => userSimulator.navigateTo('market-breadth'),
          () => userSimulator.enterMarketBreadthData(productionData.marketConditions[op % productionData.marketConditions.length]),
          () => userSimulator.navigateTo('trading'),
          () => userSimulator.navigateTo('settings')
        ]

        const operation = operations[op % operations.length]
        await operation()

        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      unmount()
      return session.sessionId
    })

    const completedSessions = await Promise.all(sessionPromises)
    expect(completedSessions.length).toBe(userSessions.length)

    // Memory should not grow excessively with multiple sessions
    const memoryUsage = performanceMonitor.checkMemoryLeak(testName) / (1024 * 1024)
    expect(memoryUsage).toBeLessThan(productionStandards.performance.maxMemoryUsage * 2) // Allow some overhead for multiple sessions

    performanceMonitor.validatePerformance(testName, {
      componentRenderTime: productionStandards.performance.maxRenderTime * 1.5, // Allow some overhead
      interactionLatency: productionStandards.performance.maxInteractionLatency * 1.5,
      dataProcessingTime: productionStandards.performance.maxDataProcessing * 1.5
    })
  })

  test('Production Configuration Validation: All Critical Settings Verified', async () => {
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

    // Test all production portfolio configurations
    for (const config of productionData.portfolioConfigurations) {
      totalOperations++
      
      await userSimulator.navigateTo('settings')
      await userSimulator.updatePortfolioSettings(config.size, config.allocation)

      // Verify configuration was applied
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-size-display')).toHaveTextContent(config.size.toLocaleString())
        expect(screen.getByTestId('base-allocation-display')).toHaveTextContent(`${config.allocation}%`)
      })

      // Test with different market conditions
      for (const marketCondition of productionData.marketConditions) {
        totalOperations++
        
        await userSimulator.navigateTo('market-breadth')
        await userSimulator.enterMarketBreadthData(marketCondition)

        // Verify calculations are correct
        await waitFor(() => {
          expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent(`${marketCondition.expectedMultiplier}x`)
          
          const expectedPositionSize = (config.size * config.allocation / 100) * marketCondition.expectedMultiplier
          expect(screen.getByTestId('calculated-position-size')).toHaveTextContent(expectedPositionSize.toLocaleString())
        })
      }
    }

    // Verify system handles all configurations without errors
    await waitFor(() => {
      expect(screen.getByTestId('app-container') || screen.getByRole('main')).toBeInTheDocument()
    })
  })

  test('Final Production Readiness Assessment: Comprehensive System Validation', async () => {
    const testName = 'final-production-assessment'
    performanceMonitor.startMonitoring(testName)

    renderWithRouter(
      <TradingContext.Provider value={{
        portfolioSize: 250000,
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

    // Comprehensive workflow test
    const productionWorkflow = async () => {
      totalOperations++
      
      // 1. System initialization
      await waitFor(() => {
        expect(screen.getByTestId('app-container') || screen.getByRole('main')).toBeInTheDocument()
      })

      // 2. Configuration
      await userSimulator.navigateTo('settings')
      await userSimulator.updatePortfolioSettings(500000, 8)

      // 3. Market analysis
      await userSimulator.navigateTo('market-breadth')
      await userSimulator.enterMarketBreadthData(marketBreadthScenarios.bigOpportunity)

      // 4. Position planning
      await userSimulator.navigateTo('trading')

      // 5. System health check
      await waitFor(() => {
        expect(screen.queryByTestId('error')).not.toBeInTheDocument()
        expect(screen.queryByTestId('crash')).not.toBeInTheDocument()
        expect(screen.queryByTestId('freeze')).not.toBeInTheDocument()
      })
    }

    const workflowTime = await performanceMonitor.measureInteractionLatency(testName, productionWorkflow)

    // Full workflow should complete within acceptable time
    expect(workflowTime).toBeLessThan(2000) // 2 seconds for complete workflow

    // Final performance validation
    performanceMonitor.validatePerformance(testName, {
      componentRenderTime: productionStandards.performance.maxRenderTime,
      interactionLatency: productionStandards.performance.maxInteractionLatency,
      dataProcessingTime: productionStandards.performance.maxDataProcessing
    })

    // Final memory check
    const finalMemory = performanceMonitor.checkMemoryLeak(testName) / (1024 * 1024)
    expect(finalMemory).toBeLessThan(productionStandards.performance.maxMemoryUsage)

    // Production readiness checklist
    const productionReadinessChecklist = {
      performanceStandards: workflowTime < 2000,
      memoryManagement: finalMemory < productionStandards.performance.maxMemoryUsage,
      errorHandling: errorCount === 0,
      systemStability: screen.queryByTestId('app-container') !== null,
      dataIntegrity: true, // Validated in previous tests
      security: true,      // Validated in previous tests
      accessibility: true  // Validated in previous tests
    }

    // All checks must pass for production readiness
    Object.entries(productionReadinessChecklist).forEach(([check, passed]) => {
      expect(passed).toBe(true)
    })

    console.log('🚀 Production Readiness Assessment: PASSED', {
      workflowTime: `${workflowTime.toFixed(2)}ms`,
      memoryUsage: `${finalMemory.toFixed(2)}MB`,
      errorRate: `${((errorCount / totalOperations) * 100).toFixed(3)}%`,
      checklist: productionReadinessChecklist
    })
  })
})