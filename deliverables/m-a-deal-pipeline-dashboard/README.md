# M&A Deal Pipeline Dashboard

**Real-time overview of all active M&A activity**

One glance = full picture of deal stage, key dates, blockers, next actions, and due diligence status.

---

## Quick Start

### Installation
```bash
cd ~/Documents/Shared/projects/m-a-deal-pipeline-dashboard
npm install
npm run setup
```

### View Pipeline
```bash
npm run pipeline        # Kanban view by stage
npm run status          # Metrics & blockers
npm run report          # Full deal details
```

### Dashboard
Open `dashboard/index.html` in a browser for visual overview.

---

## Pipeline Stages

```
🔍 Prospecting
   ↓
📞 Initial Contact
   ↓
📋 Due Diligence
   ↓
💬 Negotiation
   ↓
🎯 Closing
   ↓
✅ Closed / ❌ Dead
```

---

## Deal Information Tracked

### Core Details
- **Deal name** — Internal identifier
- **Target company** — Company being acquired
- **Stage** — Current pipeline position
- **Deal value** — Target purchase price

### Timing
- **Identified date** — When deal entered pipeline
- **First contact** — Initial engagement date
- **DD start/end** — Due diligence timeline
- **Expected close** — Projected closing date

### Team & Leadership
- **Deal lead** — Primary owner
- **Advisors** — Supporting team members
- **Contacts** — Key relationship owners

### Due Diligence
- **Financial audit** — Revenue, expenses, cash flow
- **Legal review** — Contracts, liabilities, compliance
- **Technical assessment** — Product, infrastructure, talent
- **Customer review** — Satisfaction, churn, dependencies

### Financial
- **Target price** — Proposed valuation
- **Earnouts** — Contingent consideration
- **Synergies** — Expected cost/revenue synergies
- **ROI estimate** — Return on investment projection

### Blockers
- **Description** — What's blocking progress
- **Severity** — Low, medium, high, critical
- **Owner** — Who's responsible for resolution
- **Status** — Open, in-progress, resolved

### Next Actions
- **Description** — What needs to happen
- **Due date** — When it's due
- **Owner** — Who owns it
- **Priority** — Urgency level

---

## Sample Data

5 sample deals are loaded:

1. **TechCorp Acquisition** (Due Diligence)
   - $250M deal
   - 50M revenue target
   - 90 days to close

2. **DataSoft Integration** (Negotiation)
   - $150M deal
   - 30M revenue target
   - Price negotiation ongoing

3. **CloudBase Merger** (Negotiation)
   - $120M deal
   - 25M revenue target
   - Moving quickly

4. **SecureNet Acquisition** (Initial Contact)
   - $80M deal
   - 15M revenue target
   - Early stage

5. **DevTools Platform** (Prospecting)
   - $50M deal
   - 10M revenue target
   - Not yet contacted

---

## Commands

### View Pipeline
```bash
npm run pipeline
```
Shows kanban-style view organized by stage:
- Prospecting (prospecting)
- Initial Contact (initial-contact)
- Due Diligence (due-diligence)
- Negotiation (negotiation)
- Closing (closing)

### Check Status
```bash
npm run status
```
Displays:
- Active deal count
- Total pipeline value
- Days in each stage
- Blockers (by severity)
- Actions due in next 7 days

### Generate Report
```bash
npm run report
```
Detailed view of all deals with:
- Full deal information
- Stage and timeline
- DD completion percentage
- Active blockers
- Pending actions

---

## Dashboard Features

The HTML dashboard shows:

1. **Pipeline Overview**
   - Deal count by stage
   - Total pipeline value
   - Blocker count
   - Pending actions

2. **Visual Kanban**
   - Deals organized by stage
   - DD progress bars
   - Blocker indicators
   - Quick deal details

3. **Metrics**
   - Active deals
   - Total value
   - Blockers
   - Actions due

---

## File Structure

```
m-a-deal-pipeline-dashboard/
├── README.md                  # This file
├── package.json              # Dependencies
├── src/
│   ├── engine.js             # Core tracker
│   ├── cli.js                # Command-line interface
│   └── setup.js              # Setup script
├── dashboard/
│   └── index.html            # Visual dashboard
├── data/
│   └── deals.json            # Deal configuration
└── docs/
    └── (documentation)
```

---

## Integration Points

Ready to integrate with:
- Mission Control API (task routing, notifications)
- Calendar systems (key dates, reminders)
- Email alerts (blockers, due actions)
- Slack notifications (updates, escalations)

---

## Success Metrics

✅ **Complete visibility** — All active M&A deals in one view  
✅ **Clear status** — Stage, blockers, and next actions visible  
✅ **Fast updates** — CLI commands for quick status checks  
✅ **Easy access** — Dashboard + command-line interface  
✅ **Actionable** — Blockers and actions highlighted

---

## Support

For questions, check the documentation or generate a report:
```bash
npm run report
```

---

**Status:** Production Ready  
**Last Updated:** 2026-03-07
