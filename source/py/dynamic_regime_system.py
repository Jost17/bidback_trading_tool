# DYNAMISCHES REGIME-TRANSITION SYSTEM
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

class RegimeType(Enum):
    CRISIS_OPPORTUNITY = "crisis_opportunity"
    HIGH_VOL_STRESS = "high_vol_stress" 
    BULL_NORMAL = "bull_normal"
    LOW_VOL_COMPLACENCY = "low_vol_complacency"

@dataclass
class MarketState:
    vix_level: float
    t2108_level: Optional[float] = None
    momentum_ratio: Optional[float] = None
    day: int = 0
    regime: RegimeType = RegimeType.BULL_NORMAL

@dataclass
class RuleAdjustment:
    stop_multiplier: float = 1.0
    profit_multiplier: float = 1.0
    urgency_factor: float = 1.0
    reason: str = ""

class DynamicRegimeManager:
    def __init__(self):
        self.regime_history = []
        self.market_state_history = []
        self.adjustment_history = []
        
        # Transition Thresholds
        self.transition_thresholds = {
            "vix_major_change": 15.0,      # VIX change > 15 points triggers review
            "vix_crisis_threshold": 45.0,   # Above 45 = Crisis consideration
            "vix_calm_threshold": 12.0,     # Below 12 = Complacency consideration
            "t2108_collapse": -25.0,        # T2108 drop > 25 points = Breadth crisis
            "t2108_explosion": +20.0,       # T2108 rise > 20 points = Breadth surge
            "momentum_extreme": 10.0        # Momentum ratio > 10 or < 0.1
        }
        
        # Emergency Protocols
        self.emergency_rules = {
            "breadth_collapse": {
                "stop_tightening": 0.6,      # Tighten stops to 60% of normal
                "profit_reduction": 0.7,     # Reduce profit targets to 70%
                "urgency_increase": 2.0      # 2x urgency for exits
            },
            "volatility_explosion": {
                "stop_widening": 1.5,        # Widen stops by 50%
                "profit_extension": 1.4,     # Extend profits by 40%
                "urgency_decrease": 0.7      # Less urgent exits
            },
            "momentum_collapse": {
                "defensive_mode": True,
                "stop_tightening": 0.5,
                "profit_reduction": 0.6,
                "urgency_increase": 3.0
            }
        }
    
    def detect_regime_transition(self, 
                               current_state: MarketState, 
                               previous_state: Optional[MarketState] = None) -> Tuple[bool, RegimeType, RuleAdjustment]:
        """
        Detektiert Regime-Transitionen und berechnet notwendige Regel-Anpassungen
        
        Returns:
            (transition_detected, new_regime, rule_adjustments)
        """
        
        # Klassifiziere neues Regime
        new_regime = self._classify_regime_comprehensive(current_state)
        
        # Prüfe ob Transition stattgefunden hat
        if previous_state is None:
            return True, new_regime, RuleAdjustment()
        
        previous_regime = previous_state.regime
        transition_detected = new_regime != previous_regime
        
        # Berechne Regel-Anpassungen
        rule_adjustment = self._calculate_transition_adjustments(
            current_state, previous_state, new_regime, previous_regime
        )
        
        # Emergency Protocol Check
        emergency_adjustment = self._check_emergency_protocols(current_state, previous_state)
        if emergency_adjustment:
            rule_adjustment = self._combine_adjustments(rule_adjustment, emergency_adjustment)
        
        # Logging
        if transition_detected:
            self._log_transition(previous_regime, new_regime, current_state, rule_adjustment)
        
        return transition_detected, new_regime, rule_adjustment
    
    def _classify_regime_comprehensive(self, state: MarketState) -> RegimeType:
        """Erweiterte Regime-Klassifikation mit Multi-Factor-Analyse"""
        
        vix = state.vix_level
        t2108 = state.t2108_level
        momentum = state.momentum_ratio
        
        # Primary Classification (VIX-based)
        if vix >= 50:
            primary_regime = RegimeType.CRISIS_OPPORTUNITY
        elif vix >= 30:
            primary_regime = RegimeType.HIGH_VOL_STRESS
        elif vix >= 15:
            primary_regime = RegimeType.BULL_NORMAL
        else:
            primary_regime = RegimeType.LOW_VOL_COMPLACENCY
        
        # Secondary Factor Adjustments
        if t2108 is not None and momentum is not None:
            # Breadth-Momentum Matrix Adjustment
            if t2108 < 20 and momentum < 0.8:  # Weak breadth + momentum
                if primary_regime == RegimeType.BULL_NORMAL:
                    primary_regime = RegimeType.HIGH_VOL_STRESS
                elif primary_regime == RegimeType.LOW_VOL_COMPLACENCY:
                    primary_regime = RegimeType.BULL_NORMAL
            
            elif t2108 > 60 and momentum > 2.0:  # Strong breadth + momentum
                if primary_regime == RegimeType.HIGH_VOL_STRESS:
                    primary_regime = RegimeType.BULL_NORMAL
                elif primary_regime == RegimeType.BULL_NORMAL and vix < 20:
                    primary_regime = RegimeType.LOW_VOL_COMPLACENCY
        
        return primary_regime
    
    def _calculate_transition_adjustments(self, 
                                        current: MarketState, 
                                        previous: MarketState,
                                        new_regime: RegimeType,
                                        old_regime: RegimeType) -> RuleAdjustment:
        """Berechnet Regel-Anpassungen basierend auf Regime-Transition"""
        
        adjustment = RuleAdjustment()
        
        # VIX-basierte Anpassungen
        vix_change = current.vix_level - previous.vix_level
        
        if abs(vix_change) > self.transition_thresholds["vix_major_change"]:
            if vix_change > 0:  # VIX steigt (Stress nimmt zu)
                adjustment.stop_multiplier = 1.2 + (vix_change / 50)  # Erweitere Stops
                adjustment.profit_multiplier = 1.1 + (vix_change / 100)  # Erweitere Profits leicht
                adjustment.reason += f"VIX spike +{vix_change:.1f}; "
            else:  # VIX fällt (Stress nimmt ab)
                adjustment.stop_multiplier = 0.9 + (vix_change / 100)  # Verenge Stops
                adjustment.profit_multiplier = 0.95 + (vix_change / 200)  # Reduziere Profits leicht
                adjustment.reason += f"VIX decline {vix_change:.1f}; "
        
        # T2108-basierte Anpassungen
        if (current.t2108_level is not None and 
            previous.t2108_level is not None):
            
            t2108_change = current.t2108_level - previous.t2108_level
            
            if t2108_change < self.transition_thresholds["t2108_collapse"]:
                adjustment.stop_multiplier *= 0.7  # Dramatisch engere Stops
                adjustment.profit_multiplier *= 0.8  # Reduziere Profit-Erwartungen
                adjustment.urgency_factor = 2.0  # Höhere Urgency
                adjustment.reason += f"Breadth collapse {t2108_change:.1f}; "
            
            elif t2108_change > self.transition_thresholds["t2108_explosion"]:
                adjustment.profit_multiplier *= 1.3  # Erweitere Profit-Targets
                adjustment.reason += f"Breadth surge +{t2108_change:.1f}; "
        
        # Momentum-basierte Anpassungen
        if (current.momentum_ratio is not None and 
            previous.momentum_ratio is not None):
            
            momentum_change = current.momentum_ratio / previous.momentum_ratio
            
            if momentum_change < 0.5:  # Momentum kollabiert
                adjustment.stop_multiplier *= 0.8
                adjustment.urgency_factor = max(adjustment.urgency_factor, 1.5)
                adjustment.reason += f"Momentum collapse {momentum_change:.2f}x; "
            
            elif momentum_change > 2.0:  # Momentum explodiert
                adjustment.profit_multiplier *= 1.2
                adjustment.reason += f"Momentum surge {momentum_change:.2f}x; "
        
        return adjustment
    
    def _check_emergency_protocols(self, 
                                 current: MarketState, 
                                 previous: MarketState) -> Optional[RuleAdjustment]:
        """Prüft Emergency-Protokolle für extreme Marktbedingungen"""
        
        # Breadth Collapse Protocol
        if (current.t2108_level is not None and 
            previous.t2108_level is not None and
            (current.t2108_level - previous.t2108_level) < -30):
            
            rules = self.emergency_rules["breadth_collapse"]
            return RuleAdjustment(
                stop_multiplier=rules["stop_tightening"],
                profit_multiplier=rules["profit_reduction"],
                urgency_factor=rules["urgency_increase"],
                reason="EMERGENCY: Breadth collapse protocol activated"
            )
        
        # Volatility Explosion Protocol
        if current.vix_level > 60 and (current.vix_level - previous.vix_level) > 20:
            rules = self.emergency_rules["volatility_explosion"]
            return RuleAdjustment(
                stop_multiplier=rules["stop_widening"],
                profit_multiplier=rules["profit_extension"],
                urgency_factor=rules["urgency_decrease"],
                reason="EMERGENCY: Volatility explosion protocol activated"
            )
        
        # Momentum Collapse Protocol
        if (current.momentum_ratio is not None and 
            previous.momentum_ratio is not None and
            current.momentum_ratio < 0.1 and 
            previous.momentum_ratio > 1.0):
            
            rules = self.emergency_rules["momentum_collapse"]
            return RuleAdjustment(
                stop_multiplier=rules["stop_tightening"],
                profit_multiplier=rules["profit_reduction"],
                urgency_factor=rules["urgency_increase"],
                reason="EMERGENCY: Momentum collapse protocol activated"
            )
        
        return None
    
    def _combine_adjustments(self, base: RuleAdjustment, emergency: RuleAdjustment) -> RuleAdjustment:
        """Kombiniert Base- und Emergency-Adjustments"""
        return RuleAdjustment(
            stop_multiplier=base.stop_multiplier * emergency.stop_multiplier,
            profit_multiplier=base.profit_multiplier * emergency.profit_multiplier,
            urgency_factor=max(base.urgency_factor, emergency.urgency_factor),
            reason=f"{base.reason} + {emergency.reason}"
        )
    
    def apply_dynamic_adjustments(self, 
                                base_rules: Dict,
                                adjustment: RuleAdjustment) -> Dict:
        """Wendet dynamische Anpassungen auf Base-Rules an"""
        
        adjusted_rules = base_rules.copy()
        
        # Adjust Stop-Loss
        if "stop_loss_pct" in adjusted_rules:
            adjusted_rules["stop_loss_pct"] *= adjustment.stop_multiplier
        
        # Adjust Profit Levels
        if "profit_levels" in adjusted_rules:
            adjusted_rules["profit_levels"] = [
                level * adjustment.profit_multiplier 
                for level in adjusted_rules["profit_levels"]
            ]
        
        # Adjust True Range Multipliers
        if "tr_stop_multiplier" in adjusted_rules:
            adjusted_rules["tr_stop_multiplier"] *= adjustment.stop_multiplier
        
        if "tr_profit_multipliers" in adjusted_rules:
            adjusted_rules["tr_profit_multipliers"] = [
                mult * adjustment.profit_multiplier 
                for mult in adjusted_rules["tr_profit_multipliers"]
            ]
        
        # Adjust Hold Times based on Urgency
        if "max_hold_override" in adjusted_rules and adjustment.urgency_factor > 1.0:
            adjusted_rules["max_hold_override"] = max(
                1, 
                int(adjusted_rules["max_hold_override"] / adjustment.urgency_factor)
            )
        
        return adjusted_rules
    
    def _log_transition(self, 
                       old_regime: RegimeType, 
                       new_regime: RegimeType,
                       state: MarketState,
                       adjustment: RuleAdjustment):
        """Loggt Regime-Transitionen für Analyse"""
        
        transition_log = {
            "day": state.day,
            "old_regime": old_regime.value,
            "new_regime": new_regime.value,
            "vix": state.vix_level,
            "t2108": state.t2108_level,
            "momentum": state.momentum_ratio,
            "stop_adj": adjustment.stop_multiplier,
            "profit_adj": adjustment.profit_multiplier,
            "urgency": adjustment.urgency_factor,
            "reason": adjustment.reason
        }
        
        self.adjustment_history.append(transition_log)
    
    def get_transition_history(self) -> pd.DataFrame:
        """Returniert Transition-Historie als DataFrame"""
        return pd.DataFrame(self.adjustment_history)

