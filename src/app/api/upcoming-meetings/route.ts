import { NextRequest, NextResponse } from 'next/server';
import { getOrSetCache } from '@/lib/ttlCache';
import { getUpcomingMeetings } from '@/lib/executive-data';
import { fetchUpcomingMeetingsFromCalendar } from '@/lib/gog-helper';

export const runtime = 'nodejs';

const TTL_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1';

  try {
    const result = await getOrSetCache(
      'upcoming-meetings',
      TTL_MS,
      async () => {
        // Try live Google Calendar data first
        const { workMeetings, personalMeetings } = await fetchUpcomingMeetingsFromCalendar();
        const totalLive = workMeetings.length + personalMeetings.length;
        
        // Fall back to mock data
        const mockResponse = await getUpcomingMeetings();
        
        // Use live meetings if available, otherwise mock
        const meetings = totalLive > 0 ? [...workMeetings, ...personalMeetings] : mockResponse.meetings;

        return {
          generatedAt: new Date().toISOString(),
          meetings,
          workMeetings,
          personalMeetings,
          live: totalLive > 0,
          note: totalLive > 0 ? 'Loaded from Google Calendar via gog' : 'Using mock data',
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
    console.error('Upcoming meetings error:', error);
    
    // Fall back to pure mock data on error
    const mockResponse = await getUpcomingMeetings();
    return NextResponse.json({
      meetings: mockResponse.meetings,
      live: false,
      note: 'Using mock data (gog failed)',
      generatedAt: new Date().toISOString(),
      cache: {
        ttlSeconds: 300,
        cached: false,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
    });
  }
}
