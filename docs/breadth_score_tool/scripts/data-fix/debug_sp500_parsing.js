#!/usr/bin/env node

/**
 * Debug Script für S&P 500 Parsing
 */

import fs from 'fs';

const csvFile = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2025.csv';

function debugCSVParsing() {
  console.log('🔍 Debugging CSV parsing for S&P 500...\n');
  
  const content = fs.readFileSync(csvFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`📄 Total lines: ${lines.length}`);
  console.log(`📄 First 5 lines:`);
  
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    console.log(`Line ${i + 1}: ${lines[i]}`);
  }
  
  console.log('\n📊 Analyzing data lines (skipping headers)...');
  
  const dataLines = lines.slice(2); // Skip first two headers
  console.log(`Data lines to process: ${dataLines.length}`);
  
  for (let i = 0; i < Math.min(5, dataLines.length); i++) {
    const line = dataLines[i];
    const columns = line.split(',');
    
    console.log(`\nData line ${i + 1}:`);
    console.log(`  Raw line: ${line}`);
    console.log(`  Columns count: ${columns.length}`);
    console.log(`  Date column: "${columns[0]}"`);
    console.log(`  Last column (S&P): "${columns[columns.length - 1]}"`);
    
    // Parse date
    if (columns[0]) {
      const dateParts = columns[0].split('/');
      if (dateParts.length === 3) {
        const month = dateParts[0].padStart(2, '0');
        const day = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        const formattedDate = `${year}-${month}-${day}`;
        console.log(`  Parsed date: ${formattedDate}`);
      }
    }
    
    // Parse S&P 500
    const sp500Column = columns[columns.length - 1];
    if (sp500Column) {
      console.log(`  S&P raw: "${sp500Column}"`);
      
      // Test verschiedene Cleaning-Methoden
      const cleaned1 = sp500Column.replace(/^["\\s]+|["\\s]+$/g, '');
      console.log(`  S&P cleaned (method 1): "${cleaned1}"`);
      
      const cleaned2 = sp500Column.replace(/[",]/g, '');
      console.log(`  S&P cleaned (method 2): "${cleaned2}"`);
      
      const numValue = parseFloat(cleaned1.replace(/,/g, ''));
      console.log(`  S&P numeric value: ${numValue}`);
      console.log(`  Is valid (>100): ${!isNaN(numValue) && numValue > 100}`);
    }
  }
  
  console.log('\n🧪 Testing parsing logic...');
  
  let validCount = 0;
  
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const columns = line.split(',');
    
    if (columns.length < 10) continue;
    
    // Parse date
    const dateParts = columns[0].split('/');
    if (dateParts.length !== 3) continue;
    
    const month = dateParts[0].padStart(2, '0');
    const day = dateParts[1].padStart(2, '0');
    const year = dateParts[2];
    const formattedDate = `${year}-${month}-${day}`;
    
    // Parse S&P 500
    const sp500Column = columns[columns.length - 1];
    
    if (sp500Column && sp500Column.trim()) {
      let cleanValue = sp500Column.replace(/^["\\s]+|["\\s]+$/g, '');
      
      if (cleanValue && cleanValue !== '0' && cleanValue !== '5' && cleanValue !== 'S&P') {
        const numValue = parseFloat(cleanValue.replace(/,/g, ''));
        if (!isNaN(numValue) && numValue > 100) {
          validCount++;
          if (validCount <= 3) {
            console.log(`  Valid record ${validCount}: ${formattedDate} = ${cleanValue}`);
          }
        }
      }
    }
  }
  
  console.log(`\n📊 Total valid S&P 500 records found: ${validCount}`);
}

debugCSVParsing();