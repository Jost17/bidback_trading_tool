import React, { useState } from 'react'
import { Search, HelpCircle, Bell, ChevronDown } from 'lucide-react'

interface HeaderActionsProps {
  onSearchClick?: () => void
  onHelpClick?: () => void
  onNotificationClick?: () => void
  notificationCount?: number
}

const HeaderActions: React.FC<HeaderActionsProps> = ({
  onSearchClick,
  onHelpClick, 
  onNotificationClick,
  notificationCount = 0
}) => {
  return (
    <div className="flex items-center space-x-4">
      {/* Search Button */}
      <button 
        onClick={onSearchClick}
        className="p-1.5 rounded-md hover:bg-white/10 transition-all duration-200 group"
        aria-label="Search"
      >
        <Search 
          className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" 
          strokeWidth={1.5}
        />
      </button>
      
      {/* Help Button */}
      <button 
        onClick={onHelpClick}
        className="p-1.5 rounded-md hover:bg-white/10 transition-all duration-200 group"
        aria-label="Help & Support"
      >
        <HelpCircle 
          className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" 
          strokeWidth={1.5}
        />
      </button>
      
      {/* Notifications Button */}
      <button 
        onClick={onNotificationClick}
        className="p-1.5 rounded-md hover:bg-white/10 transition-all duration-200 relative group"
        aria-label={`Notifications ${notificationCount > 0 ? `(${notificationCount})` : ''}`}
      >
        <Bell 
          className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" 
          strokeWidth={1.5}
        />
        
        {/* Notification Badge */}
        {notificationCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center leading-none"
            style={{ fontSize: '10px' }}
          >
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </button>
    </div>
  )
}

export default HeaderActions