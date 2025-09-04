import { IpcMain } from 'electron'
import { TradingDatabase } from '../database/connection'
import { BreadthService } from '../database/services/breadth-service'
import { TradeService } from '../database/services/trade-service'
import { SettingsAdapter } from '../database/services/settings-adapter'
import { BreadthScoreCalculator } from '../services/breadth-score-calculator'
import type { BreadthData, Trade, TradeFilters, PortfolioSettings } from '../types/trading'
import type { RawMarketBreadthData } from '../types/breadth-raw-data'

export function setupTradingHandlers(ipcMain: IpcMain, database: TradingDatabase): void {
  const breadthService = new BreadthService(database.db)
  const tradeService = new TradeService(database.db)
  const settingsAdapter = new SettingsAdapter(database.db)
  const breadthCalculator = new BreadthScoreCalculator(undefined, database.db)

  // Market Breadth Handlers
  ipcMain.handle('trading:get-breadth-data', async (event, startDate?: string, endDate?: string) => {
    try {
      const end = endDate || new Date().toISOString().split('T')[0]
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      return breadthService.getBreadthHistory(start, end)
    } catch (error) {
      console.error('Error getting breadth data:', error)
      throw error
    }
  })

  // New handler for getting breadth data by specific date
  ipcMain.handle('trading:get-breadth-data-by-date', async (event, date: string) => {
    try {
      return breadthService.getBreadthByDate(date)
    } catch (error) {
      console.error('Error getting breadth data by date:', error)
      return null
    }
  })

  ipcMain.handle('trading:save-breadth-data', async (event, data: BreadthData) => {
    try {
      // Use upsert to handle existing records properly (fixes duplicate entry issue)
      return breadthService.upsertBreadthData(data)
    } catch (error) {
      console.error('Error saving breadth data:', error)
      throw error
    }
  })

  ipcMain.handle('trading:update-breadth-data', async (event, id: number, data: Partial<BreadthData>) => {
    try {
      return breadthService.updateBreadthData(id, data)
    } catch (error) {
      console.error('Error updating breadth data:', error)
      throw error
    }
  })

  ipcMain.handle('trading:delete-breadth-data', async (event, id: number) => {
    try {
      return breadthService.deleteBreadthData(id)
    } catch (error) {
      console.error('Error deleting breadth data:', error)
      throw error
    }
  })

  // Trade Journaling Handlers
  ipcMain.handle('trading:save-trade', async (event, trade: Trade) => {
    try {
      return tradeService.saveCompleteTradeEntry(trade)
    } catch (error) {
      console.error('Error saving trade:', error)
      throw error
    }
  })

  ipcMain.handle('trading:get-trades', async (event, filters?: TradeFilters) => {
    try {
      return tradeService.getTrades(filters)
    } catch (error) {
      console.error('Error getting trades:', error)
      throw error
    }
  })

  ipcMain.handle('trading:update-trade', async (event, id: number, trade: Partial<Trade>) => {
    try {
      return tradeService.updateTrade(id, trade)
    } catch (error) {
      console.error('Error updating trade:', error)
      throw error
    }
  })

  ipcMain.handle('trading:delete-trade', async (event, id: number) => {
    try {
      return tradeService.deleteTrade(id)
    } catch (error) {
      console.error('Error deleting trade:', error)
      throw error
    }
  })

  // Account Management Handlers
  ipcMain.handle('trading:get-account-balance', async () => {
    try {
      return tradeService.getCurrentAccountBalance()
    } catch (error) {
      console.error('Error getting account balance:', error)
      throw error
    }
  })

  ipcMain.handle('trading:get-performance-stats', async (event, startDate?: string, endDate?: string) => {
    try {
      return tradeService.getPerformanceStats(startDate, endDate)
    } catch (error) {
      console.error('Error getting performance stats:', error)
      throw error
    }
  })

  // CSV Import/Export Handlers
  ipcMain.handle('trading:import-csv-breadth', async (event, csvData: string) => {
    try {
      return breadthService.importFromCSV(csvData)
    } catch (error) {
      console.error('Error importing CSV breadth data:', error)
      throw error
    }
  })

  ipcMain.handle('trading:export-csv-breadth', async (event, startDate?: string, endDate?: string) => {
    try {
      return breadthService.exportToCSV(startDate, endDate)
    } catch (error) {
      console.error('Error exporting CSV breadth data:', error)
      throw error
    }
  })

  // Portfolio Settings Handlers
  ipcMain.handle('settings:get-portfolio-settings', async () => {
    try {
      return settingsAdapter.getPortfolioSettingsWithDefaults()
    } catch (error) {
      console.error('Error getting portfolio settings:', error)
      throw error
    }
  })

  ipcMain.handle('settings:save-portfolio-settings', async (event, settings: Omit<PortfolioSettings, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Validate settings before saving
      const validation = settingsAdapter.validateSettings(settings)
      if (!validation.isValid) {
        throw new Error(`Settings validation failed: ${validation.errors.join(', ')}`)
      }

      return settingsAdapter.savePortfolioSettings(settings)
    } catch (error) {
      console.error('Error saving portfolio settings:', error)
      throw error
    }
  })

  ipcMain.handle('settings:reset-portfolio-settings', async () => {
    try {
      return settingsAdapter.resetToDefaults()
    } catch (error) {
      console.error('Error resetting portfolio settings:', error)
      throw error
    }
  })

  // Database Management Handlers
  ipcMain.handle('trading:backup-database', async () => {
    try {
      return database.createBackup()
    } catch (error) {
      console.error('Error creating database backup:', error)
      throw error
    }
  })

  ipcMain.handle('trading:get-database-info', async () => {
    try {
      return database.getDatabaseInfo()
    } catch (error) {
      console.error('Error getting database info:', error)
      throw error
    }
  })

  // Breadth Calculator Handlers
  ipcMain.handle('breadth-calculator:list-configs', async () => {
    try {
      // Return default breadth calculator configurations
      return {
        success: true,
        configs: [
          {
            id: 'default',
            name: 'Default Market Breadth',
            description: '6-Factor Market Breadth Calculator',
            factors: ['stocks_up_4pct', 'stocks_down_4pct', 't2108', 'sp500', 'ratio_5day', 'ratio_10day']
          }
        ]
      }
    } catch (error) {
      console.error('Error listing breadth calculator configs:', error)
      throw error
    }
  })

  ipcMain.handle('breadth-calculator:health-check', async () => {
    try {
      // Return health status
      return {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: database.db && database.db.open ? 'connected' : 'disconnected'
      }
    } catch (error) {
      console.error('Error checking breadth calculator health:', error)
      throw error
    }
  })

  // Critical handler for breadth calculation
  ipcMain.handle('breadth-calculator:calculate-single', async (event, options) => {
    try {
      console.log('Received breadth calculation request:', JSON.stringify(options, null, 2))
      
      const { data, algorithm, saveToDatabase, includeHistorical } = options
      
      // Properly map form data to RawMarketBreadthData interface
      // Fix field name mismatches that cause validation failures
      const sanitizedData: RawMarketBreadthData = {
        // Basic fields
        date: data.date,
        timestamp: data.timestamp || new Date().toISOString(),
        
        // Primary indicators - use correct field names for algorithm validation
        stocksUp4PctDaily: data.advancingIssues || data.stocksUp4PctDaily || Number(data.stocks_up_4pct) || 0,
        stocksDown4PctDaily: data.decliningIssues || data.stocksDown4PctDaily || Number(data.stocks_down_4pct) || 0,
        
        // Legacy compatibility - ensure both field sets are populated
        advancingIssues: data.advancingIssues || data.stocksUp4PctDaily || Number(data.stocks_up_4pct) || 0,
        decliningIssues: data.decliningIssues || data.stocksDown4PctDaily || Number(data.stocks_down_4pct) || 0,
        
        // Secondary indicators with proper mapping
        stocksUp25PctQuarterly: data.stocksUp25PctQuarterly || Number(data.stocks_up_25pct_quarter) || 0,
        stocksDown25PctQuarterly: data.stocksDown25PctQuarterly || Number(data.stocks_down_25pct_quarter) || 0,
        stocksUp25PctMonthly: data.stocksUp25PctMonthly || Number(data.stocks_up_25pct_month) || 0,
        stocksDown25PctMonthly: data.stocksDown25PctMonthly || Number(data.stocks_down_25pct_month) || 0,
        stocksUp50PctMonthly: data.stocksUp50PctMonthly || Number(data.stocks_up_50pct_month) || 0,
        stocksDown50PctMonthly: data.stocksDown50PctMonthly || Number(data.stocks_down_50pct_month) || 0,
        stocksUp13Pct34Days: data.stocksUp13Pct34Days || Number(data.stocks_up_13pct_34days) || 0,
        stocksDown13Pct34Days: data.stocksDown13Pct34Days || Number(data.stocks_down_13pct_34days) || 0,
        
        // Reference data
        t2108: data.t2108 || 50, // Default T2108
        sp500Level: data.sp500Level || data.sp500 || data.sp_reference,
        wordenUniverse: data.wordenUniverse || data.worden_universe || 7000,
        
        // Additional indicators (using correct field names from interface)
        stocks_up_20pct: data.stocksUp20Pct || Number(data.stocks_up_20pct) || 0,
        stocks_down_20pct: data.stocksDown20Pct || Number(data.stocks_down_20pct) || 0,
        stocks_up_20dollar: data.stocksUp20Dollar || Number(data.stocks_up_20dollar) || 0,
        stocks_down_20dollar: data.stocksDown20Dollar || Number(data.stocks_down_20dollar) || 0,
        
        // Ratios
        ratio_5day: data.ratio5Day || Number(data.ratio_5day) || 0,
        ratio_10day: data.ratio10Day || Number(data.ratio_10day) || 0,
        
        // Legacy volume/highs-lows fields for compatibility
        newHighs: data.newHighs || 0,
        newLows: data.newLows || 0,
        upVolume: data.upVolume || 0,
        downVolume: data.downVolume || 0,
        
        // Data quality
        dataQualityScore: data.dataQualityScore || 100
      }
      
      console.log('Sanitized data with proper field mapping:', JSON.stringify(sanitizedData, null, 2))
      
      // Validate input data
      const validation = breadthCalculator.validateData(sanitizedData)
      console.log('Validation result:', JSON.stringify(validation, null, 2))
      
      if (!validation.isValid) {
        console.error('Data validation failed:', validation.errors)
        return {
          success: false,
          error: `Data validation failed: ${validation.errors.join(', ')}`,
          validation: validation
        }
      }
      
      // Perform calculation
      console.log('Starting calculation with algorithm:', algorithm || 'default')
      const result = breadthCalculator.calculate(sanitizedData)
      
      if (!result) {
        throw new Error('Calculation returned null result')
      }
      
      console.log('Calculation result:', JSON.stringify(result, null, 2))
      
      // Save to database if requested
      if (saveToDatabase && result) {
        try {
          // Convert BreadthResult to BreadthData format for database
          const breadthData: BreadthData = {
            date: result.date,
            timestamp: result.date + 'T00:00:00.000Z',
            sp500: data.sp500Level?.toString() || '',
            dataSource: 'manual',
            advancingIssues: data.advancingIssues || data.stocksUp4PctDaily || 0,
            decliningIssues: data.decliningIssues || data.stocksDown4PctDaily || 0,
            newHighs: data.newHighs || 0,
            newLows: data.newLows || 0,
            upVolume: data.upVolume || 0,
            downVolume: data.downVolume || 0,
            t2108: data.t2108 || 50,
            vix: data.vix || data.vixLevel || null,
            stocks_up_4pct: data.stocksUp4PctDaily || 0,
            stocks_down_4pct: data.stocksDown4PctDaily || 0,
            stocks_up_25pct_quarter: data.stocksUp25PctQuarterly || 0,
            stocks_down_25pct_quarter: data.stocksDown25PctQuarterly || 0,
            stocks_up_25pct_month: data.stocksUp25PctMonthly || 0,
            stocks_down_25pct_month: data.stocksDown25PctMonthly || 0,
            stocks_up_50pct_month: data.stocksUp50PctMonthly || 0,
            stocks_down_50pct_month: data.stocksDown50PctMonthly || 0,
            stocks_up_13pct_34days: data.stocksUp13Pct34Days || 0,
            stocks_down_13pct_34days: data.stocksDown13Pct34Days || 0,
            stocks_up_20pct: data.stocksUp20Pct || 0,
            stocks_down_20pct: data.stocksDown20Pct || 0,
            stocks_up_20dollar: data.stocksUp20Dollar || 0,
            stocks_down_20dollar: data.stocksDown20Dollar || 0,
            ratio_5day: data.ratio5Day || 0,
            ratio_10day: data.ratio10Day || 0,
            worden_universe: data.wordenUniverse || 7000,
            breadthScore: result.score,
            trendStrength: result.confidence * 100,
            marketPhase: result.market_condition.phase,
            notes: `Algorithm: ${result.metadata.algorithm_used}, Quality: ${result.metadata.data_quality}%`
          }
          
          await breadthService.upsertBreadthData(breadthData)
          console.log('Breadth data saved successfully to database')
        } catch (saveError) {
          console.error('Failed to save to database:', saveError)
          // Don't fail the calculation if save fails
        }
      }
      
      console.log('Breadth calculation successful:', result.score)
      return result
      
    } catch (error) {
      console.error('Error in breadth calculation:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available')
      console.error('Original request data:', JSON.stringify(options, null, 2))
      
      // Provide detailed error information for debugging
      let errorMessage = 'Calculation failed'
      let errorDetails = {}
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Check for specific error types
        if (error.message.includes('Data validation failed')) {
          errorDetails = {
            type: 'validation_error',
            originalData: options.data,
            availableFields: Object.keys(options.data || {}),
            requiredFields: ['date', 'advancingIssues', 'decliningIssues', 'stocksUp4PctDaily', 'stocksDown4PctDaily']
          }
        } else if (error.message.includes('Algorithm') && error.message.includes('not found')) {
          errorDetails = {
            type: 'algorithm_error',
            requestedAlgorithm: options.algorithm,
            availableAlgorithms: ['six_factor', 'normalized', 'sector_weighted', 'custom']
          }
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      }
    }
  })

  // Data validation handler
  ipcMain.handle('breadth-calculator:validate-data', async (event, data: RawMarketBreadthData) => {
    try {
      const validation = breadthCalculator.validateData(data)
      return {
        success: true,
        validation
      }
    } catch (error) {
      console.error('Error validating data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      }
    }
  })

  console.log('Trading IPC handlers setup complete')
}

