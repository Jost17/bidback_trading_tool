#!/bin/bash

# Stockbee Market Monitor - Quick Start Script
echo "🚀 Starting Stockbee Market Monitor..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the frontend directory."
    echo "   cd /Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/breadth_score_tool/frontend"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if backend is running
echo "🔍 Checking backend connection..."
if curl -s http://localhost:3001/api/current-status > /dev/null; then
    echo "✅ Backend is running at http://localhost:3001"
else
    echo "⚠️  Backend not detected at http://localhost:3001"
    echo "   Please start the backend first:"
    echo "   cd ../backend && npm run dev"
    echo ""
fi

echo "🎯 Starting frontend development server..."
echo "📱 Dashboard will be available at: http://localhost:5174"
echo ""
echo "🔧 Available commands:"
echo "   npm run dev     - Start development server"
echo "   npm run build   - Build for production"
echo "   npm run preview - Preview production build"
echo ""

# Start the development server
npm run dev
