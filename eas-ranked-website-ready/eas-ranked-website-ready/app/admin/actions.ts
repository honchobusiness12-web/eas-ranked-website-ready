"use server";

import { getSession } from "@/lib/auth";
import {
  DEVELOPER_USER_ID,
  getUserBadges,
  assignBadgeRole,
  removeBadgeRole,
  grantPremium,
  revokePremium,
  getPremiumStatus,
} from "@/lib/premium";
import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerResult {
  user_id: string;
  name: string;
  avatar_url: string | null;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  placement_matches: number;
  blacklisted: boolean;
  ranked: boolean;
  premium_expires_at: string | null;
}

export interface BadgeInfo {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface PremiumInfo {
  premium: boolean;
  source: string | null;
  expiresAt: string | null;
}

export interface StatsPayload {
  cr?: number;
  wins?: number;
  losses?: number;
  kills?: number;
  matches?: number;
  mvp_count?: number;
  placement_matches?: number;
}

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

async function requireDeveloper(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.userId !== DEVELOPER_USER_ID) throw new Error("Forbidden");
  return session.userId;
}

// ---------------------------------------------------------------------------
// Audit log helper
// ---------------------------------------------------------------------------

async function createAuditLog(
  adminId: string,
  action: string,
  targetUserId: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO cr_audit_logs (player_id, old_cr, new_cr, edited_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        targetUserId,
        details.old_cr ?? 0,
        details.new_cr ?? 0,
        adminId,
        `[admin:${action}] ${JSON.stringify(details)}`,
      ]
    );
  } catch {
    // Audit log failure should not block the action
  }
}

// ---------------------------------------------------------------------------
// searchPlayers
// ---------------------------------------------------------------------------

export async function searchPlayers(
  query: string
): Promise<{ players: PlayerResult[]; error: string | null }> {
  try {
    await requireDeveloper();
  } catch (err) {
    return { players: [], error: err instanceof Error ? err.message : "Unauthorized" };
  }

  const trimmed = query.trim();
  if (!trimmed) return { players: [], error: null };

  try {
    const isIdSearch = /^\d{17,19}$/.test(trimmed);
    const result = isIdSearch
      ? await pool.query(
          `SELECT
             user_id,
             COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
             data->>'avatar_url' AS avatar_url,
             COALESCE((data->>'cr')::int, 0) AS cr,
             COALESCE((data->>'wins')::int, 0) AS wins,
             COALESCE((data->>'losses')::int, 0) AS losses,
             COALESCE((data->>'kills')::int, 0) AS kills,
             COALESCE((data->>'matches')::int, 0) AS matches,
             COALESCE((data->>'mvp_count')::int, 0) AS mvp_count,
             COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
             COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted,
             COALESCE((data->>'ranked')::boolean, false) AS ranked,
             premium_expires_at
           FROM players
           WHERE user_id = $1
           LIMIT 10`,
          [trimmed]
        )
      : await pool.query(
          `SELECT
             user_id,
             COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
             data->>'avatar_url' AS avatar_url,
             COALESCE((data->>'cr')::int, 0) AS cr,
             COALESCE((data->>'wins')::int, 0) AS wins,
             COALESCE((data->>'losses')::int, 0) AS losses,
             COALESCE((data->>'kills')::int, 0) AS kills,
             COALESCE((data->>'matches')::int, 0) AS matches,
             COALESCE((data->>'mvp_count')::int, 0) AS mvp_count,
             COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
             COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted,
             COALESCE((data->>'ranked')::boolean, false) AS ranked,
             premium_expires_at
           FROM players
           WHERE name ILIKE $1
              OR COALESCE(data->>'display_name', '') ILIKE $1
              OR COALESCE(data->>'username', '') ILIKE $1
           ORDER BY cr DESC
           LIMIT 10`,
          [`%${trimmed}%`]
        );

    return { players: result.rows, error: null };
  } catch (err) {
    console.error("[actions] searchPlayers failed:", err);
    return { players: [], error: "Search failed. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// assignBadge
// ---------------------------------------------------------------------------

export async function assignBadge(
  userId: string,
  badgeId: string
): Promise<{ success: boolean; badges: BadgeInfo[]; error: string | null }> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, badges: [], error: err instanceof Error ? err.message : "Unauthorized" };
  }

  try {
    // Ensure player record exists
    const exists = await pool.query(
      `SELECT 1 FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (exists.rowCount === 0) {
      await pool.query(
        `INSERT INTO players (user_id, name, data) VALUES ($1, $2, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING`,
        [userId, userId]
      );
    }

    await assignBadgeRole(userId, badgeId);
    const badges = await getUserBadges(userId);

    await createAuditLog(adminId, "assign_badge", userId, {
      badge: badgeId,
      old_cr: 0,
      new_cr: 0,
    });

    return { success: true, badges, error: null };
  } catch (err) {
    console.error("[actions] assignBadge failed:", err);
    return {
      success: false,
      badges: [],
      error: err instanceof Error ? err.message : "Failed to assign badge",
    };
  }
}

// ---------------------------------------------------------------------------
// removeBadge
// ---------------------------------------------------------------------------

export async function removeBadge(
  userId: string,
  badgeId: string
): Promise<{ success: boolean; badges: BadgeInfo[]; error: string | null }> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, badges: [], error: err instanceof Error ? err.message : "Unauthorized" };
  }

  try {
    await removeBadgeRole(userId, badgeId);
    const badges = await getUserBadges(userId);

    await createAuditLog(adminId, "remove_badge", userId, {
      badge: badgeId,
      old_cr: 0,
      new_cr: 0,
    });

    return { success: true, badges, error: null };
  } catch (err) {
    console.error("[actions] removeBadge failed:", err);
    return {
      success: false,
      badges: [],
      error: err instanceof Error ? err.message : "Failed to remove badge",
    };
  }
}

// ---------------------------------------------------------------------------
// grantPremiumAction
// ---------------------------------------------------------------------------

export async function grantPremiumAction(
  userId: string,
  expiresAt?: string
): Promise<{ success: boolean; premium: PremiumInfo | null; error: string | null }> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, premium: null, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  try {
    let expiry: Date | undefined;
    if (expiresAt) {
      expiry = new Date(expiresAt);
      if (isNaN(expiry.getTime())) {
        return { success: false, premium: null, error: "Invalid expiry date" };
      }
    }

    await grantPremium(userId, expiry);
    const status = await getPremiumStatus(userId);

    await createAuditLog(adminId, "grant_premium", userId, {
      expires_at: expiry?.toISOString() ?? "1 year",
      old_cr: 0,
      new_cr: 0,
    });

    return {
      success: true,
      premium: {
        premium: status.premium,
        source: status.source,
        expiresAt: status.expiresAt?.toISOString() ?? null,
      },
      error: null,
    };
  } catch (err) {
    console.error("[actions] grantPremiumAction failed:", err);
    return {
      success: false,
      premium: null,
      error: err instanceof Error ? err.message : "Failed to grant premium",
    };
  }
}

// ---------------------------------------------------------------------------
// revokePremiumAction
// ---------------------------------------------------------------------------

export async function revokePremiumAction(
  userId: string
): Promise<{ success: boolean; premium: PremiumInfo | null; error: string | null }> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, premium: null, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  try {
    await revokePremium(userId);
    const status = await getPremiumStatus(userId);

    await createAuditLog(adminId, "revoke_premium", userId, {
      old_cr: 0,
      new_cr: 0,
    });

    return {
      success: true,
      premium: {
        premium: status.premium,
        source: status.source,
        expiresAt: status.expiresAt?.toISOString() ?? null,
      },
      error: null,
    };
  } catch (err) {
    console.error("[actions] revokePremiumAction failed:", err);
    return {
      success: false,
      premium: null,
      error: err instanceof Error ? err.message : "Failed to revoke premium",
    };
  }
}

// ---------------------------------------------------------------------------
// editStats
// ---------------------------------------------------------------------------

export async function editStats(
  userId: string,
  stats: StatsPayload
): Promise<{ success: boolean; error: string | null }> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  try {
    // Fetch current CR for audit log
    const current = await pool.query(
      `SELECT COALESCE((data->>'cr')::int, 0) AS cr FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (current.rows.length === 0) {
      return { success: false, error: "Player not found" };
    }
    const oldCr = current.rows[0].cr;

    const patch: Record<string, unknown> = {};
    const numericFields = [
      "cr", "wins", "losses", "kills", "matches", "mvp_count", "placement_matches",
    ] as const;
    for (const field of numericFields) {
      if (typeof stats[field] === "number" && !isNaN(stats[field] as number)) {
        patch[field] = stats[field];
      }
    }
    if (Object.keys(patch).length === 0) {
      return { success: false, error: "No valid stat fields provided" };
    }

    await pool.query(
      `UPDATE players SET data = data || $1::jsonb WHERE user_id = $2`,
      [JSON.stringify(patch), userId]
    );

    await createAuditLog(adminId, "edit_stats", userId, {
      old_cr: oldCr,
      new_cr: patch.cr ?? oldCr,
      changes: patch,
    });

    return { success: true, error: null };
  } catch (err) {
    console.error("[actions] editStats failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update stats",
    };
  }
}

// ---------------------------------------------------------------------------
// resetPlayer
// ---------------------------------------------------------------------------

export async function resetPlayer(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  try {
    const current = await pool.query(
      `SELECT COALESCE((data->>'cr')::int, 0) AS cr FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (current.rows.length === 0) {
      return { success: false, error: "Player not found" };
    }
    const oldCr = current.rows[0].cr;

    await pool.query(
      `UPDATE players
       SET data = data || '{"cr":0,"wins":0,"losses":0,"kills":0,"matches":0,"mvp_count":0,"placement_matches":0,"ranked":false}'::jsonb
       WHERE user_id = $1`,
      [userId]
    );

    await createAuditLog(adminId, "reset_player", userId, {
      old_cr: oldCr,
      new_cr: 0,
    });

    return { success: true, error: null };
  } catch (err) {
    console.error("[actions] resetPlayer failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reset player",
    };
  }
}

// ---------------------------------------------------------------------------
// getPlayerBadges — fetch current badges for a player
// ---------------------------------------------------------------------------

export async function getPlayerBadges(
  userId: string
): Promise<{ badges: BadgeInfo[]; error: string | null }> {
  try {
    await requireDeveloper();
  } catch (err) {
    return { badges: [], error: err instanceof Error ? err.message : "Unauthorized" };
  }

  try {
    const badges = await getUserBadges(userId);
    return { badges, error: null };
  } catch (err) {
    console.error("[actions] getPlayerBadges failed:", err);
    return { badges: [], error: "Failed to fetch badges" };
  }
}

// ---------------------------------------------------------------------------
// getPlayerPremium — fetch current premium status for a player
// ---------------------------------------------------------------------------

export async function getPlayerPremium(
  userId: string
): Promise<{ premium: PremiumInfo | null; error: string | null }> {
  try {
    await requireDeveloper();
  } catch (err) {
    return { premium: null, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  try {
    const status = await getPremiumStatus(userId);
    return {
      premium: {
        premium: status.premium,
        source: status.source,
        expiresAt: status.expiresAt?.toISOString() ?? null,
      },
      error: null,
    };
  } catch (err) {
    console.error("[actions] getPlayerPremium failed:", err);
    return { premium: null, error: "Failed to fetch premium status" };
  }
}