# Adaptive Stop-Loss mit True Range Integration
class AdaptiveStopManager:
    def __init__(self, regime_manager: DynamicRegimeManager):
        self.regime_manager = regime_manager
        self.rolling_true_ranges = {}  # Track per symbol
    
    def calculate_adaptive_stop(self, 
                              symbol: str,
                              entry_price: float,
                              current_true_range: float,
                              base_rules: Dict,
                              market_state: MarketState,
                              previous_state: Optional[MarketState] = None) -> Dict:
        """Berechnet adaptive Stop-Loss mit Dynamic Regime Adjustment"""
        
        # Detect Regime Changes
        transition_detected, new_regime, adjustment = self.regime_manager.detect_regime_transition(
            market_state, previous_state
        )
        
        # Apply Dynamic Adjustments
        adjusted_rules = self.regime_manager.apply_dynamic_adjustments(base_rules, adjustment)
        
        # Update Rolling True Range
        if symbol not in self.rolling_true_ranges:
            self.rolling_true_ranges[symbol] = []
        
        self.rolling_true_ranges[symbol].append(current_true_range)
        
        # Keep only last 5 days for rolling calculation
        if len(self.rolling_true_ranges[symbol]) > 5:
            self.rolling_true_ranges[symbol] = self.rolling_true_ranges[symbol][-5:]
        
        # Calculate adaptive True Range (smoothed)
        rolling_tr = np.mean(self.rolling_true_ranges[symbol])
        volatility_factor = current_true_range / rolling_tr if rolling_tr > 0 else 1.0
        
        # Base Stop Calculation
        base_stop_pct = adjusted_rules.get("stop_loss_pct", -8.0)
        tr_multiplier = adjusted_rules.get("tr_stop_multiplier", 1.8)
        
        # Volatility-Adjusted True Range Stop
        adjusted_tr_multiplier = tr_multiplier * volatility_factor
        tr_stop_distance = current_true_range * adjusted_tr_multiplier
        tr_stop_pct = -(tr_stop_distance / entry_price) * 100
        
        # Choose more conservative stop
        final_stop_pct = min(base_stop_pct, tr_stop_pct)
        
        # Apply bounds (prevent extreme values)
        final_stop_pct = max(final_stop_pct, -25.0)  # Max 25% stop
        final_stop_pct = min(final_stop_pct, -2.0)   # Min 2% stop
        
        stop_level = entry_price * (1 + final_stop_pct/100)
        
        return {
            "stop_level": stop_level,
            "stop_pct": final_stop_pct,
            "regime": new_regime.value,
            "base_stop": base_stop_pct,
            "tr_stop": tr_stop_pct,
            "volatility_factor": volatility_factor,
            "adjustment_applied": adjustment.reason if adjustment.reason else "none",
            "transition_detected": transition_detected
        }

