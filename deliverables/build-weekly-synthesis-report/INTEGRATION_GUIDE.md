# Integration Guide - Weekly Synthesis Report System

This guide provides step-by-step instructions for integrating the weekly synthesis report system into Mission Control.

## Prerequisites

- macOS with launchd support
- Node.js v14+ installed
- Bash shell
- Access to data sources (optional, system has graceful fallbacks)

## Installation Steps

### Step 1: Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v14+

# Check if node is in standard location
which node
```

If Node.js is not installed:
```bash
brew install node
```

### Step 2: Set Up Directories

```bash
# Create mission control data directory
mkdir -p ~/.mission-control

# Create dashboard directory for reports
mkdir -p ~/Documents/Shared/mission-control-dashboard

# Verify permissions
chmod 700 ~/.mission-control
chmod 755 ~/Documents/Shared/mission-control-dashboard
```

### Step 3: Copy Project Files

The files are already in:
```
~/Documents/Shared/projects/build-weekly-synthesis-report/
```

Verify the structure:
```bash
ls -la ~/Documents/Shared/projects/build-weekly-synthesis-report/
```

Should show:
- `scripts/weekly-synthesis.js`
- `src/app/api/reports/weekly-synthesis/route.ts`
- `com.chipai.mission-control.weekly-synthesis.plist`
- `README.md`, `INTEGRATION_GUIDE.md`, etc.

### Step 4: Make Script Executable

```bash
chmod +x ~/Documents/Shared/projects/build-weekly-synthesis-report/scripts/weekly-synthesis.js
```

Verify:
```bash
~/Documents/Shared/projects/build-weekly-synthesis-report/scripts/weekly-synthesis.js --dry-run
```

You should see a sample report output.

### Step 5: Configure launchd Daemon

#### Copy plist file:
```bash
cp ~/Documents/Shared/projects/build-weekly-synthesis-report/com.chipai.mission-control.weekly-synthesis.plist \
   ~/Library/LaunchDaemons/
```

#### Set correct permissions:
```bash
chmod 644 ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist
```

#### Load the daemon:
```bash
launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist
```

#### Verify it's loaded:
```bash
launchctl list | grep weekly-synthesis
```

Should output something like:
```
- 0 com.chipai.mission-control.weekly-synthesis
```

### Step 6: Set Up Environment Variables (Optional)

Edit your shell profile (`.zshrc`, `.bash_profile`, etc.):

```bash
# For Slack notifications
export MISSION_CONTROL_SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# For Motion API integration
export MOTION_API_KEY="your-motion-api-key"

# For WordPress API (WeTried.it)
export WP_USER="triedit"
export WP_PASS="your-wordpress-password"

# For Twitter API
export TWITTER_API_KEY="your-twitter-bearer-token"
```

Then reload your shell:
```bash
source ~/.zshrc
```

## Testing the Installation

### Test 1: Dry Run (Preview Report)

```bash
~/Documents/Shared/projects/build-weekly-synthesis-report/scripts/weekly-synthesis.js --dry-run
```

Expected output:
- Shows report preview with sections for each domain
- No files created
- Should complete in a few seconds

### Test 2: Generate Report

```bash
~/Documents/Shared/projects/build-weekly-synthesis-report/scripts/weekly-synthesis.js --date=2025-03-07
```

Expected output:
- Report saved to `~/Documents/Shared/mission-control-dashboard/weekly-scorecard-2025-03-07.md`
- State file created at `~/.mission-control/weekly-synthesis-state.json`

Verify:
```bash
ls -la ~/Documents/Shared/mission-control-dashboard/
cat ~/.mission-control/weekly-synthesis-state.json
```

### Test 3: Check Logs

```bash
cat ~/.mission-control/weekly-synthesis.log
```

Look for any warnings or errors. The system gracefully handles missing data sources.

### Test 4: Manual Daemon Trigger

```bash
# Manually trigger the daemon (even though it's not Friday)
launchctl start com.chipai.mission-control.weekly-synthesis

