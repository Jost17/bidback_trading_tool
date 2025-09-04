-- Market Breadth Data Migration Script
-- Fixes incorrectly imported CSV data by extracting correct values from notes field
-- Created: 2025-09-04
-- 
-- PROBLEM ANALYSIS:
-- - stocks_up_4pct and stocks_down_4pct are mostly NULL
-- - stocks_up_20pct contains ratio_5day values (e.g., 1.44, 2.02)
-- - stocks_down_20pct contains ratio_10day values  
-- - stocks_up_20dollar contains actual up4% values (e.g., 212, 1301)
-- - The correct values are stored in the notes field as CSV strings
--
-- SOLUTION:
-- 1. Extract up4% and down4% from notes field
-- 2. Move ratio values from 20% fields to ratio_5day/ratio_10day 
-- 3. Clear the 20% and $20 fields (manual entry only)
-- 4. Keep 2025-09-03 record intact (already correct)

BEGIN TRANSACTION;

-- First, let's create a temporary view to test our regex extraction
-- This helps us verify the logic before making changes
CREATE TEMPORARY VIEW migration_preview AS
SELECT 
    date,
    notes,
    -- Extract up4% value from notes using SUBSTR and INSTR
    CASE 
        WHEN notes LIKE '%up4%=%' THEN 
            CAST(SUBSTR(notes, 
                INSTR(notes, 'up4%=') + 5,  
                COALESCE(NULLIF(INSTR(SUBSTR(notes, INSTR(notes, 'up4%=') + 5), ','), 0), 
                         LENGTH(SUBSTR(notes, INSTR(notes, 'up4%=') + 5))) - 1
            ) AS INTEGER)
        ELSE NULL 
    END as extracted_up4pct,
    -- Extract down4% value from notes
    CASE 
        WHEN notes LIKE '%down4%=%' THEN 
            CAST(SUBSTR(notes, 
                INSTR(notes, 'down4%=') + 7,  
                COALESCE(NULLIF(INSTR(SUBSTR(notes, INSTR(notes, 'down4%=') + 7), ','), 0), 
                         LENGTH(SUBSTR(notes, INSTR(notes, 'down4%=') + 7))) - 1
            ) AS INTEGER)
        ELSE NULL 
    END as extracted_down4pct,
    -- Extract ratio5d value from notes
    CASE 
        WHEN notes LIKE '%ratio5d=%' THEN 
            CAST(SUBSTR(notes, 
                INSTR(notes, 'ratio5d=') + 8,  
                COALESCE(NULLIF(INSTR(SUBSTR(notes, INSTR(notes, 'ratio5d=') + 8), ','), 0), 
                         LENGTH(SUBSTR(notes, INSTR(notes, 'ratio5d=') + 8))) - 1
            ) AS REAL)
        ELSE NULL 
    END as extracted_ratio5d,
    -- Extract ratio10d value from notes
    CASE 
        WHEN notes LIKE '%ratio10d=%' THEN 
            CAST(SUBSTR(notes, 
                INSTR(notes, 'ratio10d=') + 9,  
                COALESCE(NULLIF(INSTR(SUBSTR(notes, INSTR(notes, 'ratio10d=') + 9), ','), 0), 
                         LENGTH(SUBSTR(notes, INSTR(notes, 'ratio10d=') + 9))) - 1
            ) AS REAL)
        ELSE NULL 
    END as extracted_ratio10d,
    stocks_up_4pct as current_up4pct,
    stocks_down_4pct as current_down4pct,
    stocks_up_20pct as current_up20pct,
    stocks_down_20pct as current_down20pct,
    stocks_up_20dollar as current_up20dollar,
    ratio_5day as current_ratio5d,
    ratio_10day as current_ratio10d
FROM market_breadth 
WHERE notes LIKE '%CSV:%'
   OR date = '2025-09-03'; -- Include the correct record for comparison

-- Display preview of what will be migrated (first 5 records)
.mode column
.headers on
.width 12 8 8 8 8 8 8 8 8 8 8 8
SELECT 'MIGRATION PREVIEW - First 5 Records:' as info;
SELECT * FROM migration_preview LIMIT 5;

