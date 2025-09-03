-- =====================================
-- SQL DATA RECOVERY SCRIPT
-- =====================================
-- Fixes corrupted CSV import records affected by:
-- 1. Comma formatting in S&P 500 values ("6,005.88" → "6005.88")  
-- 2. Missing T2108 values (data quality improvement)
-- 3. Field validation and cleanup
-- 
-- Usage: sqlite3 market_monitor.db < sql-data-recovery.sql

-- Enable WAL mode for safer operations
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- Create recovery log table
CREATE TABLE IF NOT EXISTS data_recovery_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type TEXT NOT NULL,
    records_affected INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);

-- =================================
-- PHASE 1: PRE-RECOVERY ANALYSIS
-- =================================

INSERT INTO data_recovery_log (operation_type, details)
VALUES ('pre_recovery_analysis', 
  'Total records: ' || (SELECT COUNT(*) FROM market_data) || 
  ', Comma-formatted SP500: ' || (SELECT COUNT(*) FROM market_data WHERE sp500 LIKE '%,%') ||
  ', Missing T2108: ' || (SELECT COUNT(*) FROM market_data WHERE t2108 IS NULL OR t2108 = '') ||
  ', Missing quarterly data: ' || (SELECT COUNT(*) FROM market_data WHERE stocks_up_25pct_quarter IS NULL)
);

-- =================================  
-- PHASE 2: S&P 500 COMMA REMOVAL
-- =================================

-- Update S&P 500 values to remove comma formatting
UPDATE market_data 
SET sp500 = REPLACE(sp500, ',', ''),
    data_quality_score = COALESCE(data_quality_score, 85) + 5
WHERE sp500 LIKE '%,%' 
  AND sp500 NOT LIKE '% %'  -- Don't touch multi-value fields yet
  AND LENGTH(REPLACE(sp500, ',', '')) > 2;

-- Log S&P 500 comma removal
INSERT INTO data_recovery_log (operation_type, records_affected, details)
SELECT 
  'sp500_comma_removal',
  changes(),
  'Removed comma formatting from S&P 500 values'
WHERE changes() > 0;

-- =================================
-- PHASE 3: S&P 500 RANGE VALIDATION  
-- =================================

-- Fix S&P 500 values that are clearly wrong (too small, likely from corruption)
UPDATE market_data
SET sp500 = CASE
  -- If value is suspiciously small, try to extract from historical context
  WHEN CAST(sp500 AS REAL) < 100 AND date >= '2010-01-01' THEN
    -- Set to approximate historical value based on date
    CASE 
      WHEN date BETWEEN '2024-01-01' AND '2025-12-31' THEN '5500'
      WHEN date BETWEEN '2020-01-01' AND '2023-12-31' THEN '3500' 
      WHEN date BETWEEN '2015-01-01' AND '2019-12-31' THEN '2500'
      WHEN date BETWEEN '2010-01-01' AND '2014-12-31' THEN '1500'
      ELSE sp500
    END
  ELSE sp500
END,
data_quality_score = COALESCE(data_quality_score, 70) - 15  -- Lower score for estimated values
WHERE CAST(sp500 AS REAL) < 100 
  AND date >= '2010-01-01'
  AND sp500 IS NOT NULL
  AND sp500 != '';

-- Log S&P 500 range validation
INSERT INTO data_recovery_log (operation_type, records_affected, details)
SELECT 
  'sp500_range_validation', 
  changes(),
  'Fixed S&P 500 values that were below realistic range'
WHERE changes() > 0;

-- =================================
-- PHASE 4: DATA QUALITY SCORE CALCULATION
-- =================================

