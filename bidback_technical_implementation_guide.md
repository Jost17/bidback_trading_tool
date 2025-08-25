# BIDBACK Trading Tool - Technische Implementierungsanleitung

*Basierend auf CLAUDE.md und technischen Dokumentationen via Context7*

## 📋 Projektübersicht

Das BIDBACK Trading Tool ist eine professionelle Desktop-Trading-Management-Anwendung, die Market Breadth Analysis, Trade Journaling und Interactive Brokers Integration in einer einheitlichen Electron-Anwendung vereint.

## 🛠 Technologie-Stack

### Frontend & Desktop
- **Framework:** Electron 28.x
- **UI Library:** React 18.3.x
- **TypeScript:** 5.x (strict mode)
- **UI Components:** Shadcn/ui
- **Charts:** Recharts 2.x
- **Forms:** React Hook Form 7.x mit Zod 3.x

### Backend & Database
- **Runtime:** Node.js 20.x LTS
- **Web Framework:** Express 4.x
- **Database:** SQLite3 5.x mit better-sqlite3 9.x
- **IB Integration:** Python 3.11+, ib_insync 0.9.x, FastAPI 0.104.x

## 🏗 Architektur-Übersicht

### Electron Main/Renderer Prozess Architektur

```typescript
// Main Process (main.ts)
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  })
  
  // IPC Handler für Trading-Daten
  ipcMain.handle('trading:get-breadth-data', handleGetBreadthData)
  ipcMain.handle('trading:save-trade', handleSaveTrade)
  ipcMain.handle('ib:connect', handleIBConnect)
  
  mainWindow.loadFile('index.html')
}
```

### IPC Kommunikation Pattern

```typescript
// preload.ts - Sichere API-Exposition
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('tradingAPI', {
  // Market Breadth API
  getBreadthData: () => ipcRenderer.invoke('trading:get-breadth-data'),
  saveBreadthData: (data: BreadthData) => 
    ipcRenderer.invoke('trading:save-breadth-data', data),
  
  // Trade Journaling API
  saveTrade: (trade: Trade) => ipcRenderer.invoke('trading:save-trade', trade),
  getTrades: (filters: TradeFilters) => 
    ipcRenderer.invoke('trading:get-trades', filters),
  
  // IB Integration API
  connectIB: () => ipcRenderer.invoke('ib:connect'),
  placeOrder: (order: IBOrder) => ipcRenderer.invoke('ib:place-order', order)
})
```

## 🗃 SQLite Schema Design

### Market Breadth Tables

```sql
-- Market Breadth Score History
CREATE TABLE market_breadth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  
  -- 6-Faktor Breadth Score Komponenten
  advancing_issues INTEGER,
  declining_issues INTEGER,
  new_highs INTEGER,
  new_lows INTEGER,
  up_volume REAL,
  down_volume REAL,
  
  -- Berechnete Scores
  breadth_score REAL NOT NULL,
  trend_strength REAL,
  market_phase TEXT,
  
  -- Metadaten
  data_source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(date, timestamp)
);

-- Market Indices Data
CREATE TABLE market_indices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  symbol TEXT NOT NULL,
  price REAL NOT NULL,
  change_percent REAL,
  volume INTEGER,
  
  -- Technische Indikatoren
  ma_20 REAL,
  ma_50 REAL,
  ma_200 REAL,
  rsi REAL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(date, symbol)
);
```

### Trade Journaling Tables

```sql
-- Trade Records (TJS_Elite inspiriert)
CREATE TABLE trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id TEXT UNIQUE NOT NULL,
  
  -- Trade Basics
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK(side IN ('BUY', 'SELL')),
  quantity INTEGER NOT NULL,
  entry_price REAL NOT NULL,
  exit_price REAL,
  
  -- Timestamps
  entry_datetime DATETIME NOT NULL,
  exit_datetime DATETIME,
  
  -- P&L Calculation
  gross_pnl REAL,
  commission REAL DEFAULT 0,
  net_pnl REAL,
  
  -- Risk Management
  position_size_percent REAL,
  risk_amount REAL,
  stop_loss REAL,
  target_price REAL,
  
  -- Account Context
  account_type TEXT CHECK(account_type IN ('CASH', 'MARGIN')),
  account_balance REAL,
  
  -- Trade Analysis
  setup_type TEXT,
  strategy TEXT,
  trade_notes TEXT,
  outcome_analysis TEXT,
  
  -- Market Context
  market_breadth_score REAL,
  spy_price REAL,
  vix_level REAL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Account Performance Tracking
CREATE TABLE account_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  account_balance REAL NOT NULL,
  cash_balance REAL NOT NULL,
  margin_used REAL DEFAULT 0,
  buying_power REAL NOT NULL,
  day_pnl REAL DEFAULT 0,
  total_pnl REAL DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date)
);
```

