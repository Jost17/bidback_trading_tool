import React from 'react'

interface NavigationItem {
  label: string
  active?: boolean
  href?: string
}

const Navigation: React.FC = () => {
  const navigationItems: NavigationItem[] = [
    { label: 'Dashboard', active: true, href: '#' },
    { label: 'Sales', href: '#' },
    { label: 'Contacts', href: '#' },
    { label: 'Team', href: '#' },
    { label: 'Reports', href: '#' }
  ]

  return (
    <nav className="flex items-center space-x-8">
      {navigationItems.map((item, index) => (
        <a
          key={index}
          href={item.href}
          className={`cursor-pointer transition-colors duration-200 select-none ${
            item.active 
              ? 'text-white font-medium' 
              : 'text-gray-400 hover:text-white font-normal'
          }`}
          style={{
            fontSize: '14px',
            lineHeight: '20px',
            letterSpacing: '-0.025em'
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}

export default Navigation