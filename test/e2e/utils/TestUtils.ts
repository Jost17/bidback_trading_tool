/**
 * End-to-End Test Utilities for BIDBACK Trading System
 * Provides comprehensive utilities for testing complete user workflows
 */

import { vi, expect } from 'vitest'
import { render, screen, fireEvent, waitFor, RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'

// Types
export interface PerformanceMetrics {
  componentRenderTime: number
  memoryUsage: number
  interactionLatency: number
  dataProcessingTime: number
}

export interface TestScenarioConfig {
  name: string
  timeout?: number
  performanceThreshold?: Partial<PerformanceMetrics>
  memoryLeakThreshold?: number
  expectedBehavior: string
}

export interface MarketBreadthScenario {
  t2108: number
  vix: number
  up4Percent: number
  down4Percent: number
  entryPrice?: number
  expectedMultiplier: number
  expectedOpportunityType: 'Normal' | 'Big Opportunity'
  expectedVixCategory: 'Low' | 'Normal' | 'High' | 'Extreme'
}

export interface TradingWorkflowData {
  portfolioSize: number
  baseAllocation: number
  riskTolerance: 'Conservative' | 'Moderate' | 'Aggressive'
  marketBreadth: MarketBreadthScenario
  plannedTrade: {
    symbol: string
    strategy: string
    entryPrice: number
    quantity: number
  }
}

/**
 * Performance Monitoring Utilities
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map()
  private memoryBaseline: number = 0

  startMonitoring(testName: string): void {
    this.memoryBaseline = this.getMemoryUsage()
    this.metrics.set(testName, {
      componentRenderTime: 0,
      memoryUsage: this.memoryBaseline,
      interactionLatency: 0,
      dataProcessingTime: 0
    })
  }

  measureRenderTime<T>(testName: string, renderFn: () => T): T {
    const startTime = performance.now()
    const result = renderFn()
    const endTime = performance.now()
    
    const metrics = this.metrics.get(testName)
    if (metrics) {
      metrics.componentRenderTime = endTime - startTime
      this.metrics.set(testName, metrics)
    }
    
    return result
  }

  async measureInteractionLatency<T>(
    testName: string, 
    interactionFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now()
    const result = await interactionFn()
    const endTime = performance.now()
    
    const metrics = this.metrics.get(testName)
    if (metrics) {
      metrics.interactionLatency = endTime - startTime
      this.metrics.set(testName, metrics)
    }
    
    return result
  }

  measureDataProcessing<T>(testName: string, processFn: () => T): T {
    const startTime = performance.now()
    const result = processFn()
    const endTime = performance.now()
    
    const metrics = this.metrics.get(testName)
    if (metrics) {
      metrics.dataProcessingTime = endTime - startTime
      this.metrics.set(testName, metrics)
    }
    
    return result
  }

  checkMemoryLeak(testName: string): number {
    const currentMemory = this.getMemoryUsage()
    const metrics = this.metrics.get(testName)
    if (metrics) {
      const memoryIncrease = currentMemory - this.memoryBaseline
      metrics.memoryUsage = currentMemory
      this.metrics.set(testName, metrics)
      return memoryIncrease
    }
    return 0
  }

  getMetrics(testName: string): PerformanceMetrics | undefined {
    return this.metrics.get(testName)
  }

  private getMemoryUsage(): number {
    // Simulate memory usage measurement
    return process.memoryUsage?.()?.heapUsed || 0
  }

  validatePerformance(
    testName: string, 
    thresholds: Partial<PerformanceMetrics>
  ): void {
    const metrics = this.metrics.get(testName)
    expect(metrics).toBeDefined()
    
    if (metrics) {
      if (thresholds.componentRenderTime) {
        expect(metrics.componentRenderTime).toBeLessThan(thresholds.componentRenderTime)
      }
      if (thresholds.interactionLatency) {
        expect(metrics.interactionLatency).toBeLessThan(thresholds.interactionLatency)
      }
      if (thresholds.dataProcessingTime) {
        expect(metrics.dataProcessingTime).toBeLessThan(thresholds.dataProcessingTime)
      }
    }
  }
}

/**
 * Component Wrapper Utilities
 */
export const renderWithRouter = (component: React.ReactElement): RenderResult => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

/**
 * Market Breadth Test Data Generators
 */
export const marketBreadthScenarios: Record<string, MarketBreadthScenario> = {
  normalMarket: {
    t2108: 25.3,
    vix: 18.5,
    up4Percent: 950,
    down4Percent: 180,
    expectedMultiplier: 1.0,
    expectedOpportunityType: 'Normal',
    expectedVixCategory: 'Normal'
  },
  bigOpportunity: {
    t2108: 18.2,
    vix: 26.7,
    up4Percent: 1150,
    down4Percent: 120,
    expectedMultiplier: 2.0,
    expectedOpportunityType: 'Big Opportunity',
    expectedVixCategory: 'High'
  },
  highVolatility: {
    t2108: 15.5,
    vix: 32.1,
    up4Percent: 1300,
    down4Percent: 80,
    expectedMultiplier: 2.5,
    expectedOpportunityType: 'Big Opportunity',
    expectedVixCategory: 'High'
  },
  extremeVolatility: {
    t2108: 12.8,
    vix: 45.2,
    up4Percent: 1450,
    down4Percent: 50,
    expectedMultiplier: 3.0,
    expectedOpportunityType: 'Big Opportunity',
    expectedVixCategory: 'Extreme'
  }
}

/**
 * User Interaction Helpers
 */
export class UserWorkflowSimulator {
  private user = userEvent.setup()

  async enterMarketBreadthData(scenario: MarketBreadthScenario): Promise<void> {
    // Fill in T2108
    const t2108Input = screen.getByLabelText(/t2108/i)
    await this.user.clear(t2108Input)
    await this.user.type(t2108Input, scenario.t2108.toString())

    // Fill in VIX
    const vixInput = screen.getByLabelText(/vix/i)
    await this.user.clear(vixInput)
    await this.user.type(vixInput, scenario.vix.toString())

    // Fill in Up4%
    const up4Input = screen.getByLabelText(/up.*4.*percent/i)
    await this.user.clear(up4Input)
    await this.user.type(up4Input, scenario.up4Percent.toString())

    // Fill in Down4%
    const down4Input = screen.getByLabelText(/down.*4.*percent/i)
    await this.user.clear(down4Input)
    await this.user.type(down4Input, scenario.down4Percent.toString())
  }

  async updatePortfolioSettings(portfolioSize: number, baseAllocation: number): Promise<void> {
    const portfolioInput = screen.getByLabelText(/portfolio.*size/i)
    await this.user.clear(portfolioInput)
    await this.user.type(portfolioInput, portfolioSize.toString())

    const allocationInput = screen.getByLabelText(/base.*allocation/i)
    await this.user.clear(allocationInput)
    await this.user.type(allocationInput, baseAllocation.toString())

    // Save settings
    const saveButton = screen.getByRole('button', { name: /save/i })
    await this.user.click(saveButton)
  }

  async createPlannedTrade(trade: TradingWorkflowData['plannedTrade']): Promise<void> {
    const symbolInput = screen.getByLabelText(/symbol/i)
    await this.user.type(symbolInput, trade.symbol)

    const strategySelect = screen.getByLabelText(/strategy/i)
    await this.user.selectOptions(strategySelect, trade.strategy)

    const priceInput = screen.getByLabelText(/entry.*price/i)
    await this.user.type(priceInput, trade.entryPrice.toString())

    const quantityInput = screen.getByLabelText(/quantity/i)
    await this.user.type(quantityInput, trade.quantity.toString())

    const submitButton = screen.getByRole('button', { name: /plan.*trade/i })
    await this.user.click(submitButton)
  }

  async executePartialExit(percentage: number): Promise<void> {
    const exitButton = screen.getByRole('button', { name: /exit.*position/i })
    await this.user.click(exitButton)

    const percentageInput = screen.getByLabelText(/percentage/i)
    await this.user.clear(percentageInput)
    await this.user.type(percentageInput, percentage.toString())

    const confirmButton = screen.getByRole('button', { name: /confirm.*exit/i })
    await this.user.click(confirmButton)
  }

  async navigateTo(section: 'market-breadth' | 'trading' | 'settings'): Promise<void> {
    const navButton = screen.getByRole('button', { name: new RegExp(section, 'i') })
    await this.user.click(navButton)
    
    // Wait for navigation to complete
    await waitFor(() => {
      expect(screen.getByTestId(`${section}-page`)).toBeInTheDocument()
    })
  }
}

/**
 * State Persistence Validators
 */
export const validateStatePersistence = async (
  componentSelectors: string[],
  expectedData: Record<string, any>
): Promise<void> => {
  for (const selector of componentSelectors) {
    await waitFor(() => {
      const element = screen.getByTestId(selector)
      expect(element).toBeInTheDocument()
      
      // Validate that the component has the expected data
      const dataKey = selector.replace('-component', '-data')
      if (expectedData[dataKey]) {
        expect(element).toHaveTextContent(expectedData[dataKey].toString())
      }
    })
  }
}

/**
 * Error Recovery Validators
 */
export const simulateErrorAndRecover = async (
  errorType: 'network' | 'validation' | 'calculation',
  recoveryAction: () => Promise<void>
): Promise<void> => {
  // Mock error based on type
  switch (errorType) {
    case 'network':
      window.electronAPI.saveBreadthData = vi.fn().mockRejectedValue(new Error('Network error'))
      break
    case 'validation':
      // This will be handled by form validation
      break
    case 'calculation':
      // Mock calculation error
      break
  }

  // Wait for error to be displayed
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })

  // Execute recovery action
  await recoveryAction()

  // Verify recovery
  await waitFor(() => {
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
  })
}

/**
 * Real-time Update Validators
 */
export const validateRealTimeUpdates = async (
  triggerUpdate: () => Promise<void>,
  expectedUpdates: string[]
): Promise<void> => {
  const initialValues = expectedUpdates.map(selector => {
    const element = screen.getByTestId(selector)
    return element.textContent
  })

  await triggerUpdate()

  // Wait for updates to propagate
  await waitFor(() => {
    expectedUpdates.forEach((selector, index) => {
      const element = screen.getByTestId(selector)
      expect(element.textContent).not.toBe(initialValues[index])
    })
  })
}

export const performanceMonitor = new PerformanceMonitor()
export const userSimulator = new UserWorkflowSimulator()