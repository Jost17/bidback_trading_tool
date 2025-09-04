#!/usr/bin/env node

/**
 * Script zur Analyse von Ratio-Berechnungsproblemen ab Mitte 2024
 * 
 * Untersucht warum ratio_5day und ratio_10day nicht korrekt berechnet werden
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/backend/data/market_monitor.db';

/**
 * Simuliert die Ratio-Berechnung wie im Backend
 */
function simulateRatioCalculation(currentRecord, previousRecords, days) {
  // Benötigte Anzahl vorheriger Tage
  const requiredPrevious = days - 1; // 4 für 5-Tage, 9 für 10-Tage
  
  if (previousRecords.length < requiredPrevious) {
    return {
      success: false,
      reason: `Insufficient data: need ${requiredPrevious} previous days, got ${previousRecords.length}`,
      ratio: null
    };
  }
  
  // Prüfe ob aktuelle Daten verfügbar sind
  if (currentRecord.stocks_up_4pct === null || currentRecord.stocks_down_4pct === null) {
    return {
      success: false,
      reason: 'Current record has null up/down values',
      ratio: null
    };
  }
  
  // Sammle alle Werte (aktueller Tag + vorherige Tage)
  const allUpValues = [currentRecord.stocks_up_4pct];
  const allDownValues = [currentRecord.stocks_down_4pct];
  
  for (let i = 0; i < requiredPrevious; i++) {
    const prevRecord = previousRecords[i];
    if (prevRecord.stocks_up_4pct === null || prevRecord.stocks_down_4pct === null) {
      return {
        success: false,
        reason: `Previous record ${i + 1} has null up/down values (date: ${prevRecord.date})`,
        ratio: null
      };
    }
    allUpValues.push(prevRecord.stocks_up_4pct);
    allDownValues.push(prevRecord.stocks_down_4pct);
  }
  
  // Berechne Summen
  const totalUp = allUpValues.reduce((sum, val) => sum + (val || 0), 0);
  const totalDown = allDownValues.reduce((sum, val) => sum + (val || 0), 0);
  
  if (totalDown === 0) {
    return {
      success: false,
      reason: 'Total down is zero - division by zero',
      ratio: null
    };
  }
  
  return {
    success: true,
    reason: 'Calculation successful',
    ratio: totalUp / totalDown,
    totalUp,
    totalDown,
    usedRecords: requiredPrevious + 1
  };
}

/**
 * Analysiere Datenlücken
 */
