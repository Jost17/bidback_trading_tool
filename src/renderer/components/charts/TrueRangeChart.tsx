import React, { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
} from 'recharts'
import { Calendar, TrendingUp, Activity } from 'lucide-react'
import { useRiskManagement } from '../../hooks/usePythonBackend'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface TrueRangeChartProps {
  symbol?: string
  className?: string
  height?: number
}

interface ChartDataPoint {
  date: string
  high: number
  low: number
  close: number
  true_range: number
  atr_14: number
  atr_21: number
  formattedDate: string
}

const TrueRangeChart: React.FC<TrueRangeChartProps> = ({
  symbol = 'SPY',
  className = '',
  height = 400,
}) => {
  const { fetchTrueRangeData } = useRiskManagement()
  
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState(symbol)
  const [timeframe, setTimeframe] = useState<'3M' | '6M' | '1Y'>('6M')
  const [chartType, setChartType] = useState<'line' | 'bar' | 'composed'>('composed')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const days = timeframe === '3M' ? 90 : timeframe === '6M' ? 180 : 365
        const rawData = await fetchTrueRangeData(selectedSymbol, days)
        
        const chartData: ChartDataPoint[] = rawData.map(item => ({
          ...item,
          formattedDate: new Date(item.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        }))

        setData(chartData)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch True Range data')
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedSymbol, timeframe, fetchTrueRangeData])

  const getCurrentStats = () => {
    if (!data.length) return null

    const latest = data[data.length - 1]
    const previous = data[data.length - 2]
    
    return {
      currentATR14: latest?.atr_14 || 0,
      currentATR21: latest?.atr_21 || 0,
      currentTrueRange: latest?.true_range || 0,
      atrChange: previous ? 
        ((latest.atr_14 - previous.atr_14) / previous.atr_14) * 100 : 0,
      avgTrueRange: data.reduce((sum, d) => sum + d.true_range, 0) / data.length,
    }
  }

  const stats = getCurrentStats()

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`
  const formatPercentage = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="formattedDate" 
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="atr_14"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="ATR 14"
            />
            <Line
              type="monotone"
              dataKey="atr_21"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="ATR 21"
            />
          </LineChart>
        )

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="formattedDate" 
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="true_range"
              fill="#8b5cf6"
              name="True Range"
              opacity={0.8}
            />
          </BarChart>
        )

      case 'composed':
      default:
        return (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="formattedDate" 
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="true_range"
              fill="#8b5cf6"
              name="True Range"
              opacity={0.6}
            />
            <Line
              type="monotone"
              dataKey="atr_14"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="ATR 14"
            />
            <Line
              type="monotone"
              dataKey="atr_21"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="ATR 21"
            />
          </ComposedChart>
        )
    }
  }

  return (
    <div className={`bg-white p-6 rounded-lg border shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Activity className="w-5 h-5 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            True Range Analysis - {selectedSymbol}
          </h3>
        </div>

        <div className="flex items-center space-x-4">
          {/* Symbol Input */}
          <input
            type="text"
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === 'Enter' && setSelectedSymbol(selectedSymbol)}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Symbol"
          />

          {/* Chart Type Selector */}
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="composed">Combined</option>
            <option value="line">Lines Only</option>
            <option value="bar">Bars Only</option>
          </select>

          {/* Timeframe Selector */}
          <div className="flex bg-gray-100 rounded-md">
            {(['3M', '6M', '1Y'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Current ATR (14)</div>
            <div className="text-lg font-bold text-blue-600">
              {formatCurrency(stats.currentATR14)}
            </div>
          </div>

          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Current ATR (21)</div>
            <div className="text-lg font-bold text-red-600">
              {formatCurrency(stats.currentATR21)}
            </div>
          </div>

          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Current True Range</div>
            <div className="text-lg font-bold text-purple-600">
              {formatCurrency(stats.currentTrueRange)}
            </div>
          </div>

          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">ATR Change</div>
            <div className={`text-lg font-bold flex items-center ${
              stats.atrChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`w-4 h-4 mr-1 ${
                stats.atrChange < 0 ? 'rotate-180' : ''
              }`} />
              {formatPercentage(stats.atrChange)}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <LoadingSpinner size="large" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-red-600 mr-2" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        {data.length > 0 && (
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <div className="text-gray-500">No data available</div>
              <div className="text-sm text-gray-400">
                Try a different symbol or timeframe
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Info */}
      <div className="mt-4 text-xs text-gray-500">
        <p>
          <strong>True Range:</strong> The greatest of: (High - Low), |High - Previous Close|, |Low - Previous Close|
        </p>
        <p className="mt-1">
          <strong>ATR:</strong> Average True Range over the specified period (14 or 21 days)
        </p>
      </div>
    </div>
  )
}

export default TrueRangeChart