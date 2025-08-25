import React, { useState, useCallback, useRef } from 'react'
import { Upload, X, FileText, CheckCircle, AlertCircle, Info } from 'lucide-react'
import type { CSVImportResult } from '../../../types/trading'

interface CSVImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (result: CSVImportResult) => void
}

interface CSVPreviewData {
  headers: string[]
  rows: string[][]
  totalRows: number
}

export function CSVImportModal({ isOpen, onClose, onImportComplete }: CSVImportModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [csvContent, setCsvContent] = useState<string>('')
  const [previewData, setPreviewData] = useState<CSVPreviewData | null>(null)
  const [importFormat, setImportFormat] = useState<'standard' | 'stockbee' | 'custom'>('standard')
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'text/csv') {
      processFile(droppedFile)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setImportResult(null)
    
    const text = await selectedFile.text()
    setCsvContent(text)
    
    // Parse CSV for preview
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())
    const dataLines = lines.slice(1, 6) // Preview first 5 rows
    const rows = dataLines.map(line => line.split(',').map(cell => cell.trim()))
    
    setPreviewData({
      headers,
      rows,
      totalRows: lines.length - 1
    })
    
    // Auto-detect format
    const headerText = headers.join(' ').toLowerCase()
    if (headerText.includes('stocks up 4%') || headerText.includes('t2108')) {
      setImportFormat('stockbee')
    } else {
      setImportFormat('standard')
    }
  }

  const handleImport = async () => {
    if (!csvContent) return
    
    setIsImporting(true)
    
    try {
      const result = await window.tradingAPI.importCSVBreadth(csvContent)
      setImportResult(result)
      
      if (result.success) {
        setTimeout(() => {
          onImportComplete(result)
          handleClose()
        }, 2000)
      }
    } catch (error) {
      console.error('Import failed:', error)
      setImportResult({
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        errors: [error instanceof Error ? error.message : 'Import failed']
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setCsvContent('')
    setPreviewData(null)
    setImportResult(null)
    setImportFormat('standard')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Import CSV Data</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {!file ? (
            // File Upload Area
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drag and drop your CSV file here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse your files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Select CSV File
              </button>
              
              <div className="mt-6 text-left bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-1">Supported formats:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Standard format (Date, AdvancingIssues, DecliningIssues, etc.)</li>
                      <li>Stockbee Market Monitor format</li>
                      <li>Custom format with column mapping</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // File Preview & Import Options
            <div className="space-y-6">
              {/* File Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {previewData?.totalRows} rows • {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null)
                      setCsvContent('')
                      setPreviewData(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSV Format
                </label>
                <select
                  value={importFormat}
                  onChange={(e) => setImportFormat(e.target.value as typeof importFormat)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isImporting}
                >
                  <option value="standard">Standard Format</option>
                  <option value="stockbee">Stockbee Market Monitor</option>
                  <option value="custom">Custom Format</option>
                </select>
              </div>

              {/* Data Preview */}
              {previewData && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Data Preview</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {previewData.headers.map((header, idx) => (
                              <th
                                key={idx}
                                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewData.rows.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              {row.map((cell, cellIdx) => (
                                <td
                                  key={cellIdx}
                                  className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap"
                                >
                                  {cell || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewData.totalRows > 5 && (
                      <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                        ... and {previewData.totalRows - 5} more rows
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Import Result */}
              {importResult && (
                <div className={`rounded-lg p-4 ${
                  importResult.success ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-start space-x-3">
                    {importResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        importResult.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {importResult.success ? 'Import Successful!' : 'Import Failed'}
                      </p>
                      <div className="mt-2 text-sm text-gray-600">
                        <p>Imported: {importResult.importedCount} records</p>
                        {importResult.skippedCount > 0 && (
                          <p>Skipped: {importResult.skippedCount} duplicates</p>
                        )}
                        {importResult.errorCount > 0 && (
                          <p>Errors: {importResult.errorCount}</p>
                        )}
                      </div>
                      {importResult.errors && importResult.errors.length > 0 && (
                        <div className="mt-2 text-sm text-red-600">
                          {importResult.errors.slice(0, 3).map((error, idx) => (
                            <p key={idx}>• {error}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {file && !importResult?.success && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || !csvContent}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Import Data</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}