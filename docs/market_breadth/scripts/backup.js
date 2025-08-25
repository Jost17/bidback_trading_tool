#!/usr/bin/env node

// Trading Tool Backup System
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Pool } = require('pg');
require('dotenv').config();

console.log('💾 Trading Tool - Backup System');
console.log('═══════════════════════════════════════════════════════════════\n');

// Configuration
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const DB_URL = process.env.DATABASE_URL;
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
}

// Database backup function
async function backupDatabase() {
  console.log('🗄️  Starting database backup...');
  
  if (!DB_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `database-backup-${timestamp}.sql`);
  
  try {
    const startTime = Date.now();
    
    // Use pg_dump to create database backup
    const command = `pg_dump "${DB_URL}" > "${backupFile}"`;
    execSync(command, { stdio: 'pipe' });
    
    const backupSize = fs.statSync(backupFile).size;
    const duration = Date.now() - startTime;
    
    console.log(`✅ Database backup completed:`);
    console.log(`   File: ${backupFile}`);
    console.log(`   Size: ${Math.round(backupSize / 1024)}KB`);
    console.log(`   Duration: ${duration}ms`);
    
    return {
      file: backupFile,
      size: backupSize,
      duration,
      type: 'database'
    };
  } catch (error) {
    console.error(`❌ Database backup failed: ${error.message}`);
    
    // Try alternative backup method using node-postgres
    return await backupDatabaseFallback(timestamp);
  }
}

// Fallback database backup using SQL queries
async function backupDatabaseFallback(timestamp) {
  console.log('🔄 Trying fallback backup method...');
  
  const pool = new Pool({ connectionString: DB_URL });
  const backupFile = path.join(BACKUP_DIR, `database-fallback-${timestamp}.json`);
  
  try {
    const startTime = Date.now();
    
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    const backup = {
      timestamp: new Date().toISOString(),
      tables: {}
    };
    
    // Backup each table
    for (const table of tablesResult.rows) {
      const tableName = table.tablename;
      console.log(`   Backing up table: ${tableName}`);
      
      const dataResult = await pool.query(`SELECT * FROM "${tableName}"`);
      backup.tables[tableName] = {
        rowCount: dataResult.rows.length,
        data: dataResult.rows
      };
    }
    
    // Write backup file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    const backupSize = fs.statSync(backupFile).size;
    const duration = Date.now() - startTime;
    
    console.log(`✅ Fallback backup completed:`);
    console.log(`   File: ${backupFile}`);
    console.log(`   Size: ${Math.round(backupSize / 1024)}KB`);
    console.log(`   Tables: ${Object.keys(backup.tables).length}`);
    console.log(`   Duration: ${duration}ms`);
    
    await pool.end();
    
    return {
      file: backupFile,
      size: backupSize,
      duration,
      type: 'database-fallback',
      tableCount: Object.keys(backup.tables).length
    };
  } catch (error) {
    await pool.end();
    throw new Error(`Fallback backup failed: ${error.message}`);
  }
}

