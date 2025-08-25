'use client';

import { IndicatorValue } from '@/lib/utils/breadthIndicators';

interface IndicatorCardProps {
  title: string;
  indicator: IndicatorValue;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function IndicatorCard({ title, indicator, description, size = 'md' }: IndicatorCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'bullish':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'bearish':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'neutral':
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'bullish':
        return '↗';
      case 'bearish':
        return '↘';
      case 'neutral':
      default:
        return '→';
    }
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const titleSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const valueSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`rounded-lg border-2 ${getStatusColor(indicator.status)} ${sizeClasses[size]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`font-semibold ${titleSizeClasses[size]}`}>
          {title}
        </h3>
        <span className="text-lg">
          {getStatusIcon(indicator.status)}
        </span>
      </div>
      
      <div className={`font-bold ${valueSizeClasses[size]} mb-1`}>
        {indicator.displayValue}
      </div>
      
      {description && (
        <p className="text-xs opacity-75">
          {description}
        </p>
      )}
      
      <div className="mt-2">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(indicator.status)}`}>
          {indicator.status}
        </span>
      </div>
    </div>
  );
}