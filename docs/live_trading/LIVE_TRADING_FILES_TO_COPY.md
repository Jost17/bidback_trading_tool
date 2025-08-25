# Live Trading Files - Copy Checklist

## Essential Files für Interactive Brokers API Integration

### 📁 Trading Components (3 Dateien)
```
/components/trading/
├── TradingInterface.tsx        ✅ Main trading dashboard with connection status
├── OrderPanel.tsx              ✅ Order entry form and management
└── PositionManager.tsx         ✅ Portfolio positions overview
```

### 🛠 UI Components (3 Dateien) 
```
/components/ui/
├── Button.tsx                  ✅ Button Component
├── Card.tsx                    ✅ Card Container  
└── Table.tsx                   ✅ Table Component

/components/layout/
└── PageHeader.tsx              ✅ Page Header Component
```

### 🔗 API Integration (3 Dateien)
```
/app/api/trading/
└── route.js                    ✅ Main trading API endpoint

/backend/services/
└── ibBridge.js                 ✅ Node.js ↔ Python Bridge Service

/ib_bridge/
└── ib_client.py                ✅ Python TWS API Client (EClient/EWrapper)
```

### 🐍 Python Environment Setup
```
/ib_api_env/                    ✅ Python Virtual Environment
├── lib/python3.x/site-packages/
│   └── ibapi/                  ✅ Interactive Brokers Python API
└── pyvenv.cfg                  ✅ Environment Config

# Python Dependencies
pip install ibapi>=10.19.01
```

### ⚙️ Configuration Files (4 Dateien)
```
.env                            ✅ Environment Variables
├── IB_GATEWAY_HOST=localhost
├── IB_GATEWAY_PORT=7497
├── IB_CLIENT_ID=1
└── IB_PAPER_TRADING=true

package.json                    ✅ Node.js Dependencies
├── "child_process" (Node.js built-in)
└── "path" (Node.js built-in)

docker-compose.yml              ✅ Optional: IB Gateway Container
requirements.txt                ✅ Python Dependencies
```

### 🔒 IB Gateway Configuration Files
```
/ib_gateway_config/
├── ibgateway.vmoptions         ✅ JVM Options
├── tws.xml                     ✅ TWS Settings (API enabled)
└── api_settings.xml            ✅ API Configuration
```

## Minimale Integration

### 1. Page Structure
```typescript
// /app/trading/page.tsx
'use client';
import { useState } from 'react';
import TradingInterface from '@/components/trading/TradingInterface';
import OrderPanel from '@/components/trading/OrderPanel';
import PositionManager from '@/components/trading/PositionManager';

export default function TradingPage() {
  const [activeTab, setActiveTab] = useState<'interface' | 'orders' | 'positions'>('interface');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  return (
    <div>
      {/* Connection Status Header */}
      <div className="mb-6 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>IB Gateway: {connectionStatus}</span>
          </div>
          <button>Connect/Disconnect</button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <button onClick={() => setActiveTab('interface')}>Trading Interface</button>
        <button onClick={() => setActiveTab('orders')}>Order Panel</button>
        <button onClick={() => setActiveTab('positions')}>Positions</button>
      </div>

      {/* Content */}
      {activeTab === 'interface' && <TradingInterface />}
      {activeTab === 'orders' && <OrderPanel />}
      {activeTab === 'positions' && <PositionManager />}
    </div>
  );
}
```

### 2. Environment Variables
```bash
# Interactive Brokers Configuration
IB_GATEWAY_HOST=localhost
IB_GATEWAY_PORT=7497          # Paper Trading: 7497, Live: 7496
IB_CLIENT_ID=1                # Unique client ID
IB_PAPER_TRADING=true         # Start with paper trading
IB_TIMEOUT=30000              # Connection timeout (ms)

# Python Bridge
PYTHON_BRIDGE_PATH=./ib_bridge/ib_client.py
PYTHON_ENV_PATH=./ib_api_env/bin/python
```

### 3. Required Installation Steps

**Python Setup:**
```bash
# Create Python virtual environment
python3 -m venv ib_api_env
source ib_api_env/bin/activate
pip install ibapi>=10.19.01
```

**IB Gateway Setup:**
1. Download IB Gateway from Interactive Brokers
2. Enable API in settings (Socket port 7497 for paper trading)
3. Add localhost to trusted IPs
4. Disable "Read-Only API"

**Node.js Dependencies:**
```json
{
  "dependencies": {
    "child_process": "built-in",
    "path": "built-in"
  }
}
```

## Connection Architecture

```
Frontend (React) 
    ↓ HTTP/WebSocket
Node.js API (/api/trading)
    ↓ Child Process
Python Bridge (ib_client.py)
    ↓ TCP Socket
IB Gateway/TWS (Port 7497/7496)
    ↓ Market Data
Interactive Brokers Servers
```

## Total Files: 16 Dateien
- **3 Trading Components** (Interface, Orders, Positions)
- **4 UI Components** (Button, Card, Table, PageHeader)
- **3 API Integration** (Node.js API, Python Bridge, IB Service)
- **1 Python Environment** (Virtual Env + ibapi)
- **5 Configuration Files** (Environment, Package configs)

**Fokus**: Vollständige IB API Integration mit Real-time Trading Capabilities.