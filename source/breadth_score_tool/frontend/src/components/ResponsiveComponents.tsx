import React from 'react';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
}

// Responsive container component with mobile-first design
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`
      w-full max-w-sm mx-auto px-3 py-2
      sm:max-w-md sm:px-4 sm:py-3
      md:max-w-lg md:px-5 md:py-4
      lg:max-w-xl lg:px-6 lg:py-5
      xl:max-w-2xl xl:px-8 xl:py-6
      ${className}
    `}>
      {children}
    </div>
  );
};

// Responsive grid for stats cards
export const ResponsiveStatsGrid: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`
      grid grid-cols-2 gap-2
      sm:grid-cols-2 sm:gap-3
      md:grid-cols-2 md:gap-4
      lg:grid-cols-2 lg:gap-4
      ${className}
    `}>
      {children}
    </div>
  );
};

// Responsive button component
export const ResponsiveButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  className = '',
  disabled = false
}) => {
  const baseClasses = `
    inline-flex items-center justify-center
    font-semibold rounded-lg transition-all
    touch-manipulation select-none
    active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
  `;
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-xs min-h-[32px]',
    md: 'px-4 py-2 text-sm min-h-[40px]', 
    lg: 'px-6 py-3 text-base min-h-[48px]'
  };
  
  const variantClasses = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-black',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-black'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

// Mobile-optimized time range selector
export const ResponsiveTimeSelector: React.FC<{
  selectedRange: string;
  onRangeChange: (range: string) => void;
  options: readonly string[];
}> = ({ selectedRange, onRangeChange, options }) => {
  return (
    <div className="
      flex gap-1 bg-gray-800 rounded-lg p-1
      sm:gap-1.5 sm:p-1.5
      md:gap-2 md:p-2
    ">
      {options.map((range) => (
        <button
          key={range}
          onClick={() => onRangeChange(range)}
          className={`
            flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-all
            sm:px-3 sm:py-2 sm:text-sm
            md:px-4 md:py-2
            min-h-[32px] sm:min-h-[36px] md:min-h-[40px]
            ${selectedRange === range 
              ? 'bg-orange-500 text-black shadow-sm' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }
          `}
        >
          {range}
        </button>
      ))}
    </div>
  );
};

// Mobile-optimized date picker wrapper
export const ResponsiveDatePicker: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <div className="
      bg-gray-800 rounded-lg p-2 border border-gray-700
      sm:p-3 sm:rounded-xl
      md:p-4
      touch-manipulation
    ">
      {children}
    </div>
  );
};

// Hook for responsive breakpoints
export const useResponsive = () => {
  const [screenSize, setScreenSize] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });
  
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);
  const [isDesktop, setIsDesktop] = React.useState(false);
  
  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenSize({
        width,
        height: window.innerHeight
      });
      
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      setIsDesktop(width >= 1024);
    };
    
    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return {
    screenSize,
    isMobile,
    isTablet, 
    isDesktop,
    breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  };
};
