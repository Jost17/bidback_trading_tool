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

const TEST_DB_PATH = join(__dirname, 'test_error_handling.db');

describe('Error Response Handling Tests', () => {
  let app;
  let testDb;

  beforeAll(() => {
    app = express();
    app.use(cors());
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Mock API endpoints with various error conditions
    app.get('/api/test-500', (req, res) => {
      // Simulate internal server error
      throw new Error('Simulated internal server error');
    });

    app.get('/api/test-db-error', (req, res) => {
      try {
        // Attempt to use closed database
        if (!testDb || testDb.open === false) {
          throw new Error('Database connection closed');
        }
        testDb.prepare('SELECT * FROM nonexistent_table').get();
      } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
          error: 'Database operation failed',
          details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
        });
      }
    });

    app.post('/api/test-validation', (req, res) => {
      const errors = [];
      
      if (!req.body.required_field) {
        errors.push('required_field is required');
      }
      
      if (req.body.number_field && isNaN(req.body.number_field)) {
        errors.push('number_field must be a valid number');
      }
      
      if (req.body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
        errors.push('email must be a valid email address');
      }
      
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: errors
        });
      }
      
      res.json({ message: 'Validation passed', data: req.body });
    });

    app.post('/api/test-conflict', (req, res) => {
      // Simulate unique constraint violation
      if (req.body.duplicate_check === 'existing_value') {
        return res.status(409).json({
          error: 'Resource already exists',
          field: 'duplicate_check',
          value: req.body.duplicate_check
        });
      }
      
      res.status(201).json({ message: 'Resource created', id: Date.now() });
    });

    app.get('/api/test-not-found/:id', (req, res) => {
      const { id } = req.params;
      
      if (id === '999') {
        return res.status(404).json({
          error: 'Resource not found',
          resource: 'test-item',
          id: id
        });
      }
      
      res.json({ id: id, data: 'test-data' });
    });

    app.put('/api/test-unauthorized', (req, res) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Authorization header missing'
        });
      }
      
      if (authHeader !== 'Bearer valid-token') {
        return res.status(403).json({
          error: 'Access forbidden',
          message: 'Invalid token'
        });
      }
      
      res.json({ message: 'Authorized operation successful' });
    });

    app.post('/api/test-rate-limit', (req, res) => {
      // Simulate rate limiting
      const rateLimitHit = req.headers['x-test-rate-limit'] === 'true';
      
      if (rateLimitHit) {
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded',
          retryAfter: 60
        });
      }
      
      res.json({ message: 'Request processed' });
    });

    app.get('/api/test-timeout', (req, res) => {
      const shouldTimeout = req.query.timeout === 'true';
      
      if (shouldTimeout) {
        // Don't send response to simulate timeout
        return;
      }
      
      res.json({ message: 'Response sent' });
    });

    app.post('/api/test-malformed-json', (req, res) => {
      // This will be caught by express.json() middleware
      res.json({ message: 'JSON parsed successfully', data: req.body });
    });

    app.get('/api/test-database-operations', (req, res) => {
      try {
        if (!testDb) {
          throw new Error('Database not initialized');
        }

        const operation = req.query.operation;
        
        switch (operation) {
          case 'read':
            const result = testDb.prepare('SELECT COUNT(*) as count FROM market_data').get();
            res.json({ operation: 'read', result });
            break;
            
          case 'write':
            testDb.prepare('INSERT INTO market_data (date, breadth_score) VALUES (?, ?)').run(
              '2024-01-01', 50.0
            );
            res.json({ operation: 'write', message: 'Data inserted' });
            break;
            
          case 'invalid-sql':
            try {
              testDb.prepare('INVALID SQL QUERY').get();
            } catch (sqlError) {
              throw new Error('SQL syntax error: ' + sqlError.message);
            }
            break;
            
          case 'constraint-violation':
            testDb.prepare('INSERT INTO market_data (date, breadth_score) VALUES (?, ?)').run(
              '2024-01-01', 50.0  // Duplicate date
            );
            break;
            
          default:
            res.status(400).json({ error: 'Invalid operation parameter' });
        }
        
      } catch (error) {
        console.error('Database operation error:', error);
        
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          res.status(409).json({
            error: 'Constraint violation',
            message: 'Duplicate key value violates unique constraint'
          });
        } else if (error.message.includes('SQL') || error.message.includes('syntax')) {
          res.status(400).json({
            error: 'Invalid SQL operation',
            message: 'Malformed database query'
          });
        } else {
          res.status(500).json({
            error: 'Database operation failed',
            message: error.message
          });
        }
      }
    });

    // Global error handler for unhandled errors
    app.use((err, req, res, next) => {
      console.error('Unhandled error:', err);
      
      if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
          error: 'Invalid JSON',
          message: 'Request body contains malformed JSON'
        });
      }
      
      if (err.type === 'entity.too.large') {
        return res.status(413).json({
          error: 'Payload too large',
          message: 'Request body exceeds size limit'
        });
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });
  });

  beforeEach(() => {
    // Remove existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    // Create fresh test database
    testDb = new Database(TEST_DB_PATH);
    
    // Create market_data table for testing
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE NOT NULL,
        breadth_score REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
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

  describe('HTTP Status Code Handling', () => {
    test('should handle 400 Bad Request errors', async () => {
      const response = await request(app)
        .post('/api/test-validation')
        .send({}) // Missing required field
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        errors: expect.arrayContaining(['required_field is required'])
      });
    });

    test('should handle 401 Unauthorized errors', async () => {
      const response = await request(app)
        .put('/api/test-unauthorized')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Authentication required',
        message: 'Authorization header missing'
      });
    });

    test('should handle 403 Forbidden errors', async () => {
      const response = await request(app)
        .put('/api/test-unauthorized')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access forbidden',
        message: 'Invalid token'
      });
    });

    test('should handle 404 Not Found errors', async () => {
      const response = await request(app)
        .get('/api/test-not-found/999')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Resource not found',
        resource: 'test-item',
        id: '999'
      });
    });

    test('should handle 409 Conflict errors', async () => {
      const response = await request(app)
        .post('/api/test-conflict')
        .send({ duplicate_check: 'existing_value' })
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'Resource already exists',
        field: 'duplicate_check',
        value: 'existing_value'
      });
    });

    test('should handle 429 Too Many Requests errors', async () => {
      const response = await request(app)
        .post('/api/test-rate-limit')
        .set('X-Test-Rate-Limit', 'true')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'Too many requests',
        message: 'Rate limit exceeded',
        retryAfter: 60
      });
    });

    test('should handle 500 Internal Server Error', async () => {
      const response = await request(app)
        .get('/api/test-500')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      });
    });
  });

  describe('Database Error Handling', () => {
    test('should handle database connection errors', async () => {
      // Close database to simulate connection error
      testDb.close();
      testDb = null;

      const response = await request(app)
        .get('/api/test-db-error')
        .expect(500);

      expect(response.body.error).toBe('Database operation failed');
    });

    test('should handle SQL syntax errors', async () => {
      const response = await request(app)
        .get('/api/test-database-operations?operation=invalid-sql')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid SQL operation',
        message: 'Malformed database query'
      });
    });

    test('should handle constraint violation errors', async () => {
      // First insert should succeed
      await request(app)
        .get('/api/test-database-operations?operation=write')
        .expect(200);

      // Second insert with same date should fail
      const response = await request(app)
        .get('/api/test-database-operations?operation=constraint-violation')
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'Constraint violation',
        message: 'Duplicate key value violates unique constraint'
      });
    });

    test('should handle database read operations safely', async () => {
      const response = await request(app)
        .get('/api/test-database-operations?operation=read')
        .expect(200);

      expect(response.body).toMatchObject({
        operation: 'read',
        result: { count: 0 }
      });
    });
  });

  describe('Input Validation Error Handling', () => {
    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/test-validation')
        .send({
          number_field: 'not-a-number',
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          'required_field is required',
          'number_field must be a valid number',
          'email must be a valid email address'
        ])
      );
    });

    test('should pass validation with correct data', async () => {
      const response = await request(app)
        .post('/api/test-validation')
        .send({
          required_field: 'value',
          number_field: 42,
          email: 'test@example.com'
        })
        .expect(200);

      expect(response.body.message).toBe('Validation passed');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/test-malformed-json')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid JSON',
        message: 'Request body contains malformed JSON'
      });
    });

    test('should handle payload too large', async () => {
      const largePayload = 'x'.repeat(2 * 1024 * 1024); // 2MB payload
      
      const response = await request(app)
        .post('/api/test-validation')
        .set('Content-Type', 'application/json')
        .send(`{"data": "${largePayload}"}`)
        .expect(413);

      expect(response.body).toMatchObject({
        error: 'Payload too large',
        message: 'Request body exceeds size limit'
      });
    });
  });

  describe('Authentication and Authorization Errors', () => {
    test('should handle missing authentication', async () => {
      const response = await request(app)
        .put('/api/test-unauthorized')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    test('should handle invalid authentication', async () => {
      const response = await request(app)
        .put('/api/test-unauthorized')
        .set('Authorization', 'Bearer wrong-token')
        .expect(403);

      expect(response.body.error).toBe('Access forbidden');
    });

    test('should allow valid authentication', async () => {
      const response = await request(app)
        .put('/api/test-unauthorized')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.message).toBe('Authorized operation successful');
    });
  });

  describe('Timeout and Connection Error Handling', () => {
    test('should handle request timeout', async () => {
      // Test that timeout actually occurs - expect the promise to be rejected
      await expect(
        request(app)
          .get('/api/test-timeout?timeout=true')
          .timeout(100) // 100ms timeout
      ).rejects.toThrow(/timeout/i);
    }, 500); // Increase test timeout to 500ms

    test('should handle normal requests without timeout', async () => {
      const response = await request(app)
        .get('/api/test-timeout?timeout=false')
        .expect(200);

      expect(response.body.message).toBe('Response sent');
    });
  });

  describe('Error Response Format Consistency', () => {
    test('all error responses should have consistent structure', async () => {
      const errorEndpoints = [
        { method: 'get', path: '/api/test-not-found/999', status: 404 },
        { method: 'post', path: '/api/test-validation', body: {}, status: 400 },
        { method: 'post', path: '/api/test-conflict', body: { duplicate_check: 'existing_value' }, status: 409 },
        { method: 'put', path: '/api/test-unauthorized', status: 401 }
      ];

      for (const endpoint of errorEndpoints) {
        const req = request(app)[endpoint.method](endpoint.path);
        
        if (endpoint.body) {
          req.send(endpoint.body);
        }
        
        const response = await req.expect(endpoint.status);
        
        // All error responses should have an 'error' field
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');
        
        // Content-Type should be application/json
        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });

    test('error responses should include appropriate HTTP headers', async () => {
      const response = await request(app)
        .post('/api/test-rate-limit')
        .set('X-Test-Rate-Limit', 'true')
        .expect(429);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body.retryAfter).toBeDefined();
    });
  });

  describe('Edge Case Error Handling', () => {
    test('should handle empty request body gracefully', async () => {
      const response = await request(app)
        .post('/api/test-validation')
        .expect(400);

      expect(response.body.errors).toContain('required_field is required');
    });

    test('should handle missing route parameters', async () => {
      const response = await request(app)
        .get('/api/test-not-found/') // Empty parameter
        .expect(404);
    });

    test('should handle concurrent error scenarios', async () => {
      const errorRequests = Array(5).fill().map(() => 
        request(app).get('/api/test-500')
      );

      const responses = await Promise.allSettled(errorRequests);
      
      responses.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.status).toBe(500);
        }
      });
    });
  });
});