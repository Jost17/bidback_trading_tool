import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'

// Layout Components
import DashboardLayout from './layout/DashboardLayout'
import EnhancedHeader from './layout/header/EnhancedHeader'
import DashboardTitle from './layout/DashboardTitle'
import GridContainer from './layout/GridContainer'

// Card Components
import MetricCard from './cards/MetricCard'
import ChartCard from './cards/ChartCard'

// Chart Components
import BarChart from './charts/BarChart'
import LineChart from './charts/LineChart'
import DoughnutChart from './charts/DoughnutChart'

import { DollarSign, TrendingDown, Users, Heart } from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

const StructuredDashboard: React.FC = () => {
  // Chart Data
  const salesAnalyticsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        data: [20, 32, 25, 38, 30, 45, 42, 48, 38, 28, 42, 52],
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderRadius: 2,
        barThickness: 12,
        maxBarThickness: 12,
      }
    ]
  }

  const customerSatisfactionData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    datasets: [
      {
        label: '85% satisfied',
        data: [82, 83, 84, 83.5, 84.2, 84.8, 85.1, 85],
        borderColor: '#22c55e',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#22c55e',
        tension: 0.4
      },
      {
        label: '9% neutral',
        data: [12, 11.5, 11, 11.2, 10.8, 10.5, 10.2, 9],
        borderColor: '#fbbf24',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#fbbf24',
        tension: 0.4
      },
      {
        label: '6% dissatisfied',
        data: [6, 5.5, 5, 5.3, 5, 4.7, 4.7, 6],
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#ef4444',
        tension: 0.4
      }
    ]
  }

  const expensesData = {
    labels: ['Marketing', 'Payroll', 'Equipment', 'Others'],
    datasets: [
      {
        data: [35, 30, 25, 10],
        backgroundColor: ['#3b82f6', '#f97316', '#a855f7', '#22c55e'],
        borderWidth: 0,
        cutout: '70%'
      }
    ]
  }

  const expensesLegend = [
    { color: '#3b82f6', label: 'Marketing', value: '$300,000' },
    { color: '#f97316', label: 'Payroll', value: '$250,000' },
    { color: '#a855f7', label: 'Equipment', value: '$200,000' },
    { color: '#22c55e', label: 'Others', value: '$110,000' }
  ]

  return (
    <div 
      className="min-h-screen p-8"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      }}
    >
      {/* Enhanced Header */}
      <EnhancedHeader 
        onSearchClick={() => console.log('Search clicked')}
        onHelpClick={() => console.log('Help clicked')}
        onNotificationClick={() => console.log('Notifications clicked')}
        onProfileClick={() => console.log('Profile clicked')}
        onSettingsClick={() => console.log('Settings clicked')}
        onLogoutClick={() => console.log('Logout clicked')}
        notificationCount={3}
      />
      
      {/* Dashboard Title */}
      <DashboardTitle 
        title="Analytics Dashboard"
        subtitle="Real-time business insights and performance metrics"
        onShareClick={() => console.log('Share clicked')}
        onAIAssistantClick={() => console.log('AI Assistant clicked')}
        onDateRangeClick={() => console.log('Date range clicked')}
      />
      
      {/* Grid Container */}
      <GridContainer>
        {/* Top Row - Metric Cards */}
        <MetricCard
          title="Revenue"
          value="$45,231.89"
          change={20.1}
          changeLabel="from last month"
          trend="up"
          icon={<DollarSign className="w-5 h-5" strokeWidth={1.5} />}
          gridArea="revenue"
        />

        <MetricCard
          title="Profit"
          value="$12,234.89"
          change={19}
          changeLabel="from last month"
          trend="up"
          icon={<Users className="w-5 h-5" strokeWidth={1.5} />}
          gridArea="profit"
        />

        <MetricCard
          title="Customers"
          value="2,350"
          change={180}
          changeLabel="from last month"
          trend="up"
          icon={<Users className="w-5 h-5" strokeWidth={1.5} />}
          gridArea="customers"
        />

        <MetricCard
          title="Satisfaction"
          value="8.5/10"
          change={2}
          changeLabel="from last month"
          trend="up"
          icon={<Heart className="w-5 h-5" strokeWidth={1.5} />}
          gridArea="satisfaction"
        />

        {/* Large Chart Section */}
        <div 
          className="p-6 rounded-xl border transition-all duration-200 hover:border-white/20"
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(107, 114, 128, 0.2)',
            gridArea: 'chart'
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 
              className="text-white font-semibold"
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                letterSpacing: '-0.025em'
              }}
            >
              Overview
            </h3>
          </div>
          <BarChart data={salesAnalyticsData} height={300} />
        </div>

        {/* Bottom Row - Chart Cards */}
        <div 
          className="p-6 rounded-xl border transition-all duration-200 hover:border-white/20"
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(107, 114, 128, 0.2)',
            gridArea: 'overview'
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 
              className="text-white font-semibold"
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                letterSpacing: '-0.025em'
              }}
            >
              Customer satisfaction
            </h3>
          </div>
          
          {/* Legend */}
          <div className="flex items-center space-x-6 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-green-400 text-sm">85% satisfied</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span className="text-yellow-400 text-sm">9% neutral</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="text-red-400 text-sm">6% dissatisfied</span>
            </div>
          </div>
          
          <LineChart data={customerSatisfactionData} height={200} />
        </div>

        <div 
          className="p-6 rounded-xl border transition-all duration-200 hover:border-white/20"
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(107, 114, 128, 0.2)',
            gridArea: 'recent'
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 
              className="text-white font-semibold"
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                letterSpacing: '-0.025em'
              }}
            >
              Recent Activities
            </h3>
          </div>
          
          <div className="space-y-4">
            {[
              { action: 'New customer registration', time: '2 hours ago', amount: '+$124.00' },
              { action: 'Product sale completed', time: '4 hours ago', amount: '+$89.50' },
              { action: 'Refund processed', time: '6 hours ago', amount: '-$45.00' },
              { action: 'Subscription renewal', time: '1 day ago', amount: '+$299.00' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div>
                  <div className="text-white text-sm font-medium">{activity.action}</div>
                  <div className="text-gray-400 text-xs">{activity.time}</div>
                </div>
                <div className={`text-sm font-medium ${activity.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                  {activity.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      </GridContainer>
    </div>
  )
}

export default StructuredDashboard