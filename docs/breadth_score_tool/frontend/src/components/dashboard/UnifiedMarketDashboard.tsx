import React, { useState } from 'react';
import { Upload, Database, Plus, ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react';
import { useMarketData, useChartData, TimeRange } from '../../hooks/useMarketData';
import { marketUtils } from '../../utils/marketUtils';
import { MarketData } from '../../types';
import EnhancedDataImportModal from '../EnhancedDataImportModal';

interface DashboardTheme {
  name: string;
  containerClass: string;
  cardClass: string;
  textPrimary: string;
  textSecondary: string;
  buttonClass: string;
}

const themes: Record<string, DashboardTheme> = {
  modern: {
    name: 'Modern',
    containerClass: 'min-h-screen bg-gray-100 p-4',
    cardClass: 'bg-white rounded-lg shadow-md p-6',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg'
  },
  dark: {
    name: 'Dark',
    containerClass: 'min-h-screen bg-gray-900 p-4',
    cardClass: 'bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700',
    textPrimary: 'text-white',
    textSecondary: 'text-gray-300',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg'
  },
  minimal: {
    name: 'Minimal',
    containerClass: 'min-h-screen bg-white p-4',
    cardClass: 'bg-gray-50 rounded-md p-4 border border-gray-200',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-500',
    buttonClass: 'bg-gray-900 hover:bg-gray-800 text-white px-3 py-1 rounded'
  }
};

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  status?: 'positive' | 'negative' | 'neutral';
  theme: DashboardTheme;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, status, theme }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return theme.textSecondary;
    }
  };

  return (
    <div className={theme.cardClass}>
      <h3 className={`text-sm font-medium ${theme.textSecondary}`}>{title}</h3>
      <div className="mt-2">
        <p className={`text-2xl font-semibold ${theme.textPrimary}`}>{value}</p>
        {change && (
          <p className={`text-sm ${getStatusColor()}`}>{change}</p>
        )}
      </div>
    </div>
  );
};

interface UnifiedMarketDashboardProps {
  initialTheme?: keyof typeof themes;
}

