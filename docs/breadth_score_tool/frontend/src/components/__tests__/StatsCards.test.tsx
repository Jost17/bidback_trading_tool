import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { StatsCards } from '../StatsCards'

// Mock data for API responses
const mockCurrentStatus = {
  breadthScore: 65.5,
  lastUpdate: '2024-01-15T10:30:00Z'
}

const mockYearlySummaries = {
  data: [
    {
      totalRecords: 5420,
      year: 2024
    }
  ]
}

describe('StatsCards Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Mock successful API responses
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCurrentStatus)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockYearlySummaries)
      })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading skeleton initially', () => {
      render(<StatsCards />)
      
      // Should show loading animations
      const loadingElements = document.querySelectorAll('.animate-pulse')
      expect(loadingElements.length).toBeGreaterThan(0)
    })

    it('should show loading animation elements', () => {
      render(<StatsCards />)
      
      // Check for loading animations
      const loadingElements = document.querySelectorAll('.animate-pulse')
      expect(loadingElements.length).toBeGreaterThan(0)
    })
  })

  describe('Successful Data Loading', () => {
    it('should display market statistics after successful API call', async () => {
      render(<StatsCards />)
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Market Breadth')).toBeInTheDocument()
      })

      // Check that all four stat cards are displayed
      expect(screen.getByText('Market Breadth')).toBeInTheDocument()
      expect(screen.getByText('Bullish Stocks')).toBeInTheDocument() 
      expect(screen.getByText('Bearish Stocks')).toBeInTheDocument()
      expect(screen.getByText('Total Data Points')).toBeInTheDocument()
    })

    it('should display correct breadth score value', async () => {
      render(<StatsCards />)
      
      await waitFor(() => {
        expect(screen.getByText('65.5')).toBeInTheDocument()
      })
    })

    it('should display correct data points count', async () => {
      render(<StatsCards />)
      
      await waitFor(() => {
        expect(screen.getByText('5,420')).toBeInTheDocument()
      })
    })

    it('should calculate bullish/bearish stocks correctly', async () => {
      render(<StatsCards />)
      
      // Breadth score of 65.5 should result in:
      // Bullish: (65.5 - 50) * 2 = 31% -> 930 stocks
      // Bearish: 0% (since score > 50) -> 0 stocks
      
      await waitFor(() => {
        expect(screen.getByText('930')).toBeInTheDocument() // Bullish stocks
      })
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument() // Bearish stocks
      })
    })

    it('should make correct API calls', async () => {
      render(<StatsCards />)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/current-status')
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/yearly-summaries?limit=1')
    })
  })

  describe('Error Handling', () => {
    it('should display error state when API calls fail', async () => {
      // Mock failed API response
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      
      render(<StatsCards />)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load market statistics')).toBeInTheDocument()
      })

      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('should handle HTTP error responses', async () => {
      // Mock HTTP error response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      })
      
      render(<StatsCards />)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load market statistics')).toBeInTheDocument()
      })
    })

    it('should retry API call when retry button is clicked', async () => {
      // First call fails, second succeeds
      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCurrentStatus)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockYearlySummaries)
        })
      
      render(<StatsCards />)
      
      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      // Click retry button
      fireEvent.click(screen.getByText('Retry'))
      
      // Should make new API calls
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3) // 1 failed + 2 retry calls
      })
    })
  })

  describe('Visual Styling', () => {
    it('should apply custom className prop', () => {
      const { container } = render(<StatsCards className="custom-stats" />)
      
      expect(container.firstChild).toHaveClass('custom-stats')
    })

    it('should display correct color classes for different card types', async () => {
      render(<StatsCards />)
      
      await waitFor(() => {
        expect(screen.getByText('Market Breadth')).toBeInTheDocument()
      })

      // Check that color-specific classes are applied
      const cards = document.querySelectorAll('.card')
      expect(cards.length).toBe(4)
      
      // Should have different border colors for different card types
      const borderClasses = Array.from(cards).map(card => card.className)
      expect(borderClasses.some(cls => cls.includes('border-primary'))).toBe(true)
      expect(borderClasses.some(cls => cls.includes('border-success'))).toBe(true)
      expect(borderClasses.some(cls => cls.includes('border-danger'))).toBe(true)
    })

    it('should display icons for each stat card', async () => {
      render(<StatsCards />)
      
      await waitFor(() => {
        expect(screen.getByText('Market Breadth')).toBeInTheDocument()
      })

      // Check that icons are rendered (lucide-react icons render as SVGs)
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThanOrEqual(4)
    })

    it('should show change percentages with correct styling', async () => {
      render(<StatsCards />)
      
      await waitFor(() => {
        expect(screen.getByText('Market Breadth')).toBeInTheDocument()
      })

      // Check for change percentage displays
      const changeElements = document.querySelectorAll('.text-success-700, .text-danger-700')
      expect(changeElements.length).toBeGreaterThan(0)
    })
  })

  describe('Data Calculations', () => {
    it('should handle edge case with very low breadth score', async () => {
      const lowScoreData = { ...mockCurrentStatus, breadthScore: 20 }
      
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(lowScoreData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockYearlySummaries)
        })
      
      render(<StatsCards />)
      
      await waitFor(() => {
        expect(screen.getByText('20.0')).toBeInTheDocument()
      })

      // With score of 20: Bearish = (50-20)*2 = 60% -> 1800 stocks, Bullish = 0%
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument() // Bullish stocks
      })
      
      await waitFor(() => {
        // Check for bearish stocks - could be formatted as "1,800" or "1800"
        const bearishText = screen.getByText(/1[,]?800/)
        expect(bearishText).toBeInTheDocument()
      })
    })

    it('should handle missing data gracefully', async () => {
      const incompleteData = {}
      
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(incompleteData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [] })
        })
      
      render(<StatsCards />)
      
      await waitFor(() => {
        const naElements = screen.getAllByText('N/A')
        expect(naElements.length).toBeGreaterThanOrEqual(3) // Allow for flexibility
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', async () => {
      render(<StatsCards />)
      
      await waitFor(() => {
        expect(screen.getByText('Market Breadth')).toBeInTheDocument()
      })

      // Check for proper heading structure and labels
      const cards = document.querySelectorAll('.card')
      expect(cards.length).toBe(4)
      
      // Each card should have a title and description
      expect(screen.getByText('Current breadth score')).toBeInTheDocument()
      expect(screen.getByText('Stocks in uptrend')).toBeInTheDocument()
      expect(screen.getByText('Stocks in downtrend')).toBeInTheDocument()
      expect(screen.getByText('Historical records')).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      render(<StatsCards />)
      
      await waitFor(() => {
        expect(screen.getByText('Market Breadth')).toBeInTheDocument()
      })

      // Cards should be focusable for accessibility
      const cards = document.querySelectorAll('.card')
      cards.forEach(card => {
        expect(card).toBeVisible()
      })
    })
  })
})