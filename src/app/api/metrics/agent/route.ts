import { getDb } from '@/lib/db';

export async function GET() {
  try {
    // Get the most recent heartbeat check from the database
    // This assumes there's an openclaw_status or events table tracking heartbeats
    
    const db = getDb();
    const lastHeartbeat = db
      .prepare(`
        SELECT 
          CAST((julianday('now') - julianday(created_at)) * 86400000 AS INTEGER) as response_ms,
          created_at,
          CASE 
            WHEN CAST((julianday('now') - julianday(created_at)) * 86400000 AS INTEGER) < 5000 THEN 'healthy'
            WHEN CAST((julianday('now') - julianday(created_at)) * 86400000 AS INTEGER) < 30000 THEN 'degraded'
            ELSE 'offline'
          END as status
        FROM events
        WHERE type = 'heartbeat'
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .all() as Array<any>;

    if (lastHeartbeat.length === 0) {
      return Response.json({
        heartbeat_response_ms: 0,
        last_check: 0,
        status: 'offline',
      });
    }

    const check = lastHeartbeat[0];
    return Response.json({
      heartbeat_response_ms: Math.max(0, check.response_ms),
      last_check: new Date(check.created_at).getTime(),
      status: check.status,
    });
  } catch (error) {
    console.error('Failed to get agent metrics:', error);
    return Response.json(
      {
        heartbeat_response_ms: 0,
        last_check: 0,
        status: 'offline',
      },
      { status: 500 }
    );
  }
}
