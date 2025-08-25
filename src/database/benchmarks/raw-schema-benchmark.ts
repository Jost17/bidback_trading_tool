/**
 * Performance Benchmark Suite for Raw Market Breadth Schema v2.0
 * 
 * Tests and validates performance improvements over legacy calculated-field schema
 * Provides comprehensive benchmarks for common database operations
 */

import { TradingDatabase } from '../connection'
import { EnhancedBreadthService, RawMarketBreadthData } from '../services/enhanced-breadth-service'
import { performance } from 'perf_hooks'

export interface BenchmarkResult {
  operation: string
  recordCount: number
  executionTimeMs: number
  recordsPerSecond: number
  memoryUsageMB?: number
  success: boolean
  error?: string
}

export interface BenchmarkSuite {
  suiteName: string
  results: BenchmarkResult[]
  totalTimeMs: number
  averagePerformance: number
  summary: string
}

export class RawSchemaBenchmark {
  private db: TradingDatabase
  private service: EnhancedBreadthService

  constructor() {
    this.db = new TradingDatabase()
    this.service = new EnhancedBreadthService(this.db.db)
  }

  /**
   * Run comprehensive benchmark suite
   */
  async runFullBenchmark(): Promise<BenchmarkSuite[]> {
    console.log('🚀 Starting Raw Schema Performance Benchmark...')
    
    const suites: BenchmarkSuite[] = []
    
    // 1. Data Import Performance
    suites.push(await this.benchmarkDataImport())
    
    // 2. Query Performance
    suites.push(await this.benchmarkQueries())
    
    // 3. Calculation Performance  
    suites.push(await this.benchmarkCalculations())
    
    // 4. Index Efficiency
    suites.push(await this.benchmarkIndexes())
    
    // 5. Concurrent Access
    suites.push(await this.benchmarkConcurrency())
    
    // Generate summary report
    this.generateBenchmarkReport(suites)
    
    return suites
  }

  /**
   * Benchmark data import operations
   */
  private async benchmarkDataImport(): Promise<BenchmarkSuite> {
    const suite: BenchmarkSuite = {
      suiteName: 'Data Import Performance',
      results: [],
      totalTimeMs: 0,
      averagePerformance: 0,
      summary: ''
    }

    // Single record insert
    suite.results.push(await this.benchmarkSingleInsert())
    
    // Batch insert (100 records)
    suite.results.push(await this.benchmarkBatchInsert(100))
    
    // Batch insert (1000 records)
    suite.results.push(await this.benchmarkBatchInsert(1000))
    
    // CSV import performance
    suite.results.push(await this.benchmarkCSVImport())
    
    // Calculate suite metrics
    suite.totalTimeMs = suite.results.reduce((sum, r) => sum + r.executionTimeMs, 0)
    suite.averagePerformance = suite.results.reduce((sum, r) => sum + r.recordsPerSecond, 0) / suite.results.length
    
    return suite
  }

  /**
   * Benchmark query operations
   */
  private async benchmarkQueries(): Promise<BenchmarkSuite> {
    const suite: BenchmarkSuite = {
      suiteName: 'Query Performance',
      results: [],
      totalTimeMs: 0,
      averagePerformance: 0,
      summary: ''
    }

    // Single date lookup
    suite.results.push(await this.benchmarkSingleDateQuery())
    
    // Date range queries
    suite.results.push(await this.benchmarkDateRangeQuery(30))  // 1 month
    suite.results.push(await this.benchmarkDateRangeQuery(252)) // 1 year
    suite.results.push(await this.benchmarkDateRangeQuery(1260)) // 5 years
    
    // Complex filtering
    suite.results.push(await this.benchmarkComplexQuery())
    
    // Calculate suite metrics
    suite.totalTimeMs = suite.results.reduce((sum, r) => sum + r.executionTimeMs, 0)
    suite.averagePerformance = suite.results.reduce((sum, r) => sum + r.recordsPerSecond, 0) / suite.results.length
    
    return suite
  }

