// Card Component Types

export interface BaseCardProps {
  title: string
  icon?: React.ReactNode
  gridCols: number
  children: React.ReactNode
  showMenu?: boolean
  className?: string
}

export type TrendDirection = 'up' | 'down' | 'stable'

export interface MetricData {
  title: string
  value: string | number
  change: string
  trend: TrendDirection
  icon?: React.ReactNode
  description?: string
}

export interface MetricCardProps extends MetricData {
  className?: string
  size?: 'small' | 'medium' | 'large'
}

export interface ChartCardProps {
  title: string
  gridCols: number
  children: React.ReactNode
  headerContent?: React.ReactNode
  description?: string
  className?: string
  actions?: React.ReactNode[]
}

export interface CardHeaderProps {
  title: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  showMenu?: boolean
}

export interface TrendIndicatorProps {
  trend: TrendDirection
  change: string
  size?: 'small' | 'medium' | 'large'
}