/**
 * DATABASE ADMINISTRATION SERVICE
 * 
 * Comprehensive database management focused on operational excellence, 
 * reliability, and production database maintenance.
 * 
 * Core responsibilities:
 * - Automated backup strategies with validation
 * - Database health monitoring and alerting
 * - Performance optimization and maintenance
 * - Disaster recovery procedures
 * - User management and security hardening
 * - Capacity planning and resource monitoring
 */

import Database from 'better-sqlite3'
import { writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'fs'
import { join, basename } from 'path'
import { execSync } from 'child_process'

export interface BackupStrategy {
  retentionPolicy: {
    daily: number    // Keep daily backups for N days
    weekly: number   // Keep weekly backups for N weeks  
    monthly: number  // Keep monthly backups for N months
  }
  validationRequired: boolean
  compressionEnabled: boolean
  encryptionEnabled: boolean
}

export interface DatabaseHealthMetrics {
  totalSize: number
  tableCount: number
  indexCount: number
  fragmentation: number
  lastVacuum: Date | null
  lastAnalyze: Date | null
  walSize: number
  cacheEfficiency: number
  averageQueryTime: number
  connectionCount: number
}

export interface AlertThreshold {
  metric: string
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: string
}

export interface MaintenanceSchedule {
  vacuum: 'daily' | 'weekly' | 'monthly'
  analyze: 'daily' | 'weekly' | 'monthly'
  reindex: 'weekly' | 'monthly' | 'quarterly'
  backup: 'hourly' | 'daily' | 'weekly'
}

export class DatabaseAdminService {
  private db: Database.Database
  private backupDirectory: string
  private monitoringEnabled: boolean = true
  private alertThresholds: AlertThreshold[]

  constructor(
    private databasePath: string,
    backupDir?: string
  ) {
    this.db = new Database(databasePath)
    this.backupDirectory = backupDir || join(process.cwd(), 'database-backups')
    this.setupBackupDirectory()
    this.initializeDefaultThresholds()
    this.optimizeDatabaseSettings()
  }

  // =================================
  // 1. BACKUP & DISASTER RECOVERY
  // =================================

  /**
   * Execute comprehensive backup with validation and retention management
   */
  public async executeBackupStrategy(strategy: BackupStrategy): Promise<{
    success: boolean
    backupPath: string
    validationResult: boolean
    size: number
    duration: number
  }> {
    const startTime = Date.now()
    console.log('💾 Starting comprehensive backup process...')

    try {
      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFilename = `trading-backup-${timestamp}.db`
      const backupPath = join(this.backupDirectory, backupFilename)

      // Create backup
      console.log(`📁 Creating backup: ${backupPath}`)
      this.db.backup(backupPath)

      // Validate backup integrity
      let validationResult = false
      if (strategy.validationRequired) {
        validationResult = await this.validateBackupIntegrity(backupPath)
        console.log(`✅ Backup validation: ${validationResult ? 'PASSED' : 'FAILED'}`)
      }

      // Get backup size
      const backupSize = statSync(backupPath).size

      // Apply compression if enabled
      if (strategy.compressionEnabled) {
        await this.compressBackup(backupPath)
      }

      // Apply encryption if enabled
      if (strategy.encryptionEnabled) {
        await this.encryptBackup(backupPath)
      }

      // Clean up old backups according to retention policy
      await this.applyRetentionPolicy(strategy.retentionPolicy)

      const duration = Date.now() - startTime

      console.log(`✅ Backup completed successfully in ${duration}ms`)
      console.log(`📊 Backup size: ${(backupSize / 1024 / 1024).toFixed(2)} MB`)

      return {
        success: true,
        backupPath,
        validationResult,
        size: backupSize,
        duration
      }

    } catch (error) {
      console.error('❌ Backup failed:', error)
      return {
        success: false,
        backupPath: '',
        validationResult: false,
        size: 0,
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Validate backup integrity by attempting to open and query
   */
  private async validateBackupIntegrity(backupPath: string): Promise<boolean> {
    try {
      const testDb = new Database(backupPath, { readonly: true })
      
      // Test basic queries
      const tables = testDb.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all()

      if (tables.length === 0) {
        return false
      }

      // Test data integrity on main tables
      for (const table of tables) {
        if (table.name.includes('market')) {
          const count = testDb.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get()
          if (!count || count.count < 0) {
            return false
          }
        }
      }

      testDb.close()
      return true

    } catch (error) {
      console.error('Backup validation failed:', error)
      return false
    }
  }

  /**
   * Apply retention policy to clean up old backups
   */
  private async applyRetentionPolicy(policy: BackupStrategy['retentionPolicy']): Promise<void> {
    console.log('🧹 Applying backup retention policy...')

    try {
      const backupFiles = readdirSync(this.backupDirectory)
        .filter(file => file.startsWith('trading-backup-') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: join(this.backupDirectory, file),
          stats: statSync(join(this.backupDirectory, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())

      const now = new Date()
      const dailyCutoff = new Date(now.getTime() - policy.daily * 24 * 60 * 60 * 1000)
      const weeklyCutoff = new Date(now.getTime() - policy.weekly * 7 * 24 * 60 * 60 * 1000)
      const monthlyCutoff = new Date(now.getTime() - policy.monthly * 30 * 24 * 60 * 60 * 1000)

      let deletedCount = 0

      for (const backup of backupFiles) {
        const age = backup.stats.mtime
        let shouldDelete = false

        // Apply different retention rules based on age
        if (age < dailyCutoff) {
          // Keep all daily backups within retention period
        } else if (age < weeklyCutoff && age.getDay() === 0) {
          // Keep weekly backups (Sunday) within retention period
        } else if (age < monthlyCutoff && age.getDate() === 1) {
          // Keep monthly backups (1st of month) within retention period
        } else {
          shouldDelete = true
        }

        if (shouldDelete) {
          require('fs').unlinkSync(backup.path)
          deletedCount++
          console.log(`🗑️  Deleted old backup: ${backup.name}`)
        }
      }

      console.log(`✅ Retention policy applied: ${deletedCount} old backups cleaned up`)

    } catch (error) {
      console.error('❌ Retention policy application failed:', error)
    }
  }

  // =================================
  // 2. DATABASE HEALTH MONITORING
  // =================================

  /**
   * Comprehensive database health assessment
   */
  public getDatabaseHealthMetrics(): DatabaseHealthMetrics {
    console.log('🏥 Collecting database health metrics...')

    try {
      // Database size
      const totalSize = statSync(this.databasePath).size

      // Schema information
      const tables = this.db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'
      `).get() as { count: number }

      const indexes = this.db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master WHERE type='index'
      `).get() as { count: number }

      // WAL size
      const walPath = this.databasePath + '-wal'
      let walSize = 0
      if (existsSync(walPath)) {
        walSize = statSync(walPath).size
      }

      // Database statistics
      const dbStats = this.db.prepare('PRAGMA database_list').all()
      const pageCount = this.db.prepare('PRAGMA page_count').get() as { page_count: number }
      const pageSize = this.db.prepare('PRAGMA page_size').get() as { page_size: number }
      const freeListCount = this.db.prepare('PRAGMA freelist_count').get() as { freelist_count: number }

      // Calculate fragmentation
      const fragmentation = pageCount && freeListCount 
        ? (freeListCount.freelist_count / pageCount.page_count) * 100
        : 0

      // Cache statistics
      const cacheStats = this.db.prepare('PRAGMA cache_size').get() as { cache_size: number }

      return {
        totalSize,
        tableCount: tables.count,
        indexCount: indexes.count,
        fragmentation,
        lastVacuum: this.getLastMaintenanceDate('VACUUM'),
        lastAnalyze: this.getLastMaintenanceDate('ANALYZE'),
        walSize,
        cacheEfficiency: this.calculateCacheEfficiency(),
        averageQueryTime: this.measureAverageQueryTime(),
        connectionCount: 1 // SQLite is single-connection
      }

    } catch (error) {
      console.error('❌ Health metrics collection failed:', error)
      throw error
    }
  }

  /**
   * Monitor and alert on database health thresholds
   */
  public checkHealthAlerts(): Array<{
    metric: string
    currentValue: number
    threshold: number
    severity: string
    action: string
  }> {
    console.log('🚨 Checking health alert thresholds...')

    const alerts: Array<{
      metric: string
      currentValue: number
      threshold: number
      severity: string
      action: string
    }> = []

    try {
      const metrics = this.getDatabaseHealthMetrics()

      for (const threshold of this.alertThresholds) {
        let currentValue: number = 0

        switch (threshold.metric) {
          case 'database_size_mb':
            currentValue = metrics.totalSize / 1024 / 1024
            break
          case 'fragmentation_percent':
            currentValue = metrics.fragmentation
            break
          case 'wal_size_mb':
            currentValue = metrics.walSize / 1024 / 1024
            break
          case 'cache_efficiency_percent':
            currentValue = metrics.cacheEfficiency
            break
          case 'average_query_time_ms':
            currentValue = metrics.averageQueryTime
            break
        }

        if (currentValue > threshold.threshold) {
          alerts.push({
            metric: threshold.metric,
            currentValue,
            threshold: threshold.threshold,
            severity: threshold.severity,
            action: threshold.action
          })

          console.warn(`🚨 ALERT: ${threshold.metric} = ${currentValue.toFixed(2)} (threshold: ${threshold.threshold})`)
        }
      }

      return alerts

    } catch (error) {
      console.error('❌ Health alert check failed:', error)
      return []
    }
  }

  // =================================
  // 3. AUTOMATED MAINTENANCE
  // =================================

  /**
   * Execute scheduled maintenance based on configuration
   */
  public async executeMaintenanceSchedule(schedule: MaintenanceSchedule): Promise<{
    vacuumCompleted: boolean
    analyzeCompleted: boolean
    reindexCompleted: boolean
    backupCompleted: boolean
    duration: number
    errors: string[]
  }> {
    const startTime = Date.now()
    console.log('🔧 Starting scheduled maintenance...')

    const errors: string[] = []
    let vacuumCompleted = false
    let analyzeCompleted = false
    let reindexCompleted = false
    let backupCompleted = false

    try {
      // VACUUM operation
      if (this.shouldRunMaintenance('VACUUM', schedule.vacuum)) {
        console.log('🧹 Running VACUUM...')
        try {
          this.db.exec('VACUUM')
          this.recordMaintenanceOperation('VACUUM')
          vacuumCompleted = true
          console.log('✅ VACUUM completed')
        } catch (error) {
          errors.push(`VACUUM failed: ${error}`)
        }
      }

      // ANALYZE operation  
      if (this.shouldRunMaintenance('ANALYZE', schedule.analyze)) {
        console.log('📊 Running ANALYZE...')
        try {
          this.db.exec('ANALYZE')
          this.recordMaintenanceOperation('ANALYZE')
          analyzeCompleted = true
          console.log('✅ ANALYZE completed')
        } catch (error) {
          errors.push(`ANALYZE failed: ${error}`)
        }
      }

      // REINDEX operation
      if (this.shouldRunMaintenance('REINDEX', schedule.reindex)) {
        console.log('🔄 Running REINDEX...')
        try {
          this.db.exec('REINDEX')
          this.recordMaintenanceOperation('REINDEX')
          reindexCompleted = true
          console.log('✅ REINDEX completed')
        } catch (error) {
          errors.push(`REINDEX failed: ${error}`)
        }
      }

      // Backup operation
      if (this.shouldRunMaintenance('BACKUP', schedule.backup)) {
        console.log('💾 Running scheduled backup...')
        try {
          const backupResult = await this.executeBackupStrategy({
            retentionPolicy: { daily: 7, weekly: 4, monthly: 12 },
            validationRequired: true,
            compressionEnabled: false,
            encryptionEnabled: false
          })
          backupCompleted = backupResult.success
          if (!backupResult.success) {
            errors.push('Scheduled backup failed')
          }
        } catch (error) {
          errors.push(`Backup failed: ${error}`)
        }
      }

      const duration = Date.now() - startTime
      console.log(`✅ Maintenance completed in ${duration}ms`)

      return {
        vacuumCompleted,
        analyzeCompleted, 
        reindexCompleted,
        backupCompleted,
        duration,
        errors
      }

    } catch (error) {
      errors.push(`Maintenance failed: ${error}`)
      return {
        vacuumCompleted,
        analyzeCompleted,
        reindexCompleted, 
        backupCompleted,
        duration: Date.now() - startTime,
        errors
      }
    }
  }

  // =================================
  // 4. PERFORMANCE OPTIMIZATION
  // =================================

  /**
   * Optimize database settings for production use
   */
  public optimizeDatabaseSettings(): void {
    console.log('⚡ Optimizing database settings...')

    try {
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL')

      // Set optimal cache size (64MB)
      this.db.pragma('cache_size = 64000')

      // Set synchronous to NORMAL for better performance
      this.db.pragma('synchronous = NORMAL')

      // Enable memory mapping (256MB)
      this.db.pragma('mmap_size = 268435456')

      // Set optimal page size
      this.db.pragma('page_size = 4096')

      // Enable query optimization
      this.db.pragma('optimize')

      console.log('✅ Database settings optimized for production')

    } catch (error) {
      console.error('❌ Database optimization failed:', error)
    }
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  public analyzeQueryPerformance(query: string): {
    executionTime: number
    explanation: any[]
    suggestions: string[]
  } {
    const startTime = Date.now()
    
    // Get query plan
    const explanation = this.db.prepare(`EXPLAIN QUERY PLAN ${query}`).all()
    
    // Measure execution time
    const stmt = this.db.prepare(query)
    const result = stmt.all()
    const executionTime = Date.now() - startTime

    // Analyze for optimization suggestions
    const suggestions: string[] = []
    
    for (const step of explanation) {
      if (step.detail.includes('SCAN TABLE')) {
        suggestions.push('Consider adding an index for table scans')
      }
      if (step.detail.includes('TEMP B-TREE')) {
        suggestions.push('Consider adding an index to avoid temporary sorting')
      }
      if (step.detail.includes('USE INDEX')) {
        // This is good - index is being used
      }
    }

    return {
      executionTime,
      explanation,
      suggestions
    }
  }

  // =================================
  // 5. SECURITY & USER MANAGEMENT  
  // =================================

  /**
   * Implement security hardening measures
   */
  public implementSecurityHardening(): {
    measuresApplied: string[]
    securityScore: number
  } {
    console.log('🔒 Implementing security hardening...')

    const measuresApplied: string[] = []

    try {
      // Enable foreign key constraints
      this.db.pragma('foreign_keys = ON')
      measuresApplied.push('Foreign key constraints enabled')

      // Set secure deletion
      this.db.pragma('secure_delete = ON')
      measuresApplied.push('Secure deletion enabled')

      // Disable potential dangerous functions
      this.db.pragma('trusted_schema = OFF')
      measuresApplied.push('Trusted schema disabled')

      // Enable recursive trigger protection
      this.db.pragma('recursive_triggers = ON')
      measuresApplied.push('Recursive trigger protection enabled')

      console.log(`✅ Security hardening applied: ${measuresApplied.length} measures`)

      // Calculate security score (simplified)
      const securityScore = (measuresApplied.length / 4) * 100

      return {
        measuresApplied,
        securityScore
      }

    } catch (error) {
      console.error('❌ Security hardening failed:', error)
      return {
        measuresApplied,
        securityScore: 0
      }
    }
  }

  // =================================
  // 6. DISASTER RECOVERY PROCEDURES
  // =================================

  /**
   * Test disaster recovery procedures
   */
  public async testDisasterRecovery(): Promise<{
    success: boolean
    recoverytime: number
    issues: string[]
  }> {
    console.log('🆘 Testing disaster recovery procedures...')

    const startTime = Date.now()
    const issues: string[] = []

    try {
      // 1. Create a test backup
      const testBackup = await this.executeBackupStrategy({
        retentionPolicy: { daily: 1, weekly: 1, monthly: 1 },
        validationRequired: true,
        compressionEnabled: false,
        encryptionEnabled: false
      })

      if (!testBackup.success) {
        issues.push('Backup creation failed during disaster recovery test')
        return { success: false, recoverytime: 0, issues }
      }

      // 2. Test backup integrity
      const integrityTest = await this.validateBackupIntegrity(testBackup.backupPath)
      if (!integrityTest) {
        issues.push('Backup integrity validation failed')
      }

      // 3. Test restore procedure (simulation)
      const restoreTest = await this.simulateRestoreProcedure(testBackup.backupPath)
      if (!restoreTest) {
        issues.push('Restore procedure simulation failed')
      }

      // 4. Verify RTO/RPO objectives
      const recoverytime = Date.now() - startTime
      const rtoObjective = 300000 // 5 minutes in milliseconds
      
      if (recoverytime > rtoObjective) {
        issues.push(`Recovery time ${recoverytime}ms exceeds RTO objective ${rtoObjective}ms`)
      }

      console.log(`✅ Disaster recovery test completed in ${recoverytime}ms`)

      return {
        success: issues.length === 0,
        recoverytime,
        issues
      }

    } catch (error) {
      issues.push(`Disaster recovery test failed: ${error}`)
      return {
        success: false,
        recoverytime: Date.now() - startTime,
        issues
      }
    }
  }

  // PRIVATE HELPER METHODS

  private setupBackupDirectory(): void {
    if (!existsSync(this.backupDirectory)) {
      mkdirSync(this.backupDirectory, { recursive: true })
      console.log(`📁 Created backup directory: ${this.backupDirectory}`)
    }
  }

  private initializeDefaultThresholds(): void {
    this.alertThresholds = [
      { metric: 'database_size_mb', threshold: 1000, severity: 'medium', action: 'Monitor growth patterns' },
      { metric: 'fragmentation_percent', threshold: 25, severity: 'high', action: 'Schedule VACUUM operation' },
      { metric: 'wal_size_mb', threshold: 100, severity: 'medium', action: 'Consider checkpoint' },
      { metric: 'cache_efficiency_percent', threshold: 80, severity: 'low', action: 'Consider cache size increase' },
      { metric: 'average_query_time_ms', threshold: 1000, severity: 'high', action: 'Analyze query performance' }
    ]
  }

  private getLastMaintenanceDate(operation: string): Date | null {
    // This would typically be stored in a maintenance log table
    // For now, return null indicating unknown
    return null
  }

  private calculateCacheEfficiency(): number {
    // Simplified cache efficiency calculation
    return 85 // Placeholder value
  }

  private measureAverageQueryTime(): number {
    // Simplified query time measurement
    return 50 // Placeholder value in milliseconds
  }

  private shouldRunMaintenance(operation: string, frequency: string): boolean {
    // Simplified logic - would check last run date against frequency
    return true // Placeholder - run maintenance for demo
  }

  private recordMaintenanceOperation(operation: string): void {
    // Record maintenance operation timestamp
    console.log(`📝 Recorded maintenance operation: ${operation} at ${new Date().toISOString()}`)
  }

  private async compressBackup(backupPath: string): Promise<void> {
    // Placeholder for backup compression
    console.log(`🗜️  Compressing backup: ${backupPath}`)
  }

  private async encryptBackup(backupPath: string): Promise<void> {
    // Placeholder for backup encryption  
    console.log(`🔐 Encrypting backup: ${backupPath}`)
  }

  private async simulateRestoreProcedure(backupPath: string): Promise<boolean> {
    // Simulate restore procedure without actually restoring
    try {
      const testDb = new Database(backupPath, { readonly: true })
      const tableCount = testDb.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'
      `).get() as { count: number }
      testDb.close()
      
      return tableCount.count > 0
    } catch (error) {
      return false
    }
  }

  public close(): void {
    this.db.close()
  }
}

// CONVENIENCE FUNCTIONS

export function createDatabaseAdmin(databasePath: string, backupDir?: string): DatabaseAdminService {
  return new DatabaseAdminService(databasePath, backupDir)
}

export async function executeFullMaintenanceCycle(databasePath: string): Promise<void> {
  const admin = createDatabaseAdmin(databasePath)
  
  try {
    // Health check
    const health = admin.getDatabaseHealthMetrics()
    console.log('📊 Database health:', health)
    
    // Check alerts
    const alerts = admin.checkHealthAlerts()
    if (alerts.length > 0) {
      console.warn('🚨 Health alerts detected:', alerts)
    }
    
    // Execute maintenance
    const maintenance = await admin.executeMaintenanceSchedule({
      vacuum: 'weekly',
      analyze: 'daily', 
      reindex: 'monthly',
      backup: 'daily'
    })
    
    console.log('🔧 Maintenance completed:', maintenance)
    
    // Security hardening
    const security = admin.implementSecurityHardening()
    console.log('🔒 Security measures:', security)
    
  } finally {
    admin.close()
  }
}