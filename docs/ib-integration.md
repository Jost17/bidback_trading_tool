# IB Integration Documentation

## Python 3.11+

### Installation
```bash
# Using pyenv (recommended)
pyenv install 3.11.7
pyenv local 3.11.7

# Verify installation
python --version  # Should show Python 3.11.x

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Key Features in Python 3.11+
- **Performance**: Up to 60% faster than Python 3.10
- **Better Error Messages**: More precise error locations
- **Exception Groups**: Handle multiple exceptions simultaneously
- **Type Hints**: Self type, TypeVarTuple, Unpack
- **Task Groups**: Better async/await patterns

### Project Setup
```toml
# pyproject.toml
[tool.poetry]
name = "ib-trading-gateway"
version = "1.0.0"
description = "Interactive Brokers trading gateway"
authors = ["Your Name"]
python = "^3.11"

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.104.0"
uvicorn = {extras = ["standard"], version = "^0.24.0"}
ib_insync = "^0.9.86"
pydantic = "^2.5.0"
websockets = "^12.0"
asyncio = "^3.4.3"
pandas = "^2.1.0"
numpy = "^1.26.0"

[tool.poetry.dev-dependencies]
pytest = "^7.4.0"
pytest-asyncio = "^0.21.0"
black = "^23.0.0"
mypy = "^1.7.0"
ruff = "^0.1.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

## ib_insync 0.9.x

### Installation
```bash
pip install ib_insync==0.9.86
```

