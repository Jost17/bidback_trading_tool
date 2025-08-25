/**
 * React Hook for Breadth Score Calculator
 * Provides easy access to all calculator functionality from React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  BreadthCalculationConfig,
  BreadthResult,
  AlgorithmType,
  PerformanceMetrics
} from '../../types/breadth-calculation-config';
import type { RawMarketBreadthData } from '../../types/breadth-raw-data';
import type { EnhancedBreadthResult } from '../../types/trading';

interface UseBreadthCalculatorOptions {
  defaultAlgorithm?: AlgorithmType;
  autoCalculate?: boolean;
  cacheResults?: boolean;
}

interface CalculatorState {
  isLoading: boolean;
  error: string | null;
  currentAlgorithm: AlgorithmType;
  currentConfig: BreadthCalculationConfig | null;
  availableAlgorithms: Array<{
    type: AlgorithmType;
    name: string;
    description: string;
    requiredFields: string[];
    optionalFields: string[];
  }>;
  latestResult: BreadthResult | null;
  performanceMetrics: PerformanceMetrics[];
}

interface BulkCalculationProgress {
  completed: number;
  total: number;
  currentDate: string;
  percentage: number;
  successful?: number;
  failed?: number;
}

export function useBreadthCalculator(options: UseBreadthCalculatorOptions = {}) {
  const {
    defaultAlgorithm = 'six_factor',
    autoCalculate = false,
    cacheResults = true
  } = options;

  // State management
  const [state, setState] = useState<CalculatorState>({
    isLoading: false,
    error: null,
    currentAlgorithm: defaultAlgorithm,
    currentConfig: null,
    availableAlgorithms: [],
    latestResult: null,
    performanceMetrics: []
  });

  // Cache for results if enabled
  const resultsCache = useRef<Map<string, BreadthResult>>(new Map());
  const configCache = useRef<Map<string, BreadthCalculationConfig>>(new Map());

  // Initialize calculator and load algorithms
  useEffect(() => {
    initializeCalculator();
  }, []);

  /**
   * Initialize calculator system
   */
  const initializeCalculator = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Load available algorithms
      const algorithmsResponse = await window.tradingAPI?.invoke?.('breadth-calculator:get-algorithms');
      if (algorithmsResponse?.success) {
        setState(prev => ({ 
          ...prev, 
          availableAlgorithms: algorithmsResponse.algorithms 
        }));
      }

      // Switch to default algorithm and get config
      await switchAlgorithm(defaultAlgorithm);

      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize calculator'
      }));
    }
  }, [defaultAlgorithm]);

  /**
   * Calculate breadth score for single data point
   */
  const calculateSingle = useCallback(async (
    data: RawMarketBreadthData,
    algorithm?: AlgorithmType,
    saveToDatabase: boolean = false
  ): Promise<BreadthResult | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const cacheKey = `${data.date}_${algorithm || state.currentAlgorithm}`;
      
      // Check cache first if enabled
      if (cacheResults && resultsCache.current.has(cacheKey)) {
        const cachedResult = resultsCache.current.get(cacheKey)!;
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          latestResult: cachedResult
        }));
        return cachedResult;
      }

      const response = await window.tradingAPI?.invoke?.('breadth-calculator:calculate-single', {
        data,
        algorithm,
        saveToDatabase,
        includeHistorical: true
      });

      if (response?.success === false) {
        throw new Error(response.error || 'Calculation failed');
      }

      const result = response as BreadthResult;
      
      // Cache result if enabled
      if (cacheResults) {
        resultsCache.current.set(cacheKey, result);
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        latestResult: result
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorMessage
      }));
      return null;
    }
  }, [state.currentAlgorithm, cacheResults]);

  /**
   * Calculate breadth scores for date range
   */
  const calculateHistorical = useCallback(async (
    startDate: string,
    endDate: string,
    algorithm?: AlgorithmType,
    progressCallback?: (progress: BulkCalculationProgress) => void
  ): Promise<BreadthResult[]> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:calculate-from-database', 
        startDate, 
        endDate, 
        algorithm || state.currentAlgorithm
      );

      if (!Array.isArray(response)) {
        throw new Error('Invalid response format');
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Historical calculation failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorMessage
      }));
      return [];
    }
  }, [state.currentAlgorithm]);

  /**
   * Get real-time calculation for latest data
   */
  const calculateRealTime = useCallback(async (algorithm?: AlgorithmType): Promise<BreadthResult | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:calculate-realtime', 
        algorithm || state.currentAlgorithm
      );

      if (!response) {
        setState(prev => ({ ...prev, isLoading: false }));
        return null;
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        latestResult: response
      }));

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Real-time calculation failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorMessage
      }));
      return null;
    }
  }, [state.currentAlgorithm]);

  /**
   * Switch algorithm
   */
  const switchAlgorithm = useCallback(async (
    algorithm: AlgorithmType, 
    customConfig?: Partial<BreadthCalculationConfig>
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:switch-algorithm', 
        algorithm, 
        customConfig
      );

      if (response?.success) {
        setState(prev => ({ 
          ...prev, 
          currentAlgorithm: algorithm,
          currentConfig: response.config,
          isLoading: false
        }));
        return true;
      } else {
        throw new Error(response?.error || 'Failed to switch algorithm');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Algorithm switch failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  /**
   * Configuration management
   */
  const createConfig = useCallback(async (
    algorithm: AlgorithmType,
    name: string,
    configOverrides?: Partial<BreadthCalculationConfig>
  ): Promise<string | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:create-config', {
        algorithm,
        name,
        ...configOverrides
      });

      if (response?.success) {
        setState(prev => ({ ...prev, isLoading: false }));
        return response.version;
      } else {
        throw new Error(response?.error || 'Failed to create configuration');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Configuration creation failed';
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorMessage
      }));
      return null;
    }
  }, []);

  const loadConfig = useCallback(async (version: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:get-config', version);

      if (response?.success && response.config) {
        // Switch to the algorithm of the loaded config
        await switchAlgorithm(response.config.algorithm);
        
        setState(prev => ({ 
          ...prev, 
          currentConfig: response.config,
          isLoading: false
        }));
        return true;
      } else {
        throw new Error(response?.error || 'Configuration not found');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load configuration';
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, [switchAlgorithm]);

  const listConfigs = useCallback(async (activeOnly: boolean = true): Promise<BreadthCalculationConfig[]> => {
    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:list-configs', activeOnly);
      return response?.success ? response.configs : [];
    } catch (error) {
      console.error('Failed to list configurations:', error);
      return [];
    }
  }, []);

  /**
   * Data validation
   */
  const validateData = useCallback(async (data: RawMarketBreadthData) => {
    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:validate-data', data);
      return response?.success ? response.validation : null;
    } catch (error) {
      console.error('Data validation failed:', error);
      return null;
    }
  }, []);

  /**
   * Performance monitoring
   */
  const getPerformanceMetrics = useCallback(async (): Promise<PerformanceMetrics[]> => {
    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:get-performance-metrics');
      if (response?.success) {
        setState(prev => ({ 
          ...prev, 
          performanceMetrics: response.metrics
        }));
        return response.metrics;
      }
      return [];
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return [];
    }
  }, []);

  const clearPerformanceMetrics = useCallback(async (): Promise<boolean> => {
    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:clear-performance-metrics');
      if (response?.success) {
        setState(prev => ({ 
          ...prev, 
          performanceMetrics: []
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to clear performance metrics:', error);
      return false;
    }
  }, []);

  /**
   * Health check
   */
  const healthCheck = useCallback(async () => {
    try {
      return await window.tradingAPI?.invoke?.('breadth-calculator:health-check');
    } catch (error) {
      console.error('Health check failed:', error);
      return { success: false, status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    resultsCache.current.clear();
    configCache.current.clear();
  }, []);

  /**
   * Auto-calculation effect
   */
  useEffect(() => {
    if (autoCalculate && state.currentConfig) {
      const interval = setInterval(async () => {
        await calculateRealTime();
      }, 60000); // Calculate every minute

      return () => clearInterval(interval);
    }
  }, [autoCalculate, state.currentConfig, calculateRealTime]);

  // Return hook interface
  return {
    // State
    ...state,
    
    // Calculation methods
    calculateSingle,
    calculateHistorical,
    calculateRealTime,
    
    // Algorithm management
    switchAlgorithm,
    availableAlgorithms: state.availableAlgorithms,
    
    // Configuration management
    createConfig,
    loadConfig,
    listConfigs,
    currentConfig: state.currentConfig,
    
    // Data validation
    validateData,
    
    // Performance monitoring
    getPerformanceMetrics,
    clearPerformanceMetrics,
    performanceMetrics: state.performanceMetrics,
    
    // Utilities
    healthCheck,
    clearCache,
    
    // Status flags
    isReady: !state.isLoading && state.availableAlgorithms.length > 0,
    hasError: !!state.error
  };
}

/**
 * Hook for configuration management specifically
 */
export function useBreadthCalculatorConfig() {
  const [configs, setConfigs] = useState<BreadthCalculationConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = useCallback(async (activeOnly: boolean = true) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:list-configs', activeOnly);
      if (response?.success) {
        setConfigs(response.configs);
      } else {
        throw new Error(response?.error || 'Failed to load configurations');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load configurations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConfig = useCallback(async (
    algorithm: AlgorithmType,
    name: string,
    configData: Partial<BreadthCalculationConfig>
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:create-config', {
        algorithm,
        name,
        ...configData
      });

      if (response?.success) {
        await loadConfigs(); // Refresh list
        return response.version;
      } else {
        throw new Error(response?.error || 'Failed to create configuration');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create configuration');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadConfigs]);

  const updateConfig = useCallback(async (
    version: string,
    updates: Partial<BreadthCalculationConfig>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:update-config', version, updates);
      
      if (response?.success) {
        await loadConfigs(); // Refresh list
        return true;
      } else {
        throw new Error(response?.error || 'Failed to update configuration');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update configuration');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadConfigs]);

  const setDefaultConfig = useCallback(async (version: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:set-default-config', version);
      
      if (response?.success) {
        await loadConfigs(); // Refresh list
        return true;
      } else {
        throw new Error(response?.error || 'Failed to set default configuration');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to set default configuration');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadConfigs]);

  const exportConfigs = useCallback(async (versions?: string[]): Promise<string | null> => {
    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:export-configs', versions);
      return response?.success ? response.data : null;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to export configurations');
      return null;
    }
  }, []);

  const importConfigs = useCallback(async (configsJson: string): Promise<{ imported: number; errors: string[] } | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:import-configs', configsJson);
      
      if (response?.success) {
        await loadConfigs(); // Refresh list
        return {
          imported: response.imported,
          errors: response.errors || []
        };
      } else {
        throw new Error(response?.error || 'Failed to import configurations');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import configurations');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadConfigs]);

  // Initialize on mount
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return {
    configs,
    isLoading,
    error,
    loadConfigs,
    createConfig,
    updateConfig,
    setDefaultConfig,
    exportConfigs,
    importConfigs
  };
}

/**
 * Hook for performance monitoring
 */
export function useBreadthCalculatorPerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:get-performance-metrics');
      if (response?.success) {
        setMetrics(response.metrics);
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMetrics = useCallback(async () => {
    try {
      const response = await window.tradingAPI?.invoke?.('breadth-calculator:clear-performance-metrics');
      if (response?.success) {
        setMetrics([]);
      }
    } catch (error) {
      console.error('Failed to clear performance metrics:', error);
    }
  }, []);

  // Auto-refresh metrics
  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadMetrics]);

  // Calculate summary statistics
  const summary = {
    totalCalculations: metrics.length,
    averageTime: metrics.length > 0 ? 
      metrics.reduce((sum, m) => sum + m.calculationTime, 0) / metrics.length : 0,
    fastestTime: metrics.length > 0 ? 
      Math.min(...metrics.map(m => m.calculationTime)) : 0,
    slowestTime: metrics.length > 0 ? 
      Math.max(...metrics.map(m => m.calculationTime)) : 0,
    totalRecords: metrics.reduce((sum, m) => sum + m.recordsProcessed, 0),
    averageRecordsPerSecond: metrics.length > 0 ? 
      metrics.reduce((sum, m) => sum + m.recordsPerSecond, 0) / metrics.length : 0
  };

  return {
    metrics,
    summary,
    isLoading,
    loadMetrics,
    clearMetrics
  };
}