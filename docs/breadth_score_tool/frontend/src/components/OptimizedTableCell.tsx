import React, { memo, useMemo } from 'react';

interface OptimizedTableCellProps {
  value: any;
  column: {
    key: string;
    type: string;
    colorCode?: string;
    precision?: number;
    editable: boolean;
  };
  isEditing: boolean;
  editValue: string;
  onEdit: (value: any) => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  onEditValueChange: (value: string) => void;
}

// Memoized cell component to prevent unnecessary re-renders
export const OptimizedTableCell = memo<OptimizedTableCellProps>(({
  value,
  column,
  isEditing,
  editValue,
  onEdit,
  onSave,
  onCancel,
  onEditValueChange
}) => {
  const { displayValue, colorClass, bgClass } = useMemo(() => {
    const displayValue = column.type === 'number' && typeof value === 'number' && column.precision 
      ? value.toFixed(column.precision)
      : value?.toString() || '';
    
    const colorClass = getValueColor(value as number, column.colorCode || 'neutral');
    const bgClass = getCellBackground(value as number, column.colorCode || 'neutral');
    
    return { displayValue, colorClass, bgClass };
  }, [value, column.type, column.precision, column.colorCode]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type={column.type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave(editValue);
            else if (e.key === 'Escape') onCancel();
          }}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          autoFocus
        />
        <button onClick={() => onSave(editValue)} className="text-green-500 hover:text-green-400">
          <SaveIcon className="h-4 w-4" />
        </button>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-400">
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`${colorClass} ${column.editable ? 'cursor-pointer hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 -my-1' : ''} transition-colors`}
      onClick={() => column.editable && onEdit(value)}
    >
      {value === null || value === undefined ? (
        <span className="text-gray-500">-</span>
      ) : (
        displayValue
      )}
    </div>
  );
});

// Helper functions moved outside component to prevent recreation
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

// Icon components to prevent imports in every cell
const SaveIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const XIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
