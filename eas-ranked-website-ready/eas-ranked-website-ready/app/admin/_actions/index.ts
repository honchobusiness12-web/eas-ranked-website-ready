"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import {
  DEVELOPER_USER_ID,
  assignBadgeRole,
  removeBadgeRole,
  getUserBadges,
  grantPremium,
  revokePremium,
} from "@/lib/premium";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PlayerStats {
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  placement_matches: number;
}

export interface PlayerDetail {
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
}

export interface PlayerRow {
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

export interface BadgeInfo {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  user_id: string;
  admin_id: string;
  changes: Record<string, unknown>;
  created_at: string;
  player_name: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAdmin(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.userId !== DEVELOPER_USER_ID) throw new Error("Forbidden");
  return session.userId;
}

async function ensureAuditTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      action      VARCHAR(64) NOT NULL,
      user_id     VARCHAR(32) NOT NULL,
      admin_id    VARCHAR(32) NOT NULL,
      changes     JSONB       NOT NULL DEFAULT '{}',
      created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id)
  `).catch(() => {});
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)
  `).catch(() => {});
}

async function writeAuditLog(
  action: string,
  userId: string,
  adminId: string,
  changes: Record<string, unknown>
): Promise<void> {
  try {
    await ensureAuditTable();
    await pool.query(
      `INSERT INTO audit_logs (action, user_id, admin_id, changes)
       VALUES ($1, $2, $3, $4)`,
      [action, userId, adminId, JSON.stringify(changes)]
    );
  } catch (err) {
    console.error("[audit_logs] writeAuditLog failed:", err);
  }
}

// ---------------------------------------------------------------------------
// searchPlayers — search DB + Discord
// ---------------------------------------------------------------------------

