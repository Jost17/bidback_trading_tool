import express from 'express';
import { getDatabase } from '../database/init.js';
import { calculateRatios, validateNumericField, validateDateFormat } from '../utils/ratioCalculator.js';
import { QueryBuilder, ResponseFormatter, DatabaseUtil } from '../utils/queryBuilder.js';
import { asyncHandler, sendSuccess, ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation helper using shared utilities
function validateMarketDataInput(data) {
  const errors = [];
  
  // Validate date
  const dateError = validateDateFormat(data.date);
  if (dateError) {
    errors.push(dateError);
  }
  
  // Validate numeric fields
  const numericFields = [
    'stocks_up_20pct', 'stocks_down_20pct',
    'stocks_up_20dollar', 'stocks_down_20dollar', 
    'stocks_up_4pct', 'stocks_down_4pct',
    'stocks_up_25pct_quarter', 'stocks_down_25pct_quarter',
    'stocks_up_25pct_month', 'stocks_down_25pct_month',
    'stocks_up_50pct_month', 'stocks_down_50pct_month',
    'stocks_up_13pct_34days', 'stocks_down_13pct_34days',
    'sp500',
    // Sector fields
    'basic_materials_sector', 'consumer_cyclical_sector', 'financial_services_sector',
    'real_estate_sector', 'consumer_defensive_sector', 'healthcare_sector',
    'utilities_sector', 'communication_services_sector', 'energy_sector',
    'industrials_sector', 'technology_sector'
  ];
  
  numericFields.forEach(field => {
    const error = validateNumericField(data[field], field);
    if (error) {
      errors.push(error);
    }
  });
  
  // T2108 should be between 0 and 100
  const t2108Error = validateNumericField(data.t2108, 'T2108', { min: 0, max: 100 });
  if (t2108Error) {
    errors.push(t2108Error);
  }
  
  // Worden Universe should be positive
  const wordenError = validateNumericField(data.worden_universe, 'Worden Universe', { min: 0.001 });
  if (wordenError) {
    errors.push(wordenError);
  }
  
  return errors;
}


// GET /api/market-data - Get market data with optional filters
router.get('/', asyncHandler(async (req, res) => {
  const { 
    limit = 25, 
    offset = 0, 
    sortBy = 'date', 
    sortOrder = 'DESC',
    startDate,
    endDate
  } = req.query;

  const db = getDatabase();
  
  // Validate and sanitize inputs
  const validatedLimit = Math.min(parseInt(limit) || 25, 1000);
  const validatedOffset = Math.max(0, parseInt(offset) || 0);
  const safeSortBy = ['date', 'breadth_score', 'stocks_up_4pct', 'stocks_down_4pct'].includes(sortBy) ? sortBy : 'date';
  const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
  
  // Build WHERE clause for date filtering
  let whereClause = '';
  const params = [];
  
  if (startDate || endDate) {
    const conditions = [];
    if (startDate) {
      conditions.push('date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('date <= ?');
      params.push(endDate);
    }
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }
  
  const sql = `
    SELECT 
      id,
      date,
      breadth_score,
      breadth_score_normalized,
      -- Primary Breadth Indicators
      stocks_up_4pct,
      stocks_down_4pct,
      stocks_up_20pct,
      stocks_down_20pct,
      stocks_up_20dollar,
      stocks_down_20dollar,
      stocks_up_25pct_quarter,
      stocks_down_25pct_quarter,
      stocks_up_25pct_month,
      stocks_down_25pct_month,
      stocks_up_50pct_month,
      stocks_down_50pct_month,
      stocks_up_13pct_34days,
      stocks_down_13pct_34days,
      -- Ratios
      ratio_5day,
      ratio_10day,
      -- Key Market Indicators
      t2108,
      worden_universe,
      sp500,
      -- Sector Data
      basic_materials_sector,
      consumer_cyclical_sector,
      financial_services_sector,
      real_estate_sector,
      consumer_defensive_sector,
      healthcare_sector,
      utilities_sector,
      communication_services_sector,
      energy_sector,
      industrials_sector,
      technology_sector,
      created_at
    FROM market_data 
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;

  // Add limit and offset to params
  params.push(validatedLimit, validatedOffset);
  
  const rows = db.prepare(sql).all(...params);
  
  // Get total count with same date filters
  const countSql = `SELECT COUNT(*) as total FROM market_data ${whereClause}`;
  const countParams = whereClause ? params.slice(0, -2) : []; // Remove limit and offset
  const countResult = db.prepare(countSql).get(...countParams);
  
  res.json({
    success: true,
    message: `Retrieved ${rows.length} market data records`,
    data: rows,
    pagination: {
      total: countResult.total,
      limit: validatedLimit,
      offset: validatedOffset,
      hasMore: (validatedOffset + validatedLimit) < countResult.total
    },
    timestamp: new Date().toISOString()
  });
}));

// GET /api/market-data/:id - Get specific market data entry
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!id || isNaN(parseInt(id))) {
    throw new ValidationError('Invalid ID parameter');
  }

  const db = getDatabase();
    
  const sql = 'SELECT * FROM market_data WHERE id = ?';
  const row = DatabaseUtil.executeQuerySingle(db, sql, [parseInt(id)], 'fetch market data by ID');
  
  if (!row) {
    return res.status(404).json(ResponseFormatter.error('Market data not found', 'NOT_FOUND'));
  }
  
  const formattedData = ResponseFormatter.formatMarketData([row])[0];
  sendSuccess(res, formattedData, 'Market data retrieved successfully');
}));

// POST /api/market-data - Create new market data entry with validation and auto-calculations
router.post('/', (req, res) => {
  try {
    const marketData = req.body;
    const db = getDatabase();
    
    // Validate input
    const validationErrors = validateMarketDataInput(marketData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Check if date already exists
    const existingEntry = db.prepare('SELECT id FROM market_data WHERE date = ?').get(marketData.date);
    if (existingEntry) {
      return res.status(409).json({ 
        error: 'Date already exists',
        existingId: existingEntry.id
      });
    }
    
    // Calculate ratios automatically
    const calculations = calculateRatios(marketData, db);
    
    // Prepare data for insertion
    const dataToInsert = {
      date: marketData.date,
      stocks_up_20pct: marketData.stocks_up_20pct || null,
      stocks_down_20pct: marketData.stocks_down_20pct || null,
      stocks_up_20dollar: marketData.stocks_up_20dollar || null,
      stocks_down_20dollar: marketData.stocks_down_20dollar || null,
      stocks_up_4pct: marketData.stocks_up_4pct || null,
      stocks_down_4pct: marketData.stocks_down_4pct || null,
      ratio_5day: calculations.ratio_5day || null,
      ratio_10day: calculations.ratio_10day || null,
      stocks_up_25pct_quarter: marketData.stocks_up_25pct_quarter || null,
      stocks_down_25pct_quarter: marketData.stocks_down_25pct_quarter || null,
      stocks_up_25pct_month: marketData.stocks_up_25pct_month || null,
      stocks_down_25pct_month: marketData.stocks_down_25pct_month || null,
      stocks_up_50pct_month: marketData.stocks_up_50pct_month || null,
      stocks_down_50pct_month: marketData.stocks_down_50pct_month || null,
      stocks_up_13pct_34days: marketData.stocks_up_13pct_34days || null,
      stocks_down_13pct_34days: marketData.stocks_down_13pct_34days || null,
      worden_universe: marketData.worden_universe || null,
      t2108: marketData.t2108 || null,
      sp500: marketData.sp500 || null,
      // Sector data
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
      source_file: marketData.source_file || 'manual_entry',
      import_format: marketData.import_format || 'manual_v2',
      data_quality_score: marketData.data_quality_score || 1.0 // High quality for manual entries
    };
    
    const sql = `
      INSERT INTO market_data (
        date, stocks_up_20pct, stocks_down_20pct, stocks_up_20dollar, stocks_down_20dollar,
        stocks_up_4pct, stocks_down_4pct, ratio_5day, ratio_10day,
        stocks_up_25pct_quarter, stocks_down_25pct_quarter,
        stocks_up_25pct_month, stocks_down_25pct_month,
        stocks_up_50pct_month, stocks_down_50pct_month,
        stocks_up_13pct_34days, stocks_down_13pct_34days,
        worden_universe, t2108, sp500,
        basic_materials_sector, consumer_cyclical_sector, financial_services_sector,
        real_estate_sector, consumer_defensive_sector, healthcare_sector,
        utilities_sector, communication_services_sector, energy_sector,
        industrials_sector, technology_sector,
        source_file, import_format, data_quality_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      dataToInsert.date,
      dataToInsert.stocks_up_20pct,
      dataToInsert.stocks_down_20pct,
      dataToInsert.stocks_up_20dollar,
      dataToInsert.stocks_down_20dollar,
      dataToInsert.stocks_up_4pct,
      dataToInsert.stocks_down_4pct,
      dataToInsert.ratio_5day,
      dataToInsert.ratio_10day,
      dataToInsert.stocks_up_25pct_quarter,
      dataToInsert.stocks_down_25pct_quarter,
      dataToInsert.stocks_up_25pct_month,
      dataToInsert.stocks_down_25pct_month,
      dataToInsert.stocks_up_50pct_month,
      dataToInsert.stocks_down_50pct_month,
      dataToInsert.stocks_up_13pct_34days,
      dataToInsert.stocks_down_13pct_34days,
      dataToInsert.worden_universe,
      dataToInsert.t2108,
      dataToInsert.sp500,
      dataToInsert.basic_materials_sector,
      dataToInsert.consumer_cyclical_sector,
      dataToInsert.financial_services_sector,
      dataToInsert.real_estate_sector,
      dataToInsert.consumer_defensive_sector,
      dataToInsert.healthcare_sector,
      dataToInsert.utilities_sector,
      dataToInsert.communication_services_sector,
      dataToInsert.energy_sector,
      dataToInsert.industrials_sector,
      dataToInsert.technology_sector,
      dataToInsert.source_file,
      dataToInsert.import_format,
      dataToInsert.data_quality_score
    ];
    
    const result = db.prepare(sql).run(params);
    
    // Return the created record with calculations
    const newRecord = db.prepare('SELECT * FROM market_data WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
      data: newRecord,
      calculations: {
        ratio_5day: calculations.ratio_5day,
        ratio_10day: calculations.ratio_10day
      },
      message: 'Market data created successfully'
    });
    
  } catch (error) {
    console.error('API error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Date already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/market-data/:id - Update existing market data entry
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const marketData = req.body;
    const db = getDatabase();
    
    // Check if record exists
    const existingRecord = db.prepare('SELECT * FROM market_data WHERE id = ?').get(id);
    if (!existingRecord) {
      return res.status(404).json({ error: 'Market data not found' });
    }
    
    // Validate input
    const validationErrors = validateMarketDataInput(marketData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }
    
    // Recalculate ratios with new data
    const calculations = calculateRatios(marketData, db);
    
    const sql = `
      UPDATE market_data SET
        date = ?, stocks_up_20pct = ?, stocks_down_20pct = ?, stocks_up_20dollar = ?, stocks_down_20dollar = ?,
        stocks_up_4pct = ?, stocks_down_4pct = ?, ratio_5day = ?, ratio_10day = ?,
        stocks_up_25pct_quarter = ?, stocks_down_25pct_quarter = ?,
        stocks_up_25pct_month = ?, stocks_down_25pct_month = ?,
        stocks_up_50pct_month = ?, stocks_down_50pct_month = ?,
        stocks_up_13pct_34days = ?, stocks_down_13pct_34days = ?,
        worden_universe = ?, t2108 = ?, sp500 = ?,
        basic_materials_sector = ?, consumer_cyclical_sector = ?, financial_services_sector = ?,
        real_estate_sector = ?, consumer_defensive_sector = ?, healthcare_sector = ?,
        utilities_sector = ?, communication_services_sector = ?, energy_sector = ?,
        industrials_sector = ?, technology_sector = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const params = [
      marketData.date,
      marketData.stocks_up_20pct || null,
      marketData.stocks_down_20pct || null,
      marketData.stocks_up_20dollar || null,
      marketData.stocks_down_20dollar || null,
      marketData.stocks_up_4pct || null,
      marketData.stocks_down_4pct || null,
      calculations.ratio_5day || null,
      calculations.ratio_10day || null,
      marketData.stocks_up_25pct_quarter || null,
      marketData.stocks_down_25pct_quarter || null,
      marketData.stocks_up_25pct_month || null,
      marketData.stocks_down_25pct_month || null,
      marketData.stocks_up_50pct_month || null,
      marketData.stocks_down_50pct_month || null,
      marketData.stocks_up_13pct_34days || null,
      marketData.stocks_down_13pct_34days || null,
      marketData.worden_universe || null,
      marketData.t2108 || null,
      marketData.sp500 || null,
      marketData.basic_materials_sector || null,
      marketData.consumer_cyclical_sector || null,
      marketData.financial_services_sector || null,
      marketData.real_estate_sector || null,
      marketData.consumer_defensive_sector || null,
      marketData.healthcare_sector || null,
      marketData.utilities_sector || null,
      marketData.communication_services_sector || null,
      marketData.energy_sector || null,
      marketData.industrials_sector || null,
      marketData.technology_sector || null,
      id
    ];
    
    db.prepare(sql).run(params);
    
    // Return updated record
    const updatedRecord = db.prepare('SELECT * FROM market_data WHERE id = ?').get(id);
    
    res.json({
      data: updatedRecord,
      calculations: calculations,
      message: 'Market data updated successfully'
    });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/market-data/:id - Delete market data entry
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    const result = db.prepare('DELETE FROM market_data WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Market data not found' });
    }
    
    res.json({ message: 'Market data deleted successfully' });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/market-data/stats/summary - Get summary statistics
router.get('/stats/summary', (req, res) => {
  try {
    const db = getDatabase();
    
    const sql = `
      SELECT 
        COUNT(*) as total_records,
        MIN(date) as earliest_date,
        MAX(date) as latest_date,
        AVG(breadth_score) as avg_breadth_score,
        MIN(breadth_score) as min_breadth_score,
        MAX(breadth_score) as max_breadth_score,
        COUNT(CASE WHEN breadth_score IS NULL THEN 1 END) as missing_scores,
        COUNT(CASE WHEN source_file = 'manual_entry' THEN 1 END) as manual_entries
      FROM market_data
    `;
    
    const row = db.prepare(sql).get();
    
    res.json(row);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;