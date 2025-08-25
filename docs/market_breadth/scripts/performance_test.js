#!/usr/bin/env node

// Database Performance Load Test Script
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🚀 Trading Tool - Database Performance Testing');
console.log('═══════════════════════════════════════════════════════════════\n');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://trading_user:trading_password@localhost:5432/trading_tool'
});

async function runPerformanceTest(size) {
  console.log(`🚀 Running performance test with ${size.toLocaleString()} records`);
  
  const testDataDir = '/tmp/trading_tool_files/performance_test_data';
  const sqlPath = path.join(testDataDir, `trades_${size}.sql`);
  const queriesPath = path.join(testDataDir, `queries_${size}.sql`);
  
  if (!fs.existsSync(sqlPath)) {
    console.log(`❌ SQL file not found: ${sqlPath}`);
    return { success: false, error: 'File not found' };
  }
  
  const results = {
    size,
    success: true,
    loadTime: 0,
    queryTimes: [],
    totalTime: 0,
    error: null
  };
  
  const startTotal = Date.now();
  
  try {
    // Clear existing test data
    console.log('🧹 Clearing existing test data...');
    const clearStart = Date.now();
    await pool.query("DELETE FROM trades WHERE entry_notes LIKE 'Performance test trade%'");
    const clearTime = Date.now() - clearStart;
    console.log(`   Cleared in ${clearTime}ms`);
    
    // Load test data
    console.log('📊 Loading test data...');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const startLoad = Date.now();
    await pool.query(sql);
    const loadTime = Date.now() - startLoad;
    results.loadTime = loadTime;
    console.log(`✅ Data loaded in ${loadTime}ms`);
    
    // Run performance queries
    console.log('⚡ Running performance queries...');
    const queries = fs.readFileSync(queriesPath, 'utf8')
      .split(';')
      .filter(q => q.trim() && !q.trim().startsWith('--'))
      .map(q => q.trim());
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query) {
        const startQuery = Date.now();
        const result = await pool.query(query);
        const queryTime = Date.now() - startQuery;
        results.queryTimes.push({
          query: i + 1,
          time: queryTime,
          rows: result.rows.length
        });
        console.log(`   Query ${i+1}: ${queryTime}ms (${result.rows.length} rows)`);
      }
    }
    
    results.totalTime = Date.now() - startTotal;
    console.log(`✅ Performance test completed in ${results.totalTime}ms\n`);
    
  } catch (error) {
    console.error(`❌ Performance test failed: ${error.message}`);
    results.success = false;
    results.error = error.message;
    results.totalTime = Date.now() - startTotal;
  }
  
  return results;
}

// Run tests for all sizes
async function runAllTests() {
  const sizes = [1000, 10000, 100000];
  const testResults = [];
  
  console.log('Starting comprehensive database performance testing...\n');
  
  for (const size of sizes) {
    const result = await runPerformanceTest(size);
    testResults.push(result);
    
    if (size !== sizes[sizes.length - 1]) {
      console.log('⏳ Waiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Generate summary report
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║ 📊 PERFORMANCE TEST SUMMARY REPORT                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  testResults.forEach(result => {
    if (result.success) {
      const avgQueryTime = result.queryTimes.reduce((sum, q) => sum + q.time, 0) / result.queryTimes.length;
      console.log(`📈 ${result.size.toLocaleString()} Records:`);
      console.log(`   Load Time: ${result.loadTime}ms`);
      console.log(`   Avg Query Time: ${Math.round(avgQueryTime)}ms`);
      console.log(`   Total Test Time: ${result.totalTime}ms`);
      console.log(`   Queries Executed: ${result.queryTimes.length}`);
      console.log(`   Status: ✅ SUCCESS\n`);
    } else {
      console.log(`📈 ${result.size.toLocaleString()} Records:`);
      console.log(`   Status: ❌ FAILED - ${result.error}\n`);
    }
  });
  
  // Performance ratings
  const successfulTests = testResults.filter(r => r.success);
  if (successfulTests.length > 0) {
    const avgLoadTime = successfulTests.reduce((sum, r) => sum + r.loadTime, 0) / successfulTests.length;
    const maxLoadTime = Math.max(...successfulTests.map(r => r.loadTime));
    
    console.log('🎯 Performance Assessment:');
    console.log(`   Average Load Time: ${Math.round(avgLoadTime)}ms`);
    console.log(`   Maximum Load Time: ${maxLoadTime}ms`);
    
    let rating = '';
    if (maxLoadTime < 5000) rating = '🏆 EXCELLENT (<5s)';
    else if (maxLoadTime < 15000) rating = '🟢 VERY GOOD (<15s)';
    else if (maxLoadTime < 30000) rating = '🟡 GOOD (<30s)';
    else rating = '🔴 NEEDS OPTIMIZATION (>30s)';
    
    console.log(`   Overall Rating: ${rating}`);
    console.log(`   Database Status: ${successfulTests.length === testResults.length ? '✅ PRODUCTION READY' : '⚠️ NEEDS ATTENTION'}`);
  }
  
  await pool.end();
  return testResults;
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runPerformanceTest, runAllTests };