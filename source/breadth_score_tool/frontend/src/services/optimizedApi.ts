import React, { useMemo, useCallback } from 'react';

// Simple API caching layer
class APICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttlMs: number = 300000) { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(key: string) {
    this.cache.delete(key);
  }
}

export const apiCache = new APICache();

// Optimized API service with caching
export const optimizedApiService = {
  async fetchMarketData(params: {
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
  }) {
    const cacheKey = `market-data-${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = apiCache.get(cacheKey);
    if (cached) {
      console.log('🚀 Cache hit for market data');
      return cached;
    }
    
    // Build URL
    const url = new URL('http://localhost:3001/api/market-data');
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });
    
    try {
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      
      // Cache the result
      apiCache.set(cacheKey, data, 300000); // 5 minutes
      console.log('💾 Data cached for market data');
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  async updateMarketData(id: number, updates: any) {
    try {
      const response = await fetch(`http://localhost:3001/api/market-data/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Update failed');
      
      // Invalidate cache on update
      apiCache.clear();
      console.log('🗑️ Cache cleared after update');
      
      return await response.json();
    } catch (error) {
      console.error('Update failed:', error);
      throw error;
    }
  },

  async uploadCSV(file: File) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:3001/api/csv-import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('CSV upload failed');
      
      // Invalidate cache on upload
      apiCache.clear();
      console.log('🗑️ Cache cleared after CSV upload');
      
      return await response.json();
    } catch (error) {
      console.error('CSV upload failed:', error);
      throw error;
    }
  }
};

// React hook for cached API calls
export const useOptimizedAPI = () => {
  const fetchMarketData = useCallback(optimizedApiService.fetchMarketData, []);
  const updateMarketData = useCallback(optimizedApiService.updateMarketData, []);
  const uploadCSV = useCallback(optimizedApiService.uploadCSV, []);
  
  const clearCache = useCallback(() => {
    apiCache.clear();
    console.log('🗑️ Manual cache clear');
  }, []);
  
  return {
    fetchMarketData,
    updateMarketData,
    uploadCSV,
    clearCache
  };
};

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = React.useState({
    renderTime: 0,
    memoryUsage: 0,
    apiCalls: 0,
    cacheHits: 0
  });
  
  const startRender = React.useRef<number>(0);
  
  React.useEffect(() => {
    startRender.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - startRender.current;
      setMetrics(prev => ({
        ...prev,
        renderTime: Math.round(renderTime * 100) / 100
      }));
    };
  });
  
  const logPerformance = useCallback(() => {
    if (typeof performance !== 'undefined' && 'memory' in performance && (performance as any).memory) {
      setMetrics(prev => ({
        ...prev,
        memoryUsage: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
      }));
    }
  }, []);
  
  return { metrics, logPerformance };
};

// Debounced input hook for search
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};
