# Legal Timeline Tracking

## Overview

Track all legal milestones and approvals required for the Lowes partnership deal closure.

## Key Milestones

### Phase 1: Contract Development
- **Contract Drafting** — Initial agreement preparation
- **Internal Review** — Legal review of terms
- **Stakeholder Review** — Finance, ops, product input

### Phase 2: Internal Approvals
- **Legal Sign-Off** — Final legal clearance
- **CFO Approval** — Financial terms approved
- **CEO Approval** — Executive sign-off

### Phase 3: External Review (Lowes)
- **Lowes Legal Review** — Partner's legal team review
- **Lowes Procurement** — Procurement team approval
- **Lowes Executive** — Lowes leadership sign-off

### Phase 4: Closing
- **Final Sign-off** — All parties sign
- **Deal Closes** — Effective date

## Timeline Template

```
Contract Review    ──→ Board Approval ──→ Final Sign-off ──→ Close
Mar 15 (Critical)     Mar 22 (High)        Mar 30 (Critical)   Apr 30
```

## Status Tracking

### Milestone Status
- **Pending** — Not started
- **In Progress** — Currently being worked on
- **Complete** — Finished
- **Delayed** — Overdue
- **Blocked** — Waiting on external factor

### Risk Indicators
- Milestone due within 5 days = At Risk
- Delayed milestone = High Risk
- Blocked milestone = Critical Risk

## Commands

### View Timeline
```bash
npm run timeline
npm run timeline --all    # Include completed milestones
```

### Update Milestone Status
```bash
node src/cli.js milestone update <id> --status complete
node src/cli.js milestone update <id> --status delayed
```

### Add Milestone
```bash
node src/cli.js milestone add "Board approval" \
  --date 2026-03-22 \
  --priority high \
  --owner "Leadership"
```

## Success Criteria

✅ All milestones completed on schedule  
✅ No critical blockers at signing  
✅ All required approvals obtained  
✅ Deal closes by expected date
