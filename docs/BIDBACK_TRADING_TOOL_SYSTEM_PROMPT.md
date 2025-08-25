# Bidback Trading Tool - System Implementation Specification

## Executive Summary

Bidback Trading Tool is a professional-grade desktop trading management system built on Electron with SQLite, designed for systematic traders utilizing market breadth analysis. The system combines comprehensive trade documentation capabilities matching TJS_Elite Excel functionality with a sophisticated 6-factor market breadth calculator, margin account position sizing, and prepared infrastructure for Interactive Brokers integration. All data operations are manual-entry based in Phase 1, with persistent storage ensuring data survival beyond browser cache limitations.

## System Architecture

### Core Technology Stack

```yaml
Frontend:
  - React: 18.3.x
  - TypeScript: 5.x (strict mode enabled)
  - Tailwind CSS: 3.4.x
  - Recharts: 2.x (charting)
  - React Hook Form: 7.x (form management)
  - Zod: 3.x (validation)

Desktop Layer:
  - Electron: 28.x
  - SQLite3: 5.x (embedded database)
  - electron-store: 5.x (preferences)
  - electron-updater: 6.x (auto-updates)

Backend Services:
  - Node.js: 20.x LTS
  - Express: 4.x (IPC bridge)
  - better-sqlite3: 9.x (SQLite driver)
  - node-cron: 3.x (scheduled tasks)

IB Integration (Phase 2):
  - Python: 3.11+
  - ib_insync: 0.9.x
  - FastAPI: 0.104.x
  - asyncio/websockets

Backup Infrastructure:
  - Local: Automated SQLite backups
  - Cloud: Dropbox SDK 10.x
  - Format: SQLite DB + JSON exports
```

### Architecture Patterns

```typescript
// Main Process (Electron)
class DatabaseManager {
  private db: Database;
  private backupScheduler: CronJob;
  
  constructor() {
    this.db = new Database(path.join(app.getPath('userData'), 'bidback_trading_tool.db'));
    this.initializeSchema();
    this.setupBackupSchedule();
  }
  
  // IPC handlers for renderer process
  handle('db:query', async (event, sql, params) => {
    return this.db.prepare(sql).all(params);
  });
}

// Renderer Process (React)
const useDatabase = () => {
  return {
    query: (sql: string, params?: any[]) => 
      window.electron.invoke('db:query', sql, params),
    execute: (sql: string, params?: any[]) =>
      window.electron.invoke('db:execute', sql, params)
  };
};
```

## Data Model

### Complete SQL Schema

