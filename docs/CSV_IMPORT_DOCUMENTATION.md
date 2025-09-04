# CSV Import Format Documentation
## Market Breadth System - Stockbee CSV Integration

### Overview
The Market Breadth system supports CSV import of market breadth data in the Stockbee format. This document details the CSV format specifications, field mapping hierarchy, and troubleshooting procedures implemented during the Phase 1-2 system repairs (2025-09-04).

## CSV Format Specifications

### Expected Stockbee CSV Format
The system expects CSV files with the following structure:
```csv
Date,Up25Quarter,Down25Quarter,Up4Pct,Down4Pct,Up25Month,Down25Month,Up50Month,Down50Month,T2108,VIX,Additional_Fields...
2025-09-03,1250,580,1180,620,890,420,85000000,45000000,45.2,18.5,...
```

### Field Mapping Hierarchy (Phase 1 Fix)
The system implements a **hierarchical field mapping** strategy for robust data import:

#### Priority Order:
1. **Quarterly Data** (Primary) - `up25quarter`, `down25quarter`
2. **4% Data** (Fallback) - `up4pct`, `down4pct`  
3. **Default Values** (Safety) - `0` if neither available

#### Implementation in breadth-service.ts (lines 631-632):
```typescript
// Legacy fields for compatibility - use quarterly data if available, fallback to 4pct data
advancingIssues: this.safeParseNumber(up25quarter) || this.safeParseNumber(up4pct) || 0,
decliningIssues: this.safeParseNumber(down25quarter) || this.safeParseNumber(down4pct) || 0,
```

### Complete Field Mapping Reference

| Database Field | CSV Primary | CSV Fallback | Scaling | Notes |
|---------------|-------------|--------------|---------|--------|
| `advancingIssues` | `up25quarter` | `up4pct` | 1:1 | Core breadth calculation |
| `decliningIssues` | `down25quarter` | `down4pct` | 1:1 | Core breadth calculation |
| `newHighs` | `up25month` | - | ÷10 | Monthly data scaled down |
| `newLows` | `down25month` | - | ÷10 | Monthly data scaled down |
| `upVolume` | `up50month` | - | 1:1 | Volume data |
| `downVolume` | `down50month` | - | 1:1 | Volume data |

### Extended Fields (Optional)
These fields are imported if available but gracefully handle missing data:
- **T2108**: NYSE % Above 40-day MA
- **VIX**: Volatility Index  
- **Percentage Fields**: `stocks_up_4_pct`, `stocks_down_4_pct`, etc.
- **Dollar Volume**: `dollar_volume_up_20`, `dollar_volume_down_20`

## Data Source Indicators (Phase 3 Fix)

### UI Label System
The DataEntryForm now correctly displays data source indicators:

#### Green "Database" Label
- Indicates data imported from CSV
- Pattern: Data parsed using csvFieldMap patterns
- Example: T2108 field showing green "Database" when value comes from CSV import

#### Gray "Notes" Label  
- Indicates manually entered data
- Pattern: Data entered through manual form input
- Example: Hand-typed values show gray "Notes" label

### Pattern Recognition Enhancement (DataEntryForm.tsx lines 188-199)
```typescript
// Enhanced patterns for all note formats
const patterns = [
  // New RECOVERED format: "RECOVERED: up4%=180, down4%=120, ..."
  new RegExp(`${key.replace('stocks_', '').replace('_pct', '').replace('_', '')}%?[=:]\\s*([^,\\n\\s]+)`, 'i'),
  
  // CSV format patterns from csvFieldMap
  ...(csvFieldMap[key] ? 
    csvFieldMap[key].map(csvKey => 
      new RegExp(`${csvKey}[%=:]\\s*([^,\\n\\s]+)`, 'i')
    ) : []
  ),
];
```

## Database Migration Results (Phase 2)

### Migration Statistics
- **Date**: 2025-09-04 19:03:49
- **Total Records**: 4,474
- **Successfully Migrated**: 4,313 records
- **Success Rate**: 96.4%
- **Failed Records**: 161 (mostly incomplete data)

