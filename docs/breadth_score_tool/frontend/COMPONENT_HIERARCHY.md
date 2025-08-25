# 🏗️ Dashboard Layout-Komponenten Hierarchie

## 📊 Gesamtstruktur

```
StructuredDashboard (Root)
└── DashboardLayout
    ├── Header
    │   ├── Logo
    │   ├── Navigation
    │   └── UserProfile
    ├── DashboardTitle
    └── GridContainer
        ├── MetricCard (Total Sales)
        ├── MetricCard (Total Expenses)  
        ├── ChartCard (Sales Analytics)
        ├── ChartCard (Customer Satisfaction)
        └── ChartCard (Expenses Analytics)
```

## 🎯 Detaillierte Komponentenhierarchie

### 1️⃣ **Root Level - Application Layer**
```
📁 App.tsx
└── Router
    └── StructuredDashboard (/)\
```

### 2️⃣ **Layout Level - Structure Layer**
```
📁 components/StructuredDashboard.tsx
└── DashboardLayout
    ├── 🎨 Background (Gradient)
    ├── 📏 Padding & Spacing
    └── 🧱 Main Content Structure
```

### 3️⃣ **Section Level - Major Areas**
```
📁 layout/DashboardLayout.tsx
├── Header (Top Navigation Area)
├── DashboardTitle (Action Bar)
└── GridContainer (Main Content Grid)
```

### 4️⃣ **Header Level - Navigation Components**
```
📁 layout/Header.tsx
├── Left Section
│   ├── Logo
│   │   ├── 🎨 Icon (SVG)
│   │   └── 📝 Brand Name
│   └── Navigation
│       ├── 🏠 Dashboard (Active)
│       ├── 💰 Sales
│       ├── 👥 Contacts  
│       ├── 👨‍💼 Team
│       └── 📊 Reports
└── Right Section
    └── UserProfile
        ├── Action Icons
        │   ├── 🔍 Search
        │   ├── ❓ Help
        │   └── 🔔 Notifications
        └── User Info
            ├── 👤 Avatar (JP)
            ├── 📝 Name (Julia P.)
            └── 💼 Role (Product Manager)
```

### 5️⃣ **Title Level - Dashboard Controls**
```
📁 layout/DashboardTitle.tsx
├── Left Section
│   └── 📊 "Dashboard" Title
└── Right Section
    ├── 📅 Date Selector ("Last year")
    ├── 🔗 Share Icon
    ├── ⋯ More Options
    └── 🤖 AI Assistant Button
```

### 6️⃣ **Grid Level - Content Layout**
```
📁 layout/GridContainer.tsx
└── CSS Grid (6 columns)
    ├── Row 1 (Top Row - 2:2:2 split)
    │   ├── Column 1-2: MetricCard (Total Sales)
    │   ├── Column 3-4: MetricCard (Total Expenses)
    │   └── Column 5-6: ChartCard (Sales Analytics)
    └── Row 2 (Bottom Row - 3:3 split)
        ├── Column 1-3: ChartCard (Customer Satisfaction)
        └── Column 4-6: ChartCard (Expenses Analytics)
```

### 7️⃣ **Card Level - Content Containers**
```
📁 cards/
├── BaseCard (Foundation)
│   ├── 🎨 Glassmorphism Background
│   ├── 🖼️ Border & Rounded Corners
│   ├── 📏 Padding & Spacing
│   └── 🎯 Content Slot
├── MetricCard (Extends BaseCard)
│   ├── 📊 Icon
│   ├── 📝 Title
│   ├── 💰 Large Value
│   └── 📈 Trend Indicator
│       ├── 📊 Trend Icon (↗️/↘️)
│       └── 📝 Change Text
└── ChartCard (Extends BaseCard)
    ├── 📝 Title
    ├── ⚙️ Header Actions
    └── 📊 Chart Content Area
```

