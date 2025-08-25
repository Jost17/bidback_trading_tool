#!/usr/bin/env node

/**
 * Script zur systematischen Überprüfung aller Jahre auf Datumsmapping-Probleme
 * 
 * Überprüft 2007-2025 und identifiziert potenzielle Datum-Offset-Probleme
 */

import fs from 'fs';
import path from 'path';
import { parseCSVFile, getDatabaseData, compareRecords } from './compare_csv_with_database.js';

// Alle verfügbaren CSV-Dateien
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
  '2009': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - 2009.csv',
  '2008': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - Copy of 2008 reformatted.csv',
  '2007': '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/source/Stockbee Market Monitor 2025 - Copy of 2007 reformatted.csv'
};

/**
 * Parse ältere CSV-Dateien mit anderem Format
 */
function parseOlderCSV(filePath, year) {
  console.log(`📖 Reading older CSV file: ${path.basename(filePath)}`);
  
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
  
  // Header-Zeile analysieren
  const headers = lines[0].split(',');
  console.log(`   Headers: ${headers.slice(0, 5).join(', ')}...`);
  
  const dataLines = lines.slice(1);
  const records = [];
  
  for (let i = 0; i < Math.min(dataLines.length, 10); i++) { // Nur erste 10 für Analyse
    const line = dataLines[i];
    const columns = line.split(',');
    
    if (columns.length < 3) continue;
    
    try {
      // Parse date - verschiedene Formate möglich
      let formattedDate = null;
      const dateStr = columns[0];
      
      if (dateStr.includes('/')) {
        // MM/DD/YYYY Format
        const dateParts = dateStr.split('/');
        if (dateParts.length === 3) {
          const month = dateParts[0].padStart(2, '0');
          const day = dateParts[1].padStart(2, '0');
          const yearPart = dateParts[2];
          formattedDate = `${yearPart}-${month}-${day}`;
        }
      } else if (dateStr.includes('.')) {
        // DD.MM.YYYY Format 
        const dateParts = dateStr.split('.');
        if (dateParts.length === 3) {
          const day = dateParts[0].padStart(2, '0');
          const month = dateParts[1].padStart(2, '0');
          const yearPart = dateParts[2];
          formattedDate = `${yearPart}-${month}-${day}`;
        }
      }
      
      if (!formattedDate) continue;
      
      // Flexibles Mapping basierend auf Headern
      const record = {
        date: formattedDate,
        originalDate: dateStr,
        stocks_up_4pct: parseFloat(columns[1]) || null,
        stocks_down_4pct: parseFloat(columns[2]) || null
      };
      
      // Weitere Felder basierend auf verfügbaren Spalten
      if (columns.length > 3) record.stocks_up_25pct_quarter = parseFloat(columns[3]) || null;
      if (columns.length > 4) record.stocks_down_25pct_quarter = parseFloat(columns[4]) || null;
      if (columns.length > 5) record.stocks_up_25pct_month = parseFloat(columns[5]) || null;
      if (columns.length > 6) record.stocks_down_25pct_month = parseFloat(columns[6]) || null;
      
      records.push(record);
    } catch (error) {
      console.warn(`⚠️ Could not parse line ${i + 2}: ${line}`);
    }
  }
  
  console.log(`✅ Parsed ${records.length} sample records from ${path.basename(filePath)}`);
  return records;
}

/**
 * Analysiere ein Jahr auf Diskrepanzen
 */
