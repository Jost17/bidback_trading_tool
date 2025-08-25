import Database from 'better-sqlite3'
import type { 
  BreadthData, 
  BreadthCalculation, 
  CSVImportResult,
  ChartDataPoint 
} from '../../types/trading'
import type { RawMarketBreadthData } from '../../types/breadth-raw-data'

// Use the centralized RawMarketBreadthData interface from breadth-raw-data.ts

// Extended interface for backwards compatibility - using intersection to avoid conflicts
export interface ExtendedBreadthData extends Omit<BreadthData, 'advancingIssues' | 'decliningIssues' | 'newHighs' | 'newLows' | 'upVolume' | 'downVolume'> {
  // Core breadth indicators (optional to support both raw and calculated data)
  advancingIssues?: number
  decliningIssues?: number
  newHighs?: number
  newLows?: number
  upVolume?: number
  downVolume?: number

  // Raw Market Breadth Data fields
  stocksUp4PctDaily?: number
  stocksDown4PctDaily?: number
  stocksUp25PctQuarterly?: number
  stocksDown25PctQuarterly?: number
  stocksUp25PctMonthly?: number
  stocksDown25PctMonthly?: number
  stocksUp50PctMonthly?: number
  stocksDown50PctMonthly?: number
  stocksUp13Pct34Days?: number
  stocksDown13Pct34Days?: number
  wordenUniverse?: number
  t2108?: number
  sp500Level?: string
  
  // Sector Data (11 sectors - Raw Data)
  basicMaterialsSector?: number
  consumerCyclicalSector?: number
  financialServicesSector?: number
  realEstateSector?: number
  consumerDefensiveSector?: number
  healthcareSector?: number
  utilitiesSector?: number
  communicationServicesSector?: number
  energySector?: number
  industrialsSector?: number
  technologySector?: number
  
  // Metadata
  sourceFile?: string
  importFormat?: 'stockbee_v1' | 'manual' | 'api' | 'legacy_migration'
  dataQualityScore?: number

  // Runtime calculated fields (NOT stored in database)
  ratio5Day?: number
  ratio10Day?: number
  spReference?: number // Parsed numeric value of sp500Level
}

// Validation rules for market data
const VALIDATION_RULES = {
  NUMERIC_FIELDS: [
    'advancingIssues', 'decliningIssues', 'newHighs', 'newLows',
    'upVolume', 'downVolume', 'stocksUp4PctDaily', 'stocksDown4PctDaily',
    'stocksUp25PctQuarterly', 'stocksDown25PctQuarterly', 't2108', 'spReference'
  ],
  REQUIRED_FIELDS: ['date', 'advancingIssues', 'decliningIssues'],
  DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/
}

export class EnhancedBreadthService {
  private db: Database.Database
  
  // Prepared statements for performance (initialized in constructor)
  private insertBreadthStmt!: Database.Statement
  private getBreadthByDateStmt!: Database.Statement
  private updateBreadthStmt!: Database.Statement
  private getLatestBreadthStmt!: Database.Statement
  private getPreviousDaysStmt!: Database.Statement

  constructor(db: Database.Database) {
    this.db = db
    this.initializeStatements()
    this.ensureExtendedSchema()
  }

