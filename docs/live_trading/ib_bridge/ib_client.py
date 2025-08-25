#!/usr/bin/env python3
"""
Interactive Brokers TWS API Bridge
Connects Node.js Trading Tool to IB Gateway via Socket Communication
"""

import json
import sys
import threading
import time
from typing import Dict, Any, Optional
from ibapi.client import EClient
from ibapi.wrapper import EWrapper
from ibapi.contract import Contract
from ibapi.order import Order
from ibapi.common import TickerId, OrderId
from ibapi.ticktype import TickType


class IBBridge(EWrapper, EClient):
    """
    IB API Bridge for Trading Tool
    Handles connection, market data, orders, and positions
    """
    
    def __init__(self):
        EClient.__init__(self, self)
        
        # Connection status
        self.connected = False
        self.next_order_id = 1
        
        # Data storage
        self.positions = {}
        self.orders = {}
        self.market_data = {}
        self.account_summary = {}
        
        # Message queue for Node.js communication
        self.message_queue = []
        
        # Threading
        self.api_thread = None
        
    def connect_to_ib(self, host: str = "127.0.0.1", port: int = 7497, client_id: int = 1):
        """Connect to IB Gateway or TWS"""
        try:
            self.connect(host, port, client_id)
            self.api_thread = threading.Thread(target=self.run, daemon=True)
            self.api_thread.start()
            
            # Wait for connection
            timeout = 10
            while not self.connected and timeout > 0:
                time.sleep(0.1)
                timeout -= 0.1
                
            if self.connected:
                self.send_message("connection", {"status": "connected", "client_id": client_id})
                # Request minimal data after connection (avoid market data requirements)
                time.sleep(1)  # Give connection time to stabilize
                try:
                    # Only request account data - no market data required
                    self.reqAccountSummary(9001, "All", "NetLiquidation,TotalCashValue,AvailableFunds,BuyingPower")
                    self.reqPositions()  # Request positions
                except Exception as e:
                    self.send_message("info", {"message": f"Account data request failed: {e}"})
                return True
            else:
                self.send_message("connection", {"status": "failed", "error": "Connection timeout"})
                return False
                
        except Exception as e:
            self.send_message("connection", {"status": "error", "error": str(e)})
            return False
    
    def disconnect_from_ib(self):
        """Disconnect from IB"""
        if self.connected:
            self.disconnect()
            self.connected = False
            self.send_message("connection", {"status": "disconnected"})
    
    # Connection Events
    def connectAck(self):
        """Connection acknowledgment"""
        self.connected = True
        self.connection_start_time = time.time()
        
    def connectionClosed(self):
        """Connection closed"""
        self.connected = False
        # Only report error if we were actually connected for less than 5 seconds
        if hasattr(self, 'connection_start_time'):
            connection_duration = time.time() - self.connection_start_time
            if connection_duration < 5:
                self.send_message("connection", {"status": "disconnected", "error": "Connection closed by IB Gateway (check account permissions)"})
            else:
                self.send_message("connection", {"status": "disconnected"})
        else:
            self.send_message("connection", {"status": "disconnected"})
    
    def error(self, req_id: TickerId, error_code: int, error_string: str, advanced_order_reject_json: str = ""):
        """Handle API errors and informational messages"""
        
        # Informational messages (not actual errors)
        info_codes = [2104, 2106, 2158, 2157, 2119, 2100, 2101, 2102, 2103]
        
        error_msg = {
            "req_id": req_id,
            "error_code": error_code,
            "error_string": error_string,
            "advanced_order_reject_json": advanced_order_reject_json
        }
        
        # Send as info instead of error for informational messages
        if error_code in info_codes:
            self.send_message("info", error_msg)
        else:
            self.send_message("error", error_msg)
        
        # Handle specific errors
        if error_code == 502:  # Connection lost
            self.connected = False
            self.send_message("connection", {"status": "disconnected", "error": f"IB Error {error_code}: {error_string}"})
        elif error_code in [1100, 1101, 1102]:  # Connectivity issues
            self.connected = False
            self.send_message("connection", {"status": "disconnected", "error": f"IB Error {error_code}: {error_string}"})
        elif error_code == 504:  # Not connected
            self.connected = False
            self.send_message("connection", {"status": "failed", "error": f"IB Error {error_code}: {error_string}"})
    
    def nextValidId(self, order_id: OrderId):
        """Receive next valid order ID"""
        self.next_order_id = order_id
        self.send_message("next_order_id", {"order_id": order_id})
    
    # Market Data Events
    def tickPrice(self, req_id: TickerId, tick_type: TickType, price: float, attrib):
        """Receive tick price data"""
        symbol = self.get_symbol_from_req_id(req_id)
        tick_data = {
            "symbol": symbol,
            "tick_type": tick_type,
            "price": price,
            "timestamp": time.time()
        }
        
        # Store market data
        if symbol not in self.market_data:
            self.market_data[symbol] = {}
        self.market_data[symbol][tick_type] = price
        
        self.send_message("market_data", tick_data)
    
    def tickSize(self, req_id: TickerId, tick_type: TickType, size: int):
        """Receive tick size data"""
        symbol = self.get_symbol_from_req_id(req_id)
        tick_data = {
            "symbol": symbol,
            "tick_type": tick_type,
            "size": size,
            "timestamp": time.time()
        }
        self.send_message("market_data", tick_data)
    
    # Position Events
    def position(self, account: str, contract: Contract, position: float, avg_cost: float):
        """Receive position updates"""
        position_data = {
            "account": account,
            "symbol": contract.symbol,
            "position": position,
            "avg_cost": avg_cost,
            "market_value": position * avg_cost if avg_cost > 0 else 0
        }
        
        self.positions[contract.symbol] = position_data
        self.send_message("position", position_data)
    
    def positionEnd(self):
        """Position updates complete"""
        self.send_message("positions_complete", {"positions": self.positions})
    
    # Order Events
    def orderStatus(self, order_id: OrderId, status: str, filled: float, remaining: float,
                   avg_fill_price: float, perm_id: int, parent_id: int, last_fill_price: float,
                   client_id: int, why_held: str, mkt_cap_price: float):
        """Receive order status updates"""
        order_data = {
            "order_id": order_id,
            "status": status,
            "filled": filled,
            "remaining": remaining,
            "avg_fill_price": avg_fill_price,
            "last_fill_price": last_fill_price,
            "timestamp": time.time()
        }
        
        self.orders[order_id] = order_data
        self.send_message("order_status", order_data)
    
    # Account Events
    def accountSummary(self, req_id: int, account: str, tag: str, value: str, currency: str):
        """Receive account summary"""
        account_data = {
            "account": account,
            "tag": tag,
            "value": value,
            "currency": currency
        }
        
        self.account_summary[tag] = account_data
        self.send_message("account_summary", account_data)
    
    def accountSummaryEnd(self, req_id: int):
        """Account summary complete"""
        self.send_message("account_summary_complete", {"summary": self.account_summary})
    
    # Trading Methods
    def place_order(self, symbol: str, action: str, quantity: int, order_type: str, price: float = 0):
        """Place a trading order"""
        try:
            # Create contract
            contract = Contract()
            contract.symbol = symbol
            contract.secType = "STK"
            contract.exchange = "SMART"
            contract.currency = "USD"
            
            # Create order
            order = Order()
            order.action = action.upper()  # BUY or SELL
            order.totalQuantity = quantity
            order.orderType = order_type.upper()  # MKT, LMT, STP, etc.
            
            if order_type.upper() == "LMT":
                order.lmtPrice = price
            elif order_type.upper() == "STP":
                order.auxPrice = price
            
            # Place order
            order_id = self.next_order_id
            self.placeOrder(order_id, contract, order)
            self.next_order_id += 1
            
            order_placed = {
                "order_id": order_id,
                "symbol": symbol,
                "action": action,
                "quantity": quantity,
                "order_type": order_type,
                "price": price,
                "status": "submitted"
            }
            
            self.send_message("order_placed", order_placed)
            return order_id
            
        except Exception as e:
            self.send_message("order_error", {"error": str(e), "symbol": symbol})
            return None
    
    def request_market_data(self, symbol: str, req_id: int = None):
        """Request real-time market data"""
        if req_id is None:
            req_id = len(self.market_data) + 1000
            
        try:
            contract = Contract()
            contract.symbol = symbol
            contract.secType = "STK"
            contract.exchange = "SMART"
            contract.currency = "USD"
            
            self.reqMktData(req_id, contract, "", False, False, [])
            self.send_message("market_data_requested", {"symbol": symbol, "req_id": req_id})
            
        except Exception as e:
            self.send_message("market_data_error", {"error": str(e), "symbol": symbol})
    
    def cancel_market_data(self, req_id: int):
        """Cancel market data subscription"""
        self.cancelMktData(req_id)
        self.send_message("market_data_cancelled", {"req_id": req_id})
    
    def request_positions(self):
        """Request all positions"""
        self.reqPositions()
    
    def cancel_order(self, order_id: int):
        """Cancel an order"""
        self.cancelOrder(order_id)
        self.send_message("order_cancelled", {"order_id": order_id})
    
    # Utility Methods
    def get_symbol_from_req_id(self, req_id: int) -> str:
        """Map request ID back to symbol (simplified)"""
        return f"REQ_{req_id}"
    
    def send_message(self, msg_type: str, data: Dict[str, Any]):
        """Send message to Node.js via stdout"""
        message = {
            "type": msg_type,
            "data": data,
            "timestamp": time.time()
        }
        
        try:
            print(json.dumps(message), flush=True)
        except Exception as e:
            print(json.dumps({
                "type": "internal_error",
                "data": {"error": str(e)},
                "timestamp": time.time()
            }), flush=True)
    
    def get_connection_status(self) -> Dict[str, Any]:
        """Get current connection status"""
        return {
            "connected": self.connected,
            "next_order_id": self.next_order_id,
            "positions_count": len(self.positions),
            "orders_count": len(self.orders),
            "market_data_count": len(self.market_data)
        }


