'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function OCRTester() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runOCRTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      // Create a test image with your exact values
      const testData = {
        text: `mm_4%_bullish: 358, mm_4%_bearish: 115,
               mm_25%up_quarter: 1984, mm_25%down_quarter: 711,
               mm_25%up_month: 158, mm_25%down_month: 66,
               mm_50%up_month: 38, mm_50%down_month: 17,
               mm_#up13%in34days: 1689, mm_#down13%in34days: 1073,
               US common stocks: 6193, SP-500: 6141.02`,
        expectedValues: {
          stocksUp4PctDaily: 358,
          stocksDown4PctDaily: 115,
          stocksUp25PctQuarterly: 1984,
          stocksDown25PctQuarterly: 711,
          stocksUp25PctMonthly: 158,
          stocksDown25PctMonthly: 66,
          stocksUp50PctMonthly: 38,
          stocksDown50PctMonthly: 17,
          stocksUp13Pct34Days: 1689,
          stocksDown13Pct34Days: 1073,
          wordenCommonStocks: 6193,
          spReference: 6141.02
        }
      };

      // Import and test the parser directly
      const { TradingPlatformOCRParser } = await import('@/lib/utils/ocrParser');
      const parser = new TradingPlatformOCRParser();
      const extractedData = parser.parse(testData.text);
      const confidence = parser.calculateConfidence(extractedData);

      // Compare results
      const comparison: any = {};
      for (const [key, expectedValue] of Object.entries(testData.expectedValues)) {
        const extractedValue = (extractedData as any)[key];
        comparison[key] = {
          expected: expectedValue,
          extracted: extractedValue,
          match: extractedValue === expectedValue
        };
      }

      setResult({
        extractedData,
        confidence,
        comparison,
        totalFields: Object.keys(testData.expectedValues).length,
        matchedFields: Object.values(comparison).filter((c: any) => c.match).length
      });

    } catch (error) {
      console.error('OCR test failed:', error);
      setResult({ error: error instanceof Error ? error.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <h3 className="text-lg font-semibold mb-4">OCR Parser Test</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          This will test the OCR parser with your exact screenshot values:
        </p>
        <div className="bg-gray-100 p-3 rounded text-xs font-mono">
          mm_4%_bullish: 358, mm_4%_bearish: 115,<br/>
          mm_25%up_quarter: 1984, mm_25%down_quarter: 711,<br/>
          mm_25%up_month: 158, mm_25%down_month: 66,<br/>
          mm_50%up_month: 38, mm_50%down_month: 17,<br/>
          mm_#up13%in34days: 1689, mm_#down13%in34days: 1073,<br/>
          US common stocks: 6193, SP-500: 6141.02
        </div>
      </div>

      <Button onClick={runOCRTest} disabled={testing} className="mb-4">
        {testing ? 'Testing...' : 'Run OCR Test'}
      </Button>

      {result && (
        <div className="space-y-4">
          {result.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800">Error: {result.error}</p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="font-medium mb-2">Test Results:</p>
                <p>Confidence: {(result.confidence * 100).toFixed(1)}%</p>
                <p>Matched Fields: {result.matchedFields} / {result.totalFields}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Extracted</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(result.comparison).map(([field, data]: [string, any]) => (
                      <tr key={field}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{field}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{data.expected}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{data.extracted || 'NOT FOUND'}</td>
                        <td className="px-4 py-2 text-sm">
                          {data.match ? (
                            <span className="text-green-600">✅ Match</span>
                          ) : (
                            <span className="text-red-600">❌ No Match</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}