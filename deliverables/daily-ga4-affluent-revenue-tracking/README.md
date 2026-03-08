# Daily GA4 + Affluent Revenue Tracking

**Status:** ✅ Automation Framework Complete  
**Task ID:** wt-001  
**Priority:** URGENT  
**Domain:** WeTried.it  

---

## Overview

Automated daily tracking system that:
1. **Pulls Google Analytics 4 (GA4) metrics** — Traffic, pageviews, top pages, referrer sources
2. **Parses Affluent network emails** — Affiliate clicks, commissions, and revenue
3. **Generates combined daily reports** — Unified analytics snapshot
4. **Stores historical data** — For trend analysis and revenue tracking

**Output:** JSON reports stored in `data/analytics/` with daily snapshots  
**Schedule:** Runs daily at 7:00 AM (customizable)

---

## Architecture

```
├── scripts/
│   ├── ga4-pull.mjs              # GA4 metrics extraction
│   ├── affluent-parser.mjs       # Email parsing + revenue aggregation
│   ├── daily-report.mjs          # Orchestrator + combined reporting
│   └── test-mock.mjs             # Test data generator
├── data/
│   └── analytics/                # Daily report storage
├── PLAN.md                       # Implementation roadmap
├── SETUP.md                      # Configuration & deployment guide
├── package.json                  # Dependencies
└── README.md                     # This file
```

---

## Quick Start

### 1. Setup

```bash
cd ~/Documents/Shared/projects/daily-ga4-affluent-revenue-tracking
npm install
```

### 2. Configure GA4

Edit `scripts/ga4-pull.mjs` and set your GA4 property ID:

```javascript
const PROPERTY_ID = 'properties/123456789'; // ← Update this
```

Get your ID from [Google Analytics Dashboard](https://analytics.google.com)

### 3. Test with Mock Data

```bash
npm run test
# Creates mock GA4 + Affluent data
```

Output: `data/analytics/daily-analytics-YYYY-MM-DD.json`

### 4. Run Real Report

Once GA4 and Gmail are configured:

```bash
npm run report
# Pulls real GA4 + parses real Affluent emails
```

---

## Scripts Reference

### `ga4-pull.mjs` — GA4 Metrics

Extracts from Google Analytics 4:
- **Overall metrics:** Active users, new users, sessions, pageviews
- **Top pages:** Page title, path, pageview count
- **Top referrers:** Traffic source, medium, pageviews, sessions

**Output:** `ga4-metrics-YYYY-MM-DD.json`

**Requirements:**
- Google Analytics 4 API enabled
- `GOOGLE_APPLICATION_CREDENTIALS` env var or gws authentication

**Run:** `npm run ga4`

### `affluent-parser.mjs` — Revenue Extraction

Parses emails from affiliate networks:
- Amazon Associates
- ShareASale
- Impact
- CJ Affiliate
- Rakuten Advertising

**Extracts per email:**
- Clicks
- Commissions
- Conversions/Sales
- Earnings

**Output:** `affluent-revenue-YYYY-MM-DD.json`

**Requirements:**
- Gmail API access (via gws)
- Affiliate network emails arriving in inbox

**Run:** `npm run affluent`

### `daily-report.mjs` — Orchestrator

Master script that:
1. Runs GA4 extraction
2. Runs Affluent parsing
3. Merges results
4. Generates summary report

**Output:** `daily-analytics-YYYY-MM-DD.json`

**Optional flag:** `--date=YYYY-MM-DD` (default: yesterday)

**Run:** `npm run report` or `npm run report:yesterday`

### `test-mock.mjs` — Test Data

Generates realistic mock data for testing without real APIs.

**Useful for:**
- Testing the pipeline locally
- Developing dashboards
- Validating data structures

**Run:** `npm run test` or `node scripts/test-mock.mjs --date=2026-03-06`

---

## Output Data Format

### GA4 Metrics (`ga4-metrics-*.json`)

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
      "title": "Best Gaming Laptops",
      "path": "/best-gaming-laptops/",
      "pageviews": 127
    }
  ],
  "topReferrers": [
    {
      "source": "google",
      "medium": "organic",
      "pageviews": 850,
      "sessions": 710
    }
  ]
}
```

### Affluent Revenue (`affluent-revenue-*.json`)

```json
{
  "date": "2026-03-06",
  "timestamp": "2026-03-07T07:15:32.123Z",
  "networks": {
    "Amazon Associates": {
      "emails": [{ "date": "...", "clicks": 342, "commissions": 12.45 }],
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
      "id": "email-id",
      "from": "associates-noreply@amazon.com",
      "subject": "Your Report",
      "date": "...",
      "network": "Amazon Associates"
    }
  ]
}
```

### Combined Report (`daily-analytics-*.json`)

```json
{
  "date": "2026-03-06",
  "generatedAt": "2026-03-07T07:15:32.123Z",
  "gaMetrics": { /* GA4 data */ },
  "affluentRevenue": { /* Affluent data */ },
  "summary": {
    "traffic": 1247,
    "revenue": 45.67,
    "networks": 3
  }
}
```

---

## Configuration

### Environment Variables

```bash
# Google APIs (via gws CLI setup)
export GOOGLE_APPLICATION_CREDENTIALS="~/.config/gws/credentials.json"

