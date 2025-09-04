import express from 'express';
import { getDatabase } from '../database/init.js';

const router = express.Router();

// Default breadth score weights (from documentation)
const DEFAULT_WEIGHTS = {
  t2108: 0.20,                    // 20%
  stocks_up_4pct: 0.15,          // 15%
  stocks_down_4pct: 0.15,        // 15%  
  ratio_5day: 0.15,              // 15%
  ratio_10day: 0.10,             // 10%
  stocks_up_25pct_quarter: 0.08,  // 8%
  stocks_down_25pct_quarter: 0.08, // 8%
  stocks_up_13pct_34days: 0.05,  // 5%
  stocks_down_13pct_34days: 0.04  // 4%
};

// Get current breadth score weights
async function getBreadthScoreWeights(db) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT value FROM app_config WHERE key = ?',
      ['breadth_score_weights'],
      (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          try {
            resolve(JSON.parse(row.value));
          } catch (parseErr) {
            resolve(DEFAULT_WEIGHTS);
          }
        } else {
          resolve(DEFAULT_WEIGHTS);
        }
      }
    );
  });
}

// Calculate breadth score for a single record
function calculateBreadthScore(data, weights) {
  let score = 0;
  let totalWeight = 0;
  
  // Normalize values and apply weights
  const components = {
    t2108: data.t2108 / 100, // Convert percentage to 0-1
    stocks_up_4pct: Math.min(data.stocks_up_4pct / 1000, 1), // Normalize to 0-1
    stocks_down_4pct: Math.max(1 - (data.stocks_down_4pct / 1000), 0), // Invert and normalize
    ratio_5day: Math.min(data.ratio_5day / 2, 1), // Normalize assuming max ~2
    ratio_10day: Math.min(data.ratio_10day / 2, 1), // Normalize assuming max ~2
    stocks_up_25pct_quarter: Math.min(data.stocks_up_25pct_quarter / 2000, 1),
    stocks_down_25pct_quarter: Math.max(1 - (data.stocks_down_25pct_quarter / 2000), 0),
    stocks_up_13pct_34days: Math.min(data.stocks_up_13pct_34days / 3000, 1),
    stocks_down_13pct_34days: Math.max(1 - (data.stocks_down_13pct_34days / 1500), 0)
  };
  
  // Calculate weighted score
  Object.entries(components).forEach(([component, value]) => {
    if (value !== null && !isNaN(value) && weights[component]) {
      score += value * weights[component];
      totalWeight += weights[component];
    }
  });
  
  // Return score as percentage (0-100)
  return totalWeight > 0 ? (score / totalWeight) * 100 : null;
}

// POST /api/breadth-score/calculate - Calculate breadth scores for all records
router.post('/calculate', async (req, res) => {
  try {
    const { recalculateAll = false, dateRange } = req.body;
    const db = await getDatabase();
    
    // Get current weights
    const weights = await getBreadthScoreWeights(db);
    
    // Build query based on parameters
    let sql = `
      SELECT id, date, stocks_up_4pct, stocks_down_4pct, ratio_5day, ratio_10day,
             stocks_up_25pct_quarter, stocks_down_25pct_quarter,
             stocks_up_13pct_34days, stocks_down_13pct_34days, t2108
      FROM market_data 
      WHERE 1=1
    `;
    
    const params = [];
    
    if (!recalculateAll) {
      sql += ' AND (breadth_score IS NULL OR breadth_score_normalized IS NULL)';
    }
    
    if (dateRange?.start) {
      sql += ' AND date >= ?';
      params.push(dateRange.start);
    }
    
    if (dateRange?.end) {
      sql += ' AND date <= ?';
      params.push(dateRange.end);
    }
    
    sql += ' ORDER BY date';
    
    db.all(sql, params, async (err, rows) => {
      if (err) {
        db.close();
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Failed to fetch market data' });
      }
      
      let processed = 0;
      let errors = 0;
      const errorDetails = [];
      
      // Process each record
      for (const row of rows) {
        try {
          const breadthScore = calculateBreadthScore(row, weights);
          
          if (breadthScore !== null) {
            // Update record with calculated scores
            const updateSql = `
              UPDATE market_data 
              SET breadth_score = ?, 
                  breadth_score_normalized = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `;
            
            await new Promise((resolve, reject) => {
              db.run(updateSql, [breadthScore, breadthScore, row.id], (updateErr) => {
                if (updateErr) reject(updateErr);
                else resolve();
              });
            });
            
            processed++;
          } else {
            errorDetails.push(`${row.date}: Insufficient data for calculation`);
          }
        } catch (calcError) {
          errors++;
          errorDetails.push(`${row.date}: ${calcError.message}`);
        }
      }
      
      db.close();
      
      res.json({
        success: true,
        summary: {
          processed,
          errors,
          weights_used: weights
        },
        errorDetails: errorDetails.slice(0, 10) // Show first 10 errors
      });
    });
  } catch (error) {
    console.error('Breadth score calculation error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate breadth scores',
      details: error.message 
    });
  }
});

