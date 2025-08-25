#!/usr/bin/env node

/**
 * DIRECT SQLITE MASS CORRECTION SCRIPT
 * 
 * Umgeht API Rate Limits durch direkten SQLite-Datenbankzugriff
 * Schnelle und effiziente Massen-Updates für alle Jahre 2024-2009
 * 
 * Strategie:
 * 1. Direkter Zugriff auf SQLite-Datenbank
 * 2. Batch-Updates mit Transaktionen
 * 3. CSV-Daten als authoritative Quelle
 * 4. Backup vor Änderungen
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { parseCSVFile } from './compare_csv_with_database.js';

// Datenbank-Pfad
const DB_PATH = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/backend/data/market_monitor.db';
const BACKUP_PATH = `/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/scripts/data-fix/backup_${Date.now()}.db`;

// Jahre für Massen-Korrektur
const YEARS_TO_FIX = ['2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2011', '2010', '2009'];

const csvFiles = {
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

// Progress Tracking
let totalRecords = 0;
let processedRecords = 0;
let updatedRecords = 0;
let createdRecords = 0;
let skippedRecords = 0;

/**
 * Erstelle Backup der Datenbank
 */
function createBackup() {
  console.log('🔄 Creating database backup...');
  
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database not found at ${DB_PATH}`);
  }
  
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log(`✅ Backup created: ${BACKUP_PATH}`);
}

/**
 * Prüfe ob CSV und DB Record signifikant unterschiedlich sind
 */
function needsUpdate(csvRecord, dbRecord) {
  // Hauptfelder prüfen
  const criticalFields = ['stocks_up_4pct', 'stocks_down_4pct', 'stocks_up_25pct_quarter', 'stocks_down_25pct_quarter'];
  
  for (const field of criticalFields) {
    const csvVal = csvRecord[field];
    const dbVal = dbRecord[field];
    
    // Skip if both null/undefined
    if ((csvVal === null || csvVal === undefined) && (dbVal === null || dbVal === undefined)) continue;
    
    // One is null, other isn't
    if ((csvVal === null || csvVal === undefined) !== (dbVal === null || dbVal === undefined)) return true;
    
    // Significant numerical difference
    if (csvVal !== null && dbVal !== null && Math.abs(csvVal - dbVal) > 1) return true;
  }
  
  return false;
}

/**
 * Verarbeite ein Jahr mit direktem SQLite-Zugriff
 */
function processYear(db, year) {
  console.log(`\\n🎯 ==================== PROCESSING YEAR ${year} ====================`);
  
  const csvFile = csvFiles[year];
  if (!csvFile || !fs.existsSync(csvFile)) {
    console.log(`❌ CSV file not found for ${year}`);
    return { updated: 0, created: 0, skipped: 0, errors: 0 };
  }
  
  // Parse CSV-Daten
  console.log(`📖 Reading CSV data for ${year}...`);
  const csvData = parseCSVFile(csvFile);
  
  if (csvData.length === 0) {
    console.log(`❌ No CSV data parsed for ${year}`);
    return { updated: 0, created: 0, skipped: 0, errors: 0 };
  }
  
  // Hole entsprechende Datenbank-Daten
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  console.log(`🔍 Fetching database data for ${year}...`);
  const dbData = db.prepare(`
    SELECT * FROM market_data 
    WHERE date >= ? AND date <= ?
    ORDER BY date
  `).all(startDate, endDate);
  
  console.log(`📊 Found ${csvData.length} CSV records, ${dbData.length} DB records`);
  
  // Erstelle Lookup-Map für DB-Daten
  const dbMap = new Map();
  dbData.forEach(record => {
    dbMap.set(record.date, record);
  });
  
  // Prepare Statements für bessere Performance
  const updateStmt = db.prepare(`
    UPDATE market_data SET
      stocks_up_4pct = ?,
      stocks_down_4pct = ?,
      stocks_up_25pct_quarter = ?,
      stocks_down_25pct_quarter = ?,
      stocks_up_25pct_month = ?,
      stocks_down_25pct_month = ?,
      stocks_up_50pct_month = ?,
      stocks_down_50pct_month = ?,
      stocks_up_13pct_34days = ?,
      stocks_down_13pct_34days = ?,
      worden_universe = ?,
      t2108 = ?,
      sp500 = ?,
      source_file = 'CSV_CORRECTED_' || ?,
      import_format = 'sqlite_correction',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  const insertStmt = db.prepare(`
    INSERT INTO market_data (
      date, stocks_up_4pct, stocks_down_4pct,
      stocks_up_25pct_quarter, stocks_down_25pct_quarter,
      stocks_up_25pct_month, stocks_down_25pct_month,
      stocks_up_50pct_month, stocks_down_50pct_month,
      stocks_up_13pct_34days, stocks_down_13pct_34days,
      worden_universe, t2108, sp500,
      source_file, import_format, data_quality_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let yearUpdated = 0;
  let yearCreated = 0;
  let yearSkipped = 0;
  let yearErrors = 0;
  
  // Transaction für bessere Performance und Atomicity
  const transaction = db.transaction(() => {
    for (const csvRecord of csvData) {
      processedRecords++;
      
      const dbRecord = dbMap.get(csvRecord.date);
      
      // Progress anzeigen
      if (processedRecords % 100 === 0) {
        const percent = Math.round((processedRecords / totalRecords) * 100);
        process.stdout.write(`\\r   📈 Progress: ${processedRecords}/${totalRecords} (${percent}%) - Updated: ${updatedRecords}, Created: ${createdRecords}, Skipped: ${skippedRecords}`);
      }
      
      try {
        if (dbRecord) {
          // Record existiert - prüfe ob Update nötig
          if (needsUpdate(csvRecord, dbRecord)) {
            updateStmt.run(
              csvRecord.stocks_up_4pct,
              csvRecord.stocks_down_4pct,
              csvRecord.stocks_up_25pct_quarter,
              csvRecord.stocks_down_25pct_quarter,
              csvRecord.stocks_up_25pct_month,
              csvRecord.stocks_down_25pct_month,
              csvRecord.stocks_up_50pct_month,
              csvRecord.stocks_down_50pct_month,
              csvRecord.stocks_up_13pct_34days,
              csvRecord.stocks_down_13pct_34days,
              csvRecord.worden_universe,
              csvRecord.t2108,
              csvRecord.sp500,
              year,
              dbRecord.id
            );
            
            updatedRecords++;
            yearUpdated++;
          } else {
            skippedRecords++;
            yearSkipped++;
          }
        } else {
          // Record existiert nicht - erstelle neuen
          insertStmt.run(
            csvRecord.date,
            csvRecord.stocks_up_4pct,
            csvRecord.stocks_down_4pct,
            csvRecord.stocks_up_25pct_quarter,
            csvRecord.stocks_down_25pct_quarter,
            csvRecord.stocks_up_25pct_month,
            csvRecord.stocks_down_25pct_month,
            csvRecord.stocks_up_50pct_month,
            csvRecord.stocks_down_50pct_month,
            csvRecord.stocks_up_13pct_34days,
            csvRecord.stocks_down_13pct_34days,
            csvRecord.worden_universe,
            csvRecord.t2108,
            csvRecord.sp500,
            `CSV_CORRECTED_${year}`,
            'sqlite_correction',
            1.0
          );
          
          createdRecords++;
          yearCreated++;
        }
      } catch (error) {
        console.error(`\\n❌ Error processing ${csvRecord.date}:`, error.message);
        yearErrors++;
      }
    }
  });
  
  console.log(`\\n🔄 Executing transaction for ${year}...`);
  transaction();
  
  console.log(`✅ Year ${year} completed: ${yearUpdated} updated, ${yearCreated} created, ${yearSkipped} skipped, ${yearErrors} errors`);
  
  return { updated: yearUpdated, created: yearCreated, skipped: yearSkipped, errors: yearErrors };
}

/**
 * Hauptfunktion
 */
function main() {
  console.log('🚀 STARTING DIRECT SQLITE MASS CORRECTION\\n');
  console.log('⚡ Using direct database access for maximum speed');
  console.log('📊 Processing years: ' + YEARS_TO_FIX.join(', '));
  console.log('');
  
  try {
    // Backup erstellen
    createBackup();
    
    // Datenbank öffnen
    console.log('🔌 Opening database connection...');
    const db = new Database(DB_PATH);
    
    // Berechne Gesamtanzahl Records für Progress-Tracking
    for (const year of YEARS_TO_FIX) {
      const csvFile = csvFiles[year];
      if (csvFile && fs.existsSync(csvFile)) {
        const csvData = parseCSVFile(csvFile);
        totalRecords += csvData.length;
      }
    }
    
    console.log(`📈 Total records to process: ${totalRecords}\\n`);
    
    const startTime = Date.now();
    const results = [];
    
    // Verarbeite jedes Jahr
    for (const year of YEARS_TO_FIX) {
      try {
        const result = processYear(db, year);
        results.push({ year, ...result });
      } catch (error) {
        console.error(`💥 Fatal error processing year ${year}:`, error.message);
        results.push({ year, updated: 0, created: 0, skipped: 0, errors: 1 });
      }
    }
    
    // Datenbank schließen
    db.close();
    
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const durationSec = Math.round(durationMs / 100) / 10;
    
    // Final Summary
    console.log('\\n\\n🎊 ==================== SQLITE MASS CORRECTION COMPLETE ====================');
    console.log(`⏱️  Duration: ${durationSec} seconds`);
    console.log(`📊 Total Records Processed: ${processedRecords}`);
    console.log(`✅ Records Updated: ${updatedRecords}`);
    console.log(`➕ Records Created: ${createdRecords}`);
    console.log(`⏭️  Records Skipped (no changes needed): ${skippedRecords}`);
    console.log(`📈 Success Rate: ${Math.round(((updatedRecords + createdRecords) / processedRecords) * 100)}%`);
    
    // Year-by-year breakdown
    console.log('\\n📋 Year-by-year Results:');
    results.forEach(result => {
      const total = result.updated + result.created + result.skipped + result.errors;
      console.log(`   ${result.year}: ${result.updated} updated, ${result.created} created, ${result.skipped} skipped, ${result.errors} errors (${total} total)`);
    });
    
    console.log(`\\n💾 Database backup saved: ${BACKUP_PATH}`);
    
    if (updatedRecords + createdRecords > 0) {
      console.log('\\n🎯 RECOMMENDATION: Restart backend server to see changes');
      console.log('🔍 Run verification script to confirm data integrity');
    }
    
    console.log('\\n🏁 Direct SQLite mass correction finished successfully!');
    
  } catch (error) {
    console.error('💥 FATAL ERROR:', error.message);
    console.log(`\\n🔄 Database backup available at: ${BACKUP_PATH}`);
    process.exit(1);
  }
}

// Führe das Script aus
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}