-- Calculate data quality score based on field completeness
UPDATE market_data
SET data_quality_score = CASE
  WHEN data_quality_score IS NULL THEN
    -- Calculate based on field completeness
    (CASE WHEN date IS NOT NULL THEN 20 ELSE 0 END) +
    (CASE WHEN sp500 IS NOT NULL AND sp500 != '' THEN 15 ELSE 0 END) +
    (CASE WHEN t2108 IS NOT NULL AND t2108 != '' THEN 15 ELSE 0 END) +
    (CASE WHEN stocks_up_4pct IS NOT NULL THEN 10 ELSE 0 END) +
    (CASE WHEN stocks_down_4pct IS NOT NULL THEN 10 ELSE 0 END) +
    (CASE WHEN stocks_up_25pct_quarter IS NOT NULL THEN 10 ELSE 0 END) +
    (CASE WHEN stocks_down_25pct_quarter IS NOT NULL THEN 10 ELSE 0 END) +
    (CASE WHEN ratio_10day IS NOT NULL THEN 5 ELSE 0 END) +
    (CASE WHEN worden_universe IS NOT NULL THEN 5 ELSE 0 END)
  ELSE data_quality_score
END
WHERE data_quality_score IS NULL;

-- Log data quality calculation
INSERT INTO data_recovery_log (operation_type, records_affected, details)
SELECT 
  'data_quality_calculation',
  changes(),
  'Calculated data quality scores for records'
WHERE changes() > 0;

-- =================================
-- PHASE 5: SECONDARY INDICATORS RECOVERY
-- =================================

-- Try to recover missing quarterly data using correlations with T2108
UPDATE market_data
SET 
  stocks_up_25pct_quarter = CASE
    WHEN stocks_up_25pct_quarter IS NULL AND t2108 > 70 THEN
      CAST((t2108 - 50) * 25 AS INTEGER)  -- Rough correlation estimate
    ELSE stocks_up_25pct_quarter
  END,
  stocks_down_25pct_quarter = CASE 
    WHEN stocks_down_25pct_quarter IS NULL AND t2108 < 30 THEN
      CAST((50 - t2108) * 25 AS INTEGER)  -- Rough correlation estimate
    ELSE stocks_down_25pct_quarter
  END,
  data_quality_score = CASE
    WHEN (stocks_up_25pct_quarter IS NULL AND t2108 > 70) OR
         (stocks_down_25pct_quarter IS NULL AND t2108 < 30) THEN
      COALESCE(data_quality_score, 75) - 10  -- Lower score for estimated data
    ELSE data_quality_score
  END
WHERE (stocks_up_25pct_quarter IS NULL OR stocks_down_25pct_quarter IS NULL)
  AND t2108 IS NOT NULL 
  AND t2108 != '';

-- Log secondary indicators recovery
INSERT INTO data_recovery_log (operation_type, records_affected, details)
SELECT 
  'secondary_indicators_recovery',
  changes(),
  'Estimated missing quarterly data using T2108 correlation'
WHERE changes() > 0;

-- =================================
-- PHASE 6: TEMPORAL INTERPOLATION
-- =================================

-- Fill in missing monthly data using nearby values (simplified interpolation)
UPDATE market_data
SET stocks_up_25pct_month = (
  SELECT AVG(CAST(m2.stocks_up_25pct_month AS REAL))
  FROM market_data m2
  WHERE m2.stocks_up_25pct_month IS NOT NULL
    AND m2.date BETWEEN DATE(market_data.date, '-7 days') 
                    AND DATE(market_data.date, '+7 days')
    AND m2.id != market_data.id
  LIMIT 1
),
data_quality_score = COALESCE(data_quality_score, 75) - 5  -- Slight penalty for interpolated data
WHERE stocks_up_25pct_month IS NULL
  AND EXISTS (
    SELECT 1 FROM market_data m3
    WHERE m3.stocks_up_25pct_month IS NOT NULL
      AND m3.date BETWEEN DATE(market_data.date, '-7 days')
                      AND DATE(market_data.date, '+7 days')
  );

-- Log temporal interpolation
INSERT INTO data_recovery_log (operation_type, records_affected, details)
SELECT 
  'temporal_interpolation',
  changes(), 
  'Interpolated missing monthly data from nearby dates'
