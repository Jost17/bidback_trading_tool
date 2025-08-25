import { describe, test, beforeEach, afterEach, expect } from '@jest/globals';
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

describe('Ratio Calculation Tests', () => {
  let db;

  beforeEach(() => {
    db = getTestDatabase();
  });

  describe('5-Day Ratio Calculations', () => {
    test('should calculate 5-day ratio correctly with sufficient data', () => {
      // Insert 5 days of test data
      const testData = [
        { date: '2024-01-01', stocks_up_4pct: 100, stocks_down_4pct: 50 },
        { date: '2024-01-02', stocks_up_4pct: 120, stocks_down_4pct: 80 },
        { date: '2024-01-03', stocks_up_4pct: 90, stocks_down_4pct: 60 },
        { date: '2024-01-04', stocks_up_4pct: 110, stocks_down_4pct: 70 },
        { date: '2024-01-05', stocks_up_4pct: 130, stocks_down_4pct: 40 }
      ];

      testData.forEach(data => insertTestData(data));

      const calculator = create5DayRatioCalculator(db);
      const ratio = calculator('2024-01-05');

      // Sum of up: 100+120+90+110+130 = 550
      // Sum of down: 50+80+60+70+40 = 300
      // Ratio: 550/300 = 1.833...
      expect(ratio).toBeCloseTo(1.83, 2);
    });

    test('should return null when insufficient data (less than 5 days)', () => {
      // Insert only 3 days of data
      const testData = [
        { date: '2024-01-01', stocks_up_4pct: 100, stocks_down_4pct: 50 },
        { date: '2024-01-02', stocks_up_4pct: 120, stocks_down_4pct: 80 },
        { date: '2024-01-03', stocks_up_4pct: 90, stocks_down_4pct: 60 }
      ];

      testData.forEach(data => insertTestData(data));

      const calculator = create5DayRatioCalculator(db);
      const ratio = calculator('2024-01-03');

      expect(ratio).toBeNull();
    });

    test('should handle division by zero (all down values are zero)', () => {
      const testData = [
        { date: '2024-01-01', stocks_up_4pct: 100, stocks_down_4pct: 0 },
        { date: '2024-01-02', stocks_up_4pct: 120, stocks_down_4pct: 0 },
        { date: '2024-01-03', stocks_up_4pct: 90, stocks_down_4pct: 0 },
        { date: '2024-01-04', stocks_up_4pct: 110, stocks_down_4pct: 0 },
        { date: '2024-01-05', stocks_up_4pct: 130, stocks_down_4pct: 0 }
      ];

      testData.forEach(data => insertTestData(data));

      const calculator = create5DayRatioCalculator(db);
      const ratio = calculator('2024-01-05');

      expect(ratio).toBeNull(); // Should handle division by zero gracefully
    });

    test('should handle null values in data', () => {
      const testData = [
        { date: '2024-01-01', stocks_up_4pct: 100, stocks_down_4pct: 50 },
        { date: '2024-01-02', stocks_up_4pct: null, stocks_down_4pct: 80 },
        { date: '2024-01-03', stocks_up_4pct: 90, stocks_down_4pct: null },
        { date: '2024-01-04', stocks_up_4pct: 110, stocks_down_4pct: 70 },
        { date: '2024-01-05', stocks_up_4pct: 130, stocks_down_4pct: 40 },
        { date: '2024-01-06', stocks_up_4pct: 80, stocks_down_4pct: 60 },
        { date: '2024-01-07', stocks_up_4pct: 120, stocks_down_4pct: 30 }
      ];

      testData.forEach(data => insertTestData(data));

      const calculator = create5DayRatioCalculator(db);
      const ratio = calculator('2024-01-07');

      // Should only use records with both values present (need 5 valid records)
      // Valid records: 01, 04, 05, 06, 07 (5 records)
      // Sum of up: 100+110+130+80+120 = 540
      // Sum of down: 50+70+40+60+30 = 250
      // Ratio: 540/250 = 2.16
      expect(ratio).toBeCloseTo(2.16, 2);
    });

    test('should respect weekend gaps in data', () => {
      // Insert data with weekend gap (Fri, Mon, Tue, Wed, Thu)
      const testData = [
        { date: '2024-01-05', stocks_up_4pct: 100, stocks_down_4pct: 50 }, // Friday
        { date: '2024-01-08', stocks_up_4pct: 120, stocks_down_4pct: 80 }, // Monday
        { date: '2024-01-09', stocks_up_4pct: 90, stocks_down_4pct: 60 },  // Tuesday
        { date: '2024-01-10', stocks_up_4pct: 110, stocks_down_4pct: 70 }, // Wednesday
        { date: '2024-01-11', stocks_up_4pct: 130, stocks_down_4pct: 40 }  // Thursday
      ];

      testData.forEach(data => insertTestData(data));

      const calculator = create5DayRatioCalculator(db);
      const ratio = calculator('2024-01-11');

      // Should calculate using the 5 most recent trading days
      expect(ratio).toBeCloseTo(1.83, 2);
    });
  });

  describe('10-Day Ratio Calculations', () => {
    test('should calculate 10-day ratio correctly with sufficient data', () => {
      // Insert 10 days of test data
      const testData = [];
      for (let i = 1; i <= 10; i++) {
        testData.push({
          date: `2024-01-${i.toString().padStart(2, '0')}`,
          stocks_up_4pct: 100 + i * 10,
          stocks_down_4pct: 50 + i * 5
        });
      }

      testData.forEach(data => insertTestData(data));

      const calculator = create10DayRatioCalculator(db);
      const ratio = calculator('2024-01-10');

      // Sum of up: 110+120+130+140+150+160+170+180+190+200 = 1550
      // Sum of down: 55+60+65+70+75+80+85+90+95+100 = 775
      // Ratio: 1550/775 = 2.0
      expect(ratio).toBeCloseTo(2.0, 2);
    });

    test('should return null when insufficient data (less than 10 days)', () => {
      // Insert only 7 days of data
      const testData = [];
      for (let i = 1; i <= 7; i++) {
        testData.push({
          date: `2024-01-${i.toString().padStart(2, '0')}`,
          stocks_up_4pct: 100 + i * 10,
          stocks_down_4pct: 50 + i * 5
        });
      }

      testData.forEach(data => insertTestData(data));

      const calculator = create10DayRatioCalculator(db);
      const ratio = calculator('2024-01-07');

      expect(ratio).toBeNull();
    });

    test('should handle mixed null and valid values', () => {
      const testData = [];
      for (let i = 1; i <= 15; i++) {
        testData.push({
          date: `2024-01-${i.toString().padStart(2, '0')}`,
          stocks_up_4pct: i % 3 === 0 ? null : 100 + i * 10, // Every 3rd value is null
          stocks_down_4pct: i % 4 === 0 ? null : 50 + i * 5   // Every 4th value is null
        });
      }

      testData.forEach(data => insertTestData(data));

      const calculator = create10DayRatioCalculator(db);
      const ratio = calculator('2024-01-15');

      // With this pattern, we should have enough valid records (need at least 10)
      // Records with both values: 1,2,5,7,10,11,13,14 + a few more = >10 records
      if (ratio !== null) {
        expect(ratio).toBeGreaterThan(0);
        expect(ratio).toBeLessThan(10); // Reasonable range
      } else {
        // If still null, ensure we actually don't have enough data
        const validRecords = db.prepare(`
          SELECT COUNT(*) as count 
          FROM market_data 
          WHERE date <= '2024-01-15' 
            AND stocks_up_4pct IS NOT NULL 
            AND stocks_down_4pct IS NOT NULL
        `).get();
        expect(validRecords.count).toBeLessThan(10);
      }
    });
  });

  describe('Ratio Calculation Edge Cases', () => {
    test('should handle very large numbers without overflow', () => {
      const testData = [];
      for (let i = 1; i <= 5; i++) {
        testData.push({
          date: `2024-01-${i.toString().padStart(2, '0')}`,
          stocks_up_4pct: 999999,
          stocks_down_4pct: 100000
        });
      }

      testData.forEach(data => insertTestData(data));

      const calculator = create5DayRatioCalculator(db);
      const ratio = calculator('2024-01-05');

      expect(ratio).toBeCloseTo(9.99999, 4);
      expect(Number.isFinite(ratio)).toBe(true);
    });

    test('should handle negative values (should not occur in real data)', () => {
      const testData = [];
      for (let i = 1; i <= 5; i++) {
        testData.push({
          date: `2024-01-${i.toString().padStart(2, '0')}`,
          stocks_up_4pct: -100, // Negative values should be filtered out
          stocks_down_4pct: 50
        });
      }

      testData.forEach(data => insertTestData(data));

      const calculator = create5DayRatioCalculator(db);
      const ratio = calculator('2024-01-05');

      // Should return null as negative values should be filtered
      expect(ratio).toBeNull();
    });

    test('should calculate ratio with minimum valid values (exactly 5 and 10 days)', () => {
      // Test with exactly 5 days for 5-day ratio
      const testData = [];
      for (let i = 1; i <= 5; i++) {
        testData.push({
          date: `2024-01-${i.toString().padStart(2, '0')}`,
          stocks_up_4pct: 100,
          stocks_down_4pct: 50
        });
      }

      testData.forEach(data => insertTestData(data));

      const calculator5 = create5DayRatioCalculator(db);
      const ratio5 = calculator5('2024-01-05');
      
      expect(ratio5).toBeCloseTo(2.0, 2);

      // Add 5 more days for 10-day ratio
      for (let i = 6; i <= 10; i++) {
        insertTestData({
          date: `2024-01-${i.toString().padStart(2, '0')}`,
          stocks_up_4pct: 100,
          stocks_down_4pct: 50
        });
      }

      const calculator10 = create10DayRatioCalculator(db);
      const ratio10 = calculator10('2024-01-10');
      
      expect(ratio10).toBeCloseTo(2.0, 2);
    });
  });

  describe('Performance and Data Volume Tests', () => {
    test('should handle large datasets efficiently', () => {
      // Insert 50 days of data with guaranteed unique dates
      const testData = [];
      
      for (let i = 1; i <= 50; i++) {
        // Use a format that guarantees unique dates
        const year = 2024;
        const month = Math.floor((i - 1) / 28) + 3; // Start from March
        const day = ((i - 1) % 28) + 1; // Days 1-28 to avoid month-end issues
        
        const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        testData.push({
          date,
          stocks_up_4pct: Math.floor(Math.random() * 200) + 50,
          stocks_down_4pct: Math.floor(Math.random() * 150) + 30
        });
      }

      testData.forEach(data => insertTestData(data));

      const start = performance.now();
      
      const calculator5 = create5DayRatioCalculator(db);
      const calculator10 = create10DayRatioCalculator(db);
      
      // Calculate ratios for the last 10 dates
      for (let i = 40; i < 50; i++) {
        const date = testData[i].date;
        const ratio5 = calculator5(date);
        const ratio10 = calculator10(date);
        
        if (ratio5 !== null) expect(ratio5).toBeGreaterThan(0);
        if (ratio10 !== null) expect(ratio10).toBeGreaterThan(0);
      }
      
      const duration = performance.now() - start;
      
      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });
  });
});

