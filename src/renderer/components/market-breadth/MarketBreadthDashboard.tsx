import React, { useState, useEffect, useCallback } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Plus, 
  Upload,
  RefreshCw,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useBreadthCalculator } from '../../hooks/useBreadthCalculator'
import { BreadthCharts } from './BreadthCharts'
import { DataEntryForm } from './DataEntryForm'
import { HistoricalDataTable } from './HistoricalDataTable'
import { BreadthScoreCalculator } from './BreadthScoreCalculator'
import { CSVManager } from './CSVManager'
import { CSVImportModal } from './CSVImportModal'
import type { BreadthData, CSVImportResult } from '../../../types/trading'

interface DashboardStats {
  currentBreadthScore: number | null
  marketPhase: string
  trendStrength: number | null
  totalRecords: number
  lastUpdated: string | null
}

interface ActiveView {
  type: 'dashboard' | 'entry' | 'table' | 'calculator' | 'csv'
  title: string
}

const VIEWS: ActiveView[] = [
  { type: 'dashboard', title: 'Dashboard' },
  { type: 'entry', title: 'Manual Entry' },
  { type: 'table', title: 'Historical Data' },
  { type: 'calculator', title: 'Calculator' },
  { type: 'csv', title: 'Import/Export' }
]

export function MarketBreadthDashboard() {
  // State management
  const [activeView, setActiveView] = useState<ActiveView['type']>('dashboard')
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    currentBreadthScore: null,
    marketPhase: 'Unknown',
    trendStrength: null,
    totalRecords: 0,
    lastUpdated: null
  })
  const [recentData, setRecentData] = useState<BreadthData[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Breadth calculator hook
  const {
    latestResult,
    calculateRealTime,
    isLoading,
    error: calculatorError
  } = useBreadthCalculator({
    defaultAlgorithm: 'six_factor',
    autoCalculate: false
  })

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    setIsLoadingStats(true)
    setError(null)

    try {
      // Get recent breadth data
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const data = await window.tradingAPI.getBreadthData(startDate, endDate)
      setRecentData(data.slice(0, 10)) // Keep last 10 entries

      // Update stats
      const latestEntry = data[0]
      setStats({
        currentBreadthScore: latestEntry?.breadthScore || null,
        marketPhase: latestEntry?.marketPhase || 'Unknown',
        trendStrength: latestEntry?.trendStrength || null,
        totalRecords: data.length,
        lastUpdated: latestEntry?.date || null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  // Handle real-time calculation
  const handleRealTimeUpdate = useCallback(async () => {
    try {
      await calculateRealTime()
      await loadDashboardData()
    } catch (err) {
      setError('Failed to update real-time data')
    }
  }, [calculateRealTime, loadDashboardData])

  // Handle data entry success
  const handleDataEntrySuccess = useCallback(() => {
    loadDashboardData()
    setActiveView('dashboard')
  }, [loadDashboardData])

  // Handle CSV import success
  const handleCSVImportComplete = useCallback((result: CSVImportResult) => {
    console.log('CSV Import completed:', result)
    loadDashboardData()
    setIsCSVImportOpen(false)
  }, [loadDashboardData])

  // Load data on component mount
  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Format market phase color
  const getMarketPhaseColor = (phase: string) => {
    switch (phase.toUpperCase()) {
      case 'BULL':
        return 'text-green-600 bg-green-50'
      case 'BEAR':
        return 'text-red-600 bg-red-50'
      case 'NEUTRAL':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  // Format score display
  const formatScore = (score: number | null) => {
    if (score === null || score === undefined) return '--'
    return score.toFixed(1)
  }

  // Format percentage
  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return '--'
    return `${value.toFixed(0)}%`
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'entry':
        return <DataEntryForm onSuccess={handleDataEntrySuccess} />
      case 'table':
        return <HistoricalDataTable onDataChange={loadDashboardData} />
      case 'calculator':
        return <BreadthScoreCalculator onCalculation={handleDataEntrySuccess} />
      case 'csv':
        return <CSVManager onImportSuccess={handleDataEntrySuccess} />
      default:
        return null
    }
  }

  if (activeView !== 'dashboard') {
    return (
      <div className="space-y-6">
        {/* Header with navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveView('dashboard')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Market Breadth</span>
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
            {VIEWS.map((view) => (
              <button
                key={view.type}
                onClick={() => setActiveView(view.type)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === view.type
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {view.title}
              </button>
            ))}
          </div>
        </div>

        {/* Active view content */}
        {renderActiveView()}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            <span>Market Breadth Analysis</span>
          </h1>
          <p className="text-gray-600 mt-1">
            6-Factor Breadth Score Calculator & Historical Analysis
            {stats.lastUpdated && (
              <span className="ml-2 text-sm text-gray-500">
                Last updated: {new Date(stats.lastUpdated).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleRealTimeUpdate}
            disabled={isLoading || isLoadingStats}
            className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isLoadingStats ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setActiveView('entry')}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>
          <button
            onClick={() => setIsCSVImportOpen(true)}
            className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {(error || calculatorError) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-2 text-red-700">{error || calculatorError}</p>
        </div>
      )}

      {/* View Navigation */}
      <div className="bg-white rounded-lg shadow-sm border p-1">
        <div className="flex space-x-1">
          {VIEWS.map((view) => (
            <button
              key={view.type}
              onClick={() => setActiveView(view.type)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeView === view.type
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {view.title}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Breadth Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatScore(stats.currentBreadthScore)}
              </p>
              <p className="text-sm text-gray-500">
                {stats.currentBreadthScore ? 
                  (latestResult?.confidence ? `${(latestResult.confidence * 100).toFixed(0)}% confidence` : 'Calculated') :
                  'Not calculated yet'
                }
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Market Phase</p>
              <div className="flex items-center space-x-2">
                <p className={`text-2xl font-bold px-2 py-1 rounded-md ${getMarketPhaseColor(stats.marketPhase)}`}>
                  {stats.marketPhase}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                {latestResult?.market_condition?.trend_direction || 'No trend data'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-full">
              {stats.marketPhase.toUpperCase() === 'BULL' ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : stats.marketPhase.toUpperCase() === 'BEAR' ? (
                <TrendingDown className="w-6 h-6 text-red-600" />
              ) : (
                <Activity className="w-6 h-6 text-gray-600" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trend Strength</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(stats.trendStrength)}
              </p>
              <p className="text-sm text-gray-500">
                {latestResult?.market_condition?.strength || 'Not calculated'}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Data Records</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRecords}</p>
              <p className="text-sm text-gray-500">
                {stats.totalRecords > 0 ? 'Historical data available' : 'No historical data'}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <BarChart3 className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Breadth Score History</span>
          </h2>
          <div className="flex space-x-2">
            <button className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition-colors">
              30D
            </button>
            <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
              90D
            </button>
            <button className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition-colors">
              1Y
            </button>
          </div>
        </div>
        
        {/* Chart Component */}
        {recentData.length > 0 ? (
          <BreadthCharts 
            data={recentData}
            height={300}
          />
        ) : (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="font-medium">No Market Breadth Data Available</p>
              <p className="text-sm mb-4">Add your first market breadth entry to see the chart</p>
              <button
                onClick={() => setActiveView('entry')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add First Entry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Entries Table */}
      {recentData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Recent Entries</span>
            </h2>
            <button
              onClick={() => setActiveView('table')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Breadth Score</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Market Phase</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Trend Strength</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentData.slice(0, 5).map((entry, index) => (
                  <tr key={entry.id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {formatScore(entry.breadthScore)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.marketPhase?.toUpperCase() === 'BULL' ? 'bg-green-100 text-green-800' :
                        entry.marketPhase?.toUpperCase() === 'BEAR' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.marketPhase || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatPercentage(entry.trendStrength)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.dataSource === 'manual' ? 'bg-blue-100 text-blue-800' :
                        entry.dataSource === 'imported' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.dataSource}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isCSVImportOpen}
        onClose={() => setIsCSVImportOpen(false)}
        onImportComplete={handleCSVImportComplete}
      />
    </div>
  )
}