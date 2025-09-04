import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { setupTradingHandlers, setupFallbackHandlers } from './ipc-handlers'
import { TradingDatabase } from '../database/connection'

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null
let database: TradingDatabase | null = null

const isDev = true // Force development mode for local dev
console.log('Development mode:', isDev, 'NODE_ENV:', process.env.NODE_ENV)

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    titleBarStyle: 'default',
    show: false // Don't show until ready-to-show
  })

  // Initialize database with enhanced error handling
  try {
    // Use the main database which now has all migrated historical data
    const mainDbPath = path.join(process.cwd(), 'trading.db')
    console.log('Connecting to main database at:', mainDbPath)
    
    database = new TradingDatabase(mainDbPath)
    console.log('Connected to main database successfully')
    
    // Verify database is actually working
    const dbInfo = database.getDatabaseInfo()
    console.log('Database info:', dbInfo)
    
    // Setup IPC handlers with successful database
    setupTradingHandlers(ipcMain, database)
  } catch (error) {
    console.error('Failed to initialize database:', error)
    console.error('Error details:', error instanceof Error ? error.stack : error)
    
    // Attempt database recovery or create new database
    try {
      console.log('Attempting database recovery...')
      
      // Try to create database in a different location if needed
      const fallbackPath = path.join(process.cwd(), 'trading-fallback.db')
      database = new TradingDatabase(fallbackPath)
      
      console.log('Database recovery successful, using fallback database')
      setupTradingHandlers(ipcMain, database)
      
    } catch (recoveryError) {
      console.error('Database recovery failed:', recoveryError)
      
      // Setup enhanced fallback handlers that still allow basic functionality
      setupFallbackHandlers(ipcMain)
    }
  }

  // Load the app
  if (isDev) {
    console.log('Loading dev server at: http://localhost:3000')
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../../renderer/index.html'))
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle window focus for better UX
  mainWindow.on('focus', () => {
    if (mainWindow && isDev) {
      mainWindow.webContents.send('window-focus')
    }
  })
}

// App event listeners
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Close database connection
  if (database) {
    database.close()
    database = null
  }
  
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // Clean up database connection
  if (database) {
    database.close()
    database = null
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    console.warn('Blocked new window creation:', url)
    return { action: 'deny' }
  })
})

// Handle deep links (future feature)
app.setAsDefaultProtocolClient('bidback-trading')

// Export for testing
export { mainWindow, database }