"use server";

import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import {
  DEVELOPER_USER_ID,
  getUserBadges,
  assignBadgeRole,
  removeBadgeRole,
  grantPremium,
  revokePremium,
  getPremiumStatus,
} from "@/lib/premium";
import { logAudit } from "@/lib/admin/audit";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface PlayerSearchResult {
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
  blacklisted: boolean;
  premium: boolean;
  premium_expires_at: string | null;
  badges: Array<{
    id: string;
    label: string;
    icon: string;
    color: string;
    description: string;
  }>;
}

export interface PlayerStats {
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
  if (!session) {
    throw new Error("Unauthorized: no session");
  }
  if (session.userId !== DEVELOPER_USER_ID) {
    throw new Error("Forbidden: developer access required");
  }
  return session.userId;
}

// ---------------------------------------------------------------------------
// searchPlayers
// ---------------------------------------------------------------------------

/**
 * Search players by name or Discord ID.
 * Returns up to 20 results with full badge and premium data.
 */
export async function searchPlayers(
  query: string
): Promise<ActionResult<PlayerSearchResult[]>> {
  try {
    await requireDeveloper();

    const trimmed = query.trim();
    if (!trimmed) {
      // Return first 20 players ordered by CR when no query
      const result = await pool.query(
        `SELECT
           user_id,
           COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
           data->>'username'   AS username,
           data->>'avatar_url' AS avatar_url,
           COALESCE((data->>'cr')::int, 0)               AS cr,
           COALESCE((data->>'wins')::int, 0)              AS wins,
           COALESCE((data->>'losses')::int, 0)            AS losses,
           COALESCE((data->>'kills')::int, 0)             AS kills,
           COALESCE((data->>'matches')::int, 0)           AS matches,
           COALESCE((data->>'mvp_count')::int, 0)         AS mvp_count,
           COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
           COALESCE((data->>'ranked')::boolean, false)    AS ranked,
           COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted,
           (data->>'premium')::boolean                    AS discord_premium,
           premium_expires_at,
           data->'badges'                                 AS badges_raw
         FROM players
         ORDER BY cr DESC
         LIMIT 20`
      );
      const players = await enrichPlayers(result.rows);
      return { success: true, data: players };
    }

    const isIdSearch = /^\d{17,19}$/.test(trimmed);

    const result = isIdSearch
      ? await pool.query(
          `SELECT
             user_id,
             COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
             data->>'username'   AS username,
             data->>'avatar_url' AS avatar_url,
             COALESCE((data->>'cr')::int, 0)               AS cr,
             COALESCE((data->>'wins')::int, 0)              AS wins,
             COALESCE((data->>'losses')::int, 0)            AS losses,
             COALESCE((data->>'kills')::int, 0)             AS kills,
             COALESCE((data->>'matches')::int, 0)           AS matches,
             COALESCE((data->>'mvp_count')::int, 0)         AS mvp_count,
             COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
             COALESCE((data->>'ranked')::boolean, false)    AS ranked,
             COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted,
             (data->>'premium')::boolean                    AS discord_premium,
             premium_expires_at,
             data->'badges'                                 AS badges_raw
           FROM players
           WHERE user_id = $1
           LIMIT 20`,
          [trimmed]
        )
      : await pool.query(
          `SELECT
             user_id,
             COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
             data->>'username'   AS username,
             data->>'avatar_url' AS avatar_url,
             COALESCE((data->>'cr')::int, 0)               AS cr,
             COALESCE((data->>'wins')::int, 0)              AS wins,
             COALESCE((data->>'losses')::int, 0)            AS losses,
             COALESCE((data->>'kills')::int, 0)             AS kills,
             COALESCE((data->>'matches')::int, 0)           AS matches,
             COALESCE((data->>'mvp_count')::int, 0)         AS mvp_count,
             COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
             COALESCE((data->>'ranked')::boolean, false)    AS ranked,
             COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted,
             (data->>'premium')::boolean                    AS discord_premium,
             premium_expires_at,
             data->'badges'                                 AS badges_raw
           FROM players
           WHERE
             COALESCE(data->>'display_name', '') ILIKE $1
             OR COALESCE(data->>'username', '') ILIKE $1
             OR name ILIKE $1
           ORDER BY cr DESC
           LIMIT 20`,
          [`%${trimmed}%`]
        );

    const players = await enrichPlayers(result.rows);
    return { success: true, data: players };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to search players";
    console.error("[actions] searchPlayers failed:", err);
    return { success: false, error: message };
  }
}

/** Enrich raw DB rows with full badge objects and premium status. */
async function enrichPlayers(
  rows: Array<Record<string, unknown>>
): Promise<PlayerSearchResult[]> {
  return Promise.all(
    rows.map(async (row) => {
      const userId = row.user_id as string;
      const badges = await getUserBadges(userId);
      const premiumStatus = await getPremiumStatus(userId);

      return {
        user_id: userId,
        name: (row.name as string) ?? "Unknown Player",
        username: (row.username as string) ?? null,
        avatar_url: (row.avatar_url as string) ?? null,
        cr: (row.cr as number) ?? 0,
        wins: (row.wins as number) ?? 0,
        losses: (row.losses as number) ?? 0,
        kills: (row.kills as number) ?? 0,
        matches: (row.matches as number) ?? 0,
        mvp_count: (row.mvp_count as number) ?? 0,
        placement_matches: (row.placement_matches as number) ?? 0,
        ranked: (row.ranked as boolean) ?? false,
        blacklisted: (row.blacklisted as boolean) ?? false,
        premium: premiumStatus.premium,
        premium_expires_at:
          (row.premium_expires_at as string) ?? null,
        badges,
      };
    })
  );
}

