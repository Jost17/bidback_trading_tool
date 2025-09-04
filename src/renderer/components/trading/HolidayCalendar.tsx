import React, { useState, useMemo } from 'react'
import { 
  Calendar, 
  Clock, 
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react'
import { Holiday, VixExitMatrix } from '../../../types/calendar'
import { 
  getAllHolidays, 
  isTradingDay, 
  isEarlyCloseDay,
  getVixExitMatrix
} from '../../../utils/holidayCalendar'
import { VIX_EXIT_MATRIX } from '../../../types/calendar'

interface HolidayCalendarProps {
  onBack?: () => void
}

export function HolidayCalendar({ onBack }: HolidayCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  const holidays = useMemo(() => getAllHolidays(), [])
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const getCalendarData = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1)
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
    const firstDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    
    const calendarDays = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day)
      const dateStr = date.toISOString().split('T')[0]
      const holiday = holidays.find(h => h.date === dateStr)
      const isTrading = isTradingDay(date)
      const isEarlyClose = isEarlyCloseDay(date)
      
      calendarDays.push({
        day,
        date,
        dateStr,
        holiday,
        isTrading,
        isEarlyClose,
        isToday: dateStr === new Date().toISOString().split('T')[0]
      })
    }
    
    return calendarDays
  }
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11)
        setSelectedYear(selectedYear - 1)
      } else {
        setSelectedMonth(selectedMonth - 1)
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0)
        setSelectedYear(selectedYear + 1)
      } else {
        setSelectedMonth(selectedMonth + 1)
      }
    }
  }
  
  const getDayClassName = (dayData: any) => {
    if (!dayData) return ""
    
    let className = "h-12 flex flex-col items-center justify-center text-sm border rounded cursor-pointer hover:bg-gray-50 transition-colors"
    
    if (dayData.isToday) {
      className += " bg-blue-100 border-blue-300 font-semibold"
    } else if (dayData.holiday) {
      className += dayData.holiday.type === 'market_closed' 
        ? " bg-red-100 border-red-300 text-red-800"
        : " bg-yellow-100 border-yellow-300 text-yellow-800"
    } else if (!dayData.isTrading) {
      className += " bg-gray-100 text-gray-500"
    } else {
      className += " bg-green-50 border-green-200"
    }
    
    return className
  }
  
  const calendarData = getCalendarData()
  const upcomingHolidays = holidays
    .filter(h => new Date(h.date) >= new Date())
    .slice(0, 5)
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <Home className="w-4 h-4" />
              <span className="font-medium">Back to Trading</span>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Calendar className="w-7 h-7 text-blue-600" />
              <span>Bidback Trading Calendar</span>
            </h1>
            <p className="text-gray-600 mt-1">US Market Holidays & Trading Days</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <h2 className="text-xl font-semibold text-gray-900">
                {monthNames[selectedMonth]} {selectedYear}
              </h2>
              
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarData.map((dayData, index) => (
                <div key={index} className={getDayClassName(dayData)}>
                  {dayData && (
                    <>
                      <span className="font-medium">{dayData.day}</span>
                      {dayData.holiday && (
                        <div className="flex items-center space-x-1">
                          {dayData.holiday.type === 'market_closed' ? (
                            <AlertTriangle className="w-2 h-2" />
                          ) : (
                            <Clock className="w-2 h-2" />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            
            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                <span className="text-sm text-gray-600">Trading Day</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span className="text-sm text-gray-600">Market Closed</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="text-sm text-gray-600">Early Close</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span className="text-sm text-gray-600">Today</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Holidays */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span>Upcoming Holidays</span>
            </h3>
            
            <div className="space-y-3">
              {upcomingHolidays.map((holiday) => (
                <div key={holiday.date} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{holiday.name}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(holiday.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    holiday.type === 'market_closed' 
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {holiday.type === 'market_closed' ? 'CLOSED' : 'EARLY'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* VIX Exit Matrix */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Info className="w-5 h-5 text-blue-600" />
              <span>VIX Exit Matrix</span>
            </h3>
            
            <div className="text-sm text-gray-600 mb-4">
              Bidback Master System exit parameters based on VIX levels
            </div>
            
            <div className="space-y-2">
              {VIX_EXIT_MATRIX.map((matrix: VixExitMatrix, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="font-medium text-gray-900 text-sm mb-1">
                    {matrix.vixRange}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Stop: {matrix.stopLossPercent}%</div>
                    <div>Target: {matrix.profitTarget2Percent}%</div>
                    <div>Days: {matrix.maxHoldDays}</div>
                    <div>Mult: {matrix.multiplier}x</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}