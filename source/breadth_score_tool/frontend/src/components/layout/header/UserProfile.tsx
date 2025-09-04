import React from 'react'
import { Search, HelpCircle, Bell } from 'lucide-react'

const UserProfile: React.FC = () => {
  return (
    <div className="flex items-center space-x-4">
      {/* Action Icons - Exact spacing and styling */}
      <div className="flex items-center space-x-4">
        <button 
          className="p-1 rounded-md hover:bg-white/10 transition-colors duration-200"
          aria-label="Search"
        >
          <Search 
            className="w-5 h-5 text-gray-400 hover:text-white transition-colors" 
            strokeWidth={1.5}
          />
        </button>
        
        <button 
          className="p-1 rounded-md hover:bg-white/10 transition-colors duration-200"
          aria-label="Help"
        >
          <HelpCircle 
            className="w-5 h-5 text-gray-400 hover:text-white transition-colors" 
            strokeWidth={1.5}
          />
        </button>
        
        <button 
          className="p-1 rounded-md hover:bg-white/10 transition-colors duration-200 relative"
          aria-label="Notifications"
        >
          <Bell 
            className="w-5 h-5 text-gray-400 hover:text-white transition-colors" 
            strokeWidth={1.5}
          />
        </button>
      </div>
      
      {/* User Info - Exact layout from screenshot */}
      <div className="flex items-center space-x-3 cursor-pointer hover:bg-white/5 rounded-lg p-1 transition-colors duration-200">
        {/* Avatar */}
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
          style={{ backgroundColor: '#f97316' }} // Exact orange color
        >
          <span 
            className="text-white font-medium select-none"
            style={{ 
              fontSize: '12px', 
              lineHeight: '16px',
              fontWeight: '500'
            }}
          >
            JP
          </span>
        </div>
        
        {/* User Details */}
        <div className="text-right">
          <div 
            className="text-white font-medium"
            style={{ 
              fontSize: '14px', 
              lineHeight: '16px',
              fontWeight: '500' 
            }}
          >
            Julia P.
          </div>
          <div 
            className="text-gray-400"
            style={{ 
              fontSize: '12px', 
              lineHeight: '14px',
              marginTop: '1px'
            }}
          >
            Product manager
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile