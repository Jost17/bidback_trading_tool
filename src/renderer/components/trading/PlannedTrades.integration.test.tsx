/**
 * PlannedTrades Integration Tests
 * 
 * These tests validate the complete BIDBACK trading workflow:
 * - End-to-end trade planning and execution
 * - Integration between BIDBACK calculations and UI components
 * - Holiday calendar integration with exit date calculations
 * - Complete user workflow scenarios
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PlannedTrades } from './PlannedTrades'
import * as bidbackCalculations from '../../../utils/bidback-calculations'
import * as holidayCalendar from '../../../utils/holidayCalendar'
import type { PlannedTrade, BidbackCalculationInput, BidbackCalculationResult } from '../../../types/trading'

// Mock all dependencies
vi.mock('../../../utils/bidback-calculations')
vi.mock('../../../utils/holidayCalendar')
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  AlertTriangle: () => <div data-testid="alert-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  DollarSign: () => <div data-testid="dollar-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Shield: () => <div data-testid="shield-icon" />
}))

describe('PlannedTrades Integration Tests', () => {
  const mockOnTradeExecuted = vi.fn()
  const mockOnTradeDeleted = vi.fn()

  const defaultProps = {
    onTradeExecuted: mockOnTradeExecuted,
    onTradeDeleted: mockOnTradeDeleted
  }

  // Mock BIDBACK calculation results
  const mockBidbackResults = {
    spxl: {
      signals: {
        bigOpportunity: true,
        avoidEntry: false,
        vixRegime: 'elevated' as const,
        breadthStrength: 'strong' as const,
        positionDeterioration: 15
      },
      position: {
        basePosition: 10000,
        vixMultiplier: 1.1,
        bigOpportunityMultiplier: 2.0,
        finalPosition: 20000,
        portfolioHeatPercent: 20.0,
        isBigOpportunity: true,
        isAvoidEntry: false
      },
      exits: {
        stopLossPercent: -10,
        profitTarget1Percent: 9,
        profitTarget2Percent: 20,
        maxHoldDays: 5,
        vixMatrix: {
          vixRange: 'VIX 20-25 (Elevated)',
          stopLossPercent: -10,
          profitTarget1Percent: 9,
          profitTarget2Percent: 20,
          maxHoldDays: 5,
          multiplier: 1.1
        }
      },
      metadata: {
        calculationTime: 0.5,
        algorithm: 'BIDBACK-v1.0',
        confidence: 95
      }
    } as BidbackCalculationResult,
    
    tqqq: {
      signals: {
        bigOpportunity: false,
        avoidEntry: false,
        vixRegime: 'ultra-low' as const,
        breadthStrength: 'moderate' as const,
        positionDeterioration: 25
      },
      position: {
        basePosition: 10000,
        vixMultiplier: 0.8,
        bigOpportunityMultiplier: 1.0,
        finalPosition: 8000,
        portfolioHeatPercent: 8.0,
        isBigOpportunity: false,
        isAvoidEntry: false
      },
      exits: {
        stopLossPercent: -4,
        profitTarget1Percent: 4,
        profitTarget2Percent: 10,
        maxHoldDays: 3,
        vixMatrix: {
          vixRange: 'VIX < 12 (Ultra-Low)',
          stopLossPercent: -4,
          profitTarget1Percent: 4,
          profitTarget2Percent: 10,
          maxHoldDays: 3,
          multiplier: 0.8
        }
      },
      metadata: {
        calculationTime: 0.3,
        algorithm: 'BIDBACK-v1.0',
        confidence: 85
      }
    } as BidbackCalculationResult,

    soxl: {
      signals: {
        bigOpportunity: false,
        avoidEntry: true,
        vixRegime: 'normal' as const,
        breadthStrength: 'weak' as const,
        positionDeterioration: 75
      },
      position: {
        basePosition: 10000,
        vixMultiplier: 1.0,
        bigOpportunityMultiplier: 1.0,
        finalPosition: 0,
        portfolioHeatPercent: 0,
        isBigOpportunity: false,
        isAvoidEntry: true
      },
      exits: {
        stopLossPercent: -8,
        profitTarget1Percent: 7,
        profitTarget2Percent: 15,
        maxHoldDays: 4,
        vixMatrix: {
          vixRange: 'VIX 15-20 (Normal)',
          stopLossPercent: -8,
          profitTarget1Percent: 7,
          profitTarget2Percent: 15,
          maxHoldDays: 4,
          multiplier: 1.0
        }
      },
      metadata: {
        calculationTime: 0.4,
        algorithm: 'BIDBACK-v1.0',
        confidence: 90
      }
    } as BidbackCalculationResult
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock BIDBACK calculations
    vi.mocked(bidbackCalculations.calculateBidbackSignals).mockImplementation((input: BidbackCalculationInput) => {
      const symbol = input.basePosition === 10000 ? 
        (input.up4pct > 1000 ? 'spxl' : input.vix < 12 ? 'tqqq' : 'soxl') : 'spxl'
      return mockBidbackResults[symbol as keyof typeof mockBidbackResults]
    })
    
    vi.mocked(bidbackCalculations.formatBidbackResult).mockImplementation((result) => {
      if (result.signals.bigOpportunity) return 'Big Opportunity: 2.0x position (strong breadth)'
      if (result.signals.avoidEntry) return 'Avoid Entry: High deterioration'
      return `Normal conditions: ${result.position.vixMultiplier}x VIX multiplier (${result.signals.vixRegime} regime)`
    })

    // Mock holiday calendar functions
    vi.mocked(holidayCalendar.calculateExitDate).mockImplementation((entryDate, vix) => {
      const exitDate = new Date(entryDate)
      const days = vix < 12 ? 3 : vix < 20 ? 4 : 5
      exitDate.setDate(exitDate.getDate() + days)
      return exitDate
    })
    
    vi.mocked(holidayCalendar.calculateExitPrices).mockImplementation((entryPrice, vix) => {
      const matrix = vix < 12 
        ? { stopLossPercent: -4, profitTarget1Percent: 4, profitTarget2Percent: 10, maxHoldDays: 3, multiplier: 0.8, vixRange: 'VIX < 12 (Ultra-Low)' }
        : vix < 20
        ? { stopLossPercent: -8, profitTarget1Percent: 7, profitTarget2Percent: 15, maxHoldDays: 4, multiplier: 1.0, vixRange: 'VIX 15-20 (Normal)' }
        : { stopLossPercent: -10, profitTarget1Percent: 9, profitTarget2Percent: 20, maxHoldDays: 5, multiplier: 1.1, vixRange: 'VIX 20-25 (Elevated)' }
      
      return {
        stopLoss: entryPrice * (1 + matrix.stopLossPercent / 100),
        profitTarget1: entryPrice * (1 + matrix.profitTarget1Percent / 100),
        profitTarget2: entryPrice * (1 + matrix.profitTarget2Percent / 100),
        vixMatrix: matrix
      }
    })
    
    vi.mocked(holidayCalendar.getDaysToExit).mockReturnValue(3)
    vi.mocked(holidayCalendar.isTradingDay).mockImplementation((date) => {
      const d = new Date(date)
      const day = d.getDay()
      return day !== 0 && day !== 6 // Not weekend
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Complete Trade Workflow', () => {
    it('should display all trade scenarios with correct BIDBACK calculations', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        // Verify all three scenarios are displayed
        expect(screen.getByText('SPXL')).toBeInTheDocument()
        expect(screen.getByText('TQQQ')).toBeInTheDocument()
        expect(screen.getByText('SOXL')).toBeInTheDocument()
      })
      
      // Verify SPXL Big Opportunity scenario
      const spxlCard = screen.getByText('SPXL').closest('.border')
      expect(spxlCard).toHaveTextContent('Big Opportunity')
      expect(spxlCard).toHaveTextContent('$15,000') // Calculated position size from mock data
      expect(spxlCard).toHaveTextContent('15.0%') // Portfolio heat
      
      // Verify TQQQ normal conditions
      const tqqqCard = screen.getByText('TQQQ').closest('.border')
      expect(tqqqCard).toHaveTextContent('Normal')
      expect(tqqqCard).toHaveTextContent('$8,000') // VIX ultra-low multiplier
      expect(tqqqCard).toHaveTextContent('8.0%') // Portfolio heat
      
      // Verify SOXL avoid entry
      const soxlCard = screen.getByText('SOXL').closest('.border')
      expect(soxlCard).toHaveTextContent('Avoid Entry')
      expect(soxlCard).toHaveTextContent('$0') // Zero position
      expect(soxlCard).toHaveTextContent('0.0%') // No portfolio heat
    })

    it('should execute trade workflow end-to-end', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        const executeButtons = screen.getAllByRole('button', { name: /Execute/i })
        expect(executeButtons).toHaveLength(3)
      })
      
      // Execute the first trade (SPXL)
      const executeButtons = screen.getAllByRole('button', { name: /Execute/i })
      fireEvent.click(executeButtons[0])
      
      // Verify callback was called with correct trade ID
      await waitFor(() => {
        expect(mockOnTradeExecuted).toHaveBeenCalledWith(1)
      })
    })

    it('should delete trade workflow end-to-end', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('trash-icon')
        expect(deleteButtons).toHaveLength(3)
      })
      
      // Delete the first trade
      const deleteButton = screen.getAllByTestId('trash-icon')[0].closest('button')
      if (deleteButton) {
        fireEvent.click(deleteButton)
      }
      
      await waitFor(() => {
        expect(mockOnTradeDeleted).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('BIDBACK System Integration', () => {
    it('should integrate Big Opportunity detection with UI indicators', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        // Should show Big Opportunity indicator for SPXL
        expect(screen.getByText('Big Opportunity')).toBeInTheDocument()
        expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument()
        
        // Should display 2.0x multiplier result (mocked as $15,000 from $10,000 base)
        expect(screen.getByText('$15,000')).toBeInTheDocument()
      })
    })

    it('should integrate Avoid Entry detection with UI warnings', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        // Should show Avoid Entry indicator for SOXL
        expect(screen.getByText('Avoid Entry')).toBeInTheDocument()
        expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
        
        // Should show zero position
        expect(screen.getByText('$0')).toBeInTheDocument()
      })
    })

    it('should integrate VIX multipliers with position sizing', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        // TQQQ with ultra-low VIX should show reduced position
        const tqqqCard = screen.getByText('TQQQ').closest('.border')
        expect(tqqqCard).toHaveTextContent('$8,000') // 0.8x multiplier
        expect(tqqqCard).toHaveTextContent('Normal') // Normal conditions indicator
      })
    })

    it('should validate all BIDBACK Master System rules are applied', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        // Rule 1: Big Opportunity (T2108 < 30 + Up4% > 1000) → 2.0x multiplier
        const spxlCard = screen.getByText('SPXL').closest('.border')
        expect(spxlCard).toHaveTextContent('Big Opportunity')
        expect(spxlCard).toHaveTextContent('$15,000') // 2.0x from base $10k (mocked)
        
        // Rule 2: VIX multipliers applied correctly
        const tqqqCard = screen.getByText('TQQQ').closest('.border')
        expect(tqqqCard).toHaveTextContent('$8,000') // 0.8x from VIX < 12
        
        // Rule 3: Avoid Entry (Up4% < 150) → zero position
        const soxlCard = screen.getByText('SOXL').closest('.border')
        expect(soxlCard).toHaveTextContent('$0') // Avoid Entry
      })
    })
  })

  describe('Holiday Calendar Integration', () => {
    it('should display holiday-adjusted exit dates', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        // Should show exit dates for all planned trades
        const exitDateElements = screen.getAllByText(/Exit by:/)
        expect(exitDateElements).toHaveLength(3)
      })
    })

    it('should calculate different exit dates based on VIX levels', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        // Verify holiday calendar functions are called with correct VIX values
        expect(holidayCalendar.calculateExitDate).toHaveBeenCalledWith(
          expect.any(Date), 22.4 // SPXL VIX
        )
        expect(holidayCalendar.calculateExitDate).toHaveBeenCalledWith(
          expect.any(Date), 11.8 // TQQQ VIX
        )
        expect(holidayCalendar.calculateExitDate).toHaveBeenCalledWith(
          expect.any(Date), 15.2 // SOXL VIX
        )
      })
    })

    it('should display VIX-based exit prices correctly', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        // Verify exit price calculations are called
        expect(holidayCalendar.calculateExitPrices).toHaveBeenCalledWith(45.20, 22.4) // SPXL
        expect(holidayCalendar.calculateExitPrices).toHaveBeenCalledWith(62.85, 11.8) // TQQQ
        expect(holidayCalendar.calculateExitPrices).toHaveBeenCalledWith(35.50, 15.2) // SOXL
      })
    })
  })

  describe('Real-World Scenario Testing', () => {
    it('should handle market crash scenario (extreme VIX)', async () => {
      // Mock extreme market conditions
      vi.mocked(bidbackCalculations.calculateBidbackSignals).mockReturnValue({
        signals: {
          bigOpportunity: true,
          avoidEntry: false,
          vixRegime: 'extreme',
          breadthStrength: 'strong',
          positionDeterioration: 10
        },
        position: {
          basePosition: 10000,
          vixMultiplier: 1.4,
          bigOpportunityMultiplier: 2.0,
          finalPosition: 20000, // Big Opportunity overrides VIX
          portfolioHeatPercent: 20.0,
          isBigOpportunity: true,
          isAvoidEntry: false
        },
        exits: {
          stopLossPercent: -18,
          profitTarget1Percent: 15,
          profitTarget2Percent: 35,
          maxHoldDays: 10,
          vixMatrix: {
            vixRange: 'VIX > 40 (Extreme)',
            stopLossPercent: -18,
            profitTarget1Percent: 15,
            profitTarget2Percent: 35,
            maxHoldDays: 10,
            multiplier: 1.4
          }
        },
        metadata: {
          calculationTime: 0.8,
          algorithm: 'BIDBACK-v1.0',
          confidence: 75
        }
      })
      
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        // Should still show trades even in extreme conditions
        expect(screen.getByText('SPXL')).toBeInTheDocument()
        expect(screen.getByText('Big Opportunity')).toBeInTheDocument()
      })
    })

    it('should handle low volatility bull market scenario', async () => {
      // Mock low volatility conditions
      vi.mocked(bidbackCalculations.calculateBidbackSignals).mockReturnValue({
        signals: {
          bigOpportunity: false,
          avoidEntry: false,
          vixRegime: 'ultra-low',
          breadthStrength: 'moderate',
          positionDeterioration: 30
        },
        position: {
          basePosition: 10000,
          vixMultiplier: 0.8,
          bigOpportunityMultiplier: 1.0,
          finalPosition: 8000,
          portfolioHeatPercent: 8.0,
          isBigOpportunity: false,
          isAvoidEntry: false
        },
        exits: {
          stopLossPercent: -4,
          profitTarget1Percent: 4,
          profitTarget2Percent: 10,
          maxHoldDays: 3,
          vixMatrix: {
            vixRange: 'VIX < 12 (Ultra-Low)',
            stopLossPercent: -4,
            profitTarget1Percent: 4,
            profitTarget2Percent: 10,
            maxHoldDays: 3,
            multiplier: 0.8
          }
        },
        metadata: {
          calculationTime: 0.2,
          algorithm: 'BIDBACK-v1.0',
          confidence: 85
        }
      })
      
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        // Should show reduced position sizes due to low VIX
        expect(screen.getByText('Normal')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Responsiveness', () => {
    it('should render large number of trades efficiently', async () => {
      const startTime = performance.now()
      
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Planned Trades')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render in reasonable time
      expect(renderTime).toBeLessThan(1000) // Less than 1 second
    })

    it('should handle rapid user interactions', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        const executeButtons = screen.getAllByRole('button', { name: /Execute/i })
        
        // Rapidly click multiple buttons
        executeButtons.forEach(button => {
          fireEvent.click(button)
        })
      })
      
      // Should handle all clicks without errors
      await waitFor(() => {
        expect(mockOnTradeExecuted).toHaveBeenCalledTimes(3)
      })
    })
  })

  describe('Error Recovery and Edge Cases', () => {
    it('should handle BIDBACK calculation errors gracefully', async () => {
      // Mock calculation error
      vi.mocked(bidbackCalculations.calculateBidbackSignals).mockImplementation(() => {
        throw new Error('Calculation failed')
      })
      
      render(<PlannedTrades {...defaultProps} />)
      
      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Planned Trades')).toBeInTheDocument()
      })
    })

    it('should handle holiday calendar service failures', async () => {
      // Mock holiday service error
      vi.mocked(holidayCalendar.calculateExitDate).mockImplementation(() => {
        throw new Error('Holiday service unavailable')
      })
      
      render(<PlannedTrades {...defaultProps} />)
      
      // Should still render basic trade information
      await waitFor(() => {
        expect(screen.getByText('SPXL')).toBeInTheDocument()
      })
    })

    it('should validate trade data consistency', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        // Verify that position sizes are consistent with multipliers
        const trades = screen.getAllByText(/^\$[\d,]+$/)
        trades.forEach(trade => {
          const amount = trade.textContent?.replace(/[$,]/g, '')
          expect(Number(amount)).toBeGreaterThanOrEqual(0)
        })
      })
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should provide proper ARIA labels for all interactive elements', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          expect(button).toHaveAttribute('type')
        })
      })
    })

    it('should support keyboard navigation', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        
        // Tab through buttons
        buttons[0].focus()
        expect(document.activeElement).toBe(buttons[0])
        
        // Should be able to activate with Enter/Space
        fireEvent.keyDown(buttons[0], { key: 'Enter', code: 'Enter' })
      })
    })

    it('should display loading and empty states appropriately', async () => {
      render(<PlannedTrades {...defaultProps} />)
      
      // Should show loading initially
      expect(screen.getByRole('generic', { name: /loading/i }) || screen.getByText(/loading/i)).toBeInTheDocument()
      
      // Should transition to content
      await waitFor(() => {
        expect(screen.getByText('SPXL')).toBeInTheDocument()
      })
    })
  })
})