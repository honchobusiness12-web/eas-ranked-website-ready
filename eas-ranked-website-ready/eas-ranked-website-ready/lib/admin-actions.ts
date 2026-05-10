"use server";

import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  DEVELOPER_USER_ID,
  assignBadgeRole,
  removeBadgeRole,
  getUserBadges,
  grantPremium,
  revokePremium,
  getPremiumStatus,
} from "@/lib/premium";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface PlayerData {
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
  premium_expires_at: string | null;
  premium: boolean;
}

export interface BadgeData {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_name: string | null;
  action: string;
  target_user_id: string | null;
  target_name: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function requireDeveloper(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized: not logged in");
  if (session.userId !== DEVELOPER_USER_ID)
    throw new Error("Forbidden: developer access required");
  return session.userId;
}

async function ensureAuditTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id       VARCHAR(32) NOT NULL,
      action         VARCHAR(64) NOT NULL,
      target_user_id VARCHAR(32),
      details        JSONB       NOT NULL DEFAULT '{}',
      created_at     TIMESTAMP   NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC)`
  );
}

async function writeAuditLog(
  adminId: string,
  action: string,
  targetUserId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await ensureAuditTable();
    await pool.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_user_id, details)
       VALUES ($1, $2, $3, $4)`,
      [adminId, action, targetUserId, JSON.stringify(details)]
    );
  } catch (err) {
    // Audit log failures should never block the main action
    console.error("[admin-actions] writeAuditLog failed:", err);
  }
}

const PLAYER_SELECT = `
  SELECT
    user_id,
    COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
    data->>'username'   AS username,
    data->>'avatar_url' AS avatar_url,
    COALESCE((data->>'cr')::int, 0)                AS cr,
    COALESCE((data->>'wins')::int, 0)              AS wins,
    COALESCE((data->>'losses')::int, 0)            AS losses,
    COALESCE((data->>'kills')::int, 0)             AS kills,
    COALESCE((data->>'matches')::int, 0)           AS matches,
    COALESCE((data->>'mvp_count')::int, 0)         AS mvp_count,
    COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
    COALESCE((data->>'ranked')::boolean, false)    AS ranked,
    COALESCE((data->>'registered')::boolean, false) AS registered,
    COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted,
    COALESCE((data->>'premium')::boolean, false)   AS premium,
    premium_expires_at
  FROM players
`;

// ---------------------------------------------------------------------------
// searchPlayers
// ---------------------------------------------------------------------------

export async function searchPlayers(
  query: string
): Promise<ActionResult<{ players: PlayerData[]; total: number }>> {
  try {
    await requireDeveloper();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    const trimmed = query.trim();
    const isIdSearch = /^\d{17,19}$/.test(trimmed);

    let players: PlayerData[];
    let total: number;

    if (!trimmed) {
      const [rows, count] = await Promise.all([
        pool.query(`${PLAYER_SELECT} ORDER BY cr DESC LIMIT 50`),
        pool.query(`SELECT COUNT(*) AS count FROM players`),
      ]);
      players = rows.rows;
      total = parseInt(count.rows[0].count, 10);
    } else if (isIdSearch) {
      const rows = await pool.query(
        `${PLAYER_SELECT} WHERE user_id = $1 LIMIT 10`,
        [trimmed]
      );
      players = rows.rows;
      total = rows.rows.length;
    } else {
      const rows = await pool.query(
        `${PLAYER_SELECT}
         WHERE LOWER(COALESCE(data->>'display_name', '')) LIKE $1
            OR LOWER(COALESCE(data->>'username', ''))     LIKE $1
            OR LOWER(name)                                LIKE $1
         ORDER BY cr DESC
         LIMIT 50`,
        [`%${trimmed.toLowerCase()}%`]
      );
      players = rows.rows;
      total = rows.rows.length;
    }

    return { success: true, data: { players, total } };
  } catch (err) {
    console.error("[admin-actions] searchPlayers failed:", err);
    return { success: false, error: "Failed to search players" };
  }
}

// ---------------------------------------------------------------------------
// getPlayer
// ---------------------------------------------------------------------------

export async function getPlayer(
  userId: string
): Promise<ActionResult<PlayerData>> {
  try {
    await requireDeveloper();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    const result = await pool.query(
      `${PLAYER_SELECT} WHERE user_id = $1 LIMIT 1`,
      [userId.trim()]
    );
    if (result.rows.length === 0) {
      return { success: false, error: "Player not found" };
    }
    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error("[admin-actions] getPlayer failed:", err);
    return { success: false, error: "Failed to fetch player" };
  }
}

// ---------------------------------------------------------------------------
// getPlayerBadges
// ---------------------------------------------------------------------------

export async function getPlayerBadges(
  userId: string
): Promise<ActionResult<BadgeData[]>> {
  try {
    await requireDeveloper();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    const badges = await getUserBadges(userId.trim());
    return { success: true, data: badges };
  } catch (err) {
    console.error("[admin-actions] getPlayerBadges failed:", err);
    return { success: false, error: "Failed to fetch badges" };
  }
}

