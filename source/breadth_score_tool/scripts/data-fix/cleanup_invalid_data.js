#!/usr/bin/env node

/**
 * Script zur Bereinigung ungültiger Daten
 * 
 * Löscht alle Daten, die nicht in verfügbaren CSV-Quellen existieren
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/backend/data/market_monitor.db';
const SOURCE_DIR = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source';

/**
 * Parse CSV-Datei für verfügbare Daten
 */
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

function getValidDatesFromCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    return new Set();
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return new Set();
  }
  
  const dataLines = lines.slice(2); // Skip headers
  const dates = new Set();
  
  for (const line of dataLines) {
    const columns = parseCSVLine(line);
    if (columns.length < 2) continue;
    
    try {
      // Parse date from MM/DD/YYYY format
      const dateParts = columns[0].split('/');
      if (dateParts.length === 3) {
        const month = dateParts[0].padStart(2, '0');
        const day = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        const formattedDate = `${year}-${month}-${day}`;
        dates.add(formattedDate);
      }
    } catch (error) {
      // Ignore parse errors
    }
  }
  
  return dates;
}

/**
 * Sammle alle gültigen Daten aus CSV-Dateien
 */
function collectValidDates() {
  console.log('📁 Scanning CSV files for valid dates...');
  
  const files = fs.readdirSync(SOURCE_DIR);
  const csvFiles = files.filter(f => f.endsWith('.csv'));
  
  const validDates = new Set();
  const yearFiles = {};
  
  csvFiles.forEach(file => {
    // Extrahiere Jahr aus Dateiname
    let year = null;
    
    const yearMatch1 = file.match(/- (\d{4})\.csv$/);
    if (yearMatch1) {
      year = yearMatch1[1];
    }
    
    const yearMatch2 = file.match(/(\d{4}) reformatted\.csv$/);
    if (yearMatch2) {
      year = yearMatch2[1];
    }
    
    if (year) {
      const filePath = path.join(SOURCE_DIR, file);
      const csvDates = getValidDatesFromCSV(filePath);
      
      console.log(`   ${year}: ${csvDates.size} valid dates from ${file}`);
      
      yearFiles[year] = { file, path: filePath, dates: csvDates.size };
      
      // Alle Daten zur Master-Liste hinzufügen
      csvDates.forEach(date => validDates.add(date));
    }
  });
  
  console.log(`\\n📊 Total valid dates across all CSVs: ${validDates.size}`);
  return { validDates, yearFiles };
}

/**
 * Analysiere Datenbank und identifiziere ungültige Daten
 */
function analyzeDatabase(validDates, db) {
  console.log('\\n🔍 Analyzing database records...');
  
  // Alle Datensätze aus der Datenbank
  const allRecords = db.prepare(`
    SELECT id, date, source_file, import_format
    FROM market_data 
    ORDER BY date
  `).all();
  
  console.log(`📈 Total database records: ${allRecords.length}`);
  
  const validRecords = [];
  const invalidRecords = [];
  
  allRecords.forEach(record => {
    if (validDates.has(record.date)) {
      validRecords.push(record);
    } else {
      invalidRecords.push(record);
    }
  });
  
  console.log(`✅ Valid records: ${validRecords.length}`);
  console.log(`❌ Invalid records: ${invalidRecords.length}`);
  
  // Analyse der ungültigen Daten nach Jahr
  const invalidByYear = {};
  invalidRecords.forEach(record => {
    const year = record.date.substring(0, 4);
    if (!invalidByYear[year]) {
      invalidByYear[year] = [];
    }
    invalidByYear[year].push(record);
  });
  
  console.log('\\n📅 Invalid records by year:');
  Object.keys(invalidByYear).sort().forEach(year => {
    const count = invalidByYear[year].length;
    console.log(`   ${year}: ${count} invalid records`);
  });
  
  return { validRecords, invalidRecords, invalidByYear };
}

/**
 * Bereinige Datenbank
 */
