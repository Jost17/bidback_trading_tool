# CSV Historical Data Integration Guide

## Overview
The BIDBACK Trading Tool includes historical market breadth data from 2007-2025 in CSV format. Due to file size constraints, these files are not included in the main repository but can be integrated using several methods.

## Data Files
- **Location**: `source/csv/`
- **Files**: 2007.csv through 2025.csv
- **Content**: Daily market breadth data including:
  - Advancing/Declining Issues
  - New Highs/Lows
  - Up/Down Volume
  - S&P 500 values
  - Additional market indicators

## Integration Methods

### Method 1: Git LFS (Recommended for Development)
```bash
# Install Git LFS
brew install git-lfs  # macOS
# or
sudo apt-get install git-lfs  # Linux

# Initialize LFS in repository
git lfs install
git lfs track "source/csv/*.csv"
git lfs track "source/*.xlsb"
git add .gitattributes
git add source/csv/*.csv
git commit -m "feat: Add historical market data via LFS"
git push
```

### Method 2: Auto-Import on First Launch
The application will automatically import CSV data on first launch:

1. App checks if market_breadth table has data
2. If empty, scans `source/csv/` directory
3. Imports each CSV file with progress indication
4. Stores data in SQLite database

Implementation in `src/database/services/breadth-service.ts`:
```typescript
async importHistoricalData() {
  const csvDir = path.join(process.cwd(), 'source/csv')
  const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'))
  
  for (const file of files) {
    const csvData = fs.readFileSync(path.join(csvDir, file), 'utf-8')
    await this.importFromCSV(csvData)
  }
}
```

### Method 3: Pre-populated SQLite Database
Convert all CSV data to SQLite format once and distribute the `.db` file:

```bash
# Use the import script
node scripts/import-all-csv.js

# This creates trading.db with all historical data
# Compress for distribution
tar -czf trading-data.tar.gz trading.db
```

### Method 4: Download from GitHub Releases
1. Create a GitHub Release
2. Upload `market-data-2007-2025.zip` as release asset
3. App downloads on first launch if needed

## CSV File Format
```csv
Date,AdvancingIssues,DecliningIssues,NewHighs,NewLows,UpVolume,DownVolume,SP500
2024-01-02,2100,900,150,25,15.5,7.2,4800.50
```

## Import Process
The BreadthService class handles CSV imports with:
- Duplicate detection
- Data validation
- Error handling
- Progress reporting

## Storage Optimization
After import, the CSV files can be removed as all data is stored in SQLite:
- Original CSV files: ~50MB total
- SQLite database: ~5-10MB (compressed)
- Query performance: Much faster than CSV parsing

## Testing Import
```bash
# Test single file import
npm run test:import -- --file=source/csv/2024.csv

# Test full import
npm run import:historical

# Verify data
npm run db:stats
```

## Notes
- The Excel file `source/TJS_Elite_2020.xlsb` contains trade journaling templates
- It's not required for the app to function but provides reference formulas
- Can be opened separately in Excel for manual analysis

## Future Enhancements
- [ ] Automated daily data updates from API
- [ ] Incremental imports (only new data)
- [ ] Data export functionality
- [ ] Cloud backup integration