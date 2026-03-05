/**
 * Advanced LinkedIn Profile Scraper using Camofox
 * Fetches full profiles including photos, headlines, recent posts, and activity
 */

import { browser } from '@/lib/browser-automation';

export interface LinkedInProfileFull {
  name: string;
  email: string;
  headline?: string;
  company?: string;
  location?: string;
  about?: string;
  photoUrl?: string;
  recentPosts?: Array<{
    text: string;
    timestamp: string;
    engagementCount?: number;
  }>;
  profileUrl: string;
  lastUpdated: number;
  isScraped: boolean; // true if from actual LinkedIn scrape, false if inferred
}

// Cache for scraped profiles
const PROFILE_CACHE_DB: Map<string, LinkedInProfileFull> = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Scrape a full LinkedIn profile using Camofox browser automation
 */
export async function scrapeLinkedInProfile(
  email: string,
  name: string,
): Promise<LinkedInProfileFull | null> {
  const cacheKey = email.toLowerCase();

  // Check cache first
  const cached = PROFILE_CACHE_DB.get(cacheKey);
  if (cached && Date.now() - cached.lastUpdated < CACHE_TTL) {
    console.log(`[LinkedIn] Using cached profile for ${email}`);
    return cached;
  }

  try {
    console.log(`[LinkedIn] Scraping profile for ${name} (${email})`);

    // Generate LinkedIn search URL
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name)} ${encodeURIComponent(email.split('@')[1])}`;

    // Create browser instance
    const page = await browser.newPage();

    try {
      // Navigate to search results
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for search results to load
      await page.waitForSelector('[data-test-search-result]', { timeout: 10000 }).catch(() => null);

      // Extract first profile link
      const profileLink = await page.$eval(
        'a[href*="/in/"]',
        (el) => (el as HTMLAnchorElement).href,
      ).catch(() => null);

      if (!profileLink) {
        console.log(`[LinkedIn] No profile found for ${name}`);
        return null;
      }

      // Navigate to profile
      await page.goto(profileLink, { waitUntil: 'networkidle2', timeout: 30000 });

      // Extract profile data using page evaluation
      const profileData = await page.evaluate(() => {
        const getText = (selector: string): string | undefined => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim();
        };

        const getAttr = (selector: string, attr: string): string | undefined => {
          const el = document.querySelector(selector);
          return el?.getAttribute(attr) || undefined;
        };

        // Extract headline (the job title under the name)
        const headline = getText('[data-test="top-card-headline"]') || 
                        getText('.top-card-headline');

        // Extract company
        const company = getText('[data-test="profile-experience-section"] li:first-child .visually-hidden') ||
                       getText('.company');

        // Extract location
        const location = getText('[data-test="top-card-secondary-headline"]') ||
                        getText('.top-card__secondary-headline');

        // Extract about section
        const about = getText('[data-test-id="about-section"] .show-more-less-html__markup') ||
                     getText('.about');

        // Extract profile photo
        const photoUrl = getAttr('img[alt*="profile photo"]', 'src') ||
                        getAttr('.profile-photo img', 'src');

        // Extract recent posts/activity
        const posts: Array<{ text: string; timestamp: string }> = [];
        const activityElements = document.querySelectorAll('[data-test="feed-item"]');
        
        activityElements.forEach((el, idx) => {
          if (idx >= 3) return; // Limit to 3 posts
          
          const postText = el.querySelector('[data-test="feed-item-content"]')?.textContent?.trim();
          const timestamp = el.querySelector('time')?.getAttribute('datetime');
          
          if (postText && timestamp) {
            posts.push({ text: postText.substring(0, 200), timestamp });
          }
        });

        return {
          headline,
          company,
          location,
          about: about?.substring(0, 500),
          photoUrl,
          posts,
        };
      });

      const profile: LinkedInProfileFull = {
        name,
        email,
        headline: profileData.headline,
        company: profileData.company,
        location: profileData.location,
        about: profileData.about,
        photoUrl: profileData.photoUrl,
        recentPosts: profileData.posts,
        profileUrl: profileLink,
        lastUpdated: Date.now(),
        isScraped: true,
      };

      // Cache it
      PROFILE_CACHE_DB.set(cacheKey, profile);
      console.log(`[LinkedIn] Successfully scraped profile for ${name}`);

      return profile;
    } finally {
      await page.close();
    }
  } catch (error) {
    console.error(`[LinkedIn] Error scraping profile for ${name}:`, error);
    return null;
  }
}

/**
 * Queue profile scraping as a background job
 * Returns immediately, scraping happens in background
 */
export async function queueProfileScrape(email: string, name: string): Promise<void> {
  // Fire and forget - scrape in background without awaiting
  scrapeLinkedInProfile(email, name).catch((err) => {
    console.error(`[LinkedIn] Background scrape failed for ${name}:`, err);
  });
}

/**
 * Batch scrape profiles for multiple attendees
 */
export async function scrapeMultipleProfiles(
  attendees: Array<{ name: string; email: string }>,
): Promise<LinkedInProfileFull[]> {
  const profiles: LinkedInProfileFull[] = [];

  for (const { name, email } of attendees) {
    try {
      const profile = await scrapeLinkedInProfile(email, name);
      if (profile) {
        profiles.push(profile);
      }
      // Add delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[LinkedIn] Error scraping ${name}:`, error);
    }
  }

  return profiles;
}

/**
 * Get cached profile or return null if not available
 */
export function getCachedProfile(email: string): LinkedInProfileFull | null {
  const cached = PROFILE_CACHE_DB.get(email.toLowerCase());
  return cached && Date.now() - cached.lastUpdated < CACHE_TTL ? cached : null;
}

/**
 * Clear cache for a specific email or all
 */
export function clearProfileCache(email?: string): void {
  if (email) {
    PROFILE_CACHE_DB.delete(email.toLowerCase());
  } else {
    PROFILE_CACHE_DB.clear();
  }
}

/**
 * Get cache stats
 */
export function getCacheStats(): {
  totalCached: number;
  lastUpdated: number | null;
} {
  const entries = Array.from(PROFILE_CACHE_DB.values());
  return {
    totalCached: entries.length,
    lastUpdated: entries.length > 0 ? Math.max(...entries.map((p) => p.lastUpdated)) : null,
  };
}
