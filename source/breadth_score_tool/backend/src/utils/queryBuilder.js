/**
 * Database query utilities for consistent query building and response formatting
 */

export class QueryBuilder {
  /**
   * Build market data query with optional filters
   * @param {Object} filters - Query filters
   * @param {string} filters.startDate - Start date filter (YYYY-MM-DD)
   * @param {string} filters.endDate - End date filter (YYYY-MM-DD)
   * @param {number} filters.limit - Result limit
   * @param {string} filters.sortBy - Sort column
   * @param {string} filters.sortOrder - Sort order (ASC/DESC)
   * @returns {Object} Query object with sql and params
   */
  static buildMarketDataQuery(filters = {}) {
    const {
      startDate,
      endDate,
      limit = 1000,
      sortBy = 'date',
      sortOrder = 'DESC',
      includeNullBreadthScore = false
    } = filters;

    let sql = `
      SELECT 
        id,
        date,
        breadth_score as breadthScore,
        stocks_up_4pct,
        stocks_down_4pct,
        stocks_up_25pct_quarter,
        stocks_down_25pct_quarter,
        stocks_up_25pct_month,
        stocks_down_25pct_month,
        stocks_up_50pct_month,
        stocks_down_50pct_month,
        stocks_up_13pct_34days,
        stocks_down_13pct_34days,
        worden_universe,
        sp500,
        t2108,
        stocks_up_20pct,
        stocks_down_20pct,
        stocks_up_20dollar,
        stocks_down_20dollar,
        ratio_5day,
        ratio_10day,
        created_at,
        updated_at
      FROM market_data
    `;

    const params = [];
    const conditions = [];

    // Add breadth score filter
    if (!includeNullBreadthScore) {
      conditions.push('breadth_score IS NOT NULL');
    }

    // Add date filters
    if (startDate) {
      conditions.push('date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('date <= ?');
      params.push(endDate);
    }

    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ORDER BY
    const validSortColumns = ['date', 'breadth_score', 'created_at'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'date';
    const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    sql += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;

    // Add LIMIT
    if (limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    return { sql, params };
  }

  /**
   * Build breadth score summary queries
   * @param {Object} filters - Query filters
   * @returns {Object} Query objects for different summary types
   */
  static buildSummaryQueries(filters = {}) {
    const { timeframe = 'yearly' } = filters;

    const queries = {
      yearly: {
        sql: `
          SELECT 
            strftime('%Y', date) as period,
            COUNT(*) as totalRecords,
            AVG(breadth_score) as avgBreadthScore,
            MIN(breadth_score) as minBreadthScore,
            MAX(breadth_score) as maxBreadthScore,
            MIN(date) as startDate,
            MAX(date) as endDate
          FROM market_data 
          WHERE breadth_score IS NOT NULL
          GROUP BY strftime('%Y', date)
          ORDER BY period DESC
        `,
        params: []
      },
      monthly: {
        sql: `
          SELECT 
            strftime('%Y-%m', date) as period,
            COUNT(*) as totalRecords,
            AVG(breadth_score) as avgBreadthScore,
            MIN(breadth_score) as minBreadthScore,
            MAX(breadth_score) as maxBreadthScore,
            MIN(date) as startDate,
            MAX(date) as endDate
          FROM market_data 
          WHERE breadth_score IS NOT NULL
          GROUP BY strftime('%Y-%m', date)
          ORDER BY period DESC
        `,
        params: []
      },
      weekly: {
        sql: `
          SELECT 
            strftime('%Y-W%W', date) as period,
            COUNT(*) as totalRecords,
            AVG(breadth_score) as avgBreadthScore,
            MIN(breadth_score) as minBreadthScore,
            MAX(breadth_score) as maxBreadthScore,
            MIN(date) as startDate,
            MAX(date) as endDate
          FROM market_data 
          WHERE breadth_score IS NOT NULL
          GROUP BY strftime('%Y-W%W', date)
          ORDER BY period DESC
        `,
        params: []
      }
    };

    return queries[timeframe] || queries.yearly;
  }

  /**
   * Build statistics query for dashboard metrics
   * @returns {Object} Predefined statistics queries
   */
  static buildStatsQueries() {
    return {
      totalRecords: {
        sql: 'SELECT COUNT(*) as count FROM market_data WHERE breadth_score IS NOT NULL',
        params: []
      },
      latestScore: {
        sql: 'SELECT breadth_score as breadthScore, date FROM market_data WHERE breadth_score IS NOT NULL ORDER BY date DESC, created_at DESC LIMIT 1',
        params: []
      },
      avgScore: {
        sql: 'SELECT AVG(breadth_score) as avg FROM market_data WHERE breadth_score IS NOT NULL',
        params: []
      },
      dataRange: {
        sql: 'SELECT MIN(date) as start, MAX(date) as end FROM market_data WHERE breadth_score IS NOT NULL',
        params: []
      },
      recentTrend: {
        sql: `
          SELECT 
            date,
            breadth_score as breadthScore
          FROM market_data 
          WHERE breadth_score IS NOT NULL
          ORDER BY date DESC 
          LIMIT 30
        `,
        params: []
      }
    };
  }
}

/**
 * Database response formatting utilities
 */
export class ResponseFormatter {
  /**
   * Format standard API response
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {Object} meta - Additional metadata
   * @returns {Object} Formatted response
   */
  static success(data, message = 'Success', meta = {}) {
    return {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * Format error response
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} details - Additional error details
   * @returns {Object} Formatted error response
   */
  static error(message, code = 'UNKNOWN_ERROR', details = {}) {
    return {
      success: false,
      error: {
        message,
        code,
        timestamp: new Date().toISOString(),
        ...details
      }
    };
  }

  /**
   * Format paginated response
   * @param {Array} data - Response data
   * @param {Object} pagination - Pagination info
   * @param {string} message - Success message
   * @returns {Object} Formatted paginated response
   */
  static paginated(data, pagination, message = 'Success') {
    return {
      success: true,
      message,
      data,
      pagination: {
        total: pagination.total || data.length,
        limit: pagination.limit || null,
        offset: pagination.offset || 0,
        hasMore: pagination.hasMore || false,
        ...pagination
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Format market data for frontend consumption
   * @param {Array} rows - Raw database rows
   * @returns {Array} Formatted market data
   */
  static formatMarketData(rows) {
    return rows.map(row => ({
      ...row,
      // Ensure numeric fields are properly typed
      breadthScore: row.breadthScore ? parseFloat(row.breadthScore) : null,
      stocks_up_4pct: row.stocks_up_4pct ? parseInt(row.stocks_up_4pct) : null,
      stocks_down_4pct: row.stocks_down_4pct ? parseInt(row.stocks_down_4pct) : null,
      sp500: row.sp500 ? parseFloat(row.sp500) : null,
      // Format ratios to 2 decimal places
      ratio_5day: row.ratio_5day ? Math.round(row.ratio_5day * 100) / 100 : null,
      ratio_10day: row.ratio_10day ? Math.round(row.ratio_10day * 100) / 100 : null
    }));
  }
}

/**
 * Database connection utilities
 */
export class DatabaseUtil {
  /**
   * Execute query with error handling
   * @param {Object} db - Database connection
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @param {string} operation - Operation type for error messages
   * @returns {Array|Object} Query results
   */
  static executeQuery(db, sql, params = [], operation = 'query') {
    try {
      const stmt = db.prepare(sql);
      
      if (sql.trim().toLowerCase().startsWith('select')) {
        // For SELECT queries, return all results
        return stmt.all(params);
      } else {
        // For INSERT/UPDATE/DELETE, return run result
        return stmt.run(params);
      }
    } catch (error) {
      console.error(`Database ${operation} error:`, error);
      throw new Error(`Database ${operation} failed: ${error.message}`);
    }
  }

  /**
   * Execute single row query
   * @param {Object} db - Database connection
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @param {string} operation - Operation type for error messages
   * @returns {Object|null} Single query result
   */
  static executeQuerySingle(db, sql, params = [], operation = 'query') {
    try {
      const stmt = db.prepare(sql);
      return stmt.get(params);
    } catch (error) {
      console.error(`Database ${operation} error:`, error);
      throw new Error(`Database ${operation} failed: ${error.message}`);
    }
  }

  /**
   * Validate date format (YYYY-MM-DD)
   * @param {string} dateString - Date string to validate
   * @returns {boolean} Is valid date
   */
  static isValidDate(dateString) {
    if (!dateString) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Sanitize and validate limit parameter
   * @param {string|number} limit - Limit value
   * @param {number} defaultLimit - Default limit value
   * @param {number} maxLimit - Maximum allowed limit
   * @returns {number} Validated limit
   */
  static validateLimit(limit, defaultLimit = 100, maxLimit = 10000) {
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return defaultLimit;
    }
    return Math.min(parsedLimit, maxLimit);
  }
}