import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { getBadgesForPlayer } from '@/lib/badges';
import { pool } from '@/lib/db';

// ---------------------------------------------------------------------------
// GET /api/admin/badges/player/[userId]
// Returns all badges for a specific player.
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Forbidden. Developer access required.' }, { status: 403 });
  }

  const { userId } = await context.params;

  try {
    const [badges, playerResult] = await Promise.all([
      getBadgesForPlayer(userId),
      pool.query(
        `SELECT
           user_id,
           COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
           data->>'username'   AS username,
           data->>'avatar_url' AS avatar_url
         FROM players
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
      ),
    ]);

    const player = playerResult.rows[0] ?? null;

    return NextResponse.json({ userId, player, badges });
  } catch (err) {
    console.error(`[api/admin/badges/player/${userId}] GET failed:`, err);
    return NextResponse.json({ error: 'Failed to fetch player badges' }, { status: 500 });
  }
}
