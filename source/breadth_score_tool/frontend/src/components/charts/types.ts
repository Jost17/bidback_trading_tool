// Chart Component Types

export interface ChartDataset {
  label?: string
  data: number[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
  borderWidth?: number
  fill?: boolean
  tension?: number
  pointRadius?: number
  pointBackgroundColor?: string
  barThickness?: number
  maxBarThickness?: number
}

export interface ChartData {
  labels: string[]
  datasets: ChartDataset[]
}

export interface ChartOptions {
  responsive?: boolean
  maintainAspectRatio?: boolean
  plugins?: {
    legend?: {
      display?: boolean
      position?: 'top' | 'bottom' | 'left' | 'right'
      labels?: any
    }
    tooltip?: any
  }
  scales?: {
    x?: any
    y?: any
  }
}

export interface BaseChartProps {
  data: ChartData
  options?: ChartOptions
  height?: number
  width?: number
  className?: string
}

export interface BarChartProps extends BaseChartProps {
  orientation?: 'vertical' | 'horizontal'
  showGrid?: boolean
}

export interface LineChartProps extends BaseChartProps {
  showLegend?: boolean
  showPoints?: boolean
  smooth?: boolean
  fill?: boolean
}

export interface DoughnutChartProps extends BaseChartProps {
  centerContent?: React.ReactNode
  size?: number
  cutout?: string | number
}

export interface LegendItem {
  color: string
  label: string
  value: string | number
  percentage?: number
}

export interface ChartLegendProps {
  items: LegendItem[]
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

export type ChartType = 'bar' | 'line' | 'doughnut' | 'pie' | 'area'

export interface ChartConfig {
  type: ChartType
  data: ChartData
  options?: ChartOptions
  responsive?: boolean
  maintainAspectRatio?: boolean
}