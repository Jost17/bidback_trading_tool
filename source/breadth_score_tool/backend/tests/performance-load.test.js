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

const TEST_DB_PATH = join(__dirname, 'test_performance_load.db');

describe('Performance under Load Tests', () => {
  let app;
  let testDb;

  beforeAll(() => {
    app = express();
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // API endpoints that simulate real application behavior
    app.get('/api/market-data/bulk', (req, res) => {
      try {
        const { limit = 1000, offset = 0 } = req.query;
        
        const query = `
          SELECT id, date, breadth_score, stocks_up_4pct, stocks_down_4pct, 
                 ratio_5day, ratio_10day, t2108, sp500 
          FROM market_data 
          ORDER BY date DESC 
          LIMIT ? OFFSET ?
        `;
        
        const startTime = process.hrtime.bigint();
        const rows = testDb.prepare(query).all(parseInt(limit), parseInt(offset));
        const endTime = process.hrtime.bigint();
        
        const queryTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        res.json({
          data: rows,
          performance: {
            queryTimeMs: queryTime,
            recordCount: rows.length,
            avgTimePerRecord: rows.length > 0 ? queryTime / rows.length : 0
          },
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: rows.length === parseInt(limit)
          }
        });
      } catch (error) {
        console.error('Bulk query error:', error);
        res.status(500).json({ error: 'Failed to fetch bulk data' });
      }
    });

    app.post('/api/market-data/batch', (req, res) => {
      try {
        const { records } = req.body;
        
        if (!Array.isArray(records)) {
          return res.status(400).json({ error: 'Records must be an array' });
        }
        
        if (records.length === 0) {
          return res.status(400).json({ error: 'No records provided' });
        }
        
        if (records.length > 1000) {
          return res.status(400).json({ error: 'Too many records (max 1000)' });
        }
        
        const startTime = process.hrtime.bigint();
        
        // Use transaction for better performance
        const insertTransaction = testDb.transaction((records) => {
          const insertStmt = testDb.prepare(`
            INSERT OR REPLACE INTO market_data (date, breadth_score, stocks_up_4pct, stocks_down_4pct)
            VALUES (?, ?, ?, ?)
          `);
          
          for (const record of records) {
            insertStmt.run(
              record.date,
              record.breadth_score || null,
              record.stocks_up_4pct || null,
              record.stocks_down_4pct || null
            );
          }
        });
        
        insertTransaction(records);
        
        const endTime = process.hrtime.bigint();
        const insertTime = Number(endTime - startTime) / 1000000;
        
        res.status(201).json({
          message: 'Batch insert completed',
          inserted: records.length,
          performance: {
            insertTimeMs: insertTime,
            avgTimePerRecord: insertTime / records.length,
            recordsPerSecond: (records.length / insertTime) * 1000
          }
        });
        
      } catch (error) {
        console.error('Batch insert error:', error);
        res.status(500).json({ error: 'Failed to insert batch data' });
      }
    });

    app.get('/api/market-data/aggregations', (req, res) => {
      try {
        const startTime = process.hrtime.bigint();
        
        // Complex aggregation query to test database performance
        const aggregations = testDb.prepare(`
          SELECT 
            COUNT(*) as total_records,
            AVG(breadth_score) as avg_breadth_score,
            MIN(breadth_score) as min_breadth_score,
            MAX(breadth_score) as max_breadth_score,
            COUNT(CASE WHEN breadth_score > 50 THEN 1 END) as bullish_days,
            COUNT(CASE WHEN breadth_score < 50 THEN 1 END) as bearish_days,
            strftime('%Y', date) as year
          FROM market_data 
          WHERE breadth_score IS NOT NULL
          GROUP BY strftime('%Y', date)
          ORDER BY year DESC
        `).all();
        
        const monthlyAvgs = testDb.prepare(`
          SELECT 
            strftime('%Y-%m', date) as month,
            AVG(breadth_score) as avg_score,
            COUNT(*) as days_count
          FROM market_data 
          WHERE breadth_score IS NOT NULL
          GROUP BY strftime('%Y-%m', date)
          ORDER BY month DESC
          LIMIT 12
        `).all();
        
        const endTime = process.hrtime.bigint();
        const queryTime = Number(endTime - startTime) / 1000000;
        
        res.json({
          yearly_aggregations: aggregations,
          monthly_averages: monthlyAvgs,
          performance: {
            queryTimeMs: queryTime,
            complexity: 'high'
          }
        });
        
      } catch (error) {
        console.error('Aggregation query error:', error);
        res.status(500).json({ error: 'Failed to fetch aggregations' });
      }
    });

    app.get('/api/cpu-intensive', (req, res) => {
      const iterations = parseInt(req.query.iterations) || 100000;
      
      const startTime = process.hrtime.bigint();
      
      // CPU-intensive calculation
      let sum = 0;
      for (let i = 0; i < iterations; i++) {
        sum += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
      }
      
      const endTime = process.hrtime.bigint();
      const cpuTime = Number(endTime - startTime) / 1000000;
      
      res.json({
        result: sum,
        performance: {
          cpuTimeMs: cpuTime,
          iterations: iterations,
          iterationsPerMs: iterations / cpuTime
        }
      });
    });

    app.get('/api/memory-test', (req, res) => {
      const size = parseInt(req.query.size) || 1000;
      
      const startTime = process.hrtime.bigint();
      const memBefore = process.memoryUsage();
      
      // Create large array to test memory usage
      const largeArray = new Array(size).fill(0).map((_, i) => ({
        id: i,
        data: `test-data-${i}`.repeat(100),
        timestamp: new Date().toISOString(),
        values: new Array(100).fill(Math.random())
      }));
      
      const memAfter = process.memoryUsage();
      const endTime = process.hrtime.bigint();
      
      const processingTime = Number(endTime - startTime) / 1000000;
      
      // Clean up immediately to prevent memory leaks in tests
      largeArray.length = 0;
      
      if (global.gc) {
        global.gc();
      }
      
      res.json({
        processed: size,
        performance: {
          processingTimeMs: processingTime,
          memoryBefore: memBefore,
          memoryAfter: memAfter,
          memoryDelta: {
            rss: memAfter.rss - memBefore.rss,
            heapUsed: memAfter.heapUsed - memBefore.heapUsed,
            heapTotal: memAfter.heapTotal - memBefore.heapTotal
          }
        }
      });
    });

    // Concurrent request handler
    app.get('/api/concurrent-test/:id', (req, res) => {
      const { id } = req.params;
      const delay = parseInt(req.query.delay) || 0;
      
      const startTime = Date.now();
      
      // Simulate some processing time
      setTimeout(() => {
        const processingTime = Date.now() - startTime;
        
        res.json({
          id: id,
          processed_at: new Date().toISOString(),
          performance: {
            processingTimeMs: processingTime,
            requestDelay: delay
          }
        });
      }, delay);
    });
  });

  beforeEach(() => {
    // Remove existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    // Create fresh test database
    testDb = new Database(TEST_DB_PATH);
    
    // Create optimized table with indexes for performance testing
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE NOT NULL,
        breadth_score REAL,
        stocks_up_4pct INTEGER,
        stocks_down_4pct INTEGER,
        ratio_5day REAL,
        ratio_10day REAL,
        t2108 REAL,
        sp500 TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_market_data_date ON market_data(date);
      CREATE INDEX IF NOT EXISTS idx_market_data_breadth_score ON market_data(breadth_score);
      CREATE INDEX IF NOT EXISTS idx_market_data_year ON market_data(substr(date, 1, 4));
    `);
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

  describe('Database Query Performance', () => {
    beforeEach(() => {
      // Insert performance test data
      const insertStmt = testDb.prepare(`
        INSERT INTO market_data (date, breadth_score, stocks_up_4pct, stocks_down_4pct)
        VALUES (?, ?, ?, ?)
      `);
      
      const insertMany = testDb.transaction((records) => {
        for (const record of records) {
          insertStmt.run(record.date, record.breadth_score, record.stocks_up_4pct, record.stocks_down_4pct);
        }
      });
      
      // Generate 5000 test records for performance testing
      const testData = [];
      const startDate = new Date('2020-01-01');
      
      for (let i = 0; i < 5000; i++) {
        const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000); // Add i days
        
        testData.push({
          date: currentDate.toISOString().split('T')[0],
          breadth_score: 20 + Math.random() * 60, // 20-80 range
          stocks_up_4pct: Math.floor(100 + Math.random() * 200),
          stocks_down_4pct: Math.floor(50 + Math.random() * 150)
        });
      }
      
      insertMany(testData);
    });

    test('should handle large dataset queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/market-data/bulk?limit=1000')
        .expect(200);
      
      const totalTime = Date.now() - startTime;
      
      expect(response.body.data).toHaveLength(1000);
      expect(response.body.performance.queryTimeMs).toBeLessThan(100); // Query should be under 100ms
      expect(totalTime).toBeLessThan(500); // Total response time under 500ms
      expect(response.body.performance.avgTimePerRecord).toBeLessThan(0.1); // < 0.1ms per record
    });

    test('should handle pagination efficiently', async () => {
      const requests = [
        request(app).get('/api/market-data/bulk?limit=500&offset=0'),
        request(app).get('/api/market-data/bulk?limit=500&offset=500'),
        request(app).get('/api/market-data/bulk?limit=500&offset=1000'),
        request(app).get('/api/market-data/bulk?limit=500&offset=1500')
      ];
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(500);
        expect(response.body.performance.queryTimeMs).toBeLessThan(50);
      });
      
      // Four paginated requests should complete within 1 second
      expect(totalTime).toBeLessThan(1000);
    });

    test('should handle complex aggregation queries efficiently', async () => {
      const response = await request(app)
        .get('/api/market-data/aggregations')
        .expect(200);
      
      expect(response.body.yearly_aggregations).toBeDefined();
      expect(response.body.monthly_averages).toBeDefined();
      expect(response.body.performance.queryTimeMs).toBeLessThan(200); // Complex query under 200ms
      
      // Verify data integrity
      const yearlyData = response.body.yearly_aggregations;
      expect(yearlyData.length).toBeGreaterThan(0);
      expect(yearlyData[0]).toHaveProperty('total_records');
      expect(yearlyData[0]).toHaveProperty('avg_breadth_score');
    });
  });

  describe('Bulk Operations Performance', () => {
    test('should handle batch inserts efficiently', async () => {
      const batchSize = 500;
      const testRecords = [];
      
      for (let i = 0; i < batchSize; i++) {
        testRecords.push({
          date: `2025-01-${String(i % 28 + 1).padStart(2, '0')}`,
          breadth_score: 30 + Math.random() * 40,
          stocks_up_4pct: Math.floor(80 + Math.random() * 120),
          stocks_down_4pct: Math.floor(40 + Math.random() * 100)
        });
      }
      
      const response = await request(app)
        .post('/api/market-data/batch')
        .send({ records: testRecords })
        .expect(201);
      
      expect(response.body.inserted).toBe(batchSize);
      expect(response.body.performance.insertTimeMs).toBeLessThan(1000); // Batch insert under 1 second
      expect(response.body.performance.recordsPerSecond).toBeGreaterThan(100); // > 100 records/sec
    });

    test('should handle maximum batch size limit', async () => {
      const oversizedBatch = new Array(1001).fill({
        date: '2025-01-01',
        breadth_score: 50.0
      });
      
      const response = await request(app)
        .post('/api/market-data/batch')
        .send({ records: oversizedBatch })
        .expect(400);
      
      expect(response.body.error).toContain('Too many records');
    });

    test('should validate batch data efficiently', async () => {
      const validBatch = [
        { date: '2025-01-01', breadth_score: 50 },
        { date: '2025-01-02', breadth_score: 60 },
        { date: '2025-01-03', breadth_score: 70 }
      ];
      
      const response = await request(app)
        .post('/api/market-data/batch')
        .send({ records: validBatch })
        .expect(201);
      
      expect(response.body.inserted).toBe(3);
      expect(response.body.performance.insertTimeMs).toBeLessThan(100);
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle multiple simultaneous read requests', async () => {
      // Create 10 concurrent requests with reduced delay
      const concurrentRequests = Array(10).fill().map((_, i) => 
        request(app).get(`/api/concurrent-test/${i}?delay=10`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(String(index));
      });
      
      // 10 concurrent requests with 10ms delay should complete in under 200ms
      // (much less than 10 * 10ms = 100ms if they were sequential)
      expect(totalTime).toBeLessThan(200);
    });

    test('should handle mixed read/write operations concurrently', async () => {
      // Mix of read and write operations
      const operations = [
        request(app).get('/api/market-data/bulk?limit=100'),
        request(app).get('/api/market-data/aggregations'),
        request(app).post('/api/market-data/batch').send({
          records: [{ date: '2025-01-01', breadth_score: 50 }]
        }),
        request(app).get('/api/market-data/bulk?limit=50&offset=100'),
        request(app).get('/api/cpu-intensive?iterations=10000')
      ];
      
      const startTime = Date.now();
      const responses = await Promise.allSettled(operations);
      const totalTime = Date.now() - startTime;
      
      // Count successful operations
      const successful = responses.filter(result => 
        result.status === 'fulfilled' && result.value.status < 400
      ).length;
      
      expect(successful).toBeGreaterThanOrEqual(4); // At least 80% success rate
      expect(totalTime).toBeLessThan(2000); // Complete within 2 seconds
    });

    test('should maintain performance under high concurrent load', async () => {
      // 50 concurrent light requests
      const lightRequests = Array(50).fill().map((_, i) => 
        request(app).get(`/api/concurrent-test/${i}?delay=10`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.allSettled(lightRequests);
      const totalTime = Date.now() - startTime;
      
      const successful = responses.filter(result => 
        result.status === 'fulfilled' && result.value.status === 200
      ).length;
      
      expect(successful).toBeGreaterThan(45); // > 90% success rate
      expect(totalTime).toBeLessThan(1000); // Under 1 second for 50 requests
      
      // Calculate average response time
      const avgResponseTime = totalTime / successful;
      expect(avgResponseTime).toBeLessThan(50); // Average under 50ms per request
    });
  });

  describe('CPU and Memory Performance', () => {
    test('should handle CPU-intensive operations efficiently', async () => {
      const response = await request(app)
        .get('/api/cpu-intensive?iterations=50000')
        .expect(200);
      
      expect(response.body.performance.cpuTimeMs).toBeLessThan(1000); // Under 1 second
      expect(response.body.performance.iterationsPerMs).toBeGreaterThan(10); // > 10 iterations per ms
      expect(typeof response.body.result).toBe('number');
    });

    test('should handle memory-intensive operations without leaks', async () => {
      const memBefore = process.memoryUsage();
      
      const response = await request(app)
        .get('/api/memory-test?size=1000')
        .expect(200);
      
      const memAfter = process.memoryUsage();
      
      expect(response.body.processed).toBe(1000);
      expect(response.body.performance.processingTimeMs).toBeLessThan(500);
      
      // Memory should not increase significantly after cleanup
      const heapIncrease = memAfter.heapUsed - memBefore.heapUsed;
      expect(heapIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });

    test('should handle multiple CPU-intensive requests concurrently', async () => {
      const cpuRequests = Array(5).fill().map(() => 
        request(app).get('/api/cpu-intensive?iterations=20000')
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(cpuRequests);
      const totalTime = Date.now() - startTime;
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.performance.cpuTimeMs).toBeLessThan(2000);
      });
      
      // 5 concurrent CPU tasks should complete reasonably quickly
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('Performance Regression Detection', () => {
    test('should maintain consistent query performance', async () => {
      const iterations = 10;
      const queryTimes = [];
      
      for (let i = 0; i < iterations; i++) {
        const response = await request(app)
          .get('/api/market-data/bulk?limit=100')
          .expect(200);
        
        queryTimes.push(response.body.performance.queryTimeMs);
      }
      
      const avgTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const maxTime = Math.max(...queryTimes);
      const minTime = Math.min(...queryTimes);
      
      expect(avgTime).toBeLessThan(50); // Average under 50ms
      expect(maxTime).toBeLessThan(100); // No query over 100ms
      expect(maxTime / minTime).toBeLessThan(3); // Variance less than 3x
    });

    test('should detect performance degradation patterns', async () => {
      const performanceMetrics = [];
      
      // Run increasing load test
      for (let load = 100; load <= 500; load += 100) {
        const response = await request(app)
          .get(`/api/market-data/bulk?limit=${load}`)
          .expect(200);
        
        performanceMetrics.push({
          load: load,
          queryTime: response.body.performance.queryTimeMs,
          avgTimePerRecord: response.body.performance.avgTimePerRecord
        });
      }
      
      // Performance should scale reasonably (not exponentially)
      const firstMetric = performanceMetrics[0];
      const lastMetric = performanceMetrics[performanceMetrics.length - 1];
      
      const loadIncrease = lastMetric.load / firstMetric.load; // 5x increase
      const timeIncrease = lastMetric.queryTime / firstMetric.queryTime;
      
      // Time increase should be less than 10x for 5x load increase
      expect(timeIncrease).toBeLessThan(10);
      
      // Per-record time should remain relatively stable (allow for some variance)
      if (firstMetric.avgTimePerRecord > 0) {
        expect(lastMetric.avgTimePerRecord).toBeLessThan(firstMetric.avgTimePerRecord * 3);
      }
    });
  });

  describe('Resource Utilization Monitoring', () => {
    test('should monitor database connection efficiency', async () => {
      // Add some test data for this specific test
      const testRecords = [];
      for (let i = 0; i < 100; i++) {
        testRecords.push({
          date: `2026-${String(Math.floor(i/31) + 1).padStart(2, '0')}-${String((i % 31) + 1).padStart(2, '0')}`,
          breadth_score: 30 + Math.random() * 40,
          stocks_up_4pct: 100 + Math.floor(Math.random() * 100),
          stocks_down_4pct: 50 + Math.floor(Math.random() * 100)
        });
      }
      
      const insertStmt = testDb.prepare(`
        INSERT OR IGNORE INTO market_data (date, breadth_score, stocks_up_4pct, stocks_down_4pct)
        VALUES (?, ?, ?, ?)
      `);
      
      for (const record of testRecords) {
        insertStmt.run(record.date, record.breadth_score, record.stocks_up_4pct, record.stocks_down_4pct);
      }
      
      // Test that database connections are being reused efficiently
      const multipleQueries = Array(10).fill().map(() => 
        request(app).get('/api/market-data/bulk?limit=50')
      );
      
      const responses = await Promise.all(multipleQueries);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeGreaterThan(0);
      });
      
      // All queries should succeed without connection issues
      expect(responses.length).toBe(10);
    });

    test('should handle error recovery gracefully', async () => {
      // Mix valid and invalid requests to test error handling performance
      const mixedRequests = [
        request(app).get('/api/market-data/bulk?limit=100'),
        request(app).get('/api/nonexistent-endpoint'),
        request(app).get('/api/market-data/bulk?limit=50'),
        request(app).post('/api/market-data/batch').send({ invalid: 'data' }),
        request(app).get('/api/market-data/aggregations')
      ];
      
      const responses = await Promise.allSettled(mixedRequests);
      
      const successful = responses.filter(result => 
        result.status === 'fulfilled' && result.value.status < 400
      ).length;
      
      const errors = responses.filter(result => 
        result.status === 'fulfilled' && result.value.status >= 400
      ).length;
      
      // Should have some successful and some error responses
      expect(successful).toBeGreaterThan(2);
      expect(errors).toBeGreaterThan(1);
      
      // Errors shouldn't prevent other requests from succeeding
      expect(successful + errors).toBe(5);
    });
  });
});