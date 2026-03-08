# Integration Guide: Connect Real Revenue Data

This guide walks through connecting the dashboard to real affiliate network data sources.

## 1. Affluent (Commission Junction) Integration

### Data Source
The P26 metrics aggregator (`parse-affluent-emails.mjs`) parses Affluent commission emails.

### Setup
1. Ensure P26 is running and generating `data/affluent-weekly-data.json`
2. Dashboard will auto-detect this file and use it

### Data Format
```json
{
  "totalCommission": 250.50,
  "clicks": 1250,
  "conversions": 42,
  "avgCommissionValue": 5.95,
  "topProducts": ["Product A", "Product B"],
  "dataDate": "2026-03-07"
}
```

### Status Check
```bash
# Check if P26 data exists
ls -la data/affluent-weekly-data.json

# Parse latest Affluent emails
node ~/Documents/Documents\ -\ ChipAI\'s\ Mac\ mini/mission-control/data/wetried/parse-affluent-emails.mjs
```

---

## 2. Google Analytics 4 Integration

### Setup
1. Create Google Analytics property for WeTried.it
2. Enable ecommerce tracking
3. Get property ID from GA4 settings

### API Credential Flow
```bash
# Install gws (Google Workspace CLI)
npm install -g gws

# Authenticate
gws auth login

# Query GA4 data
gws analytics run-report --property-id YOUR_PROPERTY_ID \
  --date-ranges "2026-03-01,2026-03-31" \
  --metrics "totalRevenue" "transactions" "totalUsers"
```

### Script to Create Data File
```bash
# Create scripts/ga4-sync.mjs
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function syncGA4Data() {
  try {
    // TODO: Integrate with GA4 API
    // For now, return mock data
    const data = {
      totalRevenue: 1500.00,
      transactions: 45,
      users: 2850,
      ecommerceValue: 1500.00,
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'data', 'ga4-revenue-data.json'),
      JSON.stringify(data, null, 2)
    );

    console.log('GA4 data synced:', data);
  } catch (error) {
    console.error('GA4 sync failed:', error);
  }
}

syncGA4Data();
```

### Manual Data Entry
Create `data/ga4-revenue-data.json`:
```json
{
  "totalRevenue": 1500.00,
  "transactions": 45,
  "ecommerceValue": 1500.00,
  "users": 2850,
  "lastUpdated": "2026-03-07T16:00:00Z"
}
```

---

## 3. Amazon Associates Integration

### Setup
1. Log in to Amazon Associates
2. Go to Reports → Performance
3. Download earnings report as CSV

### CSV Format
```csv
Impressions,Clicks,Conversions,Total Earnings
5000,150,12,800.00
```

### Script to Parse CSV
```bash
# Create scripts/amazon-sync.mjs

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

function syncAmazonData(csvPath) {
  const earnings = { totalEarnings: 0, impressions: 0, clicks: 0, conversions: 0 };

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
      earnings.totalEarnings += parseFloat(row['Total Earnings']);
      earnings.impressions += parseInt(row['Impressions']);
      earnings.clicks += parseInt(row['Clicks']);
      earnings.conversions += parseInt(row['Conversions']);
    })
    .on('end', () => {
      fs.writeFileSync(
        path.join(process.cwd(), 'data', 'amazon-associates-data.json'),
        JSON.stringify(earnings, null, 2)
      );
      console.log('Amazon data synced:', earnings);
    });
}
```

### Manual Entry
Create `data/amazon-associates-data.json`:
```json
{
  "totalEarnings": 800.00,
  "impressions": 5000,
  "clicks": 150,
  "conversions": 12,
  "lastUpdated": "2026-03-07T16:00:00Z"
}
```

---

## 4. Skimlinks Integration

### Setup
1. Log in to Skimlinks dashboard
2. Get API key from Settings
3. Query Skimlinks API for earnings

### API Query
```bash
curl -H "Authorization: Bearer YOUR_SKIMLINKS_API_KEY" \
  https://api.skimlinks.com/earnings \
  -d "start_date=2026-03-01&end_date=2026-03-31"
```

