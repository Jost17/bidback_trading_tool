#!/usr/bin/env npx tsx

/**
 * DATA CORRUPTION ANALYSIS SCRIPT
 * 
 * Analyzes database for various corruption patterns without making changes:
 * - CSV import parsing issues (comma-in-quotes)
 * - Multi-value S&P 500 fields
 * - Missing secondary indicators  
 * - Field alignment problems
 * - Data quality assessment
 */

import { analyzeDataCorruption } from '../src/database/services/data-recovery-service'
import { existsSync } from 'fs'
import { writeFileSync } from 'fs'

async function main() {
  console.log('🔍 BIDBACK Trading Tool - Data Corruption Analysis')
  console.log('='.repeat(60))

  // Database path
  const databasePath = '/Users/jostthedens/Documents/02_Areas/Claude_Spielwiese/bidback_trading_tool/docs/breadth_score_tool/backend/data/market_monitor.db'

  // Verify database exists
  if (!existsSync(databasePath)) {
    console.error('❌ Database not found:', databasePath)
    process.exit(1)
  }

  try {
    console.log('📊 PHASE 1: COMPREHENSIVE CORRUPTION ANALYSIS')
    console.log('-'.repeat(50))

    const analysis = analyzeDataCorruption(databasePath)

    // Display summary statistics
    console.log(`
📈 DATABASE OVERVIEW:
   • Total records: ${analysis.totalRecords.toLocaleString()}
   • Corrupted S&P 500 records: ${analysis.corruptedSP500Records} (${((analysis.corruptedSP500Records / analysis.totalRecords) * 100).toFixed(2)}%)
   • Missing T2108 records: ${analysis.missingT2108Records} (${((analysis.missingT2108Records / analysis.totalRecords) * 100).toFixed(2)}%)
   • Secondary indicators issues: ${analysis.missingSecondaryIndicators} (${((analysis.missingSecondaryIndicators / analysis.totalRecords) * 100).toFixed(2)}%)
   • Total data quality issues: ${analysis.dataQualityIssues.length}
    `)

    // Analyze corruption patterns
    console.log('🔍 PHASE 2: CORRUPTION PATTERN ANALYSIS')
    console.log('-'.repeat(50))

    const corruptionPatterns = analyzeCorruptionPatterns(analysis.dataQualityIssues)
    displayCorruptionPatterns(corruptionPatterns)

    // Show sample corruption cases
    console.log('📋 PHASE 3: SAMPLE CORRUPTION CASES')
    console.log('-'.repeat(50))
    
    if (analysis.dataQualityIssues.length > 0) {
      const sampleSize = Math.min(10, analysis.dataQualityIssues.length)
      console.log(`Showing ${sampleSize} sample corruption cases:\n`)
      
      for (let i = 0; i < sampleSize; i++) {
        const issue = analysis.dataQualityIssues[i]
        console.log(`${i + 1}. Record ID ${issue.recordId} (${issue.date}):`)
        issue.issues.forEach(issueType => {
          console.log(`   • ${issueType}`)
        })
        console.log('')
      }
    } else {
      console.log('✅ No corruption issues found!')
    }

    // Calculate recovery estimates
    console.log('🎯 PHASE 4: RECOVERY ESTIMATES')
    console.log('-'.repeat(50))

    const recoveryEstimates = calculateRecoveryEstimates(analysis)
    displayRecoveryEstimates(recoveryEstimates)

    // Generate detailed report
    const reportGenerated = await generateDetailedReport(analysis, corruptionPatterns, recoveryEstimates)
    
    console.log('\n📄 ANALYSIS COMPLETE')
    console.log('-'.repeat(50))
    console.log(`✅ Analysis completed for ${analysis.totalRecords.toLocaleString()} records`)
    console.log(`📊 Data quality score: ${calculateOverallDataQuality(analysis).toFixed(1)}%`)
    if (reportGenerated) {
      console.log(`📝 Detailed report saved: corruption-analysis-${new Date().toISOString().split('T')[0]}.md`)
    }
    
    // Recommendations
    if (analysis.corruptedSP500Records > 0 || analysis.missingT2108Records > 10) {
      console.log('\n💡 RECOMMENDATIONS:')
      console.log('   🔧 Run data recovery: npm run recover-data')
      console.log('   🛠️  Schedule maintenance: npm run db-admin maintenance')
      console.log('   💾 Create backup before recovery: npm run db-admin backup')
    } else {
      console.log('\n🎉 Database is in excellent condition!')
    }

  } catch (error) {
    console.error('💥 Analysis failed:', error)
    process.exit(1)
  }
}

