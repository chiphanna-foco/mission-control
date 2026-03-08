# Pageant Deadline Alert System

## Overview
Automated deadline alerts for pageant competitions with tiered notifications:
- **7 days before:** Dashboard + Slack channel notification
- **1 day before:** Urgent Slack DM
- Includes requirements: photos, forms, payment, etc.

## Architecture

### Core Components
1. **Deadline Manager** — Store, track, and manage pageant deadlines
2. **Alert Engine** — Check deadlines at scheduled intervals (hourly)
3. **Slack Integration** — Send timely notifications with deadline details
4. **Dashboard Widget** — Display upcoming deadlines + requirements

### Data Model
```json
{
  "id": "pageant-id",
  "name": "Competition Name",
  "deadline": "2026-04-15T23:59:59Z",
  "urgencyLevel": 1,
  "requirements": {
    "photos": {
      "needed": true,
      "count": 3,
      "specs": "Professional headshot + candid",
      "submitted": false
    },
    "forms": {
      "needed": true,
      "list": ["entry-form", "release-form"],
      "submitted": false
    },
    "payment": {
      "needed": true,
      "amount": 250,
      "method": "stripe",
      "submitted": false
    }
  },
  "notifications": {
    "sent_7_days": false,
    "sent_1_day": false
  }
}
```

### Files
- `alerts.json` — Deadline + requirement registry
- `alert-engine.mjs` — Core alert logic + Slack integration
- `slack-config.json` — Slack webhook + channel setup
- `integration/` — Mission Control + Dashboard hooks

## Usage

```bash
# Check deadlines (manual trigger)
node alert-engine.mjs --check

# Monitor continuously (for cron/PM2)
node alert-engine.mjs --watch
```

## Integration Points
- Slack DMs to Scarlett
- Mission Control dashboard widget
- Automated cron job (every hour during business hours)
