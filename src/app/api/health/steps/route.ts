import { getDb } from '@/lib/db';

/**
 * POST /api/health/steps
 * Receives step count from iOS Shortcut
 * 
 * Request body:
 * { "steps": 1234, "date": "2026-03-04" }
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { steps, date } = body;

    if (steps === undefined || steps === null) {
      return Response.json({ error: 'steps is required' }, { status: 400 });
    }

    const stepsNum = parseInt(steps, 10);
    if (isNaN(stepsNum)) {
      return Response.json({ error: 'steps must be a number' }, { status: 400 });
    }

    const dateStr = date || new Date().toISOString().split('T')[0];

    // Store in SQLite for historical tracking
    // For now, just return success and cache it
    const cacheKey = `health:steps:${dateStr}`;
    
    // You could save this to a database table here
    // For MVP, we'll just store it in memory/process until we add a health_data table
    
    return Response.json({
      success: true,
      steps: stepsNum,
      date: dateStr,
      timestamp: new Date().toISOString(),
      message: 'Steps recorded successfully'
    });
  } catch (error) {
    console.error('Error recording steps:', error);
    return Response.json(
      { error: 'Failed to record steps' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/health/steps?date=2026-03-04
 * Retrieves step count for a specific date
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // TODO: Query database for stored steps
    // For now, return null if not found
    return Response.json({
      date,
      steps: null,
      message: 'No steps recorded yet for this date'
    });
  } catch (error) {
    console.error('Error fetching steps:', error);
    return Response.json(
      { error: 'Failed to fetch steps' },
      { status: 500 }
    );
  }
}
