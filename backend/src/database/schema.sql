-- Trading Tool Database Schema (SQLite3)
-- Market Breadth Data with High/Low Price Integration (2007-2025+ Historical Data)

-- Market Breadth Daily Data Table (Extended with High/Low)
CREATE TABLE market_breadth_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    
    -- High/Low Price Data (NEW - for True Range calculations)
    daily_high DECIMAL(10,2),
    daily_low DECIMAL(10,2),
    daily_close DECIMAL(10,2),
    previous_close DECIMAL(10,2),
    
    -- True Range Calculations (NEW - for Risk Management)
    true_range DECIMAL(10,4),
    average_true_range_14 DECIMAL(10,4), -- 14-day ATR
    average_true_range_20 DECIMAL(10,4), -- 20-day ATR
    
    -- Primary Breadth Indicators (from CSV)
    stocks_up_4pct_daily INTEGER,
    stocks_down_4pct_daily INTEGER,
    stocks_up_25pct_quarterly INTEGER,
    stocks_down_25pct_quarterly INTEGER,
    stocks_up_20pct_custom INTEGER, -- Custom addition
    stocks_down_20pct_custom INTEGER, -- Custom addition
    
    -- Calculated Ratios (computed from historical data)
    ratio_5day DECIMAL(10,4),
    ratio_10day DECIMAL(10,4),
    
    -- Secondary Breadth Indicators (from CSV)
    stocks_up_25pct_monthly INTEGER,
    stocks_down_25pct_monthly INTEGER,
    stocks_up_50pct_monthly INTEGER,
    stocks_down_50pct_monthly INTEGER,
    stocks_up_13pct_34days INTEGER,
    stocks_down_13pct_34days INTEGER,
    stocks_up_20dollar_custom INTEGER, -- Custom $20 up
    stocks_down_20dollar_custom INTEGER, -- Custom $20 down
    
    -- Overarching Indicators (from CSV)
    t2108 DECIMAL(6,2), -- % Stocks above 40-day MA
    worden_common_stocks DECIMAL(10,2),
    sp_reference DECIMAL(10,2),
    
    -- Volatility & Risk Metrics (NEW - derived from High/Low/True Range)
    volatility_rank_20 DECIMAL(5,2), -- 0-100 percentile rank
    volatility_rank_50 DECIMAL(5,2), -- 0-100 percentile rank
    risk_regime VARCHAR(20), -- low, medium, high, extreme
    
    -- Metadata
    data_source VARCHAR(50) DEFAULT 'csv_import', -- csv_import, ocr, manual, api
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validation constraints
    CHECK (date >= '2007-01-01'),
    CHECK (t2108 >= 0 AND t2108 <= 100),
    CHECK (daily_high >= daily_low),
    CHECK (true_range >= 0),
    CHECK (average_true_range_14 >= 0 AND average_true_range_20 >= 0),
    CHECK (volatility_rank_20 >= 0 AND volatility_rank_20 <= 100),
    CHECK (volatility_rank_50 >= 0 AND volatility_rank_50 <= 100),
    CHECK (risk_regime IN ('low', 'medium', 'high', 'extreme'))
);

-- Performance Indices for High-Speed Backtesting
CREATE INDEX idx_market_breadth_date ON market_breadth_daily(date DESC);
CREATE INDEX idx_market_breadth_created_at ON market_breadth_daily(created_at);
CREATE INDEX idx_market_breadth_risk_regime ON market_breadth_daily(risk_regime, date);
CREATE INDEX idx_market_breadth_atr ON market_breadth_daily(average_true_range_14, date);
CREATE INDEX idx_market_breadth_date_range ON market_breadth_daily(date) WHERE date >= '2020-01-01';

-- High/Low Price History Table (for detailed price tracking)
CREATE TABLE market_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    symbol VARCHAR(10) NOT NULL DEFAULT 'SPY', -- Index/ETF reference
    
    -- OHLCV Data
    open_price DECIMAL(10,2),
    high_price DECIMAL(10,2) NOT NULL,
    low_price DECIMAL(10,2) NOT NULL,
    close_price DECIMAL(10,2) NOT NULL,
    volume INTEGER,
    
    -- True Range Components
    hl_range DECIMAL(10,4), -- High - Low
    hc_range DECIMAL(10,4), -- |High - Previous Close|
    lc_range DECIMAL(10,4), -- |Low - Previous Close|
    true_range DECIMAL(10,4), -- MAX(hl_range, hc_range, lc_range)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, symbol),
    CHECK (high_price >= low_price),
    CHECK (true_range >= 0)
);

CREATE INDEX idx_price_history_date_symbol ON market_price_history(date DESC, symbol);
CREATE INDEX idx_price_history_symbol_date ON market_price_history(symbol, date DESC);

