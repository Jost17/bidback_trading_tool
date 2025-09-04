/**
 * Test Data Fixtures and Mocking Strategies
 * Provides consistent test data, mocks, and utilities for Market Breadth testing
 */

import type { 
  BreadthData, 
  MarketDataInput, 
  PositionCalculation,
  MarketSignals,
  VIXLevel
} from '../../../../types/trading'

// =============================================================================
// Market Breadth Test Data Fixtures
// =============================================================================

export const mockBreadthData: Record<string, BreadthData> = {
  // Big Opportunity Scenario
  bigOpportunity: {
    id: 1,
    date: '2025-01-15',
    timestamp: '2025-01-15T10:00:00.000Z',
    advancingIssues: 1200,
    decliningIssues: 100,
    newHighs: 45,
    newLows: 5,
    upVolume: 3500000000,
    downVolume: 500000000,
    breadthScore: 85.2,
    stocks_up_4pct: 1200,
    stocks_down_4pct: 100,
    t2108: 15,
    sp500: '5847',
    ratio_5day: 12.0,
    ratio_10day: 11.8,
    worden_universe: 7000,
    dataSource: 'manual',
    notes: 'Big Opportunity: T2108=15, Up4%=1200'
  },

  // Avoid Entry Scenario
  avoidEntry: {
    id: 2,
    date: '2025-01-16',
    timestamp: '2025-01-16T10:00:00.000Z',
    advancingIssues: 80,
    decliningIssues: 400,
    newHighs: 5,
    newLows: 45,
    upVolume: 800000000,
    downVolume: 4000000000,
    breadthScore: 25.3,
    stocks_up_4pct: 80,
    stocks_down_4pct: 400,
    t2108: 85,
    sp500: '5820',
    ratio_5day: 0.2,
    ratio_10day: 0.25,
    worden_universe: 7000,
    dataSource: 'manual',
    notes: 'Avoid Entry: T2108=85, Up4%=80'
  },

  // Normal Market Conditions
  normalMarket: {
    id: 3,
    date: '2025-01-17',
    timestamp: '2025-01-17T10:00:00.000Z',
    advancingIssues: 400,
    decliningIssues: 300,
    newHighs: 25,
    newLows: 20,
    upVolume: 2000000000,
    downVolume: 1500000000,
    breadthScore: 55.7,
    stocks_up_4pct: 400,
    stocks_down_4pct: 300,
    t2108: 45,
    sp500: '5835',
    ratio_5day: 1.33,
    ratio_10day: 1.28,
    worden_universe: 7000,
    dataSource: 'manual',
    notes: 'Normal conditions: T2108=45, Up4%=400'
  },

  // Strong Breadth (1.5x multiplier)
  strongBreadth: {
    id: 4,
    date: '2025-01-18',
    timestamp: '2025-01-18T10:00:00.000Z',
    advancingIssues: 800,
    decliningIssues: 200,
    newHighs: 35,
    newLows: 10,
    upVolume: 2800000000,
    downVolume: 800000000,
    breadthScore: 72.1,
    stocks_up_4pct: 800,
    stocks_down_4pct: 200,
    t2108: 35,
    sp500: '5855',
    ratio_5day: 4.0,
    ratio_10day: 3.8,
    worden_universe: 7000,
    dataSource: 'manual',
    notes: 'Strong breadth: T2108=35, Up4%=800'
  },

  // Weak Breadth (0.5x multiplier)
  weakBreadth: {
    id: 5,
    date: '2025-01-19',
    timestamp: '2025-01-19T10:00:00.000Z',
    advancingIssues: 180,
    decliningIssues: 220,
    newHighs: 10,
    newLows: 25,
    upVolume: 1200000000,
    downVolume: 1800000000,
    breadthScore: 42.5,
    stocks_up_4pct: 180,
    stocks_down_4pct: 220,
    t2108: 55,
    sp500: '5825',
    ratio_5day: 0.82,
    ratio_10day: 0.85,
    worden_universe: 7000,
    dataSource: 'manual',
    notes: 'Weak breadth: T2108=55, Up4%=180'
  },

  // CSV Import Sample
  csvImportSample: {
    id: 6,
    date: '2025-01-20',
    timestamp: '2025-01-20T10:00:00.000Z',
    advancingIssues: 600,
    decliningIssues: 250,
    newHighs: 30,
    newLows: 15,
    upVolume: 2200000000,
    downVolume: 1100000000,
    breadthScore: 65.8,
    stocks_up_4pct: 600,
    stocks_down_4pct: 250,
    stocks_up_25pct_quarter: 450,
    stocks_down_25pct_quarter: 180,
    stocks_up_25pct_month: 320,
    stocks_down_25pct_month: 120,
    stocks_up_50pct_month: 150,
    stocks_down_50pct_month: 80,
    stocks_up_13pct_34days: 420,
    stocks_down_13pct_34days: 200,
    t2108: 42,
    sp500: '5842',
    ratio_5day: 2.4,
    ratio_10day: 2.2,
    worden_universe: 7000,
    dataSource: 'imported',
    source_file: 'test_import.csv',
    notes: 'RECOVERED: up4%=600, down4%=250, T2108=42, SP=5842, up25quarter=450, down25quarter=180'
  }
}