```sql
-- Account Management
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_name TEXT NOT NULL UNIQUE,
  account_type TEXT CHECK(account_type IN ('cash', 'margin')) DEFAULT 'margin',
  total_account_value DECIMAL(15,2) NOT NULL,
  buying_power DECIMAL(15,2) NOT NULL,
  cash_balance DECIMAL(15,2) NOT NULL,
  margin_used DECIMAL(15,2) DEFAULT 0,
  maintenance_margin DECIMAL(15,2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1
);

-- Market Breadth Data
CREATE TABLE market_breadth (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL UNIQUE,
  -- VIX Data
  vix_1d_level DECIMAL(6,2),
  vix_1d_change DECIMAL(6,2),
  
  -- Quarterly Breadth (25% move in quarter)
  q_25_up INTEGER,
  q_25_down INTEGER,
  q_25_ratio DECIMAL(6,4) GENERATED ALWAYS AS 
    (CASE WHEN q_25_down > 0 THEN CAST(q_25_up AS REAL) / q_25_down ELSE NULL END) STORED,
  
  -- Monthly Breadth (25% move in month)  
  m_25_up INTEGER,
  m_25_down INTEGER,
  m_25_ratio DECIMAL(6,4) GENERATED ALWAYS AS
    (CASE WHEN m_25_down > 0 THEN CAST(m_25_up AS REAL) / m_25_down ELSE NULL END) STORED,
  
  -- Monthly Breadth (50% move in month)
  m_50_up INTEGER,
  m_50_down INTEGER,
  m_50_ratio DECIMAL(6,4) GENERATED ALWAYS AS
    (CASE WHEN m_50_down > 0 THEN CAST(m_50_up AS REAL) / m_50_down ELSE NULL END) STORED,
  
  -- 34-Day Breadth (13% move)
  d34_13_up INTEGER,
  d34_13_down INTEGER,
  d34_13_ratio DECIMAL(6,4) GENERATED ALWAYS AS
    (CASE WHEN d34_13_down > 0 THEN CAST(d34_13_up AS REAL) / d34_13_down ELSE NULL END) STORED,
  
  -- Worden Universe
  worden_up INTEGER,
  worden_down INTEGER,
  worden_ratio DECIMAL(6,4) GENERATED ALWAYS AS
    (CASE WHEN worden_down > 0 THEN CAST(worden_up AS REAL) / worden_down ELSE NULL END) STORED,
  
  -- Calculated Scores
  breadth_score DECIMAL(6,2),
  market_regime TEXT CHECK(market_regime IN ('strong_bull', 'bull', 'neutral', 'bear', 'strong_bear')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_source TEXT DEFAULT 'manual',
  notes TEXT
);

-- Indizes für Performance
CREATE INDEX idx_breadth_date ON market_breadth(date);
CREATE INDEX idx_breadth_regime ON market_breadth(market_regime);

-- Trade Documentation (TJS_Elite Style)
CREATE TABLE trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  
  -- Entry Information
  ticker TEXT NOT NULL,
  entry_date DATE NOT NULL,
  entry_price DECIMAL(10,4) NOT NULL,
  shares INTEGER NOT NULL,
  position_value DECIMAL(15,2) GENERATED ALWAYS AS (shares * entry_price) STORED,
  
  -- Position Sizing
  account_value_at_entry DECIMAL(15,2) NOT NULL,
  position_size_percent DECIMAL(5,2) NOT NULL,
  stop_loss_price DECIMAL(10,4),
  stop_loss_percent DECIMAL(5,2),
  risk_amount DECIMAL(10,2) GENERATED ALWAYS AS 
    (CASE WHEN stop_loss_price IS NOT NULL 
     THEN shares * (entry_price - stop_loss_price) 
     ELSE NULL END) STORED,
  
  -- Trade Type & Setup
  trade_type TEXT CHECK(trade_type IN ('long', 'short')) DEFAULT 'long',
  setup_type TEXT NOT NULL,
  timeframe TEXT CHECK(timeframe IN ('day', 'swing', 'position')) DEFAULT 'swing',
  
  -- Market Context at Entry
  vix_at_entry DECIMAL(6,2),
  breadth_score_at_entry DECIMAL(6,2),
  market_regime_at_entry TEXT,
  
  -- Exit Information
  exit_date DATE,
  exit_price DECIMAL(10,4),
  exit_reason TEXT,
  
  -- Performance Metrics
  realized_pnl DECIMAL(10,2) GENERATED ALWAYS AS
    (CASE WHEN exit_price IS NOT NULL 
     THEN shares * (exit_price - entry_price) 
     ELSE NULL END) STORED,
  realized_pnl_percent DECIMAL(6,2) GENERATED ALWAYS AS
    (CASE WHEN exit_price IS NOT NULL 
     THEN ((exit_price - entry_price) / entry_price * 100) 
     ELSE NULL END) STORED,
  
  -- Commission & Fees
  entry_commission DECIMAL(6,2) DEFAULT 0,
  exit_commission DECIMAL(6,2) DEFAULT 0,
  other_fees DECIMAL(6,2) DEFAULT 0,
  net_pnl DECIMAL(10,2) GENERATED ALWAYS AS
    (CASE WHEN realized_pnl IS NOT NULL 
     THEN realized_pnl - entry_commission - exit_commission - other_fees 
     ELSE NULL END) STORED,
  
  -- Trade Status
  status TEXT CHECK(status IN ('planned', 'pending', 'open', 'closed', 'cancelled')) DEFAULT 'planned',
  
  -- Documentation
  entry_notes TEXT,
  exit_notes TEXT,
  trade_thesis TEXT,
  lessons_learned TEXT,
  screenshots JSON, -- Array of file paths
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Orders & Execution Tracking
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id INTEGER NOT NULL,
  order_type TEXT CHECK(order_type IN ('market', 'limit', 'stop', 'stop_limit')) NOT NULL,
  side TEXT CHECK(side IN ('buy', 'sell', 'sell_short', 'buy_to_cover')) NOT NULL,
  quantity INTEGER NOT NULL,
  limit_price DECIMAL(10,4),
  stop_price DECIMAL(10,4),
  time_in_force TEXT CHECK(time_in_force IN ('day', 'gtc', 'ioc', 'fok')) DEFAULT 'day',
  
  -- Execution Details
  status TEXT CHECK(status IN ('draft', 'pending', 'submitted', 'filled', 'partial', 'cancelled', 'rejected')) DEFAULT 'draft',
  filled_quantity INTEGER DEFAULT 0,
  average_fill_price DECIMAL(10,4),
  fill_time TIMESTAMP,
  
  -- IB Integration Fields (Phase 2)
  ib_order_id INTEGER UNIQUE,
  ib_client_id INTEGER,
  ib_perm_id INTEGER,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  
  FOREIGN KEY (trade_id) REFERENCES trades(id)
);

-- Settings & Preferences
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSON NOT NULL,
  category TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Trail
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  action TEXT CHECK(action IN ('insert', 'update', 'delete')) NOT NULL,
  old_values JSON,
  new_values JSON,
  user_action TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_entry_date ON trades(entry_date);
CREATE INDEX idx_trades_ticker ON trades(ticker);
CREATE INDEX idx_market_breadth_date ON market_breadth(date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_trade_id ON orders(trade_id);

-- Triggers for Audit Trail
CREATE TRIGGER trades_audit_insert AFTER INSERT ON trades
BEGIN
  INSERT INTO audit_log(table_name, record_id, action, new_values)
  VALUES ('trades', NEW.id, 'insert', json_object(
    'ticker', NEW.ticker,
    'entry_date', NEW.entry_date,
    'entry_price', NEW.entry_price,
    'shares', NEW.shares
  ));
END;

CREATE TRIGGER trades_audit_update AFTER UPDATE ON trades
BEGIN
  INSERT INTO audit_log(table_name, record_id, action, old_values, new_values)
  VALUES ('trades', NEW.id, 'update',
    json_object('status', OLD.status, 'exit_price', OLD.exit_price),
    json_object('status', NEW.status, 'exit_price', NEW.exit_price)
  );
END;
```

