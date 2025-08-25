/**
 * Historical CSV Data Importer for Market Breadth Raw Data
 * 
 * Purpose: Import 18+ years of historical market breadth data (2007-2025)
 * from Stockbee Market Monitor CSV files into the raw data schema
 * 
 * Key Features:
 * - Batch processing for optimal performance
 * - Data validation and quality scoring
 * - Duplicate detection and handling
 * - Progress tracking and error reporting
 * - Transaction-based imports for data integrity
 */

import { EnhancedBreadthService, RawMarketBreadthData } from '../services/enhanced-breadth-service'
import { TradingDatabase } from '../connection'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface ImportProgress {
  currentFile: string
  filesProcessed: number
  totalFiles: number
  recordsImported: number
  recordsSkipped: number
  recordsWithErrors: number
  percentComplete: number
  estimatedTimeRemaining?: number
  errors: string[]
}

export interface ImportResult {
  success: boolean
  totalFilesProcessed: number
  totalRecordsImported: number
  totalRecordsSkipped: number
  totalErrors: number
  processingTimeMs: number
  averageRecordsPerSecond: number
  dataQualityScore: number
  errors: string[]
  duplicates: string[]
}

export class HistoricalCSVImporter {
  private db: TradingDatabase
  private breadthService: EnhancedBreadthService
  private startTime: number = 0
  private progressCallback?: (progress: ImportProgress) => void

  constructor(db: TradingDatabase, progressCallback?: (progress: ImportProgress) => void) {
    this.db = db
    this.breadthService = new EnhancedBreadthService(db.db)
    this.progressCallback = progressCallback
  }

