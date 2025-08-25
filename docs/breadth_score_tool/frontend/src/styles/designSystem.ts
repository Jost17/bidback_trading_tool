/**
 * Design System - Centralized styling tokens and utilities
 * Provides consistent colors, spacing, typography, and component styles
 */

export const designTokens = {
  // Color Palette
  colors: {
    // Primary colors (Blue theme)
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a'
    },
    
    // Gray scale
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    },
    
    // Status colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d'
    },
    
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309'
    },
    
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c'
    },
    
    // Market status colors
    market: {
      bullish: '#22c55e',
      bearish: '#ef4444',
      neutral: '#f59e0b'
    }
  },
  
  // Spacing scale (based on 4px units)
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem',  // 64px
    '4xl': '6rem',  // 96px
    '5xl': '8rem'   // 128px
  },
  
  // Typography scale
  typography: {
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem'     // 48px
    },
    
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    },
    
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    },
    
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['Monaco', 'Menlo', 'monospace']
    }
  },
  
  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
    full: '9999px'
  },
  
  // Shadows
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
  }
};

// Component style utilities
export const componentStyles = {
  // Button variants
  button: {
    base: `
      inline-flex items-center justify-center
      font-medium transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    
    variants: {
      primary: `
        bg-blue-600 hover:bg-blue-700 text-white
        focus:ring-blue-500
      `,
      
      secondary: `
        bg-gray-200 hover:bg-gray-300 text-gray-900
        focus:ring-gray-500
      `,
      
      outline: `
        border-2 border-gray-300 hover:border-gray-400
        bg-transparent text-gray-700 hover:text-gray-900
        focus:ring-gray-500
      `,
      
      ghost: `
        bg-transparent hover:bg-gray-100 text-gray-700
        focus:ring-gray-500
      `,
      
      success: `
        bg-green-600 hover:bg-green-700 text-white
        focus:ring-green-500
      `,
      
      warning: `
        bg-yellow-600 hover:bg-yellow-700 text-white
        focus:ring-yellow-500
      `,
      
      error: `
        bg-red-600 hover:bg-red-700 text-white
        focus:ring-red-500
      `
    },
    
    sizes: {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-base rounded-lg',
      lg: 'px-6 py-3 text-lg rounded-lg'
    }
  },
  
  // Card component
  card: {
    base: `
      bg-white rounded-lg shadow-md
      border border-gray-200
    `,
    
    variants: {
      elevated: 'shadow-lg',
      flat: 'shadow-none border-2',
      interactive: 'hover:shadow-lg transition-shadow duration-200 cursor-pointer'
    },
    
    padding: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    }
  },
  
  // Input components
  input: {
    base: `
      block w-full border border-gray-300 rounded-md
      px-3 py-2 text-gray-900 placeholder-gray-500
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      disabled:bg-gray-100 disabled:cursor-not-allowed
    `,
    
    variants: {
      error: 'border-red-300 focus:ring-red-500',
      success: 'border-green-300 focus:ring-green-500'
    },
    
    sizes: {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2 text-base',
      lg: 'px-4 py-3 text-lg'
    }
  },
  
  // Status indicators
  status: {
    bullish: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-green-100 text-green-800
    `,
    
    bearish: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-red-100 text-red-800
    `,
    
    neutral: `
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-yellow-100 text-yellow-800
    `
  },
  
  // Loading states
  loading: {
    spinner: `
      animate-spin rounded-full border-2 border-gray-300
      border-t-blue-600
    `,
    
    skeleton: `
      animate-pulse bg-gray-200 rounded
    `
  }
};

// Theme configurations
export const themes = {
  light: {
    name: 'Light',
    colors: {
      background: designTokens.colors.gray[50],
      surface: '#ffffff',
      primary: designTokens.colors.primary[600],
      text: {
        primary: designTokens.colors.gray[900],
        secondary: designTokens.colors.gray[600],
        muted: designTokens.colors.gray[400]
      },
      border: designTokens.colors.gray[200]
    }
  },
  
  dark: {
    name: 'Dark',
    colors: {
      background: designTokens.colors.gray[900],
      surface: designTokens.colors.gray[800],
      primary: designTokens.colors.primary[500],
      text: {
        primary: '#ffffff',
        secondary: designTokens.colors.gray[300],
        muted: designTokens.colors.gray[500]
      },
      border: designTokens.colors.gray[700]
    }
  }
};

// Utility functions
export const utils = {
  /**
   * Generate CSS classes for component variants
   */
  cn: (...classes: (string | undefined | false)[]): string => {
    return classes.filter(Boolean).join(' ');
  },
  
  /**
   * Get color value from design tokens
   */
  getColor: (path: string): string => {
    const keys = path.split('.');
    let value: any = designTokens.colors;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return value || '';
  },
  
  /**
   * Generate responsive classes
   */
  responsive: (base: string, variants?: Record<string, string>): string => {
    let classes = base;
    
    if (variants) {
      Object.entries(variants).forEach(([breakpoint, className]) => {
        classes += ` ${breakpoint}:${className}`;
      });
    }
    
    return classes;
  },
  
  /**
   * Generate state classes (hover, focus, etc.)
   */
  states: (base: string, states?: Record<string, string>): string => {
    let classes = base;
    
    if (states) {
      Object.entries(states).forEach(([state, className]) => {
        classes += ` ${state}:${className}`;
      });
    }
    
    return classes;
  }
};

export default designTokens;