-- =====================================
-- MARKET BREADTH RAW DATA SCHEMA v2.0
-- =====================================
-- Purpose: Store ONLY raw input data for maximum flexibility
-- NO calculated fields - all calculations happen at runtime
-- Optimized for 18+ years historical data (2007-2025)

CREATE TABLE IF NOT EXISTS market_breadth_raw_data (
    -- Primary Key
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Date & Timestamp (Required)
    date TEXT NOT NULL UNIQUE, -- Format: YYYY-MM-DD
    timestamp TEXT NOT NULL DEFAULT (datetime('now')), -- ISO format
    
    -- ================================
    -- PRIMARY BREADTH INDICATORS (Raw Data Only)
    -- ================================
    stocks_up_4pct_daily INTEGER CHECK(stocks_up_4pct_daily >= 0),
    stocks_down_4pct_daily INTEGER CHECK(stocks_down_4pct_daily >= 0),
    stocks_up_25pct_quarterly INTEGER CHECK(stocks_up_25pct_quarterly >= 0),
    stocks_down_25pct_quarterly INTEGER CHECK(stocks_down_25pct_quarterly >= 0),
    
    -- ================================
    -- SECONDARY BREADTH INDICATORS (Raw Data Only)
    -- ================================
    stocks_up_25pct_monthly INTEGER CHECK(stocks_up_25pct_monthly >= 0),
    stocks_down_25pct_monthly INTEGER CHECK(stocks_down_25pct_monthly >= 0),
    stocks_up_50pct_monthly INTEGER CHECK(stocks_up_50pct_monthly >= 0),
    stocks_down_50pct_monthly INTEGER CHECK(stocks_down_50pct_monthly >= 0),
    stocks_up_13pct_34days INTEGER CHECK(stocks_up_13pct_34days >= 0),
    stocks_down_13pct_34days INTEGER CHECK(stocks_down_13pct_34days >= 0),
    
    -- ================================
    -- REFERENCE DATA (Raw Input)
    -- ================================
    worden_universe INTEGER CHECK(worden_universe > 0), -- Total stocks tracked
    t2108 REAL CHECK(t2108 >= 0 AND t2108 <= 100), -- % stocks above 40-day MA
    sp500_level TEXT, -- Stored as TEXT due to comma formatting ("6,000.36")
    
    -- ================================
    -- LEGACY COMPATIBILITY FIELDS
    -- ================================
    -- Keep these for migration from existing market_breadth table
    advancing_issues INTEGER CHECK(advancing_issues >= 0),
    declining_issues INTEGER CHECK(declining_issues >= 0),
    new_highs INTEGER CHECK(new_highs >= 0),
    new_lows INTEGER CHECK(new_lows >= 0),
    up_volume REAL CHECK(up_volume >= 0),
    down_volume REAL CHECK(down_volume >= 0),
    
    -- ================================
    -- SECTOR DATA (11 Sectors - Raw Data)
    -- ================================
    -- Note: May not be populated initially - depends on data source
    basic_materials_sector REAL,
    consumer_cyclical_sector REAL,
    financial_services_sector REAL,
    real_estate_sector REAL,
    consumer_defensive_sector REAL,
    healthcare_sector REAL,
    utilities_sector REAL,
    communication_services_sector REAL,
    energy_sector REAL,
    industrials_sector REAL,
    technology_sector REAL,
    
    -- ================================
    -- METADATA & TRACKING
    -- ================================
    source_file TEXT, -- Track which CSV/source this data came from
    import_format TEXT DEFAULT 'stockbee_v1' CHECK(import_format IN ('stockbee_v1', 'manual', 'api', 'legacy_migration')),
    data_quality_score REAL DEFAULT 100 CHECK(data_quality_score >= 0 AND data_quality_score <= 100),
    notes TEXT, -- User notes for manual entries
    
    -- Audit timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Data validation constraint
    CONSTRAINT valid_daily_data CHECK (
        (stocks_up_4pct_daily IS NOT NULL OR advancing_issues IS NOT NULL) AND
        (stocks_down_4pct_daily IS NOT NULL OR declining_issues IS NOT NULL)
    )
);

-- ================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ================================

-- Primary date-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_breadth_raw_date 
ON market_breadth_raw_data(date DESC);

-- Import tracking and data source queries
CREATE INDEX IF NOT EXISTS idx_breadth_raw_source 
ON market_breadth_raw_data(source_file, import_format);

-- Data quality monitoring
CREATE INDEX IF NOT EXISTS idx_breadth_raw_quality 
ON market_breadth_raw_data(data_quality_score, created_at);

-- Range queries for calculations (5-day, 10-day ratios)
CREATE INDEX IF NOT EXISTS idx_breadth_raw_date_range 
ON market_breadth_raw_data(date, stocks_up_4pct_daily, stocks_down_4pct_daily);

-- T2108 trend analysis
CREATE INDEX IF NOT EXISTS idx_breadth_raw_t2108 
ON market_breadth_raw_data(date, t2108) WHERE t2108 IS NOT NULL;

-- Legacy compatibility for migration queries
CREATE INDEX IF NOT EXISTS idx_breadth_raw_legacy 
ON market_breadth_raw_data(date, advancing_issues, declining_issues);

-- ================================
-- DATA VALIDATION TRIGGER
-- ================================

-- Update timestamp trigger
CREATE TRIGGER IF NOT EXISTS update_breadth_raw_timestamp 
    AFTER UPDATE ON market_breadth_raw_data
    FOR EACH ROW
BEGIN
    UPDATE market_breadth_raw_data 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- ================================
-- SCHEMA VERSION TRACKING
-- ================================

-- Record this schema version
INSERT OR IGNORE INTO schema_version (version, description) 
VALUES (2, 'Market Breadth Raw Data Schema - Raw input data only, no calculated fields');

-- ================================
-- PERFORMANCE OPTIMIZATION PRAGMAS
-- ================================

-- These should be set at database connection level:
-- PRAGMA journal_mode = WAL;
-- PRAGMA cache_size = 32000;  -- 32MB cache
-- PRAGMA synchronous = NORMAL;
-- PRAGMA mmap_size = 268435456;  -- 256MB memory mapped
-- PRAGMA page_size = 4096;