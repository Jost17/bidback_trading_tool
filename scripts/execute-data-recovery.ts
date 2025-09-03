#!/usr/bin/env npx tsx

/**
 * EXECUTE DATA RECOVERY SCRIPT
 * 
 * This script executes the complete data recovery process for corrupted CSV import records
 * 
 * Usage:
 *   npx tsx scripts/execute-data-recovery.ts
 *   or
 *   npm run recover-data
 */

import { DataRecoveryService, recoverMarketData, analyzeDataCorruption } from '../src/database/services/data-recovery-service'
import { existsSync } from 'fs'
import { join } from 'path'

async function main() {
  console.log('🚀 BIDBACK Trading Tool - Data Recovery System')
  console.log('='.repeat(60))

  // Database path
  const databasePath = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/docs/breadth_score_tool/backend/data/market_monitor.db'

  // Verify database exists
  if (!existsSync(databasePath)) {
    console.error('❌ Database not found:', databasePath)
    process.exit(1)
  }

  try {
    // Step 1: Analyze current state
    console.log('📊 PHASE 1: CORRUPTION ANALYSIS')
    console.log('-'.repeat(40))
    
    const analysis = analyzeDataCorruption(databasePath)
    console.log(`
📈 Database Analysis Results:
   • Total records: ${analysis.totalRecords.toLocaleString()}
   • Corrupted S&P 500 records: ${analysis.corruptedSP500Records}
   • Missing T2108 records: ${analysis.missingT2108Records}  
   • Secondary indicators issues: ${analysis.missingSecondaryIndicators}
   • Data quality issues: ${analysis.dataQualityIssues.length}
    `)

    // Show sample corruption issues
    if (analysis.dataQualityIssues.length > 0) {
      console.log('🔍 Sample corruption issues:')
      analysis.dataQualityIssues.slice(0, 5).forEach(issue => {
        console.log(`   ${issue.date}: ${issue.issues.join(', ')}`)
      })
    }

    // Ask for confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const confirmation = await new Promise<string>((resolve) => {
      readline.question(`
❓ Do you want to proceed with the recovery process? 
   This will create a backup and attempt to fix ${analysis.corruptedSP500Records + analysis.missingT2108Records} corrupted records.
   
   Type 'yes' to continue or 'no' to abort: `, resolve)
    })

    readline.close()

    if (confirmation.toLowerCase() !== 'yes') {
      console.log('🛑 Recovery aborted by user.')
      process.exit(0)
    }

    // Step 2: Execute complete recovery
    console.log('🔧 PHASE 2: EXECUTING RECOVERY')
    console.log('-'.repeat(40))

    const recoveryResult = await recoverMarketData(databasePath)

    // Step 3: Display results
    console.log('📋 PHASE 3: RECOVERY RESULTS')
    console.log('-'.repeat(40))

    if (recoveryResult.success) {
      console.log('✅ DATA RECOVERY COMPLETED SUCCESSFULLY!')
      console.log(recoveryResult.summary)

      if (recoveryResult.backupPath) {
        console.log(`💾 Backup stored at: ${recoveryResult.backupPath}`)
      }
    } else {
      console.log('❌ DATA RECOVERY FAILED!')
      console.log(recoveryResult.summary)
      
      if (recoveryResult.errors.length > 0) {
        console.log('\n🚨 Errors encountered:')
        recoveryResult.errors.forEach(error => console.log(`   • ${error}`))
      }
    }

    // Step 4: Post-recovery verification
    console.log('🔍 PHASE 4: POST-RECOVERY VERIFICATION')
    console.log('-'.repeat(40))

    const postAnalysis = analyzeDataCorruption(databasePath)
    const improvementSP500 = analysis.corruptedSP500Records - postAnalysis.corruptedSP500Records
    const improvementT2108 = analysis.missingT2108Records - postAnalysis.missingT2108Records

    console.log(`
🎯 Recovery Impact:
   • S&P 500 corruption reduced: ${improvementSP500} records (${analysis.corruptedSP500Records} → ${postAnalysis.corruptedSP500Records})
   • T2108 missing values reduced: ${improvementT2108} records (${analysis.missingT2108Records} → ${postAnalysis.missingT2108Records})
   • Overall data quality improvement: ${((improvementSP500 + improvementT2108) / (analysis.corruptedSP500Records + analysis.missingT2108Records) * 100).toFixed(1)}%
    `)

    if (postAnalysis.corruptedSP500Records === 0 && postAnalysis.missingT2108Records < 10) {
      console.log('🎉 EXCELLENT: Database is now in optimal condition!')
    } else if (postAnalysis.corruptedSP500Records < 10) {
      console.log('✅ GOOD: Most corruption has been resolved. Manual review may be needed for remaining issues.')
    } else {
      console.log('⚠️  WARNING: Significant corruption remains. Manual intervention may be required.')
    }

  } catch (error) {
    console.error('💥 Recovery process failed:', error)
    process.exit(1)
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error)
    process.exit(1)
  })
}

export { main }