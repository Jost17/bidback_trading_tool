# REGIME-SPEZIFISCHE STOP-LOSS MATRIX
import numpy as np
import pandas as pd

class RegimeStopLossManager:
    def __init__(self):
        self.regime_rules = {
            "crisis_opportunity": {
                "vix_range": (50, float('inf')),
                "stop_loss_pct": -15.0,  # Erweitert wegen extremer Volatilität
                "true_range_multiplier": 2.5,
                "description": "Crisis-Regime: Erweiterte Stops für Rebound-Opportunities"
            },
            "high_vol_stress": {
                "vix_range": (30, 50),
                "stop_loss_pct": -12.0,
                "true_range_multiplier": 2.0,
                "description": "High-Volatility: Moderate Stops bei erhöhtem Risiko"
            },
            "bull_normal": {
                "vix_range": (15, 30),
                "stop_loss_pct": -8.0,  # Standard defensive Positionierung
                "true_range_multiplier": 1.8,
                "description": "Bull-Normal: Standard Stops für normale Marktbedingungen"
            },
            "low_vol_complacency": {
                "vix_range": (0, 15),
                "stop_loss_pct": -5.0,  # Sehr eng da wenig Noise
                "true_range_multiplier": 1.2,
                "description": "Low-Vol: Enge Stops bei geringer Volatilität"
            }
        }
    
    def calculate_stop_level(self, entry_price, vix_level, true_range, t2108_level=None):
        """Berechnet dynamischen Stop-Loss basierend auf Regime und True Range"""
        regime = self.classify_regime(vix_level)
        rules = self.regime_rules[regime]
        
        # Base Stop-Level
        base_stop_pct = rules["stop_loss_pct"]
        
        # True Range Adjustment
        tr_adjustment = true_range * rules["true_range_multiplier"]
        tr_stop_pct = -(tr_adjustment / entry_price) * 100
        
        # Wähle konservativeren Stop (weiter weg vom Entry)
        final_stop_pct = min(base_stop_pct, tr_stop_pct)
        
        # Market Breadth Adjustment (optional)
        if t2108_level is not None:
            if t2108_level < 20:  # Schwache Breadth
                final_stop_pct *= 0.8  # Engere Stops
            elif t2108_level > 60:  # Starke Breadth
                final_stop_pct *= 1.2  # Weitere Stops
        
        stop_level = entry_price * (1 + final_stop_pct/100)
        
        return {
            "stop_level": stop_level,
            "stop_pct": final_stop_pct,
            "regime": regime,
            "base_stop": base_stop_pct,
            "tr_adjustment": tr_stop_pct
        }
    
    def classify_regime(self, vix_level):
        """Klassifiziert aktuelles Marktregime basierend auf VIX"""
        for regime, rules in self.regime_rules.items():
            vix_min, vix_max = rules["vix_range"]
            if vix_min <= vix_level < vix_max:
                return regime
        return "bull_normal"  # Default fallback

# Beispiel-Implementation
def demonstrate_stop_loss_calculation():
    manager = RegimeStopLossManager()
    
    # Test verschiedene Szenarien
    scenarios = [
        {"entry": 45.66, "vix": 15.43, "true_range": 1.35, "regime_name": "Bull Normal"},
        {"entry": 31.52, "vix": 66.51, "true_range": 2.87, "regime_name": "Crisis Opportunity"},
        {"entry": 22.75, "vix": 9.01, "true_range": 0.85, "regime_name": "Low Vol"},
        {"entry": 28.92, "vix": 35.68, "true_range": 1.94, "regime_name": "High Vol Stress"}
    ]
    
    results = []
    for scenario in scenarios:
        stop_data = manager.calculate_stop_level(
            scenario["entry"], 
            scenario["vix"], 
            scenario["true_range"]
        )
        
        results.append({
            "Scenario": scenario["regime_name"],
            "Entry": f"€{scenario['entry']:.2f}",
            "VIX": scenario["vix"],
            "True_Range": f"€{scenario['true_range']:.2f}",
            "Stop_Level": f"€{stop_data['stop_level']:.2f}",
            "Stop_Distance": f"{stop_data['stop_pct']:.1f}%",
            "Regime": stop_data['regime']
        })
    
    return pd.DataFrame(results)

if __name__ == "__main__":
    demo_results = demonstrate_stop_loss_calculation()
    print("REGIME-SPEZIFISCHE STOP-LOSS DEMONSTRATION:")
    print("=" * 60)
    print(demo_results.to_string(index=False))
