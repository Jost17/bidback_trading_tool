/**
 * End-to-End Tests: Portfolio Settings → Live Calculator Updates
 * 
 * Tests the complete workflow from portfolio settings changes through real-time
 * calculator updates across all components. Validates data propagation, live
 * updates, and calculation accuracy throughout the system.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import { 
  performanceMonitor, 
  userSimulator, 
  validateRealTimeUpdates,
  validateStatePersistence,
  marketBreadthScenarios,
  renderWithRouter
} from '../utils/TestUtils'
import { TradingContext } from '../../../src/renderer/context/TradingContext'
import { PortfolioSettings } from '../../../src/renderer/components/settings/PortfolioSettings'
import { PositionCalculator } from '../../../src/renderer/components/market-breadth/PositionCalculator'
import { PlannedTrades } from '../../../src/renderer/components/trading/PlannedTrades'
import { MarketBreadthDashboard } from '../../../src/renderer/components/market-breadth/MarketBreadthDashboard'

interface PortfolioConfiguration {
  portfolioSize: number
  baseAllocation: number
  riskTolerance: 'Conservative' | 'Moderate' | 'Aggressive'
  maxPositionSize: number
  maxPositionCount: number
  heatManagementEnabled: boolean
  heatThreshold: number
}

const defaultPortfolioConfig: PortfolioConfiguration = {
  portfolioSize: 100000,
  baseAllocation: 10,
  riskTolerance: 'Moderate',
  maxPositionSize: 15000,
  maxPositionCount: 8,
  heatManagementEnabled: true,
  heatThreshold: 60
}

const createMockTradingContext = (portfolioConfig = defaultPortfolioConfig) => ({
  ...portfolioConfig,
  breadthData: null,
  positionCalculations: null,
  plannedTrades: [],
  openPositions: [],
  heatMapData: [],
  calculatorSettings: {
    autoRecalculate: true,
    liveUpdates: true,
    precision: 2
  },
  updatePortfolioSettings: vi.fn().mockImplementation((updates: Partial<PortfolioConfiguration>) => {
    Object.assign(portfolioConfig, updates)
    return Promise.resolve(true)
  }),
  updateBreadthData: vi.fn(),
  addPlannedTrade: vi.fn(),
  executeTradeFromPlan: vi.fn(),
  updateOpenPosition: vi.fn(),
  closePosition: vi.fn(),
  recalculatePositions: vi.fn(),
  validatePortfolioSettings: vi.fn()
})

describe('E2E: Portfolio Settings → Live Calculator Updates', () => {
  let mockContextValue: ReturnType<typeof createMockTradingContext>
  let initialConfig: PortfolioConfiguration

  beforeEach(() => {
    vi.clearAllMocks()
    initialConfig = { ...defaultPortfolioConfig }
    mockContextValue = createMockTradingContext(initialConfig)
    performanceMonitor.startMonitoring('portfolio-settings-workflow')
  })

  afterEach(() => {
    cleanup()
    const memoryLeak = performanceMonitor.checkMemoryLeak('portfolio-settings-workflow')
    expect(memoryLeak).toBeLessThan(1024 * 1024) // Less than 1MB memory increase
  })

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <TradingContext.Provider value={mockContextValue}>
        {children}
      </TradingContext.Provider>
    )
  }

  test('Portfolio Size Update: $100K → $250K → Live Position Calculator Updates', async () => {
    performanceMonitor.measureRenderTime('portfolio-settings-workflow', () =>
      renderWithRouter(
        <TestWrapper>
          <div data-testid="portfolio-settings-page">
            <PortfolioSettings />
          </div>
          <div data-testid="market-breadth-dashboard">
            <MarketBreadthDashboard />
          </div>
          <div data-testid="position-calculator-component">
            <PositionCalculator />
          </div>
        </TestWrapper>
      )
    )

    // Enter initial market breadth data
    const scenario = marketBreadthScenarios.normalMarket
    await userSimulator.enterMarketBreadthData(scenario)

    // Verify initial position calculation with $100K portfolio
    await waitFor(() => {
      expect(screen.getByTestId('calculated-position-size')).toHaveTextContent('$10,000') // $100K * 10%
      expect(screen.getByTestId('portfolio-allocation-display')).toHaveTextContent('10.0%')
    })

    // Update portfolio size to $250K
    await performanceMonitor.measureInteractionLatency('portfolio-settings-workflow', async () => {
      await userSimulator.updatePortfolioSettings(250000, 10)
    })

    // Verify live calculator updates
    await validateRealTimeUpdates(
      async () => {
        // Settings change should automatically trigger recalculation
      },
      [
        'calculated-position-size',
        'portfolio-size-display',
        'max-position-limit',
        'available-capital'
      ]
    )

    // Verify new calculations
    await waitFor(() => {
      expect(screen.getByTestId('portfolio-size-display')).toHaveTextContent('$250,000')
      expect(screen.getByTestId('calculated-position-size')).toHaveTextContent('$25,000') // $250K * 10%
      expect(screen.getByTestId('available-capital')).toHaveTextContent('$250,000')
    })

    // Verify all related components updated
    await validateStatePersistence(
      [
        'portfolio-settings-component',
        'position-calculator-component',
        'breadth-dashboard-component'
      ],
      {
        'portfolio-settings-data': 250000,
        'position-calculator-data': 25000,
        'breadth-dashboard-data': scenario.expectedMultiplier
      }
    )
  })

  test('Base Allocation Update: 10% → 15% → Live Position Recalculation', async () => {
    renderWithRouter(
      <TestWrapper>
        <div data-testid="portfolio-settings-page">
          <PortfolioSettings />
        </div>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
        <div data-testid="planned-trades-component">
          <PlannedTrades />
        </div>
      </TestWrapper>
    )

    // Setup with big opportunity scenario for higher multiplier
    const bigOpportunityScenario = marketBreadthScenarios.bigOpportunity
    await userSimulator.enterMarketBreadthData(bigOpportunityScenario)

    // Verify initial calculation: $100K * 10% * 2.0x = $20K
    await waitFor(() => {
      expect(screen.getByTestId('base-allocation-display')).toHaveTextContent('10%')
      expect(screen.getByTestId('calculated-position-size')).toHaveTextContent('$20,000')
      expect(screen.getByTestId('opportunity-multiplier')).toHaveTextContent('2.0x')
    })

    // Update base allocation to 15%
    const allocationInput = screen.getByLabelText(/base.*allocation/i)
    await userSimulator.user.clear(allocationInput)
    await userSimulator.user.type(allocationInput, '15')

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save.*settings/i })
    await userSimulator.user.click(saveButton)

    // Verify immediate live updates
    await waitFor(() => {
      expect(screen.getByTestId('settings-saved-confirmation')).toBeInTheDocument()
      expect(screen.getByTestId('base-allocation-display')).toHaveTextContent('15%')
    })

    // Verify position calculator updated: $100K * 15% * 2.0x = $30K
    await waitFor(() => {
      expect(screen.getByTestId('calculated-position-size')).toHaveTextContent('$30,000')
      expect(screen.getByTestId('allocation-breakdown')).toHaveTextContent(/15%.*base.*×.*2\.0x.*=.*30%/i)
    })

    // Create planned trade and verify it uses new calculations
    const createTradeButton = screen.getByTestId('create-planned-trade-button')
    await userSimulator.user.click(createTradeButton)

    await waitFor(() => {
      expect(screen.getByTestId('planned-trade-position-size')).toHaveTextContent('$30,000')
    })
  })

  test('Risk Tolerance Update: Moderate → Aggressive → Position Sizing Changes', async () => {
    renderWithRouter(
      <TestWrapper>
        <div data-testid="portfolio-settings-page">
          <PortfolioSettings />
        </div>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
      </TestWrapper>
    )

    // Enter market breadth data
    const scenario = marketBreadthScenarios.normalMarket
    await userSimulator.enterMarketBreadthData(scenario)

    // Verify initial moderate risk settings
    await waitFor(() => {
      expect(screen.getByTestId('risk-tolerance-display')).toHaveTextContent(/moderate/i)
      expect(screen.getByTestId('max-position-size-limit')).toHaveTextContent('$15,000')
    })

    // Change risk tolerance to Aggressive
    const riskToleranceSelect = screen.getByLabelText(/risk.*tolerance/i)
    await userSimulator.user.selectOptions(riskToleranceSelect, 'Aggressive')
    
    const saveButton = screen.getByRole('button', { name: /save.*settings/i })
    await userSimulator.user.click(saveButton)

    // Verify aggressive risk tolerance effects
    await waitFor(() => {
      expect(screen.getByTestId('risk-tolerance-display')).toHaveTextContent(/aggressive/i)
      expect(screen.getByTestId('max-position-size-limit')).toHaveTextContent('$25,000') // Higher limit
      expect(screen.getByTestId('stop-loss-distance')).toHaveTextContent(/looser/i) // More aggressive stops
    })

    // Test with big opportunity to see full aggressive sizing
    const bigOpportunity = marketBreadthScenarios.bigOpportunity
    await userSimulator.enterMarketBreadthData(bigOpportunity)

    await waitFor(() => {
      // Aggressive + Big Opportunity should allow larger positions
      expect(screen.getByTestId('calculated-position-size')).toHaveTextContent(/25,000|30,000/i)
      expect(screen.getByTestId('risk-warning')).not.toBeInTheDocument() // No warning for aggressive
    })
  })

  test('Heat Management Settings: Enable → Position Limit Enforcement', async () => {
    // Setup with multiple existing positions to test heat management
    mockContextValue.openPositions = Array.from({ length: 6 }, (_, i) => ({
      id: `pos-${i}`,
      symbol: `TEST${i}`,
      strategy: 'BIDBACK Normal',
      entryPrice: 100,
      currentPrice: 105,
      quantity: 100,
      positionSize: 10000,
      unrealizedPnL: 500,
      unrealizedPnLPercent: 5.0,
      stopLoss: 97,
      profitTarget1: 105,
      profitTarget2: 110,
      daysHeld: 2,
      maxHoldDays: 7,
      entryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'open' as const
    }))

    mockContextValue.heatMapData = [
      { date: new Date(), heatLevel: 55, positionCount: 6, totalExposure: 60000 }
    ]

    renderWithRouter(
      <TestWrapper>
        <div data-testid="portfolio-settings-page">
          <PortfolioSettings />
        </div>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
      </TestWrapper>
    )

    // Verify current heat level
    await waitFor(() => {
      expect(screen.getByTestId('current-heat-level')).toHaveTextContent('55%')
      expect(screen.getByTestId('heat-status')).toHaveTextContent(/moderate/i)
    })

    // Lower heat threshold to 50%
    const heatThresholdInput = screen.getByLabelText(/heat.*threshold/i)
    await userSimulator.user.clear(heatThresholdInput)
    await userSimulator.user.type(heatThresholdInput, '50')

    const saveButton = screen.getByRole('button', { name: /save.*settings/i })
    await userSimulator.user.click(saveButton)

    // Verify heat management now triggers
    await waitFor(() => {
      expect(screen.getByTestId('heat-threshold-display')).toHaveTextContent('50%')
      expect(screen.getByTestId('heat-status')).toHaveTextContent(/high/i)
      expect(screen.getByTestId('heat-warning')).toBeInTheDocument()
    })

    // Try to calculate new position - should be limited
    const scenario = marketBreadthScenarios.normalMarket
    await userSimulator.enterMarketBreadthData(scenario)

    await waitFor(() => {
      expect(screen.getByTestId('heat-management-active')).toBeInTheDocument()
      expect(screen.getByTestId('position-size-reduced')).toBeInTheDocument()
      expect(screen.getByTestId('heat-management-reason')).toHaveTextContent(/heat.*limit.*exceeded/i)
    })
  })

  test('Real-time Updates During Market Session: Multiple Setting Changes → Live Recalculation', async () => {
    const performanceTestName = 'real-time-updates'
    performanceMonitor.startMonitoring(performanceTestName)

    renderWithRouter(
      <TestWrapper>
        <div data-testid="portfolio-settings-page">
          <PortfolioSettings />
        </div>
        <div data-testid="market-breadth-dashboard">
          <MarketBreadthDashboard />
        </div>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
      </TestWrapper>
    )

    // Enter market breadth data
    const scenario = marketBreadthScenarios.bigOpportunity
    await userSimulator.enterMarketBreadthData(scenario)

    // Rapid setting changes to test real-time updates
    const settingChanges = [
      { portfolioSize: 150000, baseAllocation: 12 },
      { portfolioSize: 200000, baseAllocation: 8 },
      { portfolioSize: 300000, baseAllocation: 6 },
      { portfolioSize: 250000, baseAllocation: 10 }
    ]

    for (const change of settingChanges) {
      await performanceMonitor.measureInteractionLatency(performanceTestName, async () => {
        await userSimulator.updatePortfolioSettings(change.portfolioSize, change.baseAllocation)
        
        // Verify immediate update
        await waitFor(() => {
          const expectedPositionSize = (change.portfolioSize * change.baseAllocation / 100) * 2.0 // 2.0x multiplier
          expect(screen.getByTestId('calculated-position-size')).toHaveTextContent(`$${expectedPositionSize.toLocaleString()}`)
        }, { timeout: 500 })
      })
    }

    // Validate performance during rapid changes
    performanceMonitor.validatePerformance(performanceTestName, {
      interactionLatency: 400, // Max 400ms per setting change
      componentRenderTime: 100 // Max 100ms render time
    })
  })

  test('Cross-Component Synchronization: Settings → Calculator → Planned Trades', async () => {
    renderWithRouter(
      <TestWrapper>
        <div data-testid="portfolio-settings-page">
          <PortfolioSettings />
        </div>
        <div data-testid="market-breadth-dashboard">
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

    // Step 1: Enter market data
    const scenario = marketBreadthScenarios.normalMarket
    await userSimulator.enterMarketBreadthData(scenario)

    // Step 2: Create planned trade with initial settings
    const createTradeButton = screen.getByTestId('create-planned-trade-button')
    await userSimulator.user.click(createTradeButton)

    await waitFor(() => {
      expect(screen.getByTestId('planned-trade-position-size')).toHaveTextContent('$10,000') // $100K * 10%
    })

    // Step 3: Change portfolio settings
    await userSimulator.updatePortfolioSettings(200000, 8) // $200K, 8%

    // Step 4: Verify all components updated synchronously
    await validateStatePersistence(
      [
        'portfolio-settings-component',
        'position-calculator-component',
        'planned-trades-component'
      ],
      {
        'portfolio-settings-data': 200000,
        'position-calculator-data': 16000, // $200K * 8%
        'planned-trades-data': 16000
      }
    )

    // Step 5: Create new planned trade with updated settings
    const createNewTradeButton = screen.getByTestId('create-another-planned-trade-button')
    await userSimulator.user.click(createNewTradeButton)

    await waitFor(() => {
      expect(screen.getByTestId('new-planned-trade-position-size')).toHaveTextContent('$16,000')
    })
  })

  test('Settings Validation: Invalid Values → Error Handling → Recovery', async () => {
    renderWithRouter(
      <TestWrapper>
        <div data-testid="portfolio-settings-page">
          <PortfolioSettings />
        </div>
      </TestWrapper>
    )

    // Test invalid portfolio size (negative)
    const portfolioInput = screen.getByLabelText(/portfolio.*size/i)
    await userSimulator.user.clear(portfolioInput)
    await userSimulator.user.type(portfolioInput, '-50000')

    // Try to save
    const saveButton = screen.getByRole('button', { name: /save.*settings/i })
    await userSimulator.user.click(saveButton)

    // Verify validation error
    await waitFor(() => {
      expect(screen.getByTestId('validation-error-portfolio-size')).toBeInTheDocument()
      expect(screen.getByTestId('error-message')).toHaveTextContent(/portfolio.*size.*must.*be.*positive/i)
    })

    // Test invalid allocation percentage (>100%)
    const allocationInput = screen.getByLabelText(/base.*allocation/i)
    await userSimulator.user.clear(allocationInput)
    await userSimulator.user.type(allocationInput, '150')

    await userSimulator.user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByTestId('validation-error-allocation')).toBeInTheDocument()
      expect(screen.getByTestId('error-message')).toHaveTextContent(/allocation.*cannot.*exceed.*100/i)
    })

    // Correct the values
    await userSimulator.user.clear(portfolioInput)
    await userSimulator.user.type(portfolioInput, '100000')
    await userSimulator.user.clear(allocationInput)
    await userSimulator.user.type(allocationInput, '10')

    await userSimulator.user.click(saveButton)

    // Verify successful save
    await waitFor(() => {
      expect(screen.getByTestId('settings-saved-success')).toBeInTheDocument()
      expect(screen.queryByTestId('validation-error-portfolio-size')).not.toBeInTheDocument()
      expect(screen.queryByTestId('validation-error-allocation')).not.toBeInTheDocument()
    })
  })

  test('Performance Impact: Settings Changes on Large Portfolio with Multiple Positions', async () => {
    const performanceTestName = 'large-portfolio-settings'
    performanceMonitor.startMonitoring(performanceTestName)

    // Setup large portfolio scenario
    const largePortfolioConfig = {
      portfolioSize: 1000000, // $1M
      baseAllocation: 5,      // 5% for more positions
      riskTolerance: 'Moderate' as const,
      maxPositionSize: 50000,
      maxPositionCount: 20,
      heatManagementEnabled: true,
      heatThreshold: 70
    }

    mockContextValue = createMockTradingContext(largePortfolioConfig)

    // Add many positions
    mockContextValue.openPositions = Array.from({ length: 15 }, (_, i) => ({
      id: `large-pos-${i}`,
      symbol: `STOCK${i}`,
      strategy: 'BIDBACK Normal',
      entryPrice: 100 + i,
      currentPrice: 105 + i,
      quantity: 400 + i * 10,
      positionSize: (100 + i) * (400 + i * 10),
      unrealizedPnL: 5 * (400 + i * 10),
      unrealizedPnLPercent: 5.0,
      stopLoss: (100 + i) * 0.97,
      profitTarget1: (100 + i) * 1.05,
      profitTarget2: (100 + i) * 1.10,
      daysHeld: i % 7 + 1,
      maxHoldDays: 7,
      entryDate: new Date(Date.now() - (i % 7 + 1) * 24 * 60 * 60 * 1000),
      status: 'open' as const
    }))

    renderWithRouter(
      <TestWrapper>
        <div data-testid="portfolio-settings-page">
          <PortfolioSettings />
        </div>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
      </TestWrapper>
    )

    // Test performance during settings changes with large portfolio
    await performanceMonitor.measureInteractionLatency(performanceTestName, async () => {
      await userSimulator.updatePortfolioSettings(1500000, 4) // Increase to $1.5M, 4%
      
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-size-display')).toHaveTextContent('$1,500,000')
        expect(screen.getByTestId('recalculation-complete')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    // Validate performance with large dataset
    performanceMonitor.validatePerformance(performanceTestName, {
      interactionLatency: 1500, // Max 1.5s for large portfolio recalculation
      componentRenderTime: 300   // Max 300ms render time for many positions
    })

    // Verify no memory issues with large dataset
    const memoryIncrease = performanceMonitor.checkMemoryLeak(performanceTestName)
    expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024) // Less than 5MB increase
  })
})