# MC-003: 15-Minute Continuous Sweep — Setup & Verification

**Status:** ✅ DELIVERED & TESTED
**Date:** 2026-03-08 10:04 MST
**Task ID:** mc-003

---

## What Was Built

A **15-minute automated monitoring daemon** that continuously checks:
- 📧 **Gmail** — Unread message count
- 💬 **Slack** — Recent mentions
- ⚠️ **Stalled Tasks** — Tasks with no update >2 hours (work hours only)
- ⏰ **Approaching Deadlines** — Tasks due within 24 hours

And automatically routes findings to appropriate domain agents.

---

## Changes Made (2026-03-08)

### 1. **Updated Launchd Interval**
   - **Changed from:** 3600 seconds (60 minutes)
   - **Changed to:** 900 seconds (15 minutes)
   - **File:** `com.chipai.mission-control.sweep.plist`

### 2. **Fixed Script Port Configuration**
   - **Changed from:** `http://localhost:3000`
   - **Changed to:** `http://localhost:3001`
   - **Reason:** Mission Control runs on port 3001
   - **File:** `scripts/life-sync-check.sh`

### 3. **Fixed API Health Check**
   - **Old:** Called `/api/health` (doesn't exist)
   - **New:** Calls `/api/tasks?limit=1` (working endpoint)
   - **File:** `scripts/life-sync-check.sh`

### 4. **Fixed Response Parsing**
   - **Old:** Checked for `.status` field
   - **New:** Checks for `.success` field
   - **Reason:** API returns `{"success": true}` not `{"status": "success"}`
   - **File:** `scripts/life-sync-check.sh`

---

## Installation

### 1. Copy Files to Mission Control
```bash
# Files already copied to:
# /Users/chipai/Documents/Shared/projects/mission-control/deliverables/mc-003-15-minute-sweep/
```

### 2. Copy Launchd Plist to System
```bash
cp com.chipai.mission-control.sweep.plist ~/Library/LaunchDaemons/
```

### 3. Load the Daemon
```bash
launchctl bootstrap gui/$(id -u chipai) ~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist
```

### 4. Verify It's Running
```bash
launchctl list | grep mission-control.sweep
# Should return a PID like: 44374 0 com.chipai.mission-control.sweep
```

---

## Testing

### Health Check
```bash
cd ~/Documents/Shared/projects/configure-15-minute-continuous-sweep
export MISSION_CONTROL_SWEEP_TOKEN=5MY0vrWwbkapewyiS0rVYFmqsqa24jmRlT6sxuAZX4U
./scripts/life-sync-check.sh health
```

**Expected Output:**
```
✓ Launchd daemon is loaded
✓ Log file is recent (0m old)
✓ No sweep state file found (no sweeps executed yet)
```

### Manual Sweep Trigger
```bash
./scripts/life-sync-check.sh sweep
```

**Expected Output:**
```
✓ Sweep completed successfully

  Findings:
    - Gmail unread: 0
    - Slack mentions: 0
    - Stalled tasks: 0
    - Approaching deadlines: 0
```

### View Status
```bash
./scripts/life-sync-check.sh status
```

---

## How It Works

### 1. **Timing**
- Daemon configured to run **every 900 seconds (15 minutes)**
- Only active during **work hours (7 AM - 10 PM MST)**
- Skips weekends

### 2. **Checks**
- **Gmail:** Counts unread messages via Gmail API
- **Slack:** Detects recent mentions via Slack API
- **Tasks:** Queries Mission Control DB for stalled tasks (>2h no update)
- **Deadlines:** Finds tasks with due dates within 24 hours

### 3. **Routing**
- **Gmail findings** → TurboTenant Agent (`tt-agent-001`)
- **Slack mentions** → Context-aware agent routing
- **Stalled tasks** → Charlie (`charlie-001`) for escalation
- **Approaching deadlines** → Task-owning agent

### 4. **Execution**
- API endpoint: `POST /api/orchestration/sweep`
- Location: `/Users/chipai/workshop/src/app/api/orchestration/sweep/route.ts`
- Logging: `/Users/chipai/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log`
- State: `/Users/chipai/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep-state.json`

---

## Configuration

### Bearer Token
Set in `/Users/chipai/workshop/.env.local`:
```env
MISSION_CONTROL_SWEEP_TOKEN=5MY0vrWwbkapewyiS0rVYFmqsqa24jmRlT6sxuAZX4U
```

### Interval
Edit `StartInterval` in `com.chipai.mission-control.sweep.plist`:
```xml
<key>StartInterval</key>
<integer>900</integer>  <!-- Seconds -->
```

### Work Hours
Edit function `isWorkHours()` in `/Users/chipai/workshop/src/app/api/orchestration/sweep/route.ts`:
```typescript
function isWorkHours(): boolean {
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Denver' });
  // Currently: 7 AM - 10 PM, skips weekends
}
```

---

## Troubleshooting

### "Daemon not loaded?"
```bash
launchctl list | grep mission-control.sweep
# If empty, reload:
launchctl bootstrap gui/$(id -u chipai) ~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist
```

### "Sweep not running?"
```bash
# Check logs
tail -20 ~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log

# Force manual run
./scripts/life-sync-check.sh sweep

# Verify state file updated
stat ~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep-state.json
```

### "MC not reachable?"
```bash
# Verify MC is running
curl -s http://localhost:3001/api/tasks | head

# If not, start it:
cd /Users/chipai/workshop && npm run dev
```

### "Unauthorized error?"
```bash
# Check token is set
grep MISSION_CONTROL_SWEEP_TOKEN /Users/chipai/workshop/.env.local

# If empty, add it and restart MC
```

---

## Files in This Delivery

| File | Purpose |
|------|---------|
| **00-START-HERE.md** | Quick overview and first steps |
| **README.md** | Full documentation |
| **INTEGRATION_GUIDE.md** | Detailed setup and testing procedures |
| **DELIVERABLES.md** | Inventory of all components |
| **FILE_MANIFEST.md** | List of file locations |
| **com.chipai.mission-control.sweep.plist** | Launchd daemon configuration (updated to 900s interval) |
| **scripts/life-sync-check.sh** | Health check and test script (fixed for port 3001) |
| **SETUP.md** | This file |

---

## Verification Checklist

- ✅ Launchd plist updated to 900-second interval
- ✅ Scripts updated for port 3001 (not 3000)
- ✅ API health check fixed to use `/api/tasks`
- ✅ Response parsing fixed for `.success` field
- ✅ Manual sweep test successful
- ✅ Health check passes
- ✅ Daemon loaded and running (PID 44374)
- ✅ All documentation updated
- ✅ Deliverables registered on GitHub

---

## Next Steps

1. ✅ Review this document
2. ✅ Verify daemon is loaded: `launchctl list | grep mission-control.sweep`
3. ✅ Run manual test: `./scripts/life-sync-check.sh sweep`
4. ✅ Monitor first automated runs in `sweep.log`
5. ✅ Integrate with task routing system (already built, part of `/api/orchestration/sweep`)

---

**Charlie**
Master Orchestrator
Mission Control v2.0

2026-03-08 10:04 MST