### Migration Process
1. **Pre-Migration Backup**: `trading.db.backup.20250904_190349`
2. **Field Mapping Correction**: Applied new hierarchy logic
3. **Data Validation**: Verified calculation accuracy
4. **Migration Markers**: Added audit trail to `notes` field
5. **Rollback Preparation**: Created `rollback_migration.sql`

### Migration Tracking
All migrated records include a marker in the `notes` field:
```
[MIGRATED: Fixed field mappings on 2025-09-04]
```

## CSV Import Workflow

### 1. CSV File Validation
- **File Format**: UTF-8 encoded CSV
- **Headers**: First row must contain field names
- **Date Format**: YYYY-MM-DD (ISO format preferred)
- **Numeric Fields**: Integer or decimal, no thousand separators

### 2. Field Mapping Process
```
CSV Import → Field Recognition → Hierarchy Mapping → Database Storage
```

### 3. Data Processing Steps
1. **Parse CSV Headers**: Identify available columns
2. **Apply Field Mapping**: Use hierarchy (quarterly → 4% → default)
3. **Data Validation**: Check ranges and formats
4. **Calculate Breadth Score**: Apply 6-factor calculation
5. **Store with Metadata**: Include source tracking

## Error Handling & Troubleshooting

### Common Import Issues

#### 1. "Failed to calculate breadth score" (RESOLVED)
- **Cause**: Incorrect field mapping in older versions
- **Fix**: Phase 1 repair corrected mapping hierarchy
- **Validation**: Import and check for green "Database" labels

#### 2. Missing Data Fields
- **Symptom**: Some fields show zero values
- **Cause**: CSV missing expected columns
- **Solution**: Verify CSV format matches expected headers

#### 3. Date Format Issues
- **Symptom**: Import fails with date errors
- **Cause**: Non-ISO date format
- **Solution**: Ensure YYYY-MM-DD format in CSV

### Validation Procedures

#### Post-Import Validation
1. **Check Data Source Labels**: Verify green "Database" indicators
2. **Spot-Check Calculations**: Compare breadth scores with expected values
3. **Review Import Logs**: Check for any parsing warnings
4. **Test Form Functions**: Ensure manual entry still works

#### Data Quality Checks
1. **Advancing vs Declining**: Verify reasonable ratios
2. **Date Continuity**: Check for gaps in time series
3. **Value Ranges**: Ensure realistic market breadth values
4. **Breadth Score**: Validate 6-factor calculations

## Manual-Only Fields

### Fields That Cannot Be CSV Imported
These fields must be entered manually and will always show "Notes" labels:
- **VIX** (when not in CSV): Manual entry required
- **Custom Notes**: User commentary and observations
- **Adjusted Values**: Manual corrections to CSV data

### Fields With CSV + Manual Support
These fields can be imported from CSV or entered manually:
- **T2108**: Often available in Stockbee CSV
- **Percentage Fields**: May be calculated from CSV or entered manually
- **Volume Data**: Available in extended CSV formats

## Rollback Procedures

### Emergency Rollback (if needed)
If critical issues arise with migrated data:

```bash
# Stop the application first
# Restore from backup
cp trading.db.backup.20250904_190349 trading.db
# Restart application
```

### Partial Rollback Using SQL
For specific record rollback, use `/rollback_migration.sql`:
```sql
-- Remove migration markers
UPDATE market_breadth 
SET notes = REPLACE(notes, ' [MIGRATED: Fixed field mappings on 2025-09-04]', '')
WHERE notes LIKE '%MIGRATED%';
```

## Future Enhancements

### Planned Improvements
1. **Additional CSV Formats**: Support for other data providers
2. **Real-time Validation**: Immediate feedback during CSV upload
3. **Batch Processing**: Improved handling of large CSV files
4. **Data Quality Metrics**: Automated validation scoring

### Monitoring Recommendations
1. **Regular Validation**: Monthly spot-checks of imported data
2. **Performance Monitoring**: Track import speeds and error rates
3. **User Feedback**: Monitor for reports of calculation issues
4. **Backup Strategy**: Maintain regular database backups

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-04  
**Related Repairs**: Phase 1-3 Market Breadth System Fixes  
**Contact**: System Administrator