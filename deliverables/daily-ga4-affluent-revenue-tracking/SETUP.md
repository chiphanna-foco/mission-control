# Setup & Configuration Guide

## Prerequisites

1. **Google APIs enabled** (via gws CLI)
   - Google Analytics 4 API
   - Gmail API
   - Google Sheets API (optional, for backup storage)

2. **gws CLI installed** and authenticated
   ```bash
   which gws  # Should return path to gws binary
   ```

3. **Node.js 16+**
   ```bash
   node --version
   ```

## Configuration Steps

### Step 1: Get GA4 Property ID

1. Go to Google Analytics 4 dashboard for WeTried.it
2. Find the **Property ID** (format: `properties/XXXXXXXXX`)
3. Edit `scripts/ga4-pull.mjs` and replace:
   ```javascript
   const PROPERTY_ID = 'properties/XXXXX'; // ← Update this
   ```

### Step 2: Verify Gmail Access

Test that gws can query emails:
```bash
gws gmail query "from:associates-noreply@amazon.com" --format json --limit 1
```

Should return at least one email object. If errors occur:
- Run `gws auth revoke` and re-authenticate
- Ensure Gmail API is enabled in Google Cloud Console

### Step 3: Install Dependencies

```bash
cd ~/Documents/Shared/projects/daily-ga4-affluent-revenue-tracking
npm install
```

Required packages:
- `googleapis` - Google APIs client
- Already installed by gws, but may need direct import

If issues:
```bash
npm install --save google-auth-library-nodejs googleapis
```

## Running Scripts

### Run Full Daily Report

```bash
node scripts/daily-report.mjs
```

This will:
1. Pull GA4 metrics for yesterday
2. Parse Affluent emails from past 24h
3. Generate combined daily report
4. Save to `data/analytics/daily-analytics-YYYY-MM-DD.json`

### Run Individual Scripts

**GA4 only:**
```bash
node scripts/ga4-pull.mjs
```

**Affluent only:**
```bash
node scripts/affluent-parser.mjs
```

**Specific date:**
```bash
node scripts/daily-report.mjs --date=2026-03-06
```

## Output Files

All reports saved to: `data/analytics/`

- `ga4-metrics-YYYY-MM-DD.json` — Raw GA4 data
- `affluent-revenue-YYYY-MM-DD.json` — Parsed affiliate revenue
- `daily-analytics-YYYY-MM-DD.json` — Combined report

## Scheduling (Cron)

### Option A: System Cron

Add to `crontab -e`:

```bash
# Run daily report at 7 AM (after midnight UTC rollover)
0 7 * * * cd ~/Documents/Shared/projects/daily-ga4-affluent-revenue-tracking && node scripts/daily-report.mjs >> logs/daily-report.log 2>&1
```

### Option B: launchd (macOS)

Create `~/Library/LaunchAgents/com.wetried.daily-analytics.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.wetried.daily-analytics</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/node</string>
    <string>/Users/chipai/Documents/Shared/projects/daily-ga4-affluent-revenue-tracking/scripts/daily-report.mjs</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>7</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>/Users/chipai/Documents/Shared/projects/daily-ga4-affluent-revenue-tracking/logs/daily-report.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/chipai/Documents/Shared/projects/daily-ga4-affluent-revenue-tracking/logs/daily-report.error.log</string>
</dict>
</plist>
```

Then:
```bash
launchctl load ~/Library/LaunchAgents/com.wetried.daily-analytics.plist
```

### Option C: Mission Control Orchestration

Add to `/Users/chipai/Documents/Documents - ChipAI's Mac mini/mission-control/orchestration/config.json`:

```json
{
  "name": "Daily GA4 + Affluent Report",
  "type": "job",
  "workspace_id": "wt",
  "schedule": "0 7 * * *",
  "command": "node ~/Documents/Shared/projects/daily-ga4-affluent-revenue-tracking/scripts/daily-report.mjs",
  "timeout": 300,
  "notifications": {
    "onSuccess": true,
    "onFailure": true,
    "channel": "slack"
  }
}
```

## Troubleshooting

### GA4 API errors

**Error:** `401 Unauthorized`
- Solution: Re-authenticate with gws
  ```bash
  gws auth revoke
  gws auth login
  ```

**Error:** `Property not found`
- Solution: Verify `PROPERTY_ID` is correct
- Check Google Analytics dashboard for exact ID

### Gmail query errors

**Error:** `Unknown error`
- Solution: Ensure Gmail API is enabled
  ```bash
  gws gmail query "from:test@example.com" --format json
  ```

**Error:** `Rate limited`
- Solution: Add retry logic with exponential backoff
- Gmail allows ~1000 queries/minute

### Missing data in reports

**No GA4 metrics:**
- GA4 property may not have data for requested date
- Check Analytics dashboard directly

**No Affluent revenue:**
- No affiliate emails received in past 24h
- Check spam folder manually
- Verify email search patterns match actual email formats

## Data Format Reference

### GA4 Metrics Output

```json
{
  "date": "2026-03-06",
  "timestamp": "2026-03-07T07:15:32.123Z",
  "overall": {
    "activeUsers": 156,
    "newUsers": 42,
    "sessions": 203,
    "screenPageViews": 1247
  },
  "topPages": [
    {
      "title": "Best Gaming Laptops 2026",
      "path": "/best-gaming-laptops/",
      "pageviews": 127
    }
  ],
  "topReferrers": [
    {
      "source": "google",
      "medium": "organic",
      "pageviews": 85,
      "sessions": 71
    }
  ]
}
```

### Affluent Revenue Output

```json
{
  "date": "2026-03-06",
  "timestamp": "2026-03-07T07:15:32.123Z",
  "networks": {
    "Amazon Associates": {
      "emails": [
        {
          "date": "2026-03-06T15:32:11Z",
          "clicks": 342,
          "commissions": 12.45
        }
      ],
      "totals": { "clicks": 342, "commissions": 12.45 }
    }
  },
  "totals": {
    "clicks": 847,
    "commissions": 45.67,
    "sales": 15
  },
  "rawEmails": [
    {
      "id": "email-id-1",
      "from": "associates-noreply@amazon.com",
      "subject": "Your Associates Report",
      "date": "2026-03-06T15:32:11Z",
      "network": "Amazon Associates"
    }
  ]
}
```

## Monitoring & Alerting

### Check recent reports

```bash
ls -la data/analytics/ | tail -10
```

### View latest summary

```bash
node scripts/daily-report.mjs --date=$(date -d yesterday +%Y-%m-%d)
```

### Monitor log files (if using cron)

```bash
tail -f logs/daily-report.log
```

## Next Steps

1. ✅ Configure GA4 property ID
2. ✅ Test Gmail access with sample query
3. ✅ Run `daily-report.mjs` manually once
4. ✅ Set up cron/launchd scheduling
5. ✅ Create Slack alerting for anomalies
6. ✅ Build dashboard to visualize trends

---

**Questions?** Check logs, review individual script output, or contact the automation team.
