#!/usr/bin/env python3
"""
SQLite Database Initialization for BIDBACK Trading Tool
Creates the trading database with extended market breadth schema including High/Low data
"""

import sqlite3
import os
from pathlib import Path
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseInitializer:
    """Initialize SQLite database for trading application"""
    
    def __init__(self, db_path: str = None):
        """
        Initialize database connection
        
        Args:
            db_path: Path to SQLite database file. Defaults to src/database/trading.db
        """
        if db_path is None:
            self.db_path = Path(__file__).parent / "trading.db"
        else:
            self.db_path = Path(db_path)
        
        # Ensure database directory exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Schema file path
        self.schema_path = Path(__file__).parent / "schema.sql"
        
    def create_database(self, force_recreate: bool = False) -> bool:
        """
        Create database with full schema
        
        Args:
            force_recreate: If True, delete existing database and recreate
            
        Returns:
            bool: Success status
        """
        try:
            # Remove existing database if force_recreate
            if force_recreate and self.db_path.exists():
                logger.info(f"Removing existing database: {self.db_path}")
                self.db_path.unlink()
            
            # Check if database already exists
            if self.db_path.exists() and not force_recreate:
                logger.info(f"Database already exists: {self.db_path}")
                return self._verify_schema()
            
            # Read schema file
            if not self.schema_path.exists():
                logger.error(f"Schema file not found: {self.schema_path}")
                return False
            
            with open(self.schema_path, 'r') as f:
                schema_sql = f.read()
            
            # Create database and execute schema
            logger.info(f"Creating database: {self.db_path}")
            with sqlite3.connect(self.db_path) as conn:
                # Enable foreign keys
                conn.execute("PRAGMA foreign_keys = ON")
                
                # Execute schema
                conn.executescript(schema_sql)
                conn.commit()
                
                logger.info("Database schema created successfully")
                
            # Verify schema was created correctly
            return self._verify_schema()
            
        except Exception as e:
            logger.error(f"Error creating database: {str(e)}")
            return False
    
    def _verify_schema(self) -> bool:
        """Verify that all required tables exist"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check for main tables
                required_tables = [
                    'market_breadth_daily',
                    'market_price_history',
                    'market_breadth_custom_columns',
                    'market_breadth_custom_values',
                    'data_import_log',
                    'market_breadth_signals',
                    'market_regime_analysis'
                ]
                
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name NOT LIKE 'sqlite_%'
                """)
                
                existing_tables = [row[0] for row in cursor.fetchall()]
                logger.info(f"Existing tables: {existing_tables}")
                
                # Check if all required tables exist
                missing_tables = set(required_tables) - set(existing_tables)
                if missing_tables:
                    logger.error(f"Missing tables: {missing_tables}")
                    return False
                
                # Check for required views
                cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='view'
                """)
                
                existing_views = [row[0] for row in cursor.fetchall()]
                logger.info(f"Existing views: {existing_views}")
                
                required_views = [
                    'v_latest_market_breadth',
                    'v_primary_indicators_status',
                    'v_risk_management_data'
                ]
                
                missing_views = set(required_views) - set(existing_views)
                if missing_views:
                    logger.error(f"Missing views: {missing_views}")
                    return False
                
                logger.info("Database schema verification successful")
                return True
                
        except Exception as e:
            logger.error(f"Error verifying schema: {str(e)}")
            return False
    
    def get_database_info(self) -> dict:
        """Get information about the database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get database size
                db_size = self.db_path.stat().st_size if self.db_path.exists() else 0
                
                # Get table information
                cursor.execute("""
                    SELECT 
                        name as table_name,
                        (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as index_count
                    FROM sqlite_master m
                    WHERE type='table' AND name NOT LIKE 'sqlite_%'
                    ORDER BY name
                """)
                
                tables = cursor.fetchall()
                
                # Get record counts
                table_counts = {}
                for table_name, _ in tables:
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                        count = cursor.fetchone()[0]
                        table_counts[table_name] = count
                    except Exception:
                        table_counts[table_name] = 'Error'
                
                return {
                    'database_path': str(self.db_path),
                    'database_size_bytes': db_size,
                    'database_size_mb': round(db_size / (1024 * 1024), 2),
                    'tables': [{'name': name, 'indexes': idx_count, 'records': table_counts.get(name, 0)} 
                              for name, idx_count in tables],
                    'created_at': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error getting database info: {str(e)}")
            return {}
    
    def optimize_database(self) -> bool:
        """Optimize database for performance"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                logger.info("Optimizing database...")
                
                # Analyze tables for query optimization
                conn.execute("ANALYZE")
                
                # Vacuum to reclaim space
                conn.execute("VACUUM")
                
                # Set performance pragmas
                performance_settings = [
                    ("journal_mode", "WAL"),  # Write-Ahead Logging for better concurrency
                    ("synchronous", "NORMAL"),  # Balance between safety and speed
                    ("cache_size", "-64000"),  # 64MB cache
                    ("temp_store", "MEMORY"),  # Store temp tables in memory
                    ("mmap_size", "268435456"),  # 256MB memory map
                ]
                
                for pragma, value in performance_settings:
                    conn.execute(f"PRAGMA {pragma} = {value}")
                
                logger.info("Database optimization completed")
                return True
                
        except Exception as e:
            logger.error(f"Error optimizing database: {str(e)}")
            return False

def main():
    """Main function for command-line usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Initialize BIDBACK Trading Database")
    parser.add_argument("--db-path", help="Path to database file")
    parser.add_argument("--force", action="store_true", help="Force recreation of database")
    parser.add_argument("--info", action="store_true", help="Show database information")
    parser.add_argument("--optimize", action="store_true", help="Optimize database")
    
    args = parser.parse_args()
    
    # Initialize database
    db_init = DatabaseInitializer(args.db_path)
    
    if args.info:
        # Show database info
        info = db_init.get_database_info()
        print(f"\nDatabase Information:")
        print(f"Path: {info.get('database_path', 'N/A')}")
        print(f"Size: {info.get('database_size_mb', 0)} MB")
        print(f"\nTables:")
        for table in info.get('tables', []):
            print(f"  {table['name']}: {table['records']} records, {table['indexes']} indexes")
        return
    
    # Create database
    success = db_init.create_database(force_recreate=args.force)
    if success:
        print(f"✅ Database created successfully: {db_init.db_path}")
        
        # Optimize if requested
        if args.optimize:
            if db_init.optimize_database():
                print("✅ Database optimized successfully")
            else:
                print("❌ Database optimization failed")
        
        # Show info
        info = db_init.get_database_info()
        print(f"\nDatabase created with {len(info.get('tables', []))} tables")
        
    else:
        print(f"❌ Database creation failed")
        exit(1)

if __name__ == "__main__":
    main()