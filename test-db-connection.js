#!/usr/bin/env node

// Test script to verify database connection and IPC handlers
const path = require('path');
const { TradingDatabase } = require('./dist/main/src/database/connection.js');

console.log('Testing database connection...');

async function testDatabaseConnection() {
  try {
    // Test connection to main database
    const dbPath = path.join(process.cwd(), 'trading.db');
    console.log('Connecting to database at:', dbPath);
    
    const database = new TradingDatabase(dbPath);
    console.log('✅ Database connected successfully');
    
    // Get database info
    const dbInfo = database.getDatabaseInfo();
    console.log('📊 Database info:', dbInfo);
    
    // Test breadth data retrieval
    const breadthService = database.getBreadthService();
    const recentData = breadthService.getBreadthHistory('2025-08-01', '2025-09-04');
    console.log(`📈 Found ${recentData.length} breadth records in date range`);
    
    if (recentData.length > 0) {
      console.log('Sample record:', {
        date: recentData[0].date,
        advancingIssues: recentData[0].advancingIssues,
        decliningIssues: recentData[0].decliningIssues,
        vix: recentData[0].vix,
        dataSource: recentData[0].dataSource
      });
    }
    
    // Test CSV import capability
    console.log('🔍 Testing CSV import availability...');
    const hasImportMethod = typeof breadthService.importFromCSV === 'function';
    console.log(`CSV import method available: ${hasImportMethod ? '✅' : '❌'}`);
    
    database.close();
    console.log('✅ Database connection test completed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    console.error('Error details:', error.stack);
    return false;
  }
}

testDatabaseConnection().then(success => {
  process.exit(success ? 0 : 1);
});