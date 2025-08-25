import React from 'react'
import { Doughnut } from 'react-chartjs-2'

interface DoughnutChartProps {
  data: any
  centerContent?: React.ReactNode
  size?: number
}

const DoughnutChart: React.FC<DoughnutChartProps> = ({ 
  data, 
  centerContent, 
  size = 128 
}) => {
  const options = {
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
    },
    cutout: '70%'
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <Doughnut data={data} options={options} />
      
      {/* Center Content */}
      {centerContent && (
        <div className="absolute inset-0 flex items-center justify-center">
          {centerContent}
        </div>
      )}
    </div>
  )
}

export default DoughnutChart