#!/usr/bin/env node

import fs from 'fs';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

const csvFile = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2025.csv';
const content = fs.readFileSync(csvFile, 'utf-8');
const lines = content.split('\n').filter(line => line.trim());

console.log('🧪 Testing corrected CSV parsing...');

const testLine = lines[2]; // First data line
console.log(`\\nTest line: ${testLine}`);

const columnsOld = testLine.split(',');
console.log(`\\nOld method (split(',')):`);
console.log(`  Columns: ${columnsOld.length}`);
console.log(`  Last column: "${columnsOld[columnsOld.length - 1]}"`);

const columnsNew = parseCSVLine(testLine);
console.log(`\\nNew method (parseCSVLine):`);
console.log(`  Columns: ${columnsNew.length}`);
console.log(`  Last column: "${columnsNew[columnsNew.length - 1]}"`);

// Test S&P parsing
const sp500Column = columnsNew[columnsNew.length - 1];
const cleanValue = sp500Column.replace(/^"|"$/g, '');
const numValue = parseFloat(cleanValue.replace(/,/g, ''));

console.log(`\\nS&P 500 parsing:`);
console.log(`  Raw: "${sp500Column}"`);
console.log(`  Cleaned: "${cleanValue}"`);
console.log(`  Numeric: ${numValue}`);
console.log(`  Valid: ${!isNaN(numValue) && numValue > 100}`);

// Test alle Datenzeilen
let validCount = 0;
const dataLines = lines.slice(2);

for (let i = 0; i < dataLines.length; i++) {
  const line = dataLines[i];
  const columns = parseCSVLine(line);
  
  if (columns.length < 10) continue;
  
  const dateParts = columns[0].split('/');
  if (dateParts.length !== 3) continue;
  
  const sp500Column = columns[columns.length - 1];
  if (sp500Column && sp500Column.trim()) {
    let cleanValue = sp500Column.replace(/^"|"$/g, '');
    
    if (cleanValue && cleanValue !== '0' && cleanValue !== '5' && cleanValue !== 'S&P') {
      const numValue = parseFloat(cleanValue.replace(/,/g, ''));
      if (!isNaN(numValue) && numValue > 100) {
        validCount++;
      }
    }
  }
}

console.log(`\\n📊 Total valid records with new parsing: ${validCount}`);