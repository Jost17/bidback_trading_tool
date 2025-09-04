import React, { useState, useCallback, useEffect } from 'react'
import { 
  Plus, 
  Play, 
  Trash2, 
  Edit, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  Calendar,
  DollarSign,
  Activity,
  Shield
} from 'lucide-react'
import type { PlannedTrade, MarketSignals } from '../../../types/trading'
import { calculateExitDate, calculateExitPrices, getDaysToExit } from '../../../utils/holidayCalendar'

interface PlannedTradesProps {
  onTradeExecuted?: (tradeId: number) => void
  onTradeDeleted?: (tradeId: number) => void
}

export function PlannedTrades({ onTradeExecuted, onTradeDeleted }: PlannedTradesProps) {
  const [plannedTrades, setPlannedTrades] = useState<PlannedTrade[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Sample data for demonstration
  const mockPlannedTrades: PlannedTrade[] = [
    {
      id: 1,
      symbol: 'SPXL',
      entryPrice: 45.20,
      plannedPositionSize: 10000,
      calculatedPositionSize: 15000, // 1.5x multiplier
      
      t2108AtPlanning: 28.5,
      vixAtPlanning: 22.4,
      up4pctAtPlanning: 1250,
      down4pctAtPlanning: 85,
      
      stopLoss: 40.68, // -10% (VIX 20-25 range)
      profitTarget1: 49.31, // +9% (50% exit)
      profitTarget2: 54.24, // +20% (full exit)
      timeExitDate: '2025-09-10', // 5 trading days
      
      isBigOpportunity: true,
      avoidEntry: false,
      portfolioHeatPercent: 15.0,
      
      status: 'planned',
      createdAt: '2025-09-03T10:30:00Z',
      notes: 'Big Opportunity detected: T2108 < 30 + Up 4% > 1000'
    },
    {
      id: 2,
      symbol: 'TQQQ',
      entryPrice: 62.85,
      plannedPositionSize: 10000,
      calculatedPositionSize: 8000, // 0.8x multiplier (VIX ultra-low)
      
      t2108AtPlanning: 68.2,
      vixAtPlanning: 11.8,
      up4pctAtPlanning: 420,
      down4pctAtPlanning: 180,
      
      stopLoss: 60.33, // -4% (VIX < 12 range)
      profitTarget1: 65.37, // +4% (50% exit)
      profitTarget2: 69.39, // +10% (full exit)
      timeExitDate: '2025-09-06', // 3 trading days
      
      isBigOpportunity: false,
      avoidEntry: false,
      portfolioHeatPercent: 8.0,
      
      status: 'planned',
      createdAt: '2025-09-03T11:15:00Z',
      notes: 'Normal conditions, reduced size due to low VIX'
    }
  ]
  
  useEffect(() => {
    // Simulate loading data
    setIsLoading(true)
    setTimeout(() => {
      setPlannedTrades(mockPlannedTrades)
      setIsLoading(false)
    }, 500)
  }, [])
  
  const handleExecuteTrade = useCallback(async (trade: PlannedTrade) => {
    if (!trade.id) return
    
    try {
      // Here you would typically:
      // 1. Validate market conditions still apply
      // 2. Create order in broker system
      // 3. Update trade status
      
      setPlannedTrades(prev => 
        prev.map(t => 
          t.id === trade.id 
            ? { ...t, status: 'ordered', updatedAt: new Date().toISOString() }
            : t
        )
      )
      
      onTradeExecuted?.(trade.id)
      
    } catch (error) {
      setError('Failed to execute trade')
    }
  }, [onTradeExecuted])
  
  const handleDeleteTrade = useCallback(async (tradeId: number) => {
    try {
      setPlannedTrades(prev => prev.filter(t => t.id !== tradeId))
      onTradeDeleted?.(tradeId)
    } catch (error) {
      setError('Failed to delete trade')
    }
  }, [onTradeDeleted])
  
  const getStatusColor = (status: PlannedTrade['status']) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800'
      case 'ordered': return 'bg-yellow-100 text-yellow-800'
      case 'filled': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getTradeTypeIndicator = (trade: PlannedTrade) => {
    if (trade.isBigOpportunity) {
      return (
        <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          <TrendingUp className="w-3 h-3" />
          <span>Big Opportunity</span>
        </div>
      )
    }
    
    if (trade.avoidEntry) {
      return (
        <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
          <AlertTriangle className="w-3 h-3" />
          <span>Avoid Entry</span>
        </div>
      )
    }
    
    return (
      <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
        <Activity className="w-3 h-3" />
        <span>Normal</span>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <Target className="w-6 h-6 text-blue-600" />
              <span>Planned Trades</span>
            </h2>
            <p className="text-gray-600 mt-1">
              Bidback trades ready for execution with calculated position sizes and exits
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Plan New Trade</span>
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}
        
        {plannedTrades.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Planned Trades</h3>
            <p className="text-gray-600 mb-4">Create your first planned trade based on Bidback signals</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Plan Your First Trade
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {plannedTrades.map((trade) => (
              <div key={trade.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-lg font-semibold text-gray-900">{trade.symbol}</div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                      {trade.status.toUpperCase()}
                    </div>
                    {getTradeTypeIndicator(trade)}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleExecuteTrade(trade)}
                      disabled={trade.status !== 'planned'}
                      className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      <span>Execute</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTrade(trade.id!)}
                      className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">${trade.entryPrice}</div>
                    <div className="text-xs text-gray-600">Entry Price</div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      ${trade.calculatedPositionSize.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">Position Size</div>
                  </div>
                  
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-lg font-bold text-red-600">${trade.stopLoss}</div>
                    <div className="text-xs text-gray-600">Stop Loss</div>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">${trade.profitTarget2}</div>
                    <div className="text-xs text-gray-600">Profit Target</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-600">VIX:</span>
                    <span className="ml-2 font-medium">{trade.vixAtPlanning}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">T2108:</span>
                    <span className="ml-2 font-medium">{trade.t2108AtPlanning}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Up 4%:</span>
                    <span className="ml-2 font-medium">{trade.up4pctAtPlanning}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Portfolio Heat:</span>
                    <span className="ml-2 font-medium">{trade.portfolioHeatPercent}%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Exit by: {new Date(trade.timeExitDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Shield className="w-4 h-4" />
                      <span>Risk: {((trade.entryPrice - trade.stopLoss) / trade.entryPrice * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="text-xs">
                    Created: {new Date(trade.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                {trade.notes && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                    <strong>Notes:</strong> {trade.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Plan New Trade</h3>
            <p className="text-gray-600 mb-4">
              This feature will integrate with the Bidback Position Calculator to automatically 
              calculate position sizes and exits based on current market conditions.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}