import React, { useState, useCallback, useEffect } from 'react'
import { Settings, DollarSign, Save, RefreshCcw, AlertCircle, CheckCircle, Info, Plus, Trash2, Loader, Wifi, WifiOff, Clock } from 'lucide-react'
import { PortfolioSettings as GlobalPortfolioSettings, TradingSetup } from '../../../types/trading'
import { usePortfolio } from '../../contexts/PortfolioContext'

interface PortfolioSettingsProps {
  onSettingsChange?: (settings: GlobalPortfolioSettings) => void
}

export function PortfolioSettings({ 
  onSettingsChange
}: PortfolioSettingsProps) {
  
  // Use global portfolio context
  const { 
    settings: globalSettings, 
    isLoading, 
    error: globalError, 
    updateSettings, 
    resetToDefaults 
  } = usePortfolio()
  
  // Local state for form editing
  const [tempSettings, setTempSettings] = useState<GlobalPortfolioSettings | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Initialize temp settings when global settings load
  useEffect(() => {
    if (globalSettings && !tempSettings) {
      setTempSettings({ ...globalSettings })
    }
  }, [globalSettings, tempSettings])
  
  // Default settings fallback
  const settings = globalSettings || {
    portfolioSize: 100000,
    baseSizePercentage: 10,
    maxHeatPercentage: 80,
    maxPositions: 8,
    tradingSetups: [
      { id: 'bidback', name: 'Bidback', description: 'Original Bidback System', isActive: true },
      { id: 'bidback-9', name: 'Bidback 9', description: 'Enhanced Bidback System v9', isActive: true },
      { id: 'bidback-new-bo', name: 'Bidback New $BO', description: 'New Bidback $BO System', isActive: true }
    ],
    riskPerTrade: 2,
    useKellySizing: false,
    enablePositionScaling: true,
    useIBAccountSize: false,
    ibAccountId: '',
    ibSyncInterval: 5,
    ibConnectionStatus: 'disconnected' as const,
    ibLastSync: undefined,
    lastUpdated: new Date().toISOString()
  }
  
  // This effect is no longer needed since we use global settings
  
  // Calculate derived values
  const basePositionSize = (settings.portfolioSize * settings.baseSizePercentage) / 100
  const maxHeatDollar = (settings.portfolioSize * settings.maxHeatPercentage) / 100
  const maxSinglePosition = settings.portfolioSize * 0.30 // 30% max single position
  
  // Validation
  const validateSettings = useCallback((settingsToValidate: PortfolioSettings): Record<string, string> => {
    const newErrors: Record<string, string> = {}
    
    if (settingsToValidate.portfolioSize < 1000) {
      newErrors.portfolioSize = 'Portfolio size must be at least $1,000'
    }
    
    if (settingsToValidate.portfolioSize > 50000000) {
      newErrors.portfolioSize = 'Portfolio size seems unreasonably high'
    }
    
    if (settingsToValidate.baseSizePercentage < 1 || settingsToValidate.baseSizePercentage > 50) {
      newErrors.baseSizePercentage = 'Base size must be between 1% and 50%'
    }
    
    if (settingsToValidate.maxHeatPercentage < 10 || settingsToValidate.maxHeatPercentage > 100) {
      newErrors.maxHeatPercentage = 'Max heat must be between 10% and 100%'
    }
    
    if (settingsToValidate.maxPositions < 1 || settingsToValidate.maxPositions > 20) {
      newErrors.maxPositions = 'Max positions must be between 1 and 20'
    }
    
    return newErrors
  }, [])
  
  // Handle input changes
  const handleInputChange = useCallback((field: keyof PortfolioSettings, value: string | number) => {
    const numericValue = typeof value === 'string' ? Number(value) : value
    
    setTempSettings(prev => ({
      ...prev,
      [field]: numericValue
    }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [errors])
  
  // Save settings
  const handleSave = useCallback(async () => {
    if (!tempSettings) return
    
    const validationErrors = validateSettings(tempSettings)
    setErrors(validationErrors)
    
    if (Object.keys(validationErrors).length > 0) {
      return
    }
    
    setIsSaving(true)
    
    try {
      const updatedSettings = {
        ...tempSettings,
        lastUpdated: new Date().toISOString()
      }
      
      // Save to global context (backend)
      await updateSettings(updatedSettings)
      
      // Call prop callback if provided (for backward compatibility)
      onSettingsChange?.(updatedSettings)
      
      // Show success message
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      
      // Auto-close settings panel after save
      setTimeout(() => setShowSettings(false), 1500)
      
    } catch (error) {
      console.error('Failed to save portfolio settings:', error)
      setErrors({ general: 'Failed to save settings. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }, [tempSettings, validateSettings, updateSettings, onSettingsChange])
  
  // Reset to defaults
  const handleReset = useCallback(async () => {
    try {
      setIsSaving(true)
      await resetToDefaults()
      
      // Show success message
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      
      // Auto-close settings panel after reset
      setTimeout(() => setShowSettings(false), 1500)
      
    } catch (error) {
      console.error('Failed to reset portfolio settings:', error)
      setErrors({ general: 'Failed to reset settings. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }, [resetToDefaults])
  
  // Cancel changes
  const handleCancel = useCallback(() => {
    if (globalSettings) {
      setTempSettings({ ...globalSettings })
    }
    setErrors({})
    setShowSettings(false)
  }, [globalSettings])
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Portfolio Settings</h2>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          {showSettings ? 'Close' : 'Edit Settings'}
        </button>
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-center space-x-2 text-gray-600">
            <Loader className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading portfolio settings...</span>
          </div>
        </div>
      )}
      
      {/* Global Error State */}
      {globalError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <div>
              <div className="font-medium text-sm">Error loading settings</div>
              <div className="text-sm">{globalError}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Message */}
      {showSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Settings saved successfully!</span>
          </div>
        </div>
      )}
      
      {/* Error Messages */}
      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{errors.general}</span>
          </div>
        </div>
      )}
      
      {/* Current Settings Display */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            ${settings.portfolioSize.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Portfolio Size</div>
        </div>
        
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            ${basePositionSize.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Base Position ({settings.baseSizePercentage}%)</div>
        </div>
        
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            ${maxHeatDollar.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Max Heat ({settings.maxHeatPercentage}%)</div>
        </div>
        
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {settings.maxPositions}
          </div>
          <div className="text-sm text-gray-600">Max Positions</div>
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="border-t pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Portfolio Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portfolio Size ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={tempSettings.portfolioSize}
                  onChange={(e) => handleInputChange('portfolioSize', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.portfolioSize ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="100000"
                  // Removed HTML5 validation constraints for flexible portfolio size input
                />
              </div>
              {errors.portfolioSize && (
                <p className="mt-1 text-sm text-red-600">{errors.portfolioSize}</p>
              )}
            </div>
            
            {/* Base Position Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Position Size (%)
              </label>
              <input
                type="number"
                value={tempSettings.baseSizePercentage}
                onChange={(e) => handleInputChange('baseSizePercentage', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.baseSizePercentage ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="10"
                // Removed HTML5 validation constraints for flexible percentage input
              />
              {errors.baseSizePercentage && (
                <p className="mt-1 text-sm text-red-600">{errors.baseSizePercentage}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Default: 10% (Bidback Master System standard)
              </p>
            </div>
            
            {/* Maximum Heat Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Portfolio Heat (%)
              </label>
              <input
                type="number"
                value={tempSettings.maxHeatPercentage}
                onChange={(e) => handleInputChange('maxHeatPercentage', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxHeatPercentage ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="80"
                // Removed HTML5 validation constraints for flexible heat percentage input
              />
              {errors.maxHeatPercentage && (
                <p className="mt-1 text-sm text-red-600">{errors.maxHeatPercentage}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Maximum capital at risk simultaneously
              </p>
            </div>
            
            {/* Maximum Positions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Concurrent Positions
              </label>
              <input
                type="number"
                value={tempSettings.maxPositions}
                onChange={(e) => handleInputChange('maxPositions', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxPositions ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="8"
                // Removed HTML5 validation constraints for flexible position count input
              />
              {errors.maxPositions && (
                <p className="mt-1 text-sm text-red-600">{errors.maxPositions}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Based on 10% base positions = 8 max positions
              </p>
            </div>
            
            {/* Trading Setups Management */}
            <div className="col-span-2 mt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700">
                  Trading Setups
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newSetup = {
                      id: `setup-${Date.now()}`,
                      name: 'New Setup',
                      description: 'Custom trading setup',
                      isActive: true
                    }
                    setTempSettings(prev => ({
                      ...prev,
                      tradingSetups: [...prev.tradingSetups, newSetup]
                    }))
                  }}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Setup</span>
                </button>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {tempSettings.tradingSetups.map((setup, index) => (
                  <div key={setup.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      checked={setup.isActive}
                      onChange={(e) => {
                        const newSetups = [...tempSettings.tradingSetups]
                        newSetups[index] = { ...setup, isActive: e.target.checked }
                        setTempSettings(prev => ({ ...prev, tradingSetups: newSetups }))
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={setup.name}
                        onChange={(e) => {
                          const newSetups = [...tempSettings.tradingSetups]
                          newSetups[index] = { ...setup, name: e.target.value }
                          setTempSettings(prev => ({ ...prev, tradingSetups: newSetups }))
                        }}
                        className="w-full text-sm font-medium text-gray-900 bg-transparent border-0 focus:ring-0 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={setup.description}
                        onChange={(e) => {
                          const newSetups = [...tempSettings.tradingSetups]
                          newSetups[index] = { ...setup, description: e.target.value }
                          setTempSettings(prev => ({ ...prev, tradingSetups: newSetups }))
                        }}
                        className="w-full text-xs text-gray-500 bg-transparent border-0 focus:ring-0 focus:outline-none"
                        placeholder="Description"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setTempSettings(prev => ({
                          ...prev,
                          tradingSetups: prev.tradingSetups.filter((_, i) => i !== index)
                        }))
                      }}
                      className="text-red-600 hover:text-red-700"
                      disabled={tempSettings.tradingSetups.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <p className="mt-2 text-xs text-gray-500">
                Manage your trading setups. Active setups will be available in the Position Calculator.
              </p>
            </div>
            
            {/* IB Integration Section */}
            <div className="col-span-2 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Wifi className="w-4 h-4 text-blue-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Interactive Brokers Integration
                  </label>
                </div>
                <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium ${
                  settings.ibConnectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                  settings.ibConnectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                  settings.ibConnectionStatus === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {settings.ibConnectionStatus === 'connected' ? <Wifi className="w-3 h-3" /> :
                   settings.ibConnectionStatus === 'connecting' ? <Loader className="w-3 h-3 animate-spin" /> :
                   <WifiOff className="w-3 h-3" />}
                  <span className="capitalize">{settings.ibConnectionStatus || 'Disconnected'}</span>
                </div>
              </div>
              
              <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
                {/* Use IB Account Size Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Use IB Account Size</h4>
                    <p className="text-sm text-gray-600">Automatically sync portfolio size from Interactive Brokers</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempSettings?.useIBAccountSize || false}
                      onChange={(e) => {
                        setTempSettings(prev => ({
                          ...prev,
                          useIBAccountSize: e.target.checked
                        }))
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* IB Account ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IB Account ID
                    </label>
                    <input
                      type="text"
                      value={tempSettings?.ibAccountId || ''}
                      onChange={(e) => {
                        setTempSettings(prev => ({
                          ...prev,
                          ibAccountId: e.target.value
                        }))
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="DU123456"
                      disabled={!tempSettings?.useIBAccountSize}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Your Interactive Brokers account identifier
                    </p>
                  </div>

                  {/* Sync Interval */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sync Interval (minutes)
                    </label>
                    <input
                      type="number"
                      value={tempSettings?.ibSyncInterval || 5}
                      onChange={(e) => {
                        setTempSettings(prev => ({
                          ...prev,
                          ibSyncInterval: parseInt(e.target.value) || 5
                        }))
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="60"
                      disabled={!tempSettings?.useIBAccountSize}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      How often to sync account size from IB
                    </p>
                  </div>
                </div>

                {/* Last Sync Status */}
                {settings.ibLastSync && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Last synced: {new Date(settings.ibLastSync).toLocaleString()}</span>
                  </div>
                )}

                {/* Test Connection Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      // TODO: Implement IB connection test
                      console.log('Testing IB connection...')
                    }}
                    disabled={!tempSettings?.useIBAccountSize || isSaving}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 transition-colors"
                  >
                    Test Connection
                  </button>
                </div>
              </div>
              
              <p className="mt-2 text-xs text-gray-500">
                When enabled, your portfolio size will be automatically updated from your IB account balance.
                Manual portfolio size will be used as fallback if IB connection fails.
              </p>
            </div>
            
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>Reset to Defaults</span>
            </button>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Information Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Bidback Master System Configuration</div>
            <div className="space-y-1 text-xs">
              <p>• <strong>10% Base Position:</strong> Standard position size for normal conditions</p>
              <p>• <strong>VIX Multipliers:</strong> 0.8x to 1.4x based on volatility regime</p>
              <p>• <strong>Breadth Multipliers:</strong> 0x to 2.5x based on market breadth</p>
              <p>• <strong>Maximum Single Position:</strong> 30% of portfolio (Big Opportunity)</p>
              <p>• <strong>Portfolio Heat Limit:</strong> 80% maximum capital at risk</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Last Updated */}
      {settings.lastUpdated && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          Last updated: {new Date(settings.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  )
}