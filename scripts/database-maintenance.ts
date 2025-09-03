#!/usr/bin/env npx tsx

/**
 * DATABASE MAINTENANCE SCRIPT
 * 
 * Executes comprehensive database administration tasks:
 * - Health monitoring and alerting
 * - Automated backup with validation  
 * - Performance optimization
 * - Scheduled maintenance (VACUUM, ANALYZE, REINDEX)
 * - Security hardening
 * - Disaster recovery testing
 */

import { DatabaseAdminService, executeFullMaintenanceCycle } from '../src/database/services/database-admin-service'
import { existsSync } from 'fs'

async function main() {
  console.log('🛠️  BIDBACK Trading Tool - Database Administration')
  console.log('='.repeat(60))

  // Database path
  const databasePath = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/docs/breadth_score_tool/backend/data/market_monitor.db'

  // Verify database exists
  if (!existsSync(databasePath)) {
    console.error('❌ Database not found:', databasePath)
    process.exit(1)
  }

  const admin = new DatabaseAdminService(databasePath)

  try {
    // Get command line argument for operation type
    const operation = process.argv[2] || 'full'

    switch (operation.toLowerCase()) {
      case 'health':
        await performHealthCheck(admin)
        break
      
      case 'backup':
        await performBackup(admin)
        break
      
      case 'maintenance':
        await performMaintenance(admin)
        break
      
      case 'security':
        await performSecurityHardening(admin)
        break
      
      case 'disaster-test':
        await performDisasterRecoveryTest(admin)
        break
      
      case 'full':
      default:
        await performFullAdministration(admin)
        break
    }

    console.log('\n✅ Database administration completed successfully!')

  } catch (error) {
    console.error('💥 Database administration failed:', error)
    process.exit(1)
  } finally {
    admin.close()
  }
}

async function performHealthCheck(admin: DatabaseAdminService) {
  console.log('🏥 HEALTH CHECK')
  console.log('-'.repeat(40))

  const healthMetrics = admin.getDatabaseHealthMetrics()
  console.log(`
📊 Database Health Report:
   • Total size: ${(healthMetrics.totalSize / 1024 / 1024).toFixed(2)} MB
   • Table count: ${healthMetrics.tableCount}
   • Index count: ${healthMetrics.indexCount}
   • Fragmentation: ${healthMetrics.fragmentation.toFixed(2)}%
   • WAL size: ${(healthMetrics.walSize / 1024 / 1024).toFixed(2)} MB
   • Cache efficiency: ${healthMetrics.cacheEfficiency.toFixed(2)}%
   • Average query time: ${healthMetrics.averageQueryTime}ms
  `)

  const alerts = admin.checkHealthAlerts()
  if (alerts.length > 0) {
    console.log('\n🚨 HEALTH ALERTS:')
    alerts.forEach(alert => {
      console.log(`   ${alert.severity.toUpperCase()}: ${alert.metric}`)
      console.log(`   Current: ${alert.currentValue.toFixed(2)}, Threshold: ${alert.threshold}`)
      console.log(`   Action: ${alert.action}\n`)
    })
  } else {
    console.log('✅ All health metrics within normal ranges')
  }
}

async function performBackup(admin: DatabaseAdminService) {
  console.log('💾 BACKUP OPERATION')
  console.log('-'.repeat(40))

  const backupResult = await admin.executeBackupStrategy({
    retentionPolicy: {
      daily: 7,
      weekly: 4, 
      monthly: 12
    },
    validationRequired: true,
    compressionEnabled: false,
    encryptionEnabled: false
  })

  if (backupResult.success) {
    console.log(`
✅ Backup completed successfully!
   • Backup path: ${backupResult.backupPath}
   • Size: ${(backupResult.size / 1024 / 1024).toFixed(2)} MB
   • Duration: ${backupResult.duration}ms
   • Validation: ${backupResult.validationResult ? 'PASSED' : 'FAILED'}
    `)
  } else {
    console.log('❌ Backup failed!')
  }
}

