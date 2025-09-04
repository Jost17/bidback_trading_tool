/**
 * Centralized validation utilities for market data and user inputs
 */

import { VALIDATION, BREADTH_SCORE_THRESHOLDS } from './constants';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate breadth score value
 */
export const validateBreadthScore = (score: number | string): ValidationResult => {
  const errors: ValidationError[] = [];
  const numericScore = typeof score === 'string' ? parseFloat(score) : score;

  if (isNaN(numericScore)) {
    errors.push({
      field: 'breadthScore',
      message: 'Breadth score must be a valid number',
      code: 'INVALID_NUMBER'
    });
  } else if (numericScore < VALIDATION.MIN_BREADTH_SCORE || numericScore > VALIDATION.MAX_BREADTH_SCORE) {
    errors.push({
      field: 'breadthScore',
      message: `Breadth score must be between ${VALIDATION.MIN_BREADTH_SCORE} and ${VALIDATION.MAX_BREADTH_SCORE}`,
      code: 'OUT_OF_RANGE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate stock count value
 */
export const validateStockCount = (count: number | string, fieldName: string): ValidationResult => {
  const errors: ValidationError[] = [];
  const numericCount = typeof count === 'string' ? parseInt(count) : count;

  if (isNaN(numericCount)) {
    errors.push({
      field: fieldName,
      message: 'Stock count must be a valid number',
      code: 'INVALID_NUMBER'
    });
  } else if (numericCount < VALIDATION.MIN_STOCK_COUNT || numericCount > VALIDATION.MAX_STOCK_COUNT) {
    errors.push({
      field: fieldName,
      message: `Stock count must be between ${VALIDATION.MIN_STOCK_COUNT} and ${VALIDATION.MAX_STOCK_COUNT}`,
      code: 'OUT_OF_RANGE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const validateDate = (dateString: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!dateString) {
    errors.push({
      field: 'date',
      message: 'Date is required',
      code: 'REQUIRED'
    });
    return { isValid: false, errors };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    errors.push({
      field: 'date',
      message: 'Date must be in YYYY-MM-DD format',
      code: 'INVALID_FORMAT'
    });
    return { isValid: false, errors };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    errors.push({
      field: 'date',
      message: 'Date must be a valid date',
      code: 'INVALID_DATE'
    });
  }

  // Check if date is not in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  if (date > today) {
    errors.push({
      field: 'date',
      message: 'Date cannot be in the future',
      code: 'FUTURE_DATE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate complete market data entry
 */
export const validateMarketData = (data: any): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate date
  const dateValidation = validateDate(data.date);
  errors.push(...dateValidation.errors);

  // Validate required numeric fields
  const requiredFields = [
    'stocks_up_4pct',
    'stocks_down_4pct',
    'worden_universe',
    'sp500'
  ];

  requiredFields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push({
        field,
        message: `${field.replace(/_/g, ' ')} is required`,
        code: 'REQUIRED'
      });
    } else {
      const validation = validateStockCount(data[field], field);
      errors.push(...validation.errors);
    }
  });

  // Validate optional numeric fields
  const optionalFields = [
    'stocks_up_25pct_quarter',
    'stocks_down_25pct_quarter',
    'stocks_up_25pct_month',
    'stocks_down_25pct_month',
    'stocks_up_50pct_month',
    'stocks_down_50pct_month',
    'stocks_up_13pct_34days',
    'stocks_down_13pct_34days',
    't2108',
    'stocks_up_20pct',
    'stocks_down_20pct',
    'stocks_up_20dollar',
    'stocks_down_20dollar'
  ];

  optionalFields.forEach(field => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      const validation = validateStockCount(data[field], field);
      errors.push(...validation.errors);
    }
  });

  // Validate breadth score if present
  if (data.breadth_score !== undefined && data.breadth_score !== null && data.breadth_score !== '') {
    const breadthValidation = validateBreadthScore(data.breadth_score);
    errors.push(...breadthValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate file upload
 */
export const validateFileUpload = (file: File, allowedTypes: string[], maxSize: number): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!file) {
    errors.push({
      field: 'file',
      message: 'File is required',
      code: 'REQUIRED'
    });
    return { isValid: false, errors };
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push({
      field: 'file',
      message: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      code: 'INVALID_TYPE'
    });
  }

  if (file.size > maxSize) {
    errors.push({
      field: 'file',
      message: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
      code: 'FILE_TOO_LARGE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!email) {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED'
    });
    return { isValid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push({
      field: 'email',
      message: 'Email must be a valid email address',
      code: 'INVALID_FORMAT'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

/**
 * Sanitize numeric input
 */
export const sanitizeNumber = (input: string | number): number | null => {
  if (typeof input === 'number') return input;
  if (typeof input !== 'string') return null;
  
  const cleaned = input.replace(/[^0-9.-]/g, '');
  const number = parseFloat(cleaned);
  
  return isNaN(number) ? null : number;
};

/**
 * Batch validate multiple fields
 */
export const validateFields = (data: Record<string, any>, validators: Record<string, (value: any) => ValidationResult>): ValidationResult => {
  const allErrors: ValidationError[] = [];

  Object.entries(validators).forEach(([field, validator]) => {
    const result = validator(data[field]);
    allErrors.push(...result.errors);
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};