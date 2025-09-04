import React, { memo, useMemo, useCallback } from 'react';

interface VirtualizedTableProps {
  data: any[];
  columns: any[];
  itemHeight: number;
  containerHeight: number;
  onCellEdit?: (id: number, column: string, value: string) => void;
  editingCell?: {row: number, column: string} | null;
  editValue?: string;
  onEditValueChange?: (value: string) => void;
  onEditStart?: (rowIndex: number, column: string, currentValue: any) => void;
  onEditCancel?: () => void;
}

// Virtual scrolling for large datasets
export const VirtualizedTable = memo<VirtualizedTableProps>(({
  data,
  columns,
  itemHeight = 48,
  containerHeight = 600,
  onCellEdit,
  editingCell,
  editValue,
  onEditValueChange,
  onEditStart,
  onEditCancel
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 2, // Buffer rows
      data.length
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, data.length]);

  const visibleItems = useMemo(() => {
    return data.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [data, visibleRange]);

  const totalHeight = data.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleCellClick = useCallback((rowIndex: number, column: string, value: any) => {
    onEditStart?.(visibleRange.startIndex + rowIndex, column, value);
  }, [onEditStart, visibleRange.startIndex]);

  const handleCellSave = useCallback((id: number, column: string, value: string) => {
    onCellEdit?.(id, column, value);
  }, [onCellEdit]);

  return (
    <div className="relative overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 sticky top-0 z-10">
        <div className="flex">
          {columns.map((column) => (
            <div
              key={column.key}
              className={`${column.width} px-3 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider`}
            >
              {column.label}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {visibleItems.map((row, index) => {
              const actualRowIndex = visibleRange.startIndex + index;
              return (
                <div
                  key={row.id || actualRowIndex}
                  className="flex hover:bg-gray-800/50 transition-colors border-b border-gray-800"
                  style={{ height: itemHeight }}
                >
                  {columns.map((column) => {
                    const value = row[column.key];
                    const isEditing = editingCell?.row === actualRowIndex && editingCell?.column === column.key;
                    
                    return (
                      <div
                        key={column.key}
                        className={`${column.width} px-3 py-3 text-sm flex items-center`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type={column.type === 'number' ? 'number' : 'text'}
                              value={editValue || ''}
                              onChange={(e) => onEditValueChange?.(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellSave(row.id, column.key, editValue || '');
                                } else if (e.key === 'Escape') {
                                  onEditCancel?.();
                                }
                              }}
                              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm w-full focus:ring-2 focus:ring-orange-500"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div
                            className={`${getValueColor(value, column.colorCode)} ${
                              column.editable ? 'cursor-pointer hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 -my-1 w-full' : ''
                            } transition-colors`}
                            onClick={() => column.editable && handleCellClick(index, column.key, value)}
                          >
                            {value === null || value === undefined ? (
                              <span className="text-gray-500">-</span>
                            ) : (
                              column.type === 'number' && typeof value === 'number' && column.precision 
                                ? value.toFixed(column.precision)
                                : value.toString()
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

// Helper function (same as in OptimizedTableCell)
const getValueColor = (value: number | null, colorCode?: string): string => {
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

VirtualizedTable.displayName = 'VirtualizedTable';
