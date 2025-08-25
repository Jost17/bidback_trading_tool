import React from 'react'
import { Bar } from 'react-chartjs-2'

interface BarChartProps {
  data: any
  height?: number
}

const BarChart: React.FC<BarChartProps> = ({ data, height = 128 }) => {
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
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: { 
          color: '#64748b',
          font: { size: 11 }
        }
      },
      y: {
        display: false,
        grid: { display: false }
      }
    }
  }

  return (
    <div style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  )
}

export default BarChart