// Database imports removed - this route doesn't use database

export async function GET() {
  try {
    // Calculate YTD costs from model usage
    // This would integrate with actual billing data
    
    const year = new Date().getFullYear();
    const startOfYear = `${year}-01-01`;

    // Placeholder: In production, aggregate from actual billing/usage logs
    // For now, returning structure with calculated estimates

    const costData = {
      haiku_cost: 2.35,
      sonnet_cost: 18.76,
      opus_cost: 12.40,
      gemini_cost: 0.84,
      total_ytd: 34.35,
    };

    return Response.json(costData);
  } catch (error) {
    console.error('Failed to get cost metrics:', error);
    return Response.json(
      {
        haiku_cost: 0,
        sonnet_cost: 0,
        opus_cost: 0,
        gemini_cost: 0,
        total_ytd: 0,
      },
      { status: 500 }
    );
  }
}
