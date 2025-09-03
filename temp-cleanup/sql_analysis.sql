-- BIDBACK Trading Tool - Database Analysis SQL
-- Analyze current market_breadth table schema and data
-- Focus on CSV data mapping problem

-- 1. Check table schema
.schema market_breadth

-- 2. Check if extended columns exist
PRAGMA table_info(market_breadth);

-- 3. Count total records
SELECT COUNT(*) as total_records FROM market_breadth;

-- 4. Analyze recent records with all relevant fields
SELECT 
    id,
    date,
    t2108,
    sp500,
    stocks_up_4pct,
    stocks_down_4pct, 
    worden_universe,
    ratio_5day,
    ratio_10day,
    SUBSTR(notes, 1, 100) as notes_preview
FROM market_breadth 
ORDER BY date DESC 
LIMIT 5;

-- 5. Find records with problematic S&P 500 values
SELECT 
    date,
    sp500,
    notes
FROM market_breadth 
WHERE sp500 = '6' OR sp500 = '6.0'
ORDER BY date DESC;

-- 6. Find records with default Worden Universe values
SELECT 
    date,
    worden_universe,
    notes
FROM market_breadth 
WHERE worden_universe = 7000
ORDER BY date DESC
LIMIT 3;

-- 7. Find records with empty critical fields
SELECT 
    date,
    stocks_up_4pct,
    stocks_down_4pct,
    notes
FROM market_breadth 
WHERE stocks_up_4pct IS NULL OR stocks_down_4pct IS NULL
ORDER BY date DESC
LIMIT 3;

-- 8. Analyze notes patterns to understand legacy format
SELECT 
    date,
    data_source,
    LENGTH(notes) as notes_length,
    notes
FROM market_breadth 
WHERE notes IS NOT NULL 
  AND notes != ''
ORDER BY date DESC
LIMIT 5;

-- 9. Check for T2108 extraction potential from notes
SELECT 
    date,
    t2108 as db_t2108,
    CASE 
        WHEN notes LIKE '%T2108:%' THEN 
            TRIM(SUBSTR(notes, INSTR(notes, 'T2108:') + 6, 10))
        ELSE 'NOT_FOUND'
    END as notes_t2108,
    notes
FROM market_breadth 
WHERE notes LIKE '%T2108:%'
ORDER BY date DESC
LIMIT 3;

-- 10. Check for S&P 500 extraction potential from notes  
SELECT 
    date,
    sp500 as db_sp500,
    CASE 
        WHEN notes LIKE '%SP:%' THEN 
            TRIM(REPLACE(SUBSTR(notes, INSTR(notes, 'SP:') + 3, 15), ',', ''))
        ELSE 'NOT_FOUND'
    END as notes_sp500,
    notes
FROM market_breadth 
WHERE notes LIKE '%SP:%'
ORDER BY date DESC
LIMIT 3;