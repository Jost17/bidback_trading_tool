'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Trade } from '@/lib/types/trading-journal';

type SortField = 'date' | 'symbol' | 'direction' | 'netPnl' | 'tradeGrade' | 'winRate' | 'quantity' | 'setupType';
type SortDirection = 'asc' | 'desc';

interface TradeFilters {
  dateStart: string;
  dateEnd: string;
  symbol: string;
  direction: string;
  setupType: string;
  tradeStatus: string;
  isPaperTrade: string;
  minPnl: string;
  maxPnl: string;
}

export default function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [filters, setFilters] = useState<TradeFilters>({
    dateStart: '',
    dateEnd: '',
    symbol: '',
    direction: '',
    setupType: '',
    tradeStatus: '',
    isPaperTrade: '',
    minPnl: '',
    maxPnl: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
      
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
  }, [filters]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const filteredAndSortedTrades = useMemo(() => {
    let filtered = [...trades];

    // Apply local filters for quick search
    if (filters.symbol) {
      filtered = filtered.filter(trade => 
        trade.symbol.toLowerCase().includes(filters.symbol.toLowerCase())
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'date':
          aValue = a.date;
          bValue = b.date;
          break;
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'direction':
          aValue = a.direction;
          bValue = b.direction;
          break;
        case 'netPnl':
          aValue = a.netPnl || 0;
          bValue = b.netPnl || 0;
          break;
        case 'tradeGrade':
          aValue = a.tradeGrade || 'F';
          bValue = b.tradeGrade || 'F';
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'setupType':
          aValue = a.setupType || '';
          bValue = b.setupType || '';
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
  }, [trades, sortField, sortDirection, filters.symbol]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getPnlColor = (pnl: number | undefined) => {
    if (!pnl) return 'text-gray-600';
    if (pnl > 0) return 'text-green-600 font-semibold';
    if (pnl < 0) return 'text-red-600 font-semibold';
    return 'text-gray-600';
  };

  const getGradeColor = (grade: string | undefined) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'LONG' ? 'text-green-600' : 'text-red-600';
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleFilterChange = (field: keyof TradeFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      dateStart: '',
      dateEnd: '',
      symbol: '',
      direction: '',
      setupType: '',
      tradeStatus: '',
      isPaperTrade: '',
      minPnl: '',
      maxPnl: '',
    });
  };

  const applyFilters = () => {
    fetchTrades();
    setShowFilters(false);
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const closedTrades = filteredAndSortedTrades.filter(t => t.tradeStatus === 'CLOSED' && t.netPnl !== undefined);
    const totalTrades = closedTrades.length;
    const winners = closedTrades.filter(t => (t.netPnl || 0) > 0).length;
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
    const winRate = totalTrades > 0 ? (winners / totalTrades) * 100 : 0;

    return { totalTrades, winners, totalPnl, winRate };
  }, [filteredAndSortedTrades]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{summaryStats.totalTrades}</div>
            <div className="text-sm text-gray-600">Total Trades</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summaryStats.winners}</div>
            <div className="text-sm text-gray-600">Winners</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPnlColor(summaryStats.totalPnl)}`}>
              {formatCurrency(summaryStats.totalPnl)}
            </div>
            <div className="text-sm text-gray-600">Total P&L</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${summaryStats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
              {summaryStats.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Win Rate</div>
          </div>
        </div>
      </Card>

      {/* Filter Controls */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Trade History</h3>
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="secondary"
              size="sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
              Filters
            </Button>
            <Button
              onClick={fetchTrades}
              variant="secondary"
              size="sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="border-t pt-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
                <input
                  type="text"
                  placeholder="AAPL"
                  value={filters.symbol}
                  onChange={(e) => handleFilterChange('symbol', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.dateStart}
                  onChange={(e) => handleFilterChange('dateStart', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.dateEnd}
                  onChange={(e) => handleFilterChange('dateEnd', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                <select
                  value={filters.direction}
                  onChange={(e) => handleFilterChange('direction', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All</option>
                  <option value="LONG">Long</option>
                  <option value="SHORT">Short</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.tradeStatus}
                  onChange={(e) => handleFilterChange('tradeStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All</option>
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min P&L</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="-100"
                  value={filters.minPnl}
                  onChange={(e) => handleFilterChange('minPnl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max P&L</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="500"
                  value={filters.maxPnl}
                  onChange={(e) => handleFilterChange('maxPnl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trade Type</label>
                <select
                  value={filters.isPaperTrade}
                  onChange={(e) => handleFilterChange('isPaperTrade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All</option>
                  <option value="false">Live</option>
                  <option value="true">Paper</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button onClick={clearAllFilters} variant="secondary" size="sm">
                Clear All
              </Button>
              <Button onClick={applyFilters} variant="primary" size="sm">
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Trade Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-green-600"
                  >
                    <span>Date</span>
                    {sortField === 'date' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('symbol')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-green-600"
                  >
                    <span>Symbol</span>
                    {sortField === 'symbol' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort('direction')}
                    className="flex items-center justify-center space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-green-600 w-full"
                  >
                    <span>Direction</span>
                    {sortField === 'direction' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('quantity')}
                    className="flex items-center justify-end space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-green-600 w-full"
                  >
                    <span>Quantity</span>
                    {sortField === 'quantity' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Entry Price</th>
                <th className="px-4 py-3 text-right">Exit Price</th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort('netPnl')}
                    className="flex items-center justify-end space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-green-600 w-full"
                  >
                    <span>P&L</span>
                    {sortField === 'netPnl' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleSort('tradeGrade')}
                    className="flex items-center justify-center space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-green-600 w-full"
                  >
                    <span>Grade</span>
                    {sortField === 'tradeGrade' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('setupType')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-900 uppercase tracking-wider hover:text-green-600"
                  >
                    <span>Setup</span>
                    {sortField === 'setupType' && (
                      <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedTrades.map((trade) => (
                <tr
                  key={trade.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedTrade(trade)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatDate(trade.date)}
                    {trade.isPaperTrade && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Paper
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {trade.symbol}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-center font-medium ${getDirectionColor(trade.direction)}`}>
                    {trade.direction}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {trade.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    ${trade.entryPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '--'}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-right ${getPnlColor(trade.netPnl)}`}>
                    {formatCurrency(trade.netPnl)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {trade.tradeGrade && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getGradeColor(trade.tradeGrade)}`}>
                        {trade.tradeGrade}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {trade.setupType || '--'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      trade.tradeStatus === 'OPEN' ? 'bg-yellow-100 text-yellow-800' :
                      trade.tradeStatus === 'CLOSED' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {trade.tradeStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTrade(trade);
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedTrades.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No trades found for the selected filters</p>
          </div>
        )}
      </Card>

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedTrade.symbol} - {selectedTrade.direction} Trade
                  </h2>
                  <p className="text-gray-600">{formatDate(selectedTrade.date)}</p>
                </div>
                <button
                  onClick={() => setSelectedTrade(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Trade Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-gray-900">{selectedTrade.quantity}</div>
                    <div className="text-sm text-gray-600">Quantity</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-gray-900">${selectedTrade.entryPrice.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">Entry Price</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-gray-900">
                      {selectedTrade.exitPrice ? `$${selectedTrade.exitPrice.toFixed(2)}` : 'Open'}
                    </div>
                    <div className="text-sm text-gray-600">Exit Price</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className={`text-lg font-bold ${getPnlColor(selectedTrade.netPnl)}`}>
                      {formatCurrency(selectedTrade.netPnl)}
                    </div>
                    <div className="text-sm text-gray-600">Net P&L</div>
                  </div>
                </div>

                {/* Trade Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-medium mb-3 text-green-600">Trade Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Setup Type:</span>
                        <span className="font-medium">{selectedTrade.setupType || '--'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Market Condition:</span>
                        <span className="font-medium">{selectedTrade.marketCondition || '--'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Sector:</span>
                        <span className="font-medium">{selectedTrade.sector || '--'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Grade:</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getGradeColor(selectedTrade.tradeGrade)}`}>
                          {selectedTrade.tradeGrade || '--'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Risk Management */}
                  <div>
                    <h3 className="text-lg font-medium mb-3 text-yellow-600">Risk Management</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Stop Loss:</span>
                        <span className="font-medium">
                          {selectedTrade.stopLoss ? `$${selectedTrade.stopLoss.toFixed(2)}` : '--'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Target Price:</span>
                        <span className="font-medium">
                          {selectedTrade.targetPrice ? `$${selectedTrade.targetPrice.toFixed(2)}` : '--'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Position Size:</span>
                        <span className="font-medium">
                          {selectedTrade.positionSizePercent ? `${selectedTrade.positionSizePercent}%` : '--'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">R/R Ratio:</span>
                        <span className="font-medium">
                          {selectedTrade.riskRewardRatio ? `1:${selectedTrade.riskRewardRatio.toFixed(2)}` : '--'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {(selectedTrade.entryNotes || selectedTrade.exitNotes || selectedTrade.lessonsLearned) && (
                  <div>
                    <h3 className="text-lg font-medium mb-3 text-purple-600">Notes & Analysis</h3>
                    <div className="space-y-3">
                      {selectedTrade.entryNotes && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">Entry Notes:</div>
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {selectedTrade.entryNotes}
                          </div>
                        </div>
                      )}
                      {selectedTrade.exitNotes && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">Exit Notes:</div>
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {selectedTrade.exitNotes}
                          </div>
                        </div>
                      )}
                      {selectedTrade.lessonsLearned && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">Lessons Learned:</div>
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {selectedTrade.lessonsLearned}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Psychology & Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3 text-blue-600">Psychology</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Confidence Level:</span>
                        <span className="font-medium">
                          {selectedTrade.confidenceLevel ? `${selectedTrade.confidenceLevel}/10` : '--'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Emotion:</span>
                        <span className="font-medium">{selectedTrade.emotion || '--'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3 text-gray-600">Metadata</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          selectedTrade.tradeStatus === 'OPEN' ? 'bg-yellow-100 text-yellow-800' :
                          selectedTrade.tradeStatus === 'CLOSED' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedTrade.tradeStatus}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Created:</span>
                        <span className="font-medium">
                          {new Date(selectedTrade.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {selectedTrade.fees && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Fees:</span>
                          <span className="font-medium">{formatCurrency(selectedTrade.fees)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <Card className="p-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{filteredAndSortedTrades.length}</span> of{' '}
            <span className="font-medium">{trades.length}</span> trades
          </div>
          <div className="text-sm text-gray-600">
            Total P&L: <span className={`font-medium ${getPnlColor(summaryStats.totalPnl)}`}>
              {formatCurrency(summaryStats.totalPnl)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}