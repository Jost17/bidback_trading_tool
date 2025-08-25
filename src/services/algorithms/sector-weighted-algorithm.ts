/**
 * Sector-Weighted Breadth Score Algorithm
 * Emphasizes sector rotation and distribution for institutional trading patterns
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

interface SectorMetrics {
  participation: number;      // % of sectors with positive movement
  leadership: number;         // Strength of leading sectors
  rotation: number;          // Evidence of sector rotation
  breadth: number;           // Distribution across sectors
  momentum: number;          // Sector momentum consistency
}

interface SectorData {
  basicMaterials: number;
  consumerCyclical: number;
  financialServices: number;
  realEstate: number;
  consumerDefensive: number;
  healthcare: number;
  utilities: number;
  communicationServices: number;
  energy: number;
  industrials: number;
  technology: number;
}

export class SectorWeightedAlgorithm implements AlgorithmImplementation {
  public readonly name = 'Sector-Weighted Analysis';
  public readonly type = 'sector_weighted' as const;
  public readonly description = 'Emphasizes sector rotation and distribution for institutional trading patterns';
  
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
    'sp500Level',
    'basicMaterialsSector',
    'consumerCyclicalSector',
    'financialServicesSector',
    'realEstateSector',
    'consumerDefensiveSector',
    'healthcareSector',
    'utilitiesSector',
    'communicationServicesSector',
    'energySector',
    'industrialsSector',
    'technologySector'
  ];

  // Sector weight mappings for institutional importance
  private readonly SECTOR_WEIGHTS = {
    technology: 0.28,           // Largest market cap weight
    healthcare: 0.13,
    financialServices: 0.11,
    consumerCyclical: 0.10,
    communicationServices: 0.09,
    industrials: 0.08,
    consumerDefensive: 0.07,
    energy: 0.04,
    utilities: 0.03,
    realEstate: 0.03,
    basicMaterials: 0.04
  };

  calculate(
    rawData: RawMarketBreadthData, 
    config: BreadthCalculationConfig,
    historicalData?: RawMarketBreadthData[]
  ): BreadthResult {
    const startTime = performance.now();
    
    // Standardize the input data
    const data = this.standardizeData(rawData);
    
    // Calculate sector metrics
    const sectorMetrics = this.calculateSectorMetrics(data, historicalData);
    
    // Calculate traditional breadth factors
    const traditionalFactors = this.calculateTraditionalFactors(data, config, historicalData);
    
    // Combine sector and traditional analysis
    const components = this.combineSectorAndTraditional(traditionalFactors, sectorMetrics, config);
    
    // Calculate final score with sector emphasis
    const rawScore = this.calculateSectorWeightedScore(components, config);
    const normalizedScore = this.normalizeScore(rawScore, config);
    
    // Analyze market conditions with sector context
    const marketCondition = this.analyzeSectorBasedMarketCondition(normalizedScore, sectorMetrics, config);
    
    // Calculate confidence based on sector data availability
    const confidence = this.calculateSectorConfidence(data, sectorMetrics);
    
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
        warnings: this.generateSectorWarnings(data, sectorMetrics)
      }
    };
  }

  validate(data: RawMarketBreadthData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    // Basic validation
    if (!data.date) {
      errors.push('Date is required');
    }

    // Check for sector data (critical for this algorithm)
    const sectorFields = Object.keys(this.SECTOR_WEIGHTS);
    const availableSectors = sectorFields.filter(sector => {
      const fieldName = `${sector}Sector` as keyof RawMarketBreadthData;
      return data[fieldName] !== undefined && data[fieldName] !== null;
    });

    if (availableSectors.length < 6) {
      errors.push('Sector-weighted algorithm requires at least 6 sectors of data');
    } else if (availableSectors.length < 9) {
      warnings.push('Limited sector data - some analysis may be less accurate');
    }

    // Check traditional breadth indicators
    const hasBasicBreadth = (data.advancingIssues !== undefined && data.decliningIssues !== undefined) ||
                           (data.stocksUp4PctDaily !== undefined && data.stocksDown4PctDaily !== undefined);
    
    if (!hasBasicBreadth) {
      errors.push('Basic breadth indicators required for sector-weighted analysis');
    }

    // Calculate coverage focusing on sector data
    const sectorCoverage = (availableSectors.length / sectorFields.length) * 100;
    const traditionalCoverage = this.calculateTraditionalCoverage(data);
    const fieldCoverage = (sectorCoverage * 0.6) + (traditionalCoverage * 0.4); // Emphasize sector data

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

  validateConfig(config: Partial<BreadthCalculationConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.weights?.sector_data === 0) {
      errors.push('Sector-weighted algorithm requires non-zero sector data weight');
    }

    if (config.indicators?.sector_count_threshold && config.indicators.sector_count_threshold < 6) {
      errors.push('Sector count threshold should be at least 6 for reliable sector analysis');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate comprehensive sector metrics
   */
  private calculateSectorMetrics(data: StandardizedBreadthData, historicalData?: RawMarketBreadthData[]): SectorMetrics {
    if (!data.sectors) {
      return {
        participation: 50,
        leadership: 50,
        rotation: 50,
        breadth: 50,
        momentum: 50
      };
    }

    const sectors = data.sectors;
    const sectorValues = Object.values(sectors);
    const nonZeroSectors = sectorValues.filter(val => val > 0);

    // 1. Sector Participation (% of sectors showing strength)
    const participation = (nonZeroSectors.length / sectorValues.length) * 100;

    // 2. Sector Leadership (strength of top sectors)
    const sortedSectors = [...sectorValues].sort((a, b) => b - a);
    const topThreeSectors = sortedSectors.slice(0, 3);
    const leadership = topThreeSectors.reduce((sum, val) => sum + val, 0) / 3;

    // 3. Sector Rotation (variance in sector performance)
    const mean = sectorValues.reduce((sum, val) => sum + val, 0) / sectorValues.length;
    const variance = sectorValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sectorValues.length;
    const rotation = Math.min(100, Math.sqrt(variance) * 10); // Scale to 0-100

    // 4. Sector Breadth (distribution quality)
    const breadth = this.calculateSectorBreadth(sectors);

    // 5. Sector Momentum (consistency over time)
    const momentum = this.calculateSectorMomentum(sectors, historicalData);

    return {
      participation: Math.round(participation * 10) / 10,
      leadership: Math.round(leadership * 10) / 10,
      rotation: Math.round(rotation * 10) / 10,
      breadth: Math.round(breadth * 10) / 10,
      momentum: Math.round(momentum * 10) / 10
    };
  }

  /**
   * Calculate sector breadth distribution quality
   */
  private calculateSectorBreadth(sectors: SectorData): number {
    const values = Object.values(sectors);
    const nonZeroCount = values.filter(val => val > 0).length;
    
    if (nonZeroCount === 0) return 0;
    if (nonZeroCount === values.length) return 100;
    
    // Calculate Gini coefficient for distribution equality
    const sortedValues = [...values].sort((a, b) => a - b);
    const n = sortedValues.length;
    const sum = sortedValues.reduce((a, b) => a + b, 0);
    
    if (sum === 0) return 0;
    
    let gini = 0;
    for (let i = 0; i < n; i++) {
      gini += (2 * (i + 1) - n - 1) * sortedValues[i];
    }
    gini = gini / (n * sum);
    
    // Convert Gini to breadth score (lower Gini = better distribution = higher score)
    return Math.max(0, (1 - Math.abs(gini)) * 100);
  }

  /**
   * Calculate sector momentum from historical data
   */
  private calculateSectorMomentum(sectors: SectorData, historicalData?: RawMarketBreadthData[]): number {
    if (!historicalData || historicalData.length < 5) {
      return 50; // Neutral when no historical data
    }

    // Calculate sector consistency over recent periods
    const recentData = historicalData.slice(-5);
    const sectorNames = Object.keys(sectors) as (keyof SectorData)[];
    
    let consistencySum = 0;
    let validSectors = 0;

    for (const sectorName of sectorNames) {
      const currentValue = sectors[sectorName];
      const historicalValues = recentData.map(day => {
        const fieldName = `${sectorName}Sector` as keyof RawMarketBreadthData;
        return day[fieldName] as number || 0;
      });

      if (historicalValues.length > 0) {
        const consistency = this.calculateSectorConsistency(currentValue, historicalValues);
        consistencySum += consistency;
        validSectors++;
      }
    }

    return validSectors > 0 ? (consistencySum / validSectors) : 50;
  }

  /**
   * Calculate consistency for individual sector
   */
  private calculateSectorConsistency(currentValue: number, historicalValues: number[]): number {
    if (historicalValues.length === 0) return 50;
    
    const mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
    const stdDev = Math.sqrt(
      historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length
    );
    
    // Calculate how consistent current value is with historical pattern
    if (stdDev === 0) return currentValue === mean ? 100 : 0;
    
    const zScore = Math.abs(currentValue - mean) / stdDev;
    const consistency = Math.max(0, 100 - (zScore * 20)); // Penalize outliers
    
    return Math.min(100, consistency);
  }

  /**
   * Calculate traditional breadth factors
   */
  private calculateTraditionalFactors(
    data: StandardizedBreadthData,
    config: BreadthCalculationConfig,
    historicalData?: RawMarketBreadthData[]
  ) {
    return {
      advanceDecline: this.calculateAdvanceDeclineScore(data),
      newHighLow: this.calculateNewHighLowScore(data),
      volume: this.calculateVolumeScore(data),
      movers: this.calculateMoversScore(data),
      t2108: this.calculateT2108Score(data, config)
    };
  }

  /**
   * Combine sector analysis with traditional breadth factors
   */
  private combineSectorAndTraditional(
    traditional: any, 
    sectorMetrics: SectorMetrics, 
    config: BreadthCalculationConfig
  ) {
    const weights = config.weights;
    
    // Traditional primary indicators (reduced weight)
    const primaryScore = (traditional.advanceDecline + traditional.newHighLow) / 2 * weights.primary_indicators;
    
    // Traditional secondary indicators (reduced weight)
    const secondaryScore = (traditional.volume + traditional.movers) / 2 * weights.secondary_indicators;
    
    // Reference data (T2108)
    const referenceScore = traditional.t2108 * weights.reference_data;
    
    // Sector analysis (enhanced weight) - 5 sector metrics
    const sectorScore = (
      sectorMetrics.participation * 0.3 +
      sectorMetrics.leadership * 0.25 +
      sectorMetrics.rotation * 0.2 +
      sectorMetrics.breadth * 0.15 +
      sectorMetrics.momentum * 0.1
    ) * weights.sector_data;

    return {
      primary_score: Math.round(primaryScore * 10) / 10,
      secondary_score: Math.round(secondaryScore * 10) / 10,
      reference_score: Math.round(referenceScore * 10) / 10,
      sector_score: Math.round(sectorScore * 10) / 10
    };
  }

  /**
   * Calculate sector-weighted final score
   */
  private calculateSectorWeightedScore(components: any, config: BreadthCalculationConfig): number {
    return components.primary_score + 
           components.secondary_score + 
           components.reference_score + 
           components.sector_score;
  }

  /**
   * Analyze market conditions with sector context
   */
  private analyzeSectorBasedMarketCondition(
    normalizedScore: number,
    sectorMetrics: SectorMetrics,
    config: BreadthCalculationConfig
  ) {
    // Adjust market phase based on sector participation
    let phase: MarketPhase;
    if (sectorMetrics.participation > 70 && normalizedScore > 60) {
      phase = 'BULL';
    } else if (sectorMetrics.participation < 30 && normalizedScore < 40) {
      phase = 'BEAR';
    } else if (sectorMetrics.rotation > 60) {
      phase = 'TRANSITION';
    } else {
      phase = 'NEUTRAL';
    }

    // Determine strength based on sector leadership and breadth
    let strength: StrengthLevel;
    const sectorStrength = (sectorMetrics.leadership + sectorMetrics.breadth) / 2;
    if (sectorStrength > 80) {
      strength = 'EXTREME';
    } else if (sectorStrength > 65) {
      strength = 'STRONG';
    } else if (sectorStrength > 45) {
      strength = 'MODERATE';
    } else {
      strength = 'WEAK';
    }

    // Trend direction with sector momentum
    let trend_direction: TrendDirection;
    if (sectorMetrics.momentum > 65 && normalizedScore > 55) {
      trend_direction = 'UP';
    } else if (sectorMetrics.momentum < 35 && normalizedScore < 45) {
      trend_direction = 'DOWN';
    } else {
      trend_direction = 'SIDEWAYS';
    }

    // Confidence level based on sector data quality
    const confidence_level = Math.min(1, 
      sectorMetrics.participation / 100 * 
      config.scaling.confidence_threshold
    );

    return {
      phase,
      strength,
      trend_direction,
      confidence_level: Math.round(confidence_level * 100) / 100
    };
  }

  /**
   * Calculate confidence based on sector data availability and quality
   */
  private calculateSectorConfidence(data: StandardizedBreadthData, sectorMetrics: SectorMetrics): number {
    let confidence = data.dataQuality / 100;
    
    // Boost confidence for good sector data
    if (data.sectors) {
      const sectorDataQuality = Object.values(data.sectors).filter(val => val > 0).length / 11;
      confidence *= (0.7 + (sectorDataQuality * 0.3)); // Weight sector data heavily
    } else {
      confidence *= 0.6; // Significantly reduce confidence without sector data
    }
    
    // Adjust for sector metrics quality
    confidence *= Math.min(1, sectorMetrics.participation / 70); // Need good participation
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate sector-specific warnings
   */
  private generateSectorWarnings(data: StandardizedBreadthData, sectorMetrics: SectorMetrics): string[] {
    const warnings: string[] = [];
    
    if (!data.sectors) {
      warnings.push('No sector data available - algorithm effectiveness severely reduced');
      return warnings;
    }

    if (sectorMetrics.participation < 40) {
      warnings.push('Low sector participation detected - market may be narrow');
    }

    if (sectorMetrics.leadership < 30) {
      warnings.push('Weak sector leadership - lack of institutional conviction');
    }

    if (sectorMetrics.breadth < 40) {
      warnings.push('Poor sector breadth - market advance/decline may be unsustainable');
    }

    if (sectorMetrics.rotation > 80) {
      warnings.push('High sector rotation detected - potential market transition phase');
    }

    const availableSectors = Object.values(data.sectors).filter(val => val > 0).length;
    if (availableSectors < 6) {
      warnings.push('Insufficient sector data - results may not be representative');
    }

    return warnings;
  }

  // Helper methods (similar to six-factor algorithm)
  private standardizeData(rawData: RawMarketBreadthData): StandardizedBreadthData {
    return {
      date: rawData.date,
      timestamp: rawData.timestamp || new Date().toISOString(),
      
      stocksUp4Pct: rawData.stocksUp4PctDaily || rawData.advancingIssues || 0,
      stocksDown4Pct: rawData.stocksDown4PctDaily || rawData.decliningIssues || 0,
      stocksUp25PctQuarterly: rawData.stocksUp25PctQuarterly || 0,
      stocksDown25PctQuarterly: rawData.stocksDown25PctQuarterly || 0,
      stocksUp25PctMonthly: rawData.stocksUp25PctMonthly || 0,
      stocksDown25PctMonthly: rawData.stocksDown25PctMonthly || 0,
      stocksUp50PctMonthly: rawData.stocksUp50PctMonthly || 0,
      stocksDown50PctMonthly: rawData.stocksDown50PctMonthly || 0,
      stocksUp13Pct34Days: rawData.stocksUp13Pct34Days || 0,
      stocksDown13Pct34Days: rawData.stocksDown13Pct34Days || 0,
      
      advancingIssues: rawData.advancingIssues || rawData.stocksUp4PctDaily || 0,
      decliningIssues: rawData.decliningIssues || rawData.stocksDown4PctDaily || 0,
      newHighs: rawData.newHighs || 0,
      newLows: rawData.newLows || 0,
      upVolume: rawData.upVolume || 0,
      downVolume: rawData.downVolume || 0,
      wordenUniverse: rawData.wordenUniverse || 0,
      t2108: rawData.t2108 || 50,
      sp500Level: this.parseS500Level(rawData.sp500Level),
      
      // Extract sector data
      sectors: this.extractSectorData(rawData),
      
      dataQuality: rawData.dataQualityScore || this.calculateDataQuality(rawData),
      missingFields: this.identifyMissingFields(rawData)
    };
  }

  private extractSectorData(rawData: RawMarketBreadthData): SectorData | undefined {
    const sectorFields = [
      'basicMaterialsSector',
      'consumerCyclicalSector',
      'financialServicesSector'
    ];

    const hasSectorData = sectorFields.some(field => 
      rawData[field as keyof RawMarketBreadthData] !== undefined
    );

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

  // Traditional factor calculations (simplified versions)
  private calculateAdvanceDeclineScore(data: StandardizedBreadthData): number {
    const total = data.advancingIssues + data.decliningIssues;
    return total > 0 ? (data.advancingIssues / total) * 100 : 50;
  }

  private calculateNewHighLowScore(data: StandardizedBreadthData): number {
    const total = data.newHighs + data.newLows;
    return total > 0 ? (data.newHighs / total) * 100 : 50;
  }

  private calculateVolumeScore(data: StandardizedBreadthData): number {
    const total = data.upVolume + data.downVolume;
    return total > 0 ? (data.upVolume / total) * 100 : 50;
  }

  private calculateMoversScore(data: StandardizedBreadthData): number {
    const total = data.stocksUp4Pct + data.stocksDown4Pct;
    return total > 0 ? (data.stocksUp4Pct / total) * 100 : 50;
  }

  private calculateT2108Score(data: StandardizedBreadthData, config: BreadthCalculationConfig): number {
    return data.t2108;
  }

  private normalizeScore(rawScore: number, config: BreadthCalculationConfig): number {
    const { min_score, max_score, normalization } = config.scaling;
    
    switch (normalization) {
      case 'sigmoid':
        const sigmoid = max_score / (1 + Math.exp(-(rawScore - 50) / 10));
        return Math.max(min_score, Math.min(max_score, sigmoid));
      default:
        return Math.max(min_score, Math.min(max_score, rawScore));
    }
  }

  private parseS500Level(sp500Str?: string): number {
    if (!sp500Str) return 0;
    const cleaned = sp500Str.replace(/[",]/g, '');
    return parseFloat(cleaned) || 0;
  }

  private calculateTraditionalCoverage(data: RawMarketBreadthData): number {
    const traditionalFields = this.requiredFields.concat(this.optionalFields.slice(0, 8)); // Exclude sector fields
    const presentFields = traditionalFields.filter(field => 
      data[field as keyof RawMarketBreadthData] !== undefined
    ).length;
    
    return (presentFields / traditionalFields.length) * 100;
  }

  private calculateDataQuality(rawData: RawMarketBreadthData): number {
    const allFields = [...this.requiredFields, ...this.optionalFields];
    const presentFields = allFields.filter(field => 
      rawData[field as keyof RawMarketBreadthData] !== undefined &&
      rawData[field as keyof RawMarketBreadthData] !== null
    ).length;
    
    return (presentFields / allFields.length) * 100;
  }

  private identifyMissingFields(rawData: RawMarketBreadthData): string[] {
    const allFields = [...this.requiredFields, ...this.optionalFields];
    return allFields.filter(field => 
      rawData[field as keyof RawMarketBreadthData] === undefined ||
      rawData[field as keyof RawMarketBreadthData] === null
    );
  }
}