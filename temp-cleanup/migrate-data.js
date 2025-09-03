const Database = require('better-sqlite3');
const path = require('path');

// Open both databases
const backendDb = new Database('./backend/src/database/trading.db', { readonly: true });
const appDbPath = path.join(process.env.HOME, 'Library/Application Support/bidback-trading-tool/trading.db');
const appDb = new Database(appDbPath);

console.log('Starting data migration...');

// Get all data from backend
const backendData = backendDb.prepare(`
  SELECT 
    date,
    stocks_up_4pct_daily,
    stocks_down_4pct_daily,
    stocks_up_25pct_quarterly,
    stocks_down_25pct_quarterly,
    stocks_up_25pct_monthly,
    stocks_down_25pct_monthly,
    t2108,
    sp_reference
  FROM market_breadth_daily 
  ORDER BY date
`).all();

console.log(`Found ${backendData.length} records to migrate`);

// Prepare insert statement for app database
const insertStmt = appDb.prepare(`
  INSERT OR REPLACE INTO market_breadth (
    date, timestamp, advancing_issues, declining_issues, new_highs, new_lows,
    up_volume, down_volume, breadth_score, trend_strength, market_phase,
    data_source, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Begin transaction for better performance
const transaction = appDb.transaction(() => {
  let migrated = 0;
  
  for (const row of backendData) {
    // Map backend fields to frontend schema
    const timestamp = new Date(row.date + 'T16:00:00').toISOString();
    
    // Map Stockbee data to breadth fields
    const advancingIssues = row.stocks_up_4pct_daily || 0;
    const decliningIssues = row.stocks_down_4pct_daily || 0;
    const newHighs = Math.round((row.stocks_up_25pct_quarterly || 0) / 10);
    const newLows = Math.round((row.stocks_down_25pct_quarterly || 0) / 10);
    const upVolume = row.stocks_up_25pct_monthly || 0;
    const downVolume = row.stocks_down_25pct_monthly || 0;
    
    // Simple breadth score calculation
    const totalIssues = advancingIssues + decliningIssues;
    const breadthScore = totalIssues > 0 ? (advancingIssues / totalIssues * 100) : 50;
    
    // Determine market phase based on breadth score
    let marketPhase = 'Neutral';
    if (breadthScore > 70) marketPhase = 'Strong Bull';
    else if (breadthScore > 60) marketPhase = 'Bull';
    else if (breadthScore < 30) marketPhase = 'Strong Bear';
    else if (breadthScore < 40) marketPhase = 'Bear';
    
    const trendStrength = Math.abs(breadthScore - 50) / 50 * 100;
    
    const notes = `T2108: ${row.t2108 || 'N/A'}, SP: ${row.sp_reference || 'N/A'}`;
    
    insertStmt.run([
      row.date,
      timestamp,
      advancingIssues,
      decliningIssues, 
      newHighs,
      newLows,
      upVolume,
      downVolume,
      breadthScore,
      trendStrength,
      marketPhase,
      'migrated',
      notes
    ]);
    
    migrated++;
  }
  
  return migrated;
});

const migratedCount = transaction();

console.log(`Migration completed: ${migratedCount} records migrated`);

// Verify migration
const finalCount = appDb.prepare('SELECT COUNT(*) as count FROM market_breadth').get();
console.log(`Final count in app database: ${finalCount.count}`);

// Show date range
const dateRange = appDb.prepare(`
  SELECT MIN(date) as min_date, MAX(date) as max_date 
  FROM market_breadth
`).get();
console.log(`Date range: ${dateRange.min_date} to ${dateRange.max_date}`);

// Close databases
backendDb.close();
appDb.close();

console.log('Data migration completed successfully!');