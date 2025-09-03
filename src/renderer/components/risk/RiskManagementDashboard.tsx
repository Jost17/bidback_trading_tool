import React, { useState, useEffect } from 'react'
import { Shield, Activity, Bell, TrendingUp } from 'lucide-react'
import RegimeIndicator from '../regime/RegimeIndicator'
import RiskDashboard from './RiskDashboard'
import TrueRangeChart from '../charts/TrueRangeChart'
import SignalMonitor from '../signals/SignalMonitor'
import { usePythonBackend } from '../../hooks/usePythonBackend'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface RiskManagementDashboardProps {
  className?: string
}

const RiskManagementDashboard: React.FC<RiskManagementDashboardProps> = ({
  className = '',
}) => {
  const {
    isConnected,
    connectionError,
    checkConnection,
    refreshAllData,
    currentRegime,
    performance,
    positions,
  } = usePythonBackend()

  const [activeTab, setActiveTab] = useState<'overview' | 'risk-calc' | 'signals' | 'charts'>('overview')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Connection check on mount
  useEffect(() => {
    if (!isConnected) {
      checkConnection()
    }
  }, [isConnected, checkConnection])

  // Auto-refresh data
  useEffect(() => {
    if (isConnected && autoRefresh) {
      const interval = setInterval(() => {
        refreshAllData()
      }, 30000) // Every 30 seconds

      return () => clearInterval(interval)
    }
  }, [isConnected, autoRefresh, refreshAllData])

  if (!isConnected && connectionError) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Python Backend Connection Required
          </h2>
          <p className="text-red-600 mb-4">
            {connectionError}
          </p>
          <div className="text-sm text-red-500 mb-4">
            Please ensure the Python FastAPI backend is running on port 3001
          </div>
          <button
            onClick={() => checkConnection()}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <div className="mt-4 text-lg font-medium text-gray-700">
              Connecting to Python Backend...
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Initializing risk management systems
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    {
      id: 'overview' as const,
      label: 'Overview',
      icon: Shield,
      description: 'Market regime & portfolio status',
    },
    {
      id: 'risk-calc' as const,
      label: 'Risk Calculator',
      icon: Activity,
      description: 'Position sizing & risk parameters',
    },
    {
      id: 'signals' as const,
      label: 'Signals',
      icon: Bell,
      description: 'Trading signals & alerts',
    },
    {
      id: 'charts' as const,
      label: 'True Range',
      icon: TrendingUp,
      description: 'ATR & volatility analysis',
    },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Risk Management</h1>
              <p className="text-gray-600">Regime-aware risk control and position sizing</p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-600">Python Backend Connected</span>
          </div>
        </div>

        {/* Auto-refresh Toggle */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            Auto-refresh (30s)
          </label>
          
          <button
            onClick={() => refreshAllData()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Regime Status */}
          <div className="lg:col-span-2">
            <RegimeIndicator size="medium" showDetails={false} />
          </div>

          {/* Portfolio Stats */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {positions?.length || 0}
            </div>
            <div className="text-sm text-gray-500">Active Positions</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {performance?.win_rate ? `${performance.win_rate.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-sm text-gray-500">Win Rate</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div className="flex flex-col items-start">
                    <span>{tab.label}</span>
                    <span className={`text-xs ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                      {tab.description}
                    </span>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Market Regime Detail */}
              <RegimeIndicator size="large" showDetails={true} />
              
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Performance Summary
                  </h3>
                  {performance ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {performance.total_return.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-600">Total Return</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {performance.sharpe_ratio.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">Sharpe Ratio</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {performance.max_drawdown.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-600">Max Drawdown</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {performance.total_trades}
                        </div>
                        <div className="text-sm text-gray-600">Total Trades</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      No performance data available
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Recent Signals
                  </h3>
                  <SignalMonitor 
                    className="h-64" 
                    autoRefresh={false}
                    soundEnabled={false}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'risk-calc' && (
            <RiskDashboard />
          )}

          {activeTab === 'signals' && (
            <SignalMonitor 
              autoRefresh={autoRefresh}
              soundEnabled={true}
            />
          )}

          {activeTab === 'charts' && (
            <div className="space-y-6">
              <TrueRangeChart height={500} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TrueRangeChart symbol="QQQ" height={300} />
                <TrueRangeChart symbol="IWM" height={300} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RiskManagementDashboard