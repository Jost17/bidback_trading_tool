'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MarketBreadthData } from '@/lib/types/market-breadth';
import { processMarketBreadthData } from '@/lib/utils/breadthIndicators';

type SortField = 'date' | 'overallScore' | 'primaryScore' | 'secondaryScore' | 't2108' | 'ratio5Day' | 'ratio10Day';
type SortDirection = 'asc' | 'desc';

export default function HistoricalData() {
  const [data, setData] = useState<MarketBreadthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedRow, setSelectedRow] = useState<MarketBreadthData | null>(null);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    fetchHistoricalData();
  }, []);

  const fetchHistoricalData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/market-breadth?limit=365');
      const result = await response.json();
      
      if (result.success && result.data) {
        const transformedData = result.data.map((item: any) => ({
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
        }));
        setData(transformedData);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    // Date range filter
    if (dateFilter.start) {
      filtered = filtered.filter(d => d.date >= dateFilter.start);
    }
    if (dateFilter.end) {
      filtered = filtered.filter(d => d.date <= dateFilter.end);
    }

    // Search filter
    if (searchDate) {
      filtered = filtered.filter(d => d.date.includes(searchDate));
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'date':
          aValue = a.date;
          bValue = b.date;
          break;
        case 'overallScore':
        case 'primaryScore':
        case 'secondaryScore':
          const aIndicators = processMarketBreadthData(a);
          const bIndicators = processMarketBreadthData(b);
          aValue = aIndicators[sortField];
          bValue = bIndicators[sortField];
          break;
        case 't2108':
          aValue = parseFloat(a.t2108 as any) || 0;
          bValue = parseFloat(b.t2108 as any) || 0;
          break;
        case 'ratio5Day':
          aValue = parseFloat(a.ratio5Day as any) || 0;
          bValue = parseFloat(b.ratio5Day as any) || 0;
          break;
        case 'ratio10Day':
          aValue = parseFloat(a.ratio10Day as any) || 0;
          bValue = parseFloat(b.ratio10Day as any) || 0;
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [data, sortField, sortDirection, dateFilter, searchDate]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 font-semibold';
    if (score >= 60) return 'text-green-600';
    if (score <= 30) return 'text-red-600 font-semibold';
    if (score <= 40) return 'text-red-600';
    return 'text-yellow-600';
  };

  const formatValue = (value: any, isPercentage = false) => {
    if (value === null || value === undefined) return '--';
    if (isPercentage) {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return `${num.toFixed(1)}%`;
    }
    return value.toString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Date
            </label>
            <input
              type="text"
              placeholder="YYYY-MM-DD"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                setSearchDate('');
                setDateFilter({ start: '', end: '' });
              }}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-blue-600"
                  >
                    <span>Date</span>
                    {sortField === 'date' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort('overallScore')}
                    className="flex items-center justify-center space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-blue-600 w-full"
                  >
                    <span>Overall</span>
                    {sortField === 'overallScore' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort('primaryScore')}
                    className="flex items-center justify-center space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-blue-600 w-full"
                  >
                    <span>Primary</span>
                    {sortField === 'primaryScore' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort('secondaryScore')}
                    className="flex items-center justify-center space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-blue-600 w-full"
                  >
                    <span>Secondary</span>
                    {sortField === 'secondaryScore' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort('t2108')}
                    className="flex items-center justify-center space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-blue-600 w-full"
                  >
                    <span>T2108</span>
                    {sortField === 't2108' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort('ratio5Day')}
                    className="flex items-center justify-center space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-blue-600 w-full"
                  >
                    <span>5D Ratio</span>
                    {sortField === 'ratio5Day' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort('ratio10Day')}
                    className="flex items-center justify-center space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-blue-600 w-full"
                  >
                    <span>10D Ratio</span>
                    {sortField === 'ratio10Day' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Up 4%
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Down 4%
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedData.map((row) => {
                const indicators = processMarketBreadthData(row);
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedRow(row)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(row.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-center ${getScoreColor(indicators.overallScore)}`}>
                      {indicators.overallScore}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-center ${getScoreColor(indicators.primaryScore)}`}>
                      {indicators.primaryScore}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-center ${getScoreColor(indicators.secondaryScore)}`}>
                      {indicators.secondaryScore}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatValue(row.t2108, true)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatValue(row.ratio5Day, true)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatValue(row.ratio10Day, true)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-green-600">
                      {formatValue(row.stocksUp4PctDaily)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-red-600">
                      {formatValue(row.stocksDown4PctDaily)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRow(row);
                        }}
                        variant="secondary"
                        size="sm"
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSortedData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No data found for the selected filters</p>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">
                  Market Breadth Details - {new Date(selectedRow.date).toLocaleDateString()}
                </h2>
                <button
                  onClick={() => setSelectedRow(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Scores Overview */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Signal Scores</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {(() => {
                      const indicators = processMarketBreadthData(selectedRow);
                      return (
                        <>
                          <div className="text-center p-3 bg-gray-50 rounded">
                            <div className={`text-2xl font-bold ${getScoreColor(indicators.overallScore)}`}>
                              {indicators.overallScore}
                            </div>
                            <div className="text-sm text-gray-600">Overall</div>
                          </div>
                          <div className="text-center p-3 bg-cyan-50 rounded">
                            <div className={`text-2xl font-bold ${getScoreColor(indicators.primaryScore)}`}>
                              {indicators.primaryScore}
                            </div>
                            <div className="text-sm text-gray-600">Primary</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded">
                            <div className={`text-2xl font-bold ${getScoreColor(indicators.secondaryScore)}`}>
                              {indicators.secondaryScore}
                            </div>
                            <div className="text-sm text-gray-600">Secondary</div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded">
                            <div className={`text-2xl font-bold ${getScoreColor(indicators.overarchingScore)}`}>
                              {indicators.overarchingScore}
                            </div>
                            <div className="text-sm text-gray-600">Overarching</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Primary Indicators */}
                <div>
                  <h3 className="text-lg font-medium mb-3 text-cyan-600">Primary Indicators</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Up 4% Daily:</span>
                      <span className="font-medium text-green-600">{formatValue(selectedRow.stocksUp4PctDaily)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Down 4% Daily:</span>
                      <span className="font-medium text-red-600">{formatValue(selectedRow.stocksDown4PctDaily)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">5-Day Ratio:</span>
                      <span className="font-medium">{formatValue(selectedRow.ratio5Day, true)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">10-Day Ratio:</span>
                      <span className="font-medium">{formatValue(selectedRow.ratio10Day, true)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Up 25% Quarterly:</span>
                      <span className="font-medium text-green-600">{formatValue(selectedRow.stocksUp25PctQuarterly)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Down 25% Quarterly:</span>
                      <span className="font-medium text-red-600">{formatValue(selectedRow.stocksDown25PctQuarterly)}</span>
                    </div>
                  </div>
                </div>

                {/* Secondary Indicators */}
                <div>
                  <h3 className="text-lg font-medium mb-3 text-yellow-600">Secondary Indicators</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Up 25% Monthly:</span>
                      <span className="font-medium text-green-600">{formatValue(selectedRow.stocksUp25PctMonthly)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Down 25% Monthly:</span>
                      <span className="font-medium text-red-600">{formatValue(selectedRow.stocksDown25PctMonthly)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Up 50% Monthly:</span>
                      <span className="font-medium text-green-600">{formatValue(selectedRow.stocksUp50PctMonthly)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Down 50% Monthly:</span>
                      <span className="font-medium text-red-600">{formatValue(selectedRow.stocksDown50PctMonthly)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Up 13% (34 days):</span>
                      <span className="font-medium text-green-600">{formatValue(selectedRow.stocksUp13Pct34Days)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Down 13% (34 days):</span>
                      <span className="font-medium text-red-600">{formatValue(selectedRow.stocksDown13Pct34Days)}</span>
                    </div>
                  </div>
                </div>

                {/* Overarching Indicators */}
                <div>
                  <h3 className="text-lg font-medium mb-3 text-blue-600">Overarching Indicators</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">T2108:</span>
                      <span className="font-medium">{formatValue(selectedRow.t2108, true)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Worden Stocks:</span>
                      <span className="font-medium">{formatValue(selectedRow.wordenCommonStocks)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">S&P Reference:</span>
                      <span className="font-medium">{formatValue(selectedRow.spReference)}</span>
                    </div>
                  </div>
                </div>

                {/* Custom Indicators */}
                <div>
                  <h3 className="text-lg font-medium mb-3 text-purple-600">Custom Indicators</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Up 20%:</span>
                      <span className="font-medium text-green-600">{formatValue(selectedRow.stocksUp20PctCustom)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Down 20%:</span>
                      <span className="font-medium text-red-600">{formatValue(selectedRow.stocksDown20PctCustom)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Up $20:</span>
                      <span className="font-medium text-green-600">{formatValue(selectedRow.stocksUp20DollarCustom)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Stocks Down $20:</span>
                      <span className="font-medium text-red-600">{formatValue(selectedRow.stocksDown20DollarCustom)}</span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Data Source:</span> {selectedRow.dataSource}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span> {new Date(selectedRow.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <Card className="p-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{filteredAndSortedData.length}</span> of{' '}
            <span className="font-medium">{data.length}</span> records
          </div>
          <Button
            onClick={fetchHistoricalData}
            variant="secondary"
            size="sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </Card>
    </div>
  );
}