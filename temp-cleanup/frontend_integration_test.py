#!/usr/bin/env python3
"""
BIDBACK Trading Tool - Frontend Integration Tests
Test the connection between React frontend and Python backend
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FrontendIntegrationTester:
    """Frontend-Backend integration testing suite"""
    
    def __init__(self):
        self.frontend_url = "http://localhost:3000"
        self.backend_url = "http://localhost:3001"
        self.test_results = {}
    
    def test_frontend_accessibility(self) -> Dict[str, Any]:
        """Test if frontend is accessible"""
        logger.info("Testing frontend accessibility...")
        
        results = {
            "test_name": "Frontend Accessibility Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        try:
            response = requests.get(self.frontend_url, timeout=10)
            results["details"] = {
                "status_code": response.status_code,
                "content_length": len(response.content),
                "contains_react": "react" in response.text.lower(),
                "contains_vite": "vite" in response.text.lower()
            }
            
            if response.status_code == 200:
                logger.info("Frontend is accessible")
            else:
                results["status"] = "FAILED"
                results["errors"].append(f"Frontend returned status {response.status_code}")
        
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
            logger.error(f"Frontend accessibility test failed: {e}")
        
        return results
    
    def test_backend_frontend_connectivity(self) -> Dict[str, Any]:
        """Test if backend API endpoints are accessible from frontend context"""
        logger.info("Testing backend-frontend connectivity...")
        
        results = {
            "test_name": "Backend-Frontend Connectivity Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        # Test CORS and API accessibility
        try:
            # Simulate frontend API calls with CORS headers
            headers = {
                'Origin': self.frontend_url,
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type'
            }
            
            # Test preflight OPTIONS request
            options_response = requests.options(f"{self.backend_url}/health", headers=headers, timeout=5)
            
            # Test actual API call
            api_response = requests.get(f"{self.backend_url}/health", headers={'Origin': self.frontend_url}, timeout=5)
            
            results["details"] = {
                "preflight_status": options_response.status_code,
                "api_call_status": api_response.status_code,
                "cors_headers_present": 'Access-Control-Allow-Origin' in api_response.headers,
                "backend_response": api_response.json() if api_response.status_code == 200 else None
            }
            
            if api_response.status_code != 200:
                results["status"] = "FAILED"
                results["errors"].append(f"Backend API call failed: {api_response.status_code}")
            
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
        
        return results
    
    def test_risk_management_integration(self) -> Dict[str, Any]:
        """Test full risk management workflow from frontend perspective"""
        logger.info("Testing risk management integration...")
        
        results = {
            "test_name": "Risk Management Integration Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        try:
            # Simulate frontend creating a position
            position_data = {
                "symbol": "MSFT",
                "entry_price": 320.00,
                "position_size": 30.0,
                "market_data": {
                    "vix": 18.5,
                    "t2108": 65.0,
                    "momentum_ratio": 1.25,
                    "true_range": 4.8
                }
            }
            
            # Open position
            open_response = requests.post(
                f"{self.backend_url}/positions/open",
                json=position_data,
                headers={'Origin': self.frontend_url},
                timeout=10
            )
            
            if open_response.status_code == 200:
                position_result = open_response.json()
                
                # Get all positions (as frontend would)
                positions_response = requests.get(
                    f"{self.backend_url}/positions",
                    headers={'Origin': self.frontend_url},
                    timeout=5
                )
                
                # Get performance metrics
                performance_response = requests.get(
                    f"{self.backend_url}/performance",
                    headers={'Origin': self.frontend_url},
                    timeout=5
                )
                
                results["details"] = {
                    "position_opened": True,
                    "position_id": position_result.get("position_id"),
                    "calculated_regime": position_result.get("regime"),
                    "stop_level": position_result.get("stop_level"),
                    "profit_targets": position_result.get("profit_targets"),
                    "positions_retrieved": positions_response.status_code == 200,
                    "performance_retrieved": performance_response.status_code == 200,
                    "active_positions_count": len(positions_response.json()) if positions_response.status_code == 200 else 0
                }
                
                logger.info(f"Integration test passed - regime: {position_result.get('regime')}")
                
            else:
                results["status"] = "FAILED"
                results["errors"].append(f"Position opening failed: {open_response.status_code}")
                if open_response.text:
                    results["errors"].append(open_response.text)
        
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
        
        return results
    
    def test_market_breadth_data_flow(self) -> Dict[str, Any]:
        """Test market breadth data flow from backend to frontend"""
        logger.info("Testing market breadth data flow...")
        
        results = {
            "test_name": "Market Breadth Data Flow Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        try:
            # Test breadth summary endpoint
            summary_response = requests.get(
                f"{self.backend_url}/breadth/summary",
                headers={'Origin': self.frontend_url},
                timeout=10
            )
            
            # Test latest breadth data
            latest_response = requests.get(
                f"{self.backend_url}/breadth/latest",
                headers={'Origin': self.frontend_url},
                timeout=10
            )
            
            # Test historical data with parameters
            historical_response = requests.get(
                f"{self.backend_url}/breadth/historical?start_date=2024-01-01&limit=50",
                headers={'Origin': self.frontend_url},
                timeout=10
            )
            
            if all(r.status_code == 200 for r in [summary_response, latest_response, historical_response]):
                summary_data = summary_response.json()
                latest_data = latest_response.json()
                historical_data = historical_response.json()
                
                results["details"] = {
                    "summary_retrieved": True,
                    "total_records": summary_data.get("total_records", 0),
                    "data_coverage": summary_data.get("has_data_percentage", {}),
                    "latest_data_date": latest_data.get("date"),
                    "latest_t2108": latest_data.get("t2108"),
                    "latest_true_range": latest_data.get("true_range"),
                    "historical_records_returned": len(historical_data),
                    "data_quality_acceptable": summary_data.get("total_records", 0) > 1000
                }
                
                logger.info(f"Market breadth data flow test passed - {summary_data.get('total_records')} total records")
            else:
                results["status"] = "FAILED"
                failed_endpoints = []
                if summary_response.status_code != 200:
                    failed_endpoints.append(f"summary: {summary_response.status_code}")
                if latest_response.status_code != 200:
                    failed_endpoints.append(f"latest: {latest_response.status_code}")
                if historical_response.status_code != 200:
                    failed_endpoints.append(f"historical: {historical_response.status_code}")
                results["errors"].append(f"Failed endpoints: {failed_endpoints}")
        
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
        
        return results
    
    def test_real_time_updates(self) -> Dict[str, Any]:
        """Test real-time update capabilities"""
        logger.info("Testing real-time updates...")
        
        results = {
            "test_name": "Real-time Updates Test",
            "status": "PASSED",
            "details": {},
            "errors": []
        }
        
        try:
            # Create a position and then update it multiple times
            position_data = {
                "symbol": "TSLA",
                "entry_price": 200.00,
                "position_size": 20.0,
                "market_data": {
                    "vix": 25.0,
                    "t2108": 40.0,
                    "momentum_ratio": 0.95,
                    "true_range": 6.2
                }
            }
            
            # Open position
            open_response = requests.post(
                f"{self.backend_url}/positions/open",
                json=position_data,
                headers={'Origin': self.frontend_url},
                timeout=10
            )
            
            if open_response.status_code == 200:
                # Simulate real-time price updates
                update_scenarios = [
                    {"close": 202.50, "expected": "small_profit"},
                    {"close": 195.00, "expected": "small_loss"},
                    {"close": 210.00, "expected": "larger_profit"}
                ]
                
                update_results = []
                for i, scenario in enumerate(update_scenarios):
                    update_data = {
                        "symbol": "TSLA",
                        "current_price_data": {
                            "high": scenario["close"] + 1.0,
                            "low": scenario["close"] - 1.0,
                            "close": scenario["close"]
                        },
                        "market_data": position_data["market_data"]
                    }
                    
                    update_response = requests.put(
                        f"{self.backend_url}/positions/update",
                        json=update_data,
                        headers={'Origin': self.frontend_url},
                        timeout=10
                    )
                    
                    if update_response.status_code == 200:
                        update_result = update_response.json()
                        update_results.append({
                            "scenario": i + 1,
                            "price": scenario["close"],
                            "status": update_result.get("position_status"),
                            "actions": len(update_result.get("actions", [])),
                            "current_pnl": update_result.get("current_pnl")
                        })
                    else:
                        update_results.append({
                            "scenario": i + 1,
                            "error": f"HTTP {update_response.status_code}"
                        })
                
                results["details"] = {
                    "position_created": True,
                    "update_scenarios_tested": len(update_scenarios),
                    "successful_updates": len([r for r in update_results if "error" not in r]),
                    "update_results": update_results
                }
                
                logger.info(f"Real-time updates test: {len([r for r in update_results if 'error' not in r])}/{len(update_scenarios)} scenarios successful")
            else:
                results["status"] = "FAILED"
                results["errors"].append(f"Position creation failed: {open_response.status_code}")
        
        except Exception as e:
            results["status"] = "FAILED"
            results["errors"].append(str(e))
        
        return results
    
    def run_frontend_integration_tests(self) -> Dict[str, Any]:
        """Run all frontend integration tests"""
        logger.info("Starting frontend integration tests...")
        
        test_suite = {
            "test_run_timestamp": datetime.now().isoformat(),
            "frontend_url": self.frontend_url,
            "backend_url": self.backend_url,
            "tests": {},
            "overall_status": "PASSED",
            "summary": {}
        }
        
        # Run all tests
        tests_to_run = [
            self.test_frontend_accessibility,
            self.test_backend_frontend_connectivity,
            self.test_risk_management_integration,
            self.test_market_breadth_data_flow,
            self.test_real_time_updates
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
        
        # Summary
        test_suite["summary"] = {
            "total_tests": passed_tests + failed_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": round(passed_tests / (passed_tests + failed_tests) * 100, 1) if (passed_tests + failed_tests) > 0 else 0
        }
        
        logger.info(f"Frontend integration tests completed: {passed_tests}/{passed_tests + failed_tests} tests passed")
        return test_suite

def main():
    """Main test runner for frontend integration"""
    print("="*80)
    print("BIDBACK Trading Tool - Frontend Integration Tests")
    print("="*80)
    
    tester = FrontendIntegrationTester()
    
    # Run comprehensive tests
    results = tester.run_frontend_integration_tests()
    
    # Save results to file
    results_file = f"frontend_integration_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Print summary
    print("\n" + "="*80)
    print("FRONTEND INTEGRATION TEST RESULTS")
    print("="*80)
    print(f"Overall Status: {results['overall_status']}")
    print(f"Tests Passed: {results['summary']['passed_tests']}")
    print(f"Tests Failed: {results['summary']['failed_tests']}")
    print(f"Success Rate: {results['summary']['success_rate']}%")
    
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