// =============================================================================
// Form Input Test Data
// =============================================================================

export const mockFormData: Record<string, MarketDataInput> = {
  bigOpportunity: {
    date: '2025-01-15',
    stocks_up_4pct: '1200',
    stocks_down_4pct: '100',
    stocks_up_25pct_quarter: '800',
    stocks_down_25pct_quarter: '80',
    stocks_up_25pct_month: '600',
    stocks_down_25pct_month: '60',
    stocks_up_50pct_month: '300',
    stocks_down_50pct_month: '30',
    stocks_up_13pct_34days: '900',
    stocks_down_13pct_34days: '75',
    ratio_5day: '12.0',
    ratio_10day: '11.8',
    t2108: '15',
    worden_t2108: '15',
    sp_reference: '5847',
    stocks_up_20pct: '400',
    stocks_down_20pct: '40',
    stocks_up_20dollar: '350',
    stocks_down_20dollar: '35',
    worden_universe: '7000',
    sp500: '5847'
  },

  avoidEntry: {
    date: '2025-01-16',
    stocks_up_4pct: '80',
    stocks_down_4pct: '400',
    stocks_up_25pct_quarter: '60',
    stocks_down_25pct_quarter: '300',
    stocks_up_25pct_month: '40',
    stocks_down_25pct_month: '250',
    stocks_up_50pct_month: '20',
    stocks_down_50pct_month: '150',
    stocks_up_13pct_34days: '50',
    stocks_down_13pct_34days: '320',
    ratio_5day: '0.2',
    ratio_10day: '0.25',
    t2108: '85',
    worden_t2108: '85',
    sp_reference: '5820',
    stocks_up_20pct: '30',
    stocks_down_20pct: '200',
    stocks_up_20dollar: '25',
    stocks_down_20dollar: '180',
    worden_universe: '7000',
    sp500: '5820'
  },

  emptyForm: {
    date: new Date().toISOString().split('T')[0],
    stocks_up_4pct: '',
    stocks_down_4pct: '',
    stocks_up_25pct_quarter: '',
    stocks_down_25pct_quarter: '',
    stocks_up_25pct_month: '',
    stocks_down_25pct_month: '',
    stocks_up_50pct_month: '',
    stocks_down_50pct_month: '',
    stocks_up_13pct_34days: '',
    stocks_down_13pct_34days: '',
    ratio_5day: '',
    ratio_10day: '',
    t2108: '',
    worden_t2108: '',
    sp_reference: '',
    stocks_up_20pct: '',
    stocks_down_20pct: '',
    stocks_up_20dollar: '',
    stocks_down_20dollar: '',
    worden_universe: '',
    sp500: ''
  }
}

// =============================================================================
// VIX Test Scenarios
// =============================================================================

export const vixTestScenarios = [
  { vix: 8.5, level: 'ultra-low' as VIXLevel, multiplier: 0.8, holdDays: 10 },
  { vix: 13.2, level: 'low' as VIXLevel, multiplier: 0.9, holdDays: 8 },
  { vix: 17.8, level: 'normal' as VIXLevel, multiplier: 1.0, holdDays: 6 },
  { vix: 22.5, level: 'elevated' as VIXLevel, multiplier: 1.1, holdDays: 5 },
  { vix: 28.3, level: 'high' as VIXLevel, multiplier: 1.2, holdDays: 4 },
  { vix: 42.7, level: 'extreme' as VIXLevel, multiplier: 1.4, holdDays: 2 }
]

// =============================================================================
// Position Calculator Test Scenarios
// =============================================================================

