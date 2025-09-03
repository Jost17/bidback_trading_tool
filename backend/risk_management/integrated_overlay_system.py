# INTEGRIERTES RISK-MANAGEMENT OVERLAY SYSTEM
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
import warnings

class IntegratedRiskOverlay:
    def __init__(self):
        self.regime_configurations = {
            "crisis_opportunity": {
                "vix_range": (50, float('inf')),
                "stop_loss_pct": -15.0,
                "profit_levels": [20, 35, 50],
                "position_scaling": [25, 50, 100],
                "tr_stop_multiplier": 2.5,
                "tr_profit_multipliers": [3.0, 5.0, 7.0],
                "max_hold_override": 4,
                "description": "Crisis: Erweiterte Stops + Aggressive Profit-Taking"
            },
            "high_vol_stress": {
                "vix_range": (30, 50),
                "stop_loss_pct": -12.0,
                "profit_levels": [15, 28, 45],
                "position_scaling": [25, 50, 100],
                "tr_stop_multiplier": 2.0,
                "tr_profit_multipliers": [2.5, 4.0, 6.0],
                "max_hold_override": 3,
                "description": "High-Vol: Moderate Balance beider Komponenten"
            },
            "bull_normal": {
                "vix_range": (15, 30),
                "stop_loss_pct": -8.0,
                "profit_levels": [12, 25, 40],
                "position_scaling": [25, 50, 100],
                "tr_stop_multiplier": 1.8,
                "tr_profit_multipliers": [2.0, 3.5, 5.5],
                "max_hold_override": 3,
                "description": "Bull: Standard defensive + moderate offensive"
            },
            "low_vol_complacency": {
                "vix_range": (0, 15),
                "stop_loss_pct": -5.0,
                "profit_levels": [8, 15, 25],
                "position_scaling": [30, 60, 100],
                "tr_stop_multiplier": 1.2,
                "tr_profit_multipliers": [1.8, 3.0, 4.5],
                "max_hold_override": 2,
                "description": "Low-Vol: Enge Stops + frühe Gewinnmitnahme"
            }
        }
    
    def execute_integrated_overlay(self, 
                                 trade_data: Dict,
                                 entry_price: float,
                                 daily_prices: List[Dict],
                                 vix_level: float,
                                 t2108_level: Optional[float] = None,
                                 momentum_ratio: Optional[float] = None) -> Dict:
        """
        Hauptfunktion: Führt integriertes Risk-Management aus
        
        Args:
            trade_data: Grundlegende Trade-Informationen
            entry_price: Entry-Preis der Position
            daily_prices: Liste mit täglichen OHLC-Daten [{"high": x, "low": y, "close": z}, ...]
            vix_level: VIX-Level bei Trade-Entry
            t2108_level: Optional - T2108 Market Breadth Indikator
            momentum_ratio: Optional - Daily Momentum Ratio
        
        Returns:
            Dict mit Execution-Details und Performance-Metriken
        """
        # Klassifiziere Regime
        regime = self.classify_regime(vix_level)
        config = self.regime_configurations[regime]
        
        # Berechne True Range
        true_range = self.calculate_true_range(daily_prices[:2])  # Erste 2 Tage
        
        # Initialize Levels
        stop_level = self.calculate_dynamic_stop(entry_price, config, true_range, t2108_level)
        profit_levels = self.calculate_dynamic_profits(entry_price, config, true_range)
        
        # Execution Tracking
        results = {
            "regime": regime,
            "entry_price": entry_price,
            "stop_level": stop_level["price"],
            "profit_targets": [p["price"] for p in profit_levels],
            "stop_triggered": False,
            "profit_levels_hit": [],
            "remaining_position": 100,
            "total_return": 0,
            "exit_reason": "original_system",
            "execution_log": []
        }
        
        # Daily Monitoring Loop
        for day, price_data in enumerate(daily_prices):
            day_results = self.process_daily_prices(
                day, price_data, results, stop_level, profit_levels, config
            )
            
            results.update(day_results)
            
            # Early Exit Conditions
            if results["stop_triggered"] or results["remaining_position"] == 0:
                break
            
            # Regime Change Detection & Adjustment
            if day > 0 and self.detect_significant_regime_change(vix_level, day):
                new_regime = self.classify_regime(self.get_updated_vix(day))  # Placeholder
                if new_regime != regime:
                    adjustment_results = self.adjust_for_regime_change(
                        results, new_regime, entry_price, true_range
                    )
                    results.update(adjustment_results)
        
        # Final Performance Calculation
        results["final_performance"] = self.calculate_final_performance(results, daily_prices[-1])
        
        return results
    
    def process_daily_prices(self, day: int, price_data: Dict, 
                           current_results: Dict, stop_level: Dict, 
                           profit_levels: List[Dict], config: Dict) -> Dict:
        """Verarbeitet tägliche Preisbewegungen und führt Stops/Profit-Taking aus"""
        
        execution_log = []
        
        # PRIORITÄT 1: Check Stop-Loss (Risk Management First)
        if (price_data["low"] <= stop_level["price"] and 
            not current_results["stop_triggered"] and 
            current_results["remaining_position"] > 0):
            
            loss_amount = (stop_level["price"] - current_results["entry_price"]) / current_results["entry_price"]
            
            execution_log.append({
                "day": day + 1,
                "action": "STOP_LOSS_TRIGGERED",
                "price": stop_level["price"],
                "position_affected": current_results["remaining_position"],
                "pnl_impact": loss_amount * (current_results["remaining_position"] / 100)
            })
            
            return {
                "stop_triggered": True,
                "remaining_position": 0,
                "exit_reason": f"stop_loss_day_{day+1}",
                "total_return": current_results["total_return"] + (loss_amount * (current_results["remaining_position"] / 100)),
                "execution_log": current_results["execution_log"] + execution_log
            }
        
        # PRIORITÄT 2: Check Profit-Taking Levels
        for i, profit_target in enumerate(profit_levels):
            if (price_data["high"] >= profit_target["price"] and 
                i not in current_results["profit_levels_hit"] and
                current_results["remaining_position"] > 0):
                
                position_to_close = profit_target["position_to_close"]
                profit_per_unit = (profit_target["price"] - current_results["entry_price"]) / current_results["entry_price"]
                profit_realized = profit_per_unit * (position_to_close / 100)
                
                execution_log.append({
                    "day": day + 1,
                    "action": f"PROFIT_TAKING_LEVEL_{i+1}",
                    "price": profit_target["price"],
                    "position_affected": position_to_close,
                    "pnl_impact": profit_realized,
                    "profit_pct": profit_per_unit * 100
                })
                
                new_remaining = current_results["remaining_position"] - position_to_close
                new_total_return = current_results["total_return"] + profit_realized
                new_levels_hit = current_results["profit_levels_hit"] + [i]
                
                return {
                    "profit_levels_hit": new_levels_hit,
                    "remaining_position": max(0, new_remaining),
                    "total_return": new_total_return,
                    "execution_log": current_results["execution_log"] + execution_log,
                    "exit_reason": "profit_taking" if new_remaining == 0 else current_results["exit_reason"]
                }
        
        # Keine Trigger - Return Empty Update
        return {"execution_log": current_results["execution_log"] + execution_log}
    
    def calculate_dynamic_stop(self, entry_price: float, config: Dict, 
                             true_range: float, t2108_level: Optional[float] = None) -> Dict:
        """Berechnet dynamischen Stop-Loss Level"""
        
        base_stop_pct = config["stop_loss_pct"]
        tr_stop_pct = -(true_range * config["tr_stop_multiplier"] / entry_price) * 100
        
        # Konservativerer Stop (weiter weg vom Entry)
        final_stop_pct = min(base_stop_pct, tr_stop_pct)
        
        # Market Breadth Adjustment
        if t2108_level is not None:
            if t2108_level < 20:  # Schwache Breadth
                final_stop_pct *= 0.8  # Engere Stops
            elif t2108_level > 60:  # Starke Breadth
                final_stop_pct *= 1.2  # Weitere Stops
        
        return {
            "price": entry_price * (1 + final_stop_pct/100),
            "pct": final_stop_pct,
            "method": "tr_based" if tr_stop_pct < base_stop_pct else "pct_based"
        }
    
    def calculate_dynamic_profits(self, entry_price: float, config: Dict, true_range: float) -> List[Dict]:
        """Berechnet dynamische Profit-Taking Levels"""
        
        profit_targets = []
        
        for i, (base_pct, tr_multiplier) in enumerate(zip(
            config["profit_levels"], 
            config["tr_profit_multipliers"]
        )):
            base_target = entry_price * (1 + base_pct/100)
            tr_target = entry_price + (true_range * tr_multiplier)
            
            # Optimistischeres Ziel wählen
            final_price = max(base_target, tr_target)
            final_pct = ((final_price - entry_price) / entry_price) * 100
            
            # Position Scaling berechnen
            position_to_close = (config["position_scaling"][i] - 
                               (config["position_scaling"][i-1] if i > 0 else 0))
            
            profit_targets.append({
                "level": i + 1,
                "price": final_price,
                "pct": final_pct,
                "position_to_close": position_to_close,
                "method": "tr_based" if tr_target > base_target else "pct_based"
            })
        
        return profit_targets
    
    def calculate_true_range(self, price_data: List[Dict]) -> float:
        """Berechnet True Range basierend auf verfügbaren Preisdaten"""
        if len(price_data) < 2:
            return price_data[0]["high"] - price_data[0]["low"]
        
        # Standard True Range Calculation
        tr1 = price_data[1]["high"] - price_data[1]["low"]
        tr2 = abs(price_data[1]["high"] - price_data[0]["close"])
        tr3 = abs(price_data[1]["low"] - price_data[0]["close"])
        
        return max(tr1, tr2, tr3)
    
    def classify_regime(self, vix_level: float) -> str:
        """Klassifiziert Marktregime basierend auf VIX"""
        for regime, config in self.regime_configurations.items():
            vix_min, vix_max = config["vix_range"]
            if vix_min <= vix_level < vix_max:
                return regime
        return "bull_normal"  # Default fallback
    
    def calculate_final_performance(self, results: Dict, final_price_data: Dict) -> Dict:
        """Berechnet finale Performance-Metriken"""
        
        if results["remaining_position"] > 0 and not results["stop_triggered"]:
            # Restposition zu Schlusskurs bewerten
            remaining_pnl = ((final_price_data["close"] - results["entry_price"]) / 
                           results["entry_price"]) * (results["remaining_position"] / 100)
            total_return = results["total_return"] + remaining_pnl
        else:
            total_return = results["total_return"]
        
        return {
            "total_return_pct": total_return * 100,
            "annualized_return": total_return * 73,  # Assuming 5-day holds
            "profit_taking_efficiency": len(results["profit_levels_hit"]) / 3,  # Max 3 levels
            "risk_management_triggered": results["stop_triggered"]
        }
    
    def detect_significant_regime_change(self, original_vix: float, current_day: int) -> bool:
        """Detektiert signifikante Regime-Änderungen während Trade-Laufzeit"""
        # Placeholder - in real implementation würde hier VIX-Updates geprüft
        return False
    
    def adjust_for_regime_change(self, current_results: Dict, new_regime: str, 
                               entry_price: float, true_range: float) -> Dict:
        """Adjustiert Stops/Profits bei Regime-Wechsel"""
        # Placeholder für dynamische Regime-Anpassungen
        return {"regime_adjusted": True, "new_regime": new_regime}
    
    def get_updated_vix(self, day: int) -> float:
        """Placeholder für aktualisierte VIX-Werte"""
        return 20.0  # Placeholder

