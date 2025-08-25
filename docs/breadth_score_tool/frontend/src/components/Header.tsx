import React from 'react'
import { ChevronDown, ExternalLink, Settings, Bell, User } from 'lucide-react'

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3v18h18V3H3zm16 16H5V5h14v14zm-8-2h2v-2h-2v2zm0-4h2V7h-2v6z"/>
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-neutral-900">
                Trading Tool
              </h1>
              <p className="text-sm text-neutral-500 hidden md:block">
                Real-time Market Breadth Analysis
              </p>
            </div>
            <div className="block sm:hidden">
              <h1 className="text-lg font-bold text-neutral-900">
                Trading
              </h1>
            </div>
          </div>

          {/* Desktop Navigation & Status */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Market Status */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="status-online"></div>
                <span className="text-sm text-neutral-600">Market Open</span>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-medium text-neutral-900">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-xs text-neutral-500">
                  {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button className="flex items-center space-x-2 p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
                <User className="w-5 h-5" />
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className="status-online"></div>
              <span className="text-xs text-neutral-600">Live</span>
            </div>
            <button className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
