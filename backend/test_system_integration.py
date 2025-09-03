#!/usr/bin/env python3
"""
BIDBACK Trading Tool - System Integration Tests
Comprehensive testing suite for Phase 5 system integration testing
"""

import requests
import json
import time
import sqlite3
from datetime import datetime
from typing import Dict, List, Any
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SystemIntegrationTester:
    """Comprehensive system integration testing suite"""
    
    def __init__(self):
        self.backend_url = "http://localhost:3001"
        self.database_path = "src/database/trading.db"
        self.test_results = {}
        self.performance_metrics = {}
    
    def test_database_connection(self) -> Dict[str, Any]:
        """Test SQLite database connection and data availability"""
        logger.info("Testing database connection and data availability...")
        
        results = {
            "test_name": "Database Connection Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        try:
            # Test database file exists
            db_path = Path(self.database_path)
            if not db_path.exists():
                results["status"] = "FAILED"
                results["errors"].append(f"Database file not found: {db_path}")
                return results
            
            # Test database connection
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            # Test market breadth data availability
            cursor.execute("""
                SELECT COUNT(*) as total_records,
                       MIN(date) as earliest_date,
                       MAX(date) as latest_date,
                       COUNT(CASE WHEN t2108 IS NOT NULL THEN 1 END) as t2108_records,
                       COUNT(CASE WHEN true_range IS NOT NULL THEN 1 END) as true_range_records
                FROM market_breadth_daily
                WHERE date >= '2007-01-01'
            """)
            
            row = cursor.fetchone()
            results["details"] = {
                "total_records": row[0],
                "date_range": f"{row[1]} to {row[2]}",
                "t2108_coverage": f"{row[3]} records ({row[3]/row[0]*100:.1f}%)",
                "true_range_coverage": f"{row[4]} records ({row[4]/row[0]*100:.1f}%)",
                "database_size_mb": round(db_path.stat().st_size / (1024*1024), 2)
            }
            
            # Test recent data availability (last 30 days)
            cursor.execute("""
                SELECT COUNT(*) as recent_records
                FROM market_breadth_daily
                WHERE date >= date('now', '-30 days')
            """)
            
            recent_count = cursor.fetchone()[0]
            results["details"]["recent_data_count"] = recent_count
            
            conn.close()
            
            logger.info(f"Database test passed: {results['details']['total_records']} total records")
            
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
            logger.error(f"Database test failed: {e}")
        
        return results
    
    def test_backend_startup(self) -> Dict[str, Any]:
        """Test if Python FastAPI backend starts and responds"""
        logger.info("Testing backend startup and health check...")
        
        results = {
            "test_name": "Backend Startup Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        try:
            start_time = time.time()
            
            # Test health endpoint
            response = requests.get(f"{self.backend_url}/health", timeout=10)
            
            response_time = time.time() - start_time
            self.performance_metrics["health_check_ms"] = round(response_time * 1000, 2)
            
            if response.status_code == 200:
                health_data = response.json()
                results["details"] = {
                    "status_code": response.status_code,
                    "response_time_ms": round(response_time * 1000, 2),
                    "backend_status": health_data.get("status"),
                    "risk_manager_initialized": health_data.get("risk_manager_initialized"),
                    "active_positions": health_data.get("active_positions"),
                    "backend_version": health_data.get("backend_version")
                }
                logger.info(f"Backend health check passed in {response_time*1000:.2f}ms")
            else:
                results["status"] = "FAILED"
                results["errors"].append(f"Health check failed with status {response.status_code}")
        
        except requests.exceptions.ConnectionError:
            results["status"] = "FAILED"
            results["errors"].append("Backend not running - connection refused")
            logger.error("Backend not running on port 3001")
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
            logger.error(f"Backend startup test failed: {e}")
        
        return results
    
    def test_api_endpoints(self) -> Dict[str, Any]:
        """Test all major API endpoints"""
        logger.info("Testing API endpoints...")
        
        results = {
            "test_name": "API Endpoints Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        endpoints_to_test = [
            ("/", "GET", "Root endpoint"),
            ("/health", "GET", "Health check"),
            ("/positions", "GET", "Get positions"),
            ("/performance", "GET", "Get performance"),
            ("/trade-history", "GET", "Trade history"),
            ("/breadth/summary", "GET", "Breadth summary"),
            ("/breadth/latest", "GET", "Latest breadth"),
        ]
        
        endpoint_results = {}
        
        for endpoint, method, description in endpoints_to_test:
            try:
                start_time = time.time()
                response = requests.get(f"{self.backend_url}{endpoint}", timeout=5)
                response_time = time.time() - start_time
                
                endpoint_results[endpoint] = {
                    "status_code": response.status_code,
                    "response_time_ms": round(response_time * 1000, 2),
                    "description": description,
                    "success": response.status_code < 400
                }
                
                if response.status_code >= 400:
                    results["errors"].append(f"{endpoint}: HTTP {response.status_code}")
                
            except Exception as e:
                endpoint_results[endpoint] = {
                    "status_code": "ERROR",
                    "error": str(e),
                    "description": description,
                    "success": False
                }
                results["errors"].append(f"{endpoint}: {str(e)}")
        
        results["details"]["endpoints"] = endpoint_results
        
        # Check if any endpoints failed
        failed_endpoints = [ep for ep, data in endpoint_results.items() if not data["success"]]
        if failed_endpoints:
            results["status"] = "FAILED"
            logger.error(f"Failed endpoints: {failed_endpoints}")
        else:
            logger.info(f"All {len(endpoints_to_test)} endpoints responded successfully")
        
        return results
    
    def test_risk_management_calculation(self) -> Dict[str, Any]:
        """Test risk management calculations with sample data"""
        logger.info("Testing risk management calculations...")
        
        results = {
            "test_name": "Risk Management Calculation Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        # Test data for AAPL position
        test_position = {
            "symbol": "AAPL",
            "entry_price": 150.00,
            "position_size": 50.0,
            "market_data": {
                "vix": 20.5,
                "t2108": 45.2,
                "momentum_ratio": 1.15,
                "true_range": 3.25
            }
        }
        
        try:
            start_time = time.time()
            
            # Test opening a position
            response = requests.post(
                f"{self.backend_url}/positions/open",
                json=test_position,
                timeout=10
            )
            
            response_time = time.time() - start_time
            self.performance_metrics["position_open_ms"] = round(response_time * 1000, 2)
            
            if response.status_code == 200:
                position_data = response.json()
                results["details"] = {
                    "position_opened": True,
                    "response_time_ms": round(response_time * 1000, 2),
                    "position_id": position_data.get("position_id"),
                    "regime": position_data.get("regime"),
                    "stop_level": position_data.get("stop_level"),
                    "stop_distance_pct": position_data.get("stop_distance_pct"),
                    "profit_targets": position_data.get("profit_targets"),
                    "expected_hold_days": position_data.get("expected_hold_days")
                }
                
                # Test position update
                update_data = {
                    "symbol": "AAPL",
                    "current_price_data": {
                        "high": 152.50,
                        "low": 148.75,
                        "close": 151.20
                    },
                    "market_data": test_position["market_data"]
                }
                
                update_response = requests.put(
                    f"{self.backend_url}/positions/update",
                    json=update_data,
                    timeout=10
                )
                
                if update_response.status_code == 200:
                    update_result = update_response.json()
                    results["details"]["position_updated"] = True
                    results["details"]["update_actions"] = update_result.get("actions", [])
                    results["details"]["position_status"] = update_result.get("position_status")
                else:
                    results["errors"].append(f"Position update failed: HTTP {update_response.status_code}")
                
                logger.info(f"Risk management test passed - regime: {position_data.get('regime')}")
                
            else:
                results["status"] = "FAILED"
                results["errors"].append(f"Position opening failed: HTTP {response.status_code}")
                if response.text:
                    results["errors"].append(response.text)
        
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
            logger.error(f"Risk management calculation test failed: {e}")
        
        return results
    
    def test_market_regime_detection(self) -> Dict[str, Any]:
        """Test market regime detection with historical data"""
        logger.info("Testing market regime detection...")
        
        results = {
            "test_name": "Market Regime Detection Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        try:
            # Test different market conditions
            test_scenarios = [
                {
                    "name": "High Volatility Crisis",
                    "data": {"vix": 45.0, "t2108": 15.0, "momentum_ratio": 0.75, "true_range": 8.5}
                },
                {
                    "name": "Low Volatility Bull Market",
                    "data": {"vix": 12.5, "t2108": 85.0, "momentum_ratio": 1.35, "true_range": 1.2}
                },
                {
                    "name": "Medium Volatility Neutral",
                    "data": {"vix": 22.0, "t2108": 50.0, "momentum_ratio": 1.05, "true_range": 2.8}
                }
            ]
            
            regime_results = {}
            
            for scenario in test_scenarios:
                test_position = {
                    "symbol": "TEST",
                    "entry_price": 100.00,
                    "position_size": 25.0,
                    "market_data": scenario["data"]
                }
                
                response = requests.post(
                    f"{self.backend_url}/positions/open",
                    json=test_position,
                    timeout=10
                )
                
                if response.status_code == 200:
                    position_data = response.json()
                    regime_results[scenario["name"]] = {
                        "regime": position_data.get("regime"),
                        "stop_distance_pct": position_data.get("stop_distance_pct"),
                        "expected_hold_days": position_data.get("expected_hold_days"),
                        "regime_transition_detected": position_data.get("regime_transition_detected")
                    }
                else:
                    regime_results[scenario["name"]] = {"error": f"HTTP {response.status_code}"}
            
            results["details"]["regime_scenarios"] = regime_results
            
            # Validate different regimes were detected
            detected_regimes = set()
            for scenario, data in regime_results.items():
                if "regime" in data:
                    detected_regimes.add(data["regime"])
            
            results["details"]["unique_regimes_detected"] = list(detected_regimes)
            
            if len(detected_regimes) < 2:
                results["errors"].append("Regime detection may not be working - all scenarios returned same regime")
            
            logger.info(f"Regime detection test: {len(detected_regimes)} unique regimes detected")
            
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
            logger.error(f"Market regime detection test failed: {e}")
        
        return results
    
    def test_performance_metrics(self) -> Dict[str, Any]:
        """Test performance response times and system load"""
        logger.info("Testing performance metrics...")
        
        results = {
            "test_name": "Performance Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        try:
            # Test multiple concurrent requests
            response_times = []
            concurrent_tests = 10
            
            for i in range(concurrent_tests):
                start_time = time.time()
                response = requests.get(f"{self.backend_url}/breadth/latest", timeout=5)
                response_time = time.time() - start_time
                response_times.append(response_time * 1000)
                
                if response.status_code != 200:
                    results["errors"].append(f"Request {i+1} failed: HTTP {response.status_code}")
            
            # Calculate performance metrics
            if response_times:
                avg_response_time = sum(response_times) / len(response_times)
                max_response_time = max(response_times)
                min_response_time = min(response_times)
                
                results["details"] = {
                    "concurrent_requests": concurrent_tests,
                    "avg_response_time_ms": round(avg_response_time, 2),
                    "max_response_time_ms": round(max_response_time, 2),
                    "min_response_time_ms": round(min_response_time, 2),
                    "all_requests_under_200ms": max_response_time < 200,
                    "all_requests_under_500ms": max_response_time < 500
                }
                
                # Add performance criteria
                if avg_response_time > 200:
                    results["errors"].append(f"Average response time too high: {avg_response_time:.2f}ms")
                
                if max_response_time > 500:
                    results["errors"].append(f"Max response time too high: {max_response_time:.2f}ms")
                
                logger.info(f"Performance test: avg {avg_response_time:.2f}ms, max {max_response_time:.2f}ms")
            
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
            logger.error(f"Performance test failed: {e}")
        
        return results
    
    def run_comprehensive_tests(self) -> Dict[str, Any]:
        """Run all system integration tests"""
        logger.info("Starting comprehensive system integration tests...")
        
        test_suite = {
            "test_run_timestamp": datetime.now().isoformat(),
            "backend_url": self.backend_url,
            "database_path": self.database_path,
            "tests": {},
            "performance_metrics": {},
            "overall_status": "PASSED",
            "summary": {}
        }
        
        # Run all tests
        tests_to_run = [
            self.test_database_connection,
            self.test_backend_startup,
            self.test_api_endpoints,
            self.test_risk_management_calculation,
            self.test_market_regime_detection,
            self.test_performance_metrics
        ]
        
        passed_tests = 0
        failed_tests = 0
        
        for test_func in tests_to_run:
            try:
                result = test_func()
                test_name = result["test_name"]
                test_suite["tests"][test_name] = result
                
                if result["status"] == "PASSED":
                    passed_tests += 1
                    logger.info(f"✓ {test_name} - PASSED")
                else:
                    failed_tests += 1
                    logger.error(f"✗ {test_name} - FAILED: {result['errors']}")
                    test_suite["overall_status"] = "FAILED"
                
            except Exception as e:
                failed_tests += 1
                test_suite["overall_status"] = "FAILED"
                logger.error(f"✗ Test execution failed: {e}")
        
        # Add performance metrics
        test_suite["performance_metrics"] = self.performance_metrics
        
        # Summary
        test_suite["summary"] = {
            "total_tests": passed_tests + failed_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": round(passed_tests / (passed_tests + failed_tests) * 100, 1) if (passed_tests + failed_tests) > 0 else 0
        }
        
        logger.info(f"Test suite completed: {passed_tests}/{passed_tests + failed_tests} tests passed")
        return test_suite

def main():
    """Main test runner function"""
    print("="*80)
    print("BIDBACK Trading Tool - System Integration Tests")
    print("="*80)
    
    tester = SystemIntegrationTester()
    
    # Run comprehensive tests
    results = tester.run_comprehensive_tests()
    
    # Save results to file
    results_file = f"integration_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Print summary
    print("\n" + "="*80)
    print("TEST RESULTS SUMMARY")
    print("="*80)
    print(f"Overall Status: {results['overall_status']}")
    print(f"Tests Passed: {results['summary']['passed_tests']}")
    print(f"Tests Failed: {results['summary']['failed_tests']}")
    print(f"Success Rate: {results['summary']['success_rate']}%")
    
    if results['performance_metrics']:
        print(f"\nKey Performance Metrics:")
        for metric, value in results['performance_metrics'].items():
            print(f"  {metric}: {value}")
    
    print(f"\nDetailed results saved to: {results_file}")
    
    # Print failed tests
    failed_tests = [name for name, test in results['tests'].items() if test['status'] == 'FAILED']
    if failed_tests:
        print(f"\nFailed Tests:")
        for test_name in failed_tests:
            print(f"  - {test_name}")
            for error in results['tests'][test_name]['errors']:
                print(f"    Error: {error}")
    
    print("="*80)
    
    return results['overall_status'] == 'PASSED'

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)