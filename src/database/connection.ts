import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'

export class TradingDatabase {
  public db: Database.Database
  private dbPath: string

  constructor(dbPath?: string) {
    // Use app data directory for production, current directory for development
    const isDev = process.env.NODE_ENV === 'development'
    const baseDir = isDev ? process.cwd() : app.getPath('userData')
    
    this.dbPath = dbPath || path.join(baseDir, 'trading.db')
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true })
    
    // Initialize database
    this.db = new Database(this.dbPath)
    
    // Configure for optimal performance
    this.configureDatabase()
    
    // Initialize schema
    this.initializeSchema()
    
    // Run migrations
    this.runMigrations()
    
    console.log(`Trading database initialized at: ${this.dbPath}`)
  }

  private configureDatabase(): void {
    // WAL mode for better concurrent performance
    this.db.pragma('journal_mode = WAL')
    
    // Increase cache size (32MB)
    this.db.pragma('cache_size = 32000')
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON')
    
    // Set synchronous mode for balance between safety and performance
    this.db.pragma('synchronous = NORMAL')
    
    // Memory-mapped I/O (256MB)
    this.db.pragma('mmap_size = 268435456')
    
    // Set page size for better performance
    this.db.pragma('page_size = 4096')
    
    console.log('Database performance optimizations applied')
  }

  private initializeSchema(): void {
    const schema = `
      -- Market Breadth Score History
      CREATE TABLE IF NOT EXISTS market_breadth (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        
        -- 6-Factor Breadth Score Components
        advancing_issues INTEGER NOT NULL,
        declining_issues INTEGER NOT NULL,
        new_highs INTEGER NOT NULL,
        new_lows INTEGER NOT NULL,
        up_volume REAL NOT NULL,
        down_volume REAL NOT NULL,
        
        -- Calculated Scores
        breadth_score REAL NOT NULL,
        trend_strength REAL,
        market_phase TEXT,
        
        -- Metadata
        data_source TEXT DEFAULT 'manual' CHECK(data_source IN ('manual', 'imported', 'api')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(date, timestamp)
      );

      -- Market Indices Data
      CREATE TABLE IF NOT EXISTS market_indices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        symbol TEXT NOT NULL,
        price REAL NOT NULL,
        change_percent REAL,
        volume INTEGER,
        
        -- Technical Indicators
        ma_20 REAL,
        ma_50 REAL,
        ma_200 REAL,
        rsi REAL,
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(date, symbol)
      );

      -- Trade Records (TJS_Elite inspired)
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_id TEXT UNIQUE NOT NULL,
        
        -- Trade Basics
        symbol TEXT NOT NULL,
        side TEXT NOT NULL CHECK(side IN ('BUY', 'SELL')),
        quantity INTEGER NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL,
        
        -- Timestamps
        entry_datetime DATETIME NOT NULL,
        exit_datetime DATETIME,
        
        -- P&L Calculation
        gross_pnl REAL,
        commission REAL DEFAULT 0,
        net_pnl REAL,
        
        -- Risk Management
        position_size_percent REAL,
        risk_amount REAL,
        stop_loss REAL,
        target_price REAL,
        
        -- Account Context
        account_type TEXT CHECK(account_type IN ('CASH', 'MARGIN')),
        account_balance REAL NOT NULL,
        
        -- Trade Analysis
        setup_type TEXT,
        strategy TEXT,
        trade_notes TEXT,
        outcome_analysis TEXT,
        
        -- Market Context
        market_breadth_score REAL,
        spy_price REAL,
        vix_level REAL,
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Account Performance Tracking
      CREATE TABLE IF NOT EXISTS account_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        account_balance REAL NOT NULL,
        cash_balance REAL NOT NULL,
        margin_used REAL DEFAULT 0,
        buying_power REAL NOT NULL,
        day_pnl REAL DEFAULT 0,
        total_pnl REAL DEFAULT 0,
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date)
      );

      -- Database metadata and versioning
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT
      );
    `
    
    this.db.exec(schema)
    
    // Create indices for better query performance
    this.createIndices()
    
    // Insert schema version if not exists
    const versionExists = this.db.prepare('SELECT version FROM schema_version WHERE version = 1').get()
    if (!versionExists) {
      this.db.prepare(`
        INSERT INTO schema_version (version, description) 
        VALUES (1, 'Initial schema with market breadth, trades, and account snapshots')
      `).run()
    }
    
    console.log('Database schema initialized successfully')
  }

  private createIndices(): void {
    const indices = [
      // Market breadth indices
      'CREATE INDEX IF NOT EXISTS idx_market_breadth_date ON market_breadth(date)',
      'CREATE INDEX IF NOT EXISTS idx_market_breadth_timestamp ON market_breadth(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_market_breadth_score ON market_breadth(breadth_score)',
      
      // Market indices indices
      'CREATE INDEX IF NOT EXISTS idx_market_indices_date_symbol ON market_indices(date, symbol)',
      'CREATE INDEX IF NOT EXISTS idx_market_indices_symbol ON market_indices(symbol)',
      
      // Trades indices
      'CREATE INDEX IF NOT EXISTS idx_trades_symbol_date ON trades(symbol, entry_datetime)',
      'CREATE INDEX IF NOT EXISTS idx_trades_entry_datetime ON trades(entry_datetime)',
      'CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy)',
      'CREATE INDEX IF NOT EXISTS idx_trades_pnl ON trades(net_pnl)',
      
      // Account snapshots indices
      'CREATE INDEX IF NOT EXISTS idx_account_snapshots_date ON account_snapshots(date)'
    ]
    
    indices.forEach(index => {
      this.db.exec(index)
    })
    
    console.log('Database indices created successfully')
  }

  public async createBackup(): Promise<{ success: boolean; filename: string; path: string; size: number; timestamp: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFilename = `trading-backup-${timestamp}.db`
      const backupPath = path.join(path.dirname(this.dbPath), 'backups', backupFilename)
      
      // Ensure backup directory exists
      fs.mkdirSync(path.dirname(backupPath), { recursive: true })
      
      // Create backup using SQLite backup API
      const backup = this.db.backup(backupPath)
      
      // Handle backup operation properly
      if (backup && typeof backup === 'object' && 'then' in backup) {
        // If backup returns a Promise, await it
        await backup
      } else {
        // If backup returns a backup object synchronously, use step and close
        const backupObj = backup as any
        if (backupObj.step && backupObj.close) {
          backupObj.step(-1) // -1 copies all pages at once
          backupObj.close()
        }
      }
      
      const stats = fs.statSync(backupPath)
      
      return {
        success: true,
        filename: backupFilename,
        path: backupPath,
        size: stats.size,
        timestamp
      }
    } catch (error) {
      console.error('Failed to create database backup:', error)
      throw error
    }
  }

  public getDatabaseInfo(): {
    version: string
    size: number
    tables: string[]
    recordCounts: Record<string, number>
  } {
    try {
      // Get database file size
      const stats = fs.statSync(this.dbPath)
      
      // Get table names
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all() as Array<{ name: string }>
      
      const tableNames = tables.map(t => t.name)
      
      // Get record counts for each table
      const recordCounts: Record<string, number> = {}
      tableNames.forEach(tableName => {
        try {
          const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number }
          recordCounts[tableName] = result.count
        } catch (error) {
          console.warn(`Failed to get count for table ${tableName}:`, error)
          recordCounts[tableName] = 0
        }
      })
      
      // Get schema version
      let version = '1.0.0'
      try {
        const versionResult = this.db.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number }
        version = `1.${versionResult.version || 0}.0`
      } catch (error) {
        console.warn('Could not get schema version:', error)
      }
      
      return {
        version,
        size: stats.size,
        tables: tableNames,
        recordCounts
      }
    } catch (error) {
      console.error('Failed to get database info:', error)
      throw error
    }
  }

  public close(): void {
    if (this.db) {
      // Ensure all changes are written
      this.db.pragma('wal_checkpoint(FULL)')
      this.db.close()
      console.log('Database connection closed')
    }
  }

  // Run all migrations
  private runMigrations(): void {
    console.log('Running database migrations...')
    
    // Migration 2: Add missing breadth fields
    this.runMigration(2, 'Add missing breadth fields for complete CSV data', `
      -- Add missing fields for 20% movements
      ALTER TABLE market_breadth ADD COLUMN stocks_up_20pct INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN stocks_down_20pct INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN stocks_up_20dollar INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN stocks_down_20dollar INTEGER DEFAULT NULL;
      
      -- Add ratio fields
      ALTER TABLE market_breadth ADD COLUMN ratio_5day REAL DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN ratio_10day REAL DEFAULT NULL;
      
      -- Add percentage movement fields
      ALTER TABLE market_breadth ADD COLUMN stocks_up_4pct INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN stocks_down_4pct INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN stocks_up_25pct_quarter INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN stocks_down_25pct_quarter INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN stocks_up_25pct_month INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN stocks_down_25pct_month INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN stocks_up_50pct_month INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN stocks_down_50pct_month INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN stocks_up_13pct_34days INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN stocks_down_13pct_34days INTEGER DEFAULT NULL;
      
      -- Add reference fields
      ALTER TABLE market_breadth ADD COLUMN worden_universe INTEGER DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN t2108 REAL DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN sp500 TEXT DEFAULT NULL;
      
      -- Add metadata fields
      ALTER TABLE market_breadth ADD COLUMN source_file TEXT DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN import_format TEXT DEFAULT NULL;
      ALTER TABLE market_breadth ADD COLUMN data_quality_score REAL DEFAULT NULL;
    `)
  }

  // Utility method to run migrations
  public runMigration(version: number, description: string, sql: string): void {
    const existingVersion = this.db.prepare('SELECT version FROM schema_version WHERE version = ?').get(version)
    
    if (!existingVersion) {
      try {
        // SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we need to check each column
        const lines = sql.split('\n').filter(line => line.trim().startsWith('ALTER TABLE'))
        
        for (const line of lines) {
          try {
            this.db.exec(line)
          } catch (error: any) {
            // Ignore "duplicate column" errors
            if (!error.message.includes('duplicate column')) {
              console.error(`Error executing: ${line}`, error)
            }
          }
        }
        
        this.db.prepare('INSERT INTO schema_version (version, description) VALUES (?, ?)').run(version, description)
        console.log(`Migration ${version} applied: ${description}`)
      } catch (error) {
        console.error(`Failed to apply migration ${version}:`, error)
      }
    } else {
      console.log(`Migration ${version} already applied, skipping`)
    }
  }

  // Run Market Breadth v2 Migration
  public migrateToRawDataSchema(): void {
    console.log('🔄 Starting Market Breadth Raw Data Schema Migration...')
    
    // Check if migration is needed
    const rawTableExists = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='market_breadth_raw_data'
    `).get()
    
    if (rawTableExists) {
      console.log('✅ Raw data table already exists, migration not needed')
      return
    }

    // Read and execute raw schema
    const fs = require('fs')
    const path = require('path')
    
    try {
      const schemaPath = path.join(__dirname, 'schemas/market-breadth-raw-schema.sql')
      const schemaSql = fs.readFileSync(schemaPath, 'utf8')
      
      this.db.transaction(() => {
        // Execute raw schema
        this.db.exec(schemaSql)
        
        // Migrate existing data if market_breadth table exists
        const legacyTableExists = this.db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='market_breadth'
        `).get()
        
        if (legacyTableExists) {
          console.log('🔄 Migrating existing market_breadth data...')
          
          this.db.exec(`
            INSERT INTO market_breadth_raw_data (
              date, timestamp, advancing_issues, declining_issues,
              new_highs, new_lows, up_volume, down_volume,
              import_format, source_file, notes, created_at, updated_at
            )
            SELECT 
              date, 
              COALESCE(timestamp, datetime('now')),
              advancing_issues, declining_issues,
              new_highs, new_lows,
              up_volume, down_volume,
              'legacy_migration' as import_format,
              'market_breadth_legacy' as source_file,
              notes,
              COALESCE(created_at, CURRENT_TIMESTAMP),
              COALESCE(updated_at, CURRENT_TIMESTAMP)
            FROM market_breadth 
            WHERE date IS NOT NULL
            ORDER BY date
          `)
          
          // Rename old table for backup
          this.db.exec('ALTER TABLE market_breadth RENAME TO market_breadth_legacy')
          
          console.log('✅ Data migration completed successfully')
        }
      })()
      
      console.log('✅ Market Breadth Raw Data Schema Migration completed')
      
    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }
}