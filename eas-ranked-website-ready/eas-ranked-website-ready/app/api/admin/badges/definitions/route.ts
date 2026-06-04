import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { getAllBadgeDefinitions } from '@/lib/badges';

// ---------------------------------------------------------------------------
// GET /api/admin/badges/definitions
// Returns all badge definitions (admin only).
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Forbidden. Developer access required.' }, { status: 403 });
  }

  try {
    const definitions = await getAllBadgeDefinitions(true);
    return NextResponse.json({ definitions });
  } catch (err) {
    console.error('[api/admin/badges/definitions] GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch badge definitions' }, { status: 500 });
  }
}
