import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID, invalidatePremiumStatusCache } from '@/lib/premium';
import { ensureBadgeTables, MAIN_GUILD_ID } from '@/lib/badges';
import { pool } from '@/lib/db';

// ---------------------------------------------------------------------------
// POST /api/admin/badges/cleanup-legacy
//
// Developer-only endpoint that removes all legacy badge IDs
// (contentCreator, tournamentWinner, staff) from every player's
// players.data->'badges' JSON array, logs each removal to
// badge_audit_log, invalidates caches, and revalidates pages.
//
// Returns:
//   { success, affectedUsers, badgesRemoved, message }
// ---------------------------------------------------------------------------

const LEGACY_BADGE_IDS = ['contentCreator', 'tournamentWinner', 'staff'] as const;

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json(
      { error: 'Forbidden. Developer access required.' },
      { status: 403 }
    );
  }

  try {
    await ensureBadgeTables();

    // ── 1. Find all users that still have at least one legacy badge ──────────
    const usersResult = await pool.query<{ user_id: string }>(`
      SELECT DISTINCT user_id::VARCHAR(32) AS user_id
      FROM players
      WHERE data->'badges' IS NOT NULL
        AND (
          data->'badges' @> '"contentCreator"'::jsonb
          OR data->'badges' @> '"tournamentWinner"'::jsonb
          OR data->'badges' @> '"staff"'::jsonb
        )
    `);

    const affectedUsers = usersResult.rows.map((r) => r.user_id);

    if (affectedUsers.length === 0) {
      return NextResponse.json({
        success: true,
        affectedUsers: 0,
        badgesRemoved: 0,
        message: 'No legacy badges found — nothing to clean up.',
      });
    }

    let totalBadgesRemoved = 0;

    // ── 2. For each affected user, remove each legacy badge and log it ───────
    for (const userId of affectedUsers) {
      // Fetch current badges for this user so we only log what they actually have
      const playerResult = await pool.query<{ badges: string[] }>(
        `SELECT COALESCE(data->'badges', '[]'::jsonb) AS badges FROM players WHERE user_id = $1 LIMIT 1`,
        [userId]
      );

      const currentBadges: string[] = playerResult.rows[0]?.badges ?? [];

      for (const badgeId of LEGACY_BADGE_IDS) {
        if (!currentBadges.includes(badgeId)) continue;

        // Remove from legacy players.data->'badges' array
        await pool.query(
          `UPDATE players
           SET data = jsonb_set(
             COALESCE(data, '{}'),
             '{badges}',
             (
               SELECT COALESCE(jsonb_agg(b), '[]'::jsonb)
               FROM jsonb_array_elements_text(COALESCE(data->'badges', '[]'::jsonb)) AS b
               WHERE b != $2
             )
           )
           WHERE user_id = $1`,
          [userId, badgeId]
        );

        // Write audit log entry
        await pool.query(
          `INSERT INTO badge_audit_log
             (guild_id, user_id, badge_id, action, performed_by, reason, created_at)
           VALUES ($1, $2, $3, 'remove', $4, $5, NOW())`,
          [
            MAIN_GUILD_ID,
            userId,
            badgeId,
            session.userId,
            'System cleanup - legacy badge removal',
          ]
        );

        totalBadgesRemoved++;
      }

      // Invalidate in-memory premium/status cache for this user
      invalidatePremiumStatusCache(userId);

      // Revalidate the user's public profile page
      revalidatePath(`/profile/${userId}`);
    }

    // ── 3. Revalidate shared pages ───────────────────────────────────────────
    revalidatePath('/leaderboard');
    revalidatePath('/admin/badges');
    revalidatePath('/');

    console.log(
      `[cleanup-legacy] Removed ${totalBadgesRemoved} legacy badge(s) from ${affectedUsers.length} user(s). ` +
      `Performed by: ${session.userId}`
    );

    return NextResponse.json({
      success: true,
      affectedUsers: affectedUsers.length,
      badgesRemoved: totalBadgesRemoved,
      message: `Removed ${totalBadgesRemoved} legacy badge(s) from ${affectedUsers.length} user(s).`,
    });
  } catch (err) {
    console.error('[api/admin/badges/cleanup-legacy] POST failed:', err);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
