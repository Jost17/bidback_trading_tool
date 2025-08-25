import Database from 'better-sqlite3'
import type { 
  BreadthData, 
  BreadthCalculation, 
  CSVImportResult,
  ChartDataPoint 
} from '../../types/trading'

// Extended Breadth Data interface for all indicators
export interface ExtendedBreadthData extends BreadthData {
  // Primary Indicators
  stocksUp4PctDaily?: number
  stocksDown4PctDaily?: number
  stocksUp25PctQuarterly?: number
  stocksDown25PctQuarterly?: number
  ratio5Day?: number
  ratio10Day?: number
  
  // Secondary Indicators
  stocksUp25PctMonthly?: number
  stocksDown25PctMonthly?: number
  stocksUp50PctMonthly?: number
  stocksDown50PctMonthly?: number
  stocksUp13Pct34Days?: number
  stocksDown13Pct34Days?: number
  
  // Overarching Indicators
  t2108?: number // % Stocks above 40-day MA
  wordenCommonStocks?: number
  spReference?: number
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
  
  // Prepared statements for performance
  private insertBreadthStmt: Database.Statement
  private getBreadthByDateStmt: Database.Statement
  private updateBreadthStmt: Database.Statement
  private getLatestBreadthStmt: Database.Statement
  private getPreviousDaysStmt: Database.Statement

  constructor(db: Database.Database) {
    this.db = db
    this.initializeStatements()
    this.ensureExtendedSchema()
  }

