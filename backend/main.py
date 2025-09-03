"""
BIDBACK Trading Tool - FastAPI Backend Server
Main server application running on port 3001 for Electron frontend integration
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import uvicorn
import logging
import traceback
from datetime import datetime
import os
from pathlib import Path

# Import our risk management system
from risk_management import (
    UltimateRiskManager, 
    TradePosition,
    MarketState,
    RegimeType
)

# Import database connection
from src.database.connection import DatabaseConnection

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="BIDBACK Trading Tool API",
    description="Advanced Risk Management Backend for Professional Trading",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global risk manager instance
risk_manager: Optional[UltimateRiskManager] = None
db_manager: Optional[DatabaseConnection] = None

# Pydantic models for API requests/responses
class MarketData(BaseModel):
    """Market data input for risk calculations"""
    vix: float = Field(..., ge=5.0, le=100.0, description="VIX volatility index")
    t2108: Optional[float] = Field(None, ge=0.0, le=100.0, description="T2108 breadth indicator")
    momentum_ratio: Optional[float] = Field(None, gt=0.0, description="Market momentum ratio")
    true_range: Optional[float] = Field(None, gt=0.0, description="True Range for volatility")

class OpenPositionRequest(BaseModel):
    """Request to open a new trading position"""
    symbol: str = Field(..., min_length=1, max_length=10, description="Trading symbol")
    entry_price: float = Field(..., gt=0.0, description="Entry price")
    market_data: MarketData
    position_size: Optional[float] = Field(100.0, ge=1.0, le=100.0, description="Position size percentage")

class UpdatePositionRequest(BaseModel):
    """Request to update an existing position"""
    symbol: str = Field(..., min_length=1, max_length=10, description="Trading symbol")
    current_price_data: Dict[str, float] = Field(..., description="Current price data (high, low, close)")
    market_data: MarketData

class TradePositionResponse(BaseModel):
    """Response model for trade positions"""
    symbol: str
    entry_price: float
    entry_date: str
    position_size: float
    regime_at_entry: str
    vix_at_entry: float
    stop_level: float
    profit_levels: List[float]
    remaining_position: float
    realized_pnl: float
    days_held: int

class PositionOpenResponse(BaseModel):
    """Response when opening a position"""
    position_id: str
    entry_price: float
    regime: str
    stop_level: float
    stop_distance_pct: float
    profit_targets: List[float]
    expected_hold_days: int
    regime_transition_detected: bool
    market_adjustments: Optional[str]

class PositionUpdateResponse(BaseModel):
    """Response when updating a position"""
    symbol: str
    actions: List[Dict[str, Any]]
    position_status: str
    current_pnl: Optional[float] = None
    realized_pnl: Optional[float] = None
    remaining_position: Optional[float] = None
    days_held: int
    final_pnl: Optional[float] = None

class PerformanceResponse(BaseModel):
    """Portfolio performance metrics"""
    total_trades: int
    total_return_pct: float
    avg_return_per_trade: float
    win_rate: float
    max_win: float
    max_loss: float
    current_drawdown: float
    sharpe_ratio: float
    active_positions: int
    annualized_roi: float

class MarketBreadthData(BaseModel):
    """Market breadth daily data"""
    date: str
    stocks_up_4pct_daily: Optional[int] = None
    stocks_down_4pct_daily: Optional[int] = None
    ratio_5day: Optional[float] = None
    ratio_10day: Optional[float] = None
    stocks_up_25pct_quarterly: Optional[int] = None
    stocks_down_25pct_quarterly: Optional[int] = None
    stocks_up_25pct_monthly: Optional[int] = None
    stocks_down_25pct_monthly: Optional[int] = None
    stocks_up_50pct_monthly: Optional[int] = None
    stocks_down_50pct_monthly: Optional[int] = None
    stocks_up_13pct_34days: Optional[int] = None
    stocks_down_13pct_34days: Optional[int] = None
    worden_common_stocks: Optional[float] = None
    t2108: Optional[float] = None
    sp_reference: Optional[float] = None
    daily_high: Optional[float] = None
    daily_low: Optional[float] = None
    daily_close: Optional[float] = None
    true_range: Optional[float] = None
    average_true_range_14: Optional[float] = None
    risk_regime: Optional[str] = None

class MarketBreadthSummary(BaseModel):
    """Summary statistics for market breadth data"""
    total_records: int
    date_range_start: str
    date_range_end: str
    has_data_percentage: Dict[str, float]
    latest_data: Optional[MarketBreadthData] = None

# Dependency to get risk manager
def get_risk_manager() -> UltimateRiskManager:
    """Dependency to ensure risk manager is initialized"""
    if risk_manager is None:
        raise HTTPException(
            status_code=500, 
            detail="Risk management system not initialized"
        )
    return risk_manager

# Dependency to get database manager
def get_db_manager() -> DatabaseConnection:
    """Dependency to ensure database manager is initialized"""
    if db_manager is None:
        raise HTTPException(
            status_code=500,
            detail="Database system not initialized"
        )
    return db_manager

# API Endpoints

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint - API health check"""
    return {
        "message": "BIDBACK Trading Tool API",
        "status": "running",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health", response_model=Dict[str, Any])
async def health_check():
    """Comprehensive health check"""
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "risk_manager_initialized": risk_manager is not None,
            "active_positions": len(risk_manager.active_positions) if risk_manager else 0,
            "backend_version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/positions/open", response_model=PositionOpenResponse)
