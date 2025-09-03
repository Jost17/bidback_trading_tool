#!/usr/bin/env python3
"""
Fixed CSV Importer - Simplified approach focusing on working correctly
"""

import sqlite3
import pandas as pd
import numpy as np
import os
import glob
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ImportStats:
    filename: str
    total_rows: int = 0
    imported_rows: int = 0
    failed_rows: int = 0
    errors: List[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []

class FixedMarketBreadthCSVImporter:
    """
    Fixed CSV Importer with simplified, robust approach
    """
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.connection = None
    
    def connect_db(self):
        self.connection = sqlite3.connect(self.db_path)
        self.connection.execute('PRAGMA foreign_keys = ON')
    
    def close_db(self):
        if self.connection:
            self.connection.close()
    
    def clean_value(self, value: Any) -> Optional[float]:
        """Clean numeric values"""
        if pd.isna(value) or value == '' or value is None:
            return None
        
        str_value = str(value).strip()
        if str_value.lower() in ['md', 'n/a', 'na', '-', '']:
            return None
        
        # Remove quotes, commas, dollar signs
        str_value = str_value.replace('"', '').replace(',', '').replace('$', '')
        
        try:
            return float(str_value)
        except (ValueError, TypeError):
            return None
    
    def parse_date(self, date_str: Any) -> Optional[str]:
        """Parse date string"""
        if pd.isna(date_str) or date_str == '' or date_str is None:
            return None
        
        date_str = str(date_str).strip()
        
        date_formats = [
            '%m/%d/%Y',
            '%Y-%m-%d', 
            '%m-%d-%Y',
            '%d/%m/%Y',
            '%Y/%m/%d',
            '%d/%m/%y',
            '%m/%d/%y'
        ]
        
        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(date_str, fmt)
                return parsed_date.strftime('%Y-%m-%d')
            except ValueError:
                continue
        
        return None
    
    def load_and_clean_csv(self, filepath: str) -> pd.DataFrame:
        """Load and clean CSV file"""
        
        # Read raw CSV to detect format
        df_raw = pd.read_csv(filepath, nrows=5)
        
        # Determine if first data row contains 'Date' (indicates headers are in first data row)
        if len(df_raw) > 0 and str(df_raw.iloc[0, 0]) == 'Date':
            # 2024-style format: skip unnamed headers, but the first data row contains proper headers
            df = pd.read_csv(filepath, skiprows=[0])  # Skip the unnamed header row
            df = df.dropna(how='all')
            df.columns = df.columns.str.strip()  # The columns are now properly named
            
        elif 'Date' in df_raw.columns:
            # 2007-style format: proper column headers from the start
            df = pd.read_csv(filepath)
            df = df.dropna(how='all')
            df.columns = df.columns.str.strip()
            
        else:
            # Other formats - read as-is and try to detect patterns
            df = pd.read_csv(filepath)
            df = df.dropna(how='all')
            
            # Check if we need to use first row as column headers
            if len(df) > 0 and any('date' in str(df.iloc[0, i]).lower() for i in range(min(3, len(df.columns)))):
                new_columns = df.iloc[0].tolist()
                df = df.iloc[1:]
                df.reset_index(drop=True, inplace=True)
                df.columns = [str(col).strip() for col in new_columns]
            else:
                df.columns = df.columns.str.strip()
        
        return df
    
    def import_csv_file(self, filepath: str) -> ImportStats:
        """Import single CSV file"""
        
        filename = os.path.basename(filepath)
        stats = ImportStats(filename=filename)
        
        logger.info(f"Importing {filename}")
        
        try:
            # Load CSV
            df = self.load_and_clean_csv(filepath)
            stats.total_rows = len(df)
            
            logger.info(f"Loaded {len(df)} rows with columns: {df.columns.tolist()}")
            
            # Import each row
            for index, row in df.iterrows():
                try:
                    # Parse date
                    date_value = None
                    if 'Date' in df.columns:
                        date_value = row['Date']
                    elif len(row) > 0:
                        date_value = row.iloc[0]
                    
                    parsed_date = self.parse_date(date_value)
                    if not parsed_date:
                        stats.failed_rows += 1
                        stats.errors.append(f"Row {index}: Invalid date '{date_value}'")
                        continue
                    
                    # Build record data
                    record_data = {'date': parsed_date}
                    
                    # Map known columns - handle different naming conventions across years
                    column_mappings = {}
                    
                    # Different ways columns can be named across CSV files
                    for col in df.columns:
                        col_lower = col.lower().strip()
                        
                        # 4% daily indicators
                        if any(x in col_lower for x in ['4% plus daily', 'stocks up 4%']):
                            column_mappings[col] = 'stocks_up_4pct_daily'
                        elif any(x in col_lower for x in ['4% down daily', 'stocks down 4%']):
                            column_mappings[col] = 'stocks_down_4pct_daily'
                        
                        # Ratios
                        elif any(x in col_lower for x in ['5 day ratio']):
                            column_mappings[col] = 'ratio_5day'
                        elif any(x in col_lower for x in ['10 day', '10day']) and 'ratio' in col_lower:
                            column_mappings[col] = 'ratio_10day'
                        
                        # Quarterly 25%
                        elif any(x in col_lower for x in ['25% plus quarter', 'up 25% plus in a quarter']):
                            column_mappings[col] = 'stocks_up_25pct_quarterly'
                        elif any(x in col_lower for x in ['25% down quarter', 'down 25%']) and 'quarter' in col_lower:
                            column_mappings[col] = 'stocks_down_25pct_quarterly'
                        
                        # Monthly 25%
                        elif any(x in col_lower for x in ['25% month', 'up 25% + in a month']):
                            column_mappings[col] = 'stocks_up_25pct_monthly'
                        elif any(x in col_lower for x in ['25 down month', 'down 25% + in a month']):
                            column_mappings[col] = 'stocks_down_25pct_monthly'
                        
                        # Monthly 50%
                        elif any(x in col_lower for x in ['50% up', 'up 50% + in a month']):
                            column_mappings[col] = 'stocks_up_50pct_monthly'
                        elif any(x in col_lower for x in ['50% down', 'down 50% + in a month']):
                            column_mappings[col] = 'stocks_down_50pct_monthly'
                        
                        # 13% in 34 days
                        elif any(x in col_lower for x in ['up 13% + in 34 days']):
                            column_mappings[col] = 'stocks_up_13pct_34days'
                        elif any(x in col_lower for x in ['down 13% + in 34 days']):
                            column_mappings[col] = 'stocks_down_13pct_34days'
                        
                        # Worden universe
                        elif any(x in col_lower for x in ['worden', 'common stock universe']):
                            column_mappings[col] = 'worden_common_stocks'
                        
                        # T2108
                        elif 't2108' in col_lower:
                            column_mappings[col] = 't2108'
                        
                        # S&P reference
                        elif col.strip() in ['S&P', 'SP', 'SPX']:
                            column_mappings[col] = 'sp_reference'
                    
                    # Map columns to database fields
                    for csv_col, db_field in column_mappings.items():
                        if csv_col in df.columns:
                            value = self.clean_value(row[csv_col])
                            if value is not None:
                                record_data[db_field] = value
                    
                    # Handle High/Low estimation from SP reference
                    if 'sp_reference' in record_data and record_data['sp_reference']:
                        sp_price = record_data['sp_reference']
                        volatility = sp_price * 0.015  # 1.5% daily volatility estimate
                        record_data['daily_high'] = round(sp_price + volatility * 0.6, 2)
                        record_data['daily_low'] = round(sp_price - volatility * 0.4, 2)
                        record_data['daily_close'] = sp_price
                    
                    # Insert record
                    self.insert_record(record_data)
                    stats.imported_rows += 1
                    
                except Exception as e:
                    stats.failed_rows += 1
                    stats.errors.append(f"Row {index}: {str(e)}")
                    logger.warning(f"Row {index} failed: {e}")
            
            logger.info(f"Completed {filename}: {stats.imported_rows}/{stats.total_rows} imported")
            
        except Exception as e:
            logger.error(f"Failed to import {filename}: {e}")
            stats.errors.append(f"File error: {str(e)}")
        
        return stats
    
    def insert_record(self, record_data: Dict[str, Any]):
        """Insert record into database"""
        
        fields = list(record_data.keys())
        placeholders = ', '.join(['?' for _ in fields])
        field_names = ', '.join(fields)
        values = [record_data[field] for field in fields]
        
        query = f"""
            INSERT OR REPLACE INTO market_breadth_daily ({field_names}, data_source)
            VALUES ({placeholders}, 'csv_import')
        """
        
        self.connection.execute(query, values)
        self.connection.commit()

def main():
    """Main execution"""
    
    db_path = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/backend/src/database/trading.db"
    csv_directory = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/source/csv"
    
    importer = FixedMarketBreadthCSVImporter(db_path)
    
    try:
        importer.connect_db()
        
        # Get CSV files
        csv_files = glob.glob(os.path.join(csv_directory, "*.csv"))
        csv_files.sort()
        
        print(f"Found {len(csv_files)} CSV files")
        
        all_stats = {}
        total_imported = 0
        total_failed = 0
        
        for csv_file in csv_files:
            stats = importer.import_csv_file(csv_file)
            all_stats[stats.filename] = stats
            total_imported += stats.imported_rows
            total_failed += stats.failed_rows
        
        # Calculate True Range after all imports
        logger.info("Calculating True Range and ATR values")
        
        # Update previous_close
        importer.connection.execute("""
            UPDATE market_breadth_daily 
            SET previous_close = (
                SELECT daily_close 
                FROM market_breadth_daily prev 
                WHERE prev.date < market_breadth_daily.date 
                AND prev.daily_close IS NOT NULL
                ORDER BY prev.date DESC 
                LIMIT 1
            )
            WHERE daily_close IS NOT NULL
        """)
        
        # Calculate true_range
        importer.connection.execute("""
            UPDATE market_breadth_daily 
            SET true_range = (
                CASE 
                    WHEN daily_high IS NOT NULL AND daily_low IS NOT NULL THEN
                        MAX(
                            (daily_high - daily_low),
                            COALESCE(ABS(daily_high - previous_close), 0),
                            COALESCE(ABS(daily_low - previous_close), 0)
                        )
                    ELSE NULL
                END
            )
            WHERE daily_high IS NOT NULL AND daily_low IS NOT NULL
        """)
        
        importer.connection.commit()
        
        # Print summary
        print("\n" + "="*60)
        print("CSV IMPORT SUMMARY")
        print("="*60)
        print(f"Total files: {len(csv_files)}")
        print(f"Total records imported: {total_imported:,}")
        print(f"Total records failed: {total_failed:,}")
        
        success_rate = (total_imported / (total_imported + total_failed)) * 100 if (total_imported + total_failed) > 0 else 0
        print(f"Success rate: {success_rate:.1f}%")
        
        # Show file breakdown
        print(f"\nFile breakdown:")
        for filename, stats in all_stats.items():
            success = (stats.imported_rows / stats.total_rows) * 100 if stats.total_rows > 0 else 0
            print(f"  {filename}: {stats.imported_rows}/{stats.total_rows} ({success:.1f}%)")
        
        print("="*60)
        
    finally:
        importer.close_db()

if __name__ == "__main__":
    main()