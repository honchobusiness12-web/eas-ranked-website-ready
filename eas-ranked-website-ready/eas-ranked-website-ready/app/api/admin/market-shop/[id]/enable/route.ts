import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { enableItem, MAIN_GUILD_ID } from '@/lib/market-shop';

// ---------------------------------------------------------------------------
// POST /api/admin/market-shop/[id]/enable
// Re-enables a previously disabled shop item.  Developer-only.
// ---------------------------------------------------------------------------

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const item = await enableItem(MAIN_GUILD_ID, id);

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    console.error('[api/admin/market-shop/[id]/enable] POST failed:', err);
    return NextResponse.json({ error: 'Failed to enable item' }, { status: 500 });
  }
}