function analyzeDataGaps(records) {
  const gaps = [];
  
  for (let i = 1; i < records.length; i++) {
    const currentDate = new Date(records[i].date);
    const previousDate = new Date(records[i - 1].date);
    
    // Erwartete nächste Datum (unter Berücksichtigung von Wochenenden)
    let expectedDate = new Date(previousDate);
    expectedDate.setDate(expectedDate.getDate() + 1);
    
    // Überspringe Wochenenden
    while (expectedDate.getDay() === 0 || expectedDate.getDay() === 6) {
      expectedDate.setDate(expectedDate.getDate() + 1);
    }
    
    const expectedDateStr = expectedDate.toISOString().split('T')[0];
    const currentDateStr = currentDate.toISOString().split('T')[0];
    
    if (expectedDateStr !== currentDateStr) {
      // Berechne die Anzahl der fehlenden Geschäftstage
      let missingDays = 0;
      let checkDate = new Date(expectedDate);
      
      while (checkDate < currentDate) {
        if (checkDate.getDay() !== 0 && checkDate.getDay() !== 6) {
          missingDays++;
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }
      
      if (missingDays > 0) {
        gaps.push({
          after: records[i - 1].date,
          before: records[i].date,
          expectedDate: expectedDateStr,
          actualDate: currentDateStr,
          missingBusinessDays: missingDays
        });
      }
    }
  }
  
  return gaps;
}

/**
 * Hauptanalyse
 */
async function main() {
  console.log('🔍 Analyzing ratio calculation problems from mid-2024 onwards...\n');
  
  // Öffne Datenbank
  const db = new Database(DB_PATH);
  
  try {
    // Hole alle Daten ab Juni 2024
    const startDate = '2024-06-01';
    console.log(`📊 Fetching all data from ${startDate} onwards...`);
    
    const allRecords = db.prepare(`
      SELECT date, stocks_up_4pct, stocks_down_4pct, ratio_5day, ratio_10day, 
             source_file, import_format
      FROM market_data 
      WHERE date >= ? 
      ORDER BY date ASC
    `).all(startDate);
    
    console.log(`📈 Found ${allRecords.length} records\n`);
    
    // Analysiere Datenlücken
    console.log('🔍 Analyzing data gaps...');
    const gaps = analyzeDataGaps(allRecords);
    
    if (gaps.length > 0) {
      console.log(`⚠️  Found ${gaps.length} data gaps:`);
      gaps.forEach(gap => {
        console.log(`   Missing ${gap.missingBusinessDays} business days between ${gap.after} and ${gap.before}`);
      });
    } else {
      console.log('✅ No significant data gaps found');
    }
    console.log();
    
    // Analysiere Null-Werte
    console.log('🔍 Analyzing null values...');
    const nullUpRecords = allRecords.filter(r => r.stocks_up_4pct === null);
    const nullDownRecords = allRecords.filter(r => r.stocks_down_4pct === null);
    const nullRatio5Records = allRecords.filter(r => r.ratio_5day === null);
    const nullRatio10Records = allRecords.filter(r => r.ratio_10day === null);
    
    console.log(`📊 Null value statistics:`);
    console.log(`   stocks_up_4pct null: ${nullUpRecords.length} records`);
    console.log(`   stocks_down_4pct null: ${nullDownRecords.length} records`);
    console.log(`   ratio_5day null: ${nullRatio5Records.length} records`);
    console.log(`   ratio_10day null: ${nullRatio10Records.length} records`);
    
    if (nullUpRecords.length > 0) {
      console.log(`   Null up_4pct dates: ${nullUpRecords.slice(0, 10).map(r => r.date).join(', ')}${nullUpRecords.length > 10 ? '...' : ''}`);
    }
    if (nullDownRecords.length > 0) {
      console.log(`   Null down_4pct dates: ${nullDownRecords.slice(0, 10).map(r => r.date).join(', ')}${nullDownRecords.length > 10 ? '...' : ''}`);
    }
    console.log();
    
    // Simuliere Ratio-Berechnungen für problematische Einträge
    console.log('🔍 Simulating ratio calculations...');
    
    let ratio5Failures = 0;
    let ratio10Failures = 0;
    const failureExamples = [];
    
    for (let i = 10; i < allRecords.length; i++) { // Start bei Index 10 um genug vorherige Daten zu haben
      const currentRecord = allRecords[i];
      
      // Hole vorherige Datensätze
      const previousRecords = allRecords.slice(Math.max(0, i - 10), i);
      
      // Simuliere 5-Tage-Ratio
      const ratio5Result = simulateRatioCalculation(currentRecord, previousRecords, 5);
      if (!ratio5Result.success && currentRecord.ratio_5day === null) {
        ratio5Failures++;
        if (failureExamples.length < 5) {
          failureExamples.push({
            date: currentRecord.date,
            type: '5-day',
            reason: ratio5Result.reason,
            actualRatio: currentRecord.ratio_5day,
            upValue: currentRecord.stocks_up_4pct,
            downValue: currentRecord.stocks_down_4pct
          });
        }
      }
      
      // Simuliere 10-Tage-Ratio  
      const ratio10Result = simulateRatioCalculation(currentRecord, previousRecords, 10);
      if (!ratio10Result.success && currentRecord.ratio_10day === null) {
        ratio10Failures++;
        if (failureExamples.length < 5) {
          failureExamples.push({
            date: currentRecord.date,
            type: '10-day',
            reason: ratio10Result.reason,
            actualRatio: currentRecord.ratio_10day,
            upValue: currentRecord.stocks_up_4pct,
            downValue: currentRecord.stocks_down_4pct
          });
        }
      }
    }
    
    console.log(`📊 Ratio calculation simulation results:`);
    console.log(`   5-day ratio failures: ${ratio5Failures}`);
    console.log(`   10-day ratio failures: ${ratio10Failures}`);
    
    if (failureExamples.length > 0) {
      console.log(`\n🔍 Failure examples:`);
      failureExamples.forEach((example, index) => {
        console.log(`   ${index + 1}. ${example.date} (${example.type}): ${example.reason}`);
        console.log(`      Up: ${example.upValue}, Down: ${example.downValue}, Stored ratio: ${example.actualRatio}`);
      });
    }
    
    // Analysiere zeitliche Verteilung der Probleme
    console.log('\n🔍 Analyzing temporal distribution of problems...');
    
    const problemsByMonth = {};
    allRecords.forEach(record => {
      if (record.ratio_5day === null || record.ratio_10day === null) {
        const month = record.date.substring(0, 7); // YYYY-MM
        if (!problemsByMonth[month]) {
          problemsByMonth[month] = { count: 0, ratio5Null: 0, ratio10Null: 0 };
        }
        problemsByMonth[month].count++;
        if (record.ratio_5day === null) problemsByMonth[month].ratio5Null++;
        if (record.ratio_10day === null) problemsByMonth[month].ratio10Null++;
      }
    });
    
    const monthsWithProblems = Object.keys(problemsByMonth).sort();
    if (monthsWithProblems.length > 0) {
      console.log(`📅 Months with ratio calculation problems:`);
      monthsWithProblems.forEach(month => {
        const stats = problemsByMonth[month];
        console.log(`   ${month}: ${stats.count} total, ${stats.ratio5Null} ratio_5day null, ${stats.ratio10Null} ratio_10day null`);
      });
    } else {
      console.log('✅ No temporal patterns found in ratio problems');
    }
    
    // Analysiere Import-Formate
    console.log('\n🔍 Analyzing by import format...');
    const formatStats = {};
    allRecords.forEach(record => {
      const format = record.import_format || 'unknown';
      if (!formatStats[format]) {
        formatStats[format] = { total: 0, ratio5Null: 0, ratio10Null: 0 };
      }
      formatStats[format].total++;
      if (record.ratio_5day === null) formatStats[format].ratio5Null++;
      if (record.ratio_10day === null) formatStats[format].ratio10Null++;
    });
    
    console.log('📊 Statistics by import format:');
    Object.entries(formatStats).forEach(([format, stats]) => {
      const ratio5Percent = ((stats.ratio5Null / stats.total) * 100).toFixed(1);
      const ratio10Percent = ((stats.ratio10Null / stats.total) * 100).toFixed(1);
      console.log(`   ${format}: ${stats.total} records, ${stats.ratio5Null} (${ratio5Percent}%) ratio_5day null, ${stats.ratio10Null} (${ratio10Percent}%) ratio_10day null`);
    });
    
    console.log('\n🏁 Analysis complete!');
    
  } finally {
    db.close();
  }
}

// Führe das Script aus
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}