# Stockbee Market Monitor - Frontend

A modern, responsive React dashboard for real-time market breadth analysis.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend API running on port 3001

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or use the quick start script
./start.sh
```

The dashboard will be available at `http://localhost:5173`

## 📱 Features

### ✅ Core Components
- **BreadthScoreHero**: Main score display with real-time status
- **InteractiveChart**: Historical data visualization with Chart.js
- **StatsCards**: Key market metrics overview
- **Responsive Design**: Optimized for desktop, tablet, and mobile

### ✅ Technical Features
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling with custom design system
- **Chart.js**: Interactive, responsive charts
- **Error Boundaries**: Graceful error handling
- **Loading States**: Skeleton components and spinners
- **API Service**: Retry logic and error handling
- **Mobile-First**: Responsive breakpoints and touch optimization

## 🏗️ Architecture

```
src/
├── components/           # Reusable UI components
│   ├── BreadthScoreHero.tsx    # Main score display
│   ├── InteractiveChart.tsx    # Chart component
│   ├── StatsCards.tsx          # Metrics cards
│   ├── Header.tsx              # Navigation header
│   ├── ErrorBoundary.tsx       # Error handling
│   ├── LoadingComponents.tsx   # Loading states
│   └── ResponsiveContainer.tsx # Layout wrapper
├── services/            # API and external services
│   └── api.ts          # API service with retry logic
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles and Tailwind
```

## 🎨 Design System

### Colors
- **Primary**: Blue palette for branding and CTAs
- **Success**: Green for bullish/positive states  
- **Danger**: Red for bearish/negative states
- **Neutral**: Gray scale for backgrounds and text

### Components
- **Cards**: Consistent shadow and border radius
- **Buttons**: Primary, secondary, success, danger variants
- **Loading**: Skeleton components and spinners
- **Typography**: Inter font family with semantic sizing

## 📊 API Integration

### Endpoints Used
- `GET /api/current-status` - Current breadth score
- `GET /api/breadth-scores` - Historical data
- `GET /api/yearly-summaries` - Market summaries
- `GET /api/health` - Backend health check

### Error Handling
- **Retry Logic**: Exponential backoff for failed requests
- **Offline Detection**: Network status awareness
- **User Feedback**: Clear error messages and retry options

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
```

### Environment Variables
Create `.env.local` for custom configuration:
```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_TITLE="Stockbee Market Monitor"
```

## 📱 Responsive Breakpoints

```css
sm: 640px   # Small tablets
md: 768px   # Large tablets  
lg: 1024px  # Small desktops
xl: 1280px  # Large desktops
```

## 🧪 Testing Strategy

### Manual Testing Checklist
- [ ] Hero component loads current score
- [ ] Chart displays historical data
- [ ] Time range selector works
- [ ] Stats cards show metrics
- [ ] Mobile layout is responsive
- [ ] Error states display correctly
- [ ] Loading states work smoothly
- [ ] Refresh functionality works

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 Production Build

```bash
# Build optimized bundle
npm run build

# Preview production build locally
npm run preview

# Deploy dist/ folder to your hosting service
```

### Build Optimizations
- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image and font compression
- **Gzip Compression**: Reduced bundle sizes

## 🔍 Performance

### Optimization Features
- **Lazy Loading**: Components load on demand
- **Memoization**: Prevents unnecessary re-renders
- **Debounced API Calls**: Reduces server load
- **Image Optimization**: WebP format support
- **Bundle Analysis**: Webpack bundle analyzer

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s  
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.5s

## 🐛 Troubleshooting

### Common Issues

**Backend Connection Error**
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Start backend if needed
cd ../backend && npm run dev
```

**Build Failures**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**TypeScript Errors**
```bash
# Run type checking
npm run type-check

# Fix common issues
npm run lint:fix
```

## 📈 Future Enhancements

### Planned Features
- [ ] Real-time WebSocket updates
- [ ] Advanced chart indicators
- [ ] User preferences and themes
- [ ] Export functionality (PDF, CSV)
- [ ] Portfolio integration
- [ ] Alert system with notifications

### Technical Debt
- [ ] Add comprehensive test suite
- [ ] Implement proper caching strategy
- [ ] Add PWA capabilities
- [ ] Optimize bundle size further

## 📝 Contributing

1. Follow the existing code style
2. Update TypeScript types for new features
3. Test responsive design on multiple devices
4. Update this README for major changes

## 📄 License

MIT License - see LICENSE file for details