export const positionCalculatorScenarios = [
  {
    name: 'Big Opportunity with Low VIX',
    t2108: 15,
    up4pct: 1200,
    down4pct: 100,
    vix: 12.0,
    portfolioSize: 100000,
    expectedBreadthMultiplier: 2.0,
    expectedVixMultiplier: 0.8,
    expectedFinalPosition: 16000, // 10k * 2.0 * 0.8
    expectedSignals: {
      bigOpportunity: true,
      avoidEntry: false,
      breadthStrength: 'strong' as const
    }
  },
  {
    name: 'Avoid Entry - Low Up4%',
    t2108: 50,
    up4pct: 100,
    down4pct: 300,
    vix: 20.0,
    portfolioSize: 100000,
    expectedBreadthMultiplier: 0.3,
    expectedVixMultiplier: 1.0,
    expectedFinalPosition: 3000, // 10k * 0.3 * 1.0
    expectedSignals: {
      bigOpportunity: false,
      avoidEntry: true,
      breadthStrength: 'weak' as const
    }
  },
  {
    name: 'No Entry - Very Low Up4%',
    t2108: 40,
    up4pct: 80,
    down4pct: 200,
    vix: 18.0,
    portfolioSize: 100000,
    expectedBreadthMultiplier: 0.0,
    expectedVixMultiplier: 1.0,
    expectedFinalPosition: 0, // 10k * 0.0 * 1.0
    expectedSignals: {
      bigOpportunity: false,
      avoidEntry: true,
      breadthStrength: 'weak' as const
    }
  },
  {
    name: 'Strong Breadth with High VIX',
    t2108: 35,
    up4pct: 800,
    down4pct: 200,
    vix: 30.0,
    portfolioSize: 100000,
    expectedBreadthMultiplier: 1.5,
    expectedVixMultiplier: 1.2,
    expectedFinalPosition: 18000, // 10k * 1.5 * 1.2
    expectedSignals: {
      bigOpportunity: false,
      avoidEntry: false,
      breadthStrength: 'moderate' as const
    }
  }
]

// =============================================================================
// Edge Case Test Data
// =============================================================================

export const edgeCaseTestData = {
  extremeValues: {
    vix: {
      negative: -10.5,
      zero: 0,
      veryHigh: 150.0,
      decimal: 18.123456789
    },
    marketBreadth: {
      negativeUp4pct: -100,
      zeroUp4pct: 0,
      extremelyHighUp4pct: 50000,
      negativeT2108: -25,
      zeroT2108: 0,
      extremelyHighT2108: 999
    },
    portfolioSize: {
      zero: 0,
      small: 100,
      large: 1000000000,
      decimal: 99999.99
    }
  },
  
  invalidInputs: {
    nonNumeric: ['abc', 'NaN', 'infinity', '!@#$%', 'null', 'undefined'],
    scientificNotation: ['1e3', '2.5e1', '1.23e-2'],
    multipleDecimals: ['12.3.4.5', '1..23', '.123.'],
    specialCharacters: ['12,345', '1 000', '$100', '100%']
  },

  boundaryValues: {
    t2108: {
      min: 0,
      max: 100,
      justUnder20: 19.99,
      exactly20: 20.0,
      justOver70: 70.01,
      exactly70: 70.0
    },
    up4pct: {
      min: 0,
      justUnder100: 99,
      exactly100: 100,
      justUnder150: 149,
      exactly150: 150,
      justOver1000: 1001,
      exactly1000: 1000
    }
  }
}

// =============================================================================
// Mock Functions and Utilities
// =============================================================================

export const createMockCalculationResult = (overrides: any = {}) => ({
  score: 75.5,
  normalizedScore: 72.3,
  confidence: 0.95,
  market_condition: {
    phase: 'BULL',
    trend_direction: 'UP',
    strength: 'STRONG'
  },
  metadata: {
    algorithm_used: 'enhanced_v2',
    data_quality: 98,
    calculation_time: 45
  },
  ...overrides
})

export const createMockPositionCalculation = (
  t2108: number, 
  up4pct: number, 
  vix: number, 
  portfolioSize: number = 100000
): PositionCalculation => {
  const basePosition = portfolioSize * 0.10

  // Calculate breadth multiplier
  let breadthMultiplier = 1.0
  if (up4pct < 100) breadthMultiplier = 0.0
  else if (up4pct < 150) breadthMultiplier = 0.3
  else if (up4pct < 200) breadthMultiplier = 0.5
  else if (up4pct > 1000 && t2108 < 30) breadthMultiplier = 2.0
  else if (up4pct > 500 && t2108 < 40) breadthMultiplier = 1.5

  // Calculate VIX multiplier
  const vixMultiplier = 
    vix < 12 ? 0.8 : 
    vix < 15 ? 0.9 : 
    vix < 20 ? 1.0 : 
    vix < 25 ? 1.1 : 
    vix < 35 ? 1.2 : 1.4

  const finalPosition = Math.min(
    basePosition * vixMultiplier * breadthMultiplier, 
    portfolioSize * 0.30
  )

  const bigOpportunity = t2108 < 20 && up4pct > 1000
  const avoidEntry = up4pct < 150 || t2108 > 70

  return {
    basePosition,
    vixMultiplier,
    breadthMultiplier,
    finalPosition,
    portfolioHeatPercent: (finalPosition / portfolioSize) * 100,
    bigOpportunity,
    avoidEntry
  }
}

