# Mission Control Weekly Synthesis Report System

A comprehensive weekly reporting system that aggregates data from multiple sources (TurboTenant, WeTried.it, kids milestones, personal health, and GameBuzz metrics) into a formatted Markdown report, delivered automatically every Friday at 4 PM MST.

## Quick Start

### 1. Install the launchd daemon

```bash
# Copy plist to LaunchDaemons
cp com.chipai.mission-control.weekly-synthesis.plist ~/Library/LaunchDaemons/

# Load the daemon
launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist

# Verify it's loaded
launchctl list | grep weekly-synthesis
```

### 2. Test manually

```bash
# Dry run (preview without saving)
./scripts/weekly-synthesis.js --dry-run

# Generate for specific date
./scripts/weekly-synthesis.js --date=2025-03-07

# Live run (saves to dashboard)
./scripts/weekly-synthesis.js
```

### 3. API endpoint

If you have a Next.js app with the API endpoint configured:

```bash
# Generate report via API
curl -X POST http://localhost:3000/api/reports/weekly-synthesis

# Get latest report
curl http://localhost:3000/api/reports/weekly-synthesis

# With options
curl -X POST "http://localhost:3000/api/reports/weekly-synthesis?dryRun=true&date=2025-03-07"
```

## System Architecture

### Components

```
build-weekly-synthesis-report/
├── scripts/
│   └── weekly-synthesis.js          # Standalone report generator (Node.js)
├── src/app/api/reports/
│   └── weekly-synthesis/
│       └── route.ts                 # Next.js API endpoint
├── com.chipai.mission-control...plist  # launchd daemon config
├── README.md                        # This file
├── INTEGRATION_GUIDE.md             # Setup & troubleshooting
├── DELIVERABLES.md                  # File listing
└── 00-START-HERE.md                # Quick reference
```

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│         Friday 4 PM (launchd trigger)                   │
│                or Manual Execution                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│     weekly-synthesis.js (Node.js Script)                │
├─────────────────────────────────────────────────────────┤
│ 1. Collect Data:                                        │
│    ├─ TurboTenant (Motion API or local notes)          │
│    ├─ WeTried.it (WordPress API)                       │
│    ├─ Kids updates (Health DB)                         │
│    ├─ Health metrics (Health DB)                       │
│    └─ GameBuzz/Twitter (Twitter API or mock)           │
│                                                         │
│ 2. Generate Markdown Report                            │
│ 3. Save to dashboard                                   │
│ 4. Post to Slack (if webhook configured)              │
│ 5. Update state file                                   │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
 Output    State File    Slack
 Report    (JSON)      Message
```

## Configuration

### Environment Variables

The system uses these environment variables (optional):

```bash
# API Keys
export MOTION_API_KEY="your-motion-api-key"
export TWITTER_API_KEY="your-twitter-bearer-token"
export MISSION_CONTROL_SLACK_WEBHOOK="https://hooks.slack.com/services/..."

# WordPress (for WeTried.it)
export WP_USER="triedit"
export WP_PASS="your-wordpress-password"
```

### Data Sources

The system expects these data sources to be available:

1. **TurboTenant**
   - Primary: Motion API (`MOTION_API_KEY`)
   - Fallback: Mock data
   - Data needed: wins, blockers, key metrics, trend

2. **WeTried.it**
   - Primary: WordPress API (credentials from env)
   - Fallback: Mock data
   - Data needed: revenue, content performance, SEO rankings

3. **Kids Updates**
   - Primary: `~/.mission-control/health-db.json`
   - Fallback: Mock data
   - Data needed: milestones, health status, activities

4. **Health Metrics**
   - Primary: `~/.mission-control/health-db.json`
   - Fallback: Mock data
   - Data needed: sleep, exercise, nutrition (past 7 days)

5. **GameBuzz / Twitter**
   - Primary: Twitter API
   - Fallback: Mock data
   - Data needed: followers, engagement metrics, trending topics

### Health Database Structure

If you have a health database at `~/.mission-control/health-db.json`:

```json
{
  "milestones": [
    {
      "date": "2025-03-05",
      "note": "Soccer practice progressing well"
    }
  ],
  "health": {
    "status": "excellent",
    "notes": "All children healthy and active"
  },
  "activities": [
    "Soccer practice",
    "Swimming lessons"
  ],
  "healthLog": [
    {
      "date": "2025-03-05",
      "sleep": 7.5,
      "exercise": true,
      "nutrition": "good"
    }
  ]
}
```

## Report Format

The generated report includes:

- **Executive Summary** (3-5 sentences)
- **TurboTenant** section with wins, blockers, and metrics
- **WeTried.it** section with revenue, content performance, and SEO
- **Kids Updates** with milestones, health status, and activities
- **Health & Wellness** with sleep, exercise, nutrition tracking
- **GameBuzz / Social** with follower growth and engagement metrics
- **Action Items** organized by priority (High, Medium, Low)

### Example Report

A sample report is generated when you run the script with `--dry-run`:

```bash
./scripts/weekly-synthesis.js --dry-run
```

This shows you the exact format and structure without saving to disk.

## Usage

### Manual Execution

```bash
# Navigate to project directory
cd ~/Documents/Shared/projects/build-weekly-synthesis-report

