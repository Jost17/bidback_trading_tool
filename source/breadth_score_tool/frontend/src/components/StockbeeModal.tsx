import React, { useState, useEffect } from 'react';
import { X, Copy, Save, AlertCircle, Plus } from 'lucide-react';
import { MarketData } from '../types';

interface StockbeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialData?: MarketData | null;
  onSubmit: (data: Omit<MarketData, 'id'> | MarketData) => Promise<void>;
}

// Field definitions with color coding and grouping
interface FieldConfig {
  key: keyof MarketData;
  label: string;
  type: 'text' | 'number' | 'date';
  placeholder?: string;
  readonly?: boolean;
  colorCode: 'positive' | 'negative' | 'neutral' | 'auto' | 'score';
  validation?: {
    min?: number;
    max?: number;
    required?: boolean;
  };
}

const FIELD_CONFIGS: FieldConfig[] = [
  // Date first
  { key: 'date', label: 'Date', type: 'date', readonly: false, colorCode: 'neutral', validation: { required: true } },
  
  // 20% fields first (most important)
  { key: 'stocks_up_20pct', label: '20% Up (65 Days)', type: 'number', placeholder: '0', colorCode: 'positive' },
  { key: 'stocks_down_20pct', label: '20% Down (65 Days)', type: 'number', placeholder: '0', colorCode: 'negative' },
  
  // $20 fields
  { key: 'stocks_up_20dollar', label: '$20 Up (65 Days)', type: 'number', placeholder: '0', colorCode: 'positive' },
  { key: 'stocks_down_20dollar', label: '$20 Down (65 Days)', type: 'number', placeholder: '0', colorCode: 'negative' },
  
  // Daily 4% fields
  { key: 'stocks_up_4pct', label: '4% Up (Daily)', type: 'number', placeholder: '0', colorCode: 'positive' },
  { key: 'stocks_down_4pct', label: '4% Down (Daily)', type: 'number', placeholder: '0', colorCode: 'negative' },
  
  // Auto-calculated ratios (readonly)
  { key: 'ratio_5day', label: '5-Day Ratio', type: 'number', placeholder: 'Auto-calculated', readonly: true, colorCode: 'auto' },
  { key: 'ratio_10day', label: '10-Day Ratio', type: 'number', placeholder: 'Auto-calculated', readonly: true, colorCode: 'auto' },
  
  // Quarter and month fields
  { key: 'stocks_up_25pct_quarter', label: '25% Up (Quarter)', type: 'number', placeholder: '0', colorCode: 'positive' },
  { key: 'stocks_down_25pct_quarter', label: '25% Down (Quarter)', type: 'number', placeholder: '0', colorCode: 'negative' },
  { key: 'stocks_up_25pct_month', label: '25% Up (Month)', type: 'number', placeholder: '0', colorCode: 'positive' },
  { key: 'stocks_down_25pct_month', label: '25% Down (Month)', type: 'number', placeholder: '0', colorCode: 'negative' },
  { key: 'stocks_up_50pct_month', label: '50% Up (Month)', type: 'number', placeholder: '0', colorCode: 'positive' },
  { key: 'stocks_down_50pct_month', label: '50% Down (Month)', type: 'number', placeholder: '0', colorCode: 'negative' },
  
  // 34-day fields
  { key: 'stocks_up_13pct_34days', label: '13% Up (34 Days)', type: 'number', placeholder: '0', colorCode: 'positive' },
  { key: 'stocks_down_13pct_34days', label: '13% Down (34 Days)', type: 'number', placeholder: '0', colorCode: 'negative' },
  
  // Universe and indicators
  { key: 'worden_universe', label: 'Worden Universe', type: 'number', placeholder: '0', colorCode: 'neutral' },
  { key: 't2108', label: 'T2108', type: 'number', placeholder: '0-100', colorCode: 'auto', validation: { min: 0, max: 100 } },
  { key: 'sp500', label: 'S&P 500', type: 'text', placeholder: '4,832.49', colorCode: 'neutral' },
  
  // Auto-calculated scores (readonly)
  { key: 'breadth_score', label: 'Breadth Score', type: 'number', placeholder: 'Auto-calculated', readonly: true, colorCode: 'score' },
  { key: 'breadth_score_normalized', label: 'Normalized Score', type: 'number', placeholder: 'Auto-calculated', readonly: true, colorCode: 'score' },
];

