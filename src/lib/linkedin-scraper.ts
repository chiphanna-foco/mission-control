/**
 * LinkedIn Profile Scraper & Cache
 * Uses inferred data from email domains + search URLs
 * Can be extended with actual scraping via browser automation
 */

export interface LinkedInProfile {
  name: string;
  email: string;
  headline?: string;
  company?: string;
  location?: string;
  profileUrl: string;
  lastUpdated: number;
  isInferred: boolean; // true if based on email domain, false if scraped
}

// In-memory cache (persists during server lifetime)
const LINKEDIN_CACHE: Map<string, LinkedInProfile> = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Infer company and profile from email domain
 */
function inferCompanyFromEmail(email: string, name: string): { company?: string; headline?: string } {
  const domain = email.split('@')[1];
  
  const companyMap: Record<string, { company: string; headline?: string }> = {
    'turbotenant.com': { company: 'TurboTenant' },
    'chip.hanna.com': { company: 'Personal' },
  };

  return companyMap[domain] || { company: domain.split('.')[0] };
}

/**
 * Generate LinkedIn search URL for a person
 */
export function getLinkedInSearchUrl(name: string, email?: string): string {
  const query = email ? `${name} ${email.split('@')[1]}` : name;
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
}

/**
 * Fetch or infer LinkedIn profile for a person
 * Returns cached data if available, otherwise infers from email
 */
export async function fetchLinkedInProfile(
  name: string,
  email: string,
): Promise<LinkedInProfile> {
  const cacheKey = email.toLowerCase();
  
  // Check cache first
  const cached = LINKEDIN_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.lastUpdated < CACHE_TTL) {
    return cached;
  }

  // Infer company from email
  const { company, headline } = inferCompanyFromEmail(email, name);

  const profile: LinkedInProfile = {
    name,
    email,
    company,
    headline,
    profileUrl: getLinkedInSearchUrl(name, email),
    lastUpdated: Date.now(),
    isInferred: true, // Marked as inferred until we do actual scraping
  };

  // Cache it
  LINKEDIN_CACHE.set(cacheKey, profile);
  
  return profile;
}

/**
 * Batch fetch profiles for multiple attendees
 */
export async function fetchLinkedInProfiles(
  attendees: Array<{ name: string; email: string }>,
): Promise<LinkedInProfile[]> {
  return Promise.all(
    attendees.map(att => fetchLinkedInProfile(att.name, att.email))
  );
}

/**
 * Clear cache for a specific email or all
 */
export function clearLinkedInCache(email?: string): void {
  if (email) {
    LINKEDIN_CACHE.delete(email.toLowerCase());
  } else {
    LINKEDIN_CACHE.clear();
  }
}
