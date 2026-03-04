export async function GET() {
  try {
    // This endpoint would aggregate model usage from OpenClaw logs
    // For now, returning sample structure based on ClawRouter stats
    
    // In production, this would:
    // 1. Query OpenClaw model routing logs
    // 2. Count requests per model
    // 3. Calculate costs based on model pricing
    // 4. Track fallback rates
    
    const models = [
      {
        model: 'claude-haiku-4-5',
        requests_today: 156,
        cost_cents: 12,
        fallback_rate_percent: 0.5,
      },
      {
        model: 'claude-sonnet-4-6',
        requests_today: 42,
        cost_cents: 45,
        fallback_rate_percent: 1.2,
      },
      {
        model: 'claude-opus-4-6',
        requests_today: 8,
        cost_cents: 120,
        fallback_rate_percent: 0,
      },
      {
        model: 'google-gemini-2.0-flash',
        requests_today: 31,
        cost_cents: 3,
        fallback_rate_percent: 0.8,
      },
    ];

    return Response.json(models);
  } catch (error) {
    console.error('Failed to get model metrics:', error);
    return Response.json([], { status: 500 });
  }
}
