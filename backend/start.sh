#!/bin/bash

# BIDBACK Trading Tool - Backend Startup Script
# Starts the FastAPI server on port 3001

echo "🚀 Starting BIDBACK Trading Tool Backend..."
echo "================================================"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup first:"
    echo "   python3 -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
echo "Checking dependencies..."
python -c "import fastapi, uvicorn" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Dependencies not installed. Installing now..."
    pip install -r requirements.txt
fi

# Create necessary directories
echo "Setting up directories..."
mkdir -p reports
mkdir -p logs

# Start the server
echo "🌟 Starting FastAPI server on http://localhost:3001"
echo "📚 API Documentation: http://localhost:3001/docs"
echo "🏥 Health Check: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================================"

python main.py