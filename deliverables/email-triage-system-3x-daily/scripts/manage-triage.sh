#!/bin/bash

# Email Triage System - Management Utility
# Status checks, manual triggers, logs, and diagnostics

set -e

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Commands
status() {
    print_header "LaunchD Job Status"
    
    launchctl list | grep email-triage || print_error "No jobs loaded"
    
    echo ""
    echo "Job Details:"
    echo "  Morning: 8:00 AM (com.mission-control.email-triage-morning)"
    echo "  Noon: 12:00 PM (com.mission-control.email-triage-noon)"
    echo "  Evening: 5:00 PM (com.mission-control.email-triage-evening)"
}

trigger() {
    if [ -z "$1" ]; then
        print_error "Usage: $0 trigger {morning|noon|evening|all}"
        exit 1
    fi
    
    case "$1" in
        morning)
            print_info "Triggering morning run..."
            launchctl start com.mission-control.email-triage-morning
            print_success "Morning job started"
            ;;
        noon)
            print_info "Triggering noon run..."
            launchctl start com.mission-control.email-triage-noon
            print_success "Noon job started"
            ;;
        evening)
            print_info "Triggering evening run..."
            launchctl start com.mission-control.email-triage-evening
            print_success "Evening job started"
            ;;
        all)
            print_info "Triggering all runs..."
            launchctl start com.mission-control.email-triage-morning
            launchctl start com.mission-control.email-triage-noon
            launchctl start com.mission-control.email-triage-evening
            print_success "All jobs started"
            ;;
        *)
            print_error "Invalid time: $1"
            exit 1
            ;;
    esac
    
    echo ""
    print_info "Check logs in 5 seconds..."
    sleep 5
    tail -20 "$PROJECT_DIR/logs/${1}.log" 2>/dev/null || echo "No log yet"
}

logs() {
    time=$1
    
    if [ -z "$time" ]; then
        print_header "All Logs (Latest 20 Lines)"
        tail -20 "$PROJECT_DIR/logs"/*.log
    else
        case "$time" in
            morning|noon|evening)
                print_header "Logs for $time run"
                tail -50 "$PROJECT_DIR/logs/${time}.log"
                if [ -s "$PROJECT_DIR/logs/${time}-error.log" ]; then
                    print_header "Errors for $time run"
                    cat "$PROJECT_DIR/logs/${time}-error.log"
                fi
                ;;
            *)
                print_error "Invalid time: $time"
                exit 1
                ;;
        esac
    fi
}

follow_logs() {
    print_header "Following All Logs (Press Ctrl+C to stop)"
    tail -f "$PROJECT_DIR/logs"/*.log
}

results() {
    print_header "Triage Results"
    
    if [ ! -d "$PROJECT_DIR/results" ] || [ -z "$(ls -A $PROJECT_DIR/results)" ]; then
        print_error "No results found"
        exit 1
    fi
    
    echo "Latest results:"
    ls -lt "$PROJECT_DIR/results" | head -5
    
    echo ""
    latest=$(ls -t "$PROJECT_DIR/results" | head -1)
    print_info "Latest: $latest"
    
    echo ""
    echo "Summary:"
    cat "$PROJECT_DIR/results/$latest" | jq '{
        timestamp,
        emailsProcessed,
        actionItems: (.actionItems | length),
        urgent: (.urgent | length),
        actionCount,
        domains: (.byDomain | keys)
    }'
}

results_latest() {
    print_header "Latest Triage Summary"
    
    if [ ! -d "$PROJECT_DIR/results" ] || [ -z "$(ls -A $PROJECT_DIR/results)" ]; then
        print_error "No results found"
        exit 1
    fi
    
    latest=$(ls -t "$PROJECT_DIR/results" | head -1)
    
    echo "File: $latest"
    echo ""
    cat "$PROJECT_DIR/results/$latest" | jq '{
        timestamp,
        emailsProcessed,
        actionItems: (.actionItems | length),
        urgent: (.urgent | length),
        actionCount,
        byDomain: (.byDomain | map_values(length))
    }'
}

results_by_domain() {
    print_header "Results by Domain"
    
    if [ ! -d "$PROJECT_DIR/results" ] || [ -z "$(ls -A $PROJECT_DIR/results)" ]; then
        print_error "No results found"
        exit 1
    fi
    
    latest=$(ls -t "$PROJECT_DIR/results" | head -1)
    
    cat "$PROJECT_DIR/results/$latest" | jq '.byDomain | 
    to_entries | 
    .[] | 
    {
        domain: .key,
        count: (.value | length),
        emails: .value | map({from, subject, urgency: .urgency.levelName})
    }' | head -100
}

results_urgent() {
    print_header "Urgent Items"
    
    if [ ! -d "$PROJECT_DIR/results" ] || [ -z "$(ls -A $PROJECT_DIR/results)" ]; then
        print_error "No results found"
        exit 1
    fi
    
    latest=$(ls -t "$PROJECT_DIR/results" | head -1)
    count=$(cat "$PROJECT_DIR/results/$latest" | jq '.urgent | length')
    
    if [ "$count" -eq 0 ]; then
        print_success "No urgent items"
        return
    fi
    
    echo "Found $count urgent items:"
    echo ""
    cat "$PROJECT_DIR/results/$latest" | jq '.urgent[] | {
        from,
        subject,
        classification: .classification.label,
        urgency: .urgency.levelName,
        actions: .actions | map(.text),
        reasons: .urgency.reasons
    }'
}

test_run() {
    print_header "Test Email Triage Run"
    
    print_info "Running email triage script..."
    cd "$PROJECT_DIR"
    
    if node scripts/email-triage.js; then
        print_success "Test run completed"
        
        echo ""
        results_latest
    else
        print_error "Test run failed"
        exit 1
    fi
}

diagnose() {
    print_header "System Diagnostics"
    
    echo "Node.js:"
    node --version || print_error "Node.js not found"
    which node || print_error "Node path not found"
    
    echo ""
    echo "Files:"
    [ -f "$PROJECT_DIR/service-account.json" ] && print_success "service-account.json exists" || print_error "service-account.json missing"
    [ -f "$PROJECT_DIR/.env.local" ] && print_success ".env.local exists" || print_error ".env.local missing"
    [ -f "$PROJECT_DIR/triage.config.json" ] && print_success "triage.config.json exists" || print_error "triage.config.json missing"
    
    echo ""
    echo "Directories:"
    [ -d "$PROJECT_DIR/logs" ] && print_success "logs/ exists" || print_error "logs/ missing"
    [ -d "$PROJECT_DIR/results" ] && print_success "results/ exists" || print_error "results/ missing"
    
    echo ""
    echo "LaunchD Jobs:"
    launchctl list | grep email-triage && print_success "LaunchD jobs loaded" || print_error "LaunchD jobs not loaded"
    
    echo ""
    echo "Dependencies:"
    [ -d "$PROJECT_DIR/node_modules" ] && print_success "node_modules/ exists" || print_error "Dependencies not installed (run: npm install)"
}

help() {
    cat << EOF
Email Triage System - Management Utility

Usage: $0 [command] [options]

Commands:
    status              Show LaunchD job status
    trigger {job}       Manually trigger a job (morning|noon|evening|all)
    logs [job]          View logs (morning|noon|evening, or all if omitted)
    follow              Follow logs in real-time
    results             Show triage results summary
    results-latest      Show latest triage summary
    results-domain      Show results grouped by domain
    results-urgent      Show urgent items from latest results
    test                Run a test triage
    diagnose            Check system configuration
    help                Show this help message

Examples:
    $0 status
    $0 trigger morning
    $0 logs morning
    $0 follow
    $0 results-urgent
    $0 test

For more help, see README.md and TROUBLESHOOTING.md
EOF
}

# Main
case "${1:-help}" in
    status)
        status
        ;;
    trigger)
        trigger "$2"
        ;;
    logs)
        logs "$2"
        ;;
    follow)
        follow_logs
        ;;
    results)
        results
        ;;
    results-latest)
        results_latest
        ;;
    results-domain)
        results_by_domain
        ;;
    results-urgent)
        results_urgent
        ;;
    test)
        test_run
        ;;
    diagnose)
        diagnose
        ;;
    help)
        help
        ;;
    *)
        print_error "Unknown command: $1"
        help
        exit 1
        ;;
esac
