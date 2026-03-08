# Quick Start Guide

Get the revenue dashboard up and running in 5 minutes.

## Step 1: Install & Start (2 minutes)

```bash
cd ~/Documents/Shared/projects/revenue-dashboard-path-to-10k-mo

# Install dependencies (already done)
npm install

# Start the dashboard
npm run dev
```

Dashboard will be live at: **http://localhost:3000**

## Step 2: Add Sample Data (1 minute)

Create sample data files to see the dashboard in action:

### Option A: Auto-generate Sample Data
```bash
# Copy sample data files
cp docs/sample-data/*.json data/
```

### Option B: Manual Entry
Create `data/affluent-weekly-data.json`:
```json
{
  "totalCommission": 250.50,
  "clicks": 1250,
  "conversions": 42,
  "avgCommissionValue": 5.95,
  "dataDate": "2026-03-07"
}
```

Create `data/ga4-revenue-data.json`:
```json
{
  "totalRevenue": 1500.00,
  "transactions": 45,
  "ecommerceValue": 1500.00,
  "users": 2850
}
```

Create `data/amazon-associates-data.json`:
```json
{
  "totalEarnings": 800.00,
  "impressions": 5000,
  "clicks": 150,
  "conversions": 12
}
```

## Step 3: View Dashboard (1 minute)

1. Open http://localhost:3000 in your browser
2. You should see:
   - **Key Metrics:** Current revenue, daily average, projections
   - **Charts:** Daily trend line + revenue by network pie
   - **Tables:** Top pages + network breakdown

## Step 4: Connect Real Data (1+ minute)

See `INTEGRATION_GUIDE.md` for:
- Affluent/Commission Junction setup
- Google Analytics 4 connection
- Amazon Associates integration
- Skimlinks API connection
- Daily automated sync setup

## What's Next?

### Deploy to Production
```bash
# Build for production
npm run build

# Start production server
npm run start
```

Then connect to Mission Control dashboard at `https://mc.chip-hanna.com/wetried/revenue`

### Set Up Automated Updates
```bash
# Edit HEARTBEAT.md to include revenue sync
# Or create cron job for daily data updates
```

### Monitor Performance
- Dashboard auto-refreshes every 5 minutes
- Check "Last Updated" timestamp for freshness
- Look for "Data source: Aggregated from multiple networks" confirmation

## Troubleshooting

### Dashboard loads but shows "Loading..."
- Check browser console for errors (F12)
- Make sure `npm run dev` is still running
- Try refreshing page (Ctrl+R)

### Dashboard shows $0 or mock data
- Create the sample data files (Step 2 above)
- Check files are in `data/` directory
- Make sure JSON files are valid

### Dashboard not responsive
- Check internet connection
- Verify local port 3000 is available
- Kill any other processes using port 3000: `lsof -i :3000`

### Want to change the $10K goal?
Edit `lib/revenue-aggregator.js` line:
```javascript
const targetRevenue = 10000;  // Change this number
```

Then refresh the dashboard.

## File Structure

```
revenue-dashboard-path-to-10k-mo/
├── pages/
│   ├── index.js           # Dashboard UI
│   └── api/
│       └── data.js        # API endpoint
├── lib/
│   └── revenue-aggregator.js  # Data aggregation logic
├── data/                  # Revenue data files (create these)
│   ├── affluent-weekly-data.json
│   ├── ga4-revenue-data.json
│   └── amazon-associates-data.json
├── docs/
│   ├── INTEGRATION_GUIDE.md
│   ├── QUICK_START.md
│   └── sample-data/       # Sample files for testing
├── README.md              # Full documentation
└── package.json
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F5` | Force refresh dashboard |
| `F12` | Open developer console |
| `Ctrl+Shift+I` | Open inspector tools |

## Features Checklist

- ✅ Real-time revenue metrics
- ✅ Daily trend visualization
- ✅ Revenue breakdown by network
- ✅ Top performing pages ranking
- ✅ Month-end projection
- ✅ Gap to $10K goal calculation
- ✅ Auto-refresh every 5 minutes
- ✅ Responsive mobile/tablet layout
- ✅ Error handling with mock data fallback
- ⏳ Real data integration (in progress)

## Getting Help

1. Check `README.md` for full documentation
2. Review `INTEGRATION_GUIDE.md` for data source setup
3. Check browser console (F12) for error messages
4. Look at `lib/revenue-aggregator.js` for data flow

---

**Ready to go live?** See README.md → "Integration with Mission Control"