// ---------------------------------------------------------------------------
// assignBadge
// ---------------------------------------------------------------------------

export async function assignBadge(
  userId: string,
  badgeId: string
): Promise<ActionResult<BadgeData[]>> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const VALID = new Set(["staff", "contentCreator", "tournamentWinner"]);
  if (!VALID.has(badgeId)) {
    return { success: false, error: `Invalid badge: ${badgeId}` };
  }

  try {
    await assignBadgeRole(userId.trim(), badgeId);
    const badges = await getUserBadges(userId.trim());
    await writeAuditLog(adminId, "assign_badge", userId.trim(), {
      badge: badgeId,
    });
    revalidatePath("/admin");
    return { success: true, data: badges };
  } catch (err) {
    console.error("[admin-actions] assignBadge failed:", err);
    return { success: false, error: (err as Error).message ?? "Failed to assign badge" };
  }
}

// ---------------------------------------------------------------------------
// removeBadge
// ---------------------------------------------------------------------------

export async function removeBadge(
  userId: string,
  badgeId: string
): Promise<ActionResult<BadgeData[]>> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const VALID = new Set(["staff", "contentCreator", "tournamentWinner"]);
  if (!VALID.has(badgeId)) {
    return { success: false, error: `Invalid badge: ${badgeId}` };
  }

  try {
    await removeBadgeRole(userId.trim(), badgeId);
    const badges = await getUserBadges(userId.trim());
    await writeAuditLog(adminId, "remove_badge", userId.trim(), {
      badge: badgeId,
    });
    revalidatePath("/admin");
    return { success: true, data: badges };
  } catch (err) {
    console.error("[admin-actions] removeBadge failed:", err);
    return { success: false, error: (err as Error).message ?? "Failed to remove badge" };
  }
}

// ---------------------------------------------------------------------------
// grantPremiumAction
// ---------------------------------------------------------------------------

export async function grantPremiumAction(
  userId: string
): Promise<ActionResult<{ premium: boolean; expiresAt: string | null }>> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    await grantPremium(userId.trim());
    const status = await getPremiumStatus(userId.trim());
    await writeAuditLog(adminId, "grant_premium", userId.trim(), {
      expiresAt: status.expiresAt?.toISOString() ?? null,
    });
    revalidatePath("/admin");
    return {
      success: true,
      data: {
        premium: status.premium,
        expiresAt: status.expiresAt?.toISOString() ?? null,
      },
    };
  } catch (err) {
    console.error("[admin-actions] grantPremiumAction failed:", err);
    return { success: false, error: (err as Error).message ?? "Failed to grant premium" };
  }
}

// ---------------------------------------------------------------------------
// revokePremiumAction
// ---------------------------------------------------------------------------

export async function revokePremiumAction(
  userId: string
): Promise<ActionResult<{ premium: boolean }>> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    await revokePremium(userId.trim());
    await writeAuditLog(adminId, "revoke_premium", userId.trim(), {});
    revalidatePath("/admin");
    return { success: true, data: { premium: false } };
  } catch (err) {
    console.error("[admin-actions] revokePremiumAction failed:", err);
    return { success: false, error: (err as Error).message ?? "Failed to revoke premium" };
  }
}

// ---------------------------------------------------------------------------
// editPlayerStat
// ---------------------------------------------------------------------------

export async function editPlayerStat(
  userId: string,
  stat: string,
  value: number
): Promise<ActionResult<PlayerData>> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const VALID_STATS = new Set([
    "cr",
    "wins",
    "losses",
    "kills",
    "matches",
    "mvp_count",
    "placement_matches",
  ]);
  if (!VALID_STATS.has(stat)) {
    return { success: false, error: `Invalid stat: ${stat}` };
  }
  if (typeof value !== "number" || isNaN(value) || value < 0) {
    return { success: false, error: "Value must be a non-negative number" };
  }

  try {
    const uid = userId.trim();

    // Get old value for audit log (stat is validated against whitelist above)
    const before = await pool.query(
      `SELECT COALESCE((data->>$2)::int, 0) AS old_val FROM players WHERE user_id = $1 LIMIT 1`,
      [uid, stat]
    );
    const oldVal = before.rows[0]?.old_val ?? 0;

    await pool.query(
      `UPDATE players SET data = data || $1::jsonb WHERE user_id = $2`,
      [JSON.stringify({ [stat]: value }), uid]
    );

    const result = await pool.query(
      `${PLAYER_SELECT} WHERE user_id = $1 LIMIT 1`,
      [uid]
    );
    if (result.rows.length === 0) {
      return { success: false, error: "Player not found" };
    }

    await writeAuditLog(adminId, "edit_stat", uid, {
      stat,
      old_value: oldVal,
      new_value: value,
    });

    revalidatePath(`/profile/${uid}`);
    revalidatePath("/leaderboard");
    revalidatePath("/admin");

    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error("[admin-actions] editPlayerStat failed:", err);
    return { success: false, error: "Failed to update stat" };
  }
}

