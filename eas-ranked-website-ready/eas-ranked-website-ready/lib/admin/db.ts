/**
 * lib/admin/db.ts
 *
 * Database layer for the admin system.
 * All DB access goes through here — no raw SQL in components or actions.
 * Uses parameterized queries throughout. Returns typed results.
 */

import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminPlayer {
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
  blacklisted: boolean;
  ranked: boolean;
  registered: boolean;
  premium_expires_at: string | null;
  premium: boolean;
}

export interface AdminBadge {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  player_name: string | null;
}

export interface PlayerSearchResult {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  cr: number;
  wins: number;
  losses: number;
  matches: number;
  blacklisted: boolean;
  ranked: boolean;
}

// ---------------------------------------------------------------------------
// Ensure audit log table exists (idempotent)
// ---------------------------------------------------------------------------

async function ensureAdminAuditTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id       VARCHAR(32) NOT NULL,
        target_user_id VARCHAR(32),
        action         VARCHAR(128) NOT NULL,
        details        JSONB        NOT NULL DEFAULT '{}',
        created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit_logs(admin_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_logs(target_user_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_logs(created_at DESC)`
    );
  } catch (err) {
    console.error("[admin/db] ensureAdminAuditTable failed:", err);
  }
}

// ---------------------------------------------------------------------------
// getPlayer — fetch a single player by Discord user ID
// ---------------------------------------------------------------------------

export async function getPlayer(userId: string): Promise<AdminPlayer | null> {
  try {
    const result = await pool.query(
      `SELECT
         user_id,
         COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
         data->>'username'   AS username,
         data->>'avatar_url' AS avatar_url,
         COALESCE((data->>'cr')::int, 0)               AS cr,
         COALESCE((data->>'wins')::int, 0)              AS wins,
         COALESCE((data->>'losses')::int, 0)            AS losses,
         COALESCE((data->>'kills')::int, 0)             AS kills,
         COALESCE((data->>'matches')::int, 0)           AS matches,
         COALESCE((data->>'mvp_count')::int, 0)         AS mvp_count,
         COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
         COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted,
         COALESCE((data->>'ranked')::boolean, false)      AS ranked,
         COALESCE((data->>'registered')::boolean, false)  AS registered,
         premium_expires_at,
         COALESCE((data->>'premium')::boolean, false) AS premium
       FROM players
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] ?? null;
  } catch (err) {
    console.error(`[admin/db] getPlayer(${userId}) failed:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// searchPlayers — search by name or Discord ID, paginated
// ---------------------------------------------------------------------------

export async function searchPlayers(
  query: string,
  limit = 20,
  offset = 0
): Promise<{ players: PlayerSearchResult[]; total: number }> {
  try {
    const isIdSearch = /^\d{17,19}$/.test(query.trim());

    const whereClause = query.trim()
      ? isIdSearch
        ? `WHERE user_id = $3`
        : `WHERE (
             LOWER(COALESCE(data->>'display_name', '')) LIKE $3
             OR LOWER(COALESCE(data->>'username', ''))   LIKE $3
             OR user_id = $4
           )`
      : "";

    const params: (string | number)[] = [limit, offset];
    if (query.trim()) {
      if (isIdSearch) {
        params.push(query.trim());
      } else {
        params.push(`%${query.toLowerCase()}%`);
        params.push(query.trim());
      }
    }

    const countParams: (string | number)[] = [];
    const countWhere = query.trim()
      ? isIdSearch
        ? `WHERE user_id = $1`
        : `WHERE (
             LOWER(COALESCE(data->>'display_name', '')) LIKE $1
             OR LOWER(COALESCE(data->>'username', ''))   LIKE $1
             OR user_id = $2
           )`
      : "";
    if (query.trim()) {
      if (isIdSearch) {
        countParams.push(query.trim());
      } else {
        countParams.push(`%${query.toLowerCase()}%`);
        countParams.push(query.trim());
      }
    }

    const [playersResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
           user_id,
           COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
           data->>'username'   AS username,
           data->>'avatar_url' AS avatar_url,
           COALESCE((data->>'cr')::int, 0)      AS cr,
           COALESCE((data->>'wins')::int, 0)     AS wins,
           COALESCE((data->>'losses')::int, 0)   AS losses,
           COALESCE((data->>'matches')::int, 0)  AS matches,
           COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted,
           COALESCE((data->>'ranked')::boolean, false)      AS ranked
         FROM players
         ${whereClause}
         ORDER BY cr DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM players ${countWhere}`,
        countParams
      ),
    ]);

    return {
      players: playersResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  } catch (err) {
    console.error("[admin/db] searchPlayers failed:", err);
    return { players: [], total: 0 };
  }
}

