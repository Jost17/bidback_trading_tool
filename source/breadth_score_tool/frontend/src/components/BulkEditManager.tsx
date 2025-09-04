import React, { useState } from 'react';
import { Check, X, Edit3, Trash2, Copy, Download } from 'lucide-react';

interface BulkEditProps {
  selectedRows: number[];
  data: any[];
  onBulkUpdate: (updates: { [key: string]: any }) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onSelectionClear: () => void;
  className?: string;
}

interface BulkOperation {
  type: 'update' | 'delete' | 'export';
  field?: string;
  value?: any;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const BulkEditManager: React.FC<BulkEditProps> = ({
  selectedRows,
  data,
  onBulkUpdate,
  onBulkDelete,
  onSelectionClear,
  className = ''
}) => {
  const [isOperationMode, setIsOperationMode] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<'update' | 'delete' | 'export' | null>(null);
  const [updateField, setUpdateField] = useState<string>('');
  const [updateValue, setUpdateValue] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  const selectedData = data.filter((_, index) => selectedRows.includes(index));
  
  // Available fields for bulk update
  const editableFields = [
    { key: 'stocks_up_4pct', label: '4% Up' },
    { key: 'stocks_down_4pct', label: '4% Down' },
    { key: 'stocks_up_20pct', label: '20% Up' },
    { key: 'stocks_down_20pct', label: '20% Down' },
    { key: 'stocks_up_20dollar', label: '20$ Up' },
    { key: 'stocks_down_20dollar', label: '20$ Down' },
    { key: 't2108', label: 'T2108' },
    { key: 'worden_universe', label: 'Worden Universe' },
    { key: 'sp500', label: 'S&P 500' }
  ];

  const bulkOperations: BulkOperation[] = [
    {
      type: 'update',
      label: 'Werte aktualisieren',
      icon: <Edit3 className="h-4 w-4" />,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      type: 'delete',
      label: 'Zeilen löschen',
      icon: <Trash2 className="h-4 w-4" />,
      color: 'bg-red-600 hover:bg-red-700'
    },
    {
      type: 'export',
      label: 'Auswahl exportieren',
      icon: <Download className="h-4 w-4" />,
      color: 'bg-green-600 hover:bg-green-700'
    }
  ];

  const handleOperationSelect = (operation: 'update' | 'delete' | 'export') => {
    setSelectedOperation(operation);
    setIsOperationMode(true);
    
    if (operation === 'export') {
      handleExportSelected();
    }
  };

  const handleBulkUpdate = async () => {
    if (!updateField || updateValue === '') {
      alert('Bitte Feld und Wert auswählen');
      return;
    }

    setIsExecuting(true);
    try {
      const updates = { [updateField]: updateValue === '' ? null : parseFloat(updateValue) || updateValue };
      await onBulkUpdate(updates);
      
      // Reset form
      setUpdateField('');
      setUpdateValue('');
      setIsOperationMode(false);
      setSelectedOperation(null);
    } catch (error) {
      alert(`Bulk-Update fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedRows.length} Zeilen wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    setIsExecuting(true);
    try {
      await onBulkDelete();
      setIsOperationMode(false);
      setSelectedOperation(null);
    } catch (error) {
      alert(`Bulk-Delete fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportSelected = () => {
    // Create CSV from selected data
    if (selectedData.length === 0) return;
    
    const headers = Object.keys(selectedData[0]);
    const csvContent = [
      headers.join(','),
      ...selectedData.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
        }).join(',')
      )
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `selected_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Reset
    setIsOperationMode(false);
    setSelectedOperation(null);
  };

  const cancelOperation = () => {
    setIsOperationMode(false);
    setSelectedOperation(null);
    setUpdateField('');
    setUpdateValue('');
  };

  if (selectedRows.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-4 ${className}`}>
      
      {/* Selection Summary */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-400" />
            <span className="font-medium text-white">
              {selectedRows.length} Zeile{selectedRows.length !== 1 ? 'n' : ''} ausgewählt
            </span>
          </div>
          
          {selectedData.length > 0 && (
            <div className="text-sm text-gray-400">
              {selectedData[0]?.date} bis {selectedData[selectedData.length - 1]?.date}
            </div>
          )}
        </div>
        
        <button
          onClick={onSelectionClear}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Operation Selection */}
      {!isOperationMode && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {bulkOperations.map((operation) => (
            <button
              key={operation.type}
              onClick={() => handleOperationSelect(operation.type)}
              className={`${operation.color} text-white px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center gap-2 justify-center`}
            >
              {operation.icon}
              {operation.label}
            </button>
          ))}
        </div>
      )}

      {/* Update Operation */}
      {isOperationMode && selectedOperation === 'update' && (
        <div className="space-y-4">
          <h3 className="font-medium text-white flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Bulk-Update: {selectedRows.length} Zeilen
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Feld auswählen
              </label>
              <select
                value={updateField}
                onChange={(e) => setUpdateField(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500"
              >
                <option value="">-- Feld wählen --</option>
                {editableFields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Neuer Wert
              </label>
              <input
                type="text"
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                placeholder="Wert eingeben..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleBulkUpdate}
              disabled={isExecuting || !updateField || updateValue === ''}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              {isExecuting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isExecuting ? 'Aktualisiere...' : 'Aktualisieren'}
            </button>
            
            <button
              onClick={cancelOperation}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Delete Operation */}
      {isOperationMode && selectedOperation === 'delete' && (
        <div className="space-y-4">
          <h3 className="font-medium text-white flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Zeilen löschen: {selectedRows.length} Zeilen
          </h3>
          
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-400 text-sm">
              ⚠️ Diese Aktion kann nicht rückgängig gemacht werden. 
              {selectedRows.length} Datensätze werden permanent gelöscht.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleBulkDelete}
              disabled={isExecuting}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              {isExecuting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {isExecuting ? 'Lösche...' : 'Endgültig löschen'}
            </button>
            
            <button
              onClick={cancelOperation}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Hook for managing bulk selection
export const useBulkSelection = (dataLength: number) => {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  
  const toggleRow = (index: number) => {
    setSelectedRows(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };
  
  const selectAll = () => {
    setSelectedRows(Array.from({ length: dataLength }, (_, i) => i));
  };
  
  const clearSelection = () => {
    setSelectedRows([]);
  };
  
  const isRowSelected = (index: number) => selectedRows.includes(index);
  
  const isAllSelected = selectedRows.length === dataLength && dataLength > 0;
  const isPartiallySelected = selectedRows.length > 0 && selectedRows.length < dataLength;
  
  return {
    selectedRows,
    toggleRow,
    selectAll,
    clearSelection,
    isRowSelected,
    isAllSelected,
    isPartiallySelected,
    selectedCount: selectedRows.length
  };
};

export default BulkEditManager;
