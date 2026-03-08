# Apple Health Data Sync Pipeline - Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│         Apple Health (System)               │
└──────────────┬──────────────────────────────┘
               │
               ↓ (HealthKit Framework)
┌─────────────────────────────────────────────┐
│  HealthExportCLI (Compiled Swift Binary)    │
│  - Requests HealthKit authorization         │
│  - Queries HKHealthStore for metrics       │
│  - Exports JSON format                      │
└──────────────┬──────────────────────────────┘
               │
               ↓ (Daily 7 AM via launchd)
┌─────────────────────────────────────────────┐
│    sync-health-data.sh (Shell Wrapper)      │
│    - Calls HealthExportCLI binary           │
│    - Saves to /data/life/health/            │
│    - Aggregates current metrics             │
│    - Posts status to Mission Control        │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│   /data/life/health/ (Data Storage)         │
│   - raw/{YYYY-MM-DD}.json (daily export)   │
│   - current/metrics.json (latest)           │
│   - logs/sync-*.log (execution logs)        │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│  Mission Control Dashboard (Life Agent)     │
│  - Display latest health metrics            │
│  - Show 7-day & 30-day trends              │
│  - Alert on anomalies                       │
└─────────────────────────────────────────────┘
```

## Step 1: Build Swift CLI Tool

```bash
cd ~/Documents/Shared/projects/apple-health-data-sync-pipeline/HealthExportCLI

# Build the CLI tool
swift build -c release

# Binary will be at: .build/release/HealthExportCLI
```

### Key Components in Swift Tool

1. **HKHealthStore Authorization**
   - Requests read permission for:
     - Steps (HKQuantityTypeIdentifier.stepCount)
     - Heart Rate (HKQuantityTypeIdentifier.heartRate)
     - Active Calories (HKQuantityTypeIdentifier.activeEnergyBurned)
     - Sleep Analysis (HKCategoryTypeIdentifier.sleepAnalysis)
     - Workouts (HKWorkoutType)

2. **Query Methods**
   - `HKStatisticsQuery` for aggregate metrics (steps, calories, HR avg/min/max)
   - `HKSampleQuery` for detailed records (sleep periods, workouts)

3. **JSON Export Format**
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
     "active_calories": 342,
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

## Step 2: Set Up launchd Scheduling

```bash
# Copy plist to ~/Library/LaunchAgents/
cp ~/Documents/Shared/projects/apple-health-data-sync-pipeline/com.chipai.health-sync.plist \
   ~/Library/LaunchAgents/

# Load the agent
launchctl load ~/Library/LaunchAgents/com.chipai.health-sync.plist

# Verify it's loaded
launchctl list | grep health-sync

# View logs
tail -f ~/Documents/Shared/projects/apple-health-data-sync-pipeline/data/logs/stdout.log
```

## Step 3: Manual Testing

```bash
# Test the sync script directly
bash ~/Documents/Shared/projects/apple-health-data-sync-pipeline/sync-health-data.sh

# Verify output was created
ls -la ~/Documents/Shared/projects/apple-health-data-sync-pipeline/data/raw/
cat ~/Documents/Shared/projects/apple-health-data-sync-pipeline/data/current/metrics.json

# Check logs
cat ~/Documents/Shared/projects/apple-health-data-sync-pipeline/data/logs/sync-*.log
```

## Step 4: Troubleshooting

### Issue: HealthKit shows no data
**Solution:** 
- Open Health app on Mac
- Grant app permissions in Settings → Health → Sources
- Ensure data is actually in Apple Health (wear an Apple Watch or use Health app to add data)

### Issue: launchd job not running
**Solution:**
```bash
# Check job status
launchctl list | grep health-sync

# If not loaded:
launchctl load ~/Library/LaunchAgents/com.chipai.health-sync.plist

# Check stderr for errors
cat ~/Documents/Shared/projects/apple-health-data-sync-pipeline/data/logs/stderr.log
```

### Issue: Mission Control heartbeat failing
**Solution:**
- Verify Mission Control is running on localhost:3001
- Check API token is correct
- Verify network connectivity

## Step 5: Dashboard Integration

Create a new Life agent dashboard component:

```javascript
// In Mission Control /mission-control/components/LifeHealthWidget.tsx

import { useEffect, useState } from 'react';

export default function LifeHealthWidget() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(
          '/data/current/metrics.json'
        );
        const data = await res.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch health metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading health metrics...</div>;
  if (!metrics) return <div>No health data available</div>;

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-bold mb-4">Today's Health</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-600">Steps</p>
          <p className="text-2xl font-bold">{metrics.steps || 0}</p>
        </div>
        <div>
          <p className="text-gray-600">HR (avg)</p>
          <p className="text-2xl font-bold">{metrics.heart_rate?.average || 0}</p>
        </div>
        <div>
          <p className="text-gray-600">Sleep</p>
          <p className="text-2xl font-bold">{metrics.sleep?.total_minutes || 0} min</p>
        </div>
        <div>
          <p className="text-gray-600">Calories</p>
          <p className="text-2xl font-bold">{Math.round(metrics.active_calories || 0)}</p>
        </div>
      </div>
    </div>
  );
}
```

## Requirements Checklist

- [ ] Build Swift CLI tool (`swift build -c release`)
- [ ] Test with sample HealthKit data
- [ ] Copy binary to `/usr/local/bin/health-export-cli`
- [ ] Update shell script to use binary path
- [ ] Load launchd plist
- [ ] Verify 7 AM sync works (manual test)
- [ ] Set up data directory with correct permissions
- [ ] Configure Mission Control API integration
- [ ] Add health widget to dashboard
- [ ] Test end-to-end (HealthKit → JSON → Dashboard)
- [ ] Set up monitoring/alerting for sync failures

## Security & Privacy

- ✅ No health data leaves the local machine
- ✅ launchd job runs with user privileges (no root)
- ✅ Data stored locally in user Documents folder
- ✅ HealthKit auth is per-user (iPhone/Mac privacy scope)
- ✅ Mission Control integration via local API (no external cloud)

## Future Enhancements

1. **Health Trends**
   - 7-day moving average for steps, HR
   - Sleep quality score trends
   - Weekly activity goals tracking

2. **Third-Party Integrations**
   - Sync with Oura Ring API (sleep quality)
   - Garmin Connect (workouts)
   - Whoop Strap (HRV, recovery)

3. **Anomaly Detection**
   - Alert if steps < 2,000 (sedentary day)
   - Alert if HR average > 85 (elevated)
   - Alert if sleep < 6 hours (insufficient)

4. **Export & Reporting**
   - Weekly health digest email
   - Monthly PDF report
   - Health metrics API endpoint for external tools

---

**Status:** ✅ Ready for implementation
**Last Updated:** 2026-03-07
