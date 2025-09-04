import React, { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Activity, Calendar, BarChart3, Users } from 'lucide-react'
import { clsx } from 'clsx'

interface MarketStats {
  totalStocks: number
  bullishStocks: number
  bearishStocks: number
  neutralStocks: number
  avgScore: number
  dailyChange: number
  weeklyChange: number
  dataPoints: number
}

interface StatsCardsProps {
  className?: string
}

export const StatsCards: React.FC<StatsCardsProps> = ({ className }) => {
  const [stats, setStats] = useState<MarketStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMarketStats()
  }, [])

  const fetchMarketStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch current status and recent summaries
      const [currentResponse, summariesResponse] = await Promise.all([
        fetch('http://localhost:3001/api/current-status'),
        fetch('http://localhost:3001/api/yearly-summaries?limit=1')
      ])

      if (!currentResponse.ok || !summariesResponse.ok) {
        throw new Error('Failed to fetch market statistics')
      }

      const currentData = await currentResponse.json()
      const summariesData = await summariesResponse.json()

      // Calculate derived stats
      const totalStocks = 3000 // Approximate total stocks tracked
      const currentScore = currentData.breadthScore
      const bullishPercent = Math.max(0, (currentScore - 50) * 2) // Rough approximation
      const bearishPercent = Math.max(0, (50 - currentScore) * 2)
      const neutralPercent = 100 - bullishPercent - bearishPercent

      setStats({
        totalStocks,
        bullishStocks: Math.round((bullishPercent / 100) * totalStocks),
        bearishStocks: Math.round((bearishPercent / 100) * totalStocks),
        neutralStocks: Math.round((neutralPercent / 100) * totalStocks),
        avgScore: currentScore,
        dailyChange: 0.8, // Placeholder - would need historical data
        weeklyChange: 2.3, // Placeholder - would need historical data
        dataPoints: summariesData.data?.[0]?.totalRecords || 0
      })

    } catch (err) {
      console.error('Failed to fetch market stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics')
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Market Breadth',
      value: stats?.avgScore.toFixed(1) || 'N/A',
      unit: '%',
      change: stats?.dailyChange || 0,
      icon: Activity,
      color: 'primary',
      description: 'Current breadth score'
    },
    {
      title: 'Bullish Stocks',
      value: stats?.bullishStocks.toLocaleString() || 'N/A',
      unit: '',
      change: stats?.weeklyChange || 0,
      icon: TrendingUp,
      color: 'success',
      description: 'Stocks in uptrend'
    },
    {
      title: 'Bearish Stocks',
      value: stats?.bearishStocks.toLocaleString() || 'N/A',
      unit: '',
      change: -(stats?.weeklyChange || 0),
      icon: TrendingDown,
      color: 'danger',
      description: 'Stocks in downtrend'
    },
    {
      title: 'Total Data Points',
      value: stats?.dataPoints.toLocaleString() || 'N/A',
      unit: '',
      change: 0,
      icon: BarChart3,
      color: 'neutral',
      description: 'Historical records'
    }
  ]

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'success':
        return {
          icon: 'text-success-600 bg-success-100',
          accent: 'border-success-200'
        }
      case 'danger':
        return {
          icon: 'text-danger-600 bg-danger-100',
          accent: 'border-danger-200'
        }
      case 'primary':
        return {
          icon: 'text-primary-600 bg-primary-100',
          accent: 'border-primary-200'
        }
      default:
        return {
          icon: 'text-neutral-600 bg-neutral-100',
          accent: 'border-neutral-200'
        }
    }
  }

  if (loading) {
    return (
      <div className={clsx('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-neutral-200 rounded-lg animate-pulse"></div>
              <div className="w-16 h-4 bg-neutral-200 rounded animate-pulse"></div>
            </div>
            <div className="space-y-2">
              <div className="w-20 h-8 bg-neutral-200 rounded animate-pulse"></div>
              <div className="w-24 h-4 bg-neutral-200 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={clsx('card p-6', className)}>
        <div className="text-center">
          <div className="text-danger-600 mb-2">Failed to load market statistics</div>
          <button onClick={fetchMarketStats} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {statCards.map((card, index) => {
        const colors = getColorClasses(card.color)
        const Icon = card.icon
        const isPositive = card.change >= 0
        
        return (
          <div key={index} className={clsx('card p-6 hover:shadow-lg transition-shadow', colors.accent)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', colors.icon)}>
                <Icon className="w-5 h-5" />
              </div>
              
              {card.change !== 0 && (
                <div className={clsx(
                  'text-xs font-medium px-2 py-1 rounded',
                  isPositive
                    ? 'text-success-700 bg-success-100'
                    : 'text-danger-700 bg-danger-100'
                )}>
                  {isPositive ? '+' : ''}{card.change.toFixed(1)}%
                </div>
              )}
            </div>

            {/* Value */}
            <div className="mb-2">
              <div className="text-2xl font-bold text-neutral-900">
                {card.value}
                <span className="text-sm font-normal text-neutral-500 ml-1">
                  {card.unit}
                </span>
              </div>
            </div>

            {/* Title and Description */}
            <div>
              <div className="text-sm font-medium text-neutral-900 mb-1">
                {card.title}
              </div>
              <div className="text-xs text-neutral-500">
                {card.description}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
