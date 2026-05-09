import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Premium Role ID (Discord)
// ---------------------------------------------------------------------------
export const PREMIUM_ROLE_ID = "1502426990995836928";

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

export interface Cosmetics {
  id: string;
  user_id: string;
  theme: string | null;
  profile_banner: string | null;
  rank_badge_style: string | null;
  player_title: string | null;
  profile_color: string | null;
  achievement_frame: string | null;
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
 *  2. Owner user IDs from OWNER_USER_IDS env var (permanent)
 *  3. Active Lemonsqueezy subscription
 *  4. Active giveaway code premium (premium_expires_at > now)
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  // Developer gets permanent premium access
  if (userId === DEVELOPER_USER_ID) {
    return true;
  }

  // Owner IDs get permanent premium access
  const ownerIds = (process.env.OWNER_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ownerIds.includes(userId)) {
    return true;
  }

  try {
    await ensurePremiumTables();

    // Check Lemonsqueezy subscription
    const subResult = await pool.query(
      `SELECT subscription_status FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (subResult.rows.length > 0 && subResult.rows[0].subscription_status === "active") {
      return true;
    }

    // Check active giveaway code premium
    const giveawayResult = await pool.query(
      `
      SELECT 1
      FROM players
      WHERE user_id           = $1
        AND premium_expires_at IS NOT NULL
        AND premium_expires_at  > NOW()
      LIMIT 1
      `,
      [userId]
    );
    if (giveawayResult.rows.length > 0) {
      return true;
    }

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
  // Developer / owner — permanent
  if (userId === DEVELOPER_USER_ID) {
    return { premium: true, expiresAt: null, source: "developer" };
  }
  const ownerIds = (process.env.OWNER_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ownerIds.includes(userId)) {
    return { premium: true, expiresAt: null, source: "owner" };
  }

  try {
    await ensurePremiumTables();

    // Check Lemonsqueezy subscription
    const subResult = await pool.query(
      `SELECT subscription_status, current_period_end FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (subResult.rows.length > 0 && subResult.rows[0].subscription_status === "active") {
      return {
        premium: true,
        expiresAt: subResult.rows[0].current_period_end
          ? new Date(subResult.rows[0].current_period_end)
          : null,
        source: "subscription",
      };
    }

    // Check giveaway code premium
    const giveawayResult = await pool.query(
      `
      SELECT premium_expires_at
      FROM players
      WHERE user_id           = $1
        AND premium_expires_at IS NOT NULL
        AND premium_expires_at  > NOW()
      LIMIT 1
      `,
      [userId]
    );
    if (giveawayResult.rows.length > 0) {
      return {
        premium: true,
        expiresAt: new Date(giveawayResult.rows[0].premium_expires_at),
        source: "giveaway_code",
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
      INSERT INTO cosmetics (user_id, theme, profile_banner, rank_badge_style, player_title, profile_color, achievement_frame)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        theme              = EXCLUDED.theme,
        profile_banner     = EXCLUDED.profile_banner,
        rank_badge_style   = EXCLUDED.rank_badge_style,
        player_title       = EXCLUDED.player_title,
        profile_color      = EXCLUDED.profile_color,
        achievement_frame  = EXCLUDED.achievement_frame,
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
 * Returns true if the user holds a staff role in the DB player record.
 * The player `data` JSON blob may contain a `roles` array of Discord role IDs.
 */
export async function isStaffUser(userId: string): Promise<boolean> {
  // Developer is implicitly staff
  if (userId === DEVELOPER_USER_ID) return true;

  try {
    const { pool } = await import("@/lib/db");
    const result = await pool.query(
      `SELECT data->'roles' AS roles FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return false;
    const roles: string[] = result.rows[0].roles ?? [];
    return STAFF_ROLE_IDS.some((id) => roles.includes(id));
  } catch (err) {
    console.error(`[premium] isStaffUser(${userId}) failed:`, err);
    return false;
  }
}

/**
 * Returns true if the user holds a content-creator role in the DB player record.
 */
export async function isContentCreator(userId: string): Promise<boolean> {
  try {
    const { pool } = await import("@/lib/db");
    const result = await pool.query(
      `SELECT data->'roles' AS roles FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return false;
    const roles: string[] = result.rows[0].roles ?? [];
    return CONTENT_CREATOR_ROLE_IDS.some((id) => roles.includes(id));
  } catch (err) {
    console.error(`[premium] isContentCreator(${userId}) failed:`, err);
    return false;
  }
}

/**
 * Returns true if the user holds a tournament-winner role in the DB player record.
 */
export async function isTournamentWinner(userId: string): Promise<boolean> {
  try {
    const { pool } = await import("@/lib/db");
    const result = await pool.query(
      `SELECT data->'roles' AS roles FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return false;
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
 * Assigns a badge role to a user by updating their roles array in the DB.
 * This is a DB-level operation; the Discord role must be synced separately.
 */
export async function assignBadgeRole(userId: string, roleId: string): Promise<void> {
  try {
    const { pool } = await import("@/lib/db");
    await pool.query(
      `
      UPDATE players
      SET data = jsonb_set(
        COALESCE(data, '{}'),
        '{roles}',
        (
          SELECT jsonb_agg(DISTINCT r)
          FROM jsonb_array_elements_text(
            COALESCE(data->'roles', '[]'::jsonb) || $2::jsonb
          ) AS r
        )
      )
      WHERE user_id = $1
      `,
      [userId, JSON.stringify([roleId])]
    );
  } catch (err) {
    console.error(`[premium] assignBadgeRole(${userId}, ${roleId}) failed:`, err);
    throw err;
  }
}

/**
 * Removes a badge role from a user's roles array in the DB.
 */
export async function removeBadgeRole(userId: string, roleId: string): Promise<void> {
  try {
    const { pool } = await import("@/lib/db");
    await pool.query(
      `
      UPDATE players
      SET data = jsonb_set(
        COALESCE(data, '{}'),
        '{roles}',
        (
          SELECT COALESCE(jsonb_agg(r), '[]'::jsonb)
          FROM jsonb_array_elements_text(COALESCE(data->'roles', '[]'::jsonb)) AS r
          WHERE r != $2
        )
      )
      WHERE user_id = $1
      `,
      [userId, roleId]
    );
  } catch (err) {
    console.error(`[premium] removeBadgeRole(${userId}, ${roleId}) failed:`, err);
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
} from "@/lib/premium-constants";
