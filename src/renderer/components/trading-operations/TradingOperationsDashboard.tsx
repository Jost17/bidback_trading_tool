import React, { useState } from 'react'
import { TrendingUp, Calculator, FileText, ArrowLeft, ChevronLeft } from 'lucide-react'
import { PositionCalculator } from './PositionCalculator'
import { TradeEntryForm } from './TradeEntryForm'

interface TradingOperationsDashboardProps {
  onNavigateBack?: () => void
}

interface ActiveView {
  type: 'overview' | 'position-calculator' | 'manual-entry'
  title: string
}

const VIEWS: ActiveView[] = [
  { type: 'overview', title: 'Overview' },
  { type: 'position-calculator', title: 'Position Calculator' },
  { type: 'manual-entry', title: 'Manual Entry' }
]

export function TradingOperationsDashboard({ onNavigateBack }: TradingOperationsDashboardProps = {}) {
  const [activeView, setActiveView] = useState<ActiveView['type']>('overview')

  const renderActiveView = () => {
    switch (activeView) {
      case 'position-calculator':
        return (
          <div className="space-y-6">
            <PositionCalculator />
          </div>
        )
      case 'manual-entry':
        return (
          <div className="space-y-6">
            <TradeEntryForm 
              onSave={(tradeData) => {
                console.log('Trade saved:', tradeData)
                // TODO: Integrate with actual trade service
                alert('Trade saved successfully! (Demo mode)')
              }}
            />
          </div>
        )
      default:
        return (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Calculator className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Position Calculator</h3>
                    <p className="text-sm text-gray-600">Calculate optimal position sizes</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">
                  Determine position size based on VIX levels, market breadth, and risk parameters. 
                  Includes regime analysis and exit strategies.
                </p>
                <button
                  onClick={() => setActiveView('position-calculator')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Open Calculator
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Manual Entry</h3>
                    <p className="text-sm text-gray-600">Record completed trades</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">
                  Enter trade details, P&L, and execution information. Connect calculated positions 
                  with actual trade outcomes.
                </p>
                <button
                  onClick={() => setActiveView('manual-entry')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Enter Trade
                </button>
              </div>
            </div>

            {/* Trading Workflow */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trading Workflow</h3>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <span>Market Analysis</span>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2">
                  <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <span>Position Calculation</span>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2">
                  <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <span>Trade Entry</span>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2">
                  <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <span>Performance Tracking</span>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <TrendingUp className="w-7 h-7 text-blue-600" />
              <span>Trading Operations</span>
            </h1>
            <p className="text-gray-600 mt-1">Position sizing & trade execution management</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      {activeView !== 'overview' && (
        <div className="flex items-center space-x-1 bg-white rounded-lg shadow-sm border p-1">
          <button
            onClick={() => setActiveView('overview')}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Overview</span>
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <span className="text-sm font-medium text-gray-900 px-3">
            {VIEWS.find(v => v.type === activeView)?.title}
          </span>
        </div>
      )}

      {/* Main Content */}
      {renderActiveView()}
    </div>
  )
}