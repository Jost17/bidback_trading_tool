-- Migration to add missing breadth fields to the market_breadth table
-- These fields are needed for complete CSV data display in the Edit view

-- Add missing fields for 20% movements
ALTER TABLE market_breadth ADD COLUMN stocks_up_20pct INTEGER DEFAULT NULL;
ALTER TABLE market_breadth ADD COLUMN stocks_down_20pct INTEGER DEFAULT NULL;

-- Add missing fields for $20 movements  
ALTER TABLE market_breadth ADD COLUMN stocks_up_20dollar INTEGER DEFAULT NULL;
ALTER TABLE market_breadth ADD COLUMN stocks_down_20dollar INTEGER DEFAULT NULL;

-- Add ratio fields
ALTER TABLE market_breadth ADD COLUMN ratio_5day REAL DEFAULT NULL;
ALTER TABLE market_breadth ADD COLUMN ratio_10day REAL DEFAULT NULL;

-- Add additional percentage movement fields from CSV data
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

-- Add import metadata fields
ALTER TABLE market_breadth ADD COLUMN source_file TEXT DEFAULT NULL;
ALTER TABLE market_breadth ADD COLUMN import_format TEXT DEFAULT NULL;
ALTER TABLE market_breadth ADD COLUMN data_quality_score REAL DEFAULT NULL;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_market_breadth_stocks_up_20pct ON market_breadth(stocks_up_20pct);
CREATE INDEX IF NOT EXISTS idx_market_breadth_stocks_down_20pct ON market_breadth(stocks_down_20pct);
CREATE INDEX IF NOT EXISTS idx_market_breadth_ratio_5day ON market_breadth(ratio_5day);
CREATE INDEX IF NOT EXISTS idx_market_breadth_ratio_10day ON market_breadth(ratio_10day);
CREATE INDEX IF NOT EXISTS idx_market_breadth_t2108 ON market_breadth(t2108);