// ---------------------------------------------------------------------------
// Premium Sync — client-side utility for real-time premium detection
// ---------------------------------------------------------------------------
// Checks premium status on demand, caches the result for 5 minutes per user
// to avoid hammering the API on every render, and returns the latest status
// along with the user's active cosmetics.
// ---------------------------------------------------------------------------

export interface PremiumSyncResult {
  premium: boolean;
  cosmetics: {
    theme: string | null;
    rank_badge_style: string | null;
    player_title: string | null;
    profile_color: string | null;
    achievement_frame: string | null;
  } | null;
  /** ISO timestamp of when this result was fetched */
  fetchedAt: string;
  /** True when the result was served from the in-memory cache */
  cached: boolean;
}

// ---------------------------------------------------------------------------
// In-memory cache (per browser session)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  result: PremiumSyncResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches the latest premium status and cosmetics for `userId`.
 *
 * Results are cached in memory for 5 minutes. Pass `force = true` to bypass
 * the cache and always hit the API (e.g. after a subscription change).
 */
export async function syncPremiumStatus(
  userId: string,
  force = false
): Promise<PremiumSyncResult> {
  if (!userId) {
    return { premium: false, cosmetics: null, fetchedAt: new Date().toISOString(), cached: false };
  }

  // Return cached result if still valid
  if (!force) {
    const cached = cache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      return { ...cached.result, cached: true };
    }
  }

  try {
    const [statusRes, cosRes] = await Promise.all([
      fetch(`/api/premium/status?userId=${encodeURIComponent(userId)}`),
      fetch(`/api/premium/cosmetics?userId=${encodeURIComponent(userId)}`),
    ]);

    const statusData = await statusRes.json();
    const cosData = await cosRes.json();

    const result: PremiumSyncResult = {
      premium: statusData.premium ?? false,
      cosmetics: cosData.cosmetics ?? null,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };

    // Store in cache
    cache.set(userId, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  } catch (err) {
    console.error(`[premium-sync] syncPremiumStatus(${userId}) failed:`, err);
    return { premium: false, cosmetics: null, fetchedAt: new Date().toISOString(), cached: false };
  }
}

/**
 * Invalidates the cached premium status for `userId`, forcing the next call
 * to `syncPremiumStatus` to fetch fresh data from the API.
 */
export function invalidatePremiumCache(userId: string): void {
  cache.delete(userId);
}

/**
 * Clears the entire premium status cache. Useful after a webhook fires or
 * when the user logs out.
 */
export function clearPremiumCache(): void {
  cache.clear();
}