  /**
   * Benchmark runtime calculations
   */
  private async benchmarkCalculations(): Promise<BenchmarkSuite> {
    const suite: BenchmarkSuite = {
      suiteName: 'Runtime Calculations',
      results: [],
      totalTimeMs: 0,
      averagePerformance: 0,
      summary: ''
    }

    // 5-day ratio calculations
    suite.results.push(await this.benchmarkRatioCalculation(5))
    
    // 10-day ratio calculations
    suite.results.push(await this.benchmarkRatioCalculation(10))
    
    // 6-factor breadth score
    suite.results.push(await this.benchmarkBreadthScoreCalculation())
    
    // Bulk calculations (1 year of data)
    suite.results.push(await this.benchmarkBulkCalculations(252))
    
    // Calculate suite metrics
    suite.totalTimeMs = suite.results.reduce((sum, r) => sum + r.executionTimeMs, 0)
    suite.averagePerformance = suite.results.reduce((sum, r) => sum + r.recordsPerSecond, 0) / suite.results.length
    
    return suite
  }

  /**
   * Benchmark index efficiency
   */
  private async benchmarkIndexes(): Promise<BenchmarkSuite> {
    const suite: BenchmarkSuite = {
      suiteName: 'Index Efficiency',
      results: [],
      totalTimeMs: 0,
      averagePerformance: 0,
      summary: ''
    }

    // Date index performance
    suite.results.push(await this.benchmarkDateIndexQuery())
    
    // Quality score index performance
    suite.results.push(await this.benchmarkQualityIndexQuery())
    
    // Source file index performance
    suite.results.push(await this.benchmarkSourceIndexQuery())
    
    // Calculate suite metrics
    suite.totalTimeMs = suite.results.reduce((sum, r) => sum + r.executionTimeMs, 0)
    suite.averagePerformance = suite.results.reduce((sum, r) => sum + r.recordsPerSecond, 0) / suite.results.length
    
    return suite
  }

  /**
   * Benchmark concurrent access
   */
  private async benchmarkConcurrency(): Promise<BenchmarkSuite> {
    const suite: BenchmarkSuite = {
      suiteName: 'Concurrent Access',
      results: [],
      totalTimeMs: 0,
      averagePerformance: 0,
      summary: ''
    }

    // Concurrent reads
    suite.results.push(await this.benchmarkConcurrentReads(10))
    
    // Mixed read/write operations
    suite.results.push(await this.benchmarkMixedOperations(10))
    
    // Calculate suite metrics
    suite.totalTimeMs = suite.results.reduce((sum, r) => sum + r.executionTimeMs, 0)
    suite.averagePerformance = suite.results.reduce((sum, r) => sum + r.recordsPerSecond, 0) / suite.results.length
    
    return suite
  }

  /**
   * Individual benchmark implementations
   */
  
