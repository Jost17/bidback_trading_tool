// Holiday Calendar Types for Bidback Trading System

export interface Holiday {
  date: string // ISO date string
  name: string
  type: 'market_closed' | 'early_close'
  earlyCloseTime?: string // Only for early close days (e.g., "13:00")
}

export interface TradingDay {
  date: string
  isHoliday: boolean
  isEarlyClose: boolean
  holiday?: Holiday
}

export interface HolidayCalendar {
  year: number
  holidays: Holiday[]
  lastUpdated: string
}

// US Market Holiday Calendar for 2025
export const US_HOLIDAYS_2025: Holiday[] = [
  { date: '2025-01-01', name: 'New Year\'s Day', type: 'market_closed' },
  { date: '2025-01-20', name: 'Martin Luther King Jr. Day', type: 'market_closed' },
  { date: '2025-02-17', name: 'Presidents\' Day', type: 'market_closed' },
  { date: '2025-04-18', name: 'Good Friday', type: 'market_closed' },
  { date: '2025-05-26', name: 'Memorial Day', type: 'market_closed' },
  { date: '2025-06-19', name: 'Juneteenth', type: 'market_closed' },
  { date: '2025-07-03', name: 'Independence Day (observed)', type: 'early_close', earlyCloseTime: '13:00' },
  { date: '2025-07-04', name: 'Independence Day', type: 'market_closed' },
  { date: '2025-09-01', name: 'Labor Day', type: 'market_closed' },
  { date: '2025-11-27', name: 'Thanksgiving Day', type: 'market_closed' },
  { date: '2025-11-28', name: 'Day After Thanksgiving', type: 'early_close', earlyCloseTime: '13:00' },
  { date: '2025-12-24', name: 'Christmas Eve', type: 'early_close', earlyCloseTime: '13:00' },
  { date: '2025-12-25', name: 'Christmas Day', type: 'market_closed' }
]

// VIX-based Exit Matrix from Bidback Master System
export interface VixExitMatrix {
  vixRange: string
  stopLossPercent: number
  profitTarget1Percent: number
  profitTarget2Percent: number
  maxHoldDays: number
  multiplier: number
}

export const VIX_EXIT_MATRIX: VixExitMatrix[] = [
  {
    vixRange: 'VIX < 12 (Ultra-Low)',
    stopLossPercent: -4,
    profitTarget1Percent: 4,
    profitTarget2Percent: 10,
    maxHoldDays: 3,
    multiplier: 0.8
  },
  {
    vixRange: 'VIX 12-15 (Low)',
    stopLossPercent: -6,
    profitTarget1Percent: 6,
    profitTarget2Percent: 12,
    maxHoldDays: 4,
    multiplier: 0.9
  },
  {
    vixRange: 'VIX 15-20 (Normal)',
    stopLossPercent: -8,
    profitTarget1Percent: 7,
    profitTarget2Percent: 15,
    maxHoldDays: 5,
    multiplier: 1.0
  },
  {
    vixRange: 'VIX 20-25 (Elevated)',
    stopLossPercent: -10,
    profitTarget1Percent: 9,
    profitTarget2Percent: 20,
    maxHoldDays: 5,
    multiplier: 1.1
  },
  {
    vixRange: 'VIX 25-30 (High)',
    stopLossPercent: -12,
    profitTarget1Percent: 10,
    profitTarget2Percent: 25,
    maxHoldDays: 6,
    multiplier: 1.2
  },
  {
    vixRange: 'VIX 30-40 (Very High)',
    stopLossPercent: -15,
    profitTarget1Percent: 12,
    profitTarget2Percent: 30,
    maxHoldDays: 7,
    multiplier: 1.3
  },
  {
    vixRange: 'VIX > 40 (Extreme)',
    stopLossPercent: -18,
    profitTarget1Percent: 15,
    profitTarget2Percent: 35,
    maxHoldDays: 10,
    multiplier: 1.4
  }
]