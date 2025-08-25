import React, { useState, useCallback, useRef, useEffect } from 'react'
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Settings,
  Eye,
  Trash2,
  RefreshCw,
  Calendar,
  Database
} from 'lucide-react'
import type { CSVImportResult, CSVExportResult, BreadthData } from '../../../types/trading'

interface CSVManagerProps {
  onImportSuccess?: () => void
}

interface ImportPreview {
  fileName: string
  fileSize: number
  rowCount: number
  columns: string[]
  sampleData: any[]
  detectedFormat: string
}

interface ColumnMapping {
  csvColumn: string
  dbField: string
  required: boolean
  mapped: boolean
}

const REQUIRED_FIELDS = [
  { field: 'date', label: 'Date', type: 'date' },
  { field: 't2108', label: 'T2108', type: 'number' },
]

const OPTIONAL_FIELDS = [
  { field: 'stocks_up_4pct', label: 'Stocks Up 4%', type: 'number' },
  { field: 'stocks_down_4pct', label: 'Stocks Down 4%', type: 'number' },
  { field: 'stocks_up_25pct_quarter', label: 'Stocks Up 25% (Quarter)', type: 'number' },
  { field: 'stocks_down_25pct_quarter', label: 'Stocks Down 25% (Quarter)', type: 'number' },
  { field: 'stocks_up_25pct_month', label: 'Stocks Up 25% (Month)', type: 'number' },
  { field: 'stocks_down_25pct_month', label: 'Stocks Down 25% (Month)', type: 'number' },
  { field: 'stocks_up_50pct_month', label: 'Stocks Up 50% (Month)', type: 'number' },
  { field: 'stocks_down_50pct_month', label: 'Stocks Down 50% (Month)', type: 'number' },
  { field: 'stocks_up_13pct_34days', label: 'Stocks Up 13% (34 Days)', type: 'number' },
  { field: 'stocks_down_13pct_34days', label: 'Stocks Down 13% (34 Days)', type: 'number' },
  { field: 'worden_universe', label: 'Worden Universe', type: 'number' },
  { field: 'sp500', label: 'S&P 500', type: 'text' },
  { field: 'basic_materials_sector', label: 'Basic Materials Sector', type: 'number' },
  { field: 'consumer_cyclical_sector', label: 'Consumer Cyclical Sector', type: 'number' },
  { field: 'financial_services_sector', label: 'Financial Services Sector', type: 'number' },
  { field: 'real_estate_sector', label: 'Real Estate Sector', type: 'number' },
  { field: 'consumer_defensive_sector', label: 'Consumer Defensive Sector', type: 'number' },
  { field: 'healthcare_sector', label: 'Healthcare Sector', type: 'number' },
  { field: 'utilities_sector', label: 'Utilities Sector', type: 'number' },
  { field: 'communication_services_sector', label: 'Communication Services Sector', type: 'number' },
  { field: 'energy_sector', label: 'Energy Sector', type: 'number' },
  { field: 'industrials_sector', label: 'Industrials Sector', type: 'number' },
  { field: 'technology_sector', label: 'Technology Sector', type: 'number' },
  { field: 'notes', label: 'Notes', type: 'text' }
]

