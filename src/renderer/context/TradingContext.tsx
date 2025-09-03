import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { 
  MarketRegime, 
  Position, 
  PerformanceMetrics, 
  TradingSignal,
  BreadthData
} from '../services/pythonBackendService'

// State Types
export interface TradingState {
  // Connection Status
  isConnected: boolean
  lastHealthCheck: Date | null
  connectionError: string | null

  // Market Regime
  currentRegime: MarketRegime | null
  regimeHistory: MarketRegime[]
  regimeLoading: boolean

  // Positions
  positions: Position[]
  positionsLoading: boolean

  // Performance
  performance: PerformanceMetrics | null
  performanceByRegime: Record<string, PerformanceMetrics> | null
  performanceLoading: boolean

  // Trading Signals
  activeSignals: TradingSignal[]
  signalsLoading: boolean

  // Market Breadth
  latestBreadthData: BreadthData | null
  historicalBreadthData: BreadthData[]
  breadthLoading: boolean

  // UI State
  selectedTimeframe: '1D' | '1W' | '1M' | '3M' | '1Y'
  autoRefresh: boolean
  refreshInterval: number
}

// Action Types
export type TradingAction =
  | { type: 'SET_CONNECTION_STATUS'; payload: { connected: boolean; error?: string } }
  | { type: 'SET_LAST_HEALTH_CHECK'; payload: Date }
  | { type: 'SET_REGIME_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_REGIME'; payload: MarketRegime }
  | { type: 'SET_REGIME_HISTORY'; payload: MarketRegime[] }
  | { type: 'SET_POSITIONS_LOADING'; payload: boolean }
  | { type: 'SET_POSITIONS'; payload: Position[] }
  | { type: 'ADD_POSITION'; payload: Position }
  | { type: 'UPDATE_POSITION'; payload: Position }
  | { type: 'REMOVE_POSITION'; payload: string }
  | { type: 'SET_PERFORMANCE_LOADING'; payload: boolean }
  | { type: 'SET_PERFORMANCE'; payload: PerformanceMetrics }
  | { type: 'SET_PERFORMANCE_BY_REGIME'; payload: Record<string, PerformanceMetrics> }
  | { type: 'SET_SIGNALS_LOADING'; payload: boolean }
  | { type: 'SET_ACTIVE_SIGNALS'; payload: TradingSignal[] }
  | { type: 'SET_BREADTH_LOADING'; payload: boolean }
  | { type: 'SET_LATEST_BREADTH_DATA'; payload: BreadthData }
  | { type: 'SET_HISTORICAL_BREADTH_DATA'; payload: BreadthData[] }
  | { type: 'SET_TIMEFRAME'; payload: '1D' | '1W' | '1M' | '3M' | '1Y' }
  | { type: 'SET_AUTO_REFRESH'; payload: boolean }
  | { type: 'SET_REFRESH_INTERVAL'; payload: number }

// Initial State
const initialState: TradingState = {
  isConnected: false,
  lastHealthCheck: null,
  connectionError: null,
  
  currentRegime: null,
  regimeHistory: [],
  regimeLoading: false,
  
  positions: [],
  positionsLoading: false,
  
  performance: null,
  performanceByRegime: null,
  performanceLoading: false,
  
  activeSignals: [],
  signalsLoading: false,
  
  latestBreadthData: null,
  historicalBreadthData: [],
  breadthLoading: false,
  
  selectedTimeframe: '1M',
  autoRefresh: true,
  refreshInterval: 30000, // 30 seconds
}

