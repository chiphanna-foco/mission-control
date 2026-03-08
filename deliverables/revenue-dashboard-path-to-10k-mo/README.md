# WeTried.it Revenue Dashboard
## Path to $10K/Month

A comprehensive revenue dashboard for tracking affiliate revenue across multiple networks and projecting path to $10K/month goal.

## Features

- **Real-time Revenue Metrics**
  - Current month revenue ($1-3K baseline)
  - Daily average and trend
  - Month-end projection
  - Gap to $10K goal

- **Visualizations**
  - Daily revenue trend line chart
  - Revenue distribution by affiliate network (pie chart)
  - Top performing pages/products table
  - Goal progress bar

- **Data Integration**
  - **Affluent (Commission Junction)** - Parses affiliate emails
  - **Google Analytics 4** - Ecommerce revenue tracking
  - **Amazon Associates** - Product link commissions
  - **Skimlinks** - Contextual affiliate links
  - **Direct Programs** - Other affiliate networks

## Architecture

### Dashboard (`pages/index.js`)
- Next.js React component
- Responsive grid layout
- Real-time data refresh (5-minute intervals)
- Key metrics cards, trend charts, and data tables

### API Endpoint (`pages/api/data.js`)
- Aggregates data from all revenue sources
- Returns calculated metrics and projections
- Falls back to mock data if real sources unavailable

### Revenue Aggregator (`lib/revenue-aggregator.js`)
- Pulls data from local data files
- Calculates daily averages and month-end projections
- Generates revenue by network breakdown
- Identifies top performing pages

## Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys and credentials:
- Google Analytics 4 property ID
- Affluent/Commission Junction API key
- Amazon Associates tag
- Skimlinks API key

### 3. Data Integration

#### Affluent (Commission Junction)
The dashboard expects data from the P26 metrics aggregator:
- Location: `data/affluent-weekly-data.json`
- Source: `parse-affluent-emails.mjs` script
- Format: `{ totalCommission, clicks, conversions, ...}`

#### Google Analytics 4
Create `data/ga4-revenue-data.json` with:
```json
{
  "totalRevenue": 1500.00,
  "transactions": 45,
  "ecommerceValue": 1500.00
}
```

#### Amazon Associates
Create `data/amazon-associates-data.json` with:
```json
{
  "totalEarnings": 800.00,
  "impressions": 5000,
  "clicks": 150,
  "conversions": 12
}
```

### 4. Run Development Server
```bash
npm run dev
```

Navigate to `http://localhost:3000` to see the dashboard.

## Data File Locations

Place revenue data files in the `data/` directory:

```
revenue-dashboard-path-to-10k-mo/
├── data/
│   ├── affluent-weekly-data.json
│   ├── ga4-revenue-data.json
│   └── amazon-associates-data.json
├── pages/
├── lib/
└── public/
```

## Key Metrics Explained

### Current Month Revenue
Total revenue earned so far this month across all networks.

### Daily Average
Current month revenue ÷ days elapsed in month.

### Month-End Projection
Daily average × total days in month. Shows what revenue will be if current pace continues.

### Gap to $10K Goal
$10,000 target - month-end projection.
- **Positive gap:** Amount still needed to hit $10K goal
- **Negative gap:** Amount projected to exceed goal (✅ ON TRACK)

### Top Performing Pages
Pages/products generating the most revenue, ranked by commission value.

### Revenue by Network
Breakdown of total revenue by affiliate network type.

## Metrics Calculation Flow

```
1. Fetch data from all affiliate networks
2. Sum total current month revenue
3. Calculate daily average (total / day of month)
4. Project month-end (daily average × days in month)
5. Calculate gap to $10K target
6. Generate daily trend from accumulated data
7. Identify top pages and network breakdown
```

## Integration with Mission Control

This dashboard is deployed as part of WeTried.it's agent workflow:

- **Agent:** `wt-agent-001` (WeTried.it)
- **Task:** `wt-002` - Revenue dashboard path to $10k/mo
- **Update Frequency:** Real-time (5-min refresh, data sources every 24h)
- **Output:** `https://mc.chip-hanna.com/wetried/revenue` (when integrated)

## Automation & Scheduled Updates

### Daily Revenue Sync (7 AM)
```bash
node scripts/daily-revenue-sync.mjs
```
- Pulls latest Affluent/GA4/Amazon data
- Updates `data/*.json` files
- Triggers dashboard refresh

### Weekly Rollup
```bash
node scripts/weekly-rollup.mjs
```
- Generates weekly revenue report
- Sends Slack notification
- Logs to weekly scorecard

## Troubleshooting

### Dashboard shows "No data" or mock data
1. Check `data/` directory exists
2. Verify data files are in correct location
3. Check API credentials in `.env.local`
4. See browser console for error messages

### Old data is showing
- Dashboard refreshes every 5 minutes
- Click refresh button to force update
- Check `lastUpdated` timestamp at bottom of page

### Gap calculation seems off
- Verify today's date is correct
- Check that data includes today's revenue
- Ensure baseline ($1-3K) is reasonable for your traffic

## Future Enhancements

- [ ] Real-time data streaming (websockets)
- [ ] Custom date range selection
- [ ] Daily email digest with metrics
- [ ] Slack integration for alerts
- [ ] Historical trend analysis (YoY)
- [ ] Revenue per page deep-dives
- [ ] Network-specific analytics
- [ ] Conversion rate tracking
- [ ] ROI calculation by network
- [ ] Forecasting engine (ML-based)

## Support

For issues or questions about the dashboard:
1. Check the logs: `npm run dev` output
2. Review data file formats
3. Verify all affiliate networks are connected
4. Check Mission Control for related tasks

---

**Target Goal:** $10,000/month  
**Current Status:** [See dashboard for real-time metrics]  
**Last Updated:** See timestamp on dashboard
