#!/usr/bin/env python3
"""
Interactive Brokers API Bridge for Trading Tool
Created: 27.06.2025
Purpose: Python bridge for IB TWS API integration with Node.js backend
"""

import os
import sys
import json
import time
import threading
from typing import Dict, Any, Optional
from datetime import datetime

# Add virtual environment to path
venv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ib_api_env', 'lib', 'python3.13', 'site-packages')
if os.path.exists(venv_path):
    sys.path.insert(0, venv_path)

try:
    from ibapi.client import EClient
    from ibapi.wrapper import EWrapper
    from ibapi.contract import Contract
    from ibapi.order import Order
    from ibapi.common import TickerId, OrderId
    IB_API_AVAILABLE = True
except ImportError as e:
    print(f"Warning: IB API not available: {e}")
    IB_API_AVAILABLE = False

class IBTradingApp(EWrapper, EClient):
    """
    Interactive Brokers Trading Application
    Handles connection, market data, and order management
    """
    
    def __init__(self):
        if not IB_API_AVAILABLE:
            raise ImportError("IB API not available. Please install ibapi package.")
            
        EClient.__init__(self, self)
        
        # Connection settings - all from environment variables
        self.host = os.getenv('IB_GATEWAY_HOST')
        if not self.host:
            raise ValueError("IB_GATEWAY_HOST must be set in environment variables")
            
        port_str = os.getenv('IB_GATEWAY_PORT')
        if not port_str:
            raise ValueError("IB_GATEWAY_PORT must be set in environment variables")
        self.port = int(port_str)
        
        # Enforce paper trading
        paper_trading = os.getenv('PAPER_TRADING', 'true').lower() == 'true'
        if not paper_trading and self.port == 7496:
            raise ValueError("SAFETY: Live trading port detected but PAPER_TRADING is not false. Set PAPER_TRADING=false explicitly for live trading.")
        if paper_trading and self.port == 7496:
            raise ValueError("SAFETY: Live trading port 7496 detected but PAPER_TRADING=true. Use port 7497 for paper trading.")
            
        client_id_str = os.getenv('IB_GATEWAY_CLIENT_ID')
        if not client_id_str:
            raise ValueError("IB_GATEWAY_CLIENT_ID must be set in environment variables")
        self.client_id = int(client_id_str)
        
        # State tracking
        self.connected = False
        self.next_order_id = 1
        self.positions = {}
        self.market_data = {}
        self.account_info = {}
        
        # Event handlers
        self.message_handlers = {
            'connect': self.handle_connect,
            'disconnect': self.handle_disconnect,
            'get_positions': self.handle_get_positions,
            'get_account_summary': self.handle_get_account_summary,
            'place_order': self.handle_place_order,
            'cancel_order': self.handle_cancel_order,
            'get_market_data': self.handle_get_market_data,
            'health_check': self.handle_health_check
        }
    
    def error(self, reqId: TickerId, errorCode: int, errorString: str):
        """Handle API errors"""
        error_msg = {
            'type': 'error',
            'reqId': reqId,
            'errorCode': errorCode,
            'errorString': errorString,
            'timestamp': datetime.now().isoformat()
        }
        self.send_response(error_msg)
    
    def connectAck(self):
        """Connection acknowledgment"""
        self.connected = True
        response = {
            'type': 'connection_ack',
            'connected': True,
            'timestamp': datetime.now().isoformat()
        }
        self.send_response(response)
    
    def nextValidId(self, orderId: OrderId):
        """Receive next valid order ID"""
        self.next_order_id = orderId
        response = {
            'type': 'next_valid_id',
            'orderId': orderId,
            'timestamp': datetime.now().isoformat()
        }
        self.send_response(response)
    
    def position(self, account: str, contract: Contract, position: float, avgCost: float):
        """Receive position updates"""
        position_data = {
            'account': account,
            'symbol': contract.symbol,
            'position': position,
            'avgCost': avgCost,
            'timestamp': datetime.now().isoformat()
        }
        self.positions[contract.symbol] = position_data
    
    def positionEnd(self):
        """End of position updates"""
        response = {
            'type': 'positions',
            'data': list(self.positions.values()),
            'timestamp': datetime.now().isoformat()
        }
        self.send_response(response)
    
    def accountSummary(self, reqId: int, account: str, tag: str, value: str, currency: str):
        """Receive account summary"""
        self.account_info[tag] = {
            'value': value,
            'currency': currency
        }
    
    def accountSummaryEnd(self, reqId: int):
        """End of account summary"""
        response = {
            'type': 'account_summary',
            'data': self.account_info,
            'timestamp': datetime.now().isoformat()
        }
        self.send_response(response)
    
    def orderStatus(self, orderId: OrderId, status: str, filled: float, 
                   remaining: float, avgFillPrice: float, permId: int,
                   parentId: int, lastFillPrice: float, clientId: int,
                   whyHeld: str, mktCapPrice: float):
        """Order status updates"""
        response = {
            'type': 'order_status',
            'orderId': orderId,
            'status': status,
            'filled': filled,
            'remaining': remaining,
            'avgFillPrice': avgFillPrice,
            'timestamp': datetime.now().isoformat()
        }
        self.send_response(response)
    
    def tickPrice(self, reqId: TickerId, tickType: int, price: float, attrib):
        """Market data price updates"""
        tick_types = {1: 'bid', 2: 'ask', 4: 'last', 6: 'high', 7: 'low', 9: 'close'}
        if tickType in tick_types:
            if reqId not in self.market_data:
                self.market_data[reqId] = {}
            self.market_data[reqId][tick_types[tickType]] = price
    
    def send_response(self, data: Dict[str, Any]):
        """Send response back to Node.js"""
        print(json.dumps(data), flush=True)
    
    def handle_connect(self, data: Dict[str, Any]):
        """Handle connection request"""
        try:
            self.connect(self.host, self.port, self.client_id)
            # Start message loop in separate thread
            api_thread = threading.Thread(target=self.run, daemon=True)
            api_thread.start()
            
            response = {
                'type': 'connect_response',
                'success': True,
                'message': f'Connecting to {self.host}:{self.port}',
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            response = {
                'type': 'connect_response',
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
        
        self.send_response(response)
    
    def handle_disconnect(self, data: Dict[str, Any]):
        """Handle disconnection request"""
        self.disconnect()
        self.connected = False
        response = {
            'type': 'disconnect_response',
            'success': True,
            'timestamp': datetime.now().isoformat()
        }
        self.send_response(response)
    
    def handle_get_positions(self, data: Dict[str, Any]):
        """Handle get positions request"""
        if self.connected:
            self.reqPositions()
        else:
            response = {
                'type': 'error',
                'message': 'Not connected to IB Gateway',
                'timestamp': datetime.now().isoformat()
            }
            self.send_response(response)
    
    def handle_get_account_summary(self, data: Dict[str, Any]):
        """Handle account summary request"""
        if self.connected:
            tags = "NetLiquidation,TotalCashValue,AvailableFunds,BuyingPower"
            self.reqAccountSummary(9001, "All", tags)
        else:
            response = {
                'type': 'error',
                'message': 'Not connected to IB Gateway',
                'timestamp': datetime.now().isoformat()
            }
            self.send_response(response)
    
    def handle_place_order(self, data: Dict[str, Any]):
        """Handle place order request"""
        if not self.connected:
            response = {
                'type': 'error',
                'message': 'Not connected to IB Gateway',
                'timestamp': datetime.now().isoformat()
            }
            self.send_response(response)
            return
        
        try:
            # Create contract
            contract = Contract()
            contract.symbol = data.get('symbol')
            contract.secType = data.get('secType', 'STK')
            contract.exchange = data.get('exchange', 'SMART')
            contract.currency = data.get('currency', 'USD')
            
            # Create order
            order = Order()
            order.action = data.get('action')  # BUY or SELL
            order.totalQuantity = data.get('quantity')
            order.orderType = data.get('orderType', 'MKT')
            
            if order.orderType == 'LMT':
                order.lmtPrice = data.get('limitPrice')
            
            # Place order
            self.placeOrder(self.next_order_id, contract, order)
            self.next_order_id += 1
            
        except Exception as e:
            response = {
                'type': 'error',
                'message': f'Error placing order: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
            self.send_response(response)
    
    def handle_cancel_order(self, data: Dict[str, Any]):
        """Handle cancel order request"""
        order_id = data.get('orderId')
        if order_id and self.connected:
            self.cancelOrder(order_id)
    
    def handle_get_market_data(self, data: Dict[str, Any]):
        """Handle market data request"""
        if not self.connected:
            response = {
                'type': 'error',
                'message': 'Not connected to IB Gateway',
                'timestamp': datetime.now().isoformat()
            }
            self.send_response(response)
            return
        
        try:
            contract = Contract()
            contract.symbol = data.get('symbol')
            contract.secType = data.get('secType', 'STK')
            contract.exchange = data.get('exchange', 'SMART')
            contract.currency = data.get('currency', 'USD')
            
            req_id = data.get('reqId', 1001)
            self.reqMktData(req_id, contract, "", False, False, [])
            
        except Exception as e:
            response = {
                'type': 'error',
                'message': f'Error requesting market data: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
            self.send_response(response)
    
    def handle_health_check(self, data: Dict[str, Any]):
        """Handle health check request"""
        response = {
            'type': 'health_check',
            'connected': self.connected,
            'api_available': IB_API_AVAILABLE,
            'timestamp': datetime.now().isoformat()
        }
        self.send_response(response)
    
    def process_message(self, message: str):
        """Process incoming message from Node.js"""
        try:
            data = json.loads(message.strip())
            command = data.get('command')
            
            if command in self.message_handlers:
                self.message_handlers[command](data)
            else:
                response = {
                    'type': 'error',
                    'message': f'Unknown command: {command}',
                    'timestamp': datetime.now().isoformat()
                }
                self.send_response(response)
                
        except json.JSONDecodeError as e:
            response = {
                'type': 'error',
                'message': f'Invalid JSON: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
            self.send_response(response)
        except Exception as e:
            response = {
                'type': 'error',
                'message': f'Error processing message: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
            self.send_response(response)

def main():
    """Main function to handle communication with Node.js"""
    app = IBTradingApp()
    
    # Send startup message
    startup_msg = {
        'type': 'startup',
        'api_available': IB_API_AVAILABLE,
        'timestamp': datetime.now().isoformat()
    }
    app.send_response(startup_msg)
    
    # Process messages from stdin
    try:
        for line in sys.stdin:
            if line.strip():
                app.process_message(line)
    except KeyboardInterrupt:
        if app.connected:
            app.disconnect()
        sys.exit(0)
    except Exception as e:
        error_msg = {
            'type': 'fatal_error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }
        app.send_response(error_msg)
        sys.exit(1)

if __name__ == "__main__":
    main()