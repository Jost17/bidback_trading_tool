'use client';

import { useState, useCallback, useRef } from 'react';
import { MarketBreadthData, ValidationError, CsvParseResult } from '@/lib/types';

interface DataUploadProps {
  onDataProcessed?: (data: CsvParseResult) => void;
}

export default function DataUpload({ onDataProcessed }: DataUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<CsvParseResult | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'preview' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateRow = (row: any, index: number): { data: MarketBreadthData | null, errors: ValidationError[] } => {
    const errors: ValidationError[] = [];
    const data: MarketBreadthData = {
      date: '',
    };

    // Date validation (required)
    const dateValue = row.date || row.Date || row.DATE;
    if (!dateValue) {
      errors.push({ row: index, field: 'date', value: dateValue, message: 'Date is required' });
    } else {
      const parsedDate = new Date(dateValue);
      if (isNaN(parsedDate.getTime())) {
        errors.push({ row: index, field: 'date', value: dateValue, message: 'Invalid date format' });
      } else {
        data.date = parsedDate.toISOString().split('T')[0];
      }
    }

    // Helper function to parse and validate numeric fields
    const parseNumericField = (fieldName: string, csvFieldNames: string[]) => {
      const value = csvFieldNames.reduce((found, name) => found || row[name], null);
      if (value !== null && value !== undefined && value !== '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          errors.push({ row: index, field: fieldName, value, message: `Invalid numeric value` });
        } else {
          (data as any)[fieldName] = numValue;
        }
      }
    };

    // Parse all numeric fields with their possible CSV column names
    parseNumericField('stocksUp4PctDaily', ['stocks_up_4pct_daily', 'Stocks Up 4% Daily', 'Up 4%']);
    parseNumericField('stocksDown4PctDaily', ['stocks_down_4pct_daily', 'Stocks Down 4% Daily', 'Down 4%']);
    parseNumericField('stocksUp25PctQuarterly', ['stocks_up_25pct_quarterly', 'Stocks Up 25% Quarterly', 'Up 25% Q']);
    parseNumericField('stocksDown25PctQuarterly', ['stocks_down_25pct_quarterly', 'Stocks Down 25% Quarterly', 'Down 25% Q']);
    parseNumericField('stocksUp20PctCustom', ['stocks_up_20pct_custom', 'Stocks Up 20% Custom', 'Up 20%']);
    parseNumericField('stocksDown20PctCustom', ['stocks_down_20pct_custom', 'Stocks Down 20% Custom', 'Down 20%']);
    parseNumericField('stocksUp25PctMonthly', ['stocks_up_25pct_monthly', 'Stocks Up 25% Monthly', 'Up 25% M']);
    parseNumericField('stocksDown25PctMonthly', ['stocks_down_25pct_monthly', 'Stocks Down 25% Monthly', 'Down 25% M']);
    parseNumericField('stocksUp50PctMonthly', ['stocks_up_50pct_monthly', 'Stocks Up 50% Monthly', 'Up 50% M']);
    parseNumericField('stocksDown50PctMonthly', ['stocks_down_50pct_monthly', 'Stocks Down 50% Monthly', 'Down 50% M']);
    parseNumericField('stocksUp13Pct34Days', ['stocks_up_13pct_34days', 'Stocks Up 13% 34 Days', 'Up 13% 34D']);
    parseNumericField('stocksDown13Pct34Days', ['stocks_down_13pct_34days', 'Stocks Down 13% 34 Days', 'Down 13% 34D']);
    parseNumericField('stocksUp20DollarCustom', ['stocks_up_20dollar_custom', 'Stocks Up $20 Custom', 'Up $20']);
    parseNumericField('stocksDown20DollarCustom', ['stocks_down_20dollar_custom', 'Stocks Down $20 Custom', 'Down $20']);
    parseNumericField('t2108', ['t2108', 'T2108', 'T-2108', '% Above 40-day MA']);
    parseNumericField('wordenCommonStocks', ['worden_common_stocks', 'Worden Common Stocks', 'WCS']);
    parseNumericField('spReference', ['sp_reference', 'S&P Reference', 'SP500']);

    return {
      data: errors.length === 0 ? data : null,
      errors
    };
  };

  const parseCsvData = useCallback((csvText: string): CsvParseResult => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      return {
        data: [],
        errors: [{ row: 0, field: 'file', value: '', message: 'CSV file must contain at least a header and one data row' }],
        summary: { totalRows: 0, validRows: 0, invalidRows: 0 }
      };
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const allData: MarketBreadthData[] = [];
    const allErrors: ValidationError[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === 1 && values[0] === '') continue; // Skip empty lines

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });

      const { data, errors } = validateRow(row, i);
      
      if (data) {
        allData.push(data);
      }
      
      allErrors.push(...errors);
    }

    // Calculate date range
    let dateRange: { start: string; end: string } | undefined;
    if (allData.length > 0) {
      const dates = allData.map(d => d.date).sort();
      dateRange = {
        start: dates[0],
        end: dates[dates.length - 1]
      };
    }

    return {
      data: allData,
      errors: allErrors,
      summary: {
        totalRows: lines.length - 1,
        validRows: allData.length,
        invalidRows: allErrors.length > 0 ? lines.length - 1 - allData.length : 0,
        dateRange
      }
    };
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrorMessage('Please select a CSV file');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('parsing');
    setErrorMessage('');

    try {
      const text = await file.text();
      const result = parseCsvData(text);
      
      setParsedData(result);
      setUploadStatus('preview');
      
      if (onDataProcessed) {
        onDataProcessed(result);
      }
    } catch (error) {
      setErrorMessage('Failed to parse CSV file');
      setUploadStatus('error');
    }
  }, [parseCsvData, onDataProcessed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleUploadToDatabase = async () => {
    if (!parsedData || parsedData.data.length === 0) return;

    setIsUploading(true);
    setUploadStatus('uploading');

    try {
      const response = await fetch('/api/market-breadth/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: parsedData.data,
          dataSource: 'csv_upload'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus('success');
      } else {
        setErrorMessage(result.error || 'Failed to upload data');
        setUploadStatus('error');
      }
    } catch (error) {
      setErrorMessage('Network error during upload');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setParsedData(null);
    setUploadStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {uploadStatus === 'idle' && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="space-y-4">
            <div className="text-4xl">📁</div>
            <div>
              <p className="text-lg font-medium">Drop your CSV file here</p>
              <p className="text-sm text-gray-500">or click to browse</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Parsing Status */}
      {uploadStatus === 'parsing' && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Parsing CSV file...</p>
        </div>
      )}

      {/* Preview */}
      {uploadStatus === 'preview' && parsedData && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Data Preview</h3>
            <button
              onClick={resetUpload}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Upload Different File
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-sm text-blue-600">Total Rows</div>
              <div className="text-xl font-bold text-blue-800">{parsedData.summary.totalRows}</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-sm text-green-600">Valid Rows</div>
              <div className="text-xl font-bold text-green-800">{parsedData.summary.validRows}</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-sm text-red-600">Invalid Rows</div>
              <div className="text-xl font-bold text-red-800">{parsedData.summary.invalidRows}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Date Range</div>
              <div className="text-sm font-medium text-gray-800">
                {parsedData.summary.dateRange ? 
                  `${parsedData.summary.dateRange.start} to ${parsedData.summary.dateRange.end}` : 
                  'N/A'
                }
              </div>
            </div>
          </div>

          {/* Errors */}
          {parsedData.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h4 className="font-medium text-red-800">Validation Errors</h4>
              <div className="mt-2 max-h-40 overflow-y-auto">
                {parsedData.errors.slice(0, 10).map((error, index) => (
                  <div key={index} className="text-sm text-red-700">
                    Row {error.row}: {error.field} - {error.message}
                  </div>
                ))}
                {parsedData.errors.length > 10 && (
                  <div className="text-sm text-red-600 mt-2">
                    ... and {parsedData.errors.length - 10} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Preview Table */}
          {parsedData.data.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Up 4%</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Down 4%</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">T2108</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">More...</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.data.slice(0, 10).map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm">{row.date}</td>
                        <td className="px-4 py-2 text-sm">{row.stocksUp4PctDaily || '-'}</td>
                        <td className="px-4 py-2 text-sm">{row.stocksDown4PctDaily || '-'}</td>
                        <td className="px-4 py-2 text-sm">{row.t2108 || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {Object.keys(row).filter(k => k !== 'date' && row[k as keyof MarketBreadthData] != null).length - 3} more fields
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.data.length > 10 && (
                  <div className="p-3 text-sm text-gray-500 bg-gray-50 text-center">
                    ... and {parsedData.data.length - 10} more rows
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Button */}
          {parsedData.data.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleUploadToDatabase}
                disabled={isUploading}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : `Upload ${parsedData.data.length} Records to Database`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Status */}
      {uploadStatus === 'uploading' && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Uploading to database...</p>
        </div>
      )}

      {/* Success */}
      {uploadStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
          <div className="text-green-800 font-medium">✅ Upload Successful!</div>
          <p className="text-green-700 mt-2">Market breadth data has been saved to the database.</p>
          <button
            onClick={resetUpload}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Upload Another File
          </button>
        </div>
      )}

      {/* Error */}
      {uploadStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <div className="text-red-800 font-medium">❌ Upload Failed</div>
          <p className="text-red-700 mt-2">{errorMessage}</p>
          <button
            onClick={resetUpload}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}