import React, { useState } from 'react'
import { ChevronDown, User, Settings, LogOut } from 'lucide-react'

interface UserInfo {
  name: string
  role: string
  avatar?: string
  initials: string
}

interface UserDropdownProps {
  user?: UserInfo
  onProfileClick?: () => void
  onSettingsClick?: () => void
  onLogoutClick?: () => void
}

const UserDropdown: React.FC<UserDropdownProps> = ({
  user = {
    name: 'Julia P.',
    role: 'Product manager', 
    initials: 'JP'
  },
  onProfileClick,
  onSettingsClick,
  onLogoutClick
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      {/* User Profile Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 hover:bg-white/5 rounded-lg p-1.5 transition-all duration-200 group"
      >
        {/* Avatar */}
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
          style={{ backgroundColor: '#f97316' }}
        >
          {user.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span 
              className="text-white font-medium select-none"
              style={{ 
                fontSize: '12px', 
                lineHeight: '16px',
                fontWeight: '500'
              }}
            >
              {user.initials}
            </span>
          )}
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
            {user.name}
          </div>
          <div 
            className="text-gray-400"
            style={{ 
              fontSize: '12px', 
              lineHeight: '14px',
              marginTop: '1px'
            }}
          >
            {user.role}
          </div>
        </div>
        
        {/* Dropdown Arrow */}
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 group-hover:text-white transition-all duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
          strokeWidth={1.5}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div 
            className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20"
            style={{
              background: 'rgba(30, 41, 59, 0.95)',
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(107, 114, 128, 0.2)'
            }}
          >
            <div className="py-2">
              {/* Profile Section */}
              <div className="px-4 py-3 border-b border-slate-600/30">
                <div className="text-white font-medium text-sm">{user.name}</div>
                <div className="text-gray-400 text-xs">{user.role}</div>
              </div>
              
              {/* Menu Items */}
              <button
                onClick={() => {
                  onProfileClick?.()
                  setIsOpen(false)
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <User className="w-4 h-4 mr-3" strokeWidth={1.5} />
                Profile
              </button>
              
              <button
                onClick={() => {
                  onSettingsClick?.()
                  setIsOpen(false)
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Settings className="w-4 h-4 mr-3" strokeWidth={1.5} />
                Settings
              </button>
              
              <div className="border-t border-slate-600/30 mt-2 pt-2">
                <button
                  onClick={() => {
                    onLogoutClick?.()
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3" strokeWidth={1.5} />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default UserDropdown