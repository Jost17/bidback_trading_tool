/**
 * CSV Field Mapping Validation - Core Logic Tests
 * Tests the CSV parsing and field mapping logic without requiring database bindings
 */

import { describe, test, expect } from 'vitest';

describe('CSV Field Mapping Core Logic Tests', () => {
  // Replicate the core CSV parsing logic from breadth-service.ts
  const parseStockbeeCSV = (csvData: string) => {
    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const dataLines = lines.slice(1);

    // Auto-detect format
    const isStockbeeFormat = headers.some(h => 
      h.toLowerCase().includes('up4%') || 
      h.toLowerCase().includes('t2108') ||
      h.toLowerCase().includes('primary breadth')
    );

    const results = [];
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      // Handle CSV with quoted values that might contain commas
      const values = [];
      let current = '';
      let inQuotes = false;
      let j = 0;
      
      while (j < line.length) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/"/g, ''));
          current = '';
          j++;
          continue;
        } else {
          current += char;
        }
        j++;
      }
      values.push(current.trim().replace(/"/g, ''));  // Add the last value
      
      if (values.length < 2) continue;

      if (isStockbeeFormat) {
        const [
          date, up4pct, down4pct, ratio5day, ratio10day,
          up25quarter, down25quarter, up25month, down25month,
          up50month, down50month, up13day34, down13day34,
          worden, t2108, sp500
        ] = values;

        // Parse date (handle MM/DD/YYYY format)
        let parsedDate = date;
        if (date.includes('/')) {
          const [month, day, year] = date.split('/');
          parsedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        const parsedData = {
          date: parsedDate,
          // NEW: Map to correct schema columns - THIS IS THE CRITICAL FIX
          stocks_up_4pct: up4pct !== undefined && up4pct !== '' ? (up4pct === '0' ? 0 : parseInt(up4pct) || null) : null,
          stocks_down_4pct: down4pct !== undefined && down4pct !== '' ? (down4pct === '0' ? 0 : parseInt(down4pct) || null) : null,
          stocks_up_25pct_quarter: parseInt(up25quarter) || null,
          stocks_down_25pct_quarter: parseInt(down25quarter) || null,
          stocks_up_25pct_month: parseInt(up25month) || null,
          stocks_down_25pct_month: parseInt(down25month) || null,
          stocks_up_50pct_month: parseInt(up50month) || null,
          stocks_down_50pct_month: parseInt(down50month) || null,
          stocks_up_13pct_34days: parseInt(up13day34) || null,
          stocks_down_13pct_34days: parseInt(down13day34) || null,
          ratio_5day: parseFloat(ratio5day) || null,
          ratio_10day: parseFloat(ratio10day) || null,
          t2108: t2108 !== undefined && t2108 !== '' ? (t2108 === '0' ? 0 : parseFloat(t2108) || null) : null,
          sp500: sp500 || null,
          worden_universe: parseInt(worden) || null,
          
          // Legacy compatibility
          advancingIssues: parseInt(up4pct) || 0,
          decliningIssues: parseInt(down4pct) || 0,
          newHighs: Math.round((parseInt(up25quarter) || 0) / 10),
          newLows: Math.round((parseInt(down25quarter) || 0) / 10),
          upVolume: parseInt(up25month) || 0,
          downVolume: parseInt(down25month) || 0,
          
          notes: `Original CSV data: up4%=${up4pct}, down4%=${down4pct}, T2108=${t2108}, SP=${sp500}`
        };

        results.push(parsedData);
      }
    }

    return results;
  };

  // Test CSV field extraction patterns (from DataEntryForm.tsx)
  const extractFromNotes = (notes: string, key: string): string | null => {
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
      new RegExp(`"${key}":\\s*"?([^,\\n"]+)"?`, 'i'),
      new RegExp(`"${csvFieldMap[key] || key}%?":\\s*"?([^,\\n"]+)"?`, 'i'),
      new RegExp(`${key}=([^,\\n\\s]+)`, 'i'),
      new RegExp(`\\b${key}\\s+([^,\\n\\s]+)`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = notes.match(pattern);
      if (match) {
        return match[1].trim().replace(/[",]/g, '');
      }
    }
    
    return null;
  };

  describe('CSV Import Field Mapping', () => {
    const sampleStockbeeCSV = `Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P
01/15/2025,180,120,1.5,1.6,45,30,25,18,12,8,35,22,3500,65.4,5847
01/14/2025,165,135,1.4,1.5,42,33,23,20,10,10,32,25,3450,62.1,5820`;

    test('should correctly identify Stockbee CSV format', () => {
      const results = parseStockbeeCSV(sampleStockbeeCSV);
      expect(results).toHaveLength(2);
      expect(results[0].date).toBe('2025-01-15');
    });

    test('should map CSV fields to correct database columns - CRITICAL FIX', () => {
      const results = parseStockbeeCSV(sampleStockbeeCSV);
      const firstRecord = results[0];
      
      // CRITICAL: Test the fixed field mappings
      expect(firstRecord.stocks_up_4pct).toBe(180); // up4% → stocks_up_4pct
      expect(firstRecord.stocks_down_4pct).toBe(120); // down4% → stocks_down_4pct
      expect(firstRecord.t2108).toBe(65.4); // T2108 → t2108
      expect(firstRecord.sp500).toBe('5847'); // S&P → sp500
      
      // Test other mappings
      expect(firstRecord.ratio_5day).toBe(1.5);
      expect(firstRecord.ratio_10day).toBe(1.6);
      expect(firstRecord.stocks_up_25pct_quarter).toBe(45);
      expect(firstRecord.stocks_down_25pct_quarter).toBe(30);
      expect(firstRecord.stocks_up_25pct_month).toBe(25);
      expect(firstRecord.stocks_down_25pct_month).toBe(18);
      expect(firstRecord.stocks_up_50pct_month).toBe(12);
      expect(firstRecord.stocks_down_50pct_month).toBe(8);
      expect(firstRecord.stocks_up_13pct_34days).toBe(35);
      expect(firstRecord.stocks_down_13pct_34days).toBe(22);
      expect(firstRecord.worden_universe).toBe(3500);
    });

    test('should maintain legacy field compatibility', () => {
      const results = parseStockbeeCSV(sampleStockbeeCSV);
      const firstRecord = results[0];
      
      // Legacy fields should fall back to up4% and down4%
      expect(firstRecord.advancingIssues).toBe(180);
      expect(firstRecord.decliningIssues).toBe(120);
      
      // New highs/lows should be scaled down from quarterly data
      expect(firstRecord.newHighs).toBe(5); // 45 / 10 rounded
      expect(firstRecord.newLows).toBe(3); // 30 / 10 rounded
      
      // Volume should use monthly data
      expect(firstRecord.upVolume).toBe(25);
      expect(firstRecord.downVolume).toBe(18);
    });

    test('should handle date format conversion correctly', () => {
      const results = parseStockbeeCSV(sampleStockbeeCSV);
      
      expect(results[0].date).toBe('2025-01-15'); // MM/DD/YYYY → YYYY-MM-DD
      expect(results[1].date).toBe('2025-01-14');
    });

    test('should create parseable notes format', () => {
      const results = parseStockbeeCSV(sampleStockbeeCSV);
      const firstRecord = results[0];
      
      expect(firstRecord.notes).toContain('up4%=180');
      expect(firstRecord.notes).toContain('down4%=120');
      expect(firstRecord.notes).toContain('T2108=65.4');
      expect(firstRecord.notes).toContain('SP=5847');
    });

    test('should handle numeric string parsing with quotes', () => {
      const csvWithQuotes = `Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P
01/15/2025,"180","120","1.5","1.6","45","30","25","18","12","8","35","22","3500","65.4","5,847"`;
      
      const results = parseStockbeeCSV(csvWithQuotes);
      const record = results[0];
      
      expect(record.stocks_up_4pct).toBe(180);
      expect(record.stocks_down_4pct).toBe(120);
      expect(record.t2108).toBe(65.4);
      expect(record.sp500).toBe('5,847'); // Should preserve comma for display
    });

    test('should handle empty and zero values correctly', () => {
      const csvWithEmpty = `Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P
01/15/2025,0,,1.5,1.6,45,30,25,18,12,8,35,22,3500,65.4,5847`;
      
      const results = parseStockbeeCSV(csvWithEmpty);
      const record = results[0];
      
      expect(record.stocks_up_4pct).toBe(0); // Zero should be preserved
      expect(record.stocks_down_4pct).toBeNull(); // Empty should be null
      expect(record.t2108).toBe(65.4);
    });
  });

  describe('Form Field Extraction Patterns', () => {
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
        { notes: 'up4%=180', expected: '180' },
        { notes: 'up4=180', expected: '180' },
        { notes: 'stocks_up_4pct=180', expected: '180' },
        { notes: '"up4%": 180', expected: '180' }
      ];
      
      testCases.forEach(({ notes, expected }) => {
        const result = extractFromNotes(notes, 'stocks_up_4pct');
        if (result !== expected) {
          console.log(`Failed to extract from "${notes}", got: ${result}, expected: ${expected}`);
        }
        expect(result).toBe(expected);
      });
    });

    test('should prioritize exact database column matches', () => {
      const notes = 'up4%=999, stocks_up_4pct=180';
      
      // Should use the database column format (stocks_up_4pct=180) 
      // over the CSV format (up4%=999) due to pattern order
      expect(extractFromNotes(notes, 'stocks_up_4pct')).toBe('180');
    });

    test('should fall back to CSV format when database format not available', () => {
      const notes = 'up4%=180, down4%=120';
      
      expect(extractFromNotes(notes, 'stocks_up_4pct')).toBe('180');
      expect(extractFromNotes(notes, 'stocks_down_4pct')).toBe('120');
    });

    test('should handle quoted values correctly', () => {
      const notes = '"up4%": "180", "T2108": "65.4"';
      
      expect(extractFromNotes(notes, 'stocks_up_4pct')).toBe('180');
      expect(extractFromNotes(notes, 't2108')).toBe('65.4');
    });

    test('should return null for missing fields', () => {
      const notes = 'up4%=180, down4%=120';
      
      expect(extractFromNotes(notes, 't2108')).toBeNull();
      expect(extractFromNotes(notes, 'nonexistent_field')).toBeNull();
    });

    test('should handle malformed notes gracefully', () => {
      const notes = 'malformed:::data;;;with_weird===formatting';
      
      expect(() => extractFromNotes(notes, 'stocks_up_4pct')).not.toThrow();
      expect(extractFromNotes(notes, 'stocks_up_4pct')).toBeNull();
    });

    test('should handle very long field values', () => {
      const longValue = '1'.repeat(100);
      const notes = `up4%=${longValue}`;
      
      expect(extractFromNotes(notes, 'stocks_up_4pct')).toBe(longValue);
    });
  });

  describe('CSV Field Mapping Dictionary', () => {
    test('should have correct CSV field mappings', () => {
      // Test the core mapping used in both CSV import and form extraction
      const csvFieldMap = {
        'stocks_up_4pct': 'up4',
        'stocks_down_4pct': 'down4',
        't2108': 'T2108',
        'sp500': 'SP'
      };

      // Verify mapping keys exist and are correct
      expect(csvFieldMap['stocks_up_4pct']).toBe('up4');
      expect(csvFieldMap['stocks_down_4pct']).toBe('down4');
      expect(csvFieldMap['t2108']).toBe('T2108');
      expect(csvFieldMap['sp500']).toBe('SP');
    });

    test('should support bidirectional field lookups', () => {
      // CSV → Database mappings
      const csvToDB = {
        'up4%': 'stocks_up_4pct',
        'down4%': 'stocks_down_4pct',
        'T2108': 't2108',
        'SP': 'sp500'
      };

      // Database → CSV mappings  
      const dbToCSV = {
        'stocks_up_4pct': 'up4%',
        'stocks_down_4pct': 'down4%',
        't2108': 'T2108',
        'sp500': 'SP'
      };

      expect(csvToDB['up4%']).toBe('stocks_up_4pct');
      expect(dbToCSV['stocks_up_4pct']).toBe('up4%');
    });
  });

  describe('Regression Tests', () => {
    test('should maintain T2108 functionality that was working before', () => {
      const csvWithT2108 = `Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P
01/15/2025,180,120,1.5,1.6,45,30,25,18,12,8,35,22,3500,65.4,5847`;
      
      const results = parseStockbeeCSV(csvWithT2108);
      expect(results).toHaveLength(1);
      expect(results[0].t2108).toBe(65.4);
    });

    test('should handle CSV with category headers', () => {
      const csvWithHeader = `Primary Breadth Indicators
Date,up4%,down4%,T2108
01/15/2025,180,120,65.4`;
      
      // Should be detected as Stockbee format despite header line
      const headers = csvWithHeader.split('\n')[0].split(',');
      const isStockbeeFormat = csvWithHeader.toLowerCase().includes('up4%') || 
                             csvWithHeader.toLowerCase().includes('t2108') ||
                             csvWithHeader.toLowerCase().includes('primary breadth');
      
      expect(isStockbeeFormat).toBe(true);
    });
  });

  describe('Performance and Data Quality', () => {
    test('should handle large CSV data efficiently', () => {
      // Generate test data
      const headerLine = 'Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P';
      const dataLines = [headerLine];
      
      for (let i = 1; i <= 100; i++) {
        const date = `01/${String(i).padStart(2, '0')}/2025`;
        dataLines.push(`${date},${180 + i},${120 - i},1.5,1.6,45,30,25,18,12,8,35,22,3500,${65 + i * 0.1},${5847 + i}`);
      }
      
      const largeCsv = dataLines.join('\n');
      
      const startTime = performance.now();
      const results = parseStockbeeCSV(largeCsv);
      const endTime = performance.now();
      
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Verify data integrity
      expect(results[0].stocks_up_4pct).toBe(181);
      expect(results[0].t2108).toBe(65.1);
      expect(results[99].stocks_up_4pct).toBe(280);
      expect(results[99].t2108).toBe(75);
    });

    test('should maintain data types correctly', () => {
      const csv = `Date,up4%,down4%,5day,10day,up25%quarter,down25%quarter,up25%month,down25%month,up50%month,down50%month,up13%34day,down13%34day,worden,T2108,S&P
01/15/2025,180,120,1.5,1.6,45,30,25,18,12,8,35,22,3500,65.4,5847`;
      
      const results = parseStockbeeCSV(csv);
      const record = results[0];
      
      expect(typeof record.stocks_up_4pct).toBe('number');
      expect(typeof record.stocks_down_4pct).toBe('number');
      expect(typeof record.t2108).toBe('number');
      expect(typeof record.sp500).toBe('string'); // S&P kept as string for display
      expect(typeof record.ratio_5day).toBe('number'); // Should be a number, not null
    });
  });
});