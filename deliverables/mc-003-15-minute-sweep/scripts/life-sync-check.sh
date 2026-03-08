#!/bin/bash

# Mission Control 15-Minute Continuous Sweep Health Check Script
# Subcommands: health, sweep, trigger, status

set -e

# Configuration
MISSION_CONTROL_URL="${MISSION_CONTROL_URL:-http://localhost:3001}"
SWEEP_TOKEN="${MISSION_CONTROL_SWEEP_TOKEN:-default-token}"
LOG_FILE="/Users/chipai/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log"
STATE_FILE="/Users/chipai/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep-state.json"
PLIST_FILE="/Users/chipai/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "error")
            echo -e "${RED}✗${NC} $message"
            ;;
        "warning")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        "info")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
}

# Function to check if launchd daemon is loaded
check_launchd_status() {
    if launchctl list | grep -q "com.chipai.mission-control.sweep"; then
        return 0
    else
        return 1
    fi
}

# Function to get last sweep timestamp
get_last_sweep_time() {
    if [ -f "$STATE_FILE" ]; then
        jq -r '.timestamp' "$STATE_FILE" 2>/dev/null || echo "unknown"
    else
        echo "never"
    fi
}

# Function to get next scheduled run
get_next_sweep_time() {
    if [ -f "$STATE_FILE" ]; then
        local lastSweep=$(jq -r '.timestamp' "$STATE_FILE" 2>/dev/null)
        if [ -n "$lastSweep" ]; then
            # Add 60 minutes (3600 seconds) to last sweep
            local nextTime=$(date -j -f "%Y-%m-%dT%H:%M:%S" -v +15M "$lastSweep" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || echo "unknown")
            echo "$nextTime"
        else
            echo "unknown"
        fi
    else
        echo "unknown"
    fi
}

# Function: health - Report sweep health status
cmd_health() {
    echo -e "\n${BLUE}=== Mission Control Sweep Health Check ===${NC}\n"

    # Check launchd status
    if check_launchd_status; then
        print_status "success" "Launchd daemon is loaded"
    else
        print_status "error" "Launchd daemon is NOT loaded"
        echo "  Run: sudo launchctl load $PLIST_FILE"
    fi

    # Check if log file exists and is recent
    if [ -f "$LOG_FILE" ]; then
        local logAge=$(( ($(date +%s) - $(stat -f%m "$LOG_FILE")) / 60 ))
        if [ "$logAge" -lt 60 ]; then
            print_status "success" "Log file is recent (${logAge}m old)"
        elif [ "$logAge" -lt 1440 ]; then
            print_status "warning" "Log file is ${logAge}m old"
        else
            print_status "error" "Log file is stale (${logAge}m old)"
        fi
    else
        print_status "warning" "No log file found"
    fi

    # Check if state file exists
    if [ -f "$STATE_FILE" ]; then
        print_status "success" "Sweep state file exists"
        
        # Show findings summary
        local unreadGmail=$(jq -r '.findings.gmail.unreadCount // 0' "$STATE_FILE" 2>/dev/null)
        local slackMentions=$(jq -r '.findings.slack.mentionCount // 0' "$STATE_FILE" 2>/dev/null)
        local stalledTasks=$(jq -r '.findings.stalledTasks | length // 0' "$STATE_FILE" 2>/dev/null)
        local deadlineTasks=$(jq -r '.findings.approachingDeadlines | length // 0' "$STATE_FILE" 2>/dev/null)
        
        echo ""
        echo "  Last Sweep Findings:"
        echo "    - Gmail unread: $unreadGmail"
        echo "    - Slack mentions: $slackMentions"
        echo "    - Stalled tasks: $stalledTasks"
        echo "    - Approaching deadlines: $deadlineTasks"
    else
        print_status "warning" "No sweep state file found (no sweeps executed yet)"
    fi

    # Show timing info
    echo ""
    echo "  Timing:"
    echo "    - Last sweep: $(get_last_sweep_time)"
    echo "    - Next sweep: $(get_next_sweep_time)"
    echo ""
}

