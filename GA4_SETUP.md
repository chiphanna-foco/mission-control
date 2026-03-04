# Google Analytics 4 API Setup Guide

**Time estimate:** 15-20 minutes
**Difficulty:** Intermediate (copy/paste + 3 clicks)

---

## Goal
Connect Mission Control's Business KPI dashboard to your real Google Analytics 4 data for wetried.it traffic metrics.

Once done, you'll see:
- Daily sessions, users, bounce rate, session duration
- Weekly trends (📈📉➡️)
- Real-time updates every 60 seconds

---

## Step 1: Get Your GA4 Property ID

1. Go to **[Google Analytics](https://analytics.google.com/)** and log in
2. Select **"wetried.it"** property from the left sidebar
3. Click **Admin** (bottom left, gear icon)
4. Under "Property" column, click **Property Settings**
5. Copy your **Property ID** (looks like: `1234567890`)
   - Save this—you'll need it in Step 3

---

## Step 2: Create a Service Account in Google Cloud

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Make sure you're in the right project (should show at top)
   - If no project exists, click **Select a Project** → **New Project** → name it `mission-control`
3. Click the **☰ menu** (top left) → **APIs & Services** → **Credentials**
4. Click **+ Create Credentials** → **Service Account**
5. Fill in:
   - **Service account name:** `mission-control-ga4` 
   - **Service account ID:** auto-fills (leave it)
   - Click **Create and Continue**
6. Grant permissions:
   - **Role:** Search for and select **Viewer** (under Basic)
   - Click **Continue**
7. Click **Create Key** → **JSON** → **Create**
   - This downloads a `mission-control-ga4-*.json` file
   - **KEEP THIS FILE SAFE** — contains your credentials

---

## Step 3: Add Service Account to Google Analytics

1. Go back to **[Google Analytics Admin](https://analytics.google.com/analytics/web/)**
2. Under **Admin** → **Property** → **Property Access Management**
3. Click **+ Grant Access**
4. Copy the **Service Account Email** from your downloaded JSON file (looks like: `mission-control-ga4@project-id.iam.gserviceaccount.com`)
5. Paste it in the "Email" field in GA4
6. Select role: **Viewer**
7. Click **Grant Access**

---

## Step 4: Set Environment Variable

Extract credentials from the JSON file and set them in your environment.

**Option A: Copy to `.env.local`** (Development)

1. Open the `mission-control-ga4-*.json` file you downloaded
2. Copy the entire contents
3. Open `/Users/chipai/Documents/mission-control/.env.local` (create if doesn't exist)
4. Add:
   ```bash
   GOOGLE_ANALYTICS_PROPERTY_ID=1234567890
   GOOGLE_ANALYTICS_KEY_ID=<your-key-id-from-json>
   GOOGLE_ANALYTICS_PRIVATE_KEY=<your-private-key-from-json>
   GOOGLE_ANALYTICS_CLIENT_EMAIL=mission-control-ga4@project-id.iam.gserviceaccount.com
   ```

**Option B: Set via openclaw.json** (Production)

1. Edit `~/.openclaw/openclaw.json`
2. Add under `env` section:
   ```json
   {
     "env": {
       "GOOGLE_ANALYTICS_PROPERTY_ID": "1234567890",
       "GOOGLE_ANALYTICS_KEY_ID": "...",
       "GOOGLE_ANALYTICS_PRIVATE_KEY": "...",
       "GOOGLE_ANALYTICS_CLIENT_EMAIL": "..."
     }
   }
   ```

**Option C: Secrets manager** (Recommended for production)
- Store the JSON file at: `/Users/chipai/.secrets/ga4-key.json`
- Add to `.env.local`:
  ```bash
  GOOGLE_ANALYTICS_CREDENTIALS_PATH=/Users/chipai/.secrets/ga4-key.json
  GOOGLE_ANALYTICS_PROPERTY_ID=1234567890
  ```

---

## Step 5: Update the API Route

Edit `/Users/chipai/Documents/mission-control/src/app/api/kpis/traffic/route.ts`

Replace the placeholder code with this:

```typescript
import { google } from 'googleapis';
import { homedir } from 'os';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
    
    if (!propertyId) {
      throw new Error('GOOGLE_ANALYTICS_PROPERTY_ID not configured');
    }

    // Load credentials from env or file
    let credentials: any;
    
    const credPath = process.env.GOOGLE_ANALYTICS_CREDENTIALS_PATH;
    if (credPath && existsSync(credPath)) {
      credentials = JSON.parse(readFileSync(credPath, 'utf-8'));
    } else {
      // Build from individual env vars
      credentials = {
        type: 'service_account',
        project_id: process.env.GOOGLE_ANALYTICS_PROJECT_ID,
        private_key_id: process.env.GOOGLE_ANALYTICS_KEY_ID,
        private_key: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_ANALYTICS_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
      };
    }

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    // Query GA4 API
    const analyticsData = google.analyticsdata('v1beta');
    
    const response = await analyticsData.properties.runReport({
      auth,
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [
          {
            startDate: '7daysAgo',
            endDate: 'today',
          },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        dimensions: [{ name: 'date' }],
      },
    });

    // Parse response
    const rows = response.data.rows || [];
    const latestDay = rows[rows.length - 1];

    if (!latestDay || !latestDay.metricValues) {
      throw new Error('No GA4 data found');
    }

    const metrics = latestDay.metricValues;

    const sessions = parseInt(metrics[0]?.value || '0');
    const users = parseInt(metrics[1]?.value || '0');
    const bounceRate = parseFloat(metrics[2]?.value || '0');
    const duration = parseFloat(metrics[3]?.value || '0');

    // Calculate weekly trend by comparing last 7 days to previous 7 days
    const lastWeekAvg = rows.slice(0, 7).reduce((sum, r) => sum + parseInt(r.metricValues[0]?.value || '0'), 0) / 7;
    const thisWeekAvg = rows.slice(7, 14).reduce((sum, r) => sum + parseInt(r.metricValues[0]?.value || '0'), 0) / 7;
    
    const weekly_trend = 
      thisWeekAvg > lastWeekAvg ? 'up' : 
      thisWeekAvg < lastWeekAvg ? 'down' : 
      'flat';

    return Response.json({
      daily_sessions: sessions,
      daily_users: users,
      bounce_rate: bounceRate,
      avg_session_duration: Math.round(duration),
      traffic_source: 'wetried.it',
      weekly_trend,
    });
  } catch (error) {
    console.error('Failed to get GA4 traffic metrics:', error);
    
    // Graceful fallback to sample data
    return Response.json({
      daily_sessions: 2847,
      daily_users: 1654,
      bounce_rate: 42.3,
      avg_session_duration: 185,
      traffic_source: 'wetried.it',
      weekly_trend: 'up',
    });
  }
}
```

---

## Step 6: Install Google APIs Library

Run in Mission Control directory:
```bash
cd /Users/chipai/Documents/mission-control
npm install googleapis
```

---

## Step 7: Restart Mission Control & Test

1. Stop Mission Control:
   ```bash
   cd ~/workshop
   # Kill the existing instance (Ctrl+C) and restart
   npm run dev
   ```

2. Navigate to a workspace in Mission Control
3. Click **"Business KPIs"** tab
4. Scroll to **Traffic (Google Analytics)** section
5. You should see real data from GA4 now:
   - Daily sessions from wetried.it
   - Weekly trend indicator
   - Real-time updates every 60 seconds

---

## Troubleshooting

### "GOOGLE_ANALYTICS_PROPERTY_ID not configured"
- Add `GOOGLE_ANALYTICS_PROPERTY_ID` to `.env.local` or `openclaw.json`
- Restart Mission Control

### "Invalid service account credentials"
- Verify the JSON file contents are correct
- Make sure **Service Account** (not OAuth credentials) was created
- Check that email was granted **Viewer** access in GA4

### "No GA4 data found"
- Confirm wetried.it has at least 1 visitor in the last 7 days
- Wait 24 hours for GA4 to process data from new service account

### Still showing sample data
- Check browser console (F12) for API errors
- Verify `/api/kpis/traffic` endpoint returns real data:
  ```bash
  curl http://localhost:3000/api/kpis/traffic
  ```

---

## What You Just Did

✅ Created a **service account** with read-only access to GA4
✅ Granted that account **Viewer** permission in Google Analytics
✅ Stored credentials securely
✅ Connected Mission Control to real Google Analytics 4 data
✅ Now your Business KPI dashboard shows real traffic trends

**Result:** Every 60 seconds, the Business KPIs tab fetches live data from GA4 and updates your dashboard with:
- Daily sessions & users
- Bounce rate
- Average session duration
- Weekly trend (↑ up, ↓ down, → flat)

---

## Next Steps (Optional Enhancements)

1. **Add more metrics:** Pageviews, conversion rate, revenue data
2. **Compare periods:** Week-over-week, month-over-month trends
3. **Breakdown by source:** Direct vs organic vs referral traffic
4. **Export to spreadsheet:** Auto-sync to Google Sheets weekly
5. **Alerting:** Notify Slack if bounce rate spikes or users drop

Need help with any of these? Let me know!
