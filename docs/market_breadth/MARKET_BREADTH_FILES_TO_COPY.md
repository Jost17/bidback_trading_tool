# Market Breadth Files - Copy Checklist

## Essential Files für Historical Data, Manual Entry, CSV Upload

### 📁 Components (3 Dateien)
```
/components/market-breadth/
├── HistoricalData.tsx          ✅ Datentabelle mit Sortierung
├── ManualDataEntry.tsx         ✅ Eingabeformular mit Validation  
└── DataUpload.tsx              ✅ CSV Upload mit Preview
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

### 🔗 API Routes (3 Dateien)
```
/app/api/market-breadth/
├── route.ts                    ✅ GET Historical Data
├── batch/route.ts              ✅ POST Bulk Insert (Manual Entry)
└── upload/route.ts             ✅ POST CSV Upload Processing
```

### 📊 Types & Database (4 Dateien)
```
/lib/types/
└── market-breadth.ts           ✅ TypeScript Interfaces

/lib/utils/
├── db.ts                       ✅ Database Connection
└── validation.ts               ✅ Zod Validation Schemas

/database/
└── schema.sql                  ✅ Table Definition
```

### ⚙️ Configuration Files (5 Dateien)
```
/database/migrations/
├── 001_create_market_breadth_tables.sql    ✅ Initial Schema
├── 002_create_custom_columns.sql           ✅ Custom Fields
└── 003_create_signals_and_views.sql        ✅ Views (optional)

/scripts/
├── csv-migration.js            ✅ CSV Processing Logic
└── migration-runner.js         ✅ Database Migration Runner
```

### 📦 Package Dependencies
Füge zu package.json hinzu:
```json
{
  "dependencies": {
    "pg": "^8.11.0",
    "zod": "^3.21.4",
    "papaparse": "^5.4.1",
    "decimal.js": "^10.5.0"
  },
  "devDependencies": {
    "@types/pg": "^8.10.0",
    "@types/papaparse": "^5.3.7"
  }
}
```

### 🐳 Docker Configuration
```
docker-compose.yml              ✅ PostgreSQL Container Setup
.env.example                    ✅ Database Connection Vars
```

## Minimale Integration

### 1. Page Structure
```typescript
// /app/market-breadth/page.tsx
'use client';
import { useState } from 'react';
import HistoricalData from '@/components/market-breadth/HistoricalData';
import ManualDataEntry from '@/components/market-breadth/ManualDataEntry';
import DataUpload from '@/components/market-breadth/DataUpload';

export default function MarketBreadthPage() {
  const [activeTab, setActiveTab] = useState<'data' | 'entry' | 'upload'>('data');

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <button onClick={() => setActiveTab('data')}>Historical Data</button>
        <button onClick={() => setActiveTab('entry')}>Manual Entry</button>
        <button onClick={() => setActiveTab('upload')}>CSV Upload</button>
      </div>

      {/* Content */}
      {activeTab === 'data' && <HistoricalData />}
      {activeTab === 'entry' && <ManualDataEntry />}
      {activeTab === 'upload' && <DataUpload />}
    </div>
  );
}
```

### 2. Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=user
DB_PASSWORD=password
```

## Total Files: 19 Dateien
- **3 Components** (Core Features)
- **4 UI Components** (Button, Card, Table, PageHeader)  
- **3 API Routes** (GET, POST Batch, POST Upload)
- **4 Types & Utils** (Interfaces, DB, Validation)
- **5 Config Files** (Migrations, Scripts, Docker)

**Fokus**: Nur die essentiellen Datenmanagement-Funktionen ohne Dashboard/Signale.