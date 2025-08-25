/**
 * Load historical market breadth data from JSON into PostgreSQL database
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

class DataLoader {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'trading_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'trading_tool',
      password: process.env.DB_PASSWORD || 'trading_password',
      port: process.env.DB_PORT || 5432,
    });
  }

  async loadData(jsonFilePath) {
    try {
      console.log(`Loading data from ${jsonFilePath}...`);
      
      // Read JSON data
      const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
      console.log(`Found ${data.length} records to load`);

      // Validate data format
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data format - expected array of records');
      }

      // Process data in batches
      const batchSize = 100;
      let loaded = 0;
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await this.insertBatch(batch);
        loaded += batch.length;
        console.log(`Loaded ${loaded}/${data.length} records (${Math.round(loaded/data.length*100)}%)`);
      }

      console.log(`✓ Successfully loaded ${loaded} records`);
      
    } catch (error) {
      console.error('✗ Failed to load data:', error.message);
      throw error;
    }
  }

  async insertBatch(records) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const record of records) {
        // Skip records with invalid dates
        if (!record.date || record.date === '1' || record.date === 'null') {
          continue;
        }

        // Convert date format
        const date = this.parseDate(record.date);
        if (!date) {
          console.warn(`Skipping record with invalid date: ${record.date}`);
          continue;
        }

        const query = `
          INSERT INTO market_breadth_daily (
            date,
            stocks_up_4pct_daily,
            stocks_down_4pct_daily,
            stocks_up_25pct_quarterly,
            stocks_down_25pct_quarterly,
            stocks_up_25pct_monthly,
            stocks_down_25pct_monthly,
            stocks_up_50pct_monthly,
            stocks_down_50pct_monthly,
            stocks_up_13pct_34days,
            stocks_down_13pct_34days,
            ratio_5day,
            ratio_10day,
            t2108,
            worden_common_stocks,
            sp_reference
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (date) DO UPDATE SET
            stocks_up_4pct_daily = EXCLUDED.stocks_up_4pct_daily,
            stocks_down_4pct_daily = EXCLUDED.stocks_down_4pct_daily,
            stocks_up_25pct_quarterly = EXCLUDED.stocks_up_25pct_quarterly,
            stocks_down_25pct_quarterly = EXCLUDED.stocks_down_25pct_quarterly,
            stocks_up_25pct_monthly = EXCLUDED.stocks_up_25pct_monthly,
            stocks_down_25pct_monthly = EXCLUDED.stocks_down_25pct_monthly,
            stocks_up_50pct_monthly = EXCLUDED.stocks_up_50pct_monthly,
            stocks_down_50pct_monthly = EXCLUDED.stocks_down_50pct_monthly,
            stocks_up_13pct_34days = EXCLUDED.stocks_up_13pct_34days,
            stocks_down_13pct_34days = EXCLUDED.stocks_down_13pct_34days,
            ratio_5day = EXCLUDED.ratio_5day,
            ratio_10day = EXCLUDED.ratio_10day,
            t2108 = EXCLUDED.t2108,
            worden_common_stocks = EXCLUDED.worden_common_stocks,
            sp_reference = EXCLUDED.sp_reference,
            updated_at = CURRENT_TIMESTAMP
        `;

        await client.query(query, [
          date,
          record.stocks_up_4pct_daily,
          record.stocks_down_4pct_daily,
          record.stocks_up_25pct_quarterly,
          record.stocks_down_25pct_quarterly,
          record.stocks_up_25pct_monthly,
          record.stocks_down_25pct_monthly,
          record.stocks_up_50pct_monthly,
          record.stocks_down_50pct_monthly,
          record.stocks_up_13pct_34days,
          record.stocks_down_13pct_34days,
          record.ratio_5day,
          record.ratio_10day,
          record.t2108,
          record.worden_common_stocks,
          record.sp_reference
        ]);
      }

      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  parseDate(dateStr) {
    if (!dateStr || dateStr === 'null' || dateStr === '1' || dateStr === '2' || dateStr === '3') {
      return null;
    }

    try {
      let cleanStr = dateStr.toString().trim();
      
      // Fix decimal points in dates (6.25/2007 -> 6/25/2007)
      cleanStr = cleanStr.replace(/\.(\d+)\//g, '/$1/');
      
      // Handle M/D/YYYY format (including corrupted years)
      if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [month, day, yearPart] = cleanStr.split('/');
        
        // Fix corrupted years like "0213" -> "2013"
        let correctedYear = yearPart;
        if (yearPart.length === 4 && yearPart.startsWith('0')) {
          const lastThree = yearPart.substring(1);
          if (parseInt(lastThree) >= 7 && parseInt(lastThree) <= 99) {
            correctedYear = '20' + lastThree;
          }
        }
        
        // Validate components
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);
        const yearNum = parseInt(correctedYear);
        
        if (monthNum < 1 || monthNum > 12) {
          console.warn(`Invalid month in date: ${cleanStr}`);
          return null;
        }
        
        if (dayNum < 1 || dayNum > 31) {
          console.warn(`Invalid day in date: ${cleanStr}`);
          return null;
        }
        
        if (yearNum < 2007 || yearNum > 2025) {
          console.warn(`Date out of expected range: ${cleanStr}`);
          return null;
        }
        
        return `${correctedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Handle M/D/YY format
      if (cleanStr.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
        const [month, day, shortYear] = cleanStr.split('/');
        const fullYear = parseInt(shortYear) >= 50 ? `19${shortYear}` : `20${shortYear}`;
        
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);
        
        if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
          console.warn(`Invalid date components: ${cleanStr}`);
          return null;
        }
        
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Handle YYYY-MM-DD format
      if (cleanStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return cleanStr;
      }

      // Log unrecognized format for debugging
      console.warn(`Unrecognized date format: "${cleanStr}"`);
      return null;
    } catch (error) {
      console.warn(`Date parsing error for "${dateStr}": ${error.message}`);
      return null;
    }
  }

  async close() {
    await this.pool.end();
  }
}

// If run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Data Loader for Trading Tool');
    console.log('Usage: node load-data.js [jsonFile]');
    process.exit(1);
  }

  const jsonFile = args[0];

  async function runLoader() {
    const loader = new DataLoader();
    
    try {
      await loader.loadData(jsonFile);
      console.log('✓ Data loading completed successfully');
    } catch (error) {
      console.error('✗ Data loading failed:', error.message);
      process.exit(1);
    } finally {
      await loader.close();
    }
  }
  
  runLoader();
}

module.exports = DataLoader;