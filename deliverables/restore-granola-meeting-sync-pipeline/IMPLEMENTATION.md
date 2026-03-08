# Granola Meeting Sync Pipeline — Implementation Guide

**Task ID:** tt-001  
**Priority:** URGENT  
**Status:** READY TO DEPLOY  

---

## 🎯 Objective

Restore the Granola → Action Items → Mission Control → Slack pipeline:

- **Every 30 minutes** (work hours only)
- **Extract action items** from new meeting notes
- **Create tasks** in Mission Control
- **Notify** Slack channel
- **Track completion** to prevent duplicates

---

## 📋 Files Included

| File | Purpose |
|------|---------|
| `GRANOLA-SYNC-PIPELINE.md` | Complete architecture documentation |
| `granola-sync-scheduler.mjs` | Main scheduler (runs every 30 min) |
| `extract-and-create-tasks.mjs` | Extraction & task creation handler |
| `install-cron-jobs.sh` | Cron installation script |
| `verify-pipeline.sh` | Health check & diagnostics |
| `IMPLEMENTATION.md` | This file |

---

## 🚀 Quick Start (5 minutes)

### 1. Copy scripts to workspace
```bash
cp granola-sync-scheduler.mjs /Users/chipai/workshop/meeting-notes-to-tasks/scripts/
cp extract-and-create-tasks.mjs /Users/chipai/workshop/meeting-notes-extraction/
chmod +x /Users/chipai/workshop/meeting-notes-to-tasks/scripts/granola-sync-scheduler.mjs
chmod +x /Users/chipai/workshop/meeting-notes-extraction/extract-and-create-tasks.mjs
```

### 2. Verify everything works
```bash
bash verify-pipeline.sh
```

### 3. Install cron jobs
```bash
bash install-cron-jobs.sh
```

### 4. Monitor logs
```bash
tail -f /tmp/granola-sync-scheduler.log
```

**That's it!** The pipeline now runs automatically every 30 minutes.

---

## 🔍 Architecture Deep Dive

### Component 1: Granola Sync (Python, external)

**Status:** ✅ Already running  
**Location:** `~/Documents/claude/skills/clawd/granola-sync.py`  
**Frequency:** Every 30 minutes (handled separately)  
**Output:** `~/Documents/claude/skills/clawd/granola-notes/*.md`

This script:
- Authenticates with Granola API using stored token
- Fetches all meeting notes
- Converts ProseMirror JSON to markdown
- Saves locally with deduplication

**No action needed** — already operational.

---

### Component 2: Granola Sync Scheduler (Node.js, `granola-sync-scheduler.mjs`)

**Status:** ✅ Provided  
**Location:** `/Users/chipai/workshop/meeting-notes-to-tasks/scripts/granola-sync-scheduler.mjs`  
**Frequency:** Every 30 minutes during work hours (9 AM - 6 PM MT, Mon-Fri)  
**Triggered by:** Cron or daemon mode

This script:

1. **Checks if in work hours** — Won't run outside 9 AM - 6 PM MT
2. **Scans granola-notes directory** — Looks for new/updated `.md` files
3. **Compares with sync history** — Tracks what's been processed in `~/.granola-sync-history.json`
4. **Identifies new action items** — Only processes notes with detected action patterns
5. **Queues for extraction** — Writes to `/meeting-notes-extraction/queue/{date}/`
6. **Triggers extraction handler** — Spawns `extract-and-create-tasks.mjs`
7. **Updates sync state** — Records what was processed

**Input:** Granola notes in `~/Documents/claude/skills/clawd/granola-notes/`  
**Output:** Queue items in `/meeting-notes-extraction/queue/{date}/*.json`  
**Logs:** `/tmp/granola-sync-scheduler.log`

---

### Component 3: Extraction & Task Creation (Node.js, `extract-and-create-tasks.mjs`)

**Status:** ✅ Provided  
**Location:** `/Users/chipai/workshop/meeting-notes-extraction/extract-and-create-tasks.mjs`  
**Triggered by:** Scheduler (via `sessions_spawn`) or manual execution  
**Runtime:** Claude Code sub-agent (via OpenClaw)

This script:

