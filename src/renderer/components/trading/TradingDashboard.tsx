import React from 'react'
import { TrendingUp, AlertTriangle, Activity, Wifi, WifiOff, ArrowLeft } from 'lucide-react'

interface TradingDashboardProps {
  onNavigateBack?: () => void
}

export function TradingDashboard({ onNavigateBack }: TradingDashboardProps = {}) {
  const [isConnected] = React.useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Market Breadth"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <TrendingUp className="w-7 h-7 text-blue-600" />
              <span>Live Trading</span>
            </h1>
            <p className="text-gray-600 mt-1">Interactive Brokers integration & order management</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Connect to IB
          </button>
        </div>
      </div>

      {/* Connection Status Alert */}
      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Interactive Brokers Not Connected</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Connect to Interactive Brokers TWS or IB Gateway to enable live trading functionality.
                Make sure TWS is running and API access is enabled.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Buying Power</p>
              <p className="text-2xl font-bold text-gray-900">--</p>
              <p className="text-sm text-gray-500">Not connected</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Day P&L</p>
              <p className="text-2xl font-bold text-gray-900">--</p>
              <p className="text-sm text-gray-500">Not available</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Open Positions</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">No positions</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-full">
              <TrendingUp className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">No pending orders</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <Activity className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Entry */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Entry</h2>
          
          {!isConnected ? (
            <div className="text-center text-gray-500 py-8">
              <WifiOff className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="font-medium">IB Connection Required</p>
              <p className="text-sm">Connect to Interactive Brokers to place orders</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. AAPL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="MKT">Market</option>
                    <option value="LMT">Limit</option>
                    <option value="STP">Stop</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Limit Price</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 150.25"
                />
              </div>
              
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                Place Order
              </button>
            </div>
          )}
        </div>

        {/* Positions & Orders */}
        <div className="space-y-6">
          {/* Positions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Positions</h3>
            <div className="text-center text-gray-500 py-4">
              <p className="font-medium">No open positions</p>
              <p className="text-sm">Your positions will appear here</p>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
            <div className="text-center text-gray-500 py-4">
              <p className="font-medium">No recent orders</p>
              <p className="text-sm">Order history will appear here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}