## Core Algorithms

### Enhanced 6-Factor Breadth Calculator

```typescript
interface BreadthFactors {
  vix_1d_level: number;
  q_25_ratio: number;  // quarterly 25% up/down
  m_25_ratio: number;  // monthly 25% up/down
  m_50_ratio: number;  // monthly 50% up/down
  d34_13_ratio: number; // 34-day 13% up/down
  worden_ratio: number;
}

class EnhancedBreadthCalculator {
  private readonly weights = {
    vix: -0.25,      // Negative correlation (high VIX = bearish)
    q_25: 0.20,      // Quarterly momentum
    m_25: 0.15,      // Monthly momentum
    m_50: 0.15,      // Extreme monthly moves
    d34_13: 0.15,    // Intermediate momentum
    worden: 0.10     // Broad market participation
  };

  private readonly thresholds = {
    vix: { low: 12, normal: 20, high: 30, extreme: 40 },
    ratio: { bearish: 0.5, neutral: 1.0, bullish: 2.0, extreme: 3.0 }
  };

  calculateBreadthScore(factors: BreadthFactors): {
    score: number;
    regime: MarketRegime;
    signals: Signal[];
  } {
    // VIX Component (inverted and normalized)
    const vixScore = this.normalizeVIX(factors.vix_1d_level);
    
    // Breadth Ratios (normalized 0-100)
    const scores = {
      vix: vixScore * 100,
      q_25: this.normalizeRatio(factors.q_25_ratio) * 100,
      m_25: this.normalizeRatio(factors.m_25_ratio) * 100,
      m_50: this.normalizeRatio(factors.m_50_ratio) * 100,
      d34_13: this.normalizeRatio(factors.d34_13_ratio) * 100,
      worden: this.normalizeRatio(factors.worden_ratio) * 100
    };

    // Weighted composite score
    const compositeScore = 
      scores.vix * this.weights.vix +
      scores.q_25 * this.weights.q_25 +
      scores.m_25 * this.weights.m_25 +
      scores.m_50 * this.weights.m_50 +
      scores.d34_13 * this.weights.d34_13 +
      scores.worden * this.weights.worden;

    // Determine market regime
    const regime = this.determineRegime(compositeScore, factors);
    
    // Generate trading signals
    const signals = this.generateSignals(factors, regime, compositeScore);

    return { score: compositeScore, regime, signals };
  }

  private normalizeVIX(vix: number): number {
    // Inverted normalization: low VIX = high score
    if (vix <= this.thresholds.vix.low) return 1.0;
    if (vix >= this.thresholds.vix.extreme) return 0.0;
    
    // Linear interpolation
    const range = this.thresholds.vix.extreme - this.thresholds.vix.low;
    return 1.0 - ((vix - this.thresholds.vix.low) / range);
  }

  private normalizeRatio(ratio: number): number {
    // Sigmoid normalization for smooth transitions
    const midpoint = 1.0;
    const steepness = 0.5;
    return 1 / (1 + Math.exp(-steepness * (ratio - midpoint)));
  }

  private determineRegime(score: number, factors: BreadthFactors): MarketRegime {
    // Multi-factor regime determination
    if (score >= 70 && factors.vix_1d_level < 15) return 'strong_bull';
    if (score >= 55) return 'bull';
    if (score <= 30 && factors.vix_1d_level > 30) return 'strong_bear';
    if (score <= 45) return 'bear';
    return 'neutral';
  }

  private generateSignals(
    factors: BreadthFactors, 
    regime: MarketRegime,
    score: number
  ): Signal[] {
    const signals: Signal[] = [];

    // VIX-based signals
    if (factors.vix_1d_level > 30) {
      signals.push({
        type: 'warning',
        message: 'High VIX - Reduce position sizes',
        action: 'reduce_size'
      });
    }

    // Breadth divergence signals
    if (factors.q_25_ratio > 2 && factors.m_25_ratio < 1) {
      signals.push({
        type: 'caution',
        message: 'Quarterly/Monthly divergence detected',
        action: 'monitor'
      });
    }

    // Extreme readings
    if (factors.m_50_ratio > 3) {
      signals.push({
        type: 'opportunity',
        message: 'Extreme bullish breadth - Consider scaling in',
        action: 'scale_in'
      });
    }

    return signals;
  }
}
```

