# BIDBACK Portfolio Management Rules - Complete Documentation

## Overview
The BIDBACK Master System is a comprehensive portfolio management framework that combines systematic position sizing with dynamic risk management based on market volatility (VIX) and market breadth conditions.

## Core Portfolio Settings

### 1. Portfolio Size
- **Minimum:** $1,000 (prevents micro-portfolio issues)
- **Maximum:** $50,000,000 (reasonable upper bound for system)
- **Recommended Range:** $25,000 - $5,000,000
- **Purpose:** Base calculation for all position sizing

### 2. Base Position Size
- **Standard:** 10% of portfolio
- **Range:** 1% - 50%
- **BIDBACK Recommendation:** 8-15% depending on experience level
- **Calculation:** `Base Position = Portfolio Size × Base Size %`

### 3. Maximum Portfolio Heat
- **Standard:** 80% of portfolio
- **Range:** 10% - 100%
- **Conservative:** 60-70%
- **Aggressive:** 80-90%
- **Definition:** Maximum capital at risk simultaneously across all positions

### 4. Maximum Concurrent Positions
- **Standard:** 8 positions
- **Range:** 1 - 20 positions
- **Calculation Based On:** Portfolio Heat ÷ Average Position Risk
- **BIDBACK Logic:** With 10% base positions and 80% max heat = ~8 positions

## BIDBACK Position Sizing Methodology

### Base Position Calculation
```
Final Position Size = Base Position × VIX Multiplier × Breadth Multiplier × Opportunity Multiplier
```

### VIX Multipliers (Volatility Adjustment)
- **VIX < 15:** 1.4x (Low volatility = larger positions)
- **VIX 15-20:** 1.2x
- **VIX 20-25:** 1.0x (Normal market conditions)
- **VIX 25-30:** 0.9x
- **VIX 30-40:** 0.8x
- **VIX > 40:** 0.6x (High volatility = smaller positions)

### Breadth Multipliers (Market Health)
- **Strong Breadth (>70):** 2.5x (Bull market conditions)
- **Good Breadth (50-70):** 2.0x
- **Neutral Breadth (30-50):** 1.5x
- **Weak Breadth (10-30):** 1.0x
- **Poor Breadth (<10):** 0.5x
- **Terrible Breadth (<0):** 0x (No new positions)

### Opportunity Multipliers
- **Big Opportunity:** 3.0x (Maximum 30% of portfolio)
- **Great Setup:** 2.0x
- **Good Setup:** 1.5x
- **Standard Setup:** 1.0x (Base position)
- **Marginal Setup:** 0.5x

## Risk Management Rules

