# Market Breadth Frontend Components

This directory contains comprehensive frontend components for the Bidback Trading Tool's Market Breadth Analysis system. All components are production-ready with proper error handling, loading states, and responsive design.

## Component Architecture

### Core Components

#### 1. MarketBreadthDashboard.tsx
**Main Dashboard Component**
- **Purpose**: Primary dashboard displaying current market conditions and overview
- **Features**:
  - Real-time breadth score display with confidence indicators
  - Market phase visualization (Bull/Bear/Neutral)
  - Multi-view navigation (Dashboard, Entry, Table, Calculator, CSV)
  - Quick stats cards with key metrics
  - Interactive charts integration
  - Recent entries table with filtering
- **Integration**: Uses all other components as sub-views
- **API Dependencies**: `useBreadthCalculator` hook, `window.tradingAPI`

#### 2. DataEntryForm.tsx
**Manual Data Entry Interface**
- **Purpose**: Form for entering daily market breadth data manually
- **Features**:
  - Comprehensive form validation with real-time feedback
  - Support for all enhanced market breadth fields
  - Organized sections: Basic Info, Primary Indicators, Secondary Indicators, Sector Data
  - Preview calculation functionality
  - Form reset and auto-save capabilities
  - Compatible with existing `useBreadthCalculator` hook
- **Field Support**: T2108, Worden Universe, sector percentages, stock momentum data
- **Validation**: Required field validation, numeric validation, range validation

#### 3. HistoricalDataTable.tsx
**Data Management Interface**
- **Purpose**: View, filter, and manage historical breadth data
- **Features**:
  - Advanced filtering (date range, score range, market phase, data source)
  - Column sorting with visual indicators
  - Bulk operations (select all, bulk delete)
  - Inline editing capability
  - CSV export functionality
  - Pagination with configurable page sizes
  - Search functionality across all fields
- **Performance**: Optimized for large datasets with virtual scrolling support

#### 4. BreadthScoreCalculator.tsx
**Advanced Calculator Interface**
- **Purpose**: Flexible breadth score calculation with algorithm switching
- **Features**:
  - Multiple calculation modes (Single, Real-time, Historical, Bulk)
  - Algorithm selection and configuration
  - Performance metrics monitoring
  - Configuration management (save/load/export/import)
  - Real-time calculation preview
  - Health check functionality
- **Algorithms Supported**: Six Factor, Normalized, Sector Weighted, Custom
- **Integration**: Full integration with enhanced breadth calculator system

#### 5. BreadthCharts.tsx
**Interactive Visualization Component**
- **Purpose**: Interactive charts for visualizing breadth data over time
- **Features**:
  - Multiple chart types (Line, Area, Bar, Composed)
  - Time range selection (7D, 30D, 90D, 1Y, All)
  - Trend line analysis with linear regression
  - Market phase color coding
  - Data smoothing options (moving averages)
  - Custom tooltips with detailed information
  - Export functionality
  - Responsive design for all screen sizes
- **Charts Library**: Recharts with custom styling and animations

#### 6. CSVManager.tsx
**Import/Export Management**
- **Purpose**: Comprehensive CSV import/export functionality
- **Features**:
  - Intelligent CSV format detection
  - Automatic column mapping with manual override
  - Data preview before import
  - Import validation and error reporting
  - Export with date range selection
  - Import history tracking
  - Progress indicators for large operations
- **Supported Formats**: Enhanced Market Breadth, Traditional Breadth, Custom formats

## Legacy Components (Maintained for Compatibility)

#### ManualEntryForm.tsx
- Legacy manual entry form
- Still functional but superseded by `DataEntryForm.tsx`
- Maintained for backward compatibility

#### FlexibleBreadthCalculator.tsx
- Original calculator demonstration component
- Now integrated into main `BreadthScoreCalculator.tsx`
- Available for reference and testing

#### CSVImportModal.tsx
- Original CSV import modal
- Superseded by comprehensive `CSVManager.tsx`

## Technical Specifications