### Margin Account Position Calculator

```typescript
interface PositionSizeParams {
  totalAccountValue: number;
  buyingPower: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss?: number;
  marginRequirement: number; // 0.25 for 4:1, 0.5 for 2:1
  maxPositionPercent: number; // Max % of account in single position
}

class MarginPositionCalculator {
  calculatePosition(params: PositionSizeParams): {
    shares: number;
    positionValue: number;
    marginRequired: number;
    riskAmount: number;
    percentOfAccount: number;
  } {
    const {
      totalAccountValue,
      buyingPower,
      riskPercent,
      entryPrice,
      stopLoss,
      marginRequirement,
      maxPositionPercent
    } = params;

    // Method 1: Risk-based sizing (if stop loss provided)
    let shares = 0;
    if (stopLoss && stopLoss < entryPrice) {
      const riskAmount = totalAccountValue * (riskPercent / 100);
      const riskPerShare = entryPrice - stopLoss;
      shares = Math.floor(riskAmount / riskPerShare);
    }

    // Method 2: Fixed percentage sizing
    const maxPositionValue = totalAccountValue * (maxPositionPercent / 100);
    const maxShares = Math.floor(maxPositionValue / entryPrice);

    // Method 3: Buying power constraint
    const maxSharesByBuyingPower = Math.floor(buyingPower / (entryPrice * marginRequirement));

    // Take minimum of all methods
    const finalShares = Math.min(
      shares || maxShares,
      maxShares,
      maxSharesByBuyingPower
    );

    const positionValue = finalShares * entryPrice;
    const marginRequired = positionValue * marginRequirement;
    const riskAmount = stopLoss ? finalShares * (entryPrice - stopLoss) : 0;
    const percentOfAccount = (positionValue / totalAccountValue) * 100;

    return {
      shares: finalShares,
      positionValue: parseFloat(positionValue.toFixed(2)),
      marginRequired: parseFloat(marginRequired.toFixed(2)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      percentOfAccount: parseFloat(percentOfAccount.toFixed(2))
    };
  }

  // Kelly Criterion for optimal position sizing
  calculateKellyPosition(
    winRate: number,
    avgWin: number,
    avgLoss: number,
    kellyfraction: number = 0.25 // Use 25% Kelly for safety
  ): number {
    const b = avgWin / avgLoss; // Odds
    const p = winRate; // Probability of winning
    const q = 1 - p; // Probability of losing
    
    const kelly = (p * b - q) / b;
    return Math.max(0, Math.min(kelly * kellyfraction, 0.25)); // Cap at 25%
  }
}
```

### US Market Holiday Calculator

```typescript
class USMarketCalendar {
  private readonly fixedHolidays = [
    { month: 1, day: 1, name: 'New Year\'s Day' },
    { month: 7, day: 4, name: 'Independence Day' },
    { month: 12, day: 25, name: 'Christmas' }
  ];

  isMarketOpen(date: Date): boolean {
    // Weekend check
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;

    // Fixed holidays
    if (this.isFixedHoliday(date)) return false;

    // Floating holidays
    if (this.isMLKDay(date)) return false;
    if (this.isPresidentsDay(date)) return false;
    if (this.isGoodFriday(date)) return false;
    if (this.isMemorialDay(date)) return false;
    if (this.isLaborDay(date)) return false;
    if (this.isThanksgiving(date)) return false;

    return true;
  }

  private isMLKDay(date: Date): boolean {
    // Third Monday in January
    return date.getMonth() === 0 && 
           date.getDay() === 1 && 
           date.getDate() >= 15 && 
           date.getDate() <= 21;
  }

  private isGoodFriday(date: Date): boolean {
    // Complex Easter calculation
    const year = date.getFullYear();
    const easter = this.calculateEaster(year);
    const goodFriday = new Date(easter);
    goodFriday.setDate(goodFriday.getDate() - 2);
    
    return date.toDateString() === goodFriday.toDateString();
  }

  private calculateEaster(year: number): Date {
    // Computus algorithm for Easter
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return new Date(year, month, day);
  }

  getNextTradingDay(date: Date): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    
    while (!this.isMarketOpen(next)) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }
}
```

## UI/UX Specifications

### Component Architecture

