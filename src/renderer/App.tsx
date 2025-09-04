import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { MarketBreadthDashboard } from './components/market-breadth/MarketBreadthDashboard'
import { TradeJournalDashboard } from './components/trade-journal/TradeJournalDashboard'
import { TradingOperationsDashboard } from './components/trading-operations/TradingOperationsDashboard'
import { SettingsPage } from './components/settings/SettingsPage'
import RiskManagementDashboard from './components/risk/RiskManagementDashboard'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TradingProvider } from './context/TradingContext'
import { PortfolioProvider } from './contexts/PortfolioContext'
import { useAppInitialization } from './hooks/useAppInitialization'

function App() {
  const { isInitialized, error, initializationProgress } = useAppInitialization()
  const [currentView, setCurrentView] = useState<'market-breadth' | 'trade-journal' | 'trading-operations' | 'risk-management' | 'settings'>('market-breadth')

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
          <h2 className="text-xl font-semibold mb-2">Initializing Bidback Trading Tool</h2>
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
      <PortfolioProvider>
        <TradingProvider>
          <div className="min-h-screen bg-gray-50">
          {/* Navigation Header with Status Bar */}
          <Navigation 
            currentView={currentView}
            onViewChange={setCurrentView}
          />
          
          {/* Main Content */}
          <main className="container mx-auto px-4 py-6">
            {currentView === 'market-breadth' && (
              <MarketBreadthDashboard 
                onNavigateHome={() => {
                  // Navigate to main navigation view (for now keep market-breadth but user can switch)
                  // In future, this could scroll to top or show a main overview
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            )}
            
            {currentView === 'trade-journal' && (
              <TradeJournalDashboard 
                onNavigateBack={() => setCurrentView('market-breadth')}
              />
            )}
            
            {currentView === 'trading-operations' && (
              <TradingOperationsDashboard 
                onNavigateBack={() => setCurrentView('market-breadth')}
              />
            )}
            
            {currentView === 'risk-management' && (
              <RiskManagementDashboard />
            )}
            
            {currentView === 'settings' && (
              <SettingsPage />
            )}
          </main>
        
          </div>
        </TradingProvider>
      </PortfolioProvider>
    </ErrorBoundary>
  )
}

export default App