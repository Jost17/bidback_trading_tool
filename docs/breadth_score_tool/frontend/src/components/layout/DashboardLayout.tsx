import React from 'react'
import Header from './Header'
import DashboardTitle from './DashboardTitle'
import GridContainer from './GridContainer'

interface DashboardLayoutProps {
  children?: React.ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div 
      className="min-h-screen p-6"
      style={{
        background: 'linear-gradient(135deg, #1a1d3a 0%, #262947 100%)'
      }}
    >
      <Header />
      <DashboardTitle />
      <GridContainer>
        {children}
      </GridContainer>
    </div>
  )
}

export default DashboardLayout