```typescript
// Main Layout Structure
interface AppLayout {
  header: {
    accountSelector: AccountDropdown;
    breadthIndicator: BreadthStatusBar;
    quickActions: ActionBar;
  };
  
  sidebar: {
    navigation: NavigationMenu;
    accountSummary: AccountWidget;
    alerts: AlertsPanel;
  };
  
  main: {
    router: ReactRouter;
    views: {
      dashboard: DashboardView;
      portfolio: PortfolioView;
      trades: TradesView;
      breadth: BreadthView;
      orders: OrdersView;
    };
  };
}

// Key Components
const BreadthStatusBar: React.FC = () => {
  return (
    <div className="flex items-center space-x-4 bg-gray-900 px-4 py-2">
      <VIXIndicator value={vix} threshold={20} />
      <BreadthScore score={breadthScore} />
      <MarketRegime regime={regime} />
      <QuickStats 
        dayGain={dayGain}
        openPositions={openCount}
        buyingPower={buyingPower}
      />
    </div>
  );
};

const TradeEntryForm: React.FC = () => {
  const form = useForm<TradeEntry>({
    resolver: zodResolver(tradeEntrySchema),
    defaultValues: {
      entryDate: new Date(),
      positionSizePercent: 10,
      timeframe: 'swing'
    }
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input 
          label="Ticker"
          {...form.register('ticker')}
          className="uppercase"
        />
        <DatePicker
          label="Entry Date"
          {...form.register('entryDate')}
          validator={validateTradingDay}
        />
      </div>
      
      <PositionSizeCalculator
        accountValue={accountValue}
        onCalculate={(size) => form.setValue('shares', size)}
      />
      
      <BreadthContextDisplay
        date={form.watch('entryDate')}
        inline={true}
      />
    </form>
  );
};
```

### Design System

```css
/* Tailwind Config Extension */
module.exports = {
  theme: {
    extend: {
      colors: {
        'bull': '#10b981',      // green-500
        'bear': '#ef4444',      // red-500
        'neutral': '#6b7280',   // gray-500
        'vix-low': '#10b981',
        'vix-normal': '#f59e0b',
        'vix-high': '#ef4444',
        'vix-extreme': '#7c3aed'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out'
      }
    }
  }
};
```

## Backup & Data Security

### Multi-Layer Backup Strategy

```typescript
class BackupManager {
  private readonly localPath = path.join(app.getPath('userData'), 'backups');
  private readonly dropbox = new Dropbox({ accessToken: process.env.DROPBOX_TOKEN });
  
  async performBackup(): Promise<BackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // 1. Local SQLite backup
    const dbPath = this.getDatabasePath();
    const backupPath = path.join(this.localPath, `backup-${timestamp}.db`);
    await this.db.backup(backupPath);
    
    // 2. JSON export for readability
    const jsonExport = await this.exportToJSON();
    const jsonPath = path.join(this.localPath, `export-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(jsonExport, null, 2));
    
    // 3. Cloud backup (Dropbox)
    if (this.dropbox.isConfigured()) {
      await this.uploadToDropbox(backupPath, jsonPath);
    }
    
    // 4. Cleanup old backups (keep last 30)
    await this.cleanupOldBackups(30);
    
    return {
      success: true,
      localPath: backupPath,
      cloudPath: `/bidback-trading-tool/backups/backup-${timestamp}.db`,
      size: await this.getFileSize(backupPath)
    };
  }
  
  async restoreFromBackup(backupPath: string): Promise<void> {
    // Validate backup integrity
    const isValid = await this.validateBackup(backupPath);
    if (!isValid) throw new Error('Invalid backup file');
    
    // Create safety backup of current state
    await this.performBackup();
    
    // Restore database
    await this.db.close();
    await fs.copyFile(backupPath, this.getDatabasePath());
    await this.db.open();
    
    // Verify restoration
    await this.verifyDatabaseIntegrity();
  }
  
  setupAutoBackup(): void {
    // Daily at market close (4:30 PM ET)
    cron.schedule('30 16 * * 1-5', async () => {
      await this.performBackup();
    }, {
      timezone: 'America/New_York'
    });
    
    // Weekly full backup (Sunday night)
    cron.schedule('0 23 * * 0', async () => {
      await this.performFullBackup();
    });
  }
}
```

## Interactive Brokers Integration (Phase 2)

### Python Backend Service

```python
from ib_insync import IB, Stock, MarketOrder, LimitOrder
from fastapi import FastAPI, WebSocket
from typing import Dict, List, Optional
import asyncio
import json

