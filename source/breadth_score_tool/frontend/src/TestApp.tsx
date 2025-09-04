import React from 'react'

const TestApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-500 mb-4">
          🧪 Test App läuft!
        </h1>
        <p className="text-gray-400">
          Frontend läuft korrekt auf Port 5176
        </p>
        <div className="mt-8 bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Status Check</h2>
          <div className="space-y-2 text-sm">
            <div>✅ React lädt</div>
            <div>✅ Tailwind CSS funktioniert</div>
            <div>✅ TypeScript kompiliert</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestApp