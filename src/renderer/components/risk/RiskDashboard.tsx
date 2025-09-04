import React, { useState, useEffect } from 'react'
import { Shield, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Calculator } from 'lucide-react'
import { useRiskManagement, usePositionManagement } from '../../hooks/usePythonBackend'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { usePortfolio } from '../../contexts/PortfolioContext'

interface RiskDashboardProps {
  className?: string
}

interface RiskCalculation {
  symbol: string
  entryPrice: number
  accountBalance: number
  riskPercentage: number
}

const RiskDashboard: React.FC<RiskDashboardProps> = ({ className = '' }) => {
  const { calculateRisk } = useRiskManagement()
  const { positions, loading: positionsLoading } = usePositionManagement()
  const { settings: portfolioSettings } = usePortfolio()

  const [riskCalc, setRiskCalc] = useState<RiskCalculation>({
    symbol: 'SPY',
    entryPrice: 450,
    accountBalance: portfolioSettings?.portfolioSize || 100000,
    riskPercentage: portfolioSettings?.riskPerTrade || 1,
  })

  const [riskParams, setRiskParams] = useState<any>(null)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update risk calculation when portfolio settings change
  useEffect(() => {
    if (portfolioSettings) {
      setRiskCalc(prev => ({
        ...prev,
        accountBalance: portfolioSettings.portfolioSize,
        riskPercentage: portfolioSettings.riskPerTrade || 1
      }))
    }
  }, [portfolioSettings])

  // Calculate risk on form changes
  useEffect(() => {
    const calculateCurrentRisk = async () => {
      if (!riskCalc.symbol || !riskCalc.entryPrice || !riskCalc.accountBalance) return

      setCalculating(true)
      setError(null)

      try {
        const params = await calculateRisk(
          riskCalc.symbol,
          riskCalc.entryPrice,
          riskCalc.accountBalance,
          riskCalc.riskPercentage
        )
        setRiskParams(params)
      } catch (err: any) {
        setError(err.message || 'Failed to calculate risk parameters')
        setRiskParams(null)
      } finally {
        setCalculating(false)
      }
    }

    const debounceTimer = setTimeout(calculateCurrentRisk, 500)
    return () => clearTimeout(debounceTimer)
  }, [riskCalc, calculateRisk])

  // Calculate portfolio risk
  const calculatePortfolioRisk = () => {
    if (!positions.length) return null

    const totalValue = positions.reduce((sum, pos) => {
      return sum + (pos.quantity * pos.current_price)
    }, 0)

    const totalRisk = positions.reduce((sum, pos) => {
      const positionValue = pos.quantity * pos.current_price
      const riskAmount = positionValue - (pos.quantity * pos.stop_loss)
      return sum + Math.max(0, riskAmount)
    }, 0)

    return {
      totalValue,
      totalRisk,
      riskPercentage: totalValue > 0 ? (totalRisk / totalValue) * 100 : 0,
    }
  }

  const portfolioRisk = calculatePortfolioRisk()

  const handleInputChange = (field: keyof RiskCalculation, value: number | string) => {
    setRiskCalc(prev => ({
      ...prev,
      [field]: field === 'symbol' ? value : Number(value),
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900">Risk Management</h2>
        </div>
        <div className="text-sm text-gray-500">
          Dynamic risk calculations and position sizing
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Calculator */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center mb-4">
            <Calculator className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Position Risk Calculator</h3>
          </div>

          <div className="space-y-4">
            {/* Input Form */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={riskCalc.symbol}
                  onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SPY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Price ($)
                </label>
                <input
                  type="number"
                  // Removed step constraint for flexible price input
                  value={riskCalc.entryPrice}
                  onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Balance ($)
                </label>
                <input
                  type="number"
                  // Removed step constraint for flexible balance input
                  value={riskCalc.accountBalance}
                  onChange={(e) => handleInputChange('accountBalance', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Risk % per Trade
                </label>
                <input
                  type="number"
                  // Removed HTML5 validation constraints for flexible risk input
                  value={riskCalc.riskPercentage}
                  onChange={(e) => handleInputChange('riskPercentage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Risk Calculation Results */}
            {calculating && (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="small" />
                <span className="ml-2 text-sm text-gray-500">Calculating...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              </div>
            )}

            {riskParams && !calculating && (
              <div className="bg-gray-50 rounded-md p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Position Size:</span>
                    <div className="font-semibold text-gray-900">
                      {riskParams.position_size.toFixed(0)} shares
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-600">Investment:</span>
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(riskParams.position_size * riskCalc.entryPrice)}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-600">Stop Loss:</span>
                    <div className="font-semibold text-red-600">
                      {formatCurrency(riskParams.stop_loss)}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-600">Profit Target:</span>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(riskParams.profit_target)}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-600">Max Risk:</span>
                    <div className="font-semibold text-red-600">
                      {formatCurrency(
                        riskParams.position_size * (riskCalc.entryPrice - riskParams.stop_loss)
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-600">Risk/Reward:</span>
                    <div className="font-semibold text-gray-900">
                      1:{((riskParams.profit_target - riskCalc.entryPrice) / 
                          (riskCalc.entryPrice - riskParams.stop_loss)).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Risk Summary */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center mb-4">
            <DollarSign className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Portfolio Risk</h3>
          </div>

          {positionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="small" />
              <span className="ml-2 text-sm text-gray-500">Loading positions...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {portfolioRisk ? (
                <>
                  {/* Risk Metrics */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(portfolioRisk.totalValue)}
                      </div>
                      <div className="text-sm text-gray-600">Total Value</div>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(portfolioRisk.totalRisk)}
                      </div>
                      <div className="text-sm text-gray-600">Total Risk</div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatPercentage(portfolioRisk.riskPercentage)}
                      </div>
                      <div className="text-sm text-gray-600">Risk %</div>
                    </div>
                  </div>

                  {/* Risk Warning */}
                  {portfolioRisk.riskPercentage > 5 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                        <span className="text-sm text-red-800">
                          Portfolio risk exceeds 5%. Consider reducing position sizes.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Position List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-700">Active Positions</h4>
                    {positions.map((position) => {
                      const positionValue = position.quantity * position.current_price
                      const unrealizedPnL = position.unrealized_pnl
                      const isProfitable = unrealizedPnL > 0

                      return (
                        <div
                          key={position.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                        >
                          <div className="flex items-center">
                            {isProfitable ? (
                              <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500 mr-2" />
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                {position.symbol}
                              </div>
                              <div className="text-xs text-gray-500">
                                {position.quantity} shares @ {formatCurrency(position.current_price)}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`font-semibold ${
                                isProfitable ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {formatCurrency(unrealizedPnL)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatCurrency(positionValue)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No active positions</div>
                  <div className="text-sm text-gray-500">
                    Open positions to see portfolio risk analysis
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RiskDashboard