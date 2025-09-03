#!/usr/bin/env python3
"""
Data Quality Report Generator for Market Breadth Database
"""

import sqlite3
from datetime import datetime
from pathlib import Path

def generate_data_quality_report(db_path: str):
    """Generate comprehensive data quality report"""
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("="*80)
    print("BIDBACK TRADING TOOL - DATA QUALITY REPORT")
    print("="*80)
    print(f"Report generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Database: {db_path}")
    
    # Basic statistics
    print("\n1. BASIC STATISTICS")
    print("-" * 40)
    
    cursor.execute("SELECT COUNT(*) FROM market_breadth_daily")
    total_records = cursor.fetchone()[0]
    print(f"Total records: {total_records:,}")
    
    cursor.execute("SELECT MIN(date), MAX(date) FROM market_breadth_daily")
    date_range = cursor.fetchone()
    print(f"Date range: {date_range[0]} to {date_range[1]}")
    
    cursor.execute("SELECT COUNT(DISTINCT substr(date, 1, 4)) FROM market_breadth_daily")
    years_covered = cursor.fetchone()[0]
    print(f"Years covered: {years_covered}")
    
    # Data completeness by field
    print("\n2. DATA COMPLETENESS BY FIELD")
    print("-" * 40)
    
    fields_to_check = [
        ('stocks_up_4pct_daily', 'Stocks Up 4% Daily'),
        ('stocks_down_4pct_daily', 'Stocks Down 4% Daily'),
        ('ratio_5day', '5-Day Ratio'),
        ('ratio_10day', '10-Day Ratio'),
        ('stocks_up_25pct_quarterly', 'Stocks Up 25% Quarterly'),
        ('stocks_down_25pct_quarterly', 'Stocks Down 25% Quarterly'),
        ('stocks_up_25pct_monthly', 'Stocks Up 25% Monthly'),
        ('stocks_down_25pct_monthly', 'Stocks Down 25% Monthly'),
        ('stocks_up_50pct_monthly', 'Stocks Up 50% Monthly'),
        ('stocks_down_50pct_monthly', 'Stocks Down 50% Monthly'),
        ('t2108', 'T2108 (Breadth Indicator)'),
        ('sp_reference', 'S&P Reference Price'),
        ('daily_high', 'Daily High'),
        ('daily_low', 'Daily Low'),
        ('true_range', 'True Range'),
        ('average_true_range_14', 'ATR (14-day)')
    ]
    
    for field, description in fields_to_check:
        cursor.execute(f"SELECT COUNT(CASE WHEN {field} IS NOT NULL THEN 1 END) as count, COUNT(*) as total FROM market_breadth_daily")
        result = cursor.fetchone()
        count = result[0] or 0
        total = result[1] or 1
        completeness = (count / total) * 100.0 if total > 0 else 0.0
        print(f"{description:<30}: {completeness:6.1f}% ({count:,} records)")
    
    # Data by year
    print("\n3. DATA COMPLETENESS BY YEAR")
    print("-" * 40)
    
    cursor.execute("""
        SELECT 
            substr(date, 1, 4) as year,
            COUNT(*) as total_records,
            COUNT(stocks_up_4pct_daily) as has_breadth_data,
            COUNT(t2108) as has_t2108,
            COUNT(sp_reference) as has_sp_ref,
            COUNT(true_range) as has_true_range
        FROM market_breadth_daily 
        GROUP BY substr(date, 1, 4)
        ORDER BY year
    """)
    
    print("Year | Total | Breadth | T2108 | S&P Ref | True Range")
    print("-----|-------|---------|-------|---------|----------")
    
    for row in cursor.fetchall():
        year, total, breadth, t2108, sp_ref, tr = row
        breadth_pct = (breadth / total * 100) if total > 0 else 0
        t2108_pct = (t2108 / total * 100) if total > 0 else 0
        sp_pct = (sp_ref / total * 100) if total > 0 else 0
        tr_pct = (tr / total * 100) if total > 0 else 0
        
        print(f"{year} | {total:5d} | {breadth_pct:6.1f}% | {t2108_pct:5.1f}% | {sp_pct:6.1f}% | {tr_pct:8.1f}%")
    
    # Recent data sample
    print("\n4. RECENT DATA SAMPLE (Last 10 Records)")
    print("-" * 40)
    
    cursor.execute("""
        SELECT date, stocks_up_4pct_daily, stocks_down_4pct_daily, 
               ratio_5day, t2108, sp_reference, true_range
        FROM market_breadth_daily 
        WHERE stocks_up_4pct_daily IS NOT NULL
        ORDER BY date DESC 
        LIMIT 10
    """)
    
    print("Date       | Up 4% | Down 4% | 5D Ratio | T2108 | S&P Ref | True Range")
    print("-----------|-------|---------|----------|-------|---------|----------")
    
    for row in cursor.fetchall():
        date, up_4, down_4, ratio_5, t2108, sp_ref, tr = row
        print(f"{date} | {up_4 or 'N/A':5} | {down_4 or 'N/A':7} | {ratio_5 or 'N/A':8} | {t2108 or 'N/A':5} | {sp_ref or 'N/A':7} | {tr or 'N/A':10}")
    
    # Data quality issues
    print("\n5. DATA QUALITY ISSUES")
    print("-" * 40)
    
    # Check for missing dates in ranges
    cursor.execute("""
        SELECT COUNT(*) FROM market_breadth_daily 
        WHERE date IS NULL OR date = ''
    """)
    null_dates = cursor.fetchone()[0]
    print(f"Records with null/empty dates: {null_dates}")
    
    # Check for duplicate dates
    cursor.execute("""
        SELECT date, COUNT(*) as count 
        FROM market_breadth_daily 
        GROUP BY date 
        HAVING COUNT(*) > 1
    """)
    duplicates = cursor.fetchall()
    print(f"Duplicate dates found: {len(duplicates)}")
    if duplicates:
        print("  Duplicate dates:")
        for date, count in duplicates[:10]:  # Show first 10
            print(f"    {date}: {count} occurrences")
    
    # Check for extreme values
    cursor.execute("SELECT MAX(stocks_up_4pct_daily), MAX(stocks_down_4pct_daily) FROM market_breadth_daily")
    max_values = cursor.fetchone()
    print(f"Maximum values - Up 4%: {max_values[0]}, Down 4%: {max_values[1]}")
    
    cursor.execute("SELECT MAX(t2108), MIN(t2108) FROM market_breadth_daily WHERE t2108 IS NOT NULL")
    t2108_range = cursor.fetchone()
    print(f"T2108 range: {t2108_range[1]:.2f} to {t2108_range[0]:.2f}")
    
    # Data source breakdown
    print("\n6. DATA SOURCE BREAKDOWN")
    print("-" * 40)
    
    cursor.execute("""
        SELECT data_source, COUNT(*) as count, 
               COUNT(*) * 100.0 / (SELECT COUNT(*) FROM market_breadth_daily) as percentage
        FROM market_breadth_daily 
        GROUP BY data_source
        ORDER BY count DESC
    """)
    
    for row in cursor.fetchall():
        source, count, pct = row
        print(f"{source or 'Unknown'}: {count:,} records ({pct:.1f}%)")
    
    # True Range and ATR statistics
    print("\n7. VOLATILITY METRICS (TRUE RANGE & ATR)")
    print("-" * 40)
    
    cursor.execute("""
        SELECT 
            COUNT(true_range) as tr_count,
            AVG(true_range) as avg_tr,
            MIN(true_range) as min_tr,
            MAX(true_range) as max_tr,
            COUNT(average_true_range_14) as atr_count,
            AVG(average_true_range_14) as avg_atr
        FROM market_breadth_daily 
        WHERE true_range IS NOT NULL
    """)
    
    tr_stats = cursor.fetchone()
    if tr_stats[0] > 0:
        print(f"True Range records: {tr_stats[0]:,}")
        print(f"Average True Range: {tr_stats[1]:.4f}")
        print(f"True Range range: {tr_stats[2]:.4f} to {tr_stats[3]:.4f}")
        print(f"ATR-14 records: {tr_stats[4]:,}")
        if tr_stats[5]:
            print(f"Average ATR-14: {tr_stats[5]:.4f}")
    else:
        print("No True Range data available")
    
    print("\n" + "="*80)
    print("REPORT COMPLETE")
    print("="*80)
    
    conn.close()

if __name__ == "__main__":
    db_path = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/backend/src/database/trading.db"
    generate_data_quality_report(db_path)