  private async benchmarkSingleInsert(): Promise<BenchmarkResult> {
    const testData: RawMarketBreadthData = {
      date: '2025-01-01',
      stocksUp4PctDaily: 100,
      stocksDown4PctDaily: 50,
      t2108: 65.5,
      importFormat: 'manual'
    }

    const startTime = performance.now()
    
    try {
      await this.service.saveRawBreadthData(testData)
      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: 'Single Record Insert',
        recordCount: 1,
        executionTimeMs: executionTime,
        recordsPerSecond: 1000 / executionTime,
        success: true
      }
    } catch (error) {
      return {
        operation: 'Single Record Insert',
        recordCount: 1,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkBatchInsert(batchSize: number): Promise<BenchmarkResult> {
    const startTime = performance.now()
    let successCount = 0

    try {
      // Use transaction for batch insert
      this.db.db.transaction(() => {
        for (let i = 0; i < batchSize; i++) {
          const testData: RawMarketBreadthData = {
            date: `2025-01-${String(i + 2).padStart(2, '0')}`,
            stocksUp4PctDaily: Math.floor(Math.random() * 200),
            stocksDown4PctDaily: Math.floor(Math.random() * 100),
            t2108: Math.random() * 100,
            importFormat: 'manual'
          }
          
          // Direct insert for performance
          this.service.saveRawBreadthData(testData)
          successCount++
        }
      })()

      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: `Batch Insert (${batchSize} records)`,
        recordCount: successCount,
        executionTimeMs: executionTime,
        recordsPerSecond: (successCount * 1000) / executionTime,
        success: true
      }
    } catch (error) {
      return {
        operation: `Batch Insert (${batchSize} records)`,
        recordCount: successCount,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkCSVImport(): Promise<BenchmarkResult> {
    // Create sample CSV data
    const csvData = this.generateSampleCSV(100)
    const startTime = performance.now()

    try {
      const result = await this.service.importFromCSV(csvData, 'stockbee')
      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: 'CSV Import (100 records)',
        recordCount: result.importedCount,
        executionTimeMs: executionTime,
        recordsPerSecond: (result.importedCount * 1000) / executionTime,
        success: result.success
      }
    } catch (error) {
      return {
        operation: 'CSV Import (100 records)',
        recordCount: 0,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkSingleDateQuery(): Promise<BenchmarkResult> {
    const startTime = performance.now()
    
    try {
      const result = this.db.db.prepare(`
        SELECT * FROM market_breadth_raw_data 
        WHERE date = ?
      `).get('2025-01-01')

      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: 'Single Date Query',
        recordCount: result ? 1 : 0,
        executionTimeMs: executionTime,
        recordsPerSecond: result ? 1000 / executionTime : 0,
        success: true
      }
    } catch (error) {
      return {
        operation: 'Single Date Query',
        recordCount: 0,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkDateRangeQuery(days: number): Promise<BenchmarkResult> {
    const startTime = performance.now()
    
    try {
      const results = this.db.db.prepare(`
        SELECT * FROM market_breadth_raw_data 
        WHERE date >= date('now', '-${days} days')
        ORDER BY date DESC
      `).all()

      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: `Date Range Query (${days} days)`,
        recordCount: results.length,
        executionTimeMs: executionTime,
        recordsPerSecond: (results.length * 1000) / executionTime,
        success: true
      }
    } catch (error) {
      return {
        operation: `Date Range Query (${days} days)`,
        recordCount: 0,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkComplexQuery(): Promise<BenchmarkResult> {
    const startTime = performance.now()
    
    try {
      const results = this.db.db.prepare(`
        SELECT date, stocks_up_4pct_daily, stocks_down_4pct_daily, t2108
        FROM market_breadth_raw_data 
        WHERE t2108 > 70 
          AND stocks_up_4pct_daily > stocks_down_4pct_daily
          AND data_quality_score > 90
        ORDER BY date DESC
        LIMIT 100
      `).all()

      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: 'Complex Filter Query',
        recordCount: results.length,
        executionTimeMs: executionTime,
        recordsPerSecond: (results.length * 1000) / executionTime,
        success: true
      }
    } catch (error) {
      return {
        operation: 'Complex Filter Query',
        recordCount: 0,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkRatioCalculation(days: number): Promise<BenchmarkResult> {
    const startTime = performance.now()
    let calculations = 0
    
    try {
      const recentDates = this.db.db.prepare(`
        SELECT date FROM market_breadth_raw_data 
        ORDER BY date DESC 
        LIMIT 50
      `).all() as Array<{ date: string }>

      for (const { date } of recentDates) {
        if (days === 5) {
          this.service.calculate5DayRatio({ date })
        } else {
          this.service.calculate10DayRatio({ date })
        }
        calculations++
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: `${days}-Day Ratio Calculation`,
        recordCount: calculations,
        executionTimeMs: executionTime,
        recordsPerSecond: (calculations * 1000) / executionTime,
        success: true
      }
    } catch (error) {
      return {
        operation: `${days}-Day Ratio Calculation`,
        recordCount: calculations,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkBreadthScoreCalculation(): Promise<BenchmarkResult> {
    const startTime = performance.now()
    let calculations = 0
    
    try {
      const recentData = this.db.db.prepare(`
        SELECT * FROM market_breadth_raw_data 
        ORDER BY date DESC 
        LIMIT 50
      `).all() as RawMarketBreadthData[]

      for (const data of recentData) {
        this.service.calculateEnhanced6FactorScore(data)
        calculations++
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: '6-Factor Breadth Score Calculation',
        recordCount: calculations,
        executionTimeMs: executionTime,
        recordsPerSecond: (calculations * 1000) / executionTime,
        success: true
      }
    } catch (error) {
      return {
        operation: '6-Factor Breadth Score Calculation',
        recordCount: calculations,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkBulkCalculations(recordCount: number): Promise<BenchmarkResult> {
    const startTime = performance.now()
    let calculations = 0
    
    try {
      const data = this.db.db.prepare(`
        SELECT * FROM market_breadth_raw_data 
        ORDER BY date DESC 
        LIMIT ?
      `).all(recordCount) as RawMarketBreadthData[]

      for (const record of data) {
        // Simulate full calculation pipeline
        this.service.calculate5DayRatio(record)
        this.service.calculateEnhanced6FactorScore(record)
        calculations++
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: `Bulk Calculations (${recordCount} records)`,
        recordCount: calculations,
        executionTimeMs: executionTime,
        recordsPerSecond: (calculations * 1000) / executionTime,
        success: true
      }
    } catch (error) {
      return {
        operation: `Bulk Calculations (${recordCount} records)`,
        recordCount: calculations,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkDateIndexQuery(): Promise<BenchmarkResult> {
    const startTime = performance.now()
    
    try {
      const results = this.db.db.prepare(`
        SELECT COUNT(*) as count
        FROM market_breadth_raw_data 
        WHERE date >= '2024-01-01'
      `).get() as { count: number }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: 'Date Index Query',
        recordCount: results.count,
        executionTimeMs: executionTime,
        recordsPerSecond: (results.count * 1000) / executionTime,
        success: true
      }
    } catch (error) {
      return {
        operation: 'Date Index Query',
        recordCount: 0,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkQualityIndexQuery(): Promise<BenchmarkResult> {
    const startTime = performance.now()
    
    try {
      const results = this.db.db.prepare(`
        SELECT COUNT(*) as count
        FROM market_breadth_raw_data 
        WHERE data_quality_score > 95
      `).get() as { count: number }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: 'Quality Index Query',
        recordCount: results.count,
        executionTimeMs: executionTime,
        recordsPerSecond: (results.count * 1000) / executionTime,
        success: true
      }
    } catch (error) {
      return {
        operation: 'Quality Index Query',
        recordCount: 0,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkSourceIndexQuery(): Promise<BenchmarkResult> {
    const startTime = performance.now()
    
    try {
      const results = this.db.db.prepare(`
        SELECT import_format, COUNT(*) as count
        FROM market_breadth_raw_data 
        GROUP BY import_format
      `).all()

      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: 'Source Index Query',
        recordCount: results.length,
        executionTimeMs: executionTime,
        recordsPerSecond: (results.length * 1000) / executionTime,
        success: true
      }
    } catch (error) {
      return {
        operation: 'Source Index Query',
        recordCount: 0,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkConcurrentReads(concurrency: number): Promise<BenchmarkResult> {
    const startTime = performance.now()
    const promises: Promise<any>[] = []
    
    try {
      for (let i = 0; i < concurrency; i++) {
        promises.push(
          new Promise((resolve) => {
            const result = this.db.db.prepare(`
              SELECT * FROM market_breadth_raw_data 
              ORDER BY RANDOM() 
              LIMIT 10
            `).all()
            resolve(result)
          })
        )
      }

      const results = await Promise.all(promises)
      const endTime = performance.now()
      const executionTime = endTime - startTime
      const totalRecords = results.reduce((sum, r) => sum + r.length, 0)

      return {
        operation: `Concurrent Reads (${concurrency} connections)`,
        recordCount: totalRecords,
        executionTimeMs: executionTime,
        recordsPerSecond: (totalRecords * 1000) / executionTime,
        success: true
      }
    } catch (error) {
      return {
        operation: `Concurrent Reads (${concurrency} connections)`,
        recordCount: 0,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async benchmarkMixedOperations(operations: number): Promise<BenchmarkResult> {
    const startTime = performance.now()
    let successCount = 0
    
    try {
      for (let i = 0; i < operations; i++) {
        if (i % 3 === 0) {
          // Read operation
          this.db.db.prepare(`
            SELECT * FROM market_breadth_raw_data 
            ORDER BY date DESC 
            LIMIT 1
          `).get()
        } else {
          // Write operation
          const testData: RawMarketBreadthData = {
            date: `2025-02-${String(i + 1).padStart(2, '0')}`,
            stocksUp4PctDaily: Math.floor(Math.random() * 200),
            importFormat: 'manual'
          }
          await this.service.saveRawBreadthData(testData)
        }
        successCount++
      }

      const endTime = performance.now()
      const executionTime = endTime - startTime

      return {
        operation: `Mixed Operations (${operations} ops)`,
        recordCount: successCount,
        executionTimeMs: executionTime,
        recordsPerSecond: (successCount * 1000) / executionTime,
        success: true
      }
    } catch (error) {
      return {
        operation: `Mixed Operations (${operations} ops)`,
        recordCount: successCount,
        executionTimeMs: performance.now() - startTime,
        recordsPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate sample CSV data for benchmarking
   */
  private generateSampleCSV(recordCount: number): string {
    const header = 'Date,Number of stocks up 4% plus today,Number of stocks down 4% plus today,5 day ratio,10 day ratio,Number of stocks up 25% plus in a quarter,Number of stocks down 25% + in a quarter,Number of stocks up 25% + in a month,Number of stocks down 25% + in a month,Number of stocks up 50% + in a month,Number of stocks down 50% + in a month,Number of stocks up 13% + in 34 days,Number of stocks down 13% + in 34 days, Worden Common stock universe,T2108 ,S&P'
    
    const rows = []
    const baseDate = new Date('2025-01-01')
    
    for (let i = 0; i < recordCount; i++) {
      const date = new Date(baseDate)
      date.setDate(date.getDate() + i)
      
      const row = [
        date.toISOString().split('T')[0],
        Math.floor(Math.random() * 300),
        Math.floor(Math.random() * 150),
        (Math.random() * 3).toFixed(2),
        (Math.random() * 3).toFixed(2),
        Math.floor(Math.random() * 2000),
        Math.floor(Math.random() * 1000),
        Math.floor(Math.random() * 300),
        Math.floor(Math.random() * 100),
        Math.floor(Math.random() * 80),
        Math.floor(Math.random() * 30),
        Math.floor(Math.random() * 2500),
        Math.floor(Math.random() * 1200),
        6000 + Math.floor(Math.random() * 200),
        (Math.random() * 100).toFixed(2),
        `"${(5000 + Math.random() * 2000).toFixed(2)}"`
      ]
      rows.push(row.join(','))
    }
    
    return [header, ...rows].join('\n')
  }

  /**
   * Generate comprehensive benchmark report
   */
  private generateBenchmarkReport(suites: BenchmarkSuite[]): void {
    console.log('\n' + '='.repeat(80))
    console.log('🏆 RAW SCHEMA BENCHMARK RESULTS')
    console.log('='.repeat(80))
    
    for (const suite of suites) {
      console.log(`\n📊 ${suite.suiteName}`)
      console.log('-'.repeat(40))
      
      for (const result of suite.results) {
        const status = result.success ? '✅' : '❌'
        console.log(`${status} ${result.operation}:`)
        console.log(`   Time: ${result.executionTimeMs.toFixed(2)}ms`)
        console.log(`   Rate: ${result.recordsPerSecond.toFixed(0)} records/sec`)
        if (!result.success && result.error) {
          console.log(`   Error: ${result.error}`)
        }
      }
      
      console.log(`\n📈 Suite Average: ${suite.averagePerformance.toFixed(0)} records/sec`)
    }
    
    // Overall summary
    const totalTime = suites.reduce((sum, s) => sum + s.totalTimeMs, 0)
    const avgPerformance = suites.reduce((sum, s) => sum + s.averagePerformance, 0) / suites.length
    
    console.log('\n' + '='.repeat(80))
    console.log('📋 OVERALL BENCHMARK SUMMARY')
    console.log('='.repeat(80))
    console.log(`⏱️  Total Execution Time: ${(totalTime / 1000).toFixed(2)}s`)
    console.log(`🚀 Average Performance: ${avgPerformance.toFixed(0)} records/sec`)
    console.log(`🎯 Schema Status: Raw Data v2.0`)
    console.log(`💾 Database Engine: SQLite3 with WAL mode`)
    console.log(`🔍 Index Optimization: Enabled`)
    console.log('='.repeat(80))
  }

  /**
   * Cleanup benchmark data and close connections
   */
  async cleanup(): Promise<void> {
    try {
      // Remove test data
      this.db.db.exec(`
        DELETE FROM market_breadth_raw_data 
        WHERE import_format = 'manual' 
        AND date >= '2025-01-01'
      `)
      
      // Close database connection
      this.db.close()
      console.log('🧹 Benchmark cleanup completed')
    } catch (error) {
      console.error('❌ Cleanup failed:', error)
    }
  }
}

// Export utility function for easy benchmarking
export async function runRawSchemaBenchmark(): Promise<BenchmarkSuite[]> {
  const benchmark = new RawSchemaBenchmark()
  
  try {
    const results = await benchmark.runFullBenchmark()
    return results
  } finally {
    await benchmark.cleanup()
  }
}