'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Trade, PerformanceMetrics, DashboardKPI } from '@/lib/types/trading-journal';
import { safeAdd, safeDivide, formatDecimal } from '@/lib/utils/decimal';

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

const TIME_RANGES: TimeRange[] = [
  { label: '7 Days', value: '7d', days: 7 },
  { label: '30 Days', value: '30d', days: 30 },
  { label: '90 Days', value: '90d', days: 90 },
  { label: '1 Year', value: '1y', days: 365 },
  { label: 'All Time', value: 'all', days: 0 },
];

interface CalendarDay {
  date: string;
  pnl: number;
  trades: number;
  status: 'positive' | 'negative' | 'neutral' | 'no-trades';
}

export default function PerformanceDashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('30d');
  const [showCalendar, setShowCalendar] = useState(false);

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedTimeRange !== 'all') {
        const days = TIME_RANGES.find(r => r.value === selectedTimeRange)?.days || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        params.append('dateStart', startDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`/api/trades?${params.toString()}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setTrades(result.data);
      }
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const performanceMetrics = useMemo((): PerformanceMetrics => {
    const closedTrades = trades.filter(t => t.tradeStatus === 'CLOSED' && t.netPnl !== undefined);
    const totalTrades = closedTrades.length;
    
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        breakevenTrades: 0,
        winRate: 0,
        totalPnl: 0,
        avgPnl: 0,
        biggestWinner: 0,
        biggestLoser: 0,
        avgWinner: 0,
        avgLoser: 0,
        profitFactor: 0,
        pnlStdDev: 0,
        bestMonth: 0,
        worstMonth: 0,
        totalFees: 0,
        avgTradeHour: 0,
      };
    }

    const winners = closedTrades.filter(t => (t.netPnl || 0) > 0);
    const losers = closedTrades.filter(t => (t.netPnl || 0) < 0);
    const breakevens = closedTrades.filter(t => (t.netPnl || 0) === 0);

    // Use Decimal.js for precise financial calculations
    const totalPnl = safeAdd(...closedTrades.map(t => t.netPnl || 0));
    const totalWinningPnl = safeAdd(...winners.map(t => t.netPnl || 0));
    const totalLosingPnlRaw = safeAdd(...losers.map(t => t.netPnl || 0));
    const totalLosingPnl = Math.abs(totalLosingPnlRaw);
    
    const biggestWinner = Math.max(...closedTrades.map(t => t.netPnl || 0));
    const biggestLoser = Math.min(...closedTrades.map(t => t.netPnl || 0));
    
    const avgWinner = winners.length > 0 ? safeDivide(totalWinningPnl, winners.length) || 0 : 0;
    const avgLoser = losers.length > 0 ? safeDivide(totalLosingPnl, losers.length) || 0 : 0;
    
    const profitFactor = totalLosingPnl > 0 ? 
      safeDivide(totalWinningPnl, totalLosingPnl) || 0 : 
      totalWinningPnl > 0 ? 999 : 0;
    
    const avgPnl = safeDivide(totalPnl, totalTrades) || 0;
    const variance = closedTrades.reduce((sum, t) => {
      const diff = (t.netPnl || 0) - avgPnl;
      return sum + (diff * diff);
    }, 0) / totalTrades;
    const pnlStdDev = Math.sqrt(variance);

    const totalFees = safeAdd(...closedTrades.map(t => t.fees || 0));

    return {
      totalTrades,
      winningTrades: winners.length,
      losingTrades: losers.length,
      breakevenTrades: breakevens.length,
      winRate: (winners.length / totalTrades) * 100,
      totalPnl,
      avgPnl,
      biggestWinner,
      biggestLoser,
      avgWinner,
      avgLoser,
      profitFactor,
      pnlStdDev,
      bestMonth: 0, // TODO: Calculate monthly data
      worstMonth: 0, // TODO: Calculate monthly data
      totalFees,
      avgTradeHour: 0, // TODO: Calculate from time data
    };
  }, [trades]);

  const kpis = useMemo((): DashboardKPI[] => {
    const metrics = performanceMetrics;
    
    return [
      {
        label: 'Total P&L',
        value: metrics.totalPnl,
        status: metrics.totalPnl > 0 ? 'positive' : metrics.totalPnl < 0 ? 'negative' : 'neutral',
        format: 'currency',
      },
      {
        label: 'Win Rate',
        value: metrics.winRate,
        status: metrics.winRate >= 50 ? 'positive' : 'negative',
        format: 'percentage',
      },
      {
        label: 'Profit Factor',
        value: metrics.profitFactor,
        status: metrics.profitFactor > 1 ? 'positive' : 'negative',
        format: 'number',
      },
      {
        label: 'Total Trades',
        value: metrics.totalTrades,
        status: 'neutral',
        format: 'number',
      },
      {
        label: 'Avg P&L',
        value: metrics.avgPnl,
        status: metrics.avgPnl > 0 ? 'positive' : metrics.avgPnl < 0 ? 'negative' : 'neutral',
        format: 'currency',
      },
      {
        label: 'Best Trade',
        value: metrics.biggestWinner,
        status: 'positive',
        format: 'currency',
      },
      {
        label: 'Worst Trade',
        value: metrics.biggestLoser,
        status: 'negative',
        format: 'currency',
      },
      {
        label: 'Total Fees',
        value: metrics.totalFees,
        status: 'neutral',
        format: 'currency',
      },
    ];
  }, [performanceMetrics]);

  const calendarData = useMemo((): CalendarDay[] => {
    const dailyData = new Map<string, { pnl: number; trades: number }>();
    
    trades.forEach(trade => {
      const date = trade.date;
      const existing = dailyData.get(date) || { pnl: 0, trades: 0 };
      
      dailyData.set(date, {
        pnl: existing.pnl + (trade.netPnl || 0),
        trades: existing.trades + 1,
      });
    });

    const last90Days = [];
    const today = new Date();
    
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = dailyData.get(dateStr) || { pnl: 0, trades: 0 };
      
      let status: CalendarDay['status'] = 'no-trades';
      if (dayData.trades > 0) {
        if (dayData.pnl > 0) status = 'positive';
        else if (dayData.pnl < 0) status = 'negative';
        else status = 'neutral';
      }
      
      last90Days.push({
        date: dateStr,
        pnl: dayData.pnl,
        trades: dayData.trades,
        status,
      });
    }
    
    return last90Days;
  }, [trades]);

  const formatValue = (value: number | string, format: DashboardKPI['format']): string => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const getStatusColor = (status: DashboardKPI['status']): string => {
    switch (status) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getCalendarDayColor = (status: CalendarDay['status']): string => {
    switch (status) {
      case 'positive':
        return 'bg-green-200 hover:bg-green-300';
      case 'negative':
        return 'bg-red-200 hover:bg-red-300';
      case 'neutral':
        return 'bg-gray-200 hover:bg-gray-300';
      default:
        return 'bg-gray-50 hover:bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
          <p className="text-gray-600">Track your trading performance and key metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedTimeRange(range.value)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedTimeRange === range.value
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <Button
            onClick={() => setShowCalendar(!showCalendar)}
            variant="secondary"
            size="sm"
          >
            {showCalendar ? 'Hide' : 'Show'} Calendar
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index} className="p-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getStatusColor(kpi.status)}`}>
                {formatValue(kpi.value, kpi.format)}
              </div>
              <div className="text-sm text-gray-600 mt-1">{kpi.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Trading Calendar */}
      {showCalendar && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Trading Calendar (Last 90 Days)</h3>
          <div className="grid grid-cols-10 gap-1">
            {calendarData.map((day) => (
              <div
                key={day.date}
                className={`aspect-square rounded text-xs flex items-center justify-center cursor-pointer transition-colors ${getCalendarDayColor(day.status)}`}
                title={`${day.date}: ${formatValue(day.pnl, 'currency')} (${day.trades} trades)`}
              >
                {new Date(day.date).getDate()}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-200 rounded"></div>
                <span>Profitable</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-200 rounded"></div>
                <span>Loss</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-200 rounded"></div>
                <span>Breakeven</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-50 rounded border"></div>
                <span>No Trades</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win/Loss Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4 text-green-600">Win/Loss Analysis</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Winning Trades:</span>
              <div className="text-right">
                <div className="font-medium text-green-600">{performanceMetrics.winningTrades}</div>
                <div className="text-xs text-gray-500">
                  Avg: {formatValue(performanceMetrics.avgWinner, 'currency')}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Losing Trades:</span>
              <div className="text-right">
                <div className="font-medium text-red-600">{performanceMetrics.losingTrades}</div>
                <div className="text-xs text-gray-500">
                  Avg: {formatValue(performanceMetrics.avgLoser, 'currency')}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Breakeven Trades:</span>
              <div className="font-medium text-gray-600">{performanceMetrics.breakevenTrades}</div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Win Rate:</span>
                <div className={`font-bold ${performanceMetrics.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatValue(performanceMetrics.winRate, 'percentage')}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Risk Metrics */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4 text-yellow-600">Risk Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Profit Factor:</span>
              <div className={`font-medium ${performanceMetrics.profitFactor > 1 ? 'text-green-600' : 'text-red-600'}`}>
                {formatDecimal(performanceMetrics.profitFactor, 2)}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">P&L Std Deviation:</span>
              <div className="font-medium text-gray-600">
                {formatValue(performanceMetrics.pnlStdDev, 'currency')}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Best Trade:</span>
              <div className="font-medium text-green-600">
                {formatValue(performanceMetrics.biggestWinner, 'currency')}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Worst Trade:</span>
              <div className="font-medium text-red-600">
                {formatValue(performanceMetrics.biggestLoser, 'currency')}
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Fees:</span>
                <div className="font-bold text-gray-600">
                  {formatValue(performanceMetrics.totalFees, 'currency')}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Performance Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4 text-purple-600">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {performanceMetrics.totalTrades}
            </div>
            <div className="text-sm text-gray-600">Total Trades</div>
            <div className="text-xs text-gray-500 mt-1">
              Selected period: {TIME_RANGES.find(r => r.value === selectedTimeRange)?.label}
            </div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 ${getStatusColor(performanceMetrics.totalPnl > 0 ? 'positive' : performanceMetrics.totalPnl < 0 ? 'negative' : 'neutral')}`}>
              {formatValue(performanceMetrics.totalPnl, 'currency')}
            </div>
            <div className="text-sm text-gray-600">Net P&L</div>
            <div className="text-xs text-gray-500 mt-1">
              Avg per trade: {formatValue(performanceMetrics.avgPnl, 'currency')}
            </div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 ${getStatusColor(performanceMetrics.winRate >= 50 ? 'positive' : 'negative')}`}>
              {formatValue(performanceMetrics.winRate, 'percentage')}
            </div>
            <div className="text-sm text-gray-600">Win Rate</div>
            <div className="text-xs text-gray-500 mt-1">
              {performanceMetrics.winningTrades}W / {performanceMetrics.losingTrades}L
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button
          onClick={fetchTrades}
          variant="secondary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </Button>
        <Button
          onClick={() => window.print()}
          variant="primary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Export Report
        </Button>
      </div>
    </div>
  );
}