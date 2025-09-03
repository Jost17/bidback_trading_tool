#!/usr/bin/env python3
"""
BIDBACK Trading Tool - Historical CSV Data Importer
Imports market breadth data from CSV files (2007-2025) into SQLite database
"""

import sqlite3
import pandas as pd
import numpy as np
import os
import glob
import logging
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import requests
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('csv_import.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ImportStats:
    """Statistics for tracking import progress"""
    filename: str
    total_rows: int = 0
    imported_rows: int = 0
    failed_rows: int = 0
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    errors: List[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []

class MarketBreadthCSVImporter:
    """
    Imports historical market breadth CSV data into SQLite database
    Handles different CSV formats across different years
    """
    
    def __init__(self, db_path: str, csv_directory: str):
        self.db_path = db_path
        self.csv_directory = csv_directory
        self.connection = None
        
        # Column mappings for different CSV formats
        self.column_mappings = {
            # Standard format (2015-2025)
            'standard': {
                'Date': 'date',
                'Number of stocks up 4% plus today': 'stocks_up_4pct_daily',
                'Number of stocks  up 4% plus today': 'stocks_up_4pct_daily',
                'Number of stocks down 4% plus today': 'stocks_down_4pct_daily',
                'Number of stocks  down 4% plus today': 'stocks_down_4pct_daily',
                '5 day ratio': 'ratio_5day',
                '5 day breadth ratio of 4% up/4% down': 'ratio_5day',
                '10 day ratio': 'ratio_10day',
                '10 day  ratio': 'ratio_10day',
                '10 day breadth ratio of 4% up/4% down': 'ratio_10day',
                'Number of stocks up 25% plus in a quarter': 'stocks_up_25pct_quarterly',
                'Number of stocks up 25% plus in a  quarter': 'stocks_up_25pct_quarterly',
                'Number of stocks down 25% + in a quarter': 'stocks_down_25pct_quarterly',
                'Number of stocks 25% down plus in a quarter': 'stocks_down_25pct_quarterly',
                'Number of stocks up 25% + in a month': 'stocks_up_25pct_monthly',
                'Number of stocks  up 25% + in a month': 'stocks_up_25pct_monthly',
                'Number of stocks down 25% + in a month': 'stocks_down_25pct_monthly',
                'Number of stocks up 50% + in a month': 'stocks_up_50pct_monthly',
                'Number of stocks down 50% + in a month': 'stocks_down_50pct_monthly',
                'Number of stocks up 13% + in 34 days': 'stocks_up_13pct_34days',
                'Number of stocks down 13% + in 34 days': 'stocks_down_13pct_34days',
                'Worden Common stock universe': 'worden_common_stocks',
                'Number of stocks in Worden Common stock universe': 'worden_common_stocks',
                ' Worden Common stock universe': 'worden_common_stocks',
                'T2108': 't2108',
                'T2108 (% of stocks above 40 day MA)': 't2108',
                'T2108 ': 't2108',
                'S&P': 'sp_reference'
            },
            
            # Early format (2007-2014)
            'early': {
                'Date': 'date',
                '4% plus daily': 'stocks_up_4pct_daily',
                '4% down daily': 'stocks_down_4pct_daily',
                '25% plus quarter': 'stocks_up_25pct_quarterly',
                '25% down quarter': 'stocks_down_25pct_quarterly',
                '25% month': 'stocks_up_25pct_monthly',
                '25 down month': 'stocks_down_25pct_monthly',
                '50% up': 'stocks_up_50pct_monthly',
                '50% down': 'stocks_down_50pct_monthly'
            }
        }
        
    def connect_db(self) -> None:
        """Establish database connection"""
        try:
            self.connection = sqlite3.connect(self.db_path)
            self.connection.execute('PRAGMA foreign_keys = ON')
            logger.info(f"Connected to database: {self.db_path}")
        except sqlite3.Error as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def close_db(self) -> None:
        """Close database connection"""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")
    
    def analyze_csv_structure(self, filepath: str) -> Dict[str, Any]:
        """Analyze CSV file structure to determine format and columns"""
        try:
            # Read first few rows to determine structure
            df_sample = pd.read_csv(filepath, nrows=5, encoding='utf-8')
            
            format_type = 'early'
            skip_rows = []
            
            # Check if first data row contains column headers (like in 2024.csv)
            if len(df_sample) > 0 and str(df_sample.iloc[0, 0]) == 'Date':
                # The actual column names are in the first data row
                skip_rows = [0]  # Skip the unnamed headers
                header_row = df_sample.iloc[0].tolist()
                format_type = 'standard' if 'Number of stocks' in ' '.join(str(x) for x in header_row) else 'early'
            elif 'Date' in df_sample.columns:
                # Proper column headers (like in 2007.csv)
                format_type = 'standard' if any('Number of stocks' in str(col) for col in df_sample.columns) else 'early'
            elif 'Primary' in str(df_sample.columns[0]) or 'Primary' in str(df_sample.iloc[0].values):
                # Multi-row headers (like in some files)
                skip_rows = [0]
                if len(df_sample) > 2 and df_sample.iloc[2].isna().all():
                    skip_rows.append(2)
                format_type = 'standard'
            
            return {
                'format_type': format_type,
                'columns': df_sample.columns.tolist(),
                'skip_rows': skip_rows,
                'sample_data': df_sample.head(2).to_dict('records')
            }
            
        except Exception as e:
            logger.error(f"Error analyzing CSV structure for {filepath}: {e}")
            return {'format_type': 'unknown', 'columns': [], 'skip_rows': [], 'sample_data': []}
    
    def clean_numeric_value(self, value: Any) -> Optional[float]:
        """Clean and convert numeric values, handling various formats"""
        if pd.isna(value) or value == '' or value is None:
            return None
        
        # Convert to string and clean
        str_value = str(value).strip()
        
        # Handle missing data markers
        if str_value.lower() in ['md', 'n/a', 'na', '-', '']:
            return None
        
        # Remove quotes and commas
        str_value = str_value.replace('"', '').replace(',', '').replace('$', '')
        
        try:
            return float(str_value)
        except (ValueError, TypeError):
            logger.warning(f"Could not convert '{value}' to numeric")
            return None
    
    def parse_date(self, date_str: Any) -> Optional[str]:
        """Parse date string into standardized format"""
        if pd.isna(date_str) or date_str == '' or date_str is None:
            return None
        
        date_str = str(date_str).strip()
        
        # Try different date formats
        date_formats = [
            '%m/%d/%Y',     # 12/31/2024
            '%Y-%m-%d',     # 2024-12-31
            '%m-%d-%Y',     # 12-31-2024
            '%d/%m/%Y',     # 31/12/2024
            '%Y/%m/%d',     # 2024/12/31
            '%d/%m/%y',     # 31/12/07
            '%m/%d/%y',     # 12/31/07
            '%d/%m/%Y',     # 28/2/2007
            '%d/%m%Y'       # 28/02/2007 (no separator)
        ]
        
        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(date_str, fmt)
                return parsed_date.strftime('%Y-%m-%d')
            except ValueError:
                continue
        
        logger.warning(f"Could not parse date: {date_str}")
        return None
    
    def fetch_spy_data(self, start_date: str, end_date: str) -> Dict[str, Dict[str, float]]:
        """
        Fetch SPY OHLC data from external source for True Range calculation
        This is a placeholder - in production, you would use a real data provider
        """
        logger.info("High/Low data not available in CSV - using SPY reference for True Range calculation")
        
        # For now, we'll estimate High/Low based on close price volatility
        # In production, integrate with actual market data provider
        return {}
    
    def estimate_high_low_from_close(self, close_price: float, volatility_factor: float = 0.02) -> Tuple[float, float]:
        """
        Estimate High/Low from close price when actual data not available
        This is a fallback method - real High/Low data would be preferred
        """
        if not close_price or pd.isna(close_price):
            return None, None
        
        # Estimate daily range as percentage of close price
        daily_range = close_price * volatility_factor
        estimated_high = close_price + (daily_range * 0.7)
        estimated_low = close_price - (daily_range * 0.3)
        
        return round(estimated_high, 2), round(estimated_low, 2)
    
    def calculate_true_range(self, high: float, low: float, prev_close: float) -> Optional[float]:
        """Calculate True Range value"""
        if not all([high, low]) or pd.isna(high) or pd.isna(low):
            return None
        
        hl_range = high - low
        
        if prev_close and not pd.isna(prev_close):
            hc_range = abs(high - prev_close)
            lc_range = abs(low - prev_close)
            true_range = max(hl_range, hc_range, lc_range)
        else:
            true_range = hl_range
        
        return round(true_range, 4)
    
    def import_csv_file(self, filepath: str) -> ImportStats:
        """Import single CSV file into database"""
        filename = os.path.basename(filepath)
        stats = ImportStats(filename=filename)
        
        logger.info(f"Starting import of {filename}")
        
        try:
            # Analyze CSV structure
            structure_info = self.analyze_csv_structure(filepath)
            format_type = structure_info['format_type']
            skip_rows = structure_info['skip_rows']
            
            logger.info(f"Detected format type: {format_type}, skip_rows: {skip_rows}")
            
            # Read CSV with appropriate parameters
            if skip_rows:
                df = pd.read_csv(filepath, skiprows=skip_rows, encoding='utf-8')
            else:
                df = pd.read_csv(filepath, encoding='utf-8')
            
            # Remove any remaining empty rows
            df = df.dropna(how='all')
            
            # Handle special case where headers are in first data row (2024 format)
            if len(df) > 0 and str(df.iloc[0, 0]) == 'Date':
                # Use first row as column headers
                new_columns = df.iloc[0].tolist()
                df = df.iloc[1:]  # Remove header row from data
                df.reset_index(drop=True, inplace=True)
                df.columns = [str(col).strip() for col in new_columns]
            else:
                # Clean existing column names
                df.columns = df.columns.str.strip()
            
            stats.total_rows = len(df)
            
            # Get appropriate column mappings
            column_mapping = self.column_mappings[format_type] if format_type in self.column_mappings else self.column_mappings['standard']
            
            # Process each row
            for index, row in df.iterrows():
                try:
                    # Parse and validate date - use the Date column specifically
                    date_value = None
                    if 'Date' in df.columns:
                        date_value = row['Date']
                    elif len(row) > 0:
                        date_value = row.iloc[0]
                    
                    date_str = self.parse_date(date_value)
                    if not date_str:
                        stats.failed_rows += 1
                        stats.errors.append(f"Row {index}: Invalid date '{date_value}'")
                        continue
                    
                    # Track date range
                    if not stats.date_range_start or date_str < stats.date_range_start:
                        stats.date_range_start = date_str
                    if not stats.date_range_end or date_str > stats.date_range_end:
                        stats.date_range_end = date_str
                    
                    # Map CSV columns to database fields
                    record_data = {'date': date_str}
                    
                    for csv_col, db_field in column_mapping.items():
                        if csv_col in df.columns:
                            value = self.clean_numeric_value(row[csv_col])
                            record_data[db_field] = value
                    
                    # Handle High/Low data (estimate from SP reference if available)
                    sp_reference = record_data.get('sp_reference')
                    if sp_reference:
                        estimated_high, estimated_low = self.estimate_high_low_from_close(sp_reference)
                        record_data['daily_high'] = estimated_high
                        record_data['daily_low'] = estimated_low
                        record_data['daily_close'] = sp_reference
                    
                    # Insert into database
                    self.insert_record(record_data)
                    stats.imported_rows += 1
                    
                except Exception as e:
                    stats.failed_rows += 1
                    error_msg = f"Row {index}: {str(e)}"
                    stats.errors.append(error_msg)
                    logger.warning(error_msg)
            
            logger.info(f"Completed import of {filename}: {stats.imported_rows}/{stats.total_rows} rows imported")
            
        except Exception as e:
            logger.error(f"Failed to import {filename}: {e}")
            stats.errors.append(f"File import failed: {str(e)}")
        
        return stats
    
    def insert_record(self, record_data: Dict[str, Any]) -> None:
        """Insert single record into market_breadth_daily table"""
        
        # Define all possible fields
        fields = [
            'date', 'daily_high', 'daily_low', 'daily_close', 'previous_close',
            'stocks_up_4pct_daily', 'stocks_down_4pct_daily', 'ratio_5day', 'ratio_10day',
            'stocks_up_25pct_quarterly', 'stocks_down_25pct_quarterly',
            'stocks_up_25pct_monthly', 'stocks_down_25pct_monthly',
            'stocks_up_50pct_monthly', 'stocks_down_50pct_monthly',
            'stocks_up_13pct_34days', 'stocks_down_13pct_34days',
            'worden_common_stocks', 't2108', 'sp_reference'
        ]
        
        # Build INSERT query
        present_fields = [field for field in fields if field in record_data and record_data[field] is not None]
        placeholders = ', '.join(['?' for _ in present_fields])
        field_names = ', '.join(present_fields)
        values = [record_data[field] for field in present_fields]
        
        query = f"""
            INSERT OR REPLACE INTO market_breadth_daily ({field_names}, data_source)
            VALUES ({placeholders}, 'csv_import')
        """
        
        self.connection.execute(query, values)
        self.connection.commit()
    
    def calculate_previous_close_and_true_range(self) -> None:
        """Calculate previous_close and true_range for all imported records"""
        logger.info("Calculating previous_close and true_range values")
        
        # Update previous_close
        query_prev_close = """
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
        """
        
        self.connection.execute(query_prev_close)
        
        # Calculate true_range using trigger or manual calculation
        query_true_range = """
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
        """
        
        self.connection.execute(query_true_range)
        self.connection.commit()
        
        logger.info("True Range calculations completed")
    
    def calculate_average_true_range(self) -> None:
        """Calculate 14-day and 20-day Average True Range"""
        logger.info("Calculating Average True Range (ATR) values")
        
        # Get all records ordered by date
        query = """
            SELECT date, true_range 
            FROM market_breadth_daily 
            WHERE true_range IS NOT NULL 
            ORDER BY date
        """
        
        cursor = self.connection.execute(query)
        records = cursor.fetchall()
        
        # Calculate rolling ATR
        for i, (date, true_range) in enumerate(records):
            # 14-day ATR
            if i >= 13:
                atr_14_data = [r[1] for r in records[i-13:i+1] if r[1] is not None]
                if atr_14_data:
                    atr_14 = sum(atr_14_data) / len(atr_14_data)
                else:
                    atr_14 = None
            else:
                atr_14 = None
            
            # 20-day ATR
            if i >= 19:
                atr_20_data = [r[1] for r in records[i-19:i+1] if r[1] is not None]
                if atr_20_data:
                    atr_20 = sum(atr_20_data) / len(atr_20_data)
                else:
                    atr_20 = None
            else:
                atr_20 = None
            
            # Update record
            update_query = """
                UPDATE market_breadth_daily 
                SET average_true_range_14 = ?, average_true_range_20 = ?
                WHERE date = ?
            """
            self.connection.execute(update_query, (atr_14, atr_20, date))
        
        self.connection.commit()
        logger.info("ATR calculations completed")
    
    def log_import_statistics(self, stats: ImportStats) -> None:
        """Log import statistics to data_import_log table"""
        
        query = """
            INSERT INTO data_import_log (
                filename, import_type, records_processed, records_imported, 
                records_failed, date_range_start, date_range_end, error_log, 
                status, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        status = 'completed' if stats.failed_rows == 0 else 'failed'
        error_log = '\n'.join(stats.errors) if stats.errors else None
        
        self.connection.execute(query, (
            stats.filename, 'csv', stats.total_rows, stats.imported_rows,
            stats.failed_rows, stats.date_range_start, stats.date_range_end,
            error_log, status, datetime.now().isoformat()
        ))
        self.connection.commit()
    
    def import_all_csv_files(self) -> Dict[str, ImportStats]:
        """Import all CSV files from directory"""
        csv_pattern = os.path.join(self.csv_directory, "*.csv")
        csv_files = glob.glob(csv_pattern)
        csv_files.sort()  # Import in chronological order
        
        if not csv_files:
            logger.error(f"No CSV files found in {self.csv_directory}")
            return {}
        
        logger.info(f"Found {len(csv_files)} CSV files to import")
        
        all_stats = {}
        
        for csv_file in csv_files:
            stats = self.import_csv_file(csv_file)
            all_stats[stats.filename] = stats
            self.log_import_statistics(stats)
        
        # Calculate derived fields after all imports
        self.calculate_previous_close_and_true_range()
        self.calculate_average_true_range()
        
        return all_stats
    
    def generate_data_quality_report(self, all_stats: Dict[str, ImportStats]) -> Dict[str, Any]:
        """Generate comprehensive data quality report"""
        
        report = {
            'import_summary': {
                'total_files': len(all_stats),
                'total_records_processed': sum(s.total_rows for s in all_stats.values()),
                'total_records_imported': sum(s.imported_rows for s in all_stats.values()),
                'total_records_failed': sum(s.failed_rows for s in all_stats.values()),
                'success_rate': 0
            },
            'date_coverage': {},
            'data_completeness': {},
            'errors_summary': []
        }
        
        # Calculate success rate
        total_processed = report['import_summary']['total_records_processed']
        total_imported = report['import_summary']['total_records_imported']
        if total_processed > 0:
            report['import_summary']['success_rate'] = (total_imported / total_processed) * 100
        
        # Date coverage
        all_dates = []
        for stats in all_stats.values():
            if stats.date_range_start:
                all_dates.append(stats.date_range_start)
            if stats.date_range_end:
                all_dates.append(stats.date_range_end)
        
        if all_dates:
            report['date_coverage'] = {
                'earliest_date': min(all_dates),
                'latest_date': max(all_dates),
                'total_date_range': f"{min(all_dates)} to {max(all_dates)}"
            }
        
        # Data completeness check
        completeness_query = """
            SELECT 
                COUNT(*) as total_records,
                COUNT(stocks_up_4pct_daily) as has_up_4pct,
                COUNT(stocks_down_4pct_daily) as has_down_4pct,
                COUNT(ratio_5day) as has_5day_ratio,
                COUNT(ratio_10day) as has_10day_ratio,
                COUNT(t2108) as has_t2108,
                COUNT(sp_reference) as has_sp_reference,
                COUNT(daily_high) as has_high,
                COUNT(daily_low) as has_low,
                COUNT(true_range) as has_true_range,
                COUNT(average_true_range_14) as has_atr_14
            FROM market_breadth_daily
            WHERE data_source = 'csv_import'
        """
        
        cursor = self.connection.execute(completeness_query)
        completeness_data = cursor.fetchone()
        
        if completeness_data:
            total_records = completeness_data[0]
            report['data_completeness'] = {
                'total_records': total_records,
                'stocks_up_4pct_daily': f"{(completeness_data[1]/total_records)*100:.1f}%" if total_records > 0 else "0%",
                'stocks_down_4pct_daily': f"{(completeness_data[2]/total_records)*100:.1f}%" if total_records > 0 else "0%",
                'ratio_5day': f"{(completeness_data[3]/total_records)*100:.1f}%" if total_records > 0 else "0%",
                'ratio_10day': f"{(completeness_data[4]/total_records)*100:.1f}%" if total_records > 0 else "0%",
                't2108': f"{(completeness_data[5]/total_records)*100:.1f}%" if total_records > 0 else "0%",
                'sp_reference': f"{(completeness_data[6]/total_records)*100:.1f}%" if total_records > 0 else "0%",
                'daily_high': f"{(completeness_data[7]/total_records)*100:.1f}%" if total_records > 0 else "0%",
                'daily_low': f"{(completeness_data[8]/total_records)*100:.1f}%" if total_records > 0 else "0%",
                'true_range': f"{(completeness_data[9]/total_records)*100:.1f}%" if total_records > 0 else "0%",
                'average_true_range_14': f"{(completeness_data[10]/total_records)*100:.1f}%" if total_records > 0 else "0%"
            }
        
        # Errors summary
        all_errors = []
        for stats in all_stats.values():
            all_errors.extend(stats.errors)
        
        report['errors_summary'] = all_errors[:50]  # Limit to first 50 errors
        
        return report

def main():
    """Main execution function"""
    
    # Configuration
    db_path = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/backend/src/database/trading.db"
    csv_directory = "/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/source/csv"
    
    # Initialize importer
    importer = MarketBreadthCSVImporter(db_path, csv_directory)
    
    try:
        # Connect to database
        importer.connect_db()
        
        # Import all CSV files
        logger.info("Starting CSV import process")
        all_stats = importer.import_all_csv_files()
        
        # Generate and display report
        report = importer.generate_data_quality_report(all_stats)
        
        print("\n" + "="*60)
        print("CSV IMPORT COMPLETION REPORT")
        print("="*60)
        print(f"Files processed: {report['import_summary']['total_files']}")
        print(f"Records processed: {report['import_summary']['total_records_processed']:,}")
        print(f"Records imported: {report['import_summary']['total_records_imported']:,}")
        print(f"Records failed: {report['import_summary']['total_records_failed']:,}")
        print(f"Success rate: {report['import_summary']['success_rate']:.1f}%")
        
        if report['date_coverage']:
            print(f"Date coverage: {report['date_coverage']['total_date_range']}")
        
        print("\nData Completeness:")
        for field, percentage in report['data_completeness'].items():
            if field != 'total_records':
                print(f"  {field}: {percentage}")
        
        if report['errors_summary']:
            print(f"\nFirst 10 errors:")
            for i, error in enumerate(report['errors_summary'][:10]):
                print(f"  {i+1}. {error}")
        
        print("="*60)
        logger.info("CSV import process completed successfully")
        
    except Exception as e:
        logger.error(f"CSV import process failed: {e}")
        raise
    finally:
        importer.close_db()

if __name__ == "__main__":
    main()