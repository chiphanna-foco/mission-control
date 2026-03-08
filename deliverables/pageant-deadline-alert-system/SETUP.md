# Setup Guide — Pageant Deadline Alert System

## 1. Create Slack Webhooks

### Step A: Create a Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "Pageant Alerts" 
4. Choose your workspace

### Step B: Enable Incoming Webhooks
1. In app settings, go to "Incoming Webhooks"
2. Turn on "Activate Incoming Webhooks"
3. Click "Add New Webhook to Workspace"

### Step C: Create Channel Webhook
1. Select channel: `#pageant-alerts` (create if needed)
2. Click "Allow"
3. Copy the webhook URL
4. Paste into `slack-config.json` → `channel_webhook`

### Step D: Create DM Webhook
1. Go back to "Incoming Webhooks" 
2. Click "Add New Webhook to Workspace"
3. Select "Direct Message" → Choose "@scarlett" or relevant user
4. Click "Allow"
5. Copy the webhook URL
6. Paste into `slack-config.json` → `dm_webhook`

## 2. Configure Alerts

### Add New Pageant Deadline
Edit `alerts.json` and add to the `pageants` array:

```json
{
  "id": "unique-id-2026",
  "name": "Competition Name",
  "deadline": "2026-04-15T23:59:59Z",
  "urgencyLevel": 1,
  "notes": "Optional notes",
  "requirements": {
    "photos": {
      "needed": true,
      "count": 3,
      "specs": "Headshot, evening gown, swimsuit",
      "submitted": false,
      "dueDate": "2026-04-10T23:59:59Z"
    },
    "forms": {
      "needed": true,
      "list": ["entry-form", "release-form"],
      "submitted": false,
      "dueDate": "2026-04-12T23:59:59Z"
    },
    "payment": {
      "needed": true,
      "amount": 350,
      "method": "stripe",
      "submitted": false,
      "dueDate": "2026-04-15T23:59:59Z"
    }
  },
  "notifications": {
    "sent_7_days": false,
    "sent_7_days_date": null,
    "sent_1_day": false,
    "sent_1_day_date": null
  }
}
```

### Update Requirement Status
When something is submitted, update `submitted: true`:
```json
"photos": {
  "needed": true,
  "submitted": true  // ← Changed to true
}
```

## 3. Manual Testing

```bash
# View all upcoming pageants
npm run list

# Check deadlines and send alerts (test run)
npm run check

# View alert status
npm run status
```

**Note:** Alerts only fire when `daysRemaining` equals exactly 7 or 1. For testing, temporarily adjust `deadline` dates in `alerts.json`.

## 4. Automated Scheduling

### Option A: Cron Job (Unix/Linux/Mac)
```bash
crontab -e
```

Add line (checks every hour at :15):
```cron
15 * * * * cd /Users/chipai/Documents/Shared/projects/pageant-deadline-alert-system && node alert-engine.mjs --check >> /tmp/pageant-alerts.log 2>&1
```

### Option B: PM2 (Recommended)
```bash
pm2 start alert-engine.mjs --name "pageant-alerts" --cron "15 * * * *"
pm2 save
```

### Option C: Mission Control Integration
Add to Mission Control's scheduled tasks:
```json
{
  "id": "pageant-alerts-check",
  "name": "Check Pageant Deadlines",
  "command": "cd /Users/chipai/Documents/Shared/projects/pageant-deadline-alert-system && npm run check",
  "schedule": "0 * * * *",
  "workspace": "scarlett",
  "notifications": "slack"
}
```

## 5. Dashboard Integration

The `dashboard-widget.mjs` exports data for Mission Control dashboard:

```javascript
import { getDashboardWidget } from './dashboard-widget.mjs';

// In Mission Control API:
app.get('/api/dashboard/pageant-alerts', (req, res) => {
  const widget = getDashboardWidget();
  res.json(widget);
});
```

The widget provides:
- ✅ Upcoming pageants (sorted by deadline)
- ✅ Alert status (urgent/soon/upcoming)
- ✅ Requirements checklist
- ✅ Days remaining countdown

## 6. Status Checks

**Is it running?**
```bash
ps aux | grep alert-engine
```

**View logs (if cron):**
```bash
tail -f /tmp/pageant-alerts.log
```

**View logs (if PM2):**
```bash
pm2 logs pageant-alerts
```

## 7. Troubleshooting

### Alerts not sending
- ✅ Check `slack-config.json` has valid webhooks
- ✅ Verify `alerts.json` deadline dates are correct
- ✅ Check Slack app has "Incoming Webhooks" enabled
- ✅ Look for webhook in Slack app logs

### Duplicate alerts
- If same alert fires twice, manually set `sent_7_days: true` / `sent_1_day: true` in `alerts.json`

### Wrong timezone
- All deadlines use ISO 8601 format (UTC by default)
- Adjust deadlines if needed: `2026-04-15T23:59:59-06:00` (for Mountain Time)

## 8. Maintenance

**Weekly:**
- Check upcoming deadlines: `npm run list`
- Update submission status in `alerts.json`

**Monthly:**
- Archive completed pageants
- Review alert history in `alerts.json` → `notifications` 

**As needed:**
- Add new pageants as Scarlett registers
- Update requirements based on competition rules
