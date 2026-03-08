# 🚀 Quick Start - Weekly Synthesis Report System

**Time to setup: ~5 minutes**

## What This Does

Every Friday at 4 PM (MST), generates a comprehensive weekly report that includes:
- ✅ TurboTenant wins & blockers
- ✅ WeTried.it revenue & SEO progress
- ✅ Kids milestones & health updates
- ✅ Your personal health metrics
- ✅ GameBuzz / Twitter growth

The report is automatically saved and (optionally) posted to Slack.

## Quick Setup (3 steps)

### 1️⃣ Install the Daemon

```bash
cp com.chipai.mission-control.weekly-synthesis.plist ~/Library/LaunchDaemons/
launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist
```

### 2️⃣ Test It

```bash
./scripts/weekly-synthesis.js --dry-run
```

Should show a sample report.

### 3️⃣ Verify (Next Friday 4 PM)

Check the report:
```bash
ls ~/Documents/Shared/mission-control-dashboard/
```

View the log:
```bash
cat ~/.mission-control/weekly-synthesis.log
```

**Done!** ✅ Reports will now generate automatically every Friday.

---

## Common Tasks

### 🔧 Generate Report Manually

```bash
./scripts/weekly-synthesis.js --date=2025-03-07
```

### 📋 View Latest Report

```bash
cat ~/Documents/Shared/mission-control-dashboard/weekly-scorecard-*.md | tail -1
```

### 🔍 Check Status

```bash
# Is daemon running?
launchctl list | grep weekly-synthesis

# What's in the logs?
tail ~/.mission-control/weekly-synthesis.log

# When was last report?
cat ~/.mission-control/weekly-synthesis-state.json
```

### 🚫 Disable/Enable

```bash
# Disable (Friday reports stop)
launchctl unload ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist

# Re-enable
launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist
```

### 🔔 Set Up Slack Notifications (Optional)

```bash
export MISSION_CONTROL_SLACK_WEBHOOK="https://hooks.slack.com/services/..."
```

Then reports will post summaries to Slack.

---

## File Locations

| What | Where |
|------|-------|
| Script | `scripts/weekly-synthesis.js` |
| Daemon Config | `com.chipai.mission-control.weekly-synthesis.plist` |
| Reports | `~/Documents/Shared/mission-control-dashboard/` |
| Logs | `~/.mission-control/weekly-synthesis.log` |
| State | `~/.mission-control/weekly-synthesis-state.json` |
| API Endpoint | `src/app/api/reports/weekly-synthesis/route.ts` |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Daemon not loading | `chmod 644 ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist` |
| Script not executable | `chmod +x scripts/weekly-synthesis.js` |
| No reports appearing | Run test: `./scripts/weekly-synthesis.js --date=2025-03-07` |
| Node not found | `brew install node` |
| Directory missing | `mkdir -p ~/Documents/Shared/mission-control-dashboard` |

**More help:** See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for detailed troubleshooting.

---

## API Usage (if integrated)

```bash
# Generate report via API
curl -X POST http://localhost:3000/api/reports/weekly-synthesis

# Get latest report
curl http://localhost:3000/api/reports/weekly-synthesis

# Dry run via API
curl -X POST "http://localhost:3000/api/reports/weekly-synthesis?dryRun=true"
```

---

## What's Next?

1. ✅ Complete the 3 setup steps above
2. 📝 Create `~/.mission-control/health-db.json` for real health data
3. 🔑 Set environment variables for API integrations (optional)
4. 📊 Check your first report on Friday 4 PM
5. 🔧 Customize the report format in `scripts/weekly-synthesis.js`

---

## File Structure

```
build-weekly-synthesis-report/
├── 📄 00-START-HERE.md          ← You are here
├── 📖 README.md                 ← Full documentation
├── 🔧 INTEGRATION_GUIDE.md      ← Detailed setup
├── 📋 DELIVERABLES.md           ← File listing
├── 📜 com.chipai.mission-control.weekly-synthesis.plist
├── 📁 scripts/
│   └── weekly-synthesis.js      ← Main script (executable)
└── 📁 src/app/api/
    └── reports/weekly-synthesis/
        └── route.ts             ← Next.js API endpoint
```

---

## Questions?

- **Setup issues?** → See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- **How to customize?** → See [README.md](README.md)
- **File locations?** → See [DELIVERABLES.md](DELIVERABLES.md)
- **Status check?** → Run `./scripts/weekly-synthesis.js --dry-run`

---

**Status: Ready to deploy** ✅  
**Next: Follow the 3 setup steps above**
