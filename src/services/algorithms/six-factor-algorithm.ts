/**
 * Six-Factor Breadth Score Algorithm
 * Standard breadth calculation based on 6 key market indicators
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

export class SixFactorAlgorithm implements AlgorithmImplementation {
  public readonly name = '6-Factor Breadth Score';
  public readonly type = 'six_factor' as const;
  public readonly description = 'Standard 6-factor breadth calculation based on advance/decline ratios, new highs/lows, volume, 4% movers, T2108, and momentum';
  
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

  /**
   * Calculate 6-Factor Breadth Score
   */
  calculate(
    rawData: RawMarketBreadthData, 
    config: BreadthCalculationConfig,
    historicalData?: RawMarketBreadthData[]
  ): BreadthResult {
    const startTime = performance.now();
    
    // Standardize the input data
    const data = this.standardizeData(rawData);
    
    // Calculate individual factor scores
    const factors = this.calculateFactors(data, config, historicalData);
    
    // Apply weights and combine factors
    const components = this.applyWeights(factors, config);
    
    // Calculate final score
    const rawScore = this.combineComponents(components, config);
    const normalizedScore = this.normalizeScore(rawScore, config);
    
    // Analyze market conditions
    const marketCondition = this.analyzeMarketCondition(normalizedScore, config, data);
    
    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(data, factors);
    
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
        warnings: this.generateWarnings(data, factors)
      }
    };
  }

  /**
   * Validate input data for Six-Factor algorithm
   */
  validate(data: RawMarketBreadthData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    // Check required fields
    if (!data.date) {
      errors.push('Date is required');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      errors.push('Date must be in YYYY-MM-DD format');
    }

    // Check primary indicators
    const hasAdvancingDeclining = (data.advancingIssues !== undefined && data.decliningIssues !== undefined);
    const hasStocks4Pct = (data.stocksUp4PctDaily !== undefined && data.stocksDown4PctDaily !== undefined);
    
    if (!hasAdvancingDeclining && !hasStocks4Pct) {
      errors.push('Either advancing/declining issues OR stocks up/down 4% daily is required');
    }

    // Check for optional but important fields
    if (data.newHighs === undefined || data.newLows === undefined) {
      missingFields.push('newHighs', 'newLows');
      warnings.push('New highs/lows data missing - factor 2 will use fallback calculation');
    }

    if (data.upVolume === undefined || data.downVolume === undefined) {
      missingFields.push('upVolume', 'downVolume');
      warnings.push('Volume data missing - factor 3 will use fallback calculation');
    }

    if (data.t2108 === undefined) {
      missingFields.push('t2108');
      warnings.push('T2108 indicator missing - factor 5 will use neutral value');
    }

    // Calculate field coverage
    const totalExpectedFields = this.requiredFields.length + this.optionalFields.length;
    const presentFields = this.requiredFields.filter(field => 
      data[field as keyof RawMarketBreadthData] !== undefined
    ).length + this.optionalFields.filter(field => 
      data[field as keyof RawMarketBreadthData] !== undefined
    ).length;
    
    const fieldCoverage = (presentFields / totalExpectedFields) * 100;
    const dataQuality = Math.max(0, Math.min(100, fieldCoverage - (errors.length * 20) - (warnings.length * 5)));

    return {
      isValid: errors.length === 0,
      score: dataQuality,
      errors,
      warnings,
      missingFields,
      fieldCoverage
    };
  }

  /**
   * Validate configuration for Six-Factor algorithm
   */
  validateConfig(config: Partial<BreadthCalculationConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.weights) {
      const weights = config.weights;
      if (weights.primary_indicators + weights.secondary_indicators + weights.reference_data > 1.1) {
        errors.push('Total weights for Six-Factor algorithm should not exceed 110%');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Standardize raw data for calculation
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
      
      // Data quality metrics
      dataQuality: rawData.dataQualityScore || this.calculateDataQuality(rawData),
      missingFields: this.identifyMissingFields(rawData)
    };
  }

  /**
   * Parse S&P 500 level from various string formats
   */
  private parseS500Level(sp500Str?: string): number {
    if (!sp500Str) return 0;
    const cleaned = sp500Str.replace(/[",]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Calculate data quality score based on field completeness
   */
  private calculateDataQuality(rawData: RawMarketBreadthData): number {
    const allFields = [...this.requiredFields, ...this.optionalFields];
    const presentFields = allFields.filter(field => 
      rawData[field as keyof RawMarketBreadthData] !== undefined &&
      rawData[field as keyof RawMarketBreadthData] !== null
    ).length;
    
    return Math.round((presentFields / allFields.length) * 100);
  }

  /**
   * Identify missing fields for metadata
   */
  private identifyMissingFields(rawData: RawMarketBreadthData): string[] {
    const allFields = [...this.requiredFields, ...this.optionalFields];
    return allFields.filter(field => 
      rawData[field as keyof RawMarketBreadthData] === undefined ||
      rawData[field as keyof RawMarketBreadthData] === null
    );
  }

  /**
   * Calculate individual factor scores (6 factors)
   */
  private calculateFactors(
    data: StandardizedBreadthData, 
    config: BreadthCalculationConfig,
    historicalData?: RawMarketBreadthData[]
  ) {
    return {
      // Factor 1: Advance/Decline Ratio (Primary Indicator)
      advanceDeclineRatio: this.calculateAdvanceDeclineScore(data),
      
      // Factor 2: New High/Low Ratio (Primary Indicator)
      newHighLowRatio: this.calculateNewHighLowScore(data),
      
      // Factor 3: Up/Down Volume Ratio (Secondary Indicator)
      volumeRatio: this.calculateVolumeScore(data),
      
      // Factor 4: 4% Movers Ratio (Secondary Indicator)
      moversRatio: this.calculateMoversScore(data),
      
      // Factor 5: T2108 Indicator (Reference Data)
      t2108Score: this.calculateT2108Score(data, config),
      
      // Factor 6: Momentum (Reference Data - requires historical data)
      momentumScore: this.calculateMomentumScore(data, historicalData, config)
    };
  }

  /**
   * Factor 1: Advance/Decline Ratio Score (25 points max)
   */
  private calculateAdvanceDeclineScore(data: StandardizedBreadthData): number {
    const totalIssues = data.advancingIssues + data.decliningIssues;
    if (totalIssues === 0) return 12.5; // Neutral score
    
    const ratio = data.advancingIssues / totalIssues;
    return ratio * 25;
  }

  /**
   * Factor 2: New High/Low Ratio Score (20 points max)
   */
  private calculateNewHighLowScore(data: StandardizedBreadthData): number {
    const totalNewHighLow = data.newHighs + data.newLows;
    if (totalNewHighLow === 0) {
      // Fallback: use advance/decline as proxy
      return this.calculateAdvanceDeclineScore(data) * (20 / 25);
    }
    
    const ratio = data.newHighs / totalNewHighLow;
    return ratio * 20;
  }

  /**
   * Factor 3: Up/Down Volume Ratio Score (20 points max)
   */
  private calculateVolumeScore(data: StandardizedBreadthData): number {
    const totalVolume = data.upVolume + data.downVolume;
    if (totalVolume === 0) {
      // Fallback: use advance/decline as proxy
      return this.calculateAdvanceDeclineScore(data) * (20 / 25);
    }
    
    const ratio = data.upVolume / totalVolume;
    return ratio * 20;
  }

  /**
   * Factor 4: 4% Movers Score (15 points max)
   */
  private calculateMoversScore(data: StandardizedBreadthData): number {
    const total4PctMovers = data.stocksUp4Pct + data.stocksDown4Pct;
    if (total4PctMovers === 0) return 7.5; // Neutral score
    
    const ratio = data.stocksUp4Pct / total4PctMovers;
    return ratio * 15;
  }

  /**
   * Factor 5: T2108 Score (10 points max)
   */
  private calculateT2108Score(data: StandardizedBreadthData, config: BreadthCalculationConfig): number {
    const t2108 = data.t2108;
    const threshold = config.indicators.t2108_threshold;
    
    // Normalize T2108 around the threshold
    const normalizedT2108 = Math.max(0, Math.min(100, t2108));
    return (normalizedT2108 / 100) * 10;
  }

  /**
   * Factor 6: Momentum Score (10 points max)
   * Based on 5-day or 10-day ratios if historical data available
   */
  private calculateMomentumScore(
    data: StandardizedBreadthData, 
    historicalData?: RawMarketBreadthData[],
    config?: BreadthCalculationConfig
  ): number {
    if (!historicalData || historicalData.length < 4) {
      return 5; // Neutral score when no historical data
    }

    const lookbackDays = config?.indicators.momentum_lookback_days || 5;
    const relevantDays = historicalData.slice(-lookbackDays + 1); // -1 because current day not in historical
    
    // Calculate momentum ratio
    const currentUp = data.stocksUp4Pct;
    const currentDown = data.stocksDown4Pct;
    
    const historicalUp = relevantDays.reduce((sum, day) => 
      sum + (day.stocksUp4PctDaily || day.advancingIssues || 0), 0);
    const historicalDown = relevantDays.reduce((sum, day) => 
      sum + (day.stocksDown4PctDaily || day.decliningIssues || 0), 0);
    
    const totalUp = currentUp + historicalUp;
    const totalDown = currentDown + historicalDown;
    
    if (totalDown === 0) return 5; // Neutral score
    
    const momentumRatio = totalUp / totalDown;
    
    // Scale to 0-10 points (ratio of 2.0 = max score)
    return Math.min(10, (momentumRatio / 2.0) * 10);
  }

  /**
   * Apply configuration weights to factor scores
   */
  private applyWeights(factors: any, config: BreadthCalculationConfig) {
    const weights = config.weights;
    
    // Primary indicators (Factors 1-2): 40% default weight
    const primaryScore = (factors.advanceDeclineRatio + factors.newHighLowRatio) * weights.primary_indicators;
    
    // Secondary indicators (Factors 3-4): 35% default weight  
    const secondaryScore = (factors.volumeRatio + factors.moversRatio) * weights.secondary_indicators;
    
    // Reference data (Factors 5-6): 25% default weight
    const referenceScore = (factors.t2108Score + factors.momentumScore) * weights.reference_data;
    
    // Sector data: Not used in Six-Factor algorithm
    const sectorScore = 0;

    return {
      primary_score: Math.round(primaryScore * 10) / 10,
      secondary_score: Math.round(secondaryScore * 10) / 10,
      reference_score: Math.round(referenceScore * 10) / 10,
      sector_score: sectorScore
    };
  }

  /**
   * Combine component scores into final raw score
   */
  private combineComponents(components: any, config: BreadthCalculationConfig): number {
    return components.primary_score + 
           components.secondary_score + 
           components.reference_score + 
           components.sector_score;
  }

  /**
   * Normalize score based on configuration
   */
  private normalizeScore(rawScore: number, config: BreadthCalculationConfig): number {
    const { min_score, max_score, normalization } = config.scaling;
    
    switch (normalization) {
      case 'linear':
        return Math.max(min_score, Math.min(max_score, rawScore));
        
      case 'logarithmic':
        // Apply log normalization for extreme values
        const logNormalized = Math.log(rawScore + 1) / Math.log(max_score + 1) * max_score;
        return Math.max(min_score, Math.min(max_score, logNormalized));
        
      case 'sigmoid':
        // Sigmoid function for S-curve normalization
        const sigmoid = max_score / (1 + Math.exp(-(rawScore - 50) / 10));
        return Math.max(min_score, Math.min(max_score, sigmoid));
        
      default:
        return Math.max(min_score, Math.min(max_score, rawScore));
    }
  }

  /**
   * Analyze market conditions based on normalized score
   */
  private analyzeMarketCondition(
    normalizedScore: number, 
    config: BreadthCalculationConfig,
    data: StandardizedBreadthData
  ) {
    const thresholds = config.market_conditions;
    
    // Determine market phase
    let phase: MarketPhase;
    if (normalizedScore >= thresholds.strong_bull_threshold) {
      phase = 'BULL';
    } else if (normalizedScore >= thresholds.bull_threshold) {
      phase = 'BULL';
    } else if (normalizedScore >= thresholds.bear_threshold) {
      phase = 'NEUTRAL';
    } else if (normalizedScore >= thresholds.strong_bear_threshold) {
      phase = 'BEAR';
    } else {
      phase = 'BEAR';
    }

    // Determine strength level
    let strength: StrengthLevel;
    if (normalizedScore >= thresholds.strong_bull_threshold || normalizedScore <= thresholds.strong_bear_threshold) {
      strength = 'EXTREME';
    } else if (normalizedScore >= (thresholds.strong_bull_threshold - 10) || normalizedScore <= (thresholds.strong_bear_threshold + 10)) {
      strength = 'STRONG';
    } else if (normalizedScore >= (thresholds.bull_threshold - 5) || normalizedScore <= (thresholds.bear_threshold + 5)) {
      strength = 'MODERATE';
    } else {
      strength = 'WEAK';
    }

    // Determine trend direction (simplified)
    let trend_direction: TrendDirection;
    if (normalizedScore > 55) {
      trend_direction = 'UP';
    } else if (normalizedScore < 45) {
      trend_direction = 'DOWN';
    } else {
      trend_direction = 'SIDEWAYS';
    }

    // Calculate confidence level
    const confidence_level = Math.min(1, data.dataQuality / 100 * config.scaling.confidence_threshold);

    return {
      phase,
      strength,
      trend_direction,
      confidence_level: Math.round(confidence_level * 100) / 100
    };
  }

  /**
   * Calculate confidence score based on data quality and factor reliability
   */
  private calculateConfidence(data: StandardizedBreadthData, factors: any): number {
    let confidence = data.dataQuality / 100;
    
    // Reduce confidence for missing key indicators
    if (data.newHighs === 0 && data.newLows === 0) confidence *= 0.9;
    if (data.upVolume === 0 && data.downVolume === 0) confidence *= 0.9;
    if (data.t2108 === 50) confidence *= 0.95; // Default value used
    
    // Boost confidence for complete data
    const totalIssues = data.advancingIssues + data.decliningIssues;
    if (totalIssues > 1000) confidence *= 1.05; // Good sample size
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate warnings for potential data quality issues
   */
  private generateWarnings(data: StandardizedBreadthData, factors: any): string[] {
    const warnings: string[] = [];
    
    if (data.dataQuality < 80) {
      warnings.push('Low data quality detected - some indicators may be unreliable');
    }
    
    if (data.newHighs === 0 && data.newLows === 0) {
      warnings.push('New highs/lows data missing - using fallback calculation');
    }
    
    if (data.upVolume === 0 && data.downVolume === 0) {
      warnings.push('Volume data missing - using fallback calculation');
    }
    
    if (data.t2108 === 50) {
      warnings.push('T2108 indicator using neutral default value');
    }

    const totalIssues = data.advancingIssues + data.decliningIssues;
    if (totalIssues < 100) {
      warnings.push('Low sample size - results may not be representative');
    }
    
    return warnings;
  }
}