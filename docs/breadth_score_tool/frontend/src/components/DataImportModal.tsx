import React, { useState } from 'react';
import { Upload, Calculator, Save, X, Check, AlertCircle, FileText, Edit3, Camera } from 'lucide-react';
import ScreenshotDataEntry from './ScreenshotDataEntry';

interface MarketDataInput {
  date: string;
  stocks_up_20pct: string;
  stocks_down_20pct: string;
  stocks_up_20dollar: string;
  stocks_down_20dollar: string;
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
  sp500: string;
  t2108: string;
  worden_universe: string;
}

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'screenshot'>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState<MarketDataInput>({
    date: new Date().toISOString().split('T')[0],
    stocks_up_20pct: '',
    stocks_down_20pct: '',
    stocks_up_20dollar: '',
    stocks_down_20dollar: '',
    stocks_up_4pct: '',
    stocks_down_4pct: '',
    stocks_up_25pct_quarter: '',
    stocks_down_25pct_quarter: '',
    stocks_up_25pct_month: '',
    stocks_down_25pct_month: '',
    stocks_up_50pct_month: '',
    stocks_down_50pct_month: '',
    stocks_up_13pct_34days: '',
    stocks_down_13pct_34days: '',
    sp500: '',
    t2108: '',
    worden_universe: ''
  });

  // Separate field groups
  const manualOnlyFields = {
    stocks_up_20pct: '20% Up',
    stocks_down_20pct: '20% Down', 
    stocks_up_20dollar: '20$ Up',
    stocks_down_20dollar: '20$ Down'
  };

  const standardFields = {
    date: 'Datum',
    stocks_up_4pct: '4% Up',
    stocks_down_4pct: '4% Down',
    stocks_up_25pct_quarter: '25% Up (Quarter)',
    stocks_down_25pct_quarter: '25% Down (Quarter)',
    stocks_up_25pct_month: '25% Up (Month)',
    stocks_down_25pct_month: '25% Down (Month)',
    stocks_up_50pct_month: '50% Up (Month)',
    stocks_down_50pct_month: '50% Down (Month)',
    stocks_up_13pct_34days: '13% Up (34 Days)',
    stocks_down_13pct_34days: '13% Down (34 Days)',
    sp500: 'S&P 500',
    t2108: 'T2108',
    worden_universe: 'Worden Universe'
  };

  const allFields = { ...standardFields, ...manualOnlyFields };

  const handleInputChange = (field: keyof MarketDataInput, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
    setSuccess(null);
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.date) {
      errors.push('Datum ist erforderlich');
    }
    
    // Check if at least some fields are filled
    const numericFields = Object.keys(formData).filter(key => key !== 'date') as (keyof MarketDataInput)[];
    const filledFields = numericFields.filter(field => formData[field] && formData[field].trim() !== '');
    
    if (filledFields.length === 0) {
      errors.push('Mindestens ein Datenfeld muss ausgefüllt werden');
    }
    
    // Validate numeric fields
    numericFields.forEach(field => {
      const value = formData[field].trim();
      if (value && isNaN(parseFloat(value))) {
        errors.push(`${allFields[field]} muss eine Zahl sein`);
      }
      if (value && parseFloat(value) < 0) {
        errors.push(`${allFields[field]} muss nicht-negativ sein`);
      }
    });
    
    // Special validation for T2108 (0-100)
    if (formData.t2108.trim()) {
      const t2108Value = parseFloat(formData.t2108);
      if (!isNaN(t2108Value) && (t2108Value < 0 || t2108Value > 100)) {
        errors.push('T2108 muss zwischen 0 und 100 liegen');
      }
    }
    
    return errors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Convert empty strings to null for API
      const dataToSubmit = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key, 
          key === 'date' ? value : (value.trim() === '' ? null : parseFloat(value))
        ])
      );

      const response = await fetch('http://localhost:3001/api/market-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern der Daten');
      }

      const result = await response.json();
      setSuccess(`Daten erfolgreich gespeichert! ${result.calculations?.ratio_5day ? `5-Tage-Ratio: ${result.calculations.ratio_5day.toFixed(2)}` : ''} ${result.calculations?.ratio_10day ? `10-Tage-Ratio: ${result.calculations.ratio_10day.toFixed(2)}` : ''}`);
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        stocks_up_20pct: '',
        stocks_down_20pct: '',
        stocks_up_20dollar: '',
        stocks_down_20dollar: '',
        stocks_up_4pct: '',
        stocks_down_4pct: '',
        stocks_up_25pct_quarter: '',
        stocks_down_25pct_quarter: '',
        stocks_up_25pct_month: '',
        stocks_down_25pct_month: '',
        stocks_up_50pct_month: '',
        stocks_down_50pct_month: '',
        stocks_up_13pct_34days: '',
        stocks_down_13pct_34days: '',
        sp500: '',
        t2108: '',
        worden_universe: ''
      });
      
      // Notify parent component
      setTimeout(() => {
        onSuccess();
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = async () => {
    if (!csvFile) {
      setError('Bitte wählen Sie eine CSV-Datei aus');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch('http://localhost:3001/api/csv-import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim CSV-Import');
      }

      const result = await response.json();
      setSuccess(`CSV erfolgreich importiert! ${result.imported} Datensätze hinzugefügt.`);
      setCsvFile(null);
      
      setTimeout(() => {
        onSuccess();
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV-Import fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

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

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFile) {
      setCsvFile(csvFile);
      setError(null);
    } else {
      setError('Bitte wählen Sie eine CSV-Datei aus');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="h-6 w-6 text-blue-600" />
            Marktdaten hinzufügen
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
            onClick={() => setActiveTab('manual')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'manual'
                ? 'border-b-2 border-blue-500 text-blue-600'
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
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            CSV Import
          </button>
          <button
            onClick={() => setActiveTab('screenshot')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'screenshot'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Camera className="h-4 w-4" />
            Screenshot
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'manual' && (
            /* Manual Input Form */
            <div className="space-y-6">
              {/* Date Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {standardFields.date} *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Manual-Only Fields */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-orange-600" />
                  Spezielle Indikatoren (nur manuell)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  {Object.entries(manualOnlyFields).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-orange-800 mb-1">
                        {label}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData[key as keyof MarketDataInput]}
                        onChange={(e) => handleInputChange(key as keyof MarketDataInput, e.target.value)}
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Eingabe..."
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Standard Fields */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Standard Stockbee-Indikatoren
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(standardFields)
                    .filter(([key]) => key !== 'date')
                    .map(([key, label]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {label}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData[key as keyof MarketDataInput]}
                          onChange={(e) => handleInputChange(key as keyof MarketDataInput, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Eingabe..."
                        />
                      </div>
                    ))}
                </div>
              </div>

              {/* Auto-calculated fields info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <Calculator className="h-4 w-4" />
                  <span className="font-medium">Automatische Berechnungen</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  5-Tage-Ratio und 10-Tage-Ratio werden automatisch aus den 4%-Daten berechnet.
                </p>
              </div>
            </div>
          ) : (
            /* CSV Upload */
            <div className="space-y-6">
              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  csvFile
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {csvFile ? (
                  <div className="space-y-2">
                    <Check className="h-12 w-12 text-green-600 mx-auto" />
                    <p className="text-lg font-medium text-green-800">
                      {csvFile.name}
                    </p>
                    <p className="text-sm text-green-600">
                      Bereit zum Upload ({(csvFile.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-lg font-medium text-gray-900">
                      CSV-Datei hierher ziehen
                    </p>
                    <p className="text-sm text-gray-600">
                      oder klicken Sie, um eine Datei auszuwählen
                    </p>
                  </div>
                )}
                
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setCsvFile(file);
                  }}
                  className="hidden"
                  id="csv-file-input"
                />
                
                {!csvFile && (
                  <label
                    htmlFor="csv-file-input"
                    className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    Datei auswählen
                  </label>
                )}
              </div>

              {/* CSV Format Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Erwartetes CSV-Format:</h3>
                <p className="text-sm text-gray-600 mb-2">
                  CSV enthält nur Standard-Stockbee-Felder. 20% und 20$ Indikatoren müssen separat manuell eingegeben werden.
                </p>
                <div className="text-xs text-gray-500 font-mono bg-white p-2 rounded border">
                  date,4% up,4% down,t2108,worden universe,25% up quarter,...
                </div>
                <p className="text-xs text-orange-600 mt-2 font-medium">
                  ⚠️ Hinweis: 20% und 20$ Felder sind nicht im CSV enthalten und müssen manuell eingegeben werden.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'csv' && (
            /* CSV Upload */
            <div className="space-y-6">
              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  csvFile
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {csvFile ? (
                  <div className="space-y-2">
                    <Check className="h-12 w-12 text-green-600 mx-auto" />
                    <p className="text-lg font-medium text-green-800">
                      {csvFile.name}
                    </p>
                    <p className="text-sm text-green-600">
                      Bereit zum Upload ({(csvFile.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-lg font-medium text-gray-900">
                      CSV-Datei hierher ziehen
                    </p>
                    <p className="text-sm text-gray-600">
                      oder klicken Sie, um eine Datei auszuwählen
                    </p>
                  </div>
                )}
                
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setCsvFile(file);
                  }}
                  className="hidden"
                  id="csv-file-input"
                />
                
                {!csvFile && (
                  <label
                    htmlFor="csv-file-input"
                    className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    Datei auswählen
                  </label>
                )}
              </div>

              {/* CSV Format Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Erwartetes CSV-Format:</h3>
                <p className="text-sm text-gray-600 mb-2">
                  CSV enthält nur Standard-Stockbee-Felder. 20% und 20$ Indikatoren müssen separat manuell eingegeben werden.
                </p>
                <div className="text-xs text-gray-500 font-mono bg-white p-2 rounded border">
                  date,4% up,4% down,t2108,worden universe,25% up quarter,...
                </div>
                <p className="text-xs text-orange-600 mt-2 font-medium">
                  ⚠️ Hinweis: 20% und 20$ Felder sind nicht im CSV enthalten und müssen manuell eingegeben werden.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'screenshot' && (
            /* Screenshot Upload */
            <ScreenshotDataEntry
              onDataExtracted={(data) => {
                // Convert screenshot data to our form format and submit
                handleScreenshotDataSubmit(data);
              }}
              onError={(errorMsg) => {
                setError(errorMsg);
                setSuccess(null);
              }}
            />
          )}

          {/* Status Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Fehler</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <Check className="h-4 w-4" />
                <span className="font-medium">Erfolg</span>
              </div>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          )}
        </div>

        {/* Footer - Hide for screenshot tab as it has its own controls */}
        {activeTab !== 'screenshot' && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            
            <button
              onClick={activeTab === 'manual' ? handleSubmit : handleCSVUpload}
              disabled={loading || (activeTab === 'csv' && !csvFile)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {activeTab === 'manual' ? 'Speichere...' : 'Importiere...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {activeTab === 'manual' ? 'Speichern' : 'CSV Importieren'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataImportModal;