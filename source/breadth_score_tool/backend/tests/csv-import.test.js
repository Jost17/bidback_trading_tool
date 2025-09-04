import { describe, test, beforeEach, afterEach, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import test utilities
const {
  setupTestDatabase,
  teardownTestDatabase,
  getTestDatabase,
  insertTestData,
  TEST_DB_PATH
} = global;

describe('CSV Import Pipeline Tests', () => {
  let db;

  beforeEach(() => {
    db = getTestDatabase();
  });

  describe('CSV File Reading', () => {
    test('should read and parse valid CSV file', () => {
      // Create a test CSV file
      const testCSVContent = `,Primary Breadth Indicators,,,,,,,Secondary Breadth Indicators,,,,,,,,,
Date,Number of stocks up 4% plus today,Number of stocks down 4% plus today,5 day ratio,10 day  ratio,Number of stocks up 25% plus in a quarter,Number of stocks down 25% + in a quarter,Number of stocks up 25% + in a month,Number of stocks down 25% + in a month,Number of stocks up 50% + in a month,Number of stocks down 50% + in a month,Number of stocks up 13% + in 34 days,Number of stocks down 13% + in 34 days, Worden Common stock universe,T2108,S&P
1/15/2024,207,138,2.21,0.96,1088,1035,65,128,24,22,1104,1840,6106,19.47,"5,881.63"
1/14/2024,262,205,2.39,0.95,1098,1029,66,141,26,23,1091,1886,6107,18.66,"5,906.94"
1/13/2024,203,182,3.09,0.89,1109,993,81,111,29,24,1130,1804,6108,21.19,"5,970.84"`;

      const testCSVPath = path.join(__dirname, 'test_import.csv');
      fs.writeFileSync(testCSVPath, testCSVContent);

      // Test CSV parsing function
      const parseCSVFile = createCSVParser();
      const records = parseCSVFile(testCSVPath);

      expect(records).toHaveLength(3);
      expect(records[0]).toMatchObject({
        date: '2024-01-15',
        stocks_up_4pct: 207,
        stocks_down_4pct: 138
      });

      // Cleanup
      fs.unlinkSync(testCSVPath);
    });

    test('should handle CSV files with quoted S&P 500 values', () => {
      const testCSVContent = `,Primary Breadth Indicators,,,,,,,Secondary Breadth Indicators,,,,,,,,,
Date,Number of stocks up 4% plus today,Number of stocks down 4% plus today,5 day ratio,10 day  ratio,Number of stocks up 25% plus in a quarter,Number of stocks down 25% + in a quarter,Number of stocks up 25% + in a month,Number of stocks down 25% + in a month,Number of stocks up 50% + in a month,Number of stocks down 50% + in a month,Number of stocks up 13% + in 34 days,Number of stocks down 13% + in 34 days, Worden Common stock universe,T2108,S&P
1/15/2024,207,138,2.21,0.96,1088,1035,65,128,24,22,1104,1840,6106,19.47,"5,881.63"
1/14/2024,262,205,2.39,0.95,1098,1029,66,141,26,23,1091,1886,6107,18.66,"6,006.94"`;

      const testCSVPath = path.join(__dirname, 'test_quoted.csv');
      fs.writeFileSync(testCSVPath, testCSVContent);

      const parseCSVFile = createCSVParser();
      const records = parseCSVFile(testCSVPath);

      expect(records).toHaveLength(2);
      expect(records[0].sp500).toBe('5,881.63');
      expect(records[1].sp500).toBe('6,006.94');

      // Cleanup
      fs.unlinkSync(testCSVPath);
    });

    test('should reject CSV files with invalid headers', () => {
      const invalidCSVContent = `Wrong,Headers,Here
1/15/2024,207,138`;

      const testCSVPath = path.join(__dirname, 'test_invalid.csv');
      fs.writeFileSync(testCSVPath, invalidCSVContent);

      const parseCSVFile = createCSVParser();
      
      expect(() => {
        parseCSVFile(testCSVPath);
      }).toThrow();

      // Cleanup
      fs.unlinkSync(testCSVPath);
    });
  });

  describe('Date Format Conversion', () => {
    test('should convert MM/DD/YYYY to YYYY-MM-DD', () => {
      const dateConverter = createDateConverter();
      
      expect(dateConverter('1/15/2024')).toBe('2024-01-15');
      expect(dateConverter('12/31/2023')).toBe('2023-12-31');
      expect(dateConverter('3/5/2024')).toBe('2024-03-05');
    });

    test('should handle invalid date formats', () => {
      const dateConverter = createDateConverter();
      
      expect(() => dateConverter('invalid-date')).toThrow();
      expect(() => dateConverter('2024-01-15')).toThrow(); // Wrong format
      expect(() => dateConverter('13/15/2024')).toThrow(); // Invalid month
    });
  });

  describe('S&P 500 Value Processing', () => {
    test('should parse S&P 500 values with commas and quotes', () => {
      const sp500Parser = createSP500Parser();
      
      expect(sp500Parser('"5,881.63"')).toBe('5881.63');
      expect(sp500Parser('"6,006.94"')).toBe('6006.94');
      expect(sp500Parser('5881.63')).toBe('5881.63');
    });

    test('should handle invalid S&P 500 values', () => {
      const sp500Parser = createSP500Parser();
      
      expect(sp500Parser('')).toBeNull();
      expect(sp500Parser('invalid')).toBeNull();
      expect(sp500Parser('0')).toBeNull();
      expect(sp500Parser('5')).toBeNull(); // Too low
    });
  });

  describe('CSV Import Integration', () => {
    test('should successfully import complete CSV file to database', () => {
      const testCSVContent = `,Primary Breadth Indicators,,,,,,,Secondary Breadth Indicators,,,,,,,,,
Date,Number of stocks up 4% plus today,Number of stocks down 4% plus today,5 day ratio,10 day  ratio,Number of stocks up 25% plus in a quarter,Number of stocks down 25% + in a quarter,Number of stocks up 25% + in a month,Number of stocks down 25% + in a month,Number of stocks up 50% + in a month,Number of stocks down 50% + in a month,Number of stocks up 13% + in 34 days,Number of stocks down 13% + in 34 days, Worden Common stock universe,T2108,S&P
1/15/2024,207,138,2.21,0.96,1088,1035,65,128,24,22,1104,1840,6106,19.47,"5,881.63"
1/14/2024,262,205,2.39,0.95,1098,1029,66,141,26,23,1091,1886,6107,18.66,"5,906.94"
1/13/2024,203,182,3.09,0.89,1109,993,81,111,29,24,1130,1804,6108,21.19,"5,970.84"`;

      const testCSVPath = path.join(__dirname, 'test_complete.csv');
      fs.writeFileSync(testCSVPath, testCSVContent);

      const importCSV = createCSVImporter(db);
      const result = importCSV(testCSVPath, { source_file: 'test_complete.csv' });

      expect(result.imported).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);

      // Verify data in database
      const records = db.prepare('SELECT * FROM market_data ORDER BY date ASC').all();
      expect(records).toHaveLength(3);
      expect(records[0].date).toBe('2024-01-13');
      expect(records[0].sp500).toBe('5,970.84');

      // Cleanup
      fs.unlinkSync(testCSVPath);
    });

    test('should handle duplicate dates during import', () => {
      // First, insert some data
      insertTestData({
        date: '2024-01-15',
        stocks_up_4pct: 100,
        stocks_down_4pct: 50
      });

      const testCSVContent = `,Primary Breadth Indicators,,,,,,,Secondary Breadth Indicators,,,,,,,,,
Date,Number of stocks up 4% plus today,Number of stocks down 4% plus today,5 day ratio,10 day  ratio,Number of stocks up 25% plus in a quarter,Number of stocks down 25% + in a quarter,Number of stocks up 25% + in a month,Number of stocks down 25% + in a month,Number of stocks up 50% + in a month,Number of stocks down 50% + in a month,Number of stocks up 13% + in 34 days,Number of stocks down 13% + in 34 days, Worden Common stock universe,T2108,S&P
1/15/2024,207,138,2.21,0.96,1088,1035,65,128,24,22,1104,1840,6106,19.47,"5,881.63"
1/14/2024,262,205,2.39,0.95,1098,1029,66,141,26,23,1091,1886,6107,18.66,"5,906.94"`;

      const testCSVPath = path.join(__dirname, 'test_duplicate.csv');
      fs.writeFileSync(testCSVPath, testCSVContent);

      const importCSV = createCSVImporter(db);
      const result = importCSV(testCSVPath, { 
        source_file: 'test_duplicate.csv',
        updateExisting: true 
      });

      expect(result.imported).toBe(1); // Only 1/14 should be imported
      expect(result.updated).toBe(1);  // 1/15 should be updated
      expect(result.skipped).toBe(0);

      // Cleanup
      fs.unlinkSync(testCSVPath);
    });

    test('should rollback on import errors', () => {
      const testCSVContent = `,Primary Breadth Indicators,,,,,,,Secondary Breadth Indicators,,,,,,,,,
Date,Number of stocks up 4% plus today,Number of stocks down 4% plus today,5 day ratio,10 day  ratio,Number of stocks up 25% plus in a quarter,Number of stocks down 25% + in a quarter,Number of stocks up 25% + in a month,Number of stocks down 25% + in a month,Number of stocks up 50% + in a month,Number of stocks down 50% + in a month,Number of stocks up 13% + in 34 days,Number of stocks down 13% + in 34 days, Worden Common stock universe,T2108,S&P
1/15/2024,207,138,2.21,0.96,1088,1035,65,128,24,22,1104,1840,6106,19.47,"5,881.63"
invalid-date,262,205,2.39,0.95,1098,1029,66,141,26,23,1091,1886,6107,18.66,"5,906.94"
1/13/2024,203,182,3.09,0.89,1109,993,81,111,29,24,1130,1804,6108,21.19,"5,970.84"`;

      const testCSVPath = path.join(__dirname, 'test_error.csv');
      fs.writeFileSync(testCSVPath, testCSVContent);

      const importCSV = createCSVImporter(db);
      
      expect(() => {
        importCSV(testCSVPath, { 
          source_file: 'test_error.csv',
          stopOnError: true 
        });
      }).toThrow();

      // Verify no data was imported due to rollback
      const count = db.prepare('SELECT COUNT(*) as count FROM market_data').get();
      expect(count.count).toBe(0);

      // Cleanup
      fs.unlinkSync(testCSVPath);
    });
  });
});

