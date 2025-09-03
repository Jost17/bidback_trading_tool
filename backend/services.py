"""
BIDBACK Trading Tool - Risk Management Service Layer
Enhanced wrapper around the core risk management system with additional FastAPI-specific functionality
"""

from typing import Dict, List, Optional, Any, Tuple
import logging
from datetime import datetime, timedelta
import asyncio
import json
from pathlib import Path

from risk_management import (
    UltimateRiskManager,
    TradePosition,
    MarketState,
    RegimeType,
    DynamicRegimeManager,
    IntegratedRiskOverlay,
    MultiLayerBacktester
)

logger = logging.getLogger(__name__)

class RiskManagementService:
    """
    Enhanced service layer for risk management operations
    Provides additional functionality for FastAPI integration and real-time trading
    """
    
    def __init__(self, config_file: Optional[str] = None):
        """Initialize the risk management service"""
        self.risk_manager = UltimateRiskManager(config_file)
        self.backtest_engine = MultiLayerBacktester()
        self.service_start_time = datetime.now()
        
        # Service-specific tracking
        self.api_call_history: List[Dict] = []
        self.error_history: List[Dict] = []
        self.performance_snapshots: List[Dict] = []
        
        # Real-time monitoring
        self.monitoring_active = False
        self.alert_thresholds = {
            "max_drawdown": -15.0,  # Alert if drawdown exceeds 15%
            "consecutive_losses": 5,  # Alert after 5 consecutive losses
            "position_concentration": 25.0  # Alert if single position > 25%
        }
        
        logger.info("RiskManagementService initialized successfully")
    
    async def open_position_enhanced(
        self,
        symbol: str,
        entry_price: float,
        market_data: Dict,
        position_size: Optional[float] = None,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Enhanced position opening with additional validation and logging
        """
        try:
            # Log API call
            call_record = {
                "timestamp": datetime.now().isoformat(),
                "action": "open_position",
                "symbol": symbol,
                "entry_price": entry_price,
                "market_data": market_data,
                "metadata": metadata or {}
            }
            self.api_call_history.append(call_record)
            
            # Pre-opening validation
            validation_result = await self._validate_position_opening(
                symbol, entry_price, market_data, position_size
            )
            
            if not validation_result["valid"]:
                error_msg = f"Position validation failed: {validation_result['reason']}"
                await self._log_error("validation_error", error_msg, call_record)
                raise ValueError(error_msg)
            
            # Open position using core risk manager
            result = self.risk_manager.open_position(
                symbol=symbol,
                entry_price=entry_price,
                market_data=market_data,
                position_size=position_size
            )
            
            # Post-opening enhancements
            result["service_metadata"] = {
                "opened_at": datetime.now().isoformat(),
                "validation_passed": True,
                "api_call_id": len(self.api_call_history),
                "market_regime_confidence": await self._calculate_regime_confidence(market_data),
                "risk_score": await self._calculate_position_risk_score(symbol, entry_price, market_data)
            }
            
            # Check for alerts
            await self._check_portfolio_alerts()
            
            logger.info(f"Position opened successfully for {symbol} with enhanced features")
            return result
            
        except Exception as e:
            await self._log_error("position_opening_error", str(e), call_record)
            raise
    
    async def update_position_enhanced(
        self,
        symbol: str,
        current_price_data: Dict,
        market_data: Dict,
        force_update: bool = False
    ) -> Dict[str, Any]:
        """
        Enhanced position update with additional monitoring and alerts
        """
        try:
            call_record = {
                "timestamp": datetime.now().isoformat(),
                "action": "update_position",
                "symbol": symbol,
                "current_price_data": current_price_data,
                "market_data": market_data
            }
            self.api_call_history.append(call_record)
            
            # Pre-update analysis
            pre_update_analysis = await self._analyze_position_before_update(
                symbol, current_price_data, market_data
            )
            
            # Update position using core risk manager
            result = self.risk_manager.update_position(
                symbol=symbol,
                current_price_data=current_price_data,
                market_data=market_data
            )
            
            # Post-update enhancements
            result["service_metadata"] = {
                "updated_at": datetime.now().isoformat(),
                "pre_update_analysis": pre_update_analysis,
                "api_call_id": len(self.api_call_history),
                "regime_stability": await self._assess_regime_stability(market_data),
                "position_health": await self._assess_position_health(symbol, result)
            }
            
            # Generate alerts if needed
            if result["actions"]:
                await self._process_position_actions(symbol, result["actions"])
            
            # Update performance tracking
            await self._update_performance_tracking()
            
            return result
            
        except Exception as e:
            await self._log_error("position_update_error", str(e), call_record)
            raise
    
    async def get_enhanced_performance(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics with additional analytics"""
        try:
            # Get base performance
            base_performance = self.risk_manager.get_portfolio_performance()
            
            # Add enhanced metrics
            enhanced_metrics = {
                **base_performance,
                "service_uptime_hours": (datetime.now() - self.service_start_time).total_seconds() / 3600,
                "total_api_calls": len(self.api_call_history),
                "error_rate": len(self.error_history) / max(len(self.api_call_history), 1),
                "regime_distribution": await self._calculate_regime_distribution(),
                "risk_adjusted_metrics": await self._calculate_risk_adjusted_metrics(base_performance),
                "performance_trend": await self._calculate_performance_trend(),
                "alert_summary": await self._get_alert_summary()
            }
            
            return enhanced_metrics
            
        except Exception as e:
            logger.error(f"Error getting enhanced performance: {e}")
            raise
    
    async def run_enhanced_backtest(
        self,
        historical_data: List[Dict],
        config_overrides: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Run comprehensive backtest with enhanced analytics"""
        try:
            logger.info(f"Starting enhanced backtest with {len(historical_data)} data points")
            
            # Run core backtest
            backtest_results = self.backtest_engine.run_comprehensive_backtest(
                historical_data,
                config_overrides or {}
            )
            
            # Add enhanced analytics
            enhanced_results = {
                **backtest_results,
                "regime_performance_breakdown": await self._analyze_regime_performance(backtest_results),
                "drawdown_analysis": await self._analyze_drawdown_patterns(backtest_results),
                "risk_return_profile": await self._calculate_risk_return_profile(backtest_results),
                "optimization_suggestions": await self._generate_optimization_suggestions(backtest_results)
            }
            
            return enhanced_results
            
        except Exception as e:
            logger.error(f"Error running enhanced backtest: {e}")
            raise
    
    async def get_system_health(self) -> Dict[str, Any]:
        """Comprehensive system health check"""
        try:
            health_metrics = {
                "timestamp": datetime.now().isoformat(),
                "service_status": "healthy",
                "uptime_hours": (datetime.now() - self.service_start_time).total_seconds() / 3600,
                "risk_manager_initialized": self.risk_manager is not None,
                "active_positions": len(self.risk_manager.active_positions),
                "total_trades": len(self.risk_manager.performance_history),
                "error_rate": len(self.error_history) / max(len(self.api_call_history), 1),
                "memory_usage": await self._estimate_memory_usage(),
                "recent_performance": await self._get_recent_performance(),
                "system_alerts": await self._get_active_alerts(),
                "configuration_status": await self._validate_configuration()
            }
            
            # Determine overall health status
            if health_metrics["error_rate"] > 0.1:  # >10% error rate
                health_metrics["service_status"] = "degraded"
            elif len(health_metrics["system_alerts"]) > 0:
                health_metrics["service_status"] = "warning"
            
            return health_metrics
            
        except Exception as e:
            logger.error(f"Error getting system health: {e}")
            return {
                "timestamp": datetime.now().isoformat(),
                "service_status": "error",
                "error": str(e)
            }
    
    # Private helper methods
    async def _validate_position_opening(
        self, symbol: str, entry_price: float, market_data: Dict, position_size: Optional[float]
    ) -> Dict[str, Any]:
        """Validate position opening parameters"""
        validation_errors = []
        
        # Check if position already exists
        if symbol in self.risk_manager.active_positions:
            validation_errors.append(f"Position {symbol} already exists")
        
        # Validate market data
        if market_data.get("vix", 0) < 5 or market_data.get("vix", 0) > 100:
            validation_errors.append("VIX level outside valid range (5-100)")
        
        # Check position size limits
        if position_size and position_size > self.alert_thresholds["position_concentration"]:
            validation_errors.append(f"Position size exceeds concentration limit")
        
        return {
            "valid": len(validation_errors) == 0,
            "reason": "; ".join(validation_errors) if validation_errors else "All validations passed"
        }
    
    async def _calculate_regime_confidence(self, market_data: Dict) -> float:
        """Calculate confidence in current regime classification"""
        try:
            # Simplified confidence calculation based on VIX stability
            vix = market_data.get("vix", 20)
            
            # Higher confidence for extreme VIX values (clear regimes)
            if vix > 40 or vix < 12:
                return 0.9
            elif 15 <= vix <= 25:
                return 0.7  # Moderate confidence in normal regime
            else:
                return 0.6  # Lower confidence in transition zones
                
        except Exception:
            return 0.5  # Default confidence
    
    async def _calculate_position_risk_score(
        self, symbol: str, entry_price: float, market_data: Dict
    ) -> float:
        """Calculate risk score for a position (0-100, higher = riskier)"""
        try:
            risk_score = 0.0
            
            # VIX contribution (40% of score)
            vix = market_data.get("vix", 20)
            vix_risk = min(vix / 50.0, 1.0) * 40
            risk_score += vix_risk
            
            # True Range contribution (30% of score)
            true_range = market_data.get("true_range", entry_price * 0.02)
            tr_risk = min((true_range / entry_price) / 0.05, 1.0) * 30
            risk_score += tr_risk
            
            # Momentum contribution (30% of score)
            momentum = market_data.get("momentum_ratio", 1.0)
            momentum_risk = abs(1.0 - momentum) * 30
            risk_score += momentum_risk
            
            return min(risk_score, 100.0)
            
        except Exception:
            return 50.0  # Default medium risk
    
    async def _check_portfolio_alerts(self) -> List[str]:
        """Check for portfolio-level alerts"""
        alerts = []
        
        try:
            performance = self.risk_manager.get_portfolio_performance()
            
            # Drawdown alert
            if performance["current_drawdown"] < self.alert_thresholds["max_drawdown"]:
                alerts.append(f"Portfolio drawdown ({performance['current_drawdown']:.1f}%) exceeds threshold")
            
            # Position concentration alert
            if len(self.risk_manager.active_positions) > 0:
                max_position_size = max(
                    pos.position_size for pos in self.risk_manager.active_positions.values()
                )
                if max_position_size > self.alert_thresholds["position_concentration"]:
                    alerts.append(f"Position concentration ({max_position_size:.1f}%) exceeds limit")
            
        except Exception as e:
            logger.error(f"Error checking portfolio alerts: {e}")
        
        return alerts
    
    async def _log_error(self, error_type: str, error_message: str, context: Dict):
        """Log service errors with context"""
        error_record = {
            "timestamp": datetime.now().isoformat(),
            "error_type": error_type,
            "error_message": error_message,
            "context": context
        }
        self.error_history.append(error_record)
        logger.error(f"Service error [{error_type}]: {error_message}")
    
    async def _analyze_position_before_update(
        self, symbol: str, current_price_data: Dict, market_data: Dict
    ) -> Dict[str, Any]:
        """Analyze position state before update"""
        try:
            if symbol not in self.risk_manager.active_positions:
                return {"analysis": "position_not_found"}
            
            position = self.risk_manager.active_positions[symbol]
            current_price = current_price_data.get("close", 0)
            
            return {
                "current_pnl_pct": ((current_price - position.entry_price) / position.entry_price) * 100,
                "days_held": position.days_held,
                "stop_distance": abs(position.stop_level - current_price) / current_price,
                "regime_change_detected": abs(market_data.get("vix", position.vix_at_entry) - position.vix_at_entry) > 10,
                "analysis": "position_analyzed"
            }
            
        except Exception as e:
            return {"analysis": f"analysis_error: {str(e)}"}
    
    async def _assess_regime_stability(self, market_data: Dict) -> str:
        """Assess market regime stability"""
        # Simplified assessment based on VIX
        vix = market_data.get("vix", 20)
        
        if vix < 15:
            return "stable_low_vol"
        elif vix > 35:
            return "stable_high_vol"
        else:
            return "transitional"
    
    async def _assess_position_health(self, symbol: str, update_result: Dict) -> str:
        """Assess individual position health"""
        if update_result["position_status"] == "CLOSED":
            return "closed"
        
        current_pnl = update_result.get("current_pnl", 0)
        if current_pnl > 0.05:  # >5% profit
            return "healthy_profit"
        elif current_pnl < -0.03:  # <-3% loss
            return "at_risk"
        else:
            return "neutral"
    
    async def _process_position_actions(self, symbol: str, actions: List[Dict]):
        """Process and log position actions"""
        for action in actions:
            action_log = {
                "timestamp": datetime.now().isoformat(),
                "symbol": symbol,
                "action": action
            }
            logger.info(f"Position action for {symbol}: {action['action']}")
    
    async def _update_performance_tracking(self):
        """Update real-time performance tracking"""
        try:
            current_performance = self.risk_manager.get_portfolio_performance()
            snapshot = {
                "timestamp": datetime.now().isoformat(),
                "performance": current_performance
            }
            self.performance_snapshots.append(snapshot)
            
            # Keep only last 1000 snapshots to manage memory
            if len(self.performance_snapshots) > 1000:
                self.performance_snapshots = self.performance_snapshots[-1000:]
                
        except Exception as e:
            logger.error(f"Error updating performance tracking: {e}")
    
    async def _calculate_regime_distribution(self) -> Dict[str, int]:
        """Calculate distribution of trades across regimes"""
        regime_counts = {}
        for trade in self.risk_manager.trade_history:
            if trade.get("action") == "POSITION_OPENED":
                regime = trade.get("regime", "unknown")
                regime_counts[regime] = regime_counts.get(regime, 0) + 1
        
        return regime_counts
    
    async def _calculate_risk_adjusted_metrics(self, base_performance: Dict) -> Dict[str, float]:
        """Calculate additional risk-adjusted performance metrics"""
        return {
            "calmar_ratio": base_performance["total_return_pct"] / max(abs(base_performance["current_drawdown"]), 1.0),
            "sortino_ratio": base_performance["sharpe_ratio"] * 1.1,  # Simplified approximation
            "max_win_to_max_loss_ratio": abs(base_performance["max_win"] / max(abs(base_performance["max_loss"]), 1.0))
        }
    
    async def _calculate_performance_trend(self) -> str:
        """Calculate recent performance trend"""
        if len(self.risk_manager.performance_history) < 5:
            return "insufficient_data"
        
        recent_returns = self.risk_manager.performance_history[-5:]
        if sum(recent_returns) > 0:
            return "positive_trend"
        else:
            return "negative_trend"
    
    async def _get_alert_summary(self) -> Dict[str, int]:
        """Get summary of recent alerts"""
        return {
            "total_errors": len(self.error_history),
            "recent_errors_24h": len([e for e in self.error_history 
                                    if (datetime.now() - datetime.fromisoformat(e["timestamp"])).days < 1])
        }
    
    async def _estimate_memory_usage(self) -> Dict[str, int]:
        """Estimate service memory usage"""
        return {
            "api_call_history_size": len(self.api_call_history),
            "error_history_size": len(self.error_history),
            "performance_snapshots_size": len(self.performance_snapshots),
            "active_positions": len(self.risk_manager.active_positions),
            "trade_history_size": len(self.risk_manager.trade_history)
        }
    
    async def _get_recent_performance(self) -> Dict[str, Any]:
        """Get recent performance snapshot"""
        if len(self.performance_snapshots) == 0:
            return {"status": "no_data"}
        
        latest = self.performance_snapshots[-1]
        return {
            "timestamp": latest["timestamp"],
            "total_return": latest["performance"]["total_return_pct"],
            "active_positions": latest["performance"]["active_positions"]
        }
    
    async def _get_active_alerts(self) -> List[str]:
        """Get currently active system alerts"""
        return await self._check_portfolio_alerts()
    
    async def _validate_configuration(self) -> Dict[str, bool]:
        """Validate system configuration"""
        return {
            "risk_manager_config_valid": self.risk_manager.config is not None,
            "alert_thresholds_set": len(self.alert_thresholds) > 0,
            "backtest_engine_available": self.backtest_engine is not None
        }