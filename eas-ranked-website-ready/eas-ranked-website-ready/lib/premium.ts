import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

export interface Subscription {
  id: string;
  user_id: string;
  lemonsqueezy_customer_id: string | null;
  lemonsqueezy_subscription_id: string | null;
  subscription_status: "active" | "canceled" | "past_due" | "expired" | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// DB initialisation — create tables if they don't exist
// ---------------------------------------------------------------------------

export async function ensurePremiumTables(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id BIGINT NOT NULL UNIQUE,
        lemonsqueezy_customer_id VARCHAR(255),
        lemonsqueezy_subscription_id VARCHAR(255),
        subscription_status VARCHAR(50),
        current_period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
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
 *  2. Bot-synced Discord Premium User role (players.data->>'premium' = 'true') — checked first
 *  3. Active giveaway/manual grant (premium_expires_at > now)
 *  4. Active subscription (Lemonsqueezy or discord_role sentinel in subscriptions table)
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

    // Primary check: bot-synced Discord role flag stored directly in players.data
    // This is the fastest path and does not depend on login — visible to everyone.
    const playerResult = await pool.query(
      `SELECT
         (data->>'premium')::boolean AS discord_premium,
         premium_expires_at
       FROM players
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (playerResult.rows.length > 0) {
      const row = playerResult.rows[0];
      // Discord role sync flag
      if (row.discord_premium === true) {
        console.log(`[premium] isPremiumUser(${userId}): granted via discord_role flag`);
        setCachedBool(premiumCache, userId, true);
        return true;
      }
      // Manual grant / giveaway code (premium_expires_at)
      if (row.premium_expires_at && new Date(row.premium_expires_at) > new Date()) {
        console.log(`[premium] isPremiumUser(${userId}): granted via premium_expires_at`);
        setCachedBool(premiumCache, userId, true);
        return true;
      }
    }

    // Fallback: check subscriptions table (Lemonsqueezy or legacy discord_role sentinel)
    const subResult = await pool.query(
      `SELECT subscription_status FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (subResult.rows.length > 0 && subResult.rows[0].subscription_status === "active") {
      console.log(`[premium] isPremiumUser(${userId}): granted via subscriptions table`);
      setCachedBool(premiumCache, userId, true);
      return true;
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
 * Returns the premium expiry date for a user, or null if they have no
 * time-limited premium (e.g. they have a subscription or permanent access).
 *
 * Returns:
 *  - `{ premium: true,  expiresAt: Date | null, source: string }` when active
 *  - `{ premium: false, expiresAt: null,        source: null   }` when not active
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

    // Primary check: bot-synced Discord role flag in players.data
    const playerResult = await pool.query(
      `SELECT
         (data->>'premium')::boolean AS discord_premium,
         (data->>'premium_role_synced')::boolean AS role_synced,
         data->>'premium_granted_at' AS granted_at,
         premium_expires_at
       FROM players
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (playerResult.rows.length > 0) {
      const row = playerResult.rows[0];
      // Discord role sync — no expiry, active as long as role is held
      if (row.discord_premium === true) {
        return {
          premium: true,
          expiresAt: null,
          source: "discord_role",
        };
      }
      // Manual grant / giveaway code (premium_expires_at)
      if (row.premium_expires_at && new Date(row.premium_expires_at) > new Date()) {
        return {
          premium: true,
          expiresAt: new Date(row.premium_expires_at),
          source: "giveaway_code",
        };
      }
    }

    // Fallback: check subscriptions table (Lemonsqueezy or legacy discord_role sentinel)
    const subResult = await pool.query(
      `SELECT subscription_status, current_period_end, lemonsqueezy_customer_id
       FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (subResult.rows.length > 0 && subResult.rows[0].subscription_status === "active") {
      const isDiscordRole = subResult.rows[0].lemonsqueezy_customer_id === "discord_role";
      return {
        premium: true,
        expiresAt: subResult.rows[0].current_period_end
          ? new Date(subResult.rows[0].current_period_end)
          : null,
        source: isDiscordRole ? "discord_role" : "subscription",
      };
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
// Subscription helpers
// ---------------------------------------------------------------------------

export async function getSubscription(userId: string): Promise<Subscription | null> {
  try {
    await ensurePremiumTables();
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0] ?? null;
  } catch (err) {
    console.error(`[premium] getSubscription(${userId}) failed:`, err);
    return null;
  }
}

export async function upsertSubscription(
  userId: string,
  data: Partial<Omit<Subscription, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<void> {
  try {
    await ensurePremiumTables();
    await pool.query(
      `
      INSERT INTO subscriptions (user_id, lemonsqueezy_customer_id, lemonsqueezy_subscription_id, subscription_status, current_period_end)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) DO UPDATE SET
        lemonsqueezy_customer_id     = EXCLUDED.lemonsqueezy_customer_id,
        lemonsqueezy_subscription_id = EXCLUDED.lemonsqueezy_subscription_id,
        subscription_status          = EXCLUDED.subscription_status,
        current_period_end           = EXCLUDED.current_period_end,
        updated_at                   = NOW()
      `,
      [
        userId,
        data.lemonsqueezy_customer_id ?? null,
        data.lemonsqueezy_subscription_id ?? null,
        data.subscription_status ?? null,
        data.current_period_end ?? null,
      ]
    );
  } catch (err) {
    console.error(`[premium] upsertSubscription(${userId}) failed:`, err);
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
  id: "developer" | "contentCreator" | "staff" | "tournamentWinner";
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
 * Order: developer → contentCreator → staff → tournamentWinner.
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const [developer, contentCreator, staff, tournamentWinner] = await Promise.all([
    Promise.resolve(userId === DEVELOPER_USER_ID),
    isContentCreator(userId),
    isStaffUser(userId),
    isTournamentWinner(userId),
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
 * Invalidates the in-process status cache and revalidates public pages.
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
      RETURNING user_id, data->'badges' AS badges
      `,
      [userId, JSON.stringify([badgeId])]
    );
    if (result.rowCount === 0) {
      throw new Error(`Player ${userId} not found in database`);
    }
    console.log(`[premium] assignBadgeRole: assigned '${badgeId}' to user ${userId}. Badges now: ${JSON.stringify(result.rows[0]?.badges)}`);
    // Bust the status cache so the next check reflects the new badge
    invalidatePremiumStatusCache(userId);
    // Revalidate all public pages that display badges
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/leaderboard");
    revalidatePath("/admin/badges");
    revalidatePath("/");
  } catch (err) {
    console.error(`[premium] assignBadgeRole(${userId}, ${badgeId}) failed:`, err);
    throw err;
  }
}

/**
 * Removes a badge from a user's data->'badges' array in the DB.
 * The badgeId should be one of: "staff", "contentCreator", "tournamentWinner".
 * Invalidates the in-process status cache and revalidates public pages.
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
      RETURNING user_id, data->'badges' AS badges
      `,
      [userId, badgeId]
    );
    if (result.rowCount === 0) {
      throw new Error(`Player ${userId} not found in database`);
    }
    console.log(`[premium] removeBadgeRole: removed '${badgeId}' from user ${userId}. Badges now: ${JSON.stringify(result.rows[0]?.badges)}`);
    // Bust the status cache so the next check reflects the removed badge
    invalidatePremiumStatusCache(userId);
    // Revalidate all public pages that display badges
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/leaderboard");
    revalidatePath("/admin/badges");
    revalidatePath("/");
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
 * Invalidates the in-process premium cache and revalidates public pages.
 */
export async function grantPremium(
  userId: string,
  expiresAt?: Date
): Promise<void> {
  try {
    const expiry = expiresAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const result = await pool.query(
      `UPDATE players
       SET premium_expires_at = $1,
           data = jsonb_set(
             COALESCE(data, '{}'),
             '{premium}',
             'true'::jsonb
           )
       WHERE user_id = $2`,
      [expiry.toISOString(), userId]
    );
    if (result.rowCount === 0) {
      throw new Error(`Player ${userId} not found in database`);
    }
    console.log(`[premium] grantPremium: granted premium to user ${userId}, expires ${expiry.toISOString()}`);
    invalidatePremiumStatusCache(userId);
    // Revalidate public pages so premium badge appears immediately
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/leaderboard");
    revalidatePath("/admin/premium");
    revalidatePath("/");
  } catch (err) {
    console.error(`[premium] grantPremium(${userId}) failed:`, err);
    throw err;
  }
}

/**
 * Revokes manually-granted premium from a user by clearing premium_expires_at
 * and setting data->>'premium' to false.
 * Does not affect Lemonsqueezy subscriptions.
 * Invalidates the in-process premium cache and revalidates public pages.
 */
export async function revokePremium(userId: string): Promise<void> {
  try {
    const result = await pool.query(
      `UPDATE players
       SET premium_expires_at = NULL,
           data = jsonb_set(
             COALESCE(data, '{}'),
             '{premium}',
             'false'::jsonb
           )
       WHERE user_id = $1`,
      [userId]
    );
    if (result.rowCount === 0) {
      throw new Error(`Player ${userId} not found in database`);
    }
    console.log(`[premium] revokePremium: revoked premium from user ${userId}`);
    invalidatePremiumStatusCache(userId);
    // Revalidate public pages so premium badge disappears immediately
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/leaderboard");
    revalidatePath("/admin/premium");
    revalidatePath("/");
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


