"use server";

/**
 * lib/admin/actions.ts
 *
 * Server Actions for the admin system.
 * All business logic lives here — components call these directly.
 * Every action validates admin access, updates the DB, logs the audit, and
 * returns a typed { success, error?, data? } result.
 */

import { getSession } from "@/lib/auth";
import { DEVELOPER_USER_ID, invalidatePremiumStatusCache } from "@/lib/premium";
import { revalidatePath } from "next/cache";
import {
  getPlayer,
  searchPlayers as dbSearchPlayers,
  getPlayerBadges,
  updatePlayerBadges,
  updatePlayerPremium,
  updatePlayerStats,
  resetPlayerStats as dbResetPlayerStats,
  resetAllStats as dbResetAllStats,
  ensurePlayerExists,
  createAuditLog,
  getAuditLogs,
  type AdminPlayer,
  type PlayerSearchResult,
  type AuditLogEntry,
} from "@/lib/admin/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActionResult<T = undefined> =
  | { success: true; data?: T; error?: never }
  | { success: false; error: string; data?: never };

export type { AdminPlayer, PlayerSearchResult, AuditLogEntry };

// ---------------------------------------------------------------------------
// Auth guard — throws if the caller is not the developer
// ---------------------------------------------------------------------------

async function requireAdmin(): Promise<string> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  if (session.userId !== DEVELOPER_USER_ID) {
    throw new Error("Forbidden. Developer access required.");
  }
  return session.userId;
}

// ---------------------------------------------------------------------------
// Discord helpers (inline — no extra module needed)
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
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const member: RawDiscordMember = await res.json();
    return {
      userId: member.user.id,
      name:
        member.nick ?? member.user.global_name ?? member.user.username,
    };
  } catch {
    return null;
  }
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

// ---------------------------------------------------------------------------
// Badge constants
// ---------------------------------------------------------------------------

const VALID_BADGE_IDS = new Set(["staff", "contentCreator", "tournamentWinner"]);

export const BADGE_OPTIONS = [
  {
    id: "staff",
    label: "Staff",
    icon: "👮",
    color: "#00FF88",
    description: "EAS Ranked Staff Member",
  },
  {
    id: "contentCreator",
    label: "Content Creator",
    icon: "🎬",
    color: "#00D4FF",
    description: "Verified Content Creator",
  },
  {
    id: "tournamentWinner",
    label: "Tournament Winner",
    icon: "🏆",
    color: "#FFD700",
    description: "Tournament Champion",
  },
] as const;

// ---------------------------------------------------------------------------
// searchPlayers — DB + Discord combined search
// ---------------------------------------------------------------------------

export async function searchPlayers(
  query: string,
  limit = 20,
  offset = 0
): Promise<
  ActionResult<{ players: PlayerSearchResult[]; total: number }>
