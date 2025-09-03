#!/usr/bin/env python3
"""
BIDBACK Trading Tool - Comprehensive Performance Tests
Load testing, stress testing, and performance benchmarking
"""

import requests
import json
import time
import threading
import concurrent.futures
from datetime import datetime
from typing import Dict, List, Any, Tuple
import logging
import statistics
import sqlite3

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PerformanceTester:
    """Comprehensive performance testing suite"""
    
    def __init__(self):
        self.backend_url = "http://localhost:3001"
        self.database_path = "src/database/trading.db"
        self.results = {}
    
    def measure_response_time(self, func, *args, **kwargs) -> Tuple[Any, float]:
        """Measure response time of a function call"""
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        return result, (end_time - start_time) * 1000  # Convert to milliseconds
    
    def test_database_performance(self) -> Dict[str, Any]:
        """Test SQLite database performance with complex queries"""
        logger.info("Testing database performance...")
        
        results = {
            "test_name": "Database Performance Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Test various query performance
            queries_to_test = [
                ("Simple Select", "SELECT COUNT(*) FROM market_breadth_daily"),
                ("Date Range Query", "SELECT * FROM market_breadth_daily WHERE date >= '2024-01-01' LIMIT 100"),
                ("Complex Aggregation", """
                    SELECT 
                        date,
                        AVG(true_range) as avg_tr,
                        AVG(t2108) as avg_t2108,
                        COUNT(*) as records
                    FROM market_breadth_daily 
                    WHERE date >= '2023-01-01' 
                    GROUP BY date 
                    ORDER BY date DESC 
                    LIMIT 50
                """),
                ("True Range Analysis", """
                    SELECT 
                        AVG(true_range) as avg_tr,
                        MIN(true_range) as min_tr,
                        MAX(true_range) as max_tr,
                        COUNT(*) as total_records
                    FROM market_breadth_daily 
                    WHERE true_range IS NOT NULL 
                    AND date >= '2023-01-01'
                """),
            ]
            
            query_results = {}
            for query_name, query in queries_to_test:
                start_time = time.time()
                cursor.execute(query)
                rows = cursor.fetchall()
                query_time = (time.time() - start_time) * 1000
                
                query_results[query_name] = {
                    "execution_time_ms": round(query_time, 2),
                    "rows_returned": len(rows),
                    "performance_rating": "Good" if query_time < 100 else "Slow" if query_time < 500 else "Poor"
                }
            
            results["details"]["query_performance"] = query_results
            
            # Test bulk operations
            start_time = time.time()
            cursor.execute("""
                SELECT date, true_range, t2108, sp_reference 
                FROM market_breadth_daily 
                WHERE date >= '2020-01-01' 
                ORDER BY date DESC 
                LIMIT 1000
            """)
            bulk_data = cursor.fetchall()
            bulk_time = (time.time() - start_time) * 1000
            
            results["details"]["bulk_operation"] = {
                "records_fetched": len(bulk_data),
                "fetch_time_ms": round(bulk_time, 2),
                "records_per_second": round(len(bulk_data) / (bulk_time / 1000), 2) if bulk_time > 0 else 0
            }
            
            conn.close()
            
            logger.info(f"Database performance test completed - avg query time: {statistics.mean([q['execution_time_ms'] for q in query_results.values()]):.2f}ms")
            
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
        
        return results
    
    def test_concurrent_api_calls(self) -> Dict[str, Any]:
        """Test API performance under concurrent load"""
        logger.info("Testing concurrent API performance...")
        
        results = {
            "test_name": "Concurrent API Load Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        def make_api_call(endpoint: str) -> Tuple[int, float]:
            """Make a single API call and measure response time"""
            try:
                start_time = time.time()
                response = requests.get(f"{self.backend_url}{endpoint}", timeout=10)
                response_time = (time.time() - start_time) * 1000
                return response.status_code, response_time
            except Exception as e:
                return 500, 0.0
        
        # Test endpoints under concurrent load
        endpoints_to_test = [
            "/health",
            "/positions",
            "/performance",
            "/breadth/latest",
            "/breadth/summary"
        ]
        
        concurrent_levels = [1, 5, 10, 20]
        endpoint_results = {}
        
        for endpoint in endpoints_to_test:
            endpoint_results[endpoint] = {}
            
            for concurrency in concurrent_levels:
                response_times = []
                status_codes = []
                
                with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
                    # Submit concurrent requests
                    futures = [executor.submit(make_api_call, endpoint) for _ in range(concurrency)]
                    
                    # Collect results
                    for future in concurrent.futures.as_completed(futures, timeout=30):
                        status_code, response_time = future.result()
                        status_codes.append(status_code)
                        response_times.append(response_time)
                
                if response_times:
                    endpoint_results[endpoint][f"{concurrency}_concurrent"] = {
                        "avg_response_time_ms": round(statistics.mean(response_times), 2),
                        "max_response_time_ms": round(max(response_times), 2),
                        "min_response_time_ms": round(min(response_times), 2),
                        "success_rate": len([sc for sc in status_codes if sc == 200]) / len(status_codes) * 100,
                        "requests_per_second": round(concurrency / (max(response_times) / 1000), 2) if max(response_times) > 0 else 0
                    }
        
        results["details"]["endpoint_performance"] = endpoint_results
        
        # Calculate overall performance metrics
        all_response_times = []
        for endpoint_data in endpoint_results.values():
            for concurrency_data in endpoint_data.values():
                all_response_times.append(concurrency_data["avg_response_time_ms"])
        
        if all_response_times:
            results["details"]["overall_metrics"] = {
                "avg_response_time_ms": round(statistics.mean(all_response_times), 2),
                "max_avg_response_time_ms": round(max(all_response_times), 2),
                "performance_under_load": "Good" if max(all_response_times) < 200 else "Acceptable" if max(all_response_times) < 500 else "Poor"
            }
        
        logger.info(f"Concurrent load test completed - max avg response: {max(all_response_times):.2f}ms")
        
        return results
    
    def test_risk_management_performance(self) -> Dict[str, Any]:
        """Test risk management calculation performance"""
        logger.info("Testing risk management calculation performance...")
        
        results = {
            "test_name": "Risk Management Performance Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        # Test data scenarios with varying complexity
        test_scenarios = [
            {
                "name": "Simple Bull Market",
                "data": {"symbol": "PERF1", "entry_price": 100.0, "market_data": {"vix": 15.0, "t2108": 80.0, "momentum_ratio": 1.2, "true_range": 2.0}}
            },
            {
                "name": "High Volatility Crisis",
                "data": {"symbol": "PERF2", "entry_price": 150.0, "market_data": {"vix": 50.0, "t2108": 20.0, "momentum_ratio": 0.7, "true_range": 8.5}}
            },
            {
                "name": "Neutral Market",
                "data": {"symbol": "PERF3", "entry_price": 200.0, "market_data": {"vix": 22.0, "t2108": 55.0, "momentum_ratio": 1.05, "true_range": 3.2}}
            },
        ]
        
        scenario_performance = {}
        
        for scenario in test_scenarios:
            scenario_name = scenario["name"]
            test_data = scenario["data"]
            test_data["position_size"] = 50.0
            
            # Test position opening performance
            start_time = time.time()
            open_response = requests.post(
                f"{self.backend_url}/positions/open",
                json=test_data,
                timeout=10
            )
            open_time = (time.time() - start_time) * 1000
            
            scenario_result = {
                "open_time_ms": round(open_time, 2),
                "open_success": open_response.status_code == 200
            }
            
            if open_response.status_code == 200:
                # Test position updates
                update_times = []
                for i in range(5):  # Test 5 updates
                    update_data = {
                        "symbol": test_data["symbol"],
                        "current_price_data": {
                            "high": test_data["entry_price"] + (i * 2),
                            "low": test_data["entry_price"] - (i * 1.5),
                            "close": test_data["entry_price"] + (i * 0.5)
                        },
                        "market_data": test_data["market_data"]
                    }
                    
                    start_time = time.time()
                    update_response = requests.put(
                        f"{self.backend_url}/positions/update",
                        json=update_data,
                        timeout=10
                    )
                    update_time = (time.time() - start_time) * 1000
                    
                    if update_response.status_code == 200:
                        update_times.append(update_time)
                
                if update_times:
                    scenario_result["avg_update_time_ms"] = round(statistics.mean(update_times), 2)
                    scenario_result["max_update_time_ms"] = round(max(update_times), 2)
                    scenario_result["total_calculation_time_ms"] = round(open_time + sum(update_times), 2)
            
            scenario_performance[scenario_name] = scenario_result
        
        results["details"]["scenario_performance"] = scenario_performance
        
        # Calculate overall performance
        all_open_times = [sp["open_time_ms"] for sp in scenario_performance.values() if "open_time_ms" in sp]
        all_update_times = [sp["avg_update_time_ms"] for sp in scenario_performance.values() if "avg_update_time_ms" in sp]
        
        if all_open_times:
            results["details"]["performance_summary"] = {
                "avg_position_open_ms": round(statistics.mean(all_open_times), 2),
                "max_position_open_ms": round(max(all_open_times), 2),
                "avg_position_update_ms": round(statistics.mean(all_update_times), 2) if all_update_times else 0,
                "calculation_performance": "Excellent" if max(all_open_times) < 10 else "Good" if max(all_open_times) < 50 else "Acceptable"
            }
        
        logger.info(f"Risk management performance test completed - avg open time: {statistics.mean(all_open_times):.2f}ms")
        
        return results
    
    def test_memory_and_resource_usage(self) -> Dict[str, Any]:
        """Test system resource usage during intensive operations"""
        logger.info("Testing memory and resource usage...")
        
        results = {
            "test_name": "Memory and Resource Usage Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        try:
            # Test intensive database operations
            start_time = time.time()
            
            # Make many rapid API calls to stress test
            rapid_calls = []
            for i in range(100):  # 100 rapid calls
                call_start = time.time()
                response = requests.get(f"{self.backend_url}/breadth/latest", timeout=5)
                call_time = (time.time() - call_start) * 1000
                rapid_calls.append({
                    "call_number": i + 1,
                    "response_time_ms": call_time,
                    "success": response.status_code == 200
                })
            
            total_test_time = (time.time() - start_time) * 1000
            
            # Analyze performance degradation
            first_10_calls = rapid_calls[:10]
            last_10_calls = rapid_calls[-10:]
            
            avg_first_10 = statistics.mean([call["response_time_ms"] for call in first_10_calls])
            avg_last_10 = statistics.mean([call["response_time_ms"] for call in last_10_calls])
            
            results["details"] = {
                "total_rapid_calls": len(rapid_calls),
                "total_test_time_ms": round(total_test_time, 2),
                "successful_calls": len([call for call in rapid_calls if call["success"]]),
                "success_rate": len([call for call in rapid_calls if call["success"]]) / len(rapid_calls) * 100,
                "avg_response_time_ms": round(statistics.mean([call["response_time_ms"] for call in rapid_calls]), 2),
                "first_10_calls_avg_ms": round(avg_first_10, 2),
                "last_10_calls_avg_ms": round(avg_last_10, 2),
                "performance_degradation_pct": round(((avg_last_10 - avg_first_10) / avg_first_10) * 100, 2) if avg_first_10 > 0 else 0,
                "calls_per_second": round(len(rapid_calls) / (total_test_time / 1000), 2),
                "memory_stability": "Good" if abs(avg_last_10 - avg_first_10) < 10 else "Concerning"
            }
            
            logger.info(f"Resource usage test completed - {results['details']['calls_per_second']} calls/sec")
            
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
        
        return results
    
    def test_error_handling_performance(self) -> Dict[str, Any]:
        """Test error handling and recovery performance"""
        logger.info("Testing error handling performance...")
        
        results = {
            "test_name": "Error Handling Performance Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        try:
            # Test various error scenarios
            error_scenarios = [
                {
                    "name": "Invalid Position Data",
                    "endpoint": "/positions/open",
                    "method": "POST",
                    "data": {"symbol": "INVALID", "entry_price": -100, "market_data": {"vix": "invalid"}}
                },
                {
                    "name": "Non-existent Position Update",
                    "endpoint": "/positions/update",
                    "method": "PUT",
                    "data": {"symbol": "NONEXISTENT", "current_price_data": {"close": 100}, "market_data": {"vix": 20}}
                },
                {
                    "name": "Invalid Date Range",
                    "endpoint": "/breadth/historical?start_date=invalid&end_date=also_invalid",
                    "method": "GET",
                    "data": None
                }
            ]
            
            error_handling_results = {}
            
            for scenario in error_scenarios:
                start_time = time.time()
                
                if scenario["method"] == "POST":
                    response = requests.post(f"{self.backend_url}{scenario['endpoint']}", json=scenario["data"], timeout=5)
                elif scenario["method"] == "PUT":
                    response = requests.put(f"{self.backend_url}{scenario['endpoint']}", json=scenario["data"], timeout=5)
                else:  # GET
                    response = requests.get(f"{self.backend_url}{scenario['endpoint']}", timeout=5)
                
                response_time = (time.time() - start_time) * 1000
                
                error_handling_results[scenario["name"]] = {
                    "response_time_ms": round(response_time, 2),
                    "status_code": response.status_code,
                    "handled_gracefully": 400 <= response.status_code < 500,
                    "response_contains_error": "error" in response.text.lower()
                }
            
            results["details"]["error_scenarios"] = error_handling_results
            
            # Test recovery after errors
            recovery_start = time.time()
            recovery_response = requests.get(f"{self.backend_url}/health", timeout=5)
            recovery_time = (time.time() - recovery_start) * 1000
            
            results["details"]["error_recovery"] = {
                "recovery_time_ms": round(recovery_time, 2),
                "system_recovered": recovery_response.status_code == 200,
                "recovery_performance": "Fast" if recovery_time < 50 else "Slow"
            }
            
            logger.info(f"Error handling test completed - system recovery: {results['details']['error_recovery']['system_recovered']}")
            
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
        
        return results
    
    def run_comprehensive_performance_tests(self) -> Dict[str, Any]:
        """Run all performance tests"""
        logger.info("Starting comprehensive performance tests...")
        
        test_suite = {
            "test_run_timestamp": datetime.now().isoformat(),
            "system_info": {
                "backend_url": self.backend_url,
                "database_path": self.database_path
            },
            "tests": {},
            "overall_status": "PASSED",
            "performance_summary": {},
            "summary": {}
        }
        
        # Run all performance tests
        tests_to_run = [
            self.test_database_performance,
            self.test_concurrent_api_calls,
            self.test_risk_management_performance,
            self.test_memory_and_resource_usage,
            self.test_error_handling_performance
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
        
        # Generate performance summary
        performance_metrics = {}
        
        # Extract key performance metrics
        if "Database Performance Test" in test_suite["tests"]:
            db_test = test_suite["tests"]["Database Performance Test"]
            if "details" in db_test and "query_performance" in db_test["details"]:
                avg_query_time = statistics.mean([q["execution_time_ms"] for q in db_test["details"]["query_performance"].values()])
                performance_metrics["avg_database_query_ms"] = round(avg_query_time, 2)
        
        if "Risk Management Performance Test" in test_suite["tests"]:
            rm_test = test_suite["tests"]["Risk Management Performance Test"]
            if "details" in rm_test and "performance_summary" in rm_test["details"]:
                performance_metrics["avg_position_calculation_ms"] = rm_test["details"]["performance_summary"].get("avg_position_open_ms", 0)
        
        test_suite["performance_summary"] = performance_metrics
        
        # Summary
        test_suite["summary"] = {
            "total_tests": passed_tests + failed_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": round(passed_tests / (passed_tests + failed_tests) * 100, 1) if (passed_tests + failed_tests) > 0 else 0,
            "system_performance_rating": self._calculate_performance_rating(performance_metrics)
        }
        
        logger.info(f"Performance test suite completed: {passed_tests}/{passed_tests + failed_tests} tests passed")
        return test_suite
    
    def _calculate_performance_rating(self, metrics: Dict[str, float]) -> str:
        """Calculate overall system performance rating"""
        if not metrics:
            return "Unknown"
        
        # Define performance thresholds
        db_threshold = 100  # ms
        calc_threshold = 50  # ms
        
        db_performance = metrics.get("avg_database_query_ms", 0)
        calc_performance = metrics.get("avg_position_calculation_ms", 0)
        
        if db_performance < db_threshold and calc_performance < calc_threshold:
            return "Excellent"
        elif db_performance < db_threshold * 2 and calc_performance < calc_threshold * 2:
            return "Good"
        elif db_performance < db_threshold * 5 and calc_performance < calc_threshold * 5:
            return "Acceptable"
        else:
            return "Needs Improvement"

def main():
    """Main performance test runner"""
    print("="*80)
    print("BIDBACK Trading Tool - Comprehensive Performance Tests")
    print("="*80)
    
    tester = PerformanceTester()
    
    # Run comprehensive performance tests
    results = tester.run_comprehensive_performance_tests()
    
    # Save results to file
    results_file = f"performance_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Print summary
    print("\n" + "="*80)
    print("PERFORMANCE TEST RESULTS")
    print("="*80)
    print(f"Overall Status: {results['overall_status']}")
    print(f"Tests Passed: {results['summary']['passed_tests']}")
    print(f"Tests Failed: {results['summary']['failed_tests']}")
    print(f"Success Rate: {results['summary']['success_rate']}%")
    print(f"System Performance Rating: {results['summary']['system_performance_rating']}")
    
    if results['performance_summary']:
        print(f"\nKey Performance Metrics:")
        for metric, value in results['performance_summary'].items():
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