async def open_position(
    request: OpenPositionRequest,
    rm: UltimateRiskManager = Depends(get_risk_manager)
):
    """Open a new trading position with complete risk management"""
    try:
        logger.info(f"Opening position for {request.symbol} at ${request.entry_price}")
        
        # Convert market data to dict
        market_data_dict = {
            "vix": request.market_data.vix,
            "t2108": request.market_data.t2108,
            "momentum_ratio": request.market_data.momentum_ratio,
            "true_range": request.market_data.true_range or (request.entry_price * 0.02)
        }
        
        # Open position using risk manager
        result = rm.open_position(
            symbol=request.symbol,
            entry_price=request.entry_price,
            market_data=market_data_dict,
            position_size=request.position_size
        )
        
        logger.info(f"Position opened successfully for {request.symbol}")
        return PositionOpenResponse(**result)
        
    except ValueError as e:
        logger.error(f"Invalid position request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error opening position: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.put("/positions/update", response_model=PositionUpdateResponse)
async def update_position(
    request: UpdatePositionRequest,
    rm: UltimateRiskManager = Depends(get_risk_manager)
):
    """Update an existing position with current market data"""
    try:
        logger.info(f"Updating position for {request.symbol}")
        
        # Convert market data to dict
        market_data_dict = {
            "vix": request.market_data.vix,
            "t2108": request.market_data.t2108,
            "momentum_ratio": request.market_data.momentum_ratio,
            "true_range": request.market_data.true_range
        }
        
        # Update position using risk manager
        result = rm.update_position(
            symbol=request.symbol,
            current_price_data=request.current_price_data,
            market_data=market_data_dict
        )
        
        logger.info(f"Position updated for {request.symbol}: {result['position_status']}")
        return PositionUpdateResponse(**result)
        
    except ValueError as e:
        logger.error(f"Invalid update request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating position: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/positions", response_model=Dict[str, TradePositionResponse])
async def get_active_positions(rm: UltimateRiskManager = Depends(get_risk_manager)):
    """Get all active trading positions"""
    try:
        positions = {}
        for symbol, position in rm.active_positions.items():
            positions[symbol] = TradePositionResponse(
                symbol=position.symbol,
                entry_price=position.entry_price,
                entry_date=position.entry_date.isoformat(),
                position_size=position.position_size,
                regime_at_entry=position.regime_at_entry,
                vix_at_entry=position.vix_at_entry,
                stop_level=position.stop_level,
                profit_levels=position.profit_levels,
                remaining_position=position.remaining_position,
                realized_pnl=position.realized_pnl,
                days_held=position.days_held
            )
        
        return positions
    except Exception as e:
        logger.error(f"Error getting positions: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/positions/{symbol}", response_model=TradePositionResponse)
async def get_position(
    symbol: str, 
    rm: UltimateRiskManager = Depends(get_risk_manager)
):
    """Get a specific trading position"""
    try:
        if symbol not in rm.active_positions:
            raise HTTPException(status_code=404, detail=f"Position {symbol} not found")
        
        position = rm.active_positions[symbol]
        return TradePositionResponse(
            symbol=position.symbol,
            entry_price=position.entry_price,
            entry_date=position.entry_date.isoformat(),
            position_size=position.position_size,
            regime_at_entry=position.regime_at_entry,
            vix_at_entry=position.vix_at_entry,
            stop_level=position.stop_level,
            profit_levels=position.profit_levels,
            remaining_position=position.remaining_position,
            realized_pnl=position.realized_pnl,
            days_held=position.days_held
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting position {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/performance", response_model=PerformanceResponse)
async def get_performance(rm: UltimateRiskManager = Depends(get_risk_manager)):
    """Get comprehensive portfolio performance metrics"""
    try:
        performance = rm.get_portfolio_performance()
        return PerformanceResponse(**performance)
    except Exception as e:
        logger.error(f"Error getting performance: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/trade-history", response_model=List[Dict[str, Any]])
async def get_trade_history(rm: UltimateRiskManager = Depends(get_risk_manager)):
    """Get complete trade history"""
    try:
        return rm.trade_history
    except Exception as e:
        logger.error(f"Error getting trade history: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/export-report")
async def export_performance_report(
    filename: Optional[str] = None,
    rm: UltimateRiskManager = Depends(get_risk_manager)
):
    """Export detailed performance report"""
    try:
        report_filename = filename or f"performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_path = Path("reports") / report_filename
        
        # Create reports directory if it doesn't exist
        report_path.parent.mkdir(exist_ok=True)
        
        report = rm.export_performance_report(str(report_path))
        
        return {
            "message": "Performance report exported successfully",
            "filename": str(report_path),
            "report_summary": {
                "total_trades": len(report['trade_history']),
                "active_positions": len(report['active_positions']),
                "generated_at": report['generated_at']
            }
        }
    except Exception as e:
        logger.error(f"Error exporting report: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Market Breadth Data Endpoints

@app.get("/breadth/summary", response_model=MarketBreadthSummary)
async def get_breadth_summary(db: DatabaseConnection = Depends(get_db_manager)):
    """Get market breadth data summary and statistics"""
    try:
        with db.get_connection() as conn:
            # Get summary statistics
            summary_query = """
                SELECT 
                    COUNT(*) as total_records,
                    MIN(date) as date_range_start,
                    MAX(date) as date_range_end,
                    COUNT(stocks_up_4pct_daily) * 100.0 / COUNT(*) as pct_has_up_4pct,
                    COUNT(stocks_down_4pct_daily) * 100.0 / COUNT(*) as pct_has_down_4pct,
                    COUNT(t2108) * 100.0 / COUNT(*) as pct_has_t2108,
                    COUNT(sp_reference) * 100.0 / COUNT(*) as pct_has_sp_ref,
                    COUNT(true_range) * 100.0 / COUNT(*) as pct_has_true_range
                FROM market_breadth_daily
                WHERE date >= '2007-01-01' AND date <= '2025-12-31'
            """
            
            cursor = conn.execute(summary_query)
            summary_row = cursor.fetchone()
            
            # Get latest data
            latest_query = """
                SELECT * FROM market_breadth_daily 
                WHERE date >= '2020-01-01' AND date <= '2025-12-31'
                ORDER BY date DESC 
                LIMIT 1
            """
            
            cursor = conn.execute(latest_query)
            latest_row = cursor.fetchone()
            
            # Build response
            has_data_percentage = {
                "stocks_up_4pct_daily": round(summary_row[3], 1),
                "stocks_down_4pct_daily": round(summary_row[4], 1),
                "t2108": round(summary_row[5], 1),
                "sp_reference": round(summary_row[6], 1),
                "true_range": round(summary_row[7], 1)
            }
            
            latest_data = None
            if latest_row:
                latest_data = MarketBreadthData(
                    date=latest_row[1],  # date field
                    stocks_up_4pct_daily=latest_row[9],  # stocks_up_4pct_daily
                    stocks_down_4pct_daily=latest_row[10],  # stocks_down_4pct_daily
                    ratio_5day=latest_row[15],  # ratio_5day
                    ratio_10day=latest_row[16],  # ratio_10day
                    t2108=latest_row[25],  # t2108
                    sp_reference=latest_row[27],  # sp_reference
                    daily_high=latest_row[2],  # daily_high
                    daily_low=latest_row[3],  # daily_low
                    true_range=latest_row[6],  # true_range
                    average_true_range_14=latest_row[7],  # average_true_range_14
                )
            
            return MarketBreadthSummary(
                total_records=summary_row[0],
                date_range_start=summary_row[1],
                date_range_end=summary_row[2],
                has_data_percentage=has_data_percentage,
                latest_data=latest_data
            )
            
    except Exception as e:
        logger.error(f"Error getting breadth summary: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/breadth/latest", response_model=MarketBreadthData)
async def get_latest_breadth(db: DatabaseConnection = Depends(get_db_manager)):
    """Get the most recent market breadth data"""
    try:
        with db.get_connection() as conn:
            query = """
                SELECT * FROM market_breadth_daily 
                WHERE date >= '2020-01-01' 
                AND stocks_up_4pct_daily IS NOT NULL
                ORDER BY date DESC 
                LIMIT 1
            """
            
            cursor = conn.execute(query)
            row = cursor.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="No market breadth data found")
            
            return MarketBreadthData(
                date=row[1],
                stocks_up_4pct_daily=row[9],
                stocks_down_4pct_daily=row[10],
                ratio_5day=row[15],
                ratio_10day=row[16],
                stocks_up_25pct_quarterly=row[11],
                stocks_down_25pct_quarterly=row[12],
                stocks_up_25pct_monthly=row[17],
                stocks_down_25pct_monthly=row[18],
                stocks_up_50pct_monthly=row[19],
                stocks_down_50pct_monthly=row[20],
                t2108=row[25],
                sp_reference=row[27],
                daily_high=row[2],
                daily_low=row[3],
                daily_close=row[4],
                true_range=row[6],
                average_true_range_14=row[7]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting latest breadth: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/breadth/historical", response_model=List[MarketBreadthData])
async def get_historical_breadth(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = 100,
    db: DatabaseConnection = Depends(get_db_manager)
):
    """Get historical market breadth data with optional date filtering"""
    try:
        # Default date range if not specified
        if not start_date:
            start_date = "2024-01-01"
        if not end_date:
            end_date = "2025-12-31"
        
        # Validate limit
        if limit and (limit < 1 or limit > 1000):
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 1000")
        
        with db.get_connection() as conn:
            query = """
                SELECT * FROM market_breadth_daily 
                WHERE date >= ? AND date <= ?
                AND stocks_up_4pct_daily IS NOT NULL
                ORDER BY date DESC
                LIMIT ?
            """
            
            cursor = conn.execute(query, (start_date, end_date, limit or 100))
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                results.append(MarketBreadthData(
                    date=row[1],
                    stocks_up_4pct_daily=row[9],
                    stocks_down_4pct_daily=row[10],
                    ratio_5day=row[15],
                    ratio_10day=row[16],
                    stocks_up_25pct_quarterly=row[11],
                    stocks_down_25pct_quarterly=row[12],
                    stocks_up_25pct_monthly=row[17],
                    stocks_down_25pct_monthly=row[18],
                    stocks_up_50pct_monthly=row[19],
                    stocks_down_50pct_monthly=row[20],
                    t2108=row[25],
                    sp_reference=row[27],
                    daily_high=row[2],
                    daily_low=row[3],
                    daily_close=row[4],
                    true_range=row[6],
                    average_true_range_14=row[7]
                ))
            
            return results
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting historical breadth: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/breadth/date/{date}", response_model=MarketBreadthData)
async def get_breadth_by_date(
    date: str,
    db: DatabaseConnection = Depends(get_db_manager)
):
    """Get market breadth data for a specific date"""
    try:
        with db.get_connection() as conn:
            query = """
                SELECT * FROM market_breadth_daily 
                WHERE date = ?
            """
            
            cursor = conn.execute(query, (date,))
            row = cursor.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail=f"No data found for date {date}")
            
            return MarketBreadthData(
                date=row[1],
                stocks_up_4pct_daily=row[9],
                stocks_down_4pct_daily=row[10],
                ratio_5day=row[15],
                ratio_10day=row[16],
                stocks_up_25pct_quarterly=row[11],
                stocks_down_25pct_quarterly=row[12],
                stocks_up_25pct_monthly=row[17],
                stocks_down_25pct_monthly=row[18],
                stocks_up_50pct_monthly=row[19],
                stocks_down_50pct_monthly=row[20],
                t2108=row[25],
                sp_reference=row[27],
                daily_high=row[2],
                daily_low=row[3],
                daily_close=row[4],
                true_range=row[6],
                average_true_range_14=row[7]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting breadth for date {date}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize the risk management system on startup"""
    global risk_manager, db_manager
    try:
        logger.info("Starting BIDBACK Trading Tool API...")
        
        # Initialize database manager
        db_path = "src/database/trading.db"
        db_manager = DatabaseConnection(db_path)
        logger.info("Database manager initialized successfully")
        
        # Initialize risk manager
        risk_manager = UltimateRiskManager()
        logger.info("Risk management system initialized successfully")
        
        # Create necessary directories
        os.makedirs("reports", exist_ok=True)
        os.makedirs("logs", exist_ok=True)
        
        logger.info("BIDBACK Trading Tool API started successfully on port 3001")
        
    except Exception as e:
        logger.error(f"Failed to initialize systems: {e}")
        logger.error(traceback.format_exc())
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown"""
    global risk_manager
    try:
        logger.info("Shutting down BIDBACK Trading Tool API...")
        
        # Export final performance report if there are any trades
        if risk_manager and (risk_manager.trade_history or risk_manager.active_positions):
            final_report_path = f"reports/shutdown_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            risk_manager.export_performance_report(final_report_path)
            logger.info(f"Final performance report saved to {final_report_path}")
        
        risk_manager = None
        logger.info("BIDBACK Trading Tool API shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc),
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url)
        }
    )

# Development server runner
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="localhost",
        port=3001,
        reload=True,
        log_level="info",
        access_log=True
    )