### Basic IB Connection
```python
from ib_insync import IB, Stock, MarketOrder, LimitOrder, StopOrder
import asyncio
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class IBConfig:
    host: str = "127.0.0.1"
    port: int = 7497  # 7497 for paper trading, 7496 for live
    client_id: int = 1
    account: Optional[str] = None

class IBGateway:
    def __init__(self, config: IBConfig):
        self.config = config
        self.ib = IB()
        self.connected = False
        self.subscriptions: Dict[str, Any] = {}
        
    async def connect(self) -> bool:
        """Connect to IB Gateway/TWS"""
        try:
            await self.ib.connectAsync(
                host=self.config.host,
                port=self.config.port,
                clientId=self.config.client_id
            )
            self.connected = True
            logger.info(f"Connected to IB on {self.config.host}:{self.config.port}")
            
            # Set up event handlers
            self.setup_event_handlers()
            
            # Get account info
            self.account = self.config.account or self.ib.managedAccounts()[0]
            logger.info(f"Using account: {self.account}")
            
            return True
        except Exception as e:
            logger.error(f"Failed to connect to IB: {e}")
            self.connected = False
            return False
    
    def setup_event_handlers(self):
        """Set up IB event handlers"""
        self.ib.orderStatusEvent += self.on_order_status
        self.ib.execDetailsEvent += self.on_exec_details
        self.ib.errorEvent += self.on_error
        self.ib.newOrderEvent += self.on_new_order
        
    def on_order_status(self, trade):
        """Handle order status updates"""
        logger.info(f"Order status: {trade.order.orderId} - {trade.orderStatus.status}")
        
    def on_exec_details(self, trade, fill):
        """Handle execution details"""
        logger.info(f"Execution: {fill.contract.symbol} - {fill.execution.shares}@{fill.execution.price}")
        
    def on_error(self, reqId, errorCode, errorString, contract):
        """Handle errors"""
        logger.error(f"Error {errorCode}: {errorString}")
        
    def on_new_order(self, trade):
        """Handle new order events"""
        logger.info(f"New order placed: {trade.order.orderId}")
    
    async def get_account_summary(self) -> Dict[str, Any]:
        """Get account summary"""
        summary = self.ib.accountSummary(self.account)
        await self.ib.accountSummaryAsync()
        
        return {
            item.tag: item.value
            for item in summary
        }
    
    async def get_positions(self) -> List[Dict[str, Any]]:
        """Get current positions"""
        positions = self.ib.positions(self.account)
        
        return [
            {
                "symbol": pos.contract.symbol,
                "position": pos.position,
                "avgCost": pos.avgCost,
                "marketValue": pos.marketValue,
                "unrealizedPNL": pos.unrealizedPNL,
                "realizedPNL": pos.realizedPNL
            }
            for pos in positions
        ]
    
    async def place_order(
        self,
        symbol: str,
        quantity: int,
        order_type: str,
        price: Optional[float] = None,
        stop_price: Optional[float] = None
    ):
        """Place an order"""
        # Create contract
        contract = Stock(symbol, "SMART", "USD")
        
        # Create order based on type
        if order_type == "MARKET":
            order = MarketOrder("BUY" if quantity > 0 else "SELL", abs(quantity))
        elif order_type == "LIMIT":
            if price is None:
                raise ValueError("Limit order requires price")
            order = LimitOrder("BUY" if quantity > 0 else "SELL", abs(quantity), price)
        elif order_type == "STOP":
            if stop_price is None:
                raise ValueError("Stop order requires stop price")
            order = StopOrder("BUY" if quantity > 0 else "SELL", abs(quantity), stop_price)
        else:
            raise ValueError(f"Unknown order type: {order_type}")
        
        # Place order
        trade = self.ib.placeOrder(contract, order)
        
        # Wait for order to be acknowledged
        while not trade.isDone():
            await asyncio.sleep(0.1)
        
        return {
            "orderId": trade.order.orderId,
            "status": trade.orderStatus.status,
            "filled": trade.orderStatus.filled,
            "remaining": trade.orderStatus.remaining,
            "avgFillPrice": trade.orderStatus.avgFillPrice
        }
    
    async def cancel_order(self, order_id: int):
        """Cancel an order"""
        order = self.ib.client.cancelOrder(order_id)
        return {"orderId": order_id, "status": "cancelled"}
    
    async def get_market_data(self, symbol: str) -> Dict[str, Any]:
        """Get real-time market data"""
        contract = Stock(symbol, "SMART", "USD")
        
        # Request market data
        ticker = self.ib.reqMktData(contract)
        
        # Wait for data
        while ticker.last != ticker.last:  # Wait for valid data (not NaN)
            await asyncio.sleep(0.1)
        
        return {
            "symbol": symbol,
            "last": ticker.last,
            "bid": ticker.bid,
            "ask": ticker.ask,
            "volume": ticker.volume,
            "high": ticker.high,
            "low": ticker.low,
            "close": ticker.close,
            "timestamp": datetime.now().isoformat()
        }
    
    async def stream_market_data(self, symbols: List[str], callback):
        """Stream market data for multiple symbols"""
        for symbol in symbols:
            contract = Stock(symbol, "SMART", "USD")
            ticker = self.ib.reqMktData(contract, "", False, False)
            
            # Set up callback
            ticker.updateEvent += lambda ticker, symbol=symbol: callback({
                "symbol": symbol,
                "last": ticker.last,
                "bid": ticker.bid,
                "ask": ticker.ask,
                "volume": ticker.volume,
                "timestamp": datetime.now().isoformat()
            })
            
            self.subscriptions[symbol] = ticker
    
    async def get_historical_data(
        self,
        symbol: str,
        duration: str = "1 D",
        bar_size: str = "1 min",
        what_to_show: str = "TRADES"
    ):
        """Get historical data"""
        contract = Stock(symbol, "SMART", "USD")
        
        bars = self.ib.reqHistoricalData(
            contract,
            endDateTime="",
            durationStr=duration,
            barSizeSetting=bar_size,
            whatToShow=what_to_show,
            useRTH=True,
            formatDate=1
        )
        
        return [
            {
                "timestamp": bar.date,
                "open": bar.open,
                "high": bar.high,
                "low": bar.low,
                "close": bar.close,
                "volume": bar.volume
            }
            for bar in bars
        ]
    
    async def disconnect(self):
        """Disconnect from IB"""
        if self.connected:
            self.ib.disconnect()
            self.connected = False
            logger.info("Disconnected from IB")
```

## FastAPI 0.104.x

### Installation
```bash
pip install "fastapi[all]"==0.104.1
pip install "uvicorn[standard]"
```