### Position Size Limits
1. **Maximum Single Position:** 30% of portfolio (Big Opportunity only)
2. **Standard Maximum:** 15% of portfolio
3. **Minimum Position:** 0.5% of portfolio (below this, don't trade)

### Portfolio Heat Management
1. **Daily Heat Check:** Calculate total risk across all positions
2. **Heat Limit:** Never exceed maximum portfolio heat setting
3. **Heat Calculation:** `Sum of (Position Size × Stop Loss %)`
4. **New Position Rule:** Only add if total heat stays under limit

### Stop Loss Rules
1. **Initial Stop:** Set before entry (typically 7-15%)
2. **Risk per Position:** Usually 1-3% of portfolio
3. **Trailing Stops:** Implement for winning positions
4. **Emergency Stop:** 20% hard stop on any position

## Market Condition Adjustments

### Bull Market (Strong Breadth + Low VIX)
- **Position Sizes:** 150-350% of base (1.5x-3.5x multiplier)
- **Max Positions:** Use full allocation
- **Strategy:** Aggressive growth mode

### Normal Market (Neutral Breadth + Normal VIX)
- **Position Sizes:** 100-150% of base (1.0x-1.5x multiplier)
- **Max Positions:** Standard allocation
- **Strategy:** Balanced approach

### Bear Market (Weak Breadth + High VIX)
- **Position Sizes:** 30-80% of base (0.3x-0.8x multiplier)
- **Max Positions:** Reduced allocation
- **Strategy:** Capital preservation

### Crisis Market (Poor Breadth + Very High VIX)
- **Position Sizes:** 0-30% of base (0x-0.3x multiplier)
- **Max Positions:** Minimal positions or cash
- **Strategy:** Wait for better conditions

## Portfolio Examples

### Conservative Portfolio ($100k)
- **Base Position:** $8,000 (8%)
- **Max Heat:** $60,000 (60%)
- **Max Positions:** 6-8
- **Target:** Steady growth with low drawdowns

### Standard BIDBACK Portfolio ($100k)
- **Base Position:** $10,000 (10%)
- **Max Heat:** $80,000 (80%)
- **Max Positions:** 8
- **Target:** Balanced growth and risk

### Aggressive Portfolio ($100k)
- **Base Position:** $15,000 (15%)
- **Max Heat:** $90,000 (90%)
- **Max Positions:** 10-12
- **Target:** Maximum growth potential

## Implementation Guidelines

### Daily Workflow
1. **Market Assessment:** Check VIX and breadth scores
2. **Portfolio Heat Check:** Calculate current risk exposure
3. **Position Sizing:** Apply multipliers to base position
4. **Entry Decisions:** Only trade if within heat limits
5. **Stop Management:** Update all stops daily

### Weekly Review
1. **Performance Analysis:** Review wins/losses vs system rules
2. **Heat Management:** Analyze maximum heat experienced
3. **System Adherence:** Check compliance with sizing rules
4. **Market Condition:** Reassess breadth and volatility trends

### Monthly Optimization
1. **Base Position Review:** Adjust based on portfolio growth
2. **Heat Limits:** Modify based on risk tolerance changes
3. **Position Limits:** Adjust max positions as portfolio grows
4. **System Refinement:** Update rules based on performance data

## Validation Rules (Test Coverage)

### Portfolio Size Validation
- **Minimum Test:** Reject values below $1,000
- **Maximum Test:** Warn about values above $50M
- **Boundary Test:** Accept exactly $1,000 and $50,000,000
- **Invalid Input:** Handle non-numeric gracefully

### Base Position Validation
- **Range Test:** Accept 1% - 50%, reject outside range
- **Standard Test:** Default to 10% (BIDBACK standard)
- **Precision Test:** Handle decimal percentages (e.g., 12.5%)
- **Extreme Test:** Reject 0% and >50% as dangerous

### Max Heat Validation
- **Conservative Test:** Accept minimum 10%
- **Maximum Test:** Accept up to 100%
- **Safety Test:** Warn about >90% as very aggressive
- **Correlation Test:** Ensure heat > base position size

### Max Positions Validation
- **Minimum Test:** Accept at least 1 position
- **Maximum Test:** Limit to 20 positions max
- **Logic Test:** Correlate with base position and heat
- **Diversification Test:** Warn about <3 or >15 positions

## Error Handling Scenarios

### Common Errors
1. **Invalid Numeric Input:** Convert gracefully, show validation
2. **Out of Range Values:** Clear error messages with valid ranges
3. **Logical Inconsistencies:** Check position count vs heat limits
4. **Save Failures:** Graceful recovery with retry options

### Edge Cases
1. **Zero/Negative Values:** Reject with helpful messages
2. **Extremely Large Values:** Validate reasonableness
3. **Decimal Precision:** Handle appropriately for each field
4. **Simultaneous Edits:** Validate all fields before save

## Performance Considerations

### Calculation Efficiency
- **Real-time Updates:** Instant feedback on derived values
- **Validation Speed:** Quick validation without blocking UI
- **Memory Usage:** Efficient state management
- **Render Optimization:** Prevent unnecessary re-renders

### User Experience
- **Clear Feedback:** Immediate validation messages
- **Visual Indicators:** Color-coded validation states
- **Progress Indication:** Loading states during saves
- **Error Recovery:** Clear paths to fix issues

## Integration Points

### Position Calculator Integration
- **Settings Export:** Provide complete configuration object
- **Real-time Updates:** Notify calculator of setting changes
- **Validation Sync:** Ensure calculator respects limits
- **State Management:** Maintain consistency across components

### Database Persistence
- **Setting Storage:** Persist user preferences
- **History Tracking:** Maintain change log
- **Recovery Options:** Backup and restore capability
- **Migration Support:** Handle schema updates

### Risk Management System
- **Heat Monitoring:** Continuous portfolio heat calculation
- **Limit Enforcement:** Prevent trades exceeding limits
- **Alert System:** Warn when approaching limits
- **Override Controls:** Emergency limit adjustments

This documentation serves as the complete specification for implementing and testing the BIDBACK Portfolio Management System within the trading tool.