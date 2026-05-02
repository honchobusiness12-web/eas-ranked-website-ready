import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedPlayer {
  guild_id: string;
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  placement_matches: number;
  ranked: boolean;
  registered: boolean;
  blacklisted: boolean;
  history?: string[];
  notes?: string[];
}

// ---------------------------------------------------------------------------
// Module-level singleton cache (survives across requests in the same process)
// ---------------------------------------------------------------------------

declare global {
  var __easPlayerCache:
    | {
        players: Map<string, CachedPlayer>;
        lastUpdated: Date | null;
        validationTimer: ReturnType<typeof setInterval> | null;
      }
    | undefined;
}

function getStore() {
  if (!global.__easPlayerCache) {
    global.__easPlayerCache = {
      players: new Map(),
      lastUpdated: null,
      validationTimer: null,
    };
  }
  return global.__easPlayerCache;
}

// ---------------------------------------------------------------------------
// DB query helpers (reuse the same SQL shape as the existing API routes)
// ---------------------------------------------------------------------------

const LEADERBOARD_SQL = `
  SELECT
    guild_id,
    user_id,
    COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
    data->>'username'   AS username,
    data->>'avatar_url' AS avatar_url,
    COALESCE((data->>'cr')::int,                0) AS cr,
    COALESCE((data->>'wins')::int,              0) AS wins,
    COALESCE((data->>'losses')::int,            0) AS losses,
    COALESCE((data->>'kills')::int,             0) AS kills,
    COALESCE((data->>'matches')::int,           0) AS matches,
    COALESCE((data->>'mvp_count')::int,         0) AS mvp_count,
    COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
    COALESCE((data->>'ranked')::boolean,      false) AS ranked,
    COALESCE((data->>'registered')::boolean,  false) AS registered,
    COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted
  FROM players
  WHERE COALESCE((data->>'blacklisted')::boolean, false) = false
  ORDER BY cr DESC
  LIMIT 250
`;

const SINGLE_PLAYER_SQL = `
  SELECT
    guild_id,
    user_id,
    COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
    data->>'username'   AS username,
    data->>'avatar_url' AS avatar_url,
    COALESCE((data->>'cr')::int,                0) AS cr,
    COALESCE((data->>'wins')::int,              0) AS wins,
    COALESCE((data->>'losses')::int,            0) AS losses,
    COALESCE((data->>'kills')::int,             0) AS kills,
    COALESCE((data->>'matches')::int,           0) AS matches,
    COALESCE((data->>'mvp_count')::int,         0) AS mvp_count,
    COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
    COALESCE((data->>'ranked')::boolean,      false) AS ranked,
    COALESCE((data->>'registered')::boolean,  false) AS registered,
    COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted,
    COALESCE(data->'history', '[]'::jsonb) AS history,
    COALESCE(data->'notes',   '[]'::jsonb) AS notes
  FROM players
  WHERE user_id = $1
  LIMIT 1
`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return all cached players sorted by CR descending. */
export function getPlayersFromCache(): CachedPlayer[] {
  const store = getStore();
  return Array.from(store.players.values()).sort((a, b) => b.cr - a.cr);
}

/** Return a single cached player by user_id, or undefined. */
export function getPlayerFromCache(userId: string): CachedPlayer | undefined {
  return getStore().players.get(userId);
}

/** Timestamp of the last successful cache population. */
export function getCacheLastUpdated(): Date | null {
  return getStore().lastUpdated;
}

/** How many seconds ago the cache was last populated (null if never). */
export function secondsSinceUpdate(): number | null {
  const ts = getStore().lastUpdated;
  if (!ts) return null;
  return Math.floor((Date.now() - ts.getTime()) / 1000);
}

/**
 * Upsert a single player into the in-memory cache.
 * Called by the webhook handler after receiving a bot update.
 */
export function updatePlayerInCache(userId: string, data: CachedPlayer): void {
  const store = getStore();
  store.players.set(userId, data);
  store.lastUpdated = new Date();
}

/**
 * Full resync: fetch all players from PostgreSQL and rebuild the cache.
 * Called on first access and whenever corruption is detected.
 */
export async function syncPlayersFromDB(): Promise<void> {
  try {
    const result = await pool.query(LEADERBOARD_SQL);
    const store = getStore();
    store.players.clear();
    for (const row of result.rows) {
      store.players.set(row.user_id, row as CachedPlayer);
    }
    store.lastUpdated = new Date();
    console.log(`[cache] Synced ${store.players.size} players from DB`);
  } catch (err) {
    console.error("[cache] syncPlayersFromDB failed:", err);
  }
}

/**
 * Fetch a single player from PostgreSQL (used for per-player validation
 * and as the profile-page DB fallback).
 */
export async function getPlayerFromDB(
  userId: string
): Promise<CachedPlayer | null> {
  try {
    const result = await pool.query(SINGLE_PLAYER_SQL, [userId]);
    return result.rows[0] ?? null;
  } catch (err) {
    console.error(`[cache] getPlayerFromDB(${userId}) failed:`, err);
    return null;
  }
}

/**
 * Spot-check up to 10 random cached players against PostgreSQL.
 * If any mismatch is found the entire cache is resynced.
 */
export async function validateCache(): Promise<void> {
  const store = getStore();
  if (store.players.size === 0) {
    // Cache is empty — populate it now.
    await syncPlayersFromDB();
    return;
  }

  const sample = Array.from(store.players.values()).slice(0, 10);

  for (const cached of sample) {
    try {
      const result = await pool.query(SINGLE_PLAYER_SQL, [cached.user_id]);
      if (result.rows.length === 0) {
        // Player was removed from DB — resync.
        console.warn(
          `[cache] Corruption detected: ${cached.user_id} missing from DB. Resyncing.`
        );
        await syncPlayersFromDB();
        return;
      }
      const db = result.rows[0];
      if (Number(db.cr) !== Number(cached.cr)) {
        console.warn(
          `[cache] Corruption detected: CR mismatch for ${cached.user_id} ` +
            `(cache=${cached.cr}, db=${db.cr}). Resyncing.`
        );
        await syncPlayersFromDB();
        return;
      }
    } catch (err) {
      console.error("[cache] validateCache query failed:", err);
      // Don't resync on transient DB errors — try again next cycle.
      return;
    }
  }

  console.log("[cache] Validation passed — cache is consistent with DB");
}

// ---------------------------------------------------------------------------
// Auto-validation timer (30-second interval)
// Starts once and persists for the lifetime of the Node.js process.
// ---------------------------------------------------------------------------

function ensureValidationTimer(): void {
  const store = getStore();
  if (store.validationTimer !== null) return;

  store.validationTimer = setInterval(async () => {
    console.log("[cache] Running scheduled validation…");
    await validateCache();
  }, 30_000);

  // Don't block process exit.
  if (store.validationTimer.unref) {
    store.validationTimer.unref();
  }
}

// Kick off the timer as soon as this module is imported.
ensureValidationTimer();
