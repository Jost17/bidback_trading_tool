/**
 * Reusable Data Table Component
 * Provides consistent table styling with sorting, filtering, and pagination
 */

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Download, Filter } from 'lucide-react';

export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  format?: (value: any, row: T) => string | React.ReactNode;
  className?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string;
  className?: string;
  onSort?: (column: keyof T, direction: 'ASC' | 'DESC') => void;
  onFilter?: (filters: Partial<T>) => void;
  onExport?: () => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  searchable?: boolean;
  exportable?: boolean;
  selectable?: boolean;
  onSelect?: (selectedRows: T[]) => void;
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  error,
  className = '',
  onSort,
  onFilter,
  onExport,
  pagination,
  searchable = false,
  exportable = false,
  selectable = false,
  onSelect
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm && searchable) {
      filtered = data.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortColumn && !onSort) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal < bVal) return sortDirection === 'ASC' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection, onSort, searchable]);

  const handleSort = (column: keyof T) => {
    if (!columns.find(col => col.key === column)?.sortable) return;

    const newDirection = 
      sortColumn === column && sortDirection === 'ASC' ? 'DESC' : 'ASC';
    
    setSortColumn(column);
    setSortDirection(newDirection);
    
    if (onSort) {
      onSort(column, newDirection);
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.size === processedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(processedData.map((_, index) => index)));
    }
  };

  const handleSelectRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
    
    if (onSelect) {
      const selected = Array.from(newSelected).map(i => processedData[i]);
      onSelect(selected);
    }
  };

  const renderPagination = () => {
    if (!pagination) return null;

    const { page, pageSize, total, onPageChange, onPageSizeChange } = pagination;
    const totalPages = Math.ceil(total / pageSize);
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            Showing {startItem} to {endItem} of {total} results
          </span>
          {onPageSizeChange && (
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          )}
        </div>
        
        <div className="flex space-x-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          
          {/* Page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, page - 2) + i;
            if (pageNum > totalPages) return null;
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-1 text-sm border rounded ${
                  pageNum === page
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 text-lg font-medium">Error loading data</div>
        <div className="text-gray-500 mt-2">{error}</div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow-sm rounded-lg overflow-hidden ${className}`}>
      {/* Table Header Controls */}
      {(searchable || exportable || showFilters) && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {searchable && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
              
              {onFilter && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-white"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {selectedRows.size > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedRows.size} selected
                </span>
              )}
              
              {exportable && (
                <button
                  onClick={onExport}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === processedData.length && processedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${column.className || ''}`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp 
                          className={`w-3 h-3 ${
                            sortColumn === column.key && sortDirection === 'ASC'
                              ? 'text-blue-600' 
                              : 'text-gray-400'
                          }`} 
                        />
                        <ChevronDown 
                          className={`w-3 h-3 -mt-1 ${
                            sortColumn === column.key && sortDirection === 'DESC'
                              ? 'text-blue-600' 
                              : 'text-gray-400'
                          }`} 
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)} 
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : processedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)} 
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No data available
                </td>
              </tr>
            ) : (
              processedData.map((row, index) => (
                <tr 
                  key={index}
                  className={`hover:bg-gray-50 ${
                    selectedRows.has(index) ? 'bg-blue-50' : ''
                  }`}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={() => handleSelectRow(index)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`px-4 py-3 text-sm ${
                        column.align === 'center' ? 'text-center' :
                        column.align === 'right' ? 'text-right' : 'text-left'
                      } ${column.className || ''}`}
                    >
                      {column.format 
                        ? column.format(row[column.key], row)
                        : String(row[column.key] || '')
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}

export default DataTable;