#!/usr/bin/env node

/**
 * Database Schema Verification Script
 * Tests that VIX column was added successfully and 20% fields exist
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function verifyDatabaseSchema() {
  console.log('🔍 Verifying database schema for VIX and 20% field support...\n');
  
  // Use development database path
  const dbPath = path.join(process.cwd(), 'trading.db');
  
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found at:', dbPath);
    console.log('💡 Tip: Start the application first to create the database');
    process.exit(1);
  }
  
  const db = new Database(dbPath);
  
  try {
    // Get table schema
    const tableInfo = db.prepare("PRAGMA table_info(market_breadth)").all();
    console.log('📋 market_breadth table columns:');
    
    const columnNames = tableInfo.map(col => col.name);
    console.log(columnNames.join(', '));
    console.log('');
    
    // Check required columns
    const requiredColumns = [
      'vix',
      'stocks_up_20pct',
      'stocks_down_20pct', 
      'stocks_up_20dollar',
      'stocks_down_20dollar'
    ];
    
    let allColumnsExist = true;
    
    requiredColumns.forEach(colName => {
      if (columnNames.includes(colName)) {
        console.log(`✅ Column '${colName}' exists`);
      } else {
        console.log(`❌ Column '${colName}' MISSING`);
        allColumnsExist = false;
      }
    });
    
    console.log('');
    
    // Check schema version
    const versions = db.prepare('SELECT * FROM schema_version ORDER BY version DESC').all();
    console.log('📊 Schema versions:');
    versions.forEach(v => {
      console.log(`  Version ${v.version}: ${v.description} (${v.applied_at})`);
    });
    
    console.log('');
    
    // Test insert with VIX and 20% data
    console.log('🧪 Testing data insertion with VIX and 20% fields...');
    
    const testData = {
      date: '2025-01-04',
      timestamp: new Date().toISOString(),
      advancing_issues: 1500,
      declining_issues: 1200,
      new_highs: 150,
      new_lows: 80,
      up_volume: 25.5,
      down_volume: 18.2,
      breadth_score: 65,
      trend_strength: 75,
      market_phase: 'BULL',
      data_source: 'manual',
      notes: 'Test data for VIX and 20% fields',
      vix: 18.5, // VIX test data
      stocks_up_20pct: 145,
      stocks_down_20pct: 32,
      stocks_up_20dollar: 98,
      stocks_down_20dollar: 28,
      t2108: 72.5,
      sp500: '4800.25',
      worden_universe: 7000
    };
    
    // Try to insert test data
    const insertStmt = db.prepare(`
      INSERT INTO market_breadth (
        date, timestamp, advancing_issues, declining_issues, new_highs, new_lows,
        up_volume, down_volume, breadth_score, trend_strength, market_phase,
        data_source, notes, vix, stocks_up_20pct, stocks_down_20pct,
        stocks_up_20dollar, stocks_down_20dollar, t2108, sp500, worden_universe
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertStmt.run(
      testData.date, testData.timestamp, testData.advancing_issues,
      testData.declining_issues, testData.new_highs, testData.new_lows,
      testData.up_volume, testData.down_volume, testData.breadth_score,
      testData.trend_strength, testData.market_phase, testData.data_source,
      testData.notes, testData.vix, testData.stocks_up_20pct,
      testData.stocks_down_20pct, testData.stocks_up_20dollar,
      testData.stocks_down_20dollar, testData.t2108, testData.sp500,
      testData.worden_universe
    );
    
    console.log(`✅ Test data inserted successfully with ID: ${result.lastInsertRowid}`);
    
    // Retrieve and verify the data
    const retrievedData = db.prepare('SELECT * FROM market_breadth WHERE id = ?').get(result.lastInsertRowid);
    
    console.log('📤 Retrieved data verification:');
    console.log(`  VIX: ${retrievedData.vix} (expected: ${testData.vix})`);
    console.log(`  Stocks Up 20%: ${retrievedData.stocks_up_20pct} (expected: ${testData.stocks_up_20pct})`);
    console.log(`  Stocks Down 20%: ${retrievedData.stocks_down_20pct} (expected: ${testData.stocks_down_20pct})`);
    console.log(`  Stocks Up $20: ${retrievedData.stocks_up_20dollar} (expected: ${testData.stocks_up_20dollar})`);
    console.log(`  Stocks Down $20: ${retrievedData.stocks_down_20dollar} (expected: ${testData.stocks_down_20dollar})`);
    
    // Clean up test data
    db.prepare('DELETE FROM market_breadth WHERE id = ?').run(result.lastInsertRowid);
    console.log('🧹 Test data cleaned up');
    
    console.log('');
    
    if (allColumnsExist) {
      console.log('🎉 SUCCESS: All required columns exist and data persistence works!');
      console.log('✅ VIX and 20%/$20 data can now be saved to the database');
    } else {
      console.log('❌ FAILURE: Some required columns are missing');
      console.log('💡 Tip: Restart the application to trigger migrations');
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run verification
verifyDatabaseSchema();