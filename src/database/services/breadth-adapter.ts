import Database from 'better-sqlite3'
import type { BreadthData } from '../../types/trading'

/**
 * Database adapter to handle both new schema and existing legacy schema
 */
export class BreadthDatabaseAdapter {
  private hasLegacySchema: boolean = false
  
  constructor(private db: Database.Database) {
    // Check if we're working with legacy schema
    const tables = this.getTableNames()
    // We have legacy schema only if market_breadth_daily exists and market_breadth doesn't exist
    // If both exist, prioritize the new schema (market_breadth)
    this.hasLegacySchema = tables.includes('market_breadth_daily') && !tables.includes('market_breadth')
    
    console.log('BreadthDatabaseAdapter initialized with', this.hasLegacySchema ? 'legacy schema' : 'new schema')
    console.log('Available tables:', tables.join(', '))
  }
  
  private getTableNames(): string[] {
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as Array<{ name: string }>
    
    return tables.map(t => t.name)
  }
  
  /**
   * Save breadth data to appropriate table/schema
   */
  saveBreadthData(data: BreadthData): number {
    if (this.hasLegacySchema) {
      return this.saveBreadthDataLegacy(data)
    } else {
      return this.saveBreadthDataNew(data)
    }
  }
  
  /**
   * Save to legacy market_breadth_daily table
   */
  private saveBreadthDataLegacy(data: BreadthData): number {
    const insertStatement = this.db.prepare(`
      INSERT INTO market_breadth_daily (
        date, stocks_up_4pct_daily, stocks_down_4pct_daily,
        stocks_up_25pct_quarterly, stocks_down_25pct_quarterly,
        stocks_up_25pct_monthly, stocks_down_25pct_monthly,
        stocks_up_50pct_monthly, stocks_down_50pct_monthly,
        stocks_up_13pct_34days, stocks_down_13pct_34days,
        stocks_up_20pct_custom, stocks_down_20pct_custom,
        stocks_up_20dollar_custom, stocks_down_20dollar_custom,
        ratio_5day, ratio_10day, t2108, sp_reference,
        worden_common_stocks, vix, data_source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(date) DO UPDATE SET
        stocks_up_4pct_daily = excluded.stocks_up_4pct_daily,
        stocks_down_4pct_daily = excluded.stocks_down_4pct_daily,
        stocks_up_25pct_quarterly = excluded.stocks_up_25pct_quarterly,
        stocks_down_25pct_quarterly = excluded.stocks_down_25pct_quarterly,
        stocks_up_25pct_monthly = excluded.stocks_up_25pct_monthly,
        stocks_down_25pct_monthly = excluded.stocks_down_25pct_monthly,
        stocks_up_50pct_monthly = excluded.stocks_up_50pct_monthly,
        stocks_down_50pct_monthly = excluded.stocks_down_50pct_monthly,
        stocks_up_13pct_34days = excluded.stocks_up_13pct_34days,
        stocks_down_13pct_34days = excluded.stocks_down_13pct_34days,
        stocks_up_20pct_custom = excluded.stocks_up_20pct_custom,
        stocks_down_20pct_custom = excluded.stocks_down_20pct_custom,
        stocks_up_20dollar_custom = excluded.stocks_up_20dollar_custom,
        stocks_down_20dollar_custom = excluded.stocks_down_20dollar_custom,
        ratio_5day = excluded.ratio_5day,
        ratio_10day = excluded.ratio_10day,
        t2108 = excluded.t2108,
        sp_reference = excluded.sp_reference,
        worden_common_stocks = excluded.worden_common_stocks,
        vix = excluded.vix,
        data_source = excluded.data_source,
        updated_at = CURRENT_TIMESTAMP
    `)
    
    const info = insertStatement.run(
      data.date,
      data.stocks_up_4pct || data.advancingIssues || 0,
      data.stocks_down_4pct || data.decliningIssues || 0,
      data.stocks_up_25pct_quarter || null,
      data.stocks_down_25pct_quarter || null,
      data.stocks_up_25pct_month || null,
      data.stocks_down_25pct_month || null,
      data.stocks_up_50pct_month || null,
      data.stocks_down_50pct_month || null,
      data.stocks_up_13pct_34days || null,
      data.stocks_down_13pct_34days || null,
      data.stocks_up_20pct || null,
      data.stocks_down_20pct || null,
      data.stocks_up_20dollar || null,
      data.stocks_down_20dollar || null,
      data.ratio_5day || null,
      data.ratio_10day || null,
      data.t2108 || null,
      data.sp500 || null,
      data.worden_universe || null,
      data.vix || null,
      data.dataSource || 'imported'
    )
    
    console.log(`Saved breadth data to legacy schema, rowid: ${info.lastInsertRowid}`)
    return Number(info.lastInsertRowid)
  }
  
