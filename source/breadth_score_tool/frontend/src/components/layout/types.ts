// Layout Component Types

export interface DashboardLayoutProps {
  children?: React.ReactNode
  className?: string
}

export interface HeaderProps {
  className?: string
}

export interface NavigationItem {
  label: string
  active?: boolean
  href?: string
  onClick?: () => void
}

export interface NavigationProps {
  items?: NavigationItem[]
  className?: string
}

export interface UserInfo {
  name: string
  role: string
  avatar?: string
  initials?: string
}

export interface UserProfileProps {
  user?: UserInfo
  showNotifications?: boolean
  notificationCount?: number
  className?: string
}

export interface DashboardTitleProps {
  title?: string
  dateRange?: string
  showAiAssistant?: boolean
  onDateChange?: (range: string) => void
  onAiAssistantClick?: () => void
  className?: string
}

export interface GridContainerProps {
  children: React.ReactNode
  columns?: number
  gap?: number
  className?: string
}