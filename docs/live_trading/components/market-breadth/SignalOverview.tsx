'use client';

import { Card } from '@/components/ui/Card';
import { ProcessedIndicators } from '@/lib/utils/breadthIndicators';

interface SignalOverviewProps {
  indicators: ProcessedIndicators;
  date: string;
}

export function SignalOverview({ indicators, date }: SignalOverviewProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-green-600 bg-green-50';
    if (score <= 30) return 'text-red-600 bg-red-50';
    if (score <= 40) return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getBiasDisplay = (bias: string) => {
    switch (bias) {
      case 'bullish':
        return { text: 'BULLISH', color: 'text-green-600 bg-green-100', icon: '📈' };
      case 'bearish':
        return { text: 'BEARISH', color: 'text-red-600 bg-red-100', icon: '📉' };
      default:
        return { text: 'NEUTRAL', color: 'text-yellow-600 bg-yellow-100', icon: '📊' };
    }
  };

  const biasDisplay = getBiasDisplay(indicators.tradingBias);

  return (
    <Card className="mb-6">
      <div className="text-center">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Market Breadth Signal
          </h2>
          <p className="text-sm text-gray-600">
            {new Date(date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Overall Trading Bias */}
        <div className="mb-6">
          <div className={`inline-flex items-center px-6 py-3 rounded-lg font-bold text-lg ${biasDisplay.color}`}>
            <span className="mr-2 text-xl">{biasDisplay.icon}</span>
            {biasDisplay.text}
          </div>
          <div className="mt-2">
            <span className={`text-3xl font-bold ${getScoreColor(indicators.overallScore)}`}>
              {indicators.overallScore}
            </span>
            <span className="text-sm text-gray-600 ml-1">/100</span>
          </div>
        </div>

        {/* Category Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Primary Indicators */}
          <div className="text-center">
            <div className="mb-2">
              <span className="text-sm font-medium text-cyan-600 uppercase tracking-wide">
                Primary Indicators
              </span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(indicators.primaryScore)}`}>
              {indicators.primaryScore}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Daily momentum & ratios
            </div>
          </div>

          {/* Overarching Indicators */}
          <div className="text-center">
            <div className="mb-2">
              <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">
                Overarching
              </span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(indicators.overarchingScore)}`}>
              {indicators.overarchingScore}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              T2108 & market structure
            </div>
          </div>

          {/* Secondary Indicators */}
          <div className="text-center">
            <div className="mb-2">
              <span className="text-sm font-medium text-yellow-600 uppercase tracking-wide">
                Secondary
              </span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(indicators.secondaryScore)}`}>
              {indicators.secondaryScore}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Medium-term trends
            </div>
          </div>
        </div>

        {/* Trading Recommendation */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Trading Guidance</h3>
          <p className="text-sm text-gray-700">
            {indicators.tradingBias === 'bullish' && indicators.overallScore >= 70 && (
              'Strong bullish setup. Look for breakout opportunities and momentum plays.'
            )}
            {indicators.tradingBias === 'bullish' && indicators.overallScore < 70 && (
              'Moderately bullish conditions. Consider selective long positions with tight risk management.'
            )}
            {indicators.tradingBias === 'bearish' && indicators.overallScore <= 30 && (
              'Strong bearish setup. Consider short opportunities and defensive positioning.'
            )}
            {indicators.tradingBias === 'bearish' && indicators.overallScore > 30 && (
              'Moderately bearish conditions. Proceed with caution on long positions.'
            )}
            {indicators.tradingBias === 'neutral' && (
              'Mixed signals. Trade range-bound setups and wait for clearer directional signals.'
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}