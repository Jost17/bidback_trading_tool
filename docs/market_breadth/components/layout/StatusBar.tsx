'use client';

import { useState, useEffect } from 'react';

interface StatusIndicator {
  label: string;
  status: 'online' | 'offline' | 'warning';
  details?: string;
}

export function StatusBar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const statusIndicators: StatusIndicator[] = [
    {
      label: 'Market',
      status: 'offline',
      details: 'Market Closed'
    },
    {
      label: 'Database',
      status: 'online',
      details: 'PostgreSQL Connected'
    },
    {
      label: 'Cache',
      status: 'online',
      details: 'Redis Connected'
    },
    {
      label: 'IB Gateway',
      status: 'offline',
      details: 'TWS Disconnected'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-400';
      case 'warning':
        return 'bg-yellow-400';
      case 'offline':
      default:
        return 'bg-red-400';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'offline':
      default:
        return 'text-red-600';
    }
  };

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Status Indicators */}
        <div className="flex items-center space-x-6">
          {statusIndicators.map((indicator) => (
            <div key={indicator.label} className="flex items-center" title={indicator.details}>
              <span
                className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(indicator.status)}`}
              />
              <span className={`text-xs font-medium ${getStatusTextColor(indicator.status)}`}>
                {indicator.label}
              </span>
            </div>
          ))}
        </div>

        {/* System Info */}
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span>
            {mounted && currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short'
            })}
          </span>
          <span>•</span>
          <span>Paper Trading Mode</span>
          <span>•</span>
          <span>Development Environment</span>
        </div>
      </div>
    </div>
  );
}