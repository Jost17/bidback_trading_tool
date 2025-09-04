import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Save, Upload, Calculator, AlertCircle, Check, X, Loader, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { MarketData } from '../types';
import StockbeeModal from './StockbeeModal';
import './EnhancedDataTable.css';

// Enhanced Design System Styles
const styles = {
  container: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#FAFAFA',
    minHeight: '100vh'
  },
  
  header: {
    backgroundColor: 'white',
    borderBottom: '1px solid #E2E8F0',
    padding: '24px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  tableContainer: {
    backgroundColor: 'white',
    margin: '24px 32px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
    fontVariantNumeric: 'tabular-nums' as const
  },
  
  input: {
    width: '60px',
    padding: '3px 4px',
    border: '1px solid #E2E8F0',
    borderRadius: '3px',
    textAlign: 'center' as const,
    fontSize: '11px',
    fontVariantNumeric: 'tabular-nums' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    backgroundColor: 'white'
  },
  
  inputFocus: {
    borderColor: '#3B82F6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    outline: 'none'
  },
  
  scoreIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '20px',
    fontWeight: '600',
    fontSize: '13px',
    gap: '4px'
  }
};

interface RowState {
  data: MarketData;
  hasChanges: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  validationErrors: string[];
}

const EnhancedDataTable: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [rows, setRows] = useState<Map<string, RowState>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const saveTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingSavesRef = useRef<Set<string>>(new Set());
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingRow, setEditingRow] = useState<MarketData | null>(null);

  // Generate available years
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear + 1; year >= 2001; year--) {
      years.push(year);
    }
    setAvailableYears(years);
  }, []);

  // Load data for selected year
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
            const rowId = `${selectedYear}-${row.date}`;
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

  // Save function
  const saveRow = useCallback(async (rowId: string) => {
    const rowState = rows.get(rowId);
    if (!rowState || !rowState.hasChanges || pendingSavesRef.current.has(rowId)) {
      return;
    }

    pendingSavesRef.current.add(rowId);

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
        setTimeout(() => setGlobalMessage(null), 3000);
      }
    } catch (error) {
      setGlobalMessage({
        type: 'error',
        text: `Fehler beim Speichern: ${error}`
      });
      setTimeout(() => setGlobalMessage(null), 3000);
    } finally {
      pendingSavesRef.current.delete(rowId);
    }
  }, [rows]);

  // Update row data
  const updateRowData = useCallback((rowId: string, field: keyof MarketData, value: any) => {
    setRows(prev => {
      const newRows = new Map(prev);
      const currentRow = newRows.get(rowId);
      
      if (currentRow) {
        const updatedData = { ...currentRow.data, [field]: value };
        
        newRows.set(rowId, {
          ...currentRow,
          data: updatedData,
          hasChanges: true,
          validationErrors: []
        });
        
        // Auto-save after 2 seconds if enabled
        if (autoSaveEnabled) {
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
  }, [autoSaveEnabled, saveRow]);

  // Get Primary Breadth Indicator style with complex rules
  const getPrimaryBreadthStyle = (rowState: RowState, fieldType: '4up' | '4down' | '5day' | '10day' | '25quarterUp' | '25quarterDown') => {
    const baseStyle = { ...styles.input };
    
    if (rowState.hasChanges) {
      baseStyle.borderColor = '#F59E0B';
      baseStyle.backgroundColor = '#FEF3C7';
      baseStyle.color = '#92400E';
      return baseStyle;
    }
    
    const data = rowState.data;
    
    // 4% up/down rules
    if (fieldType === '4up' || fieldType === '4down') {
      const upValue = data.stocks_up_4pct || 0;
      const downValue = data.stocks_down_4pct || 0;
      
      // Dark green if 4% up > 300
      if (fieldType === '4up' && upValue > 300) {
        baseStyle.backgroundColor = '#047857'; // Dark green
        baseStyle.color = 'white';
        baseStyle.fontWeight = '600';
      }
      // Dark pink if 4% down > 300
      else if (fieldType === '4down' && downValue > 300) {
        baseStyle.backgroundColor = '#E11D48'; // Dark pink/red
        baseStyle.color = 'white';
        baseStyle.fontWeight = '600';
      }
      // Light green if 4% up > 4% down
      else if (upValue > downValue) {
        baseStyle.backgroundColor = '#86EFAC'; // Light green
        baseStyle.color = '#166534';
      }
      // Light pink if 4% down > 4% up
      else if (downValue > upValue) {
        baseStyle.backgroundColor = '#FECDD3'; // Light pink
        baseStyle.color = '#991B1B';
      }
    }
    
    // 5 day ratio rules
    else if (fieldType === '5day') {
      const value = data.ratio_5day || 0;
      if (value > 2) {
        baseStyle.backgroundColor = '#86EFAC'; // Light green
        baseStyle.color = '#166534';
      } else if (value < 0.5) {
        baseStyle.backgroundColor = '#E11D48'; // Dark pink/red
        baseStyle.color = 'white';
        baseStyle.fontWeight = '600';
      }
    }
    
    // 10 day ratio rules
    else if (fieldType === '10day') {
      const value = data.ratio_10day || 0;
      if (value > 2) {
        baseStyle.backgroundColor = '#86EFAC'; // Light green
        baseStyle.color = '#166534';
      } else if (value < 0.5) {
        baseStyle.backgroundColor = '#E11D48'; // Dark pink/red
        baseStyle.color = 'white';
        baseStyle.fontWeight = '600';
      }
    }
    
    // 25% quarter up/down - special rules
    else if (fieldType === '25quarterUp' || fieldType === '25quarterDown') {
      const upValue = data.stocks_up_25pct_quarter || 0;
      const downValue = data.stocks_down_25pct_quarter || 0;
      
      // Green if 25% up > 25% down
      if (upValue > downValue) {
        baseStyle.backgroundColor = '#86EFAC'; // Light green
        baseStyle.color = '#166534';
      }
      // Dark pink if 25% down > 25% up
      else if (downValue > upValue) {
        baseStyle.backgroundColor = '#E11D48'; // Dark pink/red
        baseStyle.color = 'white';
        baseStyle.fontWeight = '600';
      }
    }
    
    return baseStyle;
  };

  // Get input style based on state and value with color coding like Excel
  const getInputStyle = (rowState: RowState, value: number | null, type: 'primary' | 'secondary' | 't2108' = 'secondary') => {
    const baseStyle = { ...styles.input };
    
    if (rowState.hasChanges) {
      baseStyle.borderColor = '#F59E0B';
      baseStyle.backgroundColor = '#FEF3C7';
      baseStyle.color = '#92400E';
    } else if (value !== null && value > 0) {
      // Special color coding for T2108
      if (type === 't2108') {
        if (value > 100) {
          baseStyle.backgroundColor = '#EF4444'; // Red for values > 100
          baseStyle.color = 'white';
          baseStyle.fontWeight = '600';
        } else if (value < 20) {
          baseStyle.backgroundColor = '#22C55E'; // Green for values < 20
          baseStyle.color = 'white';
          baseStyle.fontWeight = '600';
        }
        // No background color for values between 20-100
      } else if (type === 'primary') {
        // For primary indicators - high values are good (green), low values are bad (red)
        if (value >= 200) {
          baseStyle.backgroundColor = '#22C55E'; // Bright green for very high values
          baseStyle.color = 'white';
          baseStyle.fontWeight = '600';
        } else if (value >= 100) {
          baseStyle.backgroundColor = '#84CC16'; // Light green for high values
          baseStyle.color = 'white';
        } else if (value >= 50) {
          baseStyle.backgroundColor = '#FDE047'; // Yellow for medium values
          baseStyle.color = '#92400E';
        } else if (value >= 20) {
          baseStyle.backgroundColor = '#FB923C'; // Orange for low values
          baseStyle.color = 'white';
        } else {
          baseStyle.backgroundColor = '#EF4444'; // Red for very low values
          baseStyle.color = 'white';
          baseStyle.fontWeight = '600';
        }
      } else {
        // For secondary indicators
        if (value >= 2000) {
          baseStyle.backgroundColor = '#22C55E';
          baseStyle.color = 'white';
          baseStyle.fontWeight = '600';
        } else if (value >= 1000) {
          baseStyle.backgroundColor = '#84CC16';
          baseStyle.color = 'white';
        } else if (value >= 100) {
          baseStyle.backgroundColor = '#FDE047';
          baseStyle.color = '#92400E';
        } else if (value >= 50) {
          baseStyle.backgroundColor = '#FB923C';
          baseStyle.color = 'white';
        } else {
          baseStyle.backgroundColor = '#EF4444';
          baseStyle.color = 'white';
        }
      }
    }
    
    return baseStyle;
  };

  // Get Secondary Breadth Indicator style with complex rules
  const getSecondaryBreadthStyle = (rowState: RowState, fieldType: '25monthUp' | '25monthDown' | '50up' | '50down' | '13up' | '13down') => {
    const baseStyle = { ...styles.input };
    
    if (rowState.hasChanges) {
      baseStyle.borderColor = '#F59E0B';
      baseStyle.backgroundColor = '#FEF3C7';
      baseStyle.color = '#92400E';
      return baseStyle;
    }
    
    const data = rowState.data;
    
    // 25% month up/down rules
    if (fieldType === '25monthUp' || fieldType === '25monthDown') {
      const upValue = data.stocks_up_25pct_month || 0;
      const downValue = data.stocks_down_25pct_month || 0;
      
      // Green if 25% up > 25% down
      if (upValue > downValue) {
        baseStyle.backgroundColor = '#86EFAC'; // Light green
        baseStyle.color = '#166534';
      }
      // Dark pink if 25% down > 25% up
      else if (downValue > upValue) {
        baseStyle.backgroundColor = '#E11D48'; // Dark pink/red
        baseStyle.color = 'white';
        baseStyle.fontWeight = '600';
      }
    }
    
    // 50% up rules - dark pink if > 20
    else if (fieldType === '50up') {
      const value = data.stocks_up_50pct_month || 0;
      if (value > 20) {
        baseStyle.backgroundColor = '#E11D48'; // Dark pink/red
        baseStyle.color = 'white';
        baseStyle.fontWeight = '600';
      }
      // Otherwise colorless (default style)
    }
    
    // 50% down rules - green if > 20
    else if (fieldType === '50down') {
      const value = data.stocks_down_50pct_month || 0;
      if (value > 20) {
        baseStyle.backgroundColor = '#22C55E'; // Green
        baseStyle.color = 'white';
        baseStyle.fontWeight = '600';
      }
      // Otherwise colorless (default style)
    }
    
    // 13% in 34 days up/down rules
    else if (fieldType === '13up' || fieldType === '13down') {
      const upValue = data.stocks_up_13pct_34days || 0;
      const downValue = data.stocks_down_13pct_34days || 0;
      
      // Green if 13% up > 13% down
      if (upValue > downValue) {
        baseStyle.backgroundColor = '#86EFAC'; // Light green
        baseStyle.color = '#166534';
      }
      // Dark pink if 13% down > 13% up
      else if (downValue > upValue) {
        baseStyle.backgroundColor = '#E11D48'; // Dark pink/red
        baseStyle.color = 'white';
        baseStyle.fontWeight = '600';
      }
    }
    
    return baseStyle;
  };

  // Get score indicator style
  const getScoreStyle = (score: number | null) => {
    const baseStyle = { ...styles.scoreIndicator };
    
    if (!score) {
      baseStyle.backgroundColor = '#F1F5F9';
      baseStyle.color = '#64748B';
      return baseStyle;
    }
    
    if (score >= 60) {
      baseStyle.backgroundColor = '#DCFCE7';
      baseStyle.color = '#166534';
    } else if (score <= 40) {
      baseStyle.backgroundColor = '#FEE2E2';
      baseStyle.color = '#991B1B';
    } else {
      baseStyle.backgroundColor = '#FEF3C7';
      baseStyle.color = '#92400E';
    }
    
    return baseStyle;
  };

  const sortedRows = useMemo(() => {
    return Array.from(rows.entries()).sort(([a, aRow], [b, bRow]) => {
      // Sort by date descending (newest first, like Excel)
      return bRow.data.date.localeCompare(aRow.data.date);
    });
  }, [rows]);

  // Modal handlers
  const openAddModal = () => {
    console.log('Opening add modal...');
    setModalMode('add');
    setEditingRow(null);
    setShowModal(true);
    console.log('Modal state set to true');
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

      // Update local state with new/updated row
      const rowId = `${selectedYear}-${result.data.date}`;
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

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1E293B', margin: 0 }}>
            📊 Daten verwalten
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
            Moderne Tabelle mit intelligentem Auto-Save
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          <button
            onClick={openAddModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            <Plus size={14} />
            New
          </button>
        </div>
      </div>

      {/* Global Message */}
      {globalMessage && (
        <div style={{
          margin: '0 32px 24px 32px',
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: globalMessage.type === 'success' ? '#DCFCE7' : 
                          globalMessage.type === 'error' ? '#FEE2E2' : '#DBEAFE',
          color: globalMessage.type === 'success' ? '#166534' : 
                 globalMessage.type === 'error' ? '#991B1B' : '#1E40AF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{globalMessage.text}</span>
          <button
            onClick={() => setGlobalMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Data Table */}
      {isLoading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '64px',
          color: '#64748B'
        }}>
          <Loader size={24} style={{ marginRight: '12px', animation: 'spin 1s linear infinite' }} />
          Lade Daten...
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                {/* Main Category Headers */}
                <tr style={{ backgroundColor: '#1E293B', color: 'white' }}>
                  <th style={{ 
                    position: 'sticky',
                    left: 0,
                    backgroundColor: '#1E293B',
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: '700',
                    borderRight: '1px solid #334155',
                    width: '120px'
                  }}>
                    Date
                  </th>
                  <th style={{ 
                    padding: '8px 4px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: '#00D4AA',
                    color: 'black'
                  }} colSpan={6}>
                    Primary Breadth Indicators
                  </th>
                  <th style={{ 
                    padding: '8px 4px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: '#FFD700',
                    color: 'black'
                  }} colSpan={6}>
                    Secondary Breadth Indicators
                  </th>
                  <th style={{ 
                    padding: '8px 4px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: '#E5E7EB',
                    color: 'black'
                  }} colSpan={7}>
                    {/* No header for these columns */}
                  </th>
                  <th style={{ 
                    position: 'sticky',
                    right: 0,
                    backgroundColor: '#1E293B',
                    padding: '8px 12px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    borderLeft: '1px solid #334155',
                    width: '120px'
                  }}>
                    Actions
                  </th>
                </tr>
                
                
                {/* Field Names */}
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ 
                    position: 'sticky',
                    left: 0,
                    backgroundColor: '#F1F5F9',
                    padding: '4px 12px',
                    borderRight: '1px solid #E2E8F0'
                  }}></th>
                  {/* PRIMARY BREADTH INDICATORS */}
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#059669', fontWeight: '600' }}>4% up</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#DC2626', fontWeight: '600' }}>4% down</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#059669', fontWeight: '600' }}>5 day ratio</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#DC2626', fontWeight: '600' }}>10 day ratio</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#059669', fontWeight: '600' }}>25% up in a quarter</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#DC2626', fontWeight: '600' }}>25% down in a quarter</th>
                  
                  {/* SECONDARY BREADTH INDICATORS */}
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#059669', fontWeight: '600' }}>25% up in a month</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#DC2626', fontWeight: '600' }}>25% down in a month</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#059669', fontWeight: '600' }}>50% up in a month</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#DC2626', fontWeight: '600' }}>50% down in a month</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#059669', fontWeight: '600' }}>13% up in 34 days</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#DC2626', fontWeight: '600' }}>13% down in 34 days</th>
                  
                  {/* NO HEADER GROUP */}
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#64748B', fontWeight: '600' }}>Stock Universe</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#64748B', fontWeight: '600' }}>T2108</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#059669', fontWeight: '600' }}>20% up</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#DC2626', fontWeight: '600' }}>20% down</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#059669', fontWeight: '600' }}>$20 up</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#DC2626', fontWeight: '600' }}>$20 down</th>
                  <th style={{ padding: '4px 2px', fontSize: '9px', color: '#64748B', fontWeight: '600' }}>S&P</th>
                  <th style={{ 
                    position: 'sticky',
                    right: 0,
                    backgroundColor: '#F1F5F9',
                    padding: '4px 12px',
                    borderLeft: '1px solid #E2E8F0'
                  }}></th>
                </tr>
              </thead>
              
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={20} style={{ 
                      padding: '48px',
                      textAlign: 'center',
                      color: '#64748B',
                      fontSize: '14px'
                    }}>
                      Keine Daten für {selectedYear} gefunden
                    </td>
                  </tr>
                ) : (
                  sortedRows.map(([rowId, rowState]) => (
                    <tr 
                      key={rowId} 
                      style={{ 
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: rowState.hasChanges ? '#FEF3C7' : 'white',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!rowState.hasChanges) {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!rowState.hasChanges) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      {/* Date */}
                      <td style={{ 
                        position: 'sticky',
                        left: 0,
                        backgroundColor: rowState.hasChanges ? '#FEF3C7' : 'white',
                        padding: '8px 12px',
                        borderRight: '1px solid #E2E8F0',
                        fontWeight: '500',
                        color: '#1E293B',
                        width: '120px'
                      }}>
                        <input
                          type="date"
                          value={rowState.data.date}
                          onChange={(e) => updateRowData(rowId, 'date', e.target.value)}
                          style={{ 
                            width: '120px',
                            fontSize: '10px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            padding: '2px 0',
                            fontWeight: '500'
                          }}
                        />
                      </td>
                      
                      {/* PRIMARY BREADTH INDICATORS */}
                      
                      {/* 4% Up Daily - PRIMARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_up_4pct || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_up_4pct', e.target.value ? Number(e.target.value) : null)}
                          style={getPrimaryBreadthStyle(rowState, '4up')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* 4% Down Daily - PRIMARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_down_4pct || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_down_4pct', e.target.value ? Number(e.target.value) : null)}
                          style={getPrimaryBreadthStyle(rowState, '4down')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* 5-Day Ratio - PRIMARY (calculated field) */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <div style={{...getPrimaryBreadthStyle(rowState, '5day'), fontSize: '11px', padding: '2px 6px', borderRadius: '3px'}}>
                          {rowState.data.ratio_5day ? rowState.data.ratio_5day.toFixed(2) : '-'}
                        </div>
                      </td>
                      
                      {/* 10-Day Ratio - PRIMARY (calculated field) */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <div style={{...getPrimaryBreadthStyle(rowState, '10day'), fontSize: '11px', padding: '2px 6px', borderRadius: '3px'}}>
                          {rowState.data.ratio_10day ? rowState.data.ratio_10day.toFixed(2) : '-'}
                        </div>
                      </td>
                      
                      {/* 25% Up (quarter) - PRIMARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_up_25pct_quarter || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_up_25pct_quarter', e.target.value ? Number(e.target.value) : null)}
                          style={getPrimaryBreadthStyle(rowState, '25quarterUp')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* 25% Down (quarter) - PRIMARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_down_25pct_quarter || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_down_25pct_quarter', e.target.value ? Number(e.target.value) : null)}
                          style={getPrimaryBreadthStyle(rowState, '25quarterDown')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* SECONDARY BREADTH INDICATORS */}
                      
                      {/* 25% Up (month) - SECONDARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_up_25pct_month || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_up_25pct_month', e.target.value ? Number(e.target.value) : null)}
                          style={getSecondaryBreadthStyle(rowState, '25monthUp')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* 25% Down (month) - SECONDARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_down_25pct_month || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_down_25pct_month', e.target.value ? Number(e.target.value) : null)}
                          style={getSecondaryBreadthStyle(rowState, '25monthDown')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* 50% Up (month) - SECONDARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_up_50pct_month || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_up_50pct_month', e.target.value ? Number(e.target.value) : null)}
                          style={getSecondaryBreadthStyle(rowState, '50up')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* 50% Down (month) - SECONDARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_down_50pct_month || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_down_50pct_month', e.target.value ? Number(e.target.value) : null)}
                          style={getSecondaryBreadthStyle(rowState, '50down')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* 13% Up (34 days) - SECONDARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_up_13pct_34days || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_up_13pct_34days', e.target.value ? Number(e.target.value) : null)}
                          style={getSecondaryBreadthStyle(rowState, '13up')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* 13% Down (34 days) - SECONDARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_down_13pct_34days || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_down_13pct_34days', e.target.value ? Number(e.target.value) : null)}
                          style={getSecondaryBreadthStyle(rowState, '13down')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* Worden Common Universe - NEUTRAL */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.worden_universe || ''}
                          onChange={(e) => updateRowData(rowId, 'worden_universe', e.target.value ? Number(e.target.value) : null)}
                          style={styles.input}
                          placeholder="6000"
                        />
                      </td>
                      
                      {/* T2108 - SECONDARY with special color coding */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={rowState.data.t2108 || ''}
                          onChange={(e) => updateRowData(rowId, 't2108', e.target.value ? Number(e.target.value) : null)}
                          style={getInputStyle(rowState, rowState.data.t2108, 't2108')}
                          placeholder="50.00"
                        />
                      </td>
                      
                      {/* 20% Up (65 days) - SECONDARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_up_20pct || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_up_20pct', e.target.value ? Number(e.target.value) : null)}
                          style={getInputStyle(rowState, rowState.data.stocks_up_20pct, 'secondary')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* 20% Down (65 days) - SECONDARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_down_20pct || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_down_20pct', e.target.value ? Number(e.target.value) : null)}
                          style={getInputStyle(rowState, rowState.data.stocks_down_20pct, 'secondary')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* $20 Up (65 days) - SECONDARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_up_20dollar || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_up_20dollar', e.target.value ? Number(e.target.value) : null)}
                          style={getInputStyle(rowState, rowState.data.stocks_up_20dollar, 'secondary')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* $20 Down (65 days) - SECONDARY */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={rowState.data.stocks_down_20dollar || ''}
                          onChange={(e) => updateRowData(rowId, 'stocks_down_20dollar', e.target.value ? Number(e.target.value) : null)}
                          style={getInputStyle(rowState, rowState.data.stocks_down_20dollar, 'secondary')}
                          placeholder="0"
                        />
                      </td>
                      
                      {/* S&P 500 - NEUTRAL */}
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                        <input
                          type="text"
                          value={rowState.data.sp500 || ''}
                          onChange={(e) => updateRowData(rowId, 'sp500', e.target.value || null)}
                          style={styles.input}
                          placeholder="5900.00"
                        />
                      </td>
                      
                      {/* Actions */}
                      <td style={{ 
                        position: 'sticky',
                        right: 0,
                        backgroundColor: rowState.hasChanges ? '#FEF3C7' : 'white',
                        padding: '6px 12px',
                        textAlign: 'center',
                        borderLeft: '1px solid #E2E8F0',
                        width: '120px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => openEditModal(rowState.data)}
                            style={{
                              padding: '3px 8px',
                              backgroundColor: '#6B7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              fontFamily: 'inherit'
                            }}
                            title="Edit all fields"
                          >
                            Edit
                          </button>
                          
                          {rowState.isSaving ? (
                            <Loader size={14} style={{ color: '#3B82F6', animation: 'spin 1s linear infinite' }} />
                          ) : rowState.hasChanges ? (
                            <button
                              onClick={() => saveRow(rowId)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '3px 8px',
                                backgroundColor: '#10B981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                fontFamily: 'inherit'
                              }}
                            >
                              <Save size={11} />
                              Save
                            </button>
                          ) : (
                            <Check size={14} style={{ color: '#10B981' }} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#64748B'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span>⚡ Auto-Save: {autoSaveEnabled ? 'ON' : 'OFF'}</span>
              <span>📊 Zeilen: {sortedRows.length}</span>
              <span>🔄 Letztes Update: vor 2min</span>
            </div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                style={{ accentColor: '#3B82F6' }}
              />
              Auto-Save aktivieren
            </label>
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

export default EnhancedDataTable;