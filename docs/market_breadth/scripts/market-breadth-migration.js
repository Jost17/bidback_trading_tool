#!/usr/bin/env node
/**
 * Advanced Market Breadth CSV Migration Script
 * Migrates historical market breadth data (2007-2024) to PostgreSQL
 * 
 * Features:
 * - Flexible column mapping for different CSV formats
 * - Data validation and cleansing
 * - Calculated indicators (5-day, 10-day ratios)
 * - Batch processing for large datasets
 * - Comprehensive error handling and logging
 * - Progress reporting and resumable migrations
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Pool } = require('pg');
const { createWriteStream } = require('fs');

class MarketBreadthMigration {
  constructor(config = {}) {
    this.config = {
      batchSize: config.batchSize || 1000,
      validateData: config.validateData !== false,
      calculateRatios: config.calculateRatios !== false,
      backupOriginal: config.backupOriginal !== false,
      logLevel: config.logLevel || 'info',
      outputDir: config.outputDir || './data/migration',
      ...config
    };

    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicateRecords: 0,
      insertedRecords: 0,
      errors: [],
      warnings: [],
      startTime: new Date(),
      endTime: null
    };

    this.columnMappings = new Map();
    this.processedData = new Map(); // Use Map for faster date lookups
    this.logStream = null;
    this.pgPool = null;
    
    this.setupLogging();
    this.loadColumnMappings();
  }

  /**
   * Setup logging infrastructure
   */
  setupLogging() {
    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const logFile = path.join(this.config.outputDir, `migration_${new Date().toISOString().split('T')[0]}.log`);
    this.logStream = createWriteStream(logFile, { flags: 'a' });
    
    this.log('info', `Migration started at ${this.stats.startTime.toISOString()}`);
    this.log('info', `Configuration: ${JSON.stringify(this.config, null, 2)}`);
  }

  /**
   * Log messages with different levels
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      data
    };

    // Console output with colors
    const colors = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[90m',
      success: '\x1b[32m',
      reset: '\x1b[0m'
    };

    if (level !== 'debug' || this.config.logLevel === 'debug') {
      console.log(`${colors[level] || ''}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
    }

    // File logging
    this.logStream.write(JSON.stringify(logEntry) + '\n');

    // Track errors and warnings
    if (level === 'error') {
      this.stats.errors.push({ message, data, timestamp });
    } else if (level === 'warn') {
      this.stats.warnings.push({ message, data, timestamp });
    }
  }

  /**
   * Load column mapping configurations for different CSV formats
   */
  loadColumnMappings() {
    // Standard format mapping
    this.columnMappings.set('standard', {
      'Date': 'date',
      'Stocks Up 4% Daily': 'stocks_up_4pct_daily',
      'Stocks Down 4% Daily': 'stocks_down_4pct_daily',
      'Stocks Up 25% Quarterly': 'stocks_up_25pct_quarterly',
      'Stocks Down 25% Quarterly': 'stocks_down_25pct_quarterly',
      'Stocks Up 20% Custom': 'stocks_up_20pct_custom',
      'Stocks Down 20% Custom': 'stocks_down_20pct_custom',
      'Stocks Up 25% Monthly': 'stocks_up_25pct_monthly',
      'Stocks Down 25% Monthly': 'stocks_down_25pct_monthly',
      'Stocks Up 50% Monthly': 'stocks_up_50pct_monthly',
      'Stocks Down 50% Monthly': 'stocks_down_50pct_monthly',
      'Stocks Up 13% in 34 Days': 'stocks_up_13pct_34days',
      'Stocks Down 13% in 34 Days': 'stocks_down_13pct_34days',
      'Stocks Up $20': 'stocks_up_20dollar_custom',
      'Stocks Down $20': 'stocks_down_20dollar_custom',
      'T2108': 't2108',
      'Worden Common Stocks': 'worden_common_stocks',
      'S&P Reference': 'sp_reference'
    });

    // Alternative format 1 (shorter column names)
    this.columnMappings.set('short', {
      'Date': 'date',
      'Up4D': 'stocks_up_4pct_daily',
      'Down4D': 'stocks_down_4pct_daily',
      'Up25Q': 'stocks_up_25pct_quarterly',
      'Down25Q': 'stocks_down_25pct_quarterly',
      'Up20': 'stocks_up_20pct_custom',
      'Down20': 'stocks_down_20pct_custom',
      'Up25M': 'stocks_up_25pct_monthly',
      'Down25M': 'stocks_down_25pct_monthly',
      'Up50M': 'stocks_up_50pct_monthly',
      'Down50M': 'stocks_down_50pct_monthly',
      'Up13_34': 'stocks_up_13pct_34days',
      'Down13_34': 'stocks_down_13pct_34days',
      'Up$20': 'stocks_up_20dollar_custom',
      'Down$20': 'stocks_down_20dollar_custom',
      'T2108': 't2108',
      'Worden': 'worden_common_stocks',
      'SP500': 'sp_reference'
    });

    // Legacy format (different naming convention)
    this.columnMappings.set('legacy', {
      'DATE': 'date',
      'UP_4_PCT': 'stocks_up_4pct_daily',
      'DOWN_4_PCT': 'stocks_down_4pct_daily',
      'UP_25_QTR': 'stocks_up_25pct_quarterly',
      'DOWN_25_QTR': 'stocks_down_25pct_quarterly',
      'UP_25_MTH': 'stocks_up_25pct_monthly',
      'DOWN_25_MTH': 'stocks_down_25pct_monthly',
      'UP_50_MTH': 'stocks_up_50pct_monthly',
      'DOWN_50_MTH': 'stocks_down_50pct_monthly',
      'T2108_PCT': 't2108',
      'WORDEN_CS': 'worden_common_stocks',
      'SP_REF': 'sp_reference'
    });

    // Auto-detect patterns
    this.autoMappingPatterns = [
      { pattern: /date/i, field: 'date' },
      { pattern: /up.*4.*pct|up.*4.*%|4.*up/i, field: 'stocks_up_4pct_daily' },
      { pattern: /down.*4.*pct|down.*4.*%|4.*down/i, field: 'stocks_down_4pct_daily' },
      { pattern: /up.*25.*q|up.*25.*qtr|quarterly.*up.*25/i, field: 'stocks_up_25pct_quarterly' },
      { pattern: /down.*25.*q|down.*25.*qtr|quarterly.*down.*25/i, field: 'stocks_down_25pct_quarterly' },
      { pattern: /up.*20.*%|up.*20.*pct|20.*up/i, field: 'stocks_up_20pct_custom' },
      { pattern: /down.*20.*%|down.*20.*pct|20.*down/i, field: 'stocks_down_20pct_custom' },
      { pattern: /up.*25.*m|up.*25.*month|monthly.*up.*25/i, field: 'stocks_up_25pct_monthly' },
      { pattern: /down.*25.*m|down.*25.*month|monthly.*down.*25/i, field: 'stocks_down_25pct_monthly' },
      { pattern: /up.*50.*m|up.*50.*month|monthly.*up.*50/i, field: 'stocks_up_50pct_monthly' },
      { pattern: /down.*50.*m|down.*50.*month|monthly.*down.*50/i, field: 'stocks_down_50pct_monthly' },
      { pattern: /up.*13.*34|34.*up.*13/i, field: 'stocks_up_13pct_34days' },
      { pattern: /down.*13.*34|34.*down.*13/i, field: 'stocks_down_13pct_34days' },
      { pattern: /up.*\$20|up.*20.*dollar|\$20.*up/i, field: 'stocks_up_20dollar_custom' },
      { pattern: /down.*\$20|down.*20.*dollar|\$20.*down/i, field: 'stocks_down_20dollar_custom' },
      { pattern: /t2108/i, field: 't2108' },
      { pattern: /worden/i, field: 'worden_common_stocks' },
      { pattern: /s&p|sp.*ref|sp.*500/i, field: 'sp_reference' }
    ];
  }

  /**
   * Auto-detect column mapping based on headers
   */
  autoDetectMapping(headers) {
    const mapping = {};
    const unmapped = [];

    for (const header of headers) {
      let mapped = false;
      
      for (const { pattern, field } of this.autoMappingPatterns) {
        if (pattern.test(header)) {
          mapping[header] = field;
          mapped = true;
          break;
        }
      }
      
      if (!mapped) {
        unmapped.push(header);
      }
    }

    if (unmapped.length > 0) {
      this.log('warn', `Unmapped columns detected: ${unmapped.join(', ')}`);
    }

    return mapping;
  }

  /**
   * Initialize database connection
   */
  async initializeDatabase() {
    if (!this.config.databaseUrl) {
      throw new Error('Database URL is required for migration');
    }

    this.pgPool = new Pool({
      connectionString: this.config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 60000,
    });

    // Test connection
    try {
      const client = await this.pgPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.log('success', 'Database connection established');
    } catch (error) {
      this.log('error', 'Database connection failed', error);
      throw error;
    }
  }

  /**
   * Parse and validate date string
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    // Try different date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    ];

    const cleanDate = dateStr.trim();
    let parsedDate;

    // Try parsing with different formats
    if (formats[0].test(cleanDate)) {
      parsedDate = new Date(cleanDate);
    } else if (formats[1].test(cleanDate) || formats[2].test(cleanDate)) {
      const [month, day, year] = cleanDate.split('/');
      parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    } else if (formats[3].test(cleanDate)) {
      parsedDate = new Date(cleanDate.replace(/\//g, '-'));
    } else if (formats[4].test(cleanDate)) {
      const [month, day, year] = cleanDate.split('-');
      parsedDate = new Date(`${year}-${month}-${day}`);
    } else {
      // Try default Date parsing
      parsedDate = new Date(cleanDate);
    }

    // Validate date range (2007-2024)
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }

    const year = parsedDate.getFullYear();
    if (year < 2007 || year > 2025) {
      throw new Error(`Date out of expected range (2007-2025): ${dateStr}`);
    }

    return parsedDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  /**
   * Parse and validate numeric value
   */
  parseNumeric(value, fieldName) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Clean the value
    let cleanValue = String(value).trim();
    
    // Remove common non-numeric characters
    cleanValue = cleanValue.replace(/[$,%]/g, '');
    
    // Handle negative signs and parentheses
    if (cleanValue.includes('(') && cleanValue.includes(')')) {
      cleanValue = '-' + cleanValue.replace(/[()]/g, '');
    }

    const numValue = parseFloat(cleanValue);
    
    if (isNaN(numValue)) {
      throw new Error(`Invalid numeric value for ${fieldName}: ${value}`);
    }

    // Validate ranges for specific fields
    if (fieldName === 't2108') {
      if (numValue < 0 || numValue > 100) {
        throw new Error(`T2108 value out of range (0-100): ${numValue}`);
      }
    } else if (fieldName.includes('stocks_') && numValue < 0) {
      throw new Error(`Stock count cannot be negative for ${fieldName}: ${numValue}`);
    }

    return numValue;
  }

  /**
   * Process a single CSV file
   */
  async processCSVFile(filePath, mappingType = 'auto') {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      let headers = null;
      let mapping = null;
      let rowCount = 0;

      this.log('info', `Processing file: ${filePath}`);

      const stream = fs.createReadStream(filePath)
        .pipe(csv({
          skipEmptyLines: true,
          trim: true,
          headers: (headerList) => {
            headers = headerList;
            
            // Determine column mapping
            if (mappingType === 'auto') {
              mapping = this.autoDetectMapping(headers);
            } else if (this.columnMappings.has(mappingType)) {
              mapping = this.columnMappings.get(mappingType);
            } else {
              throw new Error(`Unknown mapping type: ${mappingType}`);
            }

            this.log('info', `Using column mapping: ${JSON.stringify(mapping, null, 2)}`);
            return headers;
          }
        }));

      stream.on('data', (row) => {
        rowCount++;
        try {
          const normalizedRow = this.normalizeRow(row, mapping, filePath, rowCount);
          if (normalizedRow) {
            results.push(normalizedRow);
          }
        } catch (error) {
          errors.push({
            file: filePath,
            row: rowCount,
            data: row,
            error: error.message
          });
          
          if (this.config.logLevel === 'debug') {
            this.log('debug', `Row ${rowCount} error: ${error.message}`, row);
          }
        }
      });

      stream.on('end', () => {
        this.log('info', `Completed processing ${filePath}: ${results.length} valid rows, ${errors.length} errors`);
        resolve({ data: results, errors, file: filePath });
      });

      stream.on('error', (error) => {
        this.log('error', `Stream error processing ${filePath}`, error);
        reject(error);
      });
    });
  }

  /**
   * Normalize a single row of data
   */
  normalizeRow(row, mapping, filePath, rowNumber) {
    const normalized = {
      date: null,
      stocks_up_4pct_daily: null,
      stocks_down_4pct_daily: null,
      stocks_up_25pct_quarterly: null,
      stocks_down_25pct_quarterly: null,
      stocks_up_20pct_custom: null,
      stocks_down_20pct_custom: null,
      ratio_5day: null,
      ratio_10day: null,
      stocks_up_25pct_monthly: null,
      stocks_down_25pct_monthly: null,
      stocks_up_50pct_monthly: null,
      stocks_down_50pct_monthly: null,
      stocks_up_13pct_34days: null,
      stocks_down_13pct_34days: null,
      stocks_up_20dollar_custom: null,
      stocks_down_20dollar_custom: null,
      t2108: null,
      worden_common_stocks: null,
      sp_reference: null,
      data_source: 'csv_import',
      source_file: path.basename(filePath),
      source_row: rowNumber
    };

    // Apply column mapping
    for (const [csvColumn, standardField] of Object.entries(mapping)) {
      if (row[csvColumn] !== undefined && row[csvColumn] !== null && row[csvColumn] !== '') {
        try {
          if (standardField === 'date') {
            normalized[standardField] = this.parseDate(row[csvColumn]);
          } else {
            normalized[standardField] = this.parseNumeric(row[csvColumn], standardField);
          }
        } catch (error) {
          throw new Error(`Column '${csvColumn}' -> '${standardField}': ${error.message}`);
        }
      }
    }

    // Validate required fields
    if (!normalized.date) {
      throw new Error('Date field is required');
    }

    // Check for duplicate dates
    if (this.processedData.has(normalized.date)) {
      this.stats.duplicateRecords++;
      this.log('warn', `Duplicate date found: ${normalized.date} in ${filePath}:${rowNumber}`);
      return null; // Skip duplicate
    }

    return normalized;
  }

  /**
   * Calculate derived indicators (5-day and 10-day ratios)
   */
  calculateDerivedIndicators() {
    if (!this.config.calculateRatios) {
      this.log('info', 'Skipping ratio calculations (disabled in config)');
      return;
    }

    this.log('info', 'Calculating derived indicators (5-day and 10-day ratios)');
    
    // Convert Map to sorted array by date
    const sortedData = Array.from(this.processedData.entries())
      .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB));

    for (let i = 0; i < sortedData.length; i++) {
      const [currentDate, currentData] = sortedData[i];
      
      // Calculate 5-day ratio
      if (i >= 4) {
        const period5Data = sortedData.slice(i - 4, i + 1).map(([, data]) => data);
        currentData.ratio_5day = this.calculateRatio(period5Data, '5day');
      }

      // Calculate 10-day ratio
      if (i >= 9) {
        const period10Data = sortedData.slice(i - 9, i + 1).map(([, data]) => data);
        currentData.ratio_10day = this.calculateRatio(period10Data, '10day');
      }
    }

    this.log('success', 'Derived indicators calculated successfully');
  }

  /**
   * Calculate ratio for given time period
   * Implementation of market breadth ratio calculation
   */
  calculateRatio(periodData, periodType) {
    // Calculate the ratio based on up vs down stocks over the period
    let totalUpStocks = 0;
    let totalDownStocks = 0;
    let validDays = 0;

    for (const dayData of periodData) {
      const upStocks = dayData.stocks_up_4pct_daily;
      const downStocks = dayData.stocks_down_4pct_daily;
      
      if (upStocks !== null && downStocks !== null) {
        totalUpStocks += upStocks;
        totalDownStocks += downStocks;
        validDays++;
      }
    }

    if (validDays === 0 || totalDownStocks === 0) {
      return null;
    }

    // Calculate ratio (up/down stocks over the period)
    const ratio = totalUpStocks / totalDownStocks;
    
    // Round to 4 decimal places
    return Math.round(ratio * 10000) / 10000;
  }

  /**
   * Insert data into PostgreSQL in batches
   */
  async insertDataBatch(dataArray) {
    if (dataArray.length === 0) {
      return;
    }

    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO market_breadth_daily (
          date, stocks_up_4pct_daily, stocks_down_4pct_daily,
          stocks_up_25pct_quarterly, stocks_down_25pct_quarterly,
          stocks_up_20pct_custom, stocks_down_20pct_custom,
          ratio_5day, ratio_10day,
          stocks_up_25pct_monthly, stocks_down_25pct_monthly,
          stocks_up_50pct_monthly, stocks_down_50pct_monthly,
          stocks_up_13pct_34days, stocks_down_13pct_34days,
          stocks_up_20dollar_custom, stocks_down_20dollar_custom,
          t2108, worden_common_stocks, sp_reference, data_source
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        ON CONFLICT (date) DO UPDATE SET
          stocks_up_4pct_daily = EXCLUDED.stocks_up_4pct_daily,
          stocks_down_4pct_daily = EXCLUDED.stocks_down_4pct_daily,
          stocks_up_25pct_quarterly = EXCLUDED.stocks_up_25pct_quarterly,
          stocks_down_25pct_quarterly = EXCLUDED.stocks_down_25pct_quarterly,
          stocks_up_20pct_custom = EXCLUDED.stocks_up_20pct_custom,
          stocks_down_20pct_custom = EXCLUDED.stocks_down_20pct_custom,
          ratio_5day = EXCLUDED.ratio_5day,
          ratio_10day = EXCLUDED.ratio_10day,
          stocks_up_25pct_monthly = EXCLUDED.stocks_up_25pct_monthly,
          stocks_down_25pct_monthly = EXCLUDED.stocks_down_25pct_monthly,
          stocks_up_50pct_monthly = EXCLUDED.stocks_up_50pct_monthly,
          stocks_down_50pct_monthly = EXCLUDED.stocks_down_50pct_monthly,
          stocks_up_13pct_34days = EXCLUDED.stocks_up_13pct_34days,
          stocks_down_13pct_34days = EXCLUDED.stocks_down_13pct_34days,
          stocks_up_20dollar_custom = EXCLUDED.stocks_up_20dollar_custom,
          stocks_down_20dollar_custom = EXCLUDED.stocks_down_20dollar_custom,
          t2108 = EXCLUDED.t2108,
          worden_common_stocks = EXCLUDED.worden_common_stocks,
          sp_reference = EXCLUDED.sp_reference,
          updated_at = CURRENT_TIMESTAMP
      `;

      for (const data of dataArray) {
        const values = [
          data.date,
          data.stocks_up_4pct_daily,
          data.stocks_down_4pct_daily,
          data.stocks_up_25pct_quarterly,
          data.stocks_down_25pct_quarterly,
          data.stocks_up_20pct_custom,
          data.stocks_down_20pct_custom,
          data.ratio_5day,
          data.ratio_10day,
          data.stocks_up_25pct_monthly,
          data.stocks_down_25pct_monthly,
          data.stocks_up_50pct_monthly,
          data.stocks_down_50pct_monthly,
          data.stocks_up_13pct_34days,
          data.stocks_down_13pct_34days,
          data.stocks_up_20dollar_custom,
          data.stocks_down_20dollar_custom,
          data.t2108,
          data.worden_common_stocks,
          data.sp_reference,
          data.data_source
        ];

        await client.query(insertQuery, values);
        this.stats.insertedRecords++;
      }

      await client.query('COMMIT');
      this.log('info', `Inserted batch of ${dataArray.length} records`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.log('error', 'Batch insert failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Log migration progress to database
   */
  async logMigrationProgress(filename, status, details = {}) {
    if (!this.pgPool) return;

    const client = await this.pgPool.connect();
    try {
      await client.query(`
        INSERT INTO data_import_log (
          filename, import_type, records_processed, records_imported, 
          records_failed, date_range_start, date_range_end, status, error_log
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (filename) DO UPDATE SET
          records_processed = EXCLUDED.records_processed,
          records_imported = EXCLUDED.records_imported,
          records_failed = EXCLUDED.records_failed,
          status = EXCLUDED.status,
          error_log = EXCLUDED.error_log,
          completed_at = CURRENT_TIMESTAMP
      `, [
        filename,
        'csv',
        details.totalRecords || 0,
        details.validRecords || 0,
        details.invalidRecords || 0,
        details.startDate || null,
        details.endDate || null,
        status,
        JSON.stringify(details.errors || [])
      ]);
    } catch (error) {
      this.log('error', 'Failed to log migration progress', error);
    } finally {
      client.release();
    }
  }

  /**
   * Main migration function
   */
  async migrate(inputPath, mappingType = 'auto') {
    try {
      this.log('info', `Starting migration from: ${inputPath}`);
      
      // Initialize database connection
      await this.initializeDatabase();

      // Determine if input is file or directory
      const inputStat = fs.statSync(inputPath);
      let csvFiles = [];

      if (inputStat.isDirectory()) {
        csvFiles = fs.readdirSync(inputPath)
          .filter(file => file.toLowerCase().endsWith('.csv'))
          .map(file => path.join(inputPath, file));
      } else if (inputPath.toLowerCase().endsWith('.csv')) {
        csvFiles = [inputPath];
      } else {
        throw new Error('Input must be a CSV file or directory containing CSV files');
      }

      if (csvFiles.length === 0) {
        throw new Error('No CSV files found');
      }

      this.stats.totalFiles = csvFiles.length;
      this.log('info', `Found ${csvFiles.length} CSV file(s) to process`);

      // Process each CSV file
      for (const csvFile of csvFiles) {
        try {
          const result = await this.processCSVFile(csvFile, mappingType);
          
          // Add valid data to our collection
          for (const data of result.data) {
            this.processedData.set(data.date, data);
            this.stats.validRecords++;
          }
          
          this.stats.invalidRecords += result.errors.length;
          this.stats.processedFiles++;

          // Log file-specific progress
          const dates = result.data.map(d => d.date).sort();
          await this.logMigrationProgress(path.basename(csvFile), 'processing', {
            totalRecords: result.data.length + result.errors.length,
            validRecords: result.data.length,
            invalidRecords: result.errors.length,
            startDate: dates.length > 0 ? dates[0] : null,
            endDate: dates.length > 0 ? dates[dates.length - 1] : null,
            errors: result.errors
          });
          
        } catch (error) {
          this.log('error', `Failed to process file ${csvFile}`, error);
          await this.logMigrationProgress(path.basename(csvFile), 'failed', {
            errors: [{ message: error.message }]
          });
        }
      }

      this.stats.totalRecords = this.stats.validRecords + this.stats.invalidRecords;
      
      // Calculate derived indicators
      this.calculateDerivedIndicators();
      
      // Insert data in batches
      this.log('info', `Inserting ${this.processedData.size} records into database`);
      const dataArray = Array.from(this.processedData.values());
      
      for (let i = 0; i < dataArray.length; i += this.config.batchSize) {
        const batch = dataArray.slice(i, i + this.config.batchSize);
        await this.insertDataBatch(batch);
        
        // Progress reporting
        const progress = Math.min(100, ((i + batch.length) / dataArray.length) * 100);
        this.log('info', `Progress: ${progress.toFixed(1)}% (${i + batch.length}/${dataArray.length})`);
      }

      this.stats.endTime = new Date();
      await this.generateFinalReport();
      
    } catch (error) {
      this.log('error', 'Migration failed', error);
      throw error;
    } finally {
      if (this.pgPool) {
        await this.pgPool.end();
      }
      if (this.logStream) {
        this.logStream.end();
      }
    }
  }

  /**
   * Generate final migration report
   */
  async generateFinalReport() {
    const duration = this.stats.endTime - this.stats.startTime;
    const durationStr = `${Math.round(duration / 1000)}s`;
    
    const report = {
      summary: {
        totalFiles: this.stats.totalFiles,
        processedFiles: this.stats.processedFiles,
        totalRecords: this.stats.totalRecords,
        validRecords: this.stats.validRecords,
        invalidRecords: this.stats.invalidRecords,
        duplicateRecords: this.stats.duplicateRecords,
        insertedRecords: this.stats.insertedRecords,
        duration: durationStr,
        startTime: this.stats.startTime.toISOString(),
        endTime: this.stats.endTime.toISOString()
      },
      errors: this.stats.errors,
      warnings: this.stats.warnings
    };

    // Get date range from processed data
    if (this.processedData.size > 0) {
      const dates = Array.from(this.processedData.keys()).sort();
      report.summary.dateRange = {
        start: dates[0],
        end: dates[dates.length - 1],
        totalDays: dates.length
      };
    }

    // Save report to file
    const reportPath = path.join(this.config.outputDir, `migration_report_${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Console summary
    this.log('success', '='.repeat(60));
    this.log('success', 'MIGRATION COMPLETED SUCCESSFULLY');
    this.log('success', '='.repeat(60));
    this.log('info', `Duration: ${durationStr}`);
    this.log('info', `Files processed: ${this.stats.processedFiles}/${this.stats.totalFiles}`);
    this.log('info', `Records inserted: ${this.stats.insertedRecords}`);
    this.log('info', `Valid records: ${this.stats.validRecords}`);
    this.log('info', `Invalid records: ${this.stats.invalidRecords}`);
    this.log('info', `Duplicate records: ${this.stats.duplicateRecords}`);
    this.log('info', `Errors: ${this.stats.errors.length}`);
    this.log('info', `Warnings: ${this.stats.warnings.length}`);
    this.log('info', `Report saved: ${reportPath}`);
    
    if (report.summary.dateRange) {
      this.log('info', `Date range: ${report.summary.dateRange.start} to ${report.summary.dateRange.end} (${report.summary.dateRange.totalDays} days)`);
    }

    return report;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Market Breadth CSV Migration Tool

Usage:
  node market-breadth-migration.js <input> [options]

Arguments:
  input                   CSV file or directory containing CSV files

Options:
  --mapping=<type>        Column mapping type: auto, standard, short, legacy (default: auto)
  --batch-size=<size>     Batch size for database inserts (default: 1000)
  --no-ratios            Skip calculation of derived ratios
  --no-validation        Skip data validation
  --log-level=<level>     Log level: debug, info, warn, error (default: info)
  --output-dir=<dir>      Output directory for logs and reports (default: ./data/migration)
  --db-url=<url>          PostgreSQL connection URL (or use DATABASE_URL env var)

Examples:
  node market-breadth-migration.js ./data/csv/
  node market-breadth-migration.js ./data/breadth_2007_2024.csv --mapping=legacy
  node market-breadth-migration.js ./data/ --batch-size=500 --log-level=debug
`);
    process.exit(0);
  }

  const inputPath = args[0];
  const config = {
    databaseUrl: process.env.DATABASE_URL
  };

  // Parse command line options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--mapping=')) {
      config.mappingType = arg.split('=')[1];
    } else if (arg.startsWith('--batch-size=')) {
      config.batchSize = parseInt(arg.split('=')[1]);
    } else if (arg === '--no-ratios') {
      config.calculateRatios = false;
    } else if (arg === '--no-validation') {
      config.validateData = false;
    } else if (arg.startsWith('--log-level=')) {
      config.logLevel = arg.split('=')[1];
    } else if (arg.startsWith('--output-dir=')) {
      config.outputDir = arg.split('=')[1];
    } else if (arg.startsWith('--db-url=')) {
      config.databaseUrl = arg.split('=')[1];
    }
  }

  if (!config.databaseUrl) {
    console.error('Database URL is required. Set DATABASE_URL environment variable or use --db-url option.');
    process.exit(1);
  }

  // Run migration
  const migration = new MarketBreadthMigration(config);
  migration.migrate(inputPath, config.mappingType || 'auto')
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = MarketBreadthMigration;