// ---------------------------------------------------------------------------
// getPlayerBadges — fetch the badges array for a player
// ---------------------------------------------------------------------------

export async function getPlayerBadges(userId: string): Promise<string[]> {
  try {
    const result = await pool.query(
      `SELECT COALESCE(data->'badges', '[]'::jsonb) AS badges
       FROM players
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return [];
    const raw = result.rows[0].badges;
    if (Array.isArray(raw)) return raw as string[];
    return [];
  } catch (err) {
    console.error(`[admin/db] getPlayerBadges(${userId}) failed:`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// updatePlayerBadges — replace the badges array for a player
// ---------------------------------------------------------------------------

export async function updatePlayerBadges(
  userId: string,
  badges: string[]
): Promise<boolean> {
  try {
    const result = await pool.query(
      `UPDATE players
       SET data = jsonb_set(COALESCE(data, '{}'), '{badges}', $1::jsonb)
       WHERE user_id = $2`,
      [JSON.stringify(badges), userId]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    console.error(`[admin/db] updatePlayerBadges(${userId}) failed:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// updatePlayerPremium — set or clear the premium flag and expiry
// ---------------------------------------------------------------------------

export async function updatePlayerPremium(
  userId: string,
  grant: boolean,
  expiresAt?: Date
): Promise<boolean> {
  try {
    if (grant) {
      const expiry =
        expiresAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const result = await pool.query(
        `UPDATE players
         SET premium_expires_at = $1,
             data = jsonb_set(COALESCE(data, '{}'), '{premium}', 'true'::jsonb)
         WHERE user_id = $2`,
        [expiry.toISOString(), userId]
      );
      return (result.rowCount ?? 0) > 0;
    } else {
      const result = await pool.query(
        `UPDATE players
         SET premium_expires_at = NULL,
             data = jsonb_set(COALESCE(data, '{}'), '{premium}', 'false'::jsonb)
         WHERE user_id = $1`,
        [userId]
      );
      return (result.rowCount ?? 0) > 0;
    }
  } catch (err) {
    console.error(`[admin/db] updatePlayerPremium(${userId}) failed:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// updatePlayerStat — update a single numeric stat field
// ---------------------------------------------------------------------------

const ALLOWED_STATS = new Set([
  "cr",
  "wins",
  "losses",
  "kills",
  "matches",
  "mvp_count",
  "placement_matches",
]);

export async function updatePlayerStat(
  userId: string,
  stat: string,
  value: number
): Promise<boolean> {
  if (!ALLOWED_STATS.has(stat)) {
    console.error(`[admin/db] updatePlayerStat: invalid stat '${stat}'`);
    return false;
  }
  try {
    const result = await pool.query(
      `UPDATE players
       SET data = jsonb_set(COALESCE(data, '{}'), $1::text[], $2::text::jsonb)
       WHERE user_id = $3`,
      [`{${stat}}`, value, userId]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    console.error(
      `[admin/db] updatePlayerStat(${userId}, ${stat}, ${value}) failed:`,
      err
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// updatePlayerStats — update multiple stats at once (partial patch)
// ---------------------------------------------------------------------------

export async function updatePlayerStats(
  userId: string,
  stats: Partial<
    Record<
      | "cr"
      | "wins"
      | "losses"
      | "kills"
      | "matches"
      | "mvp_count"
      | "placement_matches",
      number
    >
  >
): Promise<boolean> {
  const patch: Record<string, number> = {};
  for (const [key, val] of Object.entries(stats)) {
    if (ALLOWED_STATS.has(key) && typeof val === "number" && !isNaN(val)) {
      patch[key] = val;
    }
  }
  if (Object.keys(patch).length === 0) return false;

  try {
    const result = await pool.query(
      `UPDATE players
       SET data = data || $1::jsonb
       WHERE user_id = $2`,
      [JSON.stringify(patch), userId]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    console.error(`[admin/db] updatePlayerStats(${userId}) failed:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// resetPlayerStats — zero out all game stats for a player
// ---------------------------------------------------------------------------

export async function resetPlayerStats(userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `UPDATE players
       SET data = data || '{"cr":0,"wins":0,"losses":0,"kills":0,"matches":0,"mvp_count":0,"placement_matches":0,"ranked":false}'::jsonb
       WHERE user_id = $1`,
      [userId]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    console.error(`[admin/db] resetPlayerStats(${userId}) failed:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// resetAllStats — zero out stats for every player in the DB
// ---------------------------------------------------------------------------

export async function resetAllStats(): Promise<{ affected: number }> {
  try {
    const result = await pool.query(
      `UPDATE players
       SET data = data || '{"cr":0,"wins":0,"losses":0,"kills":0,"matches":0,"mvp_count":0,"placement_matches":0,"ranked":false}'::jsonb`
    );
    return { affected: result.rowCount ?? 0 };
  } catch (err) {
    console.error("[admin/db] resetAllStats failed:", err);
    return { affected: 0 };
  }
}

// ---------------------------------------------------------------------------
// ensurePlayerExists — create a stub player record if one doesn't exist
// ---------------------------------------------------------------------------

export async function ensurePlayerExists(
  userId: string,
  name: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO players (user_id, name, data)
       VALUES ($1, $2, '{}'::jsonb)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, name]
    );
  } catch (err) {
    console.error(`[admin/db] ensurePlayerExists(${userId}) failed:`, err);
  }
}

// ---------------------------------------------------------------------------
// createAuditLog — write an immutable admin action record
// ---------------------------------------------------------------------------

export async function createAuditLog(
  adminId: string,
  action: string,
  details: Record<string, unknown>,
  targetUserId?: string
): Promise<void> {
  await ensureAdminAuditTable();
  try {
    await pool.query(
      `INSERT INTO admin_audit_logs (admin_id, target_user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [adminId, targetUserId ?? null, action, JSON.stringify(details)]
    );
  } catch (err) {
    console.error("[admin/db] createAuditLog failed:", err);
  }
}

// ---------------------------------------------------------------------------
// getAuditLogs — paginated audit log retrieval
// ---------------------------------------------------------------------------

export async function getAuditLogs(
  limit = 20,
  offset = 0,
  targetUserId?: string
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  await ensureAdminAuditTable();
  try {
    const whereClause = targetUserId ? `WHERE aal.target_user_id = $3` : "";
    const params: (string | number)[] = [limit, offset];
    if (targetUserId) params.push(targetUserId);

    const countWhere = targetUserId ? `WHERE target_user_id = $1` : "";
    const countParams = targetUserId ? [targetUserId] : [];

    const [logsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
           aal.id,
           aal.admin_id,
           aal.target_user_id,
           aal.action,
           aal.details,
           aal.created_at,
           COALESCE(p.data->>'display_name', p.data->>'username', aal.target_user_id) AS player_name
         FROM admin_audit_logs aal
         LEFT JOIN players p ON p.user_id = aal.target_user_id
         ${whereClause}
         ORDER BY aal.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM admin_audit_logs ${countWhere}`,
        countParams
      ),
    ]);

    return {
      logs: logsResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  } catch (err) {
    console.error("[admin/db] getAuditLogs failed:", err);
    return { logs: [], total: 0 };
  }
}
