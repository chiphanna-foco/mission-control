#!/bin/bash
# Mission Control Health Check + Auto-Restart
# Usage: ./scripts/health-check.sh (runs once) or setup cron for periodic checks
# Cron: */5 * * * * cd /Users/chipai/Documents/mission-control && bash scripts/health-check.sh

MC_DIR="/Users/chipai/Documents/mission-control"
PORT=3000
LOG_FILE="/tmp/mission-control-health.log"

# Check if server is responding
check_health() {
  local response=$(curl -s -m 5 -w "%{http_code}" -o /dev/null "http://localhost:$PORT")
  if [ "$response" = "200" ]; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✓ Server healthy (HTTP $response)" >> "$LOG_FILE"
    return 0
  else
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✗ Server unhealthy (HTTP $response)" >> "$LOG_FILE"
    return 1
  fi
}

# Restart server
restart_server() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🔄 Restarting server..." >> "$LOG_FILE"
  
  # Hard kill everything
  pkill -9 -f "next" > /dev/null 2>&1
  pkill -9 -f "npm" > /dev/null 2>&1
  sleep 4
  
  # Start fresh
  cd "$MC_DIR"
  PORT=$PORT npm run dev > /tmp/mission-control.log 2>&1 &
  sleep 6
  
  # Verify restart worked
  if check_health; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✓ Server restarted successfully" >> "$LOG_FILE"
    # Notify if possible
    if command -v nc &> /dev/null; then
      echo "🤖 Mission Control auto-restarted (server was down)" | nc -u localhost 6000 2>/dev/null || true
    fi
    return 0
  else
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✗ Server restart failed!" >> "$LOG_FILE"
    return 1
  fi
}

# Main logic
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Health check running..." >> "$LOG_FILE"

if ! check_health; then
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Server is down, attempting restart..." >> "$LOG_FILE"
  restart_server
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Server is healthy, no action needed" >> "$LOG_FILE"
fi

# Keep last 100 lines of log
tail -100 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
