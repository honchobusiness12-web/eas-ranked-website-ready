import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { restockItem, MAIN_GUILD_ID } from '@/lib/market-shop';

// ---------------------------------------------------------------------------
// POST /api/admin/market-shop/[id]/restock
// Adds stock to a shop item.  Developer-only.
// Body: { amount: number }
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { amount?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  try {
    const item = await restockItem(MAIN_GUILD_ID, id, Math.floor(amount));

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    console.error('[api/admin/market-shop/[id]/restock] POST failed:', err);
    return NextResponse.json({ error: 'Failed to restock item' }, { status: 500 });
  }
}
