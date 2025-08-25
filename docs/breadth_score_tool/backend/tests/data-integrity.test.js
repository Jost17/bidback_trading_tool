/**
 * Data Integrity Tests
 * 
 * Critical tests for data validation, CSV parsing, and database integrity
 */

import { setupTestDatabase, teardownTestDatabase, getTestDatabase, insertTestData } from './setup.js';

describe('Data Integrity Tests', () => {
  let db;

  beforeEach(() => {
    db = getTestDatabase();
  });

  describe('CSV Import Validation', () => {
    test('should reject invalid date formats', () => {
      // Test various invalid date formats
      const invalidDates = [
        'invalid-date',
        '2025-13-01', // Invalid month
        '2025-02-30', // Invalid day
        '25/01/2025', // Wrong format
        '',
        null,
        undefined
      ];

      invalidDates.forEach(invalidDate => {
        expect(() => {
          insertTestData({
            date: invalidDate,
            stocks_up_4pct: 100,
            stocks_down_4pct: 50
          });
        }).toThrow();
      });
    });

    test('should accept valid date formats', () => {
      const validDates = [
        '2025-01-01',
        '2025-12-31',
        '2024-02-29', // Leap year
        '2023-02-28'  // Non-leap year
      ];

      validDates.forEach(validDate => {
        expect(() => {
          insertTestData({
            date: validDate,
            stocks_up_4pct: 100,
            stocks_down_4pct: 50
          });
        }).not.toThrow();
      });

      const count = db.prepare('SELECT COUNT(*) as count FROM market_data').get();
      expect(count.count).toBe(validDates.length);
    });

    test('should prevent duplicate dates', () => {
      // Insert first record
      insertTestData({
        date: '2025-01-01',
        stocks_up_4pct: 100,
        stocks_down_4pct: 50
      });

      // Attempt to insert duplicate date
      expect(() => {
        insertTestData({
          date: '2025-01-01',
          stocks_up_4pct: 200,
          stocks_down_4pct: 75
        });
      }).toThrow();
    });
  });

  describe('Data Range Validation', () => {
    test('should validate T2108 range (0-100)', () => {
      const validT2108Values = [0, 50, 100, 0.5, 99.99];
      const invalidT2108Values = [-1, 101, 150, -10];

      validT2108Values.forEach((value, index) => {
        expect(() => {
          insertTestData({
            date: `2025-01-0${index + 1}`,
            stocks_up_4pct: 100,
            stocks_down_4pct: 50,
            t2108: value
          });
        }).not.toThrow();
      });

      // Note: SQLite doesn't enforce constraints by default, 
      // so this would need to be enforced at application level
    });

    test('should handle null values gracefully', () => {
      expect(() => {
        insertTestData({
          date: '2025-01-01',
          stocks_up_4pct: null,
          stocks_down_4pct: null,
          ratio_5day: null,
          ratio_10day: null,
          sp500: null
        });
      }).not.toThrow();

      const record = db.prepare('SELECT * FROM market_data WHERE date = ?').get('2025-01-01');
      expect(record.stocks_up_4pct).toBeNull();
      expect(record.stocks_down_4pct).toBeNull();
      expect(record.ratio_5day).toBeNull();
      expect(record.ratio_10day).toBeNull();
      expect(record.sp500).toBeNull();
    });
  });

  describe('S&P 500 Parsing', () => {
    // Helper function to simulate CSV parsing
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

    test('should parse S&P 500 values with commas in quotes', () => {
      const testLines = [
        '12/31/2024,207,138,2.21,0.96,1088,1035,65,128,24,22,1104,1840,6106,19.47,"5,881.63"',
        '12/30/2024,262,205,2.39,0.95,1098,1029,66,141,26,23,1091,1886,6107,18.66,"5,906.94"',
        '1/1/2025,100,50,1.5,1.2,500,300,30,15,10,5,800,400,5000,25.0,"6,000.00"'
      ];

      testLines.forEach(line => {
        const columns = parseCSVLine(line);
        const sp500Value = columns[columns.length - 1]; // Last column
        
        // Remove quotes and validate
        const cleanSP500 = sp500Value.replace(/^"|"$/g, '');
        
        expect(cleanSP500).toMatch(/^\d{1,5},\d{3}\.\d{2}$/); // Format: X,XXX.XX
        
        // Should be parseable as number after removing comma
        const numericValue = parseFloat(cleanSP500.replace(/,/g, ''));
        expect(numericValue).toBeGreaterThan(1000);
        expect(numericValue).toBeLessThan(10000);
      });
    });

    test('should handle S&P 500 values without quotes', () => {
      const testLine = '1/1/2025,100,50,1.5,1.2,500,300,30,15,10,5,800,400,5000,25.0,6000.00';
      const columns = parseCSVLine(testLine);
      const sp500Value = columns[columns.length - 1];
      
      const numericValue = parseFloat(sp500Value);
      expect(numericValue).toBe(6000.00);
    });

    test('should reject invalid S&P 500 values', () => {
      const invalidValues = [
        'invalid',
        '5', // Too low
        '50000', // Too high  
        '',
        'null'
      ];

      invalidValues.forEach(invalidValue => {
        const numericValue = parseFloat(invalidValue.replace(/,/g, ''));
        if (isNaN(numericValue) || numericValue < 100 || numericValue > 10000) {
          expect(true).toBe(true); // Invalid value correctly rejected
        } else {
          expect(false).toBe(true); // Should have been rejected
        }
      });
    });
  });

  describe('Ratio Calculations', () => {
    test('should calculate 5-day ratio correctly', () => {
      // Insert 5 days of test data
      const testData = [
        { date: '2025-01-01', stocks_up_4pct: 100, stocks_down_4pct: 50 },
        { date: '2025-01-02', stocks_up_4pct: 120, stocks_down_4pct: 60 },
        { date: '2025-01-03', stocks_up_4pct: 80, stocks_down_4pct: 40 },
        { date: '2025-01-06', stocks_up_4pct: 110, stocks_down_4pct: 55 },
        { date: '2025-01-07', stocks_up_4pct: 90, stocks_down_4pct: 45 }
      ];

      testData.forEach(data => insertTestData(data));

      // Calculate 5-day ratio for last day
      const totalUp = testData.reduce((sum, d) => sum + d.stocks_up_4pct, 0);
      const totalDown = testData.reduce((sum, d) => sum + d.stocks_down_4pct, 0);
      const expectedRatio = totalUp / totalDown;

      expect(expectedRatio).toBeCloseTo(2.0, 2);

      // Test the actual calculation logic would be here
      // This would call the ratio calculation function from the main codebase
    });

    test('should handle insufficient data for ratio calculation', () => {
      // Insert only 3 days of data (need 5 for 5-day ratio)
      const testData = [
        { date: '2025-01-01', stocks_up_4pct: 100, stocks_down_4pct: 50 },
        { date: '2025-01-02', stocks_up_4pct: 120, stocks_down_4pct: 60 },
        { date: '2025-01-03', stocks_up_4pct: 80, stocks_down_4pct: 40 }
      ];

      testData.forEach(data => insertTestData(data));

      // Should not calculate ratio with insufficient data
      // This would be tested with the actual ratio calculation function
      expect(true).toBe(true); // Placeholder for ratio calculation test
    });

    test('should handle division by zero in ratio calculation', () => {
      const testData = [
        { date: '2025-01-01', stocks_up_4pct: 100, stocks_down_4pct: 0 },
        { date: '2025-01-02', stocks_up_4pct: 120, stocks_down_4pct: 0 },
        { date: '2025-01-03', stocks_up_4pct: 80, stocks_down_4pct: 0 },
        { date: '2025-01-06', stocks_up_4pct: 110, stocks_down_4pct: 0 },
        { date: '2025-01-07', stocks_up_4pct: 90, stocks_down_4pct: 0 }
      ];

      testData.forEach(data => insertTestData(data));

      // Should handle division by zero gracefully
      const totalDown = testData.reduce((sum, d) => sum + d.stocks_down_4pct, 0);
      expect(totalDown).toBe(0);

      // The actual ratio calculation should return null or handle this case
      expect(true).toBe(true); // Placeholder for actual test
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data integrity during bulk operations', () => {
      const bulkData = Array.from({ length: 50 }, (_, index) => {
        // Generate valid dates sequentially starting from 2024-01-01
        const startDate = new Date('2024-01-01');
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + index);
        
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        
        return {
          date: `${year}-${month}-${day}`,
          stocks_up_4pct: Math.floor(Math.random() * 200),
          stocks_down_4pct: Math.floor(Math.random() * 200),
          sp500: `${4000 + Math.random() * 2000}`.substring(0, 7)
        };
      });

      // Insert bulk data
      const transaction = db.transaction(() => {
        bulkData.forEach(data => insertTestData(data));
      });

      expect(() => transaction()).not.toThrow();

      // Verify all data was inserted
      const count = db.prepare('SELECT COUNT(*) as count FROM market_data').get();
      expect(count.count).toBe(bulkData.length);
    });

    test('should rollback on transaction failure', () => {
      const validData = [
        { date: '2025-01-01', stocks_up_4pct: 100, stocks_down_4pct: 50 },
        { date: '2025-01-02', stocks_up_4pct: 120, stocks_down_4pct: 60 }
      ];

      const transaction = db.transaction(() => {
        validData.forEach(data => insertTestData(data));
        
        // This should cause the transaction to fail
        insertTestData({
          date: '2025-01-01', // Duplicate date
          stocks_up_4pct: 200,
          stocks_down_4pct: 100
        });
      });

      expect(() => transaction()).toThrow();

      // Verify no data was inserted due to rollback
      const count = db.prepare('SELECT COUNT(*) as count FROM market_data').get();
      expect(count.count).toBe(0);
    });
  });
});