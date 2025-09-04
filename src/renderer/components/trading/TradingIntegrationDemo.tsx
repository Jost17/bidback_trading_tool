import React from 'react'
import { TradingOperationsDashboard } from './TradingOperationsDashboard'

/**
 * Demonstration component showing the integrated trading workflow:
 * 1. Position Calculator → 2. Enhanced Trade Entry Form
 * 
 * Features:
 * - Seamless data flow from calculator to entry form
 * - Pre-filled form fields with calculated values
 * - Risk/reward analysis display
 * - Market context preservation
 * - Visual workflow indicators
 * - Professional trading interface
 */
export const TradingIntegrationDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <TradingOperationsDashboard />
    </div>
  )
}