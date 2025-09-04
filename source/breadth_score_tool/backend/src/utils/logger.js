/**
 * Comprehensive Logging and Monitoring System
 * Provides structured logging with different levels and contexts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Log levels in order of severity
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

/**
 * Logger configuration
 */
const CONFIG = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'WARN' : 'DEBUG'),
  format: process.env.LOG_FORMAT || 'json', // 'json' or 'text'
  output: {
    console: true,
    file: process.env.LOG_TO_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs')
  },
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5
};

/**
 * Enhanced Logger Class
 */
export class Logger {
  constructor(context = 'App') {
    this.context = context;
    this.metrics = {
      requests: 0,
      errors: 0,
      warnings: 0,
      ocrProcessing: 0,
      dbQueries: 0
    };
    
    this._ensureLogDirectory();
  }

  /**
   * Log a debug message
   */
  debug(message, meta = {}) {
    this._log('DEBUG', message, meta);
  }

  /**
   * Log an info message
   */
  info(message, meta = {}) {
    this._log('INFO', message, meta);
    if (meta.type === 'request') this.metrics.requests++;
  }

  /**
   * Log a warning message
   */
  warn(message, meta = {}) {
    this._log('WARN', message, meta);
    this.metrics.warnings++;
  }

  /**
   * Log an error message
   */
  error(message, meta = {}) {
    this._log('ERROR', message, meta);
    this.metrics.errors++;
  }

  /**
   * Log a fatal error message
   */
  fatal(message, meta = {}) {
    this._log('FATAL', message, meta);
    this.metrics.errors++;
  }

  /**
   * Log request with timing
   */
  logRequest(req, res, duration) {
    const meta = {
      type: 'request',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      requestId: req.id
    };

    if (res.statusCode >= 400) {
      this.error(`HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, meta);
    } else {
      this.info(`HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, meta);
    }
  }

  /**
   * Log database operations
   */
  logDatabase(operation, query, duration, error = null) {
    this.metrics.dbQueries++;
    
    const meta = {
      type: 'database',
      operation,
      duration: `${duration}ms`,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
    };

    if (error) {
      this.error(`Database ${operation} failed`, { ...meta, error: error.message });
    } else {
      this.debug(`Database ${operation} completed`, meta);
    }
  }

  /**
   * Log OCR operations
   */
  logOCR(operation, imagePath, duration, result = null, error = null) {
    this.metrics.ocrProcessing++;
    
    const meta = {
      type: 'ocr',
      operation,
      imagePath: path.basename(imagePath),
      duration: `${duration}ms`
    };

    if (error) {
      this.error(`OCR ${operation} failed`, { ...meta, error: error.message });
    } else if (result) {
      this.info(`OCR ${operation} completed`, {
        ...meta,
        confidence: result.confidence,
        extractedFields: result.extractedFields
      });
    } else {
      this.debug(`OCR ${operation}`, meta);
    }
  }

  /**
   * Log file operations
   */
  logFile(operation, filePath, size = null, error = null) {
    const meta = {
      type: 'file',
      operation,
      filePath: path.basename(filePath),
      size: size ? `${size} bytes` : undefined
    };

    if (error) {
      this.error(`File ${operation} failed`, { ...meta, error: error.message });
    } else {
      this.debug(`File ${operation} completed`, meta);
    }
  }

  /**
   * Get metrics summary
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = 0;
    });
  }

  /**
   * Core logging method
   * @private
   */
  _log(level, message, meta = {}) {
    const levelValue = LOG_LEVELS[level];
    const configLevelValue = LOG_LEVELS[CONFIG.level.toUpperCase()];
    
    // Skip if below configured level
    if (levelValue < configLevelValue) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...meta
    };

    // Add process info for errors
    if (level === 'ERROR' || level === 'FATAL') {
      logEntry.pid = process.pid;
      logEntry.memory = process.memoryUsage();
    }

    // Console output
    if (CONFIG.output.console) {
      this._outputToConsole(level, logEntry);
    }