### 8️⃣ **Chart Level - Data Visualization**
```
📁 charts/
├── BarChart
│   ├── 📊 Chart.js Bar Component
│   ├── ⚙️ Chart Options
│   └── 🎨 Styling Configuration
├── LineChart  
│   ├── 📊 Chart.js Line Component
│   ├── 🎨 Multi-line Support
│   └── 📊 Legend Options
└── DoughnutChart
    ├── 📊 Chart.js Doughnut Component
    ├── 🎯 Center Content Slot
    └── 🎨 Custom Styling
```

## 🎨 **Styling Hierarchy**

### **Theme Level**
```
🎨 Global Styles
├── 🌈 Color Palette
│   ├── Background: #1a1d3a → #262947 (Gradient)
│   ├── Cards: rgba(38, 41, 71, 0.6) + Blur
│   ├── Text: White (#ffffff), Gray (#9ca3af)
│   ├── Accent: Blue (#3b82f6), Green (#22c55e), Red (#ef4444)
│   └── Border: rgba(107, 114, 128, 0.2)
├── 📏 Spacing System
│   ├── Container: 24px (p-6)
│   ├── Grid Gap: 24px (gap-6)
│   ├── Card Padding: 24px (p-6)
│   └── Element Spacing: 8px, 16px, 32px
├── 📝 Typography Scale
│   ├── H1: 30px (text-3xl)
│   ├── H2: 18px (text-lg)
│   ├── Values: 24-32px (text-2xl, text-3xl)
│   ├── Body: 14px (text-sm)
│   └── Small: 12px (text-xs)
└── 🎯 Effects
    ├── Glassmorphism: backdrop-filter: blur(20px)
    ├── Rounded Corners: 16px (rounded-2xl)
    ├── Shadows: Built-in Tailwind shadows
    └── Transitions: hover:, transition-colors
```

## 🔄 **Data Flow Hierarchy**

### **Data Layer**
```
📊 Chart Data Objects
├── salesAnalyticsData
├── customerSatisfactionData
└── expensesData
```

### **Props Layer**
```
⬇️ Props Flow
├── DashboardLayout → children
├── Cards → title, data, trend, etc.
└── Charts → data, options, styling
```

### **State Layer**
```
🔄 State Management
├── Local State (useState)
├── Chart Configurations
└── Interactive Elements
```

## 🧩 **Reusability Matrix**

| Komponente | Wiederverwendbarkeit | Konfigurierbarkeit |
|------------|---------------------|-------------------|
| DashboardLayout | ⭐⭐⭐ | ⭐⭐⭐ |
| Header | ⭐⭐⭐ | ⭐⭐ |
| BaseCard | ⭐⭐⭐ | ⭐⭐⭐ |
| MetricCard | ⭐⭐⭐ | ⭐⭐⭐ |
| ChartCard | ⭐⭐⭐ | ⭐⭐⭐ |
| BarChart | ⭐⭐⭐ | ⭐⭐⭐ |
| LineChart | ⭐⭐⭐ | ⭐⭐⭐ |
| DoughnutChart | ⭐⭐⭐ | ⭐⭐⭐ |

## 📋 **Komponenten-Interface Definitionen**

### **Props Interfaces**
```typescript
// Layout Props
interface DashboardLayoutProps {
  children?: React.ReactNode
}

// Card Props  
interface MetricCardProps {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: React.ReactNode
}

interface ChartCardProps {
  title: string
  gridCols: number
  children: React.ReactNode
  headerContent?: React.ReactNode
}

// Chart Props
interface BarChartProps {
  data: any
  height?: number
}

interface LineChartProps {
  data: any
  height?: number
  showLegend?: boolean
}

interface DoughnutChartProps {
  data: any
  centerContent?: React.ReactNode
  size?: number
}
```

Diese Hierarchie ermöglicht eine **klare Struktur**, **einfache Wartung** und **maximale Wiederverwendbarkeit** aller Dashboard-Komponenten.