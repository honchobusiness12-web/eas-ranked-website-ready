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
import { writeAuditLog } from "@/lib/admin/audit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerResult {
  user_id: string;
  name: string;
  badges: string[];
  premium: boolean;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  placement_matches: number;
  ranked: boolean;
  blacklisted: boolean;
}

export interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

// ---------------------------------------------------------------------------
// Auth guard — all actions require developer access
// ---------------------------------------------------------------------------

async function requireDeveloper(): Promise<
  { ok: true; adminId: string } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  if (session.userId !== DEVELOPER_USER_ID)
    return { ok: false, error: "Forbidden. Developer access required." };
  return { ok: true, adminId: session.userId };
}

// ---------------------------------------------------------------------------
// Discord helpers (reused from badges route)
// ---------------------------------------------------------------------------

interface RawDiscordMember {
  user: {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
  };
  nick?: string | null;
  roles: string[];
}

async function searchDiscordMembers(
  query: string,
  limit = 10
): Promise<Array<{ userId: string; name: string }>> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!botToken || !guildId) return [];

  try {
    const url = new URL(
      `https://discord.com/api/v10/guilds/${guildId}/members/search`
    );
    url.searchParams.set("query", query);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const members: RawDiscordMember[] = await res.json();
    return members.map((m) => ({
      userId: m.user.id,
      name: m.nick ?? m.user.global_name ?? m.user.username,
    }));
  } catch {
    return [];
  }
}

async function fetchDiscordMember(
  userId: string
): Promise<{ userId: string; name: string } | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!botToken || !guildId) return null;

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) return null;

    const member: RawDiscordMember = await res.json();
    return {
      userId: member.user.id,
      name: member.nick ?? member.user.global_name ?? member.user.username,
    };
  } catch {
    return null;
  }
}