# Wait a moment, then check if report was created
ls -la ~/Documents/Shared/mission-control-dashboard/weekly-scorecard-*.md | tail -1

# Check logs
tail -20 ~/.mission-control/weekly-synthesis.log
```

## API Endpoint Integration

If you have a Next.js app with API routes:

### Option 1: Copy to Existing App

```bash
# Copy the API endpoint to your app
mkdir -p ~/your-app/src/app/api/reports/weekly-synthesis
cp ~/Documents/Shared/projects/build-weekly-synthesis-report/src/app/api/reports/weekly-synthesis/route.ts \
   ~/your-app/src/app/api/reports/weekly-synthesis/
```

### Option 2: Direct Integration

The API endpoint is also available at:
```
~/Documents/Shared/projects/build-weekly-synthesis-report/src/app/api/reports/weekly-synthesis/route.ts
```

You can reference it from your existing app's API routes.

### Test the API Endpoint

```bash
# Generate report via API
curl -X POST http://localhost:3000/api/reports/weekly-synthesis

# With dry-run option
curl -X POST "http://localhost:3000/api/reports/weekly-synthesis?dryRun=true"

# With specific date
curl -X POST http://localhost:3000/api/reports/weekly-synthesis \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-03-07"}'

# Get latest report
curl http://localhost:3000/api/reports/weekly-synthesis
```

## Data Source Configuration

### TurboTenant (Motion API)

1. Get your Motion API key from [usemotion.com](https://usemotion.com)
2. Set environment variable:
   ```bash
   export MOTION_API_KEY="your-key-here"
   ```
3. Test:
   ```bash
   curl -H "X-API-Key: $MOTION_API_KEY" https://api.usemotion.com/v1/workspaces
   ```

### WeTried.it (WordPress API)

1. Get WordPress credentials (username and app password)
2. Set environment variables:
   ```bash
   export WP_USER="your-username"
   export WP_PASS="your-app-password"
   ```
3. Test:
   ```bash
   curl -u "$WP_USER:$WP_PASS" https://wetried.it/wp-json/wp/v2/posts?per_page=1
   ```

### Health Database

Create a health database at `~/.mission-control/health-db.json`:

```json
{
  "milestones": [
    {
      "date": "2025-03-05",
      "note": "Kids milestone or achievement"
    }
  ],
  "health": {
    "status": "excellent",
    "notes": "Health status notes"
  },
  "activities": [
    "Activity 1",
    "Activity 2"
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

### Slack Integration

1. Create a Slack app at [api.slack.com](https://api.slack.com)
2. Create an Incoming Webhook
3. Set environment variable:
   ```bash
   export MISSION_CONTROL_SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
   ```
4. Test:
   ```bash
   curl -X POST $MISSION_CONTROL_SLACK_WEBHOOK \
     -H 'Content-Type: application/json' \
     -d '{"text":"Test message"}'
   ```

## Scheduling Verification

### Verify launchd Schedule

The daemon is configured to run every Friday at 4 PM MST:

```bash
# View the plist configuration
cat ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist | grep -A 4 "StartCalendarInterval"
```

Should show:
```
<key>StartCalendarInterval</key>
<dict>
  <key>Weekday</key>
  <integer>5</integer>   <!-- 5 = Friday -->
  <key>Hour</key>
  <integer>16</integer>  <!-- 16:00 = 4 PM -->
  <key>Minute</key>
  <integer>0</integer>   <!-- :00 seconds -->
</dict>
```

### Check Next Execution

```bash
# See when launchd will next run the job
# Note: launchd doesn't expose this directly, so we check the log
tail -10 ~/.mission-control/weekly-synthesis.log

# Or manually check by looking at the state file timestamp
cat ~/.mission-control/weekly-synthesis-state.json | grep lastGenerated
```

## Troubleshooting

### Issue: "Command not found" when running script

```bash
# Make sure Node.js is installed
which node

# Make sure script is executable
ls -la ~/Documents/Shared/projects/build-weekly-synthesis-report/scripts/weekly-synthesis.js

# Try running with explicit node
node ~/Documents/Shared/projects/build-weekly-synthesis-report/scripts/weekly-synthesis.js
```

### Issue: Daemon not running on Friday 4 PM

1. **Check if daemon is loaded:**
   ```bash
   launchctl list | grep weekly-synthesis
   ```

2. **Reload the daemon:**
   ```bash
   launchctl unload ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist
   launchctl load ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist
   ```

3. **Manually trigger to test:**
   ```bash
   launchctl start com.chipai.mission-control.weekly-synthesis
   ```

4. **Check logs:**
   ```bash
   tail -50 ~/.mission-control/weekly-synthesis.log
   tail -50 ~/.mission-control/weekly-synthesis-error.log
   ```

### Issue: Missing data in report

The system gracefully handles missing data sources by using mock data. Check the logs to see which sources failed:

```bash
grep "Error collecting" ~/.mission-control/weekly-synthesis.log
```

For each missing source:

1. **TurboTenant:** Set `MOTION_API_KEY` environment variable
2. **WeTried.it:** Set `WP_USER` and `WP_PASS` environment variables
3. **Kids data:** Create/update `~/.mission-control/health-db.json`
4. **Health data:** Create/update `~/.mission-control/health-db.json`
5. **GameBuzz:** Set `TWITTER_API_KEY` environment variable

### Issue: Directory permissions

```bash
# Ensure launchd can write to directories
chmod 755 ~/.mission-control
chmod 755 ~/Documents/Shared/mission-control-dashboard

# Check ownership
ls -la ~/.mission-control/
ls -la ~/Documents/Shared/mission-control-dashboard/
```

### Issue: API endpoint returns 404

1. Verify the file is in the correct location:
   ```bash
   ls -la ~/your-app/src/app/api/reports/weekly-synthesis/route.ts
   ```

2. Verify it's imported in your app's API router

3. Check your app's build:
   ```bash
   # Next.js
   npm run build
   npm run dev
   ```

4. Test the endpoint:
   ```bash
   curl http://localhost:3000/api/reports/weekly-synthesis
   ```

## Uninstallation

To remove the weekly synthesis system:

```bash
# Unload the daemon
launchctl unload ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist

# Remove the plist
rm ~/Library/LaunchDaemons/com.chipai.mission-control.weekly-synthesis.plist

# Optional: Remove project directory
rm -rf ~/Documents/Shared/projects/build-weekly-synthesis-report/

# Optional: Remove data
rm -rf ~/.mission-control/weekly-synthesis*
```

## Performance & Resource Usage

The weekly synthesis script is lightweight:

- **Memory:** ~50-100 MB during execution
- **CPU:** Minimal, runs for 5-10 seconds
- **Disk:** ~2-5 KB per report (plain Markdown)
- **Network:** Only if external APIs are called
- **Schedule:** Once per week (Friday 4 PM), low frequency

The system is designed to have minimal impact on system performance.

## Security Considerations

1. **API Keys:** Store in environment variables, not in code
2. **Credentials:** Use app-specific passwords, not account passwords
3. **Logs:** May contain sensitive data, review before sharing
4. **Files:** Reports contain summary information, review before sharing
5. **Permissions:** Use standard file permissions (644 for plist, 755 for directories)

## Maintenance Schedule

### Daily
- Check logs if daemon should have run

### Weekly
- Verify report generated on Friday 4 PM
- Review report for accuracy and completeness

### Monthly
- Update health database with new milestones
- Review and update action items
- Check for API changes or deprecations

### Quarterly
- Review accumulated reports for trends
- Plan next quarter's goals and metrics
- Update data collection strategies

## Support & Help

For issues:

1. Check logs: `cat ~/.mission-control/weekly-synthesis.log`
2. See README.md for quick reference
3. Run dry-run test: `./scripts/weekly-synthesis.js --dry-run`
4. Check this guide's Troubleshooting section
5. Manually test data sources

---

**Installation complete!** The weekly synthesis system is now ready for use. Reports will be generated every Friday at 4 PM MST automatically.
