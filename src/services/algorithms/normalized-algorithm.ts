/**
 * Normalized Statistical Breadth Score Algorithm
 * Uses z-scores and percentile ranking for better statistical distribution
 */

import type { 
  AlgorithmImplementation,
  BreadthCalculationConfig,
  BreadthResult,
  ValidationResult,
  MarketPhase,
  StrengthLevel,
  TrendDirection
} from '../../types/breadth-calculation-config';
import type { RawMarketBreadthData, StandardizedBreadthData } from '../../types/breadth-raw-data';

interface StatisticalMetrics {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  percentile25: number;
  percentile75: number;
}

export class NormalizedAlgorithm implements AlgorithmImplementation {
  public readonly name = 'Normalized Statistical Score';
  public readonly type = 'normalized' as const;
  public readonly description = 'Statistical normalization with z-scores and percentile ranking for better distribution';
  
  public readonly requiredFields = [
    'date',
    'advancingIssues',
    'decliningIssues'
  ];
  
  public readonly optionalFields = [
    'newHighs',
    'newLows',
    'upVolume',
    'downVolume',
    'stocksUp4PctDaily',
    'stocksDown4PctDaily',
    't2108',
    'sp500Level'
  ];

  // Cache for statistical metrics to improve performance
  private statisticalCache: Map<string, StatisticalMetrics> = new Map();

  calculate(
    rawData: RawMarketBreadthData, 
    config: BreadthCalculationConfig,
    historicalData?: RawMarketBreadthData[]
  ): BreadthResult {
    const startTime = performance.now();
    
    // Standardize the input data
    const data = this.standardizeData(rawData);
    
    // Calculate statistical metrics from historical data
    const stats = this.calculateStatisticalMetrics(historicalData || []);
    
    // Calculate normalized factor scores
    const factors = this.calculateNormalizedFactors(data, stats, config, historicalData);
    
    // Apply weights with statistical adjustments
    const components = this.applyStatisticalWeights(factors, config, stats);
    
    // Calculate final score with statistical normalization
    const rawScore = this.combineComponentsStatistically(components, config);
    const normalizedScore = this.statisticallyNormalizeScore(rawScore, config, stats);
    
    // Analyze market conditions with confidence intervals
    const marketCondition = this.analyzeStatisticalMarketCondition(normalizedScore, config, data, stats);
    
    // Calculate confidence with statistical measures
    const confidence = this.calculateStatisticalConfidence(data, factors, stats);
    
    const calculationTime = performance.now() - startTime;
    
    return {
      date: data.date,
      score: Math.round(rawScore * 10) / 10,
      normalizedScore: Math.round(normalizedScore * 10) / 10,
      confidence,
      components,
      market_condition: marketCondition,
      metadata: {
        algorithm_used: this.name,
        config_version: config.version,
        calculation_time: calculationTime,
        data_quality: data.dataQuality,
        missing_indicators: data.missingFields,
        warnings: this.generateStatisticalWarnings(data, factors, stats)
      }
    };
  }

  validate(data: RawMarketBreadthData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    // Check required fields
    if (!data.date) {
      errors.push('Date is required');
    }

    // Statistical algorithms need more data points for reliability
    const hasAdvancingDeclining = (data.advancingIssues !== undefined && data.decliningIssues !== undefined);
    const hasStocks4Pct = (data.stocksUp4PctDaily !== undefined && data.stocksDown4PctDaily !== undefined);
    
    if (!hasAdvancingDeclining && !hasStocks4Pct) {
      errors.push('Either advancing/declining issues OR stocks up/down 4% daily is required');
    }

    // Enhanced validation for statistical algorithm
    if (!data.t2108) {
      warnings.push('T2108 missing - statistical normalization will be less accurate');
      missingFields.push('t2108');
    }

    if (!data.upVolume || !data.downVolume) {
      warnings.push('Volume data missing - affects statistical reliability');
      missingFields.push('upVolume', 'downVolume');
    }

    // Check for sector data availability (important for normalized algorithm)
    const sectorFields = ['basicMaterialsSector', 'consumerCyclicalSector', 'financialServicesSector'];
    const hasSectorData = sectorFields.some(field => 
      data[field as keyof RawMarketBreadthData] !== undefined
    );
    
    if (!hasSectorData) {
      warnings.push('Sector data missing - statistical model will use reduced feature set');
    }

    const fieldCoverage = this.calculateFieldCoverage(data);
    const dataQuality = Math.max(0, Math.min(100, fieldCoverage - (errors.length * 25) - (warnings.length * 5)));

    return {
      isValid: errors.length === 0,
      score: dataQuality,
      errors,
      warnings,
      missingFields,
      fieldCoverage
    };
  }

