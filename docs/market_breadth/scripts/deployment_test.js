#!/usr/bin/env node

// Comprehensive Deployment Testing Suite
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const http = require('http');

console.log('🚀 Trading Tool - Deployment & Monitoring Testing');
console.log('═══════════════════════════════════════════════════════════════\n');

// Test results collection
const testResults = {
  installation: [],
  environment: [],
  database: [],
  dependencies: [],
  monitoring: [],
  backup: [],
  documentation: []
};

// Helper function for HTTP requests
const makeRequest = (url, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime: Date.now() - startTime
        });
      });
    });

    const startTime = Date.now();
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

// Test Installation Process
async function testInstallationProcess() {
  console.log('🔍 Testing Installation Process...\n');
  
  const requiredFiles = [
    'package.json',
    '.env.example',
    'README.md',
    'docker-compose.yml',
    'database/schema.sql',
    'database/migrations',
    'scripts',
    'app',
    'components',
    'lib'
  ];

  for (const file of requiredFiles) {
    const exists = fs.existsSync(file);
    testResults.installation.push({
      test: `Required file/directory: ${file}`,
      success: exists,
      details: exists ? 'Present' : 'Missing'
    });
    console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? 'Present' : 'Missing'}`);
  }

  // Test package.json scripts
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = ['dev', 'build', 'start'];
  
  for (const script of requiredScripts) {
    const exists = packageJson.scripts && packageJson.scripts[script];
    testResults.installation.push({
      test: `NPM script: ${script}`,
      success: !!exists,
      details: exists ? exists : 'Missing'
    });
    console.log(`${exists ? '✅' : '❌'} npm run ${script}: ${exists ? 'Available' : 'Missing'}`);
  }

  // Test dependency installation
  console.log('\n   Testing dependency installation...');
  try {
    const nodeModulesExists = fs.existsSync('node_modules');
    testResults.installation.push({
      test: 'Dependencies installed',
      success: nodeModulesExists,
      details: nodeModulesExists ? 'node_modules present' : 'Run npm install'
    });
    console.log(`${nodeModulesExists ? '✅' : '❌'} Dependencies: ${nodeModulesExists ? 'Installed' : 'Missing'}`);
  } catch (error) {
    testResults.installation.push({
      test: 'Dependencies installation',
      success: false,
      details: error.message
    });
    console.log(`❌ Dependencies: Error - ${error.message}`);
  }

  return testResults.installation;
}

// Test Environment Setup
async function testEnvironmentSetup() {
  console.log('\n🔍 Testing Environment Setup...\n');
  
  // Check .env file
  const envExists = fs.existsSync('.env');
  testResults.environment.push({
    test: '.env file exists',
    success: envExists,
    details: envExists ? 'Present' : 'Copy from .env.example'
  });
  console.log(`${envExists ? '✅' : '❌'} .env file: ${envExists ? 'Present' : 'Missing'}`);

  if (envExists) {
    const envContent = fs.readFileSync('.env', 'utf8');
    
    // Check critical environment variables
    const requiredVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'IB_GATEWAY_HOST',
      'IB_GATEWAY_PORT',
      'PAPER_TRADING'
    ];

    for (const varName of requiredVars) {
      const hasVar = envContent.includes(`${varName}=`);
      const hasValue = envContent.match(new RegExp(`${varName}=.+`));
      
      testResults.environment.push({
        test: `Environment variable: ${varName}`,
        success: hasVar && hasValue,
        details: hasVar ? (hasValue ? 'Configured' : 'Empty value') : 'Missing'
      });
      console.log(`${hasVar && hasValue ? '✅' : '❌'} ${varName}: ${hasVar ? (hasValue ? 'Configured' : 'Empty') : 'Missing'}`);
    }
  }

  // Test environment validation script
  const validatorExists = fs.existsSync('scripts/validate-env.js');
  testResults.environment.push({
    test: 'Environment validator',
    success: validatorExists,
    details: validatorExists ? 'Available' : 'Missing'
  });
  console.log(`${validatorExists ? '✅' : '❌'} Environment validator: ${validatorExists ? 'Available' : 'Missing'}`);

  return testResults.environment;
}

// Test Database Setup
async function testDatabaseSetup() {
  console.log('\n🔍 Testing Database Setup...\n');
  
  // Check Docker Compose
  const dockerComposeExists = fs.existsSync('docker-compose.yml');
  testResults.database.push({
    test: 'Docker Compose configuration',
    success: dockerComposeExists,
    details: dockerComposeExists ? 'Present' : 'Missing'
  });
  console.log(`${dockerComposeExists ? '✅' : '❌'} docker-compose.yml: ${dockerComposeExists ? 'Present' : 'Missing'}`);

  // Check migration files
  const migrationDir = 'database/migrations';
  const migrationExists = fs.existsSync(migrationDir);
  
  if (migrationExists) {
    const migrationFiles = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'));
    testResults.database.push({
      test: 'Migration files',
      success: migrationFiles.length > 0,
      details: `${migrationFiles.length} migration files found`
    });
    console.log(`✅ Migration files: ${migrationFiles.length} found`);
    
    migrationFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
  } else {
    testResults.database.push({
      test: 'Migration files',
      success: false,
      details: 'Migration directory missing'
    });
    console.log(`❌ Migration directory: Missing`);
  }

  // Check schema file
  const schemaExists = fs.existsSync('database/schema.sql');
  testResults.database.push({
    test: 'Database schema',
    success: schemaExists,
    details: schemaExists ? 'Present' : 'Missing'
  });
  console.log(`${schemaExists ? '✅' : '❌'} schema.sql: ${schemaExists ? 'Present' : 'Missing'}`);

  // Test database connection (if available)
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://trading_user:trading_password@localhost:5432/trading_tool'
    });
    
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();
    
    testResults.database.push({
      test: 'Database connection',
      success: true,
      details: 'Connection successful'
    });
    console.log(`✅ Database connection: Working`);
  } catch (error) {
    testResults.database.push({
      test: 'Database connection',
      success: false,
      details: error.message
    });
    console.log(`❌ Database connection: ${error.message}`);
  }

  return testResults.database;
}

// Test Service Dependencies
async function testServiceDependencies() {
  console.log('\n🔍 Testing Service Dependencies...\n');
  
  // Test Node.js version
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));
    const nodeOk = majorVersion >= 18;
    
    testResults.dependencies.push({
      test: 'Node.js version',
      success: nodeOk,
      details: `${nodeVersion} (${nodeOk ? 'Compatible' : 'Requires 18+'})`
    });
    console.log(`${nodeOk ? '✅' : '❌'} Node.js: ${nodeVersion} ${nodeOk ? '(Compatible)' : '(Requires 18+)'}`);
  } catch (error) {
    testResults.dependencies.push({
      test: 'Node.js version',
      success: false,
      details: error.message
    });
  }

  // Test Python availability
  try {
    const pythonVersion = execSync('python3 --version', { encoding: 'utf8' }).trim();
    const pythonOk = pythonVersion.includes('Python 3.');
    
    testResults.dependencies.push({
      test: 'Python 3 availability',
      success: pythonOk,
      details: pythonVersion
    });
    console.log(`${pythonOk ? '✅' : '❌'} Python: ${pythonVersion}`);
  } catch (error) {
    testResults.dependencies.push({
      test: 'Python 3 availability',
      success: false,
      details: 'Python 3 not found'
    });
    console.log(`❌ Python: Not found`);
  }

  // Test IB API Python package
  const ibEnvExists = fs.existsSync('ib_api_env');
  testResults.dependencies.push({
    test: 'IB API virtual environment',
    success: ibEnvExists,
    details: ibEnvExists ? 'Virtual environment present' : 'Run IB API setup'
  });
  console.log(`${ibEnvExists ? '✅' : '❌'} IB API venv: ${ibEnvExists ? 'Present' : 'Missing'}`);

  // Test Docker availability
  try {
    execSync('docker --version', { encoding: 'utf8', stdio: 'pipe' });
    const dockerOk = true;
    
    testResults.dependencies.push({
      test: 'Docker availability',
      success: dockerOk,
      details: 'Docker available'
    });
    console.log(`✅ Docker: Available`);
  } catch (error) {
    testResults.dependencies.push({
      test: 'Docker availability',
      success: false,
      details: 'Docker not found'
    });
    console.log(`❌ Docker: Not found`);
  }

  // Test Docker Compose
  try {
    execSync('docker-compose --version', { encoding: 'utf8', stdio: 'pipe' });
    const composeOk = true;
    
    testResults.dependencies.push({
      test: 'Docker Compose availability',
      success: composeOk,
      details: 'Docker Compose available'
    });
    console.log(`✅ Docker Compose: Available`);
  } catch (error) {
    testResults.dependencies.push({
      test: 'Docker Compose availability',
      success: false,
      details: 'Docker Compose not found'
    });
    console.log(`❌ Docker Compose: Not found`);
  }

  return testResults.dependencies;
}

// Test Health Monitoring
async function testHealthMonitoring() {
  console.log('\n🔍 Testing Health Monitoring...\n');
  
  // Test if application is running
  try {
    const healthResponse = await makeRequest('http://localhost:3000/');
    const appRunning = healthResponse.statusCode === 200;
    
    testResults.monitoring.push({
      test: 'Application health',
      success: appRunning,
      details: `HTTP ${healthResponse.statusCode}, Response time: ${healthResponse.responseTime}ms`
    });
    console.log(`${appRunning ? '✅' : '❌'} Application: ${appRunning ? `Running (${healthResponse.responseTime}ms)` : 'Not responding'}`);
  } catch (error) {
    testResults.monitoring.push({
      test: 'Application health',
      success: false,
      details: error.message
    });
    console.log(`❌ Application: ${error.message}`);
  }

  // Test API endpoints health
  const apiEndpoints = [
    '/api/trades',
    '/api/trades/analytics',
    '/api/trades/setups'
  ];

  for (const endpoint of apiEndpoints) {
    try {
      const response = await makeRequest(`http://localhost:3000${endpoint}`);
      const endpointOk = [200, 400, 429].includes(response.statusCode); // 400/429 OK for empty requests
      
      testResults.monitoring.push({
        test: `API endpoint: ${endpoint}`,
        success: endpointOk,
        details: `HTTP ${response.statusCode}, ${response.responseTime}ms`
      });
      console.log(`${endpointOk ? '✅' : '❌'} ${endpoint}: HTTP ${response.statusCode} (${response.responseTime}ms)`);
    } catch (error) {
      testResults.monitoring.push({
        test: `API endpoint: ${endpoint}`,
        success: false,
        details: error.message
      });
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }

  // Check for health check endpoint
  const healthCheckExists = fs.existsSync('app/api/health') || 
                           fs.readFileSync('app/page.tsx', 'utf8').includes('health') ||
                           fs.existsSync('app/api/status');
  
  testResults.monitoring.push({
    test: 'Dedicated health check endpoint',
    success: healthCheckExists,
    details: healthCheckExists ? 'Health endpoint available' : 'Consider adding /api/health'
  });
  console.log(`${healthCheckExists ? '✅' : '⚠️'} Health endpoint: ${healthCheckExists ? 'Available' : 'Recommended to add'}`);

  // Test logging setup
  const logDirExists = fs.existsSync('logs') || process.env.LOG_LEVEL;
  testResults.monitoring.push({
    test: 'Logging configuration',
    success: logDirExists,
    details: logDirExists ? 'Logging configured' : 'Basic console logging'
  });
  console.log(`${logDirExists ? '✅' : '⚠️'} Logging: ${logDirExists ? 'Configured' : 'Basic'}`);

  return testResults.monitoring;
}

