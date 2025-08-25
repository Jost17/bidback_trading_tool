/**
 * Unified error handling middleware for standardized error responses
 */

class APIError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

class ValidationError extends APIError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class DatabaseError extends APIError {
  constructor(message, originalError) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

class NotFoundError extends APIError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Main error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);

  // Handle API errors
  if (err instanceof APIError) {
    const response = {
      success: false,
      error: {
        message: err.message,
        code: err.code,
        statusCode: err.statusCode
      }
    };

    // Add validation errors if present
    if (err instanceof ValidationError) {
      response.error.validation = err.errors;
    }

    // Add stack trace in development
    if (isDevelopment) {
      response.error.stack = err.stack;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle SQLite database errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    const dbError = new DatabaseError('Database operation failed', err);
    const response = {
      success: false,
      error: {
        message: dbError.message,
        code: dbError.code,
        statusCode: 500
      }
    };

    if (isDevelopment) {
      response.error.details = err.message;
      response.error.stack = err.stack;
    }

    return res.status(500).json(response);
  }

  // Handle multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: {
        message: 'File too large',
        code: 'FILE_TOO_LARGE',
        statusCode: 413
      }
    });
  }

  if (err.message === 'Only CSV files are allowed') {
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: 'INVALID_FILE_TYPE',
        statusCode: 400
      }
    });
  }

  // Handle generic errors
  const response = {
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500
    }
  };

  if (isDevelopment) {
    response.error.originalMessage = err.message;
    response.error.stack = err.stack;
  }

  res.status(500).json(response);
};

/**
 * Async error handler wrapper for route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404
    }
  });
};

/**
 * Success response helper
 */
export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Paginated response helper
 */
export const sendPaginatedSuccess = (res, data, pagination, message = 'Success') => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString()
  });
};

// Export error classes for use in routes
export {
  APIError,
  ValidationError,
  DatabaseError,
  NotFoundError
};