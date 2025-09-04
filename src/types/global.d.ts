import type { BreadthData, Trade, TradeFilters, PortfolioSettings } from './trading'

declare global {
  interface Window {
    tradingAPI: {
      // Market Breadth API
      getBreadthData: (startDate?: string, endDate?: string) => Promise<BreadthData[]>
      saveBreadthData: (data: BreadthData) => Promise<number>
      updateBreadthData: (id: number, data: Partial<BreadthData>) => Promise<boolean>
      deleteBreadthData: (id: number) => Promise<boolean>

      // Trade Journaling API
      saveTrade: (trade: Trade) => Promise<number>
      getTrades: (filters?: TradeFilters) => Promise<Trade[]>
      updateTrade: (id: number, trade: Partial<Trade>) => Promise<boolean>
      deleteTrade: (id: number) => Promise<boolean>

      // Account Management API
      getAccountBalance: () => Promise<number>
      getPerformanceStats: (startDate?: string, endDate?: string) => Promise<any>

      // Portfolio Settings API
      getPortfolioSettings: () => Promise<PortfolioSettings>
      savePortfolioSettings: (settings: Omit<PortfolioSettings, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>
      resetPortfolioSettings: () => Promise<boolean>

      // CSV Import/Export API
      importCSVBreadth: (csvData: string) => Promise<boolean>
      exportCSVBreadth: (startDate?: string, endDate?: string) => Promise<string>

      // Database Management API
      backupDatabase: () => Promise<string>
      getDatabaseInfo: () => Promise<any>

      // Generic invoke method
      invoke: (channel: string, ...args: any[]) => Promise<any>

      // IB Integration API (future implementation)
      connectIB: () => Promise<boolean>
      placeOrder: (order: any) => Promise<any>
      getPositions: () => Promise<any[]>

      // Event listeners
      onBreadthUpdate: (callback: (data: BreadthData) => void) => () => void
      onTradeUpdate: (callback: (trade: Trade) => void) => () => void
      onWindowFocus: (callback: () => void) => () => void
    }

    versions: {
      node: string
      chrome: string
      electron: string
      app: string
    }

    platform: {
      os: string
      arch: string
    }
  }
}

export {}