interface CorruptionPatterns {
  sp500CommaFormatting: number
  sp500MultiValue: number
  sp500TooSmall: number
  missingT2108: number
  missingSecondaryIndicators: number
  temporalDistribution: Record<string, number>
}

function analyzeCorruptionPatterns(issues: any[]): CorruptionPatterns {
  const patterns: CorruptionPatterns = {
    sp500CommaFormatting: 0,
    sp500MultiValue: 0, 
    sp500TooSmall: 0,
    missingT2108: 0,
    missingSecondaryIndicators: 0,
    temporalDistribution: {}
  }

  for (const issue of issues) {
    // Count issue types
    for (const issueType of issue.issues) {
      if (issueType.includes('comma formatting')) {
        patterns.sp500CommaFormatting++
      }
      if (issueType.includes('multi-value') || issueType.includes('space')) {
        patterns.sp500MultiValue++
      }
      if (issueType.includes('too small')) {
        patterns.sp500TooSmall++
      }
      if (issueType.includes('T2108')) {
        patterns.missingT2108++
      }
      if (issueType.includes('secondary')) {
        patterns.missingSecondaryIndicators++
      }
    }

    // Temporal distribution (by year-month)
    const yearMonth = issue.date.substring(0, 7) // YYYY-MM
    patterns.temporalDistribution[yearMonth] = (patterns.temporalDistribution[yearMonth] || 0) + 1
  }

  return patterns
}

function displayCorruptionPatterns(patterns: CorruptionPatterns): void {
  console.log(`
🔍 Corruption Pattern Analysis:
   • S&P 500 comma formatting: ${patterns.sp500CommaFormatting} cases
   • S&P 500 multi-value fields: ${patterns.sp500MultiValue} cases
   • S&P 500 unrealistic values: ${patterns.sp500TooSmall} cases
   • Missing T2108 values: ${patterns.missingT2108} cases
   • Missing secondary indicators: ${patterns.missingSecondaryIndicators} cases
  `)

  // Show temporal distribution
  const sortedMonths = Object.entries(patterns.temporalDistribution)
    .sort(([a], [b]) => b.localeCompare(a)) // Most recent first
    .slice(0, 6) // Top 6 months with most issues

  if (sortedMonths.length > 0) {
    console.log('\n📅 Corruption by time period (most affected months):')
    sortedMonths.forEach(([month, count]) => {
      console.log(`   ${month}: ${count} issues`)
    })
  }
}

interface RecoveryEstimates {
  sp500Recoverable: number
  sp500NonRecoverable: number
  secondaryIndicatorsRecoverable: number
  estimatedRecoveryTime: number
  confidenceLevel: number
}

function calculateRecoveryEstimates(analysis: any): RecoveryEstimates {
  // Estimate S&P 500 recovery success based on corruption types
  const sp500Recoverable = Math.round(analysis.corruptedSP500Records * 0.85) // 85% recovery rate estimate
  const sp500NonRecoverable = analysis.corruptedSP500Records - sp500Recoverable

  // Estimate secondary indicators recovery (lower success rate)
  const secondaryIndicatorsRecoverable = Math.round(analysis.missingSecondaryIndicators * 0.45) // 45% recovery rate

  // Estimate recovery time (simplified model)
  const totalRecordsToProcess = analysis.corruptedSP500Records + analysis.missingSecondaryIndicators
  const estimatedRecoveryTime = Math.round((totalRecordsToProcess * 0.1) + 30) // ~0.1 seconds per record + overhead

  // Overall confidence based on corruption severity
  const corruptionPercentage = (analysis.corruptedSP500Records + analysis.missingT2108Records) / analysis.totalRecords
  const confidenceLevel = Math.max(60, 95 - (corruptionPercentage * 100 * 2)) // Scale confidence inversely with corruption

  return {
    sp500Recoverable,
    sp500NonRecoverable,
    secondaryIndicatorsRecoverable,
    estimatedRecoveryTime,
    confidenceLevel
  }
}

