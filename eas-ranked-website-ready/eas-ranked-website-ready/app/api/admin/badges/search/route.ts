import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { pool } from '@/lib/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RawDiscordMember {
  user: { id: string; username: string; global_name?: string | null; avatar?: string | null };
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
    const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members/search`);
    url.searchParams.set('query', query);
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
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
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
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

// ---------------------------------------------------------------------------
// GET /api/admin/badges/search?q=query
// Search players by Discord ID, Discord username, or Roblox username.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Forbidden. Developer access required.' }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q || q.length < 2) {
    return NextResponse.json({ players: [] });
  }

  try {
    const isIdSearch = /^\d{17,19}$/.test(q);

    // --- DB search ---
    const dbResult = isIdSearch
      ? await pool.query(
          `SELECT
             user_id,
             COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
             data->>'username'   AS username,
             data->>'avatar_url' AS avatar_url
           FROM players
           WHERE user_id = $1
           LIMIT 10`,
          [q]
        )
      : await pool.query(
          `SELECT
             user_id,
             COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
             data->>'username'   AS username,
             data->>'avatar_url' AS avatar_url
           FROM players
           WHERE
             LOWER(COALESCE(data->>'display_name', '')) LIKE $1
             OR LOWER(COALESCE(data->>'username', ''))   LIKE $1
             OR LOWER(COALESCE(data->>'roblox_username', '')) LIKE $1
           ORDER BY name ASC
           LIMIT 10`,
          [`%${q.toLowerCase()}%`]
        );

    const dbPlayers = dbResult.rows as Array<{
      user_id: string;
      name: string;
      username: string | null;
      avatar_url: string | null;
    }>;
    const dbIds = new Set(dbPlayers.map((p) => p.user_id));
    const combined = [...dbPlayers];

    // --- Supplement with Discord members ---
    if (combined.length < 10) {
      if (isIdSearch && !dbIds.has(q)) {
        const dm = await fetchDiscordMember(q);
        if (dm) {
          combined.push({ user_id: dm.userId, name: dm.name, username: null, avatar_url: null });
        }
      } else if (!isIdSearch) {
        const remaining = 10 - combined.length;
        const discordMembers = await searchDiscordMembers(q, remaining + dbPlayers.length);
        for (const dm of discordMembers) {
          if (combined.length >= 10) break;
          if (!dbIds.has(dm.userId)) {
            combined.push({ user_id: dm.userId, name: dm.name, username: null, avatar_url: null });
          }
        }
      }
    }

    return NextResponse.json({ players: combined });
  } catch (err) {
    console.error('[api/admin/badges/search] GET failed:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
