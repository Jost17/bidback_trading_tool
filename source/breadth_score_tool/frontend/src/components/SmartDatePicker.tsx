import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, AlertCircle } from 'lucide-react';

interface SmartDatePickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  className?: string;
}

interface AvailableDatesResponse {
  dates: string[];
  count: number;
  earliest: string;
  latest: string;
}

export const SmartDatePicker: React.FC<SmartDatePickerProps> = ({
  selectedDate,
  onDateChange,
  className = ""
}) => {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDateValid, setIsDateValid] = useState(true);

  // Load available dates from API
  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:3001/api/available-dates');
        if (!response.ok) {
          throw new Error('Failed to fetch available dates');
        }
        const data: AvailableDatesResponse = await response.json();
        setAvailableDates(data.dates);
        setError(null);
      } catch (err) {
        setError('Failed to load available dates');
        console.error('Error fetching available dates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableDates();
  }, []);

  // Validate current date whenever selectedDate or availableDates change
  useEffect(() => {
    if (availableDates.length > 0) {
      const isValid = availableDates.includes(selectedDate);
      setIsDateValid(isValid);
    }
  }, [selectedDate, availableDates]);

  const getCurrentDateIndex = (): number => {
    return availableDates.findIndex(date => date === selectedDate);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const currentIndex = getCurrentDateIndex();
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'prev') {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(availableDates.length - 1, currentIndex + 1);
    }

    if (newIndex !== currentIndex) {
      onDateChange(availableDates[newIndex]);
    }
  };

  const handleDateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value;
    onDateChange(newDate);
  };

  const canNavigate = (direction: 'prev' | 'next'): boolean => {
    const currentIndex = getCurrentDateIndex();
    if (currentIndex === -1) return false;

    if (direction === 'prev') {
      return currentIndex > 0;
    } else {
      return currentIndex < availableDates.length - 1;
    }
  };

  const formatDisplayDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('de-DE', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getDateInfo = (): string => {
    if (availableDates.length === 0) return '';
    
    const currentIndex = getCurrentDateIndex();
    if (currentIndex === -1) return '';
    
    return `${currentIndex + 1} von ${availableDates.length} verfügbaren Daten`;
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="text-sm text-gray-600">Lade Daten...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-red-600 ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Date Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigateDate('prev')}
          disabled={!canNavigate('prev')}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Vorheriges Datum"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 relative">
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateInputChange}
            className={`
              w-full px-3 py-2 border rounded-lg text-center font-mono
              ${isDateValid 
                ? 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                : 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              }
              transition-colors
            `}
          />
          <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        <button
          onClick={() => navigateDate('next')}
          disabled={!canNavigate('next')}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Nächstes Datum"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Date Display & Info */}
      <div className="flex items-center justify-between text-sm">
        <span className={`font-medium ${isDateValid ? 'text-gray-700' : 'text-red-600'}`}>
          {formatDisplayDate(selectedDate)}
        </span>
        
        {isDateValid ? (
          <span className="text-gray-500">
            {getDateInfo()}
          </span>
        ) : (
          <span className="text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Datum nicht verfügbar
          </span>
        )}
      </div>

      {/* Error Message for Invalid Date */}
      {!isDateValid && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            Das gewählte Datum ist nicht verfügbar. Bitte wählen Sie eines der verfügbaren Daten zwischen {availableDates[0]} und {availableDates[availableDates.length - 1]}.
          </p>
        </div>
      )}

      {/* Quick Jump Options */}
      {isDateValid && (
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => onDateChange(availableDates[0])}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
          >
            Erstes Datum
          </button>
          <button
            onClick={() => onDateChange(availableDates[availableDates.length - 1])}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
          >
            Neuestes Datum
          </button>
        </div>
      )}
    </div>
  );
};

export default SmartDatePicker;