### FastAPI Application
```python
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import asyncio
import json

app = FastAPI(
    title="IB Trading Gateway",
    description="Interactive Brokers trading gateway API",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global IB gateway instance
ib_gateway: Optional[IBGateway] = None

# Pydantic models
class OrderRequest(BaseModel):
    symbol: str = Field(..., description="Stock symbol")
    quantity: int = Field(..., description="Order quantity (positive for buy, negative for sell)")
    order_type: str = Field(..., description="Order type: MARKET, LIMIT, STOP")
    price: Optional[float] = Field(None, description="Limit price")
    stop_price: Optional[float] = Field(None, description="Stop price")
    
    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "AAPL",
                "quantity": 100,
                "order_type": "LIMIT",
                "price": 150.50
            }
        }

class OrderResponse(BaseModel):
    order_id: int
    status: str
    filled: float
    remaining: float
    avg_fill_price: Optional[float]
    timestamp: datetime

class Position(BaseModel):
    symbol: str
    position: float
    avg_cost: float
    market_value: float
    unrealized_pnl: float
    realized_pnl: float

class MarketData(BaseModel):
    symbol: str
    last: float
    bid: float
    ask: float
    volume: int
    high: float
    low: float
    timestamp: datetime

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize IB connection on startup"""
    global ib_gateway
    config = IBConfig(
        host="127.0.0.1",
        port=7497,  # Paper trading port
        client_id=1
    )
    ib_gateway = IBGateway(config)
    
    connected = await ib_gateway.connect()
    if not connected:
        logger.error("Failed to connect to IB Gateway")
    else:
        logger.info("Successfully connected to IB Gateway")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up IB connection on shutdown"""
    global ib_gateway
    if ib_gateway:
        await ib_gateway.disconnect()

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy" if ib_gateway and ib_gateway.connected else "unhealthy",
        "timestamp": datetime.now(),
        "ib_connected": ib_gateway.connected if ib_gateway else False
    }

# Account endpoints
@app.get("/api/account/summary")
async def get_account_summary() -> Dict[str, Any]:
    """Get account summary"""
    if not ib_gateway or not ib_gateway.connected:
        raise HTTPException(status_code=503, detail="IB Gateway not connected")
    
    try:
        summary = await ib_gateway.get_account_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/account/positions", response_model=List[Position])
async def get_positions():
    """Get current positions"""
    if not ib_gateway or not ib_gateway.connected:
        raise HTTPException(status_code=503, detail="IB Gateway not connected")
    
    try:
        positions = await ib_gateway.get_positions()
        return positions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Trading endpoints
@app.post("/api/orders", response_model=OrderResponse)
async def place_order(request: OrderRequest):
    """Place a new order"""
    if not ib_gateway or not ib_gateway.connected:
        raise HTTPException(status_code=503, detail="IB Gateway not connected")
    
    try:
        result = await ib_gateway.place_order(
            symbol=request.symbol,
            quantity=request.quantity,
            order_type=request.order_type,
            price=request.price,
            stop_price=request.stop_price
        )
        
        return OrderResponse(
            order_id=result["orderId"],
            status=result["status"],
            filled=result["filled"],
            remaining=result["remaining"],
            avg_fill_price=result["avgFillPrice"],
            timestamp=datetime.now()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/orders/{order_id}")
async def cancel_order(order_id: int):
    """Cancel an order"""
    if not ib_gateway or not ib_gateway.connected:
        raise HTTPException(status_code=503, detail="IB Gateway not connected")
    
    try:
        result = await ib_gateway.cancel_order(order_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Market data endpoints
@app.get("/api/market/{symbol}", response_model=MarketData)
async def get_market_data(symbol: str):
    """Get market data for a symbol"""
    if not ib_gateway or not ib_gateway.connected:
        raise HTTPException(status_code=503, detail="IB Gateway not connected")
    
    try:
        data = await ib_gateway.get_market_data(symbol)
        return MarketData(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/market/{symbol}/history")
async def get_historical_data(
    symbol: str,
    duration: str = "1 D",
    bar_size: str = "1 min"
):
    """Get historical data for a symbol"""
    if not ib_gateway or not ib_gateway.connected:
        raise HTTPException(status_code=503, detail="IB Gateway not connected")
    
    try:
        data = await ib_gateway.get_historical_data(
            symbol=symbol,
            duration=duration,
            bar_size=bar_size
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket for real-time data
@app.websocket("/ws/market")
async def websocket_market_data(websocket: WebSocket):
    """WebSocket endpoint for real-time market data"""
    await websocket.accept()
    
    if not ib_gateway or not ib_gateway.connected:
        await websocket.send_json({"error": "IB Gateway not connected"})
        await websocket.close()
        return
    
    try:
        # Receive subscription request
        data = await websocket.receive_json()
        symbols = data.get("symbols", [])
        
        if not symbols:
            await websocket.send_json({"error": "No symbols provided"})
            await websocket.close()
            return
        
        # Callback to send data through websocket
        async def send_data(market_data):
            await websocket.send_json(market_data)
        
        # Start streaming
        await ib_gateway.stream_market_data(symbols, send_data)
        
        # Keep connection alive
        while True:
            try:
                # Wait for client messages (ping/pong or unsubscribe)
                message = await websocket.receive_json()
                
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif message.get("type") == "unsubscribe":
                    break
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                break
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()

# Strategy execution endpoint
@app.post("/api/strategies/execute")
async def execute_strategy(strategy_name: str, params: Dict[str, Any]):
    """Execute a trading strategy"""
    if not ib_gateway or not ib_gateway.connected:
        raise HTTPException(status_code=503, detail="IB Gateway not connected")
    
    # Strategy execution logic would go here
    # This is a placeholder for strategy implementation
    
    return {
        "strategy": strategy_name,
        "status": "executed",
        "params": params,
        "timestamp": datetime.now()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=True
    )
```

