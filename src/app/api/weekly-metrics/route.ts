import { NextRequest, NextResponse } from 'next/server';
import { getOrSetCache } from '@/lib/ttlCache';
import { getWeeklyMetrics } from '@/lib/executive-data';

export const runtime = 'nodejs';

const TTL_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1';

  try {
    const result = await getOrSetCache(
      'weekly-metrics',
      TTL_MS,
      async () => {
        const data = await getWeeklyMetrics();
        return {
          generatedAt: new Date().toISOString(),
          ...data,
        };
      },
      forceRefresh,
    );

    return NextResponse.json({
      ...result.value,
      cache: {
        ttlSeconds: 300,
        cached: result.cached,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to load weekly metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
