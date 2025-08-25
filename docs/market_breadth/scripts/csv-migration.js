/**
 * CSV Migration Script for Historical Market Breadth Data (2007-2024)
 * 
 * This script normalizes different CSV formats and migrates them to PostgreSQL
 * according to the trading tool requirements from claude.md
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class CSVMigration {
  constructor() {
    this.processedData = [];
    this.errorLog = [];
  }

  /**
   * Normalize CSV data from different formats to unified schema
   * @param {string} filePath - Path to CSV file
   * @param {object} columnMapping - Mapping of CSV columns to standard fields
   */
  async normalizeCsvData(filePath, columnMapping) {
    return new Promise((resolve, reject) => {
      const results = [];
      const headerIndex = columnMapping._headerIndex || 0;
      
      // Read file manually to handle multi-row headers
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length <= headerIndex) {
        console.warn(`File ${filePath} has insufficient data`);
        resolve([]);
        return;
      }
      
      // Get header row
      const headerRow = lines[headerIndex];
      const headers = headerRow.split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Process data rows (skip header and any preceding rows)
      for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.split(',').every(cell => !cell.trim())) continue; // Skip empty rows
        
        // Parse CSV line properly handling quoted values
        const values = this.parseCSVLine(line);
        
        // Create row object
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });
        
        try {
          const normalizedRow = this.mapColumns(rowData, columnMapping);
          results.push(normalizedRow);
        } catch (error) {
          this.errorLog.push({
            file: filePath,
            row: rowData,
            error: error.message
          });
        }
      }
      
      console.log(`Processed ${results.length} rows from ${filePath}`);
      resolve(results);
    });
  }

  /**
   * Map CSV columns to standardized field names
   * @param {object} row - CSV row data
   * @param {object} mapping - Column mapping configuration
   */
  mapColumns(row, mapping) {
    const standardRow = {
      date: null,
      stocks_up_4pct_daily: null,
      stocks_down_4pct_daily: null,
      stocks_up_25pct_quarterly: null,
      stocks_down_25pct_quarterly: null,
      stocks_up_25pct_monthly: null,
      stocks_down_25pct_monthly: null,
      stocks_up_50pct_monthly: null,
      stocks_down_50pct_monthly: null,
      stocks_up_13pct_34days: null,
      stocks_down_13pct_34days: null,
      ratio_5day: null,
      ratio_10day: null,
      t2108: null,
      worden_common_stocks: null,
      sp_reference: null
    };

    // Apply column mapping
    for (const [csvColumn, standardField] of Object.entries(mapping)) {
      if (csvColumn.startsWith('_')) continue; // Skip metadata fields
      
      if (row[csvColumn] !== undefined && row[csvColumn] !== '') {
        let value;
        
        // Special handling for date field - don't parse as number
        if (standardField === 'date') {
          value = this.normalizeDate(row[csvColumn], mapping._year);
        } else {
          value = this.parseValue(row[csvColumn]);
        }
        
        standardRow[standardField] = value;
      }
    }

    // Validate required fields
    if (!standardRow.date) {
      throw new Error('Date field is required');
    }

    return standardRow;
  }

  /**
   * Normalize date values, handling incomplete dates and corrupted years
   * @param {string} dateValue - Raw date value
   * @param {string} year - Year from filename if needed
   */
  normalizeDate(dateValue, year) {
    if (!dateValue) return null;
    
    const dateStr = dateValue.toString().trim();
    
    // Handle different date formats
    if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      // Full date format: M/D/YYYY - check for corrupted years
      const parts = dateStr.split('/');
      const [month, day, yearPart] = parts;
      
      // Fix corrupted years like "0213" -> "2013"
      let correctedYear = yearPart;
      if (yearPart.length === 4 && yearPart.startsWith('0')) {
        // Extract last 3 digits and add "20" prefix for 21st century
        const lastThree = yearPart.substring(1);
        if (parseInt(lastThree) >= 7 && parseInt(lastThree) <= 99) {
          correctedYear = '20' + lastThree;
        }
      }
      
      return `${month}/${day}/${correctedYear}`;
    } else if (dateStr.match(/^\d{1,2}\/\d{1,2}$/) && year) {
      // Partial date format: M/D - add year from filename
      return `${dateStr}/${year}`;
    } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // ISO format: YYYY-MM-DD
      return dateStr;
    } else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
      // Two-digit year format: M/D/YY
      const parts = dateStr.split('/');
      const [month, day, shortYear] = parts;
      const fullYear = parseInt(shortYear) >= 50 ? `19${shortYear}` : `20${shortYear}`;
      return `${month}/${day}/${fullYear}`;
    }
    
    return dateStr; // Return as-is if format not recognized
  }

  /**
   * Parse CSV line handling quoted values properly
   * @param {string} line - CSV line to parse
   */
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last value
    values.push(current.trim().replace(/^"|"$/g, ''));
    
    return values;
  }

  /**
   * Parse and validate individual values
   * @param {string} value - Raw CSV value
   */
  parseValue(value) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    // Handle non-numeric text values (md, na, etc.)
    const cleanValue = value.toString().trim().toLowerCase();
    if (cleanValue === 'md' || cleanValue === 'na' || cleanValue === 'n/a' || cleanValue === '-') {
      return null;
    }

    // Remove commas from numbers (e.g., "5,881.63" -> "5881.63")
    const cleanNumValue = value.toString().replace(/,/g, '');
    
    // Try to parse as number
    const numValue = parseFloat(cleanNumValue);
    if (!isNaN(numValue)) {
      return numValue;
    }

    // Return as string for dates and text
    return value.toString().trim();
  }

  /**
   * Auto-detect column mapping by analyzing CSV headers
   * @param {string} filePath - Path to CSV file
   */
  async detectColumnMapping(filePath) {
    return new Promise((resolve, reject) => {
      const fileName = path.basename(filePath);
      const year = fileName.match(/(\d{4})/)?.[1];
      
      // Read file manually to handle multi-row headers
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);
      
      // Find the actual header row (usually contains "Date" as first column)
      let headerRow = null;
      let headerIndex = -1;
      
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const columns = lines[i].split(',');
        const firstCol = columns[0]?.toLowerCase().trim();
        
        // Look for row that starts with "Date" or has meaningful column names
        if (firstCol === 'date' || 
            (columns.length > 5 && columns.some(col => 
              col.toLowerCase().includes('date') || 
              col.toLowerCase().includes('stocks') ||
              col.toLowerCase().includes('number')
            ))) {
          headerRow = lines[i];
          headerIndex = i;
          break;
        }
      }
      
      if (!headerRow) {
        console.warn(`No valid header found in ${fileName}`);
        resolve({ _year: year });
        return;
      }
      
      console.log(`Using header row ${headerIndex + 1} in ${fileName}`);
      
      // Parse headers
      const headers = headerRow.split(',').map(h => h.trim().replace(/"/g, ''));
      const mapping = {};
      
      headers.forEach(header => {
        const normalizedHeader = header.toLowerCase().trim();
        
        // Date mapping - handle various date column names
        if (normalizedHeader === 'date' || normalizedHeader.includes('date')) {
          mapping[header] = 'date';
        }
        // 4% daily indicators - handle various formats (order matters!)
        else if ((normalizedHeader.includes('4%') || (normalizedHeader.includes('4') && normalizedHeader.includes('stocks'))) && 
                 normalizedHeader.includes('down') && 
                 (normalizedHeader.includes('daily') || normalizedHeader.includes('today'))) {
          mapping[header] = 'stocks_down_4pct_daily';
        }
        else if ((normalizedHeader.includes('4%') || (normalizedHeader.includes('4') && normalizedHeader.includes('stocks'))) && 
                 (normalizedHeader.includes('up') || normalizedHeader.includes('plus')) && 
                 (normalizedHeader.includes('daily') || normalizedHeader.includes('today'))) {
          mapping[header] = 'stocks_up_4pct_daily';
        }
        // 25% quarterly indicators
        else if (normalizedHeader.includes('25') && 
                 (normalizedHeader.includes('up') || normalizedHeader.includes('plus')) && 
                 normalizedHeader.includes('quarter')) {
          mapping[header] = 'stocks_up_25pct_quarterly';
        }
        else if (normalizedHeader.includes('25') && 
                 normalizedHeader.includes('down') && 
                 normalizedHeader.includes('quarter')) {
          mapping[header] = 'stocks_down_25pct_quarterly';
        }
        // 25% monthly indicators
        else if (normalizedHeader.includes('25') && 
                 (normalizedHeader.includes('up') || normalizedHeader.includes('plus')) && 
                 normalizedHeader.includes('month')) {
          mapping[header] = 'stocks_up_25pct_monthly';
        }
        else if (normalizedHeader.includes('25') && 
                 normalizedHeader.includes('down') && 
                 normalizedHeader.includes('month')) {
          mapping[header] = 'stocks_down_25pct_monthly';
        }
        // 50% monthly indicators
        else if (normalizedHeader.includes('50') && 
                 (normalizedHeader.includes('up') || normalizedHeader.includes('plus')) && 
                 normalizedHeader.includes('month')) {
          mapping[header] = 'stocks_up_50pct_monthly';
        }
        else if (normalizedHeader.includes('50') && 
                 normalizedHeader.includes('down') && 
                 normalizedHeader.includes('month')) {
          mapping[header] = 'stocks_down_50pct_monthly';
        }
        // 13% in 34 days indicators
        else if (normalizedHeader.includes('13') && normalizedHeader.includes('34') && 
                 (normalizedHeader.includes('up') || normalizedHeader.includes('plus'))) {
          mapping[header] = 'stocks_up_13pct_34days';
        }
        else if (normalizedHeader.includes('13') && normalizedHeader.includes('34') && 
                 normalizedHeader.includes('down')) {
          mapping[header] = 'stocks_down_13pct_34days';
        }
        // T2108 and other indicators
        else if (normalizedHeader.includes('t2108') || normalizedHeader.includes('t-2108')) {
          mapping[header] = 't2108';
        }
        else if (normalizedHeader.includes('worden') || normalizedHeader.includes('common')) {
          mapping[header] = 'worden_common_stocks';
        }
        else if (normalizedHeader.includes('s&p') || normalizedHeader.includes('sp')) {
          mapping[header] = 'sp_reference';
        }
        // Ratio indicators
        else if (normalizedHeader.includes('5') && normalizedHeader.includes('day') && normalizedHeader.includes('ratio')) {
          mapping[header] = 'ratio_5day';
        }
        else if (normalizedHeader.includes('10') && normalizedHeader.includes('day') && normalizedHeader.includes('ratio')) {
          mapping[header] = 'ratio_10day';
        }
      });
      
      // Store metadata
      mapping._year = year;
      mapping._headerIndex = headerIndex;
      resolve(mapping);
    });
  }

  /**
   * Calculate derived indicators (5-day and 10-day ratios)
   * @param {array} data - Normalized data array
   */
  calculateDerivedIndicators(data) {
    // Skip sorting and calculation for now to preserve original dates
    console.log('Skipping derived indicators calculation to preserve date integrity');
    return data;
  }

  /**
   * Calculate ratio for given time period
   * @param {array} periodData - Data for specific time period
   */
  calculateRatio(periodData) {
    // Implementation depends on specific ratio calculation requirements
    // This is a placeholder for the actual calculation logic
    return 0;
  }

  /**
   * Generate migration report
   */
  generateReport() {
    const report = {
      totalRecords: this.processedData.length,
      errorCount: this.errorLog.length,
      dateRange: {
        start: null,
        end: null
      },
      errors: this.errorLog
    };

    if (this.processedData.length > 0) {
      const dates = this.processedData.map(row => new Date(row.date)).sort();
      report.dateRange.start = dates[0].toISOString().split('T')[0];
      report.dateRange.end = dates[dates.length - 1].toISOString().split('T')[0];
    }

    return report;
  }
}

