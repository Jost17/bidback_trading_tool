import React, { useState, useCallback } from 'react'
import { Calculator, DollarSign, Calendar, AlertTriangle, TrendingUp, Target, Clock } from 'lucide-react'
import { calculateExitDate, calculateExitPrices, getVixExitMatrix } from '../../../utils/holidayCalendar'

interface TradeInput {
  symbol: string
  entryPrice: number
  vix: number
  t2108: number
  up4pct: number
  down4pct: number
  portfolioSize: number
}

interface TradeCalculation {
  positionSize: number
  maxPositionValue: number
  stopLossPrice: number
  profitTarget1: number
  profitTarget2: number
  exitDate: Date
  vixMultiplier: number
  breadthMultiplier: number
  portfolioHeatPercent: number
  entryRecommendation: 'BIG_OPPORTUNITY' | 'NORMAL_ENTRY' | 'AVOID_ENTRY' | 'NO_ENTRY'
  holdDays: number
}

export function TradeEntryForm() {
  const [formData, setFormData] = useState<TradeInput>({
    symbol: '',
    entryPrice: 0,
    vix: 18.5,
    t2108: 65,
    up4pct: 800,
    down4pct: 200,
    portfolioSize: 100000
  })

  const [calculation, setCalculation] = useState<TradeCalculation | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Bidback Position Calculation
  const calculatePosition = useCallback((data: TradeInput): TradeCalculation => {
    const { symbol, entryPrice, vix, t2108, up4pct, down4pct, portfolioSize } = data

    // VIX Multipliers (Bidback Master System)
    const getVixMultiplier = (vixValue: number): number => {
      if (vixValue < 12) return 0.8
      if (vixValue < 15) return 0.9
      if (vixValue < 20) return 1.0
      if (vixValue < 25) return 1.1
      if (vixValue < 35) return 1.2
      return 1.4
    }

    // Breadth Multipliers
    const getBreadthMultiplier = (up4pctValue: number, t2108Value: number): number => {
      if (up4pctValue < 100) return 0.0 // NO ENTRY
      if (up4pctValue < 150) return 0.3
      if (up4pctValue < 200) return 0.5
      if (up4pctValue > 1000 && t2108Value < 30) return 2.0 // Big Opportunity
      if (up4pctValue > 500 && t2108Value < 40) return 1.5
      return 1.0 // Normal
    }

    // Entry Recommendation
    const getEntryRecommendation = (up4pctValue: number, t2108Value: number): TradeCalculation['entryRecommendation'] => {
      if (up4pctValue < 100) return 'NO_ENTRY'
      if (up4pctValue < 150 || t2108Value > 70) return 'AVOID_ENTRY'
      if (up4pctValue > 1000 && t2108Value < 20) return 'BIG_OPPORTUNITY'
      return 'NORMAL_ENTRY'
    }

    const vixMultiplier = getVixMultiplier(vix)
    const breadthMultiplier = getBreadthMultiplier(up4pct, t2108)
    const entryRecommendation = getEntryRecommendation(up4pct, t2108)

    // Base position: 10% of portfolio
    const basePositionValue = portfolioSize * 0.10
    
    // Apply multipliers
    const finalPositionValue = Math.min(
      basePositionValue * vixMultiplier * breadthMultiplier,
      portfolioSize * 0.30 // Max 30% per position
    )

    const positionSize = Math.floor(finalPositionValue / entryPrice)
    const maxPositionValue = positionSize * entryPrice
    const portfolioHeatPercent = (maxPositionValue / portfolioSize) * 100

    // Exit calculations using VIX Exit Matrix
    const vixMatrix = getVixExitMatrix(vix)
    const exitDate = calculateExitDate(new Date(), vix)
    const exitPrices = calculateExitPrices(entryPrice, vix)

    const stopLossPrice = entryPrice * (1 + vixMatrix.stopLossPercent / 100)
    const profitTarget1 = entryPrice * (1 + vixMatrix.profitTarget1Percent / 100)
    const profitTarget2 = entryPrice * (1 + vixMatrix.profitTarget2Percent / 100)

    return {
      positionSize,
      maxPositionValue,
      stopLossPrice,
      profitTarget1,
      profitTarget2,
      exitDate,
      vixMultiplier,
      breadthMultiplier,
      portfolioHeatPercent,
      entryRecommendation,
      holdDays: vixMatrix.maxHoldDays
    }
  }, [])

  const handleInputChange = (field: keyof TradeInput, value: string | number) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)

    // Real-time calculation
    if (newData.symbol && newData.entryPrice > 0) {
      const calc = calculatePosition(newData)
      setCalculation(calc)
    } else {
      setCalculation(null)
    }
  }

  const getRecommendationColor = (recommendation: TradeCalculation['entryRecommendation']) => {
    switch (recommendation) {
      case 'BIG_OPPORTUNITY': return 'bg-green-100 text-green-800 border-green-200'
      case 'NORMAL_ENTRY': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'AVOID_ENTRY': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'NO_ENTRY': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRecommendationIcon = (recommendation: TradeCalculation['entryRecommendation']) => {
    switch (recommendation) {
      case 'BIG_OPPORTUNITY': return <TrendingUp className="w-4 h-4" />
      case 'NORMAL_ENTRY': return <Calculator className="w-4 h-4" />
      case 'AVOID_ENTRY': return <AlertTriangle className="w-4 h-4" />
      case 'NO_ENTRY': return <AlertTriangle className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold flex items-center space-x-3">
          <Calculator className="w-8 h-8" />
          <span>Bidback Trade Entry Calculator</span>
        </h1>
        <p className="text-blue-100 mt-2">Enter trade details for position sizing and exit strategy calculation</p>
      </div>

      {/* Trade Input Form */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold mb-4">Trade Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Symbol
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. AAPL"
            />
          </div>

          {/* Entry Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entry Price ($)
            </label>
            <input
              type="number"
              // Removed step constraint for flexible price input
              value={formData.entryPrice || ''}
              onChange={(e) => handleInputChange('entryPrice', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="150.00"
            />
          </div>

          {/* Portfolio Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portfolio Size ($)
            </label>
            <input
              type="number"
              value={formData.portfolioSize}
              onChange={(e) => handleInputChange('portfolioSize', parseFloat(e.target.value) || 100000)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* VIX */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VIX Level
            </label>
            <input
              type="number"
              // Removed step constraint for flexible VIX input
              value={formData.vix}
              onChange={(e) => handleInputChange('vix', parseFloat(e.target.value) || 18.5)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Advanced Market Breadth Inputs */}
        <div className="mt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Market Breadth</span>
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                T2108 (%)
              </label>
              <input
                type="number"
                value={formData.t2108}
                onChange={(e) => handleInputChange('t2108', parseFloat(e.target.value) || 65)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stocks Up 4% Daily
              </label>
              <input
                type="number"
                value={formData.up4pct}
                onChange={(e) => handleInputChange('up4pct', parseInt(e.target.value) || 800)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stocks Down 4% Daily
              </label>
              <input
                type="number"
                value={formData.down4pct}
                onChange={(e) => handleInputChange('down4pct', parseInt(e.target.value) || 200)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Calculation Results */}
      {calculation && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">Bidback Position Calculation</h2>
          
          {/* Entry Recommendation */}
          <div className={`p-4 rounded-lg border mb-4 ${getRecommendationColor(calculation.entryRecommendation)}`}>
            <div className="flex items-center space-x-2">
              {getRecommendationIcon(calculation.entryRecommendation)}
              <span className="font-semibold">
                {calculation.entryRecommendation.replace('_', ' ')}
              </span>
            </div>
            <div className="text-sm mt-1">
              {calculation.entryRecommendation === 'BIG_OPPORTUNITY' && 'T2108 < 20 and Up 4% > 1000 - Maximum position recommended'}
              {calculation.entryRecommendation === 'NORMAL_ENTRY' && 'Standard market conditions - Normal position sizing'}
              {calculation.entryRecommendation === 'AVOID_ENTRY' && 'Weak breadth conditions - Consider reduced position or wait'}
              {calculation.entryRecommendation === 'NO_ENTRY' && 'Up 4% < 100 - No entry recommended per Bidback rules'}
            </div>
          </div>

          {/* Position Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{calculation.positionSize}</div>
              <div className="text-sm text-gray-600">Shares</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ${calculation.maxPositionValue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Position Value</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {calculation.portfolioHeatPercent.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Portfolio Heat</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{calculation.holdDays}</div>
              <div className="text-sm text-gray-600">Max Hold Days</div>
            </div>
          </div>

          {/* Multipliers */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">VIX Multiplier</span>
                <span className="text-lg font-bold text-purple-600">{calculation.vixMultiplier.toFixed(1)}x</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Based on VIX {formData.vix}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Breadth Multiplier</span>
                <span className="text-lg font-bold text-green-600">{calculation.breadthMultiplier.toFixed(1)}x</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Up 4%: {formData.up4pct}, T2108: {formData.t2108}%</div>
            </div>
          </div>

          {/* Exit Strategy */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span>Exit Strategy (Holiday-Adjusted)</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-red-100 rounded-lg">
                <div className="text-lg font-bold text-red-600">
                  ${calculation.stopLossPrice.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Stop Loss</div>
              </div>
              
              <div className="text-center p-3 bg-yellow-100 rounded-lg">
                <div className="text-lg font-bold text-yellow-600">
                  ${calculation.profitTarget1.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Profit Target 1</div>
              </div>
              
              <div className="text-center p-3 bg-green-100 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  ${calculation.profitTarget2.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Profit Target 2</div>
              </div>
              
              <div className="text-center p-3 bg-blue-100 rounded-lg">
                <div className="text-sm font-bold text-blue-600">
                  {calculation.exitDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-sm text-gray-600">Time Exit</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bidback Rules Reference */}
      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
        <h3 className="font-semibold mb-2">Bidback Master System Rules:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>• <strong>Big Opportunity:</strong> T2108 &lt; 20 + Up 4% &gt; 1000</div>
          <div>• <strong>No Entry:</strong> Up 4% &lt; 100</div>
          <div>• <strong>Avoid Entry:</strong> Up 4% &lt; 150 or T2108 &gt; 70</div>
          <div>• <strong>Max Position:</strong> 30% of portfolio</div>
          <div>• <strong>VIX Multipliers:</strong> 0.8x-1.4x based on volatility</div>
          <div>• <strong>Holiday Adjustment:</strong> Exit dates skip market holidays</div>
        </div>
      </div>
    </div>
  )
}