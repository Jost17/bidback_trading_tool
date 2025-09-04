import { useState, useEffect, useCallback } from 'react';
import { MarketData } from '../types';

export type TimeRange = '1W' | '1M' | '3M' | '1Y';
export type MarketStatus = 'bullish' | 'bearish' | 'neutral';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface CurrentStatus {
  breadthScore: number;
  lastUpdated: string;
  timestamp: string;
}

interface MarketDataState {
  data: MarketData[];
  currentStatus: CurrentStatus | null;
  loading: LoadingState;
  error: string | null;
  lastFetch: Date | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;
}

interface MarketDataHook extends MarketDataState {
  fetchData: (options?: FetchDataOptions) => Promise<void>;
  refreshData: () => Promise<void>;
  fetchCurrentStatus: () => Promise<void>;
  getBreadthStatus: (score: number) => MarketStatus;
  getMarketStatus: () => MarketStatus;
  isMarketOpen: () => boolean;
  clearError: () => void;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;
}

interface FetchDataOptions {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Custom hook for managing market data state and API calls
 * Consolidates all market data fetching logic used across multiple components
 */
export const useMarketData = (): MarketDataHook => {
  const [state, setState] = useState<MarketDataState>({
    data: [],
    currentStatus: null,
    loading: 'idle',
    error: null,
    lastFetch: null,
    pagination: null
  });

  // Utility function to determine breadth status
  const getBreadthStatus = useCallback((score: number): MarketStatus => {
    if (score >= 60) return 'bullish';
    if (score <= 40) return 'bearish';
    return 'neutral';
  }, []);

  // Get current market status based on latest breadth score
  const getMarketStatus = useCallback((): MarketStatus => {
    if (!state.currentStatus) return 'neutral';
    return getBreadthStatus(state.currentStatus.breadthScore);
  }, [state.currentStatus, getBreadthStatus]);

  // Check if market is currently open (simplified logic)
  const isMarketOpen = useCallback((): boolean => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    
    // Market is closed on weekends
    if (day === 0 || day === 6) return false;
    
    // Market hours: 9:30 AM - 4:00 PM ET (simplified)
    return hour >= 9 && hour < 16;
  }, []);

  // Fetch current market status
  const fetchCurrentStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: 'loading' }));
      
      const response = await fetch('http://localhost:3001/api/current-status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const currentStatus = await response.json();
      
      setState(prev => ({
        ...prev,
        currentStatus,
        loading: 'success',
        error: null,
        lastFetch: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch current status'
      }));
    }
  }, []);

  // Fetch market data with optional filters and pagination
  const fetchData = useCallback(async (options: FetchDataOptions = {}) => {
    try {
      setState(prev => ({ ...prev, loading: 'loading' }));
      
      const {
        limit = 25,
        offset = 0,
        startDate,
        endDate,
        sortBy = 'date',
        sortOrder = 'DESC'
      } = options;

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        sortBy,
        sortOrder
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`http://localhost:3001/api/market-data?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      setState(prev => ({
        ...prev,
        data: result.data || [],
        pagination: result.pagination || null,
        loading: 'success',
        error: null,
        lastFetch: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch market data'
      }));
    }
  }, []);

  // Refresh both current status and market data
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchCurrentStatus(),
      fetchData()
    ]);
  }, [fetchCurrentStatus, fetchData]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial data fetch on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    ...state,
    fetchData,
    refreshData,
    fetchCurrentStatus,
    getBreadthStatus,
    getMarketStatus,
    isMarketOpen,
    clearError
  };
};

/**
 * Hook for fetching chart data with time range filtering
 */
export const useChartData = (timeRange: TimeRange = '1M') => {
  const [chartData, setChartData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchChartData = useCallback(async () => {
    try {
      setLoading('loading');
      
      // Calculate date range based on timeRange
      const now = new Date();
      const startDate = new Date(now);
      
      switch (timeRange) {
        case '1W':
          startDate.setDate(now.getDate() - 7);
          break;
        case '1M':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3M':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case '1Y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = now.toISOString().split('T')[0];
      
      const response = await fetch(
        `http://localhost:3001/api/market-data?startDate=${startDateStr}&endDate=${endDateStr}&limit=1000&sortBy=date&sortOrder=ASC`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      setChartData(result.data || []);
      setLoading('success');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chart data');
      setLoading('error');
    }
  }, [timeRange]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  return {
    chartData,
    loading,
    error,
    refetch: fetchChartData
  };
};