## ⚡ Better-SQLite3 Integration

### Database Setup und Konfiguration

```typescript
// database/connection.ts
import Database from 'better-sqlite3'
import path from 'path'

export class TradingDatabase {
  private db: Database.Database
  
  constructor(dbPath?: string) {
    const dbFile = dbPath || path.join(process.cwd(), 'trading.db')
    this.db = new Database(dbFile)
    
    // Performance Optimierung
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('cache_size = 32000')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('synchronous = NORMAL')
    
    this.initializeSchema()
  }
  
  private initializeSchema() {
    const migration = `
      CREATE TABLE IF NOT EXISTS market_breadth (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        breadth_score REAL NOT NULL,
        -- ... weitere Felder
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_market_breadth_date 
      ON market_breadth(date);
    `
    
    this.db.exec(migration)
  }
}
```

### Prepared Statements für Performance

```typescript
// database/breadth-service.ts
export class BreadthService {
  private insertBreadth: Database.Statement
  private getBreadthByDate: Database.Statement
  
  constructor(private db: Database.Database) {
    // Prepared Statements für bessere Performance
    this.insertBreadth = db.prepare(`
      INSERT INTO market_breadth (
        date, breadth_score, advancing_issues, declining_issues,
        new_highs, new_lows, up_volume, down_volume
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    this.getBreadthByDate = db.prepare(`
      SELECT * FROM market_breadth 
      WHERE date BETWEEN ? AND ? 
      ORDER BY date DESC
    `)
  }
  
  saveBreadthData(data: BreadthData): void {
    const info = this.insertBreadth.run(
      data.date,
      data.breadthScore,
      data.advancingIssues,
      data.decliningIssues,
      data.newHighs,
      data.newLows,
      data.upVolume,
      data.downVolume
    )
    
    console.log(`Inserted breadth data, rowid: ${info.lastInsertRowid}`)
  }
  
  getBreadthHistory(startDate: string, endDate: string): BreadthData[] {
    return this.getBreadthByDate.all(startDate, endDate) as BreadthData[]
  }
}
```

### Transaction Management

```typescript
// database/trade-service.ts
export class TradeService {
  private saveTrade: Database.Statement
  private updateAccount: Database.Statement
  private saveTradeWithAccount: Database.Transaction
  
