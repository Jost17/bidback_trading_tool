/**
 * Bidback Trading System - Input Validation Security Tests
 * Comprehensive test suite for input sanitization and validation
 */

import { describe, it, expect } from 'vitest'

// Mock trading API for testing
interface MockTradingAPI {
  saveBreadthData: (data: any) => Promise<any>
  saveTrade: (trade: any) => Promise<any>
  importCSVBreadth: (csvData: string) => Promise<any>
}

// Input validation test cases
export class InputValidationTests {
  private mockAPI: MockTradingAPI

  constructor(mockAPI: MockTradingAPI) {
    this.mockAPI = mockAPI
  }

  /**
   * Test portfolio size input validation
   * Critical: Portfolio size affects position calculations
   */
  async testPortfolioSizeValidation() {
    const testCases = [
      // Valid cases
      { input: '100000', expected: true, description: 'Valid portfolio size' },
      { input: '50000', expected: true, description: 'Minimum valid portfolio' },
      { input: '10000000', expected: true, description: 'Large portfolio size' },
      
      // Invalid cases - Security vulnerabilities
      { input: '<script>alert("xss")</script>', expected: false, description: 'XSS attempt' },
      { input: 'DROP TABLE market_breadth;--', expected: false, description: 'SQL injection attempt' },
      { input: '${process.exit(1)}', expected: false, description: 'Code injection attempt' },
      { input: '../../../etc/passwd', expected: false, description: 'Path traversal attempt' },
      { input: '-1', expected: false, description: 'Negative value' },
      { input: 'NaN', expected: false, description: 'NaN value' },
      { input: 'Infinity', expected: false, description: 'Infinity value' },
      { input: '0', expected: false, description: 'Zero portfolio size' },
      { input: '999999999999999999999', expected: false, description: 'Integer overflow' },
      { input: '1e308', expected: false, description: 'Float overflow' },
      { input: 'eval("malicious code")', expected: false, description: 'Eval injection' }
    ]

    const results = []
    for (const testCase of testCases) {
      try {
        const isValid = this.validatePortfolioSize(testCase.input)
        const passed = isValid === testCase.expected
        results.push({
          input: testCase.input,
          description: testCase.description,
          expected: testCase.expected,
          actual: isValid,
          passed,
          severity: testCase.expected ? 'LOW' : 'HIGH'
        })
      } catch (error) {
        results.push({
          input: testCase.input,
          description: testCase.description,
          expected: testCase.expected,
          actual: false,
          passed: !testCase.expected,
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'HIGH'
        })
      }
    }

    return results
  }

  /**
   * Test VIX value input validation
   * Critical: VIX affects risk calculations
   */
  async testVIXValidation() {
    const testCases = [
      // Valid cases
      { input: '18.5', expected: true, description: 'Normal VIX level' },
      { input: '12.0', expected: true, description: 'Low VIX level' },
      { input: '35.2', expected: true, description: 'High VIX level' },
      { input: '0', expected: true, description: 'Minimum VIX (theoretical)' },
      
      // Invalid cases
      { input: '<img src=x onerror=alert(1)>', expected: false, description: 'XSS via img tag' },
      { input: "'; DELETE FROM trades; --", expected: false, description: 'SQL injection' },
      { input: '${Math.random()}', expected: false, description: 'Template literal injection' },
      { input: '-5.5', expected: false, description: 'Negative VIX' },
      { input: '150.0', expected: false, description: 'Unrealistic VIX value' },
      { input: 'abc', expected: false, description: 'Non-numeric input' },
      { input: '10.5.5', expected: false, description: 'Invalid decimal format' }
    ]

    const results = []
    for (const testCase of testCases) {
      try {
        const isValid = this.validateVIX(testCase.input)
        const passed = isValid === testCase.expected
        results.push({
          input: testCase.input,
          description: testCase.description,
          expected: testCase.expected,
          actual: isValid,
          passed,
          severity: testCase.expected ? 'LOW' : 'HIGH'
        })
      } catch (error) {
        results.push({
          input: testCase.input,
          description: testCase.description,
          expected: testCase.expected,
          actual: false,
          passed: !testCase.expected,
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'HIGH'
        })
      }
    }

    return results
  }

