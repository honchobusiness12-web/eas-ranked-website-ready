/**
 * Discord role sync utilities.
 *
 * Checks whether a user has the premium Discord role and updates the
 * subscriptions table accordingly.  Called on every login so that premium
 * access is granted / revoked in real-time without any manual DB work.
 */

import { pool } from "@/lib/db";
import { PREMIUM_ROLE_ID, ensurePremiumTables } from "@/lib/premium";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncResult {
  userId: string;
  hasPremiumRole: boolean;
  previousStatus: string | null;
  newStatus: string | null;
  changed: boolean;
}

// ---------------------------------------------------------------------------
// Fetch the member's roles from Discord using the bot token
// ---------------------------------------------------------------------------

async function getMemberRoles(userId: string): Promise<string[] | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    // Bot token / guild ID not configured — skip role check
    return null;
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        // Don't cache — we need fresh data on every login
        cache: "no-store",
      }
    );

    if (res.status === 404) {
      // User is not in the guild
      return [];
    }

    if (!res.ok) {
      console.warn(`[discord-sync] Failed to fetch member ${userId}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    return Array.isArray(data.roles) ? (data.roles as string[]) : [];
  } catch (err) {
    console.error(`[discord-sync] getMemberRoles(${userId}) error:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

/**
 * Checks the user's Discord roles and syncs their premium status in the DB.
 *
 * - If the user has the premium role → upsert subscription_status = "active"
 * - If the user lost the role       → set subscription_status = "canceled"
 *   (only if their current status was "active" and source is "discord_role")
 *
 * Returns a SyncResult describing what happened.
 */
export async function syncPremiumFromDiscord(userId: string): Promise<SyncResult> {
  await ensurePremiumTables();

  // Fetch current subscription row
  let previousStatus: string | null = null;
  let previousSource: string | null = null;
  try {
    const existing = await pool.query(
      `SELECT subscription_status, lemonsqueezy_customer_id FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (existing.rows.length > 0) {
      previousStatus = existing.rows[0].subscription_status ?? null;
      // Use lemonsqueezy_customer_id = 'discord_role' as a sentinel to track source
      previousSource = existing.rows[0].lemonsqueezy_customer_id ?? null;
    }
  } catch (err) {
    console.error(`[discord-sync] Failed to read existing subscription for ${userId}:`, err);
  }

  // Fetch Discord roles
  const roles = await getMemberRoles(userId);

  if (roles === null) {
    // Could not reach Discord API — leave DB unchanged
    return {
      userId,
      hasPremiumRole: false,
      previousStatus,
      newStatus: previousStatus,
      changed: false,
    };
  }

  const hasPremiumRole = roles.includes(PREMIUM_ROLE_ID);

  let newStatus = previousStatus;
  let changed = false;

  if (hasPremiumRole) {
    // Grant premium via Discord role
    if (previousStatus !== "active") {
      await pool.query(
        `
        INSERT INTO subscriptions (user_id, lemonsqueezy_customer_id, subscription_status, updated_at)
        VALUES ($1, 'discord_role', 'active', NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          subscription_status = 'active',
          lemonsqueezy_customer_id = CASE
            WHEN subscriptions.lemonsqueezy_customer_id IS NULL
              OR subscriptions.lemonsqueezy_customer_id = 'discord_role'
            THEN 'discord_role'
            ELSE subscriptions.lemonsqueezy_customer_id
          END,
          updated_at = NOW()
        `,
        [userId]
      );
      newStatus = "active";
      changed = true;
    }
  } else {
    // User does not have the premium role.
    // Only revoke if the subscription was granted via Discord role (not Lemonsqueezy).
    if (
      previousStatus === "active" &&
      (previousSource === "discord_role" || previousSource === null)
    ) {
      await pool.query(
        `UPDATE subscriptions SET subscription_status = 'canceled', updated_at = NOW() WHERE user_id = $1`,
        [userId]
      );
      newStatus = "canceled";
      changed = true;
    }
  }

  return {
    userId,
    hasPremiumRole,
    previousStatus,
    newStatus,
    changed,
  };
}