// GET /api/breadth-score/weights - Get current weights configuration
router.get('/weights', async (req, res) => {
  try {
    const db = await getDatabase();
    const weights = await getBreadthScoreWeights(db);
    
    db.close();
    
    res.json({
      weights,
      total: Object.values(weights).reduce((sum, weight) => sum + weight, 0),
      components: Object.keys(weights).length
    });
  } catch (error) {
    console.error('Get weights error:', error);
    res.status(500).json({ error: 'Failed to get weights configuration' });
  }
});

// PUT /api/breadth-score/weights - Update weights configuration
router.put('/weights', async (req, res) => {
  try {
    const { weights } = req.body;
    
    // Validate weights
    if (!weights || typeof weights !== 'object') {
      return res.status(400).json({ error: 'Invalid weights object' });
    }
    
    // Check if weights sum to 1.0 (100%)
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + (weight || 0), 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      return res.status(400).json({ 
        error: 'Weights must sum to 1.0 (100%)',
        currentTotal: totalWeight 
      });
    }
    
    const db = await getDatabase();
    
    // Update weights in configuration
    const sql = `
      INSERT OR REPLACE INTO app_config (key, value, description, updated_at) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    await new Promise((resolve, reject) => {
      db.run(sql, [
        'breadth_score_weights',
        JSON.stringify(weights),
        'Breadth Score calculation weights'
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    db.close();
    
    res.json({
      success: true,
      weights,
      total: totalWeight,
      message: 'Weights updated successfully'
    });
  } catch (error) {
    console.error('Update weights error:', error);
    res.status(500).json({ error: 'Failed to update weights' });
  }
});

// GET /api/breadth-score/history - Get breadth score history
router.get('/history', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      limit = 365,
      includeComponents = false 
    } = req.query;
    
    const db = await getDatabase();
    
    let sql = `
      SELECT date, breadth_score, breadth_score_normalized
      ${includeComponents === 'true' ? ', stocks_up_4pct, stocks_down_4pct, ratio_5day, ratio_10day, t2108' : ''}
      FROM market_data 
      WHERE breadth_score IS NOT NULL
    `;
    
    const params = [];
    
    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }
    
    sql += ' ORDER BY date DESC LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(sql, params, (err, rows) => {
      db.close();
      
      if (err) {
        console.error('History query error:', err);
        return res.status(500).json({ error: 'Failed to fetch breadth score history' });
      }
      
      res.json({
        data: rows,
        count: rows.length
      });
    });
  } catch (error) {
    console.error('History API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/breadth-score/analytics - Get breadth score analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = '1year' } = req.query;
    const db = await getDatabase();
    
    // Calculate date range based on period
    let dateLimit = '';
    switch (period) {
      case '1month':
        dateLimit = "AND date >= date('now', '-1 month')";
        break;
      case '3months':
        dateLimit = "AND date >= date('now', '-3 months')";
        break;
      case '6months':
        dateLimit = "AND date >= date('now', '-6 months')";
        break;
      case '1year':
        dateLimit = "AND date >= date('now', '-1 year')";
        break;
      case 'all':
      default:
        dateLimit = '';
    }
    
    const analyticsSql = `
      SELECT 
        COUNT(*) as total_records,
        AVG(breadth_score) as avg_score,
        MIN(breadth_score) as min_score,
        MAX(breadth_score) as max_score,
        MIN(date) as earliest_date,
        MAX(date) as latest_date,
        COUNT(CASE WHEN breadth_score > 70 THEN 1 END) as bullish_days,
        COUNT(CASE WHEN breadth_score < 30 THEN 1 END) as bearish_days,
        COUNT(CASE WHEN breadth_score BETWEEN 30 AND 70 THEN 1 END) as neutral_days
      FROM market_data 
      WHERE breadth_score IS NOT NULL ${dateLimit}
    `;
    
    db.get(analyticsSql, (err, analytics) => {
      if (err) {
        db.close();
        console.error('Analytics query error:', err);
        return res.status(500).json({ error: 'Failed to calculate analytics' });
      }
      
      // Get trend data (monthly averages)
      const trendSql = `
        SELECT 
          strftime('%Y-%m', date) as month,
          AVG(breadth_score) as avg_score,
          COUNT(*) as data_points
        FROM market_data 
        WHERE breadth_score IS NOT NULL ${dateLimit}
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month
      `;
      
      db.all(trendSql, (trendErr, trendData) => {
        db.close();
        
        if (trendErr) {
          console.error('Trend query error:', trendErr);
          return res.status(500).json({ error: 'Failed to calculate trend data' });
        }
        
        res.json({
          period,
          analytics: {
            ...analytics,
            bullish_percentage: analytics.total_records > 0 ? (analytics.bullish_days / analytics.total_records * 100) : 0,
            bearish_percentage: analytics.total_records > 0 ? (analytics.bearish_days / analytics.total_records * 100) : 0,
            neutral_percentage: analytics.total_records > 0 ? (analytics.neutral_days / analytics.total_records * 100) : 0
          },
          trend: trendData
        });
      });
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;