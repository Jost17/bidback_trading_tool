#!/usr/bin/env node

// API Performance Load Test Script
const http = require('http');

console.log('🚀 Trading Tool - API Performance Testing');
console.log('═══════════════════════════════════════════════════════════════\n');

const BASE_URL = 'http://localhost:3000';

// Make concurrent requests
async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Performance-Test-Agent/1.0',
        ...options.headers
      },
      timeout: 30000
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          responseTime: Date.now() - startTime,
          contentLength: data.length,
          data: data
        });
      });
    });

    const startTime = Date.now();
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runLoadTest(endpoint, concurrency, duration) {
  console.log(`🚀 Load testing ${endpoint} with ${concurrency} concurrent users for ${duration}ms`);
  
  const startTime = Date.now();
  const results = [];
  const promises = [];
  
  for (let i = 0; i < concurrency; i++) {
    const promise = (async () => {
      const threadResults = [];
      while (Date.now() - startTime < duration) {
        try {
          const result = await makeRequest(`${BASE_URL}${endpoint}`);
          threadResults.push(result);
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between requests
        } catch (error) {
          threadResults.push({ error: error.message, responseTime: 30000 });
        }
      }
      return threadResults;
    })();
    promises.push(promise);
  }
  
  const allResults = await Promise.all(promises);
  const flatResults = allResults.flat();
  
  // Calculate statistics
  const successfulRequests = flatResults.filter(r => r.statusCode === 200);
  const errorRequests = flatResults.filter(r => r.error || r.statusCode !== 200);
  
  const responseTimes = successfulRequests.map(r => r.responseTime);
  const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const minResponseTime = Math.min(...responseTimes);
  const maxResponseTime = Math.max(...responseTimes);
  
  console.log(`📊 Load test results:`);
  console.log(`   Total Requests: ${flatResults.length}`);
  console.log(`   Successful: ${successfulRequests.length} (${(successfulRequests.length/flatResults.length*100).toFixed(1)}%)`);
  console.log(`   Errors: ${errorRequests.length}`);
  console.log(`   Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`   Min Response Time: ${minResponseTime}ms`);
  console.log(`   Max Response Time: ${maxResponseTime}ms`);
  console.log(`   Requests/Second: ${(flatResults.length / (duration/1000)).toFixed(1)}`);
  
  return {
    endpoint,
    totalRequests: flatResults.length,
    successfulRequests: successfulRequests.length,
    errorRequests: errorRequests.length,
    avgResponseTime,
    minResponseTime,
    maxResponseTime,
    requestsPerSecond: flatResults.length / (duration/1000),
    successRate: (successfulRequests.length/flatResults.length*100)
  };
}

async function runSingleRequest(endpoint, description) {
  console.log(`📍 Testing ${description}...`);
  try {
    const result = await makeRequest(`${BASE_URL}${endpoint}`);
    console.log(`   ${result.statusCode === 200 ? '✅' : '❌'} ${description}: ${result.responseTime}ms (${result.contentLength} bytes)`);
    return {
      endpoint,
      description,
      success: result.statusCode === 200,
      responseTime: result.responseTime,
      contentLength: result.contentLength,
      statusCode: result.statusCode
    };
  } catch (error) {
    console.log(`   ❌ ${description}: Failed - ${error.message}`);
    return {
      endpoint,
      description,
      success: false,
      responseTime: 30000,
      contentLength: 0,
      error: error.message
    };
  }
}

async function runAPIPerformanceTests() {
  console.log('Starting comprehensive API performance testing...\n');
  
  // Single endpoint tests
  console.log('🔍 Single Endpoint Performance Tests:');
  console.log('══════════════════════════════════════\n');
  
  const singleTests = [
    { endpoint: '/', description: 'Homepage' },
    { endpoint: '/journaling', description: 'Trading Journal' },
    { endpoint: '/market-breadth', description: 'Market Breadth' },
    { endpoint: '/trading', description: 'Live Trading' },
    { endpoint: '/api/trades?limit=50', description: 'Trades API (50 records)' },
    { endpoint: '/api/trades/analytics', description: 'Analytics API' },
    { endpoint: '/api/trades/setups', description: 'Trading Setups API' }
  ];
  
  const singleResults = [];
  for (const test of singleTests) {
    const result = await runSingleRequest(test.endpoint, test.description);
    singleResults.push(result);
  }
  
  console.log('\n🔥 Load Testing Key Endpoints:');
  console.log('═══════════════════════════════════\n');
  
  // Load tests
  const loadTests = [
    { endpoint: '/api/trades?limit=10', name: 'Trades List (Light)' },
    { endpoint: '/api/trades/analytics', name: 'Analytics Dashboard' },
    { endpoint: '/api/trades/setups', name: 'Setup Configuration' }
  ];
  
  const loadResults = [];
  for (const test of loadTests) {
    console.log(`\n🧪 Testing ${test.name}`);
    const result = await runLoadTest(test.endpoint, 3, 5000); // 3 concurrent users for 5 seconds
    loadResults.push(result);
  }
  
  // Summary report
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║ 📊 API PERFORMANCE SUMMARY REPORT                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('📍 Single Request Performance:');
  singleResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.description}: ${result.responseTime}ms`);
  });
  
  console.log('\n🔥 Load Test Performance:');
  loadResults.forEach(result => {
    console.log(`📈 ${result.endpoint}:`);
    console.log(`   Success Rate: ${result.successRate.toFixed(1)}%`);
    console.log(`   Avg Response: ${result.avgResponseTime.toFixed(0)}ms`);
    console.log(`   Requests/Sec: ${result.requestsPerSecond.toFixed(1)}`);
  });
  
  // Overall assessment
  const avgSingleTime = singleResults.filter(r => r.success).reduce((sum, r) => sum + r.responseTime, 0) / singleResults.filter(r => r.success).length;
  const avgLoadTime = loadResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / loadResults.length;
  const overallSuccessRate = singleResults.filter(r => r.success).length / singleResults.length * 100;
  
  console.log('\n🎯 Overall Assessment:');
  console.log(`   Single Request Avg: ${Math.round(avgSingleTime)}ms`);
  console.log(`   Load Test Avg: ${Math.round(avgLoadTime)}ms`);
  console.log(`   Success Rate: ${overallSuccessRate.toFixed(1)}%`);
  
  let rating = '';
  if (avgLoadTime < 500) rating = '🏆 EXCELLENT (<500ms)';
  else if (avgLoadTime < 1000) rating = '🟢 VERY GOOD (<1s)';
  else if (avgLoadTime < 2000) rating = '🟡 GOOD (<2s)';
  else rating = '🔴 NEEDS OPTIMIZATION (>2s)';
  
  console.log(`   Performance Rating: ${rating}`);
  console.log(`   API Status: ${overallSuccessRate >= 90 ? '✅ PRODUCTION READY' : '⚠️ NEEDS ATTENTION'}`);
  
  return { singleResults, loadResults, avgSingleTime, avgLoadTime, overallSuccessRate };
}

if (require.main === module) {
  runAPIPerformanceTests().catch(console.error);
}

module.exports = { runAPIPerformanceTests };