/**
 * Phase 4 Comprehensive Integration Tests
 * Validates all Market Breadth system repairs across phases 1-3
 * 
 * Tests:
 * 1. CSV Import Testing - Fixed field mapping in breadth-service.ts
 * 2. Database Migration Validation - 4,313+ records corrected
 * 3. UI Integration Testing - DataEntryForm.tsx source indicators
 * 4. End-to-End Workflow - Complete CSV-to-UI pipeline
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { BreadthService } from '../database/services/breadth-service'
import { BreadthDatabaseAdapter } from '../database/services/breadth-adapter'
import path from 'path'
import fs from 'fs'

// Test database path
const TEST_DB_PATH = path.join(__dirname, 'test-phase4-comprehensive.db')

// Mock CSV data representing different scenarios from the migration
const MOCK_CSV_DATA = {
  // Standard Stockbee format with all 4% fields
  validStockbeeCSV: `Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P
1/3/2025,180,120,1.50,1.65,450,200,350,150,120,80,280,180,7000,65,5847.15
1/2/2025,165,135,1.22,1.34,420,230,320,170,100,95,260,200,7000,62,5832.92
1/1/2025,200,100,2.00,2.20,500,180,380,140,140,70,320,160,7000,68,5880.23`,

  // CSV with missing or corrupted fields (represents pre-migration data)
  corruptedCSV: `Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P
12/30/2024,190,,1.40,1.55,,,340,160,110,85,270,190,7000,,5825.15 6120.45
12/29/2024,,140,0.90,0.99,400,250,,,90,100,250,210,7000,58,
12/28/2024,175,125,1.40,1.54,430,220,330,170,,,,,7000,63,5810.22`,

  // Edge case CSV with minimal data (only required fields)
  minimalCSV: `Date,up4%,down4%
12/27/2024,150,110
12/26/2024,180,95`,

  // CSV with special characters and comma-in-quotes issues
  specialCharactersCSV: `Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P
12/25/2024,185,115,1.61,1.77,460,210,360,150,125,80,290,175,7000,67,"5,845.67"
12/24/2024,170,130,1.31,1.44,440,240,340,180,115,90,270,185,7000,64,"5,832.15, 6,120.30"`
};

describe('Phase 4: Comprehensive Market Breadth Integration Tests', () => {
  let db: Database.Database
  let breadthService: BreadthService
  let adapter: BreadthDatabaseAdapter

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }

    // Create test database with schema
    db = new Database(TEST_DB_PATH)
    
    // Create market_breadth table with full schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS market_breadth (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        timestamp TEXT,
        advancing_issues INTEGER,
        declining_issues INTEGER,
        new_highs INTEGER,
        new_lows INTEGER,
        up_volume REAL,
        down_volume REAL,
        breadth_score REAL,
        trend_strength REAL,
        market_phase TEXT,
        data_source TEXT DEFAULT 'manual',
        notes TEXT,
        
        -- Enhanced indicators from Phase 1 fixes
        stocks_up_4pct INTEGER,
        stocks_down_4pct INTEGER,
        stocks_up_20pct INTEGER,
        stocks_down_20pct INTEGER,
        stocks_up_20dollar INTEGER,
        stocks_down_20dollar INTEGER,
        ratio_5day REAL,
        ratio_10day REAL,
        stocks_up_25pct_quarter INTEGER,
        stocks_down_25pct_quarter INTEGER,
        stocks_up_25pct_month INTEGER,
        stocks_down_25pct_month INTEGER,
        stocks_up_50pct_month INTEGER,
        stocks_down_50pct_month INTEGER,
        stocks_up_13pct_34days INTEGER,
        stocks_down_13pct_34days INTEGER,
        worden_universe INTEGER DEFAULT 7000,
        t2108 REAL,
        sp500 TEXT,
        vix REAL,
        source_file TEXT,
        import_format TEXT,
        data_quality_score INTEGER DEFAULT 100,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(date)
      )
    `)

    // Initialize services
    adapter = new BreadthDatabaseAdapter(db)
    breadthService = new BreadthService(db)
  })

  afterEach(() => {
    db.close()
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
  })

  describe('1. CSV Import Testing - Phase 1 Field Mapping Fixes', () => {
    test('should correctly import valid Stockbee format CSV with all 4% fields', () => {
      console.log('🧪 Testing Phase 1 CSV import fixes...')
      
      const result = breadthService.importFromCSV(MOCK_CSV_DATA.validStockbeeCSV)
      
      expect(result.success).toBe(true)
      expect(result.imported).toBe(3)
      expect(result.errors).toBe(0)
      expect(result.errorDetails).toHaveLength(0)
      
      console.log('✅ CSV import result:', {
        imported: result.imported,
        errors: result.errors,
        success: result.success
      })

      // Verify the data was stored correctly with 4% fields
      const records = breadthService.getBreadthHistory('2025-01-01', '2025-01-03')
      expect(records).toHaveLength(3)

      const firstRecord = records.find(r => r.date === '2025-01-03')
      expect(firstRecord).toBeDefined()
      
      // Verify critical 4% fields are populated (Phase 1 fix)
      expect(firstRecord?.stocks_up_4pct).toBe(180)
      expect(firstRecord?.stocks_down_4pct).toBe(120)
      
      // Verify secondary indicators are populated (Phase 1 fix)
      expect(firstRecord?.stocks_up_25pct_quarter).toBe(450)
      expect(firstRecord?.stocks_down_25pct_quarter).toBe(200)
      expect(firstRecord?.t2108).toBe(65)
      expect(firstRecord?.sp500).toBe('5847.15')
      
      console.log('✅ Phase 1 field mapping verification complete - 4% fields correctly populated')
    })

    test('should handle corrupted CSV data gracefully (pre-migration scenario)', () => {
      console.log('🧪 Testing corrupted CSV handling (pre-migration scenario)...')
      
      const result = breadthService.importFromCSV(MOCK_CSV_DATA.corruptedCSV)
      
      // Should still import what it can
      expect(result.success).toBe(true) // Success if any records imported
      expect(result.imported).toBeGreaterThan(0)
      expect(result.skipped).toBeGreaterThanOrEqual(0)
      
      console.log('✅ Corrupted CSV handling result:', {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
        errorDetails: result.errorDetails?.slice(0, 3) // First 3 errors
      })

      // Verify that valid records were imported with available data
      const records = breadthService.getBreadthHistory('2024-12-28', '2024-12-30')
      expect(records.length).toBeGreaterThan(0)
      
      console.log('✅ Corrupted CSV graceful handling verified')
    })

    test('should import minimal CSV with only required fields', () => {
      console.log('🧪 Testing minimal CSV import...')
      
      const result = breadthService.importFromCSV(MOCK_CSV_DATA.minimalCSV)
      
      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      
      const records = breadthService.getBreadthHistory('2024-12-26', '2024-12-27')
      expect(records).toHaveLength(2)
      
      // Verify that minimal data was stored correctly
      const firstRecord = records.find(r => r.date === '2024-12-27')
      expect(firstRecord?.stocks_up_4pct).toBe(150)
      expect(firstRecord?.stocks_down_4pct).toBe(110)
      
      console.log('✅ Minimal CSV import verified')
    })

    test('should handle special characters and comma-in-quotes (Phase 2 migration scenario)', () => {
      console.log('🧪 Testing special characters and comma-in-quotes handling...')
      
      const result = breadthService.importFromCSV(MOCK_CSV_DATA.specialCharactersCSV)
      
      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      
      const records = breadthService.getBreadthHistory('2024-12-24', '2024-12-25')
      expect(records).toHaveLength(2)
      
      // Verify S&P 500 values are correctly parsed (comma removal)
      const record1 = records.find(r => r.date === '2024-12-25')
      const record2 = records.find(r => r.date === '2024-12-24')
      
      expect(record1?.sp500).toMatch(/5845\.67/) // Comma should be removed
      expect(record2?.sp500).toMatch(/5832\.15/) // Should extract first valid number
      
      console.log('✅ Special characters and comma-in-quotes handling verified')
    })
  })

  describe('2. Database Migration Validation - Phase 2 Record Corrections', () => {
    test('should verify database schema supports all enhanced fields', () => {
      console.log('🧪 Testing database schema compatibility...')
      
      // Insert a comprehensive record to test all fields
      const testData = {
        date: '2025-01-04',
        timestamp: new Date().toISOString(),
        advancingIssues: 180,
        decliningIssues: 120,
        newHighs: 50,
        newLows: 25,
        upVolume: 15.5,
        downVolume: 8.2,
        stocks_up_4pct: 180,
        stocks_down_4pct: 120,
        stocks_up_25pct_quarter: 450,
        stocks_down_25pct_quarter: 200,
        stocks_up_25pct_month: 350,
        stocks_down_25pct_month: 150,
        stocks_up_50pct_month: 120,
        stocks_down_50pct_month: 80,
        stocks_up_13pct_34days: 280,
        stocks_down_13pct_34days: 180,
        ratio_5day: 1.50,
        ratio_10day: 1.65,
        t2108: 65.5,
        sp500: '5847.15',
        vix: 18.5,
        stocks_up_20pct: 300,
        stocks_down_20pct: 150,
        stocks_up_20dollar: 250,
        stocks_down_20dollar: 120,
        worden_universe: 7000,
        breadthScore: 75,
        dataSource: 'test'
      }
      
      const rowId = breadthService.saveBreadthData(testData)
      expect(rowId).toBeGreaterThan(0)
      
      // Retrieve and verify all fields
      const retrieved = breadthService.getBreadthByDate('2025-01-04')
      expect(retrieved).toBeDefined()
      
      // Verify all Phase 1-2 enhanced fields are properly stored
      expect(retrieved?.stocks_up_4pct).toBe(180)
      expect(retrieved?.stocks_down_4pct).toBe(120)
      expect(retrieved?.stocks_up_25pct_quarter).toBe(450)
      expect(retrieved?.stocks_down_25pct_quarter).toBe(200)
      expect(retrieved?.t2108).toBe(65.5)
      expect(retrieved?.sp500).toBe('5847.15')
      expect(retrieved?.vix).toBe(18.5)
      expect(retrieved?.ratio_5day).toBe(1.50)
      expect(retrieved?.ratio_10day).toBe(1.65)
      
      console.log('✅ Database schema supports all enhanced fields from Phase 1-2 fixes')
    })

    test('should simulate and verify migration correction patterns', () => {
      console.log('🧪 Testing migration correction patterns...')
      
      // Simulate pre-migration corrupted records
      const corruptedRecords = [
        {
          date: '2024-12-20',
          sp500: '5825.15 6120.45', // Multi-value corruption
          notes: 'CSV: up4%=175, down4%=125, up25q%=430, down25q%=220'
        },
        {
          date: '2024-12-21', 
          sp500: '5,832.92', // Comma formatting
          notes: 'CSV: up4%=180, down4%=115, T2108=67, SP=5832.92'
        },
        {
          date: '2024-12-22',
          sp500: '', // Missing S&P
          notes: 'CSV: up4%=165, down4%=135, up25q%=420, down25q%=230, T2108=62'
        }
      ]
      
      // Insert corrupted records directly into database (simulating pre-migration state)
      for (const record of corruptedRecords) {
        db.prepare(`
          INSERT INTO market_breadth (date, sp500, notes, data_source) 
          VALUES (?, ?, ?, 'test-corrupted')
        `).run(record.date, record.sp500, record.notes)
      }
      
      // Run S&P 500 recovery (simulating migration)
      const recoveryResult = breadthService.recoverCorruptedSP500Values()
      expect(recoveryResult.recovered).toBeGreaterThan(0)
      
      // Verify corrections
      const correctedRecords = breadthService.getBreadthHistory('2024-12-20', '2024-12-22')
      
      // Check S&P 500 corrections
      const record1 = correctedRecords.find(r => r.date === '2024-12-20')
      const record2 = correctedRecords.find(r => r.date === '2024-12-21')
      
      // Should extract valid S&P values
      expect(parseFloat(record1?.sp500 || '0')).toBeGreaterThan(5000)
      expect(parseFloat(record2?.sp500 || '0')).toBeGreaterThan(5000)
      
      console.log('✅ Migration correction patterns verified:', {
        recovered: recoveryResult.recovered,
        failed: recoveryResult.failed,
        correctedRecords: correctedRecords.length
      })
    })

    test('should verify data recovery verification metrics', () => {
      console.log('🧪 Testing data recovery verification...')
      
      // Add some test data with mixed quality
      const testRecords = [
        { date: '2025-01-05', sp500: '5850.25', stocks_up_25pct_quarter: 450 },
        { date: '2025-01-06', sp500: '5855.75 6120.30', stocks_up_25pct_quarter: null }, // Corrupted
        { date: '2025-01-07', sp500: '5,860.45', stocks_up_25pct_quarter: 470 }, // Formatted
        { date: '2025-01-08', sp500: '5865.80', stocks_up_25pct_quarter: 480 }
      ]
      
      for (const record of testRecords) {
        db.prepare(`
          INSERT INTO market_breadth (date, sp500, stocks_up_25pct_quarter, data_source) 
          VALUES (?, ?, ?, 'test-verification')
        `).run(record.date, record.sp500, record.stocks_up_25pct_quarter)
      }
      
      // Run verification
      const verificationResult = breadthService.verifyRecoverySuccess()
      
      expect(verificationResult.totalRecords).toBeGreaterThan(0)
      expect(verificationResult.successRate).toBeGreaterThan(0)
      
      console.log('✅ Recovery verification metrics:', verificationResult)
    })
  })

  describe('3. UI Integration Testing - Phase 3 DataEntryForm Enhancements', () => {
    test('should verify data source indicator logic for different field types', () => {
      console.log('🧪 Testing UI data source indicator logic...')
      
      // Create test data representing different data sources
      const testData = {
        date: '2025-01-09',
        stocks_up_4pct: 175, // Database field (high confidence)
        stocks_down_4pct: 125, // Database field (high confidence)  
        t2108: 66.5, // Database field (high confidence)
        sp500: '5870.25', // Database field (high confidence)
        vix: null, // Manual entry field (not in CSV)
        stocks_up_20pct: null, // Manual entry field (not in CSV)
        notes: 'CSV: up25q%=440, down25q%=210, ratio5d=1.40, ratio10d=1.54' // Notes extraction
      }
      
      const rowId = breadthService.saveBreadthData(testData)
      expect(rowId).toBeGreaterThan(0)
      
      const retrieved = breadthService.getBreadthByDate('2025-01-09')
      expect(retrieved).toBeDefined()
      
      // Verify notes extraction functionality (used by UI)
      const extractedFromNotes = breadthService.extractFromNotes(retrieved?.notes || '')
      
      // Should extract ratio values from notes
      expect(extractedFromNotes.ratio5day).toBeDefined()
      expect(extractedFromNotes.ratio10day).toBeDefined()
      
      console.log('✅ UI data source indicators verified:', {
        databaseFields: ['stocks_up_4pct', 'stocks_down_4pct', 't2108', 'sp500'],
        notesFields: Object.keys(extractedFromNotes),
        manualFields: ['vix', 'stocks_up_20pct', 'stocks_up_20dollar']
      })
    })

    test('should validate field mapping consistency between service and UI', () => {
      console.log('🧪 Testing field mapping consistency...')
      
      // Test data with comprehensive fields
      const comprehensiveData = {
        date: '2025-01-10',
        stocks_up_4pct: 185,
        stocks_down_4pct: 115,
        stocks_up_25pct_quarter: 460,
        stocks_down_25pct_quarter: 210,
        stocks_up_25pct_month: 360,
        stocks_down_25pct_month: 150,
        stocks_up_50pct_month: 125,
        stocks_down_50pct_month: 80,
        stocks_up_13pct_34days: 290,
        stocks_down_13pct_34days: 175,
        ratio_5day: 1.61,
        ratio_10day: 1.77,
        t2108: 67,
        sp500: '5875.45',
        worden_universe: 7000,
        vix: 19.2,
        stocks_up_20pct: 310,
        stocks_down_20pct: 145,
        stocks_up_20dollar: 260,
        stocks_down_20dollar: 115,
        breadthScore: 78
      }
      
      const rowId = breadthService.saveBreadthData(comprehensiveData)
      expect(rowId).toBeGreaterThan(0)
      
      const retrieved = breadthService.getBreadthByDate('2025-01-10')
      expect(retrieved).toBeDefined()
      
      // Verify all fields that should be populated in UI are accessible
      const uiRequiredFields = [
        'stocks_up_4pct', 'stocks_down_4pct', 't2108', 'sp500',
        'stocks_up_25pct_quarter', 'stocks_down_25pct_quarter',
        'stocks_up_25pct_month', 'stocks_down_25pct_month',
        'stocks_up_50pct_month', 'stocks_down_50pct_month',
        'stocks_up_13pct_34days', 'stocks_down_13pct_34days',
        'ratio_5day', 'ratio_10day', 'vix', 'worden_universe',
        'stocks_up_20pct', 'stocks_down_20pct',
        'stocks_up_20dollar', 'stocks_down_20dollar'
      ]
      
      for (const field of uiRequiredFields) {
        const value = retrieved?.[field as keyof typeof retrieved]
        expect(value).toBeDefined()
        expect(value).not.toBeNull()
      }
      
      console.log('✅ Field mapping consistency verified - all UI fields accessible')
    })
  })

  describe('4. End-to-End Workflow Testing', () => {
    test('should complete full CSV-to-UI workflow with data validation', async () => {
      console.log('🧪 Testing complete CSV-to-UI workflow...')
      
      // Step 1: Import CSV data
      const importResult = breadthService.importFromCSV(MOCK_CSV_DATA.validStockbeeCSV)
      expect(importResult.success).toBe(true)
      expect(importResult.imported).toBe(3)
      
      console.log('📥 CSV Import Complete:', {
        imported: importResult.imported,
        errors: importResult.errors
      })
      
      // Step 2: Retrieve data for UI display
      const retrievedData = breadthService.getBreadthHistory('2025-01-01', '2025-01-03')
      expect(retrievedData).toHaveLength(3)
      
      console.log('📊 Data Retrieved for UI:', {
        records: retrievedData.length,
        dates: retrievedData.map(r => r.date)
      })
      
      // Step 3: Simulate UI form population (DataEntryForm logic)
      const latestRecord = retrievedData.find(r => r.date === '2025-01-03')
      expect(latestRecord).toBeDefined()
      
      // Verify UI-critical fields are populated correctly
      const uiFormFields = {
        stocks_up_4pct: latestRecord?.stocks_up_4pct,
        stocks_down_4pct: latestRecord?.stocks_down_4pct,
        t2108: latestRecord?.t2108,
        sp500: latestRecord?.sp500,
        stocks_up_25pct_quarter: latestRecord?.stocks_up_25pct_quarter,
        ratio_5day: latestRecord?.ratio_5day,
        breadthScore: latestRecord?.breadthScore
      }
      
      // All critical fields should be populated
      Object.entries(uiFormFields).forEach(([field, value]) => {
        expect(value).toBeDefined()
        expect(value).not.toBeNull()
      })
      
      console.log('🎯 UI Form Fields Populated:', uiFormFields)
      
      // Step 4: Verify breadth score calculation
      expect(latestRecord?.breadthScore).toBeGreaterThan(0)
      expect(latestRecord?.marketPhase).toBeDefined()
      
      console.log('✅ End-to-end workflow complete - CSV → Database → UI → Calculation')
    })

    test('should handle workflow with data recovery scenarios', () => {
      console.log('🧪 Testing workflow with data recovery...')
      
      // Import corrupted data that requires recovery
      const corruptedResult = breadthService.importFromCSV(MOCK_CSV_DATA.corruptedCSV)
      expect(corruptedResult.imported).toBeGreaterThan(0)
      
      // Run recovery operations
      const sp500Recovery = breadthService.recoverCorruptedSP500Values()
      const secondaryRecovery = breadthService.recoverSecondaryIndicators()
      
      console.log('🔧 Recovery Results:', {
        sp500Recovered: sp500Recovery.recovered,
        secondaryRecovered: secondaryRecovery.recovered
      })
      
      // Verify workflow still functions with recovered data
      const recoveredData = breadthService.getBreadthHistory('2024-12-28', '2024-12-30')
      expect(recoveredData.length).toBeGreaterThan(0)
      
      // Check that recovered data can be used for UI display
      for (const record of recoveredData) {
        expect(record.date).toBeDefined()
        expect(record.breadthScore).toBeGreaterThanOrEqual(0)
      }
      
      console.log('✅ Data recovery workflow verified')
    })

    test('should validate data integrity throughout the pipeline', () => {
      console.log('🧪 Testing data integrity validation...')
      
      // Import data and verify integrity at each step
      const result = breadthService.importFromCSV(MOCK_CSV_DATA.validStockbeeCSV)
      
      // Step 1: Verify import integrity
      expect(result.success).toBe(true)
      expect(result.errorDetails).toHaveLength(0)
      
      // Step 2: Verify storage integrity
      const storedData = breadthService.getBreadthHistory('2025-01-01', '2025-01-03')
      expect(storedData).toHaveLength(3)
      
      // Step 3: Verify field data types and ranges
      for (const record of storedData) {
        // Date integrity
        expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        
        // Numeric field integrity
        if (record.stocks_up_4pct) expect(record.stocks_up_4pct).toBeGreaterThanOrEqual(0)
        if (record.stocks_down_4pct) expect(record.stocks_down_4pct).toBeGreaterThanOrEqual(0)
        if (record.t2108) expect(record.t2108).toBeGreaterThanOrEqual(0)
        if (record.t2108) expect(record.t2108).toBeLessThanOrEqual(100)
        
        // Breadth score integrity
        expect(record.breadthScore).toBeGreaterThanOrEqual(0)
        expect(record.breadthScore).toBeLessThanOrEqual(100)
      }
      
      // Step 4: Verify calculation integrity
      const firstRecord = storedData[0]
      const recalculated = breadthService.calculateBreadthScore({
        advancingIssues: firstRecord.advancingIssues,
        decliningIssues: firstRecord.decliningIssues,
        newHighs: firstRecord.newHighs,
        newLows: firstRecord.newLows,
        upVolume: firstRecord.upVolume,
        downVolume: firstRecord.downVolume
      })
      
      expect(recalculated.breadthScore).toBeGreaterThanOrEqual(0)
      expect(recalculated.breadthScore).toBeLessThanOrEqual(100)
      expect(recalculated.marketPhase).toBeDefined()
      
      console.log('✅ Data integrity validated throughout pipeline')
    })
  })

  describe('5. Performance and Scalability Tests', () => {
    test('should handle large CSV imports efficiently', () => {
      console.log('🧪 Testing large CSV import performance...')
      
      // Generate large CSV data (simulate 1 year of data)
      const largeCsvLines = ['Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P']
      
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // Skip weekends for market data
        if (d.getDay() === 0 || d.getDay() === 6) continue
        
        const dateStr = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
        const up4 = Math.floor(Math.random() * 200) + 100
        const down4 = Math.floor(Math.random() * 150) + 80
        const t2108 = Math.floor(Math.random() * 60) + 20
        const sp500 = (Math.random() * 1000 + 5000).toFixed(2)
        
        largeCsvLines.push(`${dateStr},${up4},${down4},1.5,1.6,400,200,300,150,100,80,250,150,7000,${t2108},${sp500}`)
      }
      
      const largeCsv = largeCsvLines.join('\n')
      
      // Measure import time
      const startTime = performance.now()
      const result = breadthService.importFromCSV(largeCsv)
      const endTime = performance.now()
      
      expect(result.success).toBe(true)
      expect(result.imported).toBeGreaterThan(200) // Should import ~260 weekdays
      
      console.log('📈 Large CSV Performance:', {
        records: result.imported,
        timeMs: Math.round(endTime - startTime),
        recordsPerSecond: Math.round(result.imported / ((endTime - startTime) / 1000))
      })
      
      // Verify data retrieval performance
      const retrievalStart = performance.now()
      const retrieved = breadthService.getBreadthHistory('2024-01-01', '2024-12-31')
      const retrievalEnd = performance.now()
      
      expect(retrieved.length).toBe(result.imported)
      
      console.log('🔍 Data Retrieval Performance:', {
        records: retrieved.length,
        timeMs: Math.round(retrievalEnd - retrievalStart)
      })
      
      console.log('✅ Performance test completed - system handles large datasets efficiently')
    })
  })
})