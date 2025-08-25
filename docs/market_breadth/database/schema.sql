-- Trading Tool Database Schema
-- Market Breadth Data (2007-2024+ Historical Data)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Market Breadth Daily Data Table
CREATE TABLE market_breadth_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    
    -- Primary Breadth Indicators
    stocks_up_4pct_daily INTEGER,
    stocks_down_4pct_daily INTEGER,
    stocks_up_25pct_quarterly INTEGER,
    stocks_down_25pct_quarterly INTEGER,
    stocks_up_20pct_custom INTEGER, -- Custom addition
    stocks_down_20pct_custom INTEGER, -- Custom addition
    
    -- Calculated Ratios (computed from historical data)
    ratio_5day DECIMAL(10,4),
    ratio_10day DECIMAL(10,4),
    
    -- Secondary Breadth Indicators
    stocks_up_25pct_monthly INTEGER,
    stocks_down_25pct_monthly INTEGER,
    stocks_up_50pct_monthly INTEGER,
    stocks_down_50pct_monthly INTEGER,
    stocks_up_13pct_34days INTEGER,
    stocks_down_13pct_34days INTEGER,
    stocks_up_20dollar_custom INTEGER, -- Custom $20 up
    stocks_down_20dollar_custom INTEGER, -- Custom $20 down
    
    -- Overarching Indicators
    t2108 DECIMAL(6,2), -- % Stocks above 40-day MA
    worden_common_stocks DECIMAL(10,2),
    sp_reference DECIMAL(10,2),
    
    -- Metadata
    data_source VARCHAR(50) DEFAULT 'csv_import', -- csv_import, ocr, manual, api
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Validation constraints
    CONSTRAINT valid_date_range CHECK (date >= '2007-01-01' AND date <= CURRENT_DATE + INTERVAL '1 year'),
    CONSTRAINT valid_percentages CHECK (t2108 >= 0 AND t2108 <= 100)
);

-- Index for fast date-based queries
CREATE INDEX idx_market_breadth_date ON market_breadth_daily(date DESC);
CREATE INDEX idx_market_breadth_created_at ON market_breadth_daily(created_at);

-- Custom Columns for Additional Indicators
CREATE TABLE market_breadth_custom_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_name VARCHAR(100) NOT NULL UNIQUE,
    column_description TEXT,
    data_type VARCHAR(20) DEFAULT 'DECIMAL(10,2)', -- DECIMAL, INTEGER, VARCHAR
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_column_name CHECK (column_name ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT valid_data_type CHECK (data_type IN ('DECIMAL(10,2)', 'DECIMAL(10,4)', 'INTEGER', 'VARCHAR(50)'))
);

-- Custom Column Values (EAV pattern for flexibility)
CREATE TABLE market_breadth_custom_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    column_id UUID NOT NULL REFERENCES market_breadth_custom_columns(id) ON DELETE CASCADE,
    value_text VARCHAR(50),
    value_numeric DECIMAL(15,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, column_id)
);

CREATE INDEX idx_custom_values_date_column ON market_breadth_custom_values(date, column_id);

-- Data Import Log for tracking CSV migrations
CREATE TABLE data_import_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    import_type VARCHAR(20) NOT NULL, -- csv, ocr, manual
    records_processed INTEGER NOT NULL DEFAULT 0,
    records_imported INTEGER NOT NULL DEFAULT 0,
    records_failed INTEGER NOT NULL DEFAULT 0,
    date_range_start DATE,
    date_range_end DATE,
    error_log TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_import_type CHECK (import_type IN ('csv', 'ocr', 'manual', 'api')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_import_log_status ON data_import_log(status);
CREATE INDEX idx_import_log_created_at ON data_import_log(created_at DESC);

-- Trading Signal Analysis (derived from breadth data)
CREATE TABLE market_breadth_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    
    -- Signal Classifications
    primary_signal VARCHAR(20), -- bullish, bearish, neutral
    secondary_signal VARCHAR(20), -- bullish, bearish, neutral
    overall_signal VARCHAR(20), -- bullish, bearish, neutral
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Signal Components
    primary_indicators_bullish INTEGER DEFAULT 0,
    primary_indicators_bearish INTEGER DEFAULT 0,
    secondary_indicators_bullish INTEGER DEFAULT 0,
    secondary_indicators_bearish INTEGER DEFAULT 0,
    
    -- Notes and Analysis
    analysis_notes TEXT,
    trading_direction VARCHAR(10), -- long, short, neutral
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_signals CHECK (
        primary_signal IN ('bullish', 'bearish', 'neutral') AND
        secondary_signal IN ('bullish', 'bearish', 'neutral') AND
        overall_signal IN ('bullish', 'bearish', 'neutral')
    ),
    CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1),
    CONSTRAINT valid_trading_direction CHECK (trading_direction IN ('long', 'short', 'neutral'))
);

CREATE INDEX idx_signals_date ON market_breadth_signals(date DESC);
CREATE INDEX idx_signals_overall ON market_breadth_signals(overall_signal, date DESC);

-- Update trigger for market_breadth_daily
CREATE OR REPLACE FUNCTION update_market_breadth_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_market_breadth_timestamp
    BEFORE UPDATE ON market_breadth_daily
    FOR EACH ROW
    EXECUTE FUNCTION update_market_breadth_timestamp();

-- View for latest market breadth data with calculated signals
CREATE VIEW v_latest_market_breadth AS
SELECT 
    mbd.*,
    mbs.primary_signal,
    mbs.secondary_signal,
    mbs.overall_signal,
    mbs.confidence_score,
    mbs.trading_direction
FROM market_breadth_daily mbd
LEFT JOIN market_breadth_signals mbs ON mbd.date = mbs.date
ORDER BY mbd.date DESC
LIMIT 50;

-- View for primary indicators status
CREATE VIEW v_primary_indicators_status AS
SELECT 
    date,
    CASE 
        WHEN stocks_up_4pct_daily > stocks_down_4pct_daily THEN 'bullish'
        WHEN stocks_up_4pct_daily < stocks_down_4pct_daily THEN 'bearish'
        ELSE 'neutral'
    END AS daily_4pct_signal,
    CASE 
        WHEN ratio_5day > 1.0 THEN 'bullish'
        WHEN ratio_5day < 1.0 THEN 'bearish'
        ELSE 'neutral'
    END AS ratio_5day_signal,
    CASE 
        WHEN ratio_10day > 1.0 THEN 'bullish'
        WHEN ratio_10day < 1.0 THEN 'bearish'
        ELSE 'neutral'
    END AS ratio_10day_signal,
    CASE 
        WHEN stocks_up_25pct_quarterly > stocks_down_25pct_quarterly THEN 'bullish'
        WHEN stocks_up_25pct_quarterly < stocks_down_25pct_quarterly THEN 'bearish'
        ELSE 'neutral'
    END AS quarterly_25pct_signal
FROM market_breadth_daily
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;