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
 * Returns true if the user has an active subscription in the DB.
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  // Developer/owner gets permanent premium access
  if (userId === "733871667788644445") {
    return true;
  }

  try {
    await ensurePremiumTables();
    const result = await pool.query(
      `SELECT subscription_status FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return false;
    return result.rows[0].subscription_status === "active";
  } catch (err) {
    console.error(`[premium] isPremiumUser(${userId}) failed:`, err);
    return false;
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
