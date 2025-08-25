'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MarketBreadthData } from '@/lib/types/market-breadth';

interface OCRUploadProps {
  onExtractedData: (data: Partial<MarketBreadthData>) => void;
  loading?: boolean;
}

interface OCRResult {
  confidence: number;
  extractedData: Partial<MarketBreadthData>;
  rawText: string;
  processing: boolean;
}

export default function OCRUpload({ onExtractedData, loading }: OCRUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      processFile(imageFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processOCR = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    setOcrResult(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('screenshot', selectedFile);

      const response = await fetch('/api/market-breadth/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR processing failed');
      }

      const result = await response.json();
      
      setOcrResult({
        confidence: result.confidence || 0,
        extractedData: result.extractedData || {},
        rawText: result.rawText || '',
        processing: false
      });

      // If confidence is high enough, automatically fill the data
      if (result.confidence > 0.7) {
        onExtractedData(result.extractedData);
      }

    } catch (error) {
      console.error('OCR Error:', error);
      setOcrResult({
        confidence: 0,
        extractedData: {},
        rawText: 'Error processing image. Please try manual entry.',
        processing: false
      });
    } finally {
      setProcessing(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setOcrResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">OCR Screenshot Processing</h2>
        <p className="text-gray-600">Upload screenshots from trading platforms to automatically extract market breadth data</p>
      </div>

      {!selectedFile ? (
        <Card className="p-8">
          <div
            className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drop screenshot here or click to browse
                </p>
                <p className="text-gray-500 mt-1">
                  Supports PNG, JPG, and other image formats
                </p>
              </div>
              
              <Button type="button" variant="primary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Choose Screenshot
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Preview */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Screenshot Preview</h3>
              <Button variant="secondary" size="sm" onClick={clearSelection}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </Button>
            </div>
            
            {previewUrl && (
              <div className="border rounded-lg overflow-hidden bg-gray-50">
                <Image
                  src={previewUrl}
                  alt="Screenshot preview"
                  width={800}
                  height={400}
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
            )}
            
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>File:</strong> {selectedFile.name}</p>
              <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Type:</strong> {selectedFile.type}</p>
            </div>
          </Card>

          {/* OCR Processing */}
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">OCR Processing</h3>
              
              {!ocrResult && !processing && (
                <div className="text-center py-8">
                  <Button
                    onClick={processOCR}
                    disabled={processing}
                    className="px-6 py-3"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Extract Data with OCR
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    This will analyze the screenshot and extract market breadth values
                  </p>
                </div>
              )}

              {processing && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Processing screenshot with OCR...</p>
                  <p className="text-sm text-gray-500 mt-1">This may take a few seconds</p>
                </div>
              )}

              {ocrResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Confidence Score</span>
                    <span className={`text-sm font-semibold ${
                      ocrResult.confidence > 0.8 ? 'text-green-600' :
                      ocrResult.confidence > 0.5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {(ocrResult.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        ocrResult.confidence > 0.8 ? 'bg-green-500' :
                        ocrResult.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${ocrResult.confidence * 100}%` }}
                    ></div>
                  </div>

                  {Object.keys(ocrResult.extractedData).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Extracted Values</h4>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                        {Object.entries(ocrResult.extractedData).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600">{key}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button
                      onClick={() => onExtractedData(ocrResult.extractedData)}
                      disabled={Object.keys(ocrResult.extractedData).length === 0}
                      className="w-full"
                    >
                      Use Extracted Data
                    </Button>
                    
                    <Button
                      variant="secondary"
                      onClick={processOCR}
                      className="w-full"
                    >
                      Re-process Screenshot
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* OCR Tips */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">OCR Best Practices</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Use high-resolution screenshots for better accuracy</li>
                <li>Ensure text is clearly visible and not blurred</li>
                <li>Screenshots from trading platforms work best</li>
                <li>Verify extracted values before saving to database</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}