# Optional: Custom GA4 property
export GA4_PROPERTY_ID="properties/123456789"

# Optional: Custom email search date range (default: past 24h)
export AFFLUENT_EMAIL_DAYS=1
```

### GA4 Property ID

Find in Google Analytics:
1. Go to [analytics.google.com](https://analytics.google.com)
2. Select WeTried.it property
3. Go to **Admin** → **Property Settings**
4. Copy **Property ID** (format: `123456789`)
5. Update `scripts/ga4-pull.mjs`: `const PROPERTY_ID = 'properties/123456789'`

### Email Search Patterns

Customize affiliate networks in `scripts/affluent-parser.mjs`:

```javascript
const NETWORKS = {
  mynetwork: {
    label: 'My Affiliate Network',
    from: 'report@mynetwork.com',
    patterns: {
      clicks: /Clicks:\s*(\d+)/i,
      commissions: /Earnings:\s*\$?([\d,]+\.?\d*)/i,
    },
  },
};
```

---

## Deployment

### Option 1: Manual Cron

```bash
# Add to crontab -e
0 7 * * * cd ~/Documents/Shared/projects/daily-ga4-affluent-revenue-tracking && npm run report >> logs/daily-report.log 2>&1
```

### Option 2: macOS launchd

See `SETUP.md` for complete launchd plist configuration.

### Option 3: Mission Control Orchestration

See `SETUP.md` for integration with the Mission Control system.

---

## Monitoring & Maintenance

### Check Recent Reports

```bash
ls -lah data/analytics/ | tail -10
```

### View Latest Report

```bash
jq . data/analytics/daily-analytics-$(date -d yesterday +%Y-%m-%d).json
```

### Debug Email Parsing

```bash
gws gmail query "from:associates-noreply@amazon.com" --format json --limit 1
```

### Debug GA4 Connection

```bash
node -e "console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS)"
```

### Logs

If using cron/launchd:
```bash
tail -f logs/daily-report.log
tail -f logs/daily-report.error.log
```

---

## Troubleshooting

### GA4 API Not Responding

**Error:** `401 Unauthorized` or `Property not found`

**Solution:**
1. Verify GA4 property ID is correct (must be exact)
2. Re-authenticate with gws:
   ```bash
   gws auth revoke
   gws auth login
   ```
3. Ensure Google Analytics 4 API is enabled in Google Cloud

### Gmail Queries Failing

**Error:** `Unknown error` or rate limiting

**Solution:**
1. Test Gmail access:
   ```bash
   gws gmail query "is:unread" --format json --limit 1
   ```
2. Ensure Gmail API is enabled
3. Add retry logic if rate limited (script has timeout but no exponential backoff yet)

### Missing Affluent Data

**Problem:** No emails parsed, empty `affluent-revenue-*.json`

**Causes:**
- No affiliate emails sent in past 24h
- Email search patterns don't match actual email formats
- Emails in spam folder

**Solution:**
1. Check Gmail manually for affiliate emails
2. Review email subjects and update `NETWORKS` patterns
3. Adjust `AFFLUENT_EMAIL_DAYS` to expand search window

### No GA4 Data

**Problem:** Empty `ga4-metrics-*.json`

**Causes:**
- Property has no data for requested date
- API not returning results

**Solution:**
1. Verify data exists in GA4 dashboard directly
2. Check that yesterday's date is correct
3. Ensure property is receiving traffic

---

## Future Enhancements

- [ ] **Slack alerts** for daily summaries
- [ ] **Google Sheets integration** for historical data storage
- [ ] **Anomaly detection** (alert on unusual traffic/revenue drops)
- [ ] **Dashboard visualization** (built with Grafana or custom UI)
- [ ] **Competitor tracking** (compare traffic to similar sites)
- [ ] **Network performance scoring** (which affiliate networks perform best)
- [ ] **Revenue forecast** (predict next month's revenue based on trends)
- [ ] **Mobile-optimized reports** (email digest format)

---

## Files & Structure

```
daily-ga4-affluent-revenue-tracking/
├── scripts/
│   ├── ga4-pull.mjs              (411 lines) — GA4 extraction
│   ├── affluent-parser.mjs       (247 lines) — Revenue parsing
│   ├── daily-report.mjs          (198 lines) — Orchestrator
│   └── test-mock.mjs             (224 lines) — Test data
├── data/
│   └── analytics/                (daily JSON reports)
├── PLAN.md                       (implementation roadmap)
├── SETUP.md                      (deployment guide)
├── package.json                  (Node.js config)
└── README.md                     (this file)
```

---

## Support

**Questions or issues?**

1. Check `SETUP.md` for detailed configuration
2. Review logs in `logs/` directory
3. Test with mock data: `npm run test`
4. Verify APIs are enabled and authenticated

---

## License

MIT — Part of WeTried.it automation infrastructure

---

**Last Updated:** 2026-03-07  
**Task Status:** Complete — Ready for review and deployment  
**Next Step:** Configure GA4 property ID and test with real data
