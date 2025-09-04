import React from 'react'
import { BarChart3, BookOpen, TrendingUp, Settings, Menu, Shield } from 'lucide-react'

interface NavigationProps {
  currentView: 'market-breadth' | 'trade-journal' | 'trading-operations' | 'risk-management' | 'settings'
  onViewChange: (view: 'market-breadth' | 'trade-journal' | 'trading-operations' | 'risk-management' | 'settings') => void
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  const navItems = [
    {
      id: 'market-breadth' as const,
      label: 'Market Breadth',
      icon: BarChart3,
      description: '6-Factor Breadth Analysis'
    },
    {
      id: 'trade-journal' as const,
      label: 'Trade Journal',
      icon: BookOpen,
      description: 'Trade Management & P&L'
    },
    {
      id: 'trading-operations' as const,
      label: 'Trading Operations',
      icon: TrendingUp,
      description: 'Position Sizing & Trade Entry'
    },
    {
      id: 'risk-management' as const,
      label: 'Risk Management',
      icon: Shield,
      description: 'Regime Analysis & Risk Control'
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Settings,
      description: 'App Configuration'
    }
  ]

  return (
    <div>
      {/* Status Bar */}
      <div className="bg-gray-800 text-white px-4 py-1 text-xs flex justify-between items-center">
        <div className="flex space-x-4">
          <span>Bidback Trading Tool v{(window as any).versions?.app || '1.0.0'}</span>
          <span>•</span>
          <span>Electron v{(window as any).versions?.electron || 'Unknown'}</span>
          <span>•</span>
          <span className="text-green-400">● Connected</span>
          {currentView === 'risk-management' && (
            <>
              <span>•</span>
              <span className="text-blue-400">Python Backend Ready</span>
            </>
          )}
        </div>
        
        <div className="flex space-x-4">
          <span>{(window as any).platform?.os || 'Unknown OS'}</span>
          <span>•</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
      
      {/* Main Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Bidback</h1>
                <p className="text-xs text-gray-500 -mt-1">Trading Tool</p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = currentView === item.id
              const Icon = item.icon
              
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`
                    relative flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 shadow-sm' 
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  <div className="flex flex-col items-start">
                    <span>{item.label}</span>
                    <span className={`text-xs ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                      {item.description}
                    </span>
                  </div>
                  
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation (Hidden by default, would be shown on mobile menu click) */}
      <div className="md:hidden hidden border-t border-gray-200 bg-gray-50">
        <div className="px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id
            const Icon = item.icon
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium
                  ${isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <div className="flex flex-col items-start">
                  <span>{item.label}</span>
                  <span className={`text-xs ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                    {item.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      </nav>
    </div>
  )
}