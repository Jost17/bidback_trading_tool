import { MarketData } from '../types';

export type MarketStatus = 'bullish' | 'bearish' | 'neutral';

/**
 * Market utility functions for common calculations and formatting
 */
export const marketUtils = {
  /**
   * Determine market status based on breadth score
   */
  getBreadthStatus: (score: number): MarketStatus => {
    if (score >= 60) return 'bullish';
    if (score <= 40) return 'bearish';
    return 'neutral';
  },

  /**
   * Format market values with appropriate suffixes
   */
  formatMarketValue: (
    value: number | null | undefined, 
    options: { 
      suffix?: string;
      decimals?: number;
      showSign?: boolean;
    } = {}
  ): string => {
    const { suffix = '', decimals = 0, showSign = false } = options;
    
    if (value === null || value === undefined) {
      return 'N/A';
    }

    const formatted = value.toFixed(decimals);
    const sign = showSign && value > 0 ? '+' : '';
    
    return `${sign}${formatted}${suffix}`;
  },

  /**
   * Format percentage values
   */
  formatPercentage: (
    value: number | null | undefined,
    options: { decimals?: number; showSign?: boolean } = {}
  ): string => {
    return marketUtils.formatMarketValue(value, { 
      ...options, 
      suffix: '%' 
    });
  },

  /**
   * Calculate trend direction and percentage change
   */
  calculateTrend: (
    current: number | null, 
    previous: number | null
  ): { direction: 'up' | 'down' | 'neutral'; change: number | null; changePercent: number | null } => {
    if (current === null || previous === null || previous === 0) {
      return { direction: 'neutral', change: null, changePercent: null };
    }

    const change = current - previous;
    const changePercent = (change / Math.abs(previous)) * 100;

    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      change,
      changePercent
    };
  },

  /**
   * Get color class for market status
   */
  getStatusColor: (status: MarketStatus): string => {
    switch (status) {
      case 'bullish':
        return 'text-green-600';
      case 'bearish':
        return 'text-red-600';
      case 'neutral':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  },

  /**
   * Get background color class for market status
   */
  getStatusBgColor: (status: MarketStatus): string => {
    switch (status) {
      case 'bullish':
        return 'bg-green-100 text-green-800';
      case 'bearish':
        return 'bg-red-100 text-red-800';
      case 'neutral':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  },

  /**
   * Format date for display
   */
  formatDate: (
    date: string | Date,
    options: { 
      format?: 'short' | 'long' | 'iso';
      includeTime?: boolean;
    } = {}
  ): string => {
    const { format = 'short', includeTime = false } = options;
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    switch (format) {
      case 'long':
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          ...(includeTime && {
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      case 'iso':
        return dateObj.toISOString().split('T')[0];
      case 'short':
      default:
        return dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: '2-digit',
          ...(includeTime && {
            hour: '2-digit',
            minute: '2-digit'
          })
        });
    }
  },

  /**
   * Check if market is currently open
   */
  isMarketOpen: (): boolean => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Market is closed on weekends
    if (day === 0 || day === 6) return false;
    
    // Market hours: 9:30 AM - 4:00 PM ET (simplified)
    const marketOpenTime = 9 * 60 + 30; // 9:30 AM in minutes
    const marketCloseTime = 16 * 60; // 4:00 PM in minutes
    const currentTime = hour * 60 + minute;
    
    return currentTime >= marketOpenTime && currentTime < marketCloseTime;
  },

  /**
   * Get time until market open/close
   */
  getMarketTimeInfo: (): { 
    isOpen: boolean; 
    nextEvent: 'open' | 'close'; 
    timeUntil: string;
  } => {
    const now = new Date();
    const isOpen = marketUtils.isMarketOpen();
    
    if (isOpen) {
      // Market is open, calculate time until close
      const closeTime = new Date(now);
      closeTime.setHours(16, 0, 0, 0);
      
      const msUntilClose = closeTime.getTime() - now.getTime();
      const hoursUntilClose = Math.floor(msUntilClose / (1000 * 60 * 60));
      const minutesUntilClose = Math.floor((msUntilClose % (1000 * 60 * 60)) / (1000 * 60));
      
      return {
        isOpen: true,
        nextEvent: 'close',
        timeUntil: `${hoursUntilClose}h ${minutesUntilClose}m`
      };
    } else {
      // Market is closed, calculate time until open
      const openTime = new Date(now);
      openTime.setHours(9, 30, 0, 0);
      
      // If it's after market hours today, move to next business day
      if (now.getHours() >= 16 || now.getDay() === 0 || now.getDay() === 6) {
        openTime.setDate(openTime.getDate() + 1);
        
        // Skip weekends
        while (openTime.getDay() === 0 || openTime.getDay() === 6) {
          openTime.setDate(openTime.getDate() + 1);
        }
      }
      
      const msUntilOpen = openTime.getTime() - now.getTime();
      const hoursUntilOpen = Math.floor(msUntilOpen / (1000 * 60 * 60));
      
      return {
        isOpen: false,
        nextEvent: 'open',
        timeUntil: `${hoursUntilOpen}h`
      };
    }
  },

  /**
   * Validate market data entry
   */
  validateMarketData: (data: Partial<MarketData>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate required date
    if (!data.date) {
      errors.push('Date is required');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      errors.push('Date must be in YYYY-MM-DD format');
    }

    // Validate numeric fields
    const numericFields = [
      'stocks_up_4pct', 'stocks_down_4pct',
      'stocks_up_20pct', 'stocks_down_20pct',
      'stocks_up_20dollar', 'stocks_down_20dollar',
      't2108', 'worden_universe'
    ] as const;

    numericFields.forEach(field => {
      const value = data[field];
      if (value !== null && value !== undefined) {
        if (typeof value !== 'number' || isNaN(value) || value < 0) {
          errors.push(`${field} must be a non-negative number`);
        }
      }
    });

    // T2108 specific validation (0-100)
    if (data.t2108 !== null && data.t2108 !== undefined) {
      if (data.t2108 < 0 || data.t2108 > 100) {
        errors.push('T2108 must be between 0 and 100');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Sort market data by date
   */
  sortByDate: (data: MarketData[], ascending: boolean = true): MarketData[] => {
    return [...data].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  },

  /**
   * Filter market data by date range
   */
  filterByDateRange: (
    data: MarketData[], 
    startDate: string, 
    endDate: string
  ): MarketData[] => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    return data.filter(item => {
      const itemDate = new Date(item.date).getTime();
      return itemDate >= start && itemDate <= end;
    });
  }
};