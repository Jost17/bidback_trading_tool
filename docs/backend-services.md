# Backend Services Documentation

## Node.js 20.x LTS

### Installation
```bash
# Using nvm (recommended)
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### Key Features in Node.js 20
- **Stable Test Runner**: Built-in test runner
- **Permission Model**: Experimental permission system
- **Single Executable Applications**: Package apps as single executables
- **Performance Improvements**: V8 engine optimizations
- **Web Crypto API**: Full implementation

### Project Setup
```json
// package.json
{
  "name": "trading-backend",
  "version": "1.0.0",
  "type": "module",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "node --test"
  }
}
```

### TypeScript Configuration for Node.js
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Express 4.x (IPC Bridge)

### Installation
```bash
npm install express@^4.18.0
npm install -D @types/express
npm install cors helmet morgan compression
npm install -D @types/cors @types/morgan @types/compression
```

### Express Server Setup
```typescript
import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import { createServer } from 'http'
import { DatabaseManager } from './database'
import { setupRoutes } from './routes'

export class TradingServer {
  private app: Express
  private server: any
  private db: DatabaseManager
  private port: number
  
  constructor(port = 3001) {
    this.app = express()
    this.port = port
    this.db = new DatabaseManager()
    this.setupMiddleware()
    this.setupRoutes()
    this.setupErrorHandling()
  }
  
  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }))
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5173' 
        : 'app://.',
      credentials: true
    }))
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    
    // Compression
    this.app.use(compression())
    
    // Logging
    this.app.use(morgan('combined'))
    
    // Custom middleware for request timing
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now()
      res.on('finish', () => {
        const duration = Date.now() - start
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`)
      })
      next()
    })
  }
  
  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      })
    })
    
    // API routes
    this.app.use('/api/trades', tradesRouter(this.db))
    this.app.use('/api/positions', positionsRouter(this.db))
    this.app.use('/api/market', marketDataRouter(this.db))
    this.app.use('/api/strategies', strategiesRouter(this.db))
  }
  
  private setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' })
    })
    
    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Error:', err)
      
      const status = (err as any).status || 500
      const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message
      
      res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      })
    })
  }
  
  start() {
    this.server = createServer(this.app)
    
    this.server.listen(this.port, () => {
      console.log(`Trading server running on port ${this.port}`)
    })
    
    return this.server
  }
  
  stop() {
    if (this.server) {
      this.server.close()
      this.db.close()
    }
  }
}
```

### API Routes Example
```typescript
import { Router } from 'express'
import { body, validationResult } from 'express-validator'

export function tradesRouter(db: DatabaseManager) {
  const router = Router()
  
  // GET all trades
  router.get('/', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100
      const offset = parseInt(req.query.offset as string) || 0
      
      const trades = await db.getTrades(limit, offset)
      res.json({
        data: trades,
        pagination: {
          limit,
          offset,
          total: await db.getTradesCount()
        }
      })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trades' })
    }
  })
  
  // POST new trade
  router.post('/',
    // Validation middleware
    body('symbol').isString().isLength({ min: 1, max: 10 }),
    body('quantity').isInt({ min: 1 }),
    body('price').isFloat({ min: 0.01 }),
    body('orderType').isIn(['market', 'limit', 'stop']),
    
    async (req, res) => {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
      
      try {
        const trade = await db.createTrade(req.body)
        
        // Emit event for real-time updates
        req.app.emit('trade:created', trade)
        
        res.status(201).json(trade)
      } catch (error) {
        res.status(500).json({ error: 'Failed to create trade' })
      }
    }
  )
  
  // GET trade by ID
  router.get('/:id', async (req, res) => {
    try {
      const trade = await db.getTradeById(req.params.id)
      if (!trade) {
        return res.status(404).json({ error: 'Trade not found' })
      }
      res.json(trade)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trade' })
    }
  })
  
  // UPDATE trade
  router.patch('/:id', async (req, res) => {
    try {
      const updated = await db.updateTrade(req.params.id, req.body)
      if (!updated) {
        return res.status(404).json({ error: 'Trade not found' })
      }
      res.json(updated)
    } catch (error) {
      res.status(500).json({ error: 'Failed to update trade' })
    }
  })
  
  // DELETE trade
  router.delete('/:id', async (req, res) => {
    try {
      const deleted = await db.deleteTrade(req.params.id)
      if (!deleted) {
        return res.status(404).json({ error: 'Trade not found' })
      }
      res.status(204).send()
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete trade' })
    }
  })
  
  return router
}
```

### WebSocket Integration
```typescript
import { WebSocketServer } from 'ws'
import { Server } from 'http'

export class WebSocketManager {
  private wss: WebSocketServer
  
  constructor(server: Server) {
    this.wss = new WebSocketServer({ server })
    this.setupHandlers()
  }
  
  private setupHandlers() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection')
      
      // Send initial data
      ws.send(JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
      }))
      
      // Handle messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(ws, message)
        } catch (error) {
          ws.send(JSON.stringify({ error: 'Invalid message format' }))
        }
      })
      
      // Handle disconnection
      ws.on('close', () => {
        console.log('WebSocket disconnected')
      })
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
      })
    })
  }
  
  private handleMessage(ws: any, message: any) {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message.channel)
        break
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message.channel)
        break
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }))
    }
  }
  
  broadcast(channel: string, data: any) {
    const message = JSON.stringify({
      channel,
      data,
      timestamp: new Date().toISOString()
    })
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message)
      }
    })
  }
}
```

## better-sqlite3 9.x

### Installation
```bash
npm install better-sqlite3@^9.0.0
npm install -D @types/better-sqlite3
```

### Database Manager
```typescript
import Database from 'better-sqlite3'
import path from 'path'
import { migrate } from './migrations'

export class DatabaseManager {
  private db: Database.Database
  
  constructor(dbPath?: string) {
    const defaultPath = path.join(process.cwd(), 'data', 'trading.db')
    this.db = new Database(dbPath || defaultPath)
    
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    
    // Foreign keys support
    this.db.pragma('foreign_keys = ON')
    
    this.initialize()
  }
  
  private initialize() {
    // Run migrations
    migrate(this.db)
    
    // Prepare commonly used statements
    this.prepareStatements()
  }
  
  private statements: Record<string, Database.Statement> = {}
  
  private prepareStatements() {
    // Trades
    this.statements.insertTrade = this.db.prepare(`
      INSERT INTO trades (symbol, quantity, price, order_type, strategy_id)
      VALUES (@symbol, @quantity, @price, @orderType, @strategyId)
    `)
    
    this.statements.getTrades = this.db.prepare(`
      SELECT * FROM trades 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `)
    
    this.statements.getTradeById = this.db.prepare(`
      SELECT * FROM trades WHERE id = ?
    `)
    
    // Positions
    this.statements.getPositions = this.db.prepare(`
      SELECT 
        p.*,
        COALESCE(
          (p.quantity * md.price) - (p.quantity * p.avg_price),
          0
        ) as unrealized_pnl
      FROM positions p
      LEFT JOIN (
        SELECT symbol, price 
        FROM market_data 
        WHERE (symbol, timestamp) IN (
          SELECT symbol, MAX(timestamp) 
          FROM market_data 
          GROUP BY symbol
        )
      ) md ON p.symbol = md.symbol
      WHERE p.quantity != 0
    `)
    
    // Market Data
    this.statements.insertMarketData = this.db.prepare(`
      INSERT INTO market_data (symbol, price, volume, bid, ask, timestamp)
      VALUES (@symbol, @price, @volume, @bid, @ask, @timestamp)
      ON CONFLICT(symbol, timestamp) DO UPDATE SET
        price = @price,
        volume = @volume,
        bid = @bid,
        ask = @ask
    `)
  }
  
  // Transaction wrapper
  transaction<T>(fn: () => T): T {
    const trx = this.db.transaction(fn)
    return trx()
  }
  
  // Trades operations
  createTrade(trade: TradeInput) {
    return this.statements.insertTrade.run(trade)
  }
  
  getTrades(limit: number, offset: number) {
    return this.statements.getTrades.all(limit, offset)
  }
  
  getTradeById(id: string | number) {
    return this.statements.getTradeById.get(id)
  }
  
  // Bulk operations
  bulkInsertMarketData(data: MarketData[]) {
    const insert = this.db.transaction((items) => {
      for (const item of items) {
        this.statements.insertMarketData.run(item)
      }
    })
    
    return insert(data)
  }
  
  // Analytics queries
  getTradeStatistics(symbol?: string, startDate?: Date, endDate?: Date) {
    let query = `
      SELECT 
        COUNT(*) as total_trades,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
        AVG(pnl) as avg_pnl,
        SUM(pnl) as total_pnl,
        MAX(pnl) as max_win,
        MIN(pnl) as max_loss
      FROM trades
      WHERE status = 'executed'
    `
    
    const params: any[] = []
    
    if (symbol) {
      query += ' AND symbol = ?'
      params.push(symbol)
    }
    
    if (startDate) {
      query += ' AND created_at >= ?'
      params.push(startDate.toISOString())
    }
    
    if (endDate) {
      query += ' AND created_at <= ?'
      params.push(endDate.toISOString())
    }
    
    return this.db.prepare(query).get(...params)
  }
  
  // Backup and restore
  backup(backupPath: string) {
    const backup = this.db.backup(backupPath)
    backup.step(-1) // Backup entire database
    backup.close()
  }
  
  close() {
    this.db.close()
  }
}
```

### Database Migrations
```typescript
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

interface Migration {
  version: number
  name: string
  up: string
  down?: string
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        order_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL,
        quantity INTEGER NOT NULL,
        avg_price REAL NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `
  },
  {
    version: 2,
    name: 'add_strategies',
    up: `
      CREATE TABLE IF NOT EXISTS strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        config JSON,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      ALTER TABLE trades ADD COLUMN strategy_id INTEGER REFERENCES strategies(id);
    `
  }
]

