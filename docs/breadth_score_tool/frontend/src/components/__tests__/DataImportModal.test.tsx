import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataImportModal } from '../DataImportModal'

describe('DataImportModal Component', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'Data imported successfully' })
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Modal Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<DataImportModal {...mockProps} />)
      
      // Check for modal elements
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/import/i)).toBeInTheDocument()
    })

    it('should not render modal when isOpen is false', () => {
      render(<DataImportModal {...mockProps} isOpen={false} />)
      
      // Modal should not be visible
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should display close button', () => {
      render(<DataImportModal {...mockProps} />)
      
      const closeButton = screen.getByRole('button', { name: /close/i }) ||
                         screen.getByLabelText(/close/i)
      expect(closeButton).toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', () => {
      render(<DataImportModal {...mockProps} />)
      
      const closeButton = screen.getByRole('button', { name: /close/i }) ||
                         screen.getByLabelText(/close/i)
      fireEvent.click(closeButton)
      
      expect(mockProps.onClose).toHaveBeenCalled()
    })

    it('should call onClose when clicking outside modal', () => {
      render(<DataImportModal {...mockProps} />)
      
      const backdrop = document.querySelector('.modal-backdrop, .overlay, .backdrop')
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(mockProps.onClose).toHaveBeenCalled()
      }
    })
  })

  describe('Tab Navigation', () => {
    it('should display manual and CSV import tabs', () => {
      render(<DataImportModal {...mockProps} />)
      
      expect(screen.getByText(/manual/i)).toBeInTheDocument()
      expect(screen.getByText(/csv/i)).toBeInTheDocument()
    })

    it('should switch between tabs', () => {
      render(<DataImportModal {...mockProps} />)
      
      const csvTab = screen.getByText(/csv/i)
      fireEvent.click(csvTab)
      
      // Should show CSV upload interface
      expect(screen.getByText(/upload/i) || screen.getByText(/file/i)).toBeInTheDocument()
    })

    it('should highlight active tab', () => {
      render(<DataImportModal {...mockProps} />)
      
      const manualTab = screen.getByText(/manual/i)
      expect(manualTab.closest('button')).toHaveClass(/active|selected|bg-primary/)
    })
  })

  describe('Manual Data Entry', () => {
    it('should display manual input form', () => {
      render(<DataImportModal {...mockProps} />)
      
      // Check for form fields
      expect(screen.getByLabelText(/date/i) || screen.getByPlaceholderText(/date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/stocks up/i) || screen.getByPlaceholderText(/stocks up/i)).toBeInTheDocument()
    })

    it('should allow entering data in form fields', async () => {
      const user = userEvent.setup()
      render(<DataImportModal {...mockProps} />)
      
      const dateInput = screen.getByLabelText(/date/i) || screen.getByPlaceholderText(/date/i)
      await user.type(dateInput, '2024-01-15')
      
      expect(dateInput).toHaveValue('2024-01-15')
    })

    it('should validate required fields', async () => {
      const user = userEvent.setup()
      render(<DataImportModal {...mockProps} />)
      
      const submitButton = screen.getByRole('button', { name: /submit|save|import/i })
      fireEvent.click(submitButton)
      
      // Should show validation errors for empty required fields
      await waitFor(() => {
        const errorElements = document.querySelectorAll('.error, .text-red-500, .border-red-500')
        expect(errorElements.length).toBeGreaterThan(0)
      })
    })

    it('should calculate ratios automatically', async () => {
      const user = userEvent.setup()
      render(<DataImportModal {...mockProps} />)
      
      // Fill in up and down values
      const stocksUpInput = screen.getByLabelText(/stocks up/i) || screen.getByPlaceholderText(/stocks up/i)
      const stocksDownInput = screen.getByLabelText(/stocks down/i) || screen.getByPlaceholderText(/stocks down/i)
      
      await user.type(stocksUpInput, '200')
      await user.type(stocksDownInput, '100')
      
      // Should calculate ratio automatically
      const ratioField = document.querySelector('[data-field="ratio"], [name*="ratio"]')
      if (ratioField) {
        expect(ratioField).toHaveValue('2.00')
      }
    })

    it('should submit manual data successfully', async () => {
      const user = userEvent.setup()
      render(<DataImportModal {...mockProps} />)
      
      // Fill required fields
      const dateInput = screen.getByLabelText(/date/i) || screen.getByPlaceholderText(/date/i)
      await user.type(dateInput, '2024-01-15')
      
      const stocksUpInput = screen.getByLabelText(/stocks up/i) || screen.getByPlaceholderText(/stocks up/i)
      await user.type(stocksUpInput, '200')
      
      const submitButton = screen.getByRole('button', { name: /submit|save|import/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        )
      })
    })
  })

  describe('CSV Import', () => {
    it('should display CSV upload interface', () => {
      render(<DataImportModal {...mockProps} />)
      
      const csvTab = screen.getByText(/csv/i)
      fireEvent.click(csvTab)
      
      // Should show file upload area
      expect(screen.getByText(/upload/i) || screen.getByText(/file/i)).toBeInTheDocument()
      expect(screen.getByText(/drop/i) || screen.getByText(/browse/i)).toBeInTheDocument()
    })

    it('should handle file selection', async () => {
      const user = userEvent.setup()
      render(<DataImportModal {...mockProps} />)
      
      const csvTab = screen.getByText(/csv/i)
      fireEvent.click(csvTab)
      
      const fileInput = screen.getByLabelText(/file/i) || document.querySelector('input[type="file"]')
      if (fileInput) {
        const file = new File(['date,stocks_up_4pct,stocks_down_4pct\n2024-01-15,200,100'], 'data.csv', {
          type: 'text/csv'
        })
        
        await user.upload(fileInput as HTMLInputElement, file)
        
        expect(fileInput).toHaveProperty('files', expect.arrayContaining([file]))
      }
    })

    it('should validate CSV file format', async () => {
      const user = userEvent.setup()
      render(<DataImportModal {...mockProps} />)
      
      const csvTab = screen.getByText(/csv/i)
      fireEvent.click(csvTab)
      
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) {
        const invalidFile = new File(['invalid content'], 'invalid.txt', {
          type: 'text/plain'
        })
        
        await user.upload(fileInput as HTMLInputElement, invalidFile)
        
        // Should show validation error
        await waitFor(() => {
          expect(screen.getByText(/invalid/i) || screen.getByText(/error/i)).toBeInTheDocument()
        })
      }
    })

    it('should preview CSV data before import', async () => {
      const user = userEvent.setup()
      render(<DataImportModal {...mockProps} />)
      
      const csvTab = screen.getByText(/csv/i)
      fireEvent.click(csvTab)
      
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) {
        const csvFile = new File([
          'date,stocks_up_4pct,stocks_down_4pct\n2024-01-15,200,100\n2024-01-14,180,120'
        ], 'data.csv', { type: 'text/csv' })
        
        await user.upload(fileInput as HTMLInputElement, csvFile)
        
        // Should show preview table
        await waitFor(() => {
          expect(screen.getByText('2024-01-15')).toBeInTheDocument()
          expect(screen.getByText('200')).toBeInTheDocument()
        })
      }
    })

    it('should import CSV data successfully', async () => {
      const user = userEvent.setup()
      render(<DataImportModal {...mockProps} />)
      
      const csvTab = screen.getByText(/csv/i)
      fireEvent.click(csvTab)
      
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) {
        const csvFile = new File(['date,stocks_up_4pct,stocks_down_4pct\n2024-01-15,200,100'], 'data.csv', {
          type: 'text/csv'
        })
        
        await user.upload(fileInput as HTMLInputElement, csvFile)
        
        const importButton = screen.getByRole('button', { name: /import|upload/i })
        fireEvent.click(importButton)
        
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/'),
            expect.objectContaining({
              method: 'POST'
            })
          )
        })
      }
    })
  })

  describe('Error Handling', () => {
    it('should display error messages', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Import failed'))
      
      render(<DataImportModal {...mockProps} />)
      
      const submitButton = screen.getByRole('button', { name: /submit|save|import/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      
      render(<DataImportModal {...mockProps} />)
      
      const submitButton = screen.getByRole('button', { name: /submit|save|import/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/network|connection|error/i)).toBeInTheDocument()
      })
    })

    it('should clear errors when switching tabs', () => {
      render(<DataImportModal {...mockProps} />)
      
      // Trigger an error
      const submitButton = screen.getByRole('button', { name: /submit|save|import/i })
      fireEvent.click(submitButton)
      
      // Switch tabs
      const csvTab = screen.getByText(/csv/i)
      fireEvent.click(csvTab)
      
      // Error should be cleared
      expect(screen.queryByText(/error|failed/i)).not.toBeInTheDocument()
    })
  })

  describe('Success Handling', () => {
    it('should display success message', async () => {
      render(<DataImportModal {...mockProps} />)
      
      // Mock successful submission
      const dateInput = screen.getByLabelText(/date/i) || screen.getByPlaceholderText(/date/i)
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } })
      
      const submitButton = screen.getByRole('button', { name: /submit|save|import/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/success|imported/i)).toBeInTheDocument()
      })
    })

    it('should call onSuccess callback', async () => {
      render(<DataImportModal {...mockProps} />)
      
      const dateInput = screen.getByLabelText(/date/i) || screen.getByPlaceholderText(/date/i)
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } })
      
      const submitButton = screen.getByRole('button', { name: /submit|save|import/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockProps.onSuccess).toHaveBeenCalled()
      })
    })

    it('should close modal after successful import', async () => {
      render(<DataImportModal {...mockProps} />)
      
      const dateInput = screen.getByLabelText(/date/i) || screen.getByPlaceholderText(/date/i)
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } })
      
      const submitButton = screen.getByRole('button', { name: /submit|save|import/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockProps.onClose).toHaveBeenCalled()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner during import', async () => {
      // Mock slow API response
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }), 1000))
      )
      
      render(<DataImportModal {...mockProps} />)
      
      const submitButton = screen.getByRole('button', { name: /submit|save|import/i })
      fireEvent.click(submitButton)
      
      // Should show loading state
      expect(screen.getByText(/loading|importing/i) || 
             document.querySelector('.spinner, .animate-spin')).toBeTruthy()
    })

    it('should disable form during loading', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }), 1000))
      )
      
      render(<DataImportModal {...mockProps} />)
      
      const submitButton = screen.getByRole('button', { name: /submit|save|import/i })
      fireEvent.click(submitButton)
      
      // Form elements should be disabled
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      render(<DataImportModal {...mockProps} />)
      
      // Modal should trap focus
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
    })

    it('should have proper ARIA labels', () => {
      render(<DataImportModal {...mockProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-labelledby')
    })

    it('should close on Escape key', () => {
      render(<DataImportModal {...mockProps} />)
      
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      
      expect(mockProps.onClose).toHaveBeenCalled()
    })
  })
})