# Dry run (preview)
./scripts/weekly-synthesis.js --dry-run

# Generate for today
./scripts/weekly-synthesis.js

# Generate for specific date
./scripts/weekly-synthesis.js --date=2025-03-07

# Check logs
tail -f ~/.mission-control/weekly-synthesis.log
```

### Scheduled Execution (launchd)

The daemon runs automatically every Friday at 4 PM MST. To interact with it:

```bash
# Load the daemon
launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist

# Unload (disable) the daemon
launchctl unload ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist

# Check if loaded
launchctl list | grep weekly-synthesis

# View logs
cat ~/.mission-control/weekly-synthesis.log
cat ~/.mission-control/weekly-synthesis-error.log

# Manually trigger (even if not Friday)
launchctl start com.chipai.mission-control.weekly-synthesis
```

### API Endpoint Usage

If integrated into your Next.js app:

```bash
# Generate report via API
curl -X POST http://localhost:3000/api/reports/weekly-synthesis

# Dry run via API
curl -X POST "http://localhost:3000/api/reports/weekly-synthesis?dryRun=true"

# Generate for specific date
curl -X POST "http://localhost:3000/api/reports/weekly-synthesis" \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-03-07", "dryRun": false}'

# Get latest report
curl http://localhost:3000/api/reports/weekly-synthesis
```

## Output

### Report Location

Reports are saved to:
```
~/Documents/Shared/mission-control-dashboard/weekly-scorecard-YYYY-MM-DD.md
```

### State File

The system maintains state at:
```
~/.mission-control/weekly-synthesis-state.json
```

Example state file:
```json
{
  "lastGenerated": "2025-03-07T16:00:00.000Z",
  "lastReport": "/Users/chipai/Documents/Shared/mission-control-dashboard/weekly-scorecard-2025-03-07.md",
  "status": "success"
}
```

### Logs

Logs are written to:
- **Info:** `~/.mission-control/weekly-synthesis.log`
- **Errors:** `~/.mission-control/weekly-synthesis-error.log` (if launchd)

## Troubleshooting

### Report not generating on Friday

1. **Check if daemon is loaded:**
   ```bash
   launchctl list | grep weekly-synthesis
   ```
   If not listed, load it:
   ```bash
   launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist
   ```

2. **Check logs:**
   ```bash
   tail -50 ~/.mission-control/weekly-synthesis.log
   ```

3. **Manually trigger:**
   ```bash
   launchctl start com.chipai.mission-control.weekly-synthesis
   ```

4. **Run script directly:**
   ```bash
   ~/Documents/Shared/projects/build-weekly-synthesis-report/scripts/weekly-synthesis.js
   ```

### Missing data from sources

1. **Check environment variables:**
   ```bash
   echo $MOTION_API_KEY
   echo $WP_USER
   ```

2. **Check health database:**
   ```bash
   cat ~/.mission-control/health-db.json
   ```

3. **Check script logs for errors:**
   ```bash
   grep "Error collecting" ~/.mission-control/weekly-synthesis.log
   ```

The system gracefully falls back to mock data if any data source is unavailable, so the report will still be generated.

### Dashboard directory not found

Create the dashboard directory:
```bash
mkdir -p ~/Documents/Shared/mission-control-dashboard
```

### Permission denied when running script

Make the script executable:
```bash
chmod +x ~/Documents/Shared/projects/build-weekly-synthesis-report/scripts/weekly-synthesis.js
```

### Node.js not found

The script requires Node.js v14+. Install it:
```bash
# Using Homebrew
brew install node

