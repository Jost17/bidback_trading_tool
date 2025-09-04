/**
 * Bidback Trading System - Security Configuration
 * Centralized security policies and validation functions
 */

export interface SecurityConfig {
  inputValidation: {
    maxPortfolioSize: number
    minPortfolioSize: number
    maxVIX: number
    minVIX: number
    maxSymbolLength: number
    maxCSVLineLength: number
  }
  database: {
    encryptionEnabled: boolean
    backupEncryption: boolean
    queryTimeout: number
    maxConnections: number
  }
  electron: {
    sandboxMode: boolean
    nodeIntegration: boolean
    contextIsolation: boolean
    webSecurity: boolean
  }
  logging: {
    securityEvents: boolean
    logLevel: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
    maxLogSize: number
  }
}

export const SECURITY_CONFIG: SecurityConfig = {
  inputValidation: {
    maxPortfolioSize: 100_000_000, // $100M max
    minPortfolioSize: 1000, // $1K min
    maxVIX: 100,
    minVIX: 0,
    maxSymbolLength: 10,
    maxCSVLineLength: 10000
  },
  database: {
    encryptionEnabled: false, // TODO: Enable in production
    backupEncryption: true,
    queryTimeout: 30000, // 30 seconds
    maxConnections: 10
  },
  electron: {
    sandboxMode: false, // TODO: Enable in production
    nodeIntegration: false,
    contextIsolation: true,
    webSecurity: true
  },
  logging: {
    securityEvents: true,
    logLevel: 'WARN',
    maxLogSize: 10_000_000 // 10MB
  }
}

/**
 * Secure input validation functions
 */
export class SecurityValidator {
  
