# 🃏 Card Components

Diese Ordnerstruktur enthält alle wiederverwendbaren Card-Komponenten für das Dashboard.

## 📁 Struktur

```
cards/
├── BaseCard.tsx                 # Basis Card mit Glassmorphism
├── MetricCard.tsx               # Kennzahlen Cards (Sales, etc.)
├── ChartCard.tsx                # Chart Container Cards
├── types.ts                     # TypeScript Interfaces
└── README.md                    # Diese Dokumentation
```

## 🎯 Komponenten-Übersicht

### BaseCard
- **Zweck**: Basis-Template für alle Cards
- **Features**: Glassmorphism, Header mit Icon, Menu
- **Props**: `title`, `icon`, `gridCols`, `children`, `showMenu`

### MetricCard
- **Zweck**: Darstellung von Kennzahlen und Trends
- **Features**: Große Werte, Trend-Indikatoren, Farb-Kodierung
- **Props**: `title`, `value`, `change`, `trend`, `icon`

### ChartCard
- **Zweck**: Container für Chart-Komponenten
- **Features**: Flexibler Header, Chart-Bereiche, Custom Actions
- **Props**: `title`, `gridCols`, `children`, `headerContent`

## 🔧 Verwendung

### MetricCard Beispiel
```tsx
import MetricCard from './cards/MetricCard'

<MetricCard
  title="Total Sales"
  value="$ 4.9M"
  change="+1.5% vs previous year"
  trend="up"
  icon={<BarChartIcon />}
/>
```

### ChartCard Beispiel
```tsx
import ChartCard from './cards/ChartCard'
import BarChart from '../charts/BarChart'

<ChartCard
  title="Sales Analytics"
  gridCols={2}
  headerContent={
    <div className="text-right">
      <div className="text-blue-400">Income</div>
      <div className="text-2xl font-bold">$ 370,250</div>
    </div>
  }
>
  <BarChart data={salesData} />
</ChartCard>
```

## 🎨 Card Features

### Glassmorphism Design
```css
background: rgba(38, 41, 71, 0.6)
backdrop-filter: blur(20px)
border: rgba(107, 114, 128, 0.2)
border-radius: 16px
```

### Grid System
- **Spalten**: 1-6 (col-span-1 bis col-span-6)
- **Responsive**: Automatische Anpassung
- **Flexibel**: Verschiedene Card-Größen

### Trend Indicators
- **Up Trend**: Grüner Pfeil + positive Farbe
- **Down Trend**: Roter Pfeil + negative Farbe  
- **Stable**: Neutraler Indikator

## 📊 Card Types

| Card Type | Verwendung | Grid Cols | Features |
|-----------|------------|-----------|----------|
| MetricCard | Kennzahlen | 2 | Value + Trend |
| ChartCard | Diagramme | 2-3 | Chart Container |
| BaseCard | Custom | 1-6 | Flexible Base |

## 🎯 Best Practices

1. **Consistent Sizing**: Verwende standardisierte gridCols
2. **Trend Colors**: Grün für positiv, Rot für negativ
3. **Icon Usage**: Passende Icons für jeden Card-Typ
4. **Responsive**: Mobile-first Design
5. **Accessibility**: Proper ARIA labels und Kontraste