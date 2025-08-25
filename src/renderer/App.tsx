import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { MarketBreadthDashboard } from './components/market-breadth/MarketBreadthDashboard'
import { TradeJournalDashboard } from './components/trade-journal/TradeJournalDashboard'
import { TradingDashboard } from './components/trading/TradingDashboard'
import { SettingsPage } from './components/settings/SettingsPage'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAppInitialization } from './hooks/useAppInitialization'

function App() {
  const { isInitialized, error, initializationProgress } = useAppInitialization()
  const [currentView, setCurrentView] = useState<'market-breadth' | 'trade-journal' | 'trading' | 'settings'>('market-breadth')

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-600 text-center">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-semibold mb-2">Initialization Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="mb-4">
            <LoadingSpinner size="large" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Initializing BIDBACK Trading Tool</h2>
          <p className="text-gray-600 mb-4">{initializationProgress}</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Header */}
        <Navigation 
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        
        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          {currentView === 'market-breadth' && (
            <MarketBreadthDashboard />
          )}
          
          {currentView === 'trade-journal' && (
            <TradeJournalDashboard />
          )}
          
          {currentView === 'trading' && (
            <TradingDashboard />
          )}
          
          {currentView === 'settings' && (
            <SettingsPage />
          )}
        </main>
        
        {/* Status Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white px-4 py-2 text-xs flex justify-between items-center">
          <div className="flex space-x-4">
            <span>BIDBACK Trading Tool v{window.versions?.app || '1.0.0'}</span>
            <span>•</span>
            <span>Electron v{window.versions?.electron || 'Unknown'}</span>
            <span>•</span>
            <span className="text-green-400">● Connected</span>
          </div>
          
          <div className="flex space-x-4">
            <span>{window.platform?.os || 'Unknown OS'}</span>
            <span>•</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App