/**
 * Breadth Score Calculator Usage Examples
 * Demonstrates how to use the flexible breadth calculator system
 */

import { BreadthScoreCalculator } from '../services/breadth-score-calculator';
import { IntegratedBreadthCalculator } from '../services/integrated-breadth-calculator';
import type { RawMarketBreadthData, AlgorithmType } from '../types';

// Example market data (typical trading day)
const exampleMarketData: RawMarketBreadthData = {
  date: '2025-08-25',
  timestamp: '2025-08-25T16:00:00Z',
  
  // Primary breadth indicators
  advancingIssues: 1200,
  decliningIssues: 800,
  newHighs: 150,
  newLows: 50,
  
  // Volume data
  upVolume: 2500000000,
  downVolume: 1500000000,
  
  // 4% movers
  stocksUp4PctDaily: 180,
  stocksDown4PctDaily: 120,
  
  // Quarterly and monthly data
  stocksUp25PctQuarterly: 450,
  stocksDown25PctQuarterly: 200,
  stocksUp25PctMonthly: 280,
  stocksDown25PctMonthly: 150,
  
  // Reference indicators
  t2108: 65,
  sp500Level: '5,847',
  wordenUniverse: 2500,
  
  // Sector data (for sector-weighted algorithm)
  basicMaterialsSector: 75,
  consumerCyclicalSector: 80,
  financialServicesSector: 85,
  realEstateSector: 70,
  consumerDefensiveSector: 65,
  healthcareSector: 90,
  utilitiesSector: 60,
  communicationServicesSector: 85,
  energySector: 55,
  industrialsSector: 78,
  technologySector: 92,
  
  dataQualityScore: 95
};

/**
 * Example 1: Basic Calculator Usage
 */