export function migrate(db: Database.Database) {
  // Create migrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Get current version
  const current = db.prepare('SELECT MAX(version) as version FROM migrations').get() as any
  const currentVersion = current?.version || 0
  
  // Apply pending migrations
  const pending = migrations.filter(m => m.version > currentVersion)
  
  if (pending.length === 0) {
    console.log('Database is up to date')
    return
  }
  
  const applyMigrations = db.transaction(() => {
    for (const migration of pending) {
      console.log(`Applying migration ${migration.version}: ${migration.name}`)
      db.exec(migration.up)
      db.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)').run(
        migration.version,
        migration.name
      )
    }
  })
  
  applyMigrations()
  console.log(`Applied ${pending.length} migrations`)
}
```

## node-cron 3.x

### Installation
```bash
npm install node-cron@^3.0.0
npm install -D @types/node-cron
```

### Task Scheduler
```typescript
import cron from 'node-cron'
import { DatabaseManager } from './database'
import { MarketDataService } from './services/market-data'
import { StrategyRunner } from './services/strategy-runner'

export class TaskScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map()
  
  constructor(
    private db: DatabaseManager,
    private marketData: MarketDataService,
    private strategyRunner: StrategyRunner
  ) {
    this.setupTasks()
  }
  
  private setupTasks() {
    // Update market data every minute during market hours
    this.addTask('market-data', '* 9-16 * * 1-5', async () => {
      console.log('Updating market data...')
      try {
        await this.marketData.updateAllSymbols()
      } catch (error) {
        console.error('Failed to update market data:', error)
      }
    })
    
    // Run strategies every 5 minutes
    this.addTask('run-strategies', '*/5 9-16 * * 1-5', async () => {
      console.log('Running trading strategies...')
      try {
        await this.strategyRunner.runAll()
      } catch (error) {
        console.error('Failed to run strategies:', error)
      }
    })
    
    // Daily report at 5 PM
    this.addTask('daily-report', '0 17 * * 1-5', async () => {
      console.log('Generating daily report...')
      try {
        const report = await this.generateDailyReport()
        await this.sendReport(report)
      } catch (error) {
        console.error('Failed to generate report:', error)
      }
    })
    
    // Database backup every night at 2 AM
    this.addTask('db-backup', '0 2 * * *', async () => {
      console.log('Backing up database...')
      try {
        const backupPath = `./backups/trading-${new Date().toISOString()}.db`
        this.db.backup(backupPath)
        console.log('Database backed up to:', backupPath)
      } catch (error) {
        console.error('Failed to backup database:', error)
      }
    })
    
    // Clean old logs weekly
    this.addTask('clean-logs', '0 3 * * 0', async () => {
      console.log('Cleaning old logs...')
      try {
        await this.cleanOldLogs(30) // Keep 30 days
      } catch (error) {
        console.error('Failed to clean logs:', error)
      }
    })
  }
  
  addTask(name: string, schedule: string, handler: () => Promise<void>) {
    if (this.tasks.has(name)) {
      this.removeTask(name)
    }
    
    const task = cron.schedule(schedule, handler, {
      scheduled: false,
      timezone: 'America/New_York'
    })
    
    this.tasks.set(name, task)
    return task
  }
  
  startTask(name: string) {
    const task = this.tasks.get(name)
    if (task) {
      task.start()
      console.log(`Task ${name} started`)
    }
  }
  
  stopTask(name: string) {
    const task = this.tasks.get(name)
    if (task) {
      task.stop()
      console.log(`Task ${name} stopped`)
    }
  }
  
  removeTask(name: string) {
    const task = this.tasks.get(name)
    if (task) {
      task.stop()
      this.tasks.delete(name)
    }
  }
  
  startAll() {
    for (const [name, task] of this.tasks) {
      task.start()
      console.log(`Started task: ${name}`)
    }
  }
  
  stopAll() {
    for (const [name, task] of this.tasks) {
      task.stop()
      console.log(`Stopped task: ${name}`)
    }
  }
  
  // Helper methods
  private async generateDailyReport() {
    const stats = await this.db.getTradeStatistics(
      undefined,
      new Date(new Date().setHours(0, 0, 0, 0)),
      new Date()
    )
    
    return {
      date: new Date().toISOString(),
      ...stats
    }
  }
  
  private async sendReport(report: any) {
    // Implementation for sending report (email, webhook, etc.)
    console.log('Daily Report:', report)
  }
  
  private async cleanOldLogs(daysToKeep: number) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    // Clean database logs
    this.db.prepare(`
      DELETE FROM logs 
      WHERE created_at < ?
    `).run(cutoffDate.toISOString())
    
    // Clean file logs
    // Implementation depends on logging setup
  }
  
  // Get task status
  getStatus() {
    const status: Record<string, boolean> = {}
    
    for (const [name, task] of this.tasks) {
      status[name] = (task as any).running || false
    }
    
    return status
  }
}

