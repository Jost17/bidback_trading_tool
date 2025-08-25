import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { setupTradingHandlers } from './ipc-handlers'
import { TradingDatabase } from '../database/connection'

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null
let database: TradingDatabase | null = null

const isDev = process.env.NODE_ENV === 'development'

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
      enableRemoteModule: false,
      nodeIntegration: false,
      sandbox: false
    },
    titleBarStyle: 'default',
    show: false // Don't show until ready-to-show
  })

  // Initialize database
  try {
    database = new TradingDatabase()
    console.log('Trading database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  // Setup IPC handlers
  if (database) {
    setupTradingHandlers(ipcMain, database)
  }

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
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
  contents.on('new-window', (navigationEvent, navigationUrl) => {
    navigationEvent.preventDefault()
    console.warn('Blocked new window creation:', navigationUrl)
  })
})

// Handle deep links (future feature)
app.setAsDefaultProtocolClient('bidback-trading')

// Export for testing
export { mainWindow, database }