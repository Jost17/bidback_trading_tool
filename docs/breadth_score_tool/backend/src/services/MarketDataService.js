/**
 * Market Data Service Layer
 * Centralized business logic for market data operations
 */

import { getDatabase } from '../database/init.js';
import { calculateRatios } from '../utils/ratioCalculator.js';
import { QueryBuilder, ResponseFormatter, DatabaseUtil } from '../utils/queryBuilder.js';
import { 
  MARKET_DATA_FIELDS, 
  ALL_FIELD_NAMES,
  NUMERIC_FIELDS,
  DEFAULT_VALUES,
  API_CONFIG,
  VALIDATION_RULES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from '../config/constants.js';

/**
 * MarketDataService class handles all market data business logic
 */
export class MarketDataService {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Validate market data input
   * @param {Object} data - Market data to validate
   * @returns {Object} - Validation result with errors array
   */
  validateMarketData(data) {
    const errors = [];
    
    // Validate required date field
    if (!data.date) {
      errors.push(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD('Date'));
    } else if (!this._isValidDate(data.date)) {
      errors.push(ERROR_MESSAGES.VALIDATION.INVALID_DATE);
    }
    
    // Validate numeric fields
    NUMERIC_FIELDS.forEach(field => {
      const value = data[field];
      if (value !== null && value !== undefined && value !== '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          errors.push(ERROR_MESSAGES.VALIDATION.INVALID_NUMBER(field));
        }
        
        // Special validation for T2108
        if (field === MARKET_DATA_FIELDS.REFERENCE.T2108) {
          if (numValue < VALIDATION_RULES.T2108.MIN || numValue > VALIDATION_RULES.T2108.MAX) {
            errors.push(ERROR_MESSAGES.VALIDATION.OUT_OF_RANGE(
              field, 
              VALIDATION_RULES.T2108.MIN, 
              VALIDATION_RULES.T2108.MAX
            ));
          }
        }
        
        // General numeric validation
        if (numValue > VALIDATION_RULES.NUMERIC_FIELD.MAX) {
          errors.push(ERROR_MESSAGES.VALIDATION.OUT_OF_RANGE(
            field, 
            VALIDATION_RULES.NUMERIC_FIELD.MIN, 
            VALIDATION_RULES.NUMERIC_FIELD.MAX
          ));
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create new market data entry
   * @param {Object} marketData - Market data to insert
   * @returns {Object} - Service result with created data
   */
  async createMarketData(marketData) {
    try {
      // Validate input
      const validation = this.validateMarketData(marketData);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Validation failed',
          details: validation.errors
        };
      }
      
      // Check for duplicate date
      const existingEntry = this.db.prepare(
        'SELECT id FROM market_data WHERE date = ?'
      ).get(marketData.date);
      
      if (existingEntry) {
        return {
          success: false,
          error: ERROR_MESSAGES.VALIDATION.DUPLICATE_DATE,
          details: { existingId: existingEntry.id }
        };
      }
      
      // Calculate ratios
      const calculations = calculateRatios(marketData, this.db);
      
      // Prepare data for insertion
      const dataToInsert = this._prepareDataForInsertion(marketData, calculations);
      
      // Build dynamic SQL based on provided fields
      const { sql, params } = this._buildInsertQuery(dataToInsert);
      
      // Execute insertion
      const result = this.db.prepare(sql).run(params);
      
      // Fetch and return the created record
      const newRecord = this.db.prepare(
        'SELECT * FROM market_data WHERE id = ?'
      ).get(result.lastInsertRowid);
      
      return {
        success: true,
        data: ResponseFormatter.formatMarketData([newRecord])[0],
        metadata: {
          calculations,
          insertId: result.lastInsertRowid
        }
      };
      
    } catch (error) {
      console.error('Create market data error:', error);
      return {
        success: false,
        error: ERROR_MESSAGES.DATABASE.QUERY_FAILED,
        details: error.message
      };
    }
  }

  /**
   * Update existing market data entry
   * @param {number} id - Record ID to update
   * @param {Object} marketData - Updated market data
   * @returns {Object} - Service result with updated data
   */
  async updateMarketData(id, marketData) {
    try {
      // Check if record exists
      const existingRecord = this.db.prepare(
        'SELECT * FROM market_data WHERE id = ?'
      ).get(id);
      
      if (!existingRecord) {
        return {
          success: false,
          error: 'Market data not found'
        };
      }
      
      // Validate input
      const validation = this.validateMarketData(marketData);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Validation failed',
          details: validation.errors
        };
      }
      
      // Recalculate ratios
      const calculations = calculateRatios(marketData, this.db);
      
      // Build dynamic update query
      const { sql, params } = this._buildUpdateQuery(id, marketData, calculations);
      
      // Execute update
      this.db.prepare(sql).run(params);
      
      // Fetch and return updated record
      const updatedRecord = this.db.prepare(
        'SELECT * FROM market_data WHERE id = ?'
      ).get(id);
      
      return {
        success: true,
        data: ResponseFormatter.formatMarketData([updatedRecord])[0],
        metadata: { calculations }
      };
      
    } catch (error) {
      console.error('Update market data error:', error);
      return {
        success: false,
        error: ERROR_MESSAGES.DATABASE.QUERY_FAILED,
        details: error.message
      };
    }
  }

  /**
   * Get market data with filtering and pagination
   * @param {Object} query - Query parameters
   * @returns {Object} - Service result with data and pagination
   */
  async getMarketData(query = {}) {
    try {
      const {
        startDate,
        endDate,
        limit = API_CONFIG.DEFAULT_LIMIT,
        offset = API_CONFIG.DEFAULT_OFFSET,
        sortBy = 'date',
        sortOrder = 'DESC',
        includeNullBreadthScore = false
      } = query;
      
      // Validate parameters
      if (startDate && !this._isValidDate(startDate)) {
        return {
          success: false,
          error: 'Invalid start date format'
        };
      }
      
      if (endDate && !this._isValidDate(endDate)) {
        return {
          success: false,
          error: 'Invalid end date format'
        };
      }
      
      const validatedLimit = Math.min(
        Math.max(1, parseInt(limit) || API_CONFIG.DEFAULT_LIMIT),
        API_CONFIG.MAX_LIMIT
      );
      const validatedOffset = Math.max(0, parseInt(offset) || 0);
      
      // Build query
      const filters = {
        startDate,
        endDate,
        limit: validatedLimit,
        sortBy,
        sortOrder,
        includeNullBreadthScore
      };
      
      const { sql, params } = QueryBuilder.buildMarketDataQuery(filters);
      
      // Add offset
      const finalSql = sql + ' OFFSET ?';
      const finalParams = [...params, validatedOffset];
      
      // Execute query
      const rows = DatabaseUtil.executeQuery(
        this.db, 
        finalSql, 
        finalParams, 
        'fetch market data'
      );
      
      // Get total count
      const countSql = includeNullBreadthScore 
        ? 'SELECT COUNT(*) as total FROM market_data' 
        : 'SELECT COUNT(*) as total FROM market_data WHERE breadth_score IS NOT NULL';
      const countResult = DatabaseUtil.executeQuerySingle(
        this.db, 
        countSql, 
        [], 
        'count market data'
      );
      
      // Format response
      const formattedData = ResponseFormatter.formatMarketData(rows);
      
      return {
        success: true,
        data: formattedData,
        metadata: {
          pagination: {
            total: countResult.total,
            limit: validatedLimit,
            offset: validatedOffset,
            hasMore: (validatedOffset + validatedLimit) < countResult.total
          }
        }
      };
      
    } catch (error) {
      console.error('Get market data error:', error);
      return {
        success: false,
        error: ERROR_MESSAGES.DATABASE.QUERY_FAILED,
        details: error.message
      };
    }
  }

  /**
   * Get market data by ID
   * @param {number} id - Record ID
   * @returns {Object} - Service result with single record
   */
  async getMarketDataById(id) {
    try {
      const sql = 'SELECT * FROM market_data WHERE id = ?';
      const row = DatabaseUtil.executeQuerySingle(
        this.db, 
        sql, 
        [parseInt(id)], 
        'fetch market data by ID'
      );
      
      if (!row) {
        return {
          success: false,
          error: 'Market data not found'
        };
      }
      
      const formattedData = ResponseFormatter.formatMarketData([row])[0];
      
      return {
        success: true,
        data: formattedData
      };
      
    } catch (error) {
      console.error('Get market data by ID error:', error);
      return {
        success: false,
        error: ERROR_MESSAGES.DATABASE.QUERY_FAILED,
        details: error.message
      };
    }
  }

  /**
   * Delete market data entry
   * @param {number} id - Record ID to delete
   * @returns {Object} - Service result
   */
  async deleteMarketData(id) {
    try {
      const result = this.db.prepare(
        'DELETE FROM market_data WHERE id = ?'
      ).run(id);
      
      if (result.changes === 0) {
        return {
          success: false,
          error: 'Market data not found'
        };
      }
      
      return {
        success: true,
        metadata: { deletedId: id }
      };
      
    } catch (error) {
      console.error('Delete market data error:', error);
      return {
        success: false,
        error: ERROR_MESSAGES.DATABASE.QUERY_FAILED,
        details: error.message
      };
    }
  }

  /**
   * Get summary statistics
   * @returns {Object} - Service result with statistics
   */
  async getSummaryStats() {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_records,
          MIN(date) as earliest_date,
          MAX(date) as latest_date,
          AVG(breadth_score) as avg_breadth_score,
          MIN(breadth_score) as min_breadth_score,
          MAX(breadth_score) as max_breadth_score,
          COUNT(CASE WHEN breadth_score IS NULL THEN 1 END) as missing_scores,
          COUNT(CASE WHEN source_file = ? THEN 1 END) as manual_entries,
          COUNT(CASE WHEN source_file LIKE ? THEN 1 END) as screenshot_entries,
          COUNT(CASE WHEN import_format LIKE ? THEN 1 END) as csv_entries
        FROM market_data
      `;
      
      const params = [
        DEFAULT_VALUES.SOURCE_FILES.MANUAL_ENTRY,
        '%screenshot%',
        '%csv%'
      ];
      
      const stats = DatabaseUtil.executeQuerySingle(
        this.db, 
        sql, 
        params, 
        'fetch summary statistics'
      );
      
      return {
        success: true,
        data: stats
      };
      
    } catch (error) {
      console.error('Get summary stats error:', error);
      return {
        success: false,
        error: ERROR_MESSAGES.DATABASE.QUERY_FAILED,
        details: error.message
      };
    }
  }

  // Private helper methods
  
  /**
   * Validate date format
   * @private
   */
  _isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && 
           dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  }

  /**
   * Prepare data for insertion with defaults
   * @private
   */
  _prepareDataForInsertion(marketData, calculations) {
    return {
      date: marketData.date,
      // Primary fields
      stocks_up_4pct: marketData.stocks_up_4pct || null,
      stocks_down_4pct: marketData.stocks_down_4pct || null,
      ratio_5day: calculations.ratio_5day || null,
      ratio_10day: calculations.ratio_10day || null,
      stocks_up_25pct_quarter: marketData.stocks_up_25pct_quarter || null,
      stocks_down_25pct_quarter: marketData.stocks_down_25pct_quarter || null,
      // Secondary fields
      stocks_up_25pct_month: marketData.stocks_up_25pct_month || null,
      stocks_down_25pct_month: marketData.stocks_down_25pct_month || null,
      stocks_up_50pct_month: marketData.stocks_up_50pct_month || null,
      stocks_down_50pct_month: marketData.stocks_down_50pct_month || null,
      stocks_up_13pct_34days: marketData.stocks_up_13pct_34days || null,
      stocks_down_13pct_34days: marketData.stocks_down_13pct_34days || null,
      // Reference fields
      worden_universe: marketData.worden_universe || null,
      t2108: marketData.t2108 || null,
      sp500: marketData.sp500 || null,
      // Sector fields
      basic_materials_sector: marketData.basic_materials_sector || null,
      consumer_cyclical_sector: marketData.consumer_cyclical_sector || null,
      financial_services_sector: marketData.financial_services_sector || null,
      real_estate_sector: marketData.real_estate_sector || null,
      consumer_defensive_sector: marketData.consumer_defensive_sector || null,
      healthcare_sector: marketData.healthcare_sector || null,
      utilities_sector: marketData.utilities_sector || null,
      communication_services_sector: marketData.communication_services_sector || null,
      energy_sector: marketData.energy_sector || null,
      industrials_sector: marketData.industrials_sector || null,
      technology_sector: marketData.technology_sector || null,
      // Legacy fields
      stocks_up_20pct: marketData.stocks_up_20pct || null,
      stocks_down_20pct: marketData.stocks_down_20pct || null,
      stocks_up_20dollar: marketData.stocks_up_20dollar || null,
      stocks_down_20dollar: marketData.stocks_down_20dollar || null,
      // Metadata
      source_file: marketData.source_file || DEFAULT_VALUES.SOURCE_FILES.MANUAL_ENTRY,
      import_format: marketData.import_format || DEFAULT_VALUES.IMPORT_FORMATS.MANUAL_V2,
      data_quality_score: marketData.data_quality_score || DEFAULT_VALUES.DATA_QUALITY_SCORE.MANUAL_ENTRY
    };
  }

  /**
   * Build dynamic INSERT query
   * @private
   */
  _buildInsertQuery(data) {
    const fields = Object.keys(data).filter(key => data[key] !== undefined);
    const placeholders = fields.map(() => '?').join(', ');
    const params = fields.map(field => data[field]);
    
    const sql = `
      INSERT INTO market_data (${fields.join(', ')})
      VALUES (${placeholders})
    `;
    
    return { sql, params };
  }

  /**
   * Build dynamic UPDATE query
   * @private
   */
  _buildUpdateQuery(id, marketData, calculations) {
    const updateData = this._prepareDataForInsertion(marketData, calculations);
    const fields = Object.keys(updateData).filter(key => updateData[key] !== undefined);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const params = [...fields.map(field => updateData[field]), id];
    
    const sql = `
      UPDATE market_data SET
        ${setClause},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    return { sql, params };
  }
}

// Create and export singleton instance
const marketDataService = new MarketDataService();
export default marketDataService;