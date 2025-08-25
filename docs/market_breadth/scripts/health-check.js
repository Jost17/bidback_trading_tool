/**
 * Trading Tool Health Check Script
 * Comprehensive verification of all system components
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

class HealthCheck {
  constructor() {
    this.results = {
      overall: 'unknown',
      checks: [],
      errors: [],
      warnings: []
    };
  }

  async runAllChecks() {
    console.log('🏥 Trading Tool Health Check Starting...\n');
    
    await this.checkEnvironment();
    await this.checkDependencies();
    await this.checkFileStructure();
    await this.checkDatabase();
    await this.checkServices();
    await this.checkDataIntegrity();
    
    this.generateReport();
    return this.results;
  }

  addCheck(name, status, details = '', warning = false) {
    const check = {
      name,
      status,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.checks.push(check);
    
    const icon = status === 'pass' ? '✅' : (status === 'fail' ? '❌' : '⚠️');
    console.log(`${icon} ${name}: ${status.toUpperCase()}`);
    if (details) console.log(`   ${details}`);
    
    if (status === 'fail') {
      this.results.errors.push(`${name}: ${details}`);
    } else if (warning || status === 'warning') {
      this.results.warnings.push(`${name}: ${details}`);
    }
  }

  async checkEnvironment() {
    console.log('📋 Environment Configuration');
    console.log('─'.repeat(50));
    
    // Check Node.js version
    const nodeVersion = process.version;
    const nodeVersionNum = parseInt(nodeVersion.slice(1));
    this.addCheck(
      'Node.js Version',
      nodeVersionNum >= 18 ? 'pass' : 'fail',
      `${nodeVersion} (Required: >= 18.x)`
    );
    
    // Check .env file
    const envExists = fs.existsSync('.env');
    this.addCheck(
      '.env Configuration',
      envExists ? 'pass' : 'fail',
      envExists ? 'Environment file found' : 'Missing .env file'
    );
    
    if (envExists) {
      // Check key environment variables
      const requiredEnvVars = [
        'NODE_ENV',
        'DATABASE_URL',
        'DB_USER',
        'DB_PASSWORD',
        'SESSION_SECRET'
      ];
      
      require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
      
      let missingVars = [];
      requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
          missingVars.push(varName);
        }
      });
      
      this.addCheck(
        'Environment Variables',
        missingVars.length === 0 ? 'pass' : 'warning',
        missingVars.length > 0 ? `Missing: ${missingVars.join(', ')}` : 'All required variables present'
      );
    }
    
    console.log('');
  }

  async checkDependencies() {
    console.log('📦 Dependencies');
    console.log('─'.repeat(50));
    
    // Check package.json
    const packageJsonPath = './package.json';
    const packageJsonExists = fs.existsSync(packageJsonPath);
    
    this.addCheck(
      'package.json',
      packageJsonExists ? 'pass' : 'fail',
      packageJsonExists ? 'Found' : 'Missing package.json'
    );
    
    if (packageJsonExists) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check critical dependencies
      const criticalDeps = ['pg', 'express', 'next', 'csv-parser'];
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      let missingDeps = [];
      criticalDeps.forEach(dep => {
        if (!dependencies[dep]) {
          missingDeps.push(dep);
        }
      });
      
      this.addCheck(
        'Critical Dependencies',
        missingDeps.length === 0 ? 'pass' : 'fail',
        missingDeps.length > 0 ? `Missing: ${missingDeps.join(', ')}` : 'All critical dependencies present'
      );
    }
    
    // Check node_modules
    const nodeModulesExists = fs.existsSync('./node_modules');
    this.addCheck(
      'Node Modules',
      nodeModulesExists ? 'pass' : 'fail',
      nodeModulesExists ? 'Installed' : 'Run npm install'
    );
    
    console.log('');
  }

  async checkFileStructure() {
    console.log('📁 File Structure');
    console.log('─'.repeat(50));
    
    const requiredDirs = [
      './app',
      './components',
      './lib',
      './database',
      './scripts',
      './database/migrations'
    ];
    
    const requiredFiles = [
      './database/migration-runner.js',
      './scripts/csv-migration.js',
      './scripts/load-data.js',
      './docker-compose.yml'
    ];
    
    // Check directories
    let missingDirs = [];
    requiredDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        missingDirs.push(dir);
      }
    });
    
    this.addCheck(
      'Required Directories',
      missingDirs.length === 0 ? 'pass' : 'warning',
      missingDirs.length > 0 ? `Missing: ${missingDirs.join(', ')}` : 'All directories present'
    );
    
    // Check files
    let missingFiles = [];
    requiredFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        missingFiles.push(file);
      }
    });
    
    this.addCheck(
      'Required Files',
      missingFiles.length === 0 ? 'pass' : 'warning',
      missingFiles.length > 0 ? `Missing: ${missingFiles.join(', ')}` : 'All files present'
    );
    
    console.log('');
  }

  async checkDatabase() {
    console.log('🗄️ Database');
    console.log('─'.repeat(50));
    
    try {
      // Check database connection
      const pool = new Pool({
        user: process.env.DB_USER || 'trading_user',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'trading_tool',
        password: process.env.DB_PASSWORD || 'trading_password',
        port: process.env.DB_PORT || 5432,
      });
      
      try {
        const client = await pool.connect();
        this.addCheck('Database Connection', 'pass', 'Connected successfully');
        
        // Check tables
        const tablesQuery = `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `;
        const tablesResult = await client.query(tablesQuery);
        const tables = tablesResult.rows.map(row => row.table_name);
        
        const requiredTables = [
          'market_breadth_daily',
          'data_import_log',
          'schema_migrations'
        ];
        
        let missingTables = [];
        requiredTables.forEach(table => {
          if (!tables.includes(table)) {
            missingTables.push(table);
          }
        });
        
        this.addCheck(
          'Database Tables',
          missingTables.length === 0 ? 'pass' : 'fail',
          missingTables.length > 0 ? `Missing: ${missingTables.join(', ')}` : `Found ${tables.length} tables`
        );
        
        // Check data
        if (tables.includes('market_breadth_daily')) {
          const dataQuery = 'SELECT COUNT(*) as count, MIN(date) as min_date, MAX(date) as max_date FROM market_breadth_daily';
          const dataResult = await client.query(dataQuery);
          const data = dataResult.rows[0];
          
          this.addCheck(
            'Historical Data',
            parseInt(data.count) > 0 ? 'pass' : 'warning',
            `${data.count} records (${data.min_date} to ${data.max_date})`
          );
        }
        
        client.release();
        await pool.end();
        
      } catch (dbError) {
        this.addCheck('Database Connection', 'fail', `Connection failed: ${dbError.message}`);
      }
      
    } catch (poolError) {
      this.addCheck('Database Pool', 'fail', `Pool creation failed: ${poolError.message}`);
    }
    
    console.log('');
  }

  async checkServices() {
    console.log('🚀 Services');
    console.log('─'.repeat(50));
    
    // Check Docker services
    try {
      const { execSync } = require('child_process');
      
      // Check if Docker is running
      try {
        execSync('docker --version', { stdio: 'pipe' });
        this.addCheck('Docker', 'pass', 'Docker is available');
        
        // Check if trading tool containers are running
        try {
          const output = execSync('docker ps --filter name=trading_tool --format "{{.Names}}"', { 
            encoding: 'utf8',
            stdio: 'pipe'
          });
          
          const runningContainers = output.trim().split('\n').filter(name => name);
          
          this.addCheck(
            'Docker Containers',
            runningContainers.length > 0 ? 'pass' : 'warning',
            runningContainers.length > 0 ? `Running: ${runningContainers.join(', ')}` : 'No trading tool containers running'
          );
          
        } catch (containerError) {
          this.addCheck('Docker Containers', 'warning', 'Could not check container status');
        }
        
      } catch (dockerError) {
        this.addCheck('Docker', 'warning', 'Docker not available or not running');
      }
      
    } catch (error) {
      this.addCheck('Services Check', 'warning', 'Could not check services');
    }
    
    console.log('');
  }

  async checkDataIntegrity() {
    console.log('📊 Data Integrity');
    console.log('─'.repeat(50));
    
    // Check if JSON data files exist
    const dataFiles = [
      './historical_breadth_data_improved.json',
      './test_import.json'
    ];
    
    dataFiles.forEach(file => {
      const exists = fs.existsSync(file);
      if (exists) {
        try {
          const data = JSON.parse(fs.readFileSync(file, 'utf8'));
          this.addCheck(
            `Data File: ${path.basename(file)}`,
            'pass',
            `Valid JSON with ${data.length} records`
          );
        } catch (parseError) {
          this.addCheck(
            `Data File: ${path.basename(file)}`,
            'fail',
            `Invalid JSON: ${parseError.message}`
          );
        }
      }
    });
    
    // Check migration scripts
    const migrationScripts = [
      './scripts/csv-migration.js',
      './scripts/load-data.js'
    ];
    
    migrationScripts.forEach(script => {
      const exists = fs.existsSync(script);
      this.addCheck(
        `Script: ${path.basename(script)}`,
        exists ? 'pass' : 'fail',
        exists ? 'Available' : 'Missing'
      );
    });
    
    console.log('');
  }

  generateReport() {
    console.log('📋 Health Check Summary');
    console.log('═'.repeat(50));
    
    const totalChecks = this.results.checks.length;
    const passedChecks = this.results.checks.filter(c => c.status === 'pass').length;
    const failedChecks = this.results.checks.filter(c => c.status === 'fail').length;
    const warningChecks = this.results.checks.filter(c => c.status === 'warning').length;
    
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`✅ Passed: ${passedChecks}`);
    console.log(`⚠️  Warnings: ${warningChecks}`);
    console.log(`❌ Failed: ${failedChecks}`);
    
    // Determine overall health
    if (failedChecks === 0 && warningChecks === 0) {
      this.results.overall = 'excellent';
      console.log('\n🎉 Overall Health: EXCELLENT - All systems operational!');
    } else if (failedChecks === 0) {
      this.results.overall = 'good';
      console.log('\n✅ Overall Health: GOOD - Minor issues detected');
    } else if (failedChecks <= 2) {
      this.results.overall = 'fair';
      console.log('\n⚠️  Overall Health: FAIR - Some issues need attention');
    } else {
      this.results.overall = 'poor';
      console.log('\n❌ Overall Health: POOR - Critical issues detected');
    }
    
    if (this.results.errors.length > 0) {
      console.log('\n🔴 Critical Issues:');
      this.results.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }
    
    if (this.results.warnings.length > 0) {
      console.log('\n🟡 Warnings:');
      this.results.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }
    
    console.log('\n📊 Recommendations:');
    if (failedChecks > 0) {
      console.log('   • Address critical failures first');
      console.log('   • Run database migrations if tables are missing');
      console.log('   • Install missing dependencies with npm install');
    }
    if (warningChecks > 0) {
      console.log('   • Review warning items for potential improvements');
      console.log('   • Start Docker services if needed');
    }
    if (failedChecks === 0 && warningChecks === 0) {
      console.log('   • System is fully operational!');
      console.log('   • Ready for trading operations');
    }
    
    console.log(`\n⏰ Health check completed at ${new Date().toISOString()}`);
  }
}

// Run health check if called directly
if (require.main === module) {
  const healthCheck = new HealthCheck();
  healthCheck.runAllChecks().catch(console.error);
}

module.exports = HealthCheck;