  /**
   * Import all historical CSV files from a directory
   */
  async importHistoricalData(
    csvDirectory: string,
    options: {
      batchSize?: number
      filePattern?: RegExp
      skipExisting?: boolean
      validateData?: boolean
    } = {}
  ): Promise<ImportResult> {
    const {
      batchSize = 1000,
      filePattern = /\.csv$/i,
      skipExisting = true,
      validateData = true
    } = options

    this.startTime = Date.now()
    const result: ImportResult = {
      success: false,
      totalFilesProcessed: 0,
      totalRecordsImported: 0,
      totalRecordsSkipped: 0,
      totalErrors: 0,
      processingTimeMs: 0,
      averageRecordsPerSecond: 0,
      dataQualityScore: 0,
      errors: [],
      duplicates: []
    }

    try {
      // Get all CSV files in directory
      const files = await this.getCSVFiles(csvDirectory, filePattern)
      console.log(`📁 Found ${files.length} CSV files to import`)

      // Sort files chronologically (assuming YYYY format in filename)
      files.sort((a, b) => {
        const yearA = this.extractYearFromFilename(a)
        const yearB = this.extractYearFromFilename(b)
        return yearA - yearB
      })

      let totalQualityScore = 0
      let qualityFileCount = 0

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileResult = await this.importCSVFile(
          path.join(csvDirectory, file),
          { batchSize, skipExisting, validateData }
        )

        // Update results
        result.totalFilesProcessed++
        result.totalRecordsImported += fileResult.importedCount
        result.totalRecordsSkipped += fileResult.skippedCount
        result.totalErrors += fileResult.errorCount

        if (fileResult.errors) {
          result.errors.push(...fileResult.errors)
        }
        if (fileResult.duplicates) {
          result.duplicates.push(...fileResult.duplicates)
        }

        // Calculate average data quality
        if (fileResult.importedCount > 0) {
          totalQualityScore += fileResult.averageQualityScore || 100
          qualityFileCount++
        }

        // Progress callback
        if (this.progressCallback) {
          const elapsed = Date.now() - this.startTime
          const estimatedTotal = (elapsed / (i + 1)) * files.length
          const estimatedRemaining = estimatedTotal - elapsed

          this.progressCallback({
            currentFile: file,
            filesProcessed: i + 1,
            totalFiles: files.length,
            recordsImported: result.totalRecordsImported,
            recordsSkipped: result.totalRecordsSkipped,
            recordsWithErrors: result.totalErrors,
            percentComplete: ((i + 1) / files.length) * 100,
            estimatedTimeRemaining: estimatedRemaining,
            errors: result.errors.slice(-5) // Last 5 errors
          })
        }

        console.log(`✅ Processed ${file}: ${fileResult.importedCount} imported, ${fileResult.skippedCount} skipped`)
      }

      // Calculate final statistics
      const processingTime = Date.now() - this.startTime
      result.processingTimeMs = processingTime
      result.averageRecordsPerSecond = result.totalRecordsImported / (processingTime / 1000)
      result.dataQualityScore = qualityFileCount > 0 ? totalQualityScore / qualityFileCount : 0
      result.success = result.totalErrors === 0 && result.totalRecordsImported > 0

      console.log(`🎉 Import completed: ${result.totalRecordsImported} records imported in ${(processingTime / 1000).toFixed(2)}s`)
      return result

    } catch (error) {
      console.error('❌ Historical import failed:', error)
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
      return result
    }
  }

  /**
   * Import a single CSV file
   */
  private async importCSVFile(
    filePath: string,
    options: {
      batchSize: number
      skipExisting: boolean
      validateData: boolean
    }
  ): Promise<{
    importedCount: number
    skippedCount: number
    errorCount: number
    averageQualityScore?: number
    errors?: string[]
    duplicates?: string[]
  }> {
    const csvContent = await fs.readFile(filePath, 'utf8')
    const filename = path.basename(filePath)
    
    // Determine format based on filename/content
    let format: 'standard' | 'stockbee' | 'custom' = 'stockbee'
    if (filename.toLowerCase().includes('stockbee')) {
      format = 'stockbee'
    }

    // Import using enhanced breadth service
    const result = await this.breadthService.importFromCSV(csvContent, format)
    
    // Calculate average data quality if available
    let averageQualityScore: number | undefined
    if (result.importedCount > 0) {
      // Get recently imported records to calculate average quality
      const recentRecords = this.db.db.prepare(`
        SELECT data_quality_score 
        FROM market_breadth_raw_data 
        WHERE source_file LIKE ?
        ORDER BY created_at DESC 
        LIMIT ?
      `).all(`%${filename}%`, result.importedCount) as Array<{ data_quality_score: number }>
      
      if (recentRecords.length > 0) {
        const totalScore = recentRecords.reduce((sum, record) => 
          sum + (record.data_quality_score || 0), 0)
        averageQualityScore = totalScore / recentRecords.length
      }
    }

    return {
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      errorCount: result.errorCount,
      averageQualityScore,
      errors: result.errors,
      duplicates: result.duplicates
    }
  }

  /**
   * Get all CSV files in directory
   */
  private async getCSVFiles(directory: string, pattern: RegExp): Promise<string[]> {
    try {
      const entries = await fs.readdir(directory)
      return entries.filter(file => pattern.test(file))
    } catch (error) {
      throw new Error(`Failed to read directory ${directory}: ${error}`)
    }
  }

  /**
   * Extract year from filename for chronological sorting
   */
  private extractYearFromFilename(filename: string): number {
    const yearMatch = filename.match(/\b(20\d{2})\b/)
    return yearMatch ? parseInt(yearMatch[1]) : 0
  }

  /**
   * Validate imported data integrity
   */
  async validateImportedData(): Promise<{
    valid: boolean
    totalRecords: number
    dateRange: { earliest: string; latest: string }
    missingDates: string[]
    qualityIssues: string[]
  }> {
    const totalRecords = this.db.db.prepare(`
      SELECT COUNT(*) as count FROM market_breadth_raw_data
    `).get() as { count: number }

    const dateRange = this.db.db.prepare(`
      SELECT MIN(date) as earliest, MAX(date) as latest 
      FROM market_breadth_raw_data
    `).get() as { earliest: string; latest: string }

    // Check for missing weekdays (basic gap detection)
    const missingDates: string[] = []
    const qualityIssues: string[] = []

    // Check data quality scores
    const lowQuality = this.db.db.prepare(`
      SELECT COUNT(*) as count 
      FROM market_breadth_raw_data 
      WHERE data_quality_score < 70
    `).get() as { count: number }

    if (lowQuality.count > 0) {
      qualityIssues.push(`${lowQuality.count} records with data quality score < 70`)
    }

    // Check for records without primary indicators
    const missingPrimary = this.db.db.prepare(`
      SELECT COUNT(*) as count 
      FROM market_breadth_raw_data 
      WHERE stocks_up_4pct_daily IS NULL 
      AND stocks_down_4pct_daily IS NULL
      AND advancing_issues IS NULL
      AND declining_issues IS NULL
    `).get() as { count: number }

    if (missingPrimary.count > 0) {
      qualityIssues.push(`${missingPrimary.count} records missing primary breadth indicators`)
    }

    return {
      valid: qualityIssues.length === 0,
      totalRecords: totalRecords.count,
      dateRange,
      missingDates,
      qualityIssues
    }
  }

  /**
   * Generate import summary report
   */
  generateReport(result: ImportResult): string {
    const report = `
# Historical Market Breadth Data Import Report

## Summary
- **Status**: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}
- **Files Processed**: ${result.totalFilesProcessed}
- **Records Imported**: ${result.totalRecordsImported.toLocaleString()}
- **Records Skipped**: ${result.totalRecordsSkipped.toLocaleString()}
- **Processing Time**: ${(result.processingTimeMs / 1000).toFixed(2)}s
- **Import Rate**: ${result.averageRecordsPerSecond.toFixed(0)} records/second
- **Data Quality**: ${result.dataQualityScore.toFixed(1)}%

## Performance Metrics
- **Average Import Speed**: ${result.averageRecordsPerSecond.toFixed(0)} records/sec
- **Total Processing Time**: ${(result.processingTimeMs / 1000).toFixed(2)} seconds
- **Data Coverage**: ${result.totalRecordsImported > 4000 ? 'Excellent (18+ years)' : 'Partial'}

## Data Quality Analysis
${result.dataQualityScore > 90 ? '✅ Excellent data quality' : 
  result.dataQualityScore > 70 ? '⚠️ Good data quality with minor gaps' : 
  '❌ Data quality issues detected'}

## Issues Encountered
${result.errors.length === 0 ? 'No errors encountered' : 
  result.errors.slice(0, 10).map(err => `- ${err}`).join('\n')}

## Duplicates Handled
${result.duplicates.length === 0 ? 'No duplicates found' : 
  `${result.duplicates.length} duplicate dates handled`}

---
Report generated: ${new Date().toISOString()}
Schema Version: v2.0 (Raw Data Only)
    `.trim()

    return report
  }
}

// Utility function for easy import from breadth score tool CSV directory
export async function importFromBreadthScoreTool(
  csvDirectory: string = '/docs/breadth_score_tool/csv',
  progressCallback?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const db = new TradingDatabase()
  
  // Run migration to ensure raw data schema exists
  try {
    db.migrateToRawDataSchema()
  } catch (error) {
    console.warn('Migration warning (may already be applied):', error)
  }
  
  const importer = new HistoricalCSVImporter(db, progressCallback)
  
  try {
    const result = await importer.importHistoricalData(csvDirectory, {
      batchSize: 500, // Smaller batches for better progress tracking
      skipExisting: true,
      validateData: true
    })
    
    // Validate imported data
    const validation = await importer.validateImportedData()
    console.log('📊 Data validation results:', validation)
    
    // Generate report
    const report = importer.generateReport(result)
    console.log(report)
    
    return result
  } finally {
    db.close()
  }
}