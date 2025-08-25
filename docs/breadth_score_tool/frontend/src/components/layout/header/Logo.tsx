import React from 'react'

const Logo: React.FC = () => {
  return (
    <div className="flex items-center space-x-3">
      {/* Logo Icon - Exact replica */}
      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-sm">
        <div className="w-4 h-4">
          <svg viewBox="0 0 16 16" fill="white" className="w-full h-full">
            {/* Three dots pattern from screenshot */}
            <circle cx="4" cy="4" r="2.5"/>
            <circle cx="12" cy="4" r="2.5"/>
            <circle cx="8" cy="11" r="2.5"/>
          </svg>
        </div>
      </div>
      
      {/* Brand Text - Exact typography */}
      <span 
        className="text-white font-semibold select-none"
        style={{ 
          fontSize: '16px', 
          lineHeight: '24px',
          letterSpacing: '-0.025em' 
        }}
      >
        Codevlux
      </span>
    </div>
  )
}

export default Logo