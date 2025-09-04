import React from 'react'
import { BookOpen, Plus, DollarSign, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react'

interface TradeJournalDashboardProps {
  onNavigateBack?: () => void
}

export function TradeJournalDashboard({ onNavigateBack }: TradeJournalDashboardProps = {}) {
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
              <BookOpen className="w-7 h-7 text-blue-600" />
              <span>Trade Journal</span>
            </h1>
            <p className="text-gray-600 mt-1">Performance tracking & trade analysis</p>
          </div>
        </div>
        
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total P&L</p>
              <p className="text-2xl font-bold text-green-600">$0.00</p>
              <p className="text-sm text-gray-500">No trades recorded</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900">--%</p>
              <p className="text-sm text-gray-500">No data available</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Trades</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">Start trading!</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-full">
              <BookOpen className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Account Balance</p>
              <p className="text-2xl font-bold text-gray-900">$0.00</p>
              <p className="text-sm text-gray-500">Set initial balance</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Trade Entry Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Trade Entry</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. AAPL"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Side</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select side</option>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entry Price</label>
            <input
              type="number"
              // Removed step constraint for flexible price input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 150.25"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stop Loss</label>
            <input
              type="number"
              // Removed step constraint for flexible price input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 145.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Price</label>
            <input
              type="number"
              // Removed step constraint for flexible price input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 160.00"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">
            Record Trade
          </button>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Trades</h2>
        
        <div className="text-center text-gray-500 py-8">
          <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="font-medium">No trades recorded yet</p>
          <p className="text-sm">Your trading history will appear here</p>
        </div>
      </div>
    </div>
  )
}