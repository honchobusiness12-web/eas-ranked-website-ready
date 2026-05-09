import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// In-memory cache for premium / badge status (5-minute TTL)
// ---------------------------------------------------------------------------

const STATUS_CACHE_TTL_MS = 5 * 60 * 1000;

interface StatusCacheEntry<T> {
  value: T;
  expiresAt: number;
}

const premiumCache = new Map<string, StatusCacheEntry<boolean>>();
const staffCache   = new Map<string, StatusCacheEntry<boolean>>();
const ccCache      = new Map<string, StatusCacheEntry<boolean>>();

function getCachedBool(map: Map<string, StatusCacheEntry<boolean>>, key: string): boolean | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { map.delete(key); return null; }
  return entry.value;
}

function setCachedBool(map: Map<string, StatusCacheEntry<boolean>>, key: string, value: boolean): void {
  map.set(key, { value, expiresAt: Date.now() + STATUS_CACHE_TTL_MS });
}

/** Invalidate all status caches for a user (call after badge/subscription changes). */
export function invalidatePremiumStatusCache(userId: string): void {
  premiumCache.delete(userId);
  staffCache.delete(userId);
  ccCache.delete(userId);
}

// ---------------------------------------------------------------------------
// Premium Role ID (Discord)
// ---------------------------------------------------------------------------
export const PREMIUM_ROLE_ID = "1502426990995836928";

// ---------------------------------------------------------------------------
// Hardcoded badge holders — no premium required, assigned in code
// ---------------------------------------------------------------------------

/** Users who always have the Content Creator badge, regardless of DB roles. */
export const HARDCODED_CONTENT_CREATORS: string[] = [
  // Add content creator Discord user IDs here, e.g.:
  // "123456789012345678",
];

