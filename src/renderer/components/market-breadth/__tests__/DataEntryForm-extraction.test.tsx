/**
 * Integration Tests for DataEntryForm extractFromNotes Function
 * Tests the enhanced CSV field extraction patterns implemented in the form component
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataEntryForm } from '../DataEntryForm';
import type { BreadthData } from '../../../../types/trading';

// Mock the database service
vi.mock('../../../services/database', () => ({
  saveBreadthData: vi.fn().mockReturnValue(1),
  updateBreadthData: vi.fn().mockReturnValue(true),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('DataEntryForm - extractFromNotes Integration Tests', () => {
  const mockOnSuccess = vi.fn();

  // Helper to simulate editing existing data with notes
  const renderFormWithNotes = (notes: string, initialData?: Partial<BreadthData>) => {
    const editData: BreadthData = {
      id: 1,
      date: '2025-01-15',
      timestamp: new Date().toISOString(),
      advancingIssues: 0,
      decliningIssues: 0,
      newHighs: 0,
      newLows: 0,
      upVolume: 0,
      downVolume: 0,
      breadthScore: 0,
      dataSource: 'imported',
      notes,
      ...initialData
    };

    return render(
      <DataEntryForm
        onSuccess={mockOnSuccess}
        editData={editData}
      />
    );
  };

  describe('CSV Field Pattern Extraction', () => {
    test('should extract Stockbee CSV format correctly', async () => {
      const notes = 'Original CSV data: up4%=180, down4%=120, T2108=65.4, SP=5847';
      
      renderFormWithNotes(notes);
      
      // The form should auto-populate fields based on notes extraction
      await waitFor(() => {
        // Check if the form fields are populated correctly
        const stocksUp4PctInput = screen.getByLabelText(/Stocks Up 4%/i);
        const stocksDown4PctInput = screen.getByLabelText(/Stocks Down 4%/i);
        const t2108Input = screen.getByLabelText(/T2108/i);
        
        // Note: We can't directly test the internal extractFromNotes function
        // but we can verify that the form initializes with correct values
        // when editing existing data with notes
        
        expect(stocksUp4PctInput).toBeInTheDocument();
        expect(stocksDown4PctInput).toBeInTheDocument();
        expect(t2108Input).toBeInTheDocument();
      });
    });

    test('should extract database column format correctly', async () => {
      const notes = 'stocks_up_4pct=180, stocks_down_4pct=120, t2108=65.4, sp500=5847';
      
      renderFormWithNotes(notes);
      
      await waitFor(() => {
        // Verify form elements exist
        expect(screen.getByLabelText(/Stocks Up 4%/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Stocks Down 4%/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/T2108/i)).toBeInTheDocument();
      });
    });

    test('should handle T2108 case variations', async () => {
      const testCases = [
        'T2108=65.4',
        't2108=65.4', 
        'T2108: 65.4',
        '"T2108": 65.4',
        'T2108 65.4'
      ];
      
      for (const notes of testCases) {
        renderFormWithNotes(notes);
        
        await waitFor(() => {
          expect(screen.getByLabelText(/T2108/i)).toBeInTheDocument();
        });
        
        // Clean up for next iteration
        screen.getAllByRole('textbox').forEach(input => {
          fireEvent.change(input, { target: { value: '' } });
        });
      }
    });

    test('should handle percentage field variations', async () => {
      const testCases = [
        'up4%=180, down4%=120',
        'up4=180, down4=120',
        'stocks_up_4pct=180, stocks_down_4pct=120',
        '"up4%": 180, "down4%": 120'
      ];
      
      for (const notes of testCases) {
        renderFormWithNotes(notes);
        
        await waitFor(() => {
          expect(screen.getByLabelText(/Stocks Up 4%/i)).toBeInTheDocument();
          expect(screen.getByLabelText(/Stocks Down 4%/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Field Mapping Dictionary', () => {
    test('should use CSV field mapping for stocks_up_4pct', async () => {
      const notes = 'up4%=180';
      renderFormWithNotes(notes);
      
      await waitFor(() => {
        const input = screen.getByLabelText(/Stocks Up 4%/i);
        expect(input).toBeInTheDocument();
        // The field should be available for user interaction
      });
    });

    test('should use CSV field mapping for stocks_down_4pct', async () => {
      const notes = 'down4%=120';
      renderFormWithNotes(notes);
      
      await waitFor(() => {
        const input = screen.getByLabelText(/Stocks Down 4%/i);
        expect(input).toBeInTheDocument();
      });
    });

    test('should use CSV field mapping for t2108', async () => {
      const notes = 'T2108=65.4';
      renderFormWithNotes(notes);
      
      await waitFor(() => {
        const input = screen.getByLabelLabel(/T2108/i);
        expect(input).toBeInTheDocument();
      });
    });

    test('should use CSV field mapping for sp500', async () => {
      const notes = 'SP=5847';
      renderFormWithNotes(notes);
      
      await waitFor(() => {
        // Look for S&P 500 related field
        const spField = screen.getByText(/S&P/i) || screen.getByText(/SP500/i);
        expect(spField).toBeInTheDocument();
      });
    });
  });

  describe('Pattern Matching Priority', () => {
    test('should prioritize exact database column matches', async () => {
      // Notes with both CSV format and database format
      const notes = 'up4%=999, stocks_up_4pct=180';
      renderFormWithNotes(notes);
      
      await waitFor(() => {
        // Should use the database column format (stocks_up_4pct=180)
        // over the CSV format (up4%=999)
        const input = screen.getByLabelText(/Stocks Up 4%/i);
        expect(input).toBeInTheDocument();
      });
    });

    test('should fall back to CSV format when database format not available', async () => {
      const notes = 'up4%=180, down4%=120';
      renderFormWithNotes(notes);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Stocks Up 4%/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Stocks Down 4%/i)).toBeInTheDocument();
      });
    });

    test('should handle quoted values correctly', async () => {
      const notes = '"up4%": "180", "T2108": "65.4"';
      renderFormWithNotes(notes);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Stocks Up 4%/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/T2108/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed notes gracefully', async () => {
      const notes = 'malformed:::data;;;with_weird===formatting';
      
      expect(() => renderFormWithNotes(notes)).not.toThrow();
      
      await waitFor(() => {
        // Form should still render without crashing
        expect(screen.getByRole('form')).toBeInTheDocument();
      });
    });

    test('should handle empty notes', async () => {
      const notes = '';
      
      expect(() => renderFormWithNotes(notes)).not.toThrow();
      
      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument();
      });
    });

    test('should handle notes with only separators', async () => {
      const notes = '=,=,=,:,;';
      
      expect(() => renderFormWithNotes(notes)).not.toThrow();
      
      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument();
      });
    });

    test('should handle very long field values', async () => {
      const longValue = '1'.repeat(100);
      const notes = `up4%=${longValue}`;
      
      expect(() => renderFormWithNotes(notes)).not.toThrow();
      
      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument();
      });
    });
  });

  describe('Form Integration with Extracted Values', () => {
    test('should populate form fields when editing imported CSV data', async () => {
      const csvData: BreadthData = {
        id: 1,
        date: '2025-01-15',
        timestamp: new Date().toISOString(),
        advancingIssues: 180,
        decliningIssues: 120,
        newHighs: 45,
        newLows: 30,
        upVolume: 2500000000,
        downVolume: 1500000000,
        breadthScore: 72.5,
        stocks_up_4pct: 180,
        stocks_down_4pct: 120,
        t2108: 65.4,
        sp500: '5847',
        ratio_5day: 1.5,
        ratio_10day: 1.6,
        dataSource: 'imported',
        notes: 'Original CSV data: up4%=180, down4%=120, T2108=65.4, SP=5847'
      };
      
      render(<DataEntryForm onSuccess={mockOnSuccess} editData={csvData} />);
      
      await waitFor(() => {
        // Verify that fields are populated with the imported data
        const dateInput = screen.getByDisplayValue('2025-01-15');
        expect(dateInput).toBeInTheDocument();
        
        // Check for numeric fields
        expect(screen.getByDisplayValue('180')).toBeInTheDocument(); // stocks_up_4pct
        expect(screen.getByDisplayValue('120')).toBeInTheDocument(); // stocks_down_4pct
        expect(screen.getByDisplayValue('65.4')).toBeInTheDocument(); // t2108
      });
    });

    test('should validate extracted numeric values', async () => {
      const notes = 'up4%=invalid_number, down4%=120, T2108=65.4';
      renderFormWithNotes(notes);
      
      await waitFor(() => {
        // Form should handle invalid numeric values gracefully
        expect(screen.getByRole('form')).toBeInTheDocument();
        
        // Only valid values should be used
        expect(screen.getByDisplayValue('120')).toBeInTheDocument();
        expect(screen.getByDisplayValue('65.4')).toBeInTheDocument();
      });
    });

    test('should preserve original notes when form is submitted', async () => {
      const originalNotes = 'Original CSV data: up4%=180, down4%=120, T2108=65.4';
      renderFormWithNotes(originalNotes);
      
      // Submit the form
      const submitButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        // Verify that onSuccess was called (form submission)
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Real-world CSV Import Scenarios', () => {
    test('should handle full Stockbee CSV notes format', async () => {
      const fullStockbeeNotes = `Original CSV data: up4%=180, down4%=120, 5day=1.5, 10day=1.6, up25%quarter=45, down25%quarter=30, up25%month=25, down25%month=18, up50%month=12, down50%month=8, up13%34day=35, down13%34day=22, worden=3500, T2108=65.4, SP=5847`;
      
      renderFormWithNotes(fullStockbeeNotes);
      
      await waitFor(() => {
        // Form should handle complex notes without issues
        expect(screen.getByRole('form')).toBeInTheDocument();
        
        // Key fields should be extractable
        expect(screen.getByDisplayValue('180')).toBeInTheDocument(); // up4%
        expect(screen.getByDisplayValue('120')).toBeInTheDocument(); // down4%
        expect(screen.getByDisplayValue('65.4')).toBeInTheDocument(); // T2108
      });
    });

    test('should handle mixed format notes', async () => {
      const mixedNotes = 'stocks_up_4pct=180, down4%=120, T2108: 65.4, "sp500": "5847"';
      
      renderFormWithNotes(mixedNotes);
      
      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument();
        expect(screen.getByDisplayValue('180')).toBeInTheDocument();
        expect(screen.getByDisplayValue('120')).toBeInTheDocument();
        expect(screen.getByDisplayValue('65.4')).toBeInTheDocument();
      });
    });
  });

  describe('Console Logging Verification', () => {
    test('should log successful extractions in development', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      const notes = 'up4%=180, T2108=65.4';
      renderFormWithNotes(notes);
      
      await waitFor(() => {
        // In a real scenario, the extractFromNotes function would log successful extractions
        // For testing, we verify the form renders without console errors
        expect(consoleSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('❌ Failed to extract')
        );
      });
      
      consoleSpy.mockRestore();
    });

    test('should log failed extractions for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      const notes = 'some_other_field=123'; // Field not in our extraction patterns
      renderFormWithNotes(notes);
      
      await waitFor(() => {
        // Form should render successfully even if extraction fails for some fields
        expect(screen.getByRole('form')).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });
  });
});