export const createMockMarketSignals = (
  t2108: number, 
  up4pct: number, 
  down4pct: number,
  vix: number
): MarketSignals => {
  const bigOpportunity = t2108 < 20 && up4pct > 1000
  const avoidEntry = up4pct < 150 || t2108 > 70

  let positionDeterioration = 0
  if (t2108 > 65) positionDeterioration += 1
  if (down4pct > up4pct) positionDeterioration += 1
  if (up4pct < 150) positionDeterioration += 2

  const vixRegime: VIXLevel = 
    vix < 12 ? 'ultra-low' :
    vix < 15 ? 'low' :
    vix < 20 ? 'normal' :
    vix < 25 ? 'elevated' :
    vix < 35 ? 'high' : 'extreme'

  const breadthStrength = 
    up4pct > 1000 ? 'strong' :
    up4pct > 500 ? 'moderate' : 'weak'

  return {
    bigOpportunity,
    avoidEntry,
    positionDeterioration,
    vixRegime,
    breadthStrength
  }
}

// =============================================================================
// Test Utilities
// =============================================================================

export const fillMarketBreadthForm = async (
  screen: any,
  fireEvent: any,
  formData: MarketDataInput
) => {
  if (formData.date) {
    fireEvent.change(screen.getByLabelText(/Date/i), { target: { value: formData.date } })
  }
  
  if (formData.stocks_up_4pct) {
    fireEvent.change(screen.getByLabelText(/Stocks Up 4% Daily/i), { 
      target: { value: formData.stocks_up_4pct } 
    })
  }
  
  if (formData.stocks_down_4pct) {
    fireEvent.change(screen.getByLabelText(/Stocks Down 4% Daily/i), { 
      target: { value: formData.stocks_down_4pct } 
    })
  }
  
  if (formData.t2108) {
    fireEvent.change(screen.getByLabelText(/T2108/i), { 
      target: { value: formData.t2108 } 
    })
  }

  if (formData.sp500) {
    fireEvent.change(screen.getByLabelText(/S&P 500 Level/i), { 
      target: { value: formData.sp500 } 
    })
  }

  if (formData.worden_universe) {
    fireEvent.change(screen.getByLabelText(/Worden Universe/i), { 
      target: { value: formData.worden_universe } 
    })
  }
}

export const fillVixField = (screen: any, fireEvent: any, vixValue: string) => {
  fireEvent.change(screen.getByLabelText(/VIX Level/i), { 
    target: { value: vixValue } 
  })
}

export const expectPositionCalculatorValues = (
  screen: any,
  expectedValues: {
    portfolioSize?: number
    basePosition?: number
    vixMultiplier?: number
    breadthMultiplier?: number
    finalPosition?: number
    bigOpportunity?: boolean
    avoidEntry?: boolean
  }
) => {
  if (expectedValues.portfolioSize) {
    expect(screen.getByText(`$${expectedValues.portfolioSize.toLocaleString()}`)).toBeInTheDocument()
  }
  
  if (expectedValues.basePosition) {
    expect(screen.getByText(`$${expectedValues.basePosition.toLocaleString()}`)).toBeInTheDocument()
  }
  
  if (expectedValues.vixMultiplier) {
    expect(screen.getByText(`${expectedValues.vixMultiplier.toFixed(1)}x`)).toBeInTheDocument()
  }
  
  if (expectedValues.breadthMultiplier) {
    expect(screen.getByText(`${expectedValues.breadthMultiplier.toFixed(1)}x`)).toBeInTheDocument()
  }
  
  if (expectedValues.finalPosition) {
    expect(screen.getByText(`$${expectedValues.finalPosition.toLocaleString()}`)).toBeInTheDocument()
  }
  
  if (expectedValues.bigOpportunity !== undefined) {
    if (expectedValues.bigOpportunity) {
      expect(screen.getByText(/Big Opportunity detected!/i)).toBeInTheDocument()
    } else {
      expect(screen.getByText(/Not triggered/i)).toBeInTheDocument()
    }
  }
  
  if (expectedValues.avoidEntry !== undefined) {
    if (expectedValues.avoidEntry) {
      expect(screen.getByText(/⚠️ Avoid Entry/i)).toBeInTheDocument()
    } else {
      expect(screen.getByText(/✅ Entry OK/i)).toBeInTheDocument()
    }
  }
}

// Export default collection
export default {
  mockBreadthData,
  mockFormData,
  vixTestScenarios,
  positionCalculatorScenarios,
  edgeCaseTestData,
  createMockCalculationResult,
  createMockPositionCalculation,
  createMockMarketSignals,
  fillMarketBreadthForm,
  fillVixField,
  expectPositionCalculatorValues
}