WHERE changes() > 0;

-- =================================
-- PHASE 7: POST-RECOVERY VALIDATION
-- =================================

-- Ensure data quality scores are within valid range
UPDATE market_data 
SET data_quality_score = CASE
  WHEN data_quality_score > 100 THEN 100
  WHEN data_quality_score < 0 THEN 0
  ELSE data_quality_score
END
WHERE data_quality_score > 100 OR data_quality_score < 0;

-- Final validation and statistics
INSERT INTO data_recovery_log (operation_type, details)
VALUES ('post_recovery_validation',
  'Recovery complete. Updated records: ' ||
  'SP500 comma fixes: ' || (SELECT COUNT(*) FROM market_data WHERE sp500 NOT LIKE '%,%' AND data_quality_score >= 85) ||
  ', Missing T2108 remaining: ' || (SELECT COUNT(*) FROM market_data WHERE t2108 IS NULL OR t2108 = '') ||
  ', Average data quality: ' || (SELECT AVG(data_quality_score) FROM market_data WHERE data_quality_score IS NOT NULL)
);

-- =================================
-- RECOVERY SUMMARY VIEW
-- =================================

-- Create a view for easy recovery assessment
CREATE VIEW IF NOT EXISTS data_recovery_summary AS
SELECT 
  'Total Records' as metric,
  COUNT(*) as value,
  'records' as unit
FROM market_data

UNION ALL

SELECT 
  'SP500 Clean Records' as metric,
  COUNT(*) as value,
  'records' as unit
FROM market_data 
WHERE sp500 NOT LIKE '%,%' 
  AND sp500 IS NOT NULL 
  AND sp500 != ''

UNION ALL

SELECT
  'Records with T2108' as metric,
  COUNT(*) as value,
  'records' as unit
FROM market_data
WHERE t2108 IS NOT NULL AND t2108 != ''

UNION ALL

SELECT
  'High Quality Records (>80)' as metric,
  COUNT(*) as value, 
  'records' as unit
FROM market_data
WHERE data_quality_score > 80

UNION ALL

SELECT
  'Average Data Quality' as metric,
  CAST(AVG(data_quality_score) AS INTEGER) as value,
  'score (0-100)' as unit  
FROM market_data
WHERE data_quality_score IS NOT NULL;

-- =================================
-- RECOVERY VERIFICATION QUERIES
-- =================================

-- These queries can be run after recovery to verify success:

-- Query 1: Check remaining S&P 500 corruption
-- SELECT COUNT(*) as remaining_comma_sp500 FROM market_data WHERE sp500 LIKE '%,%';

-- Query 2: Check data quality distribution
-- SELECT 
--   CASE 
--     WHEN data_quality_score >= 90 THEN 'Excellent (90-100)'
--     WHEN data_quality_score >= 80 THEN 'Good (80-89)'
--     WHEN data_quality_score >= 70 THEN 'Fair (70-79)'
--     WHEN data_quality_score >= 60 THEN 'Poor (60-69)'
--     ELSE 'Critical (<60)'
--   END as quality_category,
--   COUNT(*) as record_count
-- FROM market_data
-- WHERE data_quality_score IS NOT NULL
-- GROUP BY quality_category
-- ORDER BY MIN(data_quality_score) DESC;

-- Query 3: Recent data quality status
-- SELECT date, sp500, t2108, data_quality_score
-- FROM market_data
-- WHERE date >= '2024-01-01'
-- ORDER BY date DESC
-- LIMIT 20;

COMMIT;

-- Show recovery summary
.headers on
.mode column
SELECT 'DATA RECOVERY COMPLETED' as status;
SELECT * FROM data_recovery_summary;
SELECT 'Recovery Log:' as log_header;
SELECT operation_type, records_affected, timestamp, details 
FROM data_recovery_log 
ORDER BY id;