async function ensurePlayerExists(
  userId: string,
  name: string
): Promise<void> {
  await pool.query(
    `INSERT INTO players (user_id, name, data)
     VALUES ($1, $2, '{}'::jsonb)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, name]
  );
}

// ---------------------------------------------------------------------------
// searchPlayers — search by name or Discord ID
// ---------------------------------------------------------------------------

export async function searchPlayers(
  query: string
): Promise<ActionResult<{ players: PlayerResult[] }>> {
  const auth = await requireDeveloper();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!query.trim()) return { success: true, data: { players: [] } };

  try {
    const trimmed = query.trim();
    const isIdSearch = /^\d{17,19}$/.test(trimmed);

    // Query DB
    const dbResult = isIdSearch
      ? await pool.query(
          `SELECT
             user_id,
             COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
             COALESCE(data->'badges', '[]'::jsonb) AS badges,
             COALESCE((data->>'premium')::boolean, false) AS discord_premium,
             premium_expires_at,
             COALESCE((data->>'cr')::int, 0) AS cr,
             COALESCE((data->>'wins')::int, 0) AS wins,
             COALESCE((data->>'losses')::int, 0) AS losses,
             COALESCE((data->>'kills')::int, 0) AS kills,
             COALESCE((data->>'matches')::int, 0) AS matches,
             COALESCE((data->>'mvp_count')::int, 0) AS mvp_count,
             COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
             COALESCE((data->>'ranked')::boolean, false) AS ranked,
             COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted
           FROM players
           WHERE user_id = $1
           LIMIT 10`,
          [trimmed]
        )
      : await pool.query(
          `SELECT
             user_id,
             COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
             COALESCE(data->'badges', '[]'::jsonb) AS badges,
             COALESCE((data->>'premium')::boolean, false) AS discord_premium,
             premium_expires_at,
             COALESCE((data->>'cr')::int, 0) AS cr,
             COALESCE((data->>'wins')::int, 0) AS wins,
             COALESCE((data->>'losses')::int, 0) AS losses,
             COALESCE((data->>'kills')::int, 0) AS kills,
             COALESCE((data->>'matches')::int, 0) AS matches,
             COALESCE((data->>'mvp_count')::int, 0) AS mvp_count,
             COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
             COALESCE((data->>'ranked')::boolean, false) AS ranked,
             COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted
           FROM players
           WHERE name ILIKE $1
              OR COALESCE(data->>'display_name', '') ILIKE $1
              OR COALESCE(data->>'username', '') ILIKE $1
           ORDER BY name ASC
           LIMIT 10`,
          [`%${trimmed}%`]
        );

    const dbPlayers = dbResult.rows;
    const dbIds = new Set(dbPlayers.map((p) => p.user_id));
    const combined = [...dbPlayers];

    // Supplement with Discord members if we have room
    if (combined.length < 10) {
      if (isIdSearch && !dbIds.has(trimmed)) {
        const dm = await fetchDiscordMember(trimmed);
        if (dm) {
          combined.push({
            user_id: dm.userId,
            name: dm.name,
            badges: [],
            discord_premium: false,
            premium_expires_at: null,
            cr: 0,
            wins: 0,
            losses: 0,
            kills: 0,
            matches: 0,
            mvp_count: 0,
            placement_matches: 0,
            ranked: false,
            blacklisted: false,
          });
        }
      } else if (!isIdSearch) {
        const remaining = 10 - combined.length;
        const discordMembers = await searchDiscordMembers(
          trimmed,
          remaining + dbPlayers.length
        );
        for (const dm of discordMembers) {
          if (combined.length >= 10) break;
          if (!dbIds.has(dm.userId)) {
            combined.push({
              user_id: dm.userId,
              name: dm.name,
              badges: [],
              discord_premium: false,
              premium_expires_at: null,
              cr: 0,
              wins: 0,
              losses: 0,
              kills: 0,
              matches: 0,
              mvp_count: 0,
              placement_matches: 0,
              ranked: false,
              blacklisted: false,
            });
          }
        }
      }
    }

    // Normalise badge arrays and premium flag
    const players: PlayerResult[] = combined.map((row) => {
      const rawBadges: unknown = row.badges;
      const badgeArray: string[] = Array.isArray(rawBadges)
        ? (rawBadges as string[])
        : [];
      const hasPremium =
        row.discord_premium === true ||
        (row.premium_expires_at &&
          new Date(row.premium_expires_at) > new Date());

      return {
        user_id: row.user_id,
        name: row.name,
        badges: badgeArray,
        premium: Boolean(hasPremium),
        cr: row.cr ?? 0,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
        kills: row.kills ?? 0,
        matches: row.matches ?? 0,
        mvp_count: row.mvp_count ?? 0,
        placement_matches: row.placement_matches ?? 0,
        ranked: row.ranked ?? false,
        blacklisted: row.blacklisted ?? false,
      };
    });

    return { success: true, data: { players } };
  } catch (err) {
    console.error("[actions] searchPlayers failed:", err);
    return { success: false, error: "Failed to search players" };
  }
}

// ---------------------------------------------------------------------------
// assignBadge — add a badge to a player
// ---------------------------------------------------------------------------

const VALID_BADGE_IDS = new Set(["staff", "contentCreator", "tournamentWinner"]);

export async function assignBadge(
  userId: string,
  badgeId: string
): Promise<ActionResult<{ badges: string[] }>> {
  const auth = await requireDeveloper();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!userId?.trim())
    return { success: false, error: "userId is required" };
  if (!VALID_BADGE_IDS.has(badgeId))
    return {
      success: false,
      error: `badge must be one of: ${Array.from(VALID_BADGE_IDS).join(", ")}`,
    };

  const uid = userId.trim();

  try {
    // Ensure player record exists
    const existsResult = await pool.query(
      `SELECT 1 FROM players WHERE user_id = $1 LIMIT 1`,
      [uid]
    );
    if (existsResult.rowCount === 0) {
      const dm = await fetchDiscordMember(uid);
      const displayName = dm?.name ?? uid;
      await ensurePlayerExists(uid, displayName);
    }

    await assignBadgeRole(uid, badgeId);

    // Fetch updated badge list from DB
    const result = await pool.query(
      `SELECT COALESCE(data->'badges', '[]'::jsonb) AS badges FROM players WHERE user_id = $1 LIMIT 1`,
      [uid]
    );
    const badges: string[] = result.rows[0]?.badges ?? [];

    await writeAuditLog({
      adminId: auth.adminId,
      action: "assign_badge",
      targetUserId: uid,
      details: { badgeId },
      success: true,
    });

    return { success: true, data: { badges } };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to assign badge";
    console.error("[actions] assignBadge failed:", err);

    await writeAuditLog({
      adminId: auth.adminId,
      action: "assign_badge",
      targetUserId: uid,
      details: { badgeId },
      success: false,
      errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

// ---------------------------------------------------------------------------
// removeBadge — remove a badge from a player
// ---------------------------------------------------------------------------

export async function removeBadge(
  userId: string,
  badgeId: string
): Promise<ActionResult<{ badges: string[] }>> {
  const auth = await requireDeveloper();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!userId?.trim())
    return { success: false, error: "userId is required" };
  if (!VALID_BADGE_IDS.has(badgeId))
    return {
      success: false,
      error: `badge must be one of: ${Array.from(VALID_BADGE_IDS).join(", ")}`,
    };

  const uid = userId.trim();

  try {
    await removeBadgeRole(uid, badgeId);

    const result = await pool.query(
      `SELECT COALESCE(data->'badges', '[]'::jsonb) AS badges FROM players WHERE user_id = $1 LIMIT 1`,
      [uid]
    );
    const badges: string[] = result.rows[0]?.badges ?? [];

    await writeAuditLog({
      adminId: auth.adminId,
      action: "remove_badge",
      targetUserId: uid,
      details: { badgeId },
      success: true,
    });

    return { success: true, data: { badges } };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to remove badge";
    console.error("[actions] removeBadge failed:", err);

    await writeAuditLog({
      adminId: auth.adminId,
      action: "remove_badge",
      targetUserId: uid,
      details: { badgeId },
      success: false,
      errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

// ---------------------------------------------------------------------------
// grantPremiumAction — grant premium to a player
// ---------------------------------------------------------------------------

export async function grantPremiumAction(
  userId: string,
  expiresAt?: string
): Promise<ActionResult<{ premium: boolean; source: string | null }>> {
  const auth = await requireDeveloper();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!userId?.trim())
    return { success: false, error: "userId is required" };

  const uid = userId.trim();

  let expiry: Date | undefined;
  if (expiresAt) {
    expiry = new Date(expiresAt);
    if (isNaN(expiry.getTime()))
      return { success: false, error: "Invalid expiresAt date" };
    if (expiry <= new Date())
      return { success: false, error: "expiresAt must be in the future" };
  }

  try {
    await grantPremium(uid, expiry);
    const status = await getPremiumStatus(uid);

    await writeAuditLog({
      adminId: auth.adminId,
      action: "grant_premium",
      targetUserId: uid,
      details: { expiresAt: expiry?.toISOString() ?? null },
      success: true,
    });

    return {
      success: true,
      data: { premium: status.premium, source: status.source },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to grant premium";
    console.error("[actions] grantPremiumAction failed:", err);

    await writeAuditLog({
      adminId: auth.adminId,
      action: "grant_premium",
      targetUserId: uid,
      details: { expiresAt: expiry?.toISOString() ?? null },
      success: false,
      errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

// ---------------------------------------------------------------------------
// revokePremiumAction — revoke manually-granted premium from a player
// ---------------------------------------------------------------------------

export async function revokePremiumAction(
  userId: string
): Promise<ActionResult<{ premium: boolean; source: string | null }>> {
  const auth = await requireDeveloper();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!userId?.trim())
    return { success: false, error: "userId is required" };

  const uid = userId.trim();

  try {
    await revokePremium(uid);
    const status = await getPremiumStatus(uid);

    await writeAuditLog({
      adminId: auth.adminId,
      action: "revoke_premium",
      targetUserId: uid,
      details: {},
      success: true,
    });

    return {
      success: true,
      data: { premium: status.premium, source: status.source },
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to revoke premium";
    console.error("[actions] revokePremiumAction failed:", err);

    await writeAuditLog({
      adminId: auth.adminId,
      action: "revoke_premium",
      targetUserId: uid,
      details: {},
      success: false,
      errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

// ---------------------------------------------------------------------------
// editPlayerStats — update numeric stats for a player
// ---------------------------------------------------------------------------

export interface PlayerStats {
  cr?: number;
  wins?: number;
  losses?: number;
  kills?: number;
  matches?: number;
  mvp_count?: number;
  placement_matches?: number;
}

export async function editPlayerStats(
  userId: string,
  stats: PlayerStats
): Promise<ActionResult<{ player: PlayerResult }>> {
  const auth = await requireDeveloper();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!userId?.trim())
    return { success: false, error: "userId is required" };

  const uid = userId.trim();

  try {
    const check = await pool.query(
      `SELECT user_id FROM players WHERE user_id = $1 LIMIT 1`,
      [uid]
    );
    if (check.rows.length === 0)
      return { success: false, error: "Player not found" };

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
      const val = stats[field];
      if (typeof val === "number" && !isNaN(val)) {
        patch[field] = val;
      }
    }

    if (Object.keys(patch).length === 0)
      return { success: false, error: "No valid stat fields provided" };

    await pool.query(
      `UPDATE players SET data = data || $1::jsonb WHERE user_id = $2`,
      [JSON.stringify(patch), uid]
    );

    const result = await pool.query(
      `SELECT
         user_id,
         COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
         COALESCE(data->'badges', '[]'::jsonb) AS badges,
         COALESCE((data->>'premium')::boolean, false) AS discord_premium,
         premium_expires_at,
         COALESCE((data->>'cr')::int, 0) AS cr,
         COALESCE((data->>'wins')::int, 0) AS wins,
         COALESCE((data->>'losses')::int, 0) AS losses,
         COALESCE((data->>'kills')::int, 0) AS kills,
         COALESCE((data->>'matches')::int, 0) AS matches,
         COALESCE((data->>'mvp_count')::int, 0) AS mvp_count,
         COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
         COALESCE((data->>'ranked')::boolean, false) AS ranked,
         COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted
       FROM players WHERE user_id = $1 LIMIT 1`,
      [uid]
    );

    const row = result.rows[0];
    const player: PlayerResult = {
      user_id: row.user_id,
      name: row.name,
      badges: Array.isArray(row.badges) ? row.badges : [],
      premium:
        row.discord_premium === true ||
        (row.premium_expires_at &&
          new Date(row.premium_expires_at) > new Date()),
      cr: row.cr,
      wins: row.wins,
      losses: row.losses,
      kills: row.kills,
      matches: row.matches,
      mvp_count: row.mvp_count,
      placement_matches: row.placement_matches,
      ranked: row.ranked,
      blacklisted: row.blacklisted,
    };

    await writeAuditLog({
      adminId: auth.adminId,
      action: "edit_stats",
      targetUserId: uid,
      details: { patch },
      success: true,
    });

    return { success: true, data: { player } };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to edit player stats";
    console.error("[actions] editPlayerStats failed:", err);

    await writeAuditLog({
      adminId: auth.adminId,
      action: "edit_stats",
      targetUserId: uid,
      details: { stats },
      success: false,
      errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

// ---------------------------------------------------------------------------
// resetPlayer — reset all stats to zero
// ---------------------------------------------------------------------------

export async function resetPlayer(
  userId: string
): Promise<ActionResult<{ player: PlayerResult }>> {
  const auth = await requireDeveloper();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!userId?.trim())
    return { success: false, error: "userId is required" };

  const uid = userId.trim();

  try {
    const check = await pool.query(
      `SELECT user_id FROM players WHERE user_id = $1 LIMIT 1`,
      [uid]
    );
    if (check.rows.length === 0)
      return { success: false, error: "Player not found" };

    await pool.query(
      `UPDATE players
       SET data = data || '{"cr":0,"wins":0,"losses":0,"kills":0,"matches":0,"mvp_count":0,"placement_matches":0,"ranked":false}'::jsonb
       WHERE user_id = $1`,
      [uid]
    );

    const result = await pool.query(
      `SELECT
         user_id,
         COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
         COALESCE(data->'badges', '[]'::jsonb) AS badges,
         COALESCE((data->>'premium')::boolean, false) AS discord_premium,
         premium_expires_at,
         COALESCE((data->>'cr')::int, 0) AS cr,
         COALESCE((data->>'wins')::int, 0) AS wins,
         COALESCE((data->>'losses')::int, 0) AS losses,
         COALESCE((data->>'kills')::int, 0) AS kills,
         COALESCE((data->>'matches')::int, 0) AS matches,
         COALESCE((data->>'mvp_count')::int, 0) AS mvp_count,
         COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
         COALESCE((data->>'ranked')::boolean, false) AS ranked,
         COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted
       FROM players WHERE user_id = $1 LIMIT 1`,
      [uid]
    );

    const row = result.rows[0];
    const player: PlayerResult = {
      user_id: row.user_id,
      name: row.name,
      badges: Array.isArray(row.badges) ? row.badges : [],
      premium:
        row.discord_premium === true ||
        (row.premium_expires_at &&
          new Date(row.premium_expires_at) > new Date()),
      cr: row.cr,
      wins: row.wins,
      losses: row.losses,
      kills: row.kills,
      matches: row.matches,
      mvp_count: row.mvp_count,
      placement_matches: row.placement_matches,
      ranked: row.ranked,
      blacklisted: row.blacklisted,
    };

    await writeAuditLog({
      adminId: auth.adminId,
      action: "reset_player",
      targetUserId: uid,
      details: {},
      success: true,
    });

    return { success: true, data: { player } };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to reset player";
    console.error("[actions] resetPlayer failed:", err);

    await writeAuditLog({
      adminId: auth.adminId,
      action: "reset_player",
      targetUserId: uid,
      details: {},
      success: false,
      errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}
