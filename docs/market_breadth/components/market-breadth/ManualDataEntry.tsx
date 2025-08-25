'use client';

import { useState } from 'react';
import { MarketBreadthData } from '@/lib/types/market-breadth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ManualDataEntryProps {
  onSubmit: (data: MarketBreadthData) => void;
  loading?: boolean;
}

export default function ManualDataEntry({ onSubmit, loading }: ManualDataEntryProps) {
  const [formData, setFormData] = useState<Partial<MarketBreadthData>>({
    date: new Date().toISOString().split('T')[0], // Today's date
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit data
    onSubmit(formData as MarketBreadthData);
  };

  const handleInputChange = (field: keyof MarketBreadthData, value: string) => {
    const numericValue = value === '' ? null : parseInt(value);
    setFormData(prev => ({
      ...prev,
      [field]: field === 'date' ? value : numericValue
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleDecimalChange = (field: keyof MarketBreadthData, value: string) => {
    const numericValue = value === '' ? null : parseFloat(value);
    setFormData(prev => ({
      ...prev,
      [field]: numericValue
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const InputField = ({ 
    label, 
    field, 
    type = 'number',
    placeholder, 
    required = false,
    isDecimal = false
  }: {
    label: string;
    field: keyof MarketBreadthData;
    type?: string;
    placeholder?: string;
    required?: boolean;
    isDecimal?: boolean;
  }) => (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={formData[field] || ''}
        onChange={(e) => isDecimal ? handleDecimalChange(field, e.target.value) : handleInputChange(field, e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          errors[field] ? 'border-red-500' : ''
        }`}
        step={isDecimal ? '0.01' : undefined}
      />
      {errors[field] && (
        <p className="text-sm text-red-600">{errors[field]}</p>
      )}
    </div>
  );

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Daily Market Breadth Entry</h2>
        <p className="text-gray-600">Enter today&apos;s market breadth data manually</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date Selection */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Date</h3>
          <div className="max-w-xs">
            <InputField
              label="Trading Date"
              field="date"
              type="date"
              required
            />
          </div>
        </Card>

        {/* Primary Indicators */}
        <SectionCard title="🎯 Primary Indicators">
          <InputField
            label="Stocks Up 4% Daily"
            field="stocksUp4PctDaily"
            placeholder="358"
          />
          <InputField
            label="Stocks Down 4% Daily"
            field="stocksDown4PctDaily"
            placeholder="115"
          />
          <InputField
            label="Stocks Up 25% Quarterly"
            field="stocksUp25PctQuarterly"
            placeholder="1984"
          />
          <InputField
            label="Stocks Down 25% Quarterly"
            field="stocksDown25PctQuarterly"
            placeholder="711"
          />
        </SectionCard>

        {/* Secondary Indicators */}
        <SectionCard title="📊 Secondary Indicators">
          <InputField
            label="Stocks Up 25% Monthly"
            field="stocksUp25PctMonthly"
            placeholder="158"
          />
          <InputField
            label="Stocks Down 25% Monthly"
            field="stocksDown25PctMonthly"
            placeholder="66"
          />
          <InputField
            label="Stocks Up 50% Monthly"
            field="stocksUp50PctMonthly"
            placeholder="38"
          />
          <InputField
            label="Stocks Down 50% Monthly"
            field="stocksDown50PctMonthly"
            placeholder="17"
          />
          <InputField
            label="Stocks Up 13% in 34 Days"
            field="stocksUp13Pct34Days"
            placeholder="1689"
          />
          <InputField
            label="Stocks Down 13% in 34 Days"
            field="stocksDown13Pct34Days"
            placeholder="1073"
          />
        </SectionCard>

        {/* Overarching Indicators */}
        <SectionCard title="🏛️ Overarching Indicators">
          <InputField
            label="T2108 (% above 40-day MA)"
            field="t2108"
            placeholder="68.5"
            isDecimal
          />
          <InputField
            label="Worden Common Stocks"
            field="wordenCommonStocks"
            placeholder="6193"
            isDecimal
          />
          <InputField
            label="S&P 500 Reference"
            field="spReference"
            placeholder="6141.02"
            isDecimal
          />
        </SectionCard>

        {/* Custom Fields */}
        <SectionCard title="🔧 Custom Indicators">
          <InputField
            label="Stocks Up 20% Custom"
            field="stocksUp20PctCustom"
            placeholder="Optional"
          />
          <InputField
            label="Stocks Down 20% Custom"
            field="stocksDown20PctCustom"
            placeholder="Optional"
          />
          <InputField
            label="Stocks Up $20 Custom"
            field="stocksUp20DollarCustom"
            placeholder="Optional"
          />
          <InputField
            label="Stocks Down $20 Custom"
            field="stocksDown20DollarCustom"
            placeholder="Optional"
          />
        </SectionCard>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              'Save Market Breadth Data'
            )}
          </Button>
        </div>
      </form>

      {/* Quick Entry Hint */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Quick Entry Tips</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Only fill in the fields you have data for</li>
                <li>Primary indicators are most important for signal calculation</li>
                <li>Use Tab key to navigate between fields quickly</li>
                <li>Data will be automatically validated before saving</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}