// ---------------------------------------------------------------------------
// assignBadge
// ---------------------------------------------------------------------------

export async function assignBadge(
  userId: string,
  badgeId: string
): Promise<ActionResult<{ badges: PlayerSearchResult["badges"] }>> {
  try {
    const adminId = await requireDeveloper();

    // Ensure player record exists
    const check = await pool.query(
      `SELECT 1 FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (check.rowCount === 0) {
      return { success: false, error: "Player not found in database" };
    }

    await assignBadgeRole(userId, badgeId);
    const badges = await getUserBadges(userId);

    await logAudit(adminId, "assign_badge", userId, { badgeId, badges: badges.map((b) => b.id) });

    revalidatePath("/admin/badges");
    revalidatePath(`/profile/${userId}`);

    return { success: true, data: { badges } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to assign badge";
    console.error("[actions] assignBadge failed:", err);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// removeBadge
// ---------------------------------------------------------------------------

export async function removeBadge(
  userId: string,
  badgeId: string
): Promise<ActionResult<{ badges: PlayerSearchResult["badges"] }>> {
  try {
    const adminId = await requireDeveloper();

    const check = await pool.query(
      `SELECT 1 FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (check.rowCount === 0) {
      return { success: false, error: "Player not found in database" };
    }

    await removeBadgeRole(userId, badgeId);
    const badges = await getUserBadges(userId);

    await logAudit(adminId, "remove_badge", userId, { badgeId, badges: badges.map((b) => b.id) });

    revalidatePath("/admin/badges");
    revalidatePath(`/profile/${userId}`);

    return { success: true, data: { badges } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove badge";
    console.error("[actions] removeBadge failed:", err);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// grantPremiumAction
// ---------------------------------------------------------------------------

export async function grantPremiumAction(
  userId: string
): Promise<ActionResult<{ premium: boolean; expiresAt: string | null }>> {
  try {
    const adminId = await requireDeveloper();

    const check = await pool.query(
      `SELECT 1 FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (check.rowCount === 0) {
      return { success: false, error: "Player not found in database" };
    }

    await grantPremium(userId);
    const status = await getPremiumStatus(userId);

    await logAudit(adminId, "grant_premium", userId, {
      expiresAt: status.expiresAt?.toISOString() ?? null,
      source: status.source,
    });

    revalidatePath("/admin/badges");
    revalidatePath(`/profile/${userId}`);

    return {
      success: true,
      data: {
        premium: status.premium,
        expiresAt: status.expiresAt?.toISOString() ?? null,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to grant premium";
    console.error("[actions] grantPremiumAction failed:", err);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// revokePremiumAction
// ---------------------------------------------------------------------------

export async function revokePremiumAction(
  userId: string
): Promise<ActionResult<{ premium: boolean }>> {
  try {
    const adminId = await requireDeveloper();

    const check = await pool.query(
      `SELECT 1 FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (check.rowCount === 0) {
      return { success: false, error: "Player not found in database" };
    }

    await revokePremium(userId);

    await logAudit(adminId, "revoke_premium", userId, {});

    revalidatePath("/admin/badges");
    revalidatePath(`/profile/${userId}`);

    return { success: true, data: { premium: false } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revoke premium";
    console.error("[actions] revokePremiumAction failed:", err);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// updatePlayerStats
// ---------------------------------------------------------------------------

export async function updatePlayerStats(
  userId: string,
  stats: PlayerStats
): Promise<ActionResult<PlayerSearchResult>> {
  try {
    const adminId = await requireDeveloper();

    const check = await pool.query(
      `SELECT 1 FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (check.rowCount === 0) {
      return { success: false, error: "Player not found in database" };
    }

    const patch: Record<string, unknown> = {};
    const numericFields = [
      "cr",
      "wins",
      "losses",
      "kills",
      "matches",
      "mvp_count",
      "placement_matches",
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

    await logAudit(adminId, "update_player_stats", userId, { stats: patch });

    revalidatePath("/admin/badges");
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/leaderboard");

    // Return the refreshed player
    const refreshed = await searchPlayers(userId);
    const player = refreshed.data?.[0];
    if (!player) {
      return { success: false, error: "Failed to reload player after update" };
    }

    return { success: true, data: player };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update player stats";
    console.error("[actions] updatePlayerStats failed:", err);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// resetAllStats
// ---------------------------------------------------------------------------

export async function resetAllStats(): Promise<ActionResult<{ count: number }>> {
  try {
    const adminId = await requireDeveloper();

    const result = await pool.query(
      `UPDATE players
       SET data = data || '{"cr":0,"wins":0,"losses":0,"kills":0,"matches":0,"mvp_count":0,"placement_matches":0,"ranked":false}'::jsonb`
    );

    const count = result.rowCount ?? 0;

    await logAudit(adminId, "reset_all_stats", null, { players_reset: count });

    revalidatePath("/admin/badges");
    revalidatePath("/leaderboard");
    revalidatePath("/");

    return { success: true, data: { count } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reset all stats";
    console.error("[actions] resetAllStats failed:", err);
    return { success: false, error: message };
  }
}
