/**
 * Raw Market Breadth Data Types
 * Separated to avoid circular import dependencies with calculation config
 */

/**
 * Raw Market Breadth Data interface - INPUT ONLY
 * This interface defines the structure for raw data input from various sources
 */
export interface RawMarketBreadthData {
  // Primary Key & Date
  id?: number;
  date: string; // YYYY-MM-DD format
  timestamp?: string; // ISO format
  
  // Primary Breadth Indicators (Raw Data Only) - Aligned with breadth_score_tool
  stocks_up_4pct?: number | null;
  stocks_down_4pct?: number | null;
  stocks_up_25pct_quarter?: number | null;
  stocks_down_25pct_quarter?: number | null;
  
  // Additional Primary Indicators
  ratio_5day?: number | null;
  ratio_10day?: number | null;
  
  // Secondary Breadth Indicators (Raw Data Only)
  stocks_up_25pct_month?: number | null;
  stocks_down_25pct_month?: number | null;
  stocks_up_50pct_month?: number | null;
  stocks_down_50pct_month?: number | null;
  stocks_up_13pct_34days?: number | null;
  stocks_down_13pct_34days?: number | null;
  
  // Legacy fields for compatibility
  stocksUp4PctDaily?: number;
  stocksDown4PctDaily?: number;
  stocksUp25PctQuarterly?: number;
  stocksDown25PctQuarterly?: number;
  stocksUp25PctMonthly?: number;
  stocksDown25PctMonthly?: number;
  stocksUp50PctMonthly?: number;
  stocksDown50PctMonthly?: number;
  stocksUp13Pct34Days?: number;
  stocksDown13Pct34Days?: number;
  
  // Reference Data (Raw Input) - Aligned with breadth_score_tool
  worden_universe?: number | null; // Total stocks tracked
  t2108?: number | null; // % Stocks above 40-day MA
  sp500?: string | null; // S&P 500 level (stored as text due to comma formatting)
  
  // Legacy fields for compatibility
  wordenUniverse?: number;
  sp500Level?: string;
  
  // Legacy Compatibility Fields (for migration)
  advancingIssues?: number;
  decliningIssues?: number;
  newHighs?: number;
  newLows?: number;
  upVolume?: number;
  downVolume?: number;
  
  // Sector Data (11 sectors - Raw Data) - Aligned with breadth_score_tool
  basic_materials_sector?: number | null;
  consumer_cyclical_sector?: number | null;
  financial_services_sector?: number | null;
  real_estate_sector?: number | null;
  consumer_defensive_sector?: number | null;
  healthcare_sector?: number | null;
  utilities_sector?: number | null;
  communication_services_sector?: number | null;
  energy_sector?: number | null;
  industrials_sector?: number | null;
  technology_sector?: number | null;
  
  // Legacy fields for compatibility
  basicMaterialsSector?: number;
  consumerCyclicalSector?: number;
  financialServicesSector?: number;
  realEstateSector?: number;
  consumerDefensiveSector?: number;
  healthcareSector?: number;
  utilitiesSector?: number;
  communicationServicesSector?: number;
  energySector?: number;
  industrialsSector?: number;
  technologySector?: number;
  
  // Legacy compatibility fields (20 pct variations)
  stocks_up_20pct?: number | null;
  stocks_down_20pct?: number | null;
  stocks_up_20dollar?: number | null;
  stocks_down_20dollar?: number | null;
  
  // Metadata - Aligned with breadth_score_tool
  source_file?: string | null;
  import_format?: string | null;
  data_quality_score?: number | null;
  
  // Legacy compatibility
  sourceFile?: string;
  importFormat?: 'stockbee_v1' | 'manual' | 'api' | 'legacy_migration';
  dataQualityScore?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Standardized field mapping for data access
 * Provides consistent access to fields regardless of legacy/new field names
 */
export interface StandardizedBreadthData {
  // Always use these standardized field names internally
  date: string;
  timestamp: string;
  
  // Primary indicators (prefer new fields, fallback to legacy)
  stocksUp4Pct: number;
  stocksDown4Pct: number;
  stocksUp25PctQuarterly: number;
  stocksDown25PctQuarterly: number;
  
  // Secondary indicators
  stocksUp25PctMonthly: number;
  stocksDown25PctMonthly: number;
  stocksUp50PctMonthly: number;
  stocksDown50PctMonthly: number;
  stocksUp13Pct34Days: number;
  stocksDown13Pct34Days: number;
  
  // Reference data
  advancingIssues: number;
  decliningIssues: number;
  newHighs: number;
  newLows: number;
  upVolume: number;
  downVolume: number;
  wordenUniverse: number;
  t2108: number;
  sp500Level: number; // Parsed numeric value
  
  // Sector data (optional)
  sectors?: {
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
  };
  