function displayRecoveryEstimates(estimates: RecoveryEstimates): void {
  console.log(`
🎯 Recovery Estimates:
   • S&P 500 values recoverable: ${estimates.sp500Recoverable} (${estimates.sp500NonRecoverable} may remain unrecoverable)
   • Secondary indicators recoverable: ${estimates.secondaryIndicatorsRecoverable}
   • Estimated recovery time: ${estimates.estimatedRecoveryTime} seconds
   • Recovery confidence level: ${estimates.confidenceLevel.toFixed(1)}%
  `)
}

function calculateOverallDataQuality(analysis: any): number {
  const totalIssues = analysis.corruptedSP500Records + analysis.missingT2108Records + analysis.missingSecondaryIndicators
  const qualityScore = Math.max(0, ((analysis.totalRecords - totalIssues) / analysis.totalRecords) * 100)
  return qualityScore
}

async function generateDetailedReport(
  analysis: any, 
  patterns: CorruptionPatterns, 
  estimates: RecoveryEstimates
): Promise<boolean> {
  try {
    const timestamp = new Date().toISOString()
    const filename = `corruption-analysis-${timestamp.split('T')[0]}.md`

    const report = `# Data Corruption Analysis Report

**Generated:** ${timestamp}
**Database:** market_monitor.db
**Total Records:** ${analysis.totalRecords.toLocaleString()}

## Executive Summary

This analysis identified ${analysis.dataQualityIssues.length} data quality issues affecting ${((analysis.dataQualityIssues.length / analysis.totalRecords) * 100).toFixed(2)}% of records.

### Key Findings:
- **S&P 500 Corruption:** ${analysis.corruptedSP500Records} records (${((analysis.corruptedSP500Records / analysis.totalRecords) * 100).toFixed(2)}%)
- **Missing T2108:** ${analysis.missingT2108Records} records (${((analysis.missingT2108Records / analysis.totalRecords) * 100).toFixed(2)}%)
- **Secondary Indicators:** ${analysis.missingSecondaryIndicators} records affected
- **Overall Data Quality Score:** ${calculateOverallDataQuality(analysis).toFixed(1)}%

## Corruption Patterns Analysis

### S&P 500 Field Issues:
- Comma formatting problems: ${patterns.sp500CommaFormatting} cases
- Multi-value fields: ${patterns.sp500MultiValue} cases  
- Unrealistic values: ${patterns.sp500TooSmall} cases

### Missing Data Issues:
- Missing T2108 values: ${patterns.missingT2108} cases
- Missing secondary indicators: ${patterns.missingSecondaryIndicators} cases

### Temporal Distribution:
${Object.entries(patterns.temporalDistribution)
  .sort(([a], [b]) => b.localeCompare(a))
  .slice(0, 10)
  .map(([month, count]) => `- ${month}: ${count} issues`)
  .join('\n')}

## Recovery Analysis

### Estimated Recovery Success:
- S&P 500 values: ${estimates.sp500Recoverable}/${estimates.sp500Recoverable + estimates.sp500NonRecoverable} (${((estimates.sp500Recoverable / (estimates.sp500Recoverable + estimates.sp500NonRecoverable)) * 100).toFixed(1)}%)
- Secondary indicators: ~${estimates.secondaryIndicatorsRecoverable} recoverable
- Estimated processing time: ${estimates.estimatedRecoveryTime} seconds
- Recovery confidence: ${estimates.confidenceLevel.toFixed(1)}%

## Recommendations

### Immediate Actions:
1. **Create Backup:** Execute \`npm run db-admin backup\` before any recovery
2. **Run Recovery:** Execute \`npm run recover-data\` to fix identified issues
3. **Validate Results:** Re-run analysis after recovery to verify improvements

### Long-term Improvements:
1. **Enhanced CSV Parsing:** Implement RFC 4180 compliant parser for future imports
2. **Data Validation:** Add input validation for S&P 500 values (range: 100-10000)
3. **Automated Quality Checks:** Schedule daily data quality monitoring
4. **Backup Strategy:** Implement automated daily backups with validation

## Sample Issues

${analysis.dataQualityIssues.slice(0, 20).map((issue: any, index: number) => `
### Issue ${index + 1}
- **Record ID:** ${issue.recordId}
- **Date:** ${issue.date}
- **Issues:** ${issue.issues.join(', ')}
`).join('')}

---

*Generated by BIDBACK Trading Tool Data Recovery System*
*For questions or support, consult the development team*
`

    writeFileSync(filename, report)
    return true

  } catch (error) {
    console.error('Failed to generate report:', error)
    return false
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