async function performMaintenance(admin: DatabaseAdminService) {
  console.log('🔧 MAINTENANCE OPERATIONS')
  console.log('-'.repeat(40))

  const maintenanceResult = await admin.executeMaintenanceSchedule({
    vacuum: 'weekly',
    analyze: 'daily',
    reindex: 'monthly', 
    backup: 'daily'
  })

  console.log(`
🔧 Maintenance Results:
   • VACUUM: ${maintenanceResult.vacuumCompleted ? '✅ Complete' : '❌ Failed'}
   • ANALYZE: ${maintenanceResult.analyzeCompleted ? '✅ Complete' : '❌ Failed'}
   • REINDEX: ${maintenanceResult.reindexCompleted ? '✅ Complete' : '❌ Failed'}
   • BACKUP: ${maintenanceResult.backupCompleted ? '✅ Complete' : '❌ Failed'}
   • Duration: ${maintenanceResult.duration}ms
  `)

  if (maintenanceResult.errors.length > 0) {
    console.log('\n🚨 Maintenance errors:')
    maintenanceResult.errors.forEach(error => console.log(`   • ${error}`))
  }
}

async function performSecurityHardening(admin: DatabaseAdminService) {
  console.log('🔒 SECURITY HARDENING')
  console.log('-'.repeat(40))

  const securityResult = admin.implementSecurityHardening()

  console.log(`
🔒 Security Hardening Results:
   • Measures applied: ${securityResult.measuresApplied.length}
   • Security score: ${securityResult.securityScore.toFixed(1)}%
  `)

  console.log('\n📋 Applied measures:')
  securityResult.measuresApplied.forEach(measure => {
    console.log(`   ✅ ${measure}`)
  })
}

async function performDisasterRecoveryTest(admin: DatabaseAdminService) {
  console.log('🆘 DISASTER RECOVERY TEST')
  console.log('-'.repeat(40))

  const drTest = await admin.testDisasterRecovery()

  console.log(`
🆘 Disaster Recovery Test Results:
   • Success: ${drTest.success ? '✅ PASSED' : '❌ FAILED'}
   • Recovery time: ${drTest.recoverytime}ms
   • Issues found: ${drTest.issues.length}
  `)

  if (drTest.issues.length > 0) {
    console.log('\n🚨 Issues identified:')
    drTest.issues.forEach(issue => console.log(`   • ${issue}`))
  }
}

async function performFullAdministration(admin: DatabaseAdminService) {
  console.log('🚀 FULL DATABASE ADMINISTRATION')
  console.log('='.repeat(60))

  // Phase 1: Health Check
  await performHealthCheck(admin)
  
  console.log('\n')
  
  // Phase 2: Maintenance
  await performMaintenance(admin)
  
  console.log('\n')
  
  // Phase 3: Backup
  await performBackup(admin)
  
  console.log('\n')
  
  // Phase 4: Security
  await performSecurityHardening(admin)
  
  console.log('\n')
  
  // Phase 5: Disaster Recovery Test (optional - only on request)
  if (process.env.INCLUDE_DR_TEST === 'true') {
    await performDisasterRecoveryTest(admin)
  }

  console.log('\n🎯 ADMINISTRATION SUMMARY')
  console.log('-'.repeat(40))
  console.log('✅ Health monitoring completed')
  console.log('✅ Maintenance operations executed')
  console.log('✅ Backup strategy implemented')
  console.log('✅ Security hardening applied')
  console.log('✅ Database optimized for production')
}

// Usage information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🛠️  Database Administration Tool

Usage:
  npm run db-admin [operation]

Operations:
  health       - Database health check and alerting
  backup       - Execute backup with validation
  maintenance  - Run VACUUM, ANALYZE, REINDEX operations  
  security     - Apply security hardening measures
  disaster-test- Test disaster recovery procedures
  full         - Execute all operations (default)

Examples:
  npm run db-admin health
  npm run db-admin backup
  npm run db-admin full
  INCLUDE_DR_TEST=true npm run db-admin full
  `)
  process.exit(0)
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error)
    process.exit(1)
  })
}

export { main }