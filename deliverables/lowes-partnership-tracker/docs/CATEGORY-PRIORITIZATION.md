# Category Prioritization Guide

## Overview

Determine which Lowes categories launch first to optimize landlord ROI and member adoption.

## ROI Calculation Framework

### Revenue Potential (40% weight)
- Expected annual revenue per category
- Commission structure
- Volume potential

### Member Demand (30% weight)
- Member purchase history in category
- Category affinity
- Expected conversion rates

### Operational Readiness (20% weight)
- Supplier readiness
- Inventory availability
- Technical integration complexity

### Market Timing (10% weight)
- Seasonal demand curves
- Competitive landscape
- Member segment availability

## Category Matrix

```
HIGH ROI, HIGH READINESS
├─ Priority 1: Appliances ($2.5M annual potential)
├─ Priority 2: Tools & Hardware ($1.8M)
└─ Priority 3: Outdoor & Garden ($1.2M)

MEDIUM ROI, MEDIUM READINESS
├─ Priority 4: Seasonal ($600K)
├─ Priority 5: Lighting ($500K)
└─ Priority 6: Paint & Supplies ($400K)

LOW READINESS ITEMS (Defer)
├─ Kitchen & Bath (high complexity)
├─ Custom Services (requires training)
└─ Installation (logistics intensive)
```

## Launch Sequence

### Wave 1 (May 15, 2026)
- **Appliances** — Highest ROI, ready inventory
- **Tools** — Member demand strong
- **Expected revenue:** $2.5M+ first month

### Wave 2 (June 1, 2026)
- **Tools & Hardware** (continued)
- **Outdoor & Garden** — Seasonal demand peaks
- **Expected revenue:** $1.8M+ first month

### Wave 3 (June 15, 2026)
- **Seasonal Items** — Summer outdoor season
- **Expected revenue:** $600K first month

## Commands

### View Categories by Priority
```bash
npm run category list
npm run category list --sort roi          # Sort by revenue potential
npm run category list --sort launch       # Sort by launch date
```

### Update Category Readiness
```bash
node src/cli.js category update <id> --readiness 75
node src/cli.js category update <id> --status ready
```

## Metrics to Track

- Revenue per category (forecast vs actual)
- Member conversion rates
- Inventory turnover
- Customer satisfaction
- Return rates

## Success Criteria

✅ Top 3 categories live by June 1  
✅ Combined revenue exceeds $5M in first quarter  
✅ Member conversion rate >40%  
✅ Inventory turnover ratio >3x
