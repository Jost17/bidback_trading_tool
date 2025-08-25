# Desktop Layer Documentation

## Electron 28.x

### Installation
```bash
npm install electron@^28.0.0 --save-dev
npm install electron-builder --save-dev
```

### Project Structure
```
src/
├── electron/
│   ├── main.ts           # Main process
│   ├── preload.ts        # Preload script
│   ├── ipc-handlers.ts   # IPC communication
│   └── window-manager.ts # Window management
└── renderer/             # React app
```

### Main Process (main.ts)
```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

### Preload Script (preload.ts)
```typescript
import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  queryDatabase: (sql: string, params?: any[]) => 
    ipcRenderer.invoke('db:query', sql, params),
  
  // File operations
  saveFile: (data: any) => 
    ipcRenderer.invoke('file:save', data),
  
  // System info
  getSystemInfo: () => 
    ipcRenderer.invoke('system:info'),
  
  // Event listeners
  onDataUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('data:update', (_event, data) => callback(data))
  }
})

// TypeScript types for renderer
declare global {
  interface Window {
    electronAPI: {
      queryDatabase: (sql: string, params?: any[]) => Promise<any>
      saveFile: (data: any) => Promise<boolean>
      getSystemInfo: () => Promise<any>
      onDataUpdate: (callback: (data: any) => void) => void
    }
  }
}
```

### IPC Handlers (ipc-handlers.ts)
```typescript
import { ipcMain, dialog } from 'electron'
import Database from 'better-sqlite3'
import fs from 'fs/promises'

export function setupIPCHandlers(db: Database.Database) {
  // Database queries
  ipcMain.handle('db:query', async (event, sql, params) => {
    try {
      const stmt = db.prepare(sql)
      return params ? stmt.all(...params) : stmt.all()
    } catch (error) {
      console.error('Database error:', error)
      throw error
    }
  })
  
  // File operations
  ipcMain.handle('file:save', async (event, data) => {
    const { filePath } = await dialog.showSaveDialog({
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'CSV', extensions: ['csv'] }
      ]
    })
    
    if (filePath) {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2))
      return true
    }
    return false
  })
  
  // System information
  ipcMain.handle('system:info', async () => {
    return {
      platform: process.platform,
      version: process.versions.electron,
      memory: process.memoryUsage()
    }
  })
}
```

## SQLite3 5.x with better-sqlite3

### Installation
```bash
npm install better-sqlite3@^9.0.0
npm install -D @types/better-sqlite3

# Rebuild for Electron
npm install electron-rebuild --save-dev
npx electron-rebuild
```

### Database Setup
```typescript
import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

export class DatabaseManager {
  private db: Database.Database
  
  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'trading.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL') // Performance optimization
    this.initialize()
  }
  
  private initialize() {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        order_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        executed_at DATETIME,
        pnl REAL
      );
      
      CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL,
        quantity INTEGER NOT NULL,
        avg_price REAL NOT NULL,
        current_price REAL,
        unrealized_pnl REAL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        price REAL NOT NULL,
        volume INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, timestamp)
      );
    `)
  }
  
  // Prepared statements for performance
  insertTrade(trade: Trade) {
    const stmt = this.db.prepare(`
      INSERT INTO trades (symbol, quantity, price, order_type)
      VALUES (@symbol, @quantity, @price, @orderType)
    `)
    return stmt.run(trade)
  }
  
  getTrades(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT * FROM trades 
      ORDER BY created_at DESC 
      LIMIT ?
    `)
    return stmt.all(limit)
  }
  
  updatePosition(symbol: string, quantity: number, price: number) {
    const stmt = this.db.prepare(`
      INSERT INTO positions (symbol, quantity, avg_price)
      VALUES (@symbol, @quantity, @price)
      ON CONFLICT(symbol) DO UPDATE SET
        quantity = quantity + @quantity,
        avg_price = ((avg_price * quantity) + (@price * @quantity)) / (quantity + @quantity),
        updated_at = CURRENT_TIMESTAMP
    `)
    return stmt.run({ symbol, quantity, price })
  }
  
  // Transaction example
  executeTrade(trade: Trade) {
    const transaction = this.db.transaction((trade) => {
      this.insertTrade(trade)
      this.updatePosition(trade.symbol, trade.quantity, trade.price)
      // Update other related tables
    })
    
    return transaction(trade)
  }
  
  close() {
    this.db.close()
  }
}
```

### Query Optimization
```typescript
// Create indexes for performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
  CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at);
  CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp);
