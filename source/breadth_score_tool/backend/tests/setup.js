import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test database path
export const TEST_DB_PATH = join(__dirname, 'test_market_monitor.db');

// Global test database instance
let testDb = null;

// Setup test database before each test
export function setupTestDatabase() {
  // Remove existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  // Create new test database
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
  
  return testDb;
}

// Cleanup test database after each test
export function teardownTestDatabase() {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
  
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
}

// Get current test database instance
export function getTestDatabase() {
  return testDb;
}

// Helper to validate date format
function validateDate(date) {
  if (!date || typeof date !== 'string') {
    throw new Error('Date must be a valid string');
  }
  
  // Check YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new Error('Date must be in YYYY-MM-DD format');
  }
  
  // Parse the date components
  const [year, month, day] = date.split('-').map(Number);
  
  // Check valid ranges
  if (month < 1 || month > 12) {
    throw new Error('Invalid month');
  }
  
  if (day < 1 || day > 31) {
    throw new Error('Invalid day');
  }
  
  // Create date object and verify it matches input
  // This catches cases like Feb 30th which gets converted to March
  const dateObj = new Date(year, month - 1, day);
  if (dateObj.getFullYear() !== year || 
      dateObj.getMonth() !== month - 1 || 
      dateObj.getDate() !== day) {
    throw new Error('Invalid date');
  }
  
  return true;
}

// Helper to insert test data
export function insertTestData(data) {
  // Validate date
  validateDate(data.date);
  
  const stmt = testDb.prepare(`
    INSERT INTO market_data (
      date, stocks_up_4pct, stocks_down_4pct, ratio_5day, ratio_10day,
      stocks_up_25pct_quarter, stocks_down_25pct_quarter,
      sp500, source_file, import_format
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  return stmt.run(
    data.date,
    data.stocks_up_4pct || null,
    data.stocks_down_4pct || null,
    data.ratio_5day || null,
    data.ratio_10day || null,
    data.stocks_up_25pct_quarter || null,
    data.stocks_down_25pct_quarter || null,
    data.sp500 || null,
    data.source_file || 'test_data',
    data.import_format || 'test'
  );
}

// Setup and teardown hooks for all tests
beforeEach(() => {
  setupTestDatabase();
});

afterEach(() => {
  teardownTestDatabase();
});

// Global test utilities
global.setupTestDatabase = setupTestDatabase;
global.teardownTestDatabase = teardownTestDatabase;
global.getTestDatabase = getTestDatabase;
global.insertTestData = insertTestData;
global.TEST_DB_PATH = TEST_DB_PATH;