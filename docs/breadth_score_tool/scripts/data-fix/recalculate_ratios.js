#!/usr/bin/env node

/**
 * Script zur Nachberechnung fehlender Ratio-Werte
 * 
 * Berechnet ratio_5day und ratio_10day für alle Datensätze mit null-Werten
 */

import Database from 'better-sqlite3';

const DB_PATH = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/backend/data/market_monitor.db';

/**
 * Berechne 5-Tage und 10-Tage Ratios für einen Datensatz
 */
function calculateRatios(currentRecord, db) {
  const ratios = {
    ratio_5day: null,
    ratio_10day: null
  };
  
  // Prüfe ob Grunddaten vorhanden sind
  if (currentRecord.stocks_up_4pct === null || currentRecord.stocks_down_4pct === null) {
    console.log(`   ⚠️  Skipping ${currentRecord.date}: missing stocks_up_4pct or stocks_down_4pct`);
    return ratios;
  }
  
  // 5-Tage-Ratio berechnen (aktueller Tag + 4 vorherige Tage)
  const prev4Days = db.prepare(`
    SELECT stocks_up_4pct, stocks_down_4pct 
    FROM market_data 
    WHERE date < ? AND stocks_up_4pct IS NOT NULL AND stocks_down_4pct IS NOT NULL
    ORDER BY date DESC 
    LIMIT 4
  `).all(currentRecord.date);
  
  if (prev4Days.length === 4) {
    const totalUp5 = currentRecord.stocks_up_4pct + prev4Days.reduce((sum, r) => sum + (r.stocks_up_4pct || 0), 0);
    const totalDown5 = currentRecord.stocks_down_4pct + prev4Days.reduce((sum, r) => sum + (r.stocks_down_4pct || 0), 0);
    
    if (totalDown5 > 0) {
      ratios.ratio_5day = totalUp5 / totalDown5;
    }
  } else {
    console.log(`   ⚠️  Cannot calculate 5-day ratio for ${currentRecord.date}: only ${prev4Days.length} previous days available`);
  }
  
  // 10-Tage-Ratio berechnen (aktueller Tag + 9 vorherige Tage)
  const prev9Days = db.prepare(`
    SELECT stocks_up_4pct, stocks_down_4pct 
    FROM market_data 
    WHERE date < ? AND stocks_up_4pct IS NOT NULL AND stocks_down_4pct IS NOT NULL
    ORDER BY date DESC 
    LIMIT 9
  `).all(currentRecord.date);
  
  if (prev9Days.length === 9) {
    const totalUp10 = currentRecord.stocks_up_4pct + prev9Days.reduce((sum, r) => sum + (r.stocks_up_4pct || 0), 0);
    const totalDown10 = currentRecord.stocks_down_4pct + prev9Days.reduce((sum, r) => sum + (r.stocks_down_4pct || 0), 0);
    
    if (totalDown10 > 0) {
      ratios.ratio_10day = totalUp10 / totalDown10;
    }
  } else {
    console.log(`   ⚠️  Cannot calculate 10-day ratio for ${currentRecord.date}: only ${prev9Days.length} previous days available`);
  }
  
  return ratios;
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log('🔧 Recalculating missing ratios...\n');
  
  const db = new Database(DB_PATH);
  
  try {
    // Finde alle Datensätze mit fehlenden Ratios
    console.log('🔍 Finding records with missing ratios...');
    const recordsWithMissingRatios = db.prepare(`
      SELECT id, date, stocks_up_4pct, stocks_down_4pct, ratio_5day, ratio_10day
      FROM market_data 
      WHERE (ratio_5day IS NULL OR ratio_10day IS NULL)
        AND stocks_up_4pct IS NOT NULL 
        AND stocks_down_4pct IS NOT NULL
      ORDER BY date ASC
    `).all();
    
    console.log(`📊 Found ${recordsWithMissingRatios.length} records with missing ratios\n`);
    
    if (recordsWithMissingRatios.length === 0) {
      console.log('✅ No records need ratio recalculation');
      return;
    }
    
    // Update-Statement vorbereiten
    const updateStmt = db.prepare(`
      UPDATE market_data 
      SET ratio_5day = ?, ratio_10day = ?
      WHERE id = ?
    `);
    
    let updated = 0;
    let skipped = 0;
    
    // Durchlaufe alle Datensätze
    for (const record of recordsWithMissingRatios) {
      console.log(`🔄 Processing ${record.date}...`);
      
      // Berechne Ratios
      const ratios = calculateRatios(record, db);
      
      // Update nur wenn mindestens ein Ratio berechnet werden konnte
      if (ratios.ratio_5day !== null || ratios.ratio_10day !== null) {
        // Verwende vorhandene Werte falls nur eines berechnet werden konnte
        const newRatio5 = ratios.ratio_5day !== null ? ratios.ratio_5day : record.ratio_5day;
        const newRatio10 = ratios.ratio_10day !== null ? ratios.ratio_10day : record.ratio_10day;
        
        updateStmt.run(newRatio5, newRatio10, record.id);
        updated++;
        
        console.log(`   ✅ Updated: ratio_5day=${newRatio5?.toFixed(3) || 'null'}, ratio_10day=${newRatio10?.toFixed(3) || 'null'}`);
      } else {
        skipped++;
        console.log(`   ⏭️  Skipped: insufficient data for ratio calculation`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated} records`);
    console.log(`   ⏭️  Skipped: ${skipped} records`);
    
    // Verifikation
    console.log('\n🔍 Verification...');
    const remainingMissing = db.prepare(`
      SELECT COUNT(*) as count
      FROM market_data 
      WHERE (ratio_5day IS NULL OR ratio_10day IS NULL)
        AND stocks_up_4pct IS NOT NULL 
        AND stocks_down_4pct IS NOT NULL
    `).get();
    
    console.log(`📈 Remaining records with missing ratios: ${remainingMissing.count}`);
    
    if (remainingMissing.count === 0) {
      console.log('🎉 All ratios successfully calculated!');
    } else {
      console.log('⚠️  Some ratios could not be calculated due to insufficient historical data');
    }
    
  } finally {
    db.close();
  }
  
  console.log('\n🏁 Ratio recalculation complete!');
}

// Führe das Script aus
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}