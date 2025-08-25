import React, { useState, useEffect } from 'react'
import { Save, Calendar, Info, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import type { ExtendedBreadthData } from '../../../database/services/enhanced-breadth-service'

interface ManualEntryFormProps {
  onSave: (data: ExtendedBreadthData) => Promise<void>
  initialData?: ExtendedBreadthData
  onCancel?: () => void
}

export function ManualEntryForm({ onSave, initialData, onCancel }: ManualEntryFormProps) {
  const [formData, setFormData] = useState<ExtendedBreadthData>({
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    advancingIssues: 0,
    decliningIssues: 0,
    newHighs: 0,
    newLows: 0,
    upVolume: 0,
    downVolume: 0,
    breadthScore: 0,
    dataSource: 'manual',
    // Extended fields
    stocksUp4PctDaily: 0,
    stocksDown4PctDaily: 0,
    stocksUp25PctQuarterly: 0,
    stocksDown25PctQuarterly: 0,
    stocksUp25PctMonthly: 0,
    stocksDown25PctMonthly: 0,
    stocksUp50PctMonthly: 0,
    stocksDown50PctMonthly: 0,
    stocksUp13Pct34Days: 0,
    stocksDown13Pct34Days: 0,
    t2108: 50,
    spReference: 0,
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  const handleInputChange = (field: keyof ExtendedBreadthData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    // Required fields
    if (!formData.date) {
      newErrors.date = 'Date is required'
    }
    
    // Numeric validation
    const numericFields = [
      'advancingIssues', 'decliningIssues', 'newHighs', 'newLows',
      'upVolume', 'downVolume', 'stocksUp4PctDaily', 'stocksDown4PctDaily'
    ]
    
    numericFields.forEach(field => {
      const value = formData[field as keyof ExtendedBreadthData]
      if (value !== undefined && value !== null) {
        const numValue = Number(value)
        if (isNaN(numValue) || numValue < 0) {
          newErrors[field] = 'Must be a non-negative number'
        }
      }
    })
    
    // T2108 validation (0-100)
    if (formData.t2108 !== undefined) {
      const t2108Value = Number(formData.t2108)
      if (isNaN(t2108Value) || t2108Value < 0 || t2108Value > 100) {
        newErrors.t2108 = 'Must be between 0 and 100'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSaving(true)
    
    try {
      await onSave(formData)
      
      // Reset form after successful save
      setFormData({
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        advancingIssues: 0,
        decliningIssues: 0,
        newHighs: 0,
        newLows: 0,
        upVolume: 0,
        downVolume: 0,
        breadthScore: 0,
        dataSource: 'manual',
        stocksUp4PctDaily: 0,
        stocksDown4PctDaily: 0,
        t2108: 50,
        notes: ''
      })
    } catch (error) {
      console.error('Failed to save breadth data:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <span>Manual Data Entry</span>
        </h3>
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className={`px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.date ? 'border-red-300' : 'border-gray-300'
            }`}
            required
          />
        </div>
      </div>

      {/* Primary Indicators */}
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Primary Indicators</span>
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Advancing Issues
              </label>
              <input
                type="number"
                value={formData.advancingIssues}
                onChange={(e) => handleInputChange('advancingIssues', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.advancingIssues ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g. 2100"
              />
              {errors.advancingIssues && (
                <p className="text-red-600 text-xs mt-1">{errors.advancingIssues}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Declining Issues
              </label>
              <input
                type="number"
                value={formData.decliningIssues}
                onChange={(e) => handleInputChange('decliningIssues', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.decliningIssues ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g. 900"
              />
              {errors.decliningIssues && (
                <p className="text-red-600 text-xs mt-1">{errors.decliningIssues}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Highs
              </label>
              <input
                type="number"
                value={formData.newHighs}
                onChange={(e) => handleInputChange('newHighs', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.newHighs ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g. 150"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Lows
              </label>
              <input
                type="number"
                value={formData.newLows}
                onChange={(e) => handleInputChange('newLows', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.newLows ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g. 25"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Up Volume (B)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.upVolume}
                onChange={(e) => handleInputChange('upVolume', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.upVolume ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g. 15.5"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Down Volume (B)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.downVolume}
                onChange={(e) => handleInputChange('downVolume', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.downVolume ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g. 7.2"
              />
            </div>
          </div>
        </div>

        {/* Secondary Indicators */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
            <TrendingDown className="w-4 h-4" />
            <span>4% Daily Movers</span>
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stocks Up 4% Daily
              </label>
              <input
                type="number"
                value={formData.stocksUp4PctDaily}
                onChange={(e) => handleInputChange('stocksUp4PctDaily', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 350"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stocks Down 4% Daily
              </label>
              <input
                type="number"
                value={formData.stocksDown4PctDaily}
                onChange={(e) => handleInputChange('stocksDown4PctDaily', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 120"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                T2108 (%)
                <span className="text-xs text-gray-500 ml-1">Stocks above 40-day MA</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.t2108}
                onChange={(e) => handleInputChange('t2108', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.t2108 ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g. 65.5"
              />
              {errors.t2108 && (
                <p className="text-red-600 text-xs mt-1">{errors.t2108}</p>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Fields Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <Info className="w-4 h-4" />
            <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Indicators</span>
          </button>
          
          {showAdvanced && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stocks Up 25% Quarterly
                </label>
                <input
                  type="number"
                  value={formData.stocksUp25PctQuarterly}
                  onChange={(e) => handleInputChange('stocksUp25PctQuarterly', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stocks Down 25% Quarterly
                </label>
                <input
                  type="number"
                  value={formData.stocksDown25PctQuarterly}
                  onChange={(e) => handleInputChange('stocksDown25PctQuarterly', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  S&P Reference
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.spReference}
                  onChange={(e) => handleInputChange('spReference', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 4800.50"
                />
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Add any relevant market observations..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}