  private initializeStatements(): void {
    // Insert statement for raw market breadth data (NO calculated fields)
    this.insertBreadthStmt = this.db.prepare(`
      INSERT INTO market_breadth_raw_data (
        date, timestamp,
        stocks_up_4pct_daily, stocks_down_4pct_daily,
        stocks_up_25pct_quarterly, stocks_down_25pct_quarterly,
        stocks_up_25pct_monthly, stocks_down_25pct_monthly,
        stocks_up_50pct_monthly, stocks_down_50pct_monthly,
        stocks_up_13pct_34days, stocks_down_13pct_34days,
        worden_universe, t2108, sp500_level,
        advancing_issues, declining_issues, new_highs, new_lows,
        up_volume, down_volume,
        basic_materials_sector, consumer_cyclical_sector,
        financial_services_sector, real_estate_sector,
        consumer_defensive_sector, healthcare_sector,
        utilities_sector, communication_services_sector,
        energy_sector, industrials_sector, technology_sector,
        source_file, import_format, data_quality_score, notes
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
        ?, ?, ?, ?, ?, ?
      )
    `)

    // Get raw breadth data by date range
    this.getBreadthByDateStmt = this.db.prepare(`
      SELECT * FROM market_breadth_raw_data 
      WHERE date BETWEEN ? AND ? 
      ORDER BY date DESC
    `)

    // Update raw breadth data (raw fields only)
    this.updateBreadthStmt = this.db.prepare(`
      UPDATE market_breadth_raw_data SET
        stocks_up_4pct_daily = ?, stocks_down_4pct_daily = ?,
        stocks_up_25pct_quarterly = ?, stocks_down_25pct_quarterly = ?,
        t2108 = ?, sp500_level = ?, worden_universe = ?,
        advancing_issues = ?, declining_issues = ?,
        new_highs = ?, new_lows = ?, up_volume = ?, down_volume = ?,
        notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE date = ?
    `)

    // Get latest breadth entry
    this.getLatestBreadthStmt = this.db.prepare(`
      SELECT * FROM market_breadth_raw_data 
      ORDER BY date DESC 
      LIMIT 1
    `)

    // Get previous N days for runtime ratio calculations
    this.getPreviousDaysStmt = this.db.prepare(`
      SELECT date, stocks_up_4pct_daily, stocks_down_4pct_daily,
             advancing_issues, declining_issues
      FROM market_breadth_raw_data 
      WHERE date < ? 
      ORDER BY date DESC 
      LIMIT ?
    `)
  }

