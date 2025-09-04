import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Upload, 
  Download, 
  Edit3, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle,
  ArrowLeft,
  Calendar,
  Filter
} from 'lucide-react';
import { MarketData, ApiResponse, UploadResponse } from '../types';
import { ExportManager } from './ExportManager';
import StockbeeModal from './StockbeeModal';

// Column definitions with display names and color coding rules
interface ColumnDef {
  key: string;
  label: string;
  type: string;
  editable: boolean;
  width: string;
  colorCode?: string;
  precision?: number;
}

const COLUMNS: ColumnDef[] = [
  { key: 'date', label: 'Datum', type: 'date', editable: false, width: 'w-32' },
  { key: 'stocks_up_4pct', label: '4% Up', type: 'number', editable: true, colorCode: 'positive', width: 'w-20' },
  { key: 'stocks_down_4pct', label: '4% Down', type: 'number', editable: true, colorCode: 'negative', width: 'w-20' },
  { key: 'stocks_up_20pct', label: '20% Up', type: 'number', editable: true, colorCode: 'positive', width: 'w-20' },
  { key: 'stocks_down_20pct', label: '20% Down', type: 'number', editable: true, colorCode: 'negative', width: 'w-20' },
  { key: 'stocks_up_20dollar', label: '20$ Up', type: 'number', editable: true, colorCode: 'positive', width: 'w-20' },
  { key: 'stocks_down_20dollar', label: '20$ Down', type: 'number', editable: true, colorCode: 'negative', width: 'w-20' },
  { key: 'ratio_5day', label: '5D Ratio', type: 'number', editable: false, colorCode: 'auto', width: 'w-24', precision: 2 },
  { key: 'ratio_10day', label: '10D Ratio', type: 'number', editable: false, colorCode: 'auto', width: 'w-24', precision: 2 },
  { key: 'stocks_up_25pct_quarter', label: '25% Up Q', type: 'number', editable: true, colorCode: 'positive', width: 'w-24' },
  { key: 'stocks_down_25pct_quarter', label: '25% Down Q', type: 'number', editable: true, colorCode: 'negative', width: 'w-24' },
  { key: 'stocks_up_25pct_month', label: '25% Up M', type: 'number', editable: true, colorCode: 'positive', width: 'w-24' },
  { key: 'stocks_down_25pct_month', label: '25% Down M', type: 'number', editable: true, colorCode: 'negative', width: 'w-24' },
  { key: 'stocks_up_50pct_month', label: '50% Up M', type: 'number', editable: true, colorCode: 'positive', width: 'w-24' },
  { key: 'stocks_down_50pct_month', label: '50% Down M', type: 'number', editable: true, colorCode: 'negative', width: 'w-24' },
  { key: 'stocks_up_13pct_34days', label: '13% Up 34D', type: 'number', editable: true, colorCode: 'positive', width: 'w-24' },
  { key: 'stocks_down_13pct_34days', label: '13% Down 34D', type: 'number', editable: true, colorCode: 'negative', width: 'w-24' },
  { key: 'worden_universe', label: 'Universe', type: 'number', editable: true, colorCode: 'neutral', width: 'w-24' },
  { key: 't2108', label: 'T2108', type: 'number', editable: true, colorCode: 'auto', width: 'w-20', precision: 2 },
  { key: 'sp500', label: 'S&P 500', type: 'text', editable: true, colorCode: 'neutral', width: 'w-28' },
  { key: 'breadth_score', label: 'Score', type: 'number', editable: false, colorCode: 'score', width: 'w-20', precision: 1 },
  { key: 'breadth_score_normalized', label: 'Norm Score', type: 'number', editable: false, colorCode: 'score', width: 'w-24', precision: 1 }
];

const getValueColor = (value: number | null, colorCode: string): string => {
  if (value === null || value === undefined) return 'text-gray-500';
  
  switch (colorCode) {
    case 'positive':
      return value > 0 ? 'text-green-400 font-semibold' : 'text-gray-400';
    case 'negative':
      return value > 0 ? 'text-red-400 font-semibold' : 'text-gray-400';
    case 'score':
      if (value >= 60) return 'text-green-400 font-semibold';
      if (value <= 40) return 'text-red-400 font-semibold';
      return 'text-orange-400 font-semibold';
    case 'auto':
      if (value >= 70) return 'text-green-400 font-semibold';
      if (value <= 30) return 'text-red-400 font-semibold';
      return 'text-orange-400 font-semibold';
    default:
      return 'text-gray-200';
  }
};