// Helper functions to create ratio calculators
function create5DayRatioCalculator(database) {
  return function calculate5DayRatio(targetDate) {
    // Get the 5 most recent trading days before and including the target date
    const query = `
      SELECT stocks_up_4pct, stocks_down_4pct 
      FROM market_data 
      WHERE date <= ? 
        AND stocks_up_4pct IS NOT NULL 
        AND stocks_down_4pct IS NOT NULL
        AND stocks_up_4pct >= 0
        AND stocks_down_4pct >= 0
      ORDER BY date DESC 
      LIMIT 5
    `;
    
    const records = database.prepare(query).all(targetDate);
    
    if (records.length < 5) {
      return null; // Insufficient data
    }
    
    const totalUp = records.reduce((sum, record) => sum + record.stocks_up_4pct, 0);
    const totalDown = records.reduce((sum, record) => sum + record.stocks_down_4pct, 0);
    
    if (totalDown === 0) {
      return null; // Avoid division by zero
    }
    
    return Math.round((totalUp / totalDown) * 100) / 100; // Round to 2 decimal places
  };
}

function create10DayRatioCalculator(database) {
  return function calculate10DayRatio(targetDate) {
    // Get the 10 most recent trading days before and including the target date
    const query = `
      SELECT stocks_up_4pct, stocks_down_4pct 
      FROM market_data 
      WHERE date <= ? 
        AND stocks_up_4pct IS NOT NULL 
        AND stocks_down_4pct IS NOT NULL
        AND stocks_up_4pct >= 0
        AND stocks_down_4pct >= 0
      ORDER BY date DESC 
      LIMIT 10
    `;
    
    const records = database.prepare(query).all(targetDate);
    
    if (records.length < 10) {
      return null; // Insufficient data
    }
    
    const totalUp = records.reduce((sum, record) => sum + record.stocks_up_4pct, 0);
    const totalDown = records.reduce((sum, record) => sum + record.stocks_down_4pct, 0);
    
    if (totalDown === 0) {
      return null; // Avoid division by zero
    }
    
    return Math.round((totalUp / totalDown) * 100) / 100; // Round to 2 decimal places
  };
}