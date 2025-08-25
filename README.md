# BIDBACK Trading Tool

Tool for a complete automatization of my trading

A professional-grade desktop trading management system built on Electron with SQLite, designed for systematic traders utilizing market breadth analysis.

## 🎯 Overview

The BIDBACK Trading Tool combines comprehensive trade documentation capabilities with a sophisticated 6-factor market breadth calculator, margin account position sizing, and prepared infrastructure for Interactive Brokers integration.

## 🚀 Features

### Market Breadth Analysis
- **6-Factor Breadth Calculator**: VIX, TICK, TRIN, A/D Line, McClellan, High-Low %
- **Historical Data**: 2007-2025 market data pre-loaded
- **Interactive Charts**: Real-time visualization with Recharts
- **Manual & CSV Data Entry**: Flexible data input options

### Trade Journaling System
- **TJS_Elite Inspired**: Professional trade documentation
- **Position Sizing Calculator**: Margin account optimized
- **P&L Tracking**: Comprehensive performance analytics
- **Risk Management**: Built-in risk assessment tools

### Desktop Application
- **Electron-based**: Native desktop performance
- **SQLite Database**: Local data persistence
- **Dark/Light Themes**: Optimized for extended trading sessions
- **Auto-Updates**: Seamless application updates

## 🛠️ Technology Stack

- **Frontend**: React 18.3.x, TypeScript 5.x, Shadcn/ui
- **Desktop**: Electron 28.x
- **Database**: SQLite3 with better-sqlite3
- **Backend**: Node.js 20.x LTS, Express 4.x
- **IB Integration** (Phase 2): Python 3.11+, ib_insync, FastAPI
- **Charts**: Recharts 2.x

## 📁 Project Structure

```
bidback_trading_tool/
├── docs/                  # Documentation
│   ├── BIDBACK_TRADING_TOOL_SYSTEM_PROMPT.md
│   ├── breadth_score_tool/   # Existing breadth tool
│   ├── live_trading/         # IB integration modules
│   └── market_breadth/       # Market breadth components
├── source/               # Historical data (CSV)
├── CLAUDE.md            # Implementation plan
└── README.md           # This file
```

## 🚦 Getting Started

### Prerequisites
- Node.js 20.x LTS
- Python 3.11+ (for IB integration)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Jost17/bidback_trading_tool.git
cd bidback_trading_tool

# Install dependencies (coming soon)
npm install

# Start development environment (coming soon)
npm run dev
```

## 📋 Development Roadmap

See [CLAUDE.md](CLAUDE.md) for the complete implementation plan with phases, agents, and deliverables.

### Current Status: Planning Phase
- ✅ Project structure defined
- ✅ Technology stack selected
- ✅ GitHub repository created
- ⏳ Phase 1: Electron setup (starting soon)

## 📚 Documentation

Comprehensive documentation will be provided for:
- Technical Architecture
- API Documentation
- User Manual
- Developer Setup Guide
- IB Integration Guide

## 🤝 Contributing

This project is currently in initial development. Contribution guidelines will be established soon.

## 📄 License

License information will be added soon.

## 👤 Author

Jost Thedens

---

**Note**: This project is actively under development. Features and documentation will be continuously updated.