1. **Reads queue items** — Gets queued extraction tasks from disk
2. **Spawns Claude agent** — Calls OpenClaw to spawn Claude Code sub-agent with Opus model
3. **Sends extraction prompt** — Includes full meeting notes + structured extraction prompt
4. **Claude extracts items** — Returns structured JSON with action items
5. **Creates MC tasks** — POST `/api/tasks/create` for each extracted item
6. **Posts to Slack** — Sends summary to `#action-items` channel
7. **Records results** — Writes `{id}-results.json` and removes from queue

**Input:** Queue items from `/meeting-notes-extraction/queue/{date}/`  
**Output:** Mission Control tasks + Slack message  
**Logs:** `/tmp/granola-extraction.log`

---

### Component 4: Cron Scheduler

**Status:** ✅ Provided via `install-cron-jobs.sh`  
**Entries:** 2 cron jobs

**Job 1: Every 30 minutes (business hours)**
```
*/30 9-17 * * 1-5 source ~/.zshrc && node /Users/chipai/workshop/meeting-notes-to-tasks/scripts/granola-sync-scheduler.mjs --once >> /tmp/granola-sync-scheduler.log 2>&1
```
- Every 30 minutes
- Between 9 AM - 6 PM MT (hour 9-17)
- Monday-Friday only (1-5)
- With `--once` flag (run once and exit)
- Logs to `/tmp/granola-sync-scheduler.log`

**Job 2: 6 PM daily sweep**
```
0 18 * * 1-5 source ~/.zshrc && node /Users/chipai/workshop/meeting-notes-to-tasks/scripts/granola-sync-scheduler.mjs --once >> /tmp/granola-sync-scheduler-sweep.log 2>&1
```
- Every day at 6 PM (end of business)
- Monday-Friday
- Catches any meetings that occurred near end of day

---

## 🔗 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Granola API (external)                                      │
│ • User attends meeting                                      │
│ • Granola records notes/transcript                          │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ Python Sync Script (granola-sync.py) - EXTERNAL, RUNNING    │
│ • Runs every 30 min (separate from this pipeline)           │
│ • Fetches meeting notes from Granola API                    │
│ • Converts to markdown                                      │
│ • Saves to: ~/Documents/claude/skills/clawd/granola-notes/  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ Local Granola Notes Directory (Markdown)                    │
│ • 2026-01-28_Get started with Granola.md                    │
│ • 2026-03-05_Q1 Budget Review.md                            │
│ • 2026-03-07_Team Standup.md                                │
│ • .sync-state.json (tracks synced IDs)                      │
└────────────┬────────────────────────────────────────────────┘
             │
   ┌─ Every 30 min (cron) ─┐
   │ (work hours only)      │
   ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Scheduler: granola-sync-scheduler.mjs                       │
