import React from 'react'
import { MoreHorizontal } from 'lucide-react'

interface BaseCardProps {
  title: string
  icon?: React.ReactNode
  gridCols: number
  children: React.ReactNode
  showMenu?: boolean
}

const BaseCard: React.FC<BaseCardProps> = ({ 
  title, 
  icon, 
  gridCols, 
  children, 
  showMenu = true 
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
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {icon && (
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(107, 114, 128, 0.3)' }}
            >
              {icon}
            </div>
          )}
          <h3 className="text-gray-300 text-sm font-medium">{title}</h3>
        </div>
        
        {showMenu && (
          <MoreHorizontal className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors" />
        )}
      </div>
      
      {/* Card Content */}
      {children}
    </div>
  )
}

export default BaseCard