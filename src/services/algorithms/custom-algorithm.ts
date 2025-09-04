/**
 * Custom Formula Breadth Score Algorithm
 * Supports user-defined formulas with custom parameters and weights
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

interface FormulaContext {
  // Primary indicators
  advanceDeclineRatio: number;
  newHighLowRatio: number;
  
  // Secondary indicators
  volumeRatio: number;
  moversRatio: number;
  
  // Reference data
  t2108: number;
  sp500: number;
  
  // Calculated ratios
  ratio5Day?: number;
  ratio10Day?: number;
  
  // Sector averages (if available)
  sectorAverage?: number;
  sectorCount?: number;
  
  // Custom parameters from config
  [key: string]: number | undefined;
}

export class CustomAlgorithm implements AlgorithmImplementation {
  public readonly name = 'Custom Formula';
  public readonly type = 'custom' as const;
  public readonly description = 'User-defined formula with custom parameters and weights';
  
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

  // Default formulas that users can customize
  private readonly DEFAULT_FORMULAS = {
    'balanced': '(primary * 0.4) + (secondary * 0.35) + (reference * 0.25)',
    'momentum_focused': '(primary * 0.3) + (secondary * 0.2) + (reference * 0.2) + (momentum * 0.3)',
    'volume_weighted': '(volumeRatio * 0.4) + (advanceDeclineRatio * 0.3) + (t2108 * 0.3)',
    'conservative': '(advanceDeclineRatio * 0.5) + (newHighLowRatio * 0.3) + (t2108 * 0.2)',
    'aggressive': '(moversRatio * 0.4) + (volumeRatio * 0.3) + (momentum * 0.3)'
  };

  calculate(
    rawData: RawMarketBreadthData, 
    config: BreadthCalculationConfig,
    historicalData?: RawMarketBreadthData[]
  ): BreadthResult {
    const startTime = performance.now();
    
    // Standardize the input data
    const data = this.standardizeData(rawData);
    
    // Build formula context with all available indicators
    const context = this.buildFormulaContext(data, config, historicalData);
    
    // Execute custom formula
    const formulaResult = this.executeCustomFormula(config.custom_formula, context, config);
    
    // Calculate component breakdown for transparency
    const components = this.calculateComponentBreakdown(context, config);
    
    // Apply normalization
    const normalizedScore = this.normalizeScore(formulaResult.score, config);
    
    // Analyze market conditions
    const marketCondition = this.analyzeCustomMarketCondition(normalizedScore, context, config);
    
    // Calculate confidence
    const confidence = this.calculateCustomConfidence(data, formulaResult, context);
    
    const calculationTime = performance.now() - startTime;
    
    return {
      date: data.date,
      score: Math.round(formulaResult.score * 10) / 10,
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
        warnings: [...formulaResult.warnings, ...this.generateCustomWarnings(data, context)]
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

    // Check minimum data for custom formulas
    const hasBasicData = (data.advancingIssues !== undefined && data.decliningIssues !== undefined) ||
                        (data.stocksUp4PctDaily !== undefined && data.stocksDown4PctDaily !== undefined);
    
    if (!hasBasicData) {
      errors.push('Basic breadth indicators required for custom formula');
    }

    // Custom algorithm is flexible, so mostly warnings
    if (!data.t2108) {
      warnings.push('T2108 missing - custom formula may not work as expected');
      missingFields.push('t2108');
    }

    const fieldCoverage = this.calculateFieldCoverage(data);
    const dataQuality = Math.max(0, Math.min(100, fieldCoverage - (errors.length * 15) - (warnings.length * 3)));

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

    // Validate custom formula syntax
    if (config.custom_formula) {
      try {
        this.validateFormulaSyntax(config.custom_formula);
      } catch (error) {
        errors.push(`Invalid formula syntax: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Check for required custom parameters
    if (config.custom_formula && config.custom_formula.includes('custom_')) {
      if (!config.custom_parameters || Object.keys(config.custom_parameters).length === 0) {
        errors.push('Custom formula uses custom parameters but none are defined');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Build context object for formula execution
   */
  private buildFormulaContext(
    data: StandardizedBreadthData,
    config: BreadthCalculationConfig,
    historicalData?: RawMarketBreadthData[]
  ): FormulaContext {
    // Calculate basic ratios
    const advanceDeclineRatio = this.calculateRatio(data.advancingIssues, data.decliningIssues);
    const newHighLowRatio = this.calculateRatio(data.newHighs, data.newLows);
    const volumeRatio = this.calculateRatio(data.upVolume, data.downVolume);
    const moversRatio = this.calculateRatio(data.stocksUp4Pct, data.stocksDown4Pct);

    // Calculate momentum ratios if historical data available
    const ratio5Day = this.calculateMomentumRatio(data, historicalData, 5);
    const ratio10Day = this.calculateMomentumRatio(data, historicalData, 10);

    // Calculate sector metrics if available
    let sectorAverage: number | undefined;
    let sectorCount: number | undefined;
    if (data.sectors) {
      const sectorValues = Object.values(data.sectors).filter(val => val > 0);
      sectorCount = sectorValues.length;
      sectorAverage = sectorCount > 0 ? 
        sectorValues.reduce((sum, val) => sum + val, 0) / sectorCount : 0;
    }

    // Build context with all available variables
    const context: FormulaContext = {
      // Component scores (0-100 scale)
      primary: (advanceDeclineRatio + newHighLowRatio) / 2,
      secondary: (volumeRatio + moversRatio) / 2,
      reference: data.t2108,
      
      // Individual indicators
      advanceDeclineRatio,
      newHighLowRatio,
      volumeRatio,
      moversRatio,
      t2108: data.t2108,
      sp500: data.sp500Level,
      
      // Momentum indicators
      ratio5Day,
      ratio10Day,
      momentum: ratio5Day || 50,
      
      // Sector indicators
      sectorAverage,
      sectorCount,
      sector: sectorAverage || 50,
      
      // Custom parameters from config
      ...(config.custom_parameters || {})
    };

    return context;
  }

  /**
   * Execute custom formula with safety checks
   */
  private executeCustomFormula(
    formula: string | undefined, 
    context: FormulaContext, 
    config: BreadthCalculationConfig
  ): { score: number; warnings: string[] } {
    const warnings: string[] = [];
    
    // Use default formula if none provided
    const useFormula = formula || this.DEFAULT_FORMULAS.balanced;
    
    try {
      // Validate formula before execution
      this.validateFormulaSyntax(useFormula);
      
      // Execute formula in safe context
      const score = this.safeFormulaExecution(useFormula, context);
      
      // Validate result
      if (isNaN(score) || !isFinite(score)) {
        warnings.push('Formula produced invalid result, using fallback calculation');
        return { score: this.fallbackCalculation(context), warnings };
      }
      
      return { score: Math.max(0, Math.min(100, score)), warnings };
      
    } catch (error) {
      warnings.push(`Formula execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { score: this.fallbackCalculation(context), warnings };
    }
  }

  /**
   * Validate formula syntax for safety
   */
  private validateFormulaSyntax(formula: string): void {
    // Check for dangerous operations
    const dangerousPatterns = [
      /\beval\b/,
      /\bFunction\b/,
      /\brequire\b/,
      /\bimport\b/,
      /\bprocess\b/,
      /\b__/,
      /\bthis\b/,
      /\bwindow\b/,
      /\bglobal\b/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        throw new Error(`Formula contains potentially dangerous operation: ${pattern.source}`);
      }
    }

    // Check for basic syntax
    const allowedChars = /^[a-zA-Z0-9_+\-*/.() \n\t]+$/;
    if (!allowedChars.test(formula)) {
      throw new Error('Formula contains invalid characters');
    }

    // Check balanced parentheses
    let parenCount = 0;
    for (const char of formula) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        throw new Error('Unbalanced parentheses in formula');
      }
    }
    if (parenCount !== 0) {
      throw new Error('Unbalanced parentheses in formula');
    }
  }

  /**
   * Safe formula execution with limited context
   */
  private safeFormulaExecution(formula: string, context: FormulaContext): number {
    // Create safe execution environment
    const safeContext = { ...context };
    
    // Replace variables in formula with their values
    let processedFormula = formula;
    for (const [key, value] of Object.entries(safeContext)) {
      if (typeof value === 'number') {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        processedFormula = processedFormula.replace(regex, value.toString());
      }
    }
    
    // Simple mathematical expression evaluation
    try {
      // Use Function constructor with restricted context
      const result = Function(`"use strict"; return (${processedFormula})`)();
      return Number(result);
    } catch (error) {
      throw new Error(`Formula evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fallback calculation when custom formula fails
   */
  private fallbackCalculation(context: FormulaContext): number {
    // Simple balanced calculation as fallback
    return ((context.primary || 0) * 0.4) + 
           ((context.secondary || 0) * 0.35) + 
           ((context.reference || 0) * 0.25);
  }

  /**
   * Calculate component breakdown for transparency
   */
  private calculateComponentBreakdown(context: FormulaContext, config: BreadthCalculationConfig) {
    const weights = config.weights;
    
    return {
      primary_score: (context.primary || 0) * weights.primary_indicators,
      secondary_score: (context.secondary || 0) * weights.secondary_indicators,
      reference_score: (context.reference || 0) * weights.reference_data,
      sector_score: (context.sector || 50) * weights.sector_data
    };
  }

  /**
   * Analyze market conditions for custom algorithm
   */
  private analyzeCustomMarketCondition(
    normalizedScore: number,
    context: FormulaContext,
    config: BreadthCalculationConfig
  ) {
    const thresholds = config.market_conditions;
    
    // Standard phase determination
    let phase: MarketPhase;
    if (normalizedScore >= thresholds.strong_bull_threshold) {
      phase = 'BULL';
    } else if (normalizedScore >= thresholds.bull_threshold) {
      phase = 'BULL';
    } else if (normalizedScore >= thresholds.bear_threshold) {
      phase = 'NEUTRAL';
    } else {
      phase = 'BEAR';
    }

    // Strength based on distance from neutral
    const distanceFromNeutral = Math.abs(normalizedScore - 50);
    let strength: StrengthLevel;
    if (distanceFromNeutral > 35) {
      strength = 'EXTREME';
    } else if (distanceFromNeutral > 25) {
      strength = 'STRONG';
    } else if (distanceFromNeutral > 15) {
      strength = 'MODERATE';
    } else {
      strength = 'WEAK';
    }

    // Trend direction
    let trend_direction: TrendDirection;
    const momentum = context.ratio5Day || context.momentum || 50;
    if (momentum > 55 && normalizedScore > 52) {
      trend_direction = 'UP';
    } else if (momentum < 45 && normalizedScore < 48) {
      trend_direction = 'DOWN';
    } else {
      trend_direction = 'SIDEWAYS';
    }

    // Confidence based on custom parameters usage
    const customParamCount = Object.keys(config.custom_parameters || {}).length;
    const baseConfidence = config.scaling.confidence_threshold;
    const confidence_level = Math.min(1, baseConfidence + (customParamCount * 0.05));

    return {
      phase,
      strength,
      trend_direction,
      confidence_level: Math.round(confidence_level * 100) / 100
    };
  }

  /**
   * Calculate confidence for custom algorithm
   */
  private calculateCustomConfidence(
    data: StandardizedBreadthData, 
    formulaResult: any, 
    context: FormulaContext
  ): number {
    let confidence = data.dataQuality / 100;
    
    // Boost confidence if formula uses multiple indicators
    const indicatorCount = Object.keys(context).filter(key => 
      typeof context[key] === 'number' && !key.startsWith('custom_')
    ).length;
    
    confidence *= Math.min(1.2, 0.8 + (indicatorCount * 0.05));
    
    // Reduce confidence for missing key indicators
    if (!context.ratio5Day) confidence *= 0.95;
    if (!context.sectorAverage) confidence *= 0.93;
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate custom algorithm warnings
   */
  private generateCustomWarnings(data: StandardizedBreadthData, context: FormulaContext): string[] {
    const warnings: string[] = [];
    
    if (!context.ratio5Day && !context.ratio10Day) {
      warnings.push('No momentum data available - formula may not capture trend changes');
    }
    
    if (!context.sectorAverage) {
      warnings.push('No sector data available - formula limited to traditional indicators');
    }
    
    if (data.dataQuality < 60) {
      warnings.push('Low data quality may affect custom formula reliability');
    }
    
    // Check for extreme values that might break formulas
    const extremeValues = Object.entries(context).filter(([key, value]) => 
      typeof value === 'number' && (value > 1000 || value < -100)
    );
    
    if (extremeValues.length > 0) {
      warnings.push('Extreme values detected - custom formula should handle edge cases');
    }
    
    return warnings;
  }

  /**
   * Get available default formulas
   */
  public getDefaultFormulas(): Record<string, string> {
    return { ...this.DEFAULT_FORMULAS };
  }

  /**
   * Validate formula and return available variables
   */
  public getFormulaVariables(data: RawMarketBreadthData): string[] {
    const standardized = this.standardizeData(data);
    const context = this.buildFormulaContext(standardized, this.getDefaultConfig(), []);
    
    return Object.keys(context).filter(key => typeof context[key] === 'number');
  }

  /**
   * Get default configuration for custom algorithm
   */
  private getDefaultConfig(): BreadthCalculationConfig {
    const { DEFAULT_CONFIGS } = require('../../types/breadth-calculation-config');
    return {
      ...DEFAULT_CONFIGS.custom,
      version: 'custom_default',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // Helper methods
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
      
      sectors: this.extractSectorData(rawData),
      dataQuality: rawData.dataQualityScore || this.calculateDataQuality(rawData),
      missingFields: this.identifyMissingFields(rawData)
    };
  }

  private calculateRatio(numerator: number, denominator: number): number {
    const total = numerator + denominator;
    return total > 0 ? (numerator / total) * 100 : 50;
  }

  private calculateMomentumRatio(
    data: StandardizedBreadthData,
    historicalData?: RawMarketBreadthData[],
    days: number = 5
  ): number | undefined {
    if (!historicalData || historicalData.length < days - 1) {
      return undefined;
    }

    const relevantDays = historicalData.slice(-(days - 1));
    const totalUp = data.stocksUp4Pct + relevantDays.reduce((sum, day) => 
      sum + (day.stocksUp4PctDaily || day.advancingIssues || 0), 0);
    const totalDown = data.stocksDown4Pct + relevantDays.reduce((sum, day) => 
      sum + (day.stocksDown4PctDaily || day.decliningIssues || 0), 0);
    
    return totalDown > 0 ? (totalUp / totalDown) * 50 : 50; // Scale to 0-100
  }

  private parseS500Level(sp500Str?: string): number {
    if (!sp500Str) return 0;
    const cleaned = sp500Str.replace(/[",]/g, '');
    return parseFloat(cleaned) || 0;
  }

  private extractSectorData(rawData: RawMarketBreadthData) {
    const sectorFields = ['basicMaterialsSector', 'consumerCyclicalSector'];
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

  private normalizeScore(rawScore: number, config: BreadthCalculationConfig): number {
    const { min_score, max_score } = config.scaling;
    return Math.max(min_score, Math.min(max_score, rawScore));
  }

  private calculateFieldCoverage(rawData: RawMarketBreadthData): number {
    const allFields = [...this.requiredFields, ...this.optionalFields];
    const presentFields = allFields.filter(field => 
      rawData[field as keyof RawMarketBreadthData] !== undefined &&
      rawData[field as keyof RawMarketBreadthData] !== null
    ).length;
    
    return (presentFields / allFields.length) * 100;
  }

  private calculateDataQuality(rawData: RawMarketBreadthData): number {
    return this.calculateFieldCoverage(rawData);
  }

  private identifyMissingFields(rawData: RawMarketBreadthData): string[] {
    const allFields = [...this.requiredFields, ...this.optionalFields];
    return allFields.filter(field => 
      rawData[field as keyof RawMarketBreadthData] === undefined ||
      rawData[field as keyof RawMarketBreadthData] === null
    );
  }
}