  /**
   * Save to new market_breadth table with UPSERT logic
   * FIXED: Use date-only conflict resolution to prevent duplicate records
   */
  private saveBreadthDataNew(data: BreadthData): number {
    // Check if record exists for this date and get its timestamp
    const existingRecord = this.getExistingRecord(data.date)
    const timestamp = existingRecord ? existingRecord.timestamp : this.generateConsistentTimestamp(data.date, data.timestamp)
    
    // Prepare data with correct timestamp (use existing or generate consistent one)
    const finalData = {
      ...data,
      timestamp: timestamp,
      dataSource: data.dataSource || 'manual'
    }
    
    console.log(`UPSERT operation for date: ${finalData.date} with timestamp: ${timestamp} (existing: ${!!existingRecord})`)

    const upsertStatement = this.db.prepare(`
      INSERT INTO market_breadth (
        date, timestamp, advancing_issues, declining_issues, new_highs, new_lows, up_volume, down_volume,
        breadth_score, trend_strength, market_phase, data_source, notes,
        stocks_up_20pct, stocks_down_20pct, stocks_up_20dollar, stocks_down_20dollar,
        ratio_5day, ratio_10day, stocks_up_4pct, stocks_down_4pct,
        stocks_up_25pct_quarter, stocks_down_25pct_quarter, stocks_up_25pct_month, stocks_down_25pct_month,
        stocks_up_50pct_month, stocks_down_50pct_month, stocks_up_13pct_34days, stocks_down_13pct_34days,
        worden_universe, t2108, sp500, vix, source_file, import_format, data_quality_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        timestamp = excluded.timestamp,
        advancing_issues = COALESCE(excluded.advancing_issues, advancing_issues),
        declining_issues = COALESCE(excluded.declining_issues, declining_issues),
        new_highs = COALESCE(excluded.new_highs, new_highs),
        new_lows = COALESCE(excluded.new_lows, new_lows),
        up_volume = COALESCE(excluded.up_volume, up_volume),
        down_volume = COALESCE(excluded.down_volume, down_volume),
        breadth_score = excluded.breadth_score,
        trend_strength = excluded.trend_strength,
        market_phase = excluded.market_phase,
        data_source = excluded.data_source,
        notes = COALESCE(excluded.notes, notes),
        stocks_up_20pct = COALESCE(excluded.stocks_up_20pct, stocks_up_20pct),
        stocks_down_20pct = COALESCE(excluded.stocks_down_20pct, stocks_down_20pct),
        stocks_up_20dollar = COALESCE(excluded.stocks_up_20dollar, stocks_up_20dollar),
        stocks_down_20dollar = COALESCE(excluded.stocks_down_20dollar, stocks_down_20dollar),
        ratio_5day = COALESCE(excluded.ratio_5day, ratio_5day),
        ratio_10day = COALESCE(excluded.ratio_10day, ratio_10day),
        stocks_up_4pct = COALESCE(excluded.stocks_up_4pct, stocks_up_4pct),
        stocks_down_4pct = COALESCE(excluded.stocks_down_4pct, stocks_down_4pct),
        stocks_up_25pct_quarter = COALESCE(excluded.stocks_up_25pct_quarter, stocks_up_25pct_quarter),
        stocks_down_25pct_quarter = COALESCE(excluded.stocks_down_25pct_quarter, stocks_down_25pct_quarter),
        stocks_up_25pct_month = COALESCE(excluded.stocks_up_25pct_month, stocks_up_25pct_month),
        stocks_down_25pct_month = COALESCE(excluded.stocks_down_25pct_month, stocks_down_25pct_month),
        stocks_up_50pct_month = COALESCE(excluded.stocks_up_50pct_month, stocks_up_50pct_month),
        stocks_down_50pct_month = COALESCE(excluded.stocks_down_50pct_month, stocks_down_50pct_month),
        stocks_up_13pct_34days = COALESCE(excluded.stocks_up_13pct_34days, stocks_up_13pct_34days),
        stocks_down_13pct_34days = COALESCE(excluded.stocks_down_13pct_34days, stocks_down_13pct_34days),
        worden_universe = COALESCE(excluded.worden_universe, worden_universe),
        t2108 = COALESCE(excluded.t2108, t2108),
        sp500 = COALESCE(excluded.sp500, sp500),
        vix = COALESCE(excluded.vix, vix),
        source_file = COALESCE(excluded.source_file, source_file),
        import_format = COALESCE(excluded.import_format, import_format),
        data_quality_score = COALESCE(excluded.data_quality_score, data_quality_score),
        updated_at = CURRENT_TIMESTAMP
    `)
    
    const info = upsertStatement.run(
      finalData.date,
      finalData.timestamp,
      finalData.advancingIssues,
      finalData.decliningIssues,
      finalData.newHighs,
      finalData.newLows,
      finalData.upVolume,
      finalData.downVolume,
      finalData.breadthScore,
      finalData.trendStrength,
      finalData.marketPhase,
      finalData.dataSource,
      finalData.notes || null,
      finalData.stocks_up_20pct || null,
      finalData.stocks_down_20pct || null,
      finalData.stocks_up_20dollar || null,
      finalData.stocks_down_20dollar || null,
      finalData.ratio_5day || null,
      finalData.ratio_10day || null,
      finalData.stocks_up_4pct || null,
      finalData.stocks_down_4pct || null,
      finalData.stocks_up_25pct_quarter || null,
      finalData.stocks_down_25pct_quarter || null,
      finalData.stocks_up_25pct_month || null,
      finalData.stocks_down_25pct_month || null,
      finalData.stocks_up_50pct_month || null,
      finalData.stocks_down_50pct_month || null,
      finalData.stocks_up_13pct_34days || null,
      finalData.stocks_down_13pct_34days || null,
      finalData.worden_universe || null,
      finalData.t2108 || null,
      finalData.sp500 || null,
      finalData.vix || null,
      finalData.source_file || null,
      finalData.import_format || null,
      finalData.data_quality_score || null
    )
    
    // Determine if this was an insert or update
    const isUpdate = info.changes > 0 && info.lastInsertRowid === 0
    const rowId = isUpdate ? this.getRecordId(finalData.date) : Number(info.lastInsertRowid)
    
    console.log(`${isUpdate ? 'Updated' : 'Inserted'} breadth data for ${finalData.date}, rowid: ${rowId}`)
    return rowId
  }
  