-- Step 1: Fix records with CSV notes (extract from notes field)
-- Priority: Records where we have CSV data in notes
UPDATE market_breadth 
SET 
    -- Set up4% and down4% from extracted values or from misplaced stocks_up_20dollar
    stocks_up_4pct = CASE 
        WHEN notes LIKE '%up4%=%' THEN 
            CAST(SUBSTR(notes, 
                INSTR(notes, 'up4%=') + 5,  
                COALESCE(NULLIF(INSTR(SUBSTR(notes, INSTR(notes, 'up4%=') + 5), ','), 0), 
                         LENGTH(SUBSTR(notes, INSTR(notes, 'up4%=') + 5))) - 1
            ) AS INTEGER)
        WHEN stocks_up_20dollar IS NOT NULL AND stocks_up_20dollar != 0 AND stocks_up_20dollar < 10000 THEN 
            CAST(stocks_up_20dollar AS INTEGER)
        ELSE stocks_up_4pct
    END,
    
    stocks_down_4pct = CASE 
        WHEN notes LIKE '%down4%=%' THEN 
            CAST(SUBSTR(notes, 
                INSTR(notes, 'down4%=') + 7,  
                COALESCE(NULLIF(INSTR(SUBSTR(notes, INSTR(notes, 'down4%=') + 7), ','), 0), 
                         LENGTH(SUBSTR(notes, INSTR(notes, 'down4%=') + 7))) - 1
            ) AS INTEGER)
        WHEN stocks_down_20dollar IS NOT NULL AND stocks_down_20dollar != 0 AND stocks_down_20dollar < 10000 THEN 
            CAST(stocks_down_20dollar AS INTEGER)
        ELSE stocks_down_4pct
    END,
    
    -- Set ratio fields from extracted values or from misplaced 20pct fields
    ratio_5day = CASE 
        WHEN notes LIKE '%ratio5d=%' THEN 
            CAST(SUBSTR(notes, 
                INSTR(notes, 'ratio5d=') + 8,  
                COALESCE(NULLIF(INSTR(SUBSTR(notes, INSTR(notes, 'ratio5d=') + 8), ','), 0), 
                         LENGTH(SUBSTR(notes, INSTR(notes, 'ratio5d=') + 8))) - 1
            ) AS REAL)
        WHEN stocks_up_20pct IS NOT NULL AND stocks_up_20pct < 100 AND stocks_up_20pct > 0 THEN 
            stocks_up_20pct
        ELSE ratio_5day
    END,
    
    ratio_10day = CASE 
        WHEN notes LIKE '%ratio10d=%' THEN 
            CAST(SUBSTR(notes, 
                INSTR(notes, 'ratio10d=') + 9,  
                COALESCE(NULLIF(INSTR(SUBSTR(notes, INSTR(notes, 'ratio10d=') + 9), ','), 0), 
                         LENGTH(SUBSTR(notes, INSTR(notes, 'ratio10d=') + 9))) - 1
            ) AS REAL)
        WHEN stocks_down_20pct IS NOT NULL AND stocks_down_20pct < 100 AND stocks_down_20pct > 0 THEN 
            stocks_down_20pct
        ELSE ratio_10day
    END,
    
    -- Clear the 20% and $20 fields for CSV imported data (these should be manual entry only)
    stocks_up_20pct = CASE 
        WHEN notes LIKE '%CSV:%' THEN NULL 
        ELSE stocks_up_20pct 
    END,
    stocks_down_20pct = CASE 
        WHEN notes LIKE '%CSV:%' THEN NULL 
        ELSE stocks_down_20pct 
    END,
    stocks_up_20dollar = CASE 
        WHEN notes LIKE '%CSV:%' THEN NULL 
        ELSE stocks_up_20dollar 
    END,
    stocks_down_20dollar = CASE 
        WHEN notes LIKE '%CSV:%' THEN NULL 
        ELSE stocks_down_20dollar 
    END,
    
    -- Update metadata
    updated_at = CURRENT_TIMESTAMP,
    notes = notes || ' [MIGRATED: Fixed field mappings on ' || DATE('now') || ']'

WHERE 
    -- Only update records that need fixing
    (notes LIKE '%CSV:%' OR 
     (stocks_up_4pct IS NULL AND stocks_up_20dollar IS NOT NULL) OR
     (stocks_down_4pct IS NULL AND stocks_down_20dollar IS NOT NULL) OR
     (ratio_5day IS NULL AND stocks_up_20pct IS NOT NULL AND stocks_up_20pct < 100) OR
     (ratio_10day IS NULL AND stocks_down_20pct IS NOT NULL AND stocks_down_20pct < 100))
    -- But skip the 2025-09-03 record which is already correct
    AND date != '2025-09-03';

-- Display migration results
SELECT 'MIGRATION COMPLETED - Updated ' || changes() || ' records' as result;

-- Validation queries
SELECT 'POST-MIGRATION VALIDATION:' as info;

SELECT 'Records with NULL up4%:' as check, COUNT(*) as count 
FROM market_breadth WHERE stocks_up_4pct IS NULL;

SELECT 'Records with NULL down4%:' as check, COUNT(*) as count 
FROM market_breadth WHERE stocks_down_4pct IS NULL;

SELECT 'Records with CSV notes now fixed:' as check, COUNT(*) as count 
FROM market_breadth WHERE notes LIKE '%CSV:%' AND stocks_up_4pct IS NOT NULL AND stocks_down_4pct IS NOT NULL;

-- Show sample of corrected records
SELECT 'SAMPLE CORRECTED RECORDS:' as info;
SELECT 
    date, 
    stocks_up_4pct, 
    stocks_down_4pct, 
    stocks_up_20pct, 
    stocks_down_20pct, 
    stocks_up_20dollar, 
    ratio_5day, 
    ratio_10day,
    SUBSTR(notes, 1, 50) || '...' as notes_preview
FROM market_breadth 
WHERE notes LIKE '%MIGRATED%' 
ORDER BY date DESC 
LIMIT 5;

-- Final integrity check: Show any remaining problematic records
SELECT 'REMAINING ISSUES (should be empty):' as info;
SELECT 
    date,
    stocks_up_4pct,
    stocks_down_4pct,
    stocks_up_20pct,
    stocks_down_20pct,
    ratio_5day,
    ratio_10day
FROM market_breadth 
WHERE 
    -- Look for records that still have issues
    (notes LIKE '%CSV:%' AND (stocks_up_4pct IS NULL OR stocks_down_4pct IS NULL))
    OR (stocks_up_20pct IS NOT NULL AND stocks_up_20pct < 100 AND ratio_5day IS NULL)
    OR (stocks_down_20pct IS NOT NULL AND stocks_down_20pct < 100 AND ratio_10day IS NULL)
ORDER BY date DESC;

COMMIT;

-- Clean up temporary view
DROP VIEW migration_preview;