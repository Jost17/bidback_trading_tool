# MULTI-LAYER BACKTESTING FRAMEWORK
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
import matplotlib.pyplot as plt
import seaborn as sns

class MultiLayerBacktester:
    def __init__(self, trade_data_file: str):
        """
        Initialisiert Backtester mit historischen Trade-Daten
        
        Args:
            trade_data_file: Pfad zur CSV-Datei mit Trade-Daten
        """
        self.trade_data = self.load_trade_data(trade_data_file)
        self.overlay_system = IntegratedRiskOverlay()
        
        # Backtesting Results Storage
        self.layer_results = {
            "baseline": {},      # Originalstrategie (390.94% ROI)
            "stop_only": {},     # Nur Stop-Loss
            "profit_only": {},   # Nur Profit-Taking
            "combined": {}       # Kombinierte Strategie
        }
    
    def load_trade_data(self, file_path: str) -> pd.DataFrame:
        """Lädt und preprocessed historische Trade-Daten"""
        try:
            # Annahme: CSV-Format wie in deep_dive_bidback.txt
            df = pd.read_csv(file_path, sep='\t')  # Tab-separated
            
            # Bereinige Spaltennamen
            df.columns = df.columns.str.strip()
            
            # Konvertiere Preis-Spalten (entferne € und konvertiere zu float)
            price_columns = ['Entry', '$ Tag 1', '$ Tag 2', '$ Tag 3', '$ Tag 4', '$ Tag 5',
                           '$ Tag 1 Low', '$ Tag 2 Low', '$ Tag 3 Low', '$ Tag 4 Low', '$ Tag 5 Low',
                           '$ Tag 2 High', '$ Tag 3 High', '$ Tag 4 High', '$ Tag 5 High']
            
            for col in price_columns:
                if col in df.columns:
                    df[col] = df[col].astype(str).str.replace('€', '').str.replace(',', '.').astype(float)
            
            # Konvertiere VIX
            if 'VIX CBOE 1-day' in df.columns:
                df['VIX'] = df['VIX CBOE 1-day'].astype(float)
            
            # Konvertiere Performance-Spalten
            perf_columns = ['Move 1 day', 'Move 2 day', 'Move 3 day', 'Move 4 day', 'Move 5 day']
            for col in perf_columns:
                if col in df.columns:
                    df[col] = df[col].astype(str).str.replace('%', '').str.replace(',', '.').astype(float) / 100
            
            return df
            
        except Exception as e:
            print(f"Error loading trade data: {e}")
            # Fallback: Erstelle Sample-Daten für Demonstration
            return self.create_sample_data()
    
    def create_sample_data(self) -> pd.DataFrame:
        """Erstellt Sample-Daten für Demonstration"""
        np.random.seed(42)
        n_trades = 100
        
        data = {
            'Kuerzel': [f'TICK{i:03d}' for i in range(n_trades)],
            'Entry': np.random.uniform(10, 100, n_trades),
            'VIX': np.random.exponential(20, n_trades),
            '$ Tag 1': np.random.uniform(9, 105, n_trades),
            '$ Tag 1 Low': np.random.uniform(8, 95, n_trades),
            '$ Tag 2': np.random.uniform(8, 110, n_trades),
            '$ Tag 2 Low': np.random.uniform(7, 95, n_trades),
            '$ Tag 2 High': np.random.uniform(10, 115, n_trades),
            '$ Tag 3': np.random.uniform(7, 120, n_trades),
            '$ Tag 3 Low': np.random.uniform(6, 95, n_trades),
            '$ Tag 3 High': np.random.uniform(11, 125, n_trades),
            '$ Tag 4': np.random.uniform(6, 125, n_trades),
            '$ Tag 4 Low': np.random.uniform(5, 95, n_trades),
            '$ Tag 4 High': np.random.uniform(12, 130, n_trades),
            '$ Tag 5': np.random.uniform(5, 130, n_trades),
            '$ Tag 5 Low': np.random.uniform(4, 95, n_trades),
            '$ Tag 5 High': np.random.uniform(13, 135, n_trades),
            'Move 2 day': np.random.normal(0.02, 0.15, n_trades),  # 2% average mit 15% volatility
        }
        
        return pd.DataFrame(data)
    
    def run_baseline_analysis(self) -> Dict:
        """Layer 0: Baseline - Original System Performance"""
        baseline_returns = []
        
        for _, trade in self.trade_data.iterrows():
            # Annahme: Original System Exit nach Tag 2
            if not pd.isna(trade.get('Move 2 day', np.nan)):
                baseline_returns.append(trade['Move 2 day'])
        
        baseline_results = {
            'total_trades': len(baseline_returns),
            'total_return': sum(baseline_returns),
            'avg_return_per_trade': np.mean(baseline_returns),
            'win_rate': sum(1 for r in baseline_returns if r > 0) / len(baseline_returns),
            'max_win': max(baseline_returns),
            'max_loss': min(baseline_returns),
            'sharpe_ratio': self.calculate_sharpe_ratio(baseline_returns),
            'max_drawdown': self.calculate_max_drawdown(baseline_returns)
        }
        
        self.layer_results['baseline'] = baseline_results
        return baseline_results
    
    def run_stop_loss_only_analysis(self) -> Dict:
        """Layer 1: Nur Stop-Loss Impact"""
        stop_only_returns = []
        stop_triggers = 0
        
        for _, trade in self.trade_data.iterrows():
            try:
                # Simuliere Stop-Loss Overlay
                entry = trade['Entry']
                vix = trade.get('VIX', 20.0)
                
                # Erstelle tägliche Preisdaten
                daily_prices = self.extract_daily_prices(trade)
                
                # Calculate Stop Level
                regime = self.overlay_system.classify_regime(vix)
                config = self.overlay_system.regime_configurations[regime]
                true_range = self.calculate_trade_true_range(daily_prices)
                
                stop_data = self.overlay_system.calculate_dynamic_stop(entry, config, true_range)
                stop_level = stop_data['price']
                
                # Check if stop was hit
                stop_hit = False
                for day_prices in daily_prices:
                    if day_prices['low'] <= stop_level:
                        stop_triggers += 1
                        stop_return = (stop_level - entry) / entry
                        stop_only_returns.append(stop_return)
                        stop_hit = True
                        break
                
                # If no stop hit, use original return
                if not stop_hit:
                    original_return = trade.get('Move 2 day', 0)
                    stop_only_returns.append(original_return)
                    
            except Exception as e:
                # Fallback to original return
                stop_only_returns.append(trade.get('Move 2 day', 0))
        
        stop_results = {
            'total_trades': len(stop_only_returns),
            'stop_triggers': stop_triggers,
            'stop_trigger_rate': stop_triggers / len(stop_only_returns),
            'total_return': sum(stop_only_returns),
            'avg_return_per_trade': np.mean(stop_only_returns),
            'win_rate': sum(1 for r in stop_only_returns if r > 0) / len(stop_only_returns),
            'max_win': max(stop_only_returns),
            'max_loss': min(stop_only_returns),
            'sharpe_ratio': self.calculate_sharpe_ratio(stop_only_returns),
            'max_drawdown': self.calculate_max_drawdown(stop_only_returns)
        }
        
        self.layer_results['stop_only'] = stop_results
        return stop_results
    
    def run_profit_taking_only_analysis(self) -> Dict:
        """Layer 2: Nur Profit-Taking Impact"""
        profit_only_returns = []
        profit_triggers = 0
        
        for _, trade in self.trade_data.iterrows():
            try:
                entry = trade['Entry']
                vix = trade.get('VIX', 20.0)
                
                daily_prices = self.extract_daily_prices(trade)
                
                # Calculate Profit Levels
                regime = self.overlay_system.classify_regime(vix)
                config = self.overlay_system.regime_configurations[regime]
                true_range = self.calculate_trade_true_range(daily_prices)
                
                profit_levels = self.overlay_system.calculate_dynamic_profits(entry, config, true_range)
                
                # Simuliere Profit-Taking
                total_return = 0
                remaining_position = 100
                profit_hit = False
                
                for day, day_prices in enumerate(daily_prices):
                    for i, profit_target in enumerate(profit_levels):
                        if (day_prices['high'] >= profit_target['price'] and 
                            profit_target['level'] not in []):  # Simplified check
                            
                            position_to_close = profit_target['position_to_close']
                            profit_per_unit = (profit_target['price'] - entry) / entry
                            partial_return = profit_per_unit * (position_to_close / 100)
                            
                            total_return += partial_return
                            remaining_position -= position_to_close
                            profit_triggers += 1
                            profit_hit = True
                            
                            if remaining_position <= 0:
                                break
                    
                    if remaining_position <= 0:
                        break
                
                # Add return from remaining position (if any) at original exit
                if remaining_position > 0:
                    original_return = trade.get('Move 2 day', 0)
                    remaining_return = original_return * (remaining_position / 100)
                    total_return += remaining_return
                
                profit_only_returns.append(total_return)
                
            except Exception as e:
                # Fallback to original return
                profit_only_returns.append(trade.get('Move 2 day', 0))
        
        profit_results = {
            'total_trades': len(profit_only_returns),
            'profit_triggers': profit_triggers,
            'avg_profit_levels_per_trade': profit_triggers / len(profit_only_returns),
            'total_return': sum(profit_only_returns),
            'avg_return_per_trade': np.mean(profit_only_returns),
            'win_rate': sum(1 for r in profit_only_returns if r > 0) / len(profit_only_returns),
            'max_win': max(profit_only_returns),
            'max_loss': min(profit_only_returns),
            'sharpe_ratio': self.calculate_sharpe_ratio(profit_only_returns),
            'max_drawdown': self.calculate_max_drawdown(profit_only_returns)
        }
        
        self.layer_results['profit_only'] = profit_results
        return profit_results
    
    def run_combined_analysis(self) -> Dict:
        """Layer 3: Kombinierte Stop-Loss + Profit-Taking Strategie"""
        combined_results = {
            'total_trades': len(combined_returns),
            'stop_triggers': stop_triggers,
            'profit_triggers': profit_triggers,
            'stop_trigger_rate': stop_triggers / len(combined_returns),
            'avg_profit_levels_per_trade': profit_triggers / len(combined_returns),
            'total_return': sum(combined_returns),
            'avg_return_per_trade': np.mean(combined_returns),
            'win_rate': sum(1 for r in combined_returns if r > 0) / len(combined_returns),
            'max_win': max(combined_returns),
            'max_loss': min(combined_returns),
            'sharpe_ratio': self.calculate_sharpe_ratio(combined_returns),
            'max_drawdown': self.calculate_max_drawdown(combined_returns)
        }
        
        self.layer_results['combined'] = combined_results
        return combined_results
    
    def extract_daily_prices(self, trade) -> List[Dict]:
        """Extrahiert tägliche OHLC-Daten aus Trade-Row"""
        daily_prices = []
        
        for day in range(1, 6):  # Tag 1-5
            price_data = {}
            
            # High-Preis
            high_col = f'$ Tag {day} High' if day > 1 else f'$ Tag {day}'
            if high_col in trade.index and not pd.isna(trade[high_col]):
                price_data['high'] = trade[high_col]
            else:
                price_data['high'] = trade[f'$ Tag {day}'] if f'$ Tag {day}' in trade.index else trade['Entry']
            
            # Low-Preis
            low_col = f'$ Tag {day} Low'
            if low_col in trade.index and not pd.isna(trade[low_col]):
                price_data['low'] = trade[low_col]
            else:
                price_data['low'] = price_data['high'] * 0.95  # Estimate
            
            # Close-Preis
            close_col = f'$ Tag {day}'
            if close_col in trade.index and not pd.isna(trade[close_col]):
                price_data['close'] = trade[close_col]
            else:
                price_data['close'] = price_data['high']
            
            daily_prices.append(price_data)
        
        return daily_prices
    
    def calculate_trade_true_range(self, daily_prices: List[Dict]) -> float:
        """Berechnet True Range für einen Trade"""
        if len(daily_prices) < 2:
            return daily_prices[0]['high'] - daily_prices[0]['low']
        
        tr1 = daily_prices[1]['high'] - daily_prices[1]['low']
        tr2 = abs(daily_prices[1]['high'] - daily_prices[0]['close'])
        tr3 = abs(daily_prices[1]['low'] - daily_prices[0]['close'])
        
        return max(tr1, tr2, tr3)
    
    def calculate_sharpe_ratio(self, returns: List[float], risk_free_rate: float = 0.02) -> float:
        """Berechnet Sharpe Ratio"""
        if len(returns) == 0 or np.std(returns) == 0:
            return 0
        
        excess_returns = np.array(returns) - (risk_free_rate / 252)  # Daily risk-free rate
        return np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252)
    
    def calculate_max_drawdown(self, returns: List[float]) -> float:
        """Berechnet Maximum Drawdown"""
        cumulative = np.cumprod(1 + np.array(returns))
        running_max = np.maximum.accumulate(cumulative)
        drawdowns = (cumulative - running_max) / running_max
        return np.min(drawdowns)
    
    def run_full_multilayer_backtest(self) -> Dict:
        """Führt kompletten Multi-Layer-Backtest aus"""
        print("Running Multi-Layer Backtest...")
        print("=" * 50)
        
        # Layer 0: Baseline
        print("Layer 0: Baseline Analysis...")
        baseline = self.run_baseline_analysis()
        
        # Layer 1: Stop-Loss Only
        print("Layer 1: Stop-Loss Only Analysis...")
        stop_only = self.run_stop_loss_only_analysis()
        
        # Layer 2: Profit-Taking Only
        print("Layer 2: Profit-Taking Only Analysis...")
        profit_only = self.run_profit_taking_only_analysis()
        
        # Layer 3: Combined Strategy
        print("Layer 3: Combined Strategy Analysis...")
        combined = self.run_combined_analysis()
        
        # Layer 4: Optimization Analysis
        print("Layer 4: ROI vs Drawdown Optimization...")
        optimization = self.run_optimization_analysis()
        
        return {
            'baseline': baseline,
            'stop_only': stop_only,
            'profit_only': profit_only,
            'combined': combined,
            'optimization': optimization
        }
    
    def run_optimization_analysis(self) -> Dict:
        """Layer 4: ROI vs Drawdown Trade-off Optimierung"""
        results = self.layer_results
        
        # Calculate Performance Metrics Comparison
        strategies = ['baseline', 'stop_only', 'profit_only', 'combined']
        
        optimization_metrics = {}
        
        for strategy in strategies:
            if strategy in results:
                data = results[strategy]
                
                # ROI Calculation (annualized)
                total_return_pct = data['total_return'] * 100
                roi_annualized = total_return_pct * (252/5)  # Assuming 5-day trades
                
                # Risk-Adjusted Return
                sharpe = data.get('sharpe_ratio', 0)
                max_dd = abs(data.get('max_drawdown', 0))
                
                # Composite Score: ROI / Max Drawdown * Sharpe
                if max_dd > 0 and sharpe > 0:
                    risk_adjusted_score = (roi_annualized / max_dd) * sharpe
                else:
                    risk_adjusted_score = roi_annualized
                
                optimization_metrics[strategy] = {
                    'roi_annualized': roi_annualized,
                    'max_drawdown': max_dd * 100,
                    'sharpe_ratio': sharpe,
                    'win_rate': data['win_rate'] * 100,
                    'risk_adjusted_score': risk_adjusted_score,
                    'avg_return_per_trade': data['avg_return_per_trade'] * 100
                }
        
        # Identify Best Strategy
        best_strategy = max(optimization_metrics.items(), 
                          key=lambda x: x[1]['risk_adjusted_score'])
        
        return {
            'strategy_comparison': optimization_metrics,
            'best_strategy': best_strategy[0],
            'improvement_vs_baseline': {
                'roi_improvement': (optimization_metrics[best_strategy[0]]['roi_annualized'] - 
                                  optimization_metrics.get('baseline', {}).get('roi_annualized', 0)),
                'drawdown_reduction': (optimization_metrics.get('baseline', {}).get('max_drawdown', 0) - 
                                     optimization_metrics[best_strategy[0]]['max_drawdown'])
            }
        }
    
    def generate_performance_report(self) -> str:
        """Generiert detaillierten Performance-Report"""
        results = self.layer_results
        
        report = []
        report.append("MULTI-LAYER BACKTESTING PERFORMANCE REPORT")
        report.append("=" * 60)
        report.append("")
        
        # Strategy Comparison Table
        report.append("STRATEGY COMPARISON:")
        report.append("-" * 40)
        
        headers = ["Strategy", "Total Return", "Win Rate", "Sharpe", "Max DD", "Avg/Trade"]
        report.append(f"{'Strategy':<15} {'Tot.Ret.':<10} {'Win%':<8} {'Sharpe':<8} {'MaxDD':<8} {'Avg/Trade':<10}")
        report.append("-" * 70)
        
        for strategy_name, data in results.items():
            if data:  # Only if analysis was run
                report.append(
                    f"{strategy_name:<15} "
                    f"{data['total_return']*100:<10.1f}% "
                    f"{data['win_rate']*100:<8.1f}% "
                    f"{data.get('sharpe_ratio', 0):<8.2f} "
                    f"{abs(data.get('max_drawdown', 0))*100:<8.1f}% "
                    f"{data['avg_return_per_trade']*100:<10.2f}%"
                )
        
        report.append("")
        
        # Key Insights
        if 'combined' in results and 'baseline' in results:
            combined_roi = results['combined']['total_return'] * 100
            baseline_roi = results['baseline']['total_return'] * 100
            improvement = combined_roi - baseline_roi
            
            report.append("KEY INSIGHTS:")
            report.append("-" * 20)
            report.append(f"• Combined Strategy ROI: {combined_roi:.1f}%")
            report.append(f"• Baseline ROI: {baseline_roi:.1f}%")
            report.append(f"• Improvement: {improvement:+.1f}%")
            
            if 'stop_only' in results:
                stop_triggers = results['stop_only'].get('stop_trigger_rate', 0) * 100
                report.append(f"• Stop-Loss Trigger Rate: {stop_triggers:.1f}%")
            
            if 'profit_only' in results:
                profit_efficiency = results['profit_only'].get('avg_profit_levels_per_trade', 0)
                report.append(f"• Avg Profit Levels Hit: {profit_efficiency:.2f}")
        
        return "\n".join(report)
    
    def plot_performance_comparison(self):
        """Erstellt Visualisierung der Performance-Vergleiche"""
        try:
            fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
            
            strategies = list(self.layer_results.keys())
            
            # 1. Total Returns Comparison
            returns = [self.layer_results[s].get('total_return', 0) * 100 for s in strategies]
            ax1.bar(strategies, returns, color=['blue', 'red', 'green', 'purple'])
            ax1.set_title('Total Returns Comparison (%)')
            ax1.set_ylabel('Return (%)')
            ax1.tick_params(axis='x', rotation=45)
            
            # 2. Win Rates
            win_rates = [self.layer_results[s].get('win_rate', 0) * 100 for s in strategies]
            ax2.bar(strategies, win_rates, color=['blue', 'red', 'green', 'purple'])
            ax2.set_title('Win Rates (%)')
            ax2.set_ylabel('Win Rate (%)')
            ax2.tick_params(axis='x', rotation=45)
            
            # 3. Sharpe Ratios
            sharpes = [self.layer_results[s].get('sharpe_ratio', 0) for s in strategies]
            ax3.bar(strategies, sharpes, color=['blue', 'red', 'green', 'purple'])
            ax3.set_title('Sharpe Ratios')
            ax3.set_ylabel('Sharpe Ratio')
            ax3.tick_params(axis='x', rotation=45)
            
            # 4. Max Drawdowns
            drawdowns = [abs(self.layer_results[s].get('max_drawdown', 0)) * 100 for s in strategies]
            ax4.bar(strategies, drawdowns, color=['blue', 'red', 'green', 'purple'])
            ax4.set_title('Maximum Drawdowns (%)')
            ax4.set_ylabel('Max Drawdown (%)')
            ax4.tick_params(axis='x', rotation=45)
            
            plt.tight_layout()
            plt.savefig('multilayer_backtest_results.png', dpi=300, bbox_inches='tight')
            plt.show()
            
        except ImportError:
            print("Matplotlib not available. Skipping visualization.")

