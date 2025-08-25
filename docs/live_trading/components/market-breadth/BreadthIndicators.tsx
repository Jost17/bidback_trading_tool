'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { MarketBreadthData } from '@/lib/types/market-breadth';
import { processMarketBreadthData, IndicatorValue } from '@/lib/utils/breadthIndicators';

interface HistoricalData {
  date: string;
  data: MarketBreadthData;
  indicators: ReturnType<typeof processMarketBreadthData>;
}

export default function BreadthIndicators() {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        const response = await fetch(`/api/market-breadth?limit=${selectedPeriod}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const processed = result.data.map((item: any) => {
            // Transform snake_case to camelCase to match MarketBreadthData interface
            const transformedData: MarketBreadthData = {
              id: item.id,
              date: item.date,
              stocksUp4PctDaily: item.stocks_up_4pct_daily,
              stocksDown4PctDaily: item.stocks_down_4pct_daily,
              stocksUp25PctQuarterly: item.stocks_up_25pct_quarterly,
              stocksDown25PctQuarterly: item.stocks_down_25pct_quarterly,
              stocksUp20PctCustom: item.stocks_up_20pct_custom,
              stocksDown20PctCustom: item.stocks_down_20pct_custom,
              ratio5Day: item.ratio_5day,
              ratio10Day: item.ratio_10day,
              stocksUp25PctMonthly: item.stocks_up_25pct_monthly,
              stocksDown25PctMonthly: item.stocks_down_25pct_monthly,
              stocksUp50PctMonthly: item.stocks_up_50pct_monthly,
              stocksDown50PctMonthly: item.stocks_down_50pct_monthly,
              stocksUp13Pct34Days: item.stocks_up_13pct_34days,
              stocksDown13Pct34Days: item.stocks_down_13pct_34days,
              stocksUp20DollarCustom: item.stocks_up_20dollar_custom,
              stocksDown20DollarCustom: item.stocks_down_20dollar_custom,
              t2108: item.t2108,
              wordenCommonStocks: item.worden_common_stocks,
              spReference: item.sp_reference,
              dataSource: item.data_source,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
            };
            
            return {
              date: item.date,
              data: transformedData,
              indicators: processMarketBreadthData(transformedData)
            };
          });
          setHistoricalData(processed);
        }
      } catch (error) {
        console.error('Error fetching historical data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, [selectedPeriod]);

  const IndicatorCard = ({ 
    title, 
    value, 
    trend, 
    description,
    status,
    historicalValues
  }: {
    title: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    description?: string;
    status: 'bullish' | 'bearish' | 'neutral';
    historicalValues?: number[];
  }) => (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          {trend && (
            <span className={`text-xs ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            </span>
          )}
        </div>
        
        <div className="flex items-baseline space-x-2">
          <span className={`text-2xl font-bold ${
            status === 'bullish' ? 'text-green-600' :
            status === 'bearish' ? 'text-red-600' :
            'text-yellow-600'
          }`}>
            {value}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            status === 'bullish' ? 'bg-green-100 text-green-800' :
            status === 'bearish' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {status.toUpperCase()}
          </span>
        </div>

        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}

        {historicalValues && historicalValues.length > 0 && (
          <div className="mt-2 h-8">
            <SparklineChart values={historicalValues} status={status} />
          </div>
        )}
      </div>
    </Card>
  );

  const SparklineChart = ({ values, status }: { values: number[]; status: string }) => {
    if (!values || values.length === 0) return null;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    const color = status === 'bullish' ? '#10b981' : status === 'bearish' ? '#ef4444' : '#f59e0b';

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          opacity="0.8"
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const latestData = historicalData[0];
  if (!latestData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No indicator data available</p>
      </div>
    );
  }

  const indicators = latestData.indicators;

  // Calculate trends
  const calculateTrend = (field: keyof MarketBreadthData): 'up' | 'down' | 'neutral' => {
    if (historicalData.length < 2) return 'neutral';
    const current = latestData.data[field];
    const previous = historicalData[1].data[field];
    if (!current || !previous) return 'neutral';
    return current > previous ? 'up' : current < previous ? 'down' : 'neutral';
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Market Breadth Indicators Analysis</h2>
        <div className="flex space-x-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days as 7 | 30 | 90)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedPeriod === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {/* Summary Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">Overall Signal</p>
            <p className={`text-2xl font-bold ${
              indicators.tradingBias === 'bullish' ? 'text-green-600' :
              indicators.tradingBias === 'bearish' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {indicators.overallScore}/100
            </p>
            <p className="text-xs uppercase">{indicators.tradingBias}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Primary Score</p>
            <p className="text-2xl font-bold text-gray-900">{indicators.primaryScore}/100</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Secondary Score</p>
            <p className="text-2xl font-bold text-gray-900">{indicators.secondaryScore}/100</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Overarching Score</p>
            <p className="text-2xl font-bold text-gray-900">{indicators.overarchingScore}/100</p>
          </div>
        </div>
      </Card>

      {/* Primary Indicators */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-3 h-3 bg-cyan-500 rounded-full mr-2"></span>
          Primary Indicators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <IndicatorCard
            title="Stocks Up 4% Daily"
            value={indicators.stocksUp4PctDaily.displayValue}
            status={indicators.stocksUp4PctDaily.status}
            trend={calculateTrend('stocksUp4PctDaily')}
            description="Daily momentum indicator"
            historicalValues={historicalData.map(d => d.data.stocksUp4PctDaily || 0)}
          />
          <IndicatorCard
            title="Stocks Down 4% Daily"
            value={indicators.stocksDown4PctDaily.displayValue}
            status={indicators.stocksDown4PctDaily.status}
            trend={calculateTrend('stocksDown4PctDaily')}
            description="Daily selling pressure"
            historicalValues={historicalData.map(d => d.data.stocksDown4PctDaily || 0)}
          />
          <IndicatorCard
            title="5-Day Ratio"
            value={indicators.ratio5Day.displayValue}
            status={indicators.ratio5Day.status}
            description="Short-term trend strength"
            historicalValues={historicalData.map(d => (d.indicators.ratio5Day.value || 0) * 100)}
          />
          <IndicatorCard
            title="10-Day Ratio"
            value={indicators.ratio10Day.displayValue}
            status={indicators.ratio10Day.status}
            description="Medium-term trend strength"
            historicalValues={historicalData.map(d => (d.indicators.ratio10Day.value || 0) * 100)}
          />
          <IndicatorCard
            title="Stocks Up 25% Quarterly"
            value={indicators.stocksUp25PctQuarterly.displayValue}
            status={indicators.stocksUp25PctQuarterly.status}
            trend={calculateTrend('stocksUp25PctQuarterly')}
            description="Long-term winners"
            historicalValues={historicalData.map(d => d.data.stocksUp25PctQuarterly || 0)}
          />
          <IndicatorCard
            title="Stocks Down 25% Quarterly"
            value={indicators.stocksDown25PctQuarterly.displayValue}
            status={indicators.stocksDown25PctQuarterly.status}
            trend={calculateTrend('stocksDown25PctQuarterly')}
            description="Long-term losers"
            historicalValues={historicalData.map(d => d.data.stocksDown25PctQuarterly || 0)}
          />
        </div>
      </div>

      {/* Secondary Indicators */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
          Secondary Indicators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <IndicatorCard
            title="Stocks Up 25% Monthly"
            value={indicators.stocksUp25PctMonthly.displayValue}
            status={indicators.stocksUp25PctMonthly.status}
            trend={calculateTrend('stocksUp25PctMonthly')}
            description="Monthly momentum leaders"
            historicalValues={historicalData.map(d => d.data.stocksUp25PctMonthly || 0)}
          />
          <IndicatorCard
            title="Stocks Down 25% Monthly"
            value={indicators.stocksDown25PctMonthly.displayValue}
            status={indicators.stocksDown25PctMonthly.status}
            trend={calculateTrend('stocksDown25PctMonthly')}
            description="Monthly declining stocks"
            historicalValues={historicalData.map(d => d.data.stocksDown25PctMonthly || 0)}
          />
          <IndicatorCard
            title="Stocks Up 50% Monthly"
            value={indicators.stocksUp50PctMonthly.displayValue}
            status={indicators.stocksUp50PctMonthly.status}
            trend={calculateTrend('stocksUp50PctMonthly')}
            description="Extreme monthly gainers"
            historicalValues={historicalData.map(d => d.data.stocksUp50PctMonthly || 0)}
          />
          <IndicatorCard
            title="Stocks Down 50% Monthly"
            value={indicators.stocksDown50PctMonthly.displayValue}
            status={indicators.stocksDown50PctMonthly.status}
            trend={calculateTrend('stocksDown50PctMonthly')}
            description="Extreme monthly losers"
            historicalValues={historicalData.map(d => d.data.stocksDown50PctMonthly || 0)}
          />
          <IndicatorCard
            title="Stocks Up 13% in 34 Days"
            value={indicators.stocksUp13Pct34Days.displayValue}
            status={indicators.stocksUp13Pct34Days.status}
            trend={calculateTrend('stocksUp13Pct34Days')}
            description="Medium-term momentum"
            historicalValues={historicalData.map(d => d.data.stocksUp13Pct34Days || 0)}
          />
          <IndicatorCard
            title="Stocks Down 13% in 34 Days"
            value={indicators.stocksDown13Pct34Days.displayValue}
            status={indicators.stocksDown13Pct34Days.status}
            trend={calculateTrend('stocksDown13Pct34Days')}
            description="Medium-term weakness"
            historicalValues={historicalData.map(d => d.data.stocksDown13Pct34Days || 0)}
          />
        </div>
      </div>

      {/* Overarching Indicators */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
          Overarching Indicators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <IndicatorCard
            title="T2108 (% Above 40-Day MA)"
            value={indicators.t2108.displayValue}
            status={indicators.t2108.status}
            trend={calculateTrend('t2108')}
            description="Market participation indicator"
            historicalValues={historicalData.map(d => parseFloat(d.data.t2108 as any) || 0)}
          />
          <IndicatorCard
            title="Worden Common Stocks"
            value={indicators.wordenCommonStocks.displayValue}
            status={indicators.wordenCommonStocks.status}
            trend={calculateTrend('wordenCommonStocks')}
            description="Total market breadth"
            historicalValues={historicalData.map(d => parseFloat(d.data.wordenCommonStocks as any) || 0)}
          />
          <IndicatorCard
            title="S&P 500 Reference"
            value={indicators.spReference.displayValue}
            status={indicators.spReference.status}
            trend={calculateTrend('spReference')}
            description="Market index level"
            historicalValues={historicalData.map(d => parseFloat(d.data.spReference as any) || 0)}
          />
        </div>
      </div>

      {/* Interpretation Guide */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interpretation Guide</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start">
            <span className="w-2 h-2 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
            <p><strong>Bullish Indicators:</strong> Suggest positive market momentum and potential buying opportunities. Look for breakout patterns and momentum plays.</p>
          </div>
          <div className="flex items-start">
            <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
            <p><strong>Bearish Indicators:</strong> Indicate market weakness and potential selling pressure. Consider defensive positions or reduced exposure.</p>
          </div>
          <div className="flex items-start">
            <span className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
            <p><strong>Neutral Indicators:</strong> Market is in transition or consolidation. Wait for clearer signals before taking significant positions.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}