  /**
   * Get breadth history - works with both schemas through the view
   */
  getBreadthHistory(startDate: string, endDate: string): BreadthData[] {
    // Use the view for both schemas
    const statement = this.db.prepare(`
      SELECT * FROM market_breadth 
      WHERE date BETWEEN ? AND ? 
      ORDER BY date DESC
    `)
    
    const results = statement.all(startDate, endDate) as any[]
    
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
      vix: row.vix,
      source_file: row.source_file,
      import_format: row.import_format,
      data_quality_score: row.data_quality_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }
  
  /**
   * Check for duplicate dates
   */
  checkForDuplicate(date: string): boolean {
    let query: string
    if (this.hasLegacySchema) {
      query = 'SELECT id FROM market_breadth_daily WHERE date = ?'
    } else {
      query = 'SELECT id FROM market_breadth WHERE date = ?'
    }
    
    const existing = this.db.prepare(query).get(date)
    return !!existing
  }

  /**
   * Get existing record for a given date to enable data merging
   */
  private getExistingRecord(date: string): any | null {
    if (this.hasLegacySchema) {
      const query = 'SELECT * FROM market_breadth_daily WHERE date = ? LIMIT 1'
      return this.db.prepare(query).get(date) as any | null
    } else {
      const query = 'SELECT * FROM market_breadth WHERE date = ? LIMIT 1'
      return this.db.prepare(query).get(date) as any | null
    }
  }

  /**
   * Get record ID for a given date (used after update operations)
   */
  private getRecordId(date: string): number {
    if (this.hasLegacySchema) {
      const query = 'SELECT id FROM market_breadth_daily WHERE date = ? LIMIT 1'
      const record = this.db.prepare(query).get(date) as any
      return record?.id || 0
    } else {
      const query = 'SELECT id FROM market_breadth WHERE date = ? LIMIT 1'
      const record = this.db.prepare(query).get(date) as any
      return record?.id || 0
    }
  }

