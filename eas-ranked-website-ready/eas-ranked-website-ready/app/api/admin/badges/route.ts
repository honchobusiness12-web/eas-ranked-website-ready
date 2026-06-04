import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DEVELOPER_USER_ID } from "@/lib/premium";
import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Discord API helpers
// ---------------------------------------------------------------------------

interface RawDiscordMember {
  user: { id: string; username: string; global_name?: string | null; avatar?: string | null };
  nick?: string | null;
  roles: string[];
}

/**
 * Search Discord guild members by username prefix using the Discord bot token.
 * Uses GET /guilds/{guild}/members/search?query=xxx&limit=10
 * Returns up to `limit` members whose username or nickname matches the query.
 */
async function searchDiscordMembers(
  query: string,
  limit = 10
): Promise<Array<{ userId: string; name: string }>> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId  = process.env.DISCORD_GUILD_ID;
  if (!botToken || !guildId) return [];

  try {
    const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[api/admin/badges] Discord member search failed: HTTP ${res.status}`);
      return [];
    }

    const members: RawDiscordMember[] = await res.json();
    return members.map((m) => ({
      userId: m.user.id,
      name: m.nick ?? m.user.global_name ?? m.user.username,
    }));
  } catch (err) {
    console.error("[api/admin/badges] searchDiscordMembers error:", err);
    return [];
  }
}

/**
 * Fetch a single Discord guild member by their user ID.
 * Returns null if the member is not in the guild or the request fails.
 */
async function fetchDiscordMember(
  userId: string
): Promise<{ userId: string; name: string } | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId  = process.env.DISCORD_GUILD_ID;
  if (!botToken || !guildId) return null;

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
      {
        headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn(`[api/admin/badges] Discord fetch member ${userId} failed: HTTP ${res.status}`);
      return null;
    }

    const member: RawDiscordMember = await res.json();
    return {
      userId: member.user.id,
      name: member.nick ?? member.user.global_name ?? member.user.username,
    };
  } catch (err) {
    console.error(`[api/admin/badges] fetchDiscordMember(${userId}) error:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Developer-only check
// ---------------------------------------------------------------------------

function isDeveloper(userId: string): boolean {
  return userId === DEVELOPER_USER_ID;
}

// ---------------------------------------------------------------------------
// GET /api/admin/badges
//   ?userId=xxx   — get player info for a single user
//   ?search=xxx   — search by name or Discord ID (17-19 digit snowflake)
//
// NOTE: Badge assignment/removal is now handled by the new badge system
// endpoints: /api/admin/badges/add and /api/admin/badges/remove.
// This route is kept for player search/lookup only.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDeveloper(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  const search = req.nextUrl.searchParams.get("search");

  // ------------------------------------------------------------------
  // Single user lookup
  // ------------------------------------------------------------------
  if (userId) {
    try {
      const dbResult = await pool.query(
        `SELECT user_id, name FROM players WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      const player = dbResult.rows[0] ?? null;
      return NextResponse.json({
        userId,
        name: player?.name ?? null,
      });
    } catch (err) {
      console.error("[api/admin/badges] GET single user failed:", err);
      return NextResponse.json({ error: "Failed to fetch player" }, { status: 500 });
    }
  }

  // ------------------------------------------------------------------
  // Search players by name or Discord ID
  // ------------------------------------------------------------------
  if (search) {
    try {
      const trimmed = search.trim();
      const isIdSearch = /^\d{17,19}$/.test(trimmed);

      const dbResult = isIdSearch
        ? await pool.query(
            `SELECT user_id, name FROM players WHERE user_id = $1 LIMIT 10`,
            [trimmed]
          )
        : await pool.query(
            `SELECT user_id, name FROM players
             WHERE name ILIKE $1
                OR COALESCE(data->>'display_name', '') ILIKE $1
                OR COALESCE(data->>'username', '') ILIKE $1
             ORDER BY name ASC
             LIMIT 10`,
            [`%${trimmed}%`]
          );

      const dbPlayers: Array<{ user_id: string; name: string }> = dbResult.rows;
      const dbIds = new Set(dbPlayers.map((p) => p.user_id));
      const combined = [...dbPlayers];

      if (combined.length < 10) {
        if (isIdSearch) {
          if (!dbIds.has(trimmed)) {
            const discordMember = await fetchDiscordMember(trimmed);
            if (discordMember) {
              combined.push({ user_id: discordMember.userId, name: discordMember.name });
            }
          }
        } else {
          const remaining = 10 - combined.length;
          const discordMembers = await searchDiscordMembers(trimmed, remaining + dbPlayers.length);
          for (const dm of discordMembers) {
            if (combined.length >= 10) break;
            if (!dbIds.has(dm.userId)) {
              combined.push({ user_id: dm.userId, name: dm.name });
            }
          }
        }
      }

      return NextResponse.json({ players: combined });
    } catch (err) {
      console.error("[api/admin/badges] GET search failed:", err);
      return NextResponse.json({ error: "Failed to search players" }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Provide ?userId=xxx or ?search=xxx" },
    { status: 400 }
  );
}