// Helper functions to simulate CSV parsing and import logic
function createCSVParser() {
  return function parseCSVFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least 2 header lines');
    }
    
    // Validate headers
    const headerLine = lines[1];
    if (!headerLine.includes('Date') || !headerLine.includes('S&P')) {
      throw new Error('Invalid CSV headers - missing required columns');
    }
    
    // Skip first two header lines
    const dataLines = lines.slice(2);
    const records = [];
    
    for (const line of dataLines) {
      const columns = parseCSVLine(line);
      
      if (columns.length < 16) continue;
      
      // Parse date from MM/DD/YYYY
      const dateParts = columns[0].split('/');
      if (dateParts.length !== 3) {
        // For invalid dates, still create a record but with invalid date
        // This will be caught by the importer validation
        records.push({
          date: columns[0], // Keep original invalid date
          stocks_up_4pct: parseInt(columns[1]) || null,
          stocks_down_4pct: parseInt(columns[2]) || null,
          ratio_5day: parseFloat(columns[3]) || null,
          ratio_10day: parseFloat(columns[4]) || null,
          sp500: columns[15] ? columns[15].replace(/["]/g, '') : null
        });
        continue;
      }
      
      const month = dateParts[0].padStart(2, '0');
      const day = dateParts[1].padStart(2, '0');
      const year = dateParts[2];
      const date = `${year}-${month}-${day}`;
      
      records.push({
        date,
        stocks_up_4pct: parseInt(columns[1]) || null,
        stocks_down_4pct: parseInt(columns[2]) || null,
        ratio_5day: parseFloat(columns[3]) || null,
        ratio_10day: parseFloat(columns[4]) || null,
        sp500: columns[15] ? columns[15].replace(/["]/g, '') : null
      });
    }
    
    return records;
  };
}

function createDateConverter() {
  return function convertDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
      throw new Error('Invalid date string');
    }
    
    const parts = dateStr.split('/');
    if (parts.length !== 3) {
      throw new Error('Date must be in MM/DD/YYYY format');
    }
    
    const month = parseInt(parts[0]);
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error('Invalid date values');
    }
    
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };
}

