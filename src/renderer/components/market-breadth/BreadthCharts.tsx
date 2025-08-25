import React, { useState, useMemo } from 'react'
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
  AreaChart,
  Area,
  ComposedChart,
  ReferenceLine
} from 'recharts'
import { 
  TrendingUp, 
  BarChart3, 
  Activity,
  Eye,
  Settings,
  Download
} from 'lucide-react'
import type { BreadthData, ChartDataPoint } from '../../../types/trading'

interface BreadthChartsProps {
  data: BreadthData[]
  height?: number
  showControls?: boolean
  onExportChart?: () => void
}

type ChartType = 'line' | 'area' | 'bar' | 'composed'
type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all'

interface ChartConfig {
  type: ChartType
  timeRange: TimeRange
  showTrendLine: boolean
  showMarketPhases: boolean
  showVolume: boolean
  smoothData: boolean
}

const TIME_RANGES = {
  '7d': { label: '7 Days', days: 7 },
  '30d': { label: '30 Days', days: 30 },
  '90d': { label: '90 Days', days: 90 },
  '1y': { label: '1 Year', days: 365 },
  'all': { label: 'All Time', days: null }
}

const CHART_TYPES = [
  { type: 'line' as ChartType, label: 'Line Chart', icon: TrendingUp },
  { type: 'area' as ChartType, label: 'Area Chart', icon: Activity },
  { type: 'bar' as ChartType, label: 'Bar Chart', icon: BarChart3 },
  { type: 'composed' as ChartType, label: 'Combined', icon: Eye }
]