-- Custom Columns for Additional Indicators (EAV pattern for flexibility)
CREATE TABLE market_breadth_custom_columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    column_name VARCHAR(100) NOT NULL UNIQUE,
    column_description TEXT,
    data_type VARCHAR(20) DEFAULT 'DECIMAL(10,2)', -- DECIMAL, INTEGER, VARCHAR
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (data_type IN ('DECIMAL(10,2)', 'DECIMAL(10,4)', 'INTEGER', 'VARCHAR(50)'))
);

-- Custom Column Values (EAV pattern for flexibility)
CREATE TABLE market_breadth_custom_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    column_id INTEGER NOT NULL REFERENCES market_breadth_custom_columns(id) ON DELETE CASCADE,
    value_text VARCHAR(50),
    value_numeric DECIMAL(15,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, column_id)
);

CREATE INDEX idx_custom_values_date_column ON market_breadth_custom_values(date, column_id);

-- Data Import Log for tracking CSV migrations
CREATE TABLE data_import_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename VARCHAR(255) NOT NULL,
    import_type VARCHAR(20) NOT NULL, -- csv, ocr, manual, api
    records_processed INTEGER NOT NULL DEFAULT 0,
    records_imported INTEGER NOT NULL DEFAULT 0,
    records_failed INTEGER NOT NULL DEFAULT 0,
    date_range_start DATE,
    date_range_end DATE,
    error_log TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    CHECK (import_type IN ('csv', 'ocr', 'manual', 'api')),
    CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_import_log_status ON data_import_log(status);
CREATE INDEX idx_import_log_created_at ON data_import_log(created_at DESC);

-- Trading Signal Analysis (derived from breadth data + volatility)
CREATE TABLE market_breadth_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    
    -- Signal Classifications
    primary_signal VARCHAR(20), -- bullish, bearish, neutral
    secondary_signal VARCHAR(20), -- bullish, bearish, neutral
    overall_signal VARCHAR(20), -- bullish, bearish, neutral
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Risk-Adjusted Signals (NEW - incorporating volatility)
    volatility_adjusted_signal VARCHAR(20), -- bullish, bearish, neutral, avoid
    risk_score DECIMAL(3,2), -- 0.00 (low risk) to 1.00 (extreme risk)
    
    -- Signal Components
    primary_indicators_bullish INTEGER DEFAULT 0,
    primary_indicators_bearish INTEGER DEFAULT 0,
    secondary_indicators_bullish INTEGER DEFAULT 0,
    secondary_indicators_bearish INTEGER DEFAULT 0,
    
    -- Notes and Analysis
    analysis_notes TEXT,
    trading_direction VARCHAR(10), -- long, short, neutral, avoid
    position_sizing_factor DECIMAL(3,2) DEFAULT 1.00, -- 0.25 to 2.00 based on risk
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (primary_signal IN ('bullish', 'bearish', 'neutral')),
    CHECK (secondary_signal IN ('bullish', 'bearish', 'neutral')),
    CHECK (overall_signal IN ('bullish', 'bearish', 'neutral')),
    CHECK (volatility_adjusted_signal IN ('bullish', 'bearish', 'neutral', 'avoid')),
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
    CHECK (risk_score >= 0 AND risk_score <= 1),
    CHECK (trading_direction IN ('long', 'short', 'neutral', 'avoid')),
    CHECK (position_sizing_factor >= 0.1 AND position_sizing_factor <= 3.0)
);

CREATE INDEX idx_signals_date ON market_breadth_signals(date DESC);
CREATE INDEX idx_signals_overall ON market_breadth_signals(overall_signal, date DESC);
CREATE INDEX idx_signals_risk_adjusted ON market_breadth_signals(volatility_adjusted_signal, risk_score, date DESC);

-- Regime Analysis Table (NEW - for risk management system)
CREATE TABLE market_regime_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    
    -- Regime Classification
    breadth_regime VARCHAR(20), -- expansion, contraction, rotation, crisis
    volatility_regime VARCHAR(20), -- low, rising, high, declining
    trend_regime VARCHAR(20), -- uptrend, downtrend, sideways, transition
    overall_regime VARCHAR(20), -- bull_market, bear_market, correction, recovery
    
    -- Regime Strength Indicators
    breadth_strength DECIMAL(3,2), -- 0.00 to 1.00
    volatility_strength DECIMAL(3,2), -- 0.00 to 1.00
    trend_strength DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Risk Metrics
    regime_stability DECIMAL(3,2), -- 0.00 (unstable) to 1.00 (stable)
    regime_duration_days INTEGER, -- days in current regime
    
    -- Trading Implications
    recommended_exposure DECIMAL(3,2), -- 0.00 to 1.50 (percentage of capital)
    max_position_size DECIMAL(3,2), -- 0.05 to 0.25 (per position limit)
    stop_loss_multiplier DECIMAL(3,2), -- 1.0 to 3.0 (ATR multiplier)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (breadth_regime IN ('expansion', 'contraction', 'rotation', 'crisis')),
    CHECK (volatility_regime IN ('low', 'rising', 'high', 'declining')),
    CHECK (trend_regime IN ('uptrend', 'downtrend', 'sideways', 'transition')),
    CHECK (overall_regime IN ('bull_market', 'bear_market', 'correction', 'recovery')),
    CHECK (breadth_strength >= 0 AND breadth_strength <= 1),
    CHECK (volatility_strength >= 0 AND volatility_strength <= 1),
    CHECK (trend_strength >= 0 AND trend_strength <= 1),
    CHECK (regime_stability >= 0 AND regime_stability <= 1),
    CHECK (recommended_exposure >= 0 AND recommended_exposure <= 2.0),
    CHECK (max_position_size >= 0.01 AND max_position_size <= 1.0),
    CHECK (stop_loss_multiplier >= 0.5 AND stop_loss_multiplier <= 5.0)
);

