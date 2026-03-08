# Mission Control Integration Guide

## Dashboard Widget

The pageant alert system integrates with the Mission Control dashboard to display upcoming deadlines.

### 1. Add to Mission Control API Routes

In `/Users/chipai/workshop/src/routes/api.ts`, add:

```typescript
import { getDashboardWidget } from '../../../pageant-deadline-alert-system/dashboard-widget.mjs';

// Pageant alerts endpoint
app.get('/api/dashboard/pageant-alerts', (req, res) => {
  try {
    const widget = getDashboardWidget();
    res.json({
      status: 'ok',
      data: widget,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Add Dashboard Card Component

In `/src/components/DashboardCard.tsx`:

```tsx
import PageantAlertsCard from './cards/PageantAlertsCard';

export function DashboardCard({ type, data }) {
  if (type === 'pageant-alerts') {
    return <PageantAlertsCard data={data} />;
  }
  // ... other cards
}
```

### 3. Create PageantAlertsCard Component

File: `/src/components/cards/PageantAlertsCard.tsx`

```tsx
import React from 'react';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function PageantAlertsCard({ data }) {
  const { upcoming, summary } = data;

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'border-l-4 border-red-500 bg-red-50';
      case 'high': return 'border-l-4 border-yellow-500 bg-yellow-50';
      default: return 'border-l-4 border-blue-500 bg-blue-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Pageant Deadlines</h3>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{summary.urgent}</div>
          <div className="text-sm text-gray-600">Urgent</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{summary.upcoming30days}</div>
          <div className="text-sm text-gray-600">Next 30d</div>
        </div>
      </div>

      {/* Upcoming List */}
      <div className="space-y-3">
        {upcoming.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No upcoming deadlines</p>
        ) : (
          upcoming.map(pageant => (
            <div key={pageant.id} className={`p-3 rounded ${getUrgencyColor(pageant.urgency)}`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">{pageant.name}</h4>
                <span className="text-sm font-bold">
                  {pageant.daysRemaining <= 0 ? '❌ Passed' : `${pageant.daysRemaining}d`}
                </span>
              </div>

              {/* Requirements Checklist */}
              <div className="text-sm space-y-1">
                {pageant.requirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {req.submitted ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <AlertCircle size={16} className="text-orange-600" />
                    )}
                    <span>
                      {req.icon} {req.label}{req.items ? ': ' + req.items.join(', ') : ''}
                    </span>
                  </div>
                ))}
              </div>

              {/* Deadline Date */}
              <div className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                <Clock size={14} />
                Deadline: {new Date(pageant.deadline).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

### 4. Add to Dashboard Main Page

In `/src/pages/dashboard.tsx`:

```tsx
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [pageantAlerts, setPageantAlerts] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard/pageant-alerts')
      .then(r => r.json())
      .then(data => setPageantAlerts(data.data))
      .catch(err => console.error('Error loading pageant alerts:', err));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Other dashboard cards... */}
      {pageantAlerts && <PageantAlertsCard data={pageantAlerts} />}
    </div>
  );
}
```

## Scheduled Alerts

### Add to Mission Control Orchestration

In `mission-control.db` tasks table, add:

```sql
INSERT INTO tasks (
  title, 
  description, 
  status, 
  priority, 
  workspace_id, 
  assigned_agent_id, 
  created_at
) VALUES (
  'Check Pageant Deadlines',
  'Run: npm run check',
  'scheduled',
  'normal',
  'scarlett',
  'sc-agent-001',
  NOW()
);
```

### Cron Configuration

Add to PM2 ecosystem file or OS crontab:

```cron
# Check pageant deadlines every hour
0 * * * * /Users/chipai/Documents/Shared/projects/pageant-deadline-alert-system/check.sh
```

Or with PM2:

```json
{
  "name": "pageant-deadline-checker",
  "script": "alert-engine.mjs",
  "args": "--check",
  "cron": "0 * * * *",
  "instances": 1,
  "max_memory_restart": "500M"
}
```

## Data Flow

```
alerts.json (source of truth)
    ↓
alert-engine.mjs (checks deadlines, sends Slack alerts)
    ↓
dashboard-widget.mjs (formats data for display)
    ↓
Mission Control API endpoint (/api/dashboard/pageant-alerts)
    ↓
React Component (PageantAlertsCard)
    ↓
User Dashboard
```

## Real-Time Updates

For real-time updates, add a WebSocket listener:

```typescript
// In Mission Control API
const wss = new WebSocket.Server({ port: 3002 });

// On pageant data changes
fs.watch(ALERTS_FILE, () => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      const widget = getDashboardWidget();
      client.send(JSON.stringify({ type: 'pageant-alerts-updated', data: widget }));
    }
  });
});

// Client-side
const ws = new WebSocket('ws://localhost:3002');
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'pageant-alerts-updated') {
    setPageantAlerts(data);
  }
};
```

## Troubleshooting

**Dashboard not showing alerts:**
- Check `/api/dashboard/pageant-alerts` returns valid JSON
- Verify `alerts.json` path is correct in `dashboard-widget.mjs`
- Check browser console for errors

**Slack alerts not firing:**
- Verify webhooks are set in `slack-config.json`
- Test: `curl -X POST <webhook_url> -d '{"text":"test"}'`
- Check alert engine logs

**Stale data:**
- Dashboard caches for 5 minutes (see API route)
- Add `?refresh=1` to bust cache: `/api/dashboard/pageant-alerts?refresh=1`
