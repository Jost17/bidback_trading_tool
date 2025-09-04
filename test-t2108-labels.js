#!/usr/bin/env node

/**
 * T2108 Database Label System - Phase 2 Testing
 * 
 * This test validates that T2108 fields show the correct labels:
 * - Green "Database" label when T2108 comes from database column
 * - Yellow "Notes" label when T2108 comes from notes extraction
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, 'trading.db');
let db;

try {
  db = sqlite3(dbPath);
  console.log('✅ Connected to database:', dbPath);
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
}

// Test data scenarios
const testScenarios = [
  {
    name: "Database T2108 Scenario",
    date: "2025-06-06",
    expectedLabel: "Database",
    expectedIcon: "🟢",
    expectedColor: "text-green-600 bg-green-50",
    description: "T2108 stored directly in database column"
  },
  {
    name: "Notes Extraction Scenario",
    date: "2025-08-29", 
    expectedLabel: "Notes",
    expectedIcon: "🟡",
    expectedColor: "text-yellow-600 bg-yellow-50",
    description: "T2108 extracted from notes field"
  }
];

// Enhanced notes extraction with support for all recovered formats
const extractFromNotes = (notes, key) => {
  if (!notes || !key) return '';
  console.log(`📝 Extracting ${key} from notes:`, notes.substring(0, 100) + '...');
  
  // Enhanced patterns for all note formats
  const patterns = [
    // New RECOVERED format: "RECOVERED: up4%=180, down4%=120, ..."
    new RegExp(`${key.replace('stocks_', '').replace('_pct', '').replace('_', '')}%?[=:]\\s*([^,\\n\\s]+)`, 'i'),
    // CSV format patterns
    new RegExp(`${key}[%=:]\\s*([^,\\n\\s]+)`, 'i'),
    // Database format: "field_name=value"
    new RegExp(`${key}[=:]\\s*([^,\\n\\s]+)`, 'i'),
    // Legacy colon format: "key: value"
    new RegExp(`${key}:\\s*([^,\\n]+)`, 'i'),
    // Quoted format: "key": value  
    new RegExp(`"${key}":\\s*([^,\\n]+)`, 'i'),
    // Space format: key value
    new RegExp(`\\b${key}\\s+([^,\\n\\s]+)`, 'i'),
  ];
  
  // Process all patterns
  for (const pattern of patterns) {
    const match = notes.match(pattern);
    if (match) {
      const value = match[1].trim().replace(/[",]/g, '');
      console.log(`✅ Enhanced extraction ${key}: ${value} using pattern: ${pattern}`);
      return value;
    }
  }
  
  console.log(`❌ Failed to extract ${key} from notes`);
  return '';
};

// Simulate the getDataSourceIndicator function from DataEntryForm
const getDataSourceIndicator = (field, initialData) => {
  if (!initialData) return null;
  
  // For testing, we'll simulate having a value in the field
  const simulatedFormValue = "61.39"; // Simulate form has value
  if (!simulatedFormValue || simulatedFormValue === '') return null;
  
  // Field mapping for t2108
  const fieldMapping = {
    't2108': 't2108'
  };
  
  // Get the corresponding field name in BreadthData
  const breadthDataField = fieldMapping[field] || field;
  const dbValue = initialData[breadthDataField];
  
  // Check if the value came from database (not null/undefined, and not empty string or '0')
  const isValidDbValue = dbValue !== null && dbValue !== undefined && dbValue !== '' && 
                        !(typeof dbValue === 'number' && dbValue === 0);
  
  console.log(`🔍 Debug for ${field}:`);
  console.log(`  - breadthDataField: ${breadthDataField}`);
  console.log(`  - dbValue: ${dbValue} (type: ${typeof dbValue})`);
  console.log(`  - isValidDbValue: ${isValidDbValue}`);
  
  if (isValidDbValue) {
    return {
      icon: '🟢',
      label: 'Database',
      confidence: 'High',
      color: 'text-green-600 bg-green-50'
    };
  }
  
  // Check if value came from notes extraction
  const notesValue = extractFromNotes(initialData.notes, field);
  console.log(`  - notesValue: ${notesValue}`);
  
  if (notesValue) {
    return {
      icon: '🟡',
      label: 'Notes',
      confidence: 'Medium',
      color: 'text-yellow-600 bg-yellow-50'
    };
  }
  
  return null;
};

// Run tests
console.log('\n🧪 Starting T2108 Database Label System Tests');
console.log('='.repeat(60));

let allTestsPassed = true;

for (const scenario of testScenarios) {
  console.log(`\n📋 Testing: ${scenario.name}`);
  console.log(`📅 Date: ${scenario.date}`);
  console.log(`📖 Description: ${scenario.description}`);
  
  try {
    // Get data from database
    const stmt = db.prepare('SELECT date, t2108, notes FROM market_breadth WHERE date = ?');
    const record = stmt.get(scenario.date);
    
    if (!record) {
      console.log(`❌ No record found for date ${scenario.date}`);
      allTestsPassed = false;
      continue;
    }
    
    console.log(`📊 Database record:`, {
      date: record.date,
      t2108: record.t2108,
      notes: record.notes ? record.notes.substring(0, 50) + '...' : 'null'
    });
    
    // Test the indicator logic
    const indicator = getDataSourceIndicator('t2108', record);
    
    if (!indicator) {
      console.log(`❌ No indicator returned for ${scenario.date}`);
      allTestsPassed = false;
      continue;
    }
    
    console.log(`🏷️  Actual result:`, {
      icon: indicator.icon,
      label: indicator.label,
      color: indicator.color,
      confidence: indicator.confidence
    });
    
    // Validate results
    const labelCorrect = indicator.label === scenario.expectedLabel;
    const iconCorrect = indicator.icon === scenario.expectedIcon;
    const colorCorrect = indicator.color === scenario.expectedColor;
    
    if (labelCorrect && iconCorrect && colorCorrect) {
      console.log(`✅ ${scenario.name}: PASSED`);
    } else {
      console.log(`❌ ${scenario.name}: FAILED`);
      console.log(`   Expected: ${scenario.expectedIcon} ${scenario.expectedLabel} (${scenario.expectedColor})`);
      console.log(`   Actual:   ${indicator.icon} ${indicator.label} (${indicator.color})`);
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.log(`❌ Error testing ${scenario.name}:`, error.message);
    allTestsPassed = false;
  }
}

// Summary
console.log('\n' + '='.repeat(60));
if (allTestsPassed) {
  console.log('✅ All tests PASSED! Phase 2 T2108 Database Label System is working correctly.');
} else {
  console.log('❌ Some tests FAILED! Issues found in T2108 Database Label System.');
}

// Additional diagnostic info
console.log('\n📊 Database Statistics:');
try {
  const totalRecords = db.prepare('SELECT COUNT(*) as count FROM market_breadth').get().count;
  const t2108DbRecords = db.prepare('SELECT COUNT(*) as count FROM market_breadth WHERE t2108 IS NOT NULL').get().count;
  const t2108NotesRecords = db.prepare('SELECT COUNT(*) as count FROM market_breadth WHERE notes LIKE "%T2108%" OR notes LIKE "%t2108%"').get().count;
  
  console.log(`📈 Total records: ${totalRecords}`);
  console.log(`🟢 Records with T2108 in database column: ${t2108DbRecords}`);
  console.log(`🟡 Records with T2108 in notes field: ${t2108NotesRecords}`);
  
} catch (error) {
  console.log('❌ Error getting database statistics:', error.message);
}

db.close();
console.log('\n🔚 Testing completed');

process.exit(allTestsPassed ? 0 : 1);