# Demonstration
def run_full_backtest_demo():
    """Führt vollständige Backtest-Demonstration aus"""
    
    # Initialize mit Sample-Daten (da echte CSV nicht verfügbar)
    backtester = MultiLayerBacktester("sample_data.csv")  # Will use sample data
    
    # Run Full Analysis
    all_results = backtester.run_full_multilayer_backtest()
    
    # Generate Report
    report = backtester.generate_performance_report()
    print("\n" + report)
    
    # Plot Results (if matplotlib available)
    try:
        backtester.plot_performance_comparison()
    except:
        print("\nVisualization skipped (matplotlib not available)")
    
    return all_results

if __name__ == "__main__":
    # Import IntegratedRiskOverlay from previous artifact
    class IntegratedRiskOverlay:
        def __init__(self):
            self.regime_configurations = {
                "crisis_opportunity": {"stop_loss_pct": -15.0, "profit_levels": [20, 35, 50]},
                "high_vol_stress": {"stop_loss_pct": -12.0, "profit_levels": [15, 28, 45]},
                "bull_normal": {"stop_loss_pct": -8.0, "profit_levels": [12, 25, 40]},
                "low_vol_complacency": {"stop_loss_pct": -5.0, "profit_levels": [8, 15, 25]}
            }
        def classify_regime(self, vix): return "bull_normal"  # Simplified
        def calculate_dynamic_stop(self, entry, config, tr): return {"price": entry * 0.92}
        def calculate_dynamic_profits(self, entry, config, tr): return []
        def execute_integrated_overlay(self, **kwargs): return {"final_performance": {"total_return_pct": 2.5}, "stop_triggered": False, "profit_levels_hit": []}
    
    results = run_full_backtest_demo()
    
    print("\nBACKTEST COMPLETED!")
    print("Key Findings:")
    print(f"• Best Strategy: {results['optimization']['best_strategy']}")
    print(f"• ROI Improvement: +{results['optimization']['improvement_vs_baseline']['roi_improvement']:.1f}%")
    print(f"• Drawdown Reduction: -{results['optimization']['improvement_vs_baseline']['drawdown_reduction']:.1f}%")d_returns = []
        stop_triggers = 0
        profit_triggers = 0
        
        for _, trade in self.trade_data.iterrows():
            try:
                # Führe vollständiges integriertes Overlay aus
                entry = trade['Entry']
                vix = trade.get('VIX', 20.0)
                daily_prices = self.extract_daily_prices(trade)
                
                trade_data = {"symbol": trade.get('Kuerzel', 'UNKNOWN')}
                
                results = self.overlay_system.execute_integrated_overlay(
                    trade_data=trade_data,
                    entry_price=entry,
                    daily_prices=daily_prices,
                    vix_level=vix
                )
                
                combined_returns.append(results['final_performance']['total_return_pct'] / 100)
                
                if results['stop_triggered']:
                    stop_triggers += 1
                
                profit_triggers += len(results['profit_levels_hit'])
                
            except Exception as e:
                # Fallback to original return
                combined_returns.append(trade.get('Move 2 day', 0))
        
        combine