│ 1. Scan for NEW notes (compare with .granola-sync-history.json)
│ 2. Filter for action items (patterns like "I'll...", "needs to")
│ 3. Queue for extraction                                     │
│ 4. Trigger extraction handler                               │
│ 5. Update sync history                                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ Queue Directory: /meeting-notes-extraction/queue/{date}/    │
│ • 2026-01-28_Get started with Granola-queue.json            │
│ • 2026-03-05_Q1 Budget Review-queue.json                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ Extraction Handler: extract-and-create-tasks.mjs            │
│ 1. Read queue item (file path, title)                       │
│ 2. Read Granola markdown file                               │
│ 3. Spawn Claude Code sub-agent (via OpenClaw)               │
│ 4. Claude extracts action items using Opus model            │
│ 5. Create MC tasks (POST /api/tasks/create)                 │
│ 6. Post to Slack (#action-items)                            │
│ 7. Save results, remove from queue                          │
└────────┬────────────────┬───────────────┬────────────────────┘
         │                │               │
         ▼                ▼               ▼
    ┌────────┐    ┌──────────────┐  ┌──────────┐
    │ Mission │    │ Slack        │  │ Results  │
    │ Control │    │ Notification │  │ Archive  │
    │ Tasks   │    │ (#action...) │  │ JSON     │
    └────────┘    └──────────────┘  └──────────┘
```

---

## 📊 Metrics & Monitoring

### Health Metrics (check every morning)

1. **Granola notes synced** — Should increase daily
   ```bash
   ls ~/Documents/claude/skills/clawd/granola-notes/*.md | wc -l
   ```

2. **Last scheduler run** — Should be within last 30 minutes
   ```bash
   tail -1 /tmp/granola-sync-scheduler.log
   ```

3. **Recent tasks created** — Check Mission Control dashboard
   ```bash
   curl http://localhost:3000/api/tasks?source=granola | jq '.length'
   ```

4. **Slack notifications** — Check #action-items channel
   ```bash
   # Manual: Open Slack and verify recent "📅 Action Items" message
   ```

### Log Files

**Primary Scheduler Log:**
```bash
tail -f /tmp/granola-sync-scheduler.log
```

Expected output:
```
[2026-03-07 10:30:15] 📅 Scheduled check
[2026-03-07 10:30:15] 📝 Scanning for new Granola notes...
[2026-03-07 10:30:18] ✅ Found 3 new notes
[2026-03-07 10:30:18] 🔄 Queuing for extraction...
[2026-03-07 10:30:19]   ✅ Queued: "Q1 Budget Review"
[2026-03-07 10:30:19]   ✅ Queued: "Team Standup"
[2026-03-07 10:30:25] ✅ Extraction complete
```

**Extraction Handler Log:**
```bash
tail -f /tmp/granola-extraction.log
```

Expected output:
```
[2026-03-07 10:30:25] 🚀 Starting extraction processor
[2026-03-07 10:30:25] 📋 Processing 2 queued items...
[2026-03-07 10:30:26] 🤖 Extracting action items from: "Q1 Budget Review"...
[2026-03-07 10:30:28] ✅ Extracted 3 action items
[2026-03-07 10:30:28]   ✅ Queued: "Q1 Budget Review"
[2026-03-07 10:30:29] ✅ Slack notification posted to #action-items
```

---

## 🔧 Configuration

### Environment Variables (optional)

Set in `~/.zshrc` or before running:

```bash
# Mission Control
export MC_API_URL="http://localhost:3000"
export MC_API_KEY="optional-api-key"

# Slack (if using webhook notifications)
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
export SLACK_CHANNEL="#action-items"
```

### Granola Authentication

Uses existing setup at:
```
~/Library/Application Support/Granola/supabase.json
```

**No configuration needed** — already authenticated.

---

## ⚙️ How to Customize

### Change work hours
Edit `granola-sync-scheduler.mjs`, line ~90:
```javascript
// Current: 9 AM - 6 PM MT
const inWorkHours = hour >= 9 && hour < 18;
```

### Change extraction frequency
Edit cron job in `install-cron-jobs.sh`:
```bash
# Current: Every 30 minutes
# Change to: Every 15 minutes
*/15 9-17 * * 1-5 ...
```

### Change Slack channel
Set environment variable:
```bash
export SLACK_CHANNEL="#product-tasks"
```

### Add pre/post-extraction hooks
Edit `extract-and-create-tasks.mjs` to add custom logic before/after extraction.

---

## 🧪 Testing & Validation

### Test 1: Verify scheduler runs
```bash
node /Users/chipai/workshop/meeting-notes-to-tasks/scripts/granola-sync-scheduler.mjs --once
```

Expected: Finds new notes and queues them.

### Test 2: Verify extraction works
```bash
node /Users/chipai/workshop/meeting-notes-extraction/extract-and-create-tasks.mjs --date 2026-03-07
```

Expected: Processes queued items, creates MC tasks.

### Test 3: Verify cron installation
```bash
crontab -l | grep granola
```

Expected: 2 cron entries shown.

### Test 4: Check Mission Control for tasks
```bash
curl http://localhost:3000/api/tasks?source=granola-automation | jq '.[] | {title, dueDate, priority}'
```

Expected: Recently created tasks listed.

---

## 🆘 Troubleshooting

### Issue: "Cron job not running"

**Diagnosis:**
```bash
# Check if cron is enabled
sudo systemctl status cron

# Check cron logs (macOS)
log stream --predicate 'process == "cron"'

# Verify script path exists
ls -l /Users/chipai/workshop/meeting-notes-to-tasks/scripts/granola-sync-scheduler.mjs
```

**Fix:**
1. Reinstall cron jobs: `bash install-cron-jobs.sh`
2. Manually run: `node granola-sync-scheduler.mjs --once`
3. Check system logs for permission errors

### Issue: "No new tasks appearing in Mission Control"

**Diagnosis:**
```bash
# Check if Granola notes are being synced
ls -lh ~/Documents/claude/skills/clawd/granola-notes/ | tail -5

# Check sync history
cat ~/.granola-sync-history.json | jq '.lastSyncTime'

# Check queue directory
ls -la /Users/chipai/workshop/meeting-notes-extraction/queue/
```

**Fix:**
1. Verify Granola Python sync is running
2. Check if new meetings exist (check Granola app directly)
3. Manually trigger scheduler: `node granola-sync-scheduler.mjs --once`
4. Check logs: `tail -f /tmp/granola-sync-scheduler.log`

### Issue: "Extraction failing silently"

**Diagnosis:**
```bash
# Check extraction logs
tail -20 /tmp/granola-extraction.log

# Check for errors
tail -20 /tmp/granola-sync-errors.log

# Verify Mission Control is responding
curl -v http://localhost:3000/api/health
```

**Fix:**
1. Ensure Mission Control is running
2. Check API endpoint in scripts (default: `http://localhost:3000`)
3. Verify OpenClaw is running: `openclaw status`
4. Check Claude API quota/errors

### Issue: "Slack notifications not being sent"

**Diagnosis:**
```bash
# Check if webhook is configured
echo $SLACK_WEBHOOK_URL

# Check extraction logs for Slack errors
grep -i "slack" /tmp/granola-extraction.log
```

**Fix:**
1. Set `SLACK_WEBHOOK_URL` environment variable
2. Verify webhook URL is valid (test with curl)
3. Check Slack workspace permissions
4. Disable Slack temporarily: unset `SLACK_WEBHOOK_URL`

---

## 🔄 Maintenance & Updates

### Daily
- Monitor `/tmp/granola-sync-scheduler.log` for errors
- Check Mission Control for new tasks

### Weekly
- Review action items in Mission Control
- Check Slack channel for notification patterns
- Verify cron is still running: `crontab -l`

### Monthly
- Analyze extraction quality (are items accurate?)
- Check performance metrics (tasks/day, extraction time)
- Review and adjust extraction prompt if needed

---

## 📞 Support & Debugging

### Enable verbose logging

Edit scheduler script, add to log function:
```javascript
function log(message, level = "info") {
  const timestamp = new Date().toLocaleString(...);
  const line = `${timestamp} [${level.toUpperCase()}] ${message}`;
  console.error(line);  // Use stderr for visibility
  fs.appendFileSync(LOG_FILE, line + "\n");
}
```

### Dry-run mode

```bash
# Test extraction without creating tasks
export DRY_RUN=true
node extract-and-create-tasks.mjs --date 2026-03-07
```

### Reset sync state

```bash
# Clear history to re-process all notes
rm ~/.granola-sync-history.json

# Re-run scheduler
node granola-sync-scheduler.mjs --once
```

---

## ✅ Completion Checklist

- [ ] Scripts copied to workspace directories
- [ ] Verified scripts are executable: `chmod +x *.mjs`
- [ ] Run `bash verify-pipeline.sh` — all green
- [ ] Installed cron jobs: `bash install-cron-jobs.sh`
- [ ] Verified cron installation: `crontab -l | grep granola`
- [ ] Mission Control is running and accessible
- [ ] OpenClaw is running: `openclaw status`
- [ ] (Optional) Slack webhook configured
- [ ] Monitoring logs: `tail -f /tmp/granola-sync-scheduler.log`
- [ ] First extraction complete (check MC dashboard)
- [ ] Updated MEMORY.md with pipeline status

---

## 📝 Next Steps

1. **Today:** Install and verify (use checklist above)
2. **By EOD:** Monitor first extraction cycle
3. **Tomorrow:** Review extracted tasks for quality
4. **This week:** Adjust extraction prompt if needed
5. **Next week:** Add metrics to dashboard

---

**Questions?** Check the GRANOLA-SYNC-PIPELINE.md for detailed architecture info.
