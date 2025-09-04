#!/usr/bin/env node

/**
 * Script zur Korrektur von S&P 500 Werten (Version 2)
 * 
 * Behebt falsche und fehlende S&P 500 Werte aus CSV-Dateien
 */

import Database from 'better-sqlite3';
import fs from 'fs';

const DB_PATH = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/backend/data/market_monitor.db';

// CSV-Dateien für verschiedene Jahre
const csvFiles = {
  '2025': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2025.csv',
  '2024': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2024.csv',
  '2023': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2023.csv',
  '2022': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2022.csv',
  '2021': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2021.csv'
};

/**
 * Parse CSV-Datei für S&P 500 Werte
 */
function parseCSVForSP500(filePath) {
  console.log(`📖 Reading CSV file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\\n').filter(line => line.trim());
  
  if (lines.length < 3) {
    console.error(`❌ Invalid CSV file: ${filePath}`);
    return [];
  }
  
  // Skip first two header lines
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
      
      // Parse S&P 500 value (letzte Spalte)
      let sp500Value = null;
      const sp500Column = columns[columns.length - 1]; // Letzte Spalte
      
      if (sp500Column && sp500Column.trim()) {
        // Entferne nur führende/nachfolgende Anführungszeichen und Leerzeichen
        let cleanValue = sp500Column.replace(/^["\\s]+|["\\s]+$/g, '');
        
        // Prüfe ob es ein gültiger S&P 500 Wert ist
        if (cleanValue && cleanValue !== '0' && cleanValue !== '5' && cleanValue !== 'S&P') {
          // Konvertiere für Validierung (entferne Kommas)
          const numValue = parseFloat(cleanValue.replace(/,/g, ''));
          if (!isNaN(numValue) && numValue > 100) { // S&P 500 sollte > 100 sein
            sp500Value = cleanValue; // Behalte Original-Format mit Kommas
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
      console.warn(`⚠️ Could not parse line ${i + 3}: ${line.substring(0, 100)}`);
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
  
  // Zeige erste paar CSV-Werte zum Debugging
  console.log(`   📄 Sample CSV data:`)
  csvData.slice(0, 3).forEach(record => {
    console.log(`     ${record.date}: ${record.sp500}`);
  });
  
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
      
      let shouldUpdate = false;
      let reason = '';
      
      if (!currentDbValue || currentDbValue.trim() === '' || currentDbValue === 'null') {
        shouldUpdate = true;
        reason = 'null/empty DB value';
      } else {
        // Vergleiche numerische Werte
        const csvNum = parseFloat(csvValue.replace(/[",]/g, ''));
        const dbNum = parseFloat(currentDbValue.toString().replace(/[",]/g, ''));
        
        if (!isNaN(csvNum) && !isNaN(dbNum)) {
          const percentDiff = Math.abs((csvNum - dbNum) / dbNum) * 100;
          if (percentDiff > 1) { // Mehr als 1% Unterschied
            shouldUpdate = true;
            reason = `${percentDiff.toFixed(1)}% difference`;
          }
        } else if (isNaN(dbNum) && !isNaN(csvNum)) {
          shouldUpdate = true;
          reason = 'invalid DB value';
        }
      }
      
      if (shouldUpdate) {
        updateStmt.run(csvValue, dbRecord.id);
        updated++;
        console.log(`   ✅ ${dbRecord.date}: ${currentDbValue || 'null'} → ${csvValue} (${reason})`);
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
  console.log('🔧 Fixing S&P 500 values (Version 2)...\\n');
  
  const db = new Database(DB_PATH);
  
  try {
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    // Bearbeite nur verfügbare Jahre in umgekehrter Reihenfolge (neueste zuerst)
    const availableYears = Object.keys(csvFiles).sort().reverse();
    
    for (const year of availableYears) {
      const csvPath = csvFiles[year];
      
      if (!fs.existsSync(csvPath)) {
        console.log(`⚠️ CSV file not found for ${year}: ${csvPath}`);
        continue;
      }
      
      // Parse CSV-Daten
      const csvData = parseCSVForSP500(csvPath);
      
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