export function setupFallbackHandlers(ipcMain: IpcMain): void {
  console.log('Setting up fallback IPC handlers (database unavailable)')
  
  // Database info fallback - this is the critical one causing the error
  ipcMain.handle('trading:get-database-info', async () => {
    return {
      status: 'unavailable',
      message: 'Database not initialized',
      path: null,
      size: null,
      version: null,
      tables: [],
      error: 'Database initialization failed during startup'
    }
  })
  
  // Market Breadth fallbacks
  ipcMain.handle('trading:get-breadth-data', async () => {
    console.warn('Database unavailable - returning empty breadth data')
    return []
  })
  
  ipcMain.handle('trading:save-breadth-data', async () => {
    throw new Error('Database unavailable - cannot save breadth data')
  })
  
  // Trade data fallbacks
  ipcMain.handle('trading:get-trades', async () => {
    console.warn('Database unavailable - returning empty trade data')
    return []
  })
  
  ipcMain.handle('trading:save-trade', async () => {
    throw new Error('Database unavailable - cannot save trade')
  })
  
  // Account data fallbacks
  ipcMain.handle('trading:get-account-balance', async () => {
    return {
      cash: 0,
      equity: 0,
      buyingPower: 0,
      dayTradingBuyingPower: 0,
      maintenanceMargin: 0,
      unrealizedPnL: 0,
      realizedPnL: 0
    }
  })
  
  ipcMain.handle('trading:get-performance-stats', async () => {
    return {
      totalTrades: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      totalReturn: 0,
      maxDrawdown: 0
    }
  })
  
  // CSV operations fallbacks - Still allow CSV processing with memory storage
  ipcMain.handle('trading:import-csv-breadth', async (event, csvData: string) => {
    try {
      console.log('CSV Import: Using fallback mode (no database persistence)')
      
      // Parse CSV data without database storage for validation
      const lines = csvData.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header and one data row')
      }
      
      const headers = lines[0].split(',').map(h => h.trim())
      const dataLines = lines.slice(1)
      
      let importedCount = 0
      let skippedCount = 0 
      let errorCount = 0
      const errors: string[] = []
      
      // Auto-detect format
      const isStockbeeFormat = headers.some(h => 
        h.toLowerCase().includes('stocks up 4%') || 
        h.toLowerCase().includes('t2108') ||
        h.toLowerCase().includes('primary breadth')
      )
      
      for (let i = 0; i < Math.min(dataLines.length, 5); i++) { // Validate first 5 rows only
        try {
          const line = dataLines[i]
          const values = line.split(',').map(v => v.trim())
          
          if (values.length < 2) {
            continue // Skip empty lines
          }
          
          // Basic validation without database storage
          if (isStockbeeFormat && values.length < 3) {
            errors.push(`Row ${i + 2}: Insufficient columns for Stockbee format`)
            errorCount++
            continue
          }
          
          // Validate date field exists
          if (!values[0] || values[0] === '' || values[0] === 'Date') {
            continue // Skip header rows or invalid dates  
          }
          
          importedCount++
          
        } catch (error) {
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          errorCount++
        }
      }
      
      // Return success with warning about no persistence
      return {
        success: true,
        imported: 0, // No actual import without database
        importedCount: 0,
        skipped: 0,
        skippedCount: 0,
        errors: errorCount,
        errorCount: errorCount,
        errorDetails: [
          'Warning: Database unavailable - CSV validation successful but data not persisted',
          'Please restart the application to retry database connection',
          ...errors
        ],
        columnMapping: headers,
        message: `CSV validation successful (${importedCount} valid rows found) but data not saved - database unavailable`
      }
    } catch (error) {
      return {
        success: false,
        imported: 0,
        importedCount: 0,
        skipped: 0,
        skippedCount: 0,
        errors: 1,
        errorCount: 1,
        errorDetails: [`CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        message: 'CSV import failed - see error details'
      }
    }
  })
  
  ipcMain.handle('trading:export-csv-breadth', async () => {
    throw new Error('Database unavailable - cannot export CSV data')
  })
  
  // Database operations fallbacks  
  ipcMain.handle('trading:backup-database', async () => {
    throw new Error('Database unavailable - cannot create backup')
  })
  
  // Portfolio Settings fallbacks
  ipcMain.handle('settings:get-portfolio-settings', async () => {
    console.warn('Database unavailable - returning default portfolio settings')
    // Return safe defaults when database is unavailable
    const now = new Date().toISOString()
    return {
      portfolioSize: 100000,
      baseSizePercentage: 10,
      maxHeatPercentage: 80,
      maxPositions: 8,
      tradingSetups: [
        {
          id: 'bidback-classic',
          name: 'Bidback Classic',
          description: 'Traditional Bidback setup based on market breadth signals',
          isActive: true
        }
      ],
      riskPerTrade: 2,
      useKellySizing: false,
      enablePositionScaling: true,
      lastUpdated: now
    }
  })
  
  ipcMain.handle('settings:save-portfolio-settings', async () => {
    throw new Error('Database unavailable - cannot save portfolio settings')
  })
  
  ipcMain.handle('settings:reset-portfolio-settings', async () => {
    throw new Error('Database unavailable - cannot reset portfolio settings')
  })
  
  // Breadth Calculator fallbacks
  ipcMain.handle('breadth-calculator:health-check', async () => {
    return {
      success: false,
      status: 'unhealthy',
      message: 'Database not available',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    }
  })
  
  ipcMain.handle('breadth-calculator:list-configs', async () => {
    return {
      success: false,
      error: 'Database unavailable - cannot list configurations',
      configs: []
    }
  })
  
  ipcMain.handle('breadth-calculator:calculate-single', async () => {
    return {
      success: false,
      error: 'Database unavailable - cannot perform calculations'
    }
  })
  
  ipcMain.handle('breadth-calculator:validate-data', async () => {
    return {
      success: false,
      error: 'Database unavailable - cannot validate data'
    }
  })
  
  console.log('Fallback IPC handlers setup complete - app will start but with limited functionality')
}