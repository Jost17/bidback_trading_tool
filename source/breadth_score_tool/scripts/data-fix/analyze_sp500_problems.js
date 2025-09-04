#!/usr/bin/env node

/**
 * Script zur Analyse von S&P 500 Daten-Problemen
 * 
 * Vergleicht S&P 500 Werte zwischen CSV-Dateien und Datenbank
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
  '2021': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2021.csv'
};

/**
 * Bereinige S&P 500 Wert für Vergleich
 */
function cleanSP500Value(value) {
  if (!value) return null;
  
  // Entferne Anführungszeichen, Leerzeichen und Kommas
  let cleaned = value.toString().replace(/[",\s]/g, '');
  
  // Konvertiere zu Zahl
  const numValue = parseFloat(cleaned);
  return isNaN(numValue) ? null : numValue;
}

/**
 * Formatiere S&P 500 Wert für Anzeige
 */
function formatSP500Value(value) {
  if (value === null || value === undefined) return 'null';
  
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(numValue)) return 'invalid';
  
  return numValue.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

/**
 * Analysiere S&P 500 Werte für ein Jahr
 */
function analyzeYearData(year, csvData, dbData) {
  console.log(`\n📊 Analyzing ${year} S&P 500 data...`);
  console.log(`   CSV records: ${csvData.length}`);
  console.log(`   DB records: ${dbData.length}`);
  
  const problems = [];
  const csvMap = new Map();
  
  // Index CSV-Daten nach Datum
  csvData.forEach(record => {
    if (record.sp500) {
      csvMap.set(record.date, cleanSP500Value(record.sp500));
    }
  });
  
  // Vergleiche mit DB-Daten
  dbData.forEach(dbRecord => {
    const csvValue = csvMap.get(dbRecord.date);
    const dbValue = cleanSP500Value(dbRecord.sp500);
    
    if (csvValue !== null && dbValue === null) {
      problems.push({
        date: dbRecord.date,
        type: 'missing_in_db',
        csvValue: csvValue,
        dbValue: null,
        severity: 'high'
      });
    } else if (csvValue !== null && dbValue !== null) {
      const diff = Math.abs(csvValue - dbValue);
      if (diff > 0.01) { // Toleranz für Rundungsfehler
        problems.push({
          date: dbRecord.date,
          type: 'value_mismatch',
          csvValue: csvValue,
          dbValue: dbValue,
          difference: diff,
          severity: diff > 100 ? 'high' : 'medium'
        });
      }
    } else if (csvValue === null && dbValue !== null) {
      problems.push({
        date: dbRecord.date,
        type: 'extra_in_db',
        csvValue: null,
        dbValue: dbValue,
        severity: 'low'
      });
    }
  });
  
  // Statistiken
  const highSeverity = problems.filter(p => p.severity === 'high').length;
  const mediumSeverity = problems.filter(p => p.severity === 'medium').length;
  const lowSeverity = problems.filter(p => p.severity === 'low').length;
  
  console.log(`   Problems found: ${problems.length}`);
  console.log(`   High severity: ${highSeverity}`);
  console.log(`   Medium severity: ${mediumSeverity}`);
  console.log(`   Low severity: ${lowSeverity}`);
  
  // Zeige erste 5 Probleme
  if (problems.length > 0) {
    console.log(`\n   Sample problems:`);
    problems.slice(0, 5).forEach((problem, index) => {
      console.log(`     ${index + 1}. ${problem.date} (${problem.type}): CSV=${formatSP500Value(problem.csvValue)}, DB=${formatSP500Value(problem.dbValue)}`);
    });
  }
  
  return problems;
}

/**
 * Hauptanalyse
 */
async function main() {
  console.log('🔍 Analyzing S&P 500 data problems...\n');
  
  const db = new Database(DB_PATH);
  
  try {
    // Gesamtstatistik
    console.log('📈 Overall S&P 500 statistics...');
    const totalRecords = db.prepare('SELECT COUNT(*) as count FROM market_data').get();
    const nullSP500 = db.prepare('SELECT COUNT(*) as count FROM market_data WHERE sp500 IS NULL').get();
    const validSP500 = db.prepare('SELECT COUNT(*) as count FROM market_data WHERE sp500 IS NOT NULL AND sp500 != \'\'').get();
    
    console.log(`   Total records: ${totalRecords.count}`);
    console.log(`   Null S&P 500: ${nullSP500.count} (${(nullSP500.count/totalRecords.count*100).toFixed(1)}%)`);
    console.log(`   Valid S&P 500: ${validSP500.count} (${(validSP500.count/totalRecords.count*100).toFixed(1)}%)`);
    
    // Analysiere nach Import-Format
    console.log('\n📊 S&P 500 by import format...');
    const formatStats = db.prepare(`
      SELECT 
        import_format,
        COUNT(*) as total,
        COUNT(CASE WHEN sp500 IS NULL OR sp500 = \'\'  THEN 1 END) as null_count,
        COUNT(CASE WHEN sp500 IS NOT NULL AND sp500 != \'\'  THEN 1 END) as valid_count
      FROM market_data 
      GROUP BY import_format
      ORDER BY total DESC
    `).all();
    
    formatStats.forEach(stat => {
      const nullPercent = (stat.null_count / stat.total * 100).toFixed(1);
      const validPercent = (stat.valid_count / stat.total * 100).toFixed(1);
      console.log(`   ${stat.import_format || 'unknown'}: ${stat.total} total, ${stat.null_count} null (${nullPercent}%), ${stat.valid_count} valid (${validPercent}%)`);
    });
    
    // Analysiere nach Jahr
    console.log('\n📅 S&P 500 by year...');
    const yearStats = db.prepare(`
      SELECT 
        substr(date, 1, 4) as year,
        COUNT(*) as total,
        COUNT(CASE WHEN sp500 IS NULL OR sp500 = \'\'  THEN 1 END) as null_count,
        COUNT(CASE WHEN sp500 IS NOT NULL AND sp500 != \'\'  THEN 1 END) as valid_count
      FROM market_data 
      WHERE date LIKE '20%' OR date LIKE '19%'
      GROUP BY substr(date, 1, 4)
      ORDER BY year DESC
    `).all();
    
    yearStats.forEach(stat => {
      const nullPercent = (stat.null_count / stat.total * 100).toFixed(1);
      console.log(`   ${stat.year}: ${stat.total} records, ${stat.null_count} null (${nullPercent}%)`);
    });
    
    // Detaillierte Analyse für verfügbare CSV-Jahre
    let allProblems = [];
    
    for (const [year, csvPath] of Object.entries(csvFiles)) {
      if (!fs.existsSync(csvPath)) {
        console.log(`\n⚠️  CSV file not found for ${year}: ${csvPath}`);
        continue;
      }
      
      // Parse CSV-Daten
      const csvData = parseCSVFile(csvPath);
      
      // Hole entsprechende DB-Daten
      const dbData = db.prepare(`
        SELECT date, sp500, import_format, source_file
        FROM market_data 
        WHERE date LIKE '${year}-%'
        ORDER BY date ASC
      `).all();
      
      // Analysiere Jahr
      const yearProblems = analyzeYearData(year, csvData, dbData);
      allProblems = allProblems.concat(yearProblems);
    }
    
    // Zusammenfassung aller Probleme
    console.log(`\n📋 Overall S&P 500 problems summary:`);
    console.log(`   Total problems found: ${allProblems.length}`);
    
    const problemTypes = {};
    allProblems.forEach(problem => {
      problemTypes[problem.type] = (problemTypes[problem.type] || 0) + 1;
    });
    
    Object.entries(problemTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    // Zeige Beispiele für verschiedene Problemtypen
    console.log('\n🔍 Problem examples by type:');
    Object.keys(problemTypes).forEach(type => {
      const examples = allProblems.filter(p => p.type === type).slice(0, 3);
      console.log(`\n   ${type}:`);
      examples.forEach(example => {
        console.log(`     ${example.date}: CSV=${formatSP500Value(example.csvValue)}, DB=${formatSP500Value(example.dbValue)}`);
      });
    });
    
    // Identifiziere problematische Datenbereiche
    console.log('\n📍 Problematic date ranges:');
    const problemsByMonth = {};
    allProblems.forEach(problem => {
      const month = problem.date.substring(0, 7); // YYYY-MM
      if (!problemsByMonth[month]) {
        problemsByMonth[month] = 0;
      }
      problemsByMonth[month]++;
    });
    
    const sortedMonths = Object.entries(problemsByMonth)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    sortedMonths.forEach(([month, count]) => {
      console.log(`   ${month}: ${count} problems`);
    });
    
    if (allProblems.length > 0) {
      console.log('\n💡 Recommendation: Run S&P 500 correction script to fix these issues');
    } else {
      console.log('\n✅ No S&P 500 problems found');
    }
    
  } finally {
    db.close();
  }
  
  console.log('\n🏁 S&P 500 analysis complete!');
}

// Führe das Script aus
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}