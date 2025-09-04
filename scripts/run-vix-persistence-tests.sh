#!/bin/bash
#
# VIX Data Persistence Test Runner
# 
# Comprehensive test execution script for validating VIX data persistence
# across the entire BIDBACK Trading Tool application stack.
#
# Usage:
#   ./scripts/run-vix-persistence-tests.sh [--unit|--integration|--e2e|--all]
#
# Examples:
#   ./scripts/run-vix-persistence-tests.sh --unit         # Run unit tests only
#   ./scripts/run-vix-persistence-tests.sh --e2e          # Run E2E tests only
#   ./scripts/run-vix-persistence-tests.sh --all          # Run all test suites
#   ./scripts/run-vix-persistence-tests.sh                # Default: run all tests
#

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly TEST_RESULTS_DIR="$PROJECT_DIR/test-results"
readonly VIX_TEST_LOG="$TEST_RESULTS_DIR/vix-persistence-tests.log"
readonly APP_URL="http://localhost:3000"
readonly DEV_SERVER_PID_FILE="/tmp/bidback-dev-server.pid"

# Test configuration
readonly TEST_TIMEOUT=60000  # 60 seconds
readonly E2E_BROWSER="chromium"  # chromium, firefox, webkit
readonly HEADLESS_MODE=false  # Set to true for CI/CD

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date +'%Y-%m-%d %H:%M:%S')] $message${NC}"
}

print_info() {
    print_status "$BLUE" "$1"
}

print_success() {
    print_status "$GREEN" "$1"
}

print_warning() {
    print_status "$YELLOW" "$1"
}

