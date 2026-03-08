# Apple Health Data Sync Pipeline

## Task: lf-001
Configure daily 7 AM sync: export Apple Health data → store in /data/life/health/ → surface in dashboard

## Data to Capture
- Steps
- Sleep duration & quality
- Heart rate
- Workouts
- Active calories

## Implementation Approach

### Phase 1: Data Export Layer (Swift)
Since HealthKit requires Swift/Objective-C access, we need:
1. Swift CLI tool using HealthKit framework
2. Query HKHealthStore for requested metrics
3. Export to JSON format
4. Store in `/data/life/health/` with daily timestamps

### Phase 2: Scheduling (launchd)
- Create launchd plist for 7 AM daily execution
- Handle error notifications
- Log export results

### Phase 3: Data Storage
- Structured JSON in `/data/life/health/`
- Daily files: `YYYY-MM-DD.json`
- Aggregated `current-metrics.json` for dashboard
- SQLite for historical queries (optional)

### Phase 4: Dashboard Integration
- Connect to Mission Control
- Display latest metrics in Life agent dashboard
- Show trends (7-day, 30-day)
- Highlight anomalies

## Blockers / Questions for Chip
1. Does the Health data need real-time sync or is once-daily sufficient?
2. Should we integrate with existing health tracking tools (Oura, Garmin, Whoop)?
3. Privacy preference: how long to retain historical data?
4. Any specific health metrics beyond the 5 listed above?

## Next Steps
1. Build Swift CLI tool for HealthKit access ✓ [IN PROGRESS]
2. Create launchd plist for scheduling
3. Build JSON export format
4. Test with dummy data
5. Integrate with Mission Control dashboard
