import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Premium Role ID (Discord)
// ---------------------------------------------------------------------------
export const PREMIUM_ROLE_ID = "1502426990995836928";

// ---------------------------------------------------------------------------
// Discord public flags — used for content creator / badge detection
// https://discord.com/developers/docs/resources/user#user-object-user-flags
// ---------------------------------------------------------------------------
const DISCORD_FLAGS = {
  /** Active Developer badge */
  ACTIVE_DEVELOPER: 1 << 22,
  /** Verified Bot Developer badge */
  VERIFIED_BOT_DEVELOPER: 1 << 17,
} as const;

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
// Content creator detection
// ---------------------------------------------------------------------------

/**
 * Fetches the Discord user object for `userId` and returns true if the user
 * holds the Active Developer badge or the Verified Bot Developer badge.
 * These are treated as content-creator signals that grant automatic premium.
 *
 * Requires DISCORD_BOT_TOKEN to be set in the environment.
 * Returns false gracefully on any network / auth error.
 */
export async function isContentCreator(userId: string): Promise<boolean> {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) return false;

    const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: { Authorization: `Bot ${token}` },
      // Short timeout so a slow Discord API doesn't block page renders
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return false;

    const user = await res.json();
    const flags: number = (user.public_flags ?? 0) | (user.flags ?? 0);

    const hasActiveDev       = (flags & DISCORD_FLAGS.ACTIVE_DEVELOPER)     !== 0;
    const hasVerifiedBotDev  = (flags & DISCORD_FLAGS.VERIFIED_BOT_DEVELOPER) !== 0;

    if (hasActiveDev || hasVerifiedBotDev) {
      console.log(`[premium] isContentCreator: user ${userId} granted via Discord badge (flags=${flags})`);
      return true;
    }

    return false;
  } catch (err) {
    console.warn(`[premium] isContentCreator(${userId}) check failed:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Check premium status
// ---------------------------------------------------------------------------

/**
 * Returns true if the user has an active subscription in the DB **or** holds
 * a Discord content-creator badge (Active Developer / Verified Bot Developer).
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  try {
    await ensurePremiumTables();

    // 1. Check DB subscription first (fast path)
    const result = await pool.query(
      `SELECT subscription_status FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (result.rows.length > 0 && result.rows[0].subscription_status === "active") {
      return true;
    }

    // 2. Fall back to content-creator badge check
    return await isContentCreator(userId);
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
