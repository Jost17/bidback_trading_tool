/**
 * Flexible Breadth Calculator Demo Component
 * Demonstrates the new configurable breadth score calculation system
 */

import React, { useState, useEffect } from 'react';
import { useBreadthCalculator, useBreadthCalculatorConfig } from '../../hooks/useBreadthCalculator';
import type { 
  AlgorithmType, 
  BreadthCalculationConfig,
  BreadthResult 
} from '../../../types/breadth-calculation-config';
import type { RawMarketBreadthData } from '../../../types/breadth-raw-data';

const FlexibleBreadthCalculator: React.FC = () => {
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
    isReady,
    validateData,
    performanceMetrics,
    clearPerformanceMetrics
  } = useBreadthCalculator({
    defaultAlgorithm: 'six_factor',
    autoCalculate: false,
    cacheResults: true
  });

  const {
    configs,
    createConfig,
    loadConfigs,
    setDefaultConfig
  } = useBreadthCalculatorConfig();

  // Sample data for testing
  const [testData, setTestData] = useState<RawMarketBreadthData>({
    date: '2025-08-25',
    timestamp: new Date().toISOString(),
    advancingIssues: 1200,
    decliningIssues: 800,
    newHighs: 150,
    newLows: 50,
    upVolume: 2500000000,
    downVolume: 1500000000,
    stocksUp4PctDaily: 180,
    stocksDown4PctDaily: 120,
    stocksUp25PctQuarterly: 450,
    stocksDown25PctQuarterly: 200,
    t2108: 65,
    sp500Level: '5,847',
    wordenUniverse: 2500,
    basicMaterialsSector: 75,
    consumerCyclicalSector: 80,
    financialServicesSector: 85,
    technologySector: 92,
    dataQualityScore: 95
  });

  const [calculationResults, setCalculationResults] = useState<BreadthResult[]>([]);
  const [selectedConfigVersion, setSelectedConfigVersion] = useState<string>('');

  // Load configurations on component mount
  useEffect(() => {
    if (isReady) {
      loadConfigs();
    }
  }, [isReady, loadConfigs]);

  // Handle algorithm switch
  const handleAlgorithmSwitch = async (algorithm: AlgorithmType) => {
    const success = await switchAlgorithm(algorithm);
    if (success) {
      console.log(`Switched to ${algorithm} algorithm`);
    }
  };

  // Handle single calculation
  const handleSingleCalculation = async () => {
    const result = await calculateSingle(testData, currentAlgorithm, false);
    if (result) {
      setCalculationResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
    }
  };

  // Handle real-time calculation
  const handleRealTimeCalculation = async () => {
    await calculateRealTime(currentAlgorithm);
  };

  // Handle historical calculation
  const handleHistoricalCalculation = async () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const results = await calculateHistorical(startDate, endDate, currentAlgorithm);
    console.log(`Calculated ${results.length} historical records`);
  };

  // Handle data validation
  const handleDataValidation = async () => {
    const validation = await validateData(testData);
    if (validation) {
      console.log('Data validation:', validation);
    }
  };

  // Handle test data updates
  const updateTestData = (field: keyof RawMarketBreadthData, value: any) => {
    setTestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Format score for display
  const formatScore = (score: number): string => {
    return `${score.toFixed(1)}`;
  };

  // Format market condition
  const formatMarketCondition = (result: BreadthResult): string => {
    const { phase, strength, trend_direction } = result.market_condition;
    return `${phase} (${strength}) trending ${trend_direction}`;
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Breadth Calculator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Flexible Breadth Score Calculator
        </h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="text-red-800">Error: {error}</div>
          </div>
        )}

        {/* Algorithm Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Algorithm Selection</h3>
            <div className="space-y-2">
              {availableAlgorithms.map((algorithm) => (
                <label key={algorithm.type} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="algorithm"
                    value={algorithm.type}
                    checked={currentAlgorithm === algorithm.type}
                    onChange={() => handleAlgorithmSwitch(algorithm.type)}
                    className="text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{algorithm.name}</div>
                    <div className="text-sm text-gray-600">{algorithm.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Current Configuration */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Current Configuration</h3>
            {currentConfig && (
              <div className="space-y-2 text-sm">
                <div><strong>Algorithm:</strong> {currentConfig.name}</div>
                <div><strong>Version:</strong> {currentConfig.version}</div>
                <div><strong>Weights:</strong></div>
                <div className="ml-4 space-y-1">
                  <div>Primary: {(currentConfig.weights.primary_indicators * 100).toFixed(0)}%</div>
                  <div>Secondary: {(currentConfig.weights.secondary_indicators * 100).toFixed(0)}%</div>
                  <div>Reference: {(currentConfig.weights.reference_data * 100).toFixed(0)}%</div>
                  <div>Sector: {(currentConfig.weights.sector_data * 100).toFixed(0)}%</div>
                </div>
                <div><strong>Score Range:</strong> {currentConfig.scaling.min_score} - {currentConfig.scaling.max_score}</div>
                <div><strong>Normalization:</strong> {currentConfig.scaling.normalization}</div>
              </div>
            )}
          </div>
        </div>

        {/* Test Data Input */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">Test Data Input</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={testData.date}
                onChange={(e) => updateTestData('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Advancing Issues</label>
              <input
                type="number"
                value={testData.advancingIssues || ''}
                onChange={(e) => updateTestData('advancingIssues', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Declining Issues</label>
              <input
                type="number"
                value={testData.decliningIssues || ''}
                onChange={(e) => updateTestData('decliningIssues', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">T2108</label>
              <input
                type="number"
                // Removed HTML5 validation constraints for flexible T2108 input
                value={testData.t2108 || ''}
                onChange={(e) => updateTestData('t2108', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Highs</label>
              <input
                type="number"
                value={testData.newHighs || ''}
                onChange={(e) => updateTestData('newHighs', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Lows</label>
              <input
                type="number"
                value={testData.newLows || ''}
                onChange={(e) => updateTestData('newLows', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Up Volume (B)</label>
              <input
                type="number"
                value={testData.upVolume ? (testData.upVolume / 1000000000).toFixed(2) : ''}
                onChange={(e) => updateTestData('upVolume', parseFloat(e.target.value) * 1000000000 || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                // Removed step constraint for flexible volume input
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Down Volume (B)</label>
              <input
                type="number"
                value={testData.downVolume ? (testData.downVolume / 1000000000).toFixed(2) : ''}
                onChange={(e) => updateTestData('downVolume', parseFloat(e.target.value) * 1000000000 || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                // Removed step constraint for flexible volume input
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={handleSingleCalculation}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Calculating...' : 'Calculate Score'}
          </button>
          
          <button
            onClick={handleRealTimeCalculation}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Get Latest Score
          </button>
          
          <button
            onClick={handleHistoricalCalculation}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Calculate Historical (30 days)
          </button>
          
          <button
            onClick={handleDataValidation}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Validate Data
          </button>
          
          <button
            onClick={clearPerformanceMetrics}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear Metrics
          </button>
        </div>

        {/* Latest Result Display */}
        {latestResult && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Latest Calculation Result</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="text-lg font-bold text-gray-800">
                  {formatMarketCondition(latestResult)}
                </div>
                <div className="text-sm text-gray-600">Market Condition</div>
              </div>
            </div>

            {/* Component Breakdown */}
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="mt-4 text-sm text-gray-600">
              <div><strong>Algorithm:</strong> {latestResult.metadata.algorithm_used}</div>
              <div><strong>Calculation Time:</strong> {latestResult.metadata.calculation_time.toFixed(2)}ms</div>
              <div><strong>Data Quality:</strong> {latestResult.metadata.data_quality}%</div>
              {latestResult.metadata.warnings && latestResult.metadata.warnings.length > 0 && (
                <div><strong>Warnings:</strong> {latestResult.metadata.warnings.join(', ')}</div>
              )}
            </div>
          </div>
        )}

        {/* Configuration Management */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">Configuration Management</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saved Configurations
              </label>
              <select
                value={selectedConfigVersion}
                onChange={(e) => setSelectedConfigVersion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
              >
                <option value="">Select a configuration...</option>
                {configs.map((config) => (
                  <option key={config.version} value={config.version}>
                    {config.name} ({config.algorithm}) {config.is_default ? ' - Default' : ''}
                  </option>
                ))}
              </select>
              <div className="flex space-x-2">
                <button
                  onClick={() => selectedConfigVersion && loadConfigs()}
                  disabled={!selectedConfigVersion}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Load Config
                </button>
                <button
                  onClick={() => selectedConfigVersion && setDefaultConfig(selectedConfigVersion)}
                  disabled={!selectedConfigVersion}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  Set Default
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Actions
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => createConfig(currentAlgorithm, `Custom ${currentAlgorithm} Config`, currentConfig || {})}
                  className="w-full px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                >
                  Save Current as New Config
                </button>
                <button
                  onClick={loadConfigs}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
                >
                  Refresh Config List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Calculations */}
        {calculationResults.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">Recent Calculations</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Score</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Normalized</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Confidence</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Market Phase</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Algorithm</th>
                  </tr>
                </thead>
                <tbody>
                  {calculationResults.map((result, index) => (
                    <tr key={index} className="border-t border-gray-200">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {performanceMetrics.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-blue-600">
                  {performanceMetrics.length}
                </div>
                <div className="text-sm text-gray-600">Total Calculations</div>
              </div>
              
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-600">
                  {(performanceMetrics.reduce((sum, m) => sum + m.calculationTime, 0) / performanceMetrics.length).toFixed(1)}ms
                </div>
                <div className="text-sm text-gray-600">Avg Time</div>
              </div>
              
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-purple-600">
                  {Math.max(...performanceMetrics.map(m => m.calculationTime)).toFixed(1)}ms
                </div>
                <div className="text-sm text-gray-600">Max Time</div>
              </div>
              
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-orange-600">
                  {(performanceMetrics.reduce((sum, m) => sum + m.recordsPerSecond, 0) / performanceMetrics.length).toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Avg Records/sec</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlexibleBreadthCalculator;