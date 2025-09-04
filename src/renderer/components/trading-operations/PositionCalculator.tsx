import React, { useState, useCallback, useEffect } from 'react'
import { Calculator, DollarSign, AlertTriangle, CheckCircle, Settings, TrendingUp, Calendar, Clock, FileText, Zap, Loader } from 'lucide-react'
import type { 
  PositionCalculation, 
  PortfolioSettings, 
  VIXLevel, 
  VIXMultiplier, 
  BreadthMultiplier,
  MarketSignals 
} from '../../../types/trading'
import { calculateExitDate, calculateExitPrices, getVixExitMatrix } from '../../../utils/holidayCalendar'
import { usePortfolio } from '../../contexts/PortfolioContext'

interface PositionCalculatorProps {
  t2108?: number
  vix?: number
  up4pct?: number
  down4pct?: number
  onPortfolioSizeChange?: (size: number) => void
}

export function PositionCalculator({ 
  t2108: propT2108, 
  vix: propVix, 
  up4pct: propUp4pct, 
  down4pct: propDown4pct, 
  onPortfolioSizeChange 
}: PositionCalculatorProps) {
  
  // Use global portfolio context
  const { settings: portfolioSettings, isLoading: portfolioLoading, error: portfolioError, updateSettings } = usePortfolio()
  
  // Get portfolio size from global state, with fallback
  const portfolioSize = portfolioSettings?.portfolioSize || 100000
  
  // Auto-loaded breadth data state
  const [breadthData, setBreadthData] = useState<{
    t2108?: number
    vix?: number
    up4pct?: number
    down4pct?: number
    loadedDate?: string
    isLoading: boolean
    error?: string
    isComplete: boolean
  }>({
    isLoading: true,
    isComplete: false
  })
  
  const [showSettings, setShowSettings] = useState(false)
  const [tempPortfolioSize, setTempPortfolioSize] = useState(portfolioSize)
  
  // Update tempPortfolioSize when global portfolio settings change
  useEffect(() => {
    if (portfolioSettings?.portfolioSize) {
      setTempPortfolioSize(portfolioSettings.portfolioSize)
    }
  }, [portfolioSettings?.portfolioSize])
  const [selectedSetup, setSelectedSetup] = useState('bidback-9')
  const [symbol, setSymbol] = useState('AAPL')
  const [entryPrice, setEntryPrice] = useState(150.00)
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [targetPercent, setTargetPercent] = useState(10)
  const [buyFee, setBuyFee] = useState(9.95)
  
  // Auto-load breadth data from database
  useEffect(() => {
    const loadBreadthData = async () => {
      console.log('🔍 Position Calculator: Starting to load breadth data...')
      setBreadthData(prev => ({ ...prev, isLoading: true, error: undefined }))
      
      try {
        console.log('🔍 Position Calculator: Checking for window.tradingAPI...')
        console.log('🔍 window.tradingAPI available:', !!window.tradingAPI)
        console.log('🔍 window.tradingAPI.getBreadthData available:', !!window.tradingAPI?.getBreadthData)
        
        // Wait for tradingAPI to be available
        let retries = 0
        const maxRetries = 10
        
        while (!window.tradingAPI?.getBreadthData && retries < maxRetries) {
          console.log(`🔍 Position Calculator: Waiting for tradingAPI... (retry ${retries + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 100))
          retries++
        }
        
        if (!window.tradingAPI?.getBreadthData) {
          console.error('🔍 Position Calculator: Trading API not available after retries')
          throw new Error('Trading API not available')
        }
        
        console.log('🔍 Position Calculator: tradingAPI ready, calling getBreadthData()...')
        
        // Get breadth data from previous trading day (for position sizing decisions)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        console.log('🔍 Position Calculator: Looking for data from previous day:', yesterdayStr)
        
        // Get the most recent breadth data from yesterday
        const response = await window.tradingAPI.getBreadthData(yesterdayStr, yesterdayStr)
        
        console.log('🔍 Position Calculator: Raw API response:', response)
        
        if (response && response.length > 0) {
          const latestData = response[0] // Most recent entry
          
          console.log('🔍 Position Calculator: Latest data record:', latestData)
          
          // Check if we have all required data
          const hasVix = latestData.vix !== null && latestData.vix !== undefined
          const hasT2108 = latestData.t2108 !== null && latestData.t2108 !== undefined  
          const hasUp4pct = latestData.stocks_up_4pct !== null && latestData.stocks_up_4pct !== undefined
          const hasDown4pct = latestData.stocks_down_4pct !== null && latestData.stocks_down_4pct !== undefined
          
          const isComplete = hasVix && hasT2108 && hasUp4pct && hasDown4pct
          
          console.log('🔍 Position Calculator: Data completeness check:', {
            hasVix,
            hasT2108,
            hasUp4pct,
            hasDown4pct,
            isComplete
          })
          
          setBreadthData({
            t2108: hasT2108 ? latestData.t2108 : undefined,
            vix: hasVix ? latestData.vix : undefined,
            up4pct: hasUp4pct ? latestData.stocks_up_4pct : undefined,
            down4pct: hasDown4pct ? latestData.stocks_down_4pct : undefined,
            loadedDate: latestData.date,
            isLoading: false,
            isComplete,
            error: undefined
          })
          
          console.log('📊 Breadth data loaded for Position Calculator:', {
            date: latestData.date,
            vix: latestData.vix,
            t2108: latestData.t2108,
            up4pct: latestData.stocks_up_4pct,
            down4pct: latestData.stocks_down_4pct,
            isComplete
          })
        } else {
          console.log('🔍 Position Calculator: No data received from API')
          setBreadthData({
            isLoading: false,
            isComplete: false,
            error: 'No breadth data found in database'
          })
        }
      } catch (error) {
        console.error('🔍 Position Calculator: Failed to load breadth data:', error)
        setBreadthData({
          isLoading: false,
          isComplete: false,
          error: error instanceof Error ? error.message : 'Failed to load breadth data'
        })
      }
    }
    
    loadBreadthData()
  }, [])
  
  // Use either auto-loaded data or props (props take precedence)
  const effectiveData = {
    t2108: propT2108 ?? breadthData.t2108,
    vix: propVix ?? breadthData.vix,
    up4pct: propUp4pct ?? breadthData.up4pct,
    down4pct: propDown4pct ?? breadthData.down4pct
  }
  
  // Available Trading Setups
  const tradingSetups = [
    { value: 'bidback', label: 'Bidback' },
    { value: 'bidback-9', label: 'Bidback 9' },
    { value: 'bidback-new-bo', label: 'Bidback New $BO' }
  ]
  
  // VIX Multiplier Matrix (from Bidback Master System)
  const vixMultipliers: VIXMultiplier[] = [
    { level: 'ultra-low', range: '< 12', multiplier: 0.8 },
    { level: 'low', range: '12-15', multiplier: 0.9 },
    { level: 'normal', range: '15-20', multiplier: 1.0 },
    { level: 'elevated', range: '20-25', multiplier: 1.1 },
    { level: 'high', range: '25-35', multiplier: 1.2 },
    { level: 'extreme', range: '> 35', multiplier: 1.4 }
  ]
  
  // Breadth Multiplier Matrix
  const breadthMultipliers: BreadthMultiplier[] = [
    { condition: 'Up 4% > 1000 + T2108 < 30', multiplier: 2.0, resultingPosition: 20 },
    { condition: 'Up 4% > 500 + T2108 < 40', multiplier: 1.5, resultingPosition: 15 },
    { condition: 'Normal Breadth', multiplier: 1.0, resultingPosition: 10 },
    { condition: 'Up 4% < 200', multiplier: 0.5, resultingPosition: 5 },
    { condition: 'Up 4% < 150', multiplier: 0.3, resultingPosition: 3 },
    { condition: 'Up 4% < 100', multiplier: 0.0, resultingPosition: 0 }
  ]
  
  // Calculate VIX Level
  const getVixLevel = useCallback((vixValue: number): VIXLevel => {
    if (vixValue < 12) return 'ultra-low'
    if (vixValue < 15) return 'low'
    if (vixValue < 20) return 'normal'
    if (vixValue < 25) return 'elevated'
    if (vixValue < 35) return 'high'
    return 'extreme'
  }, [])
  
  // Calculate Market Signals
  const getMarketSignals = useCallback((): MarketSignals => {
    const bigOpportunity = (effectiveData.t2108 || 0) < 20 && (effectiveData.up4pct || 0) > 1000
    const avoidEntry = (effectiveData.up4pct || 0) < 150 || (effectiveData.t2108 || 0) > 70
    const vixRegime = effectiveData.vix ? getVixLevel(effectiveData.vix) : 'normal'
    
    // Position deterioration score
    let deterioration = 0
    if ((effectiveData.t2108 || 0) > 65) deterioration += 1
    if ((effectiveData.down4pct || 0) > (effectiveData.up4pct || 0)) deterioration += 1
    if ((effectiveData.up4pct || 0) < 150) deterioration += 2
    
    const breadthStrength: 'weak' | 'moderate' | 'strong' = 
      (effectiveData.up4pct || 0) > 1000 ? 'strong' :
      (effectiveData.up4pct || 0) > 500 ? 'moderate' : 'weak'
    
    return {
      bigOpportunity,
      avoidEntry,
      positionDeterioration: deterioration,
      vixRegime,
      breadthStrength
    }
  }, [effectiveData.t2108, effectiveData.vix, effectiveData.up4pct, effectiveData.down4pct, getVixLevel])
  
  // Calculate Current Regime
  const getCurrentRegime = useCallback(() => {
    let score = 0
    let regimeName = 'Neutral'
    
    // T2108 scoring
    if ((effectiveData.t2108 || 50) < 20) {
      score += 2
      regimeName = 'Oversold'
    } else if ((effectiveData.t2108 || 50) < 30) {
      score += 1
    } else if ((effectiveData.t2108 || 50) > 80) {
      score -= 2
      regimeName = 'Overbought'
    } else if ((effectiveData.t2108 || 50) > 70) {
      score -= 1
    }
    
    // Up 4% scoring
    if ((effectiveData.up4pct || 0) > 1000) {
      score += 2
      regimeName = score > 2 ? 'Strong Bullish' : 'Bullish'
    } else if ((effectiveData.up4pct || 0) > 500) {
      score += 1
    } else if ((effectiveData.up4pct || 0) < 150) {
      score -= 2
      regimeName = 'Weak'
    }
    
    // VIX adjustment
    if ((effectiveData.vix || 15) > 30) {
      score += 1 // High VIX adds opportunity
    } else if ((effectiveData.vix || 15) < 12) {
      score -= 1 // Ultra-low VIX reduces opportunity
    }
    
    // Final regime determination
    if (score >= 3) regimeName = 'Strong Bullish'
    else if (score >= 1) regimeName = 'Bullish'
    else if (score <= -3) regimeName = 'Bearish'
    else if (score <= -1) regimeName = 'Weak'
    else regimeName = 'Neutral'
    
    return { regime: regimeName, score: parseFloat(score.toFixed(1)) }
  }, [effectiveData.t2108, effectiveData.vix, effectiveData.up4pct])
  
  // Calculate Position Size
  const calculatePosition = useCallback((): PositionCalculation => {
    const basePosition = portfolioSize * 0.10 // 10% base position
    
    // Get VIX multiplier
    const vixLevel = effectiveData.vix ? getVixLevel(effectiveData.vix) : 'normal'
    const vixMultiplier = vixMultipliers.find(m => m.level === vixLevel)?.multiplier || 1.0
    
    // Get Breadth multiplier
    let breadthMultiplier = 1.0
    if ((effectiveData.up4pct || 0) < 100) {
      breadthMultiplier = 0.0 // NO ENTRY
    } else if ((effectiveData.up4pct || 0) < 150) {
      breadthMultiplier = 0.3
    } else if ((effectiveData.up4pct || 0) < 200) {
      breadthMultiplier = 0.5
    } else if ((effectiveData.up4pct || 0) > 1000 && (effectiveData.t2108 || 0) < 30) {
      breadthMultiplier = 2.0 // Big Opportunity
    } else if ((effectiveData.up4pct || 0) > 500 && (effectiveData.t2108 || 0) < 40) {
      breadthMultiplier = 1.5
    }
    
    const finalPosition = Math.min(basePosition * vixMultiplier * breadthMultiplier, portfolioSize * 0.30)
    const portfolioHeatPercent = (finalPosition / portfolioSize) * 100
    
    const signals = getMarketSignals()
    
    return {
      basePosition,
      vixMultiplier,
      breadthMultiplier,
      finalPosition,
      portfolioHeatPercent,
      bigOpportunity: signals.bigOpportunity,
      avoidEntry: signals.avoidEntry
    }
  }, [portfolioSize, effectiveData.vix, effectiveData.up4pct, effectiveData.t2108, getVixLevel, vixMultipliers, getMarketSignals])
  
  const calculation = calculatePosition()
  const signals = getMarketSignals()
  
  // Calculate exit parameters when we have VIX data
  const exitCalculation = effectiveData.vix ? (() => {
    const entryDate = new Date()
    const exitDate = calculateExitDate(entryDate, effectiveData.vix)
    const exitPrices = calculateExitPrices(entryPrice, effectiveData.vix) // Use user's entry price
    const vixMatrix = getVixExitMatrix(effectiveData.vix)
    
    return {
      exitDate,
      exitPrices,
      vixMatrix,
      daysToExit: vixMatrix.maxHoldDays
    }
  })() : null
  
  const handlePortfolioSizeUpdate = async () => {
    if (!portfolioSettings) return
    
    try {
      const updatedSettings = {
        ...portfolioSettings,
        portfolioSize: tempPortfolioSize,
        lastUpdated: new Date().toISOString()
      }
      
      await updateSettings(updatedSettings)
      
      // Also call prop callback if provided (for backward compatibility)
      if (onPortfolioSizeChange) {
        onPortfolioSizeChange(tempPortfolioSize)
      }
      
      setShowSettings(false)
    } catch (error) {
      console.error('Failed to update portfolio size:', error)
      // Optionally show user-facing error message
    }
  }
  
  const currentRegime = getCurrentRegime()
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-medium text-gray-900 flex items-center space-x-2">
          <Calculator className="w-6 h-6 text-blue-600" />
          <span>Position Calculator 🔢</span>
        </h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      
      {/* Breadth Data Status and Validation */}
      {breadthData.isLoading ? (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-800">Loading breadth data...</span>
          </div>
        </div>
      ) : breadthData.error ? (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <div className="font-medium mb-1">No Breadth Data Available</div>
              <div className="mb-2">{breadthData.error}</div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs">Position calculations will use default values or manual inputs only.</div>
                <button
                  onClick={() => {
                    // Navigate to Market Breadth Data Entry
                    if (window.location.hash) {
                      window.location.hash = '#/market-breadth'
                    } else {
                      console.log('Navigate to Market Breadth Data Entry')
                      alert('Navigate to Market Breadth → Data Entry to enter breadth data.')
                    }
                  }}
                  className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
                >
                  Add Data
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : !breadthData.isComplete && (breadthData.t2108 !== undefined || breadthData.vix !== undefined || breadthData.up4pct !== undefined || breadthData.down4pct !== undefined) ? (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="text-sm text-orange-800">
              <div className="font-medium mb-2">Incomplete Breadth Data (from {breadthData.loadedDate})</div>
              <div className="mb-2">Missing required data for accurate position sizing:</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {breadthData.vix === undefined && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs">VIX</span>
                  </div>
                )}
                {breadthData.t2108 === undefined && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs">T2108</span>
                  </div>
                )}
                {breadthData.up4pct === undefined && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs">Stocks Up 4%</span>
                  </div>
                )}
                {breadthData.down4pct === undefined && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs">Stocks Down 4%</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs">
                  <strong>⚠️ Position calculations may be inaccurate.</strong> 
                  Please complete breadth data entry first.
                </div>
                <button
                  onClick={() => {
                    // Navigate to Market Breadth Data Entry
                    if (window.location.hash) {
                      window.location.hash = '#/market-breadth'
                    } else {
                      // If no hash routing, could emit custom event or use callback
                      console.log('Navigate to Market Breadth Data Entry')
                      alert('Navigate to Market Breadth → Data Entry to complete the missing breadth data fields.')
                    }
                  }}
                  className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors"
                >
                  Go to Data Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : breadthData.isComplete ? (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <div className="text-sm text-green-800">
              <span className="font-medium">Breadth Data Complete</span>
              <span className="text-xs ml-2">(from {breadthData.loadedDate})</span>
            </div>
          </div>
        </div>
      ) : null}
      
      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="AAPL"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Setup</label>
          <select
            value={selectedSetup}
            onChange={(e) => setSelectedSetup(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {tradingSetups.map(setup => (
              <option key={setup.value} value={setup.value}>
                {setup.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date</label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entry Price ($)</label>
          <input
            type="number"
            value={entryPrice}
            onChange={(e) => setEntryPrice(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            step="0.01"
            placeholder="150.00"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target % of Account</label>
          <input
            type="number"
            value={targetPercent}
            onChange={(e) => setTargetPercent(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="10"
          />
          <div className="text-xs text-gray-500 mt-1">Base % (multiplied by regime)</div>
          <div className="text-xs text-blue-600">{targetPercent}% × {calculation.breadthMultiplier.toFixed(1)}x = {(targetPercent * calculation.breadthMultiplier).toFixed(1)}%</div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buy Fee ($)</label>
          <input
            type="number"
            value={buyFee}
            onChange={(e) => setBuyFee(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            step="0.01"
            placeholder="9.95"
          />
          <div className="text-xs text-gray-500 mt-1">Broker commission</div>
        </div>
      </div>
      
      {/* Main Calculation Display */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Shares */}
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {Math.floor((portfolioSize * (targetPercent * calculation.breadthMultiplier / 100)) / entryPrice)}
          </div>
          <div className="text-sm text-gray-600">Shares</div>
        </div>
        
        {/* Position Value */}
        <div className="text-center">
          <div className="text-4xl font-bold text-green-600 mb-2">
            ${(Math.floor((portfolioSize * (targetPercent * calculation.breadthMultiplier / 100)) / entryPrice) * entryPrice).toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Position Value</div>
        </div>
        
        {/* Percent of Account */}
        <div className="text-center">
          <div className="text-4xl font-bold text-purple-600 mb-2">
            {(targetPercent * calculation.breadthMultiplier).toFixed(2)}%
          </div>
          <div className="text-sm text-gray-600">% of Account</div>
        </div>
        
        {/* Risk Level */}
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500 mb-2">
            Conservative
          </div>
          <div className="text-sm text-gray-600">Risk Level</div>
        </div>
      </div>
      
      {/* Current Regime */}
      <div className="text-center mb-6">
        <div className="text-lg text-gray-700">
          Current regime: <span className="font-medium text-blue-600">{currentRegime.regime} (Score: {currentRegime.score})</span>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button className="flex items-center justify-center space-x-3 bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition-colors text-lg font-medium">
          <FileText className="w-5 h-5" />
          <span>📋 Create Order: {Math.floor((portfolioSize * (targetPercent * calculation.breadthMultiplier / 100)) / entryPrice)} shares</span>
        </button>
        
        <button className="flex items-center justify-center space-x-3 bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium">
          <Zap className="w-5 h-5" />
          <span>🚀 Execute Now (with fee)</span>
        </button>
      </div>
      
      {/* Position Details */}
      <div className="bg-white rounded-lg p-4 border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
          <div>
            <div className="text-sm text-gray-600">Position Value:</div>
            <div className="text-lg font-medium">${(Math.floor((portfolioSize * (targetPercent * calculation.breadthMultiplier / 100)) / entryPrice) * entryPrice).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Buy Fee:</div>
            <div className="text-lg font-medium text-orange-600">+${buyFee.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total Cost:</div>
            <div className="text-lg font-bold">${(Math.floor((portfolioSize * (targetPercent * calculation.breadthMultiplier / 100)) / entryPrice) * entryPrice + buyFee).toLocaleString()}</div>
          </div>
        </div>
      </div>
      
      {/* Portfolio Settings */}
      {showSettings && (
        <div className="mb-4 p-3 bg-white rounded-lg border">
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">Portfolio Size:</label>
            <input
              type="number"
              value={tempPortfolioSize}
              onChange={(e) => setTempPortfolioSize(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="100000"
              disabled={portfolioLoading}
            />
            <button
              onClick={handlePortfolioSizeUpdate}
              disabled={portfolioLoading || !portfolioSettings}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              {portfolioLoading && <Loader className="w-3 h-3 animate-spin" />}
              <span>Update</span>
            </button>
          </div>
          {portfolioError && (
            <div className="mt-2 text-red-600 text-sm">
              Error: {portfolioError}
            </div>
          )}
        </div>
      )}
      
      {/* Margin Account Position Sizing Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Margin Account Position Sizing:</div>
            <div className="mb-1">Position size is always calculated based on total account value (not available cash).</div>
            <div className="mb-1"><strong>Target % × Regime Multiplier = Final Position %</strong></div>
            <div><strong>Beispiele:</strong> 10% × 1.2x = 12% vom Gesamtwert | Auch bei nur 5% verfügbarem Cash möglich</div>
          </div>
        </div>
      </div>
      
      {/* Exit Strategy (VIX-based) */}
      {exitCalculation && (
        <div className="mt-4 bg-white rounded-lg p-4 border">
          <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <span>Exit Strategy (Holiday-Adjusted)</span>
          </h4>
          
          {/* Exit Percentage Display */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-red-50 rounded-lg border">
              <div className="text-lg font-bold text-red-600">
                {exitCalculation.exitPrices.vixMatrix.stopLossPercent}%
              </div>
              <div className="text-xs text-gray-600 mb-1">Stop Loss</div>
              <div className="text-xs font-medium text-red-700">
                ${exitCalculation.exitPrices.stopLoss.toFixed(2)}
              </div>
            </div>
            
            <div className="text-center p-3 bg-yellow-50 rounded-lg border">
              <div className="text-lg font-bold text-yellow-600">
                {exitCalculation.exitPrices.vixMatrix.profitTarget1Percent}%
              </div>
              <div className="text-xs text-gray-600 mb-1">Profit Target 1</div>
              <div className="text-xs font-medium text-yellow-700">
                ${exitCalculation.exitPrices.profitTarget1.toFixed(2)}
              </div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg border">
              <div className="text-lg font-bold text-green-600">
                {exitCalculation.exitPrices.vixMatrix.profitTarget2Percent}%
              </div>
              <div className="text-xs text-gray-600 mb-1">Profit Target 2</div>
              <div className="text-xs font-medium text-green-700">
                ${exitCalculation.exitPrices.profitTarget2.toFixed(2)}
              </div>
            </div>
            
            <div className="text-center p-3 bg-blue-50 rounded-lg border">
              <div className="text-lg font-bold text-blue-600">
                {exitCalculation.daysToExit}
              </div>
              <div className="text-xs text-gray-600 mb-1">Max Hold Days</div>
              <div className="text-xs font-medium text-blue-700">
                {exitCalculation.exitDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
          
          {/* Entry Price Reference */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Entry Price:</span>
              </div>
              <div className="text-sm font-bold text-gray-900">
                ${entryPrice.toFixed(2)}
              </div>
            </div>
          </div>
          
          {/* Time Exit Information */}
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg mb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Time Exit Date:</span>
            </div>
            <div className="text-sm font-bold text-purple-600">
              {exitCalculation.exitDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          </div>
          
          {/* VIX Regime Information */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 text-center">
              <strong>VIX Regime:</strong> {exitCalculation.exitPrices.vixMatrix.vixRange} | 
              <strong> Multiplier:</strong> {exitCalculation.exitPrices.vixMatrix.multiplier}x | 
              <strong> Current VIX:</strong> {(effectiveData.vix || 0).toFixed(1)}
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Reference */}
      <div className="mt-3 text-xs text-gray-600">
        <p><strong>VIX Levels:</strong> &lt;12 (Ultra-Low) | 12-15 (Low) | 15-20 (Normal) | 20-25 (Elevated) | 25-35 (High) | &gt;35 (Extreme)</p>
        <p><strong>Entry Rules:</strong> No entry if Up 4% &lt; 100 | Avoid if Up 4% &lt; 150 | Big Opportunity if T2108 &lt; 20 + Up 4% &gt; 1000</p>
      </div>
    </div>
  )
}