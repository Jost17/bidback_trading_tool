# Database Architecture - Market Breadth Raw Data Schema v2.0

## Overview
The Market Breadth Raw Data Schema v2.0 is designed for maximum flexibility and algorithm independence by storing **ONLY raw input data** and performing all calculations at runtime.

## Schema Philosophy

### ✅ WHAT WE STORE (Raw Input Data Only)
- Primary breadth indicators from market data sources
- Secondary breadth indicators for comprehensive analysis  
- Reference data (T2108, S&P 500 levels, universe size)
- Sector performance data (11 sectors)
- Data provenance and quality metrics
- Legacy compatibility fields for migration

### ❌ WHAT WE DON'T STORE (Calculated Fields)
- Breadth scores (calculated at runtime)
- 5-day or 10-day ratios (calculated from historical data)
- Trend strength indicators (derived from raw data)
- Market phase classifications (determined algorithmically)

## Primary Table: market_breadth_raw_data

### Core Structure
```sql
CREATE TABLE market_breadth_raw_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,           -- YYYY-MM-DD format
    timestamp TEXT NOT NULL,             -- ISO timestamp
    
    -- Raw Data Fields (18+ indicators)
    -- ... see full schema file for complete structure
);
```

## Data Categories

### 1. Primary Breadth Indicators
| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `stocks_up_4pct_daily` | INTEGER | Stocks up 4%+ today | Stockbee CSV |
| `stocks_down_4pct_daily` | INTEGER | Stocks down 4%+ today | Stockbee CSV |
| `stocks_up_25pct_quarterly` | INTEGER | Stocks up 25%+ in quarter | Stockbee CSV |
| `stocks_down_25pct_quarterly` | INTEGER | Stocks down 25%+ in quarter | Stockbee CSV |

### 2. Secondary Breadth Indicators
| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `stocks_up_25pct_monthly` | INTEGER | Stocks up 25%+ in month | Stockbee CSV |
| `stocks_down_25pct_monthly` | INTEGER | Stocks down 25%+ in month | Stockbee CSV |
| `stocks_up_50pct_monthly` | INTEGER | Stocks up 50%+ in month | Stockbee CSV |
| `stocks_down_50pct_monthly` | INTEGER | Stocks down 50%+ in month | Stockbee CSV |
| `stocks_up_13pct_34days` | INTEGER | Stocks up 13%+ in 34 days | Stockbee CSV |
| `stocks_down_13pct_34days` | INTEGER | Stocks down 13%+ in 34 days | Stockbee CSV |

### 3. Reference Data
| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `worden_universe` | INTEGER | Total stocks tracked | Worden Bros |
| `t2108` | REAL | % stocks above 40-day MA | T2108 Indicator |
| `sp500_level` | TEXT | S&P 500 level ("6,000.36") | Market Data |

### 4. Legacy Compatibility Fields
| Field | Type | Description | Migration Source |
|-------|------|-------------|------------------|
| `advancing_issues` | INTEGER | Daily advancing issues | Legacy market_breadth |
| `declining_issues` | INTEGER | Daily declining issues | Legacy market_breadth |
| `new_highs` | INTEGER | New 52-week highs | Legacy market_breadth |
| `new_lows` | INTEGER | New 52-week lows | Legacy market_breadth |
| `up_volume` | REAL | Up volume | Legacy market_breadth |
| `down_volume` | REAL | Down volume | Legacy market_breadth |

### 5. Sector Data (11 GICS Sectors)
All stored as REAL values representing sector performance metrics:
- `basic_materials_sector`
- `consumer_cyclical_sector`
- `financial_services_sector`
- `real_estate_sector`
- `consumer_defensive_sector`
- `healthcare_sector`
- `utilities_sector`
- `communication_services_sector`
- `energy_sector`
- `industrials_sector`
- `technology_sector`

### 6. Metadata & Tracking
| Field | Type | Description | Purpose |
|-------|------|-------------|---------|
| `source_file` | TEXT | Original CSV filename | Data provenance |
| `import_format` | TEXT | Data format version | Format tracking |
| `data_quality_score` | REAL | Quality score (0-100) | Data validation |
| `notes` | TEXT | User notes | Manual annotations |

## Performance Optimizations

### Indexes
```sql
-- Primary date queries (most common)
CREATE INDEX idx_breadth_raw_date ON market_breadth_raw_data(date DESC);

-- Range queries for ratio calculations
CREATE INDEX idx_breadth_raw_date_range ON market_breadth_raw_data(
    date, stocks_up_4pct_daily, stocks_down_4pct_daily
);

-- Data quality monitoring
CREATE INDEX idx_breadth_raw_quality ON market_breadth_raw_data(
    data_quality_score, created_at
);

-- Import tracking
CREATE INDEX idx_breadth_raw_source ON market_breadth_raw_data(
    source_file, import_format
);
```

### SQLite Optimization Settings
```sql
PRAGMA journal_mode = WAL;          -- Better concurrent access
PRAGMA cache_size = 32000;          -- 32MB cache
PRAGMA synchronous = NORMAL;        -- Balance safety/performance
PRAGMA mmap_size = 268435456;       -- 256MB memory mapped
PRAGMA page_size = 4096;           -- Optimal page size
```

## Data Sources & Import Formats

### Stockbee Market Monitor CSV Format
**CSV Header Mapping:**
```
Date,Number of stocks up 4% plus today,Number of stocks down 4% plus today,
5 day ratio,10 day ratio,Number of stocks up 25% plus in a quarter,
Number of stocks down 25% + in a quarter,Number of stocks up 25% + in a month,
Number of stocks down 25% + in a month,Number of stocks up 50% + in a month,
Number of stocks down 50% + in a month,Number of stocks up 13% + in 34 days,
Number of stocks down 13% + in 34 days,Worden Common stock universe,T2108,S&P
```

**Important Notes:**
- "5 day ratio" and "10 day ratio" are NOT stored (calculated at runtime)
- S&P 500 values stored as TEXT due to comma formatting
- T2108 stored as percentage (0-100)

### Historical Data Coverage
- **Date Range**: 2007-2025 (18+ years)
- **Record Count**: ~4,500+ trading days
- **Data Sources**: Stockbee Market Monitor, Worden Bros, manual entry
- **Update Frequency**: Daily (trading days only)

## Runtime Calculations

### 6-Factor Breadth Score Algorithm
All calculations performed at runtime using raw data:

1. **Advance/Decline Ratio** (25 points)
   ```typescript
   const advanceDeclineRatio = totalIssues > 0 ? advancingIssues / totalIssues : 0.5
   const score1 = advanceDeclineRatio * 25
   ```

2. **New High/Low Ratio** (20 points)
   ```typescript
   const newHighLowRatio = totalNewHighLow > 0 ? newHighs / totalNewHighLow : 0.5
   const score2 = newHighLowRatio * 20
   ```

3. **Up/Down Volume Ratio** (20 points)
4. **4% Movers Ratio** (15 points)
5. **T2108 Indicator** (10 points)
6. **5-Day Momentum** (10 points)

### Dynamic Ratio Calculations
```typescript
// 5-day ratio calculated from 5 days of raw data
const calculate5DayRatio = (currentDate: string) => {
  const historicalData = getPrevious4Days(currentDate)
  const totalUp = sum(historicalData.map(d => d.stocks_up_4pct_daily))
  const totalDown = sum(historicalData.map(d => d.stocks_down_4pct_daily))
  return totalDown > 0 ? totalUp / totalDown : null
}
```

## Migration from Legacy Schema

### Migration Process
1. **Backup** existing market_breadth table
2. **Create** new market_breadth_raw_data table
3. **Migrate** compatible fields from legacy table
4. **Rename** old table to market_breadth_legacy
5. **Import** historical CSV data for extended indicators
6. **Validate** data integrity and completeness

### Data Mapping
| Legacy Field | Raw Data Field | Transformation |
|--------------|----------------|----------------|
| `advancing_issues` | `advancing_issues` | Direct copy |
| `declining_issues` | `declining_issues` | Direct copy |
| `breadth_score` | ❌ Removed | Calculate at runtime |
| `ratio_5day` | ❌ Removed | Calculate from historical data |
| `market_phase` | ❌ Removed | Derive from breadth score |

## Data Quality Assurance

### Quality Metrics
- **Completeness Score**: % of expected fields populated
- **Consistency Score**: Data validation against business rules
- **Timeliness Score**: How current the data is
- **Accuracy Score**: Cross-validation against known sources

### Validation Rules
```sql
-- Ensure basic data integrity
CONSTRAINT valid_daily_data CHECK (
    (stocks_up_4pct_daily IS NOT NULL OR advancing_issues IS NOT NULL) AND
    (stocks_down_4pct_daily IS NOT NULL OR declining_issues IS NOT NULL)
)

-- Ensure percentage values are in valid range
CHECK(t2108 >= 0 AND t2108 <= 100)

-- Ensure count values are non-negative
CHECK(stocks_up_4pct_daily >= 0)
```

## API Integration Points

### Service Layer Methods
```typescript
// Raw data operations
saveRawBreadthData(data: RawMarketBreadthData): Promise<number>
getRawBreadthByDate(date: string): RawMarketBreadthData | null
importFromCSV(csvData: string, format: string): Promise<CSVImportResult>

// Runtime calculations
calculate5DayRatio(date: string): number | null
calculate10DayRatio(date: string): number | null
calculateEnhanced6FactorScore(data: RawMarketBreadthData): BreadthCalculation

// Chart data with calculations
getChartData(startDate: string, endDate: string): Promise<ChartDataPoint[]>
```

## Future Enhancements

### Planned Features
- **Sector Rotation Analysis**: Using 11-sector raw data
- **Custom Breadth Algorithms**: User-defined calculation formulas
- **Real-time Updates**: Live market data integration
- **Advanced Analytics**: Machine learning on raw data patterns
- **Multi-timeframe Analysis**: Weekly/monthly aggregations

### Scalability Considerations
- **Horizontal Partitioning**: By date ranges for very large datasets
- **Read Replicas**: For analytics workloads
- **Archival Strategy**: Cold storage for data older than 5 years
- **API Rate Limiting**: For high-frequency calculation requests

---

**Schema Version**: v2.0  
**Last Updated**: 2025-08-25  
**Migration Status**: Ready for Production  
**Data Coverage**: 2007-2025 (18+ years)  
**Performance**: Optimized for 4,500+ records with sub-second queries