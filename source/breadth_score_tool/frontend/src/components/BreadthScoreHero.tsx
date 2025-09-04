import React from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { clsx } from 'clsx'

interface BreadthScoreData {
  score: number
  status: 'bullish' | 'bearish' | 'neutral'
  lastUpdated: string
  trend: 'up' | 'down' | 'stable'
  change: number
}

interface BreadthScoreHeroProps {
  data: BreadthScoreData | null
  loading: boolean
  onRefresh: () => void
}

export const BreadthScoreHero: React.FC<BreadthScoreHeroProps> = ({
  data,
  loading,
  onRefresh
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'bullish':
        return {
          color: 'text-success-600',
          bg: 'bg-success-50',
          border: 'border-success-200',
          icon: TrendingUp,
          label: 'Bullish',
          description: 'Strong market breadth indicates positive momentum'
        }
      case 'bearish':
        return {
          color: 'text-danger-600',
          bg: 'bg-danger-50',
          border: 'border-danger-200',
          icon: TrendingDown,
          label: 'Bearish',
          description: 'Weak market breadth suggests negative momentum'
        }
      default:
        return {
          color: 'text-neutral-600',
          bg: 'bg-neutral-50',
          border: 'border-neutral-200',
          icon: Minus,
          label: 'Neutral',
          description: 'Market breadth is in a neutral range'
        }
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success-600" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-danger-600" />
      default:
        return <Minus className="w-4 h-4 text-neutral-500" />
    }
  }

  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="card p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-6">
            <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Loading Market Data
          </h2>
          <p className="text-neutral-600">
            Fetching current breadth score...
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-danger-100 rounded-full mb-6">
            <svg className="w-8 h-8 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            No Data Available
          </h2>
          <p className="text-neutral-600 mb-6">
            Unable to load market breadth data
          </p>
          <button onClick={onRefresh} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(data.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className={clsx(
      'card p-8 transition-all duration-500',
      statusConfig.border
    )}>
      {/* Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-1">
            Market Breadth Score
          </h2>
          <p className="text-sm sm:text-base text-neutral-600">
            Real-time market sentiment indicator
          </p>
        </div>
        
        <button
          onClick={onRefresh}
          className="btn-secondary self-start sm:self-auto"
          disabled={loading}
        >
          <RefreshCw className={clsx(
            'w-4 h-4 mr-2',
            loading && 'animate-spin'
          )} />
          Refresh
        </button>
      </div>

      {/* Main Score Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-center">
        {/* Score Circle */}
        <div className="lg:col-span-1 text-center order-1 lg:order-1">
          <div className={clsx(
            'relative inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 mb-4',
            statusConfig.bg,
            statusConfig.border
          )}>
            <div className="text-center">
              <div className={clsx(
                'text-2xl sm:text-3xl font-bold animate-number',
                statusConfig.color
              )}>
                {data.score.toFixed(1)}
              </div>
              <div className="text-xs text-neutral-500 uppercase tracking-wide">
                Score
              </div>
            </div>
            
            {/* Status Icon */}
            <div className={clsx(
              'absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center',
              statusConfig.bg,
              statusConfig.border,
              'border-2'
            )}>
              <StatusIcon className={clsx('w-3 h-3 sm:w-4 sm:h-4', statusConfig.color)} />
            </div>
          </div>
        </div>

        {/* Status Information */}
        <div className="lg:col-span-2 order-2 lg:order-2">
          <div className="space-y-4">
            {/* Status Label */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
              <div className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium text-center sm:text-left',
                statusConfig.bg,
                statusConfig.color
              )}>
                {statusConfig.label}
              </div>
              
              <div className="flex items-center justify-center sm:justify-start space-x-1 text-sm text-neutral-600">
                {getTrendIcon(data.trend)}
                <span>
                  {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-neutral-700 text-base sm:text-lg text-center lg:text-left">
              {statusConfig.description}
            </p>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="text-center sm:text-left">
                <div className="text-sm text-neutral-500 mb-1">Last Updated</div>
                <div className="text-neutral-900 font-medium">
                  {formatLastUpdated(data.lastUpdated)}
                </div>
              </div>
              
              <div className="text-center sm:text-left">
                <div className="text-sm text-neutral-500 mb-1">Market Status</div>
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <div className="status-online"></div>
                  <span className="text-neutral-900 font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Range Indicator */}
      <div className="mt-8 pt-6 border-t border-neutral-200">
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
          <span>Bearish</span>
          <span>Neutral</span>
          <span>Bullish</span>
        </div>
        
        <div className="relative">
          <div className="h-2 bg-gradient-to-r from-danger-200 via-neutral-200 to-success-200 rounded-full"></div>
          <div 
            className={clsx(
              'absolute top-0 w-3 h-3 rounded-full border-2 border-white transform -translate-y-0.5',
              statusConfig.color.replace('text-', 'bg-')
            )}
            style={{ left: `${Math.min(Math.max(data.score, 0), 100)}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs text-neutral-400 mt-1">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    </div>
  )
}