## asyncio/websockets

### WebSocket Server for Real-time Updates
```python
import asyncio
import websockets
import json
from typing import Set, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class TradingWebSocketServer:
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.subscriptions: Dict[str, Set[websockets.WebSocketServerProtocol]] = {}
        
    async def register(self, websocket: websockets.WebSocketServerProtocol):
        """Register a new client"""
        self.clients.add(websocket)
        logger.info(f"Client {websocket.remote_address} connected")
        
    async def unregister(self, websocket: websockets.WebSocketServerProtocol):
        """Unregister a client"""
        self.clients.discard(websocket)
        
        # Remove from all subscriptions
        for channel in self.subscriptions:
            self.subscriptions[channel].discard(websocket)
            
        logger.info(f"Client {websocket.remote_address} disconnected")
        
    async def handle_message(
        self,
        websocket: websockets.WebSocketServerProtocol,
        message: str
    ):
        """Handle incoming messages"""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            
            if message_type == "subscribe":
                await self.handle_subscribe(websocket, data)
            elif message_type == "unsubscribe":
                await self.handle_unsubscribe(websocket, data)
            elif message_type == "ping":
                await websocket.send(json.dumps({"type": "pong"}))
            else:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                }))
                
        except json.JSONDecodeError:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Invalid JSON"
            }))
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await websocket.send(json.dumps({
                "type": "error",
                "message": str(e)
            }))
            
    async def handle_subscribe(
        self,
        websocket: websockets.WebSocketServerProtocol,
        data: Dict[str, Any]
    ):
        """Handle subscription requests"""
        channels = data.get("channels", [])
        
        for channel in channels:
            if channel not in self.subscriptions:
                self.subscriptions[channel] = set()
            self.subscriptions[channel].add(websocket)
            
        await websocket.send(json.dumps({
            "type": "subscribed",
            "channels": channels
        }))
        
        logger.info(f"Client subscribed to channels: {channels}")
        
    async def handle_unsubscribe(
        self,
        websocket: websockets.WebSocketServerProtocol,
        data: Dict[str, Any]
    ):
        """Handle unsubscription requests"""
        channels = data.get("channels", [])
        
        for channel in channels:
            if channel in self.subscriptions:
                self.subscriptions[channel].discard(websocket)
                
        await websocket.send(json.dumps({
            "type": "unsubscribed",
            "channels": channels
        }))
        
    async def broadcast(self, channel: str, data: Any):
        """Broadcast data to all subscribers of a channel"""
        if channel not in self.subscriptions:
            return
            
        message = json.dumps({
            "channel": channel,
            "data": data,
            "timestamp": datetime.now().isoformat()
        })
        
        # Send to all subscribers
        disconnected = set()
        for websocket in self.subscriptions[channel]:
            try:
                await websocket.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(websocket)
                
        # Clean up disconnected clients
        for websocket in disconnected:
            await self.unregister(websocket)
            
    async def handler(
        self,
        websocket: websockets.WebSocketServerProtocol,
        path: str
    ):
        """WebSocket connection handler"""
        await self.register(websocket)
        
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister(websocket)
            
    async def start(self):
        """Start the WebSocket server"""
        async with websockets.serve(self.handler, self.host, self.port):
            logger.info(f"WebSocket server started on ws://{self.host}:{self.port}")
            await asyncio.Future()  # Run forever

# Example usage with IB integration
class TradingDataBroadcaster:
    def __init__(self, ws_server: TradingWebSocketServer, ib_gateway: IBGateway):
        self.ws_server = ws_server
        self.ib_gateway = ib_gateway
        
    async def broadcast_market_data(self, symbols: List[str]):
        """Broadcast market data for symbols"""
        while True:
            for symbol in symbols:
                try:
                    data = await self.ib_gateway.get_market_data(symbol)
                    await self.ws_server.broadcast(f"market:{symbol}", data)
                except Exception as e:
                    logger.error(f"Error broadcasting market data for {symbol}: {e}")
                    
            await asyncio.sleep(1)  # Update every second
            
    async def broadcast_positions(self):
        """Broadcast position updates"""
        while True:
            try:
                positions = await self.ib_gateway.get_positions()
                await self.ws_server.broadcast("positions", positions)
            except Exception as e:
                logger.error(f"Error broadcasting positions: {e}")
                
            await asyncio.sleep(5)  # Update every 5 seconds
            
    async def broadcast_orders(self):
        """Broadcast order updates"""
        # This would be triggered by IB events
        pass

# Main execution
async def main():
    # Initialize components
    ws_server = TradingWebSocketServer()
    
    config = IBConfig(host="127.0.0.1", port=7497)
    ib_gateway = IBGateway(config)
    
    # Connect to IB
    await ib_gateway.connect()
    
    # Initialize broadcaster
    broadcaster = TradingDataBroadcaster(ws_server, ib_gateway)
    
    # Start tasks
    await asyncio.gather(
        ws_server.start(),
        broadcaster.broadcast_market_data(["AAPL", "GOOGL", "MSFT"]),
        broadcaster.broadcast_positions()
    )

if __name__ == "__main__":
    asyncio.run(main())
```

