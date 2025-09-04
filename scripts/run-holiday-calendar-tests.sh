#!/bin/bash

# Holiday Calendar Test Execution Script - BIDBACK Trading System
# Comprehensive test runner for Holiday Calendar system

echo "=== BIDBACK Trading Tool - Holiday Calendar Test Suite ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test execution function
run_test_suite() {
    local test_name=$1
    local test_file=$2
    
    echo -e "${BLUE}Running ${test_name}...${NC}"
    
    if npm test -- --testPathPattern="${test_file}" --verbose; then
        echo -e "${GREEN}✓ ${test_name} PASSED${NC}"
        return 0
    else
        echo -e "${RED}✗ ${test_name} FAILED${NC}"
        return 1
    fi
}

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0

echo "Starting Holiday Calendar Test Suite..."
echo "======================================"
echo ""

# 1. Holiday Calendar Utilities Tests
echo "1. Testing Holiday Calendar Utilities..."
if run_test_suite "Holiday Calendar Utilities" "holidayCalendar.test.ts"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))
echo ""

# 2. Holiday Calendar Component Tests  
echo "2. Testing Holiday Calendar Component..."
if run_test_suite "Holiday Calendar Component" "HolidayCalendar.test.tsx"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))
echo ""

# 3. Holiday Calendar Integration Tests
echo "3. Testing Holiday Calendar Integration..."
if run_test_suite "Holiday Calendar Integration" "HolidayCalendar.integration.test.tsx"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))
echo ""

# Test Summary
echo "======================================"
echo "Test Execution Summary:"
echo "======================================"
echo -e "Total Test Suites: ${total_tests}"
echo -e "${GREEN}Passed: ${passed_tests}${NC}"
echo -e "${RED}Failed: ${failed_tests}${NC}"

if [ ${failed_tests} -eq 0 ]; then
    echo -e "${GREEN}"
    echo "🎉 ALL HOLIDAY CALENDAR TESTS PASSED! 🎉"
    echo ""
    echo "✓ 2025 US Holidays validated (13 holidays)"
    echo "✓ Trading Day Logic tested"
    echo "✓ Early Close Days verified (1pm close)"
    echo "✓ VIX Exit Matrix integration confirmed"
    echo "✓ Calendar Navigation functionality validated"
    echo "✓ UI Components tested"
    echo "✓ Integration workflows verified"
    echo -e "${NC}"
    exit 0
else
    echo -e "${RED}"
    echo "❌ SOME TESTS FAILED"
    echo ""
    echo "Please review the failed tests above and fix any issues."
    echo -e "${NC}"
    exit 1
fi