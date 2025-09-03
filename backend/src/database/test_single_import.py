#!/usr/bin/env python3
"""
Test single CSV file import
"""

from csv_importer import MarketBreadthCSVImporter
import logging

logging.basicConfig(level=logging.INFO)

# Test with 2024 file first (should be cleanest format)
db_path = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/backend/src/database/trading.db"
csv_file = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/source/csv/2024.csv"

importer = MarketBreadthCSVImporter(db_path, "")

try:
    importer.connect_db()
    stats = importer.import_csv_file(csv_file)
    
    print(f"Import Stats for 2024.csv:")
    print(f"Total rows: {stats.total_rows}")
    print(f"Imported: {stats.imported_rows}")
    print(f"Failed: {stats.failed_rows}")
    print(f"Date range: {stats.date_range_start} to {stats.date_range_end}")
    
    if stats.errors:
        print("First 5 errors:")
        for error in stats.errors[:5]:
            print(f"  {error}")
    
finally:
    importer.close_db()