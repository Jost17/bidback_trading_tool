import Database from 'better-sqlite3'
import type { BreadthData, BreadthCalculation, CSVImportResult, CSVExportResult } from '../../types/trading'

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
        date, timestamp, advancing_issues, declining_issues,
        new_highs, new_lows, up_volume, down_volume,
        breadth_score, trend_strength, market_phase, data_source, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.notes || null
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
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        
        if (values.length < 2) {
          continue // Skip empty or incomplete lines
        }

        let breadthData: BreadthData

        if (isStockbeeFormat) {
          // Stockbee Market Monitor Format
          // Expected: Date, up4%, down4%, 5day, 10day, up25%quarter, down25%quarter, up25%month, down25%month, up50%month, down50%month, up13%34day, down13%34day, worden, T2108, S&P
          
          const [
            date, up4pct, down4pct, ratio5day, ratio10day,
            up25quarter, down25quarter, up25month, down25month,
            up50month, down50month, up13day34, down13day34,
            worden, t2108, sp500, ...rest
          ] = values

          // Parse date (handle MM/DD/YYYY format)
          let parsedDate = date
          if (date.includes('/')) {
            const [month, day, year] = date.split('/')
            parsedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }

          breadthData = {
            date: parsedDate,
            timestamp: new Date(parsedDate + 'T16:00:00').toISOString(),
            // Map Stockbee data to our breadth model
            advancingIssues: parseInt(up4pct) || 0,
            decliningIssues: parseInt(down4pct) || 0,
            newHighs: Math.round((parseInt(up25quarter) || 0) / 10), // Scale down quarterly data
            newLows: Math.round((parseInt(down25quarter) || 0) / 10),
            upVolume: parseInt(up25month) || 0,
            downVolume: parseInt(down25month) || 0,
            breadthScore: 0, // Will be calculated
            dataSource: 'imported',
            notes: `T2108: ${t2108}, SP: ${sp500}, 5d: ${ratio5day}, 10d: ${ratio10day}` + 
                   (rest.length > 0 ? `, ${rest.join(', ')}` : '')
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
}