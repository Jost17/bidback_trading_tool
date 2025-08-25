import React from 'react'
import { Routes, Route } from 'react-router-dom'
import EnhancedDataTable from './components/EnhancedDataTable'
import StructuredDashboard from './components/StructuredDashboard'
import SimpleDashboard from './components/SimpleDashboard'
import InlineStyledDashboard from './components/InlineStyledDashboard'
import UnifiedMarketDashboard from './components/dashboard/UnifiedMarketDashboard'

// Analytics Page Component
const AnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-500 mb-6">Analytics</h1>
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <p className="text-gray-400">Advanced analytics coming soon...</p>
        </div>
      </div>
    </div>
  );
};

// Settings Page Component
const SettingsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-500 mb-6">Settings</h1>
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <p className="text-gray-400">Settings coming soon...</p>
        </div>
      </div>
    </div>
  );
};

// Data Management Wrapper
const DataManagementPage: React.FC = () => {
  return (
    <EnhancedDataTable />
  );
};

// Main App component with routing
function App() {
  return (
    <Routes>
      <Route path="/" element={<UnifiedMarketDashboard />} />
      <Route path="/structured" element={<StructuredDashboard />} />
      <Route path="/simple" element={<SimpleDashboard />} />
      <Route path="/debug" element={<InlineStyledDashboard />} />
      <Route path="/data-management" element={<DataManagementPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

export default App