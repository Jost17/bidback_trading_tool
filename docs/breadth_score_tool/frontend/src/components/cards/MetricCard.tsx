import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
  gridArea?: string
  className?: string
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  trend = 'neutral',
  icon,
  gridArea,
  className = ''
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" strokeWidth={1.5} />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" strokeWidth={1.5} />
      default:
        return <Minus className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-400'
      case 'down':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div 
      className={`p-6 rounded-xl border transition-all duration-200 hover:border-white/20 ${className}`}
      style={{
        background: 'rgba(30, 41, 59, 0.4)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(107, 114, 128, 0.2)',
        gridArea: gridArea
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 
          className="text-gray-400 font-medium"
          style={{
            fontSize: '14px',
            lineHeight: '20px',
            letterSpacing: '-0.025em'
          }}
        >
          {title}
        </h3>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>
      
      {/* Value */}
      <div className="mb-3">
        <span 
          className="text-white font-semibold"
          style={{
            fontSize: '32px',
            lineHeight: '40px',
            letterSpacing: '-0.025em',
            fontWeight: '600'
          }}
        >
          {value}
        </span>
      </div>
      
      {/* Change Indicator */}
      {(change !== undefined || changeLabel) && (
        <div className="flex items-center space-x-2">
          {getTrendIcon()}
          <span 
            className={`font-medium ${getTrendColor()}`}
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              fontWeight: '500'
            }}
          >
            {change !== undefined && `${change > 0 ? '+' : ''}${change}%`}
            {changeLabel && ` ${changeLabel}`}
          </span>
        </div>
      )}
    </div>
  )
}

export default MetricCard