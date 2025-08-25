# 📊 Chart Components

Diese Ordnerstruktur enthält alle wiederverwendbaren Chart-Komponenten basierend auf Chart.js 3.

## 📁 Struktur

```
charts/
├── BarChart.tsx                 # Bar Chart Komponente
├── LineChart.tsx                # Line Chart Komponente  
├── DoughnutChart.tsx            # Doughnut Chart Komponente
├── types.ts                     # TypeScript Interfaces
└── README.md                    # Diese Dokumentation
```

## 🎯 Komponenten-Übersicht

### BarChart
- **Zweck**: Darstellung von Balkendiagrammen
- **Features**: Vertikale/Horizontale Bars, Custom Styling
- **Props**: `data`, `height`, `options`

### LineChart  
- **Zweck**: Darstellung von Liniendiagrammen
- **Features**: Multi-Line Support, Smooth Curves, Fill Areas
- **Props**: `data`, `height`, `showLegend`, `showPoints`

### DoughnutChart
- **Zweck**: Darstellung von Kreisdiagrammen
- **Features**: Center Content, Custom Cutout, Legends
- **Props**: `data`, `centerContent`, `size`, `cutout`

## 🔧 Verwendung

### BarChart Beispiel
```tsx
import BarChart from './charts/BarChart'

const salesData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [{
    data: [20, 32, 25, 38, 30, 45],
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    barThickness: 12
  }]
}

<BarChart data={salesData} height={128} />
```

### LineChart Beispiel
```tsx
import LineChart from './charts/LineChart'

const satisfactionData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [
    {
      label: 'Satisfied',
      data: [82, 83, 84, 83.5, 84.2],
      borderColor: '#22c55e',
      backgroundColor: 'transparent'
    },
    {
      label: 'Neutral', 
      data: [12, 11.5, 11, 11.2, 10.8],
      borderColor: '#fbbf24',
      backgroundColor: 'transparent'
    }
  ]
}

<LineChart data={satisfactionData} height={160} showLegend={false} />
```

### DoughnutChart Beispiel
```tsx
import DoughnutChart from './charts/DoughnutChart'

const expensesData = {
  labels: ['Marketing', 'Payroll', 'Equipment', 'Others'],
  datasets: [{
    data: [35, 30, 25, 10],
    backgroundColor: ['#3b82f6', '#f97316', '#a855f7', '#22c55e']
  }]
}

<DoughnutChart 
  data={expensesData} 
  size={128}
  centerContent={
    <div className="text-center">
      <div className="text-2xl font-bold text-white">$ 860K</div>
      <div className="text-xs text-gray-400">Total spend</div>
    </div>
  }
/>
```

## ⚙️ Chart Configuration

### Standard Optionen
```typescript
const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: 'rgba(71, 85, 105, 0.2)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12
    }
  }
}
```

### Dark Theme Support
- **Background**: Transparente/dunkle Hintergründe
- **Text Colors**: Weiß und Grautöne
- **Tooltips**: Dunkle Tooltips mit weißem Text
- **Grid Lines**: Subtile graue Linien

## 🎨 Color Palette

### Standard Farben
```typescript
const colors = {
  primary: '#3b82f6',      // Blau
  success: '#22c55e',      // Grün  
  warning: '#fbbf24',      // Gelb
  danger: '#ef4444',       // Rot
  secondary: '#6b7280',    // Grau
  purple: '#a855f7',       // Lila
  orange: '#f97316'        // Orange
}
```

### Gradient Unterstützung
```typescript
const gradient = {
  sales: 'linear-gradient(to top, #3b82f6, #8b5cf6)',
  expenses: 'linear-gradient(to top, #ef4444, #f97316)',
  satisfaction: 'linear-gradient(to top, #22c55e, #10b981)'
}
```

## 📊 Chart Types Matrix

| Chart Type | Best For | Data Format | Features |
|------------|----------|-------------|----------|
| BarChart | Kategorische Daten | Single/Multi Series | Vergleiche, Trends |
| LineChart | Zeitreihen | Multi Series | Trends, Verläufe |
| DoughnutChart | Anteile/Prozente | Single Series | Verteilung, Anteile |

## 🔧 Customization

### Custom Styling
```tsx
// Custom Bar Colors
const customBarData = {
  datasets: [{
    backgroundColor: (context) => {
      const value = context.raw
      return value > 50 ? '#22c55e' : '#ef4444'
    }
  }]
}

// Custom Line Styles
const customLineData = {
  datasets: [{
    borderColor: '#3b82f6',
    borderWidth: 3,
    pointRadius: 5,
    pointHoverRadius: 7,
    tension: 0.4 // Smooth curves
  }]
}
```

### Responsive Breakpoints
- **Mobile**: height: 120px
- **Tablet**: height: 160px  
- **Desktop**: height: 200px+

## 🎯 Performance Tips

1. **Memoization**: Verwende `useMemo` für Chart-Daten
2. **Lazy Loading**: Lade Charts nur bei Bedarf
3. **Data Limits**: Begrenze Datenpunkte für Performance
4. **Animation**: Deaktiviere Animationen bei vielen Datenpunkten
5. **Cleanup**: Destroye Charts beim Unmounting