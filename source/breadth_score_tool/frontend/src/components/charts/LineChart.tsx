import React from 'react'
import { Line } from 'react-chartjs-2'

interface LineChartProps {
  data: any
  height?: number
  showLegend?: boolean
}

const LineChart: React.FC<LineChartProps> = ({ data, height = 160, showLegend = false }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: showLegend },
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
          font: { size: 10 }
        }
      },
      y: {
        display: true,
        grid: { 
          color: 'rgba(71, 85, 105, 0.1)',
          drawBorder: false
        },
        ticks: { 
          color: '#64748b',
          font: { size: 10 },
          stepSize: 20
        }
      }
    }
  }

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  )
}

export default LineChart