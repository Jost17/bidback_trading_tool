import express from 'express';
import { getDatabase } from '../database/init.js';
import { QueryBuilder, ResponseFormatter, DatabaseUtil } from '../utils/queryBuilder.js';

const router = express.Router();

// Get available dates for datepicker
router.get('/available-dates', async (req, res) => {
  try {
    const db = getDatabase();
    
    const sql = `
      SELECT DISTINCT date 
      FROM market_data 
      WHERE breadth_score IS NOT NULL 
      ORDER BY date ASC
    `;
    
    const rows = DatabaseUtil.executeQuery(db, sql, [], 'fetch available dates');
    const dates = rows.map(row => row.date);
    
    res.json(ResponseFormatter.success({
      dates: dates,
      count: dates.length,
      earliest: dates[0] || null,
      latest: dates[dates.length - 1] || null
    }, 'Available dates retrieved successfully'));
    
  } catch (error) {
    console.error('Error fetching available dates:', error);
    res.status(500).json(ResponseFormatter.error('Failed to fetch available dates', 'FETCH_DATES_ERROR'));
  }
});

// Get current market breadth status
router.get('/current-status', async (req, res) => {
  try {
    const db = getDatabase();
    const queries = QueryBuilder.buildStatsQueries();
    
    const row = DatabaseUtil.executeQuerySingle(db, queries.latestScore.sql, queries.latestScore.params, 'fetch current status');
    
    if (!row) {
      return res.status(404).json(ResponseFormatter.error('No breadth score data available', 'NO_DATA_FOUND'));
    }
    
    res.json(ResponseFormatter.success({
      breadthScore: parseFloat(row.breadthScore),
      lastUpdated: row.date,
      timestamp: row.created_at
    }, 'Current market status retrieved successfully'));
    
  } catch (error) {
    console.error('Error fetching current status:', error);
    res.status(500).json(ResponseFormatter.error('Failed to fetch current market status', 'FETCH_STATUS_ERROR'));
  }
});

// Get historical breadth scores
router.get('/breadth-scores', async (req, res) => {
  try {
    const db = getDatabase();
    const { startDate, endDate, limit, sortBy, sortOrder } = req.query;
    
    // Validate date parameters
    if (startDate && !DatabaseUtil.isValidDate(startDate)) {
      return res.status(400).json(ResponseFormatter.error('Invalid start date format. Use YYYY-MM-DD', 'INVALID_DATE'));
    }
    
    if (endDate && !DatabaseUtil.isValidDate(endDate)) {
      return res.status(400).json(ResponseFormatter.error('Invalid end date format. Use YYYY-MM-DD', 'INVALID_DATE'));
    }
    
    const validatedLimit = DatabaseUtil.validateLimit(limit, 1000, 10000);
    
    const filters = {
      startDate,
      endDate,
      limit: validatedLimit,
      sortBy: sortBy || 'date',
      sortOrder: sortOrder || 'ASC'
    };
    
    const { sql, params } = QueryBuilder.buildMarketDataQuery(filters);
    const rows = DatabaseUtil.executeQuery(db, sql, params, 'fetch breadth scores');
    
    // Format data for response
    const formattedData = rows.map(row => ({
      date: row.date,
      breadthScore: row.breadthScore
    }));
    
    res.json(ResponseFormatter.success({
      data: formattedData,
      count: formattedData.length,
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        limit: validatedLimit
      }
    }, 'Historical breadth scores retrieved successfully'));
    
  } catch (error) {
    console.error('Error fetching breadth scores:', error);
    res.status(500).json(ResponseFormatter.error('Failed to fetch historical breadth scores', 'FETCH_BREADTH_SCORES_ERROR'));
  }
});

// Get yearly summaries
router.get('/yearly-summaries', async (req, res) => {
  try {
    const db = getDatabase();
    const { limit, timeframe = 'yearly' } = req.query;
    
    const validatedLimit = DatabaseUtil.validateLimit(limit, 10, 100);
    
    const { sql, params } = QueryBuilder.buildSummaryQueries({ timeframe });
    let finalSql = sql;
    let finalParams = [...params];
    
    // Add limit if specified
    if (validatedLimit) {
      finalSql += ' LIMIT ?';
      finalParams.push(validatedLimit);
    }
    
    const rows = DatabaseUtil.executeQuery(db, finalSql, finalParams, 'fetch summaries');
    
    // Format data with proper number formatting
    const formattedData = rows.map(row => ({
      ...row,
      avgBreadthScore: row.avgBreadthScore ? Math.round(row.avgBreadthScore * 10) / 10 : null,
      minBreadthScore: row.minBreadthScore ? Math.round(row.minBreadthScore * 10) / 10 : null,
      maxBreadthScore: row.maxBreadthScore ? Math.round(row.maxBreadthScore * 10) / 10 : null
    }));
    
    res.json(ResponseFormatter.success({
      data: formattedData,
      count: formattedData.length,
      timeframe,
      limit: validatedLimit
    }, `${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} summaries retrieved successfully`));
    
  } catch (error) {
    console.error('Error fetching yearly summaries:', error);
    res.status(500).json(ResponseFormatter.error('Failed to fetch yearly summaries', 'FETCH_SUMMARIES_ERROR'));
  }
});

// Get market statistics
router.get('/stats', async (req, res) => {
  try {
    const db = getDatabase();
    
    const queries = QueryBuilder.buildStatsQueries();
    const stats = {};
    
    // Execute all stat queries
    for (const [key, queryObj] of Object.entries(queries)) {
      try {
        if (key === 'recentTrend') {
          stats[key] = DatabaseUtil.executeQuery(db, queryObj.sql, queryObj.params, `fetch ${key}`);
        } else {
          stats[key] = DatabaseUtil.executeQuerySingle(db, queryObj.sql, queryObj.params, `fetch ${key}`);
        }
      } catch (error) {
        console.warn(`Failed to fetch ${key}:`, error.message);
        stats[key] = null;
      }
    }
    
    // Format response with calculated metrics
    const responseData = {
      totalRecords: stats.totalRecords?.count || 0,
      currentScore: stats.latestScore?.breadthScore ? parseFloat(stats.latestScore.breadthScore) : null,
      averageScore: stats.avgScore?.avg ? Math.round(stats.avgScore.avg * 10) / 10 : null,
      dataRange: {
        start: stats.dataRange?.start || null,
        end: stats.dataRange?.end || null
      },
      recentTrend: stats.recentTrend?.slice(0, 7) || [] // Last 7 days
    };
    
    res.json(ResponseFormatter.success(responseData, 'Market statistics retrieved successfully'));
    
  } catch (error) {
    console.error('Error fetching market stats:', error);
    res.status(500).json(ResponseFormatter.error('Failed to fetch market statistics', 'FETCH_STATS_ERROR'));
  }
});

export default router;
