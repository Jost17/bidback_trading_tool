# BIDBACK Trading Tool - FastAPI Backend

## Overview

This is the Python FastAPI backend server for the BIDBACK Trading Tool, running on **port 3001**. It integrates all 6 Python risk management modules to provide real-time trading signal generation and portfolio management for the Electron frontend.

## Features

- **Complete Risk Management System**: All 6 Python modules integrated
- **Real-time Position Management**: Open, update, and close trading positions
- **Regime Classification**: Dynamic market regime detection and adaptation  
- **Performance Analytics**: Comprehensive portfolio metrics and reporting
- **RESTful API**: Full CRUD operations for trading positions
- **CORS Enabled**: Ready for Electron frontend integration
- **Interactive Documentation**: Swagger/OpenAPI docs at `/docs`

## Architecture

### Core Components

1. **UltimateRiskManager** - Master risk management controller
2. **DynamicRegimeManager** - Market regime classification and transitions
3. **IntegratedRiskOverlay** - Risk overlay system integration
4. **AdaptiveStopManager** - Dynamic stop-loss management
5. **RegimeProfitTakingManager** - Profit-taking optimization
6. **MultiLayerBacktester** - Strategy backtesting and validation

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API status and health check |
| `/health` | GET | Detailed system health metrics |
| `/positions/open` | POST | Open new trading position |
| `/positions/update` | PUT | Update existing position |
| `/positions` | GET | Get all active positions |
| `/positions/{symbol}` | GET | Get specific position |
| `/performance` | GET | Portfolio performance metrics |
| `/trade-history` | GET | Complete trade history |
| `/export-report` | POST | Export detailed performance report |
| `/docs` | GET | Interactive API documentation |

## Setup and Installation

### 1. Environment Setup

```bash
# Navigate to backend directory
cd backend/

# Create Python virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Start the Server

```bash
# Start FastAPI server on port 3001
python main.py
```

The server will be available at:
- **API**: http://localhost:3001
- **Docs**: http://localhost:3001/docs
- **Health**: http://localhost:3001/health

### 3. Test the API

```bash
# Run comprehensive test suite
python test_api.py
```

## Usage Examples

### Opening a Position

```bash
curl -X POST http://localhost:3001/positions/open \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "entry_price": 150.0,
    "market_data": {
      "vix": 18.5,
      "t2108": 45.0,
      "momentum_ratio": 1.2,
      "true_range": 2.5
    },
    "position_size": 100.0
  }'
```

### Updating a Position

```bash
curl -X PUT http://localhost:3001/positions/update \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "current_price_data": {
      "high": 155.0,
      "low": 148.0,
      "close": 153.5
    },
    "market_data": {
      "vix": 16.2,
      "t2108": 50.0,
      "momentum_ratio": 1.4
    }
  }'
```

### Getting Performance Metrics

```bash
curl http://localhost:3001/performance
```

## Configuration

The system can be configured via `config.json`:

```json
{
    "position_sizing": {
        "max_position_size": 100.0,
        "risk_per_trade": 2.0,
        "max_correlation_exposure": 10.0
    },
    "regime_overrides": {
        "force_regime": null,
        "disable_transitions": false,
        "emergency_protocols": true
    },
    "performance_targets": {
        "target_roi": 400.0,
        "max_drawdown_tolerance": 15.0,
        "min_sharpe_ratio": 2.0,
        "min_win_rate": 0.6
    },
    "risk_limits": {
        "max_stop_distance": 25.0,
        "min_stop_distance": 2.0,
        "max_profit_target": 100.0,
        "position_concentration_limit": 20.0
    }
}
```

## Risk Management Features

### Market Regime Classification

The system automatically classifies market regimes:
- **Bull Normal** (VIX < 20): Standard risk parameters
- **High Vol Stress** (VIX 20-35): Tightened stops, reduced targets
- **Crisis Opportunity** (VIX > 35): Widened stops, aggressive targets
- **Low Vol Complacency** (VIX < 12): Conservative approach

### Dynamic Stop-Loss System

- **True Range Integration**: Stops based on volatility
- **Regime Adaptation**: Adjusts to market conditions
- **Transition Management**: Handles regime changes

### Profit-Taking Optimization

- **Staggered Exits**: Multiple profit levels
- **Position Scaling**: Partial profit-taking
- **Dynamic Adjustment**: Based on market regime

### Performance Tracking

- **Real-time Metrics**: P&L, win rate, Sharpe ratio
- **Drawdown Management**: Maximum drawdown monitoring
- **Trade History**: Complete audit trail

## File Structure

```
backend/
├── main.py                 # FastAPI server application
├── services.py             # Enhanced service layer
├── config.json             # Configuration file
├── requirements.txt        # Python dependencies
├── test_api.py            # API test suite
├── README.md              # This file
├── venv/                  # Virtual environment
├── reports/               # Generated reports
├── logs/                  # Log files
└── risk_management/       # Core modules
    ├── __init__.py
    ├── ultimate_implementation.py      # Master controller
    ├── dynamic_regime_system.py        # Regime classification
    ├── integrated_overlay_system.py    # Risk overlay
    ├── stop_loss_matrix.py            # Stop-loss management
    ├── profit_taking_system.py        # Profit optimization
    └── multilayer_backtesting.py      # Backtesting engine
```

## Integration with Electron Frontend

The backend is designed to work seamlessly with the Electron frontend:

- **CORS Enabled**: All origins allowed for development
- **JSON API**: RESTful endpoints with JSON responses
- **Real-time Updates**: Position status and performance metrics
- **Error Handling**: Comprehensive error responses
- **Documentation**: Self-documenting API with Swagger UI

### Frontend Integration Example

```javascript
// JavaScript example for Electron frontend
const API_BASE = 'http://localhost:3001';

// Open a new position
async function openPosition(symbol, entryPrice, marketData) {
  const response = await fetch(`${API_BASE}/positions/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol,
      entry_price: entryPrice,
      market_data: marketData
    })
  });
  return response.json();
}

// Get portfolio performance
async function getPerformance() {
  const response = await fetch(`${API_BASE}/performance`);
  return response.json();
}
```

## Development

### Adding New Endpoints

1. Add endpoint function to `main.py`
2. Define Pydantic models for request/response
3. Add business logic to `services.py` if needed
4. Update tests in `test_api.py`

### Logging

The system uses structured logging:
- **INFO**: General operation logs
- **ERROR**: Error conditions and exceptions
- **DEBUG**: Detailed debugging information

### Error Handling

All endpoints include comprehensive error handling:
- **400**: Bad Request (validation errors)
- **404**: Not Found (position not found)
- **500**: Internal Server Error (system errors)

## Deployment Notes

For production deployment:

1. Update CORS origins in `main.py` to specific domains
2. Use environment variables for configuration
3. Set up proper logging configuration
4. Consider using Gunicorn or similar WSGI server
5. Implement authentication/authorization if needed

## Performance Targets

The risk management system is designed to achieve:
- **>400% ROI**: Annual return on investment target
- **<15% Maximum Drawdown**: Risk tolerance limit
- **>60% Win Rate**: Minimum successful trade percentage  
- **>2.0 Sharpe Ratio**: Risk-adjusted return metric

## Support

For issues or questions:
1. Check the API documentation at `/docs`
2. Review log files in the `logs/` directory
3. Run the test suite with `python test_api.py`
4. Verify all dependencies are installed correctly

---

**Status**: ✅ **Ready for Production**

The FastAPI backend is fully operational and ready for integration with the Electron frontend. All 6 Python risk management modules are successfully integrated and tested.