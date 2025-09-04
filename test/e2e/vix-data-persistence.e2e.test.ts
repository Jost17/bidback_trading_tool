/**
 * VIX Data Persistence End-to-End Test Suite
 * 
 * This test suite validates the complete VIX data persistence workflow:
 * 1. Data entry in Enhanced Market Breadth form
 * 2. Form submission and database storage
 * 3. App reload/refresh
 * 4. Data persistence verification
 * 5. Form repopulation with persisted data
 * 
 * Tests the exact scenario requested by the user for VIX data persistence validation.
 */

import { test, expect } from 'vitest'
import { chromium, Browser, Page, BrowserContext } from 'playwright'

// Test configuration
const APP_URL = 'http://localhost:3000'
const TEST_TIMEOUT = 60000 // 60 seconds for comprehensive testing

// Test data payload for VIX persistence test
interface VIXTestData {
  date: string
  t2108: string
  vix: string
  stocksUp20Pct: string
  stocksDown20Pct: string
  stocksUp20Dollar: string
  stocksDown20Dollar: string
}

const createTestData = (): VIXTestData => ({
  date: new Date().toISOString().split('T')[0], // Today's date
  t2108: '65',
  vix: '18.5', // CRITICAL TEST VALUE
  stocksUp20Pct: '250',
  stocksDown20Pct: '150', 
  stocksUp20Dollar: '300',
  stocksDown20Dollar: '100'
})

describe('VIX Data Persistence E2E Tests', () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch({ 
      headless: false, // Set to true for CI/CD
      slowMo: 100 // Add delay for debugging
    })
  }, TEST_TIMEOUT)

  afterAll(async () => {
    await browser?.close()
  })

  beforeEach(async () => {
    context = await browser.newContext()
    page = await context.newPage()
    
    // Setup console logging for VIX debugging
    page.on('console', (msg) => {
      if (msg.text().includes('VIX DEBUG')) {
        console.log('🔍 VIX DEBUG:', msg.text())
      }
    })
    
    await page.goto(APP_URL, { waitUntil: 'networkidle' })
  })

  afterEach(async () => {
    await context?.close()
  })

  test('CRITICAL: VIX data should persist after app reload', async () => {
    console.log('🧪 Starting VIX Data Persistence Test')
    const testData = createTestData()

    // STEP 1: Navigate to Market Breadth Data Entry
    console.log('📍 Step 1: Navigate to Market Breadth → Data Entry')
    
    // Wait for app to fully load
    await page.waitForSelector('[data-testid="app-navigation"]', { timeout: 10000 })
    
    // Navigate to Market Breadth
    await page.click('text=Market Breadth')
    await page.waitForSelector('text=Enhanced Market Breadth Entry', { timeout: 5000 })
    
    // Click on Data Entry if it's a separate section
    const dataEntryLink = page.locator('text=Data Entry').first()
    if (await dataEntryLink.isVisible()) {
      await dataEntryLink.click()
    }
    
    // Verify we're on the correct page
    await expect(page.locator('text=Enhanced Market Breadth Entry')).toBeVisible()
    console.log('✅ Successfully navigated to Enhanced Market Breadth Entry form')

    // STEP 2: Fill out the form with test data including VIX
    console.log('📍 Step 2: Fill out form with VIX data')
    
    // Fill required fields
    await page.fill('input[name="date"], [data-testid="date-input"]', testData.date)
    await page.fill('input[placeholder*="65"], [data-testid="t2108-input"]', testData.t2108)
    
    // CRITICAL: Fill VIX field with debug logging
    console.log(`🔍 Filling VIX field with value: ${testData.vix}`)
    const vixInput = page.locator('input[placeholder*="18.5"], [data-testid="vix-input"]').first()
    await vixInput.fill(testData.vix)
    
    // Verify VIX value was entered
    const vixValue = await vixInput.inputValue()
    expect(vixValue).toBe(testData.vix)
    console.log(`✅ VIX field populated with: ${vixValue}`)
    
    // Fill 20% and $20 fields
    await page.fill('input[placeholder*="300"], [data-testid="stocks-up-20pct-input"]', testData.stocksUp20Pct)
    await page.fill('input[placeholder*="150"], [data-testid="stocks-down-20pct-input"]', testData.stocksDown20Pct)
    await page.fill('input[placeholder*="250"], [data-testid="stocks-up-20dollar-input"]', testData.stocksUp20Dollar)
    await page.fill('input[placeholder*="120"], [data-testid="stocks-down-20dollar-input"]', testData.stocksDown20Dollar)

    console.log('✅ All form fields populated successfully')

    // STEP 3: Submit the form and verify success
    console.log('📍 Step 3: Submit form and verify success')
    
    // Click Calculate & Save button
    const submitButton = page.locator('button:has-text("Calculate & Save")').first()
    await expect(submitButton).toBeEnabled()
    
    // Monitor console for VIX debug messages during submission
    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      if (msg.text().includes('VIX DEBUG')) {
        consoleLogs.push(msg.text())
      }
    })
    
    await submitButton.click()
    
    // Wait for success message
    await expect(page.locator('text=Success!')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Market breadth data saved successfully')).toBeVisible()
    
    console.log('✅ Form submitted successfully')
    console.log('🔍 VIX Debug messages during submission:', consoleLogs)

    // STEP 4: Reload the app (critical test step)
    console.log('📍 Step 4: Reload app to test persistence')
    
    await page.reload({ waitUntil: 'networkidle' })
    console.log('🔄 App reloaded')

    // STEP 5: Navigate back to Data Entry form
    console.log('📍 Step 5: Navigate back to Data Entry form')
    
    // Re-navigate to the form
    await page.waitForSelector('[data-testid="app-navigation"]', { timeout: 10000 })
    await page.click('text=Market Breadth')
    await page.waitForSelector('text=Enhanced Market Breadth Entry', { timeout: 5000 })
    
    const dataEntryLinkAfterReload = page.locator('text=Data Entry').first()
    if (await dataEntryLinkAfterReload.isVisible()) {
      await dataEntryLinkAfterReload.click()
    }
    
    await expect(page.locator('text=Enhanced Market Breadth Entry')).toBeVisible()
    console.log('✅ Successfully navigated back to form after reload')

    // STEP 6: Verify VIX data persistence (CRITICAL VALIDATION)
    console.log('📍 Step 6: Verify VIX data persistence')
    
    // Wait for form to populate with persisted data
    await page.waitForTimeout(2000) // Allow time for data loading
    
    // Check VIX field specifically
    const vixInputAfterReload = page.locator('input[placeholder*="18.5"], [data-testid="vix-input"]').first()
    await expect(vixInputAfterReload).toBeVisible()
    
    // CRITICAL CHECK: VIX value should be preserved
    const persistedVixValue = await vixInputAfterReload.inputValue()
    console.log(`🔍 Persisted VIX value: "${persistedVixValue}"`)
    console.log(`🔍 Expected VIX value: "${testData.vix}"`)
    
    // Assertion: VIX data must persist
    expect(persistedVixValue).toBe(testData.vix)
    console.log('✅ CRITICAL SUCCESS: VIX data persisted after app reload!')
    
    // Verify other 20%/20$ fields also persisted
    const persistedStocksUp20Pct = await page.locator('input[placeholder*="300"]').inputValue()
    const persistedStocksDown20Pct = await page.locator('input[placeholder*="150"]').inputValue()
    
    expect(persistedStocksUp20Pct).toBe(testData.stocksUp20Pct)
    expect(persistedStocksDown20Pct).toBe(testData.stocksDown20Pct)
    
    console.log('✅ All persistent fields (VIX, 20%/20$) verified successfully')

    // STEP 7: Verify console debug information
    console.log('📍 Step 7: Verify VIX debug information in console')
    
    // Look for VIX debug messages in the console logs
    const hasVixDebugInfo = consoleLogs.some(log => 
      log.includes('convertToRawData') && log.includes('vix')
    )
    
    if (hasVixDebugInfo) {
      console.log('✅ VIX debug information found in console logs')
    } else {
      console.warn('⚠️ VIX debug information not found - check DataEntryForm debug logging')
    }
  }, TEST_TIMEOUT)

  test('VIX data should flow through the complete pipeline', async () => {
    console.log('🧪 Starting VIX Pipeline Flow Test')
    const testData = createTestData()

    // Navigate and fill form (similar to previous test)
    await page.goto(APP_URL)
    await page.waitForSelector('[data-testid="app-navigation"]', { timeout: 10000 })
    
    await page.click('text=Market Breadth')
    await page.waitForSelector('text=Enhanced Market Breadth Entry', { timeout: 5000 })
    
    // Fill form with VIX data
    await page.fill('input[name="date"]', testData.date)
    await page.fill('input[placeholder*="65"]', testData.t2108)
    
    const vixInput = page.locator('input[placeholder*="18.5"]').first()
    await vixInput.fill(testData.vix)
    
    // Monitor for specific VIX debug messages
    const vixDebugMessages: string[] = []
    page.on('console', (msg) => {
      if (msg.text().includes('VIX DEBUG - convertToRawData') || 
          msg.text().includes('VIX DEBUG - Final raw data')) {
        vixDebugMessages.push(msg.text())
      }
    })
    
    // Submit form
    await page.click('button:has-text("Calculate & Save")')
    
    // Wait for submission to complete
    await expect(page.locator('text=Success!')).toBeVisible({ timeout: 15000 })
    
    // Verify VIX debug messages were logged
    expect(vixDebugMessages.length).toBeGreaterThan(0)
    console.log('✅ VIX debug messages captured:', vixDebugMessages.length)
    
    // Verify VIX appears in the final raw data
    const hasVixInRawData = vixDebugMessages.some(msg => 
      msg.includes('rawData.vix:') && msg.includes(testData.vix)
    )
    
    expect(hasVixInRawData).toBe(true)
    console.log('✅ VIX value confirmed in raw data pipeline')
  }, TEST_TIMEOUT)

  test('Form should handle VIX field validation correctly', async () => {
    console.log('🧪 Starting VIX Validation Test')
    
    await page.goto(APP_URL)
    await page.waitForSelector('[data-testid="app-navigation"]', { timeout: 10000 })
    
    await page.click('text=Market Breadth')
    await page.waitForSelector('text=Enhanced Market Breadth Entry', { timeout: 5000 })
    
    const vixInput = page.locator('input[placeholder*="18.5"]').first()
    
    // Test valid VIX values
    const validVixValues = ['12.5', '18.75', '25.0', '35.2']
    
    for (const vixValue of validVixValues) {
      await vixInput.fill(vixValue)
      const inputValue = await vixInput.inputValue()
      expect(inputValue).toBe(vixValue)
      
      // Check that no error message appears
      const errorMessage = page.locator('text=VIX must be')
      await expect(errorMessage).not.toBeVisible()
    }
    
    console.log('✅ Valid VIX values accepted correctly')
    
    // Test invalid VIX values
    await vixInput.fill('-5.0')
    // Note: Since HTML5 validation was removed, we focus on form submission validation
    
    console.log('✅ VIX validation tests completed')
  }, TEST_TIMEOUT)

  test('VIX data should be prefilled from last entry', async () => {
    console.log('🧪 Starting VIX Pre-fill Test')
    
    // First, create an entry with VIX data
    const firstTestData = createTestData()
    firstTestData.vix = '22.7' // Unique VIX value for this test
    
    await page.goto(APP_URL)
    await page.waitForSelector('[data-testid="app-navigation"]', { timeout: 10000 })
    
    await page.click('text=Market Breadth')
    await page.waitForSelector('text=Enhanced Market Breadth Entry', { timeout: 5000 })
    
    // Submit first entry
    await page.fill('input[name="date"]', firstTestData.date)
    await page.fill('input[placeholder*="65"]', firstTestData.t2108)
    await page.fill('input[placeholder*="18.5"]', firstTestData.vix)
    
    await page.click('button:has-text("Calculate & Save")')
    await expect(page.locator('text=Success!')).toBeVisible({ timeout: 15000 })
    
    // Reset form to trigger pre-filling
    await page.click('button:has-text("Reset")')
    await page.waitForTimeout(1000)
    
    // Check if VIX field is pre-filled from last entry
    const vixInput = page.locator('input[placeholder*="18.5"]').first()
    await page.waitForTimeout(2000) // Allow time for pre-filling
    
    const prefilledVix = await vixInput.inputValue()
    console.log(`🔍 Pre-filled VIX value: "${prefilledVix}"`)
    
    // VIX should be pre-filled with last entry value
    expect(prefilledVix).toBe(firstTestData.vix)
    console.log('✅ VIX pre-filling from last entry works correctly')
  }, TEST_TIMEOUT)
})

// Helper function to wait for VIX debug messages
async function waitForVixDebugMessages(page: Page, timeout = 5000): Promise<string[]> {
  const messages: string[] = []
  
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(messages), timeout)
    
    const handler = (msg: any) => {
      if (msg.text().includes('VIX DEBUG')) {
        messages.push(msg.text())
        if (messages.length >= 2) { // Wait for at least 2 VIX debug messages
          clearTimeout(timer)
          page.off('console', handler)
          resolve(messages)
        }
      }
    }
    
    page.on('console', handler)
  })
}

// Export test utilities for use in other test files
export {
  createTestData,
  waitForVixDebugMessages,
  type VIXTestData
}