class IBConnector:
    def __init__(self):
        self.ib = IB()
        self.app = FastAPI()
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, host='127.0.0.1', port=7497, clientId=1):
        """Connect to IB Gateway/TWS"""
        await self.ib.connectAsync(host, port, clientId)
        
        # Subscribe to account updates
        self.ib.accountSummary += self.on_account_update
        self.ib.orderStatus += self.on_order_update
        
    async def get_account_summary(self) -> Dict:
        """Fetch complete account summary"""
        summary = self.ib.accountSummary()
        
        return {
            'total_value': self._get_value(summary, 'NetLiquidation'),
            'buying_power': self._get_value(summary, 'BuyingPower'),
            'cash_balance': self._get_value(summary, 'CashBalance'),
            'margin_used': self._get_value(summary, 'InitMarginReq'),
            'maintenance_margin': self._get_value(summary, 'MaintMarginReq'),
            'positions': await self.get_positions()
        }
    
    async def place_order(self, 
                         ticker: str, 
                         action: str, 
                         quantity: int,
                         order_type: str,
                         limit_price: Optional[float] = None) -> int:
        """Place order through IB API"""
        contract = Stock(ticker, 'SMART', 'USD')
        
        if order_type == 'MARKET':
            order = MarketOrder(action, quantity)
        elif order_type == 'LIMIT':
            order = LimitOrder(action, quantity, limit_price)
        else:
            raise ValueError(f"Unsupported order type: {order_type}")
            
        trade = self.ib.placeOrder(contract, order)
        
        # Send real-time update to Electron app
        await self.broadcast_update({
            'type': 'order_placed',
            'orderId': trade.order.orderId,
            'ticker': ticker,
            'quantity': quantity,
            'status': 'Submitted'
        })
        
        return trade.order.orderId
    
    async def broadcast_update(self, message: Dict):
        """Send updates to all connected Electron clients"""
        for connection in self.active_connections:
            await connection.send_json(message)
    
    @app.websocket("/ws")
    async def websocket_endpoint(self, websocket: WebSocket):
        """WebSocket endpoint for real-time updates"""
        await websocket.accept()
        self.active_connections.append(websocket)
        
        try:
            while True:
                # Keep connection alive
                await websocket.receive_text()
        except:
            self.active_connections.remove(websocket)

# FastAPI routes
app = FastAPI()
ib_connector = IBConnector()

@app.on_event("startup")
async def startup():
    await ib_connector.connect()

@app.get("/account")
async def get_account():
    return await ib_connector.get_account_summary()

@app.post("/order")
async def place_order(order: OrderRequest):
    order_id = await ib_connector.place_order(
        ticker=order.ticker,
        action=order.action,
        quantity=order.quantity,
        order_type=order.order_type,
        limit_price=order.limit_price
    )
    return {"order_id": order_id, "status": "submitted"}
```

### Electron Integration Layer

```typescript
class IBBridge {
  private ws: WebSocket;
  private pythonProcess: ChildProcess;
  
  async initialize(): Promise<void> {
    // Start Python backend
    this.pythonProcess = spawn('python', [
      path.join(__dirname, 'ib_backend.py')
    ]);
    
    // Connect WebSocket
    this.ws = new WebSocket('ws://localhost:8000/ws');
    
    this.ws.on('message', (data) => {
      const update = JSON.parse(data.toString());
      this.handleRealtimeUpdate(update);
    });
  }
  
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    const response = await fetch('http://localhost:8000/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    
    return response.json();
  }
  
  private handleRealtimeUpdate(update: any): void {
    // Forward to renderer process
    mainWindow.webContents.send('ib:update', update);
    
    // Update local database
    if (update.type === 'order_filled') {
      this.updateOrderStatus(update.orderId, 'filled', update.fillPrice);
    }
  }
}
```

## Market Breadth Input Form (Enhanced)

### Complete Form Implementation

```typescript
interface MarketBreadthFormData {
  date: string;
  vix_1d_level: number;
  
  // Quarterly 25% movements
  q_25_up: number;
  q_25_down: number;
  
  // Monthly 25% movements
  m_25_up: number;
  m_25_down: number;
  
  // Monthly 50% movements
  m_50_up: number;
  m_50_down: number;
  
  // 34-day 13% movements
  d34_13_up: number;
  d34_13_down: number;
  
  // Worden universe
  worden_up: number;
  worden_down: number;
  
  notes?: string;
}