async function analyzeYear(year) {
  console.log(`\n📅 ==================== ANALYZING YEAR ${year} ====================`);
  
  const csvFile = csvFiles[year];
  if (!csvFile || !fs.existsSync(csvFile)) {
    console.log(`❌ CSV file not found for ${year}`);
    return { year, status: 'no_csv', issues: [] };
  }
  
  // Parse CSV-Daten
  let csvData;
  if (year >= '2009') {
    csvData = parseCSVFile(csvFile);
  } else {
    csvData = parseOlderCSV(csvFile, year);
  }
  
  if (csvData.length === 0) {
    console.log(`❌ No CSV data parsed for ${year}`);
    return { year, status: 'parse_failed', issues: [] };
  }
  
  // Hole Datenbank-Daten für dieses Jahr
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  console.log(`🔍 Fetching database data for ${year}...`);
  const dbData = await getDatabaseData(startDate, endDate);
  
  console.log(`📊 CSV: ${csvData.length} records, DB: ${dbData.length} records`);
  
  if (dbData.length === 0) {
    console.log(`❌ No database data found for ${year}`);
    return { year, status: 'no_db_data', issues: [] };
  }
  
  // Analysiere Stichproben
  const sampleSize = Math.min(5, csvData.length);
  const sampleIndices = Array.from({length: sampleSize}, (_, i) => 
    Math.floor(i * csvData.length / sampleSize)
  );
  
  const issues = [];
  
  for (const index of sampleIndices) {
    const csvRecord = csvData[index];
    const dbRecord = dbData.find(r => r.date === csvRecord.date);
    
    if (!dbRecord) {
      console.log(`   ❌ ${csvRecord.date}: Missing in database`);
      issues.push({
        date: csvRecord.date,
        type: 'missing_in_db',
        csvData: csvRecord
      });
      continue;
    }
    
    const discrepancies = compareRecords(csvRecord, dbRecord);
    
    if (discrepancies.length > 0) {
      const majorDiscrepancies = discrepancies.filter(d => 
        d.field === 'stocks_up_4pct' || d.field === 'stocks_down_4pct'
      );
      
      if (majorDiscrepancies.length > 0) {
        console.log(`   ⚠️  ${csvRecord.date}: ${majorDiscrepancies.length} major discrepancies`);
        majorDiscrepancies.forEach(d => {
          console.log(`      - ${d.field}: CSV=${d.csvValue} vs DB=${d.dbValue} (diff: ${d.difference})`);
        });
        
        issues.push({
          date: csvRecord.date,
          type: 'data_mismatch',
          discrepancies: majorDiscrepancies,
          csvData: csvRecord,
          dbData: dbRecord
        });
      } else {
        console.log(`   ✅ ${csvRecord.date}: Minor discrepancies only`);
      }
    } else {
      console.log(`   ✅ ${csvRecord.date}: Data matches`);
    }
  }
  
  const status = issues.length === 0 ? 'ok' : 
                issues.length === sampleSize ? 'major_issues' : 'minor_issues';
  
  return { year, status, issues, sampleSize, dbRecords: dbData.length, csvRecords: csvData.length };
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log('🔍 Starting comprehensive year-by-year analysis...\n');
  
  const years = Object.keys(csvFiles).sort().reverse(); // 2025 -> 2007
  const results = [];
  
  for (const year of years) {
    try {
      const result = await analyzeYear(year);
      results.push(result);
      
      // Kurze Pause zwischen Jahren
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error analyzing year ${year}:`, error.message);
      results.push({ year, status: 'error', error: error.message });
    }
  }
  
  // Zusammenfassung
  console.log('\n📊 ==================== SUMMARY ====================');
  
  const statusCounts = {};
  const yearsWithIssues = [];
  
  results.forEach(result => {
    statusCounts[result.status] = (statusCounts[result.status] || 0) + 1;
    
    if (result.status === 'major_issues' || result.status === 'minor_issues') {
      yearsWithIssues.push(result.year);
    }
    
    const statusIcon = {
      'ok': '✅',
      'minor_issues': '⚠️',
      'major_issues': '❌',
      'no_csv': '📄',
      'no_db_data': '🗄️',
      'parse_failed': '🔧',
      'error': '💥'
    }[result.status] || '❓';
    
    console.log(`${statusIcon} ${result.year}: ${result.status} (${result.issues?.length || 0} issues)`);
  });
  
  console.log('\n📈 Status Overview:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count} years`);
  });
  
  if (yearsWithIssues.length > 0) {
    console.log(`\n🔧 Years requiring fixes: ${yearsWithIssues.join(', ')}`);
  } else {
    console.log('\n🎉 All years look good!');
  }
  
  console.log('\n🏁 Analysis complete!');
}

// Führe das Script aus
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}