  /**
   * Validate and sanitize portfolio size input
   */
  static validatePortfolioSize(input: string): { isValid: boolean; sanitized: number | null; error?: string } {
    try {
      // Remove any HTML tags and potential XSS
      const cleaned = input.replace(/<[^>]*>/g, '').trim()
      
      // Check for code injection patterns
      const dangerousPatterns = [
        /\$\{.*\}/, // Template literals
        /eval\s*\(/i, // Eval functions
        /script/i, // Script tags
        /javascript:/i, // Javascript protocol
        /on\w+\s*=/i, // Event handlers
        /process\./i, // Node.js process
        /require\s*\(/i, // Require statements
        /import\s+/i // Import statements
      ]
      
      if (dangerousPatterns.some(pattern => pattern.test(cleaned))) {
        return { isValid: false, sanitized: null, error: 'Invalid characters detected' }
      }
      
      // Check for SQL injection patterns
      const sqlPatterns = [
        /['";]/,
        /drop\s+table/i,
        /delete\s+from/i,
        /insert\s+into/i,
        /union\s+select/i,
        /--/,
        /\/\*/
      ]
      
      if (sqlPatterns.some(pattern => pattern.test(cleaned))) {
        return { isValid: false, sanitized: null, error: 'Invalid SQL-like patterns detected' }
      }
      
      // Parse as number
      const num = parseFloat(cleaned.replace(/[,$]/g, ''))
      
      if (isNaN(num) || !isFinite(num)) {
        return { isValid: false, sanitized: null, error: 'Must be a valid number' }
      }
      
      if (num < SECURITY_CONFIG.inputValidation.minPortfolioSize) {
        return { isValid: false, sanitized: null, error: `Minimum portfolio size is $${SECURITY_CONFIG.inputValidation.minPortfolioSize.toLocaleString()}` }
      }
      
      if (num > SECURITY_CONFIG.inputValidation.maxPortfolioSize) {
        return { isValid: false, sanitized: null, error: `Maximum portfolio size is $${SECURITY_CONFIG.inputValidation.maxPortfolioSize.toLocaleString()}` }
      }
      
      return { isValid: true, sanitized: Math.round(num * 100) / 100 } // Round to cents
      
    } catch (error) {
      return { isValid: false, sanitized: null, error: 'Validation error occurred' }
    }
  }
  
  /**
   * Validate and sanitize VIX input
   */
  static validateVIX(input: string): { isValid: boolean; sanitized: number | null; error?: string } {
    try {
      const cleaned = input.replace(/<[^>]*>/g, '').trim()
      
      // Security checks
      if (/<script|javascript:|on\w+\s*=/i.test(input)) {
        return { isValid: false, sanitized: null, error: 'Potential XSS detected' }
      }
      
      if (/['"`;]/.test(cleaned)) {
        return { isValid: false, sanitized: null, error: 'Invalid characters detected' }
      }
      
      const num = parseFloat(cleaned)
      
      if (isNaN(num) || !isFinite(num)) {
        return { isValid: false, sanitized: null, error: 'Must be a valid number' }
      }
      
      if (num < SECURITY_CONFIG.inputValidation.minVIX || num > SECURITY_CONFIG.inputValidation.maxVIX) {
        return { isValid: false, sanitized: null, error: `VIX must be between ${SECURITY_CONFIG.inputValidation.minVIX} and ${SECURITY_CONFIG.inputValidation.maxVIX}` }
      }
      
      return { isValid: true, sanitized: Math.round(num * 10) / 10 } // Round to 1 decimal
      
    } catch (error) {
      return { isValid: false, sanitized: null, error: 'Validation error occurred' }
    }
  }
  
  /**
   * Validate and sanitize T2108 percentage input
   */
  static validateT2108(input: string): { isValid: boolean; sanitized: number | null; error?: string } {
    try {
      const cleaned = input.replace(/<[^>]*>/g, '').trim()
      
      // XSS and injection prevention
      if (/<script|javascript:|on\w+\s*=/i.test(input)) {
        return { isValid: false, sanitized: null, error: 'Potential XSS detected' }
      }
      
      if (/union\s+select|drop\s+table|delete\s+from/i.test(cleaned)) {
        return { isValid: false, sanitized: null, error: 'SQL injection patterns detected' }
      }
      
      if (/\$\{.*\}/.test(cleaned)) {
        return { isValid: false, sanitized: null, error: 'Template literal injection detected' }
      }
      
      const num = parseFloat(cleaned)
      
      if (isNaN(num) || !isFinite(num)) {
        return { isValid: false, sanitized: null, error: 'Must be a valid percentage' }
      }
      
      if (num < 0 || num > 100) {
        return { isValid: false, sanitized: null, error: 'T2108 must be between 0 and 100' }
      }
      
      return { isValid: true, sanitized: Math.round(num * 10) / 10 } // Round to 1 decimal
      
    } catch (error) {
      return { isValid: false, sanitized: null, error: 'Validation error occurred' }
    }
  }
  
  /**
   * Validate and sanitize stock symbol input
   */
  static validateSymbol(input: string): { isValid: boolean; sanitized: string | null; error?: string } {
    try {
      if (!input || typeof input !== 'string') {
        return { isValid: false, sanitized: null, error: 'Symbol is required' }
      }
      
      const cleaned = input.replace(/<[^>]*>/g, '').trim().toUpperCase()
      
      if (cleaned !== input.replace(/<[^>]*>/g, '').trim().toUpperCase()) {
        return { isValid: false, sanitized: null, error: 'Invalid HTML detected' }
      }
      
      // Check length
      if (cleaned.length === 0) {
        return { isValid: false, sanitized: null, error: 'Symbol cannot be empty' }
      }
      
      if (cleaned.length > SECURITY_CONFIG.inputValidation.maxSymbolLength) {
        return { isValid: false, sanitized: null, error: `Symbol too long (max ${SECURITY_CONFIG.inputValidation.maxSymbolLength} characters)` }
      }
      
      // Check for path traversal
      if (cleaned.includes('../') || cleaned.includes('..\\')) {
        return { isValid: false, sanitized: null, error: 'Path traversal detected' }
      }
      
      // Valid symbol pattern (letters, numbers, dots, hyphens only)
      if (!/^[A-Z0-9.-]+$/.test(cleaned)) {
        return { isValid: false, sanitized: null, error: 'Symbol contains invalid characters' }
      }
      
      // Check for SQL keywords
      const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'NULL', 'UNION']
      if (sqlKeywords.includes(cleaned)) {
        return { isValid: false, sanitized: null, error: 'Symbol cannot be a SQL keyword' }
      }
      
      return { isValid: true, sanitized: cleaned }
      
    } catch (error) {
      return { isValid: false, sanitized: null, error: 'Validation error occurred' }
    }
  }
  
  /**
   * Validate and sanitize CSV data to prevent injection
   */
  static validateCSVData(input: string): { isValid: boolean; sanitized: string | null; error?: string } {
    try {
      if (!input || typeof input !== 'string') {
        return { isValid: false, sanitized: null, error: 'CSV data is required' }
      }
      
      // Check length
      if (input.length > SECURITY_CONFIG.inputValidation.maxCSVLineLength) {
        return { isValid: false, sanitized: null, error: 'CSV line too long' }
      }
      
      // CSV Injection prevention - check for formula indicators
      const csvInjectionPatterns = [
        /^[=@+\-]/, // Formula starters
        /HYPERLINK\s*\(/i,
        /IMPORTXML\s*\(/i,
        /IMPORTDATA\s*\(/i,
        /cmd\s*\|/i,
        /DDE\s*\(/i,
        /WEBSERVICE\s*\(/i
      ]
      
      if (csvInjectionPatterns.some(pattern => pattern.test(input))) {
        return { isValid: false, sanitized: null, error: 'CSV injection pattern detected' }
      }
      
      // Sanitize the CSV data
      const lines = input.split('\n')
      const sanitizedLines = lines.map(line => {
        return line.split(',').map(field => {
          let sanitized = field.trim()
          
          // Prevent formula injection by prefixing dangerous characters
          if (/^[=@+\-]/.test(sanitized)) {
            sanitized = `'${sanitized}`
          }
          
          // Escape quotes properly
          if (sanitized.includes('"')) {
            sanitized = `"${sanitized.replace(/"/g, '""')}"`
          } else if (sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('\r')) {
            sanitized = `"${sanitized}"`
          }
          
          return sanitized
        }).join(',')
      })
      
      return { isValid: true, sanitized: sanitizedLines.join('\n') }
      
    } catch (error) {
      return { isValid: false, sanitized: null, error: 'CSV validation error occurred' }
    }
  }
  
  /**
   * Validate position calculation for arithmetic overflow
   */
  static validatePositionCalculation(portfolioSize: number, percentage: number): { isValid: boolean; error?: string } {
    try {
      // Check for valid numbers
      if (!isFinite(portfolioSize) || !isFinite(percentage)) {
        return { isValid: false, error: 'Invalid numeric values' }
      }
      
      if (portfolioSize <= 0 || percentage < 0 || percentage > 100) {
        return { isValid: false, error: 'Values out of valid range' }
      }
      
      // Check for potential overflow in calculation
      const maxSafeCalculation = Number.MAX_SAFE_INTEGER / 100
      if (portfolioSize > maxSafeCalculation) {
        return { isValid: false, error: 'Portfolio size too large for safe calculation' }
      }
      
      // Perform calculation and check result
      const result = (portfolioSize * percentage) / 100
      if (!isFinite(result) || result > Number.MAX_SAFE_INTEGER) {
        return { isValid: false, error: 'Calculation would cause overflow' }
      }
      
      return { isValid: true }
      
    } catch (error) {
      return { isValid: false, error: 'Position calculation validation failed' }
    }
  }
}

/**
 * Security logging utility
 */
export class SecurityLogger {
  private static instance: SecurityLogger
  private logBuffer: Array<{ timestamp: string; event: string; severity: string; details?: any }> = []
  
  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger()
    }
    return SecurityLogger.instance
  }
  
  logSecurityEvent(event: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', details?: any) {
    if (!SECURITY_CONFIG.logging.securityEvents) return
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: this.sanitizeLogMessage(event),
      severity,
      processId: process.pid,
      memoryUsage: process.memoryUsage(),
      details: details ? this.sanitizeLogDetails(details) : undefined
    }
    
    // Add to buffer
    this.logBuffer.push(logEntry)
    
    // Prevent memory leaks by limiting buffer size
    if (this.logBuffer.length > 1000) {
      this.logBuffer = this.logBuffer.slice(-500) // Keep last 500 entries
    }
    
    // Console output based on log level
    const logLevels = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 }
    const severityLevels = { CRITICAL: 0, HIGH: 0, MEDIUM: 1, LOW: 2 }
    
    if (logLevels[SECURITY_CONFIG.logging.logLevel] >= severityLevels[severity]) {
      console.log(`[SECURITY ${severity}] ${event}`, details || '')
    }
  }
  
  private sanitizeLogMessage(message: string): string {
    // Remove sensitive information from log messages
    return message
      .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
      .replace(/api[_-]?key[=:]\s*\S+/gi, 'apikey=[REDACTED]')
      .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]')
      .replace(/\/.*\/[^\/]+\.db/g, '[DATABASE_PATH]')
  }
  
  private sanitizeLogDetails(details: any): any {
    if (typeof details === 'string') {
      return this.sanitizeLogMessage(details)
    }
    
    if (typeof details === 'object' && details !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(details)) {
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeLogMessage(value)
        } else {
          sanitized[key] = value
        }
      }
      return sanitized
    }
    
    return details
  }
  
  getSecurityLogs(severity?: string): Array<any> {
    if (severity) {
      return this.logBuffer.filter(log => log.severity === severity)
    }
    return [...this.logBuffer] // Return copy to prevent mutation
  }
  
  clearLogs(): void {
    this.logBuffer = []
  }
}

/**
 * Export security utilities for use in components
 */
export const securityValidator = SecurityValidator
export const securityLogger = SecurityLogger.getInstance()