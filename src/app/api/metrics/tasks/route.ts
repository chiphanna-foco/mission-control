import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    
    // Get task execution metrics
    const metrics = db
      .prepare(`
        SELECT 
          COUNT(*) as total_tasks,
          CAST(AVG(CASE 
            WHEN completed_at IS NOT NULL AND created_at IS NOT NULL
            THEN (julianday(completed_at) - julianday(created_at)) * 86400000
            ELSE NULL
          END) AS INTEGER) as avg_duration_ms
        FROM tasks
      `)
      .all() as Array<any>;

    // Get percentile latencies
    const durations = db
      .prepare(`
        SELECT CAST((julianday(completed_at) - julianday(created_at)) * 86400000 AS INTEGER) as duration_ms
        FROM tasks
        WHERE completed_at IS NOT NULL AND created_at IS NOT NULL
        ORDER BY duration_ms
      `)
      .all() as Array<{ duration_ms: number }>;

    let p50 = 0;
    let p95 = 0;

    if (durations.length > 0) {
      const p50Index = Math.floor(durations.length * 0.5);
      const p95Index = Math.floor(durations.length * 0.95);
      
      p50 = durations[p50Index]?.duration_ms || 0;
      p95 = durations[p95Index]?.duration_ms || 0;
    }

    const metric = metrics[0];

    return Response.json({
      total_tasks: metric.total_tasks || 0,
      avg_duration_ms: metric.avg_duration_ms || 0,
      p50_latency_ms: p50,
      p95_latency_ms: p95,
    });
  } catch (error) {
    console.error('Failed to get task metrics:', error);
    return Response.json(
      {
        total_tasks: 0,
        avg_duration_ms: 0,
        p50_latency_ms: 0,
        p95_latency_ms: 0,
      },
      { status: 500 }
    );
  }
}
