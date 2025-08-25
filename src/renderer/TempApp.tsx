import React, { useState } from 'react'
import { MarketBreadthDashboard } from './components/market-breadth/MarketBreadthDashboard'

type ActiveModule = 'dashboard' | 'market-breadth' | 'trade-journal' | 'ib-integration'

export default function TempApp() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard')

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 Bidback Trading Tool
          </h1>
          <p className="text-xl text-gray-600">
            Professional Desktop Trading Management Application
          </p>
        </header>
        
        {activeModule === 'dashboard' && (
          <>
            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Market Breadth Module */}
              <div 
                className="bg-white rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow duration-200 hover:bg-gray-50"
                onClick={() => setActiveModule('market-breadth')}
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    📊
                  </div>
                  <h2 className="text-xl font-semibold">Market Breadth</h2>
                </div>
            <p className="text-gray-600 mb-4">
              6-Factor Breadth Score Analysis with real-time market indicators
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Breadth Score:</span>
                <span className="font-semibold text-green-600">75/100</span>
              </div>
              <div className="flex justify-between">
                <span>Market Phase:</span>
                <span className="font-semibold text-blue-600">BULL</span>
              </div>
              </div>
              </div>
              
              {/* Trade Journaling Module */}
              <div 
                className="bg-white rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow duration-200 hover:bg-gray-50"
                onClick={() => setActiveModule('trade-journal')}
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    📝
                  </div>
                  <h2 className="text-xl font-semibold">Trade Journal</h2>
                </div>
            <p className="text-gray-600 mb-4">
              TJS_Elite inspired trade tracking and performance analysis
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Open Trades:</span>
                <span className="font-semibold">3</span>
              </div>
              <div className="flex justify-between">
                <span>P&L Today:</span>
                <span className="font-semibold text-green-600">+$1,247</span>
              </div>
              </div>
              </div>
              
              {/* IB Integration Module */}
              <div 
                className="bg-white rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow duration-200 hover:bg-gray-50"
                onClick={() => setActiveModule('ib-integration')}
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    🔗
                  </div>
                  <h2 className="text-xl font-semibold">IB Integration</h2>
                </div>
            <p className="text-gray-600 mb-4">
              Interactive Brokers API for live trading execution
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Connection:</span>
                <span className="font-semibold text-red-600">Offline</span>
              </div>
              <div className="flex justify-between">
                <span>Account:</span>
                <span className="font-semibold">DU123456</span>
              </div>
              </div>
              </div>
            </div>
            
            {/* Status Section */}
            <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Database</h4>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Initializing...</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Frontend</h4>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Online</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Version Info */}
            <footer className="text-center mt-8 text-sm text-gray-500">
              Bidback Trading Tool v1.0.0 • Desktop Application • Development Mode
            </footer>
          </>
        )}

        {/* Module Views */}
        {activeModule === 'market-breadth' && (
          <MarketBreadthDashboard onBack={() => setActiveModule('dashboard')} />
        )}
        
        {activeModule === 'trade-journal' && (
          <TradeJournalModule onBack={() => setActiveModule('dashboard')} />
        )}
        
        {activeModule === 'ib-integration' && (
          <IBIntegrationModule onBack={() => setActiveModule('dashboard')} />
        )}
      </div>
    </div>
  )
}


// Trade Journal Module Component
function TradeJournalModule({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <div className="flex items-center mb-6">
        <button 
          onClick={onBack}
          className="mr-4 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Trade Journal</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Performance Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Total P&L (Today):</span>
              <span className="font-semibold text-green-600">+$1,247</span>
            </div>
            <div className="flex justify-between">
              <span>Win Rate:</span>
              <span className="font-semibold">67%</span>
            </div>
            <div className="flex justify-between">
              <span>Total Trades:</span>
              <span className="font-semibold">8</span>
            </div>
            <div className="flex justify-between">
              <span>Open Positions:</span>
              <span className="font-semibold">3</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
          <div className="space-y-2">
            <div className="border-l-4 border-green-500 pl-3">
              <div className="font-medium">AAPL - Long</div>
              <div className="text-sm text-gray-600">Entry: $175.50 • Exit: $178.20 • P&L: +$540</div>
            </div>
            <div className="border-l-4 border-red-500 pl-3">
              <div className="font-medium">TSLA - Short</div>
              <div className="text-sm text-gray-600">Entry: $245.80 • Exit: $247.30 • P&L: -$150</div>
            </div>
            <div className="border-l-4 border-green-500 pl-3">
              <div className="font-medium">NVDA - Long</div>
              <div className="text-sm text-gray-600">Entry: $420.15 • Current: $425.80 • P&L: +$565</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// IB Integration Module Component  
function IBIntegrationModule({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <div className="flex items-center mb-6">
        <button 
          onClick={onBack}
          className="mr-4 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Interactive Brokers Integration</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-700 mb-3">API Connection</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-semibold text-red-600">Offline</span>
              </div>
              <div className="flex justify-between">
                <span>TWS Version:</span>
                <span className="font-semibold">10.19</span>
              </div>
              <div className="flex justify-between">
                <span>API Port:</span>
                <span className="font-semibold">7497</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Account Info</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Account ID:</span>
                <span className="font-semibold">DU123456</span>
              </div>
              <div className="flex justify-between">
                <span>Account Type:</span>
                <span className="font-semibold">Paper Trading</span>
              </div>
              <div className="flex justify-between">
                <span>Available Funds:</span>
                <span className="font-semibold">$100,000</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-3">
            Connect to TWS
          </button>
          <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
            Test Connection
          </button>
        </div>
      </div>
    </div>
  )
}