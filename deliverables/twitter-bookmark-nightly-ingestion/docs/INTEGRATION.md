# Mission Control Integration Guide

## Overview

The Twitter Bookmark Ingestion System (lf-002) is tightly integrated with Mission Control for orchestration, task management, and reporting.

## Task Details

**Task ID:** `lf-002`  
**Agent:** Life Agent (lf-001)  
**Domain:** Life / Personal Growth  
**Status:** Active  
**Schedule:** Nightly at 10 PM  

## API Communication

### Heartbeat (5-10 minute intervals)

**Endpoint:** `POST /api/tasks/lf-002/heartbeat`

**Purpose:** Signal that task is running and report progress

**Request:**
```json
{
  "message": "Processing bookmarks...",
  "progress": 45
}
```

**Response:**
```json
{
  "success": true,
  "heartbeat": "2026-03-07T23:51:52.283Z",
  "taskId": "lf-002"
}
```

**When to send:**
- Every 5-10 minutes while running
- On major milestones (30%, 60%, 90%, 100%)
- If progress is 0, watchdog assumes crashed and re-dispatches

### Activity Logging

**Endpoint:** `POST /api/tasks/lf-002/activities`

**Purpose:** Log significant events and progress milestones

**Request:**
```json
{
  "activity_type": "updated",
  "message": "Ingested 42 bookmarks, categorized 42, extracted 105 insights"
}
```

**Response:**
```json
{
  "id": "610781be-ae0a-490d-9ffe-d35bf97714bf",
  "task_id": "lf-002",
  "activity_type": "updated",
  "message": "...",
  "created_at": "2026-03-07 23:52:14"
}
```

**Activity Types:**
- `updated` — Progress update
- `error` — Error occurred
- `completed` — Task finished
- `blocked` — Needs intervention

### Status Update (Final)

**Endpoint:** `PATCH /api/tasks/lf-002`

**Purpose:** Mark task as complete

**Request:**
```json
{
  "status": "review"
}
```

**Response:**
```json
{
  "id": "lf-002",
  "status": "review",
  "updated_at": "2026-03-07T23:55:00Z"
}
```

**Status Values:**
- `planning` — In design phase
- `assigned` — Ready to work
- `in_progress` — Currently running
- `review` — Complete, waiting approval
- `done` — Finished and approved
- `blocked` — Cannot proceed

## Bearer Token

**Token:** `5MY0vrWwbkapewyiS0rVYFmqsqa24jmRlT6sxuAZX4U`

**How to use:**
```bash
curl -H "Authorization: Bearer 5MY0vrWwbkapewyiS0rVYFmqsqa24jmRlT6sxuAZX4U" \
  http://localhost:3001/api/tasks/lf-002/heartbeat
```

**In Node.js:**
```javascript
const response = await fetch('http://localhost:3001/api/tasks/lf-002/heartbeat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer 5MY0vrWwbkapewyiS0rVYFmqsqa24jmRlT6sxuAZX4U',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({message: "...", progress: 50})
});
```

## Watchdog Timeout

**Timeout:** 20 minutes without heartbeat

If no heartbeat is received for >20 minutes:
1. Task marked as `blocked`
2. Charlie (orchestrator) alerts via Slack
3. Chip gets notification
4. Option to retry or investigate

**To prevent timeout:** Send heartbeat every 5-10 minutes

## Reporting Structure

### Daily Report

Written to: `~/data/life/bookmarks/ingest-report-YYYY-MM-DD.json`

**Structure:**
```json
{
  "started_at": "2026-03-07T22:00:00.000Z",
  "total": 42,
  "new": 42,
  "updated": 0,
  "categorized": 42,
  "insights_extracted": 105,
  "errors": []
}
```

### Post-Run Summary

**Sent to:** Mission Control API

**Data:**
- Total bookmarks processed
- New vs. updated
- Categories distribution
- Insight types distribution
- Any errors

**Integration:**
```javascript
await this.recordActivity(
  `Ingested ${bookmarks.length} bookmarks, ` +
  `categorized ${stats.categorized}, ` +
  `extracted insights from ${stats.insights_extracted}`
);
```

## Command Execution Flow

