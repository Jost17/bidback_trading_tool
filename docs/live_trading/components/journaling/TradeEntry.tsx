'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TradeFormData, TradeSetup, TRADE_DIRECTIONS, TRADE_STATUSES, TRADE_GRADES, MARKET_CONDITIONS, EMOTIONS, SECTORS } from '@/lib/types/trading-journal';
import { calculatePnL, calculateRiskReward, formatDecimal } from '@/lib/utils/decimal';

interface TradeEntryProps {
  onSubmit?: (data: TradeFormData) => void;
  loading?: boolean;
  initialData?: Partial<TradeFormData>;
}

export default function TradeEntry({ onSubmit, loading = false, initialData }: TradeEntryProps) {
  const [formData, setFormData] = useState<TradeFormData>({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    direction: 'LONG',
    quantity: 0,
    entryPrice: 0,
    tradeStatus: 'OPEN',
    isPaperTrade: false,
    ...initialData,
  });

  const [setups, setSetups] = useState<TradeSetup[]>([]);
  const [calculatedPnl, setCalculatedPnl] = useState<number | null>(null);
  const [calculatedRR, setCalculatedRR] = useState<number | null>(null);

  const calculateMetrics = useCallback(() => {
    // Calculate P&L using Decimal.js for precision
    if (formData.entryPrice && formData.exitPrice && formData.quantity) {
      const { netPnL } = calculatePnL(
        formData.direction,
        formData.entryPrice,
        formData.exitPrice,
        formData.quantity,
        formData.fees || 0
      );
      setCalculatedPnl(netPnL);
    } else {
      setCalculatedPnl(null);
    }

    // Calculate Risk/Reward Ratio using Decimal.js
    if (formData.entryPrice && formData.stopLoss && formData.targetPrice) {
      const riskReward = calculateRiskReward(
        formData.entryPrice,
        formData.stopLoss,
        formData.targetPrice,
        formData.direction
      );
      setCalculatedRR(riskReward);
    } else {
      setCalculatedRR(null);
    }
  }, [formData.entryPrice, formData.exitPrice, formData.stopLoss, formData.targetPrice, formData.quantity, formData.direction, formData.fees]);

  // Fetch available setups on component mount
  useEffect(() => {
    fetchSetups();
  }, []);

  // Calculate P&L and R/R when relevant fields change
  useEffect(() => {
    calculateMetrics();
  }, [calculateMetrics]);

  const fetchSetups = async () => {
    try {
      const response = await fetch('/api/trades/setups?activeOnly=true');
      const result = await response.json();
      if (result.success) {
        setSetups(result.data);
      }
    } catch (error) {
      console.error('Error fetching setups:', error);
    }
  };

  const handleInputChange = (field: keyof TradeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  const formatCurrency = (value: number) => {
    // Use our formatDecimal function for consistent precision
    const formatted = formatDecimal(value, 2);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(formatted));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">New Trade Entry</h2>
          <p className="text-gray-600">Record your trade details for comprehensive analysis</p>
        </div>
        {calculatedPnl !== null && (
          <div className={`text-right ${calculatedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <div className="text-sm font-medium">Calculated P&L</div>
            <div className="text-2xl font-bold">{formatCurrency(calculatedPnl)}</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Trade Information */}
        <Card 
          title="Basic Trade Information" 
          subtitle="Essential trade details and pricing"
          className="border-l-4 border-l-green-500"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={formData.time || ''}
                onChange={(e) => handleInputChange('time', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Symbol *
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Direction *
              </label>
              <select
                value={formData.direction}
                onChange={(e) => handleInputChange('direction', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                {TRADE_DIRECTIONS.map(direction => (
                  <option key={direction} value={direction}>{direction}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value))}
                placeholder="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry Price * ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) => handleInputChange('entryPrice', parseFloat(e.target.value))}
                placeholder="150.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exit Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.exitPrice || ''}
                onChange={(e) => handleInputChange('exitPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="155.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stop Loss ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.stopLoss || ''}
                onChange={(e) => handleInputChange('stopLoss', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="148.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fees ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.fees || ''}
                onChange={(e) => handleInputChange('fees', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="1.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                min="0"
              />
            </div>
          </div>

          {/* Calculated Metrics Display */}
          {(calculatedPnl !== null || calculatedRR !== null) && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {calculatedPnl !== null && (
                  <div>
                    <span className="font-medium">Calculated P&L: </span>
                    <span className={calculatedPnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(calculatedPnl)}
                    </span>
                  </div>
                )}
                {calculatedRR !== null && (
                  <div>
                    <span className="font-medium">Risk/Reward Ratio: </span>
                    <span className="text-blue-600">1:{formatDecimal(calculatedRR, 2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Section 2: Trade Classification */}
        <Card 
          title="Trade Classification" 
          subtitle="Setup type, market conditions, and categorization"
          className="border-l-4 border-l-blue-500"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Setup Type
              </label>
              <select
                value={formData.setupType || ''}
                onChange={(e) => handleInputChange('setupType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Setup</option>
                {setups.map(setup => (
                  <option key={setup.id} value={setup.name}>{setup.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Market Condition
              </label>
              <select
                value={formData.marketCondition || ''}
                onChange={(e) => handleInputChange('marketCondition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Condition</option>
                {MARKET_CONDITIONS.map(condition => (
                  <option key={condition} value={condition}>{condition}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sector
              </label>
              <select
                value={formData.sector || ''}
                onChange={(e) => handleInputChange('sector', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Sector</option>
                {SECTORS.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trade Grade
              </label>
              <select
                value={formData.tradeGrade || ''}
                onChange={(e) => handleInputChange('tradeGrade', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Grade</option>
                {TRADE_GRADES.map(grade => (
                  <option key={grade} value={grade}>
                    {grade} - {grade === 'A' ? 'Excellent' : grade === 'B' ? 'Good' : grade === 'C' ? 'Fair' : 'Poor'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trade Status
              </label>
              <select
                value={formData.tradeStatus}
                onChange={(e) => handleInputChange('tradeStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {TRADE_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Section 3: Risk Management & Psychology */}
        <Card 
          title="Risk Management & Psychology" 
          subtitle="Risk metrics, position sizing, and emotional state"
          className="border-l-4 border-l-yellow-500"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confidence Level (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.confidenceLevel || 5}
                onChange={(e) => handleInputChange('confidenceLevel', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Low</span>
                <span className="font-medium">{formData.confidenceLevel || 5}</span>
                <span>High</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emotional State
              </label>
              <select
                value={formData.emotion || ''}
                onChange={(e) => handleInputChange('emotion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Emotion</option>
                {EMOTIONS.map(emotion => (
                  <option key={emotion} value={emotion}>{emotion}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position Size (% of Portfolio)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.positionSizePercent || ''}
                onChange={(e) => handleInputChange('positionSizePercent', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="2.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </Card>

        {/* Section 4: Notes & Analysis */}
        <Card 
          title="Notes & Analysis" 
          subtitle="Trade notes, lessons learned, and paper trading"
          className="border-l-4 border-l-purple-500"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry Notes
              </label>
              <textarea
                value={formData.entryNotes || ''}
                onChange={(e) => handleInputChange('entryNotes', e.target.value)}
                placeholder="Why did you enter this trade? What was your thesis?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exit Notes
              </label>
              <textarea
                value={formData.exitNotes || ''}
                onChange={(e) => handleInputChange('exitNotes', e.target.value)}
                placeholder="Why did you exit? Was it planned or emotional?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lessons Learned
              </label>
              <textarea
                value={formData.lessonsLearned || ''}
                onChange={(e) => handleInputChange('lessonsLearned', e.target.value)}
                placeholder="What did you learn from this trade? What would you do differently?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPaperTrade"
                checked={formData.isPaperTrade}
                onChange={(e) => handleInputChange('isPaperTrade', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="isPaperTrade" className="ml-2 block text-sm text-gray-700">
                This is a paper trade (simulation)
              </label>
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setFormData({
              date: new Date().toISOString().split('T')[0],
              symbol: '',
              direction: 'LONG',
              quantity: 0,
              entryPrice: 0,
              tradeStatus: 'OPEN',
              isPaperTrade: false,
            })}
          >
            Clear Form
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Trade'}
          </Button>
        </div>
      </form>
    </div>
  );
}