const MarketBreadthForm: React.FC = () => {
  const form = useForm<MarketBreadthFormData>({
    resolver: zodResolver(breadthFormSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      vix_1d_level: 20.0,
      q_25_up: 0,
      q_25_down: 0,
      m_25_up: 0,
      m_25_down: 0,
      m_50_up: 0,
      m_50_down: 0,
      d34_13_up: 0,
      d34_13_down: 0,
      worden_up: 0,
      worden_down: 0
    }
  });

  const onSubmit = async (data: MarketBreadthFormData) => {
    try {
      // Validate trading day
      const tradingDay = new Date(data.date);
      if (!marketCalendar.isMarketOpen(tradingDay)) {
        toast.error('Selected date is not a trading day');
        return;
      }

      // Calculate breadth score
      const breadthScore = breadthCalculator.calculateBreadthScore({
        vix_1d_level: data.vix_1d_level,
        q_25_ratio: data.q_25_down > 0 ? data.q_25_up / data.q_25_down : 0,
        m_25_ratio: data.m_25_down > 0 ? data.m_25_up / data.m_25_down : 0,
        m_50_ratio: data.m_50_down > 0 ? data.m_50_up / data.m_50_down : 0,
        d34_13_ratio: data.d34_13_down > 0 ? data.d34_13_up / data.d34_13_down : 0,
        worden_ratio: data.worden_down > 0 ? data.worden_up / data.worden_down : 0
      });

      // Save to database
      await db.execute(`
        INSERT OR REPLACE INTO market_breadth 
        (date, vix_1d_level, q_25_up, q_25_down, m_25_up, m_25_down, 
         m_50_up, m_50_down, d34_13_up, d34_13_down, worden_up, worden_down,
         breadth_score, market_regime, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.date,
        data.vix_1d_level,
        data.q_25_up, data.q_25_down,
        data.m_25_up, data.m_25_down,
        data.m_50_up, data.m_50_down,
        data.d34_13_up, data.d34_13_down,
        data.worden_up, data.worden_down,
        breadthScore.score,
        breadthScore.regime,
        data.notes
      ]);

      toast.success('Market breadth data saved successfully');
      form.reset();
    } catch (error) {
      toast.error(`Failed to save data: ${error.message}`);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Core Data Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Core Market Data</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              {...form.register('date')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">VIX 1-Day Level</label>
            <input
              type="number"
              step="0.01"
              {...form.register('vix_1d_level', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Quarterly Breadth Section */}
      <div className="bg-green-50 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-green-800">
          25% Quarterly Movement
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">25% Up Quarter</label>
            <input
              type="number"
              {...form.register('q_25_up', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Number of stocks"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">25% Down Quarter</label>
            <input
              type="number"
              {...form.register('q_25_down', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Number of stocks"
            />
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Ratio: {form.watch('q_25_down') > 0 
            ? (form.watch('q_25_up') / form.watch('q_25_down')).toFixed(2) 
            : 'N/A'}
        </div>
      </div>

      {/* Monthly Breadth Sections */}
      <div className="bg-blue-50 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-blue-800">
          Monthly Movement Data
        </h3>
        
        {/* 25% Monthly */}
        <div className="mb-6">
          <h4 className="font-medium mb-3">25% Monthly Movement</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">25% Up Month</label>
              <input
                type="number"
                {...form.register('m_25_up', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">25% Down Month</label>
              <input
                type="number"
                {...form.register('m_25_down', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* 50% Monthly */}
        <div>
          <h4 className="font-medium mb-3">50% Monthly Movement</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">50% Up Month</label>
              <input
                type="number"
                {...form.register('m_50_up', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">50% Down Month</label>
              <input
                type="number"
                {...form.register('m_50_down', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 34-Day Movement */}
      <div className="bg-purple-50 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-purple-800">
          13% in 34 Days Movement
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">13% Up in 34 Days</label>
            <input
              type="number"
              {...form.register('d34_13_up', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">13% Down in 34 Days</label>
            <input
              type="number"
              {...form.register('d34_13_down', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Worden Universe */}
      <div className="bg-gray-50 p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Worden Universe
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Worden Up</label>
            <input
              type="number"
              {...form.register('worden_up', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Worden Down</label>
            <input
              type="number"
              {...form.register('worden_down', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Notes</h3>
        <textarea
          {...form.register('notes')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          placeholder="Additional market observations..."
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => form.reset()}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Reset
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Market Data
        </button>
      </div>
    </form>
  );
};
```

## Development Roadmap

### Phase 1: Core Foundation (Weeks 1-3)
- ✅ Electron + SQLite setup
- ✅ Database schema implementation
- ✅ Manual data entry forms
- ✅ Basic CRUD operations
- ✅ Local backup system

### Phase 2: Market Breadth Integration (Weeks 4-5)
- ⬜ Breadth data management UI
- ⬜ 6-factor calculator implementation
- ⬜ Market regime detection
- ⬜ Historical breadth analysis
- ⬜ Breadth-based alerts

### Phase 3: Trade Management (Weeks 6-7)
- ⬜ Complete trade lifecycle
- ⬜ Position sizing calculator
- ⬜ P&L tracking (manual prices)
- ⬜ Trade documentation
- ⬜ Export/Import functionality

### Phase 4: Enhanced Features (Weeks 8-9)
- ⬜ Dropbox backup integration
- ⬜ Advanced reporting
- ⬜ Performance analytics
- ⬜ Multi-account support
- ⬜ Screenshot management

### Phase 5: IB Integration (Weeks 10-12)
- ⬜ Python backend service
- ⬜ WebSocket real-time updates
- ⬜ Order placement API
- ⬜ Account sync
- ⬜ Position reconciliation

## Critical Business Rules

### Data Integrity Rules
1. **No Orphaned Records**: All trades must belong to an active account
2. **Immutable History**: Closed trades cannot be deleted, only archived
3. **Audit Trail**: All data modifications logged with timestamp and reason
4. **Backup Before Modify**: Auto-backup before bulk operations

### Trading Rules
1. **Position Sizing**: Never exceed 20% of account value in single position
2. **Margin Requirements**: Enforce broker minimums (25% for day trading)
3. **Pattern Day Trader**: Track and warn if approaching PDT limits
4. **Market Hours**: Validate all entry dates are valid trading days

### Risk Management Rules
1. **Stop Loss Enforcement**: Warn if position lacks stop loss
2. **Correlation Limits**: Alert if portfolio concentration exceeds thresholds
3. **Drawdown Monitoring**: Alert at -5%, -10%, -15% drawdown levels
4. **VIX-Based Sizing**: Reduce position sizes when VIX > 30

### Data Management Rules
1. **Manual Entry Priority**: User-entered data overrides calculated values
2. **API Fallback**: Always allow manual entry if API fails
3. **Version Control**: Keep last 5 versions of each trade record
4. **Export Compliance**: All exports include metadata and timestamps

## Implementation Checklist

### Development Environment Setup
- [ ] Node.js 20.x LTS installed
- [ ] Electron 28.x project initialized
- [ ] SQLite3 with better-sqlite3 configured
- [ ] React 18 + TypeScript setup
- [ ] Tailwind CSS configured
- [ ] Python 3.11+ with ib_insync for Phase 2

### Database Implementation
- [ ] Complete SQL schema created
- [ ] Database initialization script
- [ ] Migration system setup
- [ ] Audit triggers implemented
- [ ] Performance indexes created

### Core Features
- [ ] Account management system
- [ ] Market breadth data entry
- [ ] Trade documentation system
- [ ] Position sizing calculator
- [ ] US market calendar

### Backup System
- [ ] Local SQLite backup
- [ ] JSON export functionality
- [ ] Dropbox integration
- [ ] Automatic scheduling
- [ ] Recovery procedures

### Interactive Brokers (Phase 2)
- [ ] Python backend service
- [ ] FastAPI endpoints
- [ ] WebSocket real-time updates
- [ ] Electron IPC bridge
- [ ] Order management

---

## Development Guidelines & Testing

### Documentation Requirements
- **MANDATORY**: Use MCP Context7 for all library documentation
- **Format**: `mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs`
- **Examples**:
  ```typescript
  // Before using React components
  await context7.resolve('react');
  const reactDocs = await context7.getDocs('/vercel/next.js/v14.3.0');
  
  // Before Electron implementation
  await context7.resolve('electron');
  const electronDocs = await context7.getDocs('/electron/electron');
  
  // Before SQLite integration
  await context7.resolve('better-sqlite3');
  const sqliteDocs = await context7.getDocs('/WiseLibs/better-sqlite3');
  ```

### Testing Requirements
- **MANDATORY**: Use Browser MCP for all UI testing
- **Format**: `mcp__browser-mcp__browser_navigate` → `mcp__browser-mcp__browser_screenshot`
- **Test Coverage**:
  - Every form component must be browser-tested
  - All navigation flows must be verified
  - Data input/output validation required
  - Performance testing for large datasets
  
### Screenshots & UI Mockups
- **Desktop Mockups**: Include screenshots showing desired layout/design
- **Form Layouts**: Provide visual examples of complex forms (Market Breadth Input)
- **Dashboard Design**: Screenshots of preferred dashboard arrangement
- **Color Schemes**: Visual examples of bull/bear/neutral color themes
- **Chart Styles**: Preferred visualization styles for breadth analysis
- **Mobile Responsive**: If tablet support needed, include mobile mockups

### Mockup Integration Process
1. **Analyze Screenshots**: Extract layout patterns, spacing, colors
2. **Component Mapping**: Map visual elements to React components
3. **Tailwind Classes**: Generate CSS classes matching visual design
4. **Browser Testing**: Validate implementation against mockups
5. **Iteration**: Refine based on visual comparison

Example mockup analysis:
```typescript
// From screenshot analysis
const DesignSystem = {
  colors: {
    bull: '#10b981',      // Extracted from mockup
    bear: '#ef4444',      // User preference shown
    neutral: '#6b7280'    // Visual theme
  },
  layout: {
    sidebar: '256px',     // Measured from screenshot
    header: '64px',       // Visual specification
    spacing: '16px'       // Grid spacing observed
  }
};
```

## Implementation Notes

This system prioritizes **data persistence** and **manual control** over automation in Phase 1, with a clear upgrade path to Interactive Brokers integration. The architecture ensures that no data is lost due to browser cache clearing, while maintaining the flexibility for professional traders to manage complex margin account scenarios. The breadth analysis system provides actionable insights without requiring live market data feeds, making it accessible and cost-effective for independent traders.

The enhanced market breadth data collection includes all requested Stockbee metrics (25% quarterly/monthly movements, 50% monthly, 13% in 34 days, and Worden Universe), providing a comprehensive foundation for sophisticated market timing and position sizing decisions.

**Critical Development Requirements:**
1. **Context7 Documentation**: ALL library research must use MCP Context7
2. **Browser MCP Testing**: ALL UI components must be browser-tested
3. **Screenshot-Driven Design**: Visual mockups guide implementation
4. **Systematic Testing**: Every feature requires validation workflow