    // File output
    if (CONFIG.output.file) {
      this._outputToFile(logEntry);
    }
  }

  /**
   * Output to console with colors
   * @private
   */
  _outputToConsole(level, logEntry) {
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      FATAL: '\x1b[35m'  // Magenta
    };
    const reset = '\x1b[0m';

    if (CONFIG.format === 'json') {
      console.log(`${colors[level]}${JSON.stringify(logEntry)}${reset}`);
    } else {
      const { timestamp, context, message, ...meta } = logEntry;
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      console.log(`${colors[level]}[${timestamp}] ${level} [${context}] ${message}${metaStr}${reset}`);
    }
  }

  /**
   * Output to file
   * @private
   */
  async _outputToFile(logEntry) {
    try {
      const fileName = `app-${new Date().toISOString().split('T')[0]}.log`;
      const filePath = path.join(CONFIG.output.filePath, fileName);
      
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(filePath, logLine);
      
      // Check file size and rotate if needed
      await this._rotateLogFile(filePath);
    } catch (error) {
      // Fallback to console if file logging fails
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Ensure log directory exists
   * @private
   */
  async _ensureLogDirectory() {
    if (CONFIG.output.file) {
      try {
        await fs.mkdir(CONFIG.output.filePath, { recursive: true });
      } catch (error) {
        console.error('Failed to create log directory:', error);
      }
    }
  }

  /**
   * Rotate log files when they get too large
   * @private
   */
  async _rotateLogFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > CONFIG.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = filePath.replace('.log', `-${timestamp}.log`);
        await fs.rename(filePath, rotatedPath);
        
        // Clean up old files
        await this._cleanupOldLogFiles();
      }
    } catch (error) {
      // Ignore rotation errors
    }
  }

  /**
   * Clean up old log files
   * @private
   */
  async _cleanupOldLogFiles() {
    try {
      const files = await fs.readdir(CONFIG.output.filePath);
      const logFiles = files
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(CONFIG.output.filePath, file)
        }));

      if (logFiles.length > CONFIG.maxFiles) {
        // Sort by name (which includes timestamp) and remove oldest
        logFiles.sort((a, b) => a.name.localeCompare(b.name));
        const filesToDelete = logFiles.slice(0, logFiles.length - CONFIG.maxFiles);
        
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Performance monitoring helper
 */
export class PerformanceMonitor {
  constructor(logger) {
    this.logger = logger;
    this.timers = new Map();
  }

  /**
   * Start timing an operation
   */
  start(operationId) {
    this.timers.set(operationId, {
      startTime: Date.now(),
      startMemory: process.memoryUsage()
    });
  }

  /**
   * End timing and log performance
   */
  end(operationId, context = {}) {
    const timer = this.timers.get(operationId);
    if (!timer) return;

    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - timer.startTime;
    const memoryDelta = endMemory.heapUsed - timer.startMemory.heapUsed;

    this.logger.debug(`Performance: ${operationId}`, {
      type: 'performance',
      operationId,
      duration: `${duration}ms`,
      memoryDelta: `${Math.round(memoryDelta / 1024)}KB`,
      ...context
    });

    this.timers.delete(operationId);
    return { duration, memoryDelta };
  }

  /**
   * Measure async operation
   */
  async measure(operationId, asyncOperation, context = {}) {
    this.start(operationId);
    try {
      const result = await asyncOperation();
      this.end(operationId, { ...context, success: true });
      return result;
    } catch (error) {
      this.end(operationId, { ...context, success: false, error: error.message });
      throw error;
    }
  }
}

/**
 * Create default logger instances
 */
export const mainLogger = new Logger('Main');
export const apiLogger = new Logger('API');
export const dbLogger = new Logger('Database');
export const ocrLogger = new Logger('OCR');
export const fileLogger = new Logger('File');

export const performanceMonitor = new PerformanceMonitor(mainLogger);

/**
 * Express middleware for request logging
 */
export const requestLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  req.id = req.id || Math.random().toString(36).substring(2, 15);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    apiLogger.logRequest(req, res, duration);
  });
  
  next();
};

export default {
  Logger,
  PerformanceMonitor,
  mainLogger,
  apiLogger,
  dbLogger,
  ocrLogger,
  fileLogger,
  performanceMonitor,
  requestLoggingMiddleware,
  LOG_LEVELS
};