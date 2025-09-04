import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
  RefreshCw
} from 'lucide-react'
import type { BreadthData, MarketDataQuery } from '../../../types/trading'
import { DataEntryForm } from './DataEntryForm'

interface HistoricalDataTableProps {
  onDataChange?: () => void
}

interface SortConfig {
  key: keyof BreadthData | null
  direction: 'ASC' | 'DESC'
}

interface FilterConfig {
  startDate: string
  endDate: string
  minBreadthScore: string
  maxBreadthScore: string
  marketPhase: string
  dataSource: string
  searchQuery: string
}

type ViewMode = 'table' | 'edit'

export function HistoricalDataTable({ onDataChange }: HistoricalDataTableProps) {
  // State management
  const [data, setData] = useState<BreadthData[]>([])
  const [filteredData, setFilteredData] = useState<BreadthData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'DESC' })
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [editingEntry, setEditingEntry] = useState<BreadthData | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Filter state
  const [filters, setFilters] = useState<FilterConfig>({
    startDate: '',
    endDate: '',
    minBreadthScore: '',
    maxBreadthScore: '',
    marketPhase: '',
    dataSource: '',
    searchQuery: ''
  })

  // Load historical data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Get all available data by using a wide date range (2000-2030)
      // Users can then use filters to narrow down if needed
      const defaultStartDate = filters.startDate || '2000-01-01'
      const defaultEndDate = filters.endDate || '2030-12-31'
      
      // Check if running in Electron with API available
      let result: BreadthData[] = []
      
      if (!window.tradingAPI?.getBreadthData) {
        console.warn('Trading API not available - using mock data for browser demo')
        // Mock data with realistic CSV-imported structure for testing field mapping
        result = [
          {
            id: 1,
            date: '2025-01-15',
            timestamp: new Date().toISOString(),
            stocks_up_4pct: 180,
            stocks_down_4pct: 120,
            t2108: 65.4,
            stocks_up_20pct: 300,
            stocks_down_20pct: 150,
            ratio_5day: 1.5,
            ratio_10day: 1.65,
            breadthScore: 7.2,
            marketPhase: 'BULL',
            dataSource: 'imported',
            notes: 'T2108: 65.4, Stocks_Up_4pct: 180, Stocks_Down_4pct: 120, Stocks_Up_20pct: 300, Stocks_Down_20pct: 150, Ratio_5day: 1.5, Ratio_10day: 1.65, SP500: 5847, Worden_Universe: 7000'
          }
        ]
      } else {
        result = await window.tradingAPI.getBreadthData(
          defaultStartDate,
          defaultEndDate
        )
      }
      
      setData(result || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load historical data')
    } finally {
      setLoading(false)
    }
  }, [filters.startDate, filters.endDate])

  // Apply filters and sorting
  const applyFiltersAndSorting = useCallback(() => {
    let filtered = [...data]

    // Apply filters
    if (filters.minBreadthScore) {
      const min = parseFloat(filters.minBreadthScore)
      filtered = filtered.filter(item => item.breadthScore >= min)
    }

    if (filters.maxBreadthScore) {
      const max = parseFloat(filters.maxBreadthScore)
      filtered = filtered.filter(item => item.breadthScore <= max)
    }

    if (filters.marketPhase) {
      filtered = filtered.filter(item => 
        item.marketPhase?.toLowerCase().includes(filters.marketPhase.toLowerCase())
      )
    }

    if (filters.dataSource) {
      filtered = filtered.filter(item => item.dataSource === filters.dataSource)
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.date.toLowerCase().includes(query) ||
        item.marketPhase?.toLowerCase().includes(query) ||
        item.dataSource.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key!]
        const bValue = b[sortConfig.key!]

        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue)
          return sortConfig.direction === 'ASC' ? comparison : -comparison
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          const comparison = aValue - bValue
          return sortConfig.direction === 'ASC' ? comparison : -comparison
        }

        return 0
      })
    }

    setFilteredData(filtered)
  }, [data, filters, sortConfig])

  // Handle sorting
  const handleSort = useCallback((key: keyof BreadthData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'ASC' ? 'DESC' : 'ASC'
    }))
  }, [])

  // Handle filter change
  const handleFilterChange = useCallback((key: keyof FilterConfig, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }, [])

  // Handle row selection
  const handleRowSelection = useCallback((id: number, selected: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }, [])

  // Handle select all
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const ids = paginatedData.map(item => item.id!).filter(id => id !== undefined)
      setSelectedRows(new Set(ids))
    } else {
      setSelectedRows(new Set())
    }
  }, [])

  // Handle delete
  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      await window.tradingAPI.deleteBreadthData(id)
      await loadData()
      onDataChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry')
    }
  }, [loadData, onDataChange])

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedRows.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedRows.size} entries?`)) return

    try {
      await Promise.all(
        Array.from(selectedRows).map(id => window.tradingAPI.deleteBreadthData(id))
      )
      setSelectedRows(new Set())
      await loadData()
      onDataChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entries')
    }
  }, [selectedRows, loadData, onDataChange])

  // Handle edit
  const handleEdit = useCallback((entry: BreadthData) => {
    console.log('=== Edit Debug ===')
    console.log('Editing entry:', entry)
    console.log('stocks_up_20pct:', entry.stocks_up_20pct)
    console.log('stocks_down_20pct:', entry.stocks_down_20pct)
    console.log('stocks_up_20dollar:', entry.stocks_up_20dollar)
    console.log('stocks_down_20dollar:', entry.stocks_down_20dollar)
    console.log('ratio_5day:', entry.ratio_5day)
    console.log('ratio_10day:', entry.ratio_10day)
    setEditingEntry(entry)
    setViewMode('edit')
  }, [])

  // Handle edit success
  const handleEditSuccess = useCallback(() => {
    setViewMode('table')
    setEditingEntry(null)
    loadData()
    onDataChange?.()
  }, [loadData, onDataChange])

  // Handle CSV export
  const handleExport = useCallback(async () => {
    try {
      const startDate = filters.startDate || '2000-01-01'
      const endDate = filters.endDate || '2030-12-31'
      
      const result = await window.tradingAPI.exportCSVBreadth(startDate, endDate)
      
      if (result.success) {
        // Create download link
        const blob = new Blob([result.data], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        throw new Error('Export failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data')
    }
  }, [filters.startDate, filters.endDate])

  // Pagination calculations
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  // Load data on component mount and filter changes
  useEffect(() => {
    loadData()
  }, [loadData])

  // Apply filters when data or filter config changes
  useEffect(() => {
    applyFiltersAndSorting()
  }, [applyFiltersAndSorting])

  // Format functions
  const formatScore = (score: number | null) => {
    if (score === null || score === undefined) return '--'
    return score.toFixed(1)
  }

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return '--'
    return `${value.toFixed(0)}%`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getMarketPhaseColor = (phase: string | undefined) => {
    switch (phase?.toUpperCase()) {
      case 'BULL':
        return 'bg-green-100 text-green-800'
      case 'BEAR':
        return 'bg-red-100 text-red-800'
      case 'NEUTRAL':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDataSourceColor = (source: string) => {
    switch (source) {
      case 'manual':
        return 'bg-blue-100 text-blue-800'
      case 'imported':
        return 'bg-purple-100 text-purple-800'
      case 'api':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Render sort icon
  const renderSortIcon = (key: keyof BreadthData) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'ASC' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />
  }

  if (viewMode === 'edit' && editingEntry) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Market Breadth Entry</h2>
          <button
            onClick={() => setViewMode('table')}
            className="text-gray-600 hover:text-gray-900"
          >
            Back to Table
          </button>
        </div>
        <DataEntryForm 
          initialData={editingEntry}
          onSuccess={handleEditSuccess}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Historical Market Breadth Data</h2>
          <p className="text-gray-600">
            {filteredData.length} of {data.length} records
            {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
          
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
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

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Breadth Score</label>
              <input
                type="number"
                // Removed step constraint for flexible input
                value={filters.minBreadthScore}
                onChange={(e) => handleFilterChange('minBreadthScore', e.target.value)}
                placeholder="e.g. 0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Breadth Score</label>
              <input
                type="number"
                // Removed step constraint for flexible input
                value={filters.maxBreadthScore}
                onChange={(e) => handleFilterChange('maxBreadthScore', e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Market Phase</label>
              <select
                value={filters.marketPhase}
                onChange={(e) => handleFilterChange('marketPhase', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Phases</option>
                <option value="BULL">Bull Market</option>
                <option value="BEAR">Bear Market</option>
                <option value="NEUTRAL">Neutral Market</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
              <select
                value={filters.dataSource}
                onChange={(e) => handleFilterChange('dataSource', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sources</option>
                <option value="manual">Manual Entry</option>
                <option value="imported">Imported CSV</option>
                <option value="api">API Data</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <p className="text-blue-800">
              {selectedRows.size} item{selectedRows.size > 1 ? 's' : ''} selected
            </p>
            <button
              onClick={handleBulkDelete}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading historical data...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="font-medium">No data available</p>
            <p className="text-sm">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === paginatedData.filter(item => item.id).length && paginatedData.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Date</span>
                        {renderSortIcon('date')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('breadthScore')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Breadth Score</span>
                        {renderSortIcon('breadthScore')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('marketPhase')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Market Phase</span>
                        {renderSortIcon('marketPhase')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('trendStrength')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Trend Strength</span>
                        {renderSortIcon('trendStrength')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('dataSource')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Source</span>
                        {renderSortIcon('dataSource')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedData.map((entry, index) => (
                    <tr key={entry.id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(entry.id!)}
                          onChange={(e) => handleRowSelection(entry.id!, e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {formatScore(entry.breadthScore)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMarketPhaseColor(entry.marketPhase)}`}>
                          {entry.marketPhase || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatPercentage(entry.trendStrength)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDataSourceColor(entry.dataSource)}`}>
                          {entry.dataSource}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {entry.id && (
                            <button
                              onClick={() => handleDelete(entry.id!)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>per page</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}