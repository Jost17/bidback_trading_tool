import React from 'react'
import { Calendar, Share2, Bot } from 'lucide-react'

interface DashboardTitleProps {
  title?: string
  subtitle?: string
  onShareClick?: () => void
  onAIAssistantClick?: () => void
  onDateRangeClick?: () => void
}

const DashboardTitle: React.FC<DashboardTitleProps> = ({
  title = "Dashboard",
  subtitle = "Analytics overview",
  onShareClick,
  onAIAssistantClick,
  onDateRangeClick
}) => {
  return (
    <div className="flex items-center justify-between mb-8">
      {/* Left Section: Title */}
      <div>
        <h1 
          className="text-white font-semibold mb-1"
          style={{
            fontSize: '32px',
            lineHeight: '40px',
            letterSpacing: '-0.025em',
            fontWeight: '600'
          }}
        >
          {title}
        </h1>
        <p 
          className="text-gray-400"
          style={{
            fontSize: '16px',
            lineHeight: '24px',
            letterSpacing: '-0.025em'
          }}
        >
          {subtitle}
        </p>
      </div>
      
      {/* Right Section: Controls */}
      <div className="flex items-center space-x-3">
        {/* Date Range Selector */}
        <button
          onClick={onDateRangeClick}
          className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-200 group"
        >
          <Calendar className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" strokeWidth={1.5} />
          <span 
            className="text-gray-300 group-hover:text-white transition-colors select-none"
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              fontWeight: '500'
            }}
          >
            Last year
          </span>
        </button>
        
        {/* Share Button */}
        <button
          onClick={onShareClick}
          className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-200 group"
          aria-label="Share dashboard"
        >
          <Share2 className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" strokeWidth={1.5} />
        </button>
        
        {/* AI Assistant Button */}
        <button
          onClick={onAIAssistantClick}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 rounded-lg transition-all duration-200 group"
        >
          <Bot className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" strokeWidth={1.5} />
          <span 
            className="text-blue-300 group-hover:text-blue-200 transition-colors select-none"
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              fontWeight: '500'
            }}
          >
            🤖 AI Assistant
          </span>
        </button>
      </div>
    </div>
  )
}

export default DashboardTitle