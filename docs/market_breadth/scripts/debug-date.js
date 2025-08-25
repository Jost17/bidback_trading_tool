/**
 * Debug date parsing specifically
 */

const CSVMigration = require('./csv-migration.js');

function testDateParsing() {
  const migration = new CSVMigration();
  
  console.log('=== Testing Date Parsing ===\n');
  
  // Test the parseCSVLine function
  const testLine = '12/31/2024,207,138,2.21,0.96,1088,1035,65,128,24,22,1104,1840,6106,19.47,"5,881.63"';
  console.log('1. Raw line:', testLine);
  
  const parsedValues = migration.parseCSVLine(testLine);
  console.log('2. Parsed values:', parsedValues);
  console.log('3. First value (date):', parsedValues[0]);
  
  // Test the normalizeDate function
  const testDate = parsedValues[0];
  const normalizedDate = migration.normalizeDate(testDate, '2024');
  console.log('4. Normalized date:', normalizedDate);
  
  // Test the parseValue function
  const parsedDate = migration.parseValue(testDate);
  console.log('5. Parsed date value:', parsedDate);
  
  // Test mapColumns with a mock row
  const mockRow = {
    'Date': testDate,
    'Number of stocks up 4% plus today': '207',
    'Number of stocks down 4% plus today': '138'
  };
  
  const mockMapping = {
    'Date': 'date',
    'Number of stocks up 4% plus today': 'stocks_up_4pct_daily',
    'Number of stocks down 4% plus today': 'stocks_down_4pct_daily',
    '_year': '2024'
  };
  
  console.log('6. Mock row:', mockRow);
  const mappedRow = migration.mapColumns(mockRow, mockMapping);
  console.log('7. Mapped row:', mappedRow);
}

testDateParsing();