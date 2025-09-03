import React, { useState, useEffect } from 'react'
import {
  Bell,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  AlertCircle,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useTradingSignals } from '../../hooks/usePythonBackend'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface SignalMonitorProps {
  className?: string
  autoRefresh?: boolean
  soundEnabled?: boolean
}

const SignalMonitor: React.FC<SignalMonitorProps> = ({
  className = '',
  autoRefresh = true,
  soundEnabled = false,
}) => {
  const { signals, loading, fetchSignals, generateSignals } = useTradingSignals()
  
  const [soundNotifications, setSoundNotifications] = useState(soundEnabled)
  const [lastSignalCount, setLastSignalCount] = useState(0)
  const [selectedSignalType, setSelectedSignalType] = useState<'ALL' | 'BUY' | 'SELL' | 'HOLD'>('ALL')
  const [sortBy, setSortBy] = useState<'timestamp' | 'strength' | 'confidence'>('timestamp')

  // Auto-refresh signals
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchSignals()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, fetchSignals])

  // Sound notification for new signals
  useEffect(() => {
    if (soundNotifications && signals.length > lastSignalCount) {
      // Play notification sound (you would implement actual sound here)
      console.log('New trading signal received!')
    }
    setLastSignalCount(signals.length)
  }, [signals.length, soundNotifications, lastSignalCount])

  const handleGenerateSignals = async () => {
    try {
      await generateSignals()
    } catch (error) {
      console.error('Failed to generate signals:', error)
    }
  }

  const handleRefreshSignals = async () => {
    try {
      await fetchSignals()
    } catch (error) {
      console.error('Failed to refresh signals:', error)
    }
  }

  const getSignalIcon = (signalType: string) => {
    switch (signalType) {
      case 'BUY':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'SELL':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'HOLD':
      default:
        return <Minus className="w-4 h-4 text-gray-600" />
    }
  }

  const getSignalColor = (signalType: string) => {
    switch (signalType) {
      case 'BUY':
        return 'bg-green-50 border-green-200'
      case 'SELL':
        return 'bg-red-50 border-red-200'
      case 'HOLD':
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getStrengthColor = (strength: number) => {
    if (strength >= 0.8) return 'text-green-600'
    if (strength >= 0.6) return 'text-yellow-600'
    if (strength >= 0.4) return 'text-orange-600'
    return 'text-red-600'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500'
    if (confidence >= 0.7) return 'bg-yellow-500'
    if (confidence >= 0.5) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

  const isSignalExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date()
  }

  const filteredSignals = signals
    .filter(signal => selectedSignalType === 'ALL' || signal.signal_type === selectedSignalType)
    .sort((a, b) => {
      switch (sortBy) {
        case 'strength':
          return b.strength - a.strength
        case 'confidence':
          return b.confidence - a.confidence
        case 'timestamp':
        default:
          return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
      }
    })

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Signal Monitor</h3>
            <div className="ml-4 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
              <span className="text-sm text-gray-500">
                {filteredSignals.length} active signals
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Sound Toggle */}
            <button
              onClick={() => setSoundNotifications(!soundNotifications)}
              className={`p-2 rounded-lg transition-colors ${
                soundNotifications
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
              title={soundNotifications ? 'Disable sound notifications' : 'Enable sound notifications'}
            >
              {soundNotifications ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefreshSignals}
              disabled={loading}
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              title="Refresh signals"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Generate Signals Button */}
            <button
              onClick={handleGenerateSignals}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
            >
              Generate New
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            {/* Signal Type Filter */}
            <select
              value={selectedSignalType}
              onChange={(e) => setSelectedSignalType(e.target.value as any)}
              className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Signals</option>
              <option value="BUY">Buy Signals</option>
              <option value="SELL">Sell Signals</option>
              <option value="HOLD">Hold Signals</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="timestamp">Latest First</option>
              <option value="strength">By Strength</option>
              <option value="confidence">By Confidence</option>
            </select>
          </div>

          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Signal List */}
      <div className="p-6">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="small" />
            <span className="ml-2 text-sm text-gray-500">Loading signals...</span>
          </div>
        )}

        {!loading && filteredSignals.length === 0 && (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <div className="text-gray-500 mb-2">No active signals</div>
            <div className="text-sm text-gray-400">
              Generate new signals or adjust your filters
            </div>
          </div>
        )}

        {!loading && filteredSignals.length > 0 && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredSignals.map((signal, index) => (
              <div
                key={`${signal.generated_at}-${index}`}
                className={`p-4 border rounded-lg transition-all hover:shadow-sm ${getSignalColor(
                  signal.signal_type
                )} ${isSignalExpired(signal.valid_until) ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  {/* Signal Info */}
                  <div className="flex items-start space-x-3">
                    {getSignalIcon(signal.signal_type)}
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          {signal.signal_type}
                          {signal.symbol && ` ${signal.symbol}`}
                        </span>
                        
                        {/* Strength Indicator */}
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500">Strength:</span>
                          <span className={`ml-1 font-medium ${getStrengthColor(signal.strength)}`}>
                            {Math.round(signal.strength * 100)}%
                          </span>
                        </div>

                        {/* Confidence Bar */}
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500">Conf:</span>
                          <div className="ml-1 w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getConfidenceColor(signal.confidence)}`}
                              style={{ width: `${signal.confidence * 100}%` }}
                            />
                          </div>
                          <span className="ml-1 text-xs text-gray-600">
                            {Math.round(signal.confidence * 100)}%
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-1">{signal.reason}</p>

                      {/* Price Targets */}
                      {(signal.stop_loss_suggested > 0 || signal.profit_target_suggested > 0) && (
                        <div className="flex items-center space-x-4 mt-2 text-xs">
                          {signal.stop_loss_suggested > 0 && (
                            <span className="text-red-600">
                              Stop: {formatCurrency(signal.stop_loss_suggested)}
                            </span>
                          )}
                          {signal.profit_target_suggested > 0 && (
                            <span className="text-green-600">
                              Target: {formatCurrency(signal.profit_target_suggested)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timestamp and Expiry */}
                  <div className="text-right text-xs text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimestamp(signal.generated_at)}
                    </div>
                    <div className={`mt-1 ${isSignalExpired(signal.valid_until) ? 'text-red-500' : ''}`}>
                      {isSignalExpired(signal.valid_until) ? (
                        <span className="flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Expired
                        </span>
                      ) : (
                        `Valid until ${new Date(signal.valid_until).toLocaleTimeString()}`
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SignalMonitor