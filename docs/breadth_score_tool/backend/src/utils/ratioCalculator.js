/**
 * Shared utilities for calculating market data ratios
 */

/**
 * Calculate 5-day and 10-day ratios for market data
 * @param {Object} data - Current day market data
 * @param {Object} db - Database connection
 * @returns {Object} Object containing ratio_5day and ratio_10day if calculable
 */
export function calculateRatios(data, db) {
  const calculations = {};
  
  try {
    // Get previous 4 days of data for 5-day ratio
    const prev4Days = db.prepare(`
      SELECT stocks_up_4pct, stocks_down_4pct 
      FROM market_data 
      WHERE date < ? 
      ORDER BY date DESC 
      LIMIT 4
    `).all(data.date);
    
    // Get previous 9 days of data for 10-day ratio  
    const prev9Days = db.prepare(`
      SELECT stocks_up_4pct, stocks_down_4pct 
      FROM market_data 
      WHERE date < ? 
      ORDER BY date DESC 
      LIMIT 9
    `).all(data.date);
    
    // Calculate 5-day ratio
    if (prev4Days.length === 4 && data.stocks_up_4pct !== null && data.stocks_down_4pct !== null) {
      const totalUp = [data.stocks_up_4pct, ...prev4Days.map(d => d.stocks_up_4pct || 0)].reduce((a, b) => a + b, 0);
      const totalDown = [data.stocks_down_4pct, ...prev4Days.map(d => d.stocks_down_4pct || 0)].reduce((a, b) => a + b, 0);
      
      if (totalDown > 0) {
        calculations.ratio_5day = totalUp / totalDown;
      }
    }
    
    // Calculate 10-day ratio
    if (prev9Days.length === 9 && data.stocks_up_4pct !== null && data.stocks_down_4pct !== null) {
      const totalUp = [data.stocks_up_4pct, ...prev9Days.map(d => d.stocks_up_4pct || 0)].reduce((a, b) => a + b, 0);
      const totalDown = [data.stocks_down_4pct, ...prev9Days.map(d => d.stocks_down_4pct || 0)].reduce((a, b) => a + b, 0);
      
      if (totalDown > 0) {
        calculations.ratio_10day = totalUp / totalDown;
      }
    }
  } catch (error) {
    console.error('Error calculating ratios:', error);
  }
  
  return calculations;
}

/**
 * Validate numeric field values
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {Object} options - Validation options { min, max, required }
 * @returns {string|null} Error message or null if valid
 */
export function validateNumericField(value, fieldName, options = {}) {
  const { min = 0, max = Infinity, required = false } = options;
  
  // Handle empty/null values
  if (value === null || value === undefined || value === '') {
    return required ? `${fieldName} is required` : null;
  }
  
  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return `${fieldName} must be a valid number`;
  }
  
  if (numValue < min) {
    return `${fieldName} must be >= ${min}`;
  }
  
  if (numValue > max) {
    return `${fieldName} must be <= ${max}`;
  }
  
  return null;
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateDateFormat(dateString) {
  if (!dateString) {
    return 'Date is required';
  }
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return 'Date must be in YYYY-MM-DD format';
  }
  
  // Validate if it's a real date
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Date must be a valid date';
  }
  
  return null;
}