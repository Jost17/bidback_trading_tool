#!/bin/bash

echo "🚀 Running BIDBACK Trading Tool Database Setup Test"
echo "=================================================="

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3."
    exit 1
fi

# Check Python version
python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
echo "🐍 Python version: $python_version"

# Run the test script
echo ""
echo "🔄 Running database setup test..."
python3 test_database_setup.py

echo ""
echo "✅ Database setup test completed"