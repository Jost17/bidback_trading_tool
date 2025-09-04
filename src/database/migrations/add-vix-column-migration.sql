-- Migration: Add VIX column for volatility data persistence
-- Version: 3
-- Date: 2025-01-04
-- Description: Add VIX (CBOE Volatility Index) column to market_breadth table

-- Check if VIX column already exists before adding
PRAGMA table_info(market_breadth);

-- Add VIX column if it doesn't exist
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so this needs to be handled in the application layer
ALTER TABLE market_breadth ADD COLUMN vix REAL DEFAULT NULL;

-- Create index for VIX for better query performance
CREATE INDEX IF NOT EXISTS idx_market_breadth_vix ON market_breadth(vix);

-- Update schema version
INSERT INTO schema_version (version, description, applied_at) 
VALUES (3, 'Add VIX column for volatility data persistence', CURRENT_TIMESTAMP)
ON CONFLICT(version) DO NOTHING;

-- Verify column was added successfully
SELECT sql FROM sqlite_master WHERE type='table' AND name='market_breadth';

-- Show current schema version
SELECT * FROM schema_version ORDER BY version DESC LIMIT 1;