const getFieldColor = (value: any, colorCode: string): string => {
  if (value === null || value === undefined || value === '') return '';
  
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  
  switch (colorCode) {
    case 'positive':
      return numValue > 0 ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-gray-600 bg-gray-800';
    case 'negative':
      return numValue > 0 ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-gray-600 bg-gray-800';
    case 'score':
      if (numValue >= 60) return 'border-green-500 bg-green-500/10 text-green-400';
      if (numValue <= 40) return 'border-red-500 bg-red-500/10 text-red-400';
      return 'border-orange-500 bg-orange-500/10 text-orange-400';
    case 'auto':
      if (numValue >= 70) return 'border-green-500 bg-green-500/10 text-green-400';
      if (numValue <= 30) return 'border-red-500 bg-red-500/10 text-red-400';
      return 'border-orange-500 bg-orange-500/10 text-orange-400';
    default:
      return 'border-gray-600 bg-gray-800';
  }
};

export const StockbeeModal: React.FC<StockbeeModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialData,
  onSubmit
}) => {
  const [formData, setFormData] = useState<Partial<MarketData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (!isOpen) return; // Only initialize when modal is actually opened
    
    if (mode === 'edit' && initialData) {
      setFormData(initialData);
    } else if (mode === 'add') {
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setFormData({ date: today });
    }
    
    // Clear errors when modal opens
    setErrors({});
  }, [mode, initialData, isOpen]);

  // Get next business day as default
  const getNextBusinessDay = (): string => {
    const today = new Date();
    let nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);
    
    // Skip weekends
    while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return nextDay.toISOString().split('T')[0];
  };

  const handleInputChange = (key: keyof MarketData, value: string) => {
    let processedValue: any = value;
    
    // Process value based on field type
    if (value === '') {
      processedValue = null;
    } else {
      const fieldConfig = FIELD_CONFIGS.find(f => f.key === key);
      if (fieldConfig?.type === 'number') {
        const numValue = parseFloat(value);
        processedValue = isNaN(numValue) ? null : numValue;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [key]: processedValue
    }));
    
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    FIELD_CONFIGS.forEach(field => {
      const value = formData[field.key];
      const validation = field.validation;
      
      if (validation?.required && (value === null || value === undefined || value === '')) {
        newErrors[field.key] = `${field.label} ist erforderlich`;
      }
      
      if (typeof value === 'number' && validation) {
        if (validation.min !== undefined && value < validation.min) {
          newErrors[field.key] = `${field.label} muss mindestens ${validation.min} sein`;
        }
        if (validation.max !== undefined && value > validation.max) {
          newErrors[field.key] = `${field.label} darf höchstens ${validation.max} sein`;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData as MarketData);
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLast = () => {
    // This would copy data from the last entry
    // For now, we'll just set some default values
    const defaultData = {
      date: getNextBusinessDay(),
      stocks_up_4pct: 0,
      stocks_down_4pct: 0,
      stocks_up_20pct: 100,
      stocks_down_20pct: 50,
      stocks_up_20dollar: 80,
      stocks_down_20dollar: 40,
      stocks_up_25pct_quarter: 200,
      stocks_down_25pct_quarter: 100,
      stocks_up_25pct_month: 150,
      stocks_down_25pct_month: 75,
      stocks_up_50pct_month: 50,
      stocks_down_50pct_month: 25,
      stocks_up_13pct_34days: 300,
      stocks_down_13pct_34days: 150,
      worden_universe: 3000,
      t2108: 50,
      sp500: '4,832.49'
    };
    
    setFormData(defaultData);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ 
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Container with Clean Design */}
      <div 
        className="relative bg-white"
        style={{
          width: '50%',
          maxHeight: '90vh',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
          border: '1px solid #E2E8F0',
          fontFamily: 'inherit',
          zIndex: 10000,
          overflow: 'hidden'
        }}
      >
        {/* Clean Header */}
        <div 
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: 'white'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            width: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={20} style={{ color: '#1E293B' }} />
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1E293B',
                margin: 0
              }}>
                {mode === 'add' ? 'Add New Market Data' : 'Edit Market Data'}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '4px',
                backgroundColor: '#3B82F6',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
          
          {/* Date Section */}
          <div>
            <div style={{
              padding: '8px 16px',
              backgroundColor: '#D1D5DB',
              color: 'black',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              Misc
            </div>
            <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>Date</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div>
                  <input
                    type="date"
                    value={formData.date?.toString() || ''}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3B82F6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E2E8F0';
                    }}
                  />
                </div>
              </div>
              
              {/* 20% up/down */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', marginTop: '16px' }}>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>20% up</div>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>20% down</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_up_20pct?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_up_20pct', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_down_20pct?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_down_20pct', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
              </div>
              
              {/* $20 up/down */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', marginTop: '16px' }}>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>$20 up</div>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>$20 down</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_up_20dollar?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_up_20dollar', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_down_20dollar?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_down_20dollar', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
              </div>
              
              {/* T2108 full width */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px', marginTop: '16px' }}>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>T2108</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.t2108?.toString() || ''}
                    onChange={(e) => handleInputChange('t2108', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0-100"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
              </div>
              
              {/* Universe & S&P */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', marginTop: '16px' }}>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>Stock Universe</div>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>S&P 500</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <input
                    type="number"
                    value={formData.worden_universe?.toString() || ''}
                    onChange={(e) => handleInputChange('worden_universe', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.sp500?.toString() || ''}
                    onChange={(e) => handleInputChange('sp500', e.target.value)}
                    placeholder="4,832.49"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Primary Breadth Indicators */}
          <div>
            <div style={{
              padding: '8px 16px',
              backgroundColor: '#00D4AA',
              color: 'black',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              Primary Breadth Indicators
            </div>
            <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>4% up</div>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>4% down</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_up_4pct?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_up_4pct', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none', backgroundColor: 'white'
                    }}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_down_4pct?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_down_4pct', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none', backgroundColor: 'white'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', marginTop: '16px' }}>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>25% up in a quarter</div>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>25% down in a quarter</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_up_25pct_quarter?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_up_25pct_quarter', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none', backgroundColor: 'white'
                    }}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_down_25pct_quarter?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_down_25pct_quarter', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none', backgroundColor: 'white'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Indicators */}
          <div>
            <div style={{
              padding: '8px 16px',
              backgroundColor: '#FFD700',
              color: 'black',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              Secondary Indicators
            </div>
            <div style={{ padding: '12px 16px', backgroundColor: '#F8FAFC' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>25% up in a month</div>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>25% down in a month</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_up_25pct_month?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_up_25pct_month', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none', backgroundColor: 'white'
                    }}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_down_25pct_month?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_down_25pct_month', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none', backgroundColor: 'white'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', marginTop: '16px' }}>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>50% up in a month</div>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>50% down in a month</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_up_50pct_month?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_up_50pct_month', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none', backgroundColor: 'white'
                    }}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_down_50pct_month?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_down_50pct_month', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none', backgroundColor: 'white'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', marginTop: '16px' }}>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>13% up in 34 days</div>
                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'white', padding: '4px', backgroundColor: 'rgb(127, 127, 127)' }}>13% down in 34 days</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_up_13pct_34days?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_up_13pct_34days', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none', backgroundColor: 'white'
                    }}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={formData.stocks_down_13pct_34days?.toString() || ''}
                    onChange={(e) => handleInputChange('stocks_down_13pct_34days', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none', backgroundColor: 'white'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div 
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: 'white',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}
        >
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: 'white',
              color: '#64748B',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit'
            }}
            onMouseOver={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
              }
            }}
            onMouseOut={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
              }
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
              fontFamily: 'inherit'
            }}
          >
            <Save size={14} />
            {isSubmitting ? 'Saving...' : mode === 'add' ? 'Add Data' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockbeeModal;
