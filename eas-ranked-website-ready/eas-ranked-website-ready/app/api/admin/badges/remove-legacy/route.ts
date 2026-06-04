import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID, invalidatePremiumStatusCache } from '@/lib/premium';
import { ensureBadgeTables, MAIN_GUILD_ID } from '@/lib/badges';
import { pool } from '@/lib/db';

// ---------------------------------------------------------------------------
// POST /api/admin/badges/remove-legacy
//
// Removes badges from BOTH the legacy players.data->'badges' JSON array AND
// the new player_badges table, then writes audit log entries and invalidates
// all relevant caches.
//
// Body: { userId: string; badgeIds: string[]; reason?: string }
//
// Only the developer (ID 733871667788644445) may call this endpoint.
// ---------------------------------------------------------------------------

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

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { userId?: string; badgeIds?: string[]; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { userId, badgeIds, reason } = body;

  if (!userId?.trim()) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  if (!Array.isArray(badgeIds) || badgeIds.length === 0) {
    return NextResponse.json(
      { error: 'badgeIds must be a non-empty array' },
      { status: 400 }
    );
  }

  const targetUserId = userId.trim();
  const sanitisedBadgeIds = badgeIds.map((b) => String(b).trim()).filter(Boolean);
  const removalReason = reason?.trim() || 'Admin removal - legacy badge cleanup';

  try {
    await ensureBadgeTables();

    const results: Array<{
      badgeId: string;
      legacyRemoved: boolean;
      newSystemRemoved: boolean;
      auditLogged: boolean;
      error?: string;
    }> = [];

    for (const badgeId of sanitisedBadgeIds) {
      let legacyRemoved = false;
      let newSystemRemoved = false;
      let auditLogged = false;
      let badgeError: string | undefined;

      try {
        // ── 1. Remove from legacy players.data->'badges' JSON array ──────────
        const legacyResult = await pool.query(
          `UPDATE players
           SET data = jsonb_set(
             COALESCE(data, '{}'),
             '{badges}',
             (
               SELECT COALESCE(jsonb_agg(b), '[]'::jsonb)
               FROM jsonb_array_elements_text(
                 COALESCE(data->'badges', '[]'::jsonb)
               ) AS b
               WHERE b != $2
             )
           )
           WHERE user_id = $1
           RETURNING user_id, data->'badges' AS badges`,
          [targetUserId, badgeId]
        );

        if (legacyResult.rowCount && legacyResult.rowCount > 0) {
          legacyRemoved = true;
          console.log(
            `[remove-legacy] Removed '${badgeId}' from legacy badges for user ${targetUserId}. ` +
            `Remaining: ${JSON.stringify(legacyResult.rows[0]?.badges)}`
          );
        } else {
          console.warn(
            `[remove-legacy] Player ${targetUserId} not found in players table — ` +
            `legacy removal skipped for badge '${badgeId}'.`
          );
        }

        // ── 2. Remove from new player_badges table ────────────────────────────
        const newSystemResult = await pool.query(
          `DELETE FROM player_badges
           WHERE guild_id = $1 AND user_id = $2 AND badge_id = $3`,
          [MAIN_GUILD_ID, targetUserId, badgeId]
        );
        newSystemRemoved = (newSystemResult.rowCount ?? 0) > 0;

        // ── 3. Write audit log entry ──────────────────────────────────────────
        await pool.query(
          `INSERT INTO badge_audit_log
             (guild_id, user_id, badge_id, action, performed_by, reason, created_at)
           VALUES ($1, $2, $3, 'remove', $4, $5, NOW())`,
          [MAIN_GUILD_ID, targetUserId, badgeId, session.userId, removalReason]
        );
        auditLogged = true;
      } catch (err) {
        badgeError = err instanceof Error ? err.message : String(err);
        console.error(
          `[remove-legacy] Error processing badge '${badgeId}' for user ${targetUserId}:`,
          err
        );
      }

      results.push({ badgeId, legacyRemoved, newSystemRemoved, auditLogged, error: badgeError });
    }

    // ── 4. Invalidate in-memory caches ────────────────────────────────────────
    invalidatePremiumStatusCache(targetUserId);

    // ── 5. Revalidate public-facing pages ─────────────────────────────────────
    revalidatePath(`/profile/${targetUserId}`);
    revalidatePath('/leaderboard');
    revalidatePath('/admin/badges');
    revalidatePath('/');

    const anyError = results.some((r) => r.error);
    return NextResponse.json(
      {
        success: !anyError,
        userId: targetUserId,
        results,
        message: anyError
          ? 'Some badges could not be removed — see results for details.'
          : `Successfully removed ${sanitisedBadgeIds.length} badge(s) from both systems.`,
      },
      { status: anyError ? 207 : 200 }
    );
  } catch (err) {
    console.error('[api/admin/badges/remove-legacy] POST failed:', err);
    return NextResponse.json({ error: 'Failed to remove badges' }, { status: 500 });
  }
}
