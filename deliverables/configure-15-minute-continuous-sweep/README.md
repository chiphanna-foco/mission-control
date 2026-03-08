# Mission Control 15-Minute Continuous Sweep

**A background daemon that monitors Gmail, Slack, task health, and approaching deadlines every 15 minutes, automatically routing findings to the appropriate domain agents.**

## Quick Start

```bash
# Load the daemon
launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist

# Check health status
./scripts/life-sync-check.sh health

# Manually trigger a sweep
./scripts/life-sync-check.sh sweep

# View latest results
./scripts/life-sync-check.sh status
```

## What It Does

Every 60 minutes (3600 seconds), the sweep:

1. **Checks Gmail** — Counts unread messages
2. **Checks Slack** — Detects recent mentions
3. **Finds Stalled Tasks** — Identifies tasks with no status update >2 hours during work hours
4. **Finds Approaching Deadlines** — Alerts about tasks due within 24 hours
5. **Routes Findings** — Sends actionable alerts to appropriate agents:
   - Gmail → TurboTenant agent (`tt-agent-001`)
   - Slack mentions → Context-aware agent routing
   - Stalled tasks → Charlie (`charlie-001`) for escalation
   - Approaching deadlines → Task-owning agent
6. **Respects Work Hours** — Only active 7 AM - 10 PM MST, skips weekends
7. **Logs Everything** — Detailed logging for monitoring and debugging

## File Structure

```
~/Documents/Shared/projects/configure-15-minute-continuous-sweep/
├── README.md                          (this file)
├── INTEGRATION_GUIDE.md              (detailed setup & troubleshooting)
├── scripts/
│   └── life-sync-check.sh            (health check & test script)
├── sweep.log                         (activity log - auto-created)
└── sweep-state.json                  (latest results - auto-created)

~/Library/LaunchDaemons/
└── com.chipai.mission-control.sweep.plist  (launchd daemon config)

/Users/chipai/workshop/src/app/api/orchestration/sweep/
└── route.ts                          (the sweep endpoint)
```

## Health Check Script

The `scripts/life-sync-check.sh` script provides four commands:

### `health` - Check daemon status
Shows whether the launchd daemon is loaded, logs are recent, and displays a summary of the last findings.

```bash
./scripts/life-sync-check.sh health
# Output:
# ✓ Launchd daemon is loaded
# ✓ Log file is recent (3m old)
# ✓ Sweep state file exists
#   Last Sweep Findings:
#     - Gmail unread: 5
#     - Slack mentions: 2
#     - Stalled tasks: 1
#     - Approaching deadlines: 3
```

### `sweep` - Manually trigger a sweep
Executes the sweep API endpoint immediately and shows results.

```bash
./scripts/life-sync-check.sh sweep
# Output:
# ✓ Sweep completed with status: success
#   Findings:
#     - Gmail unread: 5
#     - Slack mentions: 0
#     - Stalled tasks: 1
#     - Approaching deadlines: 2
#   Routing actions: 3
#     - [STALLED] Task stalled for 3 hours: Review PR #123
#     - [DEADLINE] Task due in 6 hours: Finish report
```

### `status` - Show latest results
Displays the complete results from the last sweep, including routing decisions.

```bash
./scripts/life-sync-check.sh status
# Output:
# Timestamp: 2026-03-07T15:30:00.000Z
# Status: success
#
# Findings:
#   ...
#
# Routing Actions:
#   [STALLED] Task stalled for 3 hours: Review PR #123
#   [DEADLINE] Task due in 6 hours: Finish report
```

