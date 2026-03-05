import { NextRequest, NextResponse } from 'next/server';
import { fetchLinkedInProfile } from '@/lib/linkedin-scraper';
import { getCachedProfile, queueProfileScrape } from '@/lib/linkedin-scraper-advanced';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 second timeout for scraping

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  const email = req.nextUrl.searchParams.get('email');
  const scrape = req.nextUrl.searchParams.get('scrape') === 'true';

  if (!name || !email) {
    return NextResponse.json(
      { error: 'Missing name or email parameter' },
      { status: 400 },
    );
  }

  try {
    // Check if we have a cached scraped profile
    const cachedFull = getCachedProfile(email);
    if (cachedFull) {
      return NextResponse.json({
        profile: cachedFull,
        source: 'cached',
        linkedInUrl: cachedFull.profileUrl,
      });
    }

    // If scrape requested and not cached, queue scraping in background
    if (scrape) {
      queueProfileScrape(email, name).catch(console.error);
    }

    // Return inferred profile while scraping happens in background
    const inferredProfile = await fetchLinkedInProfile(name, email);

    return NextResponse.json({
      profile: inferredProfile,
      source: 'inferred',
      linkedInUrl: inferredProfile.profileUrl,
      scrapingQueued: scrape,
      message: scrape ? 'Full profile scraping queued - check back in a few seconds' : undefined,
    });
  } catch (error) {
    console.error('LinkedIn profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}