function cleanupDatabase(invalidRecords, db, dryRun = true) {
  console.log(`\\n🧹 ${dryRun ? 'SIMULATING' : 'EXECUTING'} database cleanup...`);
  
  if (invalidRecords.length === 0) {
    console.log('✅ No invalid records to clean up!');
    return { deleted: 0 };
  }
  
  const deleteStmt = db.prepare('DELETE FROM market_data WHERE id = ?');
  let deleted = 0;
  
  if (dryRun) {
    console.log(`   Would delete ${invalidRecords.length} invalid records:`);
    
    // Zeige Beispiele
    const examples = invalidRecords.slice(0, 10);
    examples.forEach(record => {
      console.log(`     - ${record.date} (ID: ${record.id}, Source: ${record.source_file || 'unknown'})`);
    });
    
    if (invalidRecords.length > 10) {
      console.log(`     ... and ${invalidRecords.length - 10} more records`);
    }
  } else {
    console.log(`   Deleting ${invalidRecords.length} invalid records...`);
    
    const transaction = db.transaction(() => {
      for (const record of invalidRecords) {
        const result = deleteStmt.run(record.id);
        if (result.changes > 0) {
          deleted++;
        }
      }
    });
    
    transaction();
    console.log(`   ✅ Successfully deleted ${deleted} records`);
  }
  
  return { deleted };
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log('🧹 Database Cleanup - Remove Invalid Data\\n');
  
  // Sammle gültige Daten aus CSV-Dateien
  const { validDates, yearFiles } = collectValidDates();
  
  if (validDates.size === 0) {
    console.error('❌ No valid dates found in CSV files! Aborting cleanup.');
    return;
  }
  
  // Öffne Datenbank
  const db = new Database(DB_PATH);
  
  try {
    // Analysiere Datenbank
    const { validRecords, invalidRecords, invalidByYear } = analyzeDatabase(validDates, db);
    
    // Zeige Übersicht
    console.log('\\n📋 CLEANUP SUMMARY:');
    console.log(`   CSV sources: ${Object.keys(yearFiles).length} years`);
    console.log(`   Valid dates in CSVs: ${validDates.size}`);
    console.log(`   Valid DB records: ${validRecords.length}`);
    console.log(`   Invalid DB records: ${invalidRecords.length}`);
    console.log(`   Data integrity after cleanup: ${(validRecords.length / (validRecords.length + invalidRecords.length) * 100).toFixed(1)}%`);
    
    if (invalidRecords.length === 0) {
      console.log('\\n✅ Database is already clean! No action needed.');
      return;
    }
    
    // Dry-run erste
    cleanupDatabase(invalidRecords, db, true);
    
    // Frage nach Bestätigung
    console.log('\\n⚠️  WARNING: This will permanently delete data!');
    console.log('   This includes:');
    console.log(`   - All ${invalidRecords.filter(r => r.date < '2007-01-01').length} records before 2007 (no source data)`);
    console.log(`   - All ${invalidRecords.filter(r => r.date >= '2007-01-01').length} records that don\\'t match CSV dates`);
    
    // In diesem Script führen wir automatisch aus, da es ein Bereinigungsscript ist
    console.log('\\n🔄 Proceeding with cleanup...');
    
    // Backup-Info
    console.log('💾 Recommendation: Create database backup before proceeding!');
    console.log(`   cp "${DB_PATH}" "${DB_PATH}.backup.$(date +%Y%m%d_%H%M%S)"\\n`);
    
    // Führe Bereinigung aus
    const result = cleanupDatabase(invalidRecords, db, false);
    
    // Verifikation
    console.log('\\n🔍 Verification...');
    const remainingRecords = db.prepare('SELECT COUNT(*) as count FROM market_data').get();
    console.log(`📊 Remaining records: ${remainingRecords.count}`);
    console.log(`✅ Expected: ${validRecords.length}`);
    
    if (remainingRecords.count === validRecords.length) {
      console.log('🎉 Database cleanup completed successfully!');
      console.log(`   Removed: ${result.deleted} invalid records`);
      console.log(`   Kept: ${remainingRecords.count} valid records`);
      console.log(`   Final data integrity: 100%`);
    } else {
      console.log('⚠️  Warning: Record count mismatch! Please check the database.');
    }
    
  } finally {
    db.close();
  }
  
  console.log('\\n🏁 Database cleanup complete!');
}

// Führe das Script aus
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}