const UnifiedMarketDashboard: React.FC<UnifiedMarketDashboardProps> = ({ 
  initialTheme = 'modern' 
}) => {
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof themes>(initialTheme);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [showDataImportModal, setShowDataImportModal] = useState(false);
  
  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Column visibility management
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    breadth_score: true,
    up_4pct: true,
    down_4pct: true,
    up_20pct: true,
    down_20pct: true,
    up_25_quarter: true,
    down_25_quarter: true,
    t2108: true,
    universe: false, // Hidden by default
    ratio_5day: true,
    ratio_10day: true
  });
  const [showColumnManager, setShowColumnManager] = useState(false);
  
  const theme = themes[selectedTheme];
  const { 
    data, 
    currentStatus, 
    loading, 
    error, 
    refreshData,
    fetchData,
    getMarketStatus,
    isMarketOpen,
    pagination
  } = useMarketData();
  
  const { chartData } = useChartData(timeRange);

  // Calculate metrics from current data
  const latestData = data[0];
  const previousData = data[1];
  const marketStatus = getMarketStatus();
  const isOpen = isMarketOpen();

  // Pagination and filtering handlers
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const offset = (newPage - 1) * pageSize;
    fetchData({ 
      limit: pageSize, 
      offset,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    fetchData({ 
      limit: newPageSize, 
      offset: 0,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });
  };

  const handleDateFilter = () => {
    setCurrentPage(1);
    fetchData({ 
      limit: pageSize, 
      offset: 0,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    fetchData({ limit: pageSize, offset: 0 });
  };

  // Color coding functions for market data
  const getValueColor = (value: number | null | undefined, type: string): string => {
    if (value === null || value === undefined) return 'text-gray-400';
    
    // Different color schemes based on data type
    switch (type) {
      case 'up_4pct':
      case 'up_20pct':
      case 'up_25_quarter':
        if (value >= 500) return 'text-green-700 font-bold';
        if (value >= 300) return 'text-green-600 font-semibold';
        if (value >= 150) return 'text-green-500';
        if (value >= 50) return 'text-yellow-600';
        return 'text-red-500';
        
      case 'down_4pct':
      case 'down_20pct':
      case 'down_25_quarter':
        if (value >= 500) return 'text-red-700 font-bold';
        if (value >= 300) return 'text-red-600 font-semibold';
        if (value >= 150) return 'text-red-500';
        if (value >= 50) return 'text-yellow-600';
        return 'text-green-500';
        
      default:
        return 'text-gray-700';
    }
  };

  const getT2108Color = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'text-gray-400';
    
    if (value > 80) return 'text-green-700 font-bold bg-green-50 px-2 py-1 rounded';
    if (value > 60) return 'text-green-600 font-semibold';
    if (value >= 40) return 'text-yellow-600';
    if (value >= 20) return 'text-red-500';
    return 'text-red-700 font-bold bg-red-50 px-2 py-1 rounded';
  };

  const getRatioColor = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'text-gray-400';
    
    if (value >= 3) return 'text-green-700 font-bold';
    if (value >= 2) return 'text-green-600 font-semibold';
    if (value >= 1) return 'text-green-500';
    if (value >= 0.5) return 'text-yellow-600';
    return 'text-red-500';
  };

  const renderHeader = () => (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 ${theme.cardClass}`}>
      <div>
        <h1 className={`text-3xl font-bold ${theme.textPrimary}`}>
          Trading Tool Dashboard
        </h1>
        <p className={theme.textSecondary}>
          {marketUtils.formatDate(new Date(), { format: 'long', includeTime: true })}
        </p>
        <div className="flex items-center mt-2">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isOpen ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className={`text-sm ${theme.textSecondary}`}>
            Market {isOpen ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-3 mt-4 sm:mt-0">
        {/* Data Entry Button */}
        <button
          onClick={() => setShowDataImportModal(true)}
          className={`${theme.buttonClass} flex items-center space-x-2`}
        >
          <Plus className="w-4 h-4" />
          <span>Add Data</span>
        </button>
        
        {/* Theme Selector */}
        <select
          value={selectedTheme}
          onChange={(e) => setSelectedTheme(e.target.value as keyof typeof themes)}
          className={`${theme.buttonClass} bg-transparent border border-current`}
        >
          {Object.entries(themes).map(([key, theme]) => (
            <option key={key} value={key} className="bg-gray-800 text-white">
              {theme.name}
            </option>
          ))}
        </select>
        
        {/* Refresh Button */}
        <button
          onClick={refreshData}
          disabled={loading === 'loading'}
          className={theme.buttonClass}
        >
          {loading === 'loading' ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    </div>
  );

  const renderMetrics = () => {
    if (!latestData || !currentStatus) return null;

    const breadthTrend = marketUtils.calculateTrend(
      currentStatus.breadthScore,
      previousData?.breadth_score
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Breadth Score"
          value={currentStatus.breadthScore}
          change={breadthTrend.change ? 
            `${breadthTrend.change > 0 ? '+' : ''}${breadthTrend.change.toFixed(1)}` : undefined}
          status={breadthTrend.direction === 'up' ? 'positive' : 
                 breadthTrend.direction === 'down' ? 'negative' : 'neutral'}
          theme={theme}
        />
        
        <MetricCard
          title="Market Status"
          value={marketStatus.charAt(0).toUpperCase() + marketStatus.slice(1)}
          theme={theme}
        />
        
        <MetricCard
          title="Stocks Up 4%+"
          value={marketUtils.formatMarketValue(latestData.stocks_up_4pct)}
          theme={theme}
        />
        
        <MetricCard
          title="Stocks Down 4%+"
          value={marketUtils.formatMarketValue(latestData.stocks_down_4pct)}
          theme={theme}
        />
      </div>
    );
  };

  const renderTimeRangeSelector = () => (
    <div className={`${theme.cardClass} mb-6`}>
      <h2 className={`text-lg font-semibold ${theme.textPrimary} mb-4`}>
        Chart Time Range
      </h2>
      <div className="flex space-x-2">
        {(['1W', '1M', '3M', '1Y'] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded text-sm ${
              timeRange === range
                ? theme.buttonClass
                : `${theme.textSecondary} hover:${theme.textPrimary} border border-current`
            }`}
          >
            {range}
          </button>
        ))}
      </div>
    </div>
  );

  const renderDataTable = () => {
    const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;
    const startRecord = pagination ? (currentPage - 1) * pagination.limit + 1 : 1;
    const endRecord = pagination ? Math.min(currentPage * pagination.limit, pagination.total) : data.length;

    return (
      <div className={theme.cardClass}>
        {/* Header with filters */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4">
          <h2 className={`text-lg font-semibold ${theme.textPrimary}`}>
            Historical Market Data
            {pagination && (
              <span className={`text-sm font-normal ${theme.textSecondary} ml-2`}>
                ({pagination.total.toLocaleString()} total records)
              </span>
            )}
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border ${theme.textSecondary} hover:${theme.textPrimary}`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border ${theme.textSecondary} hover:${theme.textPrimary}`}
            >
              <Database className="w-4 h-4" />
              Columns
            </button>
          </div>
        </div>

        {/* Date Filters */}
        {showFilters && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col gap-4">
              {/* Quick Year Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Year Selection
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013].map(year => (
                    <button
                      key={year}
                      onClick={() => {
                        setStartDate(`${year}-01-01`);
                        setEndDate(`${year}-12-31`);
                        setCurrentPage(1);
                        fetchData({ 
                          limit: pageSize, 
                          offset: 0,
                          startDate: `${year}-01-01`,
                          endDate: `${year}-12-31`
                        });
                      }}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-300"
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDateFilter}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Apply
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Column Manager */}
        {showColumnManager && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Manage Columns</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries({
                date: 'Date',
                breadth_score: 'Breadth Score',
                up_4pct: 'Up 4%+',
                down_4pct: 'Down 4%+',
                up_20pct: 'Up 20%+',
                down_20pct: 'Down 20%+',
                up_25_quarter: 'Up 25% Qtr',
                down_25_quarter: 'Down 25% Qtr',
                t2108: 'T2108',
                universe: 'Worden Universe',
                ratio_5day: '5-Day Ratio',
                ratio_10day: '10-Day Ratio'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={visibleColumns[key as keyof typeof visibleColumns]}
                    onChange={(e) => setVisibleColumns(prev => ({ 
                      ...prev, 
                      [key]: e.target.checked 
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={key === 'date'} // Date column always visible
                  />
                  <span className={key === 'date' ? 'text-gray-500' : 'text-gray-700'}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className={`${theme.textSecondary} border-b border-gray-300`}>
                {visibleColumns.date && <th className="text-left py-3 px-2 font-medium">Date</th>}
                {visibleColumns.breadth_score && <th className="text-left py-3 px-2 font-medium">Breadth Score</th>}
                {visibleColumns.up_4pct && <th className="text-left py-3 px-2 font-medium">Up 4%+</th>}
                {visibleColumns.down_4pct && <th className="text-left py-3 px-2 font-medium">Down 4%+</th>}
                {visibleColumns.up_20pct && <th className="text-left py-3 px-2 font-medium">Up 20%+</th>}
                {visibleColumns.down_20pct && <th className="text-left py-3 px-2 font-medium">Down 20%+</th>}
                {visibleColumns.up_25_quarter && <th className="text-left py-3 px-2 font-medium">Up 25% Qtr</th>}
                {visibleColumns.down_25_quarter && <th className="text-left py-3 px-2 font-medium">Down 25% Qtr</th>}
                {visibleColumns.t2108 && <th className="text-left py-3 px-2 font-medium">T2108</th>}
                {visibleColumns.universe && <th className="text-left py-3 px-2 font-medium">Universe</th>}
                {visibleColumns.ratio_5day && <th className="text-left py-3 px-2 font-medium">5D Ratio</th>}
                {visibleColumns.ratio_10day && <th className="text-left py-3 px-2 font-medium">10D Ratio</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id || item.date} className={`border-t border-gray-200 ${theme.textPrimary} hover:bg-gray-50`}>
                  {visibleColumns.date && (
                    <td className="py-2 px-2 font-medium">{marketUtils.formatDate(item.date)}</td>
                  )}
                  
                  {visibleColumns.breadth_score && (
                    <td className="py-2 px-2">
                      {item.breadth_score ? 
                        <span className={`font-semibold ${marketUtils.getStatusColor(marketUtils.getBreadthStatus(item.breadth_score))}`}>
                          {item.breadth_score.toFixed(1)}
                        </span> : 
                        <span className="text-gray-400">N/A</span>
                      }
                    </td>
                  )}
                  
                  {visibleColumns.up_4pct && (
                    <td className="py-2 px-2">
                      <span className={getValueColor(item.stocks_up_4pct, 'up_4pct')}>
                        {marketUtils.formatMarketValue(item.stocks_up_4pct)}
                      </span>
                    </td>
                  )}
                  
                  {visibleColumns.down_4pct && (
                    <td className="py-2 px-2">
                      <span className={getValueColor(item.stocks_down_4pct, 'down_4pct')}>
                        {marketUtils.formatMarketValue(item.stocks_down_4pct)}
                      </span>
                    </td>
                  )}
                  
                  {visibleColumns.up_20pct && (
                    <td className="py-2 px-2">
                      <span className={getValueColor(item.stocks_up_20pct, 'up_20pct')}>
                        {marketUtils.formatMarketValue(item.stocks_up_20pct)}
                      </span>
                    </td>
                  )}
                  
                  {visibleColumns.down_20pct && (
                    <td className="py-2 px-2">
                      <span className={getValueColor(item.stocks_down_20pct, 'down_20pct')}>
                        {marketUtils.formatMarketValue(item.stocks_down_20pct)}
                      </span>
                    </td>
                  )}
                  
                  {visibleColumns.up_25_quarter && (
                    <td className="py-2 px-2">
                      <span className={getValueColor(item.stocks_up_25pct_quarter, 'up_25_quarter')}>
                        {marketUtils.formatMarketValue(item.stocks_up_25pct_quarter)}
                      </span>
                    </td>
                  )}
                  
                  {visibleColumns.down_25_quarter && (
                    <td className="py-2 px-2">
                      <span className={getValueColor(item.stocks_down_25pct_quarter, 'down_25_quarter')}>
                        {marketUtils.formatMarketValue(item.stocks_down_25pct_quarter)}
                      </span>
                    </td>
                  )}
                  
                  {visibleColumns.t2108 && (
                    <td className="py-2 px-2">
                      <span className={getT2108Color(item.t2108)}>
                        {marketUtils.formatMarketValue(item.t2108, { decimals: 1 })}
                      </span>
                    </td>
                  )}
                  
                  {visibleColumns.universe && (
                    <td className="py-2 px-2">
                      <span className="text-gray-600 text-xs">
                        {marketUtils.formatMarketValue(item.worden_universe)}
                      </span>
                    </td>
                  )}
                  
                  {visibleColumns.ratio_5day && (
                    <td className="py-2 px-2">
                      <span className={getRatioColor(item.ratio_5day)}>
                        {marketUtils.formatMarketValue(item.ratio_5day, { decimals: 2 })}
                      </span>
                    </td>
                  )}
                  
                  {visibleColumns.ratio_10day && (
                    <td className="py-2 px-2">
                      <span className={getRatioColor(item.ratio_10day)}>
                        {marketUtils.formatMarketValue(item.ratio_10day, { decimals: 2 })}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t border-gray-200 gap-4">
            <div className="flex items-center gap-4">
              <span className={`text-sm ${theme.textSecondary}`}>
                Showing {startRecord}-{endRecord} of {pagination.total.toLocaleString()} records
              </span>
              <div className="flex items-center gap-2">
                <label className={`text-sm ${theme.textSecondary}`}>Per page:</label>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <span className={`px-3 py-2 text-sm ${theme.textSecondary}`}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading === 'loading' && !data.length) {
    return (
      <div className={theme.containerClass}>
        <div className="flex justify-center items-center h-64">
          <div className={`text-lg ${theme.textPrimary}`}>Loading market data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={theme.containerClass}>
        <div className={`${theme.cardClass} text-center`}>
          <div className="text-red-600 text-lg mb-4">Error loading market data</div>
          <p className={theme.textSecondary}>{error}</p>
          <button
            onClick={refreshData}
            className={`${theme.buttonClass} mt-4`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={theme.containerClass}>
      {renderHeader()}
      {renderMetrics()}
      {renderTimeRangeSelector()}
      {renderDataTable()}
      
      {/* Data Import Modal */}
      <EnhancedDataImportModal
        isOpen={showDataImportModal}
        onClose={() => setShowDataImportModal(false)}
        onSuccess={() => {
          setShowDataImportModal(false);
          refreshData();
        }}
      />
    </div>
  );
};

export default UnifiedMarketDashboard;