import { useEffect, useCallback } from 'react'
import { useTrading } from '../context/TradingContext'
import pythonBackendService, {
  MarketRegime,
  Position,
  PerformanceMetrics,
  TradingSignal,
  BreadthData,
  RiskParameters,
  TrueRangeData,
} from '../services/pythonBackendService'

// Main hook for Python backend integration
export const usePythonBackend = () => {
  const { state, dispatch } = useTrading()

  // Health Check and Connection
  const checkConnection = useCallback(async () => {
    try {
      const health = await pythonBackendService.checkHealth()
      dispatch({
        type: 'SET_CONNECTION_STATUS',
        payload: { connected: true },
      })
      dispatch({
        type: 'SET_LAST_HEALTH_CHECK',
        payload: new Date(),
      })
      return health
    } catch (error: any) {
      dispatch({
        type: 'SET_CONNECTION_STATUS',
        payload: {
          connected: false,
          error: error.message,
        },
      })
      throw error
    }
  }, [dispatch])

  // Market Regime Methods
  const fetchCurrentRegime = useCallback(async () => {
    dispatch({ type: 'SET_REGIME_LOADING', payload: true })
    try {
      const regime = await pythonBackendService.getCurrentRegime()
      dispatch({ type: 'SET_CURRENT_REGIME', payload: regime })
      return regime
    } catch (error) {
      dispatch({ type: 'SET_REGIME_LOADING', payload: false })
      throw error
    }
  }, [dispatch])

  const fetchRegimeHistory = useCallback(async (days: number = 30) => {
    try {
      const history = await pythonBackendService.getRegimeHistory(days)
      dispatch({ type: 'SET_REGIME_HISTORY', payload: history })
      return history
    } catch (error) {
      throw error
    }
  }, [dispatch])

  // Position Management Methods
  const fetchPositions = useCallback(async () => {
    dispatch({ type: 'SET_POSITIONS_LOADING', payload: true })
    try {
      const positions = await pythonBackendService.getPositions()
      dispatch({ type: 'SET_POSITIONS', payload: positions })
      return positions
    } catch (error) {
      dispatch({ type: 'SET_POSITIONS_LOADING', payload: false })
      throw error
    }
  }, [dispatch])

  const openPosition = useCallback(async (
    symbol: string,
    quantity: number,
    entryPrice: number
  ) => {
    try {
      const position = await pythonBackendService.openPosition(symbol, quantity, entryPrice)
      dispatch({ type: 'ADD_POSITION', payload: position })
      return position
    } catch (error) {
      throw error
    }
  }, [dispatch])

  const closePosition = useCallback(async (positionId: string) => {
    try {
      const result = await pythonBackendService.closePosition(positionId)
      dispatch({ type: 'REMOVE_POSITION', payload: positionId })
      return result
    } catch (error) {
      throw error
    }
  }, [dispatch])

  const updateStopLoss = useCallback(async (positionId: string, stopLoss: number) => {
    try {
      const updatedPosition = await pythonBackendService.updateStopLoss(positionId, stopLoss)
      dispatch({ type: 'UPDATE_POSITION', payload: updatedPosition })
      return updatedPosition
    } catch (error) {
      throw error
    }
  }, [dispatch])

  // Performance Methods
  const fetchPerformance = useCallback(async () => {
    dispatch({ type: 'SET_PERFORMANCE_LOADING', payload: true })
    try {
      const [performance, performanceByRegime] = await Promise.all([
        pythonBackendService.getPerformanceMetrics(),
        pythonBackendService.getPerformanceByRegime(),
      ])
      
      dispatch({ type: 'SET_PERFORMANCE', payload: performance })
      dispatch({ type: 'SET_PERFORMANCE_BY_REGIME', payload: performanceByRegime })
      return { performance, performanceByRegime }
    } catch (error) {
      dispatch({ type: 'SET_PERFORMANCE_LOADING', payload: false })
      throw error
    }
  }, [dispatch])

  // Trading Signals Methods
  const fetchActiveSignals = useCallback(async () => {
    dispatch({ type: 'SET_SIGNALS_LOADING', payload: true })
    try {
      const signals = await pythonBackendService.getActiveSignals()
      dispatch({ type: 'SET_ACTIVE_SIGNALS', payload: signals })
      return signals
    } catch (error) {
      dispatch({ type: 'SET_SIGNALS_LOADING', payload: false })
      throw error
    }
  }, [dispatch])

  const generateSignals = useCallback(async () => {
    dispatch({ type: 'SET_SIGNALS_LOADING', payload: true })
    try {
      const signals = await pythonBackendService.generateSignals()
      dispatch({ type: 'SET_ACTIVE_SIGNALS', payload: signals })
      return signals
    } catch (error) {
      dispatch({ type: 'SET_SIGNALS_LOADING', payload: false })
      throw error
    }
  }, [dispatch])

  // Market Breadth Methods
  const fetchLatestBreadthData = useCallback(async () => {
    dispatch({ type: 'SET_BREADTH_LOADING', payload: true })
    try {
      const data = await pythonBackendService.getLatestBreadthData()
      dispatch({ type: 'SET_LATEST_BREADTH_DATA', payload: data })
      return data
    } catch (error) {
      dispatch({ type: 'SET_BREADTH_LOADING', payload: false })
      throw error
    }
  }, [dispatch])

  const fetchHistoricalBreadthData = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    try {
      const data = await pythonBackendService.getHistoricalBreadthData(startDate, endDate)
      dispatch({ type: 'SET_HISTORICAL_BREADTH_DATA', payload: data })
      return data
    } catch (error) {
      throw error
    }
  }, [dispatch])

  const updateBreadthData = useCallback(async (data: Partial<BreadthData>) => {
    try {
      const updatedData = await pythonBackendService.updateBreadthData(data)
      dispatch({ type: 'SET_LATEST_BREADTH_DATA', payload: updatedData })
      return updatedData
    } catch (error) {
      throw error
    }
  }, [dispatch])

  // Risk Management Methods
  const calculateRisk = useCallback(async (
    symbol: string,
    entryPrice: number,
    accountBalance: number,
    riskPercentage: number = 1
  ): Promise<RiskParameters> => {
    return await pythonBackendService.calculateRisk(
      symbol,
      entryPrice,
      accountBalance,
      riskPercentage
    )
  }, [])

  const fetchTrueRangeData = useCallback(async (
    symbol: string,
    days: number = 252
  ): Promise<TrueRangeData[]> => {
    return await pythonBackendService.getTrueRangeData(symbol, days)
  }, [])

  // Utility Methods
  const refreshAllData = useCallback(async () => {
    if (!state.isConnected) return

    try {
      await Promise.allSettled([
        fetchCurrentRegime(),
        fetchPositions(),
        fetchPerformance(),
        fetchActiveSignals(),
        fetchLatestBreadthData(),
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
  }, [
    state.isConnected,
    fetchCurrentRegime,
    fetchPositions,
    fetchPerformance,
    fetchActiveSignals,
    fetchLatestBreadthData,
  ])

  // Initial connection check on mount
  useEffect(() => {
    checkConnection().catch(console.error)
  }, [checkConnection])

  return {
    // Connection
    checkConnection,
    isConnected: state.isConnected,
    connectionError: state.connectionError,
    lastHealthCheck: state.lastHealthCheck,

    // Market Regime
    fetchCurrentRegime,
    fetchRegimeHistory,
    currentRegime: state.currentRegime,
    regimeHistory: state.regimeHistory,
    regimeLoading: state.regimeLoading,

    // Positions
    fetchPositions,
    openPosition,
    closePosition,
    updateStopLoss,
    positions: state.positions,
    positionsLoading: state.positionsLoading,

    // Performance
    fetchPerformance,
    performance: state.performance,
    performanceByRegime: state.performanceByRegime,
    performanceLoading: state.performanceLoading,

    // Trading Signals
    fetchActiveSignals,
    generateSignals,
    activeSignals: state.activeSignals,
    signalsLoading: state.signalsLoading,

    // Market Breadth
    fetchLatestBreadthData,
    fetchHistoricalBreadthData,
    updateBreadthData,
    latestBreadthData: state.latestBreadthData,
    historicalBreadthData: state.historicalBreadthData,
    breadthLoading: state.breadthLoading,

    // Risk Management
    calculateRisk,
    fetchTrueRangeData,

    // Utility
    refreshAllData,
  }
}

// Specialized hooks for specific features
export const useMarketRegime = () => {
  const backend = usePythonBackend()
  
  return {
    currentRegime: backend.currentRegime,
    regimeHistory: backend.regimeHistory,
    loading: backend.regimeLoading,
    fetchCurrent: backend.fetchCurrentRegime,
    fetchHistory: backend.fetchRegimeHistory,
  }
}

export const useRiskManagement = () => {
  const backend = usePythonBackend()

  return {
    calculateRisk: backend.calculateRisk,
    fetchTrueRangeData: backend.fetchTrueRangeData,
  }
}

export const usePositionManagement = () => {
  const backend = usePythonBackend()

  return {
    positions: backend.positions,
    loading: backend.positionsLoading,
    fetchPositions: backend.fetchPositions,
    openPosition: backend.openPosition,
    closePosition: backend.closePosition,
    updateStopLoss: backend.updateStopLoss,
  }
}

export const useTradingSignals = () => {
  const backend = usePythonBackend()

  return {
    signals: backend.activeSignals,
    loading: backend.signalsLoading,
    fetchSignals: backend.fetchActiveSignals,
    generateSignals: backend.generateSignals,
  }
}

export const useMarketBreadth = () => {
  const backend = usePythonBackend()

  return {
    latest: backend.latestBreadthData,
    historical: backend.historicalBreadthData,
    loading: backend.breadthLoading,
    fetchLatest: backend.fetchLatestBreadthData,
    fetchHistorical: backend.fetchHistoricalBreadthData,
    updateData: backend.updateBreadthData,
  }
}

export default usePythonBackend