## Integration Example

### Complete Trading System
```python
# main.py
import asyncio
import uvicorn
from fastapi import FastAPI
from contextlib import asynccontextmanager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan context manager for FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting trading system...")
    
    # Initialize IB connection
    config = IBConfig(host="127.0.0.1", port=7497)
    app.state.ib_gateway = IBGateway(config)
    await app.state.ib_gateway.connect()
    
    # Initialize WebSocket server
    app.state.ws_server = TradingWebSocketServer()
    ws_task = asyncio.create_task(app.state.ws_server.start())
    
    # Initialize data broadcaster
    app.state.broadcaster = TradingDataBroadcaster(
        app.state.ws_server,
        app.state.ib_gateway
    )
    
    # Start broadcasting tasks
    market_task = asyncio.create_task(
        app.state.broadcaster.broadcast_market_data(["AAPL", "GOOGL"])
    )
    position_task = asyncio.create_task(
        app.state.broadcaster.broadcast_positions()
    )
    
    yield
    
    # Shutdown
    logger.info("Shutting down trading system...")
    
    # Cancel tasks
    ws_task.cancel()
    market_task.cancel()
    position_task.cancel()
    
    # Disconnect from IB
    await app.state.ib_gateway.disconnect()

# Create FastAPI app with lifespan
app = FastAPI(lifespan=lifespan)

# Run the application
if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
```

### Docker Configuration
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose ports
EXPOSE 8000 8765

# Run the application
CMD ["python", "main.py"]
```

### Requirements File
```txt
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
ib_insync==0.9.86
websockets==12.0
pydantic==2.5.0
pandas==2.1.3
numpy==1.26.2
asyncio==3.4.3
python-dotenv==1.0.0
```

## Testing

### Pytest Setup
```python
# test_ib_gateway.py
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch

@pytest.fixture
def ib_config():
    return IBConfig(host="127.0.0.1", port=7497)

@pytest.fixture
def mock_ib():
    with patch("ib_insync.IB") as mock:
        yield mock

@pytest.mark.asyncio
async def test_connect(ib_config, mock_ib):
    gateway = IBGateway(ib_config)
    gateway.ib = mock_ib
    
    mock_ib.connectAsync = AsyncMock(return_value=True)
    mock_ib.managedAccounts = Mock(return_value=["DU123456"])
    
    result = await gateway.connect()
    
    assert result is True
    assert gateway.connected is True
    mock_ib.connectAsync.assert_called_once()

@pytest.mark.asyncio
async def test_place_order(ib_config, mock_ib):
    gateway = IBGateway(ib_config)
    gateway.ib = mock_ib
    gateway.connected = True
    
    # Mock trade object
    mock_trade = Mock()
    mock_trade.isDone = Mock(side_effect=[False, True])
    mock_trade.order.orderId = 123
    mock_trade.orderStatus.status = "Filled"
    mock_trade.orderStatus.filled = 100
    mock_trade.orderStatus.remaining = 0
    mock_trade.orderStatus.avgFillPrice = 150.50
    
    mock_ib.placeOrder = Mock(return_value=mock_trade)
    
    result = await gateway.place_order(
        symbol="AAPL",
        quantity=100,
        order_type="LIMIT",
        price=150.50
    )
    
    assert result["orderId"] == 123
    assert result["status"] == "Filled"
    assert result["filled"] == 100
```

## Best Practices

### 1. Error Handling
- Always implement proper reconnection logic for IB connection
- Use circuit breakers for external API calls
- Log all trading activities for audit purposes

### 2. Security
- Never hardcode API credentials
- Use environment variables or secure vaults
- Implement rate limiting on API endpoints

### 3. Performance
- Use connection pooling for database connections
- Implement caching for frequently accessed data
- Use async/await for all I/O operations

### 4. Monitoring
- Implement health checks for all services
- Monitor order execution latency
- Track API rate limits and usage