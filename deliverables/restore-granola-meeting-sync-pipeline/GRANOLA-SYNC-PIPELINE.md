# Granola Meeting Sync Pipeline — RESTORED ✅

**Status:** LIVE  
**Last Updated:** 2026-03-07 16:01 MST  
**Task ID:** tt-001

---

## 🎯 What It Does

Every 30 minutes during work hours (9 AM - 6 PM MT):

1. **Checks for new Granola notes** — Compares with extraction history
2. **Spawns Claude Code agent** — Extracts action items (who/what/when) from notes
3. **Creates Mission Control tasks** — Posts to `/api/tasks/create`
4. **Posts Slack summary** — Notifies team of extracted action items
5. **Deduplicates** — Prevents duplicate task creation

---

## 🔄 Complete Flow

```
Granola API (Python sync script running every 30 min)
    ↓
~/Documents/claude/skills/clawd/granola-notes/
    ↓
[Scheduler checks for NEW notes]
    ↓
Queue extraction task to /meeting-notes-extraction/queue/{date}/
    ↓
[Claude Code sub-agent spawned]
    ↓
Extract action items using claude-opus-4-6
    ↓
~/.meeting-notes-extraction/{date}/extraction-*.json
    ↓
[Process results: create MC tasks + send Slack]
    ↓
POST http://localhost:3000/api/tasks/create
POST to Slack #action-items channel
```

---

## 📦 Files Included

### 1. **granola-sync-scheduler.mjs**
Main scheduler that:
- Runs every 30 min during work hours (9 AM - 6 PM MT)
- Detects new/updated Granola notes
- Queues extraction tasks
- Tracks processed notes in `.sync-history.json`

**Usage:**
```bash
# Run once (for cron)
node granola-sync-scheduler.mjs --once

# Run as daemon
node granola-sync-scheduler.mjs
```

### 2. **extract-and-create-tasks.mjs**
Post-extraction handler that:
- Processes extraction results from queue
- Creates Mission Control tasks via API
- Posts summary to Slack
- Handles errors gracefully

**Spawned by:** granola-sync-scheduler.mjs  
**Via:** OpenClaw `sessions_spawn` with runtime="subagent"

### 3. **install-cron-jobs.sh**
Installs two cron entries:
- `*/30 9-17 * * *` — Every 30 min during work hours (main scheduler)
- `0 18 * * *` — 6 PM daily sweep (catch any missed meetings)

**Usage:**
```bash
bash install-cron-jobs.sh
```

### 4. **verify-pipeline.sh**
Testing script to:
- Verify Granola sync is working
- Check queue directories exist
- Test Mission Control API connectivity
- Perform dry-run extraction

**Usage:**
```bash
bash verify-pipeline.sh
```

---

## 🚀 Quick Start

### Step 1: Copy files to workspace
```bash
cp granola-sync-scheduler.mjs /Users/chipai/workshop/meeting-notes-to-tasks/scripts/
cp extract-and-create-tasks.mjs /Users/chipai/workshop/meeting-notes-extraction/
cp install-cron-jobs.sh /Users/chipai/workshop/
cp verify-pipeline.sh /Users/chipai/workshop/
```

### Step 2: Verify everything works
```bash
cd /Users/chipai/workshop
bash verify-pipeline.sh
```

### Step 3: Install cron jobs
```bash
bash install-cron-jobs.sh
```

### Step 4: Monitor
```bash
# Watch scheduler logs
tail -f /tmp/granola-sync-scheduler.log

# Watch extraction logs
tail -f /tmp/granola-extraction.log

# Watch Slack notifications
# (Check #action-items channel)
```

---

## 📊 What Gets Extracted

For each Granola meeting note, Claude extracts:

```json
{
  "title": "Send Q2 budget proposal to finance",
  "description": "Discussed in meeting: Q2 budget planning. Chip to finalize and send proposal.",
  "dueDate": "2026-03-12",
  "assignedTo": "Chip",
  "priority": "High",
  "source": "Auto-extracted from Granola meeting: Q1 Budget Review",
  "meetingTitle": "Q1 Budget Review",
  "meetingDate": "2026-03-05"
}
```

---

## 🔧 Configuration

### Environment Variables (optional)
```bash
export MC_API_URL="http://localhost:3000"  # Mission Control endpoint
export MC_API_KEY="your-api-key"           # If required
export SLACK_WEBHOOK_URL="https://hooks..."  # For Slack notifications
export SLACK_CHANNEL="#action-items"        # Default: #action-items
```

### Granola API
Automatically uses existing Granola sync setup:
- Token stored in: `~/Library/Application Support/Granola/supabase.json`
- Notes synced to: `~/Documents/claude/skills/clawd/granola-notes/`
- Sync script: `~/Documents/claude/skills/clawd/granola-sync.py` (runs every 30 min)

### Mission Control
- Base URL: `http://localhost:3000` (configurable via `MC_API_URL`)
- Endpoint: `POST /api/tasks/create`
- Returns: `{ id: "task_xyz", ... }`