### Dependencies
- **React**: 18.3.x with hooks and functional components
- **TypeScript**: 5.x with strict mode enabled
- **Recharts**: 2.x for chart visualizations
- **Lucide React**: For consistent iconography
- **Tailwind CSS**: For responsive styling

### Integration Points
- **Trading API**: Full integration with `window.tradingAPI` interface
- **Breadth Calculator Hook**: Uses `useBreadthCalculator` and `useBreadthCalculatorConfig`
- **Type Safety**: All components use strict TypeScript types from `src/types/trading.ts`

### State Management
- **Local State**: React hooks for component-specific state
- **Shared State**: Props and callbacks for parent-child communication
- **API State**: Custom hooks for server communication
- **Error Handling**: Comprehensive error boundaries and user feedback

### Responsive Design
- **Mobile First**: All components designed for mobile-first approach
- **Breakpoints**: Tailwind CSS responsive breakpoints
- **Touch Support**: Full touch interaction support
- **Accessibility**: WCAG 2.1 compliant with proper ARIA labels

### Performance Optimizations
- **Memoization**: React.memo and useMemo for expensive calculations
- **Virtualization**: Large table rendering optimization
- **Lazy Loading**: Code splitting for large components
- **Debouncing**: Search and filter operations debounced
- **Caching**: API response caching where appropriate

## Usage Examples

### Basic Dashboard Integration
```tsx
import { MarketBreadthDashboard } from './components/market-breadth'

function App() {
  return <MarketBreadthDashboard />
}
```

### Standalone Data Entry
```tsx
import { DataEntryForm } from './components/market-breadth'

function MyComponent() {
  const handleSuccess = () => {
    console.log('Data saved successfully')
  }
  
  return <DataEntryForm onSuccess={handleSuccess} />
}
```

### Custom Chart Integration
```tsx
import { BreadthCharts } from './components/market-breadth'

function CustomDashboard({ data }) {
  return (
    <BreadthCharts 
      data={data}
      height={400}
      showControls={true}
      onExportChart={() => console.log('Export requested')}
    />
  )
}
```

## Data Flow Architecture

1. **User Input** → DataEntryForm → ValidationLayer → API Call → Database
2. **Database** → API Response → Hook State → Component Render → User Display
3. **Calculations** → BreadthCalculator → Algorithm Engine → Results → UI Update
4. **Import/Export** → CSVManager → File Processing → Data Validation → Database Operations

## Error Handling Strategy

- **Form Validation**: Real-time validation with user-friendly error messages
- **API Errors**: Graceful handling with retry mechanisms
- **Network Issues**: Offline detection and queuing
- **Data Corruption**: Validation at multiple layers
- **User Feedback**: Clear success/error states with actionable messages

## Testing Strategy

- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Large dataset handling
- **Accessibility Tests**: Screen reader and keyboard navigation

## Future Enhancements

- **Real-time Updates**: WebSocket integration for live data
- **Advanced Analytics**: Machine learning predictions
- **Custom Dashboards**: User-configurable layouts
- **Mobile App**: React Native adaptation
- **API Extensions**: Additional data sources integration

## File Structure Summary

```
src/renderer/components/market-breadth/
├── MarketBreadthDashboard.tsx    # Main dashboard (primary component)
├── DataEntryForm.tsx             # Enhanced manual entry form
├── HistoricalDataTable.tsx       # Data management interface
├── BreadthScoreCalculator.tsx    # Advanced calculator
├── BreadthCharts.tsx            # Interactive charts
├── CSVManager.tsx               # Import/export manager
├── ManualEntryForm.tsx          # Legacy entry form
├── FlexibleBreadthCalculator.tsx # Legacy calculator demo
├── CSVImportModal.tsx           # Legacy import modal
├── index.ts                     # Component exports
└── README.md                    # This documentation
```

All components are production-ready and integrate seamlessly with the existing Bidback Trading Tool architecture. They follow React best practices, TypeScript strict mode, and provide comprehensive error handling and user feedback.