// Reducer
function tradingReducer(state: TradingState, action: TradingAction): TradingState {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload.connected,
        connectionError: action.payload.error || null,
      }

    case 'SET_LAST_HEALTH_CHECK':
      return {
        ...state,
        lastHealthCheck: action.payload,
      }

    case 'SET_REGIME_LOADING':
      return {
        ...state,
        regimeLoading: action.payload,
      }

    case 'SET_CURRENT_REGIME':
      return {
        ...state,
        currentRegime: action.payload,
        regimeLoading: false,
      }

    case 'SET_REGIME_HISTORY':
      return {
        ...state,
        regimeHistory: action.payload,
      }

    case 'SET_POSITIONS_LOADING':
      return {
        ...state,
        positionsLoading: action.payload,
      }

    case 'SET_POSITIONS':
      return {
        ...state,
        positions: action.payload,
        positionsLoading: false,
      }

    case 'ADD_POSITION':
      return {
        ...state,
        positions: [...state.positions, action.payload],
      }

    case 'UPDATE_POSITION':
      return {
        ...state,
        positions: state.positions.map(pos =>
          pos.id === action.payload.id ? action.payload : pos
        ),
      }

    case 'REMOVE_POSITION':
      return {
        ...state,
        positions: state.positions.filter(pos => pos.id !== action.payload),
      }

    case 'SET_PERFORMANCE_LOADING':
      return {
        ...state,
        performanceLoading: action.payload,
      }

    case 'SET_PERFORMANCE':
      return {
        ...state,
        performance: action.payload,
        performanceLoading: false,
      }

    case 'SET_PERFORMANCE_BY_REGIME':
      return {
        ...state,
        performanceByRegime: action.payload,
      }

    case 'SET_SIGNALS_LOADING':
      return {
        ...state,
        signalsLoading: action.payload,
      }

    case 'SET_ACTIVE_SIGNALS':
      return {
        ...state,
        activeSignals: action.payload,
        signalsLoading: false,
      }

    case 'SET_BREADTH_LOADING':
      return {
        ...state,
        breadthLoading: action.payload,
      }

    case 'SET_LATEST_BREADTH_DATA':
      return {
        ...state,
        latestBreadthData: action.payload,
        breadthLoading: false,
      }

    case 'SET_HISTORICAL_BREADTH_DATA':
      return {
        ...state,
        historicalBreadthData: action.payload,
      }

    case 'SET_TIMEFRAME':
      return {
        ...state,
        selectedTimeframe: action.payload,
      }

    case 'SET_AUTO_REFRESH':
      return {
        ...state,
        autoRefresh: action.payload,
      }

    case 'SET_REFRESH_INTERVAL':
      return {
        ...state,
        refreshInterval: action.payload,
      }

    default:
      return state
  }
}

// Context
const TradingContext = createContext<{
  state: TradingState
  dispatch: React.Dispatch<TradingAction>
} | undefined>(undefined)

// Provider Props
interface TradingProviderProps {
  children: ReactNode
}

// Provider Component
export const TradingProvider: React.FC<TradingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(tradingReducer, initialState)

  // Auto-refresh logic
  useEffect(() => {
    if (!state.autoRefresh || !state.isConnected) return

    const interval = setInterval(() => {
      // Refresh key data periodically
      refreshData()
    }, state.refreshInterval)

    return () => clearInterval(interval)
  }, [state.autoRefresh, state.isConnected, state.refreshInterval])

  const refreshData = async () => {
    // This would typically call the API service methods
    // We'll implement these in custom hooks
    console.log('Auto-refreshing trading data...')
  }

  return (
    <TradingContext.Provider value={{ state, dispatch }}>
      {children}
    </TradingContext.Provider>
  )
}

// Custom Hook
export const useTrading = () => {
  const context = useContext(TradingContext)
  if (context === undefined) {
    throw new Error('useTrading must be used within a TradingProvider')
  }
  return context
}

// Selector Hooks for Performance
export const useTradingSelector = <T,>(selector: (state: TradingState) => T): T => {
  const { state } = useTrading()
  return selector(state)
}

// Common Selectors
export const useConnectionStatus = () => 
  useTradingSelector(state => ({
    isConnected: state.isConnected,
    lastHealthCheck: state.lastHealthCheck,
    connectionError: state.connectionError,
  }))

export const useCurrentRegime = () =>
  useTradingSelector(state => state.currentRegime)

export const usePositions = () =>
  useTradingSelector(state => ({
    positions: state.positions,
    loading: state.positionsLoading,
  }))

export const usePerformance = () =>
  useTradingSelector(state => ({
    performance: state.performance,
    performanceByRegime: state.performanceByRegime,
    loading: state.performanceLoading,
  }))

export const useActiveSignals = () =>
  useTradingSelector(state => ({
    signals: state.activeSignals,
    loading: state.signalsLoading,
  }))

export const useBreadthData = () =>
  useTradingSelector(state => ({
    latest: state.latestBreadthData,
    historical: state.historicalBreadthData,
    loading: state.breadthLoading,
  }))

export const useUISettings = () =>
  useTradingSelector(state => ({
    selectedTimeframe: state.selectedTimeframe,
    autoRefresh: state.autoRefresh,
    refreshInterval: state.refreshInterval,
  }))

export default TradingContext