/**
 * Formatting utilities for consistent data display across the application
 */

import { MARKET_STATUS, BREADTH_SCORE_THRESHOLDS, TIME_RANGES } from './constants';

/**
 * Format currency values
 */
export const formatCurrency = (value: number | null | undefined, options: {
  decimals?: number;
  symbol?: string;
  showSymbol?: boolean;
} = {}): string => {
  const { decimals = 2, symbol = '$', showSymbol = true } = options;
  
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const formatted = value.toFixed(decimals);
  return showSymbol ? `${symbol}${formatted}` : formatted;
};

/**
 * Format market values (stock counts, etc.)
 */
export const formatMarketValue = (value: number | null | undefined, options: {
  decimals?: number;
  showCommas?: boolean;
} = {}): string => {
  const { decimals = 0, showCommas = true } = options;
  
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const formatted = value.toFixed(decimals);
  
  if (showCommas) {
    return parseInt(formatted).toLocaleString();
  }
  
  return formatted;
};

/**
 * Format percentage values
 */
export const formatPercentage = (value: number | null | undefined, options: {
  decimals?: number;
  showSign?: boolean;
} = {}): string => {
  const { decimals = 1, showSign = true } = options;
  
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const formatted = value.toFixed(decimals);
  const sign = showSign && value > 0 ? '+' : '';
  
  return `${sign}${formatted}%`;
};

/**
 * Format breadth score with status
 */
export const formatBreadthScore = (score: number | null | undefined): string => {
  if (score === null || score === undefined || isNaN(score)) {
    return 'N/A';
  }

  return score.toFixed(1);
};

/**
 * Get breadth score status
 */
export const getBreadthStatus = (score: number | null | undefined): string => {
  if (score === null || score === undefined || isNaN(score)) {
    return MARKET_STATUS.NEUTRAL;
  }

  if (score >= BREADTH_SCORE_THRESHOLDS.BULLISH) {
    return MARKET_STATUS.BULLISH;
  } else if (score <= BREADTH_SCORE_THRESHOLDS.BEARISH) {
    return MARKET_STATUS.BEARISH;
  } else {
    return MARKET_STATUS.NEUTRAL;
  }
};

/**
 * Format date for display
 */
export const formatDate = (date: string | Date | null | undefined, options: {
  format?: 'short' | 'long' | 'iso';
  includeTime?: boolean;
} = {}): string => {
  const { format = 'short', includeTime = false } = options;
  
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {};

  switch (format) {
    case 'short':
      formatOptions.year = '2-digit';
      formatOptions.month = '2-digit';
      formatOptions.day = '2-digit';
      break;
    case 'long':
      formatOptions.year = 'numeric';
      formatOptions.month = 'long';
      formatOptions.day = 'numeric';
      break;
    case 'iso':
      return dateObj.toISOString().split('T')[0];
    default:
      formatOptions.year = 'numeric';
      formatOptions.month = 'short';
      formatOptions.day = 'numeric';
  }

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
  }

  return dateObj.toLocaleDateString('en-US', formatOptions);
};

/**
 * Format time for display
 */
export const formatTime = (date: string | Date | null | undefined, options: {
  includeSeconds?: boolean;
  format24Hour?: boolean;
} = {}): string => {
  const { includeSeconds = false, format24Hour = false } = options;
  
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Time';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !format24Hour
  };

  if (includeSeconds) {
    formatOptions.second = '2-digit';
  }

  return dateObj.toLocaleTimeString('en-US', formatOptions);
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateObj, { format: 'short' });
  }
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string | null | undefined, maxLength: number = 50): string => {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Format trend indicator
 */
export const formatTrend = (current: number | null, previous: number | null): {
  direction: 'up' | 'down' | 'stable';
  change: number | null;
  changePercent: number | null;
  formatted: string;
} => {
  if (current === null || previous === null || isNaN(current) || isNaN(previous)) {
    return {
      direction: 'stable',
      change: null,
      changePercent: null,
      formatted: 'N/A'
    };
  }

  const change = current - previous;
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
  
  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (change > 0.1) direction = 'up';
  else if (change < -0.1) direction = 'down';

  const formattedChange = change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
  const formattedPercent = changePercent > 0 ? `+${changePercent.toFixed(1)}%` : `${changePercent.toFixed(1)}%`;

  return {
    direction,
    change,
    changePercent,
    formatted: `${formattedChange} (${formattedPercent})`
  };
};

/**
 * Calculate and format trend between two values
 */
export const calculateTrend = (current: number | undefined, previous: number | undefined) => {
  if (!current || !previous) {
    return { direction: 'stable' as const, change: null };
  }

  const change = current - previous;
  const direction = change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'stable' as const;

  return {
    direction,
    change: Math.abs(change)
  };
};

/**
 * Get status color classes for Tailwind CSS
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case MARKET_STATUS.BULLISH:
      return 'text-green-600';
    case MARKET_STATUS.BEARISH:
      return 'text-red-600';
    case MARKET_STATUS.NEUTRAL:
    default:
      return 'text-yellow-600';
  }
};

/**
 * Format time range for display
 */
export const formatTimeRange = (range: string): string => {
  switch (range) {
    case TIME_RANGES.ONE_WEEK:
      return '1 Week';
    case TIME_RANGES.ONE_MONTH:
      return '1 Month';
    case TIME_RANGES.THREE_MONTHS:
      return '3 Months';
    case TIME_RANGES.ONE_YEAR:
      return '1 Year';
    default:
      return range;
  }
};

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export const formatLargeNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const abs = Math.abs(value);
  
  if (abs >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  } else if (abs >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (abs >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  } else {
    return value.toString();
  }
};