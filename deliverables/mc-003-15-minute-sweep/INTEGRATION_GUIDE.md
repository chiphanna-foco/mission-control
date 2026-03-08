# Mission Control 15-Minute Continuous Sweep - Integration Guide

## Overview

This guide explains how to set up and test the Mission Control 15-minute continuous sweep system. The sweep monitors Gmail, Slack, stalled tasks, and approaching deadlines every 15 minutes, then routes findings to appropriate domain agents.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           launchd Scheduler (900s = 15 min)              │
│  com.chipai.mission-control.sweep.plist                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│        Health Check Script                              │
│  scripts/life-sync-check.sh sweep                       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│        POST /api/orchestration/sweep                    │
│  ✓ Gmail check (Gmail API)                             │
│  ✓ Slack check (Slack API)                             │
│  ✓ Stalled tasks (2h+ no update)                       │
│  ✓ Approaching deadlines (24h window)                  │
│  ✓ Work hours enforcement (7AM-10PM MST)               │
│  ✓ Routing to domain agents                            │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┼──────────┬─────────────┐
        ▼          ▼          ▼             ▼
    [Gmail]   [Slack]   [Stalled]      [Deadlines]
      (TT)    (Context)  (Charlie)      (Owner)
```

## Installation

### Step 1: Copy launchd Plist

The plist file should already be at:
```
~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist
```

If not, create it:
```bash
mkdir -p ~/Library/LaunchDaemons
cp /Users/chipai/workshop/src/app/api/orchestration/sweep/com.chipai.mission-control.sweep.plist \
   ~/Library/LaunchDaemons/
```

### Step 2: Load the Launchd Daemon

```bash
# Load the daemon (runs at startup and every 15 minutes)
launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist

# Verify it's loaded
launchctl list | grep mission-control.sweep
```

### Step 3: Verify the API Endpoint

The API endpoint has already been created at:
```
/Users/chipai/workshop/src/app/api/orchestration/sweep/route.ts
```

It's deployed to:
```
POST http://localhost:3000/api/orchestration/sweep
GET  http://localhost:3000/api/orchestration/sweep
```

### Step 4: Configure Environment Variables

Add these to `/Users/chipai/workshop/.env.local`:

```env
# Sweep Configuration
MISSION_CONTROL_SWEEP_TOKEN=<your-secure-token>

# Gmail API (optional - for unread email detection)
GMAIL_ACCESS_TOKEN=<your-gmail-token>

# Slack API (optional - for mention detection)
SLACK_BOT_TOKEN=<your-slack-token>
```

**Note:** If tokens are not configured, the sweep will skip those checks gracefully.

### Step 5: Verify Health Check Script

The script is at:
```
~/Documents/Shared/projects/configure-15-minute-continuous-sweep/scripts/life-sync-check.sh
```

It should be executable:
```bash
chmod +x ~/Documents/Shared/projects/configure-15-minute-continuous-sweep/scripts/life-sync-check.sh
```

## Testing

### Test 1: Manual API Call

```bash
# Manually trigger the sweep via API
curl -X POST \
  -H "Authorization: Bearer <your-sweep-token>" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/orchestration/sweep

# Get latest sweep status
curl -H "Authorization: Bearer <your-sweep-token>" \
  http://localhost:3000/api/orchestration/sweep
```

### Test 2: Health Check Script

```bash
# Show health status
./scripts/life-sync-check.sh health

# Manually trigger a sweep
./scripts/life-sync-check.sh sweep

# Show last sweep results
./scripts/life-sync-check.sh status

# Force immediate launchd execution
./scripts/life-sync-check.sh trigger
```

### Test 3: Verify Launchd Execution

```bash
# Trigger the job immediately
launchctl start com.chipai.mission-control.sweep

# Watch the log file
tail -f ~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log

# Check last execution time
ls -lh ~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep-state.json
```

## Monitoring

### Log File

All sweep activity is logged to:
```
~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log
```

Rotate this file periodically to avoid it growing too large:
```bash
# Manual rotation
gzip ~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log
mv sweep.log.gz sweep.log.$(date +%Y%m%d).gz
touch sweep.log
```

### State File

The latest sweep results are saved to:
```
~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep-state.json
```

This file contains:
- Findings (Gmail, Slack, stalled tasks, approaching deadlines)
- Routing actions
- Work hours status
- Error details

## Troubleshooting

### Daemon Not Loading

```bash
# Check if daemon is loaded
launchctl list | grep mission-control.sweep

# If not, load it manually
launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist

# Check for syntax errors in plist
plutil -lint ~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist
```

### Sweep Not Running

```bash
# Trigger manually
./scripts/life-sync-check.sh trigger

# Check logs
tail -20 ~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log

# Verify Mission Control is running
curl -s http://localhost:3000/api/health | head -20
```

### API Errors

**401 Unauthorized:**
- Verify the Bearer token matches `MISSION_CONTROL_SWEEP_TOKEN`
- Check the .env.local file

**500 Internal Server Error:**
- Check the API endpoint logs (Mission Control server)
- Verify the database connection

**Gmail/Slack Not Working:**
- These are optional and will fail gracefully
- Add appropriate tokens to .env.local if you want these features
- The sweep will continue with other checks

### Database Errors

Verify the Mission Control database is accessible:
```bash
# Check database location
echo $MISSION_CONTROL_DATABASE_URL

# Verify database exists and is readable
sqlite3 /Users/chipai/Documents/mission-control/mission-control.db "SELECT COUNT(*) FROM tasks"
```

## Work Hours Enforcement

The sweep respects work hours:
- **Active:** 7 AM - 10 PM (22:00) MST
- **Inactive:** Nights and weekends
- **Timezone:** America/Denver

To check if work hours are active:
```bash
./scripts/life-sync-check.sh status
# Look for "Work Hours: Active: true/false"
```

To disable work hours enforcement (run on demand):
- Set `SWEEP_IGNORE_WORK_HOURS=1` in environment

## Routing

Each finding type routes to specific agents:

| Finding Type | Target Agent | Condition |
|---|---|---|
| Gmail | `tt-agent-001` (TurboTenant) | >5 unread messages |
| Slack | `charlie-001` (extracted from context) | Any mentions |
| Stalled Tasks | `charlie-001` (Charlie for escalation) | No update >2h |
| Approaching Deadlines | Task owner agent | Due within 24h |

To customize routing, edit the `createRoutingActions()` function in `/Users/chipai/workshop/src/app/api/orchestration/sweep/route.ts`

## Performance

- **Sweep Duration:** ~5-10 seconds (depends on API latency)
- **Resource Usage:** Minimal - runs as a background daemon
- **Frequency:** Every 15 minutes (900 seconds)
- **Storage:** ~1KB per sweep (state file) + log file growth

## Uninstalling

To stop and unload the daemon:

```bash
# Stop the daemon
launchctl stop com.chipai.mission-control.sweep

# Unload it (stops running at startup)
launchctl unload ~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist

# Remove the plist
rm ~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist
```

## Next Steps

1. **Configure API tokens:** Add Gmail and Slack tokens if you want those features
2. **Test the sweep:** Run `./scripts/life-sync-check.sh sweep`
3. **Monitor logs:** Watch `tail -f sweep.log` for a few minutes
4. **Verify routing:** Check sweep status with `./scripts/life-sync-check.sh status`
5. **Set up log rotation:** Use logrotate or a cron job to prevent log file growth

## Support

For issues, check:
1. Log file: `~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log`
2. State file: `~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep-state.json`
3. Health status: `./scripts/life-sync-check.sh health`
4. Launchd logs: `log show --predicate 'process == "launchd"' --last 1h`
