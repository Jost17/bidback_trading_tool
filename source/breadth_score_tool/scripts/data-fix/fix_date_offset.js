#!/usr/bin/env node

/**
 * Script zur Korrektur des Datum-Offset-Problems
 * 
 * Problem erkannt: Die Daten in der Datenbank sind um 1 Tag verschoben
 * - CSV 5/22/2025 Daten sind in DB unter 2025-05-21 gespeichert
 * - CSV 5/21/2025 Daten sind in DB unter 2025-05-20 gespeichert
 * 
 * Lösung: Importiere die korrekten CSV-Daten und ersetze die fehlerhaften DB-Einträge
 */

import fs from 'fs';
import fetch from 'node-fetch';
import { parseCSVFile } from './compare_csv_with_database.js';

const API_BASE = 'http://localhost:3001/api';
const csvFile2025 = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2025.csv';

/**
 * Update einen Datenbank-Eintrag
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Error updating record ${id}: ${error.message}`);
    return null;
  }
}

/**
 * Hole einen spezifischen Datenbank-Eintrag nach Datum
 */
async function getRecordByDate(date) {
  const url = `${API_BASE}/market-data?startDate=${date}&endDate=${date}&limit=1`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data && result.data.length > 0 ? result.data[0] : null;
  } catch (error) {
    console.error(`❌ Error fetching record for ${date}: ${error.message}`);
    return null;
  }
}

/**
 * Konvertiere CSV-Record in Update-Format
 */
function csvToUpdateData(csvRecord) {
  return {
    date: csvRecord.date, // Required field
    stocks_up_20pct: null, // Not in CSV, set to null
    stocks_down_20pct: null, // Not in CSV, set to null 
    stocks_up_20dollar: null, // Not in CSV, set to null
    stocks_down_20dollar: null, // Not in CSV, set to null
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
 * Hauptfunktion für die Korrektur
 */
async function main() {
  console.log('🔧 Starting date offset correction...\n');
  
  // Parse CSV-Daten
  console.log('📖 Reading CSV data...');
  const csvData = parseCSVFile(csvFile2025);
  
  if (csvData.length === 0) {
    console.error('❌ No CSV data found');
    return;
  }
  
  // Teste mit den problemspezifischen Daten
  const testDates = ['2025-05-22', '2025-05-21', '2025-05-20'];
  
  for (const date of testDates) {
    console.log(`\n🎯 Processing ${date}...`);
    
    // Finde CSV-Record für dieses Datum
    const csvRecord = csvData.find(r => r.date === date);
    if (!csvRecord) {
      console.log(`   ⚠️  No CSV data found for ${date}`);
      continue;
    }
    
    // Finde entsprechenden DB-Record
    const dbRecord = await getRecordByDate(date);
    if (!dbRecord) {
      console.log(`   ⚠️  No database record found for ${date}`);
      continue;
    }
    
    console.log(`   📊 CSV: 4% up=${csvRecord.stocks_up_4pct}, 4% down=${csvRecord.stocks_down_4pct}`);
    console.log(`   🗄️  DB:  4% up=${dbRecord.stocks_up_4pct}, 4% down=${dbRecord.stocks_down_4pct}`);
    
    // Prüfe ob Update nötig ist
    if (csvRecord.stocks_up_4pct !== dbRecord.stocks_up_4pct || 
        csvRecord.stocks_down_4pct !== dbRecord.stocks_down_4pct) {
      
      console.log(`   🔄 Updating database record...`);
      
      const updateData = csvToUpdateData(csvRecord);
      const result = await updateRecord(dbRecord.id, updateData);
      
      if (result) {
        console.log(`   ✅ Successfully updated record ${dbRecord.id}`);
      } else {
        console.log(`   ❌ Failed to update record ${dbRecord.id}`);
      }
    } else {
      console.log(`   ✅ Data already matches`);
    }
  }
  
  console.log('\n🏁 Date offset correction complete!');
  
  // Verifikation
  console.log('\n🔍 Verifying corrections...');
  for (const date of testDates) {
    const csvRecord = csvData.find(r => r.date === date);
    const dbRecord = await getRecordByDate(date);
    
    if (csvRecord && dbRecord) {
      const matches = csvRecord.stocks_up_4pct === dbRecord.stocks_up_4pct &&
                     csvRecord.stocks_down_4pct === dbRecord.stocks_down_4pct;
      
      console.log(`   ${matches ? '✅' : '❌'} ${date}: CSV vs DB ${matches ? 'matches' : 'differs'}`);
    }
  }
}

// Führe das Script aus
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}