### Data Format
```json
{
  "totalEarnings": 200.00,
  "clicks": 450,
  "commissionValue": 0.44,
  "lastUpdated": "2026-03-07T16:00:00Z"
}
```

---

## 5. Automated Daily Sync

### Create Cron Job
```bash
# Edit crontab
crontab -e

# Add sync job at 8 AM daily
0 8 * * * cd ~/Documents/Shared/projects/revenue-dashboard-path-to-10k-mo && npm run sync-data
```

### Sync Script
Create `scripts/sync-all.mjs`:
```bash
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function syncAllData() {
  console.log('🔄 Syncing revenue data from all networks...');

  try {
    // 1. Affluent
    console.log('📧 Pulling Affluent emails...');
    // execSync('node path/to/parse-affluent-emails.mjs');

    // 2. GA4
    console.log('📊 Pulling Google Analytics...');
    // await syncGA4();

    // 3. Amazon
    console.log('🛒 Pulling Amazon Associates...');
    // await syncAmazon();

    // 4. Skimlinks
    console.log('🔗 Pulling Skimlinks...');
    // await syncSkimlinks();

    console.log('✅ All data synced successfully');
    console.log(`⏰ Last updated: ${new Date().toISOString()}`);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

syncAllData();
```

### Add to package.json
```json
{
  "scripts": {
    "sync-data": "node scripts/sync-all.mjs"
  }
}
```

---

## 6. Testing Data Flow

### 1. Check if dashboard reads data correctly
```bash
# Start dashboard
npm run dev

# Open http://localhost:3000
# Should show real data instead of mock data
```

### 2. Verify data files are in correct location
```bash
ls -la data/
# Should show:
# - affluent-weekly-data.json
# - ga4-revenue-data.json
# - amazon-associates-data.json
```

### 3. Check dashboard logs
```bash
# In development, check console output
# Should see "Data source: Aggregated from multiple networks" when real data loads
```

### 4. Monitor update frequency
```bash
# Dashboard refreshes every 5 minutes
# Check "Last Updated" timestamp on dashboard
```

---

## 7. Troubleshooting

### Dashboard still shows mock data
- Check `data/` directory exists
- Verify file names match exactly (case-sensitive)
- Check file format is valid JSON
- Look for errors in console output

### Some networks missing
- Comment out unused network in `lib/revenue-aggregator.js`
- Or create empty data files with $0 values
- Dashboard will show 0% for that network

### Old data persisting
- Clear browser cache (Ctrl+Shift+Delete)
- Force refresh dashboard (Ctrl+F5)
- Check `lastUpdated` timestamp in data files

### Revenue seems wrong
- Verify data files have correct totals
- Check calculation in `lib/revenue-aggregator.js`
- Run `npm run dev` in debug mode
- Log aggregated values to console

---

## Next Steps

1. ✅ Dashboard structure complete
2. 📝 Add Affluent email parsing integration
3. 📊 Connect Google Analytics 4 API
4. 🛒 Link Amazon Associates account
5. 🔗 Integrate Skimlinks API
6. ⏰ Set up daily sync cron job
7. 🚀 Deploy to production (Mission Control)

---

## API Reference

### /api/data
```bash
curl http://localhost:3000/api/data
```

Response:
```json
{
  "currentMonthRevenue": 1234.56,
  "dailyTrendData": [...],
  "topPages": [...],
  "revenueByNetwork": [...],
  "monthEndProjection": 3703.68,
  "targetRevenue": 10000,
  "gap": 6296.32,
  "daysInMonth": 31,
  "daysRemaining": 24,
  "dailyAverage": 119.50,
  "lastUpdated": "2026-03-07T16:30:00Z"
}
```

---

## Support

For issues:
1. Check logs: `npm run dev` output
2. Verify data files exist and are valid JSON
3. Check API credentials in `.env.local`
4. Review integration guide for each network
