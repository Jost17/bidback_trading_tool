/**
 * End-to-End Tests: Holiday Calendar → Exit Date Calculations
 * 
 * Tests the complete workflow from holiday calendar integration through
 * VIX-based max hold days and holiday-adjusted exit date calculations.
 * Validates business day calculations, holiday skipping, and weekend handling.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import React from 'react'
import { 
  performanceMonitor, 
  userSimulator, 
  marketBreadthScenarios,
  validateRealTimeUpdates,
  renderWithRouter
} from '../utils/TestUtils'
import { TradingContext } from '../../../src/renderer/context/TradingContext'
import { HolidayCalendar } from '../../../src/renderer/components/trading/HolidayCalendar'
import { PositionCalculator } from '../../../src/renderer/components/market-breadth/PositionCalculator'
import { PlannedTrades } from '../../../src/renderer/components/trading/PlannedTrades'
import { OpenPositions } from '../../../src/renderer/components/trading/OpenPositions'

interface HolidayData {
  date: Date
  name: string
  type: 'market-closed' | 'early-close' | 'half-day'
  affectsExit: boolean
}

interface ExitCalculation {
  entryDate: Date
  vix: number
  baseHoldDays: number
  vixAdjustedDays: number
  businessDaysOnly: number
  holidayAdjustedDate: Date
  weekendAdjustedDate: Date
  finalExitDate: Date
  skippedDates: Date[]
}

// Mock holiday data for 2025
const mockHolidays: HolidayData[] = [
  { date: new Date('2025-01-01'), name: 'New Year\'s Day', type: 'market-closed', affectsExit: true },
  { date: new Date('2025-01-20'), name: 'Martin Luther King Jr. Day', type: 'market-closed', affectsExit: true },
  { date: new Date('2025-02-17'), name: 'Presidents\' Day', type: 'market-closed', affectsExit: true },
  { date: new Date('2025-04-18'), name: 'Good Friday', type: 'market-closed', affectsExit: true },
  { date: new Date('2025-05-26'), name: 'Memorial Day', type: 'market-closed', affectsExit: true },
  { date: new Date('2025-06-19'), name: 'Juneteenth', type: 'market-closed', affectsExit: true },
  { date: new Date('2025-07-04'), name: 'Independence Day', type: 'market-closed', affectsExit: true },
  { date: new Date('2025-09-01'), name: 'Labor Day', type: 'market-closed', affectsExit: true },
  { date: new Date('2025-11-27'), name: 'Thanksgiving', type: 'market-closed', affectsExit: true },
  { date: new Date('2025-11-28'), name: 'Day after Thanksgiving', type: 'early-close', affectsExit: false },
  { date: new Date('2025-12-25'), name: 'Christmas Day', type: 'market-closed', affectsExit: true }
]

const createMockTradingContext = (customState = {}) => ({
  portfolioSize: 100000,
  baseAllocation: 10,
  riskTolerance: 'Moderate' as const,
  breadthData: null,
  positionCalculations: null,
  plannedTrades: [],
  openPositions: [],
  holidayCalendar: mockHolidays,
  exitCalculations: [] as ExitCalculation[],
  updatePortfolioSettings: vi.fn(),
  updateBreadthData: vi.fn(),
  addPlannedTrade: vi.fn(),
  executeTradeFromPlan: vi.fn(),
  updateOpenPosition: vi.fn(),
  closePosition: vi.fn(),
  calculateExitDate: vi.fn(),
  validateTradingDay: vi.fn(),
  getNextTradingDay: vi.fn(),
  getHolidaysInRange: vi.fn(),
  ...customState
})

// Helper functions for date calculations
const addBusinessDays = (startDate: Date, businessDays: number, holidays: HolidayData[]): Date => {
  const result = new Date(startDate)
  let addedDays = 0
  
  while (addedDays < businessDays) {
    result.setDate(result.getDate() + 1)
    
    // Check if it's a weekend
    const dayOfWeek = result.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) continue
    
    // Check if it's a holiday
    const isHoliday = holidays.some(holiday => 
      holiday.affectsExit && 
      holiday.date.toDateString() === result.toDateString()
    )
    if (isHoliday) continue
    
    addedDays++
  }
  
  return result
}

const getVixBasedMaxHoldDays = (vix: number): number => {
  if (vix < 15) return 10
  if (vix < 25) return 7
  if (vix < 35) return 5
  return 3
}

describe('E2E: Holiday Calendar → Exit Date Calculations', () => {
  let mockContextValue: ReturnType<typeof createMockTradingContext>

  beforeEach(() => {
    vi.clearAllMocks()
    mockContextValue = createMockTradingContext()
    performanceMonitor.startMonitoring('holiday-calendar-workflow')
    
    // Mock the date calculation functions
    mockContextValue.calculateExitDate = vi.fn().mockImplementation((entryDate: Date, vix: number) => {
      const maxHoldDays = getVixBasedMaxHoldDays(vix)
      const exitDate = addBusinessDays(entryDate, maxHoldDays, mockHolidays)
      return exitDate
    })
    
    mockContextValue.getHolidaysInRange = vi.fn().mockImplementation((startDate: Date, endDate: Date) => {
      return mockHolidays.filter(holiday => 
        holiday.date >= startDate && holiday.date <= endDate
      )
    })
  })

  afterEach(() => {
    cleanup()
    const memoryLeak = performanceMonitor.checkMemoryLeak('holiday-calendar-workflow')
    expect(memoryLeak).toBeLessThan(1024 * 1024) // Less than 1MB memory increase
  })

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <TradingContext.Provider value={mockContextValue}>
        {children}
      </TradingContext.Provider>
    )
  }

  test('VIX-Based Max Hold Days: Low VIX (12) → 10 Days, High VIX (30) → 5 Days', async () => {
    performanceMonitor.measureRenderTime('holiday-calendar-workflow', () =>
      renderWithRouter(
        <TestWrapper>
          <div data-testid="position-calculator-component">
            <PositionCalculator />
          </div>
          <div data-testid="holiday-calendar-component">
            <HolidayCalendar />
          </div>
        </TestWrapper>
      )
    )

    // Test low VIX scenario
    const lowVixScenario = { ...marketBreadthScenarios.normalMarket, vix: 12 }
    await userSimulator.enterMarketBreadthData(lowVixScenario)

    await waitFor(() => {
      expect(screen.getByTestId('vix-level')).toHaveTextContent('12.0')
      expect(screen.getByTestId('max-hold-days')).toHaveTextContent('10 days')
      expect(screen.getByTestId('vix-category')).toHaveTextContent(/low/i)
    })

    // Test high VIX scenario
    const highVixScenario = { ...marketBreadthScenarios.normalMarket, vix: 30 }
    await userSimulator.enterMarketBreadthData(highVixScenario)

    await waitFor(() => {
      expect(screen.getByTestId('vix-level')).toHaveTextContent('30.0')
      expect(screen.getByTestId('max-hold-days')).toHaveTextContent('5 days')
      expect(screen.getByTestId('vix-category')).toHaveTextContent(/high/i)
    })
  })

  test('Holiday-Adjusted Exit Date: Entry Before Holiday → Skip Holiday → Next Trading Day', async () => {
    renderWithRouter(
      <TestWrapper>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
        <div data-testid="holiday-calendar-component">
          <HolidayCalendar />
        </div>
      </TestWrapper>
    )

    // Set entry date to January 15, 2025 (Wednesday)
    // With VIX 20 (7 business days), exit would normally be January 24
    // But January 20 is MLK Day, so should skip to January 27
    const entryDate = new Date('2025-01-15') // Wednesday
    const vix = 20

    // Mock date picker interaction
    const entryDatePicker = screen.getByLabelText(/entry.*date/i)
    await userSimulator.user.clear(entryDatePicker)
    await userSimulator.user.type(entryDatePicker, '2025-01-15')

    // Enter VIX and other market data
    const vixInput = screen.getByLabelText(/vix/i)
    await userSimulator.user.clear(vixInput)
    await userSimulator.user.type(vixInput, vix.toString())

    // Trigger calculation
    const calculateButton = screen.getByRole('button', { name: /calculate.*exit.*date/i })
    await userSimulator.user.click(calculateButton)

    // Verify holiday detection and adjustment
    await waitFor(() => {
      expect(screen.getByTestId('holidays-in-range')).toBeInTheDocument()
      expect(screen.getByTestId('holiday-mlk-day')).toHaveTextContent(/martin.*luther.*king/i)
      expect(screen.getByTestId('holiday-date')).toHaveTextContent(/january.*20/i)
    })

    // Verify exit date calculation
    await waitFor(() => {
      expect(screen.getByTestId('calculated-exit-date')).toHaveTextContent(/january.*27/i) // Skip MLK Day
      expect(screen.getByTestId('business-days-calculated')).toHaveTextContent('7')
      expect(screen.getByTestId('holidays-skipped')).toHaveTextContent('1')
    })
  })

  test('Weekend Adjustment: Exit Date Falls on Weekend → Move to Next Monday', async () => {
    renderWithRouter(
      <TestWrapper>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
        <div data-testid="holiday-calendar-component">
          <HolidayCalendar />
        </div>
      </TestWrapper>
    )

    // Set entry date that would result in weekend exit
    // Entry: Friday February 14, 2025 + 3 business days (high VIX) = Wednesday February 19
    // But let's test a scenario that lands on weekend
    const entryDate = new Date('2025-02-13') // Thursday
    const vix = 35 // High VIX = 3 business days, would be Tuesday Feb 18, but test weekend scenario

    const entryDatePicker = screen.getByLabelText(/entry.*date/i)
    await userSimulator.user.clear(entryDatePicker)
    await userSimulator.user.type(entryDatePicker, '2025-02-13')

    const vixInput = screen.getByLabelText(/vix/i)
    await userSimulator.user.clear(vixInput)
    await userSimulator.user.type(vixInput, vix.toString())

    const calculateButton = screen.getByRole('button', { name: /calculate.*exit.*date/i })
    await userSimulator.user.click(calculateButton)

    // Verify weekend detection and adjustment
    await waitFor(() => {
      expect(screen.getByTestId('weekend-adjustment')).toBeInTheDocument()
      expect(screen.getByTestId('weekend-adjustment-note')).toHaveTextContent(/moved.*to.*next.*monday/i)
    })
  })

  test('Complex Holiday Period: Thanksgiving Week → Multiple Days Skipped', async () => {
    renderWithRouter(
      <TestWrapper>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
        <div data-testid="holiday-calendar-component">
          <HolidayCalendar />
        </div>
      </TestWrapper>
    )

    // Entry before Thanksgiving week: November 20, 2025 (Thursday)
    // Normal 7-day hold would span Thanksgiving (Nov 27) + weekend
    const entryDate = new Date('2025-11-20') // Thursday
    const vix = 18 // Normal VIX = 7 business days

    const entryDatePicker = screen.getByLabelText(/entry.*date/i)
    await userSimulator.user.clear(entryDatePicker)
    await userSimulator.user.type(entryDatePicker, '2025-11-20')

    const vixInput = screen.getByLabelText(/vix/i)
    await userSimulator.user.clear(vixInput)
    await userSimulator.user.type(vixInput, vix.toString())

    const calculateButton = screen.getByRole('button', { name: /calculate.*exit.*date/i })
    await userSimulator.user.click(calculateButton)

    // Verify Thanksgiving holiday handling
    await waitFor(() => {
      expect(screen.getByTestId('holiday-thanksgiving')).toBeInTheDocument()
      expect(screen.getByTestId('thanksgiving-date')).toHaveTextContent(/november.*27/i)
      expect(screen.getByTestId('early-close-notice')).toHaveTextContent(/november.*28.*early.*close/i)
    })

    // Verify extended exit date due to holiday
    await waitFor(() => {
      expect(screen.getByTestId('calculated-exit-date')).toHaveTextContent(/december.*[1-5]/i) // After Thanksgiving week
      expect(screen.getByTestId('holiday-extension-days')).toHaveTextContent(/2.*additional.*days/i)
    })
  })

  test('Planned Trade Creation: Entry Date Selection → Auto Exit Date Calculation', async () => {
    renderWithRouter(
      <TestWrapper>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
        <div data-testid="planned-trades-component">
          <PlannedTrades />
        </div>
        <div data-testid="holiday-calendar-component">
          <HolidayCalendar />
        </div>
      </TestWrapper>
    )

    // Enter market breadth data
    const scenario = marketBreadthScenarios.normalMarket
    await userSimulator.enterMarketBreadthData(scenario)

    // Create planned trade with specific entry date
    const entryDate = new Date('2025-07-02') // Wednesday before July 4th holiday
    
    // Open planned trade creation form
    const createTradeButton = screen.getByTestId('create-planned-trade-button')
    await userSimulator.user.click(createTradeButton)

    // Set entry date
    const plannedEntryDatePicker = screen.getByLabelText(/planned.*entry.*date/i)
    await userSimulator.user.clear(plannedEntryDatePicker)
    await userSimulator.user.type(plannedEntryDatePicker, '2025-07-02')

    // Fill in trade details
    await userSimulator.createPlannedTrade({
      symbol: 'SPY',
      strategy: 'BIDBACK Normal',
      entryPrice: 425.00,
      quantity: 24
    })

    // Verify auto-calculated exit date accounts for July 4th
    await waitFor(() => {
      expect(screen.getByTestId('planned-exit-date')).toHaveTextContent(/july.*[7-9]/i) // After July 4th weekend
      expect(screen.getByTestId('holiday-notice')).toHaveTextContent(/july.*4.*independence.*day/i)
      expect(screen.getByTestId('planned-hold-days')).toHaveTextContent('7 business days')
    })
  })

  test('Open Position Monitoring: Days Remaining → Holiday-Adjusted Countdown', async () => {
    // Setup open position with holiday in remaining period
    const currentDate = new Date('2025-01-17') // Friday
    const entryDate = new Date('2025-01-15') // Wednesday, 2 days ago
    const vix = 20 // 7 business days total
    const expectedExitDate = new Date('2025-01-27') // After MLK Day

    const mockOpenPosition = {
      id: 'pos-holiday-test',
      symbol: 'SPY',
      strategy: 'BIDBACK Normal',
      entryPrice: 425.00,
      currentPrice: 430.00,
      quantity: 24,
      positionSize: 10200,
      unrealizedPnL: 120,
      unrealizedPnLPercent: 1.18,
      stopLoss: 411.25,
      profitTarget1: 446.25,
      profitTarget2: 467.50,
      daysHeld: 2,
      maxHoldDays: 7,
      entryDate,
      expectedExitDate,
      status: 'open' as const
    }

    mockContextValue.openPositions = [mockOpenPosition]

    // Mock current date
    vi.setSystemTime(currentDate)

    renderWithRouter(
      <TestWrapper>
        <div data-testid="open-positions-component">
          <OpenPositions />
        </div>
        <div data-testid="holiday-calendar-component">
          <HolidayCalendar />
        </div>
      </TestWrapper>
    )

    // Verify position display with holiday consideration
    await waitFor(() => {
      expect(screen.getByTestId('position-days-held')).toHaveTextContent('2 days')
      expect(screen.getByTestId('position-days-remaining')).toHaveTextContent('5 days') // 7 - 2 = 5 business days
      expect(screen.getByTestId('expected-exit-date')).toHaveTextContent(/january.*27/i)
    })

    // Verify holiday warning
    await waitFor(() => {
      expect(screen.getByTestId('holiday-in-period-warning')).toBeInTheDocument()
      expect(screen.getByTestId('holiday-name')).toHaveTextContent(/martin.*luther.*king/i)
      expect(screen.getByTestId('holiday-impact')).toHaveTextContent(/exit.*date.*adjusted/i)
    })

    // Simulate weekend passage (Monday Jan 20 is MLK Day)
    const mondayMLK = new Date('2025-01-20')
    vi.setSystemTime(mondayMLK)

    // Trigger position update
    const refreshButton = screen.getByTestId('refresh-positions-button')
    await userSimulator.user.click(refreshButton)

    // Verify holiday day handling
    await waitFor(() => {
      expect(screen.getByTestId('holiday-today-notice')).toBeInTheDocument()
      expect(screen.getByTestId('market-closed-today')).toHaveTextContent(/market.*closed.*today/i)
      expect(screen.getByTestId('position-days-held')).toHaveTextContent('3 days') // Business days only
    })
  })

  test('Real-Time Calendar Updates: Market Hours → Holiday Detection → Exit Adjustments', async () => {
    const performanceTestName = 'real-time-calendar'
    performanceMonitor.startMonitoring(performanceTestName)

    renderWithRouter(
      <TestWrapper>
        <div data-testid="holiday-calendar-component">
          <HolidayCalendar />
        </div>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
      </TestWrapper>
    )

    // Test multiple date scenarios rapidly
    const testScenarios = [
      { date: '2025-01-15', vix: 20, expectedSkips: ['MLK Day'] },
      { date: '2025-02-14', vix: 15, expectedSkips: ['Presidents Day'] },
      { date: '2025-04-15', vix: 25, expectedSkips: ['Good Friday'] },
      { date: '2025-11-20', vix: 18, expectedSkips: ['Thanksgiving'] }
    ]

    for (const scenario of testScenarios) {
      await performanceMonitor.measureInteractionLatency(performanceTestName, async () => {
        const entryDatePicker = screen.getByLabelText(/entry.*date/i)
        await userSimulator.user.clear(entryDatePicker)
        await userSimulator.user.type(entryDatePicker, scenario.date)

        const vixInput = screen.getByLabelText(/vix/i)
        await userSimulator.user.clear(vixInput)
        await userSimulator.user.type(vixInput, scenario.vix.toString())

        const calculateButton = screen.getByRole('button', { name: /calculate.*exit.*date/i })
        await userSimulator.user.click(calculateButton)

        await waitFor(() => {
          expect(screen.getByTestId('calculated-exit-date')).toBeInTheDocument()
          expect(screen.getByTestId('holidays-in-range')).toBeInTheDocument()
        }, { timeout: 1000 })
      })
    }

    // Validate performance during rapid calendar calculations
    performanceMonitor.validatePerformance(performanceTestName, {
      interactionLatency: 800, // Max 800ms per date calculation
      dataProcessingTime: 200   // Max 200ms for holiday lookup and calculation
    })
  })

  test('Edge Case: Year-End Holiday Cluster → Extended Exit Period', async () => {
    renderWithRouter(
      <TestWrapper>
        <div data-testid="position-calculator-component">
          <PositionCalculator />
        </div>
        <div data-testid="holiday-calendar-component">
          <HolidayCalendar />
        </div>
      </TestWrapper>
    )

    // Entry date in late December that spans New Year
    const entryDate = new Date('2024-12-24') // Tuesday before Christmas
    const vix = 18 // 7 business days

    const entryDatePicker = screen.getByLabelText(/entry.*date/i)
    await userSimulator.user.clear(entryDatePicker)
    await userSimulator.user.type(entryDatePicker, '2024-12-24')

    const vixInput = screen.getByLabelText(/vix/i)
    await userSimulator.user.clear(vixInput)
    await userSimulator.user.type(vixInput, vix.toString())

    const calculateButton = screen.getByRole('button', { name: /calculate.*exit.*date/i })
    await userSimulator.user.click(calculateButton)

    // Verify multiple holiday handling
    await waitFor(() => {
      expect(screen.getByTestId('multiple-holidays-warning')).toBeInTheDocument()
      expect(screen.getByTestId('holiday-christmas')).toHaveTextContent(/december.*25/i)
      expect(screen.getByTestId('holiday-new-year')).toHaveTextContent(/january.*1/i)
      expect(screen.getByTestId('extended-period-notice')).toHaveTextContent(/extended.*due.*to.*holidays/i)
    })

    // Verify exit date is well into new year
    await waitFor(() => {
      expect(screen.getByTestId('calculated-exit-date')).toHaveTextContent(/january.*[6-9]/i)
      expect(screen.getByTestId('total-calendar-days')).toHaveTextContent(/1[0-4].*days/i) // Much longer than normal 7 business days
    })
  })

  test('Performance: Complex Holiday Calculations → Memory Efficiency', async () => {
    const performanceTestName = 'complex-holiday-calculations'
    performanceMonitor.startMonitoring(performanceTestName)

    // Setup scenario with many positions spanning different holiday periods
    const multiplePositions = Array.from({ length: 10 }, (_, i) => {
      const entryDate = new Date('2025-01-01')
      entryDate.setDate(entryDate.getDate() + i * 30) // Monthly entries throughout year

      return {
        id: `holiday-pos-${i}`,
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
        daysHeld: 3,
        maxHoldDays: 7,
        entryDate,
        expectedExitDate: addBusinessDays(entryDate, 7, mockHolidays),
        status: 'open' as const
      }
    })

    mockContextValue.openPositions = multiplePositions

    renderWithRouter(
      <TestWrapper>
        <div data-testid="open-positions-component">
          <OpenPositions />
        </div>
        <div data-testid="holiday-calendar-component">
          <HolidayCalendar />
        </div>
      </TestWrapper>
    )

    // Trigger bulk holiday calculations
    await performanceMonitor.measureInteractionLatency(performanceTestName, async () => {
      const recalculateAllButton = screen.getByTestId('recalculate-all-exit-dates')
      await userSimulator.user.click(recalculateAllButton)

      await waitFor(() => {
        expect(screen.getByTestId('bulk-calculation-complete')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    // Validate performance with multiple holiday calculations
    performanceMonitor.validatePerformance(performanceTestName, {
      interactionLatency: 2000, // Max 2s for bulk calculations
      dataProcessingTime: 500    // Max 500ms processing time
    })

    // Check memory efficiency
    const memoryIncrease = performanceMonitor.checkMemoryLeak(performanceTestName)
    expect(memoryIncrease).toBeLessThan(3 * 1024 * 1024) // Less than 3MB for complex calculations
  })
})