// ---------------------------------------------------------------------------
// editAllPlayerStats (bulk edit)
// ---------------------------------------------------------------------------

export async function editAllPlayerStats(
  userId: string,
  stats: {
    cr: number;
    wins: number;
    losses: number;
    kills: number;
    matches: number;
    mvp_count: number;
    placement_matches: number;
  }
): Promise<ActionResult<PlayerData>> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const uid = userId.trim();

  try {
    await pool.query(
      `UPDATE players SET data = data || $1::jsonb WHERE user_id = $2`,
      [JSON.stringify(stats), uid]
    );

    const result = await pool.query(
      `${PLAYER_SELECT} WHERE user_id = $1 LIMIT 1`,
      [uid]
    );
    if (result.rows.length === 0) {
      return { success: false, error: "Player not found" };
    }

    await writeAuditLog(adminId, "edit_stats_bulk", uid, { stats });

    revalidatePath(`/profile/${uid}`);
    revalidatePath("/leaderboard");
    revalidatePath("/admin");

    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error("[admin-actions] editAllPlayerStats failed:", err);
    return { success: false, error: "Failed to update stats" };
  }
}

// ---------------------------------------------------------------------------
// resetPlayerStats
// ---------------------------------------------------------------------------

export async function resetPlayerStats(
  userId: string
): Promise<ActionResult<PlayerData>> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const uid = userId.trim();

  try {
    // Capture old stats for audit log
    const before = await pool.query(
      `SELECT
         COALESCE((data->>'cr')::int, 0)      AS cr,
         COALESCE((data->>'wins')::int, 0)     AS wins,
         COALESCE((data->>'losses')::int, 0)   AS losses,
         COALESCE((data->>'kills')::int, 0)    AS kills,
         COALESCE((data->>'matches')::int, 0)  AS matches,
         COALESCE((data->>'mvp_count')::int, 0) AS mvp_count,
         COALESCE((data->>'placement_matches')::int, 0) AS placement_matches
       FROM players WHERE user_id = $1 LIMIT 1`,
      [uid]
    );
    const oldStats = before.rows[0] ?? {};

    await pool.query(
      `UPDATE players
       SET data = data || '{"cr":0,"wins":0,"losses":0,"kills":0,"matches":0,"mvp_count":0,"placement_matches":0,"ranked":false}'::jsonb
       WHERE user_id = $1`,
      [uid]
    );

    const result = await pool.query(
      `${PLAYER_SELECT} WHERE user_id = $1 LIMIT 1`,
      [uid]
    );
    if (result.rows.length === 0) {
      return { success: false, error: "Player not found" };
    }

    await writeAuditLog(adminId, "reset_player_stats", uid, {
      old_stats: oldStats,
    });

    revalidatePath(`/profile/${uid}`);
    revalidatePath("/leaderboard");
    revalidatePath("/admin");

    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error("[admin-actions] resetPlayerStats failed:", err);
    return { success: false, error: "Failed to reset player stats" };
  }
}

// ---------------------------------------------------------------------------
// resetAllPlayers
// ---------------------------------------------------------------------------

export async function resetAllPlayers(): Promise<ActionResult<{ count: number }>> {
  let adminId: string;
  try {
    adminId = await requireDeveloper();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    const result = await pool.query(
      `UPDATE players
       SET data = data || '{"cr":0,"wins":0,"losses":0,"kills":0,"matches":0,"mvp_count":0,"placement_matches":0,"ranked":false}'::jsonb`
    );

    const count = result.rowCount ?? 0;

    await writeAuditLog(adminId, "reset_all_players", null, {
      players_affected: count,
    });

    revalidatePath("/leaderboard");
    revalidatePath("/admin");
    revalidatePath("/");

    return { success: true, data: { count } };
  } catch (err) {
    console.error("[admin-actions] resetAllPlayers failed:", err);
    return { success: false, error: "Failed to reset all players" };
  }
}

// ---------------------------------------------------------------------------
// getAuditLogs
// ---------------------------------------------------------------------------

export async function getAuditLogs(
  limit = 50
): Promise<ActionResult<AuditLogEntry[]>> {
  try {
    await requireDeveloper();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    await ensureAuditTable();

    const result = await pool.query(
      `SELECT
         al.id,
         al.admin_id,
         COALESCE(ap.data->>'display_name', ap.data->>'username', al.admin_id) AS admin_name,
         al.action,
         al.target_user_id,
         COALESCE(tp.data->>'display_name', tp.data->>'username', al.target_user_id) AS target_name,
         al.details,
         al.created_at
       FROM admin_audit_logs al
       LEFT JOIN players ap ON ap.user_id = al.admin_id
       LEFT JOIN players tp ON tp.user_id = al.target_user_id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [Math.min(limit, 200)]
    );

    return { success: true, data: result.rows };
  } catch (err) {
    console.error("[admin-actions] getAuditLogs failed:", err);
    return { success: false, error: "Failed to fetch audit logs" };
  }
}
