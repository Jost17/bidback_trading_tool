import React, { useState, useCallback, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  Calendar,
  DollarSign,
  Activity,
  Shield,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react'
import type { OpenPosition } from '../../../types/trading'
import { getDaysToExit, isTradingDay } from '../../../utils/holidayCalendar'

interface OpenPositionsProps {
  onPositionUpdate?: (positionId: number) => void
  onPositionClosed?: (positionId: number) => void
}

export function OpenPositions({ onPositionUpdate, onPositionClosed }: OpenPositionsProps) {
  const [positions, setPositions] = useState<OpenPosition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  
  // Sample positions for demonstration
  const mockPositions: OpenPosition[] = [
    {
      id: 1,
      symbol: 'SPXL',
      entryDate: '2025-09-02',
      entryPrice: 45.20,
      quantity: 332, // ~$15,000 position
      currentPrice: 47.85,
      
      originalCalculation: {
        basePosition: 10000,
        vixMultiplier: 1.1,
        breadthMultiplier: 1.5,
        finalPosition: 16500,
        bigOpportunity: true,
        avoidEntry: false
      },
      
      marketConditionsAtEntry: {
        t2108: 28.5,
        vix: 22.4,
        up4pct: 1250,
        down4pct: 85,
        marketPhase: 'BULL'
      },
      
      exitTargets: {
        stopLoss: 40.68, // -10%
        profitTarget1: 49.31, // +9% (50% exit)
        profitTarget2: 54.24, // +20%
        timeExitDate: '2025-09-10'
      },
      
      unrealizedPL: 879.80,
      unrealizedPLPercent: 5.86,
      positionAge: 1,
      
      status: 'open',
      
      deteriorationSignals: {
        avoidSignalActive: false,
        deteriorationScore: 0,
        recommendation: 'hold'
      },
      
      createdAt: '2025-09-02T09:30:00Z',
      updatedAt: '2025-09-03T13:15:00Z'
    },
    {
      id: 2,
      symbol: 'TQQQ',
      entryDate: '2025-08-30',
      entryPrice: 58.45,
      quantity: 137, // ~$8,000 position (reduced)
      currentPrice: 62.85,
      
      originalCalculation: {
        basePosition: 10000,
        vixMultiplier: 0.8,
        breadthMultiplier: 1.0,
        finalPosition: 8000,
        bigOpportunity: false,
        avoidEntry: false
      },
      
      marketConditionsAtEntry: {
        t2108: 58.2,
        vix: 11.8,
        up4pct: 420,
        down4pct: 180,
        marketPhase: 'NEUTRAL'
      },
      
      exitTargets: {
        stopLoss: 56.11, // -4% (low VIX)
        profitTarget1: 60.79, // +4%
        profitTarget2: 64.30, // +10%
        timeExitDate: '2025-09-04'
      },
      
      unrealizedPL: 602.80,
      unrealizedPLPercent: 7.53,
      positionAge: 3,
      
      status: 'partial',
      partialExits: [
        {
          date: '2025-09-02',
          quantity: 68, // 50% exit at profit target 1
          price: 60.85,
          reason: 'Profit target 1 reached'
        }
      ],
      
      deteriorationSignals: {
        avoidSignalActive: true,
        deteriorationScore: 1,
        recommendation: 'reduce'
      },
      
      createdAt: '2025-08-30T09:30:00Z',
      updatedAt: '2025-09-03T13:15:00Z'
    }
  ]
  
  useEffect(() => {
    loadPositions()
  }, [])
  
  const loadPositions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Simulate API call
      setTimeout(() => {
        setPositions(mockPositions)
        setLastUpdated(new Date().toISOString())
        setIsLoading(false)
      }, 500)
    } catch (err) {
      setError('Failed to load positions')
      setIsLoading(false)
    }
  }, [])
  
  const calculateDaysToExit = (timeExitDate: string): number => {
    return getDaysToExit(timeExitDate)
  }
  
  const getPositionStatusColor = (status: OpenPosition['status']) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'hold': return 'bg-green-100 text-green-800'
      case 'reduce': return 'bg-yellow-100 text-yellow-800'
      case 'exit': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'hold': return <CheckCircle className="w-3 h-3" />
      case 'reduce': return <AlertTriangle className="w-3 h-3" />
      case 'exit': return <AlertCircle className="w-3 h-3" />
      default: return <Activity className="w-3 h-3" />
    }
  }
  
  const getTotalUnrealizedPL = () => {
    return positions.reduce((total, pos) => total + (pos.unrealizedPL || 0), 0)
  }
  
  const getTotalPositionValue = () => {
    return positions.reduce((total, pos) => total + ((pos.currentPrice || 0) * pos.quantity), 0)
  }
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Positions</p>
              <p className="text-2xl font-bold text-gray-900">{positions.length}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${getTotalPositionValue().toLocaleString(undefined, {maximumFractionDigits: 0})}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unrealized P&L</p>
              <p className={`text-2xl font-bold ${getTotalUnrealizedPL() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${getTotalUnrealizedPL() >= 0 ? '+' : ''}
                {getTotalUnrealizedPL().toLocaleString(undefined, {maximumFractionDigits: 0})}
              </p>
            </div>
            {getTotalUnrealizedPL() >= 0 ? (
              <TrendingUp className="w-8 h-8 text-green-600" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-600" />
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="text-sm font-medium text-gray-900">
                {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
              </p>
            </div>
            <button
              onClick={loadPositions}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Positions Table */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <span>Open Positions</span>
            </h2>
            <p className="text-gray-600 mt-1">
              Active Bidback trades with real-time P&L and exit recommendations
            </p>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}
        
        {positions.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Open Positions</h3>
            <p className="text-gray-600 mb-4">Execute planned trades to see your positions here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((position) => (
              <div key={position.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-xl font-semibold text-gray-900">{position.symbol}</div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPositionStatusColor(position.status)}`}>
                      {position.status.toUpperCase()}
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getRecommendationColor(position.deteriorationSignals.recommendation)}`}>
                      {getRecommendationIcon(position.deteriorationSignals.recommendation)}
                      <span>{position.deteriorationSignals.recommendation.toUpperCase()}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-bold ${(position.unrealizedPL || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(position.unrealizedPL || 0) >= 0 ? '+' : ''}
                      ${(position.unrealizedPL || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      ({(position.unrealizedPLPercent || 0) >= 0 ? '+' : ''}
                      {(position.unrealizedPLPercent || 0).toFixed(2)}%)
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{position.quantity}</div>
                    <div className="text-xs text-gray-600">Shares</div>
                  </div>
                  
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">${position.entryPrice}</div>
                    <div className="text-xs text-gray-600">Entry Price</div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">${position.currentPrice}</div>
                    <div className="text-xs text-gray-600">Current Price</div>
                  </div>
                  
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-lg font-bold text-red-600">${position.exitTargets.stopLoss}</div>
                    <div className="text-xs text-gray-600">Stop Loss</div>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">${position.exitTargets.profitTarget2}</div>
                    <div className="text-xs text-gray-600">Target Price</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-600">Entry Date:</span>
                    <span className="ml-2 font-medium">{new Date(position.entryDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Position Age:</span>
                    <span className="ml-2 font-medium">{position.positionAge} days</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Time Exit:</span>
                    <span className="ml-2 font-medium">{new Date(position.exitTargets.timeExitDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Days to Exit:</span>
                    <span className={`ml-2 font-medium ${
                      calculateDaysToExit(position.exitTargets.timeExitDate) <= 1 
                        ? 'text-red-600' 
                        : calculateDaysToExit(position.exitTargets.timeExitDate) <= 2
                        ? 'text-yellow-600'
                        : 'text-gray-900'
                    }`}>
                      {calculateDaysToExit(position.exitTargets.timeExitDate)} days
                    </span>
                  </div>
                </div>
                
                {/* Entry Conditions */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Entry Conditions</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>VIX: {position.marketConditionsAtEntry.vix}</div>
                    <div>T2108: {position.marketConditionsAtEntry.t2108}%</div>
                    <div>Up 4%: {position.marketConditionsAtEntry.up4pct}</div>
                    <div>Phase: {position.marketConditionsAtEntry.marketPhase}</div>
                  </div>
                </div>
                
                {/* Partial Exits */}
                {position.partialExits && position.partialExits.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-blue-700 mb-2">Partial Exits</div>
                    {position.partialExits.map((exit, index) => (
                      <div key={index} className="text-xs text-blue-600 mb-1">
                        {exit.quantity} shares @ ${exit.price} on {new Date(exit.date).toLocaleDateString()} - {exit.reason}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Deterioration Warning */}
                {position.deteriorationSignals.avoidSignalActive && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                    <div className="flex items-center space-x-2 text-yellow-800">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Position Deterioration Alert</span>
                    </div>
                    <div className="text-xs text-yellow-700 mt-1">
                      Avoid signal is active. Score: {position.deteriorationSignals.deteriorationScore}/4
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}