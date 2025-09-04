import React, { useState } from 'react'
import { FileText, DollarSign, Calendar, TrendingUp, TrendingDown, Save, AlertCircle } from 'lucide-react'

interface TradeEntryData {
  date: string
  symbol: string
  action: 'BUY' | 'SELL'
  quantity: string
  price: string
  fees: string
  notes: string
}

interface TradeEntryFormProps {
  onSave?: (data: TradeEntryData) => void
  onCancel?: () => void
}

export function TradeEntryForm({ onSave, onCancel }: TradeEntryFormProps) {
  const [formData, setFormData] = useState<TradeEntryData>({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    action: 'BUY',
    quantity: '',
    price: '',
    fees: '0.00',
    notes: ''
  })

  const [errors, setErrors] = useState<Partial<TradeEntryData>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<TradeEntryData> = {}

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Symbol is required'
    }
    if (!formData.quantity.trim() || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required'
    }
    if (!formData.price.trim() || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSave?.(formData)
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        symbol: '',
        action: 'BUY',
        quantity: '',
        price: '',
        fees: '0.00',
        notes: ''
      })
    }
  }

  const calculateTotal = () => {
    const quantity = parseFloat(formData.quantity) || 0
    const price = parseFloat(formData.price) || 0
    const fees = parseFloat(formData.fees) || 0
    
    const subtotal = quantity * price
    return subtotal + fees
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-green-50 rounded-lg">
          <FileText className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Trade Entry</h2>
          <p className="text-gray-600 text-sm">Record completed trade details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Trade Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trade Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Symbol
            </label>
            <input
              type="text"
              placeholder="e.g. AAPL, SPY"
              value={formData.symbol}
              onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.symbol ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.symbol && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.symbol}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <select
              value={formData.action}
              onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value as 'BUY' | 'SELL' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
        </div>

        {/* Quantity and Price */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              step="1"
              placeholder="100"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.quantity ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.quantity}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price per Share
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                placeholder="150.00"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.price ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.price && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.price}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fees/Commission
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.fees}
                onChange={(e) => setFormData(prev => ({ ...prev, fees: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Trade Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Trade Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Action:</span>
              <div className={`font-medium flex items-center mt-1 ${
                formData.action === 'BUY' ? 'text-green-600' : 'text-red-600'
              }`}>
                {formData.action === 'BUY' ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {formData.action}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Quantity:</span>
              <div className="font-medium mt-1">{formData.quantity || '0'}</div>
            </div>
            <div>
              <span className="text-gray-600">Price:</span>
              <div className="font-medium mt-1">${formData.price || '0.00'}</div>
            </div>
            <div>
              <span className="text-gray-600">Total:</span>
              <div className="font-medium text-lg mt-1">${calculateTotal().toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Trade rationale, market conditions, exit strategy..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors ml-auto"
          >
            <Save className="w-4 h-4" />
            <span>Save Trade</span>
          </button>
        </div>
      </form>
    </div>
  )
}