'use client';

import { useState, useEffect } from 'react';

interface TradingStatus {
  connected: boolean;
  nextOrderId?: number;
  error?: string;
  bridgeActive?: boolean;
}

interface AccountSummary {
  [key: string]: {
    value: string;
    currency: string;
  };
}

interface Position {
  symbol: string;
  position: number;
  avg_cost: number;
  market_value: number;
}

interface Order {
  order_id: number;
  status: string;
  filled: number;
  remaining: number;
  avg_fill_price: number;
}

export default function TradingInterface() {
  const [connectionStatus, setConnectionStatus] = useState<TradingStatus>({ connected: false });
  const [accountSummary, setAccountSummary] = useState<AccountSummary>({});
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Order form state
  const [orderForm, setOrderForm] = useState({
    symbol: '',
    quantity: '',
    price: '',
    orderType: 'MKT'
  });

  // Fetch trading status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/trading?action=status');
      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch trading status:', error);
    }
  };

  // Fetch account data
  const fetchAccountData = async () => {
    try {
      const [accountRes, positionsRes, ordersRes] = await Promise.all([
        fetch('/api/trading?action=account'),
        fetch('/api/trading?action=positions'),
        fetch('/api/trading?action=orders')
      ]);

      const [accountData, positionsData, ordersData] = await Promise.all([
        accountRes.json(),
        positionsRes.json(),
        ordersRes.json()
      ]);

      if (accountData.success) {
        setAccountSummary(accountData.data.accountSummary || {});
      }
      if (positionsData.success) {
        setPositions(positionsData.data.positions || []);
      }
      if (ordersData.success) {
        setOrders(ordersData.data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch account data:', error);
    }
  };

  // Connect to IB
  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          config: {
            host: '127.0.0.1',
            port: 7497, // IB Gateway port
            clientId: 1
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus({ connected: true, ...result.data });
        await fetchAccountData();
      } else {
        console.error('Connection failed:', result.error);
        setConnectionStatus({ connected: false, error: result.error });
      }
    } catch (error) {
      console.error('Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setConnectionStatus({ connected: false, error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Disconnect from IB
  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      });

      const result = await response.json();
      if (result.success) {
        setConnectionStatus({ connected: false });
        setAccountSummary({});
        setPositions([]);
        setOrders([]);
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Place order
  const handlePlaceOrder = async (action: 'BUY' | 'SELL') => {
    if (!orderForm.symbol || !orderForm.quantity) {
      alert('Please enter symbol and quantity');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'place_order',
          symbol: orderForm.symbol.toUpperCase(),
          orderAction: action,
          quantity: parseInt(orderForm.quantity),
          orderType: orderForm.orderType,
          price: orderForm.orderType === 'LMT' ? parseFloat(orderForm.price) : 0
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Order placed successfully: ${result.data.order_id}`);
        setOrderForm({ symbol: '', quantity: '', price: '', orderType: 'MKT' });
        await fetchAccountData();
      } else {
        alert(`Order failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Order error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Order error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Load initial status
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const getAccountValue = (tag: string) => {
    return accountSummary[tag]?.value || '0.00';
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-bullish">Trading Interface</h2>
        <div className="flex gap-2">
          {!connectionStatus.connected ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-4 py-2 bg-bullish text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect to IB'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-bearish text-white rounded-lg hover:bg-red-600"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {connectionStatus.error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Connection Error: {typeof connectionStatus.error === 'string' ? connectionStatus.error : JSON.stringify(connectionStatus.error)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Entry */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Order Entry</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Symbol</label>
              <input 
                type="text" 
                value={orderForm.symbol}
                onChange={(e) => setOrderForm({ ...orderForm, symbol: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-bullish"
                placeholder="AAPL"
                disabled={!connectionStatus.connected}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input 
                  type="number"
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-bullish"
                  disabled={!connectionStatus.connected}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Order Type</label>
                <select
                  value={orderForm.orderType}
                  onChange={(e) => setOrderForm({ ...orderForm, orderType: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-bullish"
                  disabled={!connectionStatus.connected}
                >
                  <option value="MKT">Market</option>
                  <option value="LMT">Limit</option>
                </select>
              </div>
            </div>

            {orderForm.orderType === 'LMT' && (
              <div>
                <label className="block text-sm font-medium mb-1">Limit Price</label>
                <input 
                  type="number"
                  step="0.01"
                  value={orderForm.price}
                  onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-bullish"
                  disabled={!connectionStatus.connected}
                />
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={() => handlePlaceOrder('BUY')}
                disabled={!connectionStatus.connected || loading}
                className="flex-1 py-2 bg-bullish text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                BUY
              </button>
              <button 
                onClick={() => handlePlaceOrder('SELL')}
                disabled={!connectionStatus.connected || loading}
                className="flex-1 py-2 bg-bearish text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                SELL
              </button>
            </div>
          </div>
        </div>
        
        {/* Account Status */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Account Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Connection Status:</span>
              <span className={connectionStatus.connected ? "text-bullish" : "text-bearish"}>
                {connectionStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Net Liquidation:</span>
              <span>{formatCurrency(getAccountValue('NetLiquidation'))}</span>
            </div>
            <div className="flex justify-between">
              <span>Available Funds:</span>
              <span>{formatCurrency(getAccountValue('AvailableFunds'))}</span>
            </div>
            <div className="flex justify-between">
              <span>Buying Power:</span>
              <span>{formatCurrency(getAccountValue('BuyingPower'))}</span>
            </div>
            <div className="flex justify-between">
              <span>Unrealized P&L:</span>
              <span className={parseFloat(getAccountValue('UnrealizedPnL')) >= 0 ? "text-bullish" : "text-bearish"}>
                {formatCurrency(getAccountValue('UnrealizedPnL'))}
              </span>
            </div>
          </div>
        </div>

        {/* Positions */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Positions ({positions.length})</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {positions.length === 0 ? (
              <p className="text-gray-500 text-sm">No open positions</p>
            ) : (
              positions.map((position, index) => (
                <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{position.symbol}</div>
                    <div className="text-gray-600">{position.position} shares</div>
                  </div>
                  <div className="text-right">
                    <div>{formatCurrency(position.avg_cost.toString())}</div>
                    <div className="text-gray-600">{formatCurrency(position.market_value.toString())}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {orders.length > 0 && (
        <div className="mt-6 border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Recent Orders ({orders.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Order ID</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Filled</th>
                  <th className="text-left py-2">Remaining</th>
                  <th className="text-left py-2">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{order.order_id}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        order.status === 'Filled' ? 'bg-green-100 text-green-800' :
                        order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-2">{order.filled}</td>
                    <td className="py-2">{order.remaining}</td>
                    <td className="py-2">{formatCurrency(order.avg_fill_price.toString())}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}