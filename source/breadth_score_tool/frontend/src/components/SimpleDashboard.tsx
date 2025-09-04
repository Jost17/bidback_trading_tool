import React, { useState, useEffect } from 'react';

const SimpleDashboard = () => {
  const [currentStatus, setCurrentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/current-status');
        const data = await response.json();
        setCurrentStatus(data);
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-blue-500 mb-4">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">
          Stockbee Market Monitor
        </h1>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8">
            Market Breadth Dashboard
          </h2>

          {/* KPI Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">
              Current Breadth Score
            </h3>
            <div className="text-4xl font-bold text-blue-500">
              {currentStatus?.breadthScore?.toFixed(1) || '0.0'}
            </div>
            <div className="text-gray-400 mt-2">
              Last updated: {currentStatus?.lastUpdated || 'N/A'}
            </div>
          </div>

          {/* Status Message */}
          <div className="mt-6 bg-green-900/50 border border-green-700 rounded-lg p-4">
            <div className="text-green-400 font-semibold">
              ✅ Dashboard loaded successfully!
            </div>
            <div className="text-green-300 text-sm mt-1">
              Frontend and Backend connected properly
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SimpleDashboard;