import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { PortfolioSettings } from '../../types/trading'

interface PortfolioContextType {
  settings: PortfolioSettings | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  updateSettings: (newSettings: PortfolioSettings) => Promise<void>
  resetToDefaults: () => Promise<void>
  refreshSettings: () => Promise<void>
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined)

interface PortfolioProviderProps {
  children: ReactNode
}

export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<PortfolioSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load settings from backend
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const portfolioSettings = await window.tradingAPI.getPortfolioSettings()
      setSettings(portfolioSettings)
      setIsInitialized(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load portfolio settings'
      console.error('Error loading portfolio settings:', error)
      setError(errorMessage)
      
      // Set default settings if loading fails
      setSettings({
        portfolioSize: 100000,
        baseSizePercentage: 10,
        maxHeatPercentage: 30,
        maxPositions: 10,
        tradingSetups: [],
        riskPerTrade: 2,
        useKellySizing: false,
        enablePositionScaling: true,
        lastUpdated: new Date().toISOString()
      })
      setIsInitialized(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update settings and save to backend
  const updateSettings = useCallback(async (newSettings: PortfolioSettings) => {
    try {
      setError(null)
      
      // Optimistically update UI
      setSettings(newSettings)
      
      // Save to backend (excluding database-generated fields)
      const settingsToSave = {
        portfolioSize: newSettings.portfolioSize,
        baseSizePercentage: newSettings.baseSizePercentage,
        maxHeatPercentage: newSettings.maxHeatPercentage,
        maxPositions: newSettings.maxPositions,
        tradingSetups: newSettings.tradingSetups,
        riskPerTrade: newSettings.riskPerTrade,
        useKellySizing: newSettings.useKellySizing,
        enablePositionScaling: newSettings.enablePositionScaling,
        lastUpdated: new Date().toISOString()
      }
      
      await window.tradingAPI.savePortfolioSettings(settingsToSave)
      
      // Refresh settings from backend to get updated timestamps
      await loadSettings()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save portfolio settings'
      console.error('Error saving portfolio settings:', error)
      setError(errorMessage)
      
      // Revert optimistic update on error
      await loadSettings()
      throw new Error(errorMessage)
    }
  }, [loadSettings])

  // Reset to default settings
  const resetToDefaults = useCallback(async () => {
    try {
      setError(null)
      setIsLoading(true)
      
      await window.tradingAPI.resetPortfolioSettings()
      await loadSettings()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset portfolio settings'
      console.error('Error resetting portfolio settings:', error)
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [loadSettings])

  // Refresh settings from backend
  const refreshSettings = useCallback(async () => {
    await loadSettings()
  }, [loadSettings])

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const contextValue: PortfolioContextType = {
    settings,
    isLoading,
    isInitialized,
    error,
    updateSettings,
    resetToDefaults,
    refreshSettings
  }

  return (
    <PortfolioContext.Provider value={contextValue}>
      {children}
    </PortfolioContext.Provider>
  )
}

export const usePortfolio = (): PortfolioContextType => {
  const context = useContext(PortfolioContext)
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider')
  }
  return context
}

// Hook to get portfolio size specifically (most common use case)
export const usePortfolioSize = (): number => {
  const { settings, isInitialized } = usePortfolio()
  
  // Return default size if not initialized or no settings
  if (!isInitialized || !settings) {
    return 100000
  }
  
  return settings.portfolioSize
}

export default PortfolioProvider