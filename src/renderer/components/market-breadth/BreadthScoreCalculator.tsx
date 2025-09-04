import React, { useState, useEffect, useCallback } from 'react'
import { 
  Calculator, 
  Settings, 
  Zap, 
  TrendingUp, 
  BarChart3, 
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle,
  Info,
  Clock,
  Database
} from 'lucide-react'
import { useBreadthCalculator, useBreadthCalculatorConfig } from '../../hooks/useBreadthCalculator'
import type { AlgorithmType, BreadthCalculationConfig } from '../../../types/breadth-calculation-config'
import type { RawMarketBreadthData } from '../../../types/breadth-raw-data'

interface BreadthScoreCalculatorProps {
  onCalculation?: () => void
}

interface CalculationMode {
  type: 'single' | 'historical' | 'bulk'
  title: string
  description: string
}

const CALCULATION_MODES: CalculationMode[] = [
  {
    type: 'single',
    title: 'Manual Calculation',
    description: 'Enter data manually and calculate breadth score'
  },
  {
    type: 'historical',
    title: 'Database Query',
    description: 'Query saved breadth scores from database'
  },
  {
    type: 'bulk',
    title: 'Recalculation',
    description: 'Recalculate existing data with different algorithm'
  }
]

export function BreadthScoreCalculator({ onCalculation }: BreadthScoreCalculatorProps) {
  // State management
  const [selectedMode, setSelectedMode] = useState<CalculationMode['type']>('historical')
  const [showAlgorithmSettings, setShowAlgorithmSettings] = useState(false)
  const [calculationResults, setCalculationResults] = useState<any[]>([])
  const [historicalRange, setHistoricalRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [manualData, setManualData] = useState({
    date: new Date().toISOString().split('T')[0],
    vix: '',
    sp500: '',
    t2108: '',
    stocksUp4Pct: '',
    stocksDown4Pct: ''
  })

  // Breadth calculator hooks
  const {
    calculateSingle,
    calculateRealTime,
    calculateHistorical,
    switchAlgorithm,
    currentAlgorithm,
    currentConfig,
    availableAlgorithms,
    latestResult,
    isLoading,
    error,
    performanceMetrics,
    clearPerformanceMetrics,
    healthCheck
  } = useBreadthCalculator({
    defaultAlgorithm: 'six_factor',
    autoCalculate: false
  })

  const {
    configs,
    createConfig,
    loadConfigs,
    setDefaultConfig,
    isLoading: configLoading,
    error: configError
  } = useBreadthCalculatorConfig()

  // Load configurations on component mount
  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  // Handle algorithm switch
  const handleAlgorithmSwitch = useCallback(async (algorithm: AlgorithmType) => {
    const success = await switchAlgorithm(algorithm)
    if (success) {
      console.log(`Switched to ${algorithm} algorithm`)
    }
  }, [switchAlgorithm])

  // Handle manual calculation
  const handleManualCalculation = useCallback(async () => {
    // Create RawMarketBreadthData from manual input
    const rawData: RawMarketBreadthData = {
      date: manualData.date,
      timestamp: new Date().toISOString(),
      vix: parseFloat(manualData.vix) || 0,
      sp500Level: manualData.sp500,
      t2108: parseFloat(manualData.t2108) || 0,
      stocksUp4PctDaily: parseFloat(manualData.stocksUp4Pct) || 0,
      stocksDown4PctDaily: parseFloat(manualData.stocksDown4Pct) || 0,
      wordenUniverse: 7000,
      dataQualityScore: 100
    }

    const result = await calculateSingle(rawData)
    if (result) {
      setCalculationResults(prev => [result, ...prev.slice(0, 9)])
      onCalculation?.()
    }
  }, [calculateSingle, manualData, onCalculation])

  // Handle historical calculation
  const handleHistoricalCalculation = useCallback(async () => {
    const results = await calculateHistorical(
      historicalRange.startDate,
      historicalRange.endDate
    )
    
    if (results.length > 0) {
      setCalculationResults(results.slice(0, 10)) // Keep last 10 results
      onCalculation?.()
    }
  }, [calculateHistorical, historicalRange, onCalculation])

  // Handle bulk processing
  const handleBulkProcessing = useCallback(async () => {
    // Get all available data and process
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(2020, 0, 1).toISOString().split('T')[0] // Start from 2020
    
    const results = await calculateHistorical(startDate, endDate)
    
    if (results.length > 0) {
      setCalculationResults(results.slice(0, 20)) // Show more results for bulk processing
      onCalculation?.()
    }
  }, [calculateHistorical, onCalculation])

  // Handle calculation based on selected mode
  const handleCalculation = useCallback(async () => {
    switch (selectedMode) {
      case 'single':
        return handleManualCalculation()
      case 'historical':
        return handleHistoricalCalculation()
      case 'bulk':
        return handleBulkProcessing()
      default:
        return handleHistoricalCalculation()
    }
  }, [selectedMode, handleManualCalculation, handleHistoricalCalculation, handleBulkProcessing])

  // Handle configuration save
  const handleSaveConfiguration = useCallback(async () => {
    if (!currentConfig) return
    
    const configName = prompt('Enter configuration name:', `Custom ${currentAlgorithm} Config`)
    if (!configName) return

    const version = await createConfig(currentAlgorithm, configName, currentConfig)
    if (version) {
      console.log(`Configuration saved as version: ${version}`)
    }
  }, [createConfig, currentAlgorithm, currentConfig])

  // Handle health check
  const handleHealthCheck = useCallback(async () => {
    const health = await healthCheck()
    console.log('Calculator health check:', health)
  }, [healthCheck])

  // Format score for display
  const formatScore = (score: number) => score.toFixed(1)

  // Format market condition
  const formatMarketCondition = (result: any) => {
    const { phase, strength, trend_direction } = result.market_condition
    return `${phase} (${strength}) trending ${trend_direction}`
  }

  // Get algorithm description
  const getAlgorithmDescription = (algorithmType: AlgorithmType) => {
    const algorithm = availableAlgorithms.find(a => a.type === algorithmType)
    return algorithm?.description || 'No description available'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Calculator className="w-7 h-7 text-blue-600" />
              <span>Breadth Score Calculator</span>
            </h2>
            <p className="text-gray-600 mt-1">
              Advanced breadth calculation with configurable algorithms
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleHealthCheck}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>Health Check</span>
            </button>
            
            <button
              onClick={() => setShowAlgorithmSettings(!showAlgorithmSettings)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showAlgorithmSettings 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Algorithm Settings</span>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {(error || configError) && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="mt-1 text-red-700">{error || configError}</p>
          </div>
        )}

        {/* Current Algorithm Info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">
                Current Algorithm: {currentAlgorithm.replace('_', ' ').toUpperCase()}
              </h3>
              <p className="text-blue-700 text-sm mt-1">
                {getAlgorithmDescription(currentAlgorithm)}
              </p>
            </div>
            {currentConfig && (
              <div className="text-right text-sm text-blue-600">
                <div>Version: {currentConfig.version}</div>
                <div>Config: {currentConfig.name}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Algorithm Settings Panel */}
      {showAlgorithmSettings && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Algorithm Configuration</h3>
          
          {/* Algorithm Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Available Algorithms</h4>
              <div className="space-y-2">
                {availableAlgorithms.map((algorithm) => (
                  <label key={algorithm.type} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="radio"
                      name="algorithm"
                      value={algorithm.type}
                      checked={currentAlgorithm === algorithm.type}
                      onChange={() => handleAlgorithmSwitch(algorithm.type)}
                      className="mt-1 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{algorithm.name}</div>
                      <div className="text-sm text-gray-600">{algorithm.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Required fields: {algorithm.requiredFields.length} | 
                        Optional fields: {algorithm.optionalFields.length}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Current Configuration Details */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Configuration Details</h4>
              {currentConfig && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="font-medium">Weights:</span>
                    <div className="ml-4 text-sm space-y-1">
                      <div>Primary: {(currentConfig.weights.primary_indicators * 100).toFixed(0)}%</div>
                      <div>Secondary: {(currentConfig.weights.secondary_indicators * 100).toFixed(0)}%</div>
                      <div>Reference: {(currentConfig.weights.reference_data * 100).toFixed(0)}%</div>
                      <div>Sector: {(currentConfig.weights.sector_data * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Score Range:</span> {currentConfig.scaling.min_score} - {currentConfig.scaling.max_score}
                  </div>
                  <div>
                    <span className="font-medium">Normalization:</span> {currentConfig.scaling.normalization}
                  </div>
                  <div>
                    <span className="font-medium">Active:</span> {currentConfig.is_active ? 'Yes' : 'No'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Saved Configurations */}
          <div className="border-t pt-6">
            <h4 className="font-medium text-gray-900 mb-3">Saved Configurations</h4>
            {configLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {configs.map((config) => (
                  <div key={config.version} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{config.name}</span>
                      {config.is_default && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      {config.algorithm} • v{config.version}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => switchAlgorithm(config.algorithm)}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => setDefaultConfig(config.version)}
                        className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200"
                      >
                        Set Default
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleSaveConfiguration}
                disabled={!currentConfig}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Current Config</span>
              </button>
              
              <button
                onClick={() => loadConfigs()}
                className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Configs</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculation Modes */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculation Modes</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {CALCULATION_MODES.map((mode) => (
            <button
              key={mode.type}
              onClick={() => setSelectedMode(mode.type)}
              className={`p-4 text-left border rounded-lg transition-colors ${
                selectedMode === mode.type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">{mode.title}</div>
              <div className="text-sm text-gray-600">{mode.description}</div>
            </button>
          ))}
        </div>

        {/* Manual Calculation Input */}
        {selectedMode === 'single' && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h4 className="font-medium text-gray-900 mb-4">Manual Data Entry</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={manualData.date}
                  onChange={(e) => setManualData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VIX</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 15.50"
                  value={manualData.vix}
                  onChange={(e) => setManualData(prev => ({ ...prev, vix: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">S&P 500</label>
                <input
                  type="text"
                  placeholder="e.g. 4,500.25"
                  value={manualData.sp500}
                  onChange={(e) => setManualData(prev => ({ ...prev, sp500: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">T2108 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 45.5"
                  value={manualData.t2108}
                  onChange={(e) => setManualData(prev => ({ ...prev, t2108: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stocks Up 4%</label>
                <input
                  type="number"
                  placeholder="e.g. 250"
                  value={manualData.stocksUp4Pct}
                  onChange={(e) => setManualData(prev => ({ ...prev, stocksUp4Pct: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stocks Down 4%</label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={manualData.stocksDown4Pct}
                  onChange={(e) => setManualData(prev => ({ ...prev, stocksDown4Pct: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Database Query Settings */}
        {(selectedMode === 'historical') && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h4 className="font-medium text-gray-900 mb-4">Database Query Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={historicalRange.startDate}
                  onChange={(e) => setHistoricalRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={historicalRange.endDate}
                  onChange={(e) => setHistoricalRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Query existing breadth scores from the database for the selected date range. 
              No recalculation will be performed - only saved data will be retrieved.
            </p>
          </div>
        )}

        {/* Recalculation Settings */}
        {(selectedMode === 'bulk') && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h4 className="font-medium text-gray-900 mb-4">Recalculation Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={historicalRange.startDate}
                  onChange={(e) => setHistoricalRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={historicalRange.endDate}
                  onChange={(e) => setHistoricalRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <div className="flex items-center space-x-2 text-yellow-800 mb-2">
                <Info className="w-5 h-5" />
                <span className="font-medium">Recalculation Process</span>
              </div>
              <p className="text-yellow-700 text-sm">
                This will recalculate breadth scores for existing data using the currently selected algorithm ({currentAlgorithm}). 
                Existing scores will be updated in the database.
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Use this to apply different algorithms to historical data or update scores after algorithm improvements.
            </p>
          </div>
        )}

        {/* Calculate Button */}
        <div className="flex items-center justify-center">
          <button
            onClick={handleCalculation}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-lg font-medium"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Calculating...</span>
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5" />
                <span>Run Calculation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Latest Result Display */}
      {latestResult && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Latest Calculation Result</span>
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatScore(latestResult.score)}
              </div>
              <div className="text-sm text-gray-600">Raw Score</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatScore(latestResult.normalizedScore)}
              </div>
              <div className="text-sm text-gray-600">Normalized Score</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(latestResult.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center">
              <div className={`text-lg font-bold px-2 py-1 rounded ${
                latestResult.market_condition.phase === 'BULL' ? 'bg-green-100 text-green-800' :
                latestResult.market_condition.phase === 'BEAR' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {latestResult.market_condition.phase}
              </div>
              <div className="text-sm text-gray-600">Market Phase</div>
            </div>
          </div>

          {/* Component Breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-3">
              <div className="text-lg font-semibold text-blue-600">
                {formatScore(latestResult.components.primary_score)}
              </div>
              <div className="text-xs text-gray-600">Primary Indicators</div>
            </div>
            
            <div className="bg-white rounded-lg p-3">
              <div className="text-lg font-semibold text-green-600">
                {formatScore(latestResult.components.secondary_score)}
              </div>
              <div className="text-xs text-gray-600">Secondary Indicators</div>
            </div>
            
            <div className="bg-white rounded-lg p-3">
              <div className="text-lg font-semibold text-purple-600">
                {formatScore(latestResult.components.reference_score)}
              </div>
              <div className="text-xs text-gray-600">Reference Data</div>
            </div>
            
            <div className="bg-white rounded-lg p-3">
              <div className="text-lg font-semibold text-orange-600">
                {formatScore(latestResult.components.sector_score)}
              </div>
              <div className="text-xs text-gray-600">Sector Analysis</div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg p-4 text-sm text-gray-600">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div><strong>Date:</strong> {latestResult.date}</div>
              <div><strong>Algorithm:</strong> {latestResult.metadata.algorithm_used}</div>
              <div><strong>Calculation Time:</strong> {latestResult.metadata.calculation_time.toFixed(2)}ms</div>
              <div><strong>Data Quality:</strong> {latestResult.metadata.data_quality}%</div>
            </div>
            <div className="mt-2">
              <div><strong>Market Condition:</strong> {formatMarketCondition(latestResult)}</div>
              {latestResult.metadata.warnings && latestResult.metadata.warnings.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                  <strong>Warnings:</strong> {latestResult.metadata.warnings.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Breadth Score Legend */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 mt-4 border border-indigo-200">
            <div className="flex items-center mb-3">
              <Info className="w-5 h-5 text-indigo-600 mr-2" />
              <h4 className="font-semibold text-indigo-900">Breadth Score Interpretation</h4>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
              {/* Score Ranges */}
              <div>
                <div className="font-medium text-gray-800 mb-2">Score-Bereiche (0-100):</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span>0-25: Stark Bearish</span>
                    </span>
                    <span className="text-xs text-gray-600">Starke Markt-Schwäche</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                      <span>25-40: Bearish</span>
                    </span>
                    <span className="text-xs text-gray-600">Markt-Schwäche</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                      <span>40-60: Neutral</span>
                    </span>
                    <span className="text-xs text-gray-600">Keine klare Richtung</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span>60-75: Bullish</span>
                    </span>
                    <span className="text-xs text-gray-600">Markt-Stärke</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <div className="w-3 h-3 bg-emerald-600 rounded-full mr-2"></div>
                      <span>75-100: Stark Bullish</span>
                    </span>
                    <span className="text-xs text-gray-600">Starke Markt-Stärke</span>
                  </div>
                </div>
              </div>
              
              {/* Current Score Interpretation */}
              <div>
                <div className="font-medium text-gray-800 mb-2">Dein aktueller Score ({formatScore(latestResult.normalizedScore)}):</div>
                <div className="p-3 bg-white rounded border-2 border-dashed border-indigo-200">
                  {latestResult.normalizedScore >= 75 ? (
                    <div className="text-emerald-700">
                      <div className="font-semibold flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Stark Bullish
                      </div>
                      <div className="text-sm mt-1">
                        Breite Markt-Beteiligung, gute Gelegenheit für Long-Positionen. 
                        VIX und Breadth-Indikatoren unterstützen bullishe Strategie.
                      </div>
                    </div>
                  ) : latestResult.normalizedScore >= 60 ? (
                    <div className="text-green-700">
                      <div className="font-semibold flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Bullish
                      </div>
                      <div className="text-sm mt-1">
                        Positive Markt-Breadth, moderate Long-Bias empfehlenswert. 
                        Stockpicking-Gelegenheiten vorhanden.
                      </div>
                    </div>
                  ) : latestResult.normalizedScore >= 40 ? (
                    <div className="text-gray-700">
                      <div className="font-semibold flex items-center">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Neutral
                      </div>
                      <div className="text-sm mt-1">
                        Gemischte Signale, selektives Vorgehen. 
                        Breadth zeigt keine klare Richtung - Vorsicht beim Trading.
                      </div>
                    </div>
                  ) : latestResult.normalizedScore >= 25 ? (
                    <div className="text-orange-700">
                      <div className="font-semibold flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1 rotate-180" />
                        Bearish
                      </div>
                      <div className="text-sm mt-1">
                        Schwache Breadth, Long-Positionen reduzieren. 
                        Defensive Strategie oder Short-Bias erwägen.
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-700">
                      <div className="font-semibold flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1 rotate-180" />
                        Stark Bearish
                      </div>
                      <div className="text-sm mt-1">
                        Sehr schwache Markt-Breadth, Long-Positionen vermeiden. 
                        Defensive oder Short-Strategie bevorzugen.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs">
              <strong>Hinweis:</strong> Der Breadth Score kombiniert VIX, T2108, Up/Down 4% Stocks und weitere Faktoren. 
              Höhere Scores zeigen breitere Markt-Beteiligung und geringeres Risiko für Long-Positionen an.
            </div>
          </div>
        </div>
      )}

      {/* Recent Calculations */}
      {calculationResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Calculations</h3>
            <span className="text-sm text-gray-600">{calculationResults.length} results</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Score</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Normalized</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Confidence</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Market Phase</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Algorithm</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Time (ms)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {calculationResults.slice(0, 10).map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{result.date}</td>
                    <td className="px-4 py-2 text-sm font-semibold">{formatScore(result.score)}</td>
                    <td className="px-4 py-2 text-sm">{formatScore(result.normalizedScore)}</td>
                    <td className="px-4 py-2 text-sm">{(result.confidence * 100).toFixed(0)}%</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        result.market_condition.phase === 'BULL' ? 'bg-green-100 text-green-800' :
                        result.market_condition.phase === 'BEAR' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {result.market_condition.phase}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{result.metadata.algorithm_used}</td>
                    <td className="px-4 py-2 text-sm">{result.metadata.calculation_time.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {performanceMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Performance Metrics</span>
            </h3>
            <button
              onClick={clearPerformanceMetrics}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Metrics
            </button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {performanceMetrics.length}
              </div>
              <div className="text-sm text-gray-600">Total Calculations</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {(performanceMetrics.reduce((sum, m) => sum + m.calculationTime, 0) / performanceMetrics.length).toFixed(1)}ms
              </div>
              <div className="text-sm text-gray-600">Average Time</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.max(...performanceMetrics.map(m => m.calculationTime)).toFixed(1)}ms
              </div>
              <div className="text-sm text-gray-600">Max Time</div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {(performanceMetrics.reduce((sum, m) => sum + m.recordsPerSecond, 0) / performanceMetrics.length).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Avg Records/sec</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}