# Function: sweep - Manually trigger a sweep
cmd_sweep() {
    echo -e "\n${BLUE}Triggering manual sweep...${NC}\n"

    # Check if Mission Control is reachable
    if ! curl -s -f "$MISSION_CONTROL_URL/api/tasks?limit=1" > /dev/null 2>&1; then
        print_status "error" "Mission Control is not reachable at $MISSION_CONTROL_URL"
        exit 1
    fi

    # Execute sweep endpoint
    local response=$(curl -s -X POST \
        -H "Authorization: Bearer $SWEEP_TOKEN" \
        -H "Content-Type: application/json" \
        "$MISSION_CONTROL_URL/api/orchestration/sweep")

    # Check response
    if echo "$response" | jq empty 2>/dev/null; then
        local success=$(echo "$response" | jq -r '.success // false' 2>/dev/null)
        if [ "$success" = "true" ]; then
            print_status "success" "Sweep completed successfully"
            
            # Show summary
            local findings=$(echo "$response" | jq '.findings' 2>/dev/null)
            echo ""
            echo "  Findings:"
            echo "    - Gmail unread: $(echo "$findings" | jq '.gmail.unreadCount // 0')"
            echo "    - Slack mentions: $(echo "$findings" | jq '.slack.mentionCount // 0')"
            echo "    - Stalled tasks: $(echo "$findings" | jq '.stalledTasks | length // 0')"
            echo "    - Approaching deadlines: $(echo "$findings" | jq '.approachingDeadlines | length // 0')"
            echo ""
            
            # Show routing actions
            local routingCount=$(echo "$response" | jq '.routing | length // 0' 2>/dev/null)
            if [ "$routingCount" -gt 0 ]; then
                echo "  Routing actions: $routingCount"
                echo "$response" | jq -r '.routing[] | "    - [\(.type)] \(.message)"' 2>/dev/null
            fi
        else
            print_status "error" "Sweep failed"
            echo "$response" | jq '.' 2>/dev/null || echo "$response"
            exit 1
        fi
    else
        print_status "error" "Invalid response from sweep endpoint"
        echo "$response"
        exit 1
    fi
    
    echo ""
}

# Function: trigger - Force immediate execution of launchd job
cmd_trigger() {
    echo -e "\n${BLUE}Triggering immediate launchd execution...${NC}\n"

    if ! check_launchd_status; then
        print_status "error" "Launchd daemon is not loaded"
        echo "  Run: sudo launchctl load $PLIST_FILE"
        exit 1
    fi

    # Trigger launchd job
    if launchctl start com.chipai.mission-control.sweep 2>/dev/null; then
        print_status "success" "Launchd job triggered"
        echo "  Check logs: tail -f $LOG_FILE"
    else
        print_status "error" "Failed to trigger launchd job"
        exit 1
    fi
    
    echo ""
}

# Function: status - Show last sweep results and next scheduled run
cmd_status() {
    echo -e "\n${BLUE}=== Latest Sweep Status ===${NC}\n"

    if [ ! -f "$STATE_FILE" ]; then
        print_status "warning" "No sweep data available yet"
        echo ""
        exit 0
    fi

    # Parse and display sweep results
    local timestamp=$(jq -r '.timestamp // "unknown"' "$STATE_FILE" 2>/dev/null)
    local sweepStatus=$(jq -r '.status // "unknown"' "$STATE_FILE" 2>/dev/null)
    
    echo "Timestamp: $timestamp"
    echo "Status: $sweepStatus"
    echo ""

    # Show findings in detail
    echo "Findings:"
    jq -r '.findings | to_entries[] | "  \(.key): \(.value)"' "$STATE_FILE" 2>/dev/null || echo "  (Unable to parse findings)"

    echo ""
    echo "Routing Actions:"
    jq -r '.routing[] | "  [\(.type | ascii_upcase)] \(.message)"' "$STATE_FILE" 2>/dev/null | head -10
    
    local routingCount=$(jq '.routing | length // 0' "$STATE_FILE" 2>/dev/null)
    if [ "$routingCount" -gt 10 ]; then
        echo "  ... and $((routingCount - 10)) more"
    fi

    echo ""
    echo "Work Hours:"
    jq -r '.workHours | "  Active: \(.active)\n  Time: \(.currentTime)\n  Timezone: \(.timezone)"' "$STATE_FILE" 2>/dev/null

    echo ""
    echo "Scheduling:"
    echo "  Last sweep: $(get_last_sweep_time)"
    echo "  Next sweep: $(get_next_sweep_time)"
    
    if [ -n "$sweepStatus" ] && [ "$sweepStatus" != "success" ]; then
        echo ""
        echo "Errors:"
        jq -r '.errors[] // empty' "$STATE_FILE" 2>/dev/null | sed 's/^/  - /'
    fi

    echo ""
}

# Main command handler
main() {
    local cmd="${1:-health}"

    case "$cmd" in
        health)
            cmd_health
            ;;
        sweep)
            cmd_sweep
            ;;
        trigger)
            cmd_trigger
            ;;
        status)
            cmd_status
            ;;
        help|--help|-h)
            echo "Mission Control 15-Minute Sweep Health Check"
            echo ""
            echo "Usage: $0 <command>"
            echo ""
            echo "Commands:"
            echo "  health    - Report sweep health status (default)"
            echo "  sweep     - Manually trigger a sweep via API"
            echo "  trigger   - Force immediate launchd execution"
            echo "  status    - Show last sweep results and next scheduled run"
            echo "  help      - Show this help message"
            echo ""
            ;;
        *)
            print_status "error" "Unknown command: $cmd"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main
main "$@"