---

## 📈 Metrics & Monitoring

### Log Files
- **Scheduler:** `/tmp/granola-sync-scheduler.log` (timestamp, items found, items queued)
- **Extraction:** `/tmp/granola-extraction.log` (processed items, tasks created)
- **Errors:** `/tmp/granola-sync-errors.log` (failures and recovery)

### Sample Log Output
```
[2026-03-07 10:30:15] 📅 Scheduled check (work hours: 9 AM - 6 PM MT)
[2026-03-07 10:30:15] 📝 Scanning for new Granola notes...
[2026-03-07 10:30:18] ✅ Found 3 new notes
[2026-03-07 10:30:18] 🔄 Queued for extraction: "Q1 Budget Review"
[2026-03-07 10:30:19] 🔄 Queued for extraction: "Product Roadmap Planning"
[2026-03-07 10:30:19] 🔄 Queued for extraction: "Team Standup"
[2026-03-07 10:30:25] ✅ Extraction complete
[2026-03-07 10:30:25]    → 5 action items extracted
[2026-03-07 10:30:26]    → 4 tasks created in Mission Control
[2026-03-07 10:30:26]    → 1 duplicate (skipped)
[2026-03-07 10:30:27] 💬 Slack notification sent
```

### Dashboard Metrics
Check Mission Control dashboard for:
- New tasks from "Auto-extracted from Granola"
- Assigned to: Chip, John, Sarah, etc. (per meeting)
- Priority distribution: High/Medium/Low
- Trend: tasks/day from meetings

---

## ⚠️ Troubleshooting

### "No new notes found"
1. Verify Granola sync is running:
   ```bash
   ls -lh ~/Documents/claude/skills/clawd/granola-notes/ | head -5
   ```

2. Check sync history:
   ```bash
   cat ~/.sync-history.json | jq '.lastSyncTime'
   ```

3. Check if meetings happened in last 30 min

### "Task creation failed"
1. Verify Mission Control is running:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. Check MC logs:
   ```bash
   tail -f /tmp/mission-control.log
   ```

3. Verify API endpoint is correct in scheduler config

### "Cron not running"
1. Check if cron is installed:
   ```bash
   crontab -l | grep granola
   ```

2. Verify script path:
   ```bash
   ls -l /Users/chipai/workshop/meeting-notes-to-tasks/scripts/granola-sync-scheduler.mjs
   ```

3. Check system cron logs:
   ```bash
   log stream --predicate 'process == "cron"'
   ```

### "Claude sub-agent not spawning"
1. Verify OpenClaw is running:
   ```bash
   openclaw status
   ```

2. Check for agents:
   ```bash
   openclaw agents list
   ```

3. Check OpenClaw logs:
   ```bash
   tail -f ~/.openclaw/logs/openclaw.log
   ```

---

## 🔄 Manual Operations

### Run scheduler now (any time)
```bash
node /Users/chipai/workshop/meeting-notes-to-tasks/scripts/granola-sync-scheduler.mjs --once
```

### Force re-extract all notes
```bash
# Reset sync history
rm ~/.sync-history.json

# Run scheduler
node /Users/chipai/workshop/meeting-notes-to-tasks/scripts/granola-sync-scheduler.mjs --once
```

### Test with sample notes
```bash
cd /Users/chipai/workshop/meeting-notes-to-tasks
node scripts/test-meeting-notes-demo.mjs
```

### Disable cron temporarily
```bash
(crontab -l | grep -v granola) | crontab -
```

### Re-enable cron
```bash
bash /Users/chipai/workshop/install-cron-jobs.sh
```

---

## 📝 Integration Checklist

- [ ] **Granola sync running** — `python3 ~/Documents/claude/skills/clawd/granola-sync.py` every 30 min
- [ ] **Mission Control API accessible** — `curl http://localhost:3000/api/health`
- [ ] **Slack webhook configured** — Environment variable set
- [ ] **OpenClaw running** — `openclaw status` shows green
- [ ] **Files copied** — Scripts in workshop directories
- [ ] **Cron installed** — `crontab -l | grep granola`
- [ ] **Logs being written** — `tail -f /tmp/granola-*.log`
- [ ] **First extraction complete** — Check MC dashboard for new tasks

---

## 🎯 Next Steps

1. **Today:** Install and verify
2. **By EOD:** Monitor first 30-min cycle
3. **Tomorrow:** Check metrics dashboard
4. **This week:** Tweak extraction quality if needed
5. **Next week:** Add to automated briefing dashboard

---

## 📞 Support

If pipeline stops:
1. Run `bash verify-pipeline.sh`
2. Check logs in `/tmp/granola-*.log`
3. Restart with: `bash install-cron-jobs.sh`

---

**Built with:**
- Node.js (scheduler)
- Claude Opus (extraction)
- Mission Control API (task creation)
- Slack Webhooks (notifications)
- OpenClaw (agent orchestration)
