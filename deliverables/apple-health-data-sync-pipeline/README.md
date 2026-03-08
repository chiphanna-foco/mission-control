# Apple Health Data Sync Pipeline

**Task:** Configure daily 7 AM sync: export Apple Health data → store in /data/life/health/ → surface in dashboard

**Status:** ✅ Ready for implementation (core architecture & scripts complete)

## What This Does

Every day at 7 AM:
1. Queries Apple Health data for: steps, sleep, heart rate, workouts, active calories
2. Exports to JSON format in `/data/life/health/raw/{YYYY-MM-DD}.json`
3. Aggregates latest metrics to `/data/life/health/current/metrics.json`
4. Sends status update to Mission Control API
5. Logs execution to `/data/life/health/logs/`

## Quick Start

### Prerequisites
- macOS with Apple Health app
- Swift 5.5+ (for building CLI tool)
- Terminal access

### Installation

```bash
# 1. Build the Swift CLI tool
cd ~/Documents/Shared/projects/apple-health-data-sync-pipeline/HealthExportCLI
swift build -c release

# 2. Copy binary to system location
sudo cp .build/release/HealthExportCLI /usr/local/bin/health-export-cli

# 3. Load the launchd job
cp ~/Documents/Shared/projects/apple-health-data-sync-pipeline/com.chipai.health-sync.plist \
   ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.chipai.health-sync.plist

# 4. Verify it's running
launchctl list | grep health-sync
```

### Manual Test

```bash
# Run sync script immediately
bash ~/Documents/Shared/projects/apple-health-data-sync-pipeline/sync-health-data.sh

# Check output
cat ~/Documents/Shared/projects/apple-health-data-sync-pipeline/data/current/metrics.json
```

## File Structure

```
apple-health-data-sync-pipeline/
├── README.md                           # This file
├── PLAN.md                            # High-level strategy
├── IMPLEMENTATION.md                  # Detailed setup guide
├── sync-health-data.sh                # Shell wrapper (runs daily)
├── com.chipai.health-sync.plist       # launchd configuration (7 AM scheduler)
├── health-export.swift                # HealthKit integration code
├── HealthExportCLI/                   # Swift package
│   ├── Package.swift
│   ├── Sources/
│   │   └── HealthExportCLI/
│   │       └── main.swift
│   └── .build/release/HealthExportCLI (compiled binary)
└── data/                              # Generated at runtime
    ├── raw/                           # Daily exports: {YYYY-MM-DD}.json
    ├── current/                       # Latest metrics.json
    └── logs/                          # sync-*.log files
```

## Data Format

Each daily export includes:

```json
{
  "timestamp": "2026-03-07T07:00:00Z",
  "date": "2026-03-07",
  "steps": 8452,
  "heart_rate": {
    "average": 68,
    "min": 55,
    "max": 92
  },
  "active_calories": 342.5,
  "sleep": {
    "total_minutes": 480,
    "quality_score": 0.85,
    "sleep_periods": 1
  },
  "workouts": [
    {
      "type": 18,
      "start": "2026-03-07T06:30:00Z",
      "end": "2026-03-07T07:15:00Z",
      "duration_minutes": 45,
      "calories_burned": 280
    }
  ]
}
```

## Troubleshooting

**Q: No health data showing up?**
A: 
- Open Health app, ensure data sources are enabled
- Wear an Apple Watch or manually add test data in Health app
- Make sure you've authorized the HealthExportCLI app in System Settings → Health

**Q: launchd job not running?**
A:
```bash
# Check status
launchctl list | grep health-sync

# View errors
cat ~/Documents/Shared/projects/apple-health-data-sync-pipeline/data/logs/stderr.log

# Reload if needed
launchctl unload ~/Library/LaunchAgents/com.chipai.health-sync.plist
launchctl load ~/Library/LaunchAgents/com.chipai.health-sync.plist
```

**Q: Manual test failed?**
A:
```bash
# Make sure script is executable
chmod +x ~/Documents/Shared/projects/apple-health-data-sync-pipeline/sync-health-data.sh

# Run with verbose output
bash -x ~/Documents/Shared/projects/apple-health-data-sync-pipeline/sync-health-data.sh
```

## Next Steps

1. ✅ Architecture designed
2. ✅ Swift HealthKit code written
3. ✅ Shell wrapper created
4. ✅ launchd plist configured
5. ⏳ **Build & test Swift CLI tool** ← You are here
6. ⏳ Install launchd job
7. ⏳ Add dashboard widget
8. ⏳ Set up alerting for sync failures

## Integration with Mission Control

The sync script sends heartbeats to Mission Control at:
```
POST http://localhost:3001/api/tasks/lf-001/activities
```

This allows the Life agent dashboard to:
- Track sync status
- Show latest metrics
- Alert on failures
- Display trends

## Security & Privacy

✅ **Data stays local** - No health data leaves your machine
✅ **User permissions** - launchd runs as regular user (no root)
✅ **HealthKit authorization** - Per-app, user-controlled
✅ **Local API only** - Mission Control on localhost:3001

---

**Task ID:** lf-001  
**Priority:** HIGH  
**Status:** Ready for implementation  
**Last Updated:** 2026-03-07 16:47 MST