  private ensureExtendedSchema(): void {
    // Check if the new raw data table exists, if not create it
    try {
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='market_breadth_raw_data'
      `).get()
      
      if (!tableExists) {
        console.log('Creating market_breadth_raw_data table...')
        // Read and execute the raw schema SQL file
        const fs = require('fs')
        const path = require('path')
        const schemaPath = path.join(__dirname, '../schemas/market-breadth-raw-schema.sql')
        
        try {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8')
          this.db.exec(schemaSql)
          console.log('✅ Raw market breadth schema created successfully')
        } catch (error) {
          console.error('❌ Failed to create raw schema from file, creating minimal version:', error)
          // Fallback: create basic table structure
          this.createBasicRawTable()
        }
      } else {
        console.log('✅ market_breadth_raw_data table already exists')
      }
    } catch (error) {
      console.error('Error checking/creating raw data schema:', error)
      this.createBasicRawTable()
    }
  }

  private createBasicRawTable(): void {
    // Fallback table creation if schema file is not available
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS market_breadth_raw_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        stocks_up_4pct_daily INTEGER,
        stocks_down_4pct_daily INTEGER,
        stocks_up_25pct_quarterly INTEGER,
        stocks_down_25pct_quarterly INTEGER,
        stocks_up_25pct_monthly INTEGER,
        stocks_down_25pct_monthly INTEGER,
        stocks_up_50pct_monthly INTEGER,
        stocks_down_50pct_monthly INTEGER,
        stocks_up_13pct_34days INTEGER,
        stocks_down_13pct_34days INTEGER,
        worden_universe INTEGER,
        t2108 REAL,
        sp500_level TEXT,
        advancing_issues INTEGER,
        declining_issues INTEGER,
        new_highs INTEGER,
        new_lows INTEGER,
        up_volume REAL,
        down_volume REAL,
        source_file TEXT,
        import_format TEXT DEFAULT 'manual',
        data_quality_score REAL DEFAULT 100,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_breadth_raw_date ON market_breadth_raw_data(date);
    `
    
    this.db.exec(createTableSql)
    console.log('✅ Basic raw data table created as fallback')
  }

  /**
   * Calculate 5-day ratio from historical data
   */
  calculate5DayRatio(currentData: RawMarketBreadthData | ExtendedBreadthData): number | null {
    const previousDays = this.getPreviousDaysStmt.all(currentData.date, 4) as any[]
    
    if (previousDays.length < 4) return null
    
    const allDays = [
      { 
        stocks_up_4pct_daily: currentData.stocksUp4PctDaily || currentData.advancingIssues,
        stocks_down_4pct_daily: currentData.stocksDown4PctDaily || currentData.decliningIssues
      },
      ...previousDays
    ]
    
    const totalUp = allDays.reduce((sum, day) => 
      sum + (day.stocks_up_4pct_daily || 0), 0)
    const totalDown = allDays.reduce((sum, day) => 
      sum + (day.stocks_down_4pct_daily || 0), 0)
    
    return totalDown > 0 ? totalUp / totalDown : null
  }

  /**
   * Calculate 10-day ratio from historical data
   */
  calculate10DayRatio(currentData: RawMarketBreadthData | ExtendedBreadthData): number | null {
    const previousDays = this.getPreviousDaysStmt.all(currentData.date, 9) as any[]
    
    if (previousDays.length < 9) return null
    
    const allDays = [
      { 
        stocks_up_4pct_daily: currentData.stocksUp4PctDaily || currentData.advancingIssues,
        stocks_down_4pct_daily: currentData.stocksDown4PctDaily || currentData.decliningIssues
      },
      ...previousDays
    ]
    
    const totalUp = allDays.reduce((sum, day) => 
      sum + (day.stocks_up_4pct_daily || 0), 0)
    const totalDown = allDays.reduce((sum, day) => 
      sum + (day.stocks_down_4pct_daily || 0), 0)
    
    return totalDown > 0 ? totalUp / totalDown : null
  }

  /**
   * Enhanced 6-Factor Breadth Score Calculation
   */
  calculateEnhanced6FactorScore(data: RawMarketBreadthData | ExtendedBreadthData): BreadthCalculation {
    const {
      advancingIssues = 0,
      decliningIssues = 0,
      newHighs = 0,
      newLows = 0,
      upVolume = 0,
      downVolume = 0,
      stocksUp4PctDaily = 0,
      stocksDown4PctDaily = 0,
      t2108 = 50 // Default to neutral if not provided
    } = data

    // Factor 1: Advance/Decline Ratio (25 points)
    const totalIssues = advancingIssues + decliningIssues
    const advanceDeclineRatio = totalIssues > 0 ? advancingIssues / totalIssues : 0.5
    const advanceDeclineScore = advanceDeclineRatio * 25

    // Factor 2: New High/Low Ratio (20 points)
    const totalNewHighLow = newHighs + newLows
    const newHighLowRatio = totalNewHighLow > 0 ? newHighs / totalNewHighLow : 0.5
    const newHighLowScore = newHighLowRatio * 20

    // Factor 3: Up/Down Volume Ratio (20 points)
    const totalVolume = upVolume + downVolume
    const volumeRatio = totalVolume > 0 ? upVolume / totalVolume : 0.5
    const volumeScore = volumeRatio * 20

    // Factor 4: 4% Movers (15 points)
    const total4PctMovers = stocksUp4PctDaily + stocksDown4PctDaily
    const up4PctRatio = total4PctMovers > 0 ? stocksUp4PctDaily / total4PctMovers : 0.5
    const moversScore = up4PctRatio * 15

    // Factor 5: T2108 Indicator (10 points)
    const t2108Score = (t2108 / 100) * 10

    // Factor 6: Momentum (10 points) - based on 5-day ratio
    const ratio5Day = this.calculate5DayRatio(data)
    const momentumScore = ratio5Day ? Math.min(10, (ratio5Day / 2) * 10) : 5

    // Total Breadth Score (0-100)
    const breadthScore = Math.round(
      advanceDeclineScore + 
      newHighLowScore + 
      volumeScore + 
      moversScore + 
      t2108Score + 
      momentumScore
    )

    // Trend Strength (how far from neutral 50)
    const trendStrength = Math.abs(breadthScore - 50) * 2

    // Market Phase Classification
    let marketPhase = 'NEUTRAL'
    if (breadthScore >= 75) marketPhase = 'STRONG_BULL'
    else if (breadthScore >= 60) marketPhase = 'BULL'
    else if (breadthScore >= 40) marketPhase = 'NEUTRAL'
    else if (breadthScore >= 25) marketPhase = 'BEAR'
    else marketPhase = 'STRONG_BEAR'

    return {
      breadthScore: Math.max(0, Math.min(100, breadthScore)),
      trendStrength: Math.max(0, Math.min(100, trendStrength)),
      marketPhase
    }
  }

  /**
   * Validate market data input
   */
  validateMarketData(data: RawMarketBreadthData | ExtendedBreadthData): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check required fields
    VALIDATION_RULES.REQUIRED_FIELDS.forEach(field => {
      if (!data[field as keyof (RawMarketBreadthData | ExtendedBreadthData)]) {
        errors.push(`${field} is required`)
      }
    })

    // Validate date format
    if (data.date && !VALIDATION_RULES.DATE_FORMAT.test(data.date)) {
      errors.push('Date must be in YYYY-MM-DD format')
    }

    // Validate numeric fields
    VALIDATION_RULES.NUMERIC_FIELDS.forEach(field => {
      const value = data[field as keyof (RawMarketBreadthData | ExtendedBreadthData)]
      if (value !== undefined && value !== null) {
        const numValue = Number(value)
        if (isNaN(numValue) || numValue < 0) {
          errors.push(`${field} must be a non-negative number`)
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Save or update RAW breadth data (NO calculated fields stored)
   */
  async saveRawBreadthData(data: RawMarketBreadthData): Promise<number> {
    // Validate data
    const validation = this.validateMarketData(data)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    // Parse S&P 500 level for internal use (but store as text)
    let spReference: number | undefined
    if (data.sp500Level) {
      const cleaned = data.sp500Level.replace(/[",]/g, '')
      spReference = parseFloat(cleaned)
    }

    // Check if entry exists for this date
    const existing = this.db.prepare('SELECT id FROM market_breadth_raw_data WHERE date = ?').get(data.date)

    if (existing) {
      // Update existing entry with RAW DATA ONLY
      this.updateBreadthStmt.run(
        data.stocksUp4PctDaily || null,
        data.stocksDown4PctDaily || null,
        data.stocksUp25PctQuarterly || null,
        data.stocksDown25PctQuarterly || null,
        data.t2108 || null,
        data.sp500Level || null,
        data.wordenUniverse || null,
        data.advancingIssues || null,
        data.decliningIssues || null,
        data.newHighs || null,
        data.newLows || null,
        data.upVolume || null,
        data.downVolume || null,
        data.notes || null,
        data.date
      )
      return (existing as any).id
    } else {
      // Insert new entry with RAW DATA ONLY
      const info = this.insertBreadthStmt.run(
        data.date,
        data.timestamp || new Date().toISOString(),
        data.stocksUp4PctDaily || null,
        data.stocksDown4PctDaily || null,
        data.stocksUp25PctQuarterly || null,
        data.stocksDown25PctQuarterly || null,
        data.stocksUp25PctMonthly || null,
        data.stocksDown25PctMonthly || null,
        data.stocksUp50PctMonthly || null,
        data.stocksDown50PctMonthly || null,
        data.stocksUp13Pct34Days || null,
        data.stocksDown13Pct34Days || null,
        data.wordenUniverse || null,
        data.t2108 || null,
        data.sp500Level || null,
        data.advancingIssues || null,
        data.decliningIssues || null,
        data.newHighs || null,
        data.newLows || null,
        data.upVolume || null,
        data.downVolume || null,
        data.basicMaterialsSector || null,
        data.consumerCyclicalSector || null,
        data.financialServicesSector || null,
        data.realEstateSector || null,
        data.consumerDefensiveSector || null,
        data.healthcareSector || null,
        data.utilitiesSector || null,
        data.communicationServicesSector || null,
        data.energySector || null,
        data.industrialsSector || null,
        data.technologySector || null,
        data.sourceFile || null,
        data.importFormat || 'manual',
        data.dataQualityScore || 100,
        data.notes || null
      )
      
      return Number(info.lastInsertRowid)
    }
  }

  /**
   * Legacy method for backwards compatibility
   * @deprecated Use saveRawBreadthData instead
   */
  async saveBreadthData(data: ExtendedBreadthData): Promise<number> {
    console.warn('saveBreadthData is deprecated, use saveRawBreadthData instead')
    return this.saveRawBreadthData(data)
  }

  /**
   * Import CSV data with multiple format support
   */
  async importFromCSV(csvData: string, format: 'standard' | 'stockbee' | 'custom' = 'standard'): Promise<CSVImportResult> {
    const lines = csvData.split('\n').filter(line => line.trim())
    const header = lines[0].toLowerCase().split(',').map(h => h.trim())
    const dataLines = lines.slice(1)

    let importedCount = 0
    let skippedCount = 0
    let errorCount = 0
    const errors: string[] = []
    const duplicates: string[] = []

    // Map headers based on format
    const fieldMapping = this.getFieldMapping(format, header)

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const values = dataLines[i].split(',').map(v => v.trim())
        const data: RawMarketBreadthData = this.mapCSVRowToData(values, fieldMapping, header)
        
        // Set source file for tracking
        data.sourceFile = `csv_import_${format}_${new Date().getTime()}`
        data.importFormat = format === 'stockbee' ? 'stockbee_v1' : 'manual'
        
        // Check for duplicate
        const existing = this.db.prepare('SELECT id FROM market_breadth_raw_data WHERE date = ?').get(data.date)
        if (existing) {
          duplicates.push(data.date)
          skippedCount++
          continue
        }

        await this.saveRawBreadthData(data)
        importedCount++

      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        errorCount++
      }
    }

    return {
      success: errorCount === 0 && importedCount > 0,
      importedCount,
      skippedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
      duplicates: duplicates.length > 0 ? duplicates : undefined
    }
  }

  /**
   * Get field mapping based on CSV format
   */
  private getFieldMapping(format: string, headers: string[]): Map<string, number> {
    const mapping = new Map<string, number>()
    
    if (format === 'stockbee') {
      // Stockbee Market Monitor format - Raw CSV field mapping
      const stockbeeFields: Record<string, string[]> = {
        'date': ['date'],
        // Primary Breadth Indicators
        'stocksUp4PctDaily': ['number of stocks up 4% plus today'],
        'stocksDown4PctDaily': ['number of stocks down 4% plus today'],
        'stocksUp25PctQuarterly': ['number of stocks up 25% plus in a quarter'],
        'stocksDown25PctQuarterly': ['number of stocks down 25% + in a quarter'],
        
        // Secondary Breadth Indicators
        'stocksUp25PctMonthly': ['number of stocks up 25% + in a month'],
        'stocksDown25PctMonthly': ['number of stocks down 25% + in a month'],
        'stocksUp50PctMonthly': ['number of stocks up 50% + in a month'],
        'stocksDown50PctMonthly': ['number of stocks down 50% + in a month'],
        'stocksUp13Pct34Days': ['number of stocks up 13% + in 34 days'],
        'stocksDown13Pct34Days': ['number of stocks down 13% + in 34 days'],
        
        // Reference Data
        'wordenUniverse': ['worden common stock universe'],
        't2108': ['t2108'],
        'sp500Level': ['s&p'],
        
        // Legacy fields for backwards compatibility
        'advancingIssues': ['advancing', 'advancing issues'],
        'decliningIssues': ['declining', 'declining issues'],
        'newHighs': ['new highs', 'newhighs'],
        'newLows': ['new lows', 'newlows'],
        'upVolume': ['up volume', 'upvolume'],
        'downVolume': ['down volume', 'downvolume']
      }
      
      // Map headers to fields (case insensitive)
      for (const [field, variations] of Object.entries(stockbeeFields)) {
        for (const variant of variations) {
          const index = headers.findIndex(h => 
            h.toLowerCase().trim() === variant.toLowerCase()
          )
          if (index !== -1) {
            mapping.set(field, index)
            break
          }
        }
      }
    } else {
      // Standard format - direct mapping
      headers.forEach((header, index) => {
        const cleanHeader = header.replace(/[_\s-]/g, '').toLowerCase()
        mapping.set(cleanHeader, index)
      })
    }
    
    return mapping
  }

  /**
   * Map CSV row to RawMarketBreadthData (Stockbee format)
   */
  private mapCSVRowToData(values: string[], mapping: Map<string, number>, headers: string[]): RawMarketBreadthData {
    const data: RawMarketBreadthData = {
      date: '',
      timestamp: new Date().toISOString(),
      importFormat: 'stockbee_v1'
    }

    // Map values based on field mapping with Stockbee CSV structure
    mapping.forEach((index, field) => {
      if (index < values.length) {
        const value = values[index].trim()
        
        if (field === 'date') {
          data.date = this.parseDate(value)
        } else if (field === 'sp500Level') {
          data.sp500Level = value // Keep as text with comma formatting
        } else if (VALIDATION_RULES.NUMERIC_FIELDS.includes(field)) {
          const numValue = parseFloat(value.replace(/,/g, '')) || 0;
          (data as any)[field] = numValue
        } else {
          (data as any)[field] = value
        }
      }
    })

    // Fallback date parsing if not found
    if (!data.date && values[0]) {
      data.date = this.parseDate(values[0])
    }

    // Set data quality based on completeness
    const fieldCount = Object.keys(data).filter(key => 
      data[key as keyof RawMarketBreadthData] !== undefined && 
      data[key as keyof RawMarketBreadthData] !== null
    ).length
    
    data.dataQualityScore = Math.min(100, (fieldCount / 15) * 100) // 15 expected fields

    return data
  }

  /**
   * Parse various date formats to YYYY-MM-DD
   */
  private parseDate(dateStr: string): string {
    // Try various date formats
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
    
    // Try MM/DD/YYYY format
    const parts = dateStr.split(/[\/\-]/)
    if (parts.length === 3) {
      const [month, day, year] = parts
      return `${year.padStart(4, '20')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    return dateStr
  }

  /**
   * Get breadth data for charting
   */
  async getChartData(startDate: string, endDate: string): Promise<ChartDataPoint[]> {
    const data = this.getBreadthByDateStmt.all(startDate, endDate) as any[]
    
    return data.map(row => ({
      date: row.date,
      value: row.breadth_score || 0, // Required field for ChartDataPoint
      breadthScore: row.breadth_score,
      trendStrength: row.trend_strength,
      volume: row.up_volume + row.down_volume,
      advanceDeclineRatio: row.declining_issues > 0 
        ? row.advancing_issues / row.declining_issues 
        : row.advancing_issues,
      newHighLowRatio: row.new_lows > 0 
        ? row.new_highs / row.new_lows 
        : row.new_highs,
      marketPhase: row.market_phase
    }))
  }

  /**
   * Get latest market breadth status
   */
  getLatestBreadthStatus(): ExtendedBreadthData | null {
    const latest = this.getLatestBreadthStmt.get() as any
    if (!latest) return null
    
    return this.mapDbRowToExtendedData(latest)
  }

  /**
   * Map database row to ExtendedBreadthData
   */
  private mapDbRowToExtendedData(row: any): ExtendedBreadthData {
    return {
      id: row.id,
      date: row.date,
      timestamp: row.timestamp,
      advancingIssues: row.advancing_issues,
      decliningIssues: row.declining_issues,
      newHighs: row.new_highs,
      newLows: row.new_lows,
      upVolume: row.up_volume,
      downVolume: row.down_volume,
      breadthScore: row.breadth_score,
      trendStrength: row.trend_strength,
      marketPhase: row.market_phase,
      dataSource: row.data_source as 'manual' | 'imported' | 'api',
      notes: row.notes,
      stocksUp4PctDaily: row.stocks_up_4pct_daily,
      stocksDown4PctDaily: row.stocks_down_4pct_daily,
      stocksUp25PctQuarterly: row.stocks_up_25pct_quarterly,
      stocksDown25PctQuarterly: row.stocks_down_25pct_quarterly,
      ratio5Day: row.ratio_5day,
      ratio10Day: row.ratio_10day,
      t2108: row.t2108,
      spReference: row.sp_reference,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}