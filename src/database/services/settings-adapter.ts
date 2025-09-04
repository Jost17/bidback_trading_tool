import Database from 'better-sqlite3'
import type { PortfolioSettings, TradingSetup } from '../../types/trading'

export class SettingsAdapter {
  private getSettingsStmt: Database.Statement
  private insertSettingsStmt: Database.Statement
  private updateSettingsStmt: Database.Statement
  private deleteSettingsStmt: Database.Statement

  constructor(private db: Database.Database) {
    // Prepared statements for portfolio settings
    this.getSettingsStmt = db.prepare(`
      SELECT * FROM portfolio_settings 
      ORDER BY updated_at DESC 
      LIMIT 1
    `)

    this.insertSettingsStmt = db.prepare(`
      INSERT INTO portfolio_settings (
        portfolio_size, base_size_percentage, max_heat_percentage, max_positions,
        trading_setups, risk_per_trade, use_kelly_sizing, enable_position_scaling,
        use_ib_account_size, ib_account_id, ib_sync_interval, ib_connection_status, ib_last_sync,
        last_updated, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    this.updateSettingsStmt = db.prepare(`
      UPDATE portfolio_settings SET
        portfolio_size = ?, base_size_percentage = ?, max_heat_percentage = ?, max_positions = ?,
        trading_setups = ?, risk_per_trade = ?, use_kelly_sizing = ?, enable_position_scaling = ?,
        use_ib_account_size = ?, ib_account_id = ?, ib_sync_interval = ?, ib_connection_status = ?, ib_last_sync = ?,
        last_updated = ?, updated_at = ?
      WHERE id = ?
    `)

    this.deleteSettingsStmt = db.prepare('DELETE FROM portfolio_settings WHERE id = ?')
  }

  /**
   * Get current portfolio settings
   */
  public getPortfolioSettings(): PortfolioSettings | null {
    try {
      const row = this.getSettingsStmt.get() as any

      if (!row) {
        return null
      }

      // Parse JSON trading_setups
      let tradingSetups: TradingSetup[] = []
      try {
        tradingSetups = JSON.parse(row.trading_setups || '[]')
      } catch (error) {
        console.warn('Failed to parse trading_setups JSON, using defaults:', error)
        tradingSetups = this.getDefaultTradingSetups()
      }

      return {
        id: row.id,
        portfolioSize: row.portfolio_size,
        baseSizePercentage: row.base_size_percentage,
        maxHeatPercentage: row.max_heat_percentage,
        maxPositions: row.max_positions,
        tradingSetups,
        riskPerTrade: row.risk_per_trade,
        useKellySizing: Boolean(row.use_kelly_sizing),
        enablePositionScaling: Boolean(row.enable_position_scaling),
        useIBAccountSize: Boolean(row.use_ib_account_size || false),
        ibAccountId: row.ib_account_id || '',
        ibSyncInterval: row.ib_sync_interval || 5,
        ibConnectionStatus: row.ib_connection_status as any || 'disconnected',
        ibLastSync: row.ib_last_sync || undefined,
        lastUpdated: row.last_updated,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    } catch (error) {
      console.error('Error getting portfolio settings:', error)
      throw new Error(`Failed to get portfolio settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get portfolio settings with fallback to defaults
   */
  public getPortfolioSettingsWithDefaults(): PortfolioSettings {
    const existing = this.getPortfolioSettings()
    
    if (existing) {
      return existing
    }

    // Return default settings if none exist
    return this.getDefaultSettings()
  }

  /**
   * Save or update portfolio settings
   */
  public savePortfolioSettings(settings: Omit<PortfolioSettings, 'id' | 'createdAt' | 'updatedAt'>): number {
    try {
      const now = new Date().toISOString()
      const tradingSetupsJson = JSON.stringify(settings.tradingSetups)

      // Check if settings already exist
      const existing = this.getPortfolioSettings()

      if (existing && existing.id) {
        // Update existing settings
        this.updateSettingsStmt.run(
          settings.portfolioSize,
          settings.baseSizePercentage,
          settings.maxHeatPercentage,
          settings.maxPositions,
          tradingSetupsJson,
          settings.riskPerTrade,
          settings.useKellySizing ? 1 : 0,
          settings.enablePositionScaling ? 1 : 0,
          settings.lastUpdated,
          now,
          existing.id
        )

        console.log('Portfolio settings updated successfully')
        return existing.id
      } else {
        // Insert new settings
        const result = this.insertSettingsStmt.run(
          settings.portfolioSize,
          settings.baseSizePercentage,
          settings.maxHeatPercentage,
          settings.maxPositions,
          tradingSetupsJson,
          settings.riskPerTrade,
          settings.useKellySizing ? 1 : 0,
          settings.enablePositionScaling ? 1 : 0,
          settings.lastUpdated,
          now,
          now
        )

        console.log('Portfolio settings created successfully')
        return result.lastInsertRowid as number
      }
    } catch (error) {
      console.error('Error saving portfolio settings:', error)
      throw new Error(`Failed to save portfolio settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Reset settings to defaults
   */
  public resetToDefaults(): number {
    try {
      const defaultSettings = this.getDefaultSettings()
      return this.savePortfolioSettings(defaultSettings)
    } catch (error) {
      console.error('Error resetting settings to defaults:', error)
      throw new Error(`Failed to reset settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete all portfolio settings (rarely used)
   */
  public deletePortfolioSettings(): boolean {
    try {
      const existing = this.getPortfolioSettings()
      if (!existing || !existing.id) {
        return false
      }

      this.deleteSettingsStmt.run(existing.id)
      console.log('Portfolio settings deleted successfully')
      return true
    } catch (error) {
      console.error('Error deleting portfolio settings:', error)
      throw new Error(`Failed to delete portfolio settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate settings before saving
   */
  public validateSettings(settings: Partial<PortfolioSettings>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (settings.portfolioSize !== undefined) {
      if (settings.portfolioSize <= 0) {
        errors.push('Portfolio size must be greater than 0')
      }
      if (settings.portfolioSize > 100000000) { // 100M max
        errors.push('Portfolio size cannot exceed $100,000,000')
      }
    }

    if (settings.baseSizePercentage !== undefined) {
      if (settings.baseSizePercentage <= 0 || settings.baseSizePercentage > 100) {
        errors.push('Base size percentage must be between 0 and 100')
      }
    }

    if (settings.maxHeatPercentage !== undefined) {
      if (settings.maxHeatPercentage <= 0 || settings.maxHeatPercentage > 100) {
        errors.push('Max heat percentage must be between 0 and 100')
      }
    }

    if (settings.maxPositions !== undefined) {
      if (settings.maxPositions <= 0 || settings.maxPositions > 50) {
        errors.push('Max positions must be between 1 and 50')
      }
    }

    if (settings.riskPerTrade !== undefined) {
      if (settings.riskPerTrade <= 0 || settings.riskPerTrade > 20) {
        errors.push('Risk per trade must be between 0 and 20%')
      }
    }

    if (settings.tradingSetups !== undefined) {
      if (!Array.isArray(settings.tradingSetups)) {
        errors.push('Trading setups must be an array')
      } else {
        settings.tradingSetups.forEach((setup, index) => {
          if (!setup.id || typeof setup.id !== 'string') {
            errors.push(`Trading setup ${index + 1}: ID is required and must be a string`)
          }
          if (!setup.name || typeof setup.name !== 'string') {
            errors.push(`Trading setup ${index + 1}: Name is required and must be a string`)
          }
          if (typeof setup.isActive !== 'boolean') {
            errors.push(`Trading setup ${index + 1}: isActive must be a boolean`)
          }
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get default portfolio settings
   */
  private getDefaultSettings(): PortfolioSettings {
    const now = new Date().toISOString()

    return {
      portfolioSize: 100000,
      baseSizePercentage: 10,
      maxHeatPercentage: 80,
      maxPositions: 8,
      tradingSetups: this.getDefaultTradingSetups(),
      riskPerTrade: 2,
      useKellySizing: false,
      enablePositionScaling: true,
      useIBAccountSize: false,
      ibAccountId: '',
      ibSyncInterval: 5,
      ibConnectionStatus: 'disconnected',
      ibLastSync: undefined,
      lastUpdated: now
    }
  }

  /**
   * Get default trading setups
   */
  private getDefaultTradingSetups(): TradingSetup[] {
    return [
      {
        id: 'bidback-classic',
        name: 'Bidback Classic',
        description: 'Traditional Bidback setup based on market breadth signals',
        isActive: true,
        positionSizeMultiplier: 1.0,
        riskMultiplier: 1.0
      },
      {
        id: 'bidback-9',
        name: 'Bidback 9',
        description: 'Enhanced Bidback setup with 9-day momentum filter',
        isActive: true,
        positionSizeMultiplier: 1.2,
        riskMultiplier: 1.1
      },
      {
        id: 'bidback-new-bo',
        name: 'Bidback New BO',
        description: 'Bidback with new breakout criteria and VIX filtering',
        isActive: true,
        positionSizeMultiplier: 0.8,
        riskMultiplier: 0.9
      },
      {
        id: 'custom-momentum',
        name: 'Custom Momentum',
        description: 'Custom momentum-based setup for high-probability entries',
        isActive: false,
        positionSizeMultiplier: 1.0,
        riskMultiplier: 1.0
      }
    ]
  }

  /**
   * Get database table info for debugging
   */
  public getTableInfo(): any {
    try {
      const tableInfo = this.db.prepare('PRAGMA table_info(portfolio_settings)').all()
      const count = this.db.prepare('SELECT COUNT(*) as count FROM portfolio_settings').get() as { count: number }
      
      return {
        tableExists: tableInfo.length > 0,
        columns: tableInfo,
        recordCount: count.count,
        tableName: 'portfolio_settings'
      }
    } catch (error) {
      return {
        tableExists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}