def main():
    """Main entry point for IB Bridge"""
    bridge = IBBridge()
    
    try:
        # Read commands from stdin (Node.js communication)
        for line in sys.stdin:
            try:
                command = json.loads(line.strip())
                command_type = command.get("type")
                data = command.get("data", {})
                
                if command_type == "connect":
                    host = data.get("host", "127.0.0.1")
                    port = data.get("port", 7497)
                    client_id = data.get("client_id", 1)
                    bridge.connect_to_ib(host, port, client_id)
                
                elif command_type == "disconnect":
                    bridge.disconnect_from_ib()
                
                elif command_type == "place_order":
                    bridge.place_order(
                        data["symbol"],
                        data["action"],
                        data["quantity"],
                        data["order_type"],
                        data.get("price", 0)
                    )
                
                elif command_type == "request_market_data":
                    bridge.request_market_data(data["symbol"], data.get("req_id"))
                
                elif command_type == "cancel_market_data":
                    bridge.cancel_market_data(data["req_id"])
                
                elif command_type == "request_positions":
                    bridge.request_positions()
                
                elif command_type == "cancel_order":
                    bridge.cancel_order(data["order_id"])
                
                elif command_type == "status":
                    status = bridge.get_connection_status()
                    bridge.send_message("status_response", status)
                
                else:
                    bridge.send_message("unknown_command", {"command": command_type})
                    
            except json.JSONDecodeError as e:
                bridge.send_message("json_error", {"error": str(e)})
            except Exception as e:
                bridge.send_message("command_error", {"error": str(e)})
                
    except KeyboardInterrupt:
        bridge.disconnect_from_ib()
        sys.exit(0)
    except Exception as e:
        bridge.send_message("fatal_error", {"error": str(e)})
        sys.exit(1)


if __name__ == "__main__":
    main()