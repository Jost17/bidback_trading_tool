# Tech Stack Documentation

## Overview
This document provides a comprehensive reference for all technologies used in the trading tool application, including installation, configuration, and best practices.

## Architecture Layers

### 1. Frontend (React + TypeScript)
- **UI Framework**: React 18.3.x with TypeScript 5.x (strict mode)
- **Component Library**: Shadcn/ui with Tailwind CSS 3.4.x
- **Styling**: Tailwind CSS 3.4.x (utility-first CSS)
- **Data Visualization**: Recharts 2.x (market breadth charts, P&L visualization)
- **Form Management**: React Hook Form 7.x with Zod 3.x validation
- **Trading Features**: Market breadth analysis, trade documentation, position sizing

### 2. Desktop Application (Electron)
- **Framework**: Electron 28.x (main/renderer process architecture)
- **Local Database**: SQLite3 5.x with better-sqlite3 9.x driver
- **Preferences**: electron-store 5.x (user settings)
- **Auto-updates**: electron-updater 6.x (seamless updates)
- **Data Storage**: Embedded SQLite database in userData directory
- **Backup System**: Automated local backups + cloud sync (Dropbox SDK 10.x)

### 3. Backend Services (Node.js)
- **Runtime**: Node.js 20.x LTS
- **IPC Bridge**: Express 4.x (Electron main process communication)
- **Task Scheduling**: node-cron 3.x (automated backups, data maintenance)
- **Database Operations**: Direct SQLite access via better-sqlite3
- **Data Persistence**: Manual entry with comprehensive validation

### 4. IB Integration (Python) - Phase 2
- **Language**: Python 3.11+
- **IB API**: ib_insync 0.9.x (Interactive Brokers integration)
- **API Framework**: FastAPI 0.104.x (REST API service)
- **Real-time**: asyncio/websockets (live market data)
- **Integration**: Prepared infrastructure for automated trade execution
- **Current State**: Manual entry system (Phase 1), IB integration ready (Phase 2)

## Quick Start

### Development Setup
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Start development environment
npm run dev
```

### Build Commands
```bash
# Build frontend
npm run build:frontend

# Build Electron app
npm run build:electron

# Package for distribution
npm run dist
```

## Core Application Features

### Trading Management
- **Market Breadth Analysis**: 6-factor breadth calculator (VIX, TICK, TRIN, A/D Line, McClellan, High-Low %)
- **Trade Documentation**: Comprehensive trade logging matching TJS_Elite Excel functionality
- **Position Sizing**: Margin account calculations with risk management
- **P&L Tracking**: Real-time profit/loss analysis with visual charts
- **Account Management**: Multi-account support with buying power tracking

### User Interface (Shadcn/ui)
- **Component System**: Professional trading interface with consistent design
- **Data Tables**: Sortable, filterable trade logs and market data displays
- **Charts**: Interactive market breadth and performance visualizations
- **Forms**: Validated trade entry with real-time calculations
- **Themes**: Dark/light mode optimized for extended trading sessions

## Technology Details

Each technology has its own detailed documentation:
- [Frontend Stack](./frontend-stack.md) - React, TypeScript, Shadcn/ui, Recharts
- [Desktop Layer](./desktop-layer.md) - Electron, SQLite, auto-updates
- [Backend Services](./backend-services.md) - Node.js, Express, scheduled tasks
- [IB Integration](./ib-integration.md) - Python FastAPI, ib_insync

## Development Workflow

### 1. Frontend Development
- Hot reload enabled with Vite
- TypeScript strict mode for type safety
- Tailwind JIT for instant style updates

### 2. Electron Development
- Main/Renderer process separation
- IPC communication patterns
- Security best practices

### 3. Backend Development
- Express middleware pipeline
- SQLite database migrations
- Scheduled task management

### 4. IB Integration
- Async event handling
- WebSocket connections
- Real-time data streaming

## Project Structure
```
bidback_trading_tool/
├── src/
│   ├── frontend/          # React application with Shadcn/ui
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Trading screens and views
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Helper functions
│   ├── electron/          # Electron main process
│   │   ├── main.ts        # Application entry point
│   │   ├── database/      # SQLite schema and operations
│   │   └── ipc/           # Inter-process communication
│   ├── backend/           # Node.js services
│   │   ├── services/      # Business logic
│   │   ├── schedulers/    # Automated tasks
│   │   └── utils/         # Backend utilities
│   └── ib-gateway/        # Python IB integration (Phase 2)
│       ├── api/           # FastAPI endpoints
│       ├── brokers/       # IB connection management
│       └── websockets/    # Real-time data streaming
├── docs/                  # Comprehensive documentation
├── dist/                  # Build output
├── database/              # SQLite database files
└── backups/               # Automated backup storage
```

## System Capabilities

### Current Implementation (Phase 1)
- ✅ Manual trade entry and documentation
- ✅ Market breadth analysis with 6-factor calculator
- ✅ Position sizing for margin accounts
- ✅ SQLite persistence with automated backups
- ✅ Professional UI with Shadcn/ui components
- ✅ Multi-account management
- ✅ Comprehensive trade logging

### Future Implementation (Phase 2)
- 🔄 Interactive Brokers API integration
- 🔄 Real-time market data streaming
- 🔄 Automated trade execution
- 🔄 Live portfolio synchronization
- 🔄 Advanced risk management alerts