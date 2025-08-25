import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Save, Upload, Calculator, AlertCircle, Check, X, Loader, Plus } from 'lucide-react';
import { MarketData } from '../types';
import StockbeeModal from './StockbeeModal';

// Debounce utility function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Row State für besseres State Management
interface RowState {
  data: MarketData;
  hasChanges: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  validationErrors: string[];
}

const StockbeeDataManagement: React.FC = () => {
  // State Management
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [rows, setRows] = useState<Map<string, RowState>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingRow, setEditingRow] = useState<MarketData | null>(null);
  
  // Refs for cleanup
  const saveTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingSavesRef = useRef<Set<string>>(new Set());

  // Row-ID Generator
  const generateRowId = (date: string) => `${selectedYear}-${date}`;

  // Validation Logic für MarketData
  const validateRow = useCallback((data: MarketData): string[] => {
    const errors: string[] = [];
    
    if (!data.date) {
      errors.push('Datum ist erforderlich');
    }
    
    // Validierung für T2108 (0-100)
    if (data.t2108 !== null && data.t2108 !== undefined) {
      if (isNaN(Number(data.t2108)) || Number(data.t2108) < 0 || Number(data.t2108) > 100) {
        errors.push('T2108 muss zwischen 0 und 100 liegen');
      }
    }
    
    // Validierung für numerische Felder (positive Zahlen)
    const numericFields = [
      'stocks_up_4pct', 'stocks_down_4pct', 
      'stocks_up_20pct', 'stocks_down_20pct',
      'stocks_up_20dollar', 'stocks_down_20dollar',
      'stocks_up_25pct_quarter', 'stocks_down_25pct_quarter',
      'stocks_up_25pct_month', 'stocks_down_25pct_month',
      'stocks_up_50pct_month', 'stocks_down_50pct_month',
      'stocks_up_13pct_34days', 'stocks_down_13pct_34days',
      'worden_universe'
    ];
    
    numericFields.forEach(field => {
      const value = data[field as keyof MarketData];
      if (value !== null && value !== undefined && (isNaN(Number(value)) || Number(value) < 0)) {
        errors.push(`${field} muss eine positive Zahl sein`);
      }
    });

    return errors;
  }, []);

  // Load Available Years
  useEffect(() => {
    const loadAvailableYears = async () => {
      try {
        // Generate years from 2001 to current year + 1
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = currentYear + 1; year >= 2001; year--) {
          years.push(year);
        }
        setAvailableYears(years);
      } catch (error) {
        console.error('Error loading years:', error);
        setAvailableYears([2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2011, 2010, 2007, 2001]);
      }
    };

    loadAvailableYears();
  }, []);

  // Load Data for Selected Year
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear}-12-31`;
        
        const response = await fetch(
          `http://localhost:3001/api/market-data?startDate=${startDate}&endDate=${endDate}&sortBy=date&sortOrder=DESC&limit=1000`
        );
        
        if (response.ok) {
          const result = await response.json();
          const data: MarketData[] = result.data;
          const newRows = new Map<string, RowState>();
          
          data.forEach(row => {
            const rowId = generateRowId(row.date);
            newRows.set(rowId, {
              data: row,
              hasChanges: false,
              isSaving: false,
              lastSaved: new Date(),
              validationErrors: []
            });
          });
          
          setRows(newRows);
        }
      } catch (error) {
        setGlobalMessage({
          type: 'error',
          text: `Fehler beim Laden der Daten für ${selectedYear}: ${error}`
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedYear) {
      loadData();
    }
  }, [selectedYear]);

  // Save Single Row with Race Condition Prevention
  const saveRow = useCallback(async (rowId: string) => {
    const rowState = rows.get(rowId);
    if (!rowState || !rowState.hasChanges || pendingSavesRef.current.has(rowId)) {
      return; // Prevent duplicate saves
    }

    // Add to pending saves to prevent race conditions
    pendingSavesRef.current.add(rowId);

    // Set saving state
    setRows(prev => {
      const newRows = new Map(prev);
      const currentRow = newRows.get(rowId);
      if (currentRow) {
        newRows.set(rowId, { ...currentRow, isSaving: true });
      }
      return newRows;
    });

    try {
      const method = rowState.data.id ? 'PUT' : 'POST';
      const url = rowState.data.id 
        ? `http://localhost:3001/api/market-data/${rowState.data.id}`
        : 'http://localhost:3001/api/market-data';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rowState.data)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update row state on success
        setRows(prev => {
          const newRows = new Map(prev);
          const currentRow = newRows.get(rowId);
          if (currentRow) {
            newRows.set(rowId, {
              ...currentRow,
              data: result.data,
              hasChanges: false,
              isSaving: false,
              lastSaved: new Date()
            });
          }
          return newRows;
        });

        setGlobalMessage({
          type: 'success',
          text: '✅ Daten erfolgreich gespeichert'
        });
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      setRows(prev => {
        const newRows = new Map(prev);
        const currentRow = newRows.get(rowId);
        if (currentRow) {
          newRows.set(rowId, { ...currentRow, isSaving: false });
        }
        return newRows;
      });
      
      setGlobalMessage({
        type: 'error',
        text: `Fehler beim Speichern: ${error}`
      });
    } finally {
      // Remove from pending saves
      pendingSavesRef.current.delete(rowId);
      
      // Clear message after 3 seconds
      setTimeout(() => setGlobalMessage(null), 3000);
    }
  }, [rows]);

  // Update Row Data
  const updateRowData = useCallback((rowId: string, field: keyof MarketData, value: any) => {
    setRows(prev => {
      const newRows = new Map(prev);
      const currentRow = newRows.get(rowId);
      
      if (currentRow) {
        const updatedData = { ...currentRow.data, [field]: value };
        const validationErrors = validateRow(updatedData);
        
        newRows.set(rowId, {
          ...currentRow,
          data: updatedData,
          hasChanges: true,
          validationErrors
        });
        
        // Auto-save after 2 seconds if enabled
        if (autoSaveEnabled && validationErrors.length === 0) {
          const existingTimer = saveTimersRef.current.get(rowId);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }
          
          const timer = setTimeout(() => {
            saveRow(rowId);
            saveTimersRef.current.delete(rowId);
          }, 2000);
          
          saveTimersRef.current.set(rowId, timer);
        }
      }
      
      return newRows;
    });
  }, [validateRow, autoSaveEnabled, saveRow]);

  // Modal handlers
  const openAddModal = () => {
    setModalMode('add');
    setEditingRow(null);
    setShowModal(true);
  };

  const openEditModal = (data: MarketData) => {
    setModalMode('edit');
    setEditingRow(data);
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
      const rowId = generateRowId(result.data.date);
      setRows(prev => {
        const newRows = new Map(prev);
        newRows.set(rowId, {
          data: result.data,
          hasChanges: false,
          isSaving: false,
          lastSaved: new Date(),
          validationErrors: []
        });
        return newRows;
      });

      setGlobalMessage({
        type: 'success',
        text: `✅ ${modalMode === 'edit' ? 'Daten aktualisiert' : 'Daten hinzugefügt'}`
      });

      closeModal();
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setGlobalMessage(null);
      }, 3000);

    } catch (err) {
      setGlobalMessage({
        type: 'error',
        text: `❌ Fehler beim Speichern: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`
      });
    }
  };

  // CSV Upload Handler
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/api/csv-import', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setGlobalMessage({
          type: 'success',
          text: 'CSV erfolgreich hochgeladen'
        });
        // Reload data
        const loadData = async () => {
          const startDate = `${selectedYear}-01-01`;
          const endDate = `${selectedYear}-12-31`;
          
          const response = await fetch(
            `http://localhost:3001/api/market-data?startDate=${startDate}&endDate=${endDate}&sortBy=date&sortOrder=DESC&limit=1000`
          );
          
          if (response.ok) {
            const result = await response.json();
            const data: MarketData[] = result.data;
            const newRows = new Map<string, RowState>();
            
            data.forEach(row => {
              const rowId = generateRowId(row.date);
              newRows.set(rowId, {
                data: row,
                hasChanges: false,
                isSaving: false,
                lastSaved: new Date(),
                validationErrors: []
              });
            });
            
            setRows(newRows);
          }
        };
        loadData();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setGlobalMessage({
        type: 'error',
        text: `Upload-Fehler: ${error}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sortedRows = useMemo(() => {
    return Array.from(rows.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [rows]);

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-orange-500 mb-2">
          Daten verwalten
        </h1>
        <p className="text-gray-400">Bearbeiten Sie alle Marktdaten direkt in der Tabelle</p>
      </div>
      
      {/* Controls Bar */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-gray-800">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-green-600 text-black font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Daten hinzufügen
          </button>

          <label className="flex items-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            <div className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              CSV Upload
            </div>
          </label>

          <button
            className="flex items-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Scores berechnen
          </button>

          <label className="flex items-center ml-auto">
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              className="mr-2 w-4 h-4 text-orange-500 bg-gray-800 border-gray-600 rounded focus:ring-orange-500"
            />
            <span className="text-gray-300">Auto-Save</span>
          </label>
        </div>

      </div>
      
      {/* Global Message */}
      {globalMessage && (
        <div className={`p-4 rounded-lg mb-4 flex items-center justify-between ${
          globalMessage.type === 'success' ? 'bg-green-900/50 text-green-400 border border-green-700' :
          globalMessage.type === 'error' ? 'bg-red-900/50 text-red-400 border border-red-700' :
          'bg-blue-900/50 text-blue-400 border border-blue-700'
        }`}>
          <span>{globalMessage.text}</span>
          <button
            onClick={() => setGlobalMessage(null)}
            className="ml-2 text-current hover:opacity-70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Data Table - Enhanced */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8 bg-gray-900 rounded-lg border border-gray-800">
          <Loader className="w-6 h-6 animate-spin mr-2 text-orange-500" />
          <span className="text-gray-400">Lade Daten...</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Datum
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    20% Up (65T)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    20% Down (65T)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    $20 Up (65T)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    $20 Down (65T)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    4% Up Daily
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    4% Down Daily
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    25% Up Quarter
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    25% Down Quarter
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    T2108
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    S&P 500
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Breadth Score
                  </th>
                  <th className="sticky right-0 z-10 bg-gray-50 px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-gray-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      Keine Daten für {selectedYear} gefunden
                    </td>
                  </tr>
                ) : (
                  sortedRows.map(([rowId, rowState]) => {
                    const getInputClasses = () => {
                      const baseClasses = "w-20 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-center";
                      if (rowState.hasChanges) {
                        return `${baseClasses} bg-yellow-50 border-yellow-300`;
                      }
                      if (rowState.validationErrors.length > 0) {
                        return `${baseClasses} bg-red-50 border-red-300`;
                      }
                      return `${baseClasses} bg-white`;
                    };
                    
                    const getScoreClasses = (score: number | null) => {
                      const baseClasses = "px-3 py-2 text-sm text-center rounded font-medium";
                      if (!score) return `${baseClasses} bg-gray-100 text-gray-500`;
                      if (score >= 60) return `${baseClasses} bg-green-100 text-green-700`;
                      if (score <= 40) return `${baseClasses} bg-red-100 text-red-700`;
                      return `${baseClasses} bg-yellow-100 text-yellow-700`;
                    };
                    
                    return (
                      <tr key={rowId} className={`
                        hover:bg-gray-50 transition-colors
                        ${rowState.hasChanges ? 'bg-yellow-50' : ''}
                        ${rowState.validationErrors.length > 0 ? 'bg-red-50' : ''}
                      `} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                        {/* Date */}
                        <td className="sticky left-0 z-10 bg-white px-4 py-3 whitespace-nowrap border-r border-gray-200">
                          <input
                            type="date"
                            value={rowState.data.date}
                            onChange={(e) => updateRowData(rowId, 'date', e.target.value)}
                            className="w-32 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                          />
                        </td>
                        
                        {/* 20% Up (65 Tage) */}
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="number"
                            value={rowState.data.stocks_up_20pct || ''}
                            onChange={(e) => updateRowData(rowId, 'stocks_up_20pct', e.target.value ? Number(e.target.value) : null)}
                            className={getInputClasses()}
                            placeholder="0"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                          />
                        </td>
                        
                        {/* 20% Down (65 Tage) */}
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="number"
                            value={rowState.data.stocks_down_20pct || ''}
                            onChange={(e) => updateRowData(rowId, 'stocks_down_20pct', e.target.value ? Number(e.target.value) : null)}
                            className={getInputClasses()}
                            placeholder="0"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                          />
                        </td>
                        
                        {/* $20 Up (65 Tage) */}
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="number"
                            value={rowState.data.stocks_up_20dollar || ''}
                            onChange={(e) => updateRowData(rowId, 'stocks_up_20dollar', e.target.value ? Number(e.target.value) : null)}
                            className={getInputClasses()}
                            placeholder="0"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                          />
                        </td>
                        
                        {/* $20 Down (65 Tage) */}
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="number"
                            value={rowState.data.stocks_down_20dollar || ''}
                            onChange={(e) => updateRowData(rowId, 'stocks_down_20dollar', e.target.value ? Number(e.target.value) : null)}
                            className={getInputClasses()}
                            placeholder="0"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                          />
                        </td>
                        
                        {/* 4% Up Daily */}
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="number"
                            value={rowState.data.stocks_up_4pct || ''}
                            onChange={(e) => updateRowData(rowId, 'stocks_up_4pct', e.target.value ? Number(e.target.value) : null)}
                            className={getInputClasses()}
                            placeholder="0"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                          />
                        </td>
                        
                        {/* 4% Down Daily */}
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="number"
                            value={rowState.data.stocks_down_4pct || ''}
                            onChange={(e) => updateRowData(rowId, 'stocks_down_4pct', e.target.value ? Number(e.target.value) : null)}
                            className={getInputClasses()}
                            placeholder="0"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                          />
                        </td>
                        
                        {/* 25% Up Quarter */}
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="number"
                            value={rowState.data.stocks_up_25pct_quarter || ''}
                            onChange={(e) => updateRowData(rowId, 'stocks_up_25pct_quarter', e.target.value ? Number(e.target.value) : null)}
                            className={getInputClasses()}
                            placeholder="0"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                          />
                        </td>
                        
                        {/* 25% Down Quarter */}
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="number"
                            value={rowState.data.stocks_down_25pct_quarter || ''}
                            onChange={(e) => updateRowData(rowId, 'stocks_down_25pct_quarter', e.target.value ? Number(e.target.value) : null)}
                            className={getInputClasses()}
                            placeholder="0"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                          />
                        </td>
                        
                        {/* T2108 */}
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={rowState.data.t2108 || ''}
                            onChange={(e) => updateRowData(rowId, 't2108', e.target.value ? Number(e.target.value) : null)}
                            className={getInputClasses()}
                            placeholder="0-100"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                          />
                        </td>
                        
                        {/* S&P 500 */}
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="text"
                            value={rowState.data.sp500 || ''}
                            onChange={(e) => updateRowData(rowId, 'sp500', e.target.value || null)}
                            className={getInputClasses()}
                            placeholder="5,900.00"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                          />
                        </td>
                        
                        {/* Breadth Score */}
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <div className={getScoreClasses(rowState.data.breadth_score)} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                            {rowState.data.breadth_score ? rowState.data.breadth_score.toFixed(1) : '-'}
                          </div>
                        </td>
                      
                        {/* Actions */}
                        <td className="sticky right-0 z-10 bg-white px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(rowState.data)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium transition-colors"
                              title="Alle Felder bearbeiten"
                              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                            >
                              Edit
                            </button>
                            
                            {rowState.isSaving ? (
                              <Loader className="w-4 h-4 animate-spin text-blue-600" />
                            ) : rowState.hasChanges ? (
                              <button
                                onClick={() => saveRow(rowId)}
                                disabled={rowState.validationErrors.length > 0}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-1 font-medium transition-colors"
                                title="Änderungen speichern"
                                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                              >
                                <Save className="w-3 h-3" />
                                Save
                              </button>
                            ) : (
                              <div className="flex items-center text-green-600" title="Gespeichert">
                                <Check className="w-4 h-4" />
                              </div>
                            )}
                            
                            {rowState.validationErrors.length > 0 && (
                              <div className="relative group">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-red-600 text-white text-xs rounded p-2 whitespace-nowrap z-10">
                                  {rowState.validationErrors.join(', ')}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
      
      {/* Modal */}
      <StockbeeModal
        isOpen={showModal}
        onClose={closeModal}
        mode={modalMode}
        initialData={editingRow}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default StockbeeDataManagement;