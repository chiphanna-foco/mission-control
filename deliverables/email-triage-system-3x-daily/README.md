# Email Triage System for Mission Control

**3x Daily Email Classification, Action Extraction & Urgency Detection**

Automatically processes unread emails at 8 AM, 12 PM, and 5 PM (MST / America/Denver, weekdays only) to:
- Classify by domain (TurboTenant, WeTried.it, GameBuzz, Kids/Family, Personal Health)
- Extract action items (TODOs, decisions, waiting items)
- Detect urgency (CRITICAL, HIGH, MEDIUM)
- Draft responses (queued for approval)
- Send Slack alerts for urgent items

---

## Quick Start

### 1. Setup Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the **Gmail API**
4. Create a **Service Account**:
   - Go to Credentials → Create Credentials → Service Account
   - Download the JSON key file
   - Rename to `service-account.json` and place in project root

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Install Dependencies

```bash
npm install googleapis
npm install --save-dev @types/node typescript
```

### 4. Install LaunchD Jobs

```bash
# Create logs directory
mkdir -p logs

# Install morning job (8 AM)
cp .launchd/com.mission-control.email-triage-morning.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.mission-control.email-triage-morning.plist

# Install noon job (12 PM)
cp .launchd/com.mission-control.email-triage-noon.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.mission-control.email-triage-noon.plist

# Install evening job (5 PM)
cp .launchd/com.mission-control.email-triage-evening.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.mission-control.email-triage-evening.plist
```

### 5. Make Script Executable

```bash
chmod +x scripts/email-triage.js
```

### 6. Test Run

```bash
node scripts/email-triage.js
```

---

## File Structure

```
email-triage-system-3x-daily/
├── scripts/
│   └── email-triage.js           # Main standalone script (launchd entry point)
├── src/
│   ├── lib/
│   │   ├── email-classifier.ts   # Domain classification logic
│   │   ├── action-item-extractor.ts # Extract TODOs, decisions, waiting
│   │   └── urgency-detector.ts   # Detect urgency keywords/deadlines
│   └── app/api/
│       └── email/triage/
│           └── route.ts          # Next.js API endpoint for manual trigger
├── .launchd/
│   ├── com.mission-control.email-triage-morning.plist
│   ├── com.mission-control.email-triage-noon.plist
│   └── com.mission-control.email-triage-evening.plist
├── config/
│   └── (future: custom overrides)
├── results/                       # Triage output JSONs (auto-generated)
├── logs/                          # LaunchD logs (auto-generated)
├── triage.config.json            # Domain keywords, urgency patterns
├── triage-state.json             # Last run timestamp, caching
├── .env.example                  # Configuration template
├── .env.local                    # (SECRET) Credentials
├── README.md                     # This file
└── TROUBLESHOOTING.md            # Common issues & fixes
```

---

## Configuration

### triage.config.json

Customize domain keywords, urgency patterns, action keywords, and response templates:

```json
{
  "domains": {
    "turbotenant": {
      "label": "TurboTenant",
      "keywords": ["turbotenant", "tenant", "property management"],
      "emails": ["@turbotenant.com"],
      "priority": "high"
    }
  },
  "urgencyPatterns": {
    "critical": {
      "keywords": ["URGENT", "EMERGENCY"],
      "level": 5
    }
  }
}
```

### .env.local

```bash
GOOGLE_KEY_FILE=./service-account.json
SLACK_BOT_TOKEN=xoxb-...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_USER_ID=U12345678
```

---

## Usage

### Automatic (Via LaunchD)

Jobs run automatically at:
- **8:00 AM** (Morning)
- **12:00 PM** (Noon)
- **5:00 PM** (Evening)

Weekdays only (Mon-Fri). Check logs in `logs/` directory.

### Manual Trigger (CLI)

```bash
node scripts/email-triage.js
```

Output: JSON file in `results/triage-YYYY-MM-DD-timestamp.json`

### Manual Trigger (API)

```bash
# Requires TRIAGE_API_KEY in .env.local
curl -X POST http://localhost:3000/api/email/triage \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"

# Or fetch latest results
curl http://localhost:3000/api/email/triage
```

---

## Example Output

```json
{
  "timestamp": "2024-03-07T16:30:00.000Z",
  "emailsProcessed": 12,
  "actionItems": 5,
  "urgent": 2,
  "actionCount": {
    "todo": 3,
    "decision": 1,
    "waiting": 1
  },
  "byDomain": {
    "turbotenant": [
      {
        "id": "msg123",
        "from": "ceo@turbotenant.com",
        "subject": "Q1 Financials - URGENT",
        "classification": {
          "domain": "turbotenant",
          "label": "TurboTenant",
          "priority": "high",
          "confidence": 0.95
        },
        "actions": [
          {
            "type": "decision",
            "text": "approve",
            "confidence": 0.85
          }
        ],
        "urgency": {
          "level": 4,
          "levelName": "HIGH",
          "isUrgent": true,
          "reasons": ["Contains \"URGENT\""]
        }
      }
    ]
  }
}
```

---

## Troubleshooting

### LaunchD Jobs Not Running

```bash
# Check if job is loaded
launchctl list | grep email-triage

# Manually start job
launchctl start com.mission-control.email-triage-morning

# View logs
tail -f logs/morning.log
tail -f logs/morning-error.log
```

### Gmail API Errors

**Error: "Invalid Credentials"**
- Verify `service-account.json` path in `.env.local`
- Check service account has Gmail API access

**Error: "Quota exceeded"**
- Gmail API has rate limits. Reduce `maxResults` in script.

### Node/Permissions Issues

```bash
# Verify Node is installed and in PATH
which node

# Verify script is executable
ls -l scripts/email-triage.js

# Test directly
/usr/local/bin/node scripts/email-triage.js
```

### No Results Generated

1. Check if `.env.local` exists and credentials are valid
2. Verify Gmail account has unread emails
3. Review `logs/morning-error.log` for errors
4. Run manually: `node scripts/email-triage.js`

---

## Advanced

### Slack Integration

To send urgent alerts to Slack:

1. Create Slack App or use workspace bot
2. Get bot token: `xoxb-...`
3. Set `SLACK_USER_ID` (Chip's user ID)
4. Add to `.env.local`

Alerts sent in format:
```
🚨 URGENT: [Domain] Subject
From: sender@email.com
Action: Todo/Decision/Waiting
```

### Custom Domain Classification

Edit `triage.config.json`:

```json
"mycompany": {
  "label": "My Company",
  "keywords": ["mycompany", "internal", "project"],
  "emails": ["@mycompany.com"],
  "priority": "high",
  "context": "Internal projects"
}
```

### Response Drafting

Enable in `.env.local`:
```bash
ENABLE_DRAFT_RESPONSES=true
```

Responses are drafted and queued for approval before sending.

---

## Performance

- **~100 emails/min** (with Gmail API limits)
- **Memory:** <50MB
- **Disk:** ~1MB per 100 triages (JSON storage)

Optimize in `scripts/email-triage.js`:
- Increase `maxResults` for larger batches
- Adjust `StartCalendarInterval` times in plist files

---

## Dashboard Integration

The API endpoint `/api/email/triage` returns:
- Summary counts (emails, actions, urgent)
- Classified emails by domain
- Queued responses (if enabled)

Use in Mission Control dashboard:

```typescript
// Fetch latest triage results
const response = await fetch('/api/email/triage');
const results = await response.json();

// Display in dashboard
<TriageSummary 
  processed={results.results.emailsProcessed}
  actions={results.results.actionItems}
  urgent={results.results.urgent}
/>
```

---

## Maintenance

### View Logs

```bash
# Morning run
tail -100 logs/morning.log

# Recent errors
cat logs/*-error.log

# Follow live
tail -f logs/morning.log
```

### Archive Old Results

```bash
# Move results older than 30 days to archive
find results -mtime +30 -type f -exec mv {} archive/ \;
```

### Update Configuration

Edit `triage.config.json` anytime. Changes apply on next run.

---

## Support

**Common Issues:** See `TROUBLESHOOTING.md`

**Questions?** Check the configuration examples in `triage.config.json`

**Need Help?** Review script output:
```bash
node scripts/email-triage.js 2>&1 | head -50
```

---

## Future Enhancements

- [ ] Response draft generation with AI
- [ ] Approval queue UI (Mission Control integration)
- [ ] Email templates per domain
- [ ] Machine learning classification tuning
- [ ] Multi-user support
- [ ] Email threading/conversation grouping
- [ ] Scheduled follow-ups
- [ ] Analytics dashboard

---

**Version:** 1.0.0  
**Last Updated:** 2024-03-07  
**Timezone:** America/Denver (MST)
