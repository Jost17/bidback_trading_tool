import { IpcMain } from 'electron'
import { TradingDatabase } from '../database/connection'
import { BreadthService } from '../database/services/breadth-service'
import { TradeService } from '../database/services/trade-service'
import type { BreadthData, Trade, TradeFilters } from '../types/trading'

export function setupTradingHandlers(ipcMain: IpcMain, database: TradingDatabase): void {
  const breadthService = new BreadthService(database.db)
  const tradeService = new TradeService(database.db)

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

  console.log('Trading IPC handlers setup complete')
}