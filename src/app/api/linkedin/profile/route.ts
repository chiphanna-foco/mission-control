import { NextRequest, NextResponse } from 'next/server';
import { fetchLinkedInProfile } from '@/lib/linkedin-scraper';
// LinkedIn scraper advanced features removed - browser automation not available on Railway

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
    // Return inferred profile (browser scraping not available on Railway)
    const profile = await fetchLinkedInProfile(name, email);

    return NextResponse.json({
      profile,
      source: 'inferred',
      linkedInUrl: profile.profileUrl,
      note: 'Advanced browser-based scraping disabled on Railway (Puppeteer not available)',
    });
  } catch (error) {
    console.error('LinkedIn profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}
