# STUFENWEISE PROFIT-TAKING SYSTEM
import numpy as np
import pandas as pd

class RegimeProfitTakingManager:
    def __init__(self):
        self.regime_rules = {
            "crisis_opportunity": {
                "profit_levels": [20, 35, 50],  # Aggressive Ziele wegen Rebound-Potential
                "position_scaling": [25, 50, 100],  # 25% bei +20%, 50% bei +35%, Rest bei +50%
                "true_range_multipliers": [3.0, 5.0, 7.0],  # Erweiterte Ziele
                "description": "Crisis: Aggressive Profit-Taking für Rebound-Opportunities"
            },
            "high_vol_stress": {
                "profit_levels": [15, 28, 45],
                "position_scaling": [25, 50, 100],
                "true_range_multipliers": [2.5, 4.0, 6.0],
                "description": "High-Vol: Moderate Profit-Taking bei Volatilität"
            },
            "bull_normal": {
                "profit_levels": [12, 25, 40],  # Moderate aber realistische Ziele
                "position_scaling": [25, 50, 100],
                "true_range_multipliers": [2.0, 3.5, 5.5],
                "description": "Bull: Standard Profit-Taking für normale Bedingungen"
            },
            "low_vol_complacency": {
                "profit_levels": [8, 15, 25],  # Niedrigere Erwartungen
                "position_scaling": [30, 60, 100],  # Frühere Gewinnmitnahme
                "true_range_multipliers": [1.8, 3.0, 4.5],
                "description": "Low-Vol: Konservative Profit-Taking bei geringer Volatilität"
            }
        }
    
    def calculate_profit_levels(self, entry_price, vix_level, true_range, regime=None):
        """Berechnet stufenweise Profit-Taking Levels"""
        if regime is None:
            regime = self.classify_regime(vix_level)
        
        rules = self.regime_rules[regime]
        
        profit_targets = []
        
        for i, (base_pct, position_pct, tr_multiplier) in enumerate(zip(
            rules["profit_levels"], 
            rules["position_scaling"], 
            rules["true_range_multipliers"]
        )):
            # Base Profit Level
            base_target = entry_price * (1 + base_pct/100)
            
            # True Range basiertes Ziel
            tr_target = entry_price + (true_range * tr_multiplier)
            
            # Wähle optimistischeres Ziel (weiter weg vom Entry)
            final_target = max(base_target, tr_target)
            final_pct = ((final_target - entry_price) / entry_price) * 100
            
            profit_targets.append({
                "level": i + 1,
                "price_target": final_target,
                "profit_pct": final_pct,
                "position_to_close": position_pct - (profit_targets[i-1]["position_to_close"] if i > 0 else 0),
                "cumulative_closed": position_pct,
                "remaining_position": 100 - position_pct,
                "base_target": base_target,
                "tr_target": tr_target,
                "method": "tr_based" if tr_target > base_target else "pct_based"
            })
        
        return {
            "regime": regime,
            "profit_targets": profit_targets,
            "rules_used": rules
        }
    
    def classify_regime(self, vix_level):
        """Klassifiziert Marktregime basierend auf VIX"""
        if vix_level >= 50:
            return "crisis_opportunity"
        elif vix_level >= 30:
            return "high_vol_stress"
        elif vix_level >= 15:
            return "bull_normal"
        else:
            return "low_vol_complacency"
    
    def simulate_profit_taking(self, entry_price, daily_highs, profit_targets):
        """Simuliert Profit-Taking basierend auf täglichen Highs"""
        executed_levels = []
        remaining_position = 100
        total_profit = 0
        
        for day, high_price in enumerate(daily_highs):
            for target in profit_targets:
                if (high_price >= target["price_target"] and 
                    target["level"] not in [e["level"] for e in executed_levels]):
                    
                    # Profit-Taking ausführen
                    profit_per_share = target["price_target"] - entry_price
                    position_closed = target["position_to_close"]
                    profit_realized = profit_per_share * (position_closed / 100)
                    
                    executed_levels.append({
                        "level": target["level"],
                        "day": day + 1,
                        "price": target["price_target"],
                        "position_closed": position_closed,
                        "profit_realized": profit_realized,
                        "profit_pct": target["profit_pct"]
                    })
                    
                    remaining_position = target["remaining_position"]
                    total_profit += profit_realized
                    
                    break  # Nur ein Level pro Tag
        
        return {
            "executed_levels": executed_levels,
            "remaining_position": remaining_position,
            "total_profit_realized": total_profit,
            "partial_exits": len(executed_levels)
        }

# Demonstration mit echten Trade-Daten
def demonstrate_profit_taking():
    manager = RegimeProfitTakingManager()
    
    # Beispiel-Trade: EDN aus der CSV
    entry_price = 45.66
    vix_level = 15.43
    true_range = 1.35  # Berechnet aus High-Low Tag 1
    daily_highs = [44.65, 46.01, 44.28, 41.53, 38.55]  # Tag 1-5 Highs
    
    # Berechne Profit-Levels
    profit_setup = manager.calculate_profit_levels(entry_price, vix_level, true_range)
    
    # Simuliere Ausführung
    execution = manager.simulate_profit_taking(
        entry_price, 
        daily_highs, 
        profit_setup["profit_targets"]
    )
    
    print("PROFIT-TAKING DEMONSTRATION - EDN Trade")
    print("=" * 50)
    print(f"Entry: €{entry_price}, VIX: {vix_level}, Regime: {profit_setup['regime']}")
    print("\nProfit Targets:")
    for target in profit_setup["profit_targets"]:
        print(f"Level {target['level']}: €{target['price_target']:.2f} "
              f"(+{target['profit_pct']:.1f}%) - Close {target['position_to_close']}%")
    
    print(f"\nExecution Results:")
    if execution["executed_levels"]:
        for level in execution["executed_levels"]:
            print(f"Day {level['day']}: Closed {level['position_closed']}% at €{level['price']:.2f} "
                  f"(+{level['profit_pct']:.1f}%)")
    else:
        print("No profit levels hit during 5-day period")
    
    print(f"\nRemaining Position: {execution['remaining_position']}%")
    print(f"Total Profit Realized: €{execution['total_profit_realized']:.2f}")

if __name__ == "__main__":
    demonstrate_profit_taking()
