#!/usr/bin/env python3
"""
Test script to initialize the BIDBACK Trading Tool database
"""

import sys
import os
from pathlib import Path

# Add src directory to Python path
current_dir = Path(__file__).parent
src_dir = current_dir / "src"
sys.path.insert(0, str(src_dir))

try:
    from database.init_database import DatabaseInitializer
    from database.connection import get_database, get_breadth_queries
    from database.validation import BreadthDataValidator
    
    print("🚀 Initializing BIDBACK Trading Tool Database...")
    print("=" * 60)
    
    # Initialize database
    db_init = DatabaseInitializer()
    
    print(f"📁 Database Path: {db_init.db_path}")
    print(f"📄 Schema Path: {db_init.schema_path}")
    
    # Create database
    success = db_init.create_database(force_recreate=False)
    
    if success:
        print("\n✅ Database created successfully!")
        
        # Get database information
        info = db_init.get_database_info()
        print(f"\n📊 Database Information:")
        print(f"   Size: {info.get('database_size_mb', 0):.2f} MB")
        print(f"   Tables Created: {len(info.get('tables', []))}")
        
        print(f"\n📋 Tables:")
        for table in info.get('tables', []):
            print(f"   • {table['name']}: {table['records']} records, {table['indexes']} indexes")
        
        # Optimize database
        print(f"\n🔧 Optimizing database...")
        if db_init.optimize_database():
            print("✅ Database optimized successfully")
        
        # Test database connection
        print(f"\n🔗 Testing database connection...")
        try:
            db = get_database()
            breadth_queries = get_breadth_queries()
            print("✅ Database connection successful")
            
            # Test a simple query
            result = db.execute_query("SELECT name FROM sqlite_master WHERE type='table' LIMIT 5")
            print(f"✅ Query test successful - found {len(result)} tables")
            
        except Exception as e:
            print(f"❌ Database connection test failed: {str(e)}")
        
        # Test validation
        print(f"\n🔍 Testing data validation...")
        test_record = {
            'date': '2024-01-15',
            'stocks_up_4pct_daily': 150,
            'stocks_down_4pct_daily': 85,
            'ratio_5day': 1.25,
            't2108': 45.6,
            'daily_high': 4850.25,
            'daily_low': 4825.10,
            'previous_close': 4840.00
        }
        
        is_valid, errors, validated = BreadthDataValidator.validate_breadth_record(test_record)
        if is_valid:
            print("✅ Data validation test successful")
            print(f"   Validated fields: {len(validated)}")
            if 'true_range' in validated:
                print(f"   True Range calculated: {validated['true_range']}")
        else:
            print(f"❌ Data validation test failed: {errors}")
        
        print(f"\n🎉 Database setup completed successfully!")
        print(f"   Ready for CSV data migration and Python backend integration")
        
    else:
        print("❌ Database creation failed")
        sys.exit(1)
        
except ImportError as e:
    print(f"❌ Import error: {str(e)}")
    print("Please ensure all required modules are available")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {str(e)}")
    sys.exit(1)