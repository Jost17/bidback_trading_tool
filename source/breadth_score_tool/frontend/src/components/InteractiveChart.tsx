import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { Calendar, TrendingUp, BarChart3 } from 'lucide-react'
import { clsx } from 'clsx'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
)

interface BreadthDataPoint {
  date: string
  breadthScore: number
}

interface InteractiveChartProps {
  className?: string
}

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all'

export const InteractiveChart: React.FC<InteractiveChartProps> = ({ className }) => {
  const [data, setData] = useState<BreadthDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const chartRef = useRef<ChartJS<'line'>>(null)

  useEffect(() => {
    fetchChartData()
  }, [timeRange])

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Calculate date range based on selection
      const endDate = new Date()
      const startDate = new Date()
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
        case 'all':
          startDate.setFullYear(2007) // All available data
          break
      }

      const response = await fetch(
        `http://localhost:3001/api/breadth-scores?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result.data || [])
      
    } catch (err) {
      console.error('Failed to fetch chart data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch chart data')
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  const getChartData = useMemo(() => {
    if (!data.length) return null

    return {
      labels: data.map(point => point.date),
      datasets: [
        {
          label: 'Breadth Score',
          data: data.map(point => ({
            x: point.date,
            y: point.breadthScore
          })),
          borderColor: 'rgb(59, 130, 246)', // primary-500
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: 'rgb(59, 130, 246)',
          pointHoverBorderColor: 'white',
          pointHoverBorderWidth: 2,
        }
      ]
    }
  }, [data])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(75, 85, 99, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            const date = new Date(context[0].parsed.x)
            return date.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          },
          label: (context: any) => {
            const score = context.parsed.y
            let status = 'Neutral'
            if (score >= 60) status = 'Bullish'
            else if (score <= 40) status = 'Bearish'
            
            return [
              `Score: ${score.toFixed(1)}`,
              `Status: ${status}`
            ]
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy'
          }
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
          maxTicksLimit: window.innerWidth < 640 ? 4 : 8, // Fewer ticks on mobile
          font: {
            size: window.innerWidth < 640 ? 10 : 12
          }
        }
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
          maxTicksLimit: window.innerWidth < 640 ? 5 : 6, // Fewer ticks on mobile
          font: {
            size: window.innerWidth < 640 ? 10 : 12
          },
          callback: (value: any) => `${value}%`
        }
      }
    },
    elements: {
      point: {
        hoverRadius: window.innerWidth < 640 ? 6 : 8 // Smaller hover radius on mobile
      }
    }
  }

  const timeRangeOptions = [
    { value: '7d', label: '7D', icon: Calendar },
    { value: '30d', label: '30D', icon: Calendar },
    { value: '90d', label: '3M', icon: TrendingUp },
    { value: '1y', label: '1Y', icon: BarChart3 },
    { value: 'all', label: 'All', icon: BarChart3 }
  ] as const

  const getDataSummary = () => {
    if (!data.length) return null

    const scores = data.map(d => d.breadthScore)
    const current = scores[scores.length - 1]
    const previous = scores[scores.length - 2]
    const min = Math.min(...scores)
    const max = Math.max(...scores)
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length

    return {
      current: current?.toFixed(1) || 'N/A',
      change: previous ? ((current - previous) / previous * 100).toFixed(1) : '0',
      min: min.toFixed(1),
      max: max.toFixed(1),
      avg: avg.toFixed(1),
      isPositive: !previous || current >= previous
    }
  }

  const summary = getDataSummary()

  if (loading) {
    return (
      <div className={clsx('card p-6', className)}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-neutral-900">Historical Breadth Score</h3>
          <div className="flex space-x-1">
            {timeRangeOptions.map((option) => (
              <div key={option.value} className="w-8 h-8 bg-neutral-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="h-80 bg-neutral-100 rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-neutral-500">Loading chart data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={clsx('card p-6', className)}>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Historical Breadth Score</h3>
        <div className="h-80 bg-danger-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-danger-600 mb-2">Failed to load chart data</div>
            <button onClick={fetchChartData} className="btn-primary">Retry</button>
          </div>
        </div>
      </div>
    )
  }

  const chartData = getChartData

  return (
    <div className={clsx('card p-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">
            Historical Breadth Score
          </h3>
          <p className="text-sm text-neutral-600">
            Track market breadth trends over time
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex bg-neutral-100 rounded-lg p-1 overflow-x-auto">
          {timeRangeOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={clsx(
                  'flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                  timeRange === option.value
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                )}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{option.label}</span>
                <span className="sm:hidden">{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <div className="text-center">
            <div className="text-xs text-neutral-500 mb-1">Current</div>
            <div className="font-semibold text-neutral-900 text-sm sm:text-base">{summary.current}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-neutral-500 mb-1">Change</div>
            <div className={clsx(
              'font-semibold flex items-center justify-center space-x-1 text-sm sm:text-base',
              summary.isPositive ? 'text-success-600' : 'text-danger-600'
            )}>
              <span>{summary.isPositive ? '+' : ''}{summary.change}%</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-neutral-500 mb-1">Average</div>
            <div className="font-semibold text-neutral-900 text-sm sm:text-base">{summary.avg}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-neutral-500 mb-1">Min</div>
            <div className="font-semibold text-neutral-900 text-sm sm:text-base">{summary.min}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-neutral-500 mb-1">Max</div>
            <div className="font-semibold text-neutral-900 text-sm sm:text-base">{summary.max}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-80">
        {chartData ? (
          <Line ref={chartRef as any} data={chartData} options={chartOptions} />
        ) : (
          <div className="h-full bg-neutral-100 rounded-lg flex items-center justify-center">
            <div className="text-neutral-500">No data available for selected time range</div>
          </div>
        )}
      </div>

      {/* Chart Info */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 text-xs text-neutral-500">
        <div>
          {data.length} data points • Updated {new Date().toLocaleTimeString()}
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-2">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-danger-400 rounded-full"></div>
            <span>Bearish (&lt;40)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
            <span>Neutral (40-60)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-success-400 rounded-full"></div>
            <span>Bullish (&gt;60)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
