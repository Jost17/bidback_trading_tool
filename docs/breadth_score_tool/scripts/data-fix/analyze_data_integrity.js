#!/usr/bin/env node

/**
 * Script zur umfassenden Analyse der Datenintegrität
 * 
 * Überprüft, ob alle Daten in der Datenbank aus verfügbaren CSV-Quellen stammen
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/backend/data/market_monitor.db';
const SOURCE_DIR = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source';

/**
 * Scanne verfügbare CSV-Dateien
 */
function scanAvailableCSVFiles() {
  console.log('📁 Scanning available CSV files...');
  
  const files = fs.readdirSync(SOURCE_DIR);
  const csvFiles = files.filter(f => f.endsWith('.csv'));
  
  const availableYears = new Set();
  const fileMap = {};
  
  csvFiles.forEach(file => {
    console.log(`   Found: ${file}`);
    
    // Extrahiere Jahr aus Dateiname - verschiedene Formate berücksichtigen
    let year = null;
    
    // Format: "... - 2025.csv"
    const yearMatch1 = file.match(/- (\d{4})\.csv$/);
    if (yearMatch1) {
      year = yearMatch1[1];
    }
    
    // Format: "... 2007 reformatted.csv"
    const yearMatch2 = file.match(/(\d{4}) reformatted\.csv$/);
    if (yearMatch2) {
      year = yearMatch2[1];
    }
    
    if (year) {
      availableYears.add(year);
      fileMap[year] = path.join(SOURCE_DIR, file);
      console.log(`     -> Extracted year: ${year}`);
    } else {
      console.log(`     -> Could not extract year from: ${file}`);
    }
  });
  
  console.log(`\\n📊 Available years: ${Array.from(availableYears).sort().join(', ')}`);
  console.log(`   Earliest year: ${Math.min(...availableYears)}`);
  console.log(`   Latest year: ${Math.max(...availableYears)}`);
  
  return { availableYears, fileMap };
}

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

function parseCSVDates(filePath) {
  console.log(`   📖 Reading: ${path.basename(filePath)}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: ${filePath}`);
    return new Set();
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    console.log(`   ❌ Invalid CSV file: ${path.basename(filePath)} - too few lines (${lines.length})`);
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
  
  console.log(`   ✅ Found ${dates.size} valid dates`);
  return dates;
}

/**
 * Analysiere Datenbank vs. verfügbare Quellen
 */
function analyzeDatabaseIntegrity(availableYears, fileMap, db) {
  console.log('\\n🔍 Analyzing database integrity...');
  
  // Hole alle Jahre aus der Datenbank
  const dbYears = db.prepare(`
    SELECT DISTINCT substr(date, 1, 4) as year, COUNT(*) as count
    FROM market_data 
    WHERE date LIKE '20%' OR date LIKE '19%'
    GROUP BY substr(date, 1, 4)
    ORDER BY year
  `).all();
  
  console.log('\\n📊 Database years:');
  dbYears.forEach(row => {
    const hasSource = availableYears.has(row.year);
    const status = hasSource ? '✅' : '❌ NO SOURCE';
    console.log(`   ${row.year}: ${row.count} records ${status}`);
  });
  
  // Identifiziere Jahre ohne Quellen
  const yearsWithoutSources = dbYears.filter(row => !availableYears.has(row.year));
  const invalidRecordCount = yearsWithoutSources.reduce((sum, row) => sum + row.count, 0);
  
  console.log(`\\n⚠️  Years without sources: ${yearsWithoutSources.length}`);
  console.log(`   Invalid records: ${invalidRecordCount}`);
  
  if (yearsWithoutSources.length > 0) {
    console.log('   Years to delete:');
    yearsWithoutSources.forEach(row => {
      console.log(`     ${row.year}: ${row.count} records`);
    });
  }
  
  return { yearsWithoutSources, invalidRecordCount };
}

/**
 * Detaillierte Analyse für verfügbare Jahre
 */
