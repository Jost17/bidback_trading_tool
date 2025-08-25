import express from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { getDatabase } from '../database/init.js';
import { calculateRatios } from '../utils/ratioCalculator.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Configure multer for CSV uploads
const upload = multer({
  dest: join(dirname(fileURLToPath(import.meta.url)), '../../uploads/'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});


// Simple CSV parser
function parseSimpleCSV(csvContent) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          return reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
        }
        resolve(results.data);
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      }
    });
  });
}

// POST /api/csv-import - Simple CSV import for manual data format
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }
    
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    
    // Read CSV file
    const csvContent = await fs.readFile(filePath, 'utf8');
    const data = await parseSimpleCSV(csvContent);
    
    if (!data || data.length === 0) {
      await fs.unlink(filePath);
      return res.status(400).json({ error: 'No valid data found in CSV' });
    }
    
    const db = getDatabase();
    let imported = 0;
    let skipped = 0;
    const errors = [];
    
    // Expected field mappings (flexible)
    const fieldMappings = {
      'date': ['date', 'Date', 'DATE'],
      'stocks_up_20pct': ['stocks_up_20pct', '20% up', '20_up', 'up_20'],
      'stocks_down_20pct': ['stocks_down_20pct', '20% down', '20_down', 'down_20'],
      'stocks_up_20dollar': ['stocks_up_20dollar', '20$ up', '20dollar_up'],
      'stocks_down_20dollar': ['stocks_down_20dollar', '20$ down', '20dollar_down'],
      'stocks_up_4pct': ['stocks_up_4pct', '4% up', '4_up', 'up_4'],
      'stocks_down_4pct': ['stocks_down_4pct', '4% down', '4_down', 'down_4'],
      'stocks_up_25pct_quarter': ['stocks_up_25pct_quarter', '25% up quarter', '25_up_quarter'],
      'stocks_down_25pct_quarter': ['stocks_down_25pct_quarter', '25% down quarter', '25_down_quarter'],
      'stocks_up_25pct_month': ['stocks_up_25pct_month', '25% up month', '25_up_month'],
      'stocks_down_25pct_month': ['stocks_down_25pct_month', '25% down month', '25_down_month'],
      'stocks_up_50pct_month': ['stocks_up_50pct_month', '50% up month', '50_up_month'],
      'stocks_down_50pct_month': ['stocks_down_50pct_month', '50% down month', '50_down_month'],
      'stocks_up_13pct_34days': ['stocks_up_13pct_34days', '13% up 34days', '13_up_34'],
      'stocks_down_13pct_34days': ['stocks_down_13pct_34days', '13% down 34days', '13_down_34'],
      'sp500': ['sp500', 'S&P500', 'SP500', 's&p_500'],
      't2108': ['t2108', 'T2108', 'T-2108'],
      'worden_universe': ['worden_universe', 'worden universe', 'universe', 'total_stocks']
    };
    
    // Find actual column names in CSV
    const availableColumns = Object.keys(data[0]);
    const columnMapping = {};
    
    Object.entries(fieldMappings).forEach(([dbField, possibleNames]) => {
      for (const possibleName of possibleNames) {
        const foundColumn = availableColumns.find(col => 
          col.toLowerCase().trim() === possibleName.toLowerCase().trim()
        );
        if (foundColumn) {
          columnMapping[dbField] = foundColumn;
          break;
        }
      }
    });
    
    // Process each row
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        
        // Extract date
        const dateValue = columnMapping.date ? row[columnMapping.date] : null;
        if (!dateValue) {
          errors.push(`Row ${i + 1}: Missing date`);
          skipped++;
          continue;
        }
        
        // Prepare data for insertion
        const insertData = {
          date: new Date(dateValue).toISOString().split('T')[0],
          stocks_up_20pct: columnMapping.stocks_up_20pct ? parseFloat(row[columnMapping.stocks_up_20pct]) || null : null,
          stocks_down_20pct: columnMapping.stocks_down_20pct ? parseFloat(row[columnMapping.stocks_down_20pct]) || null : null,
          stocks_up_20dollar: columnMapping.stocks_up_20dollar ? parseFloat(row[columnMapping.stocks_up_20dollar]) || null : null,
          stocks_down_20dollar: columnMapping.stocks_down_20dollar ? parseFloat(row[columnMapping.stocks_down_20dollar]) || null : null,
          stocks_up_4pct: columnMapping.stocks_up_4pct ? parseFloat(row[columnMapping.stocks_up_4pct]) || null : null,
          stocks_down_4pct: columnMapping.stocks_down_4pct ? parseFloat(row[columnMapping.stocks_down_4pct]) || null : null,
          stocks_up_25pct_quarter: columnMapping.stocks_up_25pct_quarter ? parseFloat(row[columnMapping.stocks_up_25pct_quarter]) || null : null,
          stocks_down_25pct_quarter: columnMapping.stocks_down_25pct_quarter ? parseFloat(row[columnMapping.stocks_down_25pct_quarter]) || null : null,
          stocks_up_25pct_month: columnMapping.stocks_up_25pct_month ? parseFloat(row[columnMapping.stocks_up_25pct_month]) || null : null,
          stocks_down_25pct_month: columnMapping.stocks_down_25pct_month ? parseFloat(row[columnMapping.stocks_down_25pct_month]) || null : null,
          stocks_up_50pct_month: columnMapping.stocks_up_50pct_month ? parseFloat(row[columnMapping.stocks_up_50pct_month]) || null : null,
          stocks_down_50pct_month: columnMapping.stocks_down_50pct_month ? parseFloat(row[columnMapping.stocks_down_50pct_month]) || null : null,
          stocks_up_13pct_34days: columnMapping.stocks_up_13pct_34days ? parseFloat(row[columnMapping.stocks_up_13pct_34days]) || null : null,
          stocks_down_13pct_34days: columnMapping.stocks_down_13pct_34days ? parseFloat(row[columnMapping.stocks_down_13pct_34days]) || null : null,
          sp500: columnMapping.sp500 ? row[columnMapping.sp500] : null,
          t2108: columnMapping.t2108 ? parseFloat(row[columnMapping.t2108]) || null : null,
          worden_universe: columnMapping.worden_universe ? parseFloat(row[columnMapping.worden_universe]) || null : null
        };
        
        // Calculate 5-day and 10-day ratios
        const calculations = calculateRatios(insertData, db);
        
        const sql = `
          INSERT OR IGNORE INTO market_data (
            date, stocks_up_20pct, stocks_down_20pct, stocks_up_20dollar, stocks_down_20dollar,
            stocks_up_4pct, stocks_down_4pct, ratio_5day, ratio_10day,
            stocks_up_25pct_quarter, stocks_down_25pct_quarter,
            stocks_up_25pct_month, stocks_down_25pct_month,
            stocks_up_50pct_month, stocks_down_50pct_month,
            stocks_up_13pct_34days, stocks_down_13pct_34days,
            worden_universe, t2108, sp500, source_file, import_format, data_quality_score
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
          insertData.date,
          insertData.stocks_up_20pct,
          insertData.stocks_down_20pct,
          insertData.stocks_up_20dollar,
          insertData.stocks_down_20dollar,
          insertData.stocks_up_4pct,
          insertData.stocks_down_4pct,
          calculations.ratio_5day || null,
          calculations.ratio_10day || null,
          insertData.stocks_up_25pct_quarter,
          insertData.stocks_down_25pct_quarter,
          insertData.stocks_up_25pct_month,
          insertData.stocks_down_25pct_month,
          insertData.stocks_up_50pct_month,
          insertData.stocks_down_50pct_month,
          insertData.stocks_up_13pct_34days,
          insertData.stocks_down_13pct_34days,
          insertData.worden_universe,
          insertData.t2108,
          insertData.sp500,
          originalName,
          'csv_import_v2',
          0.9 // Good quality for CSV imports
        ];
        
        const result = db.prepare(sql).run(params);
        
        if (result.changes > 0) {
          imported++;
        } else {
          skipped++;
        }
        
      } catch (rowError) {
        errors.push(`Row ${i + 1}: ${rowError.message}`);
        skipped++;
      }
    }
    
    // Clean up uploaded file
    await fs.unlink(filePath);
    
    res.json({
      success: true,
      imported,
      skipped,
      errors: errors.length,
      errorDetails: errors.slice(0, 5), // Show first 5 errors
      columnMapping: Object.keys(columnMapping),
      message: `Successfully imported ${imported} records, skipped ${skipped}`
    });
    
  } catch (error) {
    console.error('CSV import error:', error);
    
    // Clean up file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to import CSV data',
      details: error.message 
    });
  }
});

export default router;