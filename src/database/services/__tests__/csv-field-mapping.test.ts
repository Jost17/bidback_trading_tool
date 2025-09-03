/**
 * Comprehensive CSV Field Mapping Validation Tests
 * Tests the critical CSV import → form field mapping fixes implemented in breadth-service.ts
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { BreadthService } from '../breadth-service';
import type { BreadthData } from '../../../types/trading';

describe('CSV Field Mapping Validation Tests', () => {
  let db: Database.Database;
  let breadthService: BreadthService;

  // Sample Stockbee CSV data for testing
  const sampleStockbeeCSV = `Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P
01/15/2025,180,120,1.5,1.6,45,30,25,18,12,8,35,22,3500,65.4,5847
01/14/2025,165,135,1.4,1.5,42,33,23,20,10,10,32,25,3450,62.1,5820
01/13/2025,200,100,1.8,1.9,50,25,30,15,15,5,40,18,3600,70.2,5875`;

  const sampleStockbeeCSVWithHeader = `Primary Breadth Indicators
Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P
01/15/2025,180,120,1.5,1.6,45,30,25,18,12,8,35,22,3500,65.4,5847`;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    
    // Create the market_breadth table with complete schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS market_breadth (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        advancing_issues INTEGER,
        declining_issues INTEGER,
        new_highs INTEGER,
        new_lows INTEGER,
        up_volume REAL,
        down_volume REAL,
        breadth_score REAL,
        trend_strength REAL,
        market_phase TEXT,
        data_source TEXT DEFAULT 'manual',
        notes TEXT,
        stocks_up_4pct INTEGER,
        stocks_down_4pct INTEGER,
        stocks_up_25pct_quarter INTEGER,
        stocks_down_25pct_quarter INTEGER,
        stocks_up_25pct_month INTEGER,
        stocks_down_25pct_month INTEGER,
        stocks_up_50pct_month INTEGER,
        stocks_down_50pct_month INTEGER,
        stocks_up_13pct_34days INTEGER,
        stocks_down_13pct_34days INTEGER,
        stocks_up_20pct INTEGER,
        stocks_down_20pct INTEGER,
        stocks_up_20dollar INTEGER,
        stocks_down_20dollar INTEGER,
        ratio_5day REAL,
        ratio_10day REAL,
        worden_universe INTEGER,
        t2108 REAL,
        sp500 TEXT,
        source_file TEXT,
        import_format TEXT,
        data_quality_score INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    breadthService = new BreadthService(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('End-to-End CSV Import Tests', () => {
    test('should import Stockbee CSV and map fields correctly', () => {
      const result = breadthService.importFromCSV(sampleStockbeeCSV);
      
      // Verify import success
      expect(result.success).toBe(true);
      expect(result.imported).toBe(3);
      expect(result.errors).toBe(0);
      expect(result.message).toContain('Successfully imported 3 records');
      
      // Verify data was stored correctly
      const storedData = breadthService.getBreadthHistory('2025-01-13', '2025-01-15');
      expect(storedData).toHaveLength(3);
      
      // Test first record - critical field mappings
      const firstRecord = storedData.find(d => d.date === '2025-01-15');
      expect(firstRecord).toBeDefined();
      
      // CRITICAL: Test CSV field mapping fixes
      expect(firstRecord!.stocks_up_4pct).toBe(180); // up4% → stocks_up_4pct
      expect(firstRecord!.stocks_down_4pct).toBe(120); // down4% → stocks_down_4pct
      expect(firstRecord!.t2108).toBe(65.4); // T2108 → t2108
      expect(firstRecord!.sp500).toBe('5847'); // S&P → sp500
      expect(firstRecord!.ratio_5day).toBe(1.5); // 5day → ratio_5day
      expect(firstRecord!.ratio_10day).toBe(1.6); // 10day → ratio_10day
      expect(firstRecord!.worden_universe).toBe(3500); // worden → worden_universe
      
      // Test quarterly and monthly data
      expect(firstRecord!.stocks_up_25pct_quarter).toBe(45);
      expect(firstRecord!.stocks_down_25pct_quarter).toBe(30);
      expect(firstRecord!.stocks_up_25pct_month).toBe(25);
      expect(firstRecord!.stocks_down_25pct_month).toBe(18);
      expect(firstRecord!.stocks_up_50pct_month).toBe(12);
      expect(firstRecord!.stocks_down_50pct_month).toBe(8);
      expect(firstRecord!.stocks_up_13pct_34days).toBe(35);
      expect(firstRecord!.stocks_down_13pct_34days).toBe(22);
      
      // Test legacy compatibility mappings
      expect(firstRecord!.advancingIssues).toBe(180); // Should fallback to up4%
      expect(firstRecord!.decliningIssues).toBe(120); // Should fallback to down4%
      
      // Verify notes contain original CSV data
      expect(firstRecord!.notes).toContain('up4%=180');
      expect(firstRecord!.notes).toContain('down4%=120');
      expect(firstRecord!.notes).toContain('T2108=65.4');
      expect(firstRecord!.notes).toContain('SP=5847');
      
      expect(firstRecord!.dataSource).toBe('imported');
    });

    test('should handle CSV with category header correctly', () => {
      const result = breadthService.importFromCSV(sampleStockbeeCSVWithHeader);
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      
      const storedData = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      expect(storedData).toHaveLength(1);
      
      const record = storedData[0];
      expect(record.stocks_up_4pct).toBe(180);
      expect(record.stocks_down_4pct).toBe(120);
      expect(record.t2108).toBe(65.4);
    });

    test('should handle date format conversion correctly', () => {
      const result = breadthService.importFromCSV(sampleStockbeeCSV);
      expect(result.success).toBe(true);
      
      const storedData = breadthService.getBreadthHistory('2025-01-13', '2025-01-15');
      
      // Verify MM/DD/YYYY → YYYY-MM-DD conversion
      const dates = storedData.map(d => d.date).sort();
      expect(dates).toEqual(['2025-01-13', '2025-01-14', '2025-01-15']);
      
      // Verify timestamps are set to market close (4 PM)
      storedData.forEach(record => {
        expect(record.timestamp).toContain('T16:00:00');
      });
    });

    test('should detect duplicate records correctly', () => {
      // Import once
      const result1 = breadthService.importFromCSV(sampleStockbeeCSV);
      expect(result1.imported).toBe(3);
      
      // Import again - should detect duplicates
      const result2 = breadthService.importFromCSV(sampleStockbeeCSV);
      expect(result2.imported).toBe(0);
      expect(result2.skipped).toBe(3);
      expect(result2.duplicates).toHaveLength(3);
      expect(result2.duplicates).toContain('2025-01-15');
      expect(result2.duplicates).toContain('2025-01-14');
      expect(result2.duplicates).toContain('2025-01-13');
    });

    test('should handle malformed CSV gracefully', () => {
      const malformedCSV = `Date,up4%,down4%,invalid
01/15/2025,180,120
01/14/2025,165,135,extra,fields
invalid_date,not_number,not_number`;
      
      const result = breadthService.importFromCSV(malformedCSV);
      
      // Should import valid records and report errors for invalid ones
      expect(result.imported).toBeGreaterThan(0);
      expect(result.errors).toBeGreaterThan(0);
      expect(result.errorDetails.length).toBeGreaterThan(0);
    });
  });

  describe('Database Storage Validation', () => {
    test('should store all new schema columns correctly', () => {
      const testData: BreadthData = {
        date: '2025-01-15',
        timestamp: new Date().toISOString(),
        advancingIssues: 180,
        decliningIssues: 120,
        newHighs: 50,
        newLows: 20,
        upVolume: 2000000000,
        downVolume: 1000000000,
        breadthScore: 75,
        stocks_up_4pct: 180,
        stocks_down_4pct: 120,
        stocks_up_25pct_quarter: 45,
        stocks_down_25pct_quarter: 30,
        ratio_5day: 1.5,
        ratio_10day: 1.6,
        t2108: 65.4,
        sp500: '5847',
        worden_universe: 3500,
        dataSource: 'manual',
        notes: 'Test data'
      };
      
      const id = breadthService.saveBreadthData(testData);
      expect(id).toBeGreaterThan(0);
      
      // Retrieve and verify all fields
      const retrieved = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      expect(retrieved).toHaveLength(1);
      
      const record = retrieved[0];
      expect(record.stocks_up_4pct).toBe(180);
      expect(record.stocks_down_4pct).toBe(120);
      expect(record.stocks_up_25pct_quarter).toBe(45);
      expect(record.stocks_down_25pct_quarter).toBe(30);
      expect(record.ratio_5day).toBe(1.5);
      expect(record.ratio_10day).toBe(1.6);
      expect(record.t2108).toBe(65.4);
      expect(record.sp500).toBe('5847');
      expect(record.worden_universe).toBe(3500);
    });

    test('should handle null values in new columns correctly', () => {
      const minimalData: BreadthData = {
        date: '2025-01-15',
        timestamp: new Date().toISOString(),
        advancingIssues: 180,
        decliningIssues: 120,
        newHighs: 50,
        newLows: 20,
        upVolume: 2000000000,
        downVolume: 1000000000,
        breadthScore: 75,
        dataSource: 'manual'
        // All new fields intentionally undefined
      };
      
      const id = breadthService.saveBreadthData(minimalData);
      expect(id).toBeGreaterThan(0);
      
      const retrieved = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      expect(retrieved).toHaveLength(1);
      
      const record = retrieved[0];
      expect(record.stocks_up_4pct).toBeNull();
      expect(record.stocks_down_4pct).toBeNull();
      expect(record.t2108).toBeNull();
      expect(record.sp500).toBeNull();
    });
  });

  describe('Form Field Extraction Tests', () => {
    // Test the extractFromNotes function patterns (we'll simulate it here)
    const extractFromNotes = (notes: string, key: string): string | null => {
      // Replicate the logic from DataEntryForm.tsx
      const csvFieldMap: Record<string, string> = {
        'stocks_up_4pct': 'up4',
        'stocks_down_4pct': 'down4',
        't2108': 'T2108',
        'sp500': 'SP'
      };
      
      const patterns = [
        new RegExp(`${key}[=:]\\s*([^,\\n\\s]+)`, 'i'),
        ...(csvFieldMap[key] ? [
          new RegExp(`${csvFieldMap[key]}%[=:]\\s*([^,\\n\\s]+)`, 'i'),
          new RegExp(`${csvFieldMap[key]}[=:]\\s*([^,\\n\\s]+)`, 'i')
        ] : []),
        new RegExp(`${key.toUpperCase()}[=:]\\s*([^,\\n\\s]+)`, 'i'),
        new RegExp(`${key}:\\s*([^,\\n]+)`, 'i'),
        new RegExp(`"${key}":\\s*([^,\\n]+)`, 'i'),
        new RegExp(`${key}=([^,\\n\\s]+)`, 'i'),
        new RegExp(`\\b${key}\\s+([^,\\n\\s]+)`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = notes.match(pattern);
        if (match) {
          return match[1].trim().replace(/[",]/g, '');
        }
      }
      
      return null;
    };

    test('should extract CSV field formats correctly', () => {
      const notes = 'Original CSV data: up4%=180, down4%=120, T2108=65.4, SP=5847';
      
      expect(extractFromNotes(notes, 'stocks_up_4pct')).toBe('180');
      expect(extractFromNotes(notes, 'stocks_down_4pct')).toBe('120');
      expect(extractFromNotes(notes, 't2108')).toBe('65.4');
      expect(extractFromNotes(notes, 'sp500')).toBe('5847');
    });

    test('should extract database column format correctly', () => {
      const notes = 'stocks_up_4pct=180, stocks_down_4pct=120, t2108=65.4';
      
      expect(extractFromNotes(notes, 'stocks_up_4pct')).toBe('180');
      expect(extractFromNotes(notes, 'stocks_down_4pct')).toBe('120');
      expect(extractFromNotes(notes, 't2108')).toBe('65.4');
    });

    test('should handle T2108 case variations', () => {
      const testCases = [
        'T2108=65.4',
        't2108=65.4',
        'T2108: 65.4',
        '"T2108": 65.4'
      ];
      
      testCases.forEach(notes => {
        expect(extractFromNotes(notes, 't2108')).toBe('65.4');
      });
    });

    test('should handle percentage field variations', () => {
      const testCases = [
        'up4%=180',
        'up4=180',
        'stocks_up_4pct=180',
        '"up4%": 180'
      ];
      
      testCases.forEach(notes => {
        expect(extractFromNotes(notes, 'stocks_up_4pct')).toBe('180');
      });
    });

    test('should return null for missing fields', () => {
      const notes = 'up4%=180, down4%=120';
      
      expect(extractFromNotes(notes, 't2108')).toBeNull();
      expect(extractFromNotes(notes, 'nonexistent_field')).toBeNull();
    });
  });

  describe('Regression Tests', () => {
    test('should maintain T2108 functionality that was working before', () => {
      const csvWithT2108 = `Date,up4%,down4%,T2108
01/15/2025,180,120,65.4`;
      
      const result = breadthService.importFromCSV(csvWithT2108);
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      
      const storedData = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      expect(storedData).toHaveLength(1);
      expect(storedData[0].t2108).toBe(65.4);
    });

    test('should maintain legacy advancing/declining issues functionality', () => {
      const standardCSV = `Date,AdvancingIssues,DecliningIssues,NewHighs,NewLows,UpVolume,DownVolume
2025-01-15,1200,800,150,50,2500000000,1500000000`;
      
      const result = breadthService.importFromCSV(standardCSV);
      expect(result.success).toBe(true);
      
      const storedData = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      expect(storedData).toHaveLength(1);
      
      const record = storedData[0];
      expect(record.advancingIssues).toBe(1200);
      expect(record.decliningIssues).toBe(800);
      expect(record.newHighs).toBe(150);
      expect(record.newLows).toBe(50);
      expect(record.upVolume).toBe(2500000000);
      expect(record.downVolume).toBe(1500000000);
    });
  });

  describe('Browser Demo Mode Tests', () => {
    test('should create mock data that works with new schema', () => {
      const mockData: BreadthData = {
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        advancingIssues: 1200,
        decliningIssues: 800,
        newHighs: 150,
        newLows: 50,
        upVolume: 2500000000,
        downVolume: 1500000000,
        breadthScore: 72.5,
        stocks_up_4pct: 180,
        stocks_down_4pct: 120,
        stocks_up_25pct_quarter: 45,
        stocks_down_25pct_quarter: 30,
        t2108: 65.4,
        sp500: '5847',
        ratio_5day: 1.5,
        ratio_10day: 1.6,
        worden_universe: 3500,
        dataSource: 'manual',
        notes: 'Demo data with all new fields populated'
      };
      
      const id = breadthService.saveBreadthData(mockData);
      expect(id).toBeGreaterThan(0);
      
      const retrieved = breadthService.getBreadthHistory(mockData.date, mockData.date);
      expect(retrieved).toHaveLength(1);
      
      const record = retrieved[0];
      expect(record.stocks_up_4pct).toBe(180);
      expect(record.stocks_down_4pct).toBe(120);
      expect(record.t2108).toBe(65.4);
      expect(record.breadthScore).toBeGreaterThan(0);
    });
  });

  describe('Data Quality and Edge Cases', () => {
    test('should handle numeric string parsing correctly', () => {
      const csvWithNumericStrings = `Date,up4%,down4%,T2108,S&P
01/15/2025,"180","120","65.4","5,847"`;
      
      const result = breadthService.importFromCSV(csvWithNumericStrings);
      expect(result.success).toBe(true);
      
      const storedData = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      const record = storedData[0];
      
      expect(record.stocks_up_4pct).toBe(180);
      expect(record.stocks_down_4pct).toBe(120);
      expect(record.t2108).toBe(65.4);
      expect(record.sp500).toBe('5,847'); // Should preserve comma formatting for display
    });

    test('should handle empty and zero values correctly', () => {
      const csvWithEmptyValues = `Date,up4%,down4%,T2108,S&P
01/15/2025,0,,65.4,5847`;
      
      const result = breadthService.importFromCSV(csvWithEmptyValues);
      expect(result.success).toBe(true);
      
      const storedData = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      const record = storedData[0];
      
      expect(record.stocks_up_4pct).toBe(0); // Zero should be preserved
      expect(record.stocks_down_4pct).toBeNull(); // Empty should be null
      expect(record.t2108).toBe(65.4);
    });

    test('should validate imported data maintains breadth score calculation', () => {
      const result = breadthService.importFromCSV(sampleStockbeeCSV);
      expect(result.success).toBe(true);
      
      const storedData = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      const record = storedData[0];
      
      // Breadth score should be calculated during import
      expect(record.breadthScore).toBeGreaterThan(0);
      expect(record.breadthScore).toBeLessThanOrEqual(100);
      expect(record.trendStrength).toBeGreaterThanOrEqual(0);
      expect(record.marketPhase).toBeDefined();
      expect(['STRONG_BULL', 'BULL', 'NEUTRAL', 'BEAR', 'STRONG_BEAR']).toContain(record.marketPhase);
    });
  });

  describe('Performance and Load Tests', () => {
    test('should handle large CSV imports efficiently', () => {
      // Generate large CSV data
      const headerLine = 'Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P';
      const dataLines: string[] = [headerLine];
      
      // Generate 100 days of data
      for (let i = 1; i <= 100; i++) {
        const date = new Date(2025, 0, i).toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric' 
        });
        dataLines.push(`${date},${180 + i},${120 - i},1.5,1.6,45,30,25,18,12,8,35,22,3500,${65 + i * 0.1},${5847 + i}`);
      }
      
      const largeCsv = dataLines.join('\n');
      
      const startTime = performance.now();
      const result = breadthService.importFromCSV(largeCsv);
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify data integrity
      const storedData = breadthService.getBreadthHistory('2025-01-01', '2025-12-31');
      expect(storedData).toHaveLength(100);
      
      // Test specific records
      const firstRecord = storedData.find(d => d.date === '2025-01-01');
      const lastRecord = storedData.find(d => d.date.includes('2025-04-10')); // Day 100
      
      expect(firstRecord?.stocks_up_4pct).toBe(181);
      expect(firstRecord?.t2108).toBe(65.1);
      
      if (lastRecord) {
        expect(lastRecord.stocks_up_4pct).toBe(280);
        expect(lastRecord.t2108).toBe(75);
      }
    });
  });

  describe('Integration with Form Components', () => {
    test('should create notes format that form can parse back correctly', () => {
      const result = breadthService.importFromCSV(sampleStockbeeCSV);
      expect(result.success).toBe(true);
      
      const storedData = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      const record = storedData[0];
      
      // The notes should contain the original CSV data in a parseable format
      expect(record.notes).toBeDefined();
      const notes = record.notes!;
      
      // Should be able to extract back the same values
      expect(notes).toContain('up4%=180');
      expect(notes).toContain('down4%=120');
      expect(notes).toContain('T2108=65.4');
      expect(notes).toContain('SP=5847');
      
      // Notes format should be consistent for form parsing
      expect(notes).toMatch(/up4%=\d+/);
      expect(notes).toMatch(/down4%=\d+/);
      expect(notes).toMatch(/T2108=[\d.]+/);
    });
  });

  describe('Enhanced Notes Generation Tests', () => {
    test('should generate comprehensive notes with all percentage fields', () => {
      // Test the enhanced notes generation with the new buildComprehensiveNotes method
      const comprehensiveCSV = `Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P
01/15/2025,180,120,1.5,1.6,45,30,25,18,12,8,35,22,3500,65.4,5847`;

      const result = breadthService.importFromCSV(comprehensiveCSV);
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);

      const storedData = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      expect(storedData).toHaveLength(1);

      const record = storedData[0];
      const notes = record.notes!;

      // Verify all percentage fields are included in notes
      expect(notes).toContain('up4%=180');
      expect(notes).toContain('down4%=120');
      expect(notes).toContain('up25q%=45');
      expect(notes).toContain('down25q%=30');
      expect(notes).toContain('up25m%=25');
      expect(notes).toContain('down25m%=18');
      expect(notes).toContain('up50m%=12');
      expect(notes).toContain('down50m%=8');
      expect(notes).toContain('up13-34%=35');
      expect(notes).toContain('down13-34%=22');

      // Verify reference fields are included
      expect(notes).toContain('ratio5d=1.5');
      expect(notes).toContain('ratio10d=1.6');
      expect(notes).toContain('T2108=65.4');
      expect(notes).toContain('SP=5847');
      expect(notes).toContain('worden=3500');

      // Verify format consistency
      expect(notes).toStartWith('CSV: ');
      expect(notes.split(', ')).toHaveLength(15); // 15 fields total
    });

    test('should handle missing fields gracefully in notes generation', () => {
      const partialCSV = `Date,up4%,down4%,T2108
01/15/2025,180,120,65.4`;

      const result = breadthService.importFromCSV(partialCSV);
      expect(result.success).toBe(true);

      const storedData = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      const record = storedData[0];
      const notes = record.notes!;

      // Should only contain fields that have values
      expect(notes).toContain('up4%=180');
      expect(notes).toContain('down4%=120');
      expect(notes).toContain('T2108=65.4');

      // Should not contain missing fields
      expect(notes).not.toContain('up25q%=');
      expect(notes).not.toContain('ratio5d=');
      expect(notes).not.toContain('SP=');

      // Should still be valid CSV format
      expect(notes).toStartWith('CSV: ');
      expect(notes.split(', ')).toHaveLength(3); // Only 3 fields with values
    });

    test('should sanitize and validate field values in notes', () => {
      const messyCSV = `Date,up4%,down4%,T2108,S&P
01/15/2025,"180 ",120,  65.4  ,"5,847"`;

      const result = breadthService.importFromCSV(messyCSV);
      expect(result.success).toBe(true);

      const storedData = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      const record = storedData[0];
      const notes = record.notes!;

      // Values should be trimmed and properly formatted
      expect(notes).toContain('up4%=180');
      expect(notes).toContain('down4%=120');
      expect(notes).toContain('T2108=65.4');
      expect(notes).toContain('SP=5,847'); // Preserve comma formatting for S&P

      // Should not contain extra spaces
      expect(notes).not.toContain('180 ');
      expect(notes).not.toContain('  65.4');
    });

    test('should handle null and undefined values properly in notes', () => {
      const csvWithEmpties = `Date,up4%,down4%,T2108,ratio5d,worden
01/15/2025,180,,null,undefined,3500`;

      const result = breadthService.importFromCSV(csvWithEmpties);
      expect(result.success).toBe(true);

      const storedData = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      const record = storedData[0];
      const notes = record.notes!;

      // Should only include valid values
      expect(notes).toContain('up4%=180');
      expect(notes).toContain('worden=3500');

      // Should not include null/undefined/empty values
      expect(notes).not.toContain('down4%=');
      expect(notes).not.toContain('T2108=null');
      expect(notes).not.toContain('ratio5d=undefined');
    });

    test('should create notes that are parseable by extractFromNotes method', () => {
      const comprehensiveCSV = `Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P
01/15/2025,180,120,1.5,1.6,45,30,25,18,12,8,35,22,3500,65.4,5847`;

      const result = breadthService.importFromCSV(comprehensiveCSV);
      expect(result.success).toBe(true);

      const storedData = breadthService.getBreadthHistory('2025-01-15', '2025-01-15');
      const record = storedData[0];
      const notes = record.notes!;

      // Test extractFromNotes method with the generated notes
      const extracted = breadthService.extractFromNotes(notes);

      expect(extracted.up4pct).toBe(180);
      expect(extracted.down4pct).toBe(120);
      expect(extracted.up25quarter).toBe(45);
      expect(extracted.down25quarter).toBe(30);
      expect(extracted.up25month).toBe(25);
      expect(extracted.down25month).toBe(18);
      expect(extracted.up50month).toBe(12);
      expect(extracted.down50month).toBe(8);
      expect(extracted.up13day34).toBe(35);
      expect(extracted.down13day34).toBe(22);
      expect(extracted.ratio5day).toBe(1.5);
      expect(extracted.ratio10day).toBe(1.6);
      expect(extracted.t2108).toBe(65.4);
      expect(extracted.sp500).toBe('5847');
      expect(extracted.worden).toBe(3500);
    });

    test('should maintain backward compatibility with legacy notes format', () => {
      // Test that extractFromNotes still works with old format
      const legacyNotes = 'Original CSV data: up4%=180, down4%=120, T2108=65.4, SP=5847';
      
      const extracted = breadthService.extractFromNotes(legacyNotes);
      
      expect(extracted.up4pct).toBe(180);
      expect(extracted.down4pct).toBe(120);
      expect(extracted.t2108).toBe(65.4);
      expect(extracted.sp500).toBe('5847');
    });

    test('should generate fallback message for completely empty fields', () => {
      // Create a test scenario where all fields are empty/null/undefined
      const service = breadthService as any;
      const emptyFields = {
        up4pct: '',
        down4pct: null,
        up25quarter: undefined,
        t2108: 'null',
        sp500: 'undefined'
      };

      const result = service.buildComprehensiveNotes(emptyFields);
      expect(result).toBe('CSV: no valid data fields found');
    });

    test('should handle performance with large field sets efficiently', () => {
      // Test performance with complete field set
      const largeFieldSet = {
        up4pct: '180',
        down4pct: '120',
        up25quarter: '45',
        down25quarter: '30',
        up25month: '25',
        down25month: '18',
        up50month: '12',
        down50month: '8',
        up13day34: '35',
        down13day34: '22',
        ratio5day: '1.5',
        ratio10day: '1.6',
        t2108: '65.4',
        sp500: '5847',
        worden: '3500'
      };

      const service = breadthService as any;
      
      const startTime = performance.now();
      const result = service.buildComprehensiveNotes(largeFieldSet);
      const endTime = performance.now();

      expect(result).toContain('CSV: ');
      expect(result.split(', ')).toHaveLength(15);
      expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
    });
  });

  describe('Safe Number Parsing Tests', () => {
    test('should parse valid numbers correctly', () => {
      const service = breadthService as any;
      
      expect(service.safeParseNumber('123')).toBe(123);
      expect(service.safeParseNumber('123.45', 'float')).toBe(123.45);
      expect(service.safeParseNumber('0')).toBe(0);
      expect(service.safeParseNumber('-50')).toBe(-50);
    });

    test('should handle invalid values gracefully', () => {
      const service = breadthService as any;
      
      expect(service.safeParseNumber('')).toBeNull();
      expect(service.safeParseNumber('null')).toBeNull();
      expect(service.safeParseNumber('undefined')).toBeNull();
      expect(service.safeParseNumber('not_a_number')).toBeNull();
      expect(service.safeParseNumber(undefined)).toBeNull();
    });

    test('should clean formatting characters', () => {
      const service = breadthService as any;
      
      expect(service.safeParseNumber('1,234')).toBe(1234);
      expect(service.safeParseNumber('$1,234')).toBe(1234);
      expect(service.safeParseNumber('  123  ')).toBe(123);
    });
  });
});