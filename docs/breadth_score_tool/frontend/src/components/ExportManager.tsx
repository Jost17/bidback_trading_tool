import React, { useState } from 'react';
import { Download, FileText, Table, FileSpreadsheet, Loader } from 'lucide-react';

interface ExportData {
  date: string;
  [key: string]: any;
}

interface ExportManagerProps {
  data: ExportData[];
  filename?: string;
  className?: string;
}

// Export service with multiple format support
export class ExportService {
  
  // CSV Export
  static exportToCSV(data: ExportData[], filename: string = 'market_data'): void {
    if (data.length === 0) {
      alert('Keine Daten zum Exportieren verfügbar');
      return;
    }

    // Get all unique keys from data
    const headers = Array.from(new Set(data.flatMap(row => Object.keys(row))));
    
    // Create CSV content
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle null/undefined values and escape commas
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
        }).join(',')
      )
    ].join('\n');

    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  }

  // Excel-compatible CSV Export
  static exportToExcel(data: ExportData[], filename: string = 'market_data'): void {
    if (data.length === 0) {
      alert('Keine Daten zum Exportieren verfügbar');
      return;
    }

    // Excel-compatible CSV with UTF-8 BOM
    const headers = Array.from(new Set(data.flatMap(row => Object.keys(row))));
    const csvContent = [
      headers.join('\t'), // Tab-separated for Excel
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          return String(value);
        }).join('\t')
      )
    ].join('\n');

    // Add BOM for proper Excel UTF-8 handling
    const bom = '\uFEFF';
    this.downloadFile(bom + csvContent, `${filename}.xls`, 'application/vnd.ms-excel');
  }

  // JSON Export
  static exportToJSON(data: ExportData[], filename: string = 'market_data'): void {
    if (data.length === 0) {
      alert('Keine Daten zum Exportieren verfügbar');
      return;
    }

    const jsonContent = JSON.stringify({
      exported: new Date().toISOString(),
      count: data.length,
      data: data
    }, null, 2);

    this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
  }

  // PDF Report Export (simplified)
  static exportToPDF(data: ExportData[], filename: string = 'market_data'): void {
    if (data.length === 0) {
      alert('Keine Daten zum Exportieren verfügbar');
      return;
    }

    // Create a simple HTML report that can be printed as PDF
    const htmlContent = this.createHTMLReport(data);
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }

  // Helper: Create HTML report
  private static createHTMLReport(data: ExportData[]): string {
    const headers = Array.from(new Set(data.flatMap(row => Object.keys(row))));
    const now = new Date().toLocaleString('de-DE');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stockbee Market Monitor Report</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; 
            margin: 20px; 
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #ff8500;
            padding-bottom: 20px;
          }
          .title { 
            font-size: 24px; 
            font-weight: bold; 
            color: #ff8500; 
            margin-bottom: 5px;
          }
          .meta { 
            font-size: 14px; 
            color: #666; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 12px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
          }
          th { 
            background-color: #f8f9fa; 
            font-weight: bold;
            color: #ff8500;
          }
          tr:nth-child(even) { 
            background-color: #f8f9fa; 
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
            .header { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">📊 Stockbee Market Monitor Report</div>
          <div class="meta">
            Exportiert am: ${now} | 
            Datensätze: ${data.length} | 
            Zeitraum: ${data[data.length-1]?.date} bis ${data[0]?.date}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${headers.map(header => {
                  const value = row[header];
                  if (value === null || value === undefined) return '<td>-</td>';
                  return `<td>${value}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>🧮 Automatisch generiert von Stockbee Market Monitor</p>
          <p>📈 Für weitere Analysen: Daten in Excel oder CSV importieren</p>
        </div>
      </body>
      </html>
    `;
  }

  // Helper: Download file
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

// React component for export UI
export const ExportManager: React.FC<ExportManagerProps> = ({ 
  data, 
  filename = 'stockbee_market_data',
  className = '' 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<string>('');

  const handleExport = async (format: 'csv' | 'excel' | 'json' | 'pdf') => {
    if (data.length === 0) {
      alert('Keine Daten zum Exportieren verfügbar');
      return;
    }

    setIsExporting(true);
    setExportFormat(format);

    try {
      // Add timestamp to filename
      const timestamp = new Date().toISOString().split('T')[0];
      const timestampedFilename = `${filename}_${timestamp}`;

      switch (format) {
        case 'csv':
          ExportService.exportToCSV(data, timestampedFilename);
          break;
        case 'excel':
          ExportService.exportToExcel(data, timestampedFilename);
          break;
        case 'json':
          ExportService.exportToJSON(data, timestampedFilename);
          break;
        case 'pdf':
          ExportService.exportToPDF(data, timestampedFilename);
          break;
        default:
          throw new Error('Unbekanntes Export-Format');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportFormat('');
      }, 1000);
    }
  };

  const exportOptions = [
    {
      key: 'csv',
      label: 'CSV Export',
      description: 'Komma-getrennte Werte',
      icon: <Table className="h-4 w-4" />,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      key: 'excel',
      label: 'Excel Export',
      description: 'Excel-kompatible Datei',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      key: 'json',
      label: 'JSON Export',
      description: 'Strukturierte Daten',
      icon: <FileText className="h-4 w-4" />,
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      key: 'pdf',
      label: 'PDF Report',
      description: 'Druckbarer Bericht',
      icon: <Download className="h-4 w-4" />,
      color: 'bg-red-600 hover:bg-red-700'
    }
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-medium text-gray-300 mb-3">
        📥 Export ({data.length} Datensätze)
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {exportOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => handleExport(option.key as any)}
            disabled={isExporting || data.length === 0}
            className={`
              ${option.color} text-white px-4 py-3 rounded-lg font-semibold
              transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
              flex flex-col items-center gap-2 text-center min-h-[80px]
            `}
          >
            {isExporting && exportFormat === option.key ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              option.icon
            )}
            <div>
              <div className="text-xs font-bold">{option.label}</div>
              <div className="text-xs opacity-80">{option.description}</div>
            </div>
          </button>
        ))}
      </div>
      
      {data.length === 0 && (
        <div className="text-center text-gray-500 text-sm mt-4">
          ⚠️ Keine Daten zum Exportieren verfügbar
        </div>
      )}
    </div>
  );
};

export default ExportManager;
