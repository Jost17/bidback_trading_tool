#!/usr/bin/env python3
"""Run SQL Analysis on Trading Database"""

import sqlite3
import os

def run_sql_analysis():
    db_path = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/trading.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at: {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("=" * 80)
        print("BIDBACK TRADING TOOL - SQL ANALYSIS RESULTS")
        print("=" * 80)
        
        # 1. Check table schema
        print("\n1. TABLE SCHEMA:")
        print("-" * 40)
        cursor.execute("PRAGMA table_info(market_breadth)")
        columns = cursor.fetchall()
        if columns:
            for col in columns:
                print(f"  {col[1]:25} | {col[2]:10} | NotNull: {col[3]} | Default: {col[4] or 'None'}")
        else:
            print("  ❌ market_breadth table not found!")
            return
        
        # 2. Count total records
        print("\n2. RECORD COUNT:")
        print("-" * 40)
        cursor.execute("SELECT COUNT(*) FROM market_breadth")
        count = cursor.fetchone()[0]
        print(f"  Total Records: {count}")
        
        if count == 0:
            print("  ⚠️  No records found in database!")
            return
        
        # 3. Recent records analysis
        print("\n3. RECENT RECORDS ANALYSIS:")
        print("-" * 40)
        cursor.execute("""
            SELECT id, date, t2108, sp500, stocks_up_4pct, stocks_down_4pct, 
                   worden_universe, ratio_5day, ratio_10day, 
                   SUBSTR(notes, 1, 100) as notes_preview
            FROM market_breadth 
            ORDER BY date DESC 
            LIMIT 5
        """)
        records = cursor.fetchall()
        
        for i, record in enumerate(records):
            print(f"\n  Record {i+1} - {record[1]} (ID: {record[0]}):")
            print(f"    T2108: {record[2]}")
            print(f"    S&P 500: '{record[3]}'")
            print(f"    Stocks Up 4%: {record[4]}")
            print(f"    Stocks Down 4%: {record[5]}")
            print(f"    Worden Universe: {record[6]}")
            print(f"    5D Ratio: {record[7]}")
            print(f"    10D Ratio: {record[8]}")
            print(f"    Notes Preview: '{record[9]}'")
        
        # 4. Problematic S&P 500 values
        print("\n4. PROBLEMATIC S&P 500 VALUES:")
        print("-" * 40)
        cursor.execute("""
            SELECT date, sp500, notes
            FROM market_breadth 
            WHERE sp500 = '6' OR sp500 = '6.0'
            ORDER BY date DESC
        """)
        sp_problems = cursor.fetchall()
        
        if sp_problems:
            for record in sp_problems:
                print(f"  📅 {record[0]}: S&P='{record[1]}' | Notes: '{record[2]}'")
        else:
            print("  ✅ No problematic S&P 500 values found")
        
        # 5. Default Worden Universe values
        print("\n5. DEFAULT WORDEN UNIVERSE VALUES:")
        print("-" * 40)
        cursor.execute("""
            SELECT date, worden_universe, notes
            FROM market_breadth 
            WHERE worden_universe = 7000
            ORDER BY date DESC
            LIMIT 3
        """)
        worden_defaults = cursor.fetchall()
        
        if worden_defaults:
            for record in worden_defaults:
                print(f"  📅 {record[0]}: Worden={record[1]} (default) | Notes: '{record[2][:50]}...'")
        else:
            print("  ✅ No default Worden Universe values found")
        
        # 6. Empty critical fields
        print("\n6. EMPTY CRITICAL FIELDS:")
        print("-" * 40)
        cursor.execute("""
            SELECT date, stocks_up_4pct, stocks_down_4pct, notes
            FROM market_breadth 
            WHERE stocks_up_4pct IS NULL OR stocks_down_4pct IS NULL
            ORDER BY date DESC
            LIMIT 3
        """)
        empty_fields = cursor.fetchall()
        
        if empty_fields:
            for record in empty_fields:
                print(f"  📅 {record[0]}: Up4%={record[1]} | Down4%={record[2]} | Notes: '{record[3][:50]}...'")
        else:
            print("  ✅ No empty critical fields found")
        
        # 7. Notes patterns analysis
        print("\n7. NOTES PATTERNS ANALYSIS:")
        print("-" * 40)
        cursor.execute("""
            SELECT date, data_source, LENGTH(notes) as notes_length, notes
            FROM market_breadth 
            WHERE notes IS NOT NULL AND notes != ''
            ORDER BY date DESC
            LIMIT 5
        """)
        notes_patterns = cursor.fetchall()
        
        for record in notes_patterns:
            print(f"  📅 {record[0]} | Source: {record[1]} | Length: {record[2]}")
            print(f"    Notes: '{record[3]}'")
        
        # 8. T2108 extraction potential
        print("\n8. T2108 EXTRACTION POTENTIAL:")
        print("-" * 40)
        cursor.execute("""
            SELECT date, t2108 as db_t2108, notes
            FROM market_breadth 
            WHERE notes LIKE '%T2108:%'
            ORDER BY date DESC
            LIMIT 3
        """)
        t2108_extraction = cursor.fetchall()
        
        for record in t2108_extraction:
            notes = record[2]
            # Extract T2108 value from notes
            import re
            match = re.search(r'T2108:\s*([0-9.]+)', notes)
            notes_t2108 = match.group(1) if match else "NOT_FOUND"
            
            print(f"  📅 {record[0]}: DB={record[1]} | Notes='{notes_t2108}' | Full Notes: '{notes}'")
        
        # 9. S&P 500 extraction potential
        print("\n9. S&P 500 EXTRACTION POTENTIAL:")
        print("-" * 40)
        cursor.execute("""
            SELECT date, sp500 as db_sp500, notes
            FROM market_breadth 
            WHERE notes LIKE '%SP:%'
            ORDER BY date DESC
            LIMIT 3
        """)
        sp_extraction = cursor.fetchall()
        
        for record in sp_extraction:
            notes = record[2]
            # Extract S&P value from notes
            import re
            match = re.search(r'SP:\s*([^,\s]+)', notes)
            notes_sp500 = match.group(1) if match else "NOT_FOUND"
            
            print(f"  📅 {record[0]}: DB='{record[1]}' | Notes='{notes_sp500}' | Full Notes: '{notes}'")
        
        # 10. Data source analysis
        print("\n10. DATA SOURCE ANALYSIS:")
        print("-" * 40)
        cursor.execute("""
            SELECT data_source, COUNT(*) as count 
            FROM market_breadth 
            GROUP BY data_source
        """)
        sources = cursor.fetchall()
        
        for source, count in sources:
            print(f"  {source or 'NULL':15} | {count:4} records")
        
        conn.close()
        
        print(f"\n{'=' * 80}")
        print("SQL ANALYSIS COMPLETED")
        print(f"{'=' * 80}")
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    run_sql_analysis()