import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { removeBadgeFromPlayer, getBadgesForPlayer } from '@/lib/badges';

// ---------------------------------------------------------------------------
// DELETE /api/admin/badges/remove
// Body: { userId, badgeId, reason? }
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
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
    await removeBadgeFromPlayer(
      userId.trim(),
      badgeId.trim(),
      session.userId,
      reason?.trim() || undefined
    );

    const badges = await getBadgesForPlayer(userId.trim());
    return NextResponse.json({ success: true, userId: userId.trim(), badgeId: badgeId.trim(), badges });
  } catch (err) {
    console.error('[api/admin/badges/remove] DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to remove badge' }, { status: 500 });
  }
}
