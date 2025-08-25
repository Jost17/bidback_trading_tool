import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

// Validation rule types
interface ValidationRule {
  field: string;
  type: 'required' | 'range' | 'format' | 'custom';
  params?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
    validator?: (value: any, data?: any) => boolean;
  };
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// Validation result
interface ValidationResult {
  field: string;
  value: any;
  isValid: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule: string;
}

// Comprehensive validation rules for market data
export const MARKET_DATA_VALIDATION_RULES: ValidationRule[] = [
  // Required fields
  {
    field: 'date',
    type: 'required',
    message: 'Datum ist erforderlich',
    severity: 'error'
  },
  
  // T2108 validation (0-100%)
  {
    field: 't2108',
    type: 'range',
    params: { min: 0, max: 100 },
    message: 'T2108 muss zwischen 0 und 100 liegen',
    severity: 'error'
  },
  
  // Positive numbers validation for stock counts
  {
    field: 'stocks_up_4pct',
    type: 'range',
    params: { min: 0 },
    message: '4% Up Stocks können nicht negativ sein',
    severity: 'error'
  },
  {
    field: 'stocks_down_4pct',
    type: 'range',
    params: { min: 0 },
    message: '4% Down Stocks können nicht negativ sein',
    severity: 'error'
  },
  {
    field: 'worden_universe',
    type: 'range',
    params: { min: 1 },
    message: 'Worden Universe muss mindestens 1 sein',
    severity: 'error'
  },
  
  // Date format validation
  {
    field: 'date',
    type: 'format',
    params: {
      pattern: /^\d{4}-\d{2}-\d{2}$/,
      message: 'Datum muss im Format YYYY-MM-DD sein'
    },
    message: 'Datum muss im Format YYYY-MM-DD sein',
    severity: 'error'
  },
  
  // Cross-field validations
  {
    field: 'stocks_up_4pct',
    type: 'custom',
    params: {
      validator: (value, data) => {
        if (!value || !data?.worden_universe) return true;
        return value <= data.worden_universe;
      }
    },
    message: '4% Up Stocks können nicht größer als Worden Universe sein',
    severity: 'error'
  }
];

// Validation service
export class ValidationService {
  
  static validateField(field: string, value: any, data: any = {}, rules: ValidationRule[] = MARKET_DATA_VALIDATION_RULES): ValidationResult[] {
    const results: ValidationResult[] = [];
    const fieldRules = rules.filter(rule => rule.field === field);
    
    for (const rule of fieldRules) {
      const result = this.applyRule(field, value, data, rule);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }
  
  static validateData(data: any, rules: ValidationRule[] = MARKET_DATA_VALIDATION_RULES): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Get all unique fields from rules
    const fields = [...new Set(rules.map(rule => rule.field))];
    
    for (const field of fields) {
      const value = data[field];
      const fieldResults = this.validateField(field, value, data, rules);
      results.push(...fieldResults);
    }
    
    return results;
  }
  
  private static applyRule(field: string, value: any, data: any, rule: ValidationRule): ValidationResult | null {
    let isValid = true;
    let message = rule.message;
    
    switch (rule.type) {
      case 'required':
        isValid = value !== null && value !== undefined && value !== '';
        break;
        
      case 'range':
        if (value !== null && value !== undefined && value !== '') {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            isValid = false;
            message = `${field} muss eine Zahl sein`;
          } else {
            if (rule.params?.min !== undefined && numValue < rule.params.min) {
              isValid = false;
              message = `${field} muss mindestens ${rule.params.min} sein`;
            }
            if (rule.params?.max !== undefined && numValue > rule.params.max) {
              isValid = false;
              message = `${field} darf maximal ${rule.params.max} sein`;
            }
          }
        }
        break;
        
      case 'format':
        if (value !== null && value !== undefined && value !== '') {
          if (rule.params?.pattern && !rule.params.pattern.test(String(value))) {
            isValid = false;
            message = rule.params.message || rule.message;
          }
        }
        break;
        
      case 'custom':
        if (rule.params?.validator) {
          isValid = rule.params.validator(value, data);
          if (!isValid && rule.params.message) {
            message = rule.params.message;
          }
        }
        break;
    }
    
    // Only return result if validation failed
    if (!isValid) {
      return {
        field,
        value,
        isValid,
        severity: rule.severity,
        message,
        rule: rule.type
      };
    }
    
    return null;
  }
  
  static hasErrors(results: ValidationResult[]): boolean {
    return results.some(result => result.severity === 'error');
  }
  
  static hasWarnings(results: ValidationResult[]): boolean {
    return results.some(result => result.severity === 'warning');
  }
  
  static getErrorCount(results: ValidationResult[]): number {
    return results.filter(result => result.severity === 'error').length;
  }
  
  static getWarningCount(results: ValidationResult[]): number {
    return results.filter(result => result.severity === 'warning').length;
  }
}

// React component for displaying validation results
interface ValidationDisplayProps {
  results: ValidationResult[];
  className?: string;
  showSuccessMessage?: boolean;
}

export const ValidationDisplay: React.FC<ValidationDisplayProps> = ({ 
  results, 
  className = '',
  showSuccessMessage = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const errors = results.filter(r => r.severity === 'error');
  const warnings = results.filter(r => r.severity === 'warning');
  const infos = results.filter(r => r.severity === 'info');
  
  if (results.length === 0 && showSuccessMessage) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 ${className}`}>
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">✅ Alle Validierungen bestanden</span>
      </div>
    );
  }
  
  if (results.length === 0) {
    return null;
  }
  
  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  };
  
  const getSeverityColor = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return 'bg-red-500/10 border-red-500/50 text-red-400';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/50 text-blue-400';
    }
  };
  
  const primarySeverity = errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'info';
  
  return (
    <div className={`border rounded-lg ${getSeverityColor(primarySeverity)} ${className}`}>
      {/* Summary */}
      <div 
        className="p-3 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {getSeverityIcon(primarySeverity)}
          <span className="font-medium">
            {errors.length > 0 && `${errors.length} Fehler`}
            {errors.length > 0 && warnings.length > 0 && ', '}
            {warnings.length > 0 && `${warnings.length} Warnungen`}
            {infos.length > 0 && `${infos.length} Hinweise`}
          </span>
        </div>
        <span className="text-xs">
          {isExpanded ? '▼' : '▶'} Details
        </span>
      </div>
      
      {/* Detailed Results */}
      {isExpanded && (
        <div className="border-t border-current/20 p-3 space-y-2">
          {[...errors, ...warnings, ...infos].map((result, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              {getSeverityIcon(result.severity)}
              <div className="flex-1">
                <span className="font-medium">{result.field}:</span> {result.message}
                {result.value !== null && result.value !== undefined && (
                  <span className="ml-2 text-xs opacity-70">
                    (Wert: {String(result.value)})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Hook for real-time validation
export const useValidation = (data: any, rules: ValidationRule[] = MARKET_DATA_VALIDATION_RULES) => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  
  React.useEffect(() => {
    const results = ValidationService.validateData(data, rules);
    setValidationResults(results);
  }, [data, rules]);
  
  return {
    validationResults,
    hasErrors: ValidationService.hasErrors(validationResults),
    hasWarnings: ValidationService.hasWarnings(validationResults),
    errorCount: ValidationService.getErrorCount(validationResults),
    warningCount: ValidationService.getWarningCount(validationResults),
    isValid: !ValidationService.hasErrors(validationResults)
  };
};

export default ValidationService;
