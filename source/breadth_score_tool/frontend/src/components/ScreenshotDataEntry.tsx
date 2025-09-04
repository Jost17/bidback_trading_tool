import React, { useState, useRef } from 'react';
import { Upload, Camera, Check, AlertCircle, Loader, Edit3, Save } from 'lucide-react';

interface ExtractedData {
  mm_4_bullish?: number;
  mm_4_bearish?: number;
  mm_25_up_quarter?: number;
  mm_25_down_quarter?: number;
  mm_25_up_month?: number;
  mm_25_down_month?: number;
  mm_50_up_month?: number;
  mm_50_down_month?: number;
  mm_up13_in34days?: number;
  mm_down13_in34days?: number;
  us_common_stocks?: number;
  sp500?: number;
  t2108?: number;
  basic_materials_sector?: number;
  consumer_cyclical_sector?: number;
  financial_services_sector?: number;
  real_estate_sector?: number;
  consumer_defensive_sector?: number;
  healthcare_sector?: number;
  utilities_sector?: number;
  communication_services_sector?: number;
  energy_sector?: number;
  industrials_sector?: number;
  technology_sector?: number;
}

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
  basic_materials_sector: string;
  consumer_cyclical_sector: string;
  financial_services_sector: string;
  real_estate_sector: string;
  consumer_defensive_sector: string;
  healthcare_sector: string;
  utilities_sector: string;
  communication_services_sector: string;
  energy_sector: string;
  industrials_sector: string;
  technology_sector: string;
}

interface ScreenshotDataEntryProps {
  onDataExtracted: (data: MarketDataInput) => void;
  onError: (error: string) => void;
}