function analyzeAvailableYears(availableYears, fileMap, db) {
  console.log('\\n🔍 Detailed analysis of available years...');
  
  const problems = [];
  
  for (const year of Array.from(availableYears).sort()) {
    console.log(`\\n📅 Analyzing ${year}...`);
    
    // Parse CSV-Daten
    const csvDates = parseCSVDates(fileMap[year]);
    
    // Hole DB-Daten für dieses Jahr
    const dbRecords = db.prepare(`
      SELECT date, id, source_file, import_format
      FROM market_data 
      WHERE date LIKE '${year}-%'
      ORDER BY date
    `).all();
    
    console.log(`   📊 CSV dates: ${csvDates.size}, DB records: ${dbRecords.length}`);
    
    // Analysiere Diskrepanzen
    let validRecords = 0;
    let invalidRecords = 0;
    const invalidDates = [];
    
    for (const dbRecord of dbRecords) {
      if (csvDates.has(dbRecord.date)) {
        validRecords++;
      } else {
        invalidRecords++;
        invalidDates.push(dbRecord.date);
      }
    }
    
    console.log(`   ✅ Valid records: ${validRecords}`);
    console.log(`   ❌ Invalid records: ${invalidRecords}`);
    
    if (invalidRecords > 0) {
      problems.push({
        year,
        csvDates: csvDates.size,
        dbRecords: dbRecords.length,
        validRecords,
        invalidRecords,
        invalidDates: invalidDates.slice(0, 5) // First 5 examples
      });
      
      console.log(`   Sample invalid dates: ${invalidDates.slice(0, 5).join(', ')}`);
    }
    
    // Prüfe fehlende Daten
    const missingInDb = [];
    for (const csvDate of csvDates) {
      const dbRecord = dbRecords.find(r => r.date === csvDate);
      if (!dbRecord) {
        missingInDb.push(csvDate);
      }
    }
    
    if (missingInDb.length > 0) {
      console.log(`   📝 Missing in DB: ${missingInDb.length} dates`);
      console.log(`   Sample missing: ${missingInDb.slice(0, 5).join(', ')}`);
    }
  }
  
  return problems;
}

/**
 * Hauptanalyse
 */
async function main() {
  console.log('🔍 Comprehensive Data Integrity Analysis\\n');
  
  // Scanne verfügbare CSV-Dateien
  const { availableYears, fileMap } = scanAvailableCSVFiles();
  
  // Öffne Datenbank
  const db = new Database(DB_PATH);
  
  try {
    // Gesamtstatistiken
    const totalRecords = db.prepare('SELECT COUNT(*) as count FROM market_data').get();
    console.log(`\\n📈 Total database records: ${totalRecords.count}`);
    
    // Analysiere Jahre ohne Quellen
    const { yearsWithoutSources, invalidRecordCount } = analyzeDatabaseIntegrity(availableYears, fileMap, db);
    
    // Detaillierte Analyse verfügbarer Jahre
    const problems = analyzeAvailableYears(availableYears, fileMap, db);
    
    // Zusammenfassung
    console.log('\\n📋 INTEGRITY SUMMARY:');
    console.log(`   Total records: ${totalRecords.count}`);
    console.log(`   Years without sources: ${yearsWithoutSources.length}`);
    console.log(`   Records without sources: ${invalidRecordCount}`);
    console.log(`   Years with date mismatches: ${problems.length}`);
    
    const totalInvalidFromMismatches = problems.reduce((sum, p) => sum + p.invalidRecords, 0);
    console.log(`   Records with date mismatches: ${totalInvalidFromMismatches}`);
    
    const totalInvalidRecords = invalidRecordCount + totalInvalidFromMismatches;
    console.log(`   TOTAL INVALID RECORDS: ${totalInvalidRecords}`);
    console.log(`   Valid records: ${totalRecords.count - totalInvalidRecords}`);
    console.log(`   Data integrity: ${((totalRecords.count - totalInvalidRecords) / totalRecords.count * 100).toFixed(1)}%`);
    
    // Empfehlungen
    console.log('\\n💡 RECOMMENDATIONS:');
    
    if (yearsWithoutSources.length > 0) {
      console.log(`   🗑️  DELETE ${invalidRecordCount} records from years without sources:`);
      yearsWithoutSources.forEach(row => {
        console.log(`      - Delete all ${row.count} records from ${row.year}`);
      });
    }
    
    if (problems.length > 0) {
      console.log(`   🧹 CLEAN ${totalInvalidFromMismatches} records with date mismatches:`);
      problems.forEach(problem => {
        console.log(`      - ${problem.year}: Remove ${problem.invalidRecords} invalid dates`);
      });
    }
    
    if (totalInvalidRecords > 0) {
      console.log(`\\n⚠️  CRITICAL: ${totalInvalidRecords} records need to be removed!`);
      console.log('   Run data cleanup script to fix these issues.');
    } else {
      console.log('\\n✅ All database records have valid sources!');
    }
    
  } finally {
    db.close();
  }
  
  console.log('\\n🏁 Data integrity analysis complete!');
}

// Führe das Script aus
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}