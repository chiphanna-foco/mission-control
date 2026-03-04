# Mission Control ↔ Slack Integration

Two-way sync between Mission Control tasks and #chip-aiops:

## Features

### 1️⃣ Real-Time Task Updates
Whenever a task status changes or is completed, a message posts to #chip-aiops:
- Shows task title, status, priority, due date
- Includes link back to MC for details

### 2️⃣ 3x Daily "Waiting on You" Digest
Posts at **8 AM**, **1 PM**, **6 PM MT** summarizing:
- **🔒 Blocked tasks** — tasks waiting for your input/decision
- **🔴 High Priority/Urgent** — tasks that need doing soon

## Installation

### Step 1: Create Slack Webhook

1. Go to https://api.slack.com/apps
2. Select or create your app
3. Navigate to **Incoming Webhooks**
4. Click **Add New Webhook to Workspace**
5. Select **#chip-aiops** channel
6. Copy the webhook URL

### Step 2: Run Installer

```bash
cd /Users/chipai/Documents/mission-control
bash scripts/install-mc-slack.sh
```

You'll be prompted for the webhook URL.

### Step 3: Verify

Check cron jobs:
```bash
crontab -l | grep mc-slack
```

Check logs:
```bash
tail -f /tmp/mc-watch.log          # Real-time watcher
tail -f /tmp/mc-digest-08.log      # 8 AM digest
```

## Configuration

**Webhook URL** is stored in `.env.slack` (git-ignored).

**Cron schedule** (8 AM, 1 PM, 6 PM MT):
- `0 8 * * *` — 8:00 AM daily
- `0 13 * * *` — 1:00 PM daily  
- `0 18 * * *` — 6:00 PM daily

(Times assume macOS system timezone = US/Mountain)

## What Triggers Posts

### Status Changes
Any task status update triggers a real-time post (unless it's the same status).

### Blocked Tasks (3x Daily Digest)
Included if:
- `blocked_on` column is set (task is explicitly blocked)
- Priority is "urgent" or "high"

### Completed Tasks
Task marked as "done" is removed from future digests.

## Troubleshooting

**No posts appearing?**
- Verify webhook URL in `.env.slack`
- Check logs: `cat /tmp/mc-watch.log` or `cat /tmp/mc-digest-*.log`
- Ensure #chip-aiops exists and bot has permission to post

**Wrong times?**
- Verify system timezone: `date` or `System Preferences → Date & Time`
- Adjust cron times accordingly

**Too many posts?**
- Real-time watcher checks every 30s. Can adjust interval in `mc-slack-integration.mjs` line ~151.

## Manual Testing

```bash
# Post a single digest right now
cd /Users/chipai/Documents/mission-control
SLACK_WEBHOOK_URL="<your-webhook-url>" node scripts/mc-slack-integration.mjs digest

# Start real-time watcher in foreground
SLACK_WEBHOOK_URL="<your-webhook-url>" node scripts/mc-slack-integration.mjs watch
```

## Deinstall

Remove cron entries:
```bash
crontab -e
# Delete lines containing "mc-slack-integration"
```

Remove webhook URL:
```bash
rm /Users/chipai/Documents/mission-control/.env.slack
```

---

**Scripts:**
- `scripts/mc-slack-integration.mjs` — Main integration (watch + digest modes)
- `scripts/install-mc-slack.sh` — Installation & setup