# Or check if it's already installed
which node
node --version
```

## Integration Points

### With Slack

To enable Slack notifications:

1. Create a Slack webhook in your workspace
2. Set the environment variable:
   ```bash
   export MISSION_CONTROL_SLACK_WEBHOOK="https://hooks.slack.com/services/..."
   ```
3. The script will post the report summary each Friday at 4 PM

### With Next.js App

Copy the API endpoint file to your app:
```bash
# Assuming your app is at ~/your-app
cp -r src/app/api ~/your-app/src/app/
```

Then access it via your app's API endpoint.

### With Task Management

The report includes action items that can be exported to:
- Google Tasks (via gws-tasks)
- Motion (via Motion API)
- Your preferred task manager

## Development

### Testing Data Collection

```bash
# Test each data source individually
node -e "
const { getTurboTenantData, getWeTriedData, getKidsData, getHealthData, getGameBuzzData } = require('./scripts/weekly-synthesis.js');

console.log('TurboTenant:', getTurboTenantData());
console.log('WeTried:', getWeTriedData());
console.log('Kids:', getKidsData());
console.log('Health:', getHealthData());
console.log('GameBuzz:', getGameBuzzData());
"
```

### Adding Custom Data Sources

Edit `scripts/weekly-synthesis.js` and add a new data collection function:

```javascript
function getCustomData() {
  log('Collecting custom data...');
  
  try {
    // Add your data collection logic here
    return {
      metric1: value1,
      metric2: value2
    };
  } catch (error) {
    log(`Error: ${error.message}`, 'ERROR');
    return { metric1: 'N/A', metric2: 'N/A' };
  }
}
```

Then add it to the main function:
```javascript
const data = {
  turboTenant: getTurboTenantData(),
  weTriedIt: getWeTriedData(),
  kids: getKidsData(),
  health: getHealthData(),
  gameBuzz: getGameBuzzData(),
  custom: getCustomData(),  // Add here
};
```

And update the report template to include it.

## Maintenance

### Weekly Checklist

- [ ] Report generated on Friday 4 PM
- [ ] All data sources returned valid data (check logs)
- [ ] Report contains expected metrics and trends
- [ ] Slack notification received (if configured)
- [ ] No errors in log files

### Monthly Tasks

- [ ] Review report archive in `~/Documents/Shared/mission-control-dashboard/`
- [ ] Update health database with recent milestones
- [ ] Update action items for next month
- [ ] Check for API changes from data sources
- [ ] Review and update this documentation if needed

## File Structure

```
build-weekly-synthesis-report/
├── README.md                                 # This file
├── 00-START-HERE.md                         # Quick reference
├── INTEGRATION_GUIDE.md                     # Detailed setup
├── DELIVERABLES.md                          # File listing
├── com.chipai.mission-control.weekly-synthesis.plist
├── scripts/
│   └── weekly-synthesis.js                  # Main script
└── src/app/api/reports/weekly-synthesis/
    └── route.ts                             # Next.js API endpoint
```

## Support

### Debugging

Enable verbose logging:
```bash
# The script logs to ~/.mission-control/weekly-synthesis.log
# To see real-time output:
tail -f ~/.mission-control/weekly-synthesis.log &
./scripts/weekly-synthesis.js
```

### Common Issues

See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for detailed troubleshooting steps.

---

**Next Report:** Check your calendar for next Friday 4 PM MST  
**Report Location:** `~/Documents/Shared/mission-control-dashboard/weekly-scorecard-*.md`  
**System Status:** Run `./scripts/weekly-synthesis.js --dry-run` to test