  /**
   * Generate consistent timestamp for a given date
   * This ensures the same date always gets the same timestamp for UPSERT conflict detection
   */
  private generateConsistentTimestamp(date: string, providedTimestamp?: string): string {
    if (providedTimestamp) {
      return providedTimestamp
    }
    
    // For daily market breadth data, use a consistent time (market close: 16:00 EST/EDT)
    // This ensures that the same date will always generate the same timestamp
    const marketCloseTime = '16:00:00.000Z'
    
    // Validate and normalize date format
    let normalizedDate: string
    try {
      if (date.includes('/')) {
        // Handle MM/DD/YYYY format
        const parts = date.split('/')
        if (parts.length === 3) {
          const [month, day, year] = parts
          normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        } else {
          throw new Error('Invalid date format')
        }
      } else if (date.includes('-')) {
        // Already in YYYY-MM-DD format
        normalizedDate = date.split('T')[0] // Remove time part if present
      } else {
        throw new Error('Unsupported date format')
      }
      
      // Validate the date
      const testDate = new Date(normalizedDate + 'T00:00:00.000Z')
      if (isNaN(testDate.getTime())) {
        throw new Error('Invalid date')
      }
      
    } catch (error) {
      console.error(`Error normalizing date "${date}":`, error)
      // Fallback to current date
      normalizedDate = new Date().toISOString().split('T')[0]
    }
    
    return `${normalizedDate}T${marketCloseTime}`
  }