  constructor(private db: Database.Database) {
    this.saveTrade = db.prepare(`
      INSERT INTO trades (
        trade_id, symbol, side, quantity, entry_price,
        entry_datetime, account_balance, net_pnl
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    this.updateAccount = db.prepare(`
      UPDATE account_snapshots 
      SET account_balance = account_balance + ?, day_pnl = day_pnl + ?
      WHERE date = ?
    `)
    
    // Transaction für atomare Trade + Account Updates
    this.saveTradeWithAccount = db.transaction((trade: Trade) => {
      // Trade speichern
      const tradeInfo = this.saveTrade.run(
        trade.tradeId,
        trade.symbol,
        trade.side,
        trade.quantity,
        trade.entryPrice,
        trade.entryDatetime,
        trade.accountBalance,
        trade.netPnl
      )
      
      // Account Balance aktualisieren
      this.updateAccount.run(
        trade.netPnl,
        trade.netPnl,
        trade.entryDatetime.split('T')[0]
      )
      
      return tradeInfo.lastInsertRowid
    })
  }
  
  saveCompleteTradeEntry(trade: Trade): number {
    return this.saveTradeWithAccount(trade)
  }
}
```

## 🎨 React + TypeScript Frontend

### Strict Mode TypeScript Konfiguration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  },
  "include": [
    "src"
  ]
}
```

### Interface Definitionen

```typescript
// types/trading.ts
export interface BreadthData {
  id?: number
  date: string
  timestamp: string
  advancingIssues: number
  decliningIssues: number
  newHighs: number
  newLows: number
  upVolume: number
  downVolume: number
  breadthScore: number
  trendStrength?: number
  marketPhase?: string
  dataSource: 'manual' | 'imported' | 'api'
  notes?: string
}

export interface Trade {
  id?: number
  tradeId: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  entryPrice: number
  exitPrice?: number
  entryDatetime: string
  exitDatetime?: string
  grossPnl?: number
  commission: number
  netPnl?: number
  positionSizePercent?: number
  riskAmount?: number
  stopLoss?: number
  targetPrice?: number
  accountType: 'CASH' | 'MARGIN'
  accountBalance: number
  setupType?: string
  strategy?: string
  tradeNotes?: string
  outcomeAnalysis?: string
  marketBreadthScore?: number
  spyPrice?: number
  vixLevel?: number
}

export interface TradeFilters {
  symbol?: string
  startDate?: string
  endDate?: string
  strategy?: string
  minPnl?: number
  maxPnl?: number
}
```

### React Hooks für Trading Logic

```typescript
// hooks/useMarketBreadth.ts
import { useState, useEffect, useCallback } from 'react'

export interface BreadthCalculation {
  breadthScore: number
  trendStrength: number
  marketPhase: string
}

export function useMarketBreadth() {
  const [breadthData, setBreadthData] = useState<BreadthData[]>([])
  const [loading, setLoading] = useState(false)
  
  const calculateBreadthScore = useCallback((data: Partial<BreadthData>): BreadthCalculation => {
    const { advancingIssues = 0, decliningIssues = 0, newHighs = 0, newLows = 0 } = data
    
    // 6-Faktor Breadth Score Berechnung
    const advanceDeclineRatio = advancingIssues / (decliningIssues || 1)
    const newHighLowRatio = newHighs / (newLows || 1)
    
    // Normalisierte Score Berechnung (0-100)
    const breadthScore = Math.min(100, Math.max(0, 
      (advanceDeclineRatio * 30) + (newHighLowRatio * 20) + 
      ((advancingIssues / 3000) * 50) // Annahme: 3000 als Maximum
    ))
    
    // Trend Strength basierend auf Konsistenz
    const trendStrength = Math.abs(50 - breadthScore) * 2
    
    // Market Phase Klassifikation
    let marketPhase = 'NEUTRAL'
    if (breadthScore > 70) marketPhase = 'STRONG_BULL'
    else if (breadthScore > 55) marketPhase = 'BULL'
    else if (breadthScore < 30) marketPhase = 'STRONG_BEAR'
    else if (breadthScore < 45) marketPhase = 'BEAR'
    
    return { breadthScore, trendStrength, marketPhase }
  }, [])
  
  const saveBreadthData = useCallback(async (data: Partial<BreadthData>) => {
    setLoading(true)
    try {
      const calculation = calculateBreadthScore(data)
      const completeData: BreadthData = {
        ...data,
        ...calculation,
        date: data.date || new Date().toISOString().split('T')[0],
        timestamp: data.timestamp || new Date().toISOString(),
        dataSource: data.dataSource || 'manual'
      } as BreadthData
      
      await window.tradingAPI.saveBreadthData(completeData)
      
      // Aktualisiere lokale Daten
      setBreadthData(prev => [completeData, ...prev])
    } catch (error) {
      console.error('Failed to save breadth data:', error)
    } finally {
      setLoading(false)
    }
  }, [calculateBreadthScore])
  
  const loadBreadthHistory = useCallback(async (days: number = 30) => {
    setLoading(true)
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]
      
      const data = await window.tradingAPI.getBreadthData(startDate, endDate)
      setBreadthData(data)
    } catch (error) {
      console.error('Failed to load breadth history:', error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  return {
    breadthData,
    loading,
    calculateBreadthScore,
    saveBreadthData,
    loadBreadthHistory
  }
}
```

### React Component mit Recharts

```typescript
// components/MarketBreadthChart.tsx
import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MarketBreadthChartProps {
  data: BreadthData[]
  height?: number
}

export const MarketBreadthChart: React.FC<MarketBreadthChartProps> = ({ 
  data, 
  height = 400 
}) => {
  const chartData = data.map(item => ({
    date: item.date,
    breadthScore: item.breadthScore,
    trendStrength: item.trendStrength,
    advancingIssues: item.advancingIssues,
    decliningIssues: item.decliningIssues
  }))
  
  return (
    <div className="w-full bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Market Breadth Score History</h3>
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              value.toFixed(2), 
              name === 'breadthScore' ? 'Breadth Score' : 'Trend Strength'
            ]}
            labelFormatter={(label: string) => `Date: ${label}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="breadthScore" 
            stroke="#2563eb" 
            strokeWidth={2}
            name="Breadth Score"
            dot={{ r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="trendStrength" 
            stroke="#dc2626" 
            strokeWidth={1}
            name="Trend Strength"
            dot={{ r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Market Phase Indicator */}
      <div className="mt-4 flex justify-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-sm">Strong Bull (>70)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-sm">Bull (55-70)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span className="text-sm">Neutral (45-55)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
            <span className="text-sm">Bear (30-45)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm">Strong Bear (<30)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## 🎯 Shadcn/ui Integration

### UI Component Setup

```json
// components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### Trading Form mit React Hook Form + Zod

```typescript
// components/TradeEntryForm.tsx
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

const tradeSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(10),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive('Quantity must be positive'),
  entryPrice: z.number().positive('Entry price must be positive'),
  stopLoss: z.number().positive().optional(),
  targetPrice: z.number().positive().optional(),
  positionSizePercent: z.number().min(0.1).max(100),
  strategy: z.string().optional(),
  tradeNotes: z.string().max(1000).optional()
})

type TradeFormData = z.infer<typeof tradeSchema>

interface TradeEntryFormProps {
  onSubmit: (data: TradeFormData) => Promise<void>
  accountBalance: number
}

export const TradeEntryForm: React.FC<TradeEntryFormProps> = ({ 
  onSubmit, 
  accountBalance 
}) => {
  const form = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      side: 'BUY',
      positionSizePercent: 2.0,
      quantity: 0,
      entryPrice: 0
    }
  })
  
  const calculateRiskAmount = (price: number, quantity: number, stopLoss?: number) => {
    if (!stopLoss || stopLoss === 0) return 0
    return Math.abs((price - stopLoss) * quantity)
  }
  
  const handleSubmit = async (data: TradeFormData) => {
    try {
      const riskAmount = calculateRiskAmount(data.entryPrice, data.quantity, data.stopLoss)
      
      const tradeData: Trade = {
        tradeId: `${data.symbol}-${Date.now()}`,
        ...data,
        entryDatetime: new Date().toISOString(),
        commission: data.quantity * 0.005, // Beispiel Commission
        riskAmount,
        accountType: 'MARGIN',
        accountBalance
      }
      
      await onSubmit(tradeData)
      form.reset()
    } catch (error) {
      console.error('Failed to submit trade:', error)
    }
  }
  
  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Trade Entry</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Symbol und Side */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol</FormLabel>
                  <FormControl>
                    <Input placeholder="AAPL" className="uppercase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="side"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Side</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select side" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BUY">BUY</SelectItem>
                      <SelectItem value="SELL">SELL</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Quantity und Entry Price */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="entryPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entry Price</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Risk Management */}
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="stopLoss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stop Loss</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="targetPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Price</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="positionSizePercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position Size %</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <Button type="submit" className="w-full">
            Enter Trade
          </Button>
        </form>
      </Form>
    </div>
  )
}
```

## 🐍 Interactive Brokers Python Integration

### FastAPI Bridge Service

```python
# ib_service/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ib_insync import IB, Stock, MarketOrder, LimitOrder
import asyncio
from typing import Optional, List
import logging

app = FastAPI(title="BIDBACK IB Bridge", version="1.0.0")
ib = IB()

class IBOrder(BaseModel):
    symbol: str
    action: str  # BUY or SELL
    quantity: int
    orderType: str  # MKT or LMT
    limitPrice: Optional[float] = None

class OrderStatus(BaseModel):
    orderId: int
    status: str
    filled: int
    remaining: int
    avgFillPrice: float

@app.on_event("startup")
async def startup():
    try:
        await ib.connectAsync('127.0.0.1', 7497, clientId=1)
        logging.info("Connected to Interactive Brokers TWS")
    except Exception as e:
        logging.error(f"Failed to connect to IB: {e}")

@app.on_event("shutdown") 
async def shutdown():
    if ib.isConnected():
        ib.disconnect()

@app.post("/connect")
async def connect_ib():
    """Connect to Interactive Brokers TWS"""
    try:
        if not ib.isConnected():
            await ib.connectAsync('127.0.0.1', 7497, clientId=1)
        
        # Get account summary
        account_values = ib.accountSummary()
        
        return {
            "connected": True,
            "account": account_values[0].account if account_values else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/place-order")
async def place_order(order_request: IBOrder):
    """Place order through Interactive Brokers"""
    try:
        if not ib.isConnected():
            raise HTTPException(status_code=400, detail="Not connected to IB")
        
        # Create contract
        contract = Stock(order_request.symbol, 'SMART', 'USD')
        await ib.qualifyContractsAsync(contract)
        
        # Create order
        if order_request.orderType == 'MKT':
            order = MarketOrder(order_request.action, order_request.quantity)
        else:
            if not order_request.limitPrice:
                raise HTTPException(status_code=400, detail="Limit price required for limit orders")
            order = LimitOrder(order_request.action, order_request.quantity, order_request.limitPrice)
        
        # Place order
        trade = ib.placeOrder(contract, order)
        
        return {
            "orderId": trade.order.orderId,
            "status": trade.orderStatus.status,
            "contract": order_request.symbol
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/positions")
async def get_positions():
    """Get current positions"""
    try:
        positions = ib.positions()
        return [
            {
                "symbol": pos.contract.symbol,
                "position": pos.position,
                "avgCost": pos.avgCost,
                "marketPrice": pos.marketPrice,
                "marketValue": pos.marketValue,
                "unrealizedPNL": pos.unrealizedPNL
            }
            for pos in positions
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/account-summary")
async def get_account_summary():
    """Get account summary"""
    try:
        account_values = ib.accountSummary()
        summary = {}
        
        for value in account_values:
            summary[value.tag] = {
                'value': value.value,
                'currency': value.currency
            }
            
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
```

### Node.js IB Bridge Integration

```typescript
// services/ib-bridge.ts
import axios from 'axios'

interface IBConnection {
  connected: boolean
  account?: string
}

interface IBPosition {
  symbol: string
  position: number
  avgCost: number
  marketPrice: number
  marketValue: number
  unrealizedPNL: number
}

export class IBBridgeService {
  private baseUrl = 'http://127.0.0.1:8000'
  
  async connect(): Promise<IBConnection> {
    try {
      const response = await axios.post(`${this.baseUrl}/connect`)
      return response.data
    } catch (error) {
      throw new Error(`IB connection failed: ${error}`)
    }
  }
  
  async placeOrder(order: IBOrder): Promise<{ orderId: number, status: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/place-order`, order)
      return response.data
    } catch (error) {
      throw new Error(`Order placement failed: ${error}`)
    }
  }
  
  async getPositions(): Promise<IBPosition[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/positions`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to get positions: ${error}`)
    }
  }
  
  async getAccountSummary(): Promise<Record<string, any>> {
    try {
      const response = await axios.get(`${this.baseUrl}/account-summary`)
      return response.data
    } catch (error) {
      throw new Error(`Failed to get account summary: ${error}`)
    }
  }
}