# Demonstration mit echten Trade-Daten
def demonstrate_integrated_system():
    overlay = IntegratedRiskOverlay()
    
    # EDN Trade aus CSV-Daten
    trade_data = {"symbol": "EDN", "sector": "Utilities"}
    entry_price = 45.66
    vix_level = 15.43
    
    # Daily Price Data (High, Low, Close für 5 Tage)
    daily_prices = [
        {"high": 44.65, "low": 43.30, "close": 44.65},  # Tag 1
        {"high": 46.01, "low": 43.33, "close": 43.57},  # Tag 2
        {"high": 44.28, "low": 41.70, "close": 42.62},  # Tag 3
        {"high": 41.53, "low": 36.76, "close": 37.45},  # Tag 4
        {"high": 38.55, "low": 36.00, "close": 36.95}   # Tag 5
    ]
    
    # Execute Integrated Overlay
    results = overlay.execute_integrated_overlay(
        trade_data=trade_data,
        entry_price=entry_price,
        daily_prices=daily_prices,
        vix_level=vix_level,
        t2108_level=None  # Optional
    )
    
    print("INTEGRIERTE RISK-MANAGEMENT DEMONSTRATION - EDN")
    print("=" * 60)
    print(f"Entry: €{entry_price}, VIX: {vix_level}, Regime: {results['regime']}")
    print(f"Stop Level: €{results['stop_level']:.2f}")
    print(f"Profit Targets: {[f'€{p:.2f}' for p in results['profit_targets']]}")
    print()
    
    print("Execution Log:")
    for log_entry in results["execution_log"]:
        if log_entry["action"].startswith("STOP"):
            print(f"  Day {log_entry['day']}: STOP LOSS at €{log_entry['price']:.2f} "
                  f"({log_entry['position_affected']}% position)")
        elif log_entry["action"].startswith("PROFIT"):
            print(f"  Day {log_entry['day']}: {log_entry['action']} at €{log_entry['price']:.2f} "
                  f"(+{log_entry['profit_pct']:.1f}%, {log_entry['position_affected']}% position)")
    
    if not results["execution_log"]:
        print("  No stops or profit-taking triggered during 5-day period")
    
    print()
    print("Final Results:")
    print(f"  Exit Reason: {results['exit_reason']}")
    print(f"  Remaining Position: {results['remaining_position']}%")
    print(f"  Total Return: {results['final_performance']['total_return_pct']:.2f}%")
    print(f"  Risk Management Triggered: {results['final_performance']['risk_management_triggered']}")

if __name__ == "__main__":
    demonstrate_integrated_system()