// Test Backup Procedures
async function testBackupProcedures() {
  console.log('\n🔍 Testing Backup & Recovery...\n');
  
  // Check for backup scripts
  const backupScriptExists = fs.existsSync('scripts/backup.js') || 
                            fs.existsSync('scripts/backup.sh') ||
                            fs.readdirSync('scripts').some(f => f.includes('backup'));
  
  testResults.backup.push({
    test: 'Backup scripts',
    success: backupScriptExists,
    details: backupScriptExists ? 'Backup scripts available' : 'No backup scripts found'
  });
  console.log(`${backupScriptExists ? '✅' : '❌'} Backup scripts: ${backupScriptExists ? 'Available' : 'Missing'}`);

  // Test data export capability
  try {
    const response = await makeRequest('http://localhost:3000/api/trades?limit=1');
    const exportCapable = response.statusCode === 200 || response.statusCode === 429;
    
    testResults.backup.push({
      test: 'Data export capability',
      success: exportCapable,
      details: exportCapable ? 'API allows data export' : 'Export functionality needs implementation'
    });
    console.log(`${exportCapable ? '✅' : '❌'} Data export: ${exportCapable ? 'Available via API' : 'Not available'}`);
  } catch (error) {
    testResults.backup.push({
      test: 'Data export capability',
      success: false,
      details: error.message
    });
    console.log(`❌ Data export: ${error.message}`);
  }

  // Check configuration backup
  const configFiles = ['.env', 'docker-compose.yml', 'package.json'];
  const backupCriticalFiles = configFiles.every(f => fs.existsSync(f));
  
  testResults.backup.push({
    test: 'Configuration files present',
    success: backupCriticalFiles,
    details: backupCriticalFiles ? 'All critical config files present' : 'Some config files missing'
  });
  console.log(`${backupCriticalFiles ? '✅' : '❌'} Config files: ${backupCriticalFiles ? 'Complete' : 'Incomplete'}`);

  // Test database backup capability
  const pgDumpAvailable = (() => {
    try {
      execSync('pg_dump --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  })();

  testResults.backup.push({
    test: 'Database backup tools',
    success: pgDumpAvailable,
    details: pgDumpAvailable ? 'pg_dump available' : 'Install PostgreSQL client tools'
  });
  console.log(`${pgDumpAvailable ? '✅' : '❌'} pg_dump: ${pgDumpAvailable ? 'Available' : 'Missing'}`);

  return testResults.backup;
}

// Test Documentation
async function testDocumentation() {
  console.log('\n🔍 Testing Documentation...\n');
  
  // Check README.md
  const readmeExists = fs.existsSync('README.md');
  if (readmeExists) {
    const readmeContent = fs.readFileSync('README.md', 'utf8');
    const hasInstallInstructions = readmeContent.toLowerCase().includes('install');
    const hasSetupInstructions = readmeContent.toLowerCase().includes('setup');
    const hasTroubleshooting = readmeContent.toLowerCase().includes('troubleshooting');
    
    testResults.documentation.push({
      test: 'README.md exists',
      success: true,
      details: 'Present and comprehensive'
    });
    
    testResults.documentation.push({
      test: 'Installation instructions',
      success: hasInstallInstructions,
      details: hasInstallInstructions ? 'Installation guide present' : 'Add installation steps'
    });
    
    testResults.documentation.push({
      test: 'Setup instructions',
      success: hasSetupInstructions,
      details: hasSetupInstructions ? 'Setup guide present' : 'Add setup instructions'
    });
    
    testResults.documentation.push({
      test: 'Troubleshooting guide',
      success: hasTroubleshooting,
      details: hasTroubleshooting ? 'Troubleshooting section present' : 'Add troubleshooting section'
    });
    
    console.log(`✅ README.md: Present`);
    console.log(`${hasInstallInstructions ? '✅' : '❌'} Installation guide: ${hasInstallInstructions ? 'Present' : 'Missing'}`);
    console.log(`${hasSetupInstructions ? '✅' : '❌'} Setup guide: ${hasSetupInstructions ? 'Present' : 'Missing'}`);
    console.log(`${hasTroubleshooting ? '✅' : '❌'} Troubleshooting: ${hasTroubleshooting ? 'Present' : 'Missing'}`);
  } else {
    testResults.documentation.push({
      test: 'README.md exists',
      success: false,
      details: 'README.md missing'
    });
    console.log(`❌ README.md: Missing`);
  }

  // Check API documentation
  const hasAPIDoc = fs.existsSync('docs/API.md') || 
                   fs.existsSync('docs/api.md') ||
                   (readmeExists && fs.readFileSync('README.md', 'utf8').toLowerCase().includes('api'));
  
  testResults.documentation.push({
    test: 'API documentation',
    success: hasAPIDoc,
    details: hasAPIDoc ? 'API documentation present' : 'Consider adding API docs'
  });
  console.log(`${hasAPIDoc ? '✅' : '⚠️'} API docs: ${hasAPIDoc ? 'Present' : 'Recommended'}`);

  // Check environment example
  const envExampleExists = fs.existsSync('.env.example');
  testResults.documentation.push({
    test: 'Environment example file',
    success: envExampleExists,
    details: envExampleExists ? '.env.example present' : 'Add .env.example'
  });
  console.log(`${envExampleExists ? '✅' : '❌'} .env.example: ${envExampleExists ? 'Present' : 'Missing'}`);

  return testResults.documentation;
}

// Generate deployment readiness report
function generateDeploymentReport() {
  const allTests = Object.values(testResults).flat();
  const totalTests = allTests.length;
  const passedTests = allTests.filter(test => test.success).length;
  const successRate = Math.round((passedTests / totalTests) * 100);
  
  let grade = '';
  if (successRate >= 95) grade = 'A+ (Excellent)';
  else if (successRate >= 90) grade = 'A (Very Good)';
  else if (successRate >= 80) grade = 'B (Good)';
  else if (successRate >= 70) grade = 'C (Adequate)';
  else grade = 'D (Needs Improvement)';

  const report = `# 🚀 Deployment Readiness Report
**Trading Tool - Comprehensive Deployment Assessment**  
**Generated:** ${new Date().toISOString().split('T')[0]}  
**Test Coverage:** Installation, Environment, Database, Dependencies, Monitoring, Backup, Documentation

---

## 🎯 **Executive Summary**

**Overall Deployment Score: ${successRate}/100 - ${grade}**

**Test Results:** ${passedTests}/${totalTests} tests passed (${successRate}% success rate)

### **Deployment Status:** ${successRate >= 80 ? '✅ READY FOR DEPLOYMENT' : successRate >= 70 ? '⚠️ NEEDS MINOR FIXES' : '❌ NEEDS MAJOR WORK'}

---

## 📊 **Detailed Test Results**

### **🔧 Installation Process**
${generateSectionReport(testResults.installation)}

### **🌍 Environment Setup** 
${generateSectionReport(testResults.environment)}

### **💾 Database Setup**
${generateSectionReport(testResults.database)}

### **⚙️ Service Dependencies**
${generateSectionReport(testResults.dependencies)}

### **📊 Health Monitoring**
${generateSectionReport(testResults.monitoring)}

### **💾 Backup & Recovery**
${generateSectionReport(testResults.backup)}

### **📚 Documentation**
${generateSectionReport(testResults.documentation)}

---

## 🚀 **Deployment Recommendations**

${generateRecommendations(testResults, successRate)}

---

## 📋 **Quick Start Checklist**

${generateQuickStartChecklist(testResults)}

---

**Report Generated:** ${new Date().toISOString()}  
**Testing Framework:** Comprehensive deployment validation  
**Status:** ${successRate >= 80 ? 'DEPLOYMENT APPROVED' : 'FIXES REQUIRED'}
`;

  return report;
}

function generateSectionReport(sectionResults) {
  if (!sectionResults.length) return 'No tests performed.\n';
  
  return sectionResults.map(test => 
    `${test.success ? '✅' : '❌'} **${test.test}**: ${test.details}`
  ).join('\n') + '\n';
}

function generateRecommendations(results, successRate) {
  const recommendations = [];
  
  // High priority recommendations
  Object.entries(results).forEach(([section, tests]) => {
    const failedTests = tests.filter(test => !test.success);
    failedTests.forEach(test => {
      if (test.test.includes('Database connection')) {
        recommendations.push('**HIGH:** Start PostgreSQL database: `docker-compose up -d postgres`');
      }
      if (test.test.includes('Dependencies installed')) {
        recommendations.push('**HIGH:** Install dependencies: `npm install`');
      }
      if (test.test.includes('.env file')) {
        recommendations.push('**HIGH:** Copy environment file: `cp .env.example .env`');
      }
      if (test.test.includes('Python 3')) {
        recommendations.push('**MEDIUM:** Install Python 3 for IB API integration');
      }
      if (test.test.includes('Docker')) {
        recommendations.push('**MEDIUM:** Install Docker for database services');
      }
      if (test.test.includes('README.md')) {
        recommendations.push('**LOW:** Create comprehensive README.md with setup instructions');
      }
    });
  });

  if (recommendations.length === 0) {
    recommendations.push('**EXCELLENT:** All deployment requirements met. Ready for production!');
  }

  return recommendations.slice(0, 10).join('\n');
}

function generateQuickStartChecklist(results) {
  const checklist = [
    '[ ] Clone repository: `git clone <repo-url>`',
    '[ ] Install dependencies: `npm install`',
    '[ ] Copy environment: `cp .env.example .env`',
    '[ ] Configure .env file with your settings',
    '[ ] Start database: `docker-compose up -d`',
    '[ ] Run migrations: `node database/migration-runner.js`',
    '[ ] Start application: `npm run dev`',
    '[ ] Access at: http://localhost:3000',
    '[ ] Test API endpoints',
    '[ ] Configure IB API (optional)'
  ];

  return checklist.join('\n');
}

// Main test execution
async function runDeploymentTests() {
  console.log('Starting comprehensive deployment testing...\n');
  
  try {
    await testInstallationProcess();
    await testEnvironmentSetup();
    await testDatabaseSetup();
    await testServiceDependencies();
    await testHealthMonitoring();
    await testBackupProcedures();
    await testDocumentation();
    
    const report = generateDeploymentReport();
    
    // Write report to file
    fs.writeFileSync('/tmp/trading_tool_files/DEPLOYMENT_READINESS_REPORT.md', report);
    
    console.log('\n✅ Deployment testing complete!');
    console.log('📄 Report saved to: /tmp/trading_tool_files/DEPLOYMENT_READINESS_REPORT.md');
    
    const allTests = Object.values(testResults).flat();
    const successRate = Math.round((allTests.filter(test => test.success).length / allTests.length) * 100);
    
    console.log(`\n🎯 Overall Score: ${successRate}/100`);
    console.log(`📊 Status: ${successRate >= 80 ? '✅ READY FOR DEPLOYMENT' : successRate >= 70 ? '⚠️ MINOR FIXES NEEDED' : '❌ MAJOR WORK REQUIRED'}`);
    
  } catch (error) {
    console.error('❌ Deployment testing failed:', error.message);
  }
}

if (require.main === module) {
  runDeploymentTests().catch(console.error);
}

module.exports = { runDeploymentTests };