print_error() {
    print_status "$RED" "$1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

VIX Data Persistence Test Runner for BIDBACK Trading Tool

OPTIONS:
    --unit          Run unit tests only
    --integration   Run integration tests only  
    --e2e           Run end-to-end tests only
    --all           Run all test suites (default)
    --headless      Run E2E tests in headless mode
    --ci            CI/CD mode (headless, structured output)
    --help          Show this help message

EXAMPLES:
    $0                          # Run all tests
    $0 --unit                   # Run unit tests only
    $0 --e2e --headless         # Run E2E tests in headless mode
    $0 --all --ci               # Run all tests in CI mode

ENVIRONMENT VARIABLES:
    VIX_TEST_TIMEOUT    Test timeout in milliseconds (default: 60000)
    VIX_TEST_BROWSER    Browser for E2E tests (default: chromium)
    APP_URL             Application URL (default: http://localhost:3000)
EOF
}

# Function to setup test environment
setup_test_environment() {
    print_info "🛠️  Setting up test environment..."
    
    # Create test results directory
    mkdir -p "$TEST_RESULTS_DIR"
    
    # Clear previous test results
    rm -f "$VIX_TEST_LOG"
    
    # Initialize test log
    echo "VIX Data Persistence Test Results - $(date)" > "$VIX_TEST_LOG"
    echo "=============================================" >> "$VIX_TEST_LOG"
    echo "" >> "$VIX_TEST_LOG"
    
    print_success "✅ Test environment setup complete"
}

# Function to check if dev server is running
is_dev_server_running() {
    if curl -s -f "$APP_URL" > /dev/null 2>&1; then
        return 0  # Server is running
    else
        return 1  # Server is not running
    fi
}

# Function to start development server
start_dev_server() {
    print_info "🚀 Starting development server..."
    
    if is_dev_server_running; then
        print_success "✅ Development server already running at $APP_URL"
        return 0
    fi
    
    cd "$PROJECT_DIR"
    
    # Start dev server in background
    npm run dev > "$TEST_RESULTS_DIR/dev-server.log" 2>&1 &
    local server_pid=$!
    echo $server_pid > "$DEV_SERVER_PID_FILE"
    
    print_info "⏳ Waiting for development server to start..."
    
    # Wait for server to be ready (max 60 seconds)
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if is_dev_server_running; then
            print_success "✅ Development server started successfully (PID: $server_pid)"
            return 0
        fi
        
        sleep 1
        ((attempt++))
        
        if [ $((attempt % 10)) -eq 0 ]; then
            print_info "⏳ Still waiting for server... (attempt $attempt/$max_attempts)"
        fi
    done
    
    print_error "❌ Failed to start development server after $max_attempts seconds"
    return 1
}

# Function to stop development server
stop_dev_server() {
    if [ -f "$DEV_SERVER_PID_FILE" ]; then
        local server_pid=$(cat "$DEV_SERVER_PID_FILE")
        if kill -0 "$server_pid" 2>/dev/null; then
            print_info "🛑 Stopping development server (PID: $server_pid)..."
            kill "$server_pid" 2>/dev/null || true
            rm -f "$DEV_SERVER_PID_FILE"
            sleep 2  # Give server time to shut down
            print_success "✅ Development server stopped"
        fi
    fi
}

# Function to run unit tests
run_unit_tests() {
    print_info "🧪 Running VIX Data Storage Unit Tests..."
    
    cd "$PROJECT_DIR"
    
    # Run specific VIX unit tests
    local test_command="npx vitest run src/__tests__/vix-data-storage.unit.test.ts --reporter=verbose"
    
    if eval "$test_command" 2>&1 | tee -a "$VIX_TEST_LOG"; then
        print_success "✅ Unit tests passed"
        echo "UNIT_TESTS=PASSED" >> "$VIX_TEST_LOG"
        return 0
    else
        print_error "❌ Unit tests failed"
        echo "UNIT_TESTS=FAILED" >> "$VIX_TEST_LOG"
        return 1
    fi
}

# Function to run integration tests  
run_integration_tests() {
    print_info "🔗 Running Market Breadth Integration Tests..."
    
    cd "$PROJECT_DIR"
    
    # Run specific VIX integration tests
    local test_command="npx vitest run src/__tests__/market-breadth-integration.test.tsx --reporter=verbose"
    
    if eval "$test_command" 2>&1 | tee -a "$VIX_TEST_LOG"; then
        print_success "✅ Integration tests passed"
        echo "INTEGRATION_TESTS=PASSED" >> "$VIX_TEST_LOG"
        return 0
    else
        print_error "❌ Integration tests failed"
        echo "INTEGRATION_TESTS=FAILED" >> "$VIX_TEST_LOG"
        return 1
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    print_info "🌐 Running VIX Data Persistence E2E Tests..."
    
    # Ensure dev server is running
    if ! start_dev_server; then
        print_error "❌ Cannot run E2E tests - failed to start development server"
        return 1
    fi
    
    cd "$PROJECT_DIR"
    
    # Configure E2E test command
    local headless_flag=""
    if [ "$HEADLESS_MODE" = true ]; then
        headless_flag="--headless"
    fi
    
    # Run specific VIX E2E tests
    local test_command="npx vitest run test/e2e/vix-data-persistence.e2e.test.ts --reporter=verbose"
    
    if eval "$test_command" 2>&1 | tee -a "$VIX_TEST_LOG"; then
        print_success "✅ E2E tests passed"
        echo "E2E_TESTS=PASSED" >> "$VIX_TEST_LOG"
        return 0
    else
        print_error "❌ E2E tests failed"
        echo "E2E_TESTS=FAILED" >> "$VIX_TEST_LOG"
        return 1
    fi
}

# Function to run existing VIX integration tests
run_existing_vix_tests() {
    print_info "🔍 Running Existing VIX Integration Tests..."
    
    cd "$PROJECT_DIR"
    
    # Run the comprehensive VIX integration test suite
    local test_command="npx vitest run src/renderer/components/market-breadth/__tests__/VixIntegration.test.tsx --reporter=verbose"
    
    if eval "$test_command" 2>&1 | tee -a "$VIX_TEST_LOG"; then
        print_success "✅ Existing VIX tests passed"
        echo "EXISTING_VIX_TESTS=PASSED" >> "$VIX_TEST_LOG"
        return 0
    else
        print_error "❌ Existing VIX tests failed"  
        echo "EXISTING_VIX_TESTS=FAILED" >> "$VIX_TEST_LOG"
        return 1
    fi
}

# Function to generate test report
generate_test_report() {
    print_info "📊 Generating test report..."
    
    local report_file="$TEST_RESULTS_DIR/vix-persistence-test-report.md"
    
    cat > "$report_file" << EOF
# VIX Data Persistence Test Report

**Generated:** $(date)
**Test Suite:** VIX Data Persistence Validation
**Application:** BIDBACK Trading Tool

## Test Execution Summary

EOF
    
    # Parse test results from log file
    if grep -q "UNIT_TESTS=PASSED" "$VIX_TEST_LOG" 2>/dev/null; then
        echo "- ✅ **Unit Tests:** PASSED" >> "$report_file"
    elif grep -q "UNIT_TESTS=FAILED" "$VIX_TEST_LOG" 2>/dev/null; then
        echo "- ❌ **Unit Tests:** FAILED" >> "$report_file"
    fi
    
    if grep -q "INTEGRATION_TESTS=PASSED" "$VIX_TEST_LOG" 2>/dev/null; then
        echo "- ✅ **Integration Tests:** PASSED" >> "$report_file"
    elif grep -q "INTEGRATION_TESTS=FAILED" "$VIX_TEST_LOG" 2>/dev/null; then
        echo "- ❌ **Integration Tests:** FAILED" >> "$report_file"
    fi
    
    if grep -q "E2E_TESTS=PASSED" "$VIX_TEST_LOG" 2>/dev/null; then
        echo "- ✅ **End-to-End Tests:** PASSED" >> "$report_file"
    elif grep -q "E2E_TESTS=FAILED" "$VIX_TEST_LOG" 2>/dev/null; then
        echo "- ❌ **End-to-End Tests:** FAILED" >> "$report_file"
    fi
    
    if grep -q "EXISTING_VIX_TESTS=PASSED" "$VIX_TEST_LOG" 2>/dev/null; then
        echo "- ✅ **Existing VIX Tests:** PASSED" >> "$report_file"
    elif grep -q "EXISTING_VIX_TESTS=FAILED" "$VIX_TEST_LOG" 2>/dev/null; then
        echo "- ❌ **Existing VIX Tests:** FAILED" >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF

## Test Scenario Coverage

### 1. VIX Data Entry and Storage
- Form field validation for VIX input (0-100 range)
- Data conversion from form input to database storage
- Database persistence across application restarts

### 2. VIX Data Retrieval and Pre-filling
- Last entered VIX value pre-fills new forms
- Form population from database records
- Data integrity during form state management

### 3. VIX Integration with Position Calculator
- VIX value passes correctly to Position Calculator
- VIX-based regime calculations (ultra-low, low, normal, elevated, high, extreme)
- VIX multiplier matrix for position sizing

### 4. Application Reload Persistence
- **CRITICAL TEST:** VIX data survives application reload/refresh
- Database queries correctly retrieve persisted VIX values
- Form repopulation with exact VIX values after restart

## Debug Information

The test suite includes comprehensive debug logging:
- \`🔍 VIX DEBUG - convertToRawData\` - Shows VIX data conversion process
- \`🔍 VIX DEBUG - Final raw data\` - Displays final data before database storage
- Console output verification during form submission

## Files Tested

1. **DataEntryForm.tsx** - VIX data entry and form management
2. **Database Operations** - VIX storage and retrieval
3. **Position Calculator Integration** - VIX-based calculations
4. **Application State Management** - VIX persistence across sessions

## Next Steps

If tests fail:
1. Check database schema includes VIX column
2. Verify form field mapping for VIX input
3. Examine debug logs for VIX data flow issues
4. Validate database queries include VIX field

---

**Test Log File:** \`test-results/vix-persistence-tests.log\`
**Full Report:** \`test-results/vix-persistence-test-report.md\`
EOF
    
    print_success "✅ Test report generated: $report_file"
}

# Function to run all tests
run_all_tests() {
    print_info "🎯 Running complete VIX Data Persistence test suite..."
    
    local all_passed=true
    
    # Run unit tests
    if ! run_unit_tests; then
        all_passed=false
    fi
    
    # Run integration tests
    if ! run_integration_tests; then
        all_passed=false
    fi
    
    # Run existing VIX tests  
    if ! run_existing_vix_tests; then
        all_passed=false
    fi
    
    # Run E2E tests
    if ! run_e2e_tests; then
        all_passed=false
    fi
    
    if [ "$all_passed" = true ]; then
        print_success "🎉 ALL VIX DATA PERSISTENCE TESTS PASSED!"
        echo "ALL_TESTS=PASSED" >> "$VIX_TEST_LOG"
        return 0
    else
        print_error "⚠️  Some VIX data persistence tests failed. Check the log for details."
        echo "ALL_TESTS=FAILED" >> "$VIX_TEST_LOG"
        return 1
    fi
}

# Function for cleanup
cleanup() {
    print_info "🧹 Cleaning up..."
    stop_dev_server
    generate_test_report
}

# Main execution
main() {
    local test_type="all"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --unit)
                test_type="unit"
                shift
                ;;
            --integration)
                test_type="integration"
                shift
                ;;
            --e2e)
                test_type="e2e"
                shift
                ;;
            --all)
                test_type="all"
                shift
                ;;
            --headless)
                HEADLESS_MODE=true
                shift
                ;;
            --ci)
                HEADLESS_MODE=true
                # Additional CI-specific settings can be added here
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Trap cleanup function
    trap cleanup EXIT
    
    # Setup test environment
    setup_test_environment
    
    print_info "🚀 Starting VIX Data Persistence Test Suite"
    print_info "📋 Test Type: $test_type"
    print_info "🌐 Application URL: $APP_URL"
    print_info "📝 Test Log: $VIX_TEST_LOG"
    echo ""
    
    # Run tests based on type
    case $test_type in
        "unit")
            if run_unit_tests; then
                exit_code=0
            else
                exit_code=1
            fi
            ;;
        "integration")
            if run_integration_tests && run_existing_vix_tests; then
                exit_code=0
            else
                exit_code=1
            fi
            ;;
        "e2e")
            if run_e2e_tests; then
                exit_code=0
            else
                exit_code=1
            fi
            ;;
        "all"|*)
            if run_all_tests; then
                exit_code=0
            else
                exit_code=1
            fi
            ;;
    esac
    
    print_info ""
    print_info "📊 Test execution complete. Check $VIX_TEST_LOG for detailed results."
    
    exit $exit_code
}

# Execute main function with all arguments
main "$@"