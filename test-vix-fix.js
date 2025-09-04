const Database = require('better-sqlite3');

console.log('🔍 Testing VIX column fix...\n');

const db = new Database('./trading.db');

try {
  // Check table schema
  console.log('📋 Checking market_breadth table schema:');
  const tableInfo = db.prepare("PRAGMA table_info(market_breadth)").all();
  const columnNames = tableInfo.map(col => col.name);
  
  const hasVix = columnNames.includes('vix');
  const has20Pct = columnNames.includes('stocks_up_20pct');
  const has20Dollar = columnNames.includes('stocks_up_20dollar');
  
  console.log(`VIX column: ${hasVix ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`20% columns: ${has20Pct ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`$20 columns: ${has20Dollar ? '✅ EXISTS' : '❌ MISSING'}\n`);
  
  if (hasVix && has20Pct && has20Dollar) {
    console.log('🎉 SUCCESS: All required columns exist!');
    console.log('✅ VIX and 20%/$20 data persistence is now supported');
  } else {
    console.log('❌ Some columns are missing. Migration may be needed.');
  }
  
} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}