  // Metadata
  dataQuality: number;
  missingFields: string[];
}

/**
 * Field priority mapping for data standardization
 * When multiple fields could provide the same data, use this priority order
 */
export const FIELD_PRIORITY_MAP: Record<keyof StandardizedBreadthData, string[]> = {
  date: ['date'],
  timestamp: ['timestamp'],
  stocksUp4Pct: ['stocks_up_4pct', 'stocksUp4PctDaily', 'stocks_up_4pct_daily', 'advancingIssues', 'advancing_issues'],
  stocksDown4Pct: ['stocks_down_4pct', 'stocksDown4PctDaily', 'stocks_down_4pct_daily', 'decliningIssues', 'declining_issues'],
  stocksUp25PctQuarterly: ['stocks_up_25pct_quarter', 'stocksUp25PctQuarterly', 'stocks_up_25pct_quarterly'],
  stocksDown25PctQuarterly: ['stocks_down_25pct_quarter', 'stocksDown25PctQuarterly', 'stocks_down_25pct_quarterly'],
  stocksUp25PctMonthly: ['stocks_up_25pct_month', 'stocksUp25PctMonthly', 'stocks_up_25pct_monthly'],
  stocksDown25PctMonthly: ['stocks_down_25pct_month', 'stocksDown25PctMonthly', 'stocks_down_25pct_monthly'],
  stocksUp50PctMonthly: ['stocks_up_50pct_month', 'stocksUp50PctMonthly', 'stocks_up_50pct_monthly'],
  stocksDown50PctMonthly: ['stocks_down_50pct_month', 'stocksDown50PctMonthly', 'stocks_down_50pct_monthly'],
  stocksUp13Pct34Days: ['stocks_up_13pct_34days', 'stocksUp13Pct34Days', 'stocks_up_13pct_34days'],
  stocksDown13Pct34Days: ['stocks_down_13pct_34days', 'stocksDown13Pct34Days', 'stocks_down_13pct_34days'],
  advancingIssues: ['advancingIssues', 'advancing_issues', 'stocks_up_4pct', 'stocksUp4PctDaily'],
  decliningIssues: ['decliningIssues', 'declining_issues', 'stocks_down_4pct', 'stocksDown4PctDaily'],
  newHighs: ['newHighs', 'new_highs'],
  newLows: ['newLows', 'new_lows'],
  upVolume: ['upVolume', 'up_volume'],
  downVolume: ['downVolume', 'down_volume'],
  wordenUniverse: ['worden_universe', 'wordenUniverse'],
  t2108: ['t2108'],
  sp500Level: ['sp500', 'sp500Level', 'sp_500_level', 'spReference'],
  dataQuality: ['data_quality_score', 'dataQualityScore'],
  missingFields: ['missingFields'],
  sectors: ['sectors']
};

/**
 * Required fields for minimum viable calculation
 * At least one field from each category should be present
 */
export const MINIMUM_REQUIRED_FIELDS = {
  date: ['date'],
  primary_indicator: ['stocks_up_4pct', 'stocksUp4PctDaily', 'advancingIssues'],
  counter_indicator: ['stocks_down_4pct', 'stocksDown4PctDaily', 'decliningIssues']
};

/**
 * Optimal fields for high-quality calculation
 * Having all these fields enables the most accurate calculations
 */
export const OPTIMAL_FIELDS = [
  'date',
  'stocks_up_4pct',
  'stocks_down_4pct',
  'stocks_up_25pct_quarter',
  'stocks_down_25pct_quarter',
  'stocks_up_25pct_month',
  'stocks_down_25pct_month',
  'stocks_up_13pct_34days',
  'stocks_down_13pct_34days',
  'ratio_5day',
  'ratio_10day',
  'worden_universe',
  't2108',
  'sp500',
  'advancingIssues',
  'decliningIssues',
  'newHighs',
  'newLows',
  'upVolume',
  'downVolume'
];

/**
 * Sector field mapping for sector-weighted algorithms
 */
export const SECTOR_FIELD_MAP = {
  basicMaterials: ['basic_materials_sector', 'basicMaterialsSector'],
  consumerCyclical: ['consumer_cyclical_sector', 'consumerCyclicalSector'],
  financialServices: ['financial_services_sector', 'financialServicesSector'],
  realEstate: ['real_estate_sector', 'realEstateSector'],
  consumerDefensive: ['consumer_defensive_sector', 'consumerDefensiveSector'],
  healthcare: ['healthcare_sector', 'healthcareSector'],
  utilities: ['utilities_sector', 'utilitiesSector'],
  communicationServices: ['communication_services_sector', 'communicationServicesSector'],
  energy: ['energy_sector', 'energySector'],
  industrials: ['industrials_sector', 'industrialsSector'],
  technology: ['technology_sector', 'technologySector']
};