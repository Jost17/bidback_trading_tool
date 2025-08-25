'use client';

import { useMarketBreadth } from '@/lib/hooks/useMarketBreadth';
import { processMarketBreadthData } from '@/lib/utils/breadthIndicators';
import { IndicatorCard } from './IndicatorCard';
import { SignalOverview } from './SignalOverview';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function BreadthDashboard() {
  const { currentData, historicalData, loading, error, refreshData } = useMarketBreadth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading market breadth data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-12">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refreshData} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div className="text-center p-12">
        <div className="text-gray-500 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">
            No market breadth data found. Upload CSV files to get started.
          </p>
          <Button onClick={refreshData} variant="secondary">
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  const indicators = processMarketBreadthData(currentData);

  return (
    <div className="space-y-6">
      {/* Signal Overview */}
      <SignalOverview indicators={indicators} date={currentData.date} />

      {/* Primary Indicators */}
      <Card 
        title="Primary Indicators" 
        subtitle="Core daily momentum and ratio indicators"
        className="border-l-4 border-l-cyan-500"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <IndicatorCard 
            title="Stocks Up 4% Daily" 
            indicator={indicators.stocksUp4PctDaily}
            description="Stocks gaining 4%+ today"
          />
          <IndicatorCard 
            title="Stocks Down 4% Daily" 
            indicator={indicators.stocksDown4PctDaily}
            description="Stocks declining 4%+ today"
          />
          <IndicatorCard 
            title="5-Day Ratio" 
            indicator={indicators.ratio5Day}
            description="5-day up/down momentum"
          />
          <IndicatorCard 
            title="10-Day Ratio" 
            indicator={indicators.ratio10Day}
            description="10-day up/down momentum"
          />
          <IndicatorCard 
            title="Stocks Up 25% Quarterly" 
            indicator={indicators.stocksUp25PctQuarterly}
            description="Quarterly winners (25%+)"
          />
          <IndicatorCard 
            title="Stocks Down 25% Quarterly" 
            indicator={indicators.stocksDown25PctQuarterly}
            description="Quarterly losers (25%+)"
          />
        </div>
      </Card>

      {/* Overarching Indicators */}
      <Card 
        title="Overarching Indicators" 
        subtitle="Broad market structure and sentiment"
        className="border-l-4 border-l-blue-500"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <IndicatorCard 
            title="T2108" 
            indicator={indicators.t2108}
            description="% Stocks above 40-day MA"
            size="lg"
          />
          <IndicatorCard 
            title="Worden Common Stocks" 
            indicator={indicators.wordenCommonStocks}
            description="Market participation index"
            size="lg"
          />
          <IndicatorCard 
            title="S&P Reference" 
            indicator={indicators.spReference}
            description="S&P 500 reference level"
            size="lg"
          />
        </div>
      </Card>

      {/* Secondary Indicators */}
      <Card 
        title="Secondary Indicators" 
        subtitle="Medium-term trend and momentum indicators"
        className="border-l-4 border-l-yellow-500"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <IndicatorCard 
            title="Stocks Up 25% Monthly" 
            indicator={indicators.stocksUp25PctMonthly}
            description="Monthly winners (25%+)"
          />
          <IndicatorCard 
            title="Stocks Down 25% Monthly" 
            indicator={indicators.stocksDown25PctMonthly}
            description="Monthly losers (25%+)"
          />
          <IndicatorCard 
            title="Stocks Up 50% Monthly" 
            indicator={indicators.stocksUp50PctMonthly}
            description="Strong monthly winners"
          />
          <IndicatorCard 
            title="Stocks Down 50% Monthly" 
            indicator={indicators.stocksDown50PctMonthly}
            description="Strong monthly losers"
          />
          <IndicatorCard 
            title="Stocks Up 13% (34 days)" 
            indicator={indicators.stocksUp13Pct34Days}
            description="Medium-term gainers"
          />
          <IndicatorCard 
            title="Stocks Down 13% (34 days)" 
            indicator={indicators.stocksDown13Pct34Days}
            description="Medium-term decliners"
          />
        </div>
      </Card>

      {/* Historical Data Summary */}
      <Card 
        title="Historical Context" 
        subtitle={`Based on ${historicalData.length} recent trading days`}
      >
        <div className="text-center p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {historicalData.length}
              </div>
              <div className="text-sm text-gray-600">Days of Data</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {currentData.dataSource.toUpperCase()}
              </div>
              <div className="text-sm text-gray-600">Data Source</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {new Date(currentData.updatedAt).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600">Last Updated</div>
            </div>
          </div>
          
          <div className="mt-6">
            <Button onClick={refreshData} variant="secondary" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}