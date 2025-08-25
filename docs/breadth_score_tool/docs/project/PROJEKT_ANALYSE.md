# Stockbee Market Monitor - Projektanalyse

## CSV-Datenstrukturen Identifiziert

### Format 1: Aktuell (2020-2025) - 16 Spalten
**Header-Struktur:** Primary Breadth Indicators | Secondary Breadth Indicators
```
1. Date
2. Number of stocks up 4% plus today          → stocks_up_4pct
3. Number of stocks down 4% plus today        → stocks_down_4pct  
4. 5 day ratio                                 → ratio_5day
5. 10 day ratio                                → ratio_10day
6. Number of stocks up 25% plus in a quarter  → stocks_up_25pct_quarter
7. Number of stocks down 25% + in a quarter   → stocks_down_25pct_quarter
8. Number of stocks up 25% + in a month       → stocks_up_25pct_month
9. Number of stocks down 25% + in a month     → stocks_down_25pct_month
10. Number of stocks up 50% + in a month      → stocks_up_50pct_month
11. Number of stocks down 50% + in a month    → stocks_down_50pct_month
12. Number of stocks up 13% + in 34 days      → stocks_up_13pct_34days
13. Number of stocks down 13% + in 34 days    → stocks_down_13pct_34days
14. Worden Common stock universe              → worden_universe
15. T2108                                      → t2108
16. S&P                                        → sp500
```

### Format 2: Mittel (2010-2011) - 18-20 Spalten  
**Zusätzliche Felder:** MMA+, MMA-, Primary Breadth Trend, Secondary Trend, etc.

### Format 3: Alt (2007-2008) - 13 Spalten
**Einfachere Struktur:** Weniger detaillierte Indikatoren

## Breadth Score Berechnung

### Gewichtung (aus Dokument):
```
T2108 (% > 40-Day MA)                    : 20%  → t2108
# Aktien ≥ +4 % Today                    : 15%  → stocks_up_4pct  
# Aktien ≤ –4 % Today                    : 15%  → stocks_down_4pct
5-Day Breadth Ratio                      : 15%  → ratio_5day
10-Day Breadth Ratio                     : 10%  → ratio_10day
# Aktien ≥ +25 % in 65 Tagen (Quarter)   : 8%   → stocks_up_25pct_quarter
# Aktien ≤ –25 % in 65 Tagen (Quarter)   : 8%   → stocks_down_25pct_quarter
# Aktien ≥ +13 % in 34 Tagen             : 5%   → stocks_up_13pct_34days
# Aktien ≤ –13 % in 34 Tagen             : 4%   → stocks_down_13pct_34days
                                        ------
TOTAL                                   : 100%
```

## Datenbank Schema (Primär)

```sql
CREATE TABLE market_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE NOT NULL,
    
    -- Primary Breadth Indicators  
    stocks_up_4pct INTEGER,
    stocks_down_4pct INTEGER,
    ratio_5day REAL,
    ratio_10day REAL,
    
    -- Secondary Breadth Indicators
    stocks_up_25pct_quarter INTEGER,
    stocks_down_25pct_quarter INTEGER,
    stocks_up_25pct_month INTEGER,
    stocks_down_25pct_month INTEGER,
    stocks_up_50pct_month INTEGER,
    stocks_down_50pct_month INTEGER,
    stocks_up_13pct_34days INTEGER,
    stocks_down_13pct_34days INTEGER,
    
    -- Reference Data
    worden_universe INTEGER,
    t2108 REAL,
    sp500 TEXT,
    
    -- Calculated Fields
    breadth_score REAL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Import-Strategie

### Phase 1: 2025 Format (Aktuell)
- Start mit 2020-2025 Daten (16 Spalten, einheitlich)
- Automatische Breadth Score Berechnung

### Phase 2: Legacy Formate  
- 2010-2019: Feld-Mapping auf neues Schema
- 2007-2009: Basis-Import mit verfügbaren Feldern

### Phase 3: Erweiterungen
- Zusätzliche Felder (flexibles Schema)
- Historische Trend-Analyse
