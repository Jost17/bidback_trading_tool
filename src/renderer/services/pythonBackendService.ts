import axios, { AxiosInstance, AxiosResponse } from 'axios'

// Base API Configuration
const API_BASE_URL = 'http://localhost:3001'
const API_TIMEOUT = 30000 // 30 seconds

// TypeScript Interfaces for Backend Data Models
export interface MarketRegime {
  regime: 'BULL_CONFIRMED' | 'BULL_UNCONFIRMED' | 'BEAR_CONFIRMED' | 'BEAR_UNCONFIRMED'
  confidence: number
  last_updated: string
  signals: RegimeSignal[]
}

export interface RegimeSignal {
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  indicator: string
  value: number
  threshold: number
  triggered_at: string
}

export interface TrueRangeData {
  date: string
  high: number
  low: number
  close: number
  true_range: number
  atr_14: number
  atr_21: number
}

export interface RiskParameters {
  position_size: number
  stop_loss: number
  profit_target: number
  risk_percentage: number
  atr_multiplier: number
  max_position_size: number
}

export interface Position {
  id: string
  symbol: string
  quantity: number
  entry_price: number
  current_price: number
  unrealized_pnl: number
  stop_loss: number
  profit_target: number
  entry_date: string
  regime_at_entry: string
}

export interface BreadthData {
  date: string
  advances: number
  declines: number
  unchanged: number
  new_highs: number
  new_lows: number
  up_volume: number
  down_volume: number
  total_volume: number
  advancing_volume: number
  declining_volume: number
  breadth_ratio: number
  volume_ratio: number
  net_advances: number
  regime: string
}

export interface PerformanceMetrics {
  total_return: number
  win_rate: number
  profit_factor: number
  sharpe_ratio: number
  max_drawdown: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  average_win: number
  average_loss: number
  current_streak: number
}

export interface TradingSignal {
  signal_type: 'BUY' | 'SELL' | 'HOLD'
  symbol?: string
  strength: number
  confidence: number
  reason: string
  generated_at: string
  valid_until: string
  stop_loss_suggested: number
  profit_target_suggested: number
}

export interface BacktestResult {
  strategy_name: string
  period: string
  total_return: number
  win_rate: number
  max_drawdown: number
  sharpe_ratio: number
  total_trades: number
  regime_performance: Record<string, number>
}

export interface ApiError {
  message: string
  status_code: number
  details?: any
}

