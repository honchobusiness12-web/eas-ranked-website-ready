import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { addBadgeToPlayer, getBadgesForPlayer, ensureBadgeTables } from '@/lib/badges';
import { pool } from '@/lib/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensurePlayerExists(userId: string): Promise<void> {
  // Try to resolve a display name from Discord
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  let displayName = userId;

  if (botToken && guildId) {
    try {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
        {
          headers: { Authorization: `Bot ${botToken}` },
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const member = await res.json();
        displayName =
          member.nick ?? member.user?.global_name ?? member.user?.username ?? userId;
      }
    } catch {
      // ignore
    }
  }

  await pool.query(
    `INSERT INTO players (user_id, name, data)
     VALUES ($1, $2, '{}'::jsonb)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, displayName]
  );
}

// ---------------------------------------------------------------------------
// POST /api/admin/badges/add
// Body: { userId, badgeId, reason? }
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Forbidden. Developer access required.' }, { status: 403 });
  }

  let body: { userId?: string; badgeId?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { userId, badgeId, reason } = body;

  if (!userId?.trim()) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  if (!badgeId?.trim()) {
    return NextResponse.json({ error: 'badgeId is required' }, { status: 400 });
  }

  try {
    await ensureBadgeTables();

    // Verify badge exists in definitions
    const defCheck = await pool.query(
      `SELECT id FROM badge_definitions WHERE id = $1 LIMIT 1`,
      [badgeId.trim()]
    );
    if (defCheck.rows.length === 0) {
      return NextResponse.json({ error: `Badge '${badgeId}' not found in definitions` }, { status: 400 });
    }

    // Ensure player record exists
    const playerCheck = await pool.query(
      `SELECT 1 FROM players WHERE user_id = $1 LIMIT 1`,
      [userId.trim()]
    );
    if (playerCheck.rowCount === 0) {
      await ensurePlayerExists(userId.trim());
    }

    await addBadgeToPlayer(
      userId.trim(),
      badgeId.trim(),
      session.userId,
      reason?.trim() || undefined
    );

    const badges = await getBadgesForPlayer(userId.trim());
    return NextResponse.json({ success: true, userId: userId.trim(), badgeId: badgeId.trim(), badges });
  } catch (err) {
    console.error('[api/admin/badges/add] POST failed:', err);
    return NextResponse.json({ error: 'Failed to add badge' }, { status: 500 });
  }
}
