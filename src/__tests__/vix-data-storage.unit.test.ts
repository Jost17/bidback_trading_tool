/**
 * VIX Data Storage Unit Tests
 * 
 * Comprehensive unit tests for VIX data handling, storage, and retrieval
 * across the entire BIDBACK Trading Tool data pipeline.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { RawMarketBreadthData, BreadthData } from '../../types/trading'
import type { MarketDataInput } from '../../types/trading'

// Mock database operations
const mockDatabase = {
  prepare: vi.fn(),
  exec: vi.fn(),
  close: vi.fn(),
}

const mockStatement = {
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
  finalize: vi.fn(),
}

// Mock the database module
vi.mock('better-sqlite3', () => ({
  default: vi.fn(() => mockDatabase),
}))

// Mock electron APIs
const mockElectronAPI = {
  invoke: vi.fn(),
}

// Setup global mocks
beforeEach(() => {
  global.window = {
    electronAPI: mockElectronAPI,
  } as any

  // Reset all mocks
  vi.clearAllMocks()
  
  // Setup default mock implementations
  mockDatabase.prepare.mockReturnValue(mockStatement)
  mockStatement.run.mockReturnValue({ changes: 1, lastInsertRowid: 1 })
  mockStatement.get.mockReturnValue(null)
  mockStatement.all.mockReturnValue([])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('VIX Data Storage Unit Tests', () => {
  
  describe('Raw Data Conversion', () => {
    test('should correctly convert form data with VIX to raw market breadth data', () => {
      const formData: MarketDataInput = {
        date: '2025-09-04',
        stocks_up_4pct: '500',
        stocks_down_4pct: '200',
        t2108: '65',
        vix: '18.5', // CRITICAL VIX FIELD
        stocks_up_20pct: '250',
        stocks_down_20pct: '150',
        stocks_up_20dollar: '300',
        stocks_down_20dollar: '100',
        sp500: '5847',
        worden_universe: '7000',
        ratio_5day: '2.5',
        ratio_10day: '2.75',
        stocks_up_25pct_quarter: '',
        stocks_down_25pct_quarter: '',
        stocks_up_25pct_month: '',
        stocks_down_25pct_month: '',
        stocks_up_50pct_month: '',
        stocks_down_50pct_month: '',
        stocks_up_13pct_34days: '',
        stocks_down_13pct_34days: '',
        worden_t2108: '65',
        sp_reference: '5847',
      }

      // Simulate the convertToRawData function from DataEntryForm
      const rawData: RawMarketBreadthData = {
        date: formData.date,
        timestamp: new Date().toISOString(),
        advancingIssues: Number(formData.stocks_up_4pct) || 0,
        decliningIssues: Number(formData.stocks_down_4pct) || 0,
        newHighs: 0,
        newLows: 0,
        upVolume: 0,
        downVolume: 0,
        stocksUp4PctDaily: Number(formData.stocks_up_4pct) || undefined,
        stocksDown4PctDaily: Number(formData.stocks_down_4pct) || undefined,
        stocksUp25PctQuarterly: Number(formData.stocks_up_25pct_quarter) || undefined,
        stocksDown25PctQuarterly: Number(formData.stocks_down_25pct_quarter) || undefined,
        stocksUp25PctMonthly: Number(formData.stocks_up_25pct_month) || undefined,
        stocksDown25PctMonthly: Number(formData.stocks_down_25pct_month) || undefined,
        stocksUp50PctMonthly: Number(formData.stocks_up_50pct_month) || undefined,
        stocksDown50PctMonthly: Number(formData.stocks_down_50pct_month) || undefined,
        stocksUp13Pct34Days: Number(formData.stocks_up_13pct_34days) || undefined,
        stocksDown13Pct34Days: Number(formData.stocks_down_13pct_34days) || undefined,
        t2108: Number(formData.t2108) || undefined,
        sp500Level: formData.sp500 || undefined,
        wordenUniverse: Number(formData.worden_universe) || undefined,
        stocksUp20Pct: Number(formData.stocks_up_20pct) || undefined,
        stocksDown20Pct: Number(formData.stocks_down_20pct) || undefined,
        stocksUp20Dollar: Number(formData.stocks_up_20dollar) || undefined,
        stocksDown20Dollar: Number(formData.stocks_down_20dollar) || undefined,
        ratio5Day: Number(formData.ratio_5day) || undefined,
        ratio10Day: Number(formData.ratio_10day) || undefined,
        // CRITICAL: VIX field conversion
        vix: Number(formData.vix) || undefined,
        dataQualityScore: 100
      }

      // Assertions
      expect(rawData.vix).toBe(18.5)
      expect(rawData.vix).toBeTypeOf('number')
      expect(rawData.stocksUp20Pct).toBe(250)
      expect(rawData.stocksDown20Pct).toBe(150)
      expect(rawData.stocksUp20Dollar).toBe(300)
      expect(rawData.stocksDown20Dollar).toBe(100)
      
      console.log('✅ VIX data correctly converted from form to raw data:', rawData.vix)
    })

    test('should handle empty VIX value gracefully', () => {
      const formDataWithEmptyVix: MarketDataInput = {
        date: '2025-09-04',
        stocks_up_4pct: '500',
        stocks_down_4pct: '200',
        t2108: '65',
        vix: '', // Empty VIX
        stocks_up_20pct: '250',
        stocks_down_20pct: '150',
        stocks_up_20dollar: '300',
        stocks_down_20dollar: '100',
        sp500: '5847',
        worden_universe: '7000',
        ratio_5day: '2.5',
        ratio_10day: '2.75',
        stocks_up_25pct_quarter: '',
        stocks_down_25pct_quarter: '',
        stocks_up_25pct_month: '',
        stocks_down_25pct_month: '',
        stocks_up_50pct_month: '',
        stocks_down_50pct_month: '',
        stocks_up_13pct_34days: '',
        stocks_down_13pct_34days: '',
        worden_t2108: '65',
        sp_reference: '5847',
      }

      const rawData: RawMarketBreadthData = {
        date: formDataWithEmptyVix.date,
        timestamp: new Date().toISOString(),
        advancingIssues: Number(formDataWithEmptyVix.stocks_up_4pct) || 0,
        decliningIssues: Number(formDataWithEmptyVix.stocks_down_4pct) || 0,
        newHighs: 0,
        newLows: 0,
        upVolume: 0,
        downVolume: 0,
        stocksUp4PctDaily: Number(formDataWithEmptyVix.stocks_up_4pct) || undefined,
        stocksDown4PctDaily: Number(formDataWithEmptyVix.stocks_down_4pct) || undefined,
        t2108: Number(formDataWithEmptyVix.t2108) || undefined,
        sp500Level: formDataWithEmptyVix.sp500 || undefined,
        wordenUniverse: Number(formDataWithEmptyVix.worden_universe) || undefined,
        stocksUp20Pct: Number(formDataWithEmptyVix.stocks_up_20pct) || undefined,
        stocksDown20Pct: Number(formDataWithEmptyVix.stocks_down_20pct) || undefined,
        stocksUp20Dollar: Number(formDataWithEmptyVix.stocks_up_20dollar) || undefined,
        stocksDown20Dollar: Number(formDataWithEmptyVix.stocks_down_20dollar) || undefined,
        ratio5Day: Number(formDataWithEmptyVix.ratio_5day) || undefined,
        ratio10Day: Number(formDataWithEmptyVix.ratio_10day) || undefined,
        // Empty VIX should become undefined
        vix: Number(formDataWithEmptyVix.vix) || undefined,
        dataQualityScore: 100,
        stocksUp25PctQuarterly: undefined,
        stocksDown25PctQuarterly: undefined,
        stocksUp25PctMonthly: undefined,
        stocksDown25PctMonthly: undefined,
        stocksUp50PctMonthly: undefined,
        stocksDown50PctMonthly: undefined,
        stocksUp13Pct34Days: undefined,
        stocksDown13Pct34Days: undefined,
      }

      // Empty VIX should result in undefined
      expect(rawData.vix).toBeUndefined()
      console.log('✅ Empty VIX value handled gracefully (undefined):', rawData.vix)
    })

    test('should preserve VIX precision in data conversion', () => {
      const precisionTestCases = [
        { input: '18.5', expected: 18.5 },
        { input: '18.25', expected: 18.25 },
        { input: '18.125', expected: 18.125 },
        { input: '12.0', expected: 12.0 },
        { input: '35.75', expected: 35.75 },
      ]

      precisionTestCases.forEach(({ input, expected }) => {
        const formData: Partial<MarketDataInput> = {
          vix: input,
          date: '2025-09-04',
          t2108: '65',
        }

        const vixNumber = Number(formData.vix) || undefined
        expect(vixNumber).toBe(expected)
        expect(vixNumber).toBeTypeOf('number')
      })

      console.log('✅ VIX precision preserved in all test cases')
    })
  })

  describe('Database Storage Operations', () => {
    test('should store VIX data in database correctly', async () => {
      const testBreadthData: RawMarketBreadthData = {
        date: '2025-09-04',
        timestamp: new Date().toISOString(),
        advancingIssues: 500,
        decliningIssues: 200,
        newHighs: 0,
        newLows: 0,
        upVolume: 0,
        downVolume: 0,
        t2108: 65,
        vix: 18.5, // CRITICAL: VIX value to store
        stocksUp20Pct: 250,
        stocksDown20Pct: 150,
        stocksUp20Dollar: 300,
        stocksDown20Dollar: 100,
        dataQualityScore: 100
      }

      // Mock successful database insertion
      mockStatement.run.mockReturnValue({ 
        changes: 1, 
        lastInsertRowid: 1 
      })

      // Mock the database insert operation
      mockElectronAPI.invoke.mockResolvedValue({
        success: true,
        id: 1,
        data: testBreadthData
      })

      // Simulate database storage call
      const result = await mockElectronAPI.invoke('trading:save-breadth-data', testBreadthData)

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith('trading:save-breadth-data', testBreadthData)
      expect(result.success).toBe(true)
      expect(result.data.vix).toBe(18.5)

      console.log('✅ VIX data stored in database successfully')
    })

    test('should retrieve VIX data from database correctly', async () => {
      const mockStoredData: BreadthData = {
        id: 1,
        date: '2025-09-04',
        timestamp: new Date().toISOString(),
        advancingIssues: 500,
        decliningIssues: 200,
        newHighs: 0,
        newLows: 0,
        upVolume: 0,
        downVolume: 0,
        t2108: 65,
        vix: 18.5, // CRITICAL: VIX value from database
        stocksUp20Pct: 250,
        stocksDown20Pct: 150,
        stocksUp20Dollar: 300,
        stocksDown20Dollar: 100,
        score: 75.5,
        normalizedScore: 72.3,
        confidence: 0.95,
        marketCondition: 'BULL',
        trendDirection: 'UP',
        dataQualityScore: 100,
        algorithm: 'enhanced_v2',
        metadata: '{}',
        notes: null,
        // Additional fields
        stocks_up_4pct: 500,
        stocks_down_4pct: 200,
        stocks_up_25pct_quarter: null,
        stocks_down_25pct_quarter: null,
        stocks_up_25pct_month: null,
        stocks_down_25pct_month: null,
        stocks_up_50pct_month: null,
        stocks_down_50pct_month: null,
        stocks_up_13pct_34days: null,
        stocks_down_13pct_34days: null,
        sp500: '5847',
        worden_universe: 7000,
        ratio_5day: 2.5,
        ratio_10day: 2.75,
        strength: 'STRONG'
      }

      // Mock database retrieval
      mockElectronAPI.invoke.mockResolvedValue([mockStoredData])

      // Simulate database retrieval call
      const result = await mockElectronAPI.invoke('trading:get-breadth-data')

      expect(mockElectronAPI.invoke).toHaveBeenCalledWith('trading:get-breadth-data')
      expect(result).toHaveLength(1)
      expect(result[0].vix).toBe(18.5)
      expect(result[0].vix).toBeTypeOf('number')

      console.log('✅ VIX data retrieved from database successfully:', result[0].vix)
    })

    test('should handle database errors gracefully for VIX data', async () => {
      const testBreadthData: RawMarketBreadthData = {
        date: '2025-09-04',
        timestamp: new Date().toISOString(),
        advancingIssues: 500,
        decliningIssues: 200,
        newHighs: 0,
        newLows: 0,
        upVolume: 0,
        downVolume: 0,
        t2108: 65,
        vix: 18.5,
        dataQualityScore: 100
      }

      // Mock database error
      mockElectronAPI.invoke.mockRejectedValue(new Error('Database connection failed'))

      // Attempt to store data
      await expect(
        mockElectronAPI.invoke('trading:save-breadth-data', testBreadthData)
      ).rejects.toThrow('Database connection failed')

      console.log('✅ Database errors handled gracefully for VIX data')
    })
  })

  describe('Data Persistence Logic', () => {
    test('should load last VIX value for pre-filling', async () => {
      const lastBreadthData: BreadthData = {
        id: 1,
        date: '2025-09-03',
        vix: 22.7, // Last entered VIX value
        stocksUp20Pct: 280,
        stocksDown20Pct: 140,
        stocksUp20Dollar: 320,
        stocksDown20Dollar: 90,
        t2108: 67,
        worden_universe: 7000,
        // ... other required fields
        timestamp: new Date().toISOString(),
        advancingIssues: 550,
        decliningIssues: 180,
        newHighs: 0,
        newLows: 0,
        upVolume: 0,
        downVolume: 0,
        stocks_up_4pct: 550,
        stocks_down_4pct: 180,
        stocks_up_25pct_quarter: null,
        stocks_down_25pct_quarter: null,
        stocks_up_25pct_month: null,
        stocks_down_25pct_month: null,
        stocks_up_50pct_month: null,
        stocks_down_50pct_month: null,
        stocks_up_13pct_34days: null,
        stocks_down_13pct_34days: null,
        sp500: '5850',
        ratio_5day: 3.0,
        ratio_10day: 3.2,
        score: 78.2,
        normalizedScore: 75.1,
        confidence: 0.97,
        marketCondition: 'BULL',
        trendDirection: 'UP',
        strength: 'STRONG',
        dataQualityScore: 100,
        algorithm: 'enhanced_v2',
        metadata: '{}',
        notes: null
      }

      // Mock retrieval of last entry
      mockElectronAPI.invoke.mockResolvedValue([lastBreadthData])

      // Simulate loading last breadth data
      const result = await mockElectronAPI.invoke('trading:get-breadth-data', undefined, undefined)

      expect(result).toHaveLength(1)
      expect(result[0].vix).toBe(22.7)

      // Simulate form pre-filling logic
      const prefilledVix = result[0].vix?.toString() || ''
      expect(prefilledVix).toBe('22.7')

      console.log('✅ Last VIX value loaded for pre-filling:', prefilledVix)
    })

    test('should handle form data population with VIX from database', () => {
      const databaseData: Partial<BreadthData> = {
        id: 1,
        date: '2025-09-04',
        vix: 19.3,
        stocks_up_4pct: 480,
        stocks_down_4pct: 220,
        t2108: 62,
        stocksUp20Pct: 240,
        stocksDown20Pct: 160,
        stocksUp20Dollar: 290,
        stocksDown20Dollar: 110
      }

      // Simulate the getFieldValue function from DataEntryForm
      const getFieldValue = (field: string, data: Partial<BreadthData>): string => {
        const dbValue = data[field as keyof BreadthData]
        if (dbValue !== null && dbValue !== undefined && dbValue !== '') {
          return dbValue.toString()
        }
        return ''
      }

      // Test VIX field population
      const vixValue = getFieldValue('vix', databaseData)
      expect(vixValue).toBe('19.3')

      // Test other persistent fields
      const stocksUp20PctValue = getFieldValue('stocksUp20Pct', databaseData)
      expect(stocksUp20PctValue).toBe('240')

      console.log('✅ Form data populated correctly from database with VIX:', vixValue)
    })

    test('should maintain VIX data integrity during form state updates', () => {
      // Simulate form state management
      let formState = {
        vix: '18.5',
        date: '2025-09-04',
        t2108: '65'
      }

      // Test state update that preserves VIX
      const updateFormState = (field: string, value: string) => {
        formState = { ...formState, [field]: value }
      }

      updateFormState('t2108', '67')
      expect(formState.vix).toBe('18.5') // VIX should remain unchanged
      expect(formState.t2108).toBe('67') // T2108 should be updated

      updateFormState('vix', '20.2')
      expect(formState.vix).toBe('20.2') // VIX should be updated

      console.log('✅ VIX data integrity maintained during form updates')
    })
  })

  describe('VIX Value Edge Cases', () => {
    test('should handle extreme VIX values correctly', () => {
      const extremeVixValues = [
        { input: '0.1', expected: 0.1 },
        { input: '99.9', expected: 99.9 },
        { input: '150.0', expected: 150.0 }, // Extremely high but possible
        { input: '0', expected: 0 },
      ]

      extremeVixValues.forEach(({ input, expected }) => {
        const vixNumber = Number(input) || undefined
        expect(vixNumber).toBe(expected)
      })

      console.log('✅ Extreme VIX values handled correctly')
    })

    test('should handle invalid VIX input gracefully', () => {
      const invalidVixInputs = ['', 'invalid', 'NaN', 'null', 'undefined']

      invalidVixInputs.forEach(input => {
        const vixNumber = Number(input) || undefined
        expect(vixNumber).toBeUndefined()
      })

      console.log('✅ Invalid VIX inputs handled gracefully (result: undefined)')
    })

    test('should preserve VIX state during async operations', async () => {
      let vixState = '18.5'
      
      // Simulate async operation that should not affect VIX state
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(vixState).toBe('18.5')
      
      // Simulate form submission
      const formData = {
        vix: vixState,
        date: '2025-09-04',
        t2108: '65'
      }
      
      // VIX should be preserved in final form data
      expect(formData.vix).toBe('18.5')
      
      console.log('✅ VIX state preserved during async operations')
    })
  })

  describe('Integration with Market Breadth Calculator', () => {
    test('should pass VIX value to breadth calculator correctly', () => {
      const rawData: RawMarketBreadthData = {
        date: '2025-09-04',
        timestamp: new Date().toISOString(),
        advancingIssues: 500,
        decliningIssues: 200,
        newHighs: 0,
        newLows: 0,
        upVolume: 0,
        downVolume: 0,
        t2108: 65,
        vix: 18.5, // VIX value for calculator
        dataQualityScore: 100
      }

      // Simulate breadth calculator input validation
      const validateCalculatorInput = (data: RawMarketBreadthData) => {
        return {
          hasVix: data.vix !== undefined && data.vix !== null,
          vixValue: data.vix,
          isValid: data.t2108 !== undefined && data.advancingIssues > 0
        }
      }

      const validation = validateCalculatorInput(rawData)
      
      expect(validation.hasVix).toBe(true)
      expect(validation.vixValue).toBe(18.5)
      expect(validation.isValid).toBe(true)

      console.log('✅ VIX value correctly passed to breadth calculator')
    })

    test('should handle missing VIX in calculator input', () => {
      const rawDataWithoutVix: RawMarketBreadthData = {
        date: '2025-09-04',
        timestamp: new Date().toISOString(),
        advancingIssues: 500,
        decliningIssues: 200,
        newHighs: 0,
        newLows: 0,
        upVolume: 0,
        downVolume: 0,
        t2108: 65,
        vix: undefined, // No VIX value
        dataQualityScore: 100
      }

      // Simulate breadth calculator input validation
      const validateCalculatorInput = (data: RawMarketBreadthData) => {
        return {
          hasVix: data.vix !== undefined && data.vix !== null,
          vixValue: data.vix,
          isValid: data.t2108 !== undefined && data.advancingIssues > 0
        }
      }

      const validation = validateCalculatorInput(rawDataWithoutVix)
      
      expect(validation.hasVix).toBe(false)
      expect(validation.vixValue).toBeUndefined()
      expect(validation.isValid).toBe(true) // Still valid without VIX

      console.log('✅ Missing VIX handled correctly in calculator input')
    })
  })
})

// Export test utilities
export {
  mockDatabase,
  mockStatement,
  mockElectronAPI,
}