// IPC Handler für IB Integration
export function setupIBHandlers(ipcMain: any, db: TradingDatabase) {
  const ibService = new IBBridgeService()
  
  ipcMain.handle('ib:connect', async () => {
    return await ibService.connect()
  })
  
  ipcMain.handle('ib:place-order', async (event: any, order: IBOrder) => {
    const result = await ibService.placeOrder(order)
    
    // Trade in lokaler DB speichern
    const trade: Trade = {
      tradeId: `IB-${result.orderId}`,
      symbol: order.symbol,
      side: order.action as 'BUY' | 'SELL',
      quantity: order.quantity,
      entryPrice: order.limitPrice || 0,
      entryDatetime: new Date().toISOString(),
      accountType: 'MARGIN',
      accountBalance: 0, // Wird später aktualisiert
      commission: 0,
      dataSource: 'ib'
    }
    
    // TODO: Trade in DB speichern
    
    return result
  })
  
  ipcMain.handle('ib:get-positions', async () => {
    return await ibService.getPositions()
  })
}
```

## 📊 Performance Optimierungen

### SQLite Optimierung

```typescript
// database/optimizations.ts
export function optimizeDatabase(db: Database.Database) {
  // WAL Mode für bessere Concurrent Performance
  db.pragma('journal_mode = WAL')
  
  // Cache Size erhöhen
  db.pragma('cache_size = 32000')
  
  // Foreign Keys aktivieren
  db.pragma('foreign_keys = ON')
  
  // Synchronous Mode für bessere Performance
  db.pragma('synchronous = NORMAL')
  
  // Memory-mapped I/O
  db.pragma('mmap_size = 268435456') // 256MB
  
  // Wichtige Indizes erstellen
  const indices = [
    'CREATE INDEX IF NOT EXISTS idx_trades_symbol_date ON trades(symbol, entry_datetime)',
    'CREATE INDEX IF NOT EXISTS idx_breadth_date ON market_breadth(date)',
    'CREATE INDEX IF NOT EXISTS idx_account_date ON account_snapshots(date)'
  ]
  
  indices.forEach(index => db.exec(index))
}
```

### React Performance Optimierungen

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// components/OptimizedTradeList.tsx
import React, { useMemo, useCallback } from 'react'

interface OptimizedTradeListProps {
  trades: Trade[]
  onTradeClick: (trade: Trade) => void
}

export const OptimizedTradeList: React.FC<OptimizedTradeListProps> = ({ 
  trades, 
  onTradeClick 
}) => {
  // Memoize berechnete Werte
  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => 
      new Date(b.entryDatetime).getTime() - new Date(a.entryDatetime).getTime()
    )
  }, [trades])
  
  const totalPnL = useMemo(() => {
    return trades.reduce((sum, trade) => sum + (trade.netPnl || 0), 0)
  }, [trades])
  
  // Memoize Callback Funktionen
  const handleTradeClick = useCallback((trade: Trade) => {
    onTradeClick(trade)
  }, [onTradeClick])
  
  return (
    <div className="space-y-2">
      <div className="text-lg font-semibold">
        Total P&L: ${totalPnL.toFixed(2)}
      </div>
      
      {sortedTrades.map((trade) => (
        <TradeItem
          key={trade.tradeId}
          trade={trade}
          onClick={handleTradeClick}
        />
      ))}
    </div>
  )
}

// Memoized Trade Item Component
const TradeItem = React.memo<{
  trade: Trade
  onClick: (trade: Trade) => void
}>(({ trade, onClick }) => {
  return (
    <div 
      className="p-4 border rounded cursor-pointer hover:bg-gray-50"
      onClick={() => onClick(trade)}
    >
      <div className="flex justify-between items-center">
        <span className="font-medium">{trade.symbol}</span>
        <span className={`font-medium ${
          (trade.netPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          ${(trade.netPnl || 0).toFixed(2)}
        </span>
      </div>
    </div>
  )
})
```

## 🚀 Build & Deployment

### Electron Builder Konfiguration

```json
// package.json (Build Section)
{
  "main": "dist/main/main.js",
  "scripts": {
    "build": "npm run build:main && npm run build:renderer",
    "build:main": "tsc -p tsconfig.main.json",
    "build:renderer": "vite build",
    "dev": "concurrently \"npm run dev:main\" \"npm run dev:renderer\"",
    "dev:main": "tsc -p tsconfig.main.json --watch",
    "dev:renderer": "vite",
    "pack": "electron-builder --dir",
    "dist": "electron-builder",
    "postinstall": "electron-builder install-app-deps"
  },
  "build": {
    "appId": "com.trading.bidback",
    "productName": "BIDBACK Trading Tool",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*"
    ],
    "mac": {
      "category": "public.app-category.finance"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

## 🔧 Development Setup

### Entwicklungsumgebung

```bash
# Projekt initialisieren
mkdir bidback-trading-tool
cd bidback-trading-tool

# Dependencies installieren
npm init -y
npm install electron react react-dom typescript
npm install -D @types/react @types/react-dom @types/node
npm install -D electron-builder concurrently vite

# Weitere Dependencies
npm install better-sqlite3 recharts react-hook-form @hookform/resolvers/zod
npm install shadcn-ui tailwindcss lucide-react
npm install express axios ib-insync fastapi

# Development starten
npm run dev
```

### Projektstruktur

```
bidback-trading-tool/
├── src/
│   ├── main/                 # Electron Main Process
│   │   ├── main.ts
│   │   ├── preload.ts
│   │   └── ipc-handlers.ts
│   ├── renderer/             # React Frontend
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── lib/
│   │   └── App.tsx
│   ├── database/             # SQLite Logic
│   │   ├── connection.ts
│   │   ├── services/
│   │   └── migrations/
│   └── ib_service/           # Python IB Bridge
│       ├── main.py
│       └── requirements.txt
├── dist/                     # Build Output
├── release/                  # Electron Builder Output
├── docs/                     # Dokumentation
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 📝 Fazit

Diese technische Implementierungsanleitung bietet eine umfassende Grundlage für die Entwicklung des BIDBACK Trading Tools. Die Kombination aus Electron, React, TypeScript, SQLite und Interactive Brokers Integration ermöglicht eine professionelle, performante Desktop-Trading-Anwendung.

**Nächste Schritte:**
1. Projekt Setup nach der Struktur
2. Database Schema implementieren
3. React Components entwickeln
4. IB Python Service einrichten
5. Testing und Optimierung
6. Build und Deployment

Die bereitgestellten Code-Beispiele und Konfigurationen bilden eine solide Basis für die erfolgreiche Umsetzung des Projekts.
