import { describe, test, beforeEach, afterEach, beforeAll, afterAll, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test database path
const TEST_DB_PATH = join(__dirname, 'test_market_data_api.db');

describe('Market Data API Tests', () => {
  let app;
  let testDb;

  beforeAll(() => {
    // Create test Express app
    app = express();
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  });

  beforeEach(() => {
    // Remove existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    // Create fresh test database
    testDb = new Database(TEST_DB_PATH);
    
    // Create market_data table
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE NOT NULL,
        stocks_up_20pct INTEGER,
        stocks_down_20pct INTEGER,
        stocks_up_20dollar INTEGER,
        stocks_down_20dollar INTEGER,
        stocks_up_4pct INTEGER,
        stocks_down_4pct INTEGER,
        ratio_5day REAL,
        ratio_10day REAL,
        stocks_up_25pct_quarter INTEGER,
        stocks_down_25pct_quarter INTEGER,
        stocks_up_25pct_month INTEGER,
        stocks_down_25pct_month INTEGER,
        stocks_up_50pct_month INTEGER,
        stocks_down_50pct_month INTEGER,
        stocks_up_13pct_34days INTEGER,
        stocks_down_13pct_34days INTEGER,
        worden_universe INTEGER,
        t2108 REAL,
        sp500 TEXT,
        breadth_score REAL,
        breadth_score_normalized REAL,
        source_file TEXT,
        import_format TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Mock market data API endpoints
    app.get('/api/market-data', (req, res) => {
      try {
        const { limit = 50, offset = 0, startDate, endDate, sortBy = 'date', sortOrder = 'DESC' } = req.query;
        
        let query = 'SELECT * FROM market_data WHERE 1=1';
        const params = [];
        
        if (startDate) {
          query += ' AND date >= ?';
          params.push(startDate);
        }
        
        if (endDate) {
          query += ' AND date <= ?';
          params.push(endDate);
        }
        
        query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        const rows = testDb.prepare(query).all(...params);
        const totalQuery = 'SELECT COUNT(*) as total FROM market_data WHERE 1=1' + 
                          (startDate ? ' AND date >= ?' : '') + 
                          (endDate ? ' AND date <= ?' : '');
        const totalParams = [];
        if (startDate) totalParams.push(startDate);
        if (endDate) totalParams.push(endDate);
        
        const totalResult = testDb.prepare(totalQuery).get(...totalParams);
        
        res.json({
          data: rows,
          pagination: {
            total: totalResult.total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + rows.length) < totalResult.total
          }
        });
      } catch (error) {
        console.error('Market data fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch market data' });
      }
    });

    app.post('/api/market-data', (req, res) => {
      try {
        const data = req.body;
        
        // Validation
        const errors = [];
        
        if (!data.date) {
          errors.push('Date is required');
        }
        
        if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
          errors.push('Date must be in YYYY-MM-DD format');
        }
        
        // T2108 validation
        if (data.t2108 !== null && data.t2108 !== undefined && data.t2108 !== '') {
          const val = parseFloat(data.t2108);
          if (!isNaN(val) && (val < 0 || val > 100)) {
            errors.push('T2108 must be between 0 and 100');
          }
        }
        
        if (errors.length > 0) {
          return res.status(400).json({ errors });
        }
        
        // Calculate ratios if possible
        let ratio5day = null;
        let ratio10day = null;
        
        if (data.stocks_up_4pct && data.stocks_down_4pct) {
          // Simplified ratio calculation for testing
          ratio5day = parseFloat(data.stocks_up_4pct) / parseFloat(data.stocks_down_4pct);
        }
        
        // Calculate breadth score (simplified)
        let breadthScore = null;
        if (data.t2108) {
          breadthScore = parseFloat(data.t2108);
        }
        
        const insertQuery = `
          INSERT INTO market_data (
            date, stocks_up_20pct, stocks_down_20pct, stocks_up_20dollar, stocks_down_20dollar,
            stocks_up_4pct, stocks_down_4pct, ratio_5day, ratio_10day,
            stocks_up_25pct_quarter, stocks_down_25pct_quarter,
            stocks_up_25pct_month, stocks_down_25pct_month,
            stocks_up_50pct_month, stocks_down_50pct_month,
            stocks_up_13pct_34days, stocks_down_13pct_34days,
            worden_universe, t2108, sp500, breadth_score, breadth_score_normalized,
            source_file, import_format
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = testDb.prepare(insertQuery).run(
          data.date,
          data.stocks_up_20pct || null,
          data.stocks_down_20pct || null,
          data.stocks_up_20dollar || null,
          data.stocks_down_20dollar || null,
          data.stocks_up_4pct || null,
          data.stocks_down_4pct || null,
          ratio5day,
          ratio10day,
          data.stocks_up_25pct_quarter || null,
          data.stocks_down_25pct_quarter || null,
          data.stocks_up_25pct_month || null,
          data.stocks_down_25pct_month || null,
          data.stocks_up_50pct_month || null,
          data.stocks_down_50pct_month || null,
          data.stocks_up_13pct_34days || null,
          data.stocks_down_13pct_34days || null,
          data.worden_universe || null,
          data.t2108 || null,
          data.sp500 || null,
          breadthScore,
          breadthScore ? breadthScore / 100 : null,
          data.source_file || 'api',
          data.import_format || 'manual'
        );
        
        res.status(201).json({
          success: true,
          id: result.lastInsertRowid,
          message: 'Market data created successfully'
        });
        
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          res.status(409).json({ error: 'Data for this date already exists' });
        } else {
          console.error('Market data creation error:', error);
          res.status(500).json({ error: 'Failed to create market data' });
        }
      }
    });

    app.put('/api/market-data/:id', (req, res) => {
      try {
        const { id } = req.params;
        const data = req.body;
        
        // Check if record exists
        const existingRecord = testDb.prepare('SELECT * FROM market_data WHERE id = ?').get(id);
        if (!existingRecord) {
          return res.status(404).json({ error: 'Market data record not found' });
        }
        
        // Validation (similar to POST)
        const errors = [];
        
        if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
          errors.push('Date must be in YYYY-MM-DD format');
        }
        
        if (data.t2108 !== null && data.t2108 !== undefined && data.t2108 !== '') {
          const val = parseFloat(data.t2108);
          if (!isNaN(val) && (val < 0 || val > 100)) {
            errors.push('T2108 must be between 0 and 100');
          }
        }
        
        if (errors.length > 0) {
          return res.status(400).json({ errors });
        }
        
        // Update record
        const updateQuery = `
          UPDATE market_data SET 
            date = COALESCE(?, date),
            stocks_up_4pct = COALESCE(?, stocks_up_4pct),
            stocks_down_4pct = COALESCE(?, stocks_down_4pct),
            t2108 = COALESCE(?, t2108),
            sp500 = COALESCE(?, sp500),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        testDb.prepare(updateQuery).run(
          data.date || null,
          data.stocks_up_4pct || null,
          data.stocks_down_4pct || null,
          data.t2108 || null,
          data.sp500 || null,
          id
        );
        
        res.json({
          success: true,
          message: 'Market data updated successfully'
        });
        
      } catch (error) {
        console.error('Market data update error:', error);
        res.status(500).json({ error: 'Failed to update market data' });
      }
    });

    app.delete('/api/market-data/:id', (req, res) => {
      try {
        const { id } = req.params;
        
        const result = testDb.prepare('DELETE FROM market_data WHERE id = ?').run(id);
        
        if (result.changes === 0) {
          return res.status(404).json({ error: 'Market data record not found' });
        }
        
        res.json({
          success: true,
          message: 'Market data deleted successfully'
        });
        
      } catch (error) {
        console.error('Market data deletion error:', error);
        res.status(500).json({ error: 'Failed to delete market data' });
      }
    });
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
      testDb = null;
    }
    
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('GET /api/market-data', () => {
    beforeEach(() => {
      // Insert test data
      testDb.prepare(`
        INSERT INTO market_data (date, stocks_up_4pct, stocks_down_4pct, t2108, breadth_score)
        VALUES 
          ('2024-01-15', 200, 150, 65.5, 65.5),
          ('2024-01-14', 180, 120, 62.8, 62.8),
          ('2024-01-13', 170, 130, 58.2, 58.2),
          ('2023-12-31', 220, 100, 75.1, 75.1)
      `).run();
    });

    test('should fetch all market data with default pagination', async () => {
      const response = await request(app)
        .get('/api/market-data')
        .expect(200);

      expect(response.body.data).toHaveLength(4);
      expect(response.body.pagination).toMatchObject({
        total: 4,
        limit: 50,
        offset: 0,
        hasMore: false
      });
    });

    test('should respect limit and offset parameters', async () => {
      const response = await request(app)
        .get('/api/market-data?limit=2&offset=1')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        total: 4,
        limit: 2,
        offset: 1,
        hasMore: true
      });
    });

    test('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/market-data?startDate=2024-01-01&endDate=2024-01-31')
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      response.body.data.forEach(record => {
        expect(record.date).toMatch(/^2024-01/);
      });
    });

    test('should sort by specified field and order', async () => {
      const response = await request(app)
        .get('/api/market-data?sortBy=breadth_score&sortOrder=ASC')
        .expect(200);

      const scores = response.body.data.map(r => r.breadth_score);
      expect(scores).toEqual([...scores].sort((a, b) => a - b));
    });

    test('should handle empty result set', async () => {
      const response = await request(app)
        .get('/api/market-data?startDate=2025-01-01')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });
  });

  describe('POST /api/market-data', () => {
    test('should create new market data record', async () => {
      const newData = {
        date: '2024-01-16',
        stocks_up_4pct: 210,
        stocks_down_4pct: 140,
        t2108: 68.2,
        sp500: '5,950.25'
      };

      const response = await request(app)
        .post('/api/market-data')
        .send(newData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Market data created successfully'
      });
      expect(response.body.id).toBeDefined();

      // Verify data was inserted
      const inserted = testDb.prepare('SELECT * FROM market_data WHERE id = ?').get(response.body.id);
      expect(inserted.date).toBe('2024-01-16');
      expect(inserted.stocks_up_4pct).toBe(210);
      expect(inserted.t2108).toBe(68.2);
    });

    test('should calculate ratios automatically', async () => {
      const newData = {
        date: '2024-01-16',
        stocks_up_4pct: 200,
        stocks_down_4pct: 100,
        t2108: 65.0
      };

      const response = await request(app)
        .post('/api/market-data')
        .send(newData)
        .expect(201);

      // Verify ratio was calculated
      const inserted = testDb.prepare('SELECT * FROM market_data WHERE id = ?').get(response.body.id);
      expect(inserted.ratio_5day).toBe(2.0); // 200/100
      expect(inserted.breadth_score).toBe(65.0);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        stocks_up_4pct: 200
        // Missing required date
      };

      const response = await request(app)
        .post('/api/market-data')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContain('Date is required');
    });

    test('should validate date format', async () => {
      const invalidData = {
        date: '01/15/2024', // Wrong format
        stocks_up_4pct: 200
      };

      const response = await request(app)
        .post('/api/market-data')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContain('Date must be in YYYY-MM-DD format');
    });

    test('should validate T2108 range', async () => {
      const invalidData = {
        date: '2024-01-16',
        t2108: 150 // Invalid - should be 0-100
      };

      const response = await request(app)
        .post('/api/market-data')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toContain('T2108 must be between 0 and 100');
    });

    test('should prevent duplicate dates', async () => {
      const data = {
        date: '2024-01-16',
        stocks_up_4pct: 200,
        t2108: 65.0
      };

      // First insert should succeed
      await request(app)
        .post('/api/market-data')
        .send(data)
        .expect(201);

      // Second insert with same date should fail
      const response = await request(app)
        .post('/api/market-data')
        .send(data)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('PUT /api/market-data/:id', () => {
    let recordId;

    beforeEach(async () => {
      const data = {
        date: '2024-01-16',
        stocks_up_4pct: 200,
        stocks_down_4pct: 150,
        t2108: 65.0
      };

      const response = await request(app)
        .post('/api/market-data')
        .send(data)
        .expect(201);

      recordId = response.body.id;
    });

    test('should update existing market data record', async () => {
      const updateData = {
        stocks_up_4pct: 220,
        t2108: 68.5
      };

      const response = await request(app)
        .put(`/api/market-data/${recordId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Market data updated successfully'
      });

      // Verify update
      const updated = testDb.prepare('SELECT * FROM market_data WHERE id = ?').get(recordId);
      expect(updated.stocks_up_4pct).toBe(220);
      expect(updated.t2108).toBe(68.5);
      expect(updated.stocks_down_4pct).toBe(150); // Should remain unchanged
    });

    test('should validate updated data', async () => {
      const invalidUpdate = {
        t2108: 150 // Invalid range
      };

      const response = await request(app)
        .put(`/api/market-data/${recordId}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.errors).toContain('T2108 must be between 0 and 100');
    });

    test('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .put('/api/market-data/99999')
        .send({ stocks_up_4pct: 200 })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/market-data/:id', () => {
    let recordId;

    beforeEach(async () => {
      const data = {
        date: '2024-01-16',
        stocks_up_4pct: 200,
        t2108: 65.0
      };

      const response = await request(app)
        .post('/api/market-data')
        .send(data)
        .expect(201);

      recordId = response.body.id;
    });

    test('should delete market data record', async () => {
      const response = await request(app)
        .delete(`/api/market-data/${recordId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Market data deleted successfully'
      });

      // Verify deletion
      const deleted = testDb.prepare('SELECT * FROM market_data WHERE id = ?').get(recordId);
      expect(deleted).toBeUndefined();
    });

    test('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .delete('/api/market-data/99999')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Close database to simulate connection error
      testDb.close();
      testDb = null;

      const response = await request(app)
        .get('/api/market-data')
        .expect(500);

      expect(response.body.error).toContain('Failed to fetch market data');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/market-data')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });

    test('should handle SQL injection attempts', async () => {
      const maliciousData = {
        date: "2024-01-16'; DROP TABLE market_data; --",
        stocks_up_4pct: 200
      };

      const response = await request(app)
        .post('/api/market-data')
        .send(maliciousData)
        .expect(400);

      expect(response.body.errors).toContain('Date must be in YYYY-MM-DD format');
      
      // Verify table still exists
      const result = testDb.prepare('SELECT COUNT(*) as count FROM market_data').get();
      expect(result).toBeDefined();
    });
  });
})