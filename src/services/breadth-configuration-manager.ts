/**
 * Breadth Score Configuration Manager
 * Handles CRUD operations for algorithm configurations with SQLite persistence
 */

import Database from 'better-sqlite3';
import type { 
  BreadthCalculationConfig,
  ConfigurationManager,
  ValidationResult,
  AlgorithmType
} from '../types/breadth-calculation-config';
import { DEFAULT_CONFIGS } from '../types/breadth-calculation-config';

export class BreadthConfigurationManager implements ConfigurationManager {
  private db: Database.Database;
  
  // Prepared statements for performance
  private insertConfigStmt!: Database.Statement;
  private getConfigStmt!: Database.Statement;
  private updateConfigStmt!: Database.Statement;
  private deleteConfigStmt!: Database.Statement;
  private listConfigsStmt!: Database.Statement;
  private setDefaultStmt!: Database.Statement;
  private getDefaultStmt!: Database.Statement;

  constructor(db: Database.Database) {
    this.db = db;
    this.initializeSchema();
    this.initializeStatements();
    this.seedDefaultConfigs();
  }

  /**
   * Initialize configuration storage schema
   */
  private initializeSchema(): void {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS breadth_calculation_configs (
        version TEXT PRIMARY KEY,
        algorithm TEXT NOT NULL,
        name TEXT,
        description TEXT,
        config_json TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        is_default BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_configs_algorithm ON breadth_calculation_configs(algorithm);
      CREATE INDEX IF NOT EXISTS idx_configs_active ON breadth_calculation_configs(is_active);
      CREATE INDEX IF NOT EXISTS idx_configs_default ON breadth_calculation_configs(is_default);
    `;
    
    this.db.exec(createTableSql);
  }

  /**
   * Initialize prepared statements
   */
  private initializeStatements(): void {
    this.insertConfigStmt = this.db.prepare(`
      INSERT INTO breadth_calculation_configs 
      (version, algorithm, name, description, config_json, is_active, is_default) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.getConfigStmt = this.db.prepare(`
      SELECT * FROM breadth_calculation_configs WHERE version = ?
    `);

    this.updateConfigStmt = this.db.prepare(`
      UPDATE breadth_calculation_configs 
      SET algorithm = ?, name = ?, description = ?, config_json = ?, 
          is_active = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP
      WHERE version = ?
    `);

    this.deleteConfigStmt = this.db.prepare(`
      DELETE FROM breadth_calculation_configs WHERE version = ?
    `);

    this.listConfigsStmt = this.db.prepare(`
      SELECT * FROM breadth_calculation_configs 
      WHERE is_active = ? OR ? = 0
      ORDER BY is_default DESC, algorithm, created_at DESC
    `);

    this.setDefaultStmt = this.db.prepare(`
      UPDATE breadth_calculation_configs 
      SET is_default = CASE WHEN version = ? THEN 1 ELSE 0 END
    `);

    this.getDefaultStmt = this.db.prepare(`
      SELECT * FROM breadth_calculation_configs 
      WHERE is_default = 1 AND (algorithm = ? OR ? IS NULL)
      ORDER BY created_at DESC LIMIT 1
    `);
  }

  /**
   * Seed database with default configurations
   */
  private seedDefaultConfigs(): void {
    // Check if defaults already exist
    const existing = this.db.prepare(`
      SELECT COUNT(*) as count FROM breadth_calculation_configs WHERE is_default = 1
    `).get() as { count: number };

    if (existing.count > 0) {
      return; // Defaults already seeded
    }

    // Insert default configurations
    for (const [algorithmType, config] of Object.entries(DEFAULT_CONFIGS)) {
      const version = this.generateVersion(algorithmType as AlgorithmType);
      const fullConfig: BreadthCalculationConfig = {
        ...config,
        version,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        this.insertConfigStmt.run(
          version,
          algorithmType,
          config.name,
          config.description,
          JSON.stringify(fullConfig),
          config.is_active ? 1 : 0,
          config.is_default ? 1 : 0
        );
        
        console.log(`✅ Seeded default config: ${config.name} (${version})`);
      } catch (error) {
        console.error(`❌ Failed to seed config ${algorithmType}:`, error);
      }
    }
  }

  /**
   * Create new configuration
   */
  async createConfig(config: Omit<BreadthCalculationConfig, 'version' | 'created_at' | 'updated_at'>): Promise<string> {
    const version = this.generateVersion(config.algorithm);
    const now = new Date().toISOString();
    
    const fullConfig: BreadthCalculationConfig = {
      ...config,
      version,
      created_at: now,
      updated_at: now
    };

    // Validate configuration
    const validation = this.validateConfig(fullConfig);
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      this.insertConfigStmt.run(
        version,
        config.algorithm,
        config.name,
        config.description,
        JSON.stringify(fullConfig),
        config.is_active ? 1 : 0,
        config.is_default ? 1 : 0
      );

      // If this is set as default, clear other defaults for this algorithm
      if (config.is_default) {
        await this.setDefaultConfig(version);
      }

      return version;
    } catch (error) {
      throw new Error(`Failed to create configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get configuration by version
   */
  async getConfig(version: string): Promise<BreadthCalculationConfig | null> {
    try {
      const row = this.getConfigStmt.get(version) as any;
      if (!row) return null;

      const config = JSON.parse(row.config_json) as BreadthCalculationConfig;
      return {
        ...config,
        is_active: Boolean(row.is_active),
        is_default: Boolean(row.is_default)
      };
    } catch (error) {
      console.error(`Failed to get configuration ${version}:`, error);
      return null;
    }
  }

  /**
   * Update existing configuration
   */
  async updateConfig(version: string, updates: Partial<BreadthCalculationConfig>): Promise<boolean> {
    try {
      const existing = await this.getConfig(version);
      if (!existing) {
        throw new Error(`Configuration ${version} not found`);
      }

      const updatedConfig: BreadthCalculationConfig = {
        ...existing,
        ...updates,
        version, // Preserve original version
        updated_at: new Date().toISOString()
      };

      // Validate updated configuration
      const validation = this.validateConfig(updatedConfig);
      if (!validation.isValid) {
        throw new Error(`Updated configuration validation failed: ${validation.errors.join(', ')}`);
      }

      const result = this.updateConfigStmt.run(
        updatedConfig.algorithm,
        updatedConfig.name,
        updatedConfig.description,
        JSON.stringify(updatedConfig),
        updatedConfig.is_active ? 1 : 0,
        updatedConfig.is_default ? 1 : 0,
        version
      );

      // Handle default config changes
      if (updates.is_default) {
        await this.setDefaultConfig(version);
      }

      return result.changes > 0;
    } catch (error) {
      console.error(`Failed to update configuration ${version}:`, error);
      return false;
    }
  }

  /**
   * Delete configuration
   */
  async deleteConfig(version: string): Promise<boolean> {
    try {
      // Check if it's the only default for its algorithm
      const config = await this.getConfig(version);
      if (config?.is_default) {
        const otherDefaults = await this.listConfigs(true);
        const sameAlgorithmDefaults = otherDefaults.filter(c => 
          c.algorithm === config.algorithm && c.version !== version
        );
        
        if (sameAlgorithmDefaults.length === 0) {
          throw new Error('Cannot delete the only default configuration for this algorithm');
        }
      }

      const result = this.deleteConfigStmt.run(version);
      return result.changes > 0;
    } catch (error) {
      console.error(`Failed to delete configuration ${version}:`, error);
      return false;
    }
  }

  /**
   * List configurations with optional filtering
   */
  async listConfigs(activeOnly: boolean = false): Promise<BreadthCalculationConfig[]> {
    try {
      const rows = this.listConfigsStmt.all(activeOnly ? 1 : 0, activeOnly ? 1 : 0) as any[];
      
      return rows.map(row => {
        const config = JSON.parse(row.config_json) as BreadthCalculationConfig;
        return {
          ...config,
          is_active: Boolean(row.is_active),
          is_default: Boolean(row.is_default)
        };
      });
    } catch (error) {
      console.error('Failed to list configurations:', error);
      return [];
    }
  }

  /**
   * Get default configuration for algorithm
   */
  async getDefaultConfig(algorithm?: AlgorithmType): Promise<BreadthCalculationConfig> {
    try {
      const row = this.getDefaultStmt.get(algorithm || null, algorithm ? 1 : 0) as any;
      
      if (row) {
        const config = JSON.parse(row.config_json) as BreadthCalculationConfig;
        return {
          ...config,
          is_active: Boolean(row.is_active),
          is_default: Boolean(row.is_default)
        };
      }

      // Fallback to creating default config
      const algorithmType = algorithm || 'six_factor';
      const defaultConfig = DEFAULT_CONFIGS[algorithmType];
      const version = await this.createConfig(defaultConfig);
      
      return (await this.getConfig(version))!;
    } catch (error) {
      console.error('Failed to get default configuration:', error);
      
      // Emergency fallback
      const emergencyConfig = DEFAULT_CONFIGS.six_factor;
      return {
        ...emergencyConfig,
        version: 'emergency_default',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }

  /**
   * Set configuration as default for its algorithm
   */
  async setDefaultConfig(version: string): Promise<boolean> {
    try {
      // Clear existing defaults and set new one
      this.setDefaultStmt.run(version);
      return true;
    } catch (error) {
      console.error(`Failed to set default configuration ${version}:`, error);
      return false;
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(config: Partial<BreadthCalculationConfig>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.algorithm) {
      errors.push('Algorithm type is required');
    }

    if (!config.weights) {
      errors.push('Weights configuration is required');
    } else {
      // Validate weights
      const totalWeight = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0);
      if (totalWeight > 1.2) {
        errors.push('Total weights exceed 120% - this will cause score inflation');
      } else if (totalWeight < 0.8) {
        warnings.push('Total weights less than 80% - scores may be deflated');
      }

      // Check individual weights
      for (const [category, weight] of Object.entries(config.weights)) {
        if (weight < 0 || weight > 1) {
          errors.push(`Weight for ${category} must be between 0 and 1`);
        }
      }
    }

    // Validate scaling parameters
    if (config.scaling) {
      if (config.scaling.min_score >= config.scaling.max_score) {
        errors.push('Minimum score must be less than maximum score');
      }
      
      if (config.scaling.confidence_threshold < 0 || config.scaling.confidence_threshold > 1) {
        errors.push('Confidence threshold must be between 0 and 1');
      }
    }

    // Validate market condition thresholds
    if (config.market_conditions) {
      const thresholds = [
        config.market_conditions.strong_bear_threshold,
        config.market_conditions.bear_threshold,
        config.market_conditions.bull_threshold,
        config.market_conditions.strong_bull_threshold
      ];

      for (let i = 1; i < thresholds.length; i++) {
        if (thresholds[i] !== undefined && thresholds[i - 1] !== undefined) {
          if (thresholds[i] <= thresholds[i - 1]) {
            errors.push('Market condition thresholds must be in ascending order');
            break;
          }
        }
      }
    }

    // Validate custom formula if present
    if (config.custom_formula) {
      try {
        this.validateCustomFormula(config.custom_formula);
      } catch (error) {
        errors.push(`Custom formula validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const score = errors.length === 0 ? (warnings.length === 0 ? 100 : 85) : Math.max(0, 50 - (errors.length * 10));

    return {
      isValid: errors.length === 0,
      score,
      errors,
      warnings,
      missingFields: [],
      fieldCoverage: 100
    };
  }

  /**
   * Clone existing configuration with optional modifications
   */
  async cloneConfig(version: string, newName?: string): Promise<string> {
    const existing = await this.getConfig(version);
    if (!existing) {
      throw new Error(`Configuration ${version} not found`);
    }

    const clonedConfig = {
      ...existing,
      name: newName || `${existing.name} (Copy)`,
      is_default: false // Clones are never default
    };

    // Remove version and timestamps to create new
    delete (clonedConfig as any).version;
    delete (clonedConfig as any).created_at;
    delete (clonedConfig as any).updated_at;

    return await this.createConfig(clonedConfig);
  }

  /**
   * Get configurations by algorithm type
   */
  async getConfigsByAlgorithm(algorithm: AlgorithmType): Promise<BreadthCalculationConfig[]> {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM breadth_calculation_configs 
        WHERE algorithm = ? AND is_active = 1
        ORDER BY is_default DESC, created_at DESC
      `).all(algorithm) as any[];

      return rows.map(row => {
        const config = JSON.parse(row.config_json) as BreadthCalculationConfig;
        return {
          ...config,
          is_active: Boolean(row.is_active),
          is_default: Boolean(row.is_default)
        };
      });
    } catch (error) {
      console.error(`Failed to get configs for algorithm ${algorithm}:`, error);
      return [];
    }
  }

  /**
   * Import/export configurations
   */
  async exportConfigs(versions?: string[]): Promise<string> {
    const configs = versions ? 
      await Promise.all(versions.map(v => this.getConfig(v))) :
      await this.listConfigs();
    
    const validConfigs = configs.filter(c => c !== null);
    return JSON.stringify(validConfigs, null, 2);
  }

  async importConfigs(configsJson: string): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const configs = JSON.parse(configsJson) as BreadthCalculationConfig[];
      
      for (const config of configs) {
        try {
          // Generate new version to avoid conflicts
          const configToImport = {
            ...config,
            is_default: false // Imported configs are not default
          };
          delete (configToImport as any).version;
          delete (configToImport as any).created_at;
          delete (configToImport as any).updated_at;

          await this.createConfig(configToImport);
          imported++;
        } catch (error) {
          errors.push(`Failed to import ${config.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      errors.push(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { imported, errors };
  }

  /**
   * Performance optimization: bulk operations
   */
  async bulkUpdateConfigs(updates: Array<{ version: string; updates: Partial<BreadthCalculationConfig> }>): Promise<number> {
    const transaction = this.db.transaction((updates: any[]) => {
      let updated = 0;
      for (const { version, updates: configUpdates } of updates) {
        try {
          const success = this.updateConfigSync(version, configUpdates);
          if (success) updated++;
        } catch (error) {
          console.error(`Failed to update config ${version}:`, error);
        }
      }
      return updated;
    });

    return transaction(updates);
  }

  /**
   * Synchronous version of updateConfig for transactions
   */
  private updateConfigSync(version: string, updates: Partial<BreadthCalculationConfig>): boolean {
    const existingRow = this.getConfigStmt.get(version) as any;
    if (!existingRow) return false;

    const existing = JSON.parse(existingRow.config_json) as BreadthCalculationConfig;
    const updatedConfig: BreadthCalculationConfig = {
      ...existing,
      ...updates,
      version,
      updated_at: new Date().toISOString()
    };

    const result = this.updateConfigStmt.run(
      updatedConfig.algorithm,
      updatedConfig.name,
      updatedConfig.description,
      JSON.stringify(updatedConfig),
      updatedConfig.is_active ? 1 : 0,
      updatedConfig.is_default ? 1 : 0,
      version
    );

    return result.changes > 0;
  }

  /**
   * Generate unique version identifier
   */
  private generateVersion(algorithm: AlgorithmType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${algorithm}_${timestamp}_${random}`;
  }

  /**
   * Validate custom formula syntax
   */
  private validateCustomFormula(formula: string): void {
    // Check for dangerous operations
    const dangerousPatterns = [
      /\beval\b/i,
      /\bFunction\b/i,
      /\brequire\b/i,
      /\bimport\b/i,
      /\bprocess\b/i,
      /\bwindow\b/i,
      /\bglobal\b/i,
      /\bthis\b/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        throw new Error(`Formula contains potentially dangerous operation: ${pattern.source}`);
      }
    }

    // Check basic syntax
    const allowedChars = /^[a-zA-Z0-9_+\-*/.() \n\t]+$/;
    if (!allowedChars.test(formula)) {
      throw new Error('Formula contains invalid characters');
    }

    // Test formula execution with dummy data
    try {
      const testContext = {
        primary: 50,
        secondary: 50,
        reference: 50,
        sector: 50,
        advanceDeclineRatio: 50,
        newHighLowRatio: 50,
        volumeRatio: 50,
        moversRatio: 50,
        t2108: 50,
        momentum: 50
      };

      let testFormula = formula;
      for (const [key, value] of Object.entries(testContext)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        testFormula = testFormula.replace(regex, value.toString());
      }

      const result = Function(`"use strict"; return (${testFormula})`)();
      
      if (isNaN(Number(result)) || !isFinite(Number(result))) {
        throw new Error('Formula produces invalid numeric result');
      }
    } catch (error) {
      throw new Error(`Formula execution test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}