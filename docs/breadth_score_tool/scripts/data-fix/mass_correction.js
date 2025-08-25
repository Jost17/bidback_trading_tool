#!/usr/bin/env node

/**
 * MASS CORRECTION SCRIPT
 * 
 * Systematische Korrektur aller Jahre 2024-2009 basierend auf CSV-Daten
 * 
 * Strategie:
 * 1. CSV-Daten als authoritative Quelle verwenden
 * 2. Bestehende DB-Einträge mit CSV-Daten überschreiben  
 * 3. Fehlende Einträge aus CSV hinzufügen
 * 4. Progress-Tracking für große Anzahl Updates
 */

import fs from 'fs';
import fetch from 'node-fetch';
import { parseCSVFile } from './compare_csv_with_database.js';

const API_BASE = 'http://localhost:3001/api';

// Jahre für Massen-Korrektur (2025 bereits korrigiert)
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
let errorRecords = 0;

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
 * Update einen bestehenden Datenbank-Eintrag
 */
async function updateRecord(id, data) {
  const url = `${API_BASE}/market-data/${id}`;
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Error updating record ${id}: ${error.message}`);
    return null;
  }
}

/**
 * Erstelle einen neuen Datenbank-Eintrag
 */
async function createRecord(data) {
  const url = `${API_BASE}/market-data`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Error creating record: ${error.message}`);
    return null;
  }
}

/**
 * Konvertiere CSV-Record in API-Format
 */
function csvToApiData(csvRecord) {
  return {
    date: csvRecord.date,
    stocks_up_20pct: null, // Not in CSV, set to null
    stocks_down_20pct: null,
    stocks_up_20dollar: null,
    stocks_down_20dollar: null,
    stocks_up_4pct: csvRecord.stocks_up_4pct,
    stocks_down_4pct: csvRecord.stocks_down_4pct,
    stocks_up_25pct_quarter: csvRecord.stocks_up_25pct_quarter,
    stocks_down_25pct_quarter: csvRecord.stocks_down_25pct_quarter,
    stocks_up_25pct_month: csvRecord.stocks_up_25pct_month,
    stocks_down_25pct_month: csvRecord.stocks_down_25pct_month,
    stocks_up_50pct_month: csvRecord.stocks_up_50pct_month,
    stocks_down_50pct_month: csvRecord.stocks_down_50pct_month,
    stocks_up_13pct_34days: csvRecord.stocks_up_13pct_34days,
    stocks_down_13pct_34days: csvRecord.stocks_down_13pct_34days,
    worden_universe: csvRecord.worden_universe,
    t2108: csvRecord.t2108,
    sp500: csvRecord.sp500
  };
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
 * Verarbeite ein Jahr
 */
async function processYear(year) {
  console.log(`\\n🎯 ==================== PROCESSING YEAR ${year} ====================`);
  
  const csvFile = csvFiles[year];
  if (!csvFile || !fs.existsSync(csvFile)) {
    console.log(`❌ CSV file not found for ${year}`);
    return;
  }
  
  // Parse CSV-Daten
  console.log(`📖 Reading CSV data for ${year}...`);
  const csvData = parseCSVFile(csvFile);
  
  if (csvData.length === 0) {
    console.log(`❌ No CSV data parsed for ${year}`);
    return;
  }
  
  // Hole entsprechende Datenbank-Daten
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  console.log(`🔍 Fetching database data for ${year}...`);
  const dbData = await getDatabaseData(startDate, endDate);
  
  console.log(`📊 Found ${csvData.length} CSV records, ${dbData.length} DB records`);
  
  // Erstelle Lookup-Map für DB-Daten
  const dbMap = new Map();
  dbData.forEach(record => {
    dbMap.set(record.date, record);
  });
  
  let yearUpdated = 0;
  let yearCreated = 0;
  let yearErrors = 0;
  
  // Verarbeite jeden CSV-Record
  for (const csvRecord of csvData) {
    processedRecords++;
    
    const dbRecord = dbMap.get(csvRecord.date);
    const apiData = csvToApiData(csvRecord);
    
    // Progress anzeigen
    if (processedRecords % 50 === 0) {
      const percent = Math.round((processedRecords / totalRecords) * 100);
      console.log(`   📈 Progress: ${processedRecords}/${totalRecords} (${percent}%) - Updated: ${updatedRecords}, Created: ${createdRecords}, Errors: ${errorRecords}`);
    }
    
    if (dbRecord) {
      // Record existiert - prüfe ob Update nötig
      if (needsUpdate(csvRecord, dbRecord)) {
        const result = await updateRecord(dbRecord.id, apiData);
        if (result) {
          updatedRecords++;
          yearUpdated++;
        } else {
          errorRecords++;
          yearErrors++;
        }
      }
    } else {
      // Record existiert nicht - erstelle neuen
      const result = await createRecord(apiData);
      if (result) {
        createdRecords++;
        yearCreated++;
      } else {
        errorRecords++;
        yearErrors++;
      }
    }
    
    // Kleine Pause um Server nicht zu überlasten
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log(`✅ Year ${year} completed: ${yearUpdated} updated, ${yearCreated} created, ${yearErrors} errors`);
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log('🚀 STARTING MASS CORRECTION OPERATION\\n');
  console.log('⚠️  This will update/create hundreds of database records');
  console.log('📊 Processing years: ' + YEARS_TO_FIX.join(', '));
  console.log('');
  
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
  
  // Verarbeite jedes Jahr sequentiell
  for (const year of YEARS_TO_FIX) {
    try {
      await processYear(year);
    } catch (error) {
      console.error(`💥 Fatal error processing year ${year}:`, error.message);
      errorRecords += 10; // Pauschale für Jahr-Fehler
    }
  }
  
  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const durationMin = Math.round(durationMs / 60000 * 10) / 10;
  
  // Final Summary
  console.log('\\n🎊 ==================== MASS CORRECTION COMPLETE ====================');
  console.log(`⏱️  Duration: ${durationMin} minutes`);
  console.log(`📊 Total Records Processed: ${processedRecords}`);
  console.log(`✅ Records Updated: ${updatedRecords}`);
  console.log(`➕ Records Created: ${createdRecords}`);
  console.log(`❌ Errors: ${errorRecords}`);
  console.log(`📈 Success Rate: ${Math.round(((updatedRecords + createdRecords) / processedRecords) * 100)}%`);
  
  if (errorRecords > 0) {
    console.log(`\\n⚠️  ${errorRecords} errors occurred. Check logs above for details.`);
  }
  
  if (updatedRecords + createdRecords > 0) {
    console.log('\\n🎯 RECOMMENDATION: Run a verification script to confirm data integrity');
  }
  
  console.log('\\n🏁 Mass correction operation finished!');
}

// Führe das Script aus
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 FATAL ERROR:', error);
    process.exit(1);
  });
}