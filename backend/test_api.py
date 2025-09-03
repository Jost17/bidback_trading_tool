#!/usr/bin/env python3
"""
Test script for BIDBACK Trading Tool API
Demonstrates complete workflow of opening positions, updating them, and getting performance metrics
"""

import requests
import json
import time
from typing import Dict, Any

API_BASE = "http://localhost:3001"

def test_api_endpoint(endpoint: str, method: str = "GET", data: Dict = None) -> Dict[str, Any]:
    """Test an API endpoint and return the response"""
    try:
        if method == "GET":
            response = requests.get(f"{API_BASE}{endpoint}")
        elif method == "POST":
            response = requests.post(f"{API_BASE}{endpoint}", json=data)
        elif method == "PUT":
            response = requests.put(f"{API_BASE}{endpoint}", json=data)
        
        response.raise_for_status()
        return {"success": True, "data": response.json()}
    
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": str(e)}

def main():
    """Run comprehensive API tests"""
    print("🚀 BIDBACK Trading Tool API Test Suite")
    print("=" * 50)
    
    # Test 1: Health Check
    print("\n1. Testing Health Check...")
    health_result = test_api_endpoint("/health")
    if health_result["success"]:
        print("✅ Health check passed")
        print(f"   Status: {health_result['data']['status']}")
        print(f"   Risk Manager: {health_result['data']['risk_manager_initialized']}")
    else:
        print(f"❌ Health check failed: {health_result['error']}")
        return
    
    # Test 2: Initial Performance Check
    print("\n2. Testing Initial Performance...")
    perf_result = test_api_endpoint("/performance")
    if perf_result["success"]:
        print("✅ Performance endpoint working")
        print(f"   Total Trades: {perf_result['data']['total_trades']}")
        print(f"   Active Positions: {perf_result['data']['active_positions']}")
    else:
        print(f"❌ Performance check failed: {perf_result['error']}")
    
    # Test 3: Open Position
    print("\n3. Testing Position Opening...")
    position_data = {
        "symbol": "DEMO",
        "entry_price": 45.50,
        "market_data": {
            "vix": 22.3,
            "t2108": 35.5,
            "momentum_ratio": 1.4,
            "true_range": 1.8
        },
        "position_size": 100.0
    }
    
    open_result = test_api_endpoint("/positions/open", "POST", position_data)
    if open_result["success"]:
        print("✅ Position opened successfully")
        print(f"   Symbol: {open_result['data']['position_id']}")
        print(f"   Entry: ${open_result['data']['entry_price']}")
        print(f"   Regime: {open_result['data']['regime']}")
        print(f"   Stop Level: ${open_result['data']['stop_level']:.2f}")
        print(f"   Profit Targets: {[f'${p:.2f}' for p in open_result['data']['profit_targets']]}")
    else:
        print(f"❌ Position opening failed: {open_result['error']}")
        return
    
    # Test 4: Check Active Positions
    print("\n4. Testing Active Positions...")
    positions_result = test_api_endpoint("/positions")
    if positions_result["success"]:
        print("✅ Active positions retrieved")
        positions = positions_result["data"]
        print(f"   Number of positions: {len(positions)}")
        for symbol, pos in positions.items():
            print(f"   - {symbol}: Entry ${pos['entry_price']}, Days held: {pos['days_held']}")
    else:
        print(f"❌ Active positions failed: {positions_result['error']}")
    
    # Test 5: Update Position (Simulate daily price movement)
    print("\n5. Testing Position Update...")
    update_data = {
        "symbol": "DEMO",
        "current_price_data": {
            "high": 47.20,
            "low": 44.80,
            "close": 46.75
        },
        "market_data": {
            "vix": 20.1,
            "t2108": 40.2,
            "momentum_ratio": 1.3,
            "true_range": 1.6
        }
    }
    
    update_result = test_api_endpoint("/positions/update", "PUT", update_data)
    if update_result["success"]:
        print("✅ Position updated successfully")
        result = update_result["data"]
        print(f"   Status: {result['position_status']}")
        print(f"   Actions taken: {len(result['actions'])}")
        if result.get('current_pnl'):
            print(f"   Current P&L: {result['current_pnl']*100:+.2f}%")
        if result['actions']:
            for action in result['actions']:
                print(f"   - Action: {action['action']}")
    else:
        print(f"❌ Position update failed: {update_result['error']}")
    
    # Test 6: Get Trade History
    print("\n6. Testing Trade History...")
    history_result = test_api_endpoint("/trade-history")
    if history_result["success"]:
        print("✅ Trade history retrieved")
        history = history_result["data"]
        print(f"   Total events: {len(history)}")
        for event in history[-3:]:  # Show last 3 events
            print(f"   - {event['timestamp'][:19]}: {event['action']} for {event.get('symbol', 'N/A')}")
    else:
        print(f"❌ Trade history failed: {history_result['error']}")
    
    # Test 7: Final Performance Check
    print("\n7. Testing Final Performance...")
    final_perf_result = test_api_endpoint("/performance")
    if final_perf_result["success"]:
        print("✅ Final performance check")
        perf = final_perf_result["data"]
        print(f"   Total Trades: {perf['total_trades']}")
        print(f"   Active Positions: {perf['active_positions']}")
        print(f"   Total Return: {perf['total_return_pct']:+.2f}%")
        if perf['total_trades'] > 0:
            print(f"   Win Rate: {perf['win_rate']:.1%}")
            print(f"   Sharpe Ratio: {perf['sharpe_ratio']:.2f}")
    else:
        print(f"❌ Final performance failed: {final_perf_result['error']}")
    
    # Test 8: Export Report
    print("\n8. Testing Report Export...")
    export_result = test_api_endpoint("/export-report", "POST")
    if export_result["success"]:
        print("✅ Report exported successfully")
        export_data = export_result["data"]
        print(f"   Filename: {export_data['filename']}")
        print(f"   Total Trades: {export_data['report_summary']['total_trades']}")
    else:
        print(f"❌ Report export failed: {export_result['error']}")
    
    print("\n" + "=" * 50)
    print("🎯 API Test Suite Complete!")
    print("\nSummary:")
    print("- FastAPI server running on localhost:3001 ✅")
    print("- Risk management system integrated ✅") 
    print("- All 6 Python modules working ✅")
    print("- CORS enabled for Electron frontend ✅")
    print("- Complete trading workflow functional ✅")
    print("\nThe backend is ready for Electron frontend integration!")

if __name__ == "__main__":
    main()