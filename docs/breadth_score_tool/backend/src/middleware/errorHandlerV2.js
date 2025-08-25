/**
 * Enhanced Error Handling Middleware
 * Centralized error handling with consistent responses and logging
 */

import { ERROR_MESSAGES } from '../config/constants.js';

/**
 * Custom error classes for different error types
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class DatabaseError extends AppError {
  constructor(message, details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class FileUploadError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'FILE_UPLOAD_ERROR', details);
  }
}

export class OCRError extends AppError {
  constructor(message, details = null) {
    super(message, 422, 'OCR_ERROR', details);
  }
}

/**
 * Error response formatter
 */
export class ErrorResponse {
  static format(error, includeStack = false) {
    const response = {
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message,
        statusCode: error.statusCode || 500
      }
    };
    
    // Add details if available
    if (error.details) {
      response.error.details = error.details;
    }
    
    // Add stack trace in development
    if (includeStack && process.env.NODE_ENV === 'development') {
      response.error.stack = error.stack;
    }
    
    // Add timestamp
    response.error.timestamp = new Date().toISOString();
    
    return response;
  }
}

/**
 * Enhanced async handler with better error context
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Add request context to error
      error.requestId = req.id || req.headers['x-request-id'];
      error.method = req.method;
      error.url = req.originalUrl;
      error.userAgent = req.headers['user-agent'];
      
      next(error);
    });
  };
};

/**
 * Global error handling middleware
 */
export const globalErrorHandler = (error, req, res, next) => {
  // Log error with context
  console.error('Error occurred:', {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    requestId: error.requestId,
    method: error.method,
    url: error.url,
    timestamp: new Date().toISOString()
  });
  
  // Handle different error types
  let handledError = error;
  
  // SQLite constraint errors
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    handledError = new ConflictError(
      ERROR_MESSAGES.VALIDATION.DUPLICATE_DATE,
      { field: 'date', constraint: 'unique' }
    );
  }
  
  // SQLite general errors
  if (error.code && error.code.startsWith('SQLITE_')) {
    handledError = new DatabaseError(
      ERROR_MESSAGES.DATABASE.QUERY_FAILED,
      { sqliteCode: error.code }
    );
  }
  
  // File upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    handledError = new FileUploadError(
      ERROR_MESSAGES.FILE_UPLOAD.FILE_TOO_LARGE,
      { maxSize: error.limit }
    );
  }
  
  // Validation errors from express-validator
  if (error.type === 'entity.parse.failed') {
    handledError = new ValidationError(
      'Invalid JSON in request body',
      { originalError: error.message }
    );
  }
  
  // Default to AppError if not already handled
  if (!handledError.isOperational) {
    handledError = new AppError(
      process.env.NODE_ENV === 'production' 
        ? 'Something went wrong!' 
        : error.message,
      500,
      'INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? { originalError: error.message } : null
    );
  }
  
  // Send error response
  const includeStack = process.env.NODE_ENV === 'development';
  const errorResponse = ErrorResponse.format(handledError, includeStack);
  
  res.status(handledError.statusCode).json(errorResponse);
};

/**
 * Not found middleware for unmatched routes
 */
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Success response helper
 */
export const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  response.timestamp = new Date().toISOString();
  
  res.status(statusCode).json(response);
};

/**
 * Validation helper functions
 */
export const ValidationHelpers = {
  /**
   * Validate required fields
   */
  requireFields(data, requiredFields) {
    const missing = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );
    
    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missing.join(', ')}`,
        { missingFields: missing }
      );
    }
  },
  
  /**
   * Validate field types
   */
  validateTypes(data, fieldTypes) {
    const errors = [];
    
    Object.entries(fieldTypes).forEach(([field, expectedType]) => {
      const value = data[field];
      if (value !== null && value !== undefined) {
        const actualType = typeof value;
        if (actualType !== expectedType) {
          errors.push({
            field,
            message: `Expected ${expectedType}, got ${actualType}`,
            value
          });
        }
      }
    });
    
    if (errors.length > 0) {
      throw new ValidationError('Type validation failed', { typeErrors: errors });
    }
  },
  
  /**
   * Validate numeric ranges
   */
  validateRanges(data, ranges) {
    const errors = [];
    
    Object.entries(ranges).forEach(([field, range]) => {
      const value = parseFloat(data[field]);
      if (!isNaN(value)) {
        if (range.min !== undefined && value < range.min) {
          errors.push({
            field,
            message: `Value ${value} is below minimum ${range.min}`,
            value,
            min: range.min
          });
        }
        if (range.max !== undefined && value > range.max) {
          errors.push({
            field,
            message: `Value ${value} is above maximum ${range.max}`,
            value,
            max: range.max
          });
        }
      }
    });
    
    if (errors.length > 0) {
      throw new ValidationError('Range validation failed', { rangeErrors: errors });
    }
  },
  
  /**
   * Sanitize input data
   */
  sanitize(data, allowedFields) {
    const sanitized = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        sanitized[field] = data[field];
      }
    });
    return sanitized;
  }
};

/**
 * Rate limiting error
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Enhanced logging middleware
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  req.id = Math.random().toString(36).substring(2, 15);
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
    requestId: req.id,
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length']
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode}`, {
      requestId: req.id,
      duration: `${duration}ms`,
      statusCode: res.statusCode
    });
  });
  
  next();
};

export default {
  AppError,
  ValidationError,
  DatabaseError,
  NotFoundError,
  ConflictError,
  FileUploadError,
  OCRError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  ErrorResponse,
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
  sendSuccess,
  ValidationHelpers,
  requestLogger
};