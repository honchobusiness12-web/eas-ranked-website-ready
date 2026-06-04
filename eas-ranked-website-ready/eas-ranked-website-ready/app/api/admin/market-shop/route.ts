import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { getShopItems, MAIN_GUILD_ID } from '@/lib/market-shop';

// ---------------------------------------------------------------------------
// GET /api/admin/market-shop
// Returns all shop items (active and inactive) for the main guild.
// Developer-only.
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session || session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await getShopItems(MAIN_GUILD_ID);
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[api/admin/market-shop] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load shop items' }, { status: 500 });
  }
}
