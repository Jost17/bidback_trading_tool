import React from 'react'
import BaseCard from './BaseCard'

interface ChartCardProps {
  title: string
  gridCols: number
  children: React.ReactNode
  headerContent?: React.ReactNode
}

const ChartCard: React.FC<ChartCardProps> = ({ 
  title, 
  gridCols, 
  children, 
  headerContent 
}) => {
  return (
    <div 
      className={`col-span-${gridCols} rounded-2xl p-6 border`}
      style={{
        background: 'rgba(38, 41, 71, 0.6)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(107, 114, 128, 0.2)'
      }}
    >
      {/* Custom Header for Chart Cards */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white text-lg font-semibold">{title}</h3>
        <div className="flex items-center space-x-4">
          {headerContent}
        </div>
      </div>
      
      {/* Chart Content */}
      {children}
    </div>
  )
}

export default ChartCard