// Example usage and configuration
const migrationConfig = {
  inputDirectory: './data/csv',
  outputFile: './data/normalized_market_breadth.json',
  columnMappings: {
    // Example mapping - adjust based on actual CSV formats
    default: {
      'Date': 'date',
      'Up 4%': 'stocks_up_4pct_daily',
      'Down 4%': 'stocks_down_4pct_daily',
      'T2108': 't2108'
    }
  }
};

module.exports = CSVMigration;

// If run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('CSV Migration Script for Trading Tool');
    console.log('Run with: node csv-migration.js [inputDir] [outputFile]');
    process.exit(1);
  }

  const inputDir = args[0];
  const outputFile = args[1];

  async function runMigration() {
    const migration = new CSVMigration();
    
    try {
      console.log(`Starting migration from ${inputDir}...`);
      
      // Get all CSV files from input directory
      const csvFiles = fs.readdirSync(inputDir)
        .filter(file => file.endsWith('.csv'))
        .map(file => path.join(inputDir, file));
      
      console.log(`Found ${csvFiles.length} CSV files:`);
      csvFiles.forEach(file => console.log(`  - ${path.basename(file)}`));
      
      // Process each CSV file
      for (const csvFile of csvFiles) {
        console.log(`\nProcessing ${path.basename(csvFile)}...`);
        
        // Auto-detect column mapping by reading first row
        const columnMapping = await migration.detectColumnMapping(csvFile);
        console.log(`Detected columns:`, Object.keys(columnMapping));
        
        const data = await migration.normalizeCsvData(csvFile, columnMapping);
        migration.processedData.push(...data);
      }
      
      // Calculate derived indicators
      console.log('\nCalculating derived indicators...');
      migration.processedData = migration.calculateDerivedIndicators(migration.processedData);
      
      // Save processed data
      fs.writeFileSync(outputFile, JSON.stringify(migration.processedData, null, 2));
      
      // Generate and display report
      const report = migration.generateReport();
      console.log('\n=== Migration Report ===');
      console.log(`Total records processed: ${report.totalRecords}`);
      console.log(`Date range: ${report.dateRange.start} to ${report.dateRange.end}`);
      console.log(`Errors: ${report.errorCount}`);
      
      if (report.errorCount > 0) {
        console.log('\nErrors found:');
        report.errors.forEach(error => {
          console.log(`  - ${error.file}: ${error.error}`);
        });
      }
      
      console.log(`\nData saved to: ${outputFile}`);
      
    } catch (error) {
      console.error('Migration failed:', error.message);
      process.exit(1);
    }
  }
  
  runMigration();
}