export function BreadthCharts({ 
  data, 
  height = 400, 
  showControls = true,
  onExportChart 
}: BreadthChartsProps) {
  // Chart configuration state
  const [config, setConfig] = useState<ChartConfig>({
    type: 'line',
    timeRange: '90d',
    showTrendLine: true,
    showMarketPhases: true,
    showVolume: false,
    smoothData: false
  })
  
  const [showSettings, setShowSettings] = useState(false)

  // Process and filter data based on time range
  const processedData = useMemo((): ChartDataPoint[] => {
    if (!data || data.length === 0) return []

    // Sort data by date
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Apply time range filter
    let filteredData = sortedData
    if (config.timeRange !== 'all') {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - TIME_RANGES[config.timeRange].days!)
      filteredData = sortedData.filter(item => new Date(item.date) >= cutoffDate)
    }

    // Transform to chart data format
    const chartData = filteredData.map((item, index) => {
      const date = new Date(item.date)
      return {
        date: item.date,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date.toLocaleDateString(),
        value: item.breadthScore,
        breadthScore: item.breadthScore,
        trendStrength: item.trendStrength || 0,
        marketPhase: item.marketPhase || 'Unknown',
        normalizedScore: item.breadth_score_normalized || item.breadthScore,
        // Volume proxies (using advancing/declining issues if available)
        upVolume: item.advancingIssues || 0,
        downVolume: item.decliningIssues || 0,
        totalVolume: (item.advancingIssues || 0) + (item.decliningIssues || 0),
        // Additional metrics
        t2108: item.t2108,
        dataSource: item.dataSource,
        index
      }
    })

    // Apply smoothing if enabled
    if (config.smoothData && chartData.length > 2) {
      return applyMovingAverage(chartData, 3) // 3-period moving average
    }

    return chartData
  }, [data, config.timeRange, config.smoothData])

  // Apply moving average smoothing
  const applyMovingAverage = (data: ChartDataPoint[], period: number): ChartDataPoint[] => {
    return data.map((point, index) => {
      if (index < period - 1) return point

      const window = data.slice(index - period + 1, index + 1)
      const avgValue = window.reduce((sum, p) => sum + (p.value || 0), 0) / period
      const avgTrendStrength = window.reduce((sum, p) => sum + (p.trendStrength || 0), 0) / period

      return {
        ...point,
        value: Number(avgValue.toFixed(2)),
        breadthScore: Number(avgValue.toFixed(2)),
        trendStrength: Number(avgTrendStrength.toFixed(2)),
        smoothed: true
      }
    })
  }

  // Calculate trend line data
  const trendLineData = useMemo(() => {
    if (!config.showTrendLine || processedData.length < 2) return null

    // Simple linear regression
    const n = processedData.length
    const sumX = processedData.reduce((sum, _, i) => sum + i, 0)
    const sumY = processedData.reduce((sum, point) => sum + (point.value || 0), 0)
    const sumXY = processedData.reduce((sum, point, i) => sum + i * (point.value || 0), 0)
    const sumXX = processedData.reduce((sum, _, i) => sum + i * i, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return processedData.map((point, index) => ({
      ...point,
      trendValue: slope * index + intercept
    }))
  }, [processedData, config.showTrendLine])

  // Market phase colors
  const getMarketPhaseColor = (phase: string) => {
    switch (phase?.toUpperCase()) {
      case 'BULL': return '#10b981'
      case 'BEAR': return '#ef4444'
      case 'NEUTRAL': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{data.fullDate}</p>
        
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.name}:</span>
            <span>{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</span>
          </div>
        ))}
        
        {data.marketPhase && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-2 text-sm">
              <span className="font-medium">Market Phase:</span>
              <span 
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ 
                  backgroundColor: getMarketPhaseColor(data.marketPhase) + '20',
                  color: getMarketPhaseColor(data.marketPhase)
                }}
              >
                {data.marketPhase}
              </span>
            </div>
          </div>
        )}

        {data.dataSource && (
          <div className="text-xs text-gray-500 mt-1">
            Source: {data.dataSource}
          </div>
        )}
      </div>
    )
  }

  // Render appropriate chart based on config
  const renderChart = () => {
    const commonProps = {
      data: trendLineData || processedData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    }

    switch (config.type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate" 
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Area
              type="monotone"
              dataKey="value"
              name="Breadth Score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            
            {config.showTrendLine && trendLineData && (
              <Line
                type="monotone"
                dataKey="trendValue"
                name="Trend Line"
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
            )}
            
            {/* Reference lines for market phases */}
            <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="2 2" />
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate" 
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Bar 
              dataKey="value" 
              name="Breadth Score"
              fill="#3b82f6"
              radius={[2, 2, 0, 0]}
            />
            
            {config.showVolume && (
              <Bar 
                dataKey="totalVolume" 
                name="Total Issues"
                fill="#10b981"
                yAxisId="volume"
                opacity={0.6}
              />
            )}
          </BarChart>
        )

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate" 
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <YAxis yAxisId="strength" orientation="right" stroke="#10b981" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Area
              type="monotone"
              dataKey="value"
              name="Breadth Score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.2}
            />
            
            <Line
              type="monotone"
              dataKey="trendStrength"
              name="Trend Strength"
              stroke="#10b981"
              strokeWidth={2}
              yAxisId="strength"
            />
            
            {config.showTrendLine && trendLineData && (
              <Line
                type="monotone"
                dataKey="trendValue"
                name="Trend Line"
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
            )}
          </ComposedChart>
        )

      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="displayDate" 
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Line
              type="monotone"
              dataKey="value"
              name="Breadth Score"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#3b82f6' }}
            />
            
            {config.showTrendLine && trendLineData && (
              <Line
                type="monotone"
                dataKey="trendValue"
                name="Trend Line"
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
            )}
            
            {/* Reference lines */}
            <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="2 2" label="Neutral" />
          </LineChart>
        )
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="font-medium">No chart data available</p>
          <p className="text-sm">Add breadth data to see visualizations</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chart Controls */}
      {showControls && (
        <div className="flex items-center justify-between">
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            {Object.entries(TIME_RANGES).map(([key, range]) => (
              <button
                key={key}
                onClick={() => setConfig(prev => ({ ...prev, timeRange: key as TimeRange }))}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  config.timeRange === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Chart Type and Settings */}
          <div className="flex items-center space-x-2">
            {/* Chart Type Selector */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {CHART_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setConfig(prev => ({ ...prev, type }))}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-sm transition-colors ${
                    config.type === type
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-md transition-colors ${
                showSettings 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Chart Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Export Button */}
            {onExportChart && (
              <button
                onClick={onExportChart}
                className="p-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                title="Export Chart"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chart Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Chart Settings</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.showTrendLine}
                onChange={(e) => setConfig(prev => ({ ...prev, showTrendLine: e.target.checked }))}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">Show Trend Line</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.showMarketPhases}
                onChange={(e) => setConfig(prev => ({ ...prev, showMarketPhases: e.target.checked }))}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">Market Phases</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.showVolume}
                onChange={(e) => setConfig(prev => ({ ...prev, showVolume: e.target.checked }))}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">Show Volume</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.smoothData}
                onChange={(e) => setConfig(prev => ({ ...prev, smoothData: e.target.checked }))}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-gray-700">Smooth Data</span>
            </label>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="bg-white rounded-lg border" style={{ height: height + 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Chart Summary Stats */}
      {processedData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg border text-center">
            <div className="font-semibold text-gray-900">
              {processedData[processedData.length - 1]?.value?.toFixed(1) || '--'}
            </div>
            <div className="text-gray-600">Latest Score</div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border text-center">
            <div className="font-semibold text-gray-900">
              {(processedData.reduce((sum, p) => sum + (p.value || 0), 0) / processedData.length).toFixed(1)}
            </div>
            <div className="text-gray-600">Average</div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border text-center">
            <div className="font-semibold text-gray-900">
              {Math.max(...processedData.map(p => p.value || 0)).toFixed(1)}
            </div>
            <div className="text-gray-600">Highest</div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border text-center">
            <div className="font-semibold text-gray-900">
              {Math.min(...processedData.map(p => p.value || 0)).toFixed(1)}
            </div>
            <div className="text-gray-600">Lowest</div>
          </div>
        </div>
      )}
    </div>
  )
}