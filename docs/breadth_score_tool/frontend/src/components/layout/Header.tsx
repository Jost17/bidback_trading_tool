import React from 'react'
import Logo from './header/Logo'
import Navigation from './header/Navigation'
import UserProfile from './header/UserProfile'

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between mb-8 px-1">
      {/* Left Section: Logo + Navigation */}
      <div className="flex items-center space-x-8">
        <Logo />
        <Navigation />
      </div>
      
      {/* Right Section: User Profile + Actions */}
      <UserProfile />
    </header>
  )
}

export default Header