  private initializeStatements(): void {
    // Insert statement with all fields
    this.insertBreadthStmt = this.db.prepare(`
      INSERT INTO market_breadth (
        date, timestamp, advancing_issues, declining_issues,
        new_highs, new_lows, up_volume, down_volume,
        breadth_score, trend_strength, market_phase,
        data_source, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    // Get breadth data by date range
    this.getBreadthByDateStmt = this.db.prepare(`
      SELECT * FROM market_breadth 
      WHERE date BETWEEN ? AND ? 
      ORDER BY date DESC
    `)

    // Update breadth data
    this.updateBreadthStmt = this.db.prepare(`
      UPDATE market_breadth SET
        advancing_issues = ?, declining_issues = ?,
        new_highs = ?, new_lows = ?, up_volume = ?, down_volume = ?,
        breadth_score = ?, trend_strength = ?, market_phase = ?,
        notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE date = ?
    `)

    // Get latest breadth entry
    this.getLatestBreadthStmt = this.db.prepare(`
      SELECT * FROM market_breadth 
      ORDER BY date DESC 
      LIMIT 1
    `)

    // Get previous N days for ratio calculations
    this.getPreviousDaysStmt = this.db.prepare(`
      SELECT * FROM market_breadth 
      WHERE date < ? 
      ORDER BY date DESC 
      LIMIT ?
    `)
  }

  private ensureExtendedSchema(): void {
    // Add extended columns if they don't exist
    const columns = [
      'stocks_up_4pct_daily INTEGER',
      'stocks_down_4pct_daily INTEGER',
      'stocks_up_25pct_quarterly INTEGER',
      'stocks_down_25pct_quarterly INTEGER',
      'ratio_5day REAL',
      'ratio_10day REAL',
      'stocks_up_25pct_monthly INTEGER',
      'stocks_down_25pct_monthly INTEGER',
      'stocks_up_50pct_monthly INTEGER',
      'stocks_down_50pct_monthly INTEGER',
      'stocks_up_13pct_34days INTEGER',
      'stocks_down_13pct_34days INTEGER',
      't2108 REAL',
      'worden_common_stocks INTEGER',
      'sp_reference REAL'
    ]

    columns.forEach(column => {
      const [name, type] = column.split(' ')
      try {
        this.db.exec(`ALTER TABLE market_breadth ADD COLUMN ${name} ${type}`)
      } catch (error) {
        // Column already exists, ignore
      }
    })
  }

  /**
   * Calculate 5-day ratio from historical data
   */
  calculate5DayRatio(currentData: ExtendedBreadthData): number | null {
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
  calculate10DayRatio(currentData: ExtendedBreadthData): number | null {
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
  calculateEnhanced6FactorScore(data: ExtendedBreadthData): BreadthCalculation {
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
  validateMarketData(data: ExtendedBreadthData): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check required fields
    VALIDATION_RULES.REQUIRED_FIELDS.forEach(field => {
      if (!data[field as keyof ExtendedBreadthData]) {
        errors.push(`${field} is required`)
      }
    })

    // Validate date format
    if (data.date && !VALIDATION_RULES.DATE_FORMAT.test(data.date)) {
      errors.push('Date must be in YYYY-MM-DD format')
    }

    // Validate numeric fields
    VALIDATION_RULES.NUMERIC_FIELDS.forEach(field => {
      const value = data[field as keyof ExtendedBreadthData]
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
   * Save or update breadth data with all calculations
   */
  async saveBreadthData(data: ExtendedBreadthData): Promise<number> {
    // Validate data
    const validation = this.validateMarketData(data)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    // Calculate ratios
    const ratio5Day = this.calculate5DayRatio(data)
    const ratio10Day = this.calculate10DayRatio(data)
    
    // Calculate enhanced 6-factor score
    const calculation = this.calculateEnhanced6FactorScore({
      ...data,
      ratio5Day: ratio5Day || undefined
    })

    // Check if entry exists for this date
    const existing = this.db.prepare('SELECT id FROM market_breadth WHERE date = ?').get(data.date)

    if (existing) {
      // Update existing entry
      this.updateBreadthStmt.run(
        data.advancingIssues,
        data.decliningIssues,
        data.newHighs,
        data.newLows,
        data.upVolume,
        data.downVolume,
        calculation.breadthScore,
        calculation.trendStrength,
        calculation.marketPhase,
        data.notes || null,
        data.date
      )
      return (existing as any).id
    } else {
      // Insert new entry
      const info = this.insertBreadthStmt.run(
        data.date,
        data.timestamp || new Date().toISOString(),
        data.advancingIssues,
        data.decliningIssues,
        data.newHighs,
        data.newLows,
        data.upVolume,
        data.downVolume,
        calculation.breadthScore,
        calculation.trendStrength,
        calculation.marketPhase,
        data.dataSource || 'manual',
        data.notes || null
      )
      
      // Update extended fields if provided
      if (ratio5Day !== null || ratio10Day !== null || data.stocksUp4PctDaily) {
        this.db.prepare(`
          UPDATE market_breadth SET
            stocks_up_4pct_daily = ?,
            stocks_down_4pct_daily = ?,
            ratio_5day = ?,
            ratio_10day = ?,
            t2108 = ?
          WHERE id = ?
        `).run(
          data.stocksUp4PctDaily || null,
          data.stocksDown4PctDaily || null,
          ratio5Day,
          ratio10Day,
          data.t2108 || null,
          info.lastInsertRowid
        )
      }
      
      return Number(info.lastInsertRowid)
    }
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
        const data: ExtendedBreadthData = this.mapCSVRowToData(values, fieldMapping, header)
        
        // Check for duplicate
        const existing = this.db.prepare('SELECT id FROM market_breadth WHERE date = ?').get(data.date)
        if (existing) {
          duplicates.push(data.date)
          skippedCount++
          continue
        }

        await this.saveBreadthData(data)
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
      // Stockbee Market Monitor format
      const stockbeeFields: Record<string, string[]> = {
        'date': ['date'],
        'advancingIssues': ['stocks up 4% on day', 'advancing'],
        'decliningIssues': ['stocks down 4% on day', 'declining'],
        'newHighs': ['new highs', 'newhighs'],
        'newLows': ['new lows', 'newlows'],
        'upVolume': ['up volume', 'upvolume'],
        'downVolume': ['down volume', 'downvolume'],
        'stocksUp4PctDaily': ['stocks up 4% on day'],
        'stocksDown4PctDaily': ['stocks down 4% on day'],
        't2108': ['t2108', '% stocks above 40ma']
      }
      
      for (const [field, variations] of Object.entries(stockbeeFields)) {
        for (const variant of variations) {
          const index = headers.indexOf(variant)
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
   * Map CSV row to ExtendedBreadthData
   */
  private mapCSVRowToData(values: string[], mapping: Map<string, number>, headers: string[]): ExtendedBreadthData {
    const data: ExtendedBreadthData = {
      date: '',
      timestamp: new Date().toISOString(),
      advancingIssues: 0,
      decliningIssues: 0,
      newHighs: 0,
      newLows: 0,
      upVolume: 0,
      downVolume: 0,
      breadthScore: 0,
      dataSource: 'imported'
    }

    // Map values based on field mapping
    mapping.forEach((index, field) => {
      if (index < values.length) {
        const value = values[index]
        if (field === 'date') {
          data.date = this.parseDate(value)
        } else if (VALIDATION_RULES.NUMERIC_FIELDS.includes(field)) {
          (data as any)[field] = parseFloat(value) || 0
        } else {
          (data as any)[field] = value
        }
      }
    })

    // Fallback date parsing if not found
    if (!data.date && values[0]) {
      data.date = this.parseDate(values[0])
    }

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