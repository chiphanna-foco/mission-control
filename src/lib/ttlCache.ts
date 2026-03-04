type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const globalCache = globalThis as unknown as {
  __missionControlCache?: Map<string, CacheEntry<unknown>>;
};

const cache = globalCache.__missionControlCache ?? new Map<string, CacheEntry<unknown>>();

if (!globalCache.__missionControlCache) {
  globalCache.__missionControlCache = cache;
}

export async function getOrSetCache<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
  forceRefresh = false,
): Promise<{ value: T; cached: boolean; expiresAt: string }> {
  const now = Date.now();

  if (!forceRefresh) {
    const existing = cache.get(key) as CacheEntry<T> | undefined;
    if (existing && existing.expiresAt > now) {
      return {
        value: existing.value,
        cached: true,
        expiresAt: new Date(existing.expiresAt).toISOString(),
      };
    }
  }

  const value = await producer();
  const expiresAt = now + ttlMs;
  cache.set(key, { value, expiresAt });

  return {
    value,
    cached: false,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}
