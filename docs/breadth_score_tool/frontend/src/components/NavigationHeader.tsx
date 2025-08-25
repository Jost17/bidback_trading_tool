import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Database, TrendingUp, Settings } from 'lucide-react';

const NavigationHeader: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: Activity, label: 'Dashboard' },
    { path: '/data-management', icon: Database, label: 'Daten verwalten' },
    { path: '/analytics', icon: TrendingUp, label: 'Analysen' },
    { path: '/settings', icon: Settings, label: 'Einstellungen' }
  ];
  
  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-orange-500">
                Breadth Monitor
              </h1>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-gray-800 text-white' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
          
          {/* Mobile Navigation Button */}
          <div className="md:hidden">
            <button className="text-gray-300 hover:text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavigationHeader;