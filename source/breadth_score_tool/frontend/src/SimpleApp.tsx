import React, { useEffect, useState, useCallback } from 'react'
import { apiService } from './services/api'

interface BreadthScoreData {
  score: number
  status: 'bullish' | 'bearish' | 'neutral'
  lastUpdated: string
  trend: 'up' | 'down' | 'stable'
  change: number
}

const SimpleApp: React.FC = () => {
  const [breadthData, setBreadthData] = useState<BreadthScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const currentData = await apiService.getCurrentStatus()
      
      setBreadthData({
        score: currentData.breadthScore || 0,
        status: getBreadthStatus(currentData.breadthScore || 0),
        lastUpdated: new Date().toISOString(),
        trend: 'stable',
        change: 0
      })
      
      setError(null)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getBreadthStatus = (score: number): 'bullish' | 'bearish' | 'neutral' => {
    if (score >= 60) return 'bullish'
    if (score <= 40) return 'bearish'
    return 'neutral'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading market data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Connection Error</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-orange-500 hover:bg-orange-600 text-black px-6 py-3 rounded-lg font-semibold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-orange-500">
              Breadth Monitor
            </h1>
            <div className="text-sm text-gray-400">
              Backend: Connected ✅
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Breadth Score</h2>
          
          {/* Main Score */}
          <div className="text-7xl font-black text-orange-500 mb-4">
            {breadthData?.score?.toFixed(1) || '0.0'}
          </div>
          
          {/* Status */}
          <div className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm mb-4
            ${breadthData?.status === 'bullish' 
              ? 'bg-green-900/50 text-green-400 border border-green-700'
              : breadthData?.status === 'bearish'
              ? 'bg-red-900/50 text-red-400 border border-red-700'
              : 'bg-gray-800 text-gray-400 border border-gray-700'
            }
          `}>
            {breadthData?.status === 'bullish' ? 'BULLISH' : 
             breadthData?.status === 'bearish' ? 'BEARISH' : 'NEUTRAL'}
          </div>
          
          <div className="text-gray-400 text-sm">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Success Message */}
        <div className="mt-8 bg-green-900/50 border border-green-700 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-400">
                ✅ App erfolgreich gestartet!
              </h3>
              <div className="mt-2 text-sm text-green-300">
                <p>
                  • Frontend läuft auf Port 5173<br/>
                  • Backend läuft auf Port 3001<br/>
                  • Alle Komponenten wurden erfolgreich modernisiert<br/>
                  • Komplette Data-Management Tabelle mit allen Feldern verfügbar
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <a 
            href="/#/data-management"
            className="bg-green-600 hover:bg-green-700 text-black font-semibold py-4 px-6 rounded-lg text-center transition-colors"
          >
            📊 Daten verwalten
          </a>
          <button 
            onClick={fetchData}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
          >
            🔄 Daten aktualisieren
          </button>
        </div>
      </div>
    </div>
  )
}

export default SimpleApp