CREATE INDEX idx_regime_date ON market_regime_analysis(date DESC);
CREATE INDEX idx_regime_overall ON market_regime_analysis(overall_regime, date DESC);
CREATE INDEX idx_regime_stability ON market_regime_analysis(regime_stability, date DESC);

-- Update trigger for market_breadth_daily (SQLite syntax)
CREATE TRIGGER trigger_update_market_breadth_timestamp 
AFTER UPDATE ON market_breadth_daily
BEGIN
    UPDATE market_breadth_daily 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger for True Range calculation
CREATE TRIGGER trigger_calculate_true_range
AFTER INSERT ON market_breadth_daily
WHEN NEW.daily_high IS NOT NULL AND NEW.daily_low IS NOT NULL
BEGIN
    UPDATE market_breadth_daily 
    SET true_range = MAX(
        (NEW.daily_high - NEW.daily_low),
        COALESCE(ABS(NEW.daily_high - NEW.previous_close), 0),
        COALESCE(ABS(NEW.daily_low - NEW.previous_close), 0)
    )
    WHERE id = NEW.id;
END;

-- View for latest market breadth data with calculated signals and risk metrics
CREATE VIEW v_latest_market_breadth AS
SELECT 
    mbd.*,
    mbs.primary_signal,
    mbs.secondary_signal,
    mbs.overall_signal,
    mbs.volatility_adjusted_signal,
    mbs.confidence_score,
    mbs.risk_score,
    mbs.trading_direction,
    mbs.position_sizing_factor,
    mra.overall_regime,
    mra.recommended_exposure,
    mra.max_position_size,
    mra.stop_loss_multiplier
FROM market_breadth_daily mbd
LEFT JOIN market_breadth_signals mbs ON mbd.date = mbs.date
LEFT JOIN market_regime_analysis mra ON mbd.date = mra.date
ORDER BY mbd.date DESC
LIMIT 50;

-- View for primary indicators status with risk adjustment
CREATE VIEW v_primary_indicators_status AS
SELECT 
    date,
    -- Traditional Signals
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
    END AS quarterly_25pct_signal,
    
    -- Risk-Adjusted Signals (NEW)
    CASE 
        WHEN risk_regime = 'extreme' THEN 'avoid'
        WHEN risk_regime = 'high' AND average_true_range_14 > (
            SELECT AVG(average_true_range_14) * 1.5 
            FROM market_breadth_daily 
            WHERE date >= date('now', '-252 days')
        ) THEN 'reduce'
        ELSE 'normal'
    END AS risk_adjustment,
    
    -- Volatility Context
    volatility_rank_20,
    volatility_rank_50,
    risk_regime,
    true_range,
    average_true_range_14
    
FROM market_breadth_daily
WHERE date >= date('now', '-30 days')
ORDER BY date DESC;

-- View for risk management system integration
CREATE VIEW v_risk_management_data AS
SELECT 
    mbd.date,
    mbd.daily_high,
    mbd.daily_low,
    mbd.daily_close,
    mbd.previous_close,
    mbd.true_range,
    mbd.average_true_range_14,
    mbd.average_true_range_20,
    mbd.volatility_rank_20,
    mbd.volatility_rank_50,
    mbd.risk_regime,
    
    -- Breadth Context for Position Sizing
    mbd.t2108,
    mbd.ratio_5day,
    mbd.ratio_10day,
    
    -- Signal Integration
    mbs.overall_signal,
    mbs.volatility_adjusted_signal,
    mbs.risk_score,
    mbs.position_sizing_factor,
    
    -- Regime Context
    mra.overall_regime,
    mra.recommended_exposure,
    mra.max_position_size,
    mra.stop_loss_multiplier
    
FROM market_breadth_daily mbd
LEFT JOIN market_breadth_signals mbs ON mbd.date = mbs.date
LEFT JOIN market_regime_analysis mra ON mbd.date = mra.date
WHERE mbd.date >= date('now', '-90 days')
ORDER BY mbd.date DESC;