`)

// Use prepared statements
const getTradesBySymbol = db.prepare(`
  SELECT * FROM trades 
  WHERE symbol = ? 
  ORDER BY created_at DESC
`)

// Batch inserts for better performance
const insertMarketData = db.prepare(`
  INSERT INTO market_data (symbol, price, volume)
  VALUES (?, ?, ?)
`)

const insertMany = db.transaction((dataPoints) => {
  for (const data of dataPoints) {
    insertMarketData.run(data.symbol, data.price, data.volume)
  }
})

// Execute batch insert
insertMany(marketDataArray)
```

## electron-store 5.x

### Installation
```bash
npm install electron-store@^5.0.0
```

### Configuration Store
```typescript
import Store from 'electron-store'

interface UserPreferences {
  theme: 'light' | 'dark'
  defaultSymbols: string[]
  refreshInterval: number
  notifications: {
    trades: boolean
    alerts: boolean
    updates: boolean
  }
  apiKeys: {
    encrypted: string
  }
}

const schema = {
  theme: {
    type: 'string',
    enum: ['light', 'dark'],
    default: 'light'
  },
  defaultSymbols: {
    type: 'array',
    default: ['AAPL', 'GOOGL', 'MSFT']
  },
  refreshInterval: {
    type: 'number',
    minimum: 1000,
    default: 5000
  },
  notifications: {
    type: 'object',
    properties: {
      trades: { type: 'boolean', default: true },
      alerts: { type: 'boolean', default: true },
      updates: { type: 'boolean', default: false }
    }
  }
} as const

export const store = new Store<UserPreferences>({
  schema,
  encryptionKey: process.env.ENCRYPTION_KEY, // Encrypt sensitive data
  migrations: {
    '1.0.0': store => {
      // Migration from older version
      store.set('refreshInterval', 5000)
    }
  }
})

// Usage
store.set('theme', 'dark')
const theme = store.get('theme') // 'dark'

// Nested properties
store.set('notifications.trades', false)
const tradeNotifications = store.get('notifications.trades') // false

// Watch for changes
store.onDidChange('theme', (newValue, oldValue) => {
  console.log(`Theme changed from ${oldValue} to ${newValue}`)
  // Update UI theme
})
```

### Secure API Key Storage
```typescript
import { safeStorage } from 'electron'
import Store from 'electron-store'

class SecureStore {
  private store: Store
  
  constructor() {
    this.store = new Store()
  }
  
  setApiKey(service: string, apiKey: string) {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(apiKey)
      this.store.set(`apiKeys.${service}`, encrypted.toString('base64'))
    } else {
      // Fallback to electron-store encryption
      this.store.set(`apiKeys.${service}`, apiKey)
    }
  }
  
  getApiKey(service: string): string | null {
    const encrypted = this.store.get(`apiKeys.${service}`)
    if (!encrypted) return null
    
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encrypted as string, 'base64')
      return safeStorage.decryptString(buffer)
    }
    return encrypted as string
  }
  
  deleteApiKey(service: string) {
    this.store.delete(`apiKeys.${service}`)
  }
}
```

## electron-updater 6.x

### Installation
```bash
npm install electron-updater@^6.0.0
```

