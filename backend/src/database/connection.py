"""
Database Connection Module for BIDBACK Trading Tool
Provides high-performance SQLite connections for Python Risk Management backend
"""

import sqlite3
import json
from contextlib import contextmanager
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, date
from pathlib import Path
import logging
from decimal import Decimal

# Configure logging
logger = logging.getLogger(__name__)

class DatabaseConnection:
    """High-performance SQLite connection manager for trading data"""
    
    def __init__(self, db_path: str = None):
        """
        Initialize database connection
        
        Args:
            db_path: Path to SQLite database file
        """
        if db_path is None:
            self.db_path = Path(__file__).parent / "trading.db"
        else:
            self.db_path = Path(db_path)
        
        if not self.db_path.exists():
            raise FileNotFoundError(f"Database not found: {self.db_path}")
        
        # Connection settings for optimal performance
        self.connection_settings = {
            'timeout': 30.0,  # 30 second timeout
            'check_same_thread': False,  # Allow multi-threading
            'isolation_level': None,  # Autocommit mode for better performance
        }
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections with performance optimization"""
        conn = None
        try:
            conn = sqlite3.connect(str(self.db_path), **self.connection_settings)
            
            # Set row factory for dictionary-like access
            conn.row_factory = sqlite3.Row
            
            # Performance optimizations
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute("PRAGMA journal_mode = WAL")
            conn.execute("PRAGMA synchronous = NORMAL")
            conn.execute("PRAGMA cache_size = -64000")  # 64MB cache
            conn.execute("PRAGMA temp_store = MEMORY")
            
            yield conn
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database connection error: {str(e)}")
            raise
        finally:
            if conn:
                conn.close()
    
    def _convert_row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert SQLite Row to dictionary with proper type handling"""
        if row is None:
            return {}
        
        result = {}
        for key in row.keys():
            value = row[key]
            
            # Handle date/datetime conversion
            if isinstance(value, str) and key.endswith(('_at', 'date')):
                try:
                    if 'T' in value or ' ' in value:
                        result[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    else:
                        result[key] = datetime.strptime(value, '%Y-%m-%d').date()
                except ValueError:
                    result[key] = value
            else:
                result[key] = value
        
        return result
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """
        Execute SELECT query and return results as list of dictionaries
        
        Args:
            query: SQL query string
            params: Query parameters
            
        Returns:
            List of dictionaries representing query results
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            rows = cursor.fetchall()
            return [self._convert_row_to_dict(row) for row in rows]
    
    def execute_single(self, query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
        """
        Execute SELECT query and return single result as dictionary
        
        Args:
            query: SQL query string
            params: Query parameters
            
        Returns:
            Dictionary representing query result or None
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            row = cursor.fetchone()
            return self._convert_row_to_dict(row) if row else None
    
    def execute_write(self, query: str, params: tuple = None) -> int:
        """
        Execute INSERT/UPDATE/DELETE query
        
        Args:
            query: SQL query string
            params: Query parameters
            
        Returns:
            Number of affected rows or lastrowid for INSERT
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            conn.commit()
            return cursor.lastrowid if cursor.lastrowid else cursor.rowcount
    
    def execute_many(self, query: str, params_list: List[tuple]) -> int:
        """
        Execute query with multiple parameter sets (bulk operations)
        
        Args:
            query: SQL query string
            params_list: List of parameter tuples
            
        Returns:
            Number of affected rows
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany(query, params_list)
            conn.commit()
            return cursor.rowcount

class MarketBreadthQueries:
    """Specialized queries for Market Breadth data access"""
    
    def __init__(self, db_connection: DatabaseConnection):
        self.db = db_connection
    
    def get_latest_breadth_data(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get latest market breadth data for risk management
        
        Args:
            days: Number of days to retrieve
            
        Returns:
            List of breadth data records
        """
        query = """
        SELECT * FROM v_risk_management_data 
        WHERE date >= date('now', '-{} days')
        ORDER BY date DESC
        LIMIT {}
        """.format(days, days)
        
        return self.db.execute_query(query)
    
    def get_true_range_data(self, days: int = 252) -> List[Dict[str, Any]]:
        """
        Get True Range data for volatility calculations
        
        Args:
            days: Number of days to retrieve (default: 1 trading year)
            
        Returns:
            List of True Range data
        """
        query = """
        SELECT 
            date,
            daily_high,
            daily_low,
            daily_close,
            previous_close,
            true_range,
            average_true_range_14,
            average_true_range_20,
            volatility_rank_20,
            volatility_rank_50,
            risk_regime
        FROM market_breadth_daily 
        WHERE date >= date('now', '-{} days') 
        AND true_range IS NOT NULL
        ORDER BY date DESC
        """.format(days)
        
        return self.db.execute_query(query)
    
    def get_breadth_indicators_for_date(self, target_date: Union[str, date]) -> Optional[Dict[str, Any]]:
        """
        Get all breadth indicators for a specific date
        
        Args:
            target_date: Target date as string (YYYY-MM-DD) or date object
            
        Returns:
            Dictionary with breadth indicators or None
        """
        if isinstance(target_date, date):
            target_date = target_date.strftime('%Y-%m-%d')
        
        query = """
        SELECT * FROM market_breadth_daily 
        WHERE date = ?
        """
        
        return self.db.execute_single(query, (target_date,))
    
    def get_regime_analysis(self, days: int = 90) -> List[Dict[str, Any]]:
        """
        Get market regime analysis for risk management
        
        Args:
            days: Number of days to retrieve
            
        Returns:
            List of regime analysis records
        """
        query = """
        SELECT * FROM market_regime_analysis 
        WHERE date >= date('now', '-{} days')
        ORDER BY date DESC
        """.format(days)
        
        return self.db.execute_query(query)
    
    def calculate_atr_percentile(self, current_atr: float, lookback_days: int = 252) -> float:
        """
        Calculate ATR percentile rank for current value
        
        Args:
            current_atr: Current ATR value
            lookback_days: Days to look back for percentile calculation
            
        Returns:
            Percentile rank (0.0 to 100.0)
        """
        query = """
        SELECT 
            COUNT(CASE WHEN average_true_range_14 <= ? THEN 1 END) * 100.0 / COUNT(*) as percentile
        FROM market_breadth_daily 
        WHERE date >= date('now', '-{} days') 
        AND average_true_range_14 IS NOT NULL
        """.format(lookback_days)
        
        result = self.db.execute_single(query, (current_atr,))
        return result['percentile'] if result else 0.0
    
    def get_volatility_context(self, days: int = 20) -> Dict[str, Any]:
        """
        Get volatility context for risk management decisions
        
        Args:
            days: Number of days for context
            
        Returns:
            Dictionary with volatility metrics
        """
        query = """
        SELECT 
            AVG(true_range) as avg_true_range,
            AVG(average_true_range_14) as avg_atr_14,
            AVG(average_true_range_20) as avg_atr_20,
            AVG(volatility_rank_20) as avg_vol_rank_20,
            AVG(volatility_rank_50) as avg_vol_rank_50,
            COUNT(*) as sample_size,
            MAX(date) as latest_date,
            MIN(date) as earliest_date
        FROM market_breadth_daily 
        WHERE date >= date('now', '-{} days')
        AND true_range IS NOT NULL
        """.format(days)
        
        result = self.db.execute_single(query)
        return result if result else {}

class TradingDataQueries:
    """Specialized queries for trading operations and backtesting"""
    
    def __init__(self, db_connection: DatabaseConnection):
        self.db = db_connection
    
    def insert_breadth_data(self, breadth_data: Dict[str, Any]) -> int:
        """
        Insert new market breadth data record
        
        Args:
            breadth_data: Dictionary with breadth indicators
            
        Returns:
            ID of inserted record
        """
        # Build dynamic INSERT query based on provided data
        columns = list(breadth_data.keys())
        placeholders = ', '.join(['?' for _ in columns])
        column_names = ', '.join(columns)
        
        query = f"""
        INSERT INTO market_breadth_daily ({column_names}) 
        VALUES ({placeholders})
        """
        
        values = tuple(breadth_data.values())
        return self.db.execute_write(query, values)
    
    def update_true_range_calculations(self, date_str: str, high: float, low: float, previous_close: float) -> bool:
        """
        Update True Range calculations for a specific date
        
        Args:
            date_str: Date string (YYYY-MM-DD)
            high: Daily high price
            low: Daily low price
            previous_close: Previous day's closing price
            
        Returns:
            Success status
        """
        try:
            # Calculate True Range components
            hl_range = high - low
            hc_range = abs(high - previous_close)
            lc_range = abs(low - previous_close)
            true_range = max(hl_range, hc_range, lc_range)
            
            query = """
            UPDATE market_breadth_daily 
            SET 
                daily_high = ?,
                daily_low = ?,
                previous_close = ?,
                true_range = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE date = ?
            """
            
            affected_rows = self.db.execute_write(
                query, 
                (high, low, previous_close, true_range, date_str)
            )
            
            return affected_rows > 0
            
        except Exception as e:
            logger.error(f"Error updating True Range for {date_str}: {str(e)}")
            return False
    
    def bulk_insert_price_history(self, price_data: List[Dict[str, Any]]) -> int:
        """
        Bulk insert price history data
        
        Args:
            price_data: List of price data dictionaries
            
        Returns:
            Number of records inserted
        """
        if not price_data:
            return 0
        
        query = """
        INSERT OR REPLACE INTO market_price_history 
        (date, symbol, open_price, high_price, low_price, close_price, volume, true_range) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        values_list = []
        for data in price_data:
            # Calculate True Range if not provided
            true_range = data.get('true_range')
            if true_range is None and all(k in data for k in ['high_price', 'low_price', 'previous_close']):
                high = data['high_price']
                low = data['low_price']
                prev_close = data['previous_close']
                
                hl = high - low
                hc = abs(high - prev_close)
                lc = abs(low - prev_close)
                true_range = max(hl, hc, lc)
            
            values_list.append((
                data['date'],
                data.get('symbol', 'SPY'),
                data.get('open_price'),
                data['high_price'],
                data['low_price'],
                data['close_price'],
                data.get('volume'),
                true_range
            ))
        
        return self.db.execute_many(query, values_list)
    
    def log_data_import(self, filename: str, import_type: str, records_processed: int, 
                       records_imported: int, records_failed: int, 
                       date_range_start: str = None, date_range_end: str = None,
                       error_log: str = None) -> int:
        """
        Log data import operation
        
        Args:
            filename: Name of imported file
            import_type: Type of import (csv, ocr, manual, api)
            records_processed: Number of records processed
            records_imported: Number of records successfully imported
            records_failed: Number of failed records
            date_range_start: Start date of imported data
            date_range_end: End date of imported data
            error_log: Error messages if any
            
        Returns:
            ID of log record
        """
        query = """
        INSERT INTO data_import_log 
        (filename, import_type, records_processed, records_imported, records_failed,
         date_range_start, date_range_end, error_log, status, completed_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
        """
        
        return self.db.execute_write(query, (
            filename, import_type, records_processed, records_imported, records_failed,
            date_range_start, date_range_end, error_log
        ))

# Global database instance (lazy initialization)
_db_connection: Optional[DatabaseConnection] = None
_breadth_queries: Optional[MarketBreadthQueries] = None
_trading_queries: Optional[TradingDataQueries] = None

def get_database() -> DatabaseConnection:
    """Get global database connection instance"""
    global _db_connection
    if _db_connection is None:
        _db_connection = DatabaseConnection()
    return _db_connection

def get_breadth_queries() -> MarketBreadthQueries:
    """Get market breadth queries instance"""
    global _breadth_queries
    if _breadth_queries is None:
        _breadth_queries = MarketBreadthQueries(get_database())
    return _breadth_queries

def get_trading_queries() -> TradingDataQueries:
    """Get trading queries instance"""
    global _trading_queries
    if _trading_queries is None:
        _trading_queries = TradingDataQueries(get_database())
    return _trading_queries

# Export main components
__all__ = [
    'DatabaseConnection',
    'MarketBreadthQueries', 
    'TradingDataQueries',
    'get_database',
    'get_breadth_queries',
    'get_trading_queries'
]