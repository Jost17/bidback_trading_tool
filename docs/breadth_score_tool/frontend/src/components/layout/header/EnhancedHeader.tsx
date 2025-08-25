import React from 'react'
import Logo from './Logo'
import Navigation from './Navigation'
import HeaderActions from './HeaderActions'
import UserDropdown from './UserDropdown'

interface EnhancedHeaderProps {
  onSearchClick?: () => void
  onHelpClick?: () => void
  onNotificationClick?: () => void
  onProfileClick?: () => void
  onSettingsClick?: () => void
  onLogoutClick?: () => void
  notificationCount?: number
  className?: string
}

const EnhancedHeader: React.FC<EnhancedHeaderProps> = ({
  onSearchClick,
  onHelpClick,
  onNotificationClick,
  onProfileClick,
  onSettingsClick,
  onLogoutClick,
  notificationCount = 0,
  className = ''
}) => {
  return (
    <header 
      className={`flex items-center justify-between mb-8 px-1 ${className}`}
      style={{ height: '48px' }} // Exact height from screenshot
    >
      {/* Left Section: Logo + Navigation */}
      <div className="flex items-center space-x-8">
        <Logo />
        <Navigation />
      </div>
      
      {/* Right Section: Actions + User Profile */}
      <div className="flex items-center space-x-6">
        <HeaderActions 
          onSearchClick={onSearchClick}
          onHelpClick={onHelpClick}
          onNotificationClick={onNotificationClick}
          notificationCount={notificationCount}
        />
        
        <UserDropdown 
          onProfileClick={onProfileClick}
          onSettingsClick={onSettingsClick}
          onLogoutClick={onLogoutClick}
        />
      </div>
    </header>
  )
}

export default EnhancedHeader