export function CSVManager({ onImportSuccess }: CSVManagerProps) {
  // State management
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'history'>('import')
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null)
  const [exportResult, setExportResult] = useState<CSVExportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [importHistory, setImportHistory] = useState<any[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load import history
  const loadImportHistory = useCallback(async () => {
    try {
      // Get recent imports from database (this would need to be implemented in the backend)
      // For now, we'll just show recent data entries
      const data = await window.tradingAPI.getBreadthData()
      const imports = data.filter(item => item.dataSource === 'imported').slice(0, 10)
      setImportHistory(imports)
    } catch (err) {
      console.error('Failed to load import history:', err)
    }
  }, [])

  useEffect(() => {
    loadImportHistory()
  }, [loadImportHistory])

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setImportResult(null)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row')
      }

      // Parse header
      const header = lines[0].split(',').map(col => col.trim().replace(/\"/g, ''))
      
      // Parse sample data (first 5 rows)
      const sampleRows = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(val => val.trim().replace(/\"/g, ''))
        const row: any = {}
        header.forEach((col, index) => {
          row[col] = values[index] || ''
        })
        return row
      })

      // Create preview
      const preview: ImportPreview = {
        fileName: file.name,
        fileSize: file.size,
        rowCount: lines.length - 1,
        columns: header,
        sampleData: sampleRows,
        detectedFormat: detectCSVFormat(header)
      }

      setImportPreview(preview)

      // Auto-map columns
      const mappings = createColumnMappings(header)
      setColumnMappings(mappings)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file')
    }
  }, [])

  // Detect CSV format based on column names
  const detectCSVFormat = (columns: string[]): string => {
    const lowerColumns = columns.map(col => col.toLowerCase())
    
    if (lowerColumns.includes('t2108') && lowerColumns.includes('date')) {
      return 'Enhanced Market Breadth Format'
    }
    
    if (lowerColumns.includes('advancing') && lowerColumns.includes('declining')) {
      return 'Traditional Breadth Format'
    }

    return 'Custom Format'
  }

  // Create automatic column mappings
  const createColumnMappings = (csvColumns: string[]): ColumnMapping[] => {
    const mappings: ColumnMapping[] = []
    const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]

    csvColumns.forEach(csvCol => {
      const lowerCol = csvCol.toLowerCase().replace(/[^a-z0-9]/g, '_')
      
      // Try to find a matching field
      const matchedField = allFields.find(field => {
        const fieldLower = field.field.toLowerCase()
        return fieldLower.includes(lowerCol) || lowerCol.includes(fieldLower) ||
               field.label.toLowerCase().replace(/[^a-z0-9]/g, '_').includes(lowerCol)
      })

      mappings.push({
        csvColumn: csvCol,
        dbField: matchedField?.field || '',
        required: REQUIRED_FIELDS.some(rf => rf.field === matchedField?.field),
        mapped: !!matchedField
      })
    })

    return mappings
  }

  // Update column mapping
  const updateMapping = useCallback((csvColumn: string, dbField: string) => {
    setColumnMappings(prev => prev.map(mapping =>
      mapping.csvColumn === csvColumn 
        ? { ...mapping, dbField, mapped: dbField !== '' }
        : mapping
    ))
  }, [])

  // Validate mappings
  const validateMappings = (): boolean => {
    const requiredFieldsMapped = REQUIRED_FIELDS.every(rf =>
      columnMappings.some(cm => cm.dbField === rf.field && cm.mapped)
    )

    if (!requiredFieldsMapped) {
      setError('Please map all required fields (Date, T2108)')
      return false
    }

    return true
  }

  // Handle CSV import
  const handleImport = useCallback(async () => {
    if (!importPreview || !validateMappings()) return

    setIsImporting(true)
    setError(null)
    setImportResult(null)

    try {
      // Read the file again for processing
      if (!fileInputRef.current?.files?.[0]) {
        throw new Error('No file selected')
      }

      const file = fileInputRef.current.files[0]
      const csvText = await file.text()

      // Use the importCSVBreadth API
      const result = await window.tradingAPI.importCSVBreadth(csvText)

      setImportResult(result)

      if (result.success) {
        onImportSuccess?.()
        loadImportHistory()
        
        // Clear the form after successful import
        setTimeout(() => {
          setImportPreview(null)
          setColumnMappings([])
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }, 3000)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }, [importPreview, columnMappings, onImportSuccess, loadImportHistory])

  // Handle CSV export
  const handleExport = useCallback(async () => {
    setIsExporting(true)
    setError(null)
    setExportResult(null)

    try {
      const result = await window.tradingAPI.exportCSVBreadth(
        exportDateRange.startDate,
        exportDateRange.endDate
      )

      setExportResult(result)

      if (result.success) {
        // Create download
        const blob = new Blob([result.data], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }, [exportDateRange])

  // Clear import preview
  const clearPreview = useCallback(() => {
    setImportPreview(null)
    setColumnMappings([])
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2 mb-4">
          <Database className="w-6 h-6 text-blue-600" />
          <span>CSV Import/Export Manager</span>
        </h2>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'import', label: 'Import CSV', icon: Upload },
            { id: 'export', label: 'Export CSV', icon: Download },
            { id: 'history', label: 'Import History', icon: Calendar }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-1 text-red-700">{error}</p>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* File Upload */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload CSV File</h3>
            
            {!importPreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-gray-600">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Click to upload
                    </button>
                    {' '}or drag and drop your CSV file here
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports CSV files with market breadth data
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              /* File Preview */
              <div className="space-y-6">
                {/* File Info */}
                <div className="flex items-center justify-between bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">{importPreview.fileName}</div>
                      <div className="text-sm text-gray-600">
                        {(importPreview.fileSize / 1024).toFixed(1)} KB • {importPreview.rowCount} rows • {importPreview.detectedFormat}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={clearPreview}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Column Mapping */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Column Mapping</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Map CSV columns to database fields. Required fields are marked with *.
                    </p>
                    
                    <div className="space-y-3">
                      {columnMappings.map((mapping, index) => (
                        <div key={index} className="flex items-center space-x-4 bg-white p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{mapping.csvColumn}</div>
                            <div className="text-sm text-gray-500">CSV Column</div>
                          </div>
                          
                          <div className="text-gray-400">→</div>
                          
                          <div className="flex-1">
                            <select
                              value={mapping.dbField}
                              onChange={(e) => updateMapping(mapping.csvColumn, e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                mapping.required && !mapping.mapped ? 'border-red-300' : 'border-gray-300'
                              }`}
                            >
                              <option value="">-- Select Field --</option>
                              <optgroup label="Required Fields">
                                {REQUIRED_FIELDS.map(field => (
                                  <option key={field.field} value={field.field}>
                                    {field.label} *
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Optional Fields">
                                {OPTIONAL_FIELDS.map(field => (
                                  <option key={field.field} value={field.field}>
                                    {field.label}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                          
                          <div className="w-8 flex justify-center">
                            {mapping.required && !mapping.mapped ? (
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            ) : mapping.mapped ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sample Data Preview */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Data Preview</h4>
                  <div className="overflow-x-auto bg-white border rounded-lg">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {importPreview.columns.map((col, index) => (
                            <th key={index} className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {importPreview.sampleData.map((row, index) => (
                          <tr key={index}>
                            {importPreview.columns.map((col, colIndex) => (
                              <td key={colIndex} className="px-4 py-3 text-sm text-gray-900">
                                {row[col] || '--'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Import Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleImport}
                    disabled={isImporting || !validateMappings()}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isImporting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>Import Data</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Import Results */}
          {importResult && (
            <div className={`rounded-lg border p-6 ${
              importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className={`flex items-center space-x-2 mb-4 ${
                importResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {importResult.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {importResult.success ? 'Import Successful' : 'Import Failed'}
                </span>
              </div>
              
              <div className={`space-y-2 text-sm ${
                importResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                <p><strong>Message:</strong> {importResult.message}</p>
                <p><strong>Imported:</strong> {importResult.imported} records</p>
                <p><strong>Skipped:</strong> {importResult.skipped} records</p>
                <p><strong>Errors:</strong> {importResult.errors} records</p>
                
                {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium">Error Details:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {importResult.errorDetails.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Market Breadth Data</h3>
          
          <div className="space-y-6">
            {/* Date Range Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={exportDateRange.startDate}
                  onChange={(e) => setExportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={exportDateRange.endDate}
                  onChange={(e) => setExportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-center">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isExporting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Export to CSV</span>
                  </>
                )}
              </button>
            </div>

            {/* Export Results */}
            {exportResult && (
              <div className={`rounded-lg border p-4 ${
                exportResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className={`flex items-center space-x-2 ${
                  exportResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {exportResult.success ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="font-medium">
                    {exportResult.success 
                      ? `Successfully exported ${exportResult.recordCount} records to ${exportResult.filename}`
                      : 'Export failed'
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Import History</h3>
            <button
              onClick={loadImportHistory}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>

          {importHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="font-medium">No import history available</p>
              <p className="text-sm">Import some CSV data to see the history</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Breadth Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Market Phase</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Source File</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Import Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {importHistory.map((entry, index) => (
                    <tr key={entry.id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {entry.breadthScore?.toFixed(1) || '--'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.marketPhase?.toUpperCase() === 'BULL' ? 'bg-green-100 text-green-800' :
                          entry.marketPhase?.toUpperCase() === 'BEAR' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.marketPhase || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.source_file || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}