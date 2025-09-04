import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { 
  CalculatorIcon, 
  PlusCircleIcon, 
  TrendingUpIcon, 
  ArrowRightIcon,
  RefreshCwIcon,
  CheckCircleIcon 
} from 'lucide-react'
import { EnhancedTradeEntryForm } from './EnhancedTradeEntryForm'
import { toast } from '../ui/use-toast'

// Mock Position Calculator component - replace with actual component
const PositionCalculator = ({ onCalculationComplete }: { onCalculationComplete: (calculation: any) => void }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    entryPrice: 0,
    riskPercentage: 2,
    portfolioValue: 100000,
    vixLevel: 20,
    marketRegime: 'Normal'
  })

  const handleCalculate = () => {
    if (!formData.symbol || formData.entryPrice <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter symbol and entry price",
        variant: "destructive"
      })
      return
    }

    // Mock calculation - replace with actual calculation logic
    const riskAmount = formData.portfolioValue * (formData.riskPercentage / 100)
    const stopLossPrice = formData.entryPrice * 0.95 // 5% stop loss
    const riskPerShare = formData.entryPrice - stopLossPrice
    const positionSize = Math.floor(riskAmount / riskPerShare)
    const profitTarget1 = formData.entryPrice * 1.10 // 10% profit target
    const profitTarget2 = formData.entryPrice * 1.20 // 20% profit target
    
    const calculation = {
      symbol: formData.symbol,
      entryPrice: formData.entryPrice,
      positionSize,
      stopLossPrice,
      profitTarget1,
      profitTarget2,
      riskPercentage: formData.riskPercentage,
      vixLevel: formData.vixLevel,
      marketRegime: formData.marketRegime,
      calculatedAt: new Date(),
      allocation: (positionSize * formData.entryPrice) / formData.portfolioValue * 100,
      riskRewardRatio: (profitTarget1 - formData.entryPrice) / riskPerShare
    }

    onCalculationComplete(calculation)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalculatorIcon className="h-5 w-5" />
          Position Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
              placeholder="AAPL"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Entry Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.entryPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, entryPrice: parseFloat(e.target.value) || 0 }))}
              placeholder="150.00"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Risk Percentage (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.riskPercentage}
              onChange={(e) => setFormData(prev => ({ ...prev, riskPercentage: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Portfolio Value ($)</label>
            <input
              type="number"
              value={formData.portfolioValue}
              onChange={(e) => setFormData(prev => ({ ...prev, portfolioValue: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">VIX Level</label>
            <input
              type="number"
              step="0.01"
              value={formData.vixLevel}
              onChange={(e) => setFormData(prev => ({ ...prev, vixLevel: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Market Regime</label>
            <select
              value={formData.marketRegime}
              onChange={(e) => setFormData(prev => ({ ...prev, marketRegime: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="Low Volatility">Low Volatility</option>
              <option value="Normal">Normal</option>
              <option value="High Volatility">High Volatility</option>
              <option value="Extreme Volatility">Extreme Volatility</option>
            </select>
          </div>
        </div>
        
        <Button onClick={handleCalculate} className="w-full">
          <CalculatorIcon className="h-4 w-4 mr-2" />
          Calculate Position
        </Button>
      </CardContent>
    </Card>
  )
}

interface CalculatedTrade {
  symbol: string
  entryPrice: number
  positionSize: number
  stopLossPrice: number
  profitTarget1: number
  profitTarget2: number
  riskPercentage: number
  vixLevel: number
  marketRegime: string
  calculatedAt: Date
  allocation: number
  riskRewardRatio: number
}

interface TradeEntryFormData {
  symbol: string
  action: 'BUY' | 'SELL'
  quantity: number
  entryPrice: number
  stopLossPrice?: number
  profitTarget1?: number
  profitTarget2?: number
  orderType: 'MARKET' | 'LIMIT' | 'STOP'
  timeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK'
  notes: string
  calculationSource?: 'MANUAL' | 'CALCULATOR'
  originalCalculation?: CalculatedTrade
}

export const TradingOperationsDashboard: React.FC = () => {
  const [calculatedTrade, setCalculatedTrade] = useState<CalculatedTrade | null>(null)
  const [activeTab, setActiveTab] = useState("calculator")

  const handleCalculationComplete = (calculation: CalculatedTrade) => {
    setCalculatedTrade(calculation)
    setActiveTab("entry")
    
    toast({
      title: "Position Calculated",
      description: `Ready to enter trade for ${calculation.symbol} - ${calculation.positionSize} shares`,
    })
  }

  const handleTradeSubmit = (tradeData: TradeEntryFormData) => {
    // Handle trade submission - integrate with your trading system
    console.log('Trade submitted:', tradeData)
    
    toast({
      title: "Trade Submitted",
      description: `${tradeData.action} order for ${tradeData.quantity} shares of ${tradeData.symbol}`,
    })
    
    // Clear calculated trade after submission
    setCalculatedTrade(null)
  }

  const handleClearCalculation = () => {
    setCalculatedTrade(null)
    setActiveTab("calculator")
    
    toast({
      title: "Calculation Cleared",
      description: "Position calculator data has been cleared",
    })
  }

  const handleQuickTransition = () => {
    if (calculatedTrade) {
      setActiveTab("entry")
    } else {
      toast({
        title: "No Calculation",
        description: "Please calculate a position first",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold">Trading Operations</h1>
            <p className="text-muted-foreground">Calculate positions and enter trades seamlessly</p>
          </div>
          
          {calculatedTrade && (
            <div className="flex items-center gap-3">
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Position Calculated
              </Badge>
              <Button
                onClick={handleQuickTransition}
                className="flex items-center gap-2"
              >
                Enter Trade
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Workflow Progress Indicator */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <div className={`flex items-center gap-2 ${activeTab === 'calculator' ? 'text-blue-600' : calculatedTrade ? 'text-green-600' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              activeTab === 'calculator' ? 'bg-blue-100 text-blue-600' : 
              calculatedTrade ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
            }`}>
              1
            </div>
            <span className="font-medium">Calculate Position</span>
          </div>
          
          <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
          
          <div className={`flex items-center gap-2 ${activeTab === 'entry' ? 'text-blue-600' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              activeTab === 'entry' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
            }`}>
              2
            </div>
            <span className="font-medium">Enter Trade</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <CalculatorIcon className="h-4 w-4" />
            Position Calculator
          </TabsTrigger>
          <TabsTrigger value="entry" className="flex items-center gap-2">
            <PlusCircleIcon className="h-4 w-4" />
            Trade Entry
            {calculatedTrade && <Badge variant="secondary" className="ml-1">Ready</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="mt-6">
          <div className="space-y-6">
            <PositionCalculator onCalculationComplete={handleCalculationComplete} />
            
            {calculatedTrade && (
              <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                        <CheckCircleIcon className="h-4 w-4" />
                        Position Calculated Successfully
                      </h3>
                      <p className="text-sm text-green-600 dark:text-green-300">
                        Ready to proceed to trade entry
                      </p>
                    </div>
                    <Button
                      onClick={handleQuickTransition}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Enter Trade <ArrowRightIcon className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Symbol</p>
                      <p className="font-semibold">{calculatedTrade.symbol}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Position Size</p>
                      <p className="font-semibold">{calculatedTrade.positionSize} shares</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Entry Price</p>
                      <p className="font-semibold">${calculatedTrade.entryPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stop Loss</p>
                      <p className="font-semibold">${calculatedTrade.stopLossPrice.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="entry" className="mt-6">
          <EnhancedTradeEntryForm
            onSubmit={handleTradeSubmit}
            calculatedTrade={calculatedTrade}
            onClearCalculation={handleClearCalculation}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}