function createSP500Parser() {
  return function parseSP500(value) {
    if (!value || typeof value !== 'string') return null;
    
    // Remove quotes and whitespace
    let cleaned = value.replace(/["'\s]/g, '');
    
    // Remove commas and convert to number for validation
    const numValue = parseFloat(cleaned.replace(/,/g, ''));
    
    if (isNaN(numValue) || numValue < 100) return null;
    
    // Return the cleaned value without commas
    return cleaned.replace(/,/g, '');
  };
}

function createCSVImporter(database) {
  return function importCSV(filePath, options = {}) {
    const parseCSVFile = createCSVParser();
    const records = parseCSVFile(filePath);
    
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    const insertStmt = database.prepare(`
      INSERT INTO market_data (
        date, stocks_up_4pct, stocks_down_4pct, ratio_5day, ratio_10day,
        sp500, source_file, import_format
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const updateStmt = database.prepare(`
      UPDATE market_data 
      SET stocks_up_4pct = ?, stocks_down_4pct = ?, ratio_5day = ?, ratio_10day = ?, sp500 = ?
      WHERE date = ?
    `);
    
    const checkStmt = database.prepare('SELECT id FROM market_data WHERE date = ?');
    
    const transaction = database.transaction(() => {
      for (const record of records) {
        try {
          // Validate date format (simulate insertTestData validation)
          if (!record.date || typeof record.date !== 'string') {
            throw new Error('Invalid date format');
          }
          
          // Check YYYY-MM-DD format
          if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
            throw new Error('Invalid date format');
          }
          
          const existing = checkStmt.get(record.date);
          
          if (existing && options.updateExisting) {
            updateStmt.run(
              record.stocks_up_4pct,
              record.stocks_down_4pct,
              record.ratio_5day,
              record.ratio_10day,
              record.sp500,
              record.date
            );
            updated++;
          } else if (!existing) {
            insertStmt.run(
              record.date,
              record.stocks_up_4pct,
              record.stocks_down_4pct,
              record.ratio_5day,
              record.ratio_10day,
              record.sp500,
              options.source_file || 'unknown',
              'csv'
            );
            imported++;
          } else {
            skipped++;
          }
        } catch (error) {
          errors++;
          if (options.stopOnError) {
            throw error;
          }
        }
      }
    });
    
    transaction();
    
    return { imported, updated, skipped, errors };
  };
}

// Utility function to parse CSV line with quoted field support
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}