#!/usr/bin/env python3
"""
Database Analysis Script for Market Breadth Data Mapping Problem
Analyzes current database content and identifies data quality issues
"""

import sqlite3
import pandas as pd
import json
import re
from datetime import datetime

def analyze_database():
    """Comprehensive database analysis for CSV data mapping issues"""
    
    db_path = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/trading.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("=" * 80)
        print("BIDBACK TRADING TOOL - DATABASE ANALYSIS REPORT")
        print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # 1. Schema Analysis
        print("\n1. DATABASE SCHEMA ANALYSIS")
        print("-" * 50)
        cursor.execute("PRAGMA table_info(market_breadth)")
        columns = cursor.fetchall()
        
        schema_info = {}
        for col in columns:
            schema_info[col[1]] = {
                'type': col[2],
                'not_null': bool(col[3]),
                'default': col[4]
            }
            print(f"  {col[1]:25} | {col[2]:10} | NotNull: {bool(col[3]):<5} | Default: {col[4] or 'None'}")
        
        # 2. Data Content Analysis
        print("\n2. DATABASE CONTENT ANALYSIS")
        print("-" * 50)
        
        # Get total record count
        cursor.execute("SELECT COUNT(*) FROM market_breadth")
        total_records = cursor.fetchone()[0]
        print(f"Total Records: {total_records}")
        
        if total_records > 0:
            # Get recent records
            query = """
            SELECT id, date, t2108, sp500, stocks_up_4pct, stocks_down_4pct, 
                   worden_universe, ratio_5day, ratio_10day, notes, data_source
            FROM market_breadth 
            ORDER BY date DESC 
            LIMIT 15
            """
            df = pd.read_sql_query(query, conn)
            
            print(f"\nRecent Records (showing last {len(df)}):")
            
            data_quality_issues = []
            field_source_mapping = {
                't2108': {'db_column': [], 'notes_extraction': []},
                'sp500': {'db_column': [], 'notes_extraction': []},
                'stocks_up_4pct': {'db_column': [], 'notes_extraction': []},
                'stocks_down_4pct': {'db_column': [], 'notes_extraction': []},
                'worden_universe': {'db_column': [], 'notes_extraction': []},
                'ratio_5day': {'db_column': [], 'notes_extraction': []},
                'ratio_10day': {'db_column': [], 'notes_extraction': []}
            }
            
            for idx, row in df.iterrows():
                print(f"\n  📅 Record {idx + 1}: {row['date']} (ID: {row['id']})")
                
                # Analyze each field
                t2108_db = row['t2108']
                sp500_db = row['sp500']
                up_4pct_db = row['stocks_up_4pct']
                down_4pct_db = row['stocks_down_4pct']
                worden_db = row['worden_universe']
                ratio_5d_db = row['ratio_5day']
                ratio_10d_db = row['ratio_10day']
                notes = row['notes'] or ""
                
                # Extract from notes
                t2108_notes = extract_from_notes(notes, 'T2108')
                sp500_notes = extract_from_notes(notes, 'SP')
                up_4pct_notes = extract_from_notes(notes, 'up4%')
                down_4pct_notes = extract_from_notes(notes, 'down4%')
                ratio_5d_notes = extract_from_notes(notes, '5d')
                ratio_10d_notes = extract_from_notes(notes, '10d')
                
                # Print findings
                print(f"    🔍 T2108:        DB={t2108_db} | Notes='{t2108_notes}' | Status: {'✅' if t2108_db else '❌'}")
                print(f"    🔍 S&P 500:      DB='{sp500_db}' | Notes='{sp500_notes}' | Status: {'✅' if sp500_db and sp500_db != '6' else '❌'}")
                print(f"    🔍 Stocks Up 4%: DB={up_4pct_db} | Notes='{up_4pct_notes}' | Status: {'✅' if up_4pct_db else '❌'}")
                print(f"    🔍 Stocks Dn 4%: DB={down_4pct_db} | Notes='{down_4pct_notes}' | Status: {'✅' if down_4pct_db else '❌'}")
                print(f"    🔍 Worden Univ:  DB={worden_db} | Notes='' | Status: {'✅' if worden_db and worden_db != 7000 else '❌'}")
                print(f"    🔍 5D Ratio:     DB={ratio_5d_db} | Notes='{ratio_5d_notes}' | Status: {'✅' if ratio_5d_db else '❌'}")
                print(f"    🔍 10D Ratio:    DB={ratio_10d_db} | Notes='{ratio_10d_notes}' | Status: {'✅' if ratio_10d_db else '❌'}")
                print(f"    📝 Notes:        '{notes[:100]}{'...' if len(notes) > 100 else ''}'")
                
                # Identify data quality issues
                if sp500_db == '6':
                    data_quality_issues.append(f"Record {row['date']}: S&P 500 shows incorrect value '6'")
                    
                if worden_db == 7000:
                    data_quality_issues.append(f"Record {row['date']}: Worden Universe shows default value 7000")
                    
                if not up_4pct_db and up_4pct_notes:
                    data_quality_issues.append(f"Record {row['date']}: Stocks Up 4% missing in DB but found in notes: {up_4pct_notes}")
                    
                if not down_4pct_db and down_4pct_notes:
                    data_quality_issues.append(f"Record {row['date']}: Stocks Down 4% missing in DB but found in notes: {down_4pct_notes}")
                
                # Track field source mapping
                if t2108_db:
                    field_source_mapping['t2108']['db_column'].append(row['date'])
                if t2108_notes:
                    field_source_mapping['t2108']['notes_extraction'].append(row['date'])
                    
                if sp500_db:
                    field_source_mapping['sp500']['db_column'].append(row['date'])
                if sp500_notes:
                    field_source_mapping['sp500']['notes_extraction'].append(row['date'])
        
        # 3. Data Quality Assessment
        print("\n3. DATA QUALITY ASSESSMENT")
        print("-" * 50)
        
        if data_quality_issues:
            print(f"Found {len(data_quality_issues)} data quality issues:")
            for issue in data_quality_issues:
                print(f"  ⚠️  {issue}")
        else:
            print("  ✅ No obvious data quality issues found")
        
        # 4. Legacy vs New Format Analysis
        print("\n4. LEGACY vs NEW FORMAT ANALYSIS")
        print("-" * 50)
        
        cursor.execute("""
            SELECT data_source, COUNT(*) as count 
            FROM market_breadth 
            GROUP BY data_source
        """)
        source_counts = cursor.fetchall()
        
        for source, count in source_counts:
            print(f"  {source:15} | {count:4} records")
            
        # Analyze notes formats
        cursor.execute("SELECT notes FROM market_breadth WHERE notes IS NOT NULL AND notes != ''")
        all_notes = cursor.fetchall()
        
        legacy_format_count = 0
        new_format_count = 0
        
        for (notes,) in all_notes:
            if 'T2108:' in notes and 'SP:' in notes:
                legacy_format_count += 1
            elif 'up4%=' in notes or 'stocks_up_4pct=' in notes:
                new_format_count += 1
                
        print(f"\n  Notes Format Analysis:")
        print(f"    Legacy format (T2108:, SP:): {legacy_format_count} records")
        print(f"    New format (up4%=, etc):    {new_format_count} records")
        
        # 5. Field Source Mapping Matrix
        print("\n5. FIELD SOURCE MAPPING MATRIX")
        print("-" * 50)
        print(f"{'Field':<20} | {'DB Column':<10} | {'Notes Extract':<15} | {'Recommendation'}")
        print("-" * 70)
        
        for field, sources in field_source_mapping.items():
            db_count = len(sources['db_column'])
            notes_count = len(sources['notes_extraction'])
            
            if db_count > 0 and notes_count == 0:
                recommendation = "✅ Use DB Column"
            elif db_count == 0 and notes_count > 0:
                recommendation = "🔄 Extract from Notes"
            elif db_count > 0 and notes_count > 0:
                recommendation = "⚠️  Verify Consistency"
            else:
                recommendation = "❌ No Data Found"
                
            print(f"{field:<20} | {db_count:<10} | {notes_count:<15} | {recommendation}")
        
        # 6. Migration Strategy Recommendations
        print("\n6. MIGRATION STRATEGY RECOMMENDATIONS")
        print("-" * 50)
        
        print("Priority 1: Critical Data Fixes")
        print("  1. Fix S&P 500 values showing '6' - extract real values from notes")
        print("  2. Populate empty Stocks Up/Down 4% fields from notes data")
        print("  3. Extract T2108 values from notes where DB column is empty")
        
        print("\nPriority 2: Data Enhancement")
        print("  4. Replace default Worden Universe (7000) with actual values if available")
        print("  5. Calculate missing ratio fields from existing data")
        print("  6. Standardize notes format for future imports")
        
        print("\nPriority 3: Schema Optimization")
        print("  7. Add data validation constraints to prevent invalid values")
        print("  8. Create triggers for automatic ratio calculations")
        print("  9. Add metadata columns for data source tracking")
        
        # 7. Specific SQL Fixes
        print("\n7. RECOMMENDED SQL FIXES")
        print("-" * 50)
        
        print("-- Fix S&P 500 values by extracting from notes")
        print("UPDATE market_breadth SET sp500 = (")
        print("  SELECT TRIM(REPLACE(SUBSTR(notes, INSTR(notes, 'SP: ') + 4, 10), ',', ''))")
        print("  FROM (SELECT notes) WHERE INSTR(notes, 'SP: ') > 0")
        print(") WHERE sp500 = '6' AND notes LIKE '%SP: %';")
        
        print("\n-- Extract Stocks Up 4% from notes")
        print("UPDATE market_breadth SET stocks_up_4pct = (")
        print("  SELECT CAST(TRIM(SUBSTR(notes, INSTR(notes, 'up4%=') + 5, 10)) AS INTEGER)")
        print("  FROM (SELECT notes) WHERE INSTR(notes, 'up4%=') > 0")
        print(") WHERE stocks_up_4pct IS NULL AND notes LIKE '%up4%=%';")
        
        conn.close()
        
        print(f"\n{'=' * 80}")
        print("DATABASE ANALYSIS COMPLETED SUCCESSFULLY")
        print(f"{'=' * 80}")
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")

def extract_from_notes(notes, key):
    """Extract value for key from notes string using multiple patterns"""
    if not notes or not key:
        return ""
    
    # Define patterns for different formats
    patterns = [
        rf"{key}:\s*([^,\n\s]+)",    # T2108: 59.45
        rf"{key}=([^,\n\s]+)",       # up4%=180
        rf"{key}\s+([^,\n\s]+)",     # SP 6
    ]
    
    for pattern in patterns:
        match = re.search(pattern, notes, re.IGNORECASE)
        if match:
            return match.group(1).strip().replace('"', '').replace("'", "")
    
    return ""

if __name__ == "__main__":
    analyze_database()