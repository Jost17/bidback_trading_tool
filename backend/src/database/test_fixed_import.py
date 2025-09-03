#!/usr/bin/env python3
"""
Test fixed import on single file
"""

from fixed_csv_importer import FixedMarketBreadthCSVImporter

# Test with 2024 file
db_path = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/backend/src/database/trading.db"
csv_file = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/source/csv/2024.csv"

importer = FixedMarketBreadthCSVImporter(db_path)

try:
    importer.connect_db()
    
    # Clear existing data
    importer.connection.execute("DELETE FROM market_breadth_daily WHERE date >= '2024-01-01'")
    importer.connection.commit()
    
    stats = importer.import_csv_file(csv_file)
    
    print(f"Import Stats for 2024.csv:")
    print(f"Total rows: {stats.total_rows}")
    print(f"Imported: {stats.imported_rows}")
    print(f"Failed: {stats.failed_rows}")
    
    if stats.errors:
        print("First 5 errors:")
        for error in stats.errors[:5]:
            print(f"  {error}")
    
    # Check what was actually imported
    cursor = importer.connection.execute("""
        SELECT date, stocks_up_4pct_daily, stocks_down_4pct_daily, ratio_5day, t2108, sp_reference 
        FROM market_breadth_daily 
        WHERE date >= '2024-01-01' 
        ORDER BY date DESC 
        LIMIT 5
    """)
    
    rows = cursor.fetchall()
    print(f"\nSample imported data:")
    for row in rows:
        print(f"  {row}")

finally:
    importer.close_db()