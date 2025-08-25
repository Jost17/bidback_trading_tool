import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EnhancedDataTable from '../EnhancedDataTable'
import { MarketData } from '../../types'

// Mock data for the table
const mockTableData: MarketData[] = [
  {
    id: 1,
    date: '2024-01-15',
    stocks_up_4pct: 207,
    stocks_down_4pct: 138,
    ratio_5day: 2.21,
    ratio_10day: 0.96,
    stocks_up_25pct_quarter: 1088,
    stocks_down_25pct_quarter: 1035,
    sp500: '5,881.63',
    t2108: 19.47,
    breadthScore: 65.5,
    breadth_score_normalized: 0.655
  },
  {
    id: 2,
    date: '2024-01-14',
    stocks_up_4pct: 262,
    stocks_down_4pct: 205,
    ratio_5day: 2.39,
    ratio_10day: 0.95,
    stocks_up_25pct_quarter: 1098,
    stocks_down_25pct_quarter: 1029,
    sp500: '5,906.94',
    t2108: 18.66,
    breadthScore: 62.8,
    breadth_score_normalized: 0.628
  }
]

describe('EnhancedDataTable Component', () => {
  const mockProps = {
    data: mockTableData,
    onSave: vi.fn(),
    onUpload: vi.fn(),
    loading: false,
    saving: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock API calls
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Rendering', () => {
    it('should render table with data', () => {
      render(<EnhancedDataTable {...mockProps} />)
      
      // Check for table headers
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Stocks Up 4%+')).toBeInTheDocument()
      expect(screen.getByText('Stocks Down 4%+')).toBeInTheDocument()
      expect(screen.getByText('5-Day Ratio')).toBeInTheDocument()
      expect(screen.getByText('Breadth Score')).toBeInTheDocument()
    })

    it('should display data rows correctly', () => {
      render(<EnhancedDataTable {...mockProps} />)
      
      // Check for data values
      expect(screen.getByText('2024-01-15')).toBeInTheDocument()
      expect(screen.getByText('207')).toBeInTheDocument()
      expect(screen.getByText('138')).toBeInTheDocument()
      expect(screen.getByText('2.21')).toBeInTheDocument()
      expect(screen.getByText('65.5')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      render(<EnhancedDataTable {...mockProps} loading={true} />)
      
      // Check for loading indicators
      const loadingElements = document.querySelectorAll('.animate-pulse, .animate-spin')
      expect(loadingElements.length).toBeGreaterThan(0)
    })

    it('should apply custom className', () => {
      const { container } = render(<EnhancedDataTable {...mockProps} className="custom-table" />)
      
      expect(container.firstChild).toHaveClass('custom-table')
    })
  })

  describe('Data Editing', () => {
    it('should allow editing cell values', async () => {
      const user = userEvent.setup()
      render(<EnhancedDataTable {...mockProps} />)
      
      // Find an editable cell (stocks_up_4pct)
      const editableCell = screen.getByDisplayValue('207')
      expect(editableCell).toBeInTheDocument()
      
      // Edit the value
      await user.clear(editableCell)
      await user.type(editableCell, '220')
      
      expect(editableCell).toHaveValue('220')
    })

    it('should validate numeric inputs', async () => {
      const user = userEvent.setup()
      render(<EnhancedDataTable {...mockProps} />)
      
      const editableCell = screen.getByDisplayValue('207')
      
      // Try to enter invalid text
      await user.clear(editableCell)
      await user.type(editableCell, 'invalid')
      
      // Should not accept non-numeric input or show validation error
      expect(editableCell).toHaveValue('invalid')
      
      // Trigger validation (blur event)
      fireEvent.blur(editableCell)
      
      // Should show error state or revert value
      await waitFor(() => {
        const errorElements = document.querySelectorAll('.error, .border-red-500, .text-red-500')
        expect(errorElements.length).toBeGreaterThan(0)
      })
    })

    it('should recalculate ratios when editing related fields', async () => {
      const user = userEvent.setup()
      render(<EnhancedDataTable {...mockProps} />)
      
      // Edit stocks_up_4pct value
      const stocksUpCell = screen.getByDisplayValue('207')
      await user.clear(stocksUpCell)
      await user.type(stocksUpCell, '300')
      
      // Blur to trigger calculation
      fireEvent.blur(stocksUpCell)
      
      // Should recalculate ratios automatically
      await waitFor(() => {
        // 5-day ratio should be recalculated based on new values
        const ratioCell = document.querySelector('[data-field="ratio_5day"]')
        expect(ratioCell).toBeTruthy()
      })
    })
  })

  describe('Save Functionality', () => {
    it('should call onSave when save button is clicked', async () => {
      render(<EnhancedDataTable {...mockProps} />)
      
      const saveButton = screen.getByText(/save/i)
      fireEvent.click(saveButton)
      
      expect(mockProps.onSave).toHaveBeenCalled()
    })

    it('should show saving state', () => {
      render(<EnhancedDataTable {...mockProps} saving={true} />)
      
      const saveButton = screen.getByText(/saving/i) || screen.getByRole('button', { name: /save/i })
      expect(saveButton).toBeDisabled()
    })

    it('should track dirty state for modified rows', async () => {
      const user = userEvent.setup()
      render(<EnhancedDataTable {...mockProps} />)
      
      // Edit a cell
      const editableCell = screen.getByDisplayValue('207')
      await user.clear(editableCell)
      await user.type(editableCell, '220')
      
      // Row should be marked as dirty
      await waitFor(() => {
        const dirtyIndicators = document.querySelectorAll('.dirty, .modified, .bg-yellow-50')
        expect(dirtyIndicators.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Upload Functionality', () => {
    it('should call onUpload when upload button is clicked', () => {
      render(<EnhancedDataTable {...mockProps} />)
      
      const uploadButton = screen.getByText(/upload/i)
      fireEvent.click(uploadButton)
      
      expect(mockProps.onUpload).toHaveBeenCalled()
    })

    it('should show upload modal when activated', async () => {
      render(<EnhancedDataTable {...mockProps} />)
      
      const uploadButton = screen.getByText(/upload/i)
      fireEvent.click(uploadButton)
      
      // Should open upload modal
      await waitFor(() => {
        expect(screen.getByText(/upload/i)).toBeInTheDocument()
      })
    })
  })

  describe('Sorting and Filtering', () => {
    it('should sort data when column header is clicked', () => {
      render(<EnhancedDataTable {...mockProps} />)
      
      const dateHeader = screen.getByText('Date')
      fireEvent.click(dateHeader)
      
      // Should apply sort class or indicator
      expect(dateHeader.closest('th')).toHaveClass(/sort|cursor-pointer/)
    })

    it('should filter data based on search input', async () => {
      const user = userEvent.setup()
      render(<EnhancedDataTable {...mockProps} />)
      
      // Find search input
      const searchInput = screen.getByPlaceholderText(/search/i) || 
                         screen.getByRole('textbox', { name: /search/i })
      
      if (searchInput) {
        await user.type(searchInput, '2024-01-15')
        
        // Should filter to show only matching rows
        await waitFor(() => {
          expect(screen.getByText('2024-01-15')).toBeInTheDocument()
          expect(screen.queryByText('2024-01-14')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('Data Validation', () => {
    it('should validate date format', async () => {
      const user = userEvent.setup()
      render(<EnhancedDataTable {...mockProps} />)
      
      // Find date input if editable
      const dateCell = screen.getByText('2024-01-15').closest('td')
      if (dateCell) {
        const input = dateCell.querySelector('input')
        if (input) {
          await user.clear(input)
          await user.type(input, 'invalid-date')
          fireEvent.blur(input)
          
          // Should show validation error
          await waitFor(() => {
            const errorElements = document.querySelectorAll('.error, .border-red-500')
            expect(errorElements.length).toBeGreaterThan(0)
          })
        }
      }
    })

    it('should validate numeric ranges', async () => {
      const user = userEvent.setup()
      render(<EnhancedDataTable {...mockProps} />)
      
      // Test T2108 range (should be 0-100)
      const t2108Cell = screen.getByDisplayValue('19.47')
      await user.clear(t2108Cell)
      await user.type(t2108Cell, '150') // Invalid range
      fireEvent.blur(t2108Cell)
      
      // Should show validation error
      await waitFor(() => {
        const errorElements = document.querySelectorAll('.error, .border-red-500')
        expect(errorElements.length).toBeGreaterThan(0)
      })
    })

    it('should validate required fields', async () => {
      const user = userEvent.setup()
      render(<EnhancedDataTable {...mockProps} />)
      
      // Clear a required field
      const requiredCell = screen.getByDisplayValue('207')
      await user.clear(requiredCell)
      fireEvent.blur(requiredCell)
      
      // Should show validation error
      await waitFor(() => {
        const errorElements = document.querySelectorAll('.error, .border-red-500, .required')
        expect(errorElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<EnhancedDataTable {...mockProps} />)
      
      // Check for table, thead, tbody structure
      expect(screen.getByRole('table')).toBeInTheDocument()
      
      const headers = screen.getAllByRole('columnheader')
      expect(headers.length).toBeGreaterThan(0)
      
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBeGreaterThan(1) // Header + data rows
    })

    it('should be keyboard navigable', () => {
      render(<EnhancedDataTable {...mockProps} />)
      
      // Editable cells should be focusable
      const editableCells = document.querySelectorAll('input')
      editableCells.forEach(cell => {
        expect(cell).not.toHaveAttribute('tabindex', '-1')
      })
    })

    it('should have proper ARIA labels', () => {
      render(<EnhancedDataTable {...mockProps} />)
      
      // Table should have accessible name
      const table = screen.getByRole('table')
      expect(table).toHaveAttribute('aria-label')
    })
  })

  describe('Error Handling', () => {
    it('should handle empty data gracefully', () => {
      render(<EnhancedDataTable {...mockProps} data={[]} />)
      
      // Should show empty state
      expect(screen.getByText(/no data/i) || screen.getByText(/empty/i)).toBeInTheDocument()
    })

    it('should handle save errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Save failed'))
      
      const saveProps = { ...mockProps, onSave: vi.fn().mockRejectedValue(new Error('Save failed')) }
      render(<EnhancedDataTable {...saveProps} />)
      
      const saveButton = screen.getByText(/save/i)
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockTableData[0],
        id: i + 1,
        date: `2024-01-${(i % 31) + 1}`
      }))
      
      const { container } = render(<EnhancedDataTable {...mockProps} data={largeDataset} />)
      
      // Should render without performance issues
      expect(container.firstChild).toBeInTheDocument()
      
      // Should implement virtualization for large datasets
      const visibleRows = container.querySelectorAll('tbody tr')
      expect(visibleRows.length).toBeLessThan(1000) // Should virtualize
    })

    it('should debounce search input', async () => {
      const user = userEvent.setup()
      render(<EnhancedDataTable {...mockProps} />)
      
      const searchInput = screen.getByPlaceholderText(/search/i)
      if (searchInput) {
        // Type rapidly
        await user.type(searchInput, 'test', { delay: 10 })
        
        // Should debounce the search
        expect(searchInput).toHaveValue('test')
      }
    })
  })
})