const ScreenshotDataEntry: React.FC<ScreenshotDataEntryProps> = ({
  onDataExtracted,
  onError
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [fileType, setFileType] = useState<'market_monitor' | 't2108'>('market_monitor');
  const [formData, setFormData] = useState<MarketDataInput>({
    date: new Date().toISOString().split('T')[0],
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
    worden_universe: '',
    sp500: '',
    t2108: '',
    basic_materials_sector: '',
    consumer_cyclical_sector: '',
    financial_services_sector: '',
    real_estate_sector: '',
    consumer_defensive_sector: '',
    healthcare_sector: '',
    utilities_sector: '',
    communication_services_sector: '',
    energy_sector: '',
    industrials_sector: '',
    technology_sector: ''
  });
  const [showExtractedForm, setShowExtractedForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      onError('Please select a valid image file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Map extracted data to form fields based on extracted results
  const mapExtractedToForm = (extracted: ExtractedData): MarketDataInput => {
    return {
      date: new Date().toISOString().split('T')[0],
      stocks_up_4pct: extracted.mm_4_bullish?.toString() || '',
      stocks_down_4pct: extracted.mm_4_bearish?.toString() || '',
      stocks_up_25pct_quarter: extracted.mm_25_up_quarter?.toString() || '',
      stocks_down_25pct_quarter: extracted.mm_25_down_quarter?.toString() || '',
      stocks_up_25pct_month: extracted.mm_25_up_month?.toString() || '',
      stocks_down_25pct_month: extracted.mm_25_down_month?.toString() || '',
      stocks_up_50pct_month: extracted.mm_50_up_month?.toString() || '',
      stocks_down_50pct_month: extracted.mm_50_down_month?.toString() || '',
      stocks_up_13pct_34days: extracted.mm_up13_in34days?.toString() || '',
      stocks_down_13pct_34days: extracted.mm_down13_in34days?.toString() || '',
      worden_universe: extracted.us_common_stocks?.toString() || '',
      sp500: extracted.sp500?.toString() || '',
      t2108: extracted.t2108?.toString() || '',
      basic_materials_sector: extracted.basic_materials_sector?.toString() || '',
      consumer_cyclical_sector: extracted.consumer_cyclical_sector?.toString() || '',
      financial_services_sector: extracted.financial_services_sector?.toString() || '',
      real_estate_sector: extracted.real_estate_sector?.toString() || '',
      consumer_defensive_sector: extracted.consumer_defensive_sector?.toString() || '',
      healthcare_sector: extracted.healthcare_sector?.toString() || '',
      utilities_sector: extracted.utilities_sector?.toString() || '',
      communication_services_sector: extracted.communication_services_sector?.toString() || '',
      energy_sector: extracted.energy_sector?.toString() || '',
      industrials_sector: extracted.industrials_sector?.toString() || '',
      technology_sector: extracted.technology_sector?.toString() || ''
    };
  };

  const extractDataFromScreenshot = async () => {
    if (!selectedFile) {
      onError('Please select an image first');
      return;
    }

    setExtracting(true);
    
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('screenshot', selectedFile);
      formDataUpload.append('fileType', fileType);

      const response = await fetch('http://localhost:3001/api/screenshot-extract', {
        method: 'POST',
        body: formDataUpload
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Handle new API response structure
        const extractedData = result.data.data || result.data;
        const metadata = result.data.metadata || {};
        
        console.log(`OCR completed with ${metadata.confidence || 'unknown'}% confidence`);
        console.log(`Extracted ${metadata.extractedFields || 0} fields in ${metadata.processingTime || 'unknown'}ms`);
        
        setExtractedData(extractedData);
        const mappedData = mapExtractedToForm(extractedData);
        setFormData(mappedData);
        setShowExtractedForm(true);
      } else {
        throw new Error(result.message || 'Failed to extract data from screenshot');
      }
    } catch (error) {
      console.error('Screenshot extraction error:', error);
      onError(error instanceof Error ? error.message : 'Failed to extract data from screenshot');
    } finally {
      setExtracting(false);
    }
  };

  const handleFormChange = (field: keyof MarketDataInput, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    onDataExtracted(formData);
  };

  const renderFileUpload = () => (
    <div className="space-y-4">
      {/* File Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Screenshot Type
        </label>
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value as 'market_monitor' | 't2108')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="market_monitor">Market Monitor</option>
          <option value="t2108">T2108</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {fileType === 'market_monitor' 
            ? 'Standard market dashboard with breadth indicators and sector data'
            : 'T2108 specific data with focused metrics'
          }
        </p>
      </div>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
          className="hidden"
        />
        
        {imagePreview ? (
          <div className="space-y-4">
            <img
              src={imagePreview}
              alt="Screenshot preview"
              className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
            />
            <div className="flex items-center justify-center space-x-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Image uploaded: {selectedFile?.name}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">Upload Trading Screenshot</p>
              <p className="text-sm text-gray-500 mt-1">
                Drag and drop your trading dashboard screenshot here, or click to browse
              </p>
            </div>
            <div className="flex justify-center">
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="flex justify-center">
          <button
            onClick={extractDataFromScreenshot}
            disabled={extracting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
          >
            {extracting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Extracting Data...</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                <span>Extract Data</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  const renderExtractedForm = () => {
    if (!showExtractedForm) return null;

    const fieldLabels = {
      date: 'Date',
      stocks_up_4pct: '4% Bullish',
      stocks_down_4pct: '4% Bearish',
      stocks_up_25pct_quarter: '25% Up (Quarter)',
      stocks_down_25pct_quarter: '25% Down (Quarter)',
      stocks_up_25pct_month: '25% Up (Month)',
      stocks_down_25pct_month: '25% Down (Month)',
      stocks_up_50pct_month: '50% Up (Month)',
      stocks_down_50pct_month: '50% Down (Month)',
      stocks_up_13pct_34days: '13% Up (34 days)',
      stocks_down_13pct_34days: '13% Down (34 days)',
      worden_universe: 'US Common Stocks',
      sp500: 'S&P 500',
      t2108: 'T2108',
      basic_materials_sector: 'Basic Materials Sector',
      consumer_cyclical_sector: 'Consumer Cyclical Sector',
      financial_services_sector: 'Financial Services Sector',
      real_estate_sector: 'Real Estate Sector',
      consumer_defensive_sector: 'Consumer Defensive Sector',
      healthcare_sector: 'Healthcare Sector',
      utilities_sector: 'Utilities Sector',
      communication_services_sector: 'Communication Services Sector',
      energy_sector: 'Energy Sector',
      industrials_sector: 'Industrials Sector',
      technology_sector: 'Technology Sector'
    };

    // Group fields by category for better organization
    const primaryFields = ['date', 'stocks_up_4pct', 'stocks_down_4pct', 'stocks_up_25pct_quarter', 'stocks_down_25pct_quarter'];
    const secondaryFields = ['stocks_up_25pct_month', 'stocks_down_25pct_month', 'stocks_up_50pct_month', 'stocks_down_50pct_month', 'stocks_up_13pct_34days', 'stocks_down_13pct_34days'];
    const referenceFields = ['worden_universe', 'sp500', 't2108'];
    const sectorFields = ['basic_materials_sector', 'consumer_cyclical_sector', 'financial_services_sector', 'real_estate_sector', 'consumer_defensive_sector', 'healthcare_sector', 'utilities_sector', 'communication_services_sector', 'energy_sector', 'industrials_sector', 'technology_sector'];

    const renderFieldGroup = (title: string, fields: string[]) => (
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-800 border-b border-gray-200 pb-2">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {fieldLabels[field as keyof typeof fieldLabels]}
              </label>
              <input
                type={field === 'date' ? 'date' : 'text'}
                value={formData[field as keyof MarketDataInput]}
                onChange={(e) => handleFormChange(field as keyof MarketDataInput, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={field === 'date' ? '' : `Enter ${fieldLabels[field as keyof typeof fieldLabels]?.toLowerCase()}`}
              />
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-800">
            Data extracted successfully! Please review and edit if needed.
          </span>
        </div>

        {/* Organized field groups */}
        {renderFieldGroup('Primary Breadth Indicators', primaryFields)}
        {renderFieldGroup('Secondary Breadth Indicators', secondaryFields)}
        {renderFieldGroup('Reference Data', referenceFields)}
        {renderFieldGroup('Sector Data', sectorFields)}

        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowExtractedForm(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Back to Upload
          </button>
          <button
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Data</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Screenshot Data Entry
        </h3>
        <p className="text-sm text-gray-600">
          Upload a screenshot of your trading dashboard to automatically extract market data
        </p>
      </div>

      {!showExtractedForm ? renderFileUpload() : renderExtractedForm()}
    </div>
  );
};

export default ScreenshotDataEntry;