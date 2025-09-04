#!/usr/bin/env node

/**
 * Script zur Korrektur von S&P 500 Werten
 * 
 * Behebt falsche und fehlende S&P 500 Werte aus CSV-Dateien
 */

import Database from 'better-sqlite3';
import { parseCSVFile } from './compare_csv_with_database.js';
import fs from 'fs';

const DB_PATH = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/backend/data/market_monitor.db';

// CSV-Dateien für verschiedene Jahre
const csvFiles = {
  '2025': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2025.csv',
  '2024': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2024.csv',
  '2023': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2023.csv',
  '2022': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2022.csv',
  '2021': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2021.csv',
  '2020': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2020.csv',
  '2019': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2019.csv',
  '2018': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2018.csv',
  '2017': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2017.csv',
  '2016': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2016.csv',
  '2015': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2015.csv',
  '2014': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2014.csv',
  '2013': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2013.csv',
  '2012': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2012.csv',
  '2011': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2011.csv',
  '2010': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2010.csv',
  '2009': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2009.csv'
};

/**
 * Verbesserte CSV-Parsing-Funktion speziell für S&P 500
 */
function parseCSVFileForSP500(filePath) {
  console.log(`📖 Reading CSV file for S&P 500: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\\n').filter(line => line.trim());
  
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
    
    if (columns.length < 16) continue; // S&P 500 is in column 15 (index 15)
    
    try {
      // Parse date from MM/DD/YYYY format
      const dateParts = columns[0].split('/');
      if (dateParts.length !== 3) continue;
      
      const month = dateParts[0].padStart(2, '0');
      const day = dateParts[1].padStart(2, '0');
      const year = dateParts[2];
      const formattedDate = `${year}-${month}-${day}`;
      
      // Parse S&P 500 value (column 15, index 15)
      let sp500Value = null;
      if (columns[15] && columns[15].trim()) {
        // Entferne Anführungszeichen und Leerzeichen
        let cleanValue = columns[15].replace(/[",\\s]/g, '');
        
        // Prüfe auf verschiedene Formate
        if (cleanValue && cleanValue !== '0' && cleanValue !== '5') {
          const numValue = parseFloat(cleanValue);
          if (!isNaN(numValue) && numValue > 10) { // S&P 500 sollte > 10 sein
            sp500Value = cleanValue; // Behalte als String für Formatierung
          }
        }
      }
      
      if (sp500Value) {
        records.push({
          date: formattedDate,
          sp500: sp500Value
        });
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not parse line ${i + 3}: ${line}`);
    }
  }
  
  console.log(`✅ Parsed ${records.length} S&P 500 records from ${filePath.split('/').pop()}`);
  return records;
}

/**
 * Korrigiere S&P 500 Werte für ein Jahr
 */
function correctYearData(year, csvData, db) {
  console.log(`\\n🔧 Correcting ${year} S&P 500 data...`);
  
  if (csvData.length === 0) {
    console.log(`   ⚠️ No CSV data available for ${year}`);
    return { updated: 0, skipped: 0 };
  }
  
  const csvMap = new Map();
  csvData.forEach(record => {
    csvMap.set(record.date, record.sp500);
  });
  
  // Hole alle DB-Datensätze für dieses Jahr
  const dbRecords = db.prepare(`
    SELECT id, date, sp500
    FROM market_data 
    WHERE date LIKE '${year}-%'
    ORDER BY date ASC
  `).all();
  
  const updateStmt = db.prepare('UPDATE market_data SET sp500 = ? WHERE id = ?');
  
  let updated = 0;
  let skipped = 0;
  
  for (const dbRecord of dbRecords) {
    const csvValue = csvMap.get(dbRecord.date);
    
    if (csvValue) {
      // Vergleiche Werte
      const currentDbValue = dbRecord.sp500;
      
      // Update nur wenn:
      // 1. DB-Wert ist null/leer
      // 2. Oder CSV-Wert deutlich anders ist (mehr als 1% Unterschied)
      let shouldUpdate = false;
      
      if (!currentDbValue || currentDbValue.trim() === '') {
        shouldUpdate = true;
      } else {
        // Vergleiche numerische Werte
        const csvNum = parseFloat(csvValue.replace(/[",]/g, ''));
        const dbNum = parseFloat(currentDbValue.replace(/[",]/g, ''));
        
        if (!isNaN(csvNum) && !isNaN(dbNum)) {
          const percentDiff = Math.abs((csvNum - dbNum) / dbNum) * 100;
          if (percentDiff > 1) { // Mehr als 1% Unterschied
            shouldUpdate = true;
          }
        }
      }
      
      if (shouldUpdate) {
        updateStmt.run(csvValue, dbRecord.id);
        updated++;
        console.log(`   ✅ ${dbRecord.date}: Updated to ${csvValue}`);
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }
  }
  
  console.log(`   📊 ${year}: Updated ${updated}, Skipped ${skipped}`);
  return { updated, skipped };
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log('🔧 Fixing S&P 500 values...\\n');
  
  const db = new Database(DB_PATH);
  
  try {
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    // Bearbeite alle verfügbaren Jahre
    for (const [year, csvPath] of Object.entries(csvFiles)) {
      if (!fs.existsSync(csvPath)) {
        console.log(`⚠️ CSV file not found for ${year}: ${csvPath}`);
        continue;
      }
      
      // Parse CSV-Daten mit verbesserter Logik
      const csvData = parseCSVFileForSP500(csvPath);
      
      // Korrigiere Jahr
      const result = correctYearData(year, csvData, db);
      totalUpdated += result.updated;
      totalSkipped += result.skipped;
    }
    
    console.log(`\\n📊 Overall summary:`);
    console.log(`   ✅ Total updated: ${totalUpdated}`);
    console.log(`   ⏭️ Total skipped: ${totalSkipped}`);
    
    // Verifikation
    console.log('\\n🔍 Verification...');
    const totalRecords = db.prepare('SELECT COUNT(*) as count FROM market_data').get();
    const nullSP500 = db.prepare("SELECT COUNT(*) as count FROM market_data WHERE sp500 IS NULL OR sp500 = ''").get();
    const validSP500 = totalRecords.count - nullSP500.count;
    
    console.log(`📈 Final statistics:`);
    console.log(`   Total records: ${totalRecords.count}`);
    console.log(`   Valid S&P 500: ${validSP500} (${(validSP500/totalRecords.count*100).toFixed(1)}%)`);
    console.log(`   Null S&P 500: ${nullSP500.count} (${(nullSP500.count/totalRecords.count*100).toFixed(1)}%)`);
    
    if (totalUpdated > 0) {
      console.log('\\n🎉 S&P 500 correction completed successfully!');
    } else {
      console.log('\\n✅ No S&P 500 values needed correction');
    }
    
  } finally {
    db.close();
  }
  
  console.log('\\n🏁 S&P 500 fix complete!');
}

// Führe das Script aus
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}