# Demonstration mit echten Marktdaten
def demonstrate_dynamic_regime_system():
    """Demonstriert das dynamische Regime-System"""
    
    regime_manager = DynamicRegimeManager()
    stop_manager = AdaptiveStopManager(regime_manager)
    
    # Simuliere Marktdaten-Sequenz
    market_sequence = [
        MarketState(vix_level=15.0, t2108_level=45.0, momentum_ratio=1.2, day=1),
        MarketState(vix_level=18.0, t2108_level=42.0, momentum_ratio=0.9, day=2),
        MarketState(vix_level=35.0, t2108_level=25.0, momentum_ratio=0.4, day=3),  # Stress Event
        MarketState(vix_level=55.0, t2108_level=15.0, momentum_ratio=0.1, day=4),  # Crisis
        MarketState(vix_level=45.0, t2108_level=35.0, momentum_ratio=2.5, day=5),  # Recovery
    ]
    
    # Base Rules für Bull Normal Regime
    base_rules = {
        "stop_loss_pct": -8.0,
        "profit_levels": [12, 25, 40],
        "tr_stop_multiplier": 1.8,
        "tr_profit_multipliers": [2.0, 3.5, 5.5],
        "max_hold_override": 3
    }
    
    # Simuliere Trade mit dynamischen Anpassungen
    symbol = "TEST"
    entry_price = 50.0
    true_ranges = [1.2, 1.5, 3.8, 5.2, 3.1]  # Increasing volatility then recovery
    
    print("DYNAMIC REGIME-TRANSITION DEMONSTRATION")
    print("=" * 60)
    print(f"Symbol: {symbol}, Entry: ${entry_price:.2f}")
    print()
    
    previous_state = None
    
    for i, (market_state, true_range) in enumerate(zip(market_sequence, true_ranges)):
        print(f"Day {market_state.day}:")
        print(f"  Market: VIX={market_state.vix_level:.1f}, T2108={market_state.t2108_level:.1f}, "
              f"Momentum={market_state.momentum_ratio:.1f}")
        print(f"  True Range: ${true_range:.2f}")
        
        # Calculate Adaptive Stop
        stop_data = stop_manager.calculate_adaptive_stop(
            symbol, entry_price, true_range, base_rules, market_state, previous_state
        )
        
        print(f"  Regime: {stop_data['regime']}")
        print(f"  Stop Level: ${stop_data['stop_level']:.2f} ({stop_data['stop_pct']:.1f}%)")
        print(f"  Volatility Factor: {stop_data['volatility_factor']:.2f}x")
        
        if stop_data['transition_detected']:
            print(f"  >>> REGIME TRANSITION DETECTED <<<")
        
        if stop_data['adjustment_applied'] != "none":
            print(f"  Adjustments: {stop_data['adjustment_applied']}")
        
        print()
        previous_state = market_state
    
    # Show Transition History
    history_df = regime_manager.get_transition_history()
    if not history_df.empty:
        print("TRANSITION HISTORY:")
        print("-" * 40)
        for _, row in history_df.iterrows():
            print(f"Day {row['day']}: {row['old_regime']} → {row['new_regime']}")
            print(f"  Reason: {row['reason']}")
            print(f"  Adjustments: Stop {row['stop_adj']:.2f}x, Profit {row['profit_adj']:.2f}x")
            print()

if __name__ == "__main__":
    demonstrate_dynamic_regime_system()