export async function searchPlayers(
  query: string
): Promise<ActionResult<PlayerRow[]>> {
  try {
    await requireAdmin();
    const trimmed = query.trim();
    if (!trimmed) return { success: true, data: [] };

    const isIdSearch = /^\d{17,19}$/.test(trimmed);

    const dbResult = isIdSearch
      ? await pool.query(
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
           WHERE user_id = $1
           LIMIT 10`,
          [trimmed]
        )
      : await pool.query(
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
           WHERE LOWER(COALESCE(data->>'display_name', '')) LIKE $1
              OR LOWER(COALESCE(data->>'username', ''))      LIKE $1
              OR LOWER(name)                                  LIKE $1
           ORDER BY cr DESC
           LIMIT 10`,
          [`%${trimmed.toLowerCase()}%`]
        );

    const players: PlayerRow[] = dbResult.rows;
    const dbIds = new Set(players.map((p) => p.user_id));

    // Supplement with Discord members if room remains
    if (players.length < 10) {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      const guildId = process.env.DISCORD_GUILD_ID;
      if (botToken && guildId) {
        try {
          if (isIdSearch && !dbIds.has(trimmed)) {
            const res = await fetch(
              `https://discord.com/api/v10/guilds/${guildId}/members/${trimmed}`,
              {
                headers: { Authorization: `Bot ${botToken}` },
                cache: "no-store",
              }
            );
            if (res.ok) {
              const m = await res.json();
              players.push({
                user_id: m.user.id,
                name: m.nick ?? m.user.global_name ?? m.user.username,
                username: m.user.username,
                avatar_url: m.user.avatar
                  ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=128`
                  : null,
                cr: 0,
                wins: 0,
                losses: 0,
                matches: 0,
                blacklisted: false,
                ranked: false,
              });
            }
          } else if (!isIdSearch) {
            const url = new URL(
              `https://discord.com/api/v10/guilds/${guildId}/members/search`
            );
            url.searchParams.set("query", trimmed);
            url.searchParams.set("limit", "10");
            const res = await fetch(url.toString(), {
              headers: { Authorization: `Bot ${botToken}` },
              cache: "no-store",
            });
            if (res.ok) {
              const members = await res.json();
              for (const m of members) {
                if (players.length >= 10) break;
                if (!dbIds.has(m.user.id)) {
                  players.push({
                    user_id: m.user.id,
                    name: m.nick ?? m.user.global_name ?? m.user.username,
                    username: m.user.username,
                    avatar_url: m.user.avatar
                      ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=128`
                      : null,
                    cr: 0,
                    wins: 0,
                    losses: 0,
                    matches: 0,
                    blacklisted: false,
                    ranked: false,
                  });
                }
              }
            }
          }
        } catch (err) {
          console.warn("[searchPlayers] Discord search failed:", err);
        }
      }
    }

    return { success: true, data: players };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Search failed";
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// getPlayerDetail — fetch full player detail
// ---------------------------------------------------------------------------

export async function getPlayerDetail(
  userId: string
): Promise<ActionResult<PlayerDetail>> {
  try {
    await requireAdmin();
    const result = await pool.query(
      `SELECT
         user_id,
         COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
         data->>'username'   AS username,
         data->>'avatar_url' AS avatar_url,
         COALESCE((data->>'cr')::int, 0)      AS cr,
         COALESCE((data->>'wins')::int, 0)     AS wins,
         COALESCE((data->>'losses')::int, 0)   AS losses,
         COALESCE((data->>'kills')::int, 0)    AS kills,
         COALESCE((data->>'matches')::int, 0)  AS matches,
         COALESCE((data->>'mvp_count')::int, 0) AS mvp_count,
         COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
         COALESCE((data->>'ranked')::boolean, false)      AS ranked,
         COALESCE((data->>'registered')::boolean, false)  AS registered,
         COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted,
         premium_expires_at
       FROM players
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return { success: false, error: "Player not found" };
    }
    return { success: true, data: result.rows[0] as PlayerDetail };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch player";
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// assignBadge — assign badge + audit log
// ---------------------------------------------------------------------------

export async function assignBadge(
  userId: string,
  badgeId: string
): Promise<ActionResult<BadgeInfo[]>> {
  try {
    const adminId = await requireAdmin();

    // Ensure player record exists
    const check = await pool.query(
      `SELECT 1 FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (check.rowCount === 0) {
      // Try to create a stub from Discord
      const botToken = process.env.DISCORD_BOT_TOKEN;
      const guildId = process.env.DISCORD_GUILD_ID;
      let displayName = userId;
      if (botToken && guildId) {
        try {
          const res = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
            { headers: { Authorization: `Bot ${botToken}` }, cache: "no-store" }
          );
          if (res.ok) {
            const m = await res.json();
            displayName = m.nick ?? m.user.global_name ?? m.user.username;
          }
        } catch {}
      }
      await pool.query(
        `INSERT INTO players (user_id, name, data) VALUES ($1, $2, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING`,
        [userId, displayName]
      );
    }

    // Get current badges for audit log
    const before = await getUserBadges(userId);
    await assignBadgeRole(userId, badgeId);
    const after = await getUserBadges(userId);

    await writeAuditLog("assign_badge", userId, adminId, {
      badge: badgeId,
      before: before.map((b) => b.id),
      after: after.map((b) => b.id),
    });

    revalidatePath("/admin/badges");
    revalidatePath("/admin/players");

    return { success: true, data: after };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to assign badge";
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// removeBadge — remove badge + audit log
// ---------------------------------------------------------------------------

export async function removeBadge(
  userId: string,
  badgeId: string
): Promise<ActionResult<BadgeInfo[]>> {
  try {
    const adminId = await requireAdmin();
    const before = await getUserBadges(userId);
    await removeBadgeRole(userId, badgeId);
    const after = await getUserBadges(userId);

    await writeAuditLog("remove_badge", userId, adminId, {
      badge: badgeId,
      before: before.map((b) => b.id),
      after: after.map((b) => b.id),
    });

    revalidatePath("/admin/badges");
    revalidatePath("/admin/players");

    return { success: true, data: after };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to remove badge";
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// grantPremiumAction — grant premium + audit log
// ---------------------------------------------------------------------------

export async function grantPremiumAction(
  userId: string,
  expiresAt?: string
): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();

    // Snapshot before state
    const beforeResult = await pool.query(
      `SELECT premium_expires_at FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const before = beforeResult.rows[0]?.premium_expires_at ?? null;

    const expiry = expiresAt ? new Date(expiresAt) : undefined;
    await grantPremium(userId, expiry);

    const afterResult = await pool.query(
      `SELECT premium_expires_at FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const after = afterResult.rows[0]?.premium_expires_at ?? null;

    await writeAuditLog("grant_premium", userId, adminId, {
      before: { premium_expires_at: before },
      after: { premium_expires_at: after },
    });

    revalidatePath("/admin/premium");
    revalidatePath("/admin/players");

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to grant premium";
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// revokePremiumAction — revoke premium + audit log
// ---------------------------------------------------------------------------

export async function revokePremiumAction(userId: string): Promise<ActionResult> {
  try {
    const adminId = await requireAdmin();

    const beforeResult = await pool.query(
      `SELECT premium_expires_at FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const before = beforeResult.rows[0]?.premium_expires_at ?? null;

    await revokePremium(userId);

    await writeAuditLog("revoke_premium", userId, adminId, {
      before: { premium_expires_at: before },
      after: { premium_expires_at: null },
    });

    revalidatePath("/admin/premium");
    revalidatePath("/admin/players");

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to revoke premium";
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// updatePlayerStats — update stats + audit log
// ---------------------------------------------------------------------------

export async function updatePlayerStats(
  userId: string,
  stats: Partial<PlayerStats>
): Promise<ActionResult<PlayerDetail>> {
  try {
    const adminId = await requireAdmin();

    // Snapshot before
    const beforeResult = await pool.query(
      `SELECT
         COALESCE((data->>'cr')::int, 0)      AS cr,
         COALESCE((data->>'wins')::int, 0)     AS wins,
         COALESCE((data->>'losses')::int, 0)   AS losses,
         COALESCE((data->>'kills')::int, 0)    AS kills,
         COALESCE((data->>'matches')::int, 0)  AS matches,
         COALESCE((data->>'mvp_count')::int, 0) AS mvp_count,
         COALESCE((data->>'placement_matches')::int, 0) AS placement_matches
       FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (beforeResult.rows.length === 0) {
      return { success: false, error: "Player not found" };
    }
    const before = beforeResult.rows[0];

    // Build patch
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

    await writeAuditLog("update_stats", userId, adminId, {
      before,
      after: { ...before, ...patch },
      changed: Object.keys(patch),
    });

    // Return updated player
    const updated = await getPlayerDetail(userId);
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/admin/players");
    revalidatePath("/leaderboard");

    return updated;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update stats";
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// resetPlayerStats — reset single player stats + audit log
// ---------------------------------------------------------------------------

export async function resetPlayerStats(
  userId: string
): Promise<ActionResult<PlayerDetail>> {
  try {
    const adminId = await requireAdmin();

    const beforeResult = await pool.query(
      `SELECT
         COALESCE((data->>'cr')::int, 0)      AS cr,
         COALESCE((data->>'wins')::int, 0)     AS wins,
         COALESCE((data->>'losses')::int, 0)   AS losses,
         COALESCE((data->>'kills')::int, 0)    AS kills,
         COALESCE((data->>'matches')::int, 0)  AS matches,
         COALESCE((data->>'mvp_count')::int, 0) AS mvp_count,
         COALESCE((data->>'placement_matches')::int, 0) AS placement_matches
       FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (beforeResult.rows.length === 0) {
      return { success: false, error: "Player not found" };
    }
    const before = beforeResult.rows[0];

    await pool.query(
      `UPDATE players
       SET data = data || '{"cr":0,"wins":0,"losses":0,"kills":0,"matches":0,"mvp_count":0,"placement_matches":0,"ranked":false}'::jsonb
       WHERE user_id = $1`,
      [userId]
    );

    await writeAuditLog("reset_player_stats", userId, adminId, {
      before,
      after: {
        cr: 0,
        wins: 0,
        losses: 0,
        kills: 0,
        matches: 0,
        mvp_count: 0,
        placement_matches: 0,
        ranked: false,
      },
    });

    const updated = await getPlayerDetail(userId);
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/admin/players");
    revalidatePath("/leaderboard");

    return updated;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to reset stats";
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// resetAllStats — reset ALL player stats + audit log
// ---------------------------------------------------------------------------

export async function resetAllStats(): Promise<ActionResult<{ count: number }>> {
  try {
    const adminId = await requireAdmin();

    const countResult = await pool.query(`SELECT COUNT(*) AS count FROM players`);
    const count = parseInt(countResult.rows[0].count, 10);

    await pool.query(
      `UPDATE players
       SET data = data || '{"cr":0,"wins":0,"losses":0,"kills":0,"matches":0,"mvp_count":0,"placement_matches":0,"ranked":false}'::jsonb`
    );

    await writeAuditLog("reset_all_stats", "ALL", adminId, {
      players_affected: count,
      reset_fields: [
        "cr",
        "wins",
        "losses",
        "kills",
        "matches",
        "mvp_count",
        "placement_matches",
        "ranked",
      ],
    });

    revalidatePath("/admin/players");
    revalidatePath("/leaderboard");
    revalidatePath("/");

    return { success: true, data: { count } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to reset all stats";
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// getAuditLogs — fetch audit log entries
// ---------------------------------------------------------------------------

export async function getAuditLogs(opts: {
  limit?: number;
  offset?: number;
  userId?: string;
  action?: string;
}): Promise<ActionResult<{ logs: AuditLogEntry[]; total: number }>> {
  try {
    await requireAdmin();
    await ensureAuditTable();

    const limit = Math.min(opts.limit ?? 20, 100);
    const offset = opts.offset ?? 0;

    const conditions: string[] = [];
    const params: unknown[] = [limit, offset];
    let paramIdx = 3;

    if (opts.userId) {
      conditions.push(`a.user_id = $${paramIdx++}`);
      params.push(opts.userId);
    }
    if (opts.action) {
      conditions.push(`a.action = $${paramIdx++}`);
      params.push(opts.action);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [logsResult, countResult] = await Promise.all([
      pool.query(
        `SELECT
           a.id,
           a.action,
           a.user_id,
           a.admin_id,
           a.changes,
           a.created_at,
           COALESCE(p.data->>'display_name', p.data->>'username', p.name) AS player_name
         FROM audit_logs a
         LEFT JOIN players p ON p.user_id = a.user_id
         ${where}
         ORDER BY a.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM audit_logs a ${where}`,
        params.slice(2)
      ),
    ]);

    return {
      success: true,
      data: {
        logs: logsResult.rows as AuditLogEntry[],
        total: parseInt(countResult.rows[0].count, 10),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch audit logs";
    return { success: false, error: msg };
  }
}