/** Users who always have the Staff badge, regardless of DB roles. */
export const HARDCODED_STAFF: string[] = [
  // Add staff Discord user IDs here, e.g.:
  // "987654321098765432",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Subscription type removed — premium is now granted via Discord role (Buy Me a Coffee/Stripe)
// or manual grant (premium_expires_at). No subscription table is used.

export interface Cosmetics {
  id: string;
  user_id: string;
  theme: string | null;
  profile_banner: string | null;
  rank_badge_style: string | null;
  player_title: string | null;
  profile_color: string | null;
  achievement_frame: string | null;
  gradient_preset: string | null;
  banner_color: string | null;
  banner_pattern: string | null;
  profile_effect: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// DB initialisation — create tables if they don't exist
// ---------------------------------------------------------------------------

export async function ensurePremiumTables(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cosmetics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id BIGINT NOT NULL UNIQUE,
        theme VARCHAR(50) DEFAULT 'dark',
        profile_banner VARCHAR(255),
        rank_badge_style VARCHAR(50) DEFAULT 'default',
        player_title VARCHAR(100),
        profile_color VARCHAR(50) DEFAULT '#FF6B6B',
        achievement_frame VARCHAR(50) DEFAULT 'default',
        gradient_preset VARCHAR(50) DEFAULT 'none',
        banner_color VARCHAR(50) DEFAULT 'default',
        banner_pattern VARCHAR(50) DEFAULT 'none',
        profile_effect VARCHAR(50) DEFAULT 'none',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add new columns to existing tables if they don't exist (migration)
    await pool.query(`
      ALTER TABLE cosmetics
        ADD COLUMN IF NOT EXISTS gradient_preset VARCHAR(50) DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS banner_color VARCHAR(50) DEFAULT 'default',
        ADD COLUMN IF NOT EXISTS banner_pattern VARCHAR(50) DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS profile_effect VARCHAR(50) DEFAULT 'none'
    `).catch(() => {}); // Ignore if table doesn't exist yet
  } catch (err) {
    console.error("[premium] ensurePremiumTables failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Check premium status
// ---------------------------------------------------------------------------

/**
 * Returns true if the user has premium access from ANY source:
 *  1. Developer user ID (permanent)
 *  2. Discord Premium User role synced by Buy Me a Coffee bot (data->>'premium' = true)
 *  3. Manual grant / giveaway code (premium_expires_at > NOW())
 *
 * Results are cached in-process for 5 minutes.
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  // Developer gets permanent premium access
  if (userId === DEVELOPER_USER_ID) {
    return true;
  }

  // Check cache
  const cached = getCachedBool(premiumCache, userId);
  if (cached !== null) return cached;

  try {
    await ensurePremiumTables();

    // Check both sources in a single round-trip:
    //  1. Discord Premium User role (set by Buy Me a Coffee bot via data->>'premium')
    //  2. Manual grant / giveaway code (premium_expires_at > NOW())
    const result = await pool.query(
      `
      SELECT
        (data->>'premium')::boolean AS discord_premium,
        (premium_expires_at IS NOT NULL AND premium_expires_at > NOW()) AS manual_premium
      FROM players
      WHERE user_id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length > 0) {
      const { discord_premium, manual_premium } = result.rows[0];
      if (discord_premium === true || manual_premium === true) {
        setCachedBool(premiumCache, userId, true);
        return true;
      }
    }

    setCachedBool(premiumCache, userId, false);
    return false;
  } catch (err) {
    console.error(`[premium] isPremiumUser(${userId}) failed:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Premium status helpers — convenience wrappers used by API routes
// ---------------------------------------------------------------------------

/**
 * Returns the premium status for a user, including the source and expiry.
 *
 * Returns:
 *  - `{ premium: true,  expiresAt: Date | null, source: string }` when active
 *  - `{ premium: false, expiresAt: null,        source: null   }` when not active
 *
 * Sources (priority order):
 *  1. developer       — hardcoded developer ID
 *  2. discord_role    — Buy Me a Coffee bot set data->>'premium' = true
 *  3. giveaway_code   — premium_expires_at > NOW() (manual grant or giveaway)
 */
export async function getPremiumStatus(userId: string): Promise<{
  premium: boolean;
  expiresAt: Date | null;
  source: string | null;
}> {
  // Developer — permanent
  if (userId === DEVELOPER_USER_ID) {
    return { premium: true, expiresAt: null, source: "developer" };
  }

  try {
    await ensurePremiumTables();

    // Single query: check Discord role flag and manual grant together
    const result = await pool.query(
      `
      SELECT
        (data->>'premium')::boolean AS discord_premium,
        premium_expires_at
      FROM players
      WHERE user_id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length > 0) {
      const { discord_premium, premium_expires_at } = result.rows[0];

      // Discord Premium User role (set by Buy Me a Coffee bot) — no expiry
      if (discord_premium === true) {
        return { premium: true, expiresAt: null, source: "discord_role" };
      }

      // Manual grant / giveaway code
      if (premium_expires_at && new Date(premium_expires_at) > new Date()) {
        return {
          premium: true,
          expiresAt: new Date(premium_expires_at),
          source: "giveaway_code",
        };
      }
    }

    return { premium: false, expiresAt: null, source: null };
  } catch (err) {
    console.error(`[premium] getPremiumStatus(${userId}) failed:`, err);
    return { premium: false, expiresAt: null, source: null };
  }
}

/**
 * Throws an error (suitable for use in API routes) if the user does not have
 * premium access. Returns void on success.
 *
 * Usage:
 *   await requirePremium(userId);  // throws if not premium
 */
export async function requirePremium(userId: string): Promise<void> {
  const premium = await isPremiumUser(userId);
  if (!premium) {
    throw new Error("Premium subscription required");
  }
}

// ---------------------------------------------------------------------------
// Cosmetics helpers
// ---------------------------------------------------------------------------

export async function getCosmetics(userId: string): Promise<Cosmetics | null> {
  try {
    await ensurePremiumTables();
    const result = await pool.query(
      `SELECT * FROM cosmetics WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0] ?? null;
  } catch (err) {
    console.error(`[premium] getCosmetics(${userId}) failed:`, err);
    return null;
  }
}

export async function upsertCosmetics(
  userId: string,
  data: Partial<Omit<Cosmetics, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<void> {
  try {
    await ensurePremiumTables();
    await pool.query(
      `
      INSERT INTO cosmetics (user_id, theme, profile_banner, rank_badge_style, player_title, profile_color, achievement_frame, gradient_preset, banner_color, banner_pattern, profile_effect)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id) DO UPDATE SET
        theme              = EXCLUDED.theme,
        profile_banner     = EXCLUDED.profile_banner,
        rank_badge_style   = EXCLUDED.rank_badge_style,
        player_title       = EXCLUDED.player_title,
        profile_color      = EXCLUDED.profile_color,
        achievement_frame  = EXCLUDED.achievement_frame,
        gradient_preset    = EXCLUDED.gradient_preset,
        banner_color       = EXCLUDED.banner_color,
        banner_pattern     = EXCLUDED.banner_pattern,
        profile_effect     = EXCLUDED.profile_effect,
        updated_at         = NOW()
      `,
      [
        userId,
        data.theme ?? "dark",
        data.profile_banner ?? null,
        data.rank_badge_style ?? "default",
        data.player_title ?? null,
        data.profile_color ?? "#FF6B6B",
        data.achievement_frame ?? "default",
        data.gradient_preset ?? "none",
        data.banner_color ?? "default",
        data.banner_pattern ?? "none",
        data.profile_effect ?? "none",
      ]
    );
  } catch (err) {
    console.error(`[premium] upsertCosmetics(${userId}) failed:`, err);
  }
}

// ---------------------------------------------------------------------------
// Developer / Staff / Badge helpers
// ---------------------------------------------------------------------------

/** The one and only developer user ID. */
export const DEVELOPER_USER_ID = "733871667788644445";

/** Returns true if the given user ID is the developer. */
export function isDeveloper(userId: string): boolean {
  return userId === DEVELOPER_USER_ID;
}

/**
 * Discord role IDs that grant the Staff badge.
 * Add any additional staff / moderator role IDs here.
 */
export const STAFF_ROLE_IDS = [
  "1234567890000000001", // Staff role
  "1234567890000000002", // Moderator role
];

/**
 * Discord role IDs that grant the Content Creator badge.
 */
export const CONTENT_CREATOR_ROLE_IDS = [
  "1234567890000000003", // Content Creator role
  "1234567890000000004", // Verified Creator role
];

/**
 * Discord role IDs that grant the Tournament Winner badge.
 */
export const TOURNAMENT_WINNER_ROLE_IDS = [
  "1234567890000000005", // Tournament Winner role
];

export interface UserBadge {
  id: "developer" | "contentCreator" | "staff" | "premium" | "tournamentWinner";
  label: string;
  icon: string;
  color: string;
  description: string;
}

/**
 * Returns true if the user holds the staff badge in the DB player record
 * (stored in data->'badges' as a JSON array of badge ID strings),
 * OR is in the HARDCODED_STAFF list, OR has a matching Discord staff role.
 *
 * Results are cached in-process for 5 minutes.
 */
export async function isStaffUser(userId: string): Promise<boolean> {
  // Developer is implicitly staff
  if (userId === DEVELOPER_USER_ID) return true;

  // Hardcoded staff list — no DB lookup needed
  if (HARDCODED_STAFF.includes(userId)) return true;

  // Check cache
  const cached = getCachedBool(staffCache, userId);
  if (cached !== null) return cached;

  try {
    const { pool } = await import("@/lib/db");
    const result = await pool.query(
      `SELECT data->'badges' AS badges, data->'roles' AS roles FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) {
      setCachedBool(staffCache, userId, false);
      return false;
    }
    // Check dedicated badges array first (set by admin badge manager)
    const badges: string[] = result.rows[0].badges ?? [];
    if (badges.includes("staff")) {
      setCachedBool(staffCache, userId, true);
      return true;
    }
    // Fall back to Discord role IDs in the roles array (set by bot sync)
    const roles: string[] = result.rows[0].roles ?? [];
    const isStaff = STAFF_ROLE_IDS.some((id) => roles.includes(id));
    setCachedBool(staffCache, userId, isStaff);
    return isStaff;
  } catch (err) {
    console.error(`[premium] isStaffUser(${userId}) failed:`, err);
    return false;
  }
}

/**
 * Returns true if the user holds the contentCreator badge in the DB player record
 * (stored in data->'badges' as a JSON array of badge ID strings),
 * OR is in the HARDCODED_CONTENT_CREATORS list, OR has a matching Discord role.
 *
 * Results are cached in-process for 5 minutes.
 */
export async function isContentCreator(userId: string): Promise<boolean> {
  // Hardcoded content creator list — no DB lookup needed
  if (HARDCODED_CONTENT_CREATORS.includes(userId)) return true;

  // Check cache
  const cached = getCachedBool(ccCache, userId);
  if (cached !== null) return cached;

  try {
    const { pool } = await import("@/lib/db");
    const result = await pool.query(
      `SELECT data->'badges' AS badges, data->'roles' AS roles FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) {
      setCachedBool(ccCache, userId, false);
      return false;
    }
    // Check dedicated badges array first (set by admin badge manager)
    const badges: string[] = result.rows[0].badges ?? [];
    if (badges.includes("contentCreator")) {
      setCachedBool(ccCache, userId, true);
      return true;
    }
    // Fall back to Discord role IDs in the roles array (set by bot sync)
    const roles: string[] = result.rows[0].roles ?? [];
    const isCC = CONTENT_CREATOR_ROLE_IDS.some((id) => roles.includes(id));
    setCachedBool(ccCache, userId, isCC);
    return isCC;
  } catch (err) {
    console.error(`[premium] isContentCreator(${userId}) failed:`, err);
    return false;
  }
}

/**
 * Returns true if the user holds the tournamentWinner badge in the DB player record
 * (stored in data->'badges' as a JSON array of badge ID strings),
 * OR has a matching Discord tournament-winner role.
 */
export async function isTournamentWinner(userId: string): Promise<boolean> {
  try {
    const { pool } = await import("@/lib/db");
    const result = await pool.query(
      `SELECT data->'badges' AS badges, data->'roles' AS roles FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return false;
    // Check dedicated badges array first (set by admin badge manager)
    const badges: string[] = result.rows[0].badges ?? [];
    if (badges.includes("tournamentWinner")) return true;
    // Fall back to Discord role IDs in the roles array (set by bot sync)
    const roles: string[] = result.rows[0].roles ?? [];
    return TOURNAMENT_WINNER_ROLE_IDS.some((id) => roles.includes(id));
  } catch (err) {
    console.error(`[premium] isTournamentWinner(${userId}) failed:`, err);
    return false;
  }
}

/**
 * Returns the full list of badges a user has earned.
 * Order: developer → contentCreator → staff → tournamentWinner → premium.
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const [developer, contentCreator, staff, tournamentWinner, premium] = await Promise.all([
    Promise.resolve(userId === DEVELOPER_USER_ID),
    isContentCreator(userId),
    isStaffUser(userId),
    isTournamentWinner(userId),
    isPremiumUser(userId),
  ]);

  const badges: UserBadge[] = [];

  if (developer) {
    badges.push({
      id: "developer",
      label: "Developer",
      icon: "👑",
      color: "#FFD700",
      description: "EAS Ranked Developer",
    });
  }

  if (contentCreator) {
    badges.push({
      id: "contentCreator",
      label: "Content Creator",
      icon: "🎬",
      color: "#00D4FF",
      description: "Verified Content Creator",
    });
  }

  // Staff badge shown for non-developer staff members only (developer already has a badge)
  if (staff && !developer) {
    badges.push({
      id: "staff",
      label: "Staff",
      icon: "👮",
      color: "#00FF88",
      description: "EAS Ranked Staff Member",
    });
  }

  if (tournamentWinner) {
    badges.push({
      id: "tournamentWinner",
      label: "Tournament Winner",
      icon: "🏆",
      color: "#FFD700",
      description: "Tournament Champion",
    });
  }

  if (premium) {
    badges.push({
      id: "premium",
      label: "Premium",
      icon: "💎",
      color: "#FF9F43",
      description: "Premium Subscriber",
    });
  }

  return badges;
}

// ---------------------------------------------------------------------------
// Badge assignment helpers (admin use)
// ---------------------------------------------------------------------------

/**
 * Assigns a badge to a user by adding the badge ID to data->'badges' in the DB.
 * The badgeId should be one of: "staff", "contentCreator", "tournamentWinner".
 * This is independent of Discord role IDs — the website checks data->'badges'
 * directly, so changes are visible immediately without a Discord sync.
 * Invalidates the in-process status cache for the user.
 */
export async function assignBadgeRole(userId: string, badgeId: string): Promise<void> {
  try {
    const { pool } = await import("@/lib/db");
    const result = await pool.query(
      `
      UPDATE players
      SET data = jsonb_set(
        COALESCE(data, '{}'),
        '{badges}',
        (
          SELECT jsonb_agg(DISTINCT b)
          FROM jsonb_array_elements_text(
            COALESCE(data->'badges', '[]'::jsonb) || $2::jsonb
          ) AS b
        )
      )
      WHERE user_id = $1
      `,
      [userId, JSON.stringify([badgeId])]
    );
    if (result.rowCount === 0) {
      throw new Error(`Player ${userId} not found in database`);
    }
    // Bust the status cache so the next check reflects the new badge
    invalidatePremiumStatusCache(userId);
  } catch (err) {
    console.error(`[premium] assignBadgeRole(${userId}, ${badgeId}) failed:`, err);
    throw err;
  }
}

/**
 * Removes a badge from a user's data->'badges' array in the DB.
 * The badgeId should be one of: "staff", "contentCreator", "tournamentWinner".
 * Invalidates the in-process status cache for the user.
 */
export async function removeBadgeRole(userId: string, badgeId: string): Promise<void> {
  try {
    const { pool } = await import("@/lib/db");
    const result = await pool.query(
      `
      UPDATE players
      SET data = jsonb_set(
        COALESCE(data, '{}'),
        '{badges}',
        (
          SELECT COALESCE(jsonb_agg(b), '[]'::jsonb)
          FROM jsonb_array_elements_text(COALESCE(data->'badges', '[]'::jsonb)) AS b
          WHERE b != $2
        )
      )
      WHERE user_id = $1
      `,
      [userId, badgeId]
    );
    if (result.rowCount === 0) {
      throw new Error(`Player ${userId} not found in database`);
    }
    // Bust the status cache so the next check reflects the removed badge
    invalidatePremiumStatusCache(userId);
  } catch (err) {
    console.error(`[premium] removeBadgeRole(${userId}, ${badgeId}) failed:`, err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Manual premium grant / revoke (admin use)
// ---------------------------------------------------------------------------

/**
 * Manually grants premium to a user by setting premium_expires_at.
 * Defaults to 1 year from now if no expiry is provided.
 * Invalidates the in-process premium cache for the user.
 */
export async function grantPremium(
  userId: string,
  expiresAt?: Date
): Promise<void> {
  try {
    const expiry = expiresAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const result = await pool.query(
      `UPDATE players SET premium_expires_at = $1 WHERE user_id = $2`,
      [expiry.toISOString(), userId]
    );
    if (result.rowCount === 0) {
      throw new Error(`Player ${userId} not found in database`);
    }
    invalidatePremiumStatusCache(userId);
  } catch (err) {
    console.error(`[premium] grantPremium(${userId}) failed:`, err);
    throw err;
  }
}

/**
 * Revokes manually-granted premium from a user by clearing premium_expires_at.
 * Does not affect Discord role premium (managed by the Buy Me a Coffee bot).
 * Invalidates the in-process premium cache for the user.
 */
export async function revokePremium(userId: string): Promise<void> {
  try {
    const result = await pool.query(
      `UPDATE players SET premium_expires_at = NULL WHERE user_id = $1`,
      [userId]
    );
    if (result.rowCount === 0) {
      throw new Error(`Player ${userId} not found in database`);
    }
    invalidatePremiumStatusCache(userId);
  } catch (err) {
    console.error(`[premium] revokePremium(${userId}) failed:`, err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Scrim hosting — waitlist bypass logic
// ---------------------------------------------------------------------------

/**
 * Determines whether a user is allowed to host a scrim.
 *
 * Rules:
 *  - Premium subscribers: always allowed (no limits).
 *  - Waitlist members:    allowed (bypass normal scrim limits as a perk).
 *  - Everyone else:       subject to normal limits (caller enforces these).
 *
 * Returns `{ allowed: boolean; reason: string }` so callers can surface a
 * meaningful message when access is denied.
 */
export async function canHostScrim(
  userId: string,
  isOnWaitlist: boolean
): Promise<{ allowed: boolean; reason: string }> {
  // Premium users have no restrictions
  const premium = await isPremiumUser(userId);
  if (premium) {
    return { allowed: true, reason: "premium" };
  }

  // Waitlist members bypass the normal scrim limit as an early-access perk
  if (isOnWaitlist) {
    return { allowed: true, reason: "waitlist" };
  }

  // Regular users are subject to normal limits — the caller decides the cap
  return { allowed: false, reason: "limit_reached" };
}

// ---------------------------------------------------------------------------
// Available cosmetic options — re-exported from premium-constants so that
// server-side callers can continue importing from this module unchanged.
// ---------------------------------------------------------------------------

export {
  THEMES,
  RANK_BADGE_STYLES,
  PLAYER_TITLES,
  PROFILE_COLORS,
  ACHIEVEMENT_FRAMES,
  GRADIENT_PRESETS,
  BANNER_COLORS,
  BANNER_PATTERNS,
  PROFILE_EFFECTS,
  buildGradientCSS,
} from "@/lib/premium-constants";
