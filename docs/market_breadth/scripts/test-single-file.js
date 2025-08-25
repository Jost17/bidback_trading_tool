/**
 * Test script to debug CSV parsing for a single file
 */

const fs = require('fs');
const CSVMigration = require('./csv-migration.js');

async function testSingleFile() {
  const migration = new CSVMigration();
  const testFile = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/csv/2024.csv';
  
  console.log('=== Testing Single File: 2024.csv ===\n');
  
  // Read raw file content
  console.log('1. Raw file content (first 10 lines):');
  const rawContent = fs.readFileSync(testFile, 'utf8');
  const lines = rawContent.split('\n').slice(0, 10);
  lines.forEach((line, i) => {
    console.log(`Line ${i + 1}: ${line}`);
  });
  
  console.log('\n2. Detecting column mapping...');
  const columnMapping = await migration.detectColumnMapping(testFile);
  console.log('Column mapping:', columnMapping);
  
  console.log('\n3. Processing normalized data...');
  const data = await migration.normalizeCsvData(testFile, columnMapping);
  
  console.log(`\n4. Results: ${data.length} records processed`);
  console.log('First 3 records:');
  data.slice(0, 3).forEach((record, i) => {
    console.log(`Record ${i + 1}:`, JSON.stringify(record, null, 2));
  });
  
  console.log('\n5. Error log:');
  console.log(`Total errors: ${migration.errorLog.length}`);
  if (migration.errorLog.length > 0) {
    migration.errorLog.slice(0, 5).forEach((error, i) => {
      console.log(`Error ${i + 1}:`, error);
    });
  }
}

testSingleFile().catch(console.error);