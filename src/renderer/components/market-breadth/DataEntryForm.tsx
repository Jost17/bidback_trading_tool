import React, { useState, useCallback } from 'react'
import { 
  Save, 
  Calculator, 
  AlertCircle, 
  CheckCircle, 
  RotateCcw, 
  Info,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { useBreadthCalculator } from '../../hooks/useBreadthCalculator'
import type { BreadthData, MarketDataInput } from '../../../types/trading'
import type { RawMarketBreadthData } from '../../../types/breadth-raw-data'

interface DataEntryFormProps {
  onSuccess?: () => void
  initialData?: Partial<BreadthData>
}

interface FormErrors {
  [key: string]: string
}

export function DataEntryForm({ onSuccess, initialData }: DataEntryFormProps) {
  // Form state
  const [formData, setFormData] = useState<MarketDataInput>({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    stocks_up_4pct: initialData?.stocks_up_4pct?.toString() || '',
    stocks_down_4pct: initialData?.stocks_down_4pct?.toString() || '',
    stocks_up_25pct_quarter: initialData?.stocks_up_25pct_quarter?.toString() || '',
    stocks_down_25pct_quarter: initialData?.stocks_down_25pct_quarter?.toString() || '',
    stocks_up_25pct_month: initialData?.stocks_up_25pct_month?.toString() || '',
    stocks_down_25pct_month: initialData?.stocks_down_25pct_month?.toString() || '',
    stocks_up_50pct_month: initialData?.stocks_up_50pct_month?.toString() || '',
    stocks_down_50pct_month: initialData?.stocks_down_50pct_month?.toString() || '',
    stocks_up_13pct_34days: initialData?.stocks_up_13pct_34days?.toString() || '',
    stocks_down_13pct_34days: initialData?.stocks_down_13pct_34days?.toString() || '',
    worden_universe: initialData?.worden_universe?.toString() || '7000',
    sp500: initialData?.sp500 || '',
    t2108: initialData?.t2108?.toString() || '',
    basic_materials_sector: initialData?.basic_materials_sector?.toString() || '',
    consumer_cyclical_sector: initialData?.consumer_cyclical_sector?.toString() || '',
    financial_services_sector: initialData?.financial_services_sector?.toString() || '',
    real_estate_sector: initialData?.real_estate_sector?.toString() || '',
    consumer_defensive_sector: initialData?.consumer_defensive_sector?.toString() || '',
    healthcare_sector: initialData?.healthcare_sector?.toString() || '',
    utilities_sector: initialData?.utilities_sector?.toString() || '',
    communication_services_sector: initialData?.communication_services_sector?.toString() || '',
    energy_sector: initialData?.energy_sector?.toString() || '',
    industrials_sector: initialData?.industrials_sector?.toString() || '',
    technology_sector: initialData?.technology_sector?.toString() || ''
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [previewCalculation, setPreviewCalculation] = useState<any>(null)

  // Breadth calculator
  const {
    calculateSingle,
    validateData,
    currentAlgorithm,
    latestResult,
    isLoading,
    error: calculatorError
  } = useBreadthCalculator()

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    // Required fields
    if (!formData.date) newErrors.date = 'Date is required'
    if (!formData.t2108) newErrors.t2108= 'T2108 is required'
    if (!formData.worden_universe) newErrors.worden_universe = 'Worden Universe is required'

    // Validate numeric fields
    const numericFields = [
      'stocks_up_4pct', 'stocks_down_4pct',
      'stocks_up_25pct_quarter', 'stocks_down_25pct_quarter',
      'stocks_up_25pct_month', 'stocks_down_25pct_month',
      'stocks_up_50pct_month', 'stocks_down_50pct_month',
      'stocks_up_13pct_34days', 'stocks_down_13pct_34days',
      't2108', 'worden_universe'
    ] as const

    numericFields.forEach(field => {
      const value = formData[field]
      if (value && (isNaN(Number(value)) || Number(value) < 0)) {
        newErrors[field] = 'Must be a valid positive number'
      }
    })

    // Validate T2108 range (0-100)
    if (formData.t2108 && (Number(formData.t2108) < 0 || Number(formData.t2108) > 100)) {
      newErrors.t2108 = 'T2108 must be between 0 and 100'
    }

    // Validate sector percentages (0-100)
    const sectorFields = [
      'basic_materials_sector', 'consumer_cyclical_sector', 'financial_services_sector',
      'real_estate_sector', 'consumer_defensive_sector', 'healthcare_sector',
      'utilities_sector', 'communication_services_sector', 'energy_sector',
      'industrials_sector', 'technology_sector'
    ] as const

    sectorFields.forEach(field => {
      const value = formData[field]
      if (value && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 100)) {
        newErrors[field] = 'Sector percentage must be between 0 and 100'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // Handle input change
  const handleInputChange = useCallback((field: keyof MarketDataInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Clear success state when form changes
    if (success) {
      setSuccess(false)
      setPreviewCalculation(null)
    }
  }, [errors, success])

  // Convert form data to raw market breadth data
  const convertToRawData = useCallback((): RawMarketBreadthData => {
    return {
      date: formData.date,
      timestamp: new Date().toISOString(),
      advancingIssues: Number(formData.stocks_up_4pct) || 0,
      decliningIssues: Number(formData.stocks_down_4pct) || 0,
      newHighs: 0, // Legacy field, not used in enhanced system
      newLows: 0, // Legacy field, not used in enhanced system  
      upVolume: 0, // Legacy field, not used in enhanced system
      downVolume: 0, // Legacy field, not used in enhanced system
      stocksUp4PctDaily: Number(formData.stocks_up_4pct) || undefined,
      stocksDown4PctDaily: Number(formData.stocks_down_4pct) || undefined,
      stocksUp25PctQuarterly: Number(formData.stocks_up_25pct_quarter) || undefined,
      stocksDown25PctQuarterly: Number(formData.stocks_down_25pct_quarter) || undefined,
      stocksUp25PctMonthly: Number(formData.stocks_up_25pct_month) || undefined,
      stocksDown25PctMonthly: Number(formData.stocks_down_25pct_month) || undefined,
      stocksUp50PctMonthly: Number(formData.stocks_up_50pct_month) || undefined,
      stocksDown50PctMonthly: Number(formData.stocks_down_50pct_month) || undefined,
      stocksUp13Pct34Days: Number(formData.stocks_up_13pct_34days) || undefined,
      stocksDown13Pct34Days: Number(formData.stocks_down_13pct_34days) || undefined,
      t2108: Number(formData.t2108) || undefined,
      sp500Level: formData.sp500 || undefined,
      wordenUniverse: Number(formData.worden_universe) || undefined,
      basicMaterialsSector: Number(formData.basic_materials_sector) || undefined,
      consumerCyclicalSector: Number(formData.consumer_cyclical_sector) || undefined,
      financialServicesSector: Number(formData.financial_services_sector) || undefined,
      realEstateSector: Number(formData.real_estate_sector) || undefined,
      consumerDefensiveSector: Number(formData.consumer_defensive_sector) || undefined,
      healthcareSector: Number(formData.healthcare_sector) || undefined,
      utilitiesSector: Number(formData.utilities_sector) || undefined,
      communicationServicesSector: Number(formData.communication_services_sector) || undefined,
      energySector: Number(formData.energy_sector) || undefined,
      industrialsSector: Number(formData.industrials_sector) || undefined,
      technologySector: Number(formData.technology_sector) || undefined,
      dataQualityScore: 100
    }
  }, [formData])

  // Preview calculation
  const handlePreviewCalculation = useCallback(async () => {
    if (!validateForm()) return

    try {
      const rawData = convertToRawData()
      const validation = await validateData(rawData)
      
      if (!validation?.isValid) {
        setErrors({ general: 'Data validation failed: ' + (validation?.errors?.join(', ') || 'Unknown error') })
        return
      }

      const result = await calculateSingle(rawData, currentAlgorithm, false)
      if (result) {
        setPreviewCalculation(result)
      }
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Preview calculation failed' })
    }
  }, [validateForm, convertToRawData, validateData, calculateSingle, currentAlgorithm])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const rawData = convertToRawData()
      
      // Calculate and save to database
      const result = await calculateSingle(rawData, currentAlgorithm, true)
      
      if (result) {
        setSuccess(true)
        setPreviewCalculation(result)
        
        // Call success callback after a brief delay to show success state
        setTimeout(() => {
          onSuccess?.()
        }, 1500)
      } else {
        throw new Error('Failed to calculate breadth score')
      }
    } catch (err) {
      setErrors({ 
        general: err instanceof Error ? err.message : 'Failed to save market breadth data' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [validateForm, convertToRawData, calculateSingle, currentAlgorithm, onSuccess])

  // Reset form
  const handleReset = useCallback(() => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      stocks_up_4pct: '',
      stocks_down_4pct: '',
      stocks_up_25pct_quarter: '',
      stocks_down_25pct_quarter: '',
      stocks_up_25pct_month: '',
      stocks_down_25pct_month: '',
      stocks_up_50pct_month: '',
      stocks_down_50pct_month: '',
      stocks_up_13pct_34days: '',
      stocks_down_13pct_34days: '',
      worden_universe: '7000',
      sp500: '',
      t2108: '',
      basic_materials_sector: '',
      consumer_cyclical_sector: '',
      financial_services_sector: '',
      real_estate_sector: '',
      consumer_defensive_sector: '',
      healthcare_sector: '',
      utilities_sector: '',
      communication_services_sector: '',
      energy_sector: '',
      industrials_sector: '',
      technology_sector: ''
    })
    setErrors({})
    setSuccess(false)
    setPreviewCalculation(null)
  }, [])

  // Render input field
  const renderInputField = (
    field: keyof MarketDataInput,
    label: string,
    placeholder: string,
    type: 'text' | 'number' | 'date' = 'number',
    required: boolean = false,
    min?: number,
    max?: number,
    step?: number
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={formData[field]}
        onChange={(e) => handleInputChange(field, e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          errors[field] ? 'border-red-300' : 'border-gray-300'
        }`}
        disabled={isSubmitting}
      />
      {errors[field] && (
        <p className="mt-1 text-sm text-red-600">{errors[field]}</p>
      )}
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Success!</span>
          </div>
          <p className="mt-1 text-green-700">Market breadth data saved successfully.</p>
        </div>
      )}

      {/* Error Message */}
      {(errors.general || calculatorError) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-1 text-red-700">{errors.general || calculatorError}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Manual Market Breadth Entry</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Info className="w-4 h-4" />
            <span>Using {currentAlgorithm.replace('_', ' ').toUpperCase()} algorithm</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            </div>
            
            {renderInputField('date', 'Date', '', 'date', true)}
            {renderInputField('sp500', 'S&P 500 Level', 'e.g. 5,847', 'text')}
            {renderInputField('worden_universe', 'Worden Universe', 'e.g. 7000', 'number', true, 1000, 10000)}
          </div>

          {/* Primary Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Primary Indicators</span>
              </h3>
            </div>

            {renderInputField('stocks_up_4pct', 'Stocks Up 4% Daily', 'e.g. 180', 'number', false, 0)}
            {renderInputField('stocks_down_4pct', 'Stocks Down 4% Daily', 'e.g. 120', 'number', false, 0)}
            {renderInputField('t2108', 'T2108 (%)', 'e.g. 65', 'number', true, 0, 100)}
          </div>

          {/* Secondary Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingDown className="w-5 h-5 text-purple-600" />
                <span>Secondary Indicators</span>
              </h3>
            </div>

            {renderInputField('stocks_up_25pct_quarter', 'Stocks Up 25% (Quarter)', 'e.g. 450', 'number', false, 0)}
            {renderInputField('stocks_down_25pct_quarter', 'Stocks Down 25% (Quarter)', 'e.g. 200', 'number', false, 0)}
            {renderInputField('stocks_up_25pct_month', 'Stocks Up 25% (Month)', 'e.g. 350', 'number', false, 0)}
            {renderInputField('stocks_down_25pct_month', 'Stocks Down 25% (Month)', 'e.g. 150', 'number', false, 0)}
            {renderInputField('stocks_up_50pct_month', 'Stocks Up 50% (Month)', 'e.g. 120', 'number', false, 0)}
            {renderInputField('stocks_down_50pct_month', 'Stocks Down 50% (Month)', 'e.g. 80', 'number', false, 0)}
            {renderInputField('stocks_up_13pct_34days', 'Stocks Up 13% (34 Days)', 'e.g. 280', 'number', false, 0)}
            {renderInputField('stocks_down_13pct_34days', 'Stocks Down 13% (34 Days)', 'e.g. 180', 'number', false, 0)}
          </div>

          {/* Sector Data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sector Performance (%)</h3>
            </div>

            {renderInputField('basic_materials_sector', 'Basic Materials', 'e.g. 75', 'number', false, 0, 100)}
            {renderInputField('consumer_cyclical_sector', 'Consumer Cyclical', 'e.g. 80', 'number', false, 0, 100)}
            {renderInputField('financial_services_sector', 'Financial Services', 'e.g. 85', 'number', false, 0, 100)}
            {renderInputField('real_estate_sector', 'Real Estate', 'e.g. 70', 'number', false, 0, 100)}
            {renderInputField('consumer_defensive_sector', 'Consumer Defensive', 'e.g. 60', 'number', false, 0, 100)}
            {renderInputField('healthcare_sector', 'Healthcare', 'e.g. 55', 'number', false, 0, 100)}
            {renderInputField('utilities_sector', 'Utilities', 'e.g. 45', 'number', false, 0, 100)}
            {renderInputField('communication_services_sector', 'Communication Services', 'e.g. 70', 'number', false, 0, 100)}
            {renderInputField('energy_sector', 'Energy', 'e.g. 85', 'number', false, 0, 100)}
            {renderInputField('industrials_sector', 'Industrials', 'e.g. 75', 'number', false, 0, 100)}
            {renderInputField('technology_sector', 'Technology', 'e.g. 92', 'number', false, 0, 100)}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handlePreviewCalculation}
                disabled={isSubmitting || isLoading}
                className="flex items-center space-x-2 px-4 py-2 text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                <Calculator className="w-4 h-4" />
                <span>Preview Calculation</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Calculate & Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Preview Calculation Results */}
      {previewCalculation && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculation Preview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {previewCalculation.score.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Raw Score</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {previewCalculation.normalizedScore.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Normalized Score</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(previewCalculation.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
            
            <div className="bg-white rounded-lg p-4 text-center">
              <div className={`text-lg font-bold px-2 py-1 rounded ${
                previewCalculation.market_condition.phase === 'BULL' ? 'bg-green-100 text-green-800' :
                previewCalculation.market_condition.phase === 'BEAR' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {previewCalculation.market_condition.phase}
              </div>
              <div className="text-sm text-gray-600">Market Phase</div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Trend:</strong> {previewCalculation.market_condition.trend_direction}</p>
            <p><strong>Strength:</strong> {previewCalculation.market_condition.strength}</p>
            <p><strong>Algorithm:</strong> {previewCalculation.metadata.algorithm_used}</p>
            <p><strong>Data Quality:</strong> {previewCalculation.metadata.data_quality}%</p>
          </div>
        </div>
      )}
    </div>
  )
}