### `trigger` - Force immediate launchd execution
Manually triggers the launchd job right now (doesn't wait for the 15-minute interval).

```bash
./scripts/life-sync-check.sh trigger
# Output:
# ✓ Launchd job triggered
#   Check logs: tail -f /path/to/sweep.log
```

## Configuration

### Environment Variables

Set these in `/Users/chipai/workshop/.env.local`:

```env
# Required for Bearer token auth
MISSION_CONTROL_SWEEP_TOKEN=your-secure-token-here

# Optional: Gmail unread detection
GMAIL_ACCESS_TOKEN=ya29.a0AfH6SMB...

# Optional: Slack mention detection
SLACK_BOT_TOKEN=xoxb-1234567890...

# Optional: Override the default Mission Control URL
MISSION_CONTROL_URL=http://localhost:3000
```

### Work Hours

The sweep only runs during:
- **Time:** 7 AM - 10 PM MST (America/Denver)
- **Days:** Monday - Friday

To override, set:
```env
SWEEP_IGNORE_WORK_HOURS=1
```

## Monitoring

### Watch the Log File

```bash
tail -f ~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log
```

Example output:
```
[2026-03-07T15:30:00Z] === SWEEP START === (Work hours active: true)
[2026-03-07T15:30:01Z] Gmail check: 5 unread messages
[2026-03-07T15:30:02Z] Slack check: 0 recent mentions
[2026-03-07T15:30:03Z] Stalled tasks check: found 1 stalled task
[2026-03-07T15:30:04Z] Approaching deadlines check: found 2 tasks due within 24h
[2026-03-07T15:30:05Z] === SWEEP END === (3 routing actions)
```

### Check Launchd Status

```bash
# Is the daemon loaded?
launchctl list | grep mission-control.sweep

# When was it last run?
log show --predicate 'process == "launchd"' --last 15m | grep mission-control

# Any recent system errors?
log show --last 30m | grep -i error
```

## API Endpoint

**URL:** `http://localhost:3000/api/orchestration/sweep`

**Methods:**
- `POST` - Execute sweep
- `GET` - Get latest sweep results

**Auth:** Bearer token (set in `MISSION_CONTROL_SWEEP_TOKEN`)

### Example Request

```bash
curl -X POST \
  -H "Authorization: Bearer your-token" \
  http://localhost:3000/api/orchestration/sweep
```

### Example Response

```json
{
  "timestamp": "2026-03-07T15:30:00.000Z",
  "findings": {
    "gmail": {
      "unreadCount": 5,
      "lastChecked": "2026-03-07T15:30:00.000Z"
    },
    "slack": {
      "mentionCount": 0,
      "lastChecked": "2026-03-07T15:30:00.000Z"
    },
    "stalledTasks": [
      {
        "taskId": "abc123",
        "title": "Review PR #123",
        "lastUpdated": "2026-03-07T12:15:00.000Z",
        "hoursSinceUpdate": 3,
        "assignedAgent": "engineer-001"
      }
    ],
    "approachingDeadlines": [
      {
        "taskId": "def456",
        "title": "Finish report",
        "dueDate": "2026-03-07T20:00:00.000Z",
        "hoursUntilDue": 6,
        "assignedAgent": "manager-001"
      }
    ]
  },
  "routing": [
    {
      "type": "stalled",
      "targetAgent": "charlie-001",
      "taskId": "abc123",
      "priority": "high",
      "message": "Task stalled for 3 hours: Review PR #123"
    }
  ],
  "workHours": {
    "active": true,
    "currentTime": "2026-03-07T15:30:00.000Z",
    "timezone": "America/Denver"
  },
  "status": "success",
  "errors": []
}
```

## Troubleshooting

### Daemon Not Loading

```bash
# Check syntax of plist file
plutil -lint ~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist

# Try loading manually
launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist

# Check for existing loads
launchctl list | grep mission-control
```

### Sweep Not Running Every 15 Minutes

```bash
# Verify the daemon is loaded
launchctl list | grep mission-control.sweep

# Check if a job is stuck
launchctl stop com.chipai.mission-control.sweep
sleep 2
launchctl start com.chipai.mission-control.sweep

# Watch for the next execution
tail -f ~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log
```

### "Mission Control is not reachable"

```bash
# Check if the Next.js app is running
curl -s http://localhost:3000/api/health

# Start it if not running
cd /Users/chipai/workshop
npm run dev
```

### "Unauthorized" Error

```bash
# Verify the token matches
echo $MISSION_CONTROL_SWEEP_TOKEN
# Should not be empty and match what you're sending

# Check .env.local
grep MISSION_CONTROL_SWEEP_TOKEN /Users/chipai/workshop/.env.local
```

### No Gmail/Slack Results

These are optional features. If you don't have tokens configured:
- Gmail checks will be skipped
- Slack checks will be skipped
- The sweep will complete successfully with other checks

To enable them, add tokens to `.env.local`:
```env
GMAIL_ACCESS_TOKEN=ya29.a0AfH6SMB...
SLACK_BOT_TOKEN=xoxb-1234567890...
```

## Performance & Limits

| Metric | Value |
|--------|-------|
| Frequency | Every 60 minutes (3600s) |
| Typical Duration | 5-10 seconds |
| Log Size Growth | ~100 bytes per sweep |
| State File Size | ~1-2 KB per sweep |
| CPU Usage | <1% (negligible) |
| Memory Usage | <10 MB (transient) |

## Advanced

### Customize Task Thresholds

Edit `/Users/chipai/workshop/src/app/api/orchestration/sweep/route.ts`:

```typescript
// Change "stalled" threshold from 2 hours to 4 hours:
const twoHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

// Change "approaching deadline" from 24 hours to 48 hours:
const tomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

// Change Gmail alert threshold from 5 to 10 unread:
if (findings.gmail.unreadCount > 10) {
```

### Add Custom Checks

The sweep is designed to be extensible. Add new checks by:

1. Creating a new async function (e.g., `checkProjectStatus()`)
2. Adding it to the `Promise.all()` in the POST handler
3. Adding its results to `findings`
4. Creating routing rules in `createRoutingActions()`

Example:
```typescript
// Add to POST handler
const [gmailResult, slackResult, stalledTasks, deadlineTasks, projectStatus] = 
  await Promise.all([
    checkGmail(),
    checkSlack(),
    checkStalledTasks(),
    checkApproachingDeadlines(),
    checkProjectStatus(),  // NEW
  ]);

findings.projectStatus = projectStatus;

// Add routing
if (findings.projectStatus.blockedCount > 0) {
  routingActions.push({...});
}
```

### Log Rotation

To prevent logs from growing too large, set up log rotation:

```bash
# Create a logrotate config
sudo tee /etc/logrotate.d/mission-control <<EOF
/Users/chipai/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log {
  weekly
  rotate 4
  compress
  missingok
  notifempty
  create 0644 chipai staff
}
EOF

# Test it
sudo logrotate -vf /etc/logrotate.d/mission-control
```

## License

Part of the Mission Control system. For internal use only.

## Support

For issues or questions:
1. Check the **INTEGRATION_GUIDE.md** for detailed setup and troubleshooting
2. Review logs: `tail -f ~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log`
3. Check health: `./scripts/life-sync-check.sh health`
4. Inspect latest results: `./scripts/life-sync-check.sh status`
