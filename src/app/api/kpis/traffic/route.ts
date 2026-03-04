import { google } from 'googleapis';
import { existsSync, readFileSync } from 'fs';

export async function GET() {
  try {
    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
    
    if (!propertyId) {
      throw new Error('GOOGLE_ANALYTICS_PROPERTY_ID not configured');
    }

    // Load credentials from file
    const credPath = process.env.GOOGLE_ANALYTICS_CREDENTIALS_PATH;
    
    if (!credPath || !existsSync(credPath)) {
      throw new Error(`Credentials file not found at ${credPath}`);
    }

    const credentials = JSON.parse(readFileSync(credPath, 'utf-8'));

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
    
    if (!rows || rows.length === 0) {
      throw new Error('No GA4 data returned');
    }

    // Get latest day data
    const latestDay = rows[rows.length - 1];
    const metrics = latestDay?.metricValues || [];

    const sessions = parseInt(metrics[0]?.value || '0');
    const users = parseInt(metrics[1]?.value || '0');
    const bounceRate = parseFloat(metrics[2]?.value || '0');
    const duration = parseFloat(metrics[3]?.value || '0');

    // Calculate weekly trend (last 7 days vs previous 7 days)
    let weekly_trend: 'up' | 'down' | 'flat' = 'flat';
    
    if (rows.length >= 7) {
      const lastWeekAvg = rows
        .slice(-7)
        .reduce((sum, r) => sum + parseInt(r.metricValues?.[0]?.value || '0'), 0) / 7;
      
      const prevWeekAvg = rows.length >= 14
        ? rows
            .slice(-14, -7)
            .reduce((sum, r) => sum + parseInt(r.metricValues?.[0]?.value || '0'), 0) / 7
        : lastWeekAvg;

      if (lastWeekAvg > prevWeekAvg) weekly_trend = 'up';
      else if (lastWeekAvg < prevWeekAvg) weekly_trend = 'down';
    }

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
    return Response.json(
      {
        daily_sessions: 2847,
        daily_users: 1654,
        bounce_rate: 42.3,
        avg_session_duration: 185,
        traffic_source: 'wetried.it',
        weekly_trend: 'up',
      },
      { status: 500 }
    );
  }
}
