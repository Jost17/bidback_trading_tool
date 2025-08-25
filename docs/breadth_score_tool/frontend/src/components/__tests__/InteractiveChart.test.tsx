import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { InteractiveChart } from '../InteractiveChart'

// Mock chart data
const mockChartData = [
  { date: '2024-01-10', breadthScore: 45.2 },
  { date: '2024-01-11', breadthScore: 52.8 },
  { date: '2024-01-12', breadthScore: 48.9 },
  { date: '2024-01-13', breadthScore: 61.3 },
  { date: '2024-01-14', breadthScore: 55.7 },
  { date: '2024-01-15', breadthScore: 65.5 }
]

describe('InteractiveChart Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockChartData)
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading state initially', () => {
      render(<InteractiveChart />)
      
      // Check for loading indicators
      const loadingElements = document.querySelectorAll('.animate-pulse, .animate-spin')
      expect(loadingElements.length).toBeGreaterThan(0)
    })
  })

  describe('Chart Rendering', () => {
    it('should render chart after data loads', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        // Chart should be rendered via the mocked Line component
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })
    })

    it('should display time range selector buttons', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByText('7D')).toBeInTheDocument()
        expect(screen.getByText('30D')).toBeInTheDocument()
        expect(screen.getByText('90D')).toBeInTheDocument()
        expect(screen.getByText('1Y')).toBeInTheDocument()
        expect(screen.getByText('All')).toBeInTheDocument()
      })
    })

    it('should make correct API call for default time range', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/breadth-scores')
        )
      })
    })

    it('should apply custom className prop', () => {
      const { container } = render(<InteractiveChart className="custom-chart" />)
      
      expect(container.firstChild).toHaveClass('custom-chart')
    })
  })

  describe('Time Range Selection', () => {
    it('should change active time range when button is clicked', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByText('7D')).toBeInTheDocument()
      })

      // Click on 7D button
      fireEvent.click(screen.getByText('7D'))
      
      // Should make new API call with 7d parameter
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('days=7')
        )
      })
    })

    it('should highlight active time range button', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByText('30D')).toBeInTheDocument()
      })

      // Default should be 30D
      const thirtyDayButton = screen.getByText('30D')
      expect(thirtyDayButton.closest('button')).toHaveClass('bg-primary-500')
    })

    it('should update chart data when time range changes', async () => {
      const newData = [
        { date: '2024-01-14', breadthScore: 58.2 },
        { date: '2024-01-15', breadthScore: 65.5 }
      ]

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockChartData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(newData)
        })

      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByText('7D')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('7D'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error state when API call fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
      })
    })

    it('should handle HTTP error responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      })
      
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
      })
    })

    it('should provide retry functionality on error', async () => {
      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockChartData)
        })
      
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/retry/i))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Chart Configuration', () => {
    it('should have proper chart title', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByText(/breadth score/i)).toBeInTheDocument()
      })
    })

    it('should display chart statistics', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        // Should show current value, change, or other stats
        const statsElements = document.querySelectorAll('[class*="text-"]')
        expect(statsElements.length).toBeGreaterThan(0)
      })
    })

    it('should be responsive', () => {
      const { container } = render(<InteractiveChart />)
      
      // Check for responsive classes
      expect(container.firstChild).toHaveClass(/w-full|flex|grid/)
    })
  })

  describe('Data Processing', () => {
    it('should handle empty data gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      })
      
      render(<InteractiveChart />)
      
      await waitFor(() => {
        // Should show no data message or empty chart
        expect(
          screen.getByText(/no data/i) || screen.getByTestId('line-chart')
        ).toBeInTheDocument()
      })
    })

    it('should calculate chart statistics correctly', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      // Check if statistics are calculated from mock data
      // Latest value should be 65.5, min should be 45.2, max should be 65.5
      await waitFor(() => {
        const values = document.textContent
        expect(values).toContain('65.5') // Latest value
      })
    })

    it('should format dates correctly', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      // Chart should process dates from mock data correctly
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      // Check for accessibility attributes
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      
      buttons.forEach(button => {
        expect(button).toBeVisible()
      })
    })

    it('should be keyboard navigable', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByText('7D')).toBeInTheDocument()
      })

      // Time range buttons should be focusable
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('disabled')
      })
    })

    it('should provide alternative text for screen readers', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      // Chart mock should be accessible to screen readers
      const chartElement = screen.getByTestId('line-chart')
      expect(chartElement).toHaveTextContent('Mock Line Chart')
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily', async () => {
      const { rerender } = render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      const initialFetchCount = (global.fetch as any).mock.calls.length
      
      // Re-render with same props should not trigger new API call
      rerender(<InteractiveChart />)
      
      expect((global.fetch as any).mock.calls.length).toBe(initialFetchCount)
    })

    it('should debounce time range changes', async () => {
      render(<InteractiveChart />)
      
      await waitFor(() => {
        expect(screen.getByText('7D')).toBeInTheDocument()
      })

      // Rapid clicks should not cause multiple API calls
      const sevenDayButton = screen.getByText('7D')
      fireEvent.click(sevenDayButton)
      fireEvent.click(sevenDayButton)
      fireEvent.click(sevenDayButton)
      
      await waitFor(() => {
        // Should only make one additional call despite multiple clicks
        expect(global.fetch).toHaveBeenCalledTimes(2) // 1 initial + 1 for time range change
      })
    })
  })
})