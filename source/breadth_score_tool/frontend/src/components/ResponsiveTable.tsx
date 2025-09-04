import React, { memo, useMemo } from 'react';
import { useResponsive } from './ResponsiveComponents';

interface ResponsiveTableProps {
  data: any[];
  columns: any[];
  onCellEdit?: (id: number, column: string, value: string) => void;
  editingCell?: {row: number, column: string} | null;
  editValue?: string;
  onEditValueChange?: (value: string) => void;
  onEditStart?: (rowIndex: number, column: string, currentValue: any) => void;
  onEditCancel?: () => void;
  onSort?: (column: string) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export const ResponsiveTable = memo<ResponsiveTableProps>(({
  data,
  columns,
  onCellEdit,
  editingCell,
  editValue,
  onEditValueChange,
  onEditStart,
  onEditCancel,
  onSort,
  sortColumn,
  sortDirection
}) => {
  const { isMobile, isTablet } = useResponsive();
  
  // Mobile: Show only essential columns
  const visibleColumns = useMemo(() => {
    if (isMobile) {
      return columns.filter(col => 
        ['date', 'stocks_up_4pct', 'stocks_down_4pct', 't2108', 'breadth_score'].includes(col.key)
      );
    }
    if (isTablet) {
      return columns.filter(col => 
        !['stocks_up_20pct', 'stocks_down_20pct', 'stocks_up_20dollar', 'stocks_down_20dollar'].includes(col.key)
      );
    }
    return columns;
  }, [columns, isMobile, isTablet]);

  if (isMobile) {
    // Mobile: Card-based layout
    return (
      <div className="space-y-3">
        {data.map((row, index) => (
          <div 
            key={row.id || index}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-300">{row.date}</span>
              {row.breadth_score && (
                <span className={`text-lg font-bold ${getScoreColor(row.breadth_score)}`}>
                  {row.breadth_score.toFixed(1)}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400 block text-xs">4% Up</span>
                <span className="text-green-400 font-semibold">
                  {row.stocks_up_4pct || '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">4% Down</span>
                <span className="text-red-400 font-semibold">
                  {row.stocks_down_4pct || '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">T2108</span>
                <span className="text-orange-400 font-semibold">
                  {row.t2108 || '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Universe</span>
                <span className="text-gray-200">
                  {row.worden_universe || '-'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Tablet/Desktop: Table layout with horizontal scroll
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max">
        <thead className="bg-gray-800 sticky top-0">
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={column.key}
                className={`
                  px-3 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider
                  cursor-pointer hover:bg-gray-700 transition-colors
                  ${isTablet ? 'px-2 py-3 text-xs' : 'px-3 py-4'}
                `}
                onClick={() => onSort?.(column.key)}
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
          {data.map((row, rowIndex) => (
            <tr key={row.id} className="hover:bg-gray-800/50 transition-colors">
              {visibleColumns.map((column) => {
                const value = row[column.key];
                const isEditing = editingCell?.row === rowIndex && editingCell?.column === column.key;
                const displayValue = column.type === 'number' && typeof value === 'number' && column.precision 
                  ? value.toFixed(column.precision)
                  : value?.toString() || '';
                
                return (
                  <td
                    key={column.key}
                    className={`
                      px-3 py-4 text-sm transition-colors
                      ${isTablet ? 'px-2 py-3 text-xs' : 'px-3 py-4 text-sm'}
                      ${getCellBackground(value as number, column.colorCode || 'neutral')}
                    `}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type={column.type === 'number' ? 'number' : 'text'}
                          value={editValue || ''}
                          onChange={(e) => onEditValueChange?.(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onCellEdit?.(row.id!, column.key, editValue || '');
                            } else if (e.key === 'Escape') {
                              onEditCancel?.();
                            }
                          }}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div 
                        className={`
                          ${getValueColor(value as number, column.colorCode || 'neutral')} 
                          ${column.editable ? 'cursor-pointer hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 -my-1' : ''} 
                          transition-colors
                        `}
                        onClick={() => column.editable && onEditStart?.(rowIndex, column.key, value)}
                      >
                        {value === null || value === undefined ? (
                          <span className="text-gray-500">-</span>
                        ) : (
                          displayValue
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
    </div>
  );
});

// Helper functions
const getScoreColor = (score: number): string => {
  if (score >= 60) return 'text-green-400';
  if (score <= 40) return 'text-red-400';
  return 'text-orange-400';
};

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

ResponsiveTable.displayName = 'ResponsiveTable';