// API Service Class
class PythonBackendService {
  private api: AxiosInstance
  private isConnected: boolean = false
  private lastHealthCheck: Date | null = null

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor for logging
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('API Request Error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNREFUSED') {
          this.isConnected = false
          console.error('Python backend is not running on port 3001')
        }
        return Promise.reject(this.handleApiError(error))
      }
    )
  }

  private handleApiError(error: any): ApiError {
    if (error.response) {
      return {
        message: error.response.data?.message || 'API Error',
        status_code: error.response.status,
        details: error.response.data,
      }
    } else if (error.code === 'ECONNREFUSED') {
      return {
        message: 'Cannot connect to Python backend. Please ensure it\'s running on port 3001.',
        status_code: 503,
        details: { code: 'CONNECTION_REFUSED' },
      }
    } else {
      return {
        message: error.message || 'Unknown error',
        status_code: 500,
        details: error,
      }
    }
  }

  // Health Check
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const response: AxiosResponse = await this.api.get('/health')
      this.isConnected = true
      this.lastHealthCheck = new Date()
      return response.data
    } catch (error) {
      this.isConnected = false
      throw error
    }
  }

  // Market Regime APIs
  async getCurrentRegime(): Promise<MarketRegime> {
    const response: AxiosResponse<MarketRegime> = await this.api.get('/regime/current')
    return response.data
  }

  async getRegimeHistory(days: number = 30): Promise<MarketRegime[]> {
    const response: AxiosResponse<MarketRegime[]> = await this.api.get(`/regime/history?days=${days}`)
    return response.data
  }

  // Position Management APIs
  async getPositions(): Promise<Position[]> {
    const response: AxiosResponse<Position[]> = await this.api.get('/positions')
    return response.data
  }

  async openPosition(symbol: string, quantity: number, entry_price: number): Promise<Position> {
    const response: AxiosResponse<Position> = await this.api.post('/positions/open', {
      symbol,
      quantity,
      entry_price,
    })
    return response.data
  }

  async closePosition(positionId: string): Promise<{ success: boolean; message: string }> {
    const response: AxiosResponse = await this.api.post(`/positions/${positionId}/close`)
    return response.data
  }

  async updateStopLoss(positionId: string, stopLoss: number): Promise<Position> {
    const response: AxiosResponse<Position> = await this.api.patch(`/positions/${positionId}/stop-loss`, {
      stop_loss: stopLoss,
    })
    return response.data
  }

  // Risk Management APIs
  async calculateRisk(
    symbol: string,
    entry_price: number,
    account_balance: number,
    risk_percentage: number = 1
  ): Promise<RiskParameters> {
    const response: AxiosResponse<RiskParameters> = await this.api.post('/risk/calculate', {
      symbol,
      entry_price,
      account_balance,
      risk_percentage,
    })
    return response.data
  }

  async getTrueRangeData(symbol: string, days: number = 252): Promise<TrueRangeData[]> {
    const response: AxiosResponse<TrueRangeData[]> = await this.api.get(
      `/true-range/${symbol}?days=${days}`
    )
    return response.data
  }

  // Performance APIs
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const response: AxiosResponse<PerformanceMetrics> = await this.api.get('/performance')
    return response.data
  }

  async getPerformanceByRegime(): Promise<Record<string, PerformanceMetrics>> {
    const response: AxiosResponse<Record<string, PerformanceMetrics>> = await this.api.get('/performance/by-regime')
    return response.data
  }

  // Market Breadth APIs
  async getLatestBreadthData(): Promise<BreadthData> {
    const response: AxiosResponse<BreadthData> = await this.api.get('/breadth/latest')
    return response.data
  }

  async getHistoricalBreadthData(startDate: string, endDate: string): Promise<BreadthData[]> {
    const response: AxiosResponse<BreadthData[]> = await this.api.get(
      `/breadth/historical?start_date=${startDate}&end_date=${endDate}`
    )
    return response.data
  }

  async updateBreadthData(data: Partial<BreadthData>): Promise<BreadthData> {
    const response: AxiosResponse<BreadthData> = await this.api.post('/breadth/update', data)
    return response.data
  }

  // Trading Signals APIs
  async generateSignals(): Promise<TradingSignal[]> {
    const response: AxiosResponse<TradingSignal[]> = await this.api.post('/signals/generate')
    return response.data
  }

  async getActiveSignals(): Promise<TradingSignal[]> {
    const response: AxiosResponse<TradingSignal[]> = await this.api.get('/signals/active')
    return response.data
  }

  // Backtesting APIs
  async runBacktest(
    strategy: string,
    startDate: string,
    endDate: string,
    parameters: Record<string, any> = {}
  ): Promise<BacktestResult> {
    const response: AxiosResponse<BacktestResult> = await this.api.post('/backtest/run', {
      strategy,
      start_date: startDate,
      end_date: endDate,
      parameters,
    })
    return response.data
  }

  async getBacktestHistory(): Promise<BacktestResult[]> {
    const response: AxiosResponse<BacktestResult[]> = await this.api.get('/backtest/history')
    return response.data
  }

  // Utility Methods
  public getConnectionStatus(): { connected: boolean; lastCheck: Date | null } {
    return {
      connected: this.isConnected,
      lastCheck: this.lastHealthCheck,
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.checkHealth()
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  // Data Import/Export
  async importHistoricalData(file: File): Promise<{ success: boolean; records_imported: number }> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response: AxiosResponse = await this.api.post('/data/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async exportData(startDate: string, endDate: string, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response: AxiosResponse = await this.api.get(`/data/export`, {
      params: { start_date: startDate, end_date: endDate, format },
      responseType: 'blob',
    })
    return response.data
  }
}

// Create singleton instance
export const pythonBackendService = new PythonBackendService()

// Export types and service
export default pythonBackendService