export async function basicCalculatorExample() {
  console.log('=== Basic Calculator Example ===');
  
  // Initialize calculator with default six-factor algorithm
  const calculator = new BreadthScoreCalculator();
  
  // Calculate breadth score
  const result = calculator.calculate(exampleMarketData);
  
  console.log('Calculation Result:');
  console.log(`Date: ${result.date}`);
  console.log(`Score: ${result.score.toFixed(1)}`);
  console.log(`Normalized Score: ${result.normalizedScore.toFixed(1)}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`Market Phase: ${result.market_condition.phase}`);
  console.log(`Trend Direction: ${result.market_condition.trend_direction}`);
  console.log(`Algorithm: ${result.metadata.algorithm_used}`);
  console.log(`Calculation Time: ${result.metadata.calculation_time.toFixed(2)}ms`);
  
  return result;
}

/**
 * Example 2: Multi-Algorithm Comparison
 */
export async function multiAlgorithmExample() {
  console.log('\n=== Multi-Algorithm Comparison ===');
  
  const calculator = new BreadthScoreCalculator();
  const algorithms: AlgorithmType[] = ['six_factor', 'normalized', 'sector_weighted'];
  const results: { [key: string]: any } = {};
  
  for (const algorithm of algorithms) {
    console.log(`\nCalculating with ${algorithm} algorithm...`);
    
    // Switch algorithm
    calculator.switchAlgorithm(algorithm);
    
    // Calculate score
    const result = calculator.calculate(exampleMarketData);
    results[algorithm] = result;
    
    console.log(`${algorithm}: Score=${result.score.toFixed(1)}, Phase=${result.market_condition.phase}`);
    console.log(`  Components: Primary=${result.components.primary_score.toFixed(1)}, ` +
                `Secondary=${result.components.secondary_score.toFixed(1)}, ` +
                `Reference=${result.components.reference_score.toFixed(1)}, ` +
                `Sector=${result.components.sector_score.toFixed(1)}`);
  }
  
  // Compare results
  console.log('\nComparison Summary:');
  const scores = Object.entries(results).map(([alg, result]) => ({ algorithm: alg, score: result.score }));
  scores.sort((a, b) => b.score - a.score);
  
  scores.forEach((item, index) => {
    console.log(`${index + 1}. ${item.algorithm}: ${item.score.toFixed(1)}`);
  });
  
  return results;
}

/**
 * Example 3: Custom Configuration
 */
export async function customConfigurationExample() {
  console.log('\n=== Custom Configuration Example ===');
  
  const calculator = new BreadthScoreCalculator();
  
  // Create conservative configuration (emphasizes primary indicators)
  const conservativeConfig = calculator.getDefaultConfig('six_factor');
  conservativeConfig.weights = {
    primary_indicators: 0.60,    // Emphasize advance/decline and new highs/lows
    secondary_indicators: 0.25,  // Reduce volume and mover emphasis
    reference_data: 0.15,        // Lower T2108 and momentum weight
    sector_data: 0.0
  };
  conservativeConfig.market_conditions = {
    strong_bull_threshold: 80,   // Higher thresholds for bull/bear calls
    bull_threshold: 65,
    bear_threshold: 35,
    strong_bear_threshold: 20,
    trend_strength_multiplier: 2.0
  };
  
  // Apply configuration
  calculator.updateConfig(conservativeConfig);
  
  // Calculate with conservative settings
  const conservativeResult = calculator.calculate(exampleMarketData);
  
  console.log('Conservative Configuration Result:');
  console.log(`Score: ${conservativeResult.score.toFixed(1)}`);
  console.log(`Market Phase: ${conservativeResult.market_condition.phase}`);
  console.log(`Primary Component Weight: ${(conservativeConfig.weights.primary_indicators * 100)}%`);
  
  // Now try aggressive configuration (emphasizes momentum and volume)
  const aggressiveConfig = calculator.getDefaultConfig('six_factor');
  aggressiveConfig.weights = {
    primary_indicators: 0.25,
    secondary_indicators: 0.50,  // Emphasize volume and movers
    reference_data: 0.25,        // Emphasize momentum
    sector_data: 0.0
  };
  aggressiveConfig.indicators.momentum_lookback_days = 3; // Shorter momentum period
  
  calculator.updateConfig(aggressiveConfig);
  const aggressiveResult = calculator.calculate(exampleMarketData);
  
  console.log('\nAggressive Configuration Result:');
  console.log(`Score: ${aggressiveResult.score.toFixed(1)}`);
  console.log(`Market Phase: ${aggressiveResult.market_condition.phase}`);
  console.log(`Secondary Component Weight: ${(aggressiveConfig.weights.secondary_indicators * 100)}%`);
  
  return { conservative: conservativeResult, aggressive: aggressiveResult };
}

/**
 * Example 4: Historical Analysis
 */
export async function historicalAnalysisExample() {
  console.log('\n=== Historical Analysis Example ===');
  
  const calculator = new BreadthScoreCalculator();
  
  // Simulate 30 days of market data
  const historicalData: RawMarketBreadthData[] = [];
  const baseDate = new Date('2025-08-01');
  
  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(baseDate.getDate() + i);
    
    // Simulate market trend (gradual improvement)
    const trendFactor = i / 30; // 0 to 1 over 30 days
    const noise = (Math.random() - 0.5) * 0.4; // ±20% noise
    
    historicalData.push({
      date: currentDate.toISOString().split('T')[0],
      advancingIssues: Math.round(800 + (600 * trendFactor) + (200 * noise)),
      decliningIssues: Math.round(1200 - (600 * trendFactor) + (200 * noise)),
      newHighs: Math.round(50 + (150 * trendFactor) + (50 * noise)),
      newLows: Math.round(200 - (150 * trendFactor) + (50 * noise)),
      upVolume: Math.round(1500000000 + (2000000000 * trendFactor) + (500000000 * noise)),
      downVolume: Math.round(2500000000 - (1500000000 * trendFactor) + (500000000 * noise)),
      stocksUp4PctDaily: Math.round(100 + (150 * trendFactor) + (50 * noise)),
      stocksDown4PctDaily: Math.round(200 - (100 * trendFactor) + (50 * noise)),
      t2108: Math.round(30 + (40 * trendFactor) + (15 * noise))
    });
  }
  
  // Calculate historical scores
  console.log('Calculating 30-day historical breadth scores...');
  const results = calculator.calculateHistorical(historicalData);
  
  console.log(`Calculated ${results.length} historical scores`);
  
  // Analyze trend
  const scores = results.map(r => r.score);
  const firstWeekAvg = scores.slice(0, 7).reduce((sum, score) => sum + score, 0) / 7;
  const lastWeekAvg = scores.slice(-7).reduce((sum, score) => sum + score, 0) / 7;
  
  console.log(`First Week Average: ${firstWeekAvg.toFixed(1)}`);
  console.log(`Last Week Average: ${lastWeekAvg.toFixed(1)}`);
  console.log(`Trend Improvement: ${(lastWeekAvg - firstWeekAvg).toFixed(1)} points`);
  
  // Market phase distribution
  const phases = results.map(r => r.market_condition.phase);
  const phaseCount = phases.reduce((acc, phase) => {
    acc[phase] = (acc[phase] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\nMarket Phase Distribution:');
  Object.entries(phaseCount).forEach(([phase, count]) => {
    console.log(`  ${phase}: ${count} days (${((count / results.length) * 100).toFixed(1)}%)`);
  });
  
  return results;
}

/**
 * Example 5: Custom Formula Algorithm
 */
export async function customFormulaExample() {
  console.log('\n=== Custom Formula Example ===');
  
  const calculator = new BreadthScoreCalculator();
  
  // Create custom formula configuration
  const customConfig = calculator.getDefaultConfig('custom');
  customConfig.custom_formula = '(advanceDeclineRatio * 0.4) + (volumeRatio * 0.3) + (t2108 * 0.3)';
  customConfig.custom_parameters = {
    volume_boost: 1.2,
    momentum_weight: 0.8
  };
  customConfig.name = 'Volume-Focused Custom Formula';
  customConfig.description = 'Emphasizes volume and T2108 for intraday trading';
  
  // Apply custom configuration
  calculator.switchAlgorithm('custom', customConfig);
  
  // Calculate with custom formula
  const result = calculator.calculate(exampleMarketData);
  
  console.log('Custom Formula Result:');
  console.log(`Formula: ${customConfig.custom_formula}`);
  console.log(`Score: ${result.score.toFixed(1)}`);
  console.log(`Market Condition: ${result.market_condition.phase} (${result.market_condition.strength})`);
  console.log(`Data Quality: ${result.metadata.data_quality}%`);
  
  if (result.metadata.warnings && result.metadata.warnings.length > 0) {
    console.log(`Warnings: ${result.metadata.warnings.join(', ')}`);
  }
  
  return result;
}

/**
 * Example 6: Performance Monitoring
 */
export async function performanceMonitoringExample() {
  console.log('\n=== Performance Monitoring Example ===');
  
  const calculator = new BreadthScoreCalculator();
  
  // Perform multiple calculations to generate metrics
  const testData = Array.from({ length: 20 }, (_, i) => ({
    ...exampleMarketData,
    date: `2025-08-${String(i + 1).padStart(2, '0')}`,
    advancingIssues: 800 + Math.random() * 800,
    decliningIssues: 600 + Math.random() * 800
  }));
  
  console.log('Performing 20 calculations to generate performance data...');
  
  const startTime = performance.now();
  for (const data of testData) {
    calculator.calculate(data);
  }
  const totalTime = performance.now() - startTime;
  
  // Get performance metrics
  const metrics = calculator.getPerformanceMetrics();
  
  console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
  console.log(`Average Time per Calculation: ${(totalTime / 20).toFixed(2)}ms`);
  console.log(`Performance Metrics Collected: ${metrics.length}`);
  
  if (metrics.length > 0) {
    const avgCalculationTime = metrics.reduce((sum, m) => sum + m.calculationTime, 0) / metrics.length;
    const avgRecordsPerSecond = metrics.reduce((sum, m) => sum + m.recordsPerSecond, 0) / metrics.length;
    
    console.log(`Average Calculation Time: ${avgCalculationTime.toFixed(2)}ms`);
    console.log(`Average Records/Second: ${avgRecordsPerSecond.toFixed(0)}`);
    console.log(`Fastest Calculation: ${Math.min(...metrics.map(m => m.calculationTime)).toFixed(2)}ms`);
    console.log(`Slowest Calculation: ${Math.max(...metrics.map(m => m.calculationTime)).toFixed(2)}ms`);
  }
  
  return metrics;
}

/**
 * Example 7: Real-world Trading Integration
 */
export async function tradingIntegrationExample() {
  console.log('\n=== Trading Integration Example ===');
  
  // This example demonstrates how to integrate breadth scores with trading decisions
  
  const calculator = new BreadthScoreCalculator();
  
  // Morning market assessment
  const morningData: RawMarketBreadthData = {
    ...exampleMarketData,
    date: '2025-08-25',
    advancingIssues: 900,
    decliningIssues: 1100,
    newHighs: 80,
    newLows: 150,
    t2108: 45
  };
  
  const morningScore = calculator.calculate(morningData);
  console.log(`Morning Breadth Score: ${morningScore.score.toFixed(1)}`);
  console.log(`Morning Market Phase: ${morningScore.market_condition.phase}`);
  
  // Trading decision logic based on breadth score
  let tradingStrategy = '';
  if (morningScore.score > 70 && morningScore.market_condition.phase === 'BULL') {
    tradingStrategy = 'AGGRESSIVE_LONG';
  } else if (morningScore.score < 30 && morningScore.market_condition.phase === 'BEAR') {
    tradingStrategy = 'DEFENSIVE_SHORT';
  } else if (morningScore.score > 55) {
    tradingStrategy = 'SELECTIVE_LONG';
  } else if (morningScore.score < 45) {
    tradingStrategy = 'CASH_PRESERVATION';
  } else {
    tradingStrategy = 'NEUTRAL_WATCHLIST';
  }
  
  console.log(`Recommended Strategy: ${tradingStrategy}`);
  
  // Afternoon reassessment
  const afternoonData: RawMarketBreadthData = {
    ...exampleMarketData,
    date: '2025-08-25',
    advancingIssues: 1300,
    decliningIssues: 700,
    newHighs: 180,
    newLows: 60,
    t2108: 68
  };
  
  const afternoonScore = calculator.calculate(afternoonData);
  const scoreImprovement = afternoonScore.score - morningScore.score;
  
  console.log(`\nAfternoon Breadth Score: ${afternoonScore.score.toFixed(1)}`);
  console.log(`Score Improvement: ${scoreImprovement > 0 ? '+' : ''}${scoreImprovement.toFixed(1)}`);
  console.log(`Afternoon Market Phase: ${afternoonScore.market_condition.phase}`);
  
  // Strategy adjustment based on improvement
  if (scoreImprovement > 10) {
    console.log('Strategy Adjustment: Increase position sizes - strong improvement detected');
  } else if (scoreImprovement < -10) {
    console.log('Strategy Adjustment: Reduce exposure - deteriorating conditions');
  } else {
    console.log('Strategy Adjustment: Maintain current approach - stable conditions');
  }
  
  return {
    morning: morningScore,
    afternoon: afternoonScore,
    strategy: tradingStrategy,
    improvement: scoreImprovement
  };
}

/**
 * Example 8: Configuration Management
 */
export async function configurationManagementExample() {
  console.log('\n=== Configuration Management Example ===');
  
  const calculator = new BreadthScoreCalculator();
  
  // Show current configuration
  const currentConfig = calculator.getCurrentConfig();
  console.log(`Current Algorithm: ${currentConfig.algorithm}`);
  console.log(`Current Weights: Primary=${(currentConfig.weights.primary_indicators * 100)}%, ` +
              `Secondary=${(currentConfig.weights.secondary_indicators * 100)}%, ` +
              `Reference=${(currentConfig.weights.reference_data * 100)}%`);
  
  // Create a day trading configuration (shorter momentum periods)
  const dayTradingConfig = calculator.getDefaultConfig('six_factor');
  dayTradingConfig.name = 'Day Trading Configuration';
  dayTradingConfig.description = 'Optimized for intraday trading with shorter momentum periods';
  dayTradingConfig.indicators.momentum_lookback_days = 3;
  dayTradingConfig.weights = {
    primary_indicators: 0.35,
    secondary_indicators: 0.45,  // Emphasize volume for day trading
    reference_data: 0.20,
    sector_data: 0.0
  };
  dayTradingConfig.market_conditions = {
    strong_bull_threshold: 72,   // Lower thresholds for faster signals
    bull_threshold: 58,
    bear_threshold: 42,
    strong_bear_threshold: 28,
    trend_strength_multiplier: 2.5
  };
  
  calculator.updateConfig(dayTradingConfig);
  
  const dayTradingResult = calculator.calculate(exampleMarketData);
  console.log(`\nDay Trading Score: ${dayTradingResult.score.toFixed(1)}`);
  console.log(`Day Trading Phase: ${dayTradingResult.market_condition.phase}`);
  
  return {
    original: currentConfig,
    dayTrading: dayTradingConfig,
    result: dayTradingResult
  };
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Breadth Score Calculator - Complete Usage Examples\n');
  
  try {
    await basicCalculatorExample();
    await multiAlgorithmExample();
    await customConfigurationExample();
    await tradingIntegrationExample();
    await configurationManagementExample();
    await performanceMonitoringExample();
    
    console.log('\n✅ All examples completed successfully!');
    console.log('\nThe Flexible Breadth Score Calculator is ready for production use.');
    console.log('Integration points:');
    console.log('- Market Breadth Dashboard: Real-time score display');
    console.log('- Trade Journaling: Market context for each trade');
    console.log('- Live Trading: Algorithmic signal generation');
    console.log('- Historical Analysis: Strategy backtesting support');
    
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  }
}

// Export for module usage
export {
  exampleMarketData,
  BreadthScoreCalculator,
  IntegratedBreadthCalculator
};