// Configuration backup function
async function backupConfiguration() {
  console.log('\n⚙️  Starting configuration backup...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const configBackupDir = path.join(BACKUP_DIR, `config-${timestamp}`);
  
  if (!fs.existsSync(configBackupDir)) {
    fs.mkdirSync(configBackupDir, { recursive: true });
  }
  
  const configFiles = [
    '.env.example',
    'package.json',
    'package-lock.json',
    'docker-compose.yml',
    'middleware.ts',
    'next.config.js',
    'tailwind.config.js',
    'tsconfig.json'
  ];
  
  const backedUpFiles = [];
  
  for (const file of configFiles) {
    if (fs.existsSync(file)) {
      const destPath = path.join(configBackupDir, file);
      
      // Create directory if needed
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      fs.copyFileSync(file, destPath);
      backedUpFiles.push(file);
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ⚠️  ${file} (not found)`);
    }
  }
  
  // Create backup manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    files: backedUpFiles,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    backupType: 'configuration'
  };
  
  fs.writeFileSync(
    path.join(configBackupDir, 'backup-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log(`✅ Configuration backup completed:`);
  console.log(`   Directory: ${configBackupDir}`);
  console.log(`   Files: ${backedUpFiles.length}/${configFiles.length}`);
  
  return {
    directory: configBackupDir,
    fileCount: backedUpFiles.length,
    type: 'configuration'
  };
}

// Export data as CSV
async function exportDataAsCSV() {
  console.log('\n📊 Exporting data as CSV...');
  
  const pool = new Pool({ connectionString: DB_URL });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportDir = path.join(BACKUP_DIR, `csv-export-${timestamp}`);
  
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  try {
    // Export trades table
    const tradesResult = await pool.query(`
      SELECT 
        date, time, symbol, direction, quantity,
        entry_price, exit_price, stop_loss, target_price,
        gross_pnl, fees, net_pnl,
        setup_type, market_condition, sector, trade_grade,
        confidence_level, emotion, position_size_percent,
        entry_notes, exit_notes, lessons_learned,
        trade_status, is_paper_trade, created_at
      FROM trades
      ORDER BY date DESC, time DESC
    `);
    
    if (tradesResult.rows.length > 0) {
      const csvContent = [
        Object.keys(tradesResult.rows[0]).join(','),
        ...tradesResult.rows.map(row => 
          Object.values(row).map(value => 
            value === null ? '' : `"${String(value).replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n');
      
      fs.writeFileSync(path.join(exportDir, 'trades.csv'), csvContent);
      console.log(`   ✅ trades.csv (${tradesResult.rows.length} records)`);
    }
    
    // Export market breadth data
    const breadthResult = await pool.query(`
      SELECT * FROM market_breadth_daily
      ORDER BY date DESC
    `);
    
    if (breadthResult.rows.length > 0) {
      const csvContent = [
        Object.keys(breadthResult.rows[0]).join(','),
        ...breadthResult.rows.map(row => 
          Object.values(row).map(value => 
            value === null ? '' : `"${String(value).replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n');
      
      fs.writeFileSync(path.join(exportDir, 'market_breadth.csv'), csvContent);
      console.log(`   ✅ market_breadth.csv (${breadthResult.rows.length} records)`);
    }
    
    await pool.end();
    
    console.log(`✅ CSV export completed: ${exportDir}`);
    
    return {
      directory: exportDir,
      type: 'csv-export'
    };
  } catch (error) {
    await pool.end();
    throw new Error(`CSV export failed: ${error.message}`);
  }
}

// Clean old backups
async function cleanOldBackups() {
  console.log(`\n🧹 Cleaning backups older than ${BACKUP_RETENTION_DAYS} days...`);
  
  const files = fs.readdirSync(BACKUP_DIR);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);
  
  let deletedCount = 0;
  let totalSize = 0;
  
  for (const file of files) {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    
    if (stats.mtime < cutoffDate) {
      if (stats.isDirectory()) {
        // Remove directory recursively
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      
      deletedCount++;
      totalSize += stats.size;
      console.log(`   🗑️  Deleted: ${file}`);
    }
  }
  
  if (deletedCount === 0) {
    console.log('   ✅ No old backups to clean');
  } else {
    console.log(`✅ Cleaned ${deletedCount} old backups (${Math.round(totalSize / 1024)}KB freed)`);
  }
  
  return { deletedCount, freedSpace: totalSize };
}

// Main backup function
async function performBackup(options = {}) {
  const {
    includeDatabase = true,
    includeConfiguration = true,
    includeCSVExport = false,
    cleanOld = true
  } = options;
  
  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    results: []
  };
  
  try {
    if (includeDatabase) {
      const dbBackup = await backupDatabase();
      results.results.push(dbBackup);
    }
    
    if (includeConfiguration) {
      const configBackup = await backupConfiguration();
      results.results.push(configBackup);
    }
    
    if (includeCSVExport) {
      const csvExport = await exportDataAsCSV();
      results.results.push(csvExport);
    }
    
    if (cleanOld) {
      const cleanup = await cleanOldBackups();
      results.cleanup = cleanup;
    }
    
    const totalDuration = Date.now() - startTime;
    results.duration = totalDuration;
    
    console.log(`\n🎉 Backup completed successfully!`);
    console.log(`   Total duration: ${totalDuration}ms`);
    console.log(`   Backups created: ${results.results.length}`);
    console.log(`   Backup directory: ${BACKUP_DIR}`);
    
    // Save backup log
    const logFile = path.join(BACKUP_DIR, 'backup-log.json');
    const existingLogs = fs.existsSync(logFile) ? 
      JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];
    
    existingLogs.push(results);
    
    // Keep only last 50 log entries
    if (existingLogs.length > 50) {
      existingLogs.splice(0, existingLogs.length - 50);
    }
    
    fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
    
    return results;
  } catch (error) {
    console.error(`\n❌ Backup failed: ${error.message}`);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    includeDatabase: !args.includes('--no-database'),
    includeConfiguration: !args.includes('--no-config'),
    includeCSVExport: args.includes('--csv'),
    cleanOld: !args.includes('--no-clean')
  };
  
  console.log('Backup options:', options);
  console.log('');
  
  performBackup(options).catch(error => {
    console.error('Backup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { performBackup, backupDatabase, backupConfiguration, exportDataAsCSV };