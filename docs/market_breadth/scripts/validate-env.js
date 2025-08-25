#!/usr/bin/env node
/**
 * Environment Configuration Validator for Trading Tool
 * Validates .env file and provides recommendations
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.envPath = path.join(process.cwd(), '.env');
    this.examplePath = path.join(process.cwd(), '.env.example');
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    switch (level) {
      case 'error':
        console.log(`${colors.red}❌ ERROR:${colors.reset} ${message}`);
        this.errors.push(message);
        break;
      case 'warning':
        console.log(`${colors.yellow}⚠️  WARNING:${colors.reset} ${message}`);
        this.warnings.push(message);
        break;
      case 'info':
        console.log(`${colors.blue}ℹ️  INFO:${colors.reset} ${message}`);
        this.info.push(message);
        break;
      case 'success':
        console.log(`${colors.green}✅ SUCCESS:${colors.reset} ${message}`);
        break;
    }
  }

  loadEnvFile() {
    if (!fs.existsSync(this.envPath)) {
      this.log('error', '.env file not found. Copy .env.example to .env and configure values.');
      return null;
    }

    try {
      const envContent = fs.readFileSync(this.envPath, 'utf8');
      const env = {};
      
      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          env[key.trim()] = value;
        }
      });

      return env;
    } catch (error) {
      this.log('error', `Failed to read .env file: ${error.message}`);
      return null;
    }
  }

  validateRequired(env) {
    const required = [
      'NODE_ENV',
      'DATABASE_URL',
      'DB_HOST',
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD',
      'REDIS_HOST',
      'REDIS_PORT',
      'SESSION_SECRET',
      'IB_GATEWAY_HOST',
      'IB_GATEWAY_PORT'
    ];

    console.log(`${colors.cyan}\n=== REQUIRED VARIABLES ===${colors.reset}`);

    required.forEach(key => {
      if (!env[key] || env[key] === '') {
        this.log('error', `Required variable ${key} is missing or empty`);
      } else if (env[key].includes('your-') || env[key].includes('change-')) {
        this.log('warning', `${key} appears to contain placeholder value`);
      } else {
        this.log('success', `${key} is configured`);
      }
    });
  }

  validateDatabase(env) {
    console.log(`${colors.cyan}\n=== DATABASE CONFIGURATION ===${colors.reset}`);

    // Validate DATABASE_URL format
    if (env.DATABASE_URL) {
      const dbUrlPattern = /^postgresql:\/\/[\w-]+:[\w-]+@[\w.-]+:\d+\/[\w-]+$/;
      if (!dbUrlPattern.test(env.DATABASE_URL)) {
        this.log('warning', 'DATABASE_URL format may be incorrect');
      } else {
        this.log('success', 'DATABASE_URL format is valid');
      }
    }

    // Validate database port
    const dbPort = parseInt(env.DB_PORT);
    if (isNaN(dbPort) || dbPort < 1 || dbPort > 65535) {
      this.log('error', 'DB_PORT must be a valid port number');
    } else if (dbPort !== 5432) {
      this.log('info', `Using non-standard PostgreSQL port: ${dbPort}`);
    }

    // Check pool configuration
    const poolMin = parseInt(env.DB_POOL_MIN) || 2;
    const poolMax = parseInt(env.DB_POOL_MAX) || 20;
    if (poolMin >= poolMax) {
      this.log('warning', 'DB_POOL_MIN should be less than DB_POOL_MAX');
    }
  }

  validateRedis(env) {
    console.log(`${colors.cyan}\n=== REDIS CONFIGURATION ===${colors.reset}`);

    // Validate Redis port
    const redisPort = parseInt(env.REDIS_PORT);
    if (isNaN(redisPort) || redisPort < 1 || redisPort > 65535) {
      this.log('error', 'REDIS_PORT must be a valid port number');
    } else if (redisPort !== 6379) {
      this.log('info', `Using non-standard Redis port: ${redisPort}`);
    }

    // Validate Redis database allocation
    const redisDbs = [
      'REDIS_DB_MARKET_BREADTH',
      'REDIS_DB_TRADING_SIGNALS',
      'REDIS_DB_SESSIONS',
      'REDIS_DB_RATE_LIMITING',
      'REDIS_DB_OCR_QUEUE',
      'REDIS_DB_CSV_IMPORT'
    ];

    const usedDbs = new Set();
    redisDbs.forEach(dbKey => {
      const dbNum = parseInt(env[dbKey]);
      if (isNaN(dbNum) || dbNum < 0 || dbNum > 15) {
        this.log('warning', `${dbKey} should be between 0-15`);
      } else if (usedDbs.has(dbNum)) {
        this.log('warning', `Redis database ${dbNum} is used multiple times`);
      } else {
        usedDbs.add(dbNum);
      }
    });
  }

  validateIBAPI(env) {
    console.log(`${colors.cyan}\n=== INTERACTIVE BROKERS API ===${colors.reset}`);

    // Validate IB Gateway port
    const ibPort = parseInt(env.IB_GATEWAY_PORT);
    if (ibPort === 7497) {
      this.log('info', 'Configured for IB paper trading (port 7497)');
    } else if (ibPort === 7496) {
      this.log('warning', 'Configured for IB live trading (port 7496) - Ensure PAPER_TRADING=false');
    } else {
      this.log('warning', 'Non-standard IB Gateway port detected');
    }

    // Validate client ID
    const clientId = parseInt(env.IB_GATEWAY_CLIENT_ID);
    if (isNaN(clientId) || clientId < 1 || clientId > 32) {
      this.log('error', 'IB_GATEWAY_CLIENT_ID must be between 1-32');
    }

    // Check paper trading consistency
    const paperTrading = env.PAPER_TRADING === 'true';
    if (paperTrading && ibPort === 7496) {
      this.log('warning', 'PAPER_TRADING=true but using live trading port 7496');
    } else if (!paperTrading && ibPort === 7497) {
      this.log('warning', 'PAPER_TRADING=false but using paper trading port 7497');
    }

    // Validate rate limits
    const rateLimit = parseInt(env.IB_RATE_LIMIT_MESSAGES);
    if (rateLimit > 50) {
      this.log('warning', 'IB_RATE_LIMIT_MESSAGES should not exceed 50 per second');
    }

    // Check account ID format for paper trading
    if (paperTrading && env.IB_ACCOUNT_ID && !env.IB_ACCOUNT_ID.startsWith('DU')) {
      this.log('info', 'Paper trading account IDs typically start with "DU"');
    }
  }

  validateTrading(env) {
    console.log(`${colors.cyan}\n=== TRADING CONFIGURATION ===${colors.reset}`);

    // Validate risk management
    const stopLoss = parseFloat(env.STOP_LOSS_PERCENTAGE);
    const takeProfit = parseFloat(env.TAKE_PROFIT_PERCENTAGE);
    
    if (stopLoss <= 0 || stopLoss >= 1) {
      this.log('warning', 'STOP_LOSS_PERCENTAGE should be between 0 and 1 (e.g., 0.02 for 2%)');
    }
    
    if (takeProfit <= stopLoss) {
      this.log('warning', 'TAKE_PROFIT_PERCENTAGE should be greater than STOP_LOSS_PERCENTAGE');
    }

    const maxExposure = parseFloat(env.MAX_PORTFOLIO_EXPOSURE);
    if (maxExposure <= 0 || maxExposure > 1) {
      this.log('warning', 'MAX_PORTFOLIO_EXPOSURE should be between 0 and 1 (e.g., 0.8 for 80%)');
    }

    // Validate trading hours
    const tradingStart = env.TRADING_START_TIME;
    const tradingEnd = env.TRADING_END_TIME;
    const timePattern = /^\d{2}:\d{2}$/;
    
    if (!timePattern.test(tradingStart)) {
      this.log('error', 'TRADING_START_TIME format should be HH:MM');
    }
    
    if (!timePattern.test(tradingEnd)) {
      this.log('error', 'TRADING_END_TIME format should be HH:MM');
    }
  }

  validateSecurity(env) {
    console.log(`${colors.cyan}\n=== SECURITY CONFIGURATION ===${colors.reset}`);

    // Check session secret strength
    const sessionSecret = env.SESSION_SECRET;
    if (sessionSecret.length < 32) {
      this.log('error', 'SESSION_SECRET should be at least 32 characters long');
    } else if (sessionSecret.includes('your-') || sessionSecret.includes('change-')) {
      this.log('error', 'SESSION_SECRET contains placeholder text - change it immediately');
    } else if (sessionSecret.length < 64) {
      this.log('warning', 'SESSION_SECRET should be 64+ characters for better security');
    } else {
      this.log('success', 'SESSION_SECRET appears to be properly configured');
    }

    // Check production settings
    if (env.NODE_ENV === 'production') {
      if (env.SESSION_COOKIE_SECURE !== 'true') {
        this.log('error', 'SESSION_COOKIE_SECURE should be true in production');
      }
      
      if (env.LOG_LEVEL === 'debug') {
        this.log('warning', 'DEBUG logging enabled in production');
      }
      
      if (env.CORS_ORIGIN === 'http://localhost:3000') {
        this.log('error', 'CORS_ORIGIN should not be localhost in production');
      }
    }

    // Check encryption configuration
    if (env.DATA_ENCRYPTION_ENABLED === 'true') {
      if (!env.ENCRYPTION_KEY || env.ENCRYPTION_KEY.length !== 32) {
        this.log('error', 'ENCRYPTION_KEY must be exactly 32 characters when encryption is enabled');
      }
    }
  }

  validateFileProcessing(env) {
    console.log(`${colors.cyan}\n=== FILE PROCESSING ===${colors.reset}`);

    // Validate file size
    const maxSize = env.MAX_FILE_SIZE;
    if (!maxSize.match(/^\d+[KMGT]?B$/i)) {
      this.log('warning', 'MAX_FILE_SIZE format should be like "50MB", "1GB", etc.');
    }

    // Check upload directory
    const uploadDir = env.UPLOAD_DIR;
    if (uploadDir.startsWith('/tmp') || uploadDir.startsWith('/var/tmp')) {
      this.log('warning', 'Upload directory in temporary location - files may be deleted');
    }

    // Validate OCR settings
    const ocrThreshold = parseInt(env.OCR_CONFIDENCE_THRESHOLD);
    if (ocrThreshold < 50 || ocrThreshold > 95) {
      this.log('warning', 'OCR_CONFIDENCE_THRESHOLD typically works best between 50-95');
    }
  }

  checkConnectivity(env) {
    console.log(`${colors.cyan}\n=== CONNECTIVITY CHECKS ===${colors.reset}`);
    
    // Note: In a real implementation, these would be actual network checks
    this.log('info', 'Database connectivity check: Use npm run db:status');
    this.log('info', 'Redis connectivity check: Use ./scripts/docker-utils.sh redis');
    this.log('info', 'IB Gateway connectivity: Ensure IB Gateway/TWS is running');
  }

  generateReport() {
    console.log(`${colors.magenta}\n=== VALIDATION SUMMARY ===${colors.reset}`);
    
    console.log(`${colors.green}✅ Checks passed: ${this.info.length + (this.errors.length === 0 ? 1 : 0)}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Warnings: ${this.warnings.length}${colors.reset}`);
    console.log(`${colors.red}❌ Errors: ${this.errors.length}${colors.reset}`);

    if (this.errors.length > 0) {
      console.log(`\n${colors.red}CRITICAL ISSUES TO FIX:${colors.reset}`);
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}RECOMMENDATIONS:${colors.reset}`);
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    console.log(`\n${colors.cyan}NEXT STEPS:${colors.reset}`);
    if (this.errors.length > 0) {
      console.log('  1. Fix critical configuration errors');
      console.log('  2. Re-run validation: npm run validate-env');
    } else {
      console.log('  1. Start services: ./scripts/dev-setup.sh');
      console.log('  2. Test connectivity: npm run db:status');
      console.log('  3. Start development: npm run dev');
    }

    return this.errors.length === 0;
  }

  validate() {
    console.log(`${colors.blue}🔍 Trading Tool Environment Validator${colors.reset}`);
    console.log(`${colors.blue}=====================================\n${colors.reset}`);

    const env = this.loadEnvFile();
    if (!env) {
      return false;
    }

    this.validateRequired(env);
    this.validateDatabase(env);
    this.validateRedis(env);
    this.validateIBAPI(env);
    this.validateTrading(env);
    this.validateSecurity(env);
    this.validateFileProcessing(env);
    this.checkConnectivity(env);

    return this.generateReport();
  }
}

// CLI interface
if (require.main === module) {
  const validator = new EnvironmentValidator();
  const isValid = validator.validate();
  process.exit(isValid ? 0 : 1);
}

module.exports = EnvironmentValidator;