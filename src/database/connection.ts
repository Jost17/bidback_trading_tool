import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'

export class TradingDatabase {
  public db: Database.Database
  private dbPath: string

  constructor(dbPath?: string) {
    if (dbPath) {
      // Use provided path directly
      this.dbPath = dbPath
    } else {
      // Use app data directory for production, current directory for development
      const isDev = process.env.NODE_ENV === 'development'
      const baseDir = isDev ? process.cwd() : app.getPath('userData')
      this.dbPath = path.join(baseDir, 'trading.db')
    }
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true })
    
    // Initialize database
    this.db = new Database(this.dbPath)
    
    // Configure for optimal performance
    this.configureDatabase()
    
    // Check if this is an existing database with different schema
    try {
      const existingTables = this.getExistingTables()
      console.log('Found existing tables:', existingTables)
      
      if (existingTables.includes('market_breadth')) {
        console.log('Detected existing database with market_breadth schema - using current schema')
        // Schema is already correct, just run safe migrations
        this.runSafeMigrations()
      } else if (existingTables.includes('market_breadth_daily')) {
        console.log('Detected existing database with market_breadth_daily schema')
        this.adaptExistingSchema()
      } else {
        // Initialize new schema
        console.log('No existing schema found - initializing new database')
        this.initializeSchema()
      }
    } catch (error) {
      console.error('Error during database schema setup:', error)
      console.log('Attempting safe initialization...')
      // Fallback to safe initialization
      this.runSafeMigrations()
    }
    
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
        
        -- Essential Trading Data (included from start to prevent schema conflicts)
        vix REAL DEFAULT NULL,
        t2108 REAL DEFAULT NULL,
        stocks_up_4pct INTEGER DEFAULT NULL,
        stocks_down_4pct INTEGER DEFAULT NULL,
        stocks_up_20pct INTEGER DEFAULT NULL,
        stocks_down_20pct INTEGER DEFAULT NULL,
        stocks_up_20dollar INTEGER DEFAULT NULL,
        stocks_down_20dollar INTEGER DEFAULT NULL,
        ratio_5day REAL DEFAULT NULL,
        ratio_10day REAL DEFAULT NULL,
        stocks_up_25pct_quarter INTEGER DEFAULT NULL,
        stocks_down_25pct_quarter INTEGER DEFAULT NULL,
        stocks_up_25pct_month INTEGER DEFAULT NULL,
        stocks_down_25pct_month INTEGER DEFAULT NULL,
        stocks_up_50pct_month INTEGER DEFAULT NULL,
        stocks_down_50pct_month INTEGER DEFAULT NULL,
        stocks_up_13pct_34days INTEGER DEFAULT NULL,
        stocks_down_13pct_34days INTEGER DEFAULT NULL,
        worden_universe INTEGER DEFAULT NULL,
        sp500 REAL DEFAULT NULL,
        source_file TEXT DEFAULT NULL,
        import_format TEXT DEFAULT NULL,
        data_quality_score REAL DEFAULT NULL,
        
        -- Metadata
        data_source TEXT DEFAULT 'manual' CHECK(data_source IN ('manual', 'imported', 'api')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(date)
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

      -- Portfolio Settings for Position Calculator
      CREATE TABLE IF NOT EXISTS portfolio_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_size REAL NOT NULL DEFAULT 100000,
        base_size_percentage REAL NOT NULL DEFAULT 10,
        max_heat_percentage REAL NOT NULL DEFAULT 80,
        max_positions INTEGER NOT NULL DEFAULT 8,
        trading_setups TEXT NOT NULL DEFAULT '[]', -- JSON string
        risk_per_trade REAL NOT NULL DEFAULT 2,
        use_kelly_sizing BOOLEAN NOT NULL DEFAULT 0,
        enable_position_scaling BOOLEAN NOT NULL DEFAULT 1,
        last_updated TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

  private createEssentialIndices(): void {
    console.log('Creating essential indices safely...')
    
    const essentialIndices = [
      // Only create indices for market_breadth which we know exists
      'CREATE INDEX IF NOT EXISTS idx_market_breadth_date ON market_breadth(date)',
      'CREATE INDEX IF NOT EXISTS idx_market_breadth_timestamp ON market_breadth(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_market_breadth_score ON market_breadth(breadth_score)',
    ]
    
    // Only add VIX index if column exists
    try {
      this.db.prepare('SELECT vix FROM market_breadth LIMIT 1').get()
      essentialIndices.push('CREATE INDEX IF NOT EXISTS idx_market_breadth_vix ON market_breadth(vix)')
    } catch {
      console.log('VIX column not found, skipping VIX index')
    }
    
    essentialIndices.forEach(index => {
      try {
        this.db.exec(index)
      } catch (error) {
        console.log(`Index creation skipped (may already exist): ${index}`)
      }
    })
    
    console.log('Essential indices created')
  }

  private createIndices(): void {
    console.log('Creating database indices...')
    
    const baseIndices = [
      // Essential market breadth indices (always safe)
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
    
    // Create base indices first
    baseIndices.forEach(index => {
      try {
        this.db.exec(index)
      } catch (error) {
        console.warn(`Failed to create index (table may not exist): ${index}`, error)
      }
    })
    
    // Create conditional indices for market_breadth columns that might not exist in older schemas
    const conditionalIndices = [
      { column: 'vix', index: 'CREATE INDEX IF NOT EXISTS idx_market_breadth_vix ON market_breadth(vix)' },
      { column: 't2108', index: 'CREATE INDEX IF NOT EXISTS idx_market_breadth_t2108 ON market_breadth(t2108)' },
      { column: 'stocks_up_4pct', index: 'CREATE INDEX IF NOT EXISTS idx_market_breadth_up4pct ON market_breadth(stocks_up_4pct)' }
    ]
    
    conditionalIndices.forEach(({ column, index }) => {
      try {
        // Test if column exists by trying to query it
        this.db.prepare(`SELECT ${column} FROM market_breadth LIMIT 1`).get()
        // If no error, create the index
        this.db.exec(index)
        console.log(`Created index for column: ${column}`)
      } catch (error) {
        console.log(`Skipped index for missing column: ${column}`)
      }
    })
    
    console.log('Database indices creation completed')
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
  private runSafeMigrations(): void {
    console.log('Running safe database migrations...')
    
    try {
      // Only add columns if they don't exist, and use safe index creation
      this.runSafeMigration(1, 'Ensure all required columns exist', `
        -- These will only add columns if they don't exist
        ALTER TABLE market_breadth ADD COLUMN vix REAL DEFAULT NULL;
        ALTER TABLE market_breadth ADD COLUMN stocks_up_20pct INTEGER DEFAULT NULL;
        ALTER TABLE market_breadth ADD COLUMN stocks_down_20pct INTEGER DEFAULT NULL;
        ALTER TABLE market_breadth ADD COLUMN stocks_up_20dollar INTEGER DEFAULT NULL;
        ALTER TABLE market_breadth ADD COLUMN stocks_down_20dollar INTEGER DEFAULT NULL;
        ALTER TABLE market_breadth ADD COLUMN ratio_5day REAL DEFAULT NULL;
        ALTER TABLE market_breadth ADD COLUMN ratio_10day REAL DEFAULT NULL;
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
        ALTER TABLE market_breadth ADD COLUMN worden_universe INTEGER DEFAULT NULL;
        ALTER TABLE market_breadth ADD COLUMN t2108 REAL DEFAULT NULL;
        ALTER TABLE market_breadth ADD COLUMN sp500 REAL DEFAULT NULL;
        ALTER TABLE market_breadth ADD COLUMN source_file TEXT DEFAULT NULL;
        ALTER TABLE market_breadth ADD COLUMN import_format TEXT DEFAULT NULL;
        ALTER TABLE market_breadth ADD COLUMN data_quality_score REAL DEFAULT NULL;
      `)

      // Add portfolio_settings table for existing databases
      this.runSafeMigration(2, 'Add portfolio settings table', `
        CREATE TABLE IF NOT EXISTS portfolio_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          portfolio_size REAL NOT NULL DEFAULT 100000,
          base_size_percentage REAL NOT NULL DEFAULT 10,
          max_heat_percentage REAL NOT NULL DEFAULT 80,
          max_positions INTEGER NOT NULL DEFAULT 8,
          trading_setups TEXT NOT NULL DEFAULT '[]',
          risk_per_trade REAL NOT NULL DEFAULT 2,
          use_kelly_sizing BOOLEAN NOT NULL DEFAULT 0,
          enable_position_scaling BOOLEAN NOT NULL DEFAULT 1,
          last_updated TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)
      
      // Fix UPSERT constraint for existing databases (date-only uniqueness)
      this.runSafeMigration(3, 'Fix UPSERT constraint to use date-only uniqueness', `
        -- Create new table with correct constraint
        CREATE TABLE IF NOT EXISTS market_breadth_temp (
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
          
          -- Extended Trading Data
          vix REAL DEFAULT NULL,
          t2108 REAL DEFAULT NULL,
          stocks_up_4pct INTEGER DEFAULT NULL,
          stocks_down_4pct INTEGER DEFAULT NULL,
          stocks_up_20pct INTEGER DEFAULT NULL,
          stocks_down_20pct INTEGER DEFAULT NULL,
          stocks_up_20dollar INTEGER DEFAULT NULL,
          stocks_down_20dollar INTEGER DEFAULT NULL,
          ratio_5day REAL DEFAULT NULL,
          ratio_10day REAL DEFAULT NULL,
          stocks_up_25pct_quarter INTEGER DEFAULT NULL,
          stocks_down_25pct_quarter INTEGER DEFAULT NULL,
          stocks_up_25pct_month INTEGER DEFAULT NULL,
          stocks_down_25pct_month INTEGER DEFAULT NULL,
          stocks_up_50pct_month INTEGER DEFAULT NULL,
          stocks_down_50pct_month INTEGER DEFAULT NULL,
          stocks_up_13pct_34days INTEGER DEFAULT NULL,
          stocks_down_13pct_34days INTEGER DEFAULT NULL,
          worden_universe INTEGER DEFAULT NULL,
          sp500 REAL DEFAULT NULL,
          source_file TEXT DEFAULT NULL,
          import_format TEXT DEFAULT NULL,
          data_quality_score REAL DEFAULT NULL,
          
          -- Metadata
          data_source TEXT DEFAULT 'manual' CHECK(data_source IN ('manual', 'imported', 'api')),
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(date)
        );
        
        -- Copy data from old table, removing duplicates by keeping the latest entry per date
        INSERT OR IGNORE INTO market_breadth_temp
        SELECT * FROM market_breadth 
        WHERE id IN (
          SELECT MAX(id) FROM market_breadth GROUP BY date
        );
        
        -- Drop old table and rename new one
        DROP TABLE market_breadth;
        ALTER TABLE market_breadth_temp RENAME TO market_breadth;
      `)
      
      // Create essential indices safely
      this.createEssentialIndices()
      
    } catch (error) {
      console.log('Safe migrations completed with some expected errors (columns may already exist)')
    }
    
    console.log('Safe migrations completed')
  }

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
    
    // Migration 3: Add VIX column for market volatility data
    this.runMigration(3, 'Add VIX column for volatility data persistence', `
      -- Add VIX column for volatility data
      ALTER TABLE market_breadth ADD COLUMN vix REAL DEFAULT NULL;
    `)
  }

  private runSafeMigration(version: number, description: string, sql: string): void {
    console.log(`Safe migration ${version}: ${description}`)
    
    // Split SQL into individual statements and execute each one safely
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0)
    
    statements.forEach(statement => {
      try {
        this.db.exec(statement)
      } catch (error) {
        // Expected errors (like column already exists) are OK
        if (error instanceof Error && error.message.includes('duplicate column name')) {
          console.log(`Column already exists (expected): ${statement.substring(0, 50)}...`)
        } else {
          console.log(`Statement skipped (safe): ${statement.substring(0, 50)}...`)
        }
      }
    })
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

  // Helper methods for existing database adaptation
  private getExistingTables(): string[] {
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as Array<{ name: string }>
    
    return tables.map(t => t.name)
  }

  private adaptExistingSchema(): void {
    console.log('Adapting existing database schema for application compatibility...')
    
    // Create a view that maps the existing schema to what the application expects
    this.db.exec(`
      -- Create market_breadth view that maps from market_breadth_daily
      CREATE VIEW IF NOT EXISTS market_breadth AS
      SELECT 
        id,
        date,
        date || 'T16:00:00.000Z' as timestamp,
        
        -- Map existing columns to expected names
        stocks_up_4pct_daily as advancing_issues,
        stocks_down_4pct_daily as declining_issues,
        COALESCE(stocks_up_25pct_quarterly / 10, 0) as new_highs,
        COALESCE(stocks_down_25pct_quarterly / 10, 0) as new_lows,
        COALESCE(stocks_up_25pct_monthly, 0) as up_volume,
        COALESCE(stocks_down_25pct_monthly, 0) as down_volume,
        
        -- Calculate breadth score from existing data
        50 as breadth_score, -- Default for now, will be calculated
        50 as trend_strength,
        'NEUTRAL' as market_phase,
        
        -- Extended fields that match existing schema
        stocks_up_20pct_custom as stocks_up_20pct,
        stocks_down_20pct_custom as stocks_down_20pct,
        stocks_up_20dollar_custom as stocks_up_20dollar,
        stocks_down_20dollar_custom as stocks_down_20dollar,
        ratio_5day,
        ratio_10day,
        stocks_up_4pct_daily as stocks_up_4pct,
        stocks_down_4pct_daily as stocks_down_4pct,
        stocks_up_25pct_quarterly as stocks_up_25pct_quarter,
        stocks_down_25pct_quarterly as stocks_down_25pct_quarter,
        stocks_up_25pct_monthly as stocks_up_25pct_month,
        stocks_down_25pct_monthly as stocks_down_25pct_month,
        stocks_up_50pct_monthly as stocks_up_50pct_month,
        stocks_down_50pct_monthly as stocks_down_50pct_month,
        stocks_up_13pct_34days,
        stocks_down_13pct_34days,
        worden_common_stocks as worden_universe,
        t2108,
        sp_reference as sp500,
        vix,
        
        -- Metadata
        data_source,
        'csv_import' as import_format,
        100 as data_quality_score,
        NULL as source_file,
        'Adapted from market_breadth_daily' as notes,
        created_at,
        updated_at
      FROM market_breadth_daily;
    `)
    
    // Create basic trades table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_id TEXT UNIQUE NOT NULL,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL CHECK(side IN ('BUY', 'SELL')),
        quantity INTEGER NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL,
        entry_datetime DATETIME NOT NULL,
        exit_datetime DATETIME,
        gross_pnl REAL,
        commission REAL DEFAULT 0,
        net_pnl REAL,
        position_size_percent REAL,
        risk_amount REAL,
        stop_loss REAL,
        target_price REAL,
        account_type TEXT CHECK(account_type IN ('CASH', 'MARGIN')),
        account_balance REAL NOT NULL,
        setup_type TEXT,
        strategy TEXT,
        trade_notes TEXT,
        outcome_analysis TEXT,
        market_breadth_score REAL,
        spy_price REAL,
        vix_level REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Create account snapshots table if it doesn't exist
    this.db.exec(`
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
    `)
    
    // Create market indices table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS market_indices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        symbol TEXT NOT NULL,
        price REAL NOT NULL,
        change_percent REAL,
        volume INTEGER,
        ma_20 REAL,
        ma_50 REAL,
        ma_200 REAL,
        rsi REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, symbol)
      );
    `)
    
    // Create schema version table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT
      );
    `)
    
    // Insert schema version
    const versionExists = this.db.prepare('SELECT version FROM schema_version WHERE version = 1').get()
    if (!versionExists) {
      this.db.prepare(`
        INSERT INTO schema_version (version, description) 
        VALUES (1, 'Adapted existing market_breadth_daily schema')
      `).run()
    }
    
    console.log('Database schema adaptation completed')
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