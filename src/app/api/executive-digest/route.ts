import { NextRequest, NextResponse } from 'next/server';
import { getOrSetCache } from '@/lib/ttlCache';
import { getDigest } from '@/lib/executive-data';
import { fetchStalledEmailsFromGmail } from '@/lib/gog-helper';

export const runtime = 'nodejs';

const TTL_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1';

  try {
    const result = await getOrSetCache(
      'executive-digest',
      TTL_MS,
      async () => {
        // Try live Gmail data first
        const liveStalled = await fetchStalledEmailsFromGmail();
        
        // Fall back to mock data
        const digest = await getDigest();
        
        // Use live stalled emails if available, otherwise mock
        const stalledEmails = liveStalled.length > 0 ? liveStalled : digest.stalledEmails;

        return {
          generatedAt: new Date().toISOString(),
          stalledEmails,
          pendingIntros: digest.pendingIntros,
          overdueTasks: digest.overdueTasks,
          calendarConflicts: digest.calendarConflicts,
          notes: liveStalled.length > 0 ? ['Loaded stalled emails from Gmail via gog'] : undefined,
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
    console.error('Digest error:', error);
    
    // Fall back to pure mock data on error
    const digest = await getDigest();
    return NextResponse.json({
      ...digest,
      generatedAt: new Date().toISOString(),
      cache: {
        ttlSeconds: 300,
        cached: false,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
    });
  }
}