```
10 PM Trigger (launchd)
    ↓
src/ingest.js starts
    ↓
Initialize (heartbeat: 5%)
    ↓
Fetch bookmarks (heartbeat: 30%)
    ↓
Process each bookmark:
    - Insert
    - Categorize
    - Extract insights
    - Index (heartbeat every 10 bookmarks)
    ↓
Generate report (heartbeat: 90%)
    ↓
Save JSON report
    ↓
Record activity: "Complete"
    ↓
Send final heartbeat (100%)
    ↓
Mark task as "review"
    ↓
Complete
```

## Troubleshooting

### Heartbeat Failures

**Error:** `Failed to connect to localhost:3001`

**Solutions:**
1. Verify Mission Control is running: `http://localhost:3001`
2. Check API token is correct
3. Verify bearer token format: `Bearer <token>`

**In code:**
```javascript
try {
  const response = await fetch(`${MC_API_BASE}/api/tasks/${TASK_ID}/heartbeat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MC_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({message, progress})
  });
  
  if (!response.ok) {
    console.error(`Heartbeat failed: ${response.status}`);
    // Continue processing anyway
  }
} catch (error) {
  console.error(`Heartbeat error: ${error.message}`);
  // Continue processing anyway
}
```

### Task Not Appearing

**Cause:** Task not being created in Mission Control

**Check:**
1. Is MC running? `curl http://localhost:3001/api/health`
2. Can you query tasks? `curl http://localhost:3001/api/tasks`
3. Is lf-002 in the list?

**Fix:** Create task manually via MC API:
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer 5MY0vrWwbkapewyiS0rVYFmqsqa24jmRlT6sxuAZX4U" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "lf-002",
    "title": "Twitter bookmark nightly ingestion",
    "workspace_id": "life",
    "assigned_agent_id": "lf-001",
    "status": "assigned"
  }'
```

## Integration Testing

### 1. Manual Test

```bash
# Start MC
cd ~/Documents/Documents\ -\ ChipAI\'s\ Mac\ mini/mission-control
npm run dev

# In another terminal, test ingest
cd ~/Documents/Shared/projects/twitter-bookmark-nightly-ingestion
node src/ingest.js

# Check Mission Control
curl http://localhost:3001/api/tasks/lf-002
```

### 2. Check Logs

```bash
# MC logs
tail -f ~/.openclaw/logs/mission-control.log

# Ingest logs
tail -f ~/.openclaw/logs/twitter-bookmark-ingest.log

# Daily report
cat ~/data/life/bookmarks/ingest-report-$(date +%Y-%m-%d).json
```

### 3. Verify Data

```bash
# Check database
sqlite3 ~/data/life/bookmarks/bookmarks.db ".tables"
sqlite3 ~/data/life/bookmarks/bookmarks.db "SELECT COUNT(*) FROM bookmarks;"

# Search test
node src/search.js search "test" | head -20

# Category test
node src/search.js category "AI" | head -20
```

## Future Enhancements

### v2: Real-time Sync
- Use X Webhooks instead of polling
- Push updates to MC immediately
- Streaming ingestion vs. nightly batch

### v3: Agent Communication
- Publish insights to message queue
- Other agents subscribe to bookmark updates
- Charlie routes actionable items to relevant domains

### v4: Analytics Dashboard
- MC dashboard showing bookmark trends
- Category distribution graphs
- Insight heatmaps
- Top bookmarked authors

## Related Tasks

**Related to lf-002:**
- `charlie-001` — Master orchestrator (depends on lf-002 for personal metrics)
- `gb-001` — @gamebuzzapp (may reference tech/sports bookmarks)
- `wt-001` — TurboTenant (references business/marketing bookmarks)

**API Dependencies:**
- Mission Control (`localhost:3001`)
- X/Twitter API v2
- Google Calendar (future, for context)

## Support

**Questions:**
- Task Slack: #mission-control
- Task URL: `https://mc.chip-hanna.com/tasks/lf-002`
- Logs: `~/.openclaw/logs/twitter-bookmark-*.log`

**Emergency Reset:**
```bash
# Stop service
launchctl unload ~/Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist

# Reset database
rm ~/data/life/bookmarks/bookmarks.db

# Reinit
cd ~/Documents/Shared/projects/twitter-bookmark-nightly-ingestion
node src/setup.js

# Re-enable
launchctl load ~/Library/LaunchAgents/com.chipai.twitter-bookmark-ingest.plist
```

---

**Integration Version:** 1.0  
**Mission Control API:** v1  
**Last Updated:** 2026-03-07
