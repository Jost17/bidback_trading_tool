import React, { useState } from 'react';
import { Upload, X, Save } from 'lucide-react';

interface SimpleDataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SimpleDataImportModal: React.FC<SimpleDataImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="h-6 w-6 text-blue-600" />
            Daten hinzufügen - Trading Tool
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Screenshot-basierte Dateneingabe
            </h3>
            <p className="text-gray-600 mb-8">
              Die neue Screenshot-Funktion wird in Kürze verfügbar sein.
              <br />
              Aktuell können Sie Daten über die bestehenden Methoden eingeben.
            </p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Schließen
              </button>
              <button
                onClick={() => {
                  // Placeholder für zukünftige Screenshot-Funktionalität
                  alert('Screenshot-Upload wird bald verfügbar sein!');
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Screenshot hochladen</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleDataImportModal;