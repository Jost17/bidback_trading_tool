import React, { useState } from 'react';
import { Upload, X, Save, Camera, FileText, Edit3, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import ScreenshotDataEntry from './ScreenshotDataEntry';

interface MarketDataInput {
  date: string;
  stocks_up_4pct: string;
  stocks_down_4pct: string;
  stocks_up_25pct_quarter: string;
  stocks_down_25pct_quarter: string;
  stocks_up_25pct_month: string;
  stocks_down_25pct_month: string;
  stocks_up_50pct_month: string;
  stocks_down_50pct_month: string;
  stocks_up_13pct_34days: string;
  stocks_down_13pct_34days: string;
  worden_universe: string;
  sp500: string;
  t2108: string;
  stocks_up_20pct: string;
  stocks_down_20pct: string;
  stocks_up_20dollar: string;
  stocks_down_20dollar: string;
}

interface EnhancedDataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EnhancedDataImportModal: React.FC<EnhancedDataImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'screenshot' | 'manual' | 'csv'>('screenshot');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleScreenshotDataSubmit = async (data: MarketDataInput) => {
    setLoading(true);
    setError(null);
    
    try {
      // Convert empty strings to null for API
      const dataToSubmit = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      );

      const response = await fetch('http://localhost:3001/api/market-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      setSuccess('Screenshot-Daten erfolgreich gespeichert!');
      setTimeout(() => {
        onSuccess();
      }, 1500);
      
    } catch (error) {
      console.error('Screenshot submission error:', error);
      setError(error instanceof Error ? error.message : 'Fehler beim Speichern der Screenshot-Daten');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    if (activeTab === 'screenshot') {
      return (
        <ScreenshotDataEntry
          onDataExtracted={(data) => {
            handleScreenshotDataSubmit(data);
          }}
          onError={(errorMsg) => {
            setError(errorMsg);
            setSuccess(null);
          }}
        />
      );
    }

    // Placeholder for manual and CSV tabs
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {activeTab === 'manual' ? 'Manuelle Eingabe' : 'CSV Import'}
        </h3>
        <p className="text-gray-600 mb-8">
          Diese Funktion wird in Kürze verfügbar sein.
          <br />
          Nutzen Sie vorerst die Screenshot-Funktion für die Dateneingabe.
        </p>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="h-6 w-6 text-blue-600" />
            Trading Tool - Daten hinzufügen
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('screenshot')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'screenshot'
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Camera className="h-4 w-4" />
            Screenshot (OCR)
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'manual'
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Edit3 className="h-4 w-4" />
            Manuelle Eingabe
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'csv'
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            CSV Import
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {renderTabContent()}

          {/* Status Messages */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Fehler</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Erfolg</span>
              </div>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          )}

          {loading && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="font-medium">Verarbeitung läuft...</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Die Daten werden verarbeitet und gespeichert.
              </p>
            </div>
          )}
        </div>

        {/* Footer - Show close button for non-screenshot tabs */}
        {activeTab !== 'screenshot' && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Schließen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedDataImportModal;