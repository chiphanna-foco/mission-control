# Pageant Deadline Alert System — Deliverable Manifest

**Task ID:** sc-003  
**Status:** ✅ COMPLETE  
**Commit:** https://github.com/chiphanna-foco/clawdbot-brain/tree/main/mission-control/deliverables/pageant-deadline-alert-system

---

## 📦 Deliverables

### 1. **Alert Engine** (`alert-engine.mjs`)
Core engine that monitors pageant deadlines and sends automated Slack alerts.

**Features:**
- ✅ Monitors deadlines with 7-day and 1-day alert triggers
- ✅ Tracks remaining days until deadline
- ✅ Formats requirement checklists (photos, forms, payment)
- ✅ Sends channel alerts → 7 days before
- ✅ Sends urgent DMs → 1 day before
- ✅ Last-hour warning system
- ✅ Persistent state tracking (prevents duplicate alerts)

**Usage:**
```bash
npm run check      # Check deadlines and send alerts
npm run list       # List upcoming pageants
npm run status     # View alert status
```

---

### 2. **Data Model** (`alerts.json`)
Centralized registry of pageant deadlines and requirements.

**Structure:**
```json
{
  "id": "unique-identifier",
  "name": "Competition Name",
  "deadline": "ISO 8601 date",
  "requirements": {
    "photos": { "needed": true, "count": 3, "submitted": false },
    "forms": { "needed": true, "list": [...], "submitted": false },
    "payment": { "needed": true, "amount": 350, "submitted": false }
  },
  "notifications": { "sent_7_days": false, "sent_1_day": false }
}
```

**Editable by:** Scarlett agent or dashboard UI  
**Auto-updated by:** alert-engine.mjs (notification state)

---

### 3. **Dashboard Widget** (`dashboard-widget.mjs`)
React component data provider for Mission Control dashboard.

**Features:**
- ✅ Upcoming deadline list (sorted by urgency)
- ✅ Requirements checklist with submission status
- ✅ Urgency classification (critical/high/normal)
- ✅ Days remaining countdown
- ✅ Summary statistics
- ✅ Next deadline item detection

**Integration:** `/api/dashboard/pageant-alerts` endpoint (see integration guide)

---

### 4. **Slack Configuration** (`slack-config.json`)
Webhook management for Slack notifications.

**Configurable:**
- `channel_webhook` — sends 7-day alerts to #pageant-alerts
- `dm_webhook` — sends 1-day urgent alerts to Scarlett

**Setup:** See SETUP.md section "Create Slack Webhooks"

---

### 5. **Setup Guide** (`SETUP.md`)
Step-by-step configuration guide for:
- Creating Slack webhooks (5 min)
- Adding new pageant deadlines
- Manual testing
- Automated scheduling (cron/PM2)
- Mission Control integration
- Troubleshooting

---

### 6. **Mission Control Integration** (`integration-mission-control.md`)
Complete guide for integrating the alert system with the Mission Control dashboard:
- API endpoint setup
- React component implementation
- Scheduled task configuration
- Real-time WebSocket updates
- Data flow documentation

---

### 7. **Test Suite** (`test-system.sh`)
Automated tests to verify system integrity:
- ✅ File existence checks
- ✅ List upcoming pageants
- ✅ Check alert status
- ✅ Test dashboard widget data
- ✅ Validate JSON configuration files

**Run:** `bash test-system.sh`

---

## 🎯 Capabilities Delivered

### Auto-Alerts ✅
- **7 days before:** Channel alert in #pageant-alerts with requirement checklist
- **1 day before:** Urgent DM to Scarlett with "MUST SUBMIT TODAY"
- **1 hour before:** Final hour warning

### Requirement Tracking ✅
- Photos (count, specs, submitted status)
- Forms (list of required documents, submitted status)
- Payment (amount, method, submitted status)
- Each requirement has its own due date

### Dashboard Integration ✅
- Display upcoming deadlines with days remaining
- Show requirement checklist with submission status
- Urgency coloring (red for critical, yellow for watch)
- Summary statistics (total, urgent, next 30 days)

### Automated Scheduling ✅
- Cron job ready (`0 * * * *` — every hour)
- PM2 compatible
- Mission Control task integration
- Watchdog heartbeat support

---

## 📋 Implementation Checklist

**Complete:**
- ✅ Alert engine with Slack integration
- ✅ Data model for pageants + requirements
- ✅ Dashboard widget component
- ✅ Setup guide (webhook configuration)
- ✅ Mission Control integration guide
- ✅ Test suite
- ✅ Git commit and push

**Next Steps (for Scarlett/Chip):**
1. Create Slack app and webhooks (5 min — see SETUP.md)
2. Update `alerts.json` with real pageant deadlines
3. Choose scheduling method:
   - Option A: Cron job (simple)
   - Option B: PM2 (recommended, auto-restart)
   - Option C: Mission Control integration (full orchestration)
4. Update requirement statuses as submissions happen
5. Deploy dashboard widget in Mission Control UI (optional but recommended)

---

## 🔗 GitHub Repository

**Path:** `mission-control/deliverables/pageant-deadline-alert-system/`  
**Repository:** https://github.com/chiphanna-foco/clawdbot-brain  
**Branch:** main

All files are version-controlled and accessible across devices via GitHub.

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────┐
│          Pageant Deadline System            │
├─────────────────────────────────────────────┤
│                                             │
│  alerts.json (source of truth)             │
│       ↓                                     │
│  alert-engine.mjs (runs hourly)            │
│       ├→ Checks deadlines                  │
│       ├→ Sends Slack alerts                │
│       └→ Updates notification state        │
│       ↓                                     │
│  dashboard-widget.mjs (real-time feed)     │
│       ↓                                     │
│  Mission Control Dashboard                 │
│       ├→ Upcoming deadlines card           │
│       ├→ Requirements checklist            │
│       └→ Urgency indicators                │
│       ↓                                     │
│  Slack Notifications                       │
│       ├→ #pageant-alerts (7 days)         │
│       └→ @scarlett DM (1 day)             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ✅ Quality Assurance

**Tested:**
- ✅ All JSON files validate
- ✅ Node.js ES modules load correctly
- ✅ Dashboard widget data exports cleanly
- ✅ Test suite passes
- ✅ Git commit successful

**Robustness:**
- ✅ Handles missing Slack webhooks (test mode)
- ✅ Prevents duplicate alerts (state tracking)
- ✅ Persistent data (JSON file-based)
- ✅ Error handling for invalid dates
- ✅ Clear logging for debugging

---

## 📞 Support

**For setup issues:**
1. Follow SETUP.md step-by-step
2. Run `bash test-system.sh` to verify setup
3. Check logs in `/tmp/pageant-alerts.log` (if using cron)

**For integration questions:**
- See `integration-mission-control.md` for dashboard setup
- API endpoint: `/api/dashboard/pageant-alerts`
- Real-time updates via WebSocket possible (see guide)

---

**Ready to deploy!** 🚀
