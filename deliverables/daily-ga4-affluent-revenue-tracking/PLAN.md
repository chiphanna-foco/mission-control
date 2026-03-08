# Daily GA4 + Affluent Revenue Tracking - Automation Plan

**Task ID:** wt-001  
**Priority:** URGENT  
**Status:** In Planning  

## Scope

Automate daily tracking of:
1. **GA4 Metrics** - Traffic, pageviews, top pages, referrers
2. **Affluent Revenue** - Clicks, commissions, revenue by network
3. **Storage** - `/data/wetried/analytics/` with daily snapshots

## Components

### 1. GA4 Data Pull
- Query Google Analytics 4 API (WeTried.it property)
- Extract:
  - Total traffic (users/sessions)
  - Pageviews
  - Top 10 pages by pageviews
  - Top referrers (organic, direct, social, paid)
- Output: `ga4-metrics-YYYY-MM-DD.json`

### 2. Affluent Email Processing
- Query Gmail for Affluent emails (from past 24h)
- Parse affiliate network emails:
  - Amazon Associates
  - ShareASale
  - Impact
  - Any other active networks
- Extract per-email:
  - Clicks
  - Commissions
  - Revenue
- Aggregate by network
- Output: `affluent-revenue-YYYY-MM-DD.json`

### 3. Combined Report
- Merge GA4 + Affluent data
- Create daily snapshot: `daily-analytics-YYYY-MM-DD.json`
- Store in `/data/wetried/analytics/`

## Dependencies

- [ ] GA4 API credentials (via gws CLI)
- [ ] Gmail API access (via gws CLI)
- [ ] Affluent email parsing patterns (reverse-engineer from recent emails)
- [ ] Directory structure: `/data/wetried/analytics/`

## Execution Plan

1. **Verify API access** - Test GA4 and Gmail connectivity
2. **Create GA4 script** - `scripts/ga4-pull.mjs`
3. **Create Affluent parser** - `scripts/affluent-parser.mjs`
4. **Create daily driver** - `scripts/daily-report.mjs`
5. **Test full pipeline** - Run once manually
6. **Set up cron job** - Schedule daily execution

## Success Criteria

- ✅ GA4 data pulling without errors
- ✅ Affluent emails parsing with 95%+ accuracy
- ✅ Daily reports generated and stored
- ✅ Data persists in `/data/wetried/analytics/`
