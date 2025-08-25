import React, { memo, useMemo } from 'react';

interface OptimizedChartProps {
  data: number[];
  labels: string[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

// Memoized chart component to prevent unnecessary re-renders
export const OptimizedChart = memo<OptimizedChartProps>(({ 
  data, 
  labels, 
  width = 280, 
  height = 80, 
  color = '#ff8500',
  className = ''
}) => {
  // Memoize the SVG path calculation
  const pathData = useMemo(() => {
    if (!data || data.length === 0) {
      // Fallback mock path for empty data
      return "M10,70 L75,55 L140,45 L205,60 L290,40";
    }
    
    const margin = 10;
    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal - minVal || 1;
    
    const points = data.map((value, index) => {
      const x = margin + (index / (data.length - 1)) * (width - 2 * margin);
      const y = height - margin - ((value - minVal) / range) * (height - 2 * margin);
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  }, [data, width, height]);

  // Memoize the gradient fill path
  const fillPath = useMemo(() => {
    if (pathData === "M10,70 L75,55 L140,45 L205,60 L290,40") {
      return `${pathData} L290,90 L10,90 Z`;
    }
    return `${pathData} L${width - 10},${height - 10} L10,${height - 10} Z`;
  }, [pathData, width, height]);

  // Memoize gradient ID to prevent conflicts
  const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.4 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        
        {/* Fill area */}
        <path 
          d={fillPath} 
          fill={`url(#${gradientId})`}
        />
        
        {/* Stroke line */}
        <path 
          d={pathData} 
          fill="none" 
          stroke={color} 
          strokeWidth="2.5" 
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 4px ${color}30)`
          }}
        />
      </svg>
    </div>
  );
});

OptimizedChart.displayName = 'OptimizedChart';

// Props comparison function for memo
const areEqual = (prevProps: OptimizedChartProps, nextProps: OptimizedChartProps) => {
  // Custom comparison for array data
  if (prevProps.data.length !== nextProps.data.length) return false;
  
  for (let i = 0; i < prevProps.data.length; i++) {
    if (prevProps.data[i] !== nextProps.data[i]) return false;
  }
  
  // Compare other props
  return (
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.color === nextProps.color &&
    prevProps.className === nextProps.className &&
    JSON.stringify(prevProps.labels) === JSON.stringify(nextProps.labels)
  );
};

// Export with custom comparison
export const MemoizedChart = memo(OptimizedChart, areEqual);

// Lightweight chart component for dashboard
export const DashboardChart = memo<{
  chartData: { labels: string[]; data: number[] } | null;
  className?: string;
}>(({ chartData, className }) => {
  if (!chartData || chartData.data.length === 0) {
    return (
      <div className={`h-24 bg-gray-800 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">No chart data available</span>
      </div>
    );
  }

  return (
    <div className={`h-24 bg-gray-800 rounded-lg ${className}`}>
      <OptimizedChart 
        data={chartData.data}
        labels={chartData.labels}
        width={300}
        height={100}
        color="#ff8500"
      />
    </div>
  );
});

DashboardChart.displayName = 'DashboardChart';
