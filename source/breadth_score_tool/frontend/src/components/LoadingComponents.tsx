import React from 'react'
import { clsx } from 'clsx'
import { RefreshCw, TrendingUp } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'neutral'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }

  const colorClasses = {
    primary: 'text-primary-600',
    success: 'text-success-600',
    neutral: 'text-neutral-600'
  }

  return (
    <RefreshCw className={clsx(
      'animate-spin',
      sizeClasses[size],
      colorClasses[color],
      className
    )} />
  )
}

interface LoadingStateProps {
  title?: string
  message?: string
  showSpinner?: boolean
  className?: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Loading',
  message = 'Please wait while we fetch the latest data...',
  showSpinner = true,
  className
}) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center p-8 text-center', className)}>
      {showSpinner && (
        <div className="mb-4 p-3 bg-primary-50 rounded-full">
          <LoadingSpinner size="lg" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">
        {title}
      </h3>
      
      <p className="text-neutral-600 max-w-sm">
        {message}
      </p>
      
      {/* Loading dots animation */}
      <div className="mt-4 flex space-x-1">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: '1s'
            }}
          ></div>
        ))}
      </div>
    </div>
  )
}

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
  lines?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'bg-neutral-200 animate-pulse'
  
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full'
  }

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={clsx('space-y-2', className)}>
        {[...Array(lines)].map((_, i) => (
          <div
            key={i}
            className={clsx(baseClasses, variantClasses[variant])}
            style={{
              ...style,
              width: i === lines - 1 ? '75%' : '100%',
              height: height || '1rem'
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={clsx(baseClasses, variantClasses[variant], className)}
      style={style}
    />
  )
}

// Card skeleton for consistent loading states
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={clsx('card p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton width={60} height={20} />
      </div>
      <Skeleton width={100} height={32} className="mb-2" />
      <Skeleton variant="text" lines={2} />
    </div>
  )
}