  validateConfig(config: Partial<BreadthCalculationConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.scaling?.normalization && config.scaling.normalization === 'linear') {
      errors.push('Normalized algorithm works best with sigmoid or logarithmic normalization');
    }

    if (config.indicators?.volatility_adjustment === false) {
      errors.push('Volatility adjustment should be enabled for statistical normalization');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate statistical metrics from historical data
   */
  private calculateStatisticalMetrics(historicalData: RawMarketBreadthData[]): StatisticalMetrics {
    if (historicalData.length < 10) {
      // Return default metrics for insufficient data
      return {
        mean: 50,
        stdDev: 20,
        min: 0,
        max: 100,
        percentile25: 35,
        percentile75: 65
      };
    }

    // Calculate advance/decline ratios for statistical analysis
    const ratios = historicalData.map(data => {
      const advancing = data.advancingIssues || data.stocksUp4PctDaily || 0;
      const declining = data.decliningIssues || data.stocksDown4PctDaily || 0;
      const total = advancing + declining;
      return total > 0 ? (advancing / total) * 100 : 50;
    }).filter(ratio => !isNaN(ratio));

    if (ratios.length === 0) {
      return {
        mean: 50,
        stdDev: 20,
        min: 0,
        max: 100,
        percentile25: 35,
        percentile75: 65
      };
    }

    // Calculate statistical measures
    const mean = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
    const variance = ratios.reduce((sum, ratio) => sum + Math.pow(ratio - mean, 2), 0) / ratios.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...ratios);
    const max = Math.max(...ratios);
    
    // Calculate percentiles
    const sorted = [...ratios].sort((a, b) => a - b);
    const percentile25 = this.getPercentile(sorted, 25);
    const percentile75 = this.getPercentile(sorted, 75);

    return {
      mean: Math.round(mean * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      percentile25: Math.round(percentile25 * 10) / 10,
      percentile75: Math.round(percentile75 * 10) / 10
    };
  }

  /**
   * Get percentile value from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Standardize raw data with enhanced statistical processing
   */
  private standardizeData(rawData: RawMarketBreadthData): StandardizedBreadthData {
    return {
      date: rawData.date,
      timestamp: rawData.timestamp || new Date().toISOString(),
      
      // Primary indicators (prefer new fields, fallback to legacy)
      stocksUp4Pct: rawData.stocksUp4PctDaily || rawData.advancingIssues || 0,
      stocksDown4Pct: rawData.stocksDown4PctDaily || rawData.decliningIssues || 0,
      stocksUp25PctQuarterly: rawData.stocksUp25PctQuarterly || 0,
      stocksDown25PctQuarterly: rawData.stocksDown25PctQuarterly || 0,
      
      // Secondary indicators
      stocksUp25PctMonthly: rawData.stocksUp25PctMonthly || 0,
      stocksDown25PctMonthly: rawData.stocksDown25PctMonthly || 0,
      stocksUp50PctMonthly: rawData.stocksUp50PctMonthly || 0,
      stocksDown50PctMonthly: rawData.stocksDown50PctMonthly || 0,
      stocksUp13Pct34Days: rawData.stocksUp13Pct34Days || 0,
      stocksDown13Pct34Days: rawData.stocksDown13Pct34Days || 0,
      
      // Reference data
      advancingIssues: rawData.advancingIssues || rawData.stocksUp4PctDaily || 0,
      decliningIssues: rawData.decliningIssues || rawData.stocksDown4PctDaily || 0,
      newHighs: rawData.newHighs || 0,
      newLows: rawData.newLows || 0,
      upVolume: rawData.upVolume || 0,
      downVolume: rawData.downVolume || 0,
      wordenUniverse: rawData.wordenUniverse || 0,
      t2108: rawData.t2108 || 50,
      sp500Level: this.parseS500Level(rawData.sp500Level),
      
      // Sector data (important for normalized algorithm)
      sectors: this.extractSectorData(rawData),
      
      // Data quality metrics
      dataQuality: rawData.dataQualityScore || this.calculateDataQuality(rawData),
      missingFields: this.identifyMissingFields(rawData)
    };
  }

  /**
   * Calculate normalized factor scores using z-scores
   */
  private calculateNormalizedFactors(
    data: StandardizedBreadthData,
    stats: StatisticalMetrics,
    config: BreadthCalculationConfig,
    historicalData?: RawMarketBreadthData[]
  ) {
    return {
      // Z-score normalized advance/decline
      advanceDeclineZScore: this.calculateZScore(
        this.calculateAdvanceDeclineRatio(data), 
        stats.mean, 
        stats.stdDev
      ),
      
      // Percentile-based new high/low score
      newHighLowPercentile: this.calculatePercentileScore(
        this.calculateNewHighLowRatio(data),
        stats
      ),
      
      // Volume ratio with volatility adjustment
      volumeAdjusted: this.calculateVolatilityAdjustedVolume(data, config),
      
      // Momentum with statistical smoothing
      momentumSmoothed: this.calculateSmoothedMomentum(data, historicalData, config),
      
      // T2108 with statistical context
      t2108Normalized: this.calculateNormalizedT2108(data.t2108, stats),
      
      // Sector strength distribution (if available)
      sectorDistribution: this.calculateSectorDistribution(data)
    };
  }

  /**
   * Calculate z-score for statistical normalization
   */
  private calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  /**
   * Calculate advance/decline ratio as percentage
   */
  private calculateAdvanceDeclineRatio(data: StandardizedBreadthData): number {
    const total = data.advancingIssues + data.decliningIssues;
    return total > 0 ? (data.advancingIssues / total) * 100 : 50;
  }

  /**
   * Calculate new high/low ratio
   */
  private calculateNewHighLowRatio(data: StandardizedBreadthData): number {
    const total = data.newHighs + data.newLows;
    if (total === 0) {
      // Fallback to advance/decline ratio
      return this.calculateAdvanceDeclineRatio(data);
    }
    return (data.newHighs / total) * 100;
  }

  /**
   * Calculate percentile-based score
   */
  private calculatePercentileScore(value: number, stats: StatisticalMetrics): number {
    // Convert value to percentile rank
    if (value <= stats.percentile25) return 25;
    if (value >= stats.percentile75) return 75;
    
    // Linear interpolation between percentiles
    const range = stats.percentile75 - stats.percentile25;
    const position = (value - stats.percentile25) / range;
    return 25 + (position * 50);
  }

  /**
   * Calculate volatility-adjusted volume score
   */
  private calculateVolatilityAdjustedVolume(data: StandardizedBreadthData, config: BreadthCalculationConfig): number {
    const totalVolume = data.upVolume + data.downVolume;
    if (totalVolume === 0) return 50; // Neutral
    
    const volumeRatio = data.upVolume / totalVolume;
    
    if (config.indicators.volatility_adjustment) {
      // Apply volatility adjustment based on total volume
      const volumeNormalized = Math.log(totalVolume + 1) / Math.log(1000000 + 1); // Normalize to typical volume
      const adjustment = 1 + (volumeNormalized - 0.5) * 0.1; // Small adjustment factor
      return Math.max(0, Math.min(100, volumeRatio * 100 * adjustment));
    }
    
    return volumeRatio * 100;
  }

  /**
   * Calculate smoothed momentum score
   */
  private calculateSmoothedMomentum(
    data: StandardizedBreadthData,
    historicalData?: RawMarketBreadthData[],
    config?: BreadthCalculationConfig
  ): number {
    if (!historicalData || historicalData.length < 5) {
      return 50; // Neutral
    }

    const lookbackDays = config?.indicators.momentum_lookback_days || 10;
    const relevantDays = historicalData.slice(-lookbackDays);
    
    // Calculate exponentially weighted moving average for smoothing
    const weights = this.calculateEMAWeights(relevantDays.length);
    let weightedUp = data.stocksUp4Pct * weights[0];
    let weightedDown = data.stocksDown4Pct * weights[0];
    let totalWeight = weights[0];
    
    relevantDays.forEach((day, index) => {
      const weight = weights[index + 1] || 0;
      weightedUp += (day.stocksUp4PctDaily || day.advancingIssues || 0) * weight;
      weightedDown += (day.stocksDown4PctDaily || day.decliningIssues || 0) * weight;
      totalWeight += weight;
    });
    
    const smoothedRatio = totalWeight > 0 ? weightedUp / (weightedUp + weightedDown) : 0.5;
    return smoothedRatio * 100;
  }

  /**
   * Calculate EMA weights for momentum smoothing
   */
  private calculateEMAWeights(length: number): number[] {
    const alpha = 2 / (length + 1);
    const weights: number[] = [];
    
    for (let i = 0; i < length; i++) {
      weights.push(Math.pow(1 - alpha, i));
    }
    
    return weights;
  }

  /**
   * Calculate normalized T2108 score
   */
  private calculateNormalizedT2108(t2108: number, stats: StatisticalMetrics): number {
    // Normalize T2108 relative to historical distribution
    const zScore = this.calculateZScore(t2108, 50, 20); // Assume T2108 has ~50 mean, 20 stddev
    return Math.max(0, Math.min(100, 50 + (zScore * 15))); // Scale z-score to 0-100
  }

  /**
   * Calculate sector strength distribution
   */
  private calculateSectorDistribution(data: StandardizedBreadthData): number {
    if (!data.sectors) return 50; // Neutral if no sector data
    
    const sectorValues = Object.values(data.sectors);
    const nonZeroSectors = sectorValues.filter(value => value > 0);
    
    if (nonZeroSectors.length === 0) return 50;
    
    // Calculate sector concentration (higher = more concentrated = potentially less stable)
    const mean = nonZeroSectors.reduce((sum, val) => sum + val, 0) / nonZeroSectors.length;
    const variance = nonZeroSectors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / nonZeroSectors.length;
    const concentrationRatio = Math.sqrt(variance) / mean;
    
    // Convert to score (lower concentration = higher score)
    return Math.max(0, Math.min(100, 100 - (concentrationRatio * 50)));
  }

  /**
   * Apply statistical weights to factors
   */
  private applyStatisticalWeights(factors: any, config: BreadthCalculationConfig, stats: StatisticalMetrics) {
    const weights = config.weights;
    
    // Primary indicators with statistical adjustment
    const primaryScore = (
      this.normalizeZScore(factors.advanceDeclineZScore) * 50 +
      factors.newHighLowPercentile * 50
    ) / 100 * weights.primary_indicators;
    
    // Secondary indicators  
    const secondaryScore = (
      factors.volumeAdjusted * 50 +
      factors.momentumSmoothed * 50
    ) / 100 * weights.secondary_indicators;
    
    // Reference data
    const referenceScore = (
      factors.t2108Normalized * 100
    ) / 100 * weights.reference_data;
    
    // Sector data (weighted more heavily in normalized algorithm)
    const sectorScore = factors.sectorDistribution * weights.sector_data;

    return {
      primary_score: Math.round(primaryScore * 10) / 10,
      secondary_score: Math.round(secondaryScore * 10) / 10,
      reference_score: Math.round(referenceScore * 10) / 10,
      sector_score: Math.round(sectorScore * 10) / 10
    };
  }

  /**
   * Normalize z-score to 0-100 scale
   */
  private normalizeZScore(zScore: number): number {
    // Convert z-score to percentile (approximate)
    const percentile = 0.5 * (1 + this.erf(zScore / Math.sqrt(2)));
    return percentile * 100;
  }

  /**
   * Error function approximation for z-score to percentile conversion
   */
  private erf(x: number): number {
    // Abramowitz and Stegun approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Combine components with statistical weighting
   */
  private combineComponentsStatistically(components: any, config: BreadthCalculationConfig): number {
    return components.primary_score + 
           components.secondary_score + 
           components.reference_score + 
           components.sector_score;
  }

  /**
   * Statistically normalize final score
   */
  private statisticallyNormalizeScore(rawScore: number, config: BreadthCalculationConfig, stats: StatisticalMetrics): number {
    const { min_score, max_score, normalization } = config.scaling;
    
    switch (normalization) {
      case 'sigmoid':
        // Enhanced sigmoid with statistical parameters
        const center = (stats.mean / 100) * max_score;
        const steepness = 10 / (stats.stdDev || 20);
        const sigmoid = max_score / (1 + Math.exp(-(rawScore - center) / steepness));
        return Math.max(min_score, Math.min(max_score, sigmoid));
        
      case 'logarithmic':
        // Log normalization with statistical bounds
        const logNormalized = (Math.log(rawScore + 1) / Math.log(max_score + 1)) * max_score;
        return Math.max(min_score, Math.min(max_score, logNormalized));
        
      default:
        return Math.max(min_score, Math.min(max_score, rawScore));
    }
  }

  /**
   * Analyze market conditions with statistical context
   */
  private analyzeStatisticalMarketCondition(
    normalizedScore: number,
    config: BreadthCalculationConfig,
    data: StandardizedBreadthData,
    stats: StatisticalMetrics
  ) {
    // Adjust thresholds based on historical statistics
    const adjustedThresholds = {
      strong_bull_threshold: config.market_conditions.strong_bull_threshold + (stats.stdDev - 20) / 4,
      bull_threshold: config.market_conditions.bull_threshold + (stats.stdDev - 20) / 4,
      bear_threshold: config.market_conditions.bear_threshold - (stats.stdDev - 20) / 4,
      strong_bear_threshold: config.market_conditions.strong_bear_threshold - (stats.stdDev - 20) / 4
    };

    // Phase determination with statistical confidence
    let phase: MarketPhase;
    if (normalizedScore >= adjustedThresholds.strong_bull_threshold) {
      phase = 'BULL';
    } else if (normalizedScore >= adjustedThresholds.bull_threshold) {
      phase = 'BULL';
    } else if (normalizedScore >= adjustedThresholds.bear_threshold) {
      phase = 'NEUTRAL';
    } else {
      phase = 'BEAR';
    }

    // Enhanced strength calculation
    const distanceFromMean = Math.abs(normalizedScore - stats.mean);
    let strength: StrengthLevel;
    if (distanceFromMean > 2 * stats.stdDev) {
      strength = 'EXTREME';
    } else if (distanceFromMean > 1.5 * stats.stdDev) {
      strength = 'STRONG';
    } else if (distanceFromMean > 0.5 * stats.stdDev) {
      strength = 'MODERATE';
    } else {
      strength = 'WEAK';
    }

    // Trend direction with momentum
    let trend_direction: TrendDirection;
    const momentumThreshold = 5;
    if (normalizedScore > stats.mean + momentumThreshold) {
      trend_direction = 'UP';
    } else if (normalizedScore < stats.mean - momentumThreshold) {
      trend_direction = 'DOWN';
    } else {
      trend_direction = 'SIDEWAYS';
    }

    // Statistical confidence level
    const confidence_level = Math.min(1, 
      (data.dataQuality / 100) * 
      (1 - Math.abs(normalizedScore - stats.mean) / (3 * stats.stdDev))
    );

    return {
      phase,
      strength,
      trend_direction,
      confidence_level: Math.max(0, Math.round(confidence_level * 100) / 100)
    };
  }

  /**
   * Calculate statistical confidence
   */
  private calculateStatisticalConfidence(data: StandardizedBreadthData, factors: any, stats: StatisticalMetrics): number {
    let confidence = data.dataQuality / 100;
    
    // Adjust confidence based on statistical reliability
    if (stats.stdDev > 30) confidence *= 0.9; // High volatility reduces confidence
    if (stats.stdDev < 10) confidence *= 0.95; // Low volatility might indicate insufficient data
    
    // Sector data availability boosts confidence
    if (data.sectors && Object.values(data.sectors).some(val => val > 0)) {
      confidence *= 1.1;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate statistical warnings
   */
  private generateStatisticalWarnings(data: StandardizedBreadthData, factors: any, stats: StatisticalMetrics): string[] {
    const warnings: string[] = [];
    
    if (stats.stdDev > 35) {
      warnings.push('High market volatility detected - statistical model may be less stable');
    }
    
    if (stats.stdDev < 5) {
      warnings.push('Extremely low volatility - may indicate insufficient historical data');
    }
    
    if (!data.sectors) {
      warnings.push('No sector data available - statistical model using reduced feature set');
    }
    
    if (data.dataQuality < 70) {
      warnings.push('Low data quality affects statistical reliability');
    }
    
    return warnings;
  }

  /**
   * Parse S&P 500 level
   */
  private parseS500Level(sp500Str?: string): number {
    if (!sp500Str) return 0;
    const cleaned = sp500Str.replace(/[",]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Extract sector data
   */
  private extractSectorData(rawData: RawMarketBreadthData) {
    const hasSectorData = [
      'basicMaterialsSector',
      'consumerCyclicalSector', 
      'financialServicesSector'
    ].some(field => rawData[field as keyof RawMarketBreadthData] !== undefined);

    if (!hasSectorData) return undefined;

    return {
      basicMaterials: rawData.basicMaterialsSector || 0,
      consumerCyclical: rawData.consumerCyclicalSector || 0,
      financialServices: rawData.financialServicesSector || 0,
      realEstate: rawData.realEstateSector || 0,
      consumerDefensive: rawData.consumerDefensiveSector || 0,
      healthcare: rawData.healthcareSector || 0,
      utilities: rawData.utilitiesSector || 0,
      communicationServices: rawData.communicationServicesSector || 0,
      energy: rawData.energySector || 0,
      industrials: rawData.industrialsSector || 0,
      technology: rawData.technologySector || 0
    };
  }

  /**
   * Calculate field coverage percentage
   */
  private calculateFieldCoverage(rawData: RawMarketBreadthData): number {
    const allFields = [...this.requiredFields, ...this.optionalFields];
    const presentFields = allFields.filter(field => 
      rawData[field as keyof RawMarketBreadthData] !== undefined &&
      rawData[field as keyof RawMarketBreadthData] !== null
    ).length;
    
    return (presentFields / allFields.length) * 100;
  }

  /**
   * Calculate data quality score
   */
  private calculateDataQuality(rawData: RawMarketBreadthData): number {
    return this.calculateFieldCoverage(rawData);
  }

  /**
   * Identify missing fields
   */
  private identifyMissingFields(rawData: RawMarketBreadthData): string[] {
    const allFields = [...this.requiredFields, ...this.optionalFields];
    return allFields.filter(field => 
      rawData[field as keyof RawMarketBreadthData] === undefined ||
      rawData[field as keyof RawMarketBreadthData] === null
    );
  }
}