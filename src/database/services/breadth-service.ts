import Database from 'better-sqlite3'
import type { BreadthData, BreadthCalculation, CSVImportResult, CSVExportResult } from '../../types/trading'
import { DataRecoveryService, type RecoveryResult } from './data-recovery-service'

// Database query result types
interface SecondaryIndicatorRecord {
  id: number
  date: string
  notes?: string | null
  new_highs?: number | null
  new_lows?: number | null
  up_volume?: number | null
  down_volume?: number | null
  advancing_issues?: number | null
  declining_issues?: number | null
  stocks_up_25pct_quarter?: number | null
  stocks_down_25pct_quarter?: number | null
}

export class BreadthService {
  private insertBreadth: Database.Statement
  private getBreadthByDate: Database.Statement
  private updateBreadthById: Database.Statement
  private deleteBreadthById: Database.Statement
  private getBreadthById: Database.Statement

  constructor(private db: Database.Database) {
    // Prepared statements for better performance
    this.insertBreadth = db.prepare(`
      INSERT INTO market_breadth (
        date, timestamp, advancing_issues, declining_issues, new_highs, new_lows, up_volume, down_volume,
        breadth_score, trend_strength, market_phase, data_source, notes,
        stocks_up_20pct, stocks_down_20pct, stocks_up_20dollar, stocks_down_20dollar,
        ratio_5day, ratio_10day, stocks_up_4pct, stocks_down_4pct,
        stocks_up_25pct_quarter, stocks_down_25pct_quarter, stocks_up_25pct_month, stocks_down_25pct_month,
        stocks_up_50pct_month, stocks_down_50pct_month, stocks_up_13pct_34days, stocks_down_13pct_34days,
        worden_universe, t2108, sp500, source_file, import_format, data_quality_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    this.getBreadthByDate = db.prepare(`
      SELECT * FROM market_breadth 
      WHERE date BETWEEN ? AND ? 
      ORDER BY date DESC, timestamp DESC
    `)

    this.updateBreadthById = db.prepare(`
      UPDATE market_breadth SET
        date = ?, timestamp = ?, advancing_issues = ?, declining_issues = ?,
        new_highs = ?, new_lows = ?, up_volume = ?, down_volume = ?,
        breadth_score = ?, trend_strength = ?, market_phase = ?, 
        data_source = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    this.deleteBreadthById = db.prepare('DELETE FROM market_breadth WHERE id = ?')
    
    this.getBreadthById = db.prepare('SELECT * FROM market_breadth WHERE id = ?')
  }

  saveBreadthData(data: BreadthData): number {
    // Calculate breadth score and market phase
    const calculation = this.calculateBreadthScore(data)
    
    const info = this.insertBreadth.run(
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
      data.notes || null,
      // Match the column order in INSERT statement
      data.stocks_up_20pct || null,
      data.stocks_down_20pct || null,
      data.stocks_up_20dollar || null,
      data.stocks_down_20dollar || null,
      data.ratio_5day || null,
      data.ratio_10day || null,
      data.stocks_up_4pct || null,
      data.stocks_down_4pct || null,
      data.stocks_up_25pct_quarter || null,
      data.stocks_down_25pct_quarter || null,
      data.stocks_up_25pct_month || null,
      data.stocks_down_25pct_month || null,
      data.stocks_up_50pct_month || null,
      data.stocks_down_50pct_month || null,
      data.stocks_up_13pct_34days || null,
      data.stocks_down_13pct_34days || null,
      data.worden_universe || null,
      data.t2108 || null,
      data.sp500 || null,
      data.source_file || null,
      data.import_format || null,
      data.data_quality_score || null
    )
    
    console.log(`Inserted breadth data, rowid: ${info.lastInsertRowid}`)
    return Number(info.lastInsertRowid)
  }

  getBreadthHistory(startDate: string, endDate: string): BreadthData[] {
    const results = this.getBreadthByDate.all(startDate, endDate) as any[]
    
    return results.map(row => ({
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
      // New fields for complete CSV data
      stocks_up_4pct: row.stocks_up_4pct,
      stocks_down_4pct: row.stocks_down_4pct,
      stocks_up_25pct_quarter: row.stocks_up_25pct_quarter,
      stocks_down_25pct_quarter: row.stocks_down_25pct_quarter,
      stocks_up_25pct_month: row.stocks_up_25pct_month,
      stocks_down_25pct_month: row.stocks_down_25pct_month,
      stocks_up_50pct_month: row.stocks_up_50pct_month,
      stocks_down_50pct_month: row.stocks_down_50pct_month,
      stocks_up_13pct_34days: row.stocks_up_13pct_34days,
      stocks_down_13pct_34days: row.stocks_down_13pct_34days,
      stocks_up_20pct: row.stocks_up_20pct,
      stocks_down_20pct: row.stocks_down_20pct,
      stocks_up_20dollar: row.stocks_up_20dollar,
      stocks_down_20dollar: row.stocks_down_20dollar,
      ratio_5day: row.ratio_5day,
      ratio_10day: row.ratio_10day,
      worden_universe: row.worden_universe,
      t2108: row.t2108,
      sp500: row.sp500,
      source_file: row.source_file,
      import_format: row.import_format,
      data_quality_score: row.data_quality_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  updateBreadthData(id: number, data: Partial<BreadthData>): boolean {
    // Get existing record
    const existing = this.getBreadthById.get(id) as any
    if (!existing) {
      throw new Error(`Breadth data with id ${id} not found`)
    }

    // Merge with existing data
    const merged = {
      date: data.date ?? existing.date,
      timestamp: data.timestamp ?? existing.timestamp,
      advancingIssues: data.advancingIssues ?? existing.advancing_issues,
      decliningIssues: data.decliningIssues ?? existing.declining_issues,
      newHighs: data.newHighs ?? existing.new_highs,
      newLows: data.newLows ?? existing.new_lows,
      upVolume: data.upVolume ?? existing.up_volume,
      downVolume: data.downVolume ?? existing.down_volume,
      dataSource: data.dataSource ?? existing.data_source,
      notes: data.notes ?? existing.notes
    }

    // Recalculate breadth score
    const calculation = this.calculateBreadthScore(merged)

    const info = this.updateBreadthById.run(
      merged.date,
      merged.timestamp,
      merged.advancingIssues,
      merged.decliningIssues,
      merged.newHighs,
      merged.newLows,
      merged.upVolume,
      merged.downVolume,
      calculation.breadthScore,
      calculation.trendStrength,
      calculation.marketPhase,
      merged.dataSource,
      merged.notes,
      id
    )

    return info.changes > 0
  }

  deleteBreadthData(id: number): boolean {
    const info = this.deleteBreadthById.run(id)
    return info.changes > 0
  }

  calculateBreadthScore(data: {
    advancingIssues: number
    decliningIssues: number
    newHighs: number
    newLows: number
    upVolume?: number
    downVolume?: number
  }): BreadthCalculation {
    const {
      advancingIssues,
      decliningIssues,
      newHighs,
      newLows,
      upVolume = 0,
      downVolume = 0
    } = data

    // 6-Factor Breadth Score Calculation
    // Factor 1: Advance/Decline Ratio (0-30 points)
    const totalIssues = advancingIssues + decliningIssues
    const advanceDeclineRatio = totalIssues > 0 ? advancingIssues / totalIssues : 0.5
    const advanceDeclineScore = advanceDeclineRatio * 30

    // Factor 2: New High/Low Ratio (0-20 points)
    const totalNewHighLow = newHighs + newLows
    const newHighLowRatio = totalNewHighLow > 0 ? newHighs / totalNewHighLow : 0.5
    const newHighLowScore = newHighLowRatio * 20

    // Factor 3: Up/Down Volume Ratio (0-25 points)
    const totalVolume = upVolume + downVolume
    const volumeRatio = totalVolume > 0 ? upVolume / totalVolume : 0.5
    const volumeScore = volumeRatio * 25

    // Factor 4: Absolute strength (advancing issues as % of 3000 typical) (0-10 points)
    const absoluteAdvancingScore = Math.min(10, (advancingIssues / 3000) * 10)

    // Factor 5: Momentum factor (new highs as absolute strength) (0-10 points)
    const momentumScore = Math.min(10, (newHighs / 200) * 10)

    // Factor 6: Volume confirmation (up volume strength) (0-5 points)
    const volumeConfirmationScore = Math.min(5, (upVolume / 20) * 5) // Assuming 20B as heavy volume

    // Total Breadth Score (0-100)
    const breadthScore = Math.round(
      advanceDeclineScore + 
      newHighLowScore + 
      volumeScore + 
      absoluteAdvancingScore + 
      momentumScore + 
      volumeConfirmationScore
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
   * Build comprehensive notes string with all percentage movement fields
   * Performance-optimized with conditional field inclusion and efficient string construction
   */
  private buildComprehensiveNotes(fields: {
    up4pct?: string
    down4pct?: string
    up25quarter?: string
    down25quarter?: string
    up25month?: string
    down25month?: string
    up50month?: string
    down50month?: string
    up13day34?: string
    down13day34?: string
    ratio5day?: string
    ratio10day?: string
    t2108?: string
    sp500?: string
    worden?: string
  }): string {
    const notesParts: string[] = []
    
    // Input validation and sanitization
    const safeValue = (value?: string): string | null => {
      if (!value || value.trim() === '' || value.toLowerCase() === 'null' || value === 'undefined') {
        return null
      }
      return value.trim()
    }
    
    // Core percentage fields (most important for trading analysis)
    const up4pctSafe = safeValue(fields.up4pct)
    const down4pctSafe = safeValue(fields.down4pct)
    if (up4pctSafe) notesParts.push(`up4%=${up4pctSafe}`)
    if (down4pctSafe) notesParts.push(`down4%=${down4pctSafe}`)
    
    // Quarterly percentage fields (medium-term momentum)
    const up25qSafe = safeValue(fields.up25quarter)
    const down25qSafe = safeValue(fields.down25quarter)
    if (up25qSafe) notesParts.push(`up25q%=${up25qSafe}`)
    if (down25qSafe) notesParts.push(`down25q%=${down25qSafe}`)
    
    // Monthly percentage fields (trend analysis)
    const up25mSafe = safeValue(fields.up25month)
    const down25mSafe = safeValue(fields.down25month)
    const up50mSafe = safeValue(fields.up50month)
    const down50mSafe = safeValue(fields.down50month)
    if (up25mSafe) notesParts.push(`up25m%=${up25mSafe}`)
    if (down25mSafe) notesParts.push(`down25m%=${down25mSafe}`)
    if (up50mSafe) notesParts.push(`up50m%=${up50mSafe}`)
    if (down50mSafe) notesParts.push(`down50m%=${down50mSafe}`)
    
    // 13-34 day percentage fields (intermediate momentum)
    const up13_34Safe = safeValue(fields.up13day34)
    const down13_34Safe = safeValue(fields.down13day34)
    if (up13_34Safe) notesParts.push(`up13-34%=${up13_34Safe}`)
    if (down13_34Safe) notesParts.push(`down13-34%=${down13_34Safe}`)
    
    // Reference ratios and market indicators
    const ratio5dSafe = safeValue(fields.ratio5day)
    const ratio10dSafe = safeValue(fields.ratio10day)
    const t2108Safe = safeValue(fields.t2108)
    const sp500Safe = safeValue(fields.sp500)
    const wordenSafe = safeValue(fields.worden)
    
    if (ratio5dSafe) notesParts.push(`ratio5d=${ratio5dSafe}`)
    if (ratio10dSafe) notesParts.push(`ratio10d=${ratio10dSafe}`)
    if (t2108Safe) notesParts.push(`T2108=${t2108Safe}`)
    if (sp500Safe) notesParts.push(`SP=${sp500Safe}`)
    if (wordenSafe) notesParts.push(`worden=${wordenSafe}`)
    
    // Return formatted notes string or fallback for legacy compatibility
    if (notesParts.length === 0) {
      return 'CSV: no valid data fields found'
    }
    
    return `CSV: ${notesParts.join(', ')}`
  }

  /**
   * RFC 4180 compliant CSV line parser
   * Handles quoted fields containing commas, escaped quotes, and proper field separation
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0
    
    while (i < line.length) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Handle escaped quotes ("")
          current += '"'
          i += 2
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator outside quotes
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }
    
    // Add final field
    result.push(current.trim())
    return result
  }

  /**
   * Safe numeric parsing with error handling and validation
   * Returns null for invalid or missing values
   */
  private safeParseNumber(value: string | undefined, type: 'int' | 'float' = 'int'): number | null {
    if (!value || value.trim() === '' || value.toLowerCase() === 'null' || value === 'undefined') {
      return null
    }
    
    const trimmed = value.trim().replace(/[,$]/g, '') // Remove commas and dollar signs
    const parsed = type === 'int' ? parseInt(trimmed) : parseFloat(trimmed)
    
    if (isNaN(parsed)) {
      return null
    }
    
    return parsed
  }

  /**
   * Extract values from notes string for backward compatibility
   * Handles both legacy and new notes formats
   */
  public extractFromNotes(notes: string): Partial<{
    up4pct: number
    down4pct: number
    up25quarter: number
    down25quarter: number
    up25month: number
    down25month: number
    up50month: number
    down50month: number
    up13day34: number
    down13day34: number
    ratio5day: number
    ratio10day: number
    t2108: number
    sp500: string
    worden: number
  }> {
    const extracted: any = {}
    
    if (!notes || typeof notes !== 'string') {
      return extracted
    }
    
    try {
      // Match patterns for all field types with flexible parsing
      const patterns = {
        up4pct: /up4%=([^,]+)/i,
        down4pct: /down4%=([^,]+)/i,
        up25quarter: /up25q%=([^,]+)/i,
        down25quarter: /down25q%=([^,]+)/i,
        up25month: /up25m%=([^,]+)/i,
        down25month: /down25m%=([^,]+)/i,
        up50month: /up50m%=([^,]+)/i,
        down50month: /down50m%=([^,]+)/i,
        up13day34: /up13-34%=([^,]+)/i,
        down13day34: /down13-34%=([^,]+)/i,
        ratio5day: /ratio5d=([^,]+)/i,
        ratio10day: /ratio10d=([^,]+)/i,
        t2108: /T2108=([^,]+)/i,
        sp500: /SP=([^,]+)/i,
        worden: /worden=([^,]+)/i
      }
      
      // Extract each field with safe parsing
      for (const [field, pattern] of Object.entries(patterns)) {
        const match = notes.match(pattern)
        if (match && match[1]) {
          const value = match[1].trim()
          if (field === 'sp500') {
            extracted[field] = value // Keep as string for S&P 500 values
          } else {
            const numericValue = field.includes('ratio') || field === 't2108' 
              ? this.safeParseNumber(value, 'float')
              : this.safeParseNumber(value)
            if (numericValue !== null) {
              extracted[field] = numericValue
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error extracting from notes:', error)
    }
    
    return extracted
  }

  importFromCSV(csvData: string): CSVImportResult {
    const lines = csvData.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    const dataLines = lines.slice(1)

    let importedCount = 0
    let skippedCount = 0
    let errorCount = 0
    const errors: string[] = []
    const duplicates: string[] = []

    // Auto-detect format
    const isStockbeeFormat = headers.some(h => 
      h.toLowerCase().includes('stocks up 4%') || 
      h.toLowerCase().includes('t2108') ||
      h.toLowerCase().includes('primary breadth')
    )

    // Skip first line if it's a category header (like "Primary Breadth Indicators")
    let startIndex = 0
    if (headers[0] === '' && headers[1] && headers[1].toLowerCase().includes('primary')) {
      // This is a category header line, skip it and use the next line for headers
      if (dataLines.length > 0) {
        const realHeaders = dataLines[0].split(',').map(h => h.trim())
        dataLines.splice(0, 1) // Remove the header line from data
        headers.splice(0, headers.length, ...realHeaders) // Replace headers
      }
    }

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const line = dataLines[i]
        // RFC 4180 compliant CSV parsing - handles quoted fields with commas
        const values = this.parseCSVLine(line)
        
        // Expected field count for Stockbee format validation
        const expectedFieldCount = 16
        if (isStockbeeFormat && values.length !== expectedFieldCount) {
          console.error(`CSV Field count mismatch on line ${i + 2}:`)
          console.error(`  Expected: ${expectedFieldCount} fields`)
          console.error(`  Actual: ${values.length} fields`)
          console.error(`  Line: ${line}`)
          console.error(`  Parsed values:`, values)
          
          errors.push(`Row ${i + 2}: Field count mismatch (expected ${expectedFieldCount}, got ${values.length})`)
          errorCount++
          continue // Skip this malformed row
        }
        
        if (values.length < 2) {
          continue // Skip empty or incomplete lines
        }

        let breadthData: BreadthData

        if (isStockbeeFormat) {
          // Stockbee Market Monitor Format
          // Expected: Date, up4%, down4%, 5day, 10day, up25%quarter, down25%quarter, up25%month, down25%month, up50%month, down50%month, up13%34day, down13%34day, worden, T2108, S&P
          
          // Enhanced error handling: ensure we have minimum required fields
          if (values.length < 3) {
            errors.push(`Row ${i + 2}: Insufficient columns for Stockbee format (minimum: date, up4%, down4%)`)
            errorCount++
            continue
          }
          
          const [
            date, up4pct, down4pct, ratio5day, ratio10day,
            up25quarter, down25quarter, up25month, down25month,
            up50month, down50month, up13day34, down13day34,
            worden, t2108, sp500, ...rest
          ] = values
          
          // Debug logging for CSV parsing verification
          console.log(`=== CSV Import Row ${i + 2} Debug ===`)
          console.log(`Raw line: ${line}`)
          console.log(`Parsed fields count: ${values.length}`)
          console.log(`SP500 raw value: "${sp500}"`)
          console.log(`Rest array contents:`, rest)
          
          // Validate critical fields
          const validationErrors: string[] = []
          if (!date) validationErrors.push('Missing date')
          if (isNaN(parseFloat(up4pct))) validationErrors.push('Invalid up4pct')
          if (isNaN(parseFloat(t2108))) validationErrors.push('Invalid T2108')
          if (!sp500 || sp500.trim() === '') validationErrors.push('Missing SP500')
          
          if (validationErrors.length > 0) {
            console.error(`Validation errors for row ${i + 2}:`, validationErrors)
            errors.push(`Row ${i + 2}: ${validationErrors.join(', ')}`)
            errorCount++
            continue
          }
          
          // Normalize S&P 500 value - remove commas for storage
          const normalizedSP500 = sp500?.replace(/,/g, '') || ''
          
          // Data integrity verification
          const dataIntegrityCheck = {
            'up4pct': up4pct,
            'down4pct': down4pct,
            'up25quarter': up25quarter,
            'down25quarter': down25quarter,
            'up25month': up25month,
            'down25month': down25month,
            'up50month': up50month,
            'down50month': down50month,
            'up13day34': up13day34,
            'down13day34': down13day34,
            't2108': t2108,
            'sp500': normalizedSP500
          }
          
          console.log(`Row ${i + 2} - All Secondary Indicators:`, dataIntegrityCheck)
          
          // Verify no critical data in rest array
          if (rest.length > 0) {
            console.warn(`Row ${i + 2} - Unexpected data in rest array:`, rest)
            console.warn(`This might indicate parsing issues or extra columns`)
          }

          // Enhanced date parsing with validation
          let parsedDate = date
          try {
            if (date.includes('/')) {
              const dateParts = date.split('/')
              if (dateParts.length !== 3) {
                throw new Error(`Invalid date format: ${date}`)
              }
              const [month, day, year] = dateParts
              const monthNum = parseInt(month)
              const dayNum = parseInt(day)
              const yearNum = parseInt(year)
              
              // Validate date components
              if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                throw new Error(`Invalid month: ${month}`)
              }
              if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
                throw new Error(`Invalid day: ${day}`)
              }
              if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
                throw new Error(`Invalid year: ${year}`)
              }
              
              parsedDate = `${yearNum}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            }
            
            // Validate final date format
            const dateTest = new Date(parsedDate)
            if (isNaN(dateTest.getTime())) {
              throw new Error(`Invalid date after parsing: ${parsedDate}`)
            }
          } catch (dateError) {
            errors.push(`Row ${i + 2}: Date parsing error - ${dateError instanceof Error ? dateError.message : 'Unknown date error'}`)
            errorCount++
            continue
          }

          breadthData = {
            date: parsedDate,
            timestamp: new Date(parsedDate + 'T16:00:00').toISOString(),
            // Legacy compatibility (keep these) - use safe parsing with fallback to 0
            advancingIssues: this.safeParseNumber(up4pct) || 0,
            decliningIssues: this.safeParseNumber(down4pct) || 0,
            newHighs: Math.round((this.safeParseNumber(up25quarter) || 0) / 10), // Scale down quarterly data
            newLows: Math.round((this.safeParseNumber(down25quarter) || 0) / 10),
            upVolume: this.safeParseNumber(up25month) || 0,
            downVolume: this.safeParseNumber(down25month) || 0,
            breadthScore: 0, // Will be calculated
            
            // NEW: Map to correct schema columns with safe parsing
            stocks_up_4pct: this.safeParseNumber(up4pct),
            stocks_down_4pct: this.safeParseNumber(down4pct),
            stocks_up_25pct_quarter: this.safeParseNumber(up25quarter),
            stocks_down_25pct_quarter: this.safeParseNumber(down25quarter),
            stocks_up_25pct_month: this.safeParseNumber(up25month),
            stocks_down_25pct_month: this.safeParseNumber(down25month),
            stocks_up_50pct_month: this.safeParseNumber(up50month),
            stocks_down_50pct_month: this.safeParseNumber(down50month),
            stocks_up_13pct_34days: this.safeParseNumber(up13day34),
            stocks_down_13pct_34days: this.safeParseNumber(down13day34),
            ratio_5day: this.safeParseNumber(ratio5day, 'float'),
            ratio_10day: this.safeParseNumber(ratio10day, 'float'),
            t2108: this.safeParseNumber(t2108, 'float'),
            sp500: normalizedSP500 || null, // FIXED: Now single, normalized value
            worden_universe: this.safeParseNumber(worden),
            
            dataSource: 'imported',
            notes: this.buildComprehensiveNotes({
              up4pct, down4pct, up25quarter, down25quarter,
              up25month, down25month, up50month, down50month,
              up13day34, down13day34, ratio5day, ratio10day,
              t2108, sp500: normalizedSP500, worden
            })
          }
        } else {
          // Standard Format
          if (values.length < 7) {
            errors.push(`Row ${i + 2}: Insufficient columns for standard format`)
            errorCount++
            continue
          }

          const [date, advIssues, decIssues, newHighs, newLows, upVol, downVol, ...rest] = values
          
          breadthData = {
            date: date,
            timestamp: new Date(date + 'T16:00:00').toISOString(),
            advancingIssues: parseInt(advIssues) || 0,
            decliningIssues: parseInt(decIssues) || 0,
            newHighs: parseInt(newHighs) || 0,
            newLows: parseInt(newLows) || 0,
            upVolume: parseFloat(upVol) || 0,
            downVolume: parseFloat(downVol) || 0,
            breadthScore: 0,
            dataSource: 'imported',
            notes: rest.length > 0 ? rest.join(', ') : undefined
          }
        }

        // Validate date
        if (!breadthData.date || breadthData.date === '' || breadthData.date === 'Date') {
          continue // Skip header rows or invalid dates
        }

        // Check for duplicate
        const existing = this.db.prepare(
          'SELECT id FROM market_breadth WHERE date = ?'
        ).get(breadthData.date)

        if (existing) {
          duplicates.push(`${breadthData.date}`)
          skippedCount++
          continue
        }

        this.saveBreadthData(breadthData)
        importedCount++

      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        errorCount++
      }
    }

    return {
      success: errorCount === 0 || importedCount > 0,
      imported: importedCount,
      importedCount: importedCount,  // Legacy compatibility
      skipped: skippedCount,
      skippedCount: skippedCount,   // Legacy compatibility
      errors: errorCount,
      errorCount: errorCount,       // Legacy compatibility
      errorDetails: errors,
      columnMapping: headers,
      message: `Successfully imported ${importedCount} records, skipped ${skippedCount} duplicates, ${errorCount} errors`,
      duplicates: duplicates.length > 0 ? duplicates : undefined
    }
  }

  exportToCSV(startDate?: string, endDate?: string): CSVExportResult {
    try {
      const end = endDate || new Date().toISOString().split('T')[0]
      const start = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const data = this.getBreadthHistory(start, end)
      
      // CSV Header
      const header = 'Date,Timestamp,AdvancingIssues,DecliningIssues,NewHighs,NewLows,UpVolume,DownVolume,BreadthScore,TrendStrength,MarketPhase,DataSource,Notes'
      
      // CSV Data
      const csvRows = data.map(row => [
        row.date,
        row.timestamp,
        row.advancingIssues,
        row.decliningIssues,
        row.newHighs,
        row.newLows,
        row.upVolume,
        row.downVolume,
        row.breadthScore,
        row.trendStrength || '',
        row.marketPhase || '',
        row.dataSource,
        row.notes || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      
      const csvContent = [header, ...csvRows].join('\n')
      const filename = `market-breadth-${start}-to-${end}.csv`
      
      return {
        success: true,
        data: csvContent,
        filename,
        recordCount: data.length
      }
      
    } catch (error) {
      throw new Error(`CSV export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // =================================
  // DATA RECOVERY INTEGRATION METHODS
  // =================================

  /**
   * Execute data recovery for corrupted CSV import records
   * This addresses comma-in-quotes problems, multi-value S&P fields, and missing indicators
   */
  public async executeDataRecovery(databasePath?: string): Promise<RecoveryResult> {
    console.log('🔧 Starting integrated data recovery process...')
    
    const dbPath = databasePath || this.getDatabasePath()
    const recoveryService = new DataRecoveryService(dbPath)
    
    try {
      const result = await recoveryService.executeCompleteRecovery()
      console.log('✅ Data recovery completed through BreadthService')
      return result
    } finally {
      recoveryService.close()
    }
  }

  /**
   * Analyze corruption in the current database
   */
  public analyzeDataCorruption() {
    const dbPath = this.getDatabasePath()
    const recoveryService = new DataRecoveryService(dbPath)
    
    try {
      return recoveryService.analyzeCorruption()
    } finally {
      recoveryService.close()
    }
  }

  /**
   * Recover corrupted S&P 500 values with multi-value and comma issues
   */
  public recoverCorruptedSP500Values(): { recovered: number; failed: number } {
    console.log('🔧 Starting S&P 500 value recovery...')
    
    const corruptedRecords = this.db.prepare(`
      SELECT id, sp500, notes FROM market_breadth 
      WHERE sp500 LIKE '% %' 
         OR sp500 LIKE '%,%'
         OR CAST(REPLACE(sp500, ',', '') AS REAL) < 100
    `).all() as Array<{ id: number; sp500: string; notes: string }>
    
    let recovered = 0
    let failed = 0
    
    for (const record of corruptedRecords) {
      try {
        let recoveredValue: string | null = null
        
        // Strategy 1: Extract from multi-value field
        if (record.sp500.includes(' ')) {
          const parts = record.sp500.trim().split(/\s+/)
          const numericParts = parts
            .map(p => p.replace(/,/g, ''))
            .map(p => parseFloat(p))
            .filter(n => !isNaN(n) && n > 100 && n < 10000) // Realistic S&P range
          
          if (numericParts.length > 0) {
            // Take the largest value (most likely S&P)
            recoveredValue = Math.max(...numericParts).toString()
          }
        }
        
        // Strategy 2: Remove comma formatting
        if (!recoveredValue && record.sp500.includes(',') && !record.sp500.includes(' ')) {
          const withoutCommas = record.sp500.replace(/,/g, '')
          const parsed = parseFloat(withoutCommas)
          if (!isNaN(parsed) && parsed > 100 && parsed < 10000) {
            recoveredValue = withoutCommas
          }
        }
        
        // Strategy 3: Extract from notes if available
        if (!recoveredValue && record.notes) {
          const spMatch = record.notes.match(/SP[=:]\s*([0-9,.]+)/i)
          if (spMatch) {
            const candidate = spMatch[1].replace(/,/g, '')
            const parsed = parseFloat(candidate)
            if (!isNaN(parsed) && parsed > 100 && parsed < 10000) {
              recoveredValue = candidate
            }
          }
        }
        
        if (recoveredValue) {
          this.db.prepare('UPDATE market_breadth SET sp500 = ? WHERE id = ?')
            .run(recoveredValue, record.id)
          recovered++
          console.log(`✅ Recovered S&P for record ${record.id}: ${record.sp500} → ${recoveredValue}`)
        } else {
          failed++
          console.warn(`❌ Could not recover S&P for record ${record.id}: ${record.sp500}`)
        }
      } catch (error) {
        failed++
        console.error(`❌ Error recovering S&P for record ${record.id}:`, error)
      }
    }
    
    console.log(`📈 S&P 500 Recovery complete: ${recovered} recovered, ${failed} failed`)
    return { recovered, failed }
  }

  /**
   * Attempt to recover secondary indicators from database fields or notes
   */
  public recoverSecondaryIndicators(): { recovered: number; failed: number } {
    console.log('🔧 Starting secondary indicators recovery...')
    
    // Strategy 1: Check if secondary indicators are in wrong fields
    const candidates = this.db.prepare(`
      SELECT id, date, notes, new_highs, new_lows, up_volume, down_volume,
             advancing_issues, declining_issues, stocks_up_25pct_quarter,
             stocks_down_25pct_quarter
      FROM market_breadth
      WHERE stocks_up_25pct_quarter IS NULL 
         OR stocks_down_25pct_quarter IS NULL
    `).all() as SecondaryIndicatorRecord[]
    
    let recovered = 0
    let failed = 0
    
    for (const record of candidates) {
      let updates: Record<string, any> = {}
      
      // Heuristic recovery based on realistic value ranges
      // 25% quarter movements: typically 50-2000 range
      if (!record.stocks_up_25pct_quarter && record.new_highs != null && record.new_highs > 50 && record.new_highs < 2000) {
        updates.stocks_up_25pct_quarter = record.new_highs
      }
      if (!record.stocks_down_25pct_quarter && record.new_lows != null && record.new_lows > 50 && record.new_lows < 2000) {
        updates.stocks_down_25pct_quarter = record.new_lows
      }
      
      // 25% month movements: typically 20-800 range  
      if (record.up_volume != null && record.up_volume > 20 && record.up_volume < 800) {
        updates.stocks_up_25pct_month = Math.round(record.up_volume / 1000) // Potential scaling
      }
      if (record.down_volume != null && record.down_volume > 20 && record.down_volume < 800) {
        updates.stocks_down_25pct_month = Math.round(record.down_volume / 1000)
      }
      
      if (Object.keys(updates).length > 0) {
        const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ')
        const values = Object.values(updates)
        
        this.db.prepare(`UPDATE market_breadth SET ${setClauses} WHERE id = ?`)
          .run(...values, record.id)
        
        recovered++
        console.log(`✅ Recovered secondary indicators for ${record.date}:`, updates)
      } else {
        failed++
      }
    }
    
    console.log(`📊 Secondary indicators recovery: ${recovered} recovered, ${failed} failed`)
    return { recovered, failed }
  }

  /**
   * Create a backup before recovery operations
   */
  public async createRecoveryBackup(): Promise<string> {
    console.log('💾 Creating recovery backup...')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const backupPath = `trading-pre-recovery-${timestamp}.db`
    
    // Create full database backup before recovery
    this.db.backup(backupPath)
    console.log(`✅ Pre-recovery backup created: ${backupPath}`)
    
    // Also export affected records as CSV for manual review
    const affectedRecords = this.db.prepare(`
      SELECT * FROM market_breadth 
      WHERE sp500 LIKE '% %' 
         OR sp500 LIKE '%,%'
         OR stocks_up_25pct_quarter IS NULL
      ORDER BY date
    `).all()
    
    const csvContent = this.exportRecordsToCSV(affectedRecords)
    require('fs').writeFileSync(`affected-records-${timestamp}.csv`, csvContent)
    console.log(`✅ Affected records exported for review: affected-records-${timestamp}.csv`)
    
    return backupPath
  }

  /**
   * Verify recovery was successful
   */
  public verifyRecoverySuccess(): { 
    totalRecords: number; 
    corruptedSP500: number; 
    missingSecondaryIndicators: number;
    successRate: number;
  } {
    const totalRecords = this.db.prepare('SELECT COUNT(*) as count FROM market_breadth').get() as { count: number }
    
    const corruptedSP500 = this.db.prepare(`
      SELECT COUNT(*) as count FROM market_breadth 
      WHERE sp500 LIKE '% %' OR sp500 LIKE '%,%'
    `).get() as { count: number }
    
    const missingSecondaryIndicators = this.db.prepare(`
      SELECT COUNT(*) as count FROM market_breadth 
      WHERE stocks_up_25pct_quarter IS NULL OR stocks_down_25pct_quarter IS NULL
    `).get() as { count: number }
    
    const successRate = totalRecords.count > 0 
      ? ((totalRecords.count - corruptedSP500.count - missingSecondaryIndicators.count) / totalRecords.count) * 100
      : 0
    
    return {
      totalRecords: totalRecords.count,
      corruptedSP500: corruptedSP500.count,
      missingSecondaryIndicators: missingSecondaryIndicators.count,
      successRate
    }
  }

  // PRIVATE HELPER METHODS

  private getDatabasePath(): string {
    // Try to determine database path from the database object
    // This is a simplified approach - in practice, you might need to pass this explicitly
    return process.cwd() + '/trading.db'
  }

  private exportRecordsToCSV(records: any[]): string {
    if (records.length === 0) return 'No records to export'
    
    const headers = Object.keys(records[0])
    const headerRow = headers.map(h => `"${h}"`).join(',')
    
    const dataRows = records.map(record => 
      headers.map(header => `"${String(record[header] || '').replace(/"/g, '""')}"`).join(',')
    )
    
    return [headerRow, ...dataRows].join('\n')
  }
}