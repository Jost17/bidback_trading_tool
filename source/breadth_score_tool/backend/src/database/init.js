import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use the existing database with real data
const DB_PATH = join(__dirname, '../../data/market_monitor.db');

// Ensure data directory exists
const DATA_DIR = join(__dirname, '../../data');

async function ensureDataDirectory() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('📁 Created data directory');
  }
}

// Global database instance
let dbInstance = null;

// Database connection with better-sqlite3 for synchronous access
export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    
    // Optimize database settings
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('synchronous = NORMAL');
    dbInstance.pragma('cache_size = 1000');
    dbInstance.pragma('temp_store = MEMORY');
  }
  
  return dbInstance;
}

export async function initializeDatabase() {
  await ensureDataDirectory();
  
  const db = getDatabase();
  
  // Check if the table exists and show some stats
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM market_data').get();
    console.log(`✅ Database connected - ${count.count} records available`);
    
    const latest = db.prepare('SELECT date FROM market_data ORDER BY date DESC LIMIT 1').get();
    const earliest = db.prepare('SELECT date FROM market_data ORDER BY date ASC LIMIT 1').get();
    console.log(`📊 Data range: ${earliest.date} to ${latest.date}`);
    
  } catch (err) {
    console.error('❌ Database access error:', err);
  }

  return db;
}

export { DB_PATH };