const getCellBackground = (value: number | null, colorCode: string): string => {
  if (value === null || value === undefined) return '';
  
  switch (colorCode) {
    case 'score':
      if (value >= 60) return 'bg-green-500/10';
      if (value <= 40) return 'bg-red-500/10';
      return 'bg-orange-500/10';
    case 'auto':
      if (value >= 70) return 'bg-green-500/10';
      if (value <= 30) return 'bg-red-500/10';
      return 'bg-orange-500/10';
    default:
      return '';
  }
};

export const DataManagement: React.FC = () => {
  const [data, setData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [availableYears, setAvailableYears] = useState<string[]>(['2025', '2024', '2023']);
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingCell, setEditingCell] = useState<{row: number, column: string} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
    details?: string[];
  }>({ type: null, message: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingRow, setEditingRow] = useState<MarketData | null>(null);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      
      const response = await fetch(
        `http://localhost:3001/api/market-data?startDate=${startDate}&endDate=${endDate}&sortBy=${sortColumn}&sortOrder=${sortDirection.toUpperCase()}&limit=1000`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const result: ApiResponse<MarketData[]> = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, sortColumn, sortDirection]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Handle inline editing
  const startEdit = (rowIndex: number, column: string, currentValue: any) => {
    setEditingCell({ row: rowIndex, column });
    setEditValue(currentValue?.toString() || '');
  };

  const saveEdit = async (id: number, column: string, value: string) => {
    try {
      // Find the current row data
      const currentRow = data.find(item => item.id === id);
      if (!currentRow) {
        throw new Error('Row not found');
      }

      // Prepare the update value
      const numericValue = column === 'sp500' || column === 'date' 
        ? value || null  // Keep as string for sp500 and date
        : (value === '' ? null : parseFloat(value));
      
      // Send complete row data with the updated field
      const updateData = {
        ...currentRow,
        [column]: numericValue
      };

      console.log('Updating with data:', updateData); // Debug log

      const response = await fetch(`http://localhost:3001/api/market-data/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update data');
      }

      const result = await response.json();

      // Update local state with the response data
      setData(prev => prev.map(item => 
        item.id === id ? result.data : item
      ));

      setUploadStatus({
        type: 'success',
        message: `✅ ${column} updated successfully`
      });

      // Clear status after 3 seconds
      setTimeout(() => {
        setUploadStatus({ type: null, message: '' });
      }, 3000);

    } catch (err) {
      console.error('Update error:', err); // Debug log
      setUploadStatus({
        type: 'error',
        message: `❌ Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    } finally {
      setEditingCell(null);
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Modal handlers
  const openAddModal = () => {
    setModalMode('add');
    setEditingRow(null);
    setShowModal(true);
  };

  const openEditModal = (row: MarketData) => {
    setModalMode('edit');
    setEditingRow(row);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRow(null);
  };

  const handleModalSubmit = async (data: Omit<MarketData, 'id'> | MarketData) => {
    try {
      const url = modalMode === 'edit' 
        ? `http://localhost:3001/api/market-data/${(data as MarketData).id}`
        : 'http://localhost:3001/api/market-data';
      
      const method = modalMode === 'edit' ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save data');
      }

      const result = await response.json();

      // Update local state
      if (modalMode === 'edit') {
        setData(prev => prev.map(item => 
          item.id === (data as MarketData).id ? result.data : item
        ));
      } else {
        setData(prev => [result.data, ...prev]);
      }

      setUploadStatus({
        type: 'success',
        message: `✅ ${modalMode === 'edit' ? 'Daten aktualisiert' : 'Daten hinzugefügt'}`
      });

      // Clear status after 3 seconds
      setTimeout(() => {
        setUploadStatus({ type: null, message: '' });
      }, 3000);

    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: `❌ Fehler beim Speichern: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`
      });
    }
  };

  // Handle CSV upload via drag & drop
  const handleFileUpload = async (file: File) => {
    try {
      setUploadStatus({ type: 'info', message: 'Uploading CSV...' });
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:3001/api/csv-import', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();

      if (result.success) {
        setUploadStatus({
          type: 'success',
          message: `✅ Upload successful: ${result.imported} imported, ${result.skipped} skipped`,
          details: result.errorDetails
        });
        fetchData(); // Refresh data
      } else {
        setUploadStatus({
          type: 'error',
          message: `❌ Upload failed: ${result.errors} errors`,
          details: result.errorDetails
        });
      }
    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: `Upload error: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFile) {
      handleFileUpload(csvFile);
    } else {
      setUploadStatus({
        type: 'error',
        message: 'Please drop a CSV file'
      });
    }
  };

  // Filter data based on search
  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    
    return Object.values(item).some(value => 
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Dashboard
            </Link>
            <div className="h-6 w-px bg-gray-700"></div>
            <h1 className="text-2xl font-bold text-orange-500">Daten verwalten</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-400">
              {filteredData.length} von {data.length} Datensätzen
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Suche nach Datum, Werten..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-64"
                />
              </div>
              
              {/* Year Selection */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={openAddModal}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-black px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                <Plus className="h-4 w-4" />
                Daten hinzufügen
              </button>
              
              <label className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-lg font-semibold cursor-pointer transition-colors">
                <Upload className="h-4 w-4" />
                CSV Upload
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Drag & Drop Zone */}
        {isDragging && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-orange-500/20 border-2 border-dashed border-orange-500 rounded-xl p-12 text-center">
              <Upload className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-orange-500 mb-2">CSV-Datei hier ablegen</h3>
              <p className="text-gray-300">Datei loslassen zum Hochladen</p>
            </div>
          </div>
        )}

        {/* Upload Status */}
        {uploadStatus.type && (
          <div className={`mb-6 p-4 rounded-lg border ${
            uploadStatus.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' :
            uploadStatus.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' :
            'bg-blue-500/10 border-blue-500/50 text-blue-400'
          }`}>
            <div className="flex items-start gap-3">
              {uploadStatus.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">{uploadStatus.message}</p>
                {uploadStatus.details && uploadStatus.details.length > 0 && (
                  <div className="mt-2 text-sm font-mono">
                    {uploadStatus.details.slice(0, 5).map((detail, index) => (
                      <div key={index}>{detail}</div>
                    ))}
                    {uploadStatus.details.length > 5 && (
                      <div className="text-gray-500">... und {uploadStatus.details.length - 5} weitere</div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setUploadStatus({ type: null, message: '' })}
                className="text-gray-500 hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Export Manager */}
        <div className="mb-6">
          <ExportManager 
            data={filteredData}
            filename={`stockbee_market_data_${selectedYear}`}
            className="bg-gray-900 rounded-xl p-6 border border-gray-800"
          />
        </div>

        {/* Data Table */}
        <div 
          className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Lade Daten...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-red-400">{error}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 sticky top-0">
                  <tr>
                    <th className="w-16 px-3 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Edit
                    </th>
                    {COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        className={`${column.width} px-3 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700 transition-colors`}
                        onClick={() => handleSort(column.key)}
                      >
                        <div className="flex items-center gap-2">
                          {column.label}
                          {sortColumn === column.key && (
                            <span className="text-orange-500">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredData.map((row, rowIndex) => (
                    <tr key={row.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-3 py-4">
                        <button
                          onClick={() => openEditModal(row)}
                          className="text-orange-500 hover:text-orange-400 transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </td>
                      {COLUMNS.map((column) => {
                        const value = row[column.key as keyof MarketData];
                        const isEditing = editingCell?.row === rowIndex && editingCell?.column === column.key;
                        const displayValue = column.type === 'number' && typeof value === 'number' && column.precision 
                          ? value.toFixed(column.precision)
                          : value?.toString() || '';
                        
                        return (
                          <td
                            key={column.key}
                            className={`px-3 py-4 text-sm ${getCellBackground(value as number, column.colorCode || 'neutral')} transition-colors`}
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type={column.type === 'number' ? 'number' : 'text'}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveEdit(row.id!, column.key, editValue);
                                    } else if (e.key === 'Escape') {
                                      cancelEdit();
                                    }
                                  }}
                                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveEdit(row.id!, column.key, editValue)}
                                  className="text-green-500 hover:text-green-400"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="text-gray-500 hover:text-gray-400"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div 
                                className={`${getValueColor(value as number, column.colorCode || 'neutral')} ${
                                  column.editable ? 'cursor-pointer hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 -my-1' : ''
                                } transition-colors`}
                                onClick={() => column.editable && startEdit(rowIndex, column.key, value)}
                              >
                                {value === null || value === undefined ? (
                                  <span className="text-gray-500">-</span>
                                ) : (
                                  displayValue
                                )}
                                {column.editable && (
                                  <Edit3 className="h-3 w-3 inline ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredData.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-gray-400">Keine Daten für {selectedYear} gefunden</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>💡 Klick auf bearbeitbare Felder zum direkten Bearbeiten | 📁 CSV-Dateien hierher ziehen</p>
          <p>🎯 Scores und Ratios werden automatisch berechnet</p>
        </div>

        {/* Modal */}
        <StockbeeModal
          isOpen={showModal}
          onClose={closeModal}
          mode={modalMode}
          initialData={editingRow}
          onSubmit={handleModalSubmit}
        />
      </div>
    </div>
  );
};

export default DataManagement;
