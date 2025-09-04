import React from 'react'

interface GridContainerProps {
  children: React.ReactNode
  className?: string
}

const GridContainer: React.FC<GridContainerProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div 
      className={`grid gap-6 ${className}`}
      style={{
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(3, auto)',
        gridTemplateAreas: `
          "revenue profit customers satisfaction"
          "chart chart chart chart"
          "overview overview recent recent"
        `
      }}
    >
      {children}
    </div>
  )
}

export default GridContainer