// Usage
const scheduler = new TaskScheduler(db, marketData, strategyRunner)
scheduler.startAll()

// Graceful shutdown
process.on('SIGTERM', () => {
  scheduler.stopAll()
  process.exit(0)
})
```

### Advanced Cron Patterns
```typescript
// Common cron patterns for trading
const cronPatterns = {
  // Market hours (NYSE)
  marketOpen: '30 9 * * 1-5',        // 9:30 AM EST, Mon-Fri
  marketClose: '0 16 * * 1-5',       // 4:00 PM EST, Mon-Fri
  preMarket: '0 4-9 * * 1-5',        // 4:00 AM - 9:00 AM EST
  afterHours: '0 16-20 * * 1-5',     // 4:00 PM - 8:00 PM EST
  
  // Intervals during market hours
  everyMinute: '* 9-16 * * 1-5',
  every5Minutes: '*/5 9-16 * * 1-5',
  every15Minutes: '*/15 9-16 * * 1-5',
  everyHour: '0 9-16 * * 1-5',
  
  // Daily tasks
  dailyReport: '0 17 * * 1-5',       // 5:00 PM EST
  morningPrep: '0 8 * * 1-5',        // 8:00 AM EST
  
  // Weekly/Monthly
  weeklyReport: '0 18 * * 5',        // Friday 6:00 PM
  monthlyReport: '0 18 L * *',       // Last day of month, 6:00 PM
}

// Dynamic scheduling based on market calendar
class MarketAwareScheduler {
  constructor(private scheduler: TaskScheduler) {}
  
  async scheduleForTradingDays(pattern: string, handler: () => Promise<void>) {
    // Check if market is open
    const isMarketOpen = await this.checkMarketStatus()
    
    if (isMarketOpen) {
      this.scheduler.addTask(`market-task-${Date.now()}`, pattern, handler)
    }
  }
  
  private async checkMarketStatus(): Promise<boolean> {
    // Implementation to check market holidays, special hours, etc.
    const today = new Date()
    const dayOfWeek = today.getDay()
    
    // Basic check for weekdays
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false
    }
    
    // Check for market holidays
    // Implementation would check against a holiday calendar
    
    return true
  }
}
```

## Error Handling and Logging

### Winston Logger Setup
```typescript
import winston from 'winston'
import path from 'path'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'trading-backend' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write all logs to file
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log')
    })
  ]
})

export default logger
```

## Performance Monitoring

### Health Check Endpoint
```typescript
router.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    database: await checkDatabaseConnection(),
    tasks: scheduler.getStatus()
  }
  
  res.status(200).json(health)
})
```