> {
  try {
    await requireAdmin();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    const { players: dbPlayers, total } = await dbSearchPlayers(
      query,
      limit,
      offset
    );

    // Supplement with Discord members when searching by name and there's room
    if (query.trim() && dbPlayers.length < limit) {
      const isIdSearch = /^\d{17,19}$/.test(query.trim());
      const dbIds = new Set(dbPlayers.map((p) => p.user_id));
      const combined = [...dbPlayers];

      if (isIdSearch) {
        if (!dbIds.has(query.trim())) {
          const dm = await fetchDiscordMember(query.trim());
          if (dm) {
            combined.push({
              user_id: dm.userId,
              name: dm.name,
              username: null,
              avatar_url: null,
              cr: 0,
              wins: 0,
              losses: 0,
              matches: 0,
              blacklisted: false,
              ranked: false,
            });
          }
        }
      } else {
        const remaining = limit - combined.length;
        const discordMembers = await searchDiscordMembers(
          query.trim(),
          remaining + dbPlayers.length
        );
        for (const dm of discordMembers) {
          if (combined.length >= limit) break;
          if (!dbIds.has(dm.userId)) {
            combined.push({
              user_id: dm.userId,
              name: dm.name,
              username: null,
              avatar_url: null,
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

      return {
        success: true,
        data: { players: combined, total: Math.max(total, combined.length) },
      };
    }

    return { success: true, data: { players: dbPlayers, total } };
  } catch (err) {
    console.error("[admin/actions] searchPlayers failed:", err);
    return { success: false, error: "Failed to search players." };
  }
}

// ---------------------------------------------------------------------------
// getPlayerDetail — fetch full player info
// ---------------------------------------------------------------------------

export async function getPlayerDetail(
  userId: string
): Promise<ActionResult<AdminPlayer>> {
  try {
    await requireAdmin();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    const player = await getPlayer(userId);
    if (!player) {
      return { success: false, error: "Player not found." };
    }
    return { success: true, data: player };
  } catch (err) {
    console.error("[admin/actions] getPlayerDetail failed:", err);
    return { success: false, error: "Failed to fetch player." };
  }
}

// ---------------------------------------------------------------------------
// getPlayerBadgeList — fetch badge IDs for a player
// ---------------------------------------------------------------------------

export async function getPlayerBadgeList(
  userId: string
): Promise<ActionResult<string[]>> {
  try {
    await requireAdmin();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    const badges = await getPlayerBadges(userId);
    return { success: true, data: badges };
  } catch (err) {
    console.error("[admin/actions] getPlayerBadgeList failed:", err);
    return { success: false, error: "Failed to fetch badges." };
  }
}

// ---------------------------------------------------------------------------
// assignBadge — add a badge to a player
// ---------------------------------------------------------------------------

export async function assignBadge(
  userId: string,
  badgeId: string
): Promise<ActionResult<{ badges: string[] }>> {
  let adminId: string;
  try {
    adminId = await requireAdmin();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  if (!VALID_BADGE_IDS.has(badgeId)) {
    return {
      success: false,
      error: `Invalid badge. Must be one of: ${Array.from(VALID_BADGE_IDS).join(", ")}`,
    };
  }

  try {
    // Ensure player record exists (Discord-only users may not have one yet)
    const existing = await getPlayer(userId);
    if (!existing) {
      const dm = await fetchDiscordMember(userId);
      await ensurePlayerExists(userId, dm?.name ?? userId);
    }

    const current = await getPlayerBadges(userId);
    if (current.includes(badgeId)) {
      return { success: true, data: { badges: current } };
    }

    const updated = [...new Set([...current, badgeId])];
    const ok = await updatePlayerBadges(userId, updated);
    if (!ok) {
      return { success: false, error: "Failed to update badges in database." };
    }

    // Invalidate cache and revalidate public pages
    invalidatePremiumStatusCache(userId);
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/leaderboard");
    revalidatePath("/admin/badges");

    // Audit log
    await createAuditLog(
      adminId,
      "assign_badge",
      { badgeId, previousBadges: current, newBadges: updated },
      userId
    );

    return { success: true, data: { badges: updated } };
  } catch (err) {
    console.error("[admin/actions] assignBadge failed:", err);
    return { success: false, error: "Failed to assign badge." };
  }
}

// ---------------------------------------------------------------------------
// removeBadge — remove a badge from a player
// ---------------------------------------------------------------------------

export async function removeBadge(
  userId: string,
  badgeId: string
): Promise<ActionResult<{ badges: string[] }>> {
  let adminId: string;
  try {
    adminId = await requireAdmin();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  if (!VALID_BADGE_IDS.has(badgeId)) {
    return {
      success: false,
      error: `Invalid badge. Must be one of: ${Array.from(VALID_BADGE_IDS).join(", ")}`,
    };
  }

  try {
    const current = await getPlayerBadges(userId);
    if (!current.includes(badgeId)) {
      return { success: true, data: { badges: current } };
    }

    const updated = current.filter((b) => b !== badgeId);
    const ok = await updatePlayerBadges(userId, updated);
    if (!ok) {
      return { success: false, error: "Failed to update badges in database." };
    }

    invalidatePremiumStatusCache(userId);
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/leaderboard");
    revalidatePath("/admin/badges");

    await createAuditLog(
      adminId,
      "remove_badge",
      { badgeId, previousBadges: current, newBadges: updated },
      userId
    );

    return { success: true, data: { badges: updated } };
  } catch (err) {
    console.error("[admin/actions] removeBadge failed:", err);
    return { success: false, error: "Failed to remove badge." };
  }
}

// ---------------------------------------------------------------------------
// grantPremium — grant premium access to a player
// ---------------------------------------------------------------------------

export async function grantPremium(
  userId: string,
  expiresAt?: Date
): Promise<ActionResult<{ premium: boolean }>> {
  let adminId: string;
  try {
    adminId = await requireAdmin();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    const ok = await updatePlayerPremium(userId, true, expiresAt);
    if (!ok) {
      return {
        success: false,
        error: "Player not found or update failed.",
      };
    }

    invalidatePremiumStatusCache(userId);
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/leaderboard");
    revalidatePath("/admin/badges");

    await createAuditLog(
      adminId,
      "grant_premium",
      {
        expiresAt: expiresAt?.toISOString() ?? "1 year from now",
      },
      userId
    );

    return { success: true, data: { premium: true } };
  } catch (err) {
    console.error("[admin/actions] grantPremium failed:", err);
    return { success: false, error: "Failed to grant premium." };
  }
}

// ---------------------------------------------------------------------------
// revokePremium — revoke manually-granted premium from a player
// ---------------------------------------------------------------------------

export async function revokePremium(
  userId: string
): Promise<ActionResult<{ premium: boolean }>> {
  let adminId: string;
  try {
    adminId = await requireAdmin();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    const ok = await updatePlayerPremium(userId, false);
    if (!ok) {
      return {
        success: false,
        error: "Player not found or update failed.",
      };
    }

    invalidatePremiumStatusCache(userId);
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/leaderboard");
    revalidatePath("/admin/badges");

    await createAuditLog(adminId, "revoke_premium", {}, userId);

    return { success: true, data: { premium: false } };
  } catch (err) {
    console.error("[admin/actions] revokePremium failed:", err);
    return { success: false, error: "Failed to revoke premium." };
  }
}

// ---------------------------------------------------------------------------
// editPlayerStats — update one or more stats for a player
// ---------------------------------------------------------------------------

export async function editPlayerStats(
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
): Promise<ActionResult<AdminPlayer>> {
  let adminId: string;
  try {
    adminId = await requireAdmin();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  if (Object.keys(stats).length === 0) {
    return { success: false, error: "No stats provided." };
  }

  try {
    const ok = await updatePlayerStats(userId, stats);
    if (!ok) {
      return {
        success: false,
        error: "Player not found or update failed.",
      };
    }

    revalidatePath(`/profile/${userId}`);
    revalidatePath("/leaderboard");

    await createAuditLog(adminId, "edit_stats", { stats }, userId);

    const updated = await getPlayer(userId);
    if (!updated) {
      return { success: false, error: "Failed to fetch updated player." };
    }

    return { success: true, data: updated };
  } catch (err) {
    console.error("[admin/actions] editPlayerStats failed:", err);
    return { success: false, error: "Failed to update player stats." };
  }
}

// ---------------------------------------------------------------------------
// resetPlayerStats — zero out all game stats for a single player
// ---------------------------------------------------------------------------

export async function resetPlayerStats(
  userId: string
): Promise<ActionResult<AdminPlayer>> {
  let adminId: string;
  try {
    adminId = await requireAdmin();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    const ok = await dbResetPlayerStats(userId);
    if (!ok) {
      return {
        success: false,
        error: "Player not found or reset failed.",
      };
    }

    revalidatePath(`/profile/${userId}`);
    revalidatePath("/leaderboard");

    await createAuditLog(adminId, "reset_player_stats", {}, userId);

    const updated = await getPlayer(userId);
    if (!updated) {
      return { success: false, error: "Failed to fetch updated player." };
    }

    return { success: true, data: updated };
  } catch (err) {
    console.error("[admin/actions] resetPlayerStats failed:", err);
    return { success: false, error: "Failed to reset player stats." };
  }
}

// ---------------------------------------------------------------------------
// resetAllStats — zero out stats for every player (nuclear option)
// ---------------------------------------------------------------------------

export async function resetAllStats(): Promise<
  ActionResult<{ affected: number }>
> {
  let adminId: string;
  try {
    adminId = await requireAdmin();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    const { affected } = await dbResetAllStats();

    revalidatePath("/leaderboard");
    revalidatePath("/");

    await createAuditLog(adminId, "reset_all_stats", { affected });

    return { success: true, data: { affected } };
  } catch (err) {
    console.error("[admin/actions] resetAllStats failed:", err);
    return { success: false, error: "Failed to reset all stats." };
  }
}

// ---------------------------------------------------------------------------
// fetchAuditLog — paginated audit log retrieval
// ---------------------------------------------------------------------------

export async function fetchAuditLog(
  limit = 20,
  offset = 0,
  targetUserId?: string
): Promise<ActionResult<{ logs: AuditLogEntry[]; total: number }>> {
  try {
    await requireAdmin();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  try {
    const result = await getAuditLogs(limit, offset, targetUserId);
    return { success: true, data: result };
  } catch (err) {
    console.error("[admin/actions] fetchAuditLog failed:", err);
    return { success: false, error: "Failed to fetch audit log." };
  }
}
