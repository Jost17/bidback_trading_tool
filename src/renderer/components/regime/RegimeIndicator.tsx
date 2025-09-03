import React from 'react'
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import { useMarketRegime } from '../../hooks/usePythonBackend'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface RegimeIndicatorProps {
  className?: string
  size?: 'small' | 'medium' | 'large'
  showDetails?: boolean
}

const RegimeIndicator: React.FC<RegimeIndicatorProps> = ({
  className = '',
  size = 'medium',
  showDetails = true,
}) => {
  const { currentRegime, loading } = useMarketRegime()

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <LoadingSpinner size="small" />
        <span className="ml-2 text-sm text-gray-500">Loading regime...</span>
      </div>
    )
  }

  if (!currentRegime) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="flex items-center text-gray-400">
          <AlertCircle className="w-4 h-4 mr-2" />
          <span className="text-sm">No regime data</span>
        </div>
      </div>
    )
  }

  const getRegimeConfig = (regime: string) => {
    switch (regime) {
      case 'BULL_CONFIRMED':
        return {
          label: 'Bull Confirmed',
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: TrendingUp,
          description: 'Strong bullish trend confirmed',
        }
      case 'BULL_UNCONFIRMED':
        return {
          label: 'Bull Unconfirmed',
          color: 'bg-green-300',
          textColor: 'text-green-600',
          bgColor: 'bg-green-25',
          borderColor: 'border-green-100',
          icon: TrendingUp,
          description: 'Potential bullish trend forming',
        }
      case 'BEAR_CONFIRMED':
        return {
          label: 'Bear Confirmed',
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: TrendingDown,
          description: 'Strong bearish trend confirmed',
        }
      case 'BEAR_UNCONFIRMED':
        return {
          label: 'Bear Unconfirmed',
          color: 'bg-red-300',
          textColor: 'text-red-600',
          bgColor: 'bg-red-25',
          borderColor: 'border-red-100',
          icon: TrendingDown,
          description: 'Potential bearish trend forming',
        }
      default:
        return {
          label: 'Neutral',
          color: 'bg-gray-400',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: Minus,
          description: 'Market in neutral state',
        }
    }
  }

  const config = getRegimeConfig(currentRegime.regime)
  const Icon = config.icon

  const sizeClasses = {
    small: {
      indicator: 'w-3 h-3',
      text: 'text-xs',
      icon: 'w-3 h-3',
      padding: 'p-2',
    },
    medium: {
      indicator: 'w-4 h-4',
      text: 'text-sm',
      icon: 'w-4 h-4',
      padding: 'p-3',
    },
    large: {
      indicator: 'w-6 h-6',
      text: 'text-base',
      icon: 'w-5 h-5',
      padding: 'p-4',
    },
  }

  const classes = sizeClasses[size]

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className={`${className}`}>
      {/* Main Indicator */}
      <div
        className={`
          flex items-center ${classes.padding} 
          ${config.bgColor} ${config.borderColor} border rounded-lg
        `}
      >
        {/* Status Light */}
        <div
          className={`
            ${classes.indicator} ${config.color} 
            rounded-full mr-3 animate-pulse
          `}
        />

        {/* Icon and Text */}
        <div className="flex items-center flex-1">
          <Icon className={`${classes.icon} ${config.textColor} mr-2`} />
          <div>
            <span className={`font-semibold ${config.textColor} ${classes.text}`}>
              {config.label}
            </span>
            {showDetails && (
              <div className={`${classes.text} text-gray-500 mt-1`}>
                Confidence: {' '}
                <span className={getConfidenceColor(currentRegime.confidence)}>
                  {Math.round(currentRegime.confidence * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Timestamp */}
        {showDetails && size !== 'small' && (
          <div className={`text-right ${classes.text} text-gray-400`}>
            <div>Updated</div>
            <div>{formatTimestamp(currentRegime.last_updated)}</div>
          </div>
        )}
      </div>

      {/* Detailed Information */}
      {showDetails && size === 'large' && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          {/* Active Signals */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-2">Active Signals</h4>
            <div className="space-y-2">
              {currentRegime.signals.slice(0, 3).map((signal, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{signal.indicator}</span>
                  <span
                    className={`font-medium ${
                      signal.type === 'BULLISH'
                        ? 'text-green-600'
                        : signal.type === 'BEARISH'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {signal.type}
                  </span>
                </div>
              ))}
              {currentRegime.signals.length > 3 && (
                <div className="text-xs text-gray-400 text-center">
                  +{currentRegime.signals.length - 3} more signals
                </div>
              )}
            </div>
          </div>

          {/* Regime Description */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-2">Description</h4>
            <p className="text-sm text-gray-600">{config.description}</p>
            <div className="mt-2 text-xs text-gray-400">
              Last Updated: {formatTimestamp(currentRegime.last_updated)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegimeIndicator