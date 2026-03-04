export async function GET() {
  try {
    // Get steps from iOS Shortcut submission (via /api/health/steps)
    const today = new Date().toISOString().split('T')[0];
    const stepsResponse = await fetch(`http://localhost:3001/api/health/steps?date=${today}`, {
      method: 'GET',
    });
    
    const stepsData = await stepsResponse.json();
    const steps = stepsData.steps || null;
    
    // For other metrics, use defaults or other sources
    const heart_rate = 72; // TODO: Add heart rate source
    const active_energy = 450; // TODO: Add calorie source
    const stand_hours = 0; // TODO: Add stand hours source
    const sleep_hours = 7; // TODO: Add sleep source
    
    // Simple trend: if steps are above 8000, trending up
    const weekly_trend = steps && steps > 8000 ? 'up' : steps && steps < 5000 ? 'down' : 'flat';

    return Response.json({
      heart_rate,
      steps: steps || 0,
      active_energy,
      stand_hours,
      sleep_hours,
      weekly_trend,
      last_sync: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to get health metrics:', error);
    return Response.json({
      heart_rate: null,
      steps: null,
      active_energy: null,
      stand_hours: null,
      sleep_hours: null,
      weekly_trend: null,
      error: 'Failed to fetch health metrics'
    }, { status: 500 });
  }
}
