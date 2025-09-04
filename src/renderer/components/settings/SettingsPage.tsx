import React from 'react'
import { Settings, Database, Download, Upload, Shield, Info } from 'lucide-react'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Settings className="w-7 h-7 text-blue-600" />
          <span>Settings</span>
        </h1>
        <p className="text-gray-600 mt-1">Configure your Bidback Trading Tool</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Database Management */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Database Management</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Database Info</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Version: --</p>
                  <p>Size: --</p>
                  <p>Tables: --</p>
                  <p>Records: --</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Create Backup</span>
                </button>
                
                <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Restore Backup</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* IB Configuration */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Interactive Brokers Configuration</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TWS Host</label>
                <input
                  type="text"
                  defaultValue="127.0.0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TWS Port</label>
                <input
                  type="number"
                  defaultValue={7497}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                <input
                  type="number"
                  defaultValue={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Connection Timeout</label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Save IB Settings
            </button>
          </div>
        </div>

        {/* Application Preferences */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Application Preferences</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Dark Mode</h3>
                <p className="text-sm text-gray-600">Switch to dark theme for extended trading sessions</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Auto-backup</h3>
                <p className="text-sm text-gray-600">Automatically backup database daily</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Sound Notifications</h3>
                <p className="text-sm text-gray-600">Play sounds for trade executions and alerts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3 mb-4">
            <Info className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">About</h2>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Bidback Trading Tool</strong> v{window.versions?.app || '1.0.0'}</p>
            <p>Professional Desktop Trading Management Application</p>
            <p>Built with Electron v{window.versions?.electron || 'Unknown'}</p>
            <p>Node.js v{window.versions?.node || 'Unknown'}</p>
            <p>Chrome v{window.versions?.chrome || 'Unknown'}</p>
            <p className="mt-4">
              Combining Market Breadth Analysis, Trade Journaling, and Interactive Brokers Integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}