### Auto-Update Setup
```typescript
import { autoUpdater } from 'electron-updater'
import { app, BrowserWindow, dialog } from 'electron'
import log from 'electron-log'

export class UpdateManager {
  constructor(private mainWindow: BrowserWindow) {
    // Configure logging
    log.transports.file.level = 'info'
    autoUpdater.logger = log
    
    // Configure update server
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'your-username',
      repo: 'your-repo',
      private: false
    })
    
    this.setupEventHandlers()
  }
  
  private setupEventHandlers() {
    autoUpdater.on('checking-for-update', () => {
      this.sendStatusToWindow('Checking for update...')
    })
    
    autoUpdater.on('update-available', (info) => {
      this.sendStatusToWindow('Update available.')
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available. It will be downloaded in the background.`,
        buttons: ['OK']
      })
    })
    
    autoUpdater.on('update-not-available', () => {
      this.sendStatusToWindow('Update not available.')
    })
    
    autoUpdater.on('error', (err) => {
      this.sendStatusToWindow('Error in auto-updater: ' + err)
      log.error('Update error:', err)
    })
    
    autoUpdater.on('download-progress', (progressObj) => {
      let message = `Download speed: ${progressObj.bytesPerSecond}`
      message += ` - Downloaded ${progressObj.percent}%`
      message += ` (${progressObj.transferred}/${progressObj.total})`
      this.sendStatusToWindow(message)
      
      // Send progress to renderer
      this.mainWindow.webContents.send('update-progress', progressObj.percent)
    })
    
    autoUpdater.on('update-downloaded', (info) => {
      this.sendStatusToWindow('Update downloaded')
      
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. The application will restart to apply the update.',
        buttons: ['Restart Now', 'Later']
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
    })
  }
  
  private sendStatusToWindow(text: string) {
    log.info(text)
    this.mainWindow.webContents.send('update-status', text)
  }
  
  checkForUpdates() {
    autoUpdater.checkForUpdatesAndNotify()
  }
  
  // Check for updates periodically
  startUpdateCheck(intervalMinutes = 60) {
    // Initial check
    this.checkForUpdates()
    
    // Periodic checks
    setInterval(() => {
      this.checkForUpdates()
    }, intervalMinutes * 60 * 1000)
  }
}

// Initialize in main process
app.whenReady().then(() => {
  const updateManager = new UpdateManager(mainWindow)
  updateManager.startUpdateCheck(30) // Check every 30 minutes
})
```

### Package Configuration (package.json)
```json
{
  "build": {
    "appId": "com.yourcompany.tradingapp",
    "productName": "Trading Tool",
    "directories": {
      "output": "dist"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.finance",
      "icon": "assets/icon.icns"
    },
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    },
    "publish": [
      {
        "provider": "github",
        "owner": "your-username",
        "repo": "your-repo"
      }
    ]
  }
}
```

## Security Best Practices

### Context Isolation
```typescript
// Always use context isolation
const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true
  }
})
```

### Content Security Policy
```html
<!-- In your HTML -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
```

### Input Validation
```typescript
// Validate all IPC inputs
ipcMain.handle('db:query', async (event, sql, params) => {
  // Whitelist allowed queries
  const allowedQueries = ['SELECT', 'INSERT INTO trades', 'UPDATE positions']
  
  if (!allowedQueries.some(q => sql.startsWith(q))) {
    throw new Error('Unauthorized query')
  }
  
  // Use parameterized queries to prevent SQL injection
  const stmt = db.prepare(sql)
  return stmt.all(...params)
})
```

## Performance Optimization

### Window State Management
```typescript
import { screen } from 'electron'
import windowStateKeeper from 'electron-window-state'

// Remember window size and position
let mainWindowState = windowStateKeeper({
  defaultWidth: 1200,
  defaultHeight: 800
})

const mainWindow = new BrowserWindow({
  x: mainWindowState.x,
  y: mainWindowState.y,
  width: mainWindowState.width,
  height: mainWindowState.height,
  // ... other options
})

mainWindowState.manage(mainWindow)
```

### Lazy Loading
```typescript
// Load heavy modules only when needed
let heavyModule: any

ipcMain.handle('heavy:operation', async () => {
  if (!heavyModule) {
    heavyModule = await import('./heavy-module')
  }
  return heavyModule.performOperation()
})
```