#!/usr/bin/env node

/**
 * Script zur Analyse und Korrektur der Daten-Diskrepanzen zwischen CSV-Dateien und Datenbank
 * 
 * Problem: 
 * - CSV zeigt für 5/22/2025: 4% up: 211, 4% down: 126, 25% quarter up: 1499, 25% quarter down: 1068
 * - Datenbank zeigt für 2025-05-22: 4% up: 151, 4% down: 129, 25% quarter up: 1453, 25% quarter down: 1015
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

// CSV-Datei-Pfade
const csvFiles = {
  '2025': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2025.csv',
  '2024': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2024.csv',
  '2023': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2023.csv'
};

/**
 * Parse CSV-Daten aus einer Datei
 */
function parseCSVFile(filePath) {
  console.log(`📖 Reading CSV file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    console.error(`❌ Invalid CSV file: ${filePath}`);
    return [];
  }
  
  // Skip first two lines (headers)
  const dataLines = lines.slice(2);
  const records = [];
  
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const columns = line.split(',');
    
    if (columns.length < 10) continue;
    
    try {
      // Parse date from MM/DD/YYYY format
      const dateParts = columns[0].split('/');
      if (dateParts.length !== 3) continue;
      
      const month = dateParts[0].padStart(2, '0');
      const day = dateParts[1].padStart(2, '0');
      const year = dateParts[2];
      const formattedDate = `${year}-${month}-${day}`;
      
      const record = {
        date: formattedDate,
        originalDate: columns[0],
        stocks_up_4pct: parseFloat(columns[1]) || null,
        stocks_down_4pct: parseFloat(columns[2]) || null,
        ratio_5day: parseFloat(columns[3]) || null,
        ratio_10day: parseFloat(columns[4]) || null,
        stocks_up_25pct_quarter: parseFloat(columns[5]) || null,
        stocks_down_25pct_quarter: parseFloat(columns[6]) || null,
        stocks_up_25pct_month: parseFloat(columns[7]) || null,
        stocks_down_25pct_month: parseFloat(columns[8]) || null,
        stocks_up_50pct_month: parseFloat(columns[9]) || null,
        stocks_down_50pct_month: parseFloat(columns[10]) || null,
        stocks_up_13pct_34days: parseFloat(columns[11]) || null,
        stocks_down_13pct_34days: parseFloat(columns[12]) || null,
        worden_universe: parseFloat(columns[13]) || null,
        t2108: parseFloat(columns[14]) || null,
        sp500: columns[15] ? columns[15].replace(/"/g, '') : null
      };
      
      records.push(record);
    } catch (error) {
      console.warn(`⚠️ Could not parse line ${i + 3}: ${line}`);
    }
  }
  
  console.log(`✅ Parsed ${records.length} records from ${path.basename(filePath)}`);
  return records;
}

/**
 * Hole Datenbank-Daten für einen Datumsbereich
 */
async function getDatabaseData(startDate, endDate) {
  const url = `${API_BASE}/market-data?startDate=${startDate}&endDate=${endDate}&limit=1000`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error(`❌ Error fetching database data: ${error.message}`);
    return [];
  }
}

/**
 * Vergleiche CSV-Daten mit Datenbank-Daten
 */
function compareRecords(csvRecord, dbRecord) {
  const discrepancies = [];
  
  const fields = [
    'stocks_up_4pct',
    'stocks_down_4pct', 
    'ratio_5day',
    'ratio_10day',
    'stocks_up_25pct_quarter',
    'stocks_down_25pct_quarter',
    'stocks_up_25pct_month',
    'stocks_down_25pct_month',
    'stocks_up_50pct_month',
    'stocks_down_50pct_month',
    'stocks_up_13pct_34days',
    'stocks_down_13pct_34days',
    'worden_universe',
    't2108'
  ];
  
  for (const field of fields) {
    const csvValue = csvRecord[field];
    const dbValue = dbRecord[field];
    
    // Skip null comparisons
    if (csvValue === null && dbValue === null) continue;
    if (csvValue === null || dbValue === null) {
      if (!(csvValue === null && dbValue === null)) {
        discrepancies.push({
          field,
          csvValue,
          dbValue,
          type: 'null_mismatch'
        });
      }
      continue;
    }
    
    // Compare numeric values with tolerance
    const diff = Math.abs(csvValue - dbValue);
    if (diff > 0.01) {
      discrepancies.push({
        field,
        csvValue,
        dbValue,
        difference: diff,
        type: 'value_mismatch'
      });
    }
  }
  
  return discrepancies;
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log('🔍 Starting CSV vs Database comparison...\n');
  
  // Teste erst mit 2025 Daten
  console.log('📊 Analyzing 2025 data...');
  const csvData2025 = parseCSVFile(csvFiles['2025']);
  
  if (csvData2025.length === 0) {
    console.error('❌ No CSV data found for 2025');
    return;
  }
  
  // Hole entsprechende Datenbank-Daten
  const startDate = '2025-05-20';
  const endDate = '2025-05-25';
  
  console.log(`\n🔍 Fetching database data for ${startDate} to ${endDate}...`);
  const dbData = await getDatabaseData(startDate, endDate);
  
  console.log(`📈 Found ${dbData.length} database records`);
  console.log(`📄 Found ${csvData2025.length} CSV records for this period\n`);
  
  // Finde das spezifische Problem-Datum
  const problemDate = '2025-05-22';
  const csvRecord = csvData2025.find(r => r.date === problemDate);
  const dbRecord = dbData.find(r => r.date === problemDate);
  
  if (!csvRecord) {
    console.error(`❌ CSV record not found for ${problemDate}`);
    return;
  }
  
  if (!dbRecord) {
    console.error(`❌ Database record not found for ${problemDate}`);
    return;
  }
  
  console.log(`🎯 Analyzing specific date: ${problemDate}\n`);
  
  // Detaillierter Vergleich
  console.log('📊 CSV Data:');
  console.log(`   4% up: ${csvRecord.stocks_up_4pct}`);
  console.log(`   4% down: ${csvRecord.stocks_down_4pct}`);
  console.log(`   25% quarter up: ${csvRecord.stocks_up_25pct_quarter}`);
  console.log(`   25% quarter down: ${csvRecord.stocks_down_25pct_quarter}`);
  
  console.log('\n🗄️  Database Data:');
  console.log(`   4% up: ${dbRecord.stocks_up_4pct}`);
  console.log(`   4% down: ${dbRecord.stocks_down_4pct}`);
  console.log(`   25% quarter up: ${dbRecord.stocks_up_25pct_quarter}`);
  console.log(`   25% quarter down: ${dbRecord.stocks_down_25pct_quarter}`);
  console.log(`   Source: ${dbRecord.source_file}`);
  console.log(`   Import format: ${dbRecord.import_format}`);
  
  // Vergleich durchführen
  const discrepancies = compareRecords(csvRecord, dbRecord);
  
  console.log(`\n🔍 Found ${discrepancies.length} discrepancies:`);
  discrepancies.forEach(disc => {
    console.log(`   ⚠️  ${disc.field}: CSV=${disc.csvValue}, DB=${disc.dbValue} (diff: ${disc.difference || 'N/A'})`);
  });
  
  // Analysiere alle Daten in diesem Zeitraum
  console.log('\n📈 Full period analysis:');
  const csvDateRange = csvData2025.filter(r => r.date >= startDate && r.date <= endDate);
  
  for (const csvRec of csvDateRange) {
    const dbRec = dbData.find(r => r.date === csvRec.date);
    if (dbRec) {
      const discs = compareRecords(csvRec, dbRec);
      if (discs.length > 0) {
        console.log(`   📅 ${csvRec.date}: ${discs.length} discrepancies`);
        discs.slice(0, 3).forEach(d => {
          console.log(`      - ${d.field}: CSV=${d.csvValue} vs DB=${d.dbValue}`);
        });
      } else {
        console.log(`   ✅ ${csvRec.date}: Data matches`);
      }
    } else {
      console.log(`   ❌ ${csvRec.date}: Missing in database`);
    }
  }
  
  console.log('\n🏁 Analysis complete!');
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { parseCSVFile, getDatabaseData, compareRecords };