  /**
   * Test T2108 percentage validation
   * Critical: T2108 is a key market breadth indicator
   */
  async testT2108Validation() {
    const testCases = [
      // Valid cases
      { input: '65.5', expected: true, description: 'Valid T2108 percentage' },
      { input: '0', expected: true, description: 'Minimum T2108' },
      { input: '100', expected: true, description: 'Maximum T2108' },
      { input: '50.0', expected: true, description: 'Neutral T2108' },
      
      // Invalid cases
      { input: '<script src="evil.js"></script>', expected: false, description: 'Script tag injection' },
      { input: 'UNION SELECT * FROM trades', expected: false, description: 'SQL UNION attack' },
      { input: '${global.process.exit()}', expected: false, description: 'Process manipulation' },
      { input: '-10', expected: false, description: 'Negative percentage' },
      { input: '101', expected: false, description: 'Over 100%' },
      { input: '999', expected: false, description: 'Extreme value' },
      { input: 'true', expected: false, description: 'Boolean as string' }
    ]

    const results = []
    for (const testCase of testCases) {
      try {
        const isValid = this.validateT2108(testCase.input)
        const passed = isValid === testCase.expected
        results.push({
          input: testCase.input,
          description: testCase.description,
          expected: testCase.expected,
          actual: isValid,
          passed,
          severity: testCase.expected ? 'LOW' : 'HIGH'
        })
      } catch (error) {
        results.push({
          input: testCase.input,
          description: testCase.description,
          expected: testCase.expected,
          actual: false,
          passed: !testCase.expected,
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'HIGH'
        })
      }
    }

    return results
  }

  /**
   * Test symbol name validation
   * Critical: Symbol names are used in database queries
   */
  async testSymbolValidation() {
    const testCases = [
      // Valid cases
      { input: 'AAPL', expected: true, description: 'Valid stock symbol' },
      { input: 'SPY', expected: true, description: 'Valid ETF symbol' },
      { input: 'QQQ', expected: true, description: 'Valid index symbol' },
      { input: 'BRK.B', expected: true, description: 'Valid symbol with dot' },
      
      // Invalid cases
      { input: '<svg onload=alert(1)>', expected: false, description: 'SVG XSS attack' },
      { input: "'; DROP DATABASE trading; --", expected: false, description: 'Database destruction attempt' },
      { input: '../../../windows/system32/calc.exe', expected: false, description: 'Path traversal' },
      { input: 'SYMBOL_TOO_LONG_FOR_MARKET', expected: false, description: 'Overly long symbol' },
      { input: '', expected: false, description: 'Empty symbol' },
      { input: '   ', expected: false, description: 'Whitespace only' },
      { input: 'SYM BOL', expected: false, description: 'Symbol with space' },
      { input: 'NULL', expected: false, description: 'SQL NULL keyword' }
    ]

    const results = []
    for (const testCase of testCases) {
      try {
        const isValid = this.validateSymbol(testCase.input)
        const passed = isValid === testCase.expected
        results.push({
          input: testCase.input,
          description: testCase.description,
          expected: testCase.expected,
          actual: isValid,
          passed,
          severity: testCase.expected ? 'LOW' : 'HIGH'
        })
      } catch (error) {
        results.push({
          input: testCase.input,
          description: testCase.description,
          expected: testCase.expected,
          actual: false,
          passed: !testCase.expected,
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'HIGH'
        })
      }
    }

    return results
  }

  /**
   * Test CSV injection attacks
   * Critical: CSV data can execute formulas in Excel/Sheets
   */
  async testCSVInjectionPrevention() {
    const testCases = [
      // Valid cases
      { input: '2024-01-15,180,120,65.5,4847', expected: true, description: 'Valid CSV data' },
      
      // CSV Injection attacks
      { input: '=SUM(1+1),180,120,65.5', expected: false, description: 'Excel formula injection' },
      { input: '@SUM(A1:A10),180,120', expected: false, description: 'Lotus formula injection' },
      { input: '+SUM(1+1),180,120', expected: false, description: 'Plus formula injection' },
      { input: '-SUM(1+1),180,120', expected: false, description: 'Minus formula injection' },
      { input: '=HYPERLINK("http://evil.com","Click me")', expected: false, description: 'Hyperlink injection' },
      { input: '=IMPORTXML("http://evil.com/xml","//title")', expected: false, description: 'XML import injection' },
      { input: '"=cmd|\'ping evil.com\'!A1"', expected: false, description: 'Command execution via DDE' }
    ]

    const results = []
    for (const testCase of testCases) {
      try {
        const isValid = this.validateCSVData(testCase.input)
        const passed = isValid === testCase.expected
        results.push({
          input: testCase.input,
          description: testCase.description,
          expected: testCase.expected,
          actual: isValid,
          passed,
          severity: testCase.expected ? 'LOW' : 'CRITICAL'
        })
      } catch (error) {
        results.push({
          input: testCase.input,
          description: testCase.description,
          expected: testCase.expected,
          actual: false,
          passed: !testCase.expected,
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'CRITICAL'
        })
      }
    }

    return results
  }

  /**
   * Test position size calculation overflow attacks
   * Critical: Arithmetic overflow can cause incorrect position sizing
   */
  async testArithmeticOverflowPrevention() {
    const testCases = [
      // Valid cases
      { portfolioSize: 100000, percentage: 2.5, expected: true, description: 'Normal position size' },
      
      // Overflow attacks
      { portfolioSize: Number.MAX_VALUE, percentage: 100, expected: false, description: 'Portfolio size overflow' },
      { portfolioSize: 100000, percentage: Number.MAX_VALUE, expected: false, description: 'Percentage overflow' },
      { portfolioSize: 1e308, percentage: 1e308, expected: false, description: 'Double overflow' },
      { portfolioSize: -1e308, percentage: -1e308, expected: false, description: 'Negative overflow' },
      { portfolioSize: 100000, percentage: -100, expected: false, description: 'Negative percentage' }
    ]

    const results = []
    for (const testCase of testCases) {
      try {
        const isValid = this.validatePositionCalculation(testCase.portfolioSize, testCase.percentage)
        const passed = isValid === testCase.expected
        results.push({
          input: `${testCase.portfolioSize}, ${testCase.percentage}`,
          description: testCase.description,
          expected: testCase.expected,
          actual: isValid,
          passed,
          severity: testCase.expected ? 'LOW' : 'HIGH'
        })
      } catch (error) {
        results.push({
          input: `${testCase.portfolioSize}, ${testCase.percentage}`,
          description: testCase.description,
          expected: testCase.expected,
          actual: false,
          passed: !testCase.expected,
          error: error instanceof Error ? error.message : 'Unknown error',
          severity: 'HIGH'
        })
      }
    }

    return results
  }

  // Validation methods (implement secure validation logic)
  private validatePortfolioSize(input: string): boolean {
    // Remove any HTML tags
    const cleaned = input.replace(/<[^>]*>/g, '')
    
    // Check for SQL injection patterns
    const sqlPatterns = [/drop\s+table/i, /delete\s+from/i, /insert\s+into/i, /union\s+select/i, /--/, /;/]
    if (sqlPatterns.some(pattern => pattern.test(cleaned))) return false
    
    // Check for code injection patterns
    const codePatterns = [/\$\{/, /eval\s*\(/, /process\./, /global\./, /require\s*\(/]
    if (codePatterns.some(pattern => pattern.test(cleaned))) return false
    
    // Validate as positive number
    const num = parseFloat(cleaned)
    return !isNaN(num) && num > 0 && num < 1e10 && isFinite(num)
  }

  private validateVIX(input: string): boolean {
    const cleaned = input.replace(/<[^>]*>/g, '')
    
    // Security checks
    if (cleaned.includes('<') || cleaned.includes('>') || cleaned.includes('script')) return false
    if (/['"`;]/.test(cleaned)) return false
    if (/\$\{/.test(cleaned)) return false
    
    const num = parseFloat(cleaned)
    return !isNaN(num) && num >= 0 && num <= 100 && isFinite(num)
  }

  private validateT2108(input: string): boolean {
    const cleaned = input.replace(/<[^>]*>/g, '')
    
    // XSS and injection prevention
    if (/<script|javascript:|on\w+\s*=/i.test(input)) return false
    if (/union\s+select|drop\s+table|delete\s+from/i.test(cleaned)) return false
    if (/\$\{.*\}/.test(cleaned)) return false
    
    const num = parseFloat(cleaned)
    return !isNaN(num) && num >= 0 && num <= 100 && isFinite(num)
  }

  private validateSymbol(input: string): boolean {
    if (!input || input.trim().length === 0) return false
    if (input.length > 10) return false
    
    // Remove HTML tags and check for XSS
    const cleaned = input.replace(/<[^>]*>/g, '').trim()
    if (cleaned !== input.trim()) return false
    
    // Check for path traversal
    if (cleaned.includes('../') || cleaned.includes('..\\')) return false
    
    // Valid symbol pattern (letters, numbers, dots, hyphens only)
    return /^[A-Za-z0-9.-]+$/.test(cleaned)
  }

  private validateCSVData(input: string): boolean {
    // Check for CSV injection patterns
    const csvInjectionPatterns = [
      /^[=@+-]/, // Formula indicators
      /HYPERLINK\s*\(/i,
      /IMPORTXML\s*\(/i,
      /cmd\s*\|/i,
      /DDE\s*\(/i
    ]
    
    return !csvInjectionPatterns.some(pattern => pattern.test(input))
  }

  private validatePositionCalculation(portfolioSize: number, percentage: number): boolean {
    // Check for overflow conditions
    if (!isFinite(portfolioSize) || !isFinite(percentage)) return false
    if (portfolioSize <= 0 || percentage < 0 || percentage > 100) return false
    
    // Check for potential overflow in multiplication
    const maxSafeValue = Number.MAX_SAFE_INTEGER / 100
    return portfolioSize < maxSafeValue && percentage < 100
  }
}

/**
 * Run all input validation security tests
 */
export async function runInputValidationSecurityTests(): Promise<{
  totalTests: number
  passedTests: number
  failedTests: number
  criticalFailures: number
  results: any[]
}> {
  const mockAPI: MockTradingAPI = {
    saveBreadthData: async () => ({ success: true }),
    saveTrade: async () => ({ success: true }),
    importCSVBreadth: async () => ({ success: true })
  }

  const tester = new InputValidationTests(mockAPI)
  const allResults = []

  // Run all test suites
  const portfolioTests = await tester.testPortfolioSizeValidation()
  const vixTests = await tester.testVIXValidation()
  const t2108Tests = await tester.testT2108Validation()
  const symbolTests = await tester.testSymbolValidation()
  const csvTests = await tester.testCSVInjectionPrevention()
  const overflowTests = await tester.testArithmeticOverflowPrevention()

  allResults.push(...portfolioTests, ...vixTests, ...t2108Tests, ...symbolTests, ...csvTests, ...overflowTests)

  const totalTests = allResults.length
  const passedTests = allResults.filter(r => r.passed).length
  const failedTests = totalTests - passedTests
  const criticalFailures = allResults.filter(r => !r.passed && (r.severity === 'CRITICAL' || r.severity === 'HIGH')).length

  return {
    totalTests,
    passedTests,
    failedTests,
    criticalFailures,
    results: allResults
  }
}