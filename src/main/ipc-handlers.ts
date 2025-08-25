import { IpcMain } from 'electron'
import { TradingDatabase } from '../database/connection'
import { BreadthService } from '../database/services/breadth-service'
import { TradeService } from '../database/services/trade-service'
import { IntegratedBreadthCalculator } from '../services/integrated-breadth-calculator'
import { BreadthCalculatorAPI } from '../services/breadth-calculator-api'
import type { BreadthData, Trade, TradeFilters } from '../types/trading'
import type { 
  CalculationRequest, 
  BulkCalculationRequest, 
  ConfigurationRequest 
} from '../services/breadth-calculator-api'

export function setupTradingHandlers(ipcMain: IpcMain, database: TradingDatabase): void {
  const breadthService = new BreadthService(database.db)
  const tradeService = new TradeService(database.db)
  
  // Initialize new breadth calculator system
  const integratedCalculator = new IntegratedBreadthCalculator(database.db)
  const calculatorAPI = new BreadthCalculatorAPI(integratedCalculator)

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

  ipcMain.handle('trading:save-breadth-data', async (event, data: BreadthData) => {
    try {
      return breadthService.saveBreadthData(data)
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

  // Enhanced Breadth Calculator Handlers
  ipcMain.handle('breadth-calculator:calculate-single', async (event, request: CalculationRequest) => {
    try {
      return await calculatorAPI.calculateSingle(request)
    } catch (error) {
      console.error('Error in single calculation:', error)
      throw error
    }
  })

  ipcMain.handle('breadth-calculator:calculate-bulk', async (event, request: BulkCalculationRequest) => {
    try {
      return await calculatorAPI.calculateBulk(request)
    } catch (error) {
      console.error('Error in bulk calculation:', error)
      throw error
    }
  })

  ipcMain.handle('breadth-calculator:calculate-realtime', async (event, algorithm?: string) => {
    try {
      return await calculatorAPI.calculateRealTime(algorithm as any)
    } catch (error) {
      console.error('Error in real-time calculation:', error)
      throw error
    }
  })

  ipcMain.handle('breadth-calculator:calculate-from-database', async (event, startDate?: string, endDate?: string, algorithm?: string) => {
    try {
      return await calculatorAPI.calculateFromDatabase(startDate, endDate, algorithm as any)
    } catch (error) {
      console.error('Error calculating from database:', error)
      throw error
    }
  })

  // Algorithm Management Handlers
  ipcMain.handle('breadth-calculator:get-algorithms', async () => {
    try {
      return await calculatorAPI.getAvailableAlgorithms()
    } catch (error) {
      console.error('Error getting available algorithms:', error)
      throw error
    }
  })

  ipcMain.handle('breadth-calculator:switch-algorithm', async (event, algorithm: string, customConfig?: any) => {
    try {
      return await calculatorAPI.switchAlgorithm(algorithm as any, customConfig)
    } catch (error) {
      console.error('Error switching algorithm:', error)
      throw error
    }
  })

  ipcMain.handle('breadth-calculator:get-current-config', async () => {
    try {
      return await calculatorAPI.getCurrentConfig()
    } catch (error) {
      console.error('Error getting current config:', error)
      throw error
    }
  })

  // Configuration Management Handlers
  ipcMain.handle('breadth-calculator:create-config', async (event, request: ConfigurationRequest) => {
    try {
      return await calculatorAPI.createConfiguration(request)
    } catch (error) {
      console.error('Error creating configuration:', error)
      throw error
    }
  })

  ipcMain.handle('breadth-calculator:get-config', async (event, version: string) => {
    try {
      return await calculatorAPI.getConfiguration(version)
    } catch (error) {
      console.error('Error getting configuration:', error)
      throw error
    }
  })

  ipcMain.handle('breadth-calculator:list-configs', async (event, activeOnly: boolean = true) => {
    try {
      return await calculatorAPI.listConfigurations(activeOnly)
    } catch (error) {
      console.error('Error listing configurations:', error)
      throw error
    }
  })

  ipcMain.handle('breadth-calculator:update-config', async (event, version: string, updates: any) => {
    try {
      return await calculatorAPI.updateConfiguration(version, updates)
    } catch (error) {
      console.error('Error updating configuration:', error)
      throw error
    }
  })

  ipcMain.handle('breadth-calculator:set-default-config', async (event, version: string) => {
    try {
      return await calculatorAPI.setDefaultConfiguration(version)
    } catch (error) {
      console.error('Error setting default configuration:', error)
      throw error
    }
  })

  // Performance and Monitoring Handlers
  ipcMain.handle('breadth-calculator:get-performance-metrics', async () => {
    try {
      return await calculatorAPI.getPerformanceMetrics()
    } catch (error) {
      console.error('Error getting performance metrics:', error)
      throw error
    }
  })

  ipcMain.handle('breadth-calculator:clear-performance-metrics', async () => {
    try {
      return await calculatorAPI.clearPerformanceMetrics()
    } catch (error) {
      console.error('Error clearing performance metrics:', error)
      throw error
    }
  })

  // Data Validation Handlers
  ipcMain.handle('breadth-calculator:validate-data', async (event, data: any) => {
    try {
      return await calculatorAPI.validateData(data)
    } catch (error) {
      console.error('Error validating data:', error)
      throw error
    }
  })

  // Import/Export Handlers
  ipcMain.handle('breadth-calculator:export-configs', async (event, versions?: string[]) => {
    try {
      return await calculatorAPI.exportConfigurations(versions)
    } catch (error) {
      console.error('Error exporting configurations:', error)
      throw error
    }
  })

  ipcMain.handle('breadth-calculator:import-configs', async (event, configsJson: string) => {
    try {
      return await calculatorAPI.importConfigurations(configsJson)
    } catch (error) {
      console.error('Error importing configurations:', error)
      throw error
    }
  })

  // Health Check Handler
  ipcMain.handle('breadth-calculator:health-check', async () => {
    try {
      return await calculatorAPI.healthCheck()
    } catch (error) {
      console.error('Error in health check:', error)
      throw error
    }
  })

  console.log('Trading IPC handlers setup complete')
  console.log('Enhanced Breadth Calculator IPC handlers setup complete')
}