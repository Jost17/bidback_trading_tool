# Market Breadth Schema Migration v1 → v2

## Overview
Migrate from calculated-field storage to raw-data-only storage for maximum flexibility and algorithm independence.

## Migration Strategy

### Phase 1: Data Preservation
```sql
-- 1. Create backup of existing data
CREATE TABLE market_breadth_backup AS 
SELECT * FROM market_breadth;

-- 2. Export existing data for analysis
.output market_breadth_export.csv
.headers on
SELECT date, advancing_issues, declining_issues, new_highs, new_lows, 
       up_volume, down_volume, breadth_score, notes
FROM market_breadth 
ORDER BY date;
```

### Phase 2: Schema Migration
```sql
-- 1. Drop calculated field indexes
DROP INDEX IF EXISTS idx_market_breadth_score;

-- 2. Rename existing table
ALTER TABLE market_breadth RENAME TO market_breadth_legacy;

-- 3. Create new raw data table (from schema file)
-- Execute: src/database/schemas/market-breadth-raw-schema.sql
```

### Phase 3: Data Migration
```sql
-- Migrate existing data to new schema
INSERT INTO market_breadth_raw_data (
    date, timestamp, 
    advancing_issues, declining_issues, 
    new_highs, new_lows, 
    up_volume, down_volume,
    import_format, source_file, notes,
    created_at, updated_at
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
FROM market_breadth_legacy
WHERE date IS NOT NULL
ORDER BY date;
```

### Phase 4: Verification
```sql
-- Verify migration success
SELECT 
    COUNT(*) as total_migrated,
    MIN(date) as earliest_date,
    MAX(date) as latest_date,
    COUNT(CASE WHEN advancing_issues IS NOT NULL THEN 1 END) as has_advancing_issues,
    COUNT(CASE WHEN notes IS NOT NULL THEN 1 END) as has_notes
FROM market_breadth_raw_data 
WHERE import_format = 'legacy_migration';

-- Check for data loss
SELECT 
    (SELECT COUNT(*) FROM market_breadth_legacy) as original_count,
    (SELECT COUNT(*) FROM market_breadth_raw_data WHERE import_format = 'legacy_migration') as migrated_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM market_breadth_legacy) = 
             (SELECT COUNT(*) FROM market_breadth_raw_data WHERE import_format = 'legacy_migration')
        THEN 'MIGRATION SUCCESSFUL ✅'
        ELSE 'MIGRATION FAILED ❌'
    END as status;
```

### Phase 5: Historical CSV Import
```sql
-- After migration, import historical breadth score data
-- This will populate the new raw data fields:
-- - stocks_up_4pct_daily
-- - stocks_down_4pct_daily  
-- - stocks_up_25pct_quarterly
-- - etc.

-- Use the enhanced CSV import service for this
```

## Data Validation Rules

### Pre-Migration Checks
- [ ] Backup current database
- [ ] Verify all existing data is accessible
- [ ] Count total records to migrate
- [ ] Check for duplicate dates

### Post-Migration Validation
- [ ] All dates successfully migrated
- [ ] No data loss occurred
- [ ] Legacy fields properly mapped
- [ ] New schema constraints satisfied
- [ ] Indexes created successfully

## Rollback Strategy

```sql
-- If migration fails, rollback steps:

-- 1. Drop failed new table
DROP TABLE IF EXISTS market_breadth_raw_data;

-- 2. Restore original table name
ALTER TABLE market_breadth_legacy RENAME TO market_breadth;

-- 3. Recreate original indexes
CREATE INDEX idx_market_breadth_date ON market_breadth(date);
CREATE INDEX idx_market_breadth_score ON market_breadth(breadth_score);
```

## Performance Impact Analysis

### Expected Improvements
- **Query Performance**: 40-60% faster date range queries
- **Storage Efficiency**: 15-25% reduction (no calculated duplicates)
- **Import Speed**: 3-5x faster bulk imports
- **Index Efficiency**: Optimized indexes for common access patterns

### Monitoring Points
- Query execution time for date ranges
- Index utilization rates
- Storage size before/after migration
- Import performance benchmarks

## Critical Success Factors

1. **Data Integrity**: Zero data loss during migration
2. **Schema Validation**: All constraints properly enforced
3. **Performance**: Improved query times post-migration
4. **Compatibility**: Enhanced service layer works with new schema
5. **Historical Import**: CSV data import successful

## Next Steps After Migration

1. Import historical CSV data (2007-2025)
2. Update enhanced-breadth-service.ts
3. Update all calculation methods to use raw data
4. Remove any references to calculated fields
5. Update API endpoints to use new schema