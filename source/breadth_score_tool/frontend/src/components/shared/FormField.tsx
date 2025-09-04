/**
 * Reusable Form Field Component
 * Provides consistent styling and validation for all form inputs
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea';
  value: any;
  onChange: (value: any) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: Array<{ value: any; label: string }>;
  className?: string;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  placeholder,
  options = [],
  className = '',
  helpText,
  min,
  max,
  step,
  rows = 3
}) => {
  const inputId = `field-${name}`;
  
  const baseInputClasses = `
    w-full px-3 py-2 border rounded-md transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${error 
      ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300 focus:ring-red-500' 
      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
    }
  `.trim().replace(/\s+/g, ' ');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    
    // Type conversion based on field type
    if (type === 'number') {
      onChange(newValue === '' ? '' : parseFloat(newValue));
    } else {
      onChange(newValue);
    }
  };

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            id={inputId}
            name={name}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            className={baseInputClasses}
            required={required}
          >
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            id={inputId}
            name={name}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            rows={rows}
            className={baseInputClasses}
            required={required}
          />
        );
      
      case 'number':
        return (
          <input
            id={inputId}
            name={name}
            type="number"
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            className={baseInputClasses}
            required={required}
          />
        );
      
      default:
        return (
          <input
            id={inputId}
            name={name}
            type={type}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            className={baseInputClasses}
            required={required}
          />
        );
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <label 
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {renderInput()}
      
      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Help Text */}
      {helpText && !error && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

export default FormField;