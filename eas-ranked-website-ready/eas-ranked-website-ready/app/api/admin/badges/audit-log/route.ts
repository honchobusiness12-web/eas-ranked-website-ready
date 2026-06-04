import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { getBadgeAuditLog } from '@/lib/badges';

// ---------------------------------------------------------------------------
// GET /api/admin/badges/audit-log?userId=optional&limit=50
// Returns badge audit log entries, optionally filtered by userId.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Forbidden. Developer access required.' }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get('userId') ?? undefined;
  const limit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get('limit') ?? 50), 1),
    200
  );

  try {
    const entries = await getBadgeAuditLog(userId, limit);
    return NextResponse.json({ entries });
  } catch (err) {
    console.error('[api/admin/badges/audit-log] GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}