  /**
   * Merge new data with existing record data
   * Strategy: Only overwrite null/undefined values, preserve existing non-null data
   */
  private mergeDataWithExisting(existingRecord: any, newData: BreadthData): BreadthData {
    // Helper function to safely merge values
    const mergeValue = <T>(newVal: T | null | undefined, existingVal: T | null | undefined): T | null | undefined => {
      // If new value is provided and not null/undefined, use it
      if (newVal !== null && newVal !== undefined) {
        return newVal
      }
      // Otherwise preserve existing value
      return existingVal
    }

    // Convert database fields back to BreadthData format for merging
    const existingAsBreadthData: BreadthData = {
      id: existingRecord.id,
      date: existingRecord.date,
      timestamp: existingRecord.timestamp,
      advancingIssues: existingRecord.advancing_issues,
      decliningIssues: existingRecord.declining_issues,
      newHighs: existingRecord.new_highs,
      newLows: existingRecord.new_lows,
      upVolume: existingRecord.up_volume,
      downVolume: existingRecord.down_volume,
      breadthScore: existingRecord.breadth_score,
      trendStrength: existingRecord.trend_strength,
      marketPhase: existingRecord.market_phase,
      dataSource: existingRecord.data_source as 'manual' | 'imported' | 'api',
      notes: existingRecord.notes,
      stocks_up_4pct: existingRecord.stocks_up_4pct,
      stocks_down_4pct: existingRecord.stocks_down_4pct,
      stocks_up_20pct: existingRecord.stocks_up_20pct,
      stocks_down_20pct: existingRecord.stocks_down_20pct,
      stocks_up_20dollar: existingRecord.stocks_up_20dollar,
      stocks_down_20dollar: existingRecord.stocks_down_20dollar,
      stocks_up_25pct_quarter: existingRecord.stocks_up_25pct_quarter,
      stocks_down_25pct_quarter: existingRecord.stocks_down_25pct_quarter,
      stocks_up_25pct_month: existingRecord.stocks_up_25pct_month,
      stocks_down_25pct_month: existingRecord.stocks_down_25pct_month,
      stocks_up_50pct_month: existingRecord.stocks_up_50pct_month,
      stocks_down_50pct_month: existingRecord.stocks_down_50pct_month,
      stocks_up_13pct_34days: existingRecord.stocks_up_13pct_34days,
      stocks_down_13pct_34days: existingRecord.stocks_down_13pct_34days,
      ratio_5day: existingRecord.ratio_5day,
      ratio_10day: existingRecord.ratio_10day,
      t2108: existingRecord.t2108,
      sp500: existingRecord.sp500,
      vix: existingRecord.vix,
      worden_universe: existingRecord.worden_universe,
      source_file: existingRecord.source_file,
      import_format: existingRecord.import_format,
      data_quality_score: existingRecord.data_quality_score,
      createdAt: existingRecord.created_at,
      updatedAt: existingRecord.updated_at
    }

    // Merge the data intelligently
    const merged: BreadthData = {
      // Core identifiers - always use new data
      date: newData.date,
      timestamp: newData.timestamp || existingAsBreadthData.timestamp,
      
      // Primary breadth data - merge intelligently
      advancingIssues: mergeValue(newData.advancingIssues, existingAsBreadthData.advancingIssues) as number,
      decliningIssues: mergeValue(newData.decliningIssues, existingAsBreadthData.decliningIssues) as number,
      newHighs: mergeValue(newData.newHighs, existingAsBreadthData.newHighs) as number,
      newLows: mergeValue(newData.newLows, existingAsBreadthData.newLows) as number,
      upVolume: mergeValue(newData.upVolume, existingAsBreadthData.upVolume) as number,
      downVolume: mergeValue(newData.downVolume, existingAsBreadthData.downVolume) as number,
      
      // Calculated fields - will be recalculated anyway
      breadthScore: newData.breadthScore,
      trendStrength: newData.trendStrength,
      marketPhase: newData.marketPhase,
      
      // Metadata - prefer new values
      dataSource: newData.dataSource || existingAsBreadthData.dataSource,
      notes: mergeValue(newData.notes, existingAsBreadthData.notes) as string | undefined,
      
      // Extended indicators - merge all values intelligently
      stocks_up_4pct: mergeValue(newData.stocks_up_4pct, existingAsBreadthData.stocks_up_4pct) as number | undefined,
      stocks_down_4pct: mergeValue(newData.stocks_down_4pct, existingAsBreadthData.stocks_down_4pct) as number | undefined,
      stocks_up_20pct: mergeValue(newData.stocks_up_20pct, existingAsBreadthData.stocks_up_20pct) as number | undefined,
      stocks_down_20pct: mergeValue(newData.stocks_down_20pct, existingAsBreadthData.stocks_down_20pct) as number | undefined,
      stocks_up_20dollar: mergeValue(newData.stocks_up_20dollar, existingAsBreadthData.stocks_up_20dollar) as number | undefined,
      stocks_down_20dollar: mergeValue(newData.stocks_down_20dollar, existingAsBreadthData.stocks_down_20dollar) as number | undefined,
      stocks_up_25pct_quarter: mergeValue(newData.stocks_up_25pct_quarter, existingAsBreadthData.stocks_up_25pct_quarter) as number | undefined,
      stocks_down_25pct_quarter: mergeValue(newData.stocks_down_25pct_quarter, existingAsBreadthData.stocks_down_25pct_quarter) as number | undefined,
      stocks_up_25pct_month: mergeValue(newData.stocks_up_25pct_month, existingAsBreadthData.stocks_up_25pct_month) as number | undefined,
      stocks_down_25pct_month: mergeValue(newData.stocks_down_25pct_month, existingAsBreadthData.stocks_down_25pct_month) as number | undefined,
      stocks_up_50pct_month: mergeValue(newData.stocks_up_50pct_month, existingAsBreadthData.stocks_up_50pct_month) as number | undefined,
      stocks_down_50pct_month: mergeValue(newData.stocks_down_50pct_month, existingAsBreadthData.stocks_down_50pct_month) as number | undefined,
      stocks_up_13pct_34days: mergeValue(newData.stocks_up_13pct_34days, existingAsBreadthData.stocks_up_13pct_34days) as number | undefined,
      stocks_down_13pct_34days: mergeValue(newData.stocks_down_13pct_34days, existingAsBreadthData.stocks_down_13pct_34days) as number | undefined,
      ratio_5day: mergeValue(newData.ratio_5day, existingAsBreadthData.ratio_5day) as number | undefined,
      ratio_10day: mergeValue(newData.ratio_10day, existingAsBreadthData.ratio_10day) as number | undefined,
      t2108: mergeValue(newData.t2108, existingAsBreadthData.t2108) as number | undefined,
      sp500: mergeValue(newData.sp500, existingAsBreadthData.sp500) as string | undefined,
      vix: mergeValue(newData.vix, existingAsBreadthData.vix) as number | undefined,
      worden_universe: mergeValue(newData.worden_universe, existingAsBreadthData.worden_universe) as number | undefined,
      source_file: mergeValue(newData.source_file, existingAsBreadthData.source_file) as string | undefined,
      import_format: mergeValue(newData.import_format, existingAsBreadthData.import_format) as string | undefined,
      data_quality_score: mergeValue(newData.data_quality_score, existingAsBreadthData.data_quality_score) as number | undefined,
      
      // Preserve system fields
      id: existingAsBreadthData.id,
      createdAt: existingAsBreadthData.createdAt,
      updatedAt: new Date().toISOString()
    }

    console.log(`Data merge summary for ${newData.date}:`)
    console.log(`  VIX: ${existingAsBreadthData.vix} → ${merged.vix}`)
    console.log(`  20% Up: ${existingAsBreadthData.stocks_up_20pct} → ${merged.stocks_up_20pct}`)
    console.log(`  20% Down: ${existingAsBreadthData.stocks_down_20pct} → ${merged.stocks_down_20pct}`)
    console.log(`  $20 Up: ${existingAsBreadthData.stocks_up_20dollar} → ${merged.stocks_up_20dollar}`)
    console.log(`  $20 Down: ${existingAsBreadthData.stocks_down_20dollar} → ${merged.stocks_down_20dollar}`)

    return merged
  }
}