import React, { useState, useCallback, useEffect } from 'react'
import { 
  Target, 
  BarChart3, 
  TrendingUp, 
  DollarSign,
  Activity,
  AlertTriangle,
  Zap,
  Calendar,
  Home,
  Settings
} from 'lucide-react'
import { PlannedTrades } from './PlannedTrades'
import { OpenPositions } from './OpenPositions'
import { PortfolioSettings } from '../settings/PortfolioSettings'
import { HolidayCalendar } from './HolidayCalendar'
import { TradeEntryForm } from './TradeEntryForm'
import { usePortfolio } from '../../contexts/PortfolioContext'

interface TradingDashboardProps {
  onNavigateHome?: () => void
}

type ActiveView = 'dashboard' | 'entry' | 'planned' | 'positions' | 'settings' | 'calendar'

const VIEWS = [
  { type: 'dashboard' as const, title: 'Dashboard', icon: BarChart3 },
  { type: 'entry' as const, title: 'Trade Entry', icon: Zap },
  { type: 'planned' as const, title: 'Planned Trades', icon: Target },
  { type: 'positions' as const, title: 'Open Positions', icon: TrendingUp },
  { type: 'calendar' as const, title: 'Holiday Calendar', icon: Calendar },
  { type: 'settings' as const, title: 'Settings', icon: Settings }
]

interface TradingStats {
  plannedTrades: number
  openPositions: number
  totalValue: number
  unrealizedPL: number
  todaysPL: number
  portfolioHeat: number
}

export function TradingDashboard({ onNavigateHome }: TradingDashboardProps) {
  // Use global portfolio context
  const { settings: globalPortfolioSettings, isLoading: portfolioLoading } = usePortfolio()
  
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
  const [stats, setStats] = useState<TradingStats>({
    plannedTrades: 2,
    openPositions: 2,
    totalValue: 23456,
    unrealizedPL: 1482.60,
    todaysPL: 234.50,
    portfolioHeat: 23.5
  })
  const [isLoading, setIsLoading] = useState(false)
  
  // Use global portfolio settings with fallback
  const portfolioSettings = globalPortfolioSettings || {
    portfolioSize: 100000,
    baseSizePercentage: 10,
    maxHeatPercentage: 80,
    maxPositions: 8,
    tradingSetups: [],
    riskPerTrade: 2,
    useKellySizing: false,
    enablePositionScaling: true,
    lastUpdated: new Date().toISOString()
  }
  
  useEffect(() => {
    // Load dashboard data on mount
    loadDashboardStats()
  }, [])
  
  const loadDashboardStats = useCallback(async () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      // In real implementation, this would fetch from backend
      setStats({
        plannedTrades: 2,
        openPositions: 2,
        totalValue: 23456,
        unrealizedPL: 1482.60,
        todaysPL: 234.50,
        portfolioHeat: 23.5
      })
      setIsLoading(false)
    }, 500)
  }, [])
  
  // Portfolio settings are now handled globally via PortfolioContext
  
  const handleTradeExecuted = useCallback((tradeId: number) => {
    // Refresh stats when trade is executed
    loadDashboardStats()
    console.log('Trade executed:', tradeId)
  }, [loadDashboardStats])
  
  const handlePositionClosed = useCallback((positionId: number) => {
    // Refresh stats when position is closed
    loadDashboardStats()
    console.log('Position closed:', positionId)
  }, [loadDashboardStats])
  
  const renderActiveView = () => {
    switch (activeView) {
      case 'entry':
        return <TradeEntryForm />
      case 'planned':
        return (
          <PlannedTrades 
            onTradeExecuted={handleTradeExecuted}
            onTradeDeleted={() => loadDashboardStats()}
          />
        )
      case 'positions':
        return (
          <OpenPositions 
            onPositionUpdate={() => loadDashboardStats()}
            onPositionClosed={handlePositionClosed}
          />
        )
      case 'settings':
        return (
          <PortfolioSettings />
        )
      case 'calendar':
        return (
          <HolidayCalendar 
            onBack={() => setActiveView('dashboard')}
          />
        )
      default:
        return null
    }
  }
  
  // Non-dashboard views
  if (activeView !== 'dashboard') {
    return (
      <div className="space-y-6">
        {/* Header with navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onNavigateHome && (
              <>
                <button
                  onClick={onNavigateHome}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <Home className="w-4 h-4" />
                  <span className="font-medium">Home</span>
                </button>
                <span className="text-gray-400">/</span>
              </>
            )}
            <button
              onClick={() => setActiveView('dashboard')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <Target className="w-5 h-5" />
              <span className="font-medium">Trading</span>
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-semibold">
              {VIEWS.find(v => v.type === activeView)?.title}
            </span>
          </div>
        </div>

        {/* View Navigation */}
        <div className="bg-white rounded-lg shadow-sm border p-1">
          <div className="flex space-x-1">
            {VIEWS.map((view) => {
              const IconComponent = view.icon
              return (
                <button
                  key={view.type}
                  onClick={() => setActiveView(view.type)}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeView === view.type
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{view.title}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Active view content */}
        {renderActiveView()}
      </div>
    )
  }
  
  // Dashboard view
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-green-600 to-blue-700 text-white rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Target className="w-9 h-9" />
              <span>Bidback Trading Dashboard</span>
            </h1>
            <p className="text-green-100 mt-2 text-lg">Order Management & Position Tracking System</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-100">Portfolio Heat</p>
            <p className="text-2xl font-semibold flex items-center justify-end space-x-2">
              <span className={`w-3 h-3 rounded-full ${
                stats.portfolioHeat > 60 ? 'bg-red-400 animate-pulse' :
                stats.portfolioHeat > 40 ? 'bg-yellow-400' : 'bg-green-400'
              }`}></span>
              <span>{stats.portfolioHeat}%</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Trading Overview</h2>
          <p className="text-gray-600 mt-1">
            Real-time position management with Bidback Master System integration
          </p>
        </div>
      </div>
      
      {/* View Navigation */}
      <div className="bg-white rounded-lg shadow-sm border p-1">
        <div className="flex space-x-1">
          {VIEWS.map((view) => {
            const IconComponent = view.icon
            return (
              <button
                key={view.type}
                onClick={() => setActiveView(view.type)}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === view.type
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{view.title}</span>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Planned Trades</p>
              <p className="text-2xl font-bold text-blue-600">{stats.plannedTrades}</p>
            </div>
            <Target className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Open Positions</p>
              <p className="text-2xl font-bold text-green-600">{stats.openPositions}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats.totalValue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-gray-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unrealized P&L</p>
              <p className={`text-2xl font-bold ${
                stats.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${stats.unrealizedPL >= 0 ? '+' : ''}
                {stats.unrealizedPL.toLocaleString(undefined, {maximumFractionDigits: 0})}
              </p>
            </div>
            {stats.unrealizedPL >= 0 ? (
              <TrendingUp className="w-8 h-8 text-green-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's P&L</p>
              <p className={`text-2xl font-bold ${
                stats.todaysPL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${stats.todaysPL >= 0 ? '+' : ''}
                {stats.todaysPL}
              </p>
            </div>
            <Zap className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio Heat</p>
              <p className={`text-2xl font-bold ${
                stats.portfolioHeat > 60 ? 'text-red-600' :
                stats.portfolioHeat > 40 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {stats.portfolioHeat}%
              </p>
            </div>
            <Activity className={`w-8 h-8 ${
              stats.portfolioHeat > 60 ? 'text-red-600' :
              stats.portfolioHeat > 40 ? 'text-yellow-600' : 'text-green-600'
            }`} />
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveView('planned')}
            className="flex items-center justify-center space-x-3 p-4 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Target className="w-6 h-6 text-blue-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">View Planned Trades</div>
              <div className="text-sm text-gray-600">{stats.plannedTrades} trades ready</div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveView('positions')}
            className="flex items-center justify-center space-x-3 p-4 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
          >
            <TrendingUp className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Monitor Positions</div>
              <div className="text-sm text-gray-600">{stats.openPositions} positions open</div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveView('settings')}
            className="flex items-center justify-center space-x-3 p-4 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <Settings className="w-6 h-6 text-purple-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Portfolio Settings</div>
              <div className="text-sm text-gray-600">Configure Bidback</div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveView('calendar')}
            className="flex items-center justify-center space-x-3 p-4 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <Calendar className="w-6 h-6 text-orange-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Holiday Calendar</div>
              <div className="text-sm text-gray-600">VIX Exit Matrix & Holidays</div>
            </div>
          </button>
        </div>
      </div>
      
      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bidback System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <div>
              <div className="font-medium text-gray-900">Position Calculator</div>
              <div className="text-sm text-gray-600">Active - VIX & Breadth integration working</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div>
              <div className="font-medium text-gray-900">Order Management</div>
              <div className="text-sm text-gray-600">Demo Mode - Manual execution only</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <div>
              <div className="font-medium text-gray-900">IB Integration</div>
              <div className="text-sm text-gray-600">Planned - Phase 4 implementation</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}