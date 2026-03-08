# START HERE - Mission Control 60-Minute Continuous Sweep

## Quick Overview

This project implements a **60-minute automated monitoring system** that continuously checks:
- 📧 Gmail (unread messages)
- 💬 Slack (mentions)
- ⚠️ Stalled tasks (no update >2h)
- ⏰ Approaching deadlines (due within 24h)

And automatically routes findings to appropriate agents for action.

---

## What Was Built

✅ **Launchd Daemon** - Runs every 60 minutes (3600s)
✅ **API Endpoint** - POST/GET `/api/orchestration/sweep`
✅ **Health Check Script** - 4 subcommands for testing and monitoring
✅ **Complete Documentation** - Setup guides, troubleshooting, examples

---

## Files in This Directory

| File | What It Is | Read First? |
|------|-----------|----------|
| **README.md** | Main documentation - features, usage, troubleshooting | ✅ YES |
| **INTEGRATION_GUIDE.md** | Detailed setup steps and testing procedures | ✅ After README |
| **DELIVERABLES.md** | Complete inventory of everything built | Reference |
| **FILE_MANIFEST.md** | List of all files and their locations | Reference |
| **scripts/life-sync-check.sh** | Health check script (executable) | Use after setup |
| **com.chipai.mission-control.sweep.plist** | Launchd configuration (also in ~/Library/LaunchDaemons/) | Used internally |

---

## Installation (3 Steps)

### 1. Load the Daemon
```bash
launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist
```

### 2. Configure Token
Add to `/Users/chipai/workshop/.env.local`:
```env
MISSION_CONTROL_SWEEP_TOKEN=your-secure-token-here
```

### 3. Verify It Works
```bash
./scripts/life-sync-check.sh health
./scripts/life-sync-check.sh sweep
./scripts/life-sync-check.sh status
```

---

## Quick Commands

```bash
# Check health status
./scripts/life-sync-check.sh health

# Manually run the sweep
./scripts/life-sync-check.sh sweep

# See latest results
./scripts/life-sync-check.sh status

# Force immediate execution
./scripts/life-sync-check.sh trigger

# Watch the logs
tail -f sweep.log
```

---

## Where Everything Is

| Component | Location |
|-----------|----------|
| 🔧 API Endpoint | `/Users/chipai/workshop/src/app/api/orchestration/sweep/route.ts` |
| 📋 Launchd Config | `~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist` |
| 📝 Health Script | `~/Documents/Shared/projects/configure-15-minute-continuous-sweep/scripts/life-sync-check.sh` |
| 📊 Logs | `~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep.log` |
| 📈 State | `~/Documents/Shared/projects/configure-15-minute-continuous-sweep/sweep-state.json` |

---

## What Happens Every 15 Minutes

1. **Launchd** triggers the health check script
2. **Script** calls the API endpoint with Bearer token
3. **API** executes 4 checks in parallel:
   - Gmail (if token available)
   - Slack (if token available)
   - Stalled tasks (2h+ no update)
   - Approaching deadlines (24h window)
4. **API** routes findings to agents:
   - Gmail findings → TurboTenant
   - Slack mentions → Context agent
   - Stalled tasks → Charlie for escalation
   - Approaching deadlines → Task owner
5. **Results** saved to JSON and log file
6. **Next run** in 15 minutes

---

## Troubleshooting Quick Fixes

**"Daemon not loaded?"**
```bash
launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.sweep.plist
launchctl list | grep mission-control
```

**"Unauthorized error?"**
```bash
# Check token is set
grep MISSION_CONTROL_SWEEP_TOKEN /Users/chipai/workshop/.env.local

# If empty, add it and restart Mission Control
```

**"Sweep not running?"**
```bash
# Check logs
tail -20 sweep.log

# Force immediate run
./scripts/life-sync-check.sh trigger

# Watch for execution
watch -n 5 'stat sweep-state.json | grep Modify'
```

**"No API endpoint?"**
```bash
# Verify Mission Control is running
curl -s http://localhost:3000/api/health | head

# Restart if needed
cd /Users/chipai/workshop && npm run dev
```

---

## Next Steps

1. ✅ Read **README.md** for full details
2. ✅ Run **INTEGRATION_GUIDE.md** setup steps
3. ✅ Test with `./scripts/life-sync-check.sh sweep`
4. ✅ Monitor `./scripts/life-sync-check.sh status`
5. ✅ Set up log rotation (optional, see INTEGRATION_GUIDE.md)
6. ✅ Customize routing (optional, see README.md Advanced section)

---

## Key Features Implemented

✅ **Every 15 minutes** - Automated schedule via launchd
✅ **4 Finding Types** - Gmail, Slack, stalled tasks, deadlines
✅ **Smart Routing** - Routes to appropriate agents based on finding type
✅ **Work Hours** - Only active 7AM-10PM MST Mon-Fri
✅ **Bearer Token Auth** - Secure API access
✅ **Error Handling** - Graceful failures, detailed logging
✅ **State Persistence** - Results saved for monitoring
✅ **Health Checks** - 4 diagnostic subcommands
✅ **Complete Docs** - Everything documented with examples

---

## Got Questions?

- **How do I...?** → See README.md or INTEGRATION_GUIDE.md
- **Something broke** → Check sweep.log and run health check
- **Want to customize** → See README.md Advanced section
- **Need details** → See DELIVERABLES.md or FILE_MANIFEST.md

All documentation is local and self-contained. No external resources needed.

---

**Status:** ✅ Ready to Use
**Created:** 2026-03-07
**Time Zone:** America/Denver (MST)
**Interval:** 15 minutes (900 seconds)

Start with README.md →
