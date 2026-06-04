import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import {
  getShopItem,
  updateShopItem,
  deleteShopItem,
  getValueHistory,
  MAIN_GUILD_ID,
} from '@/lib/market-shop';

// ---------------------------------------------------------------------------
// GET /api/admin/market-shop/[id]
// Returns a single shop item plus its value history.  Developer-only.
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [item, history] = await Promise.all([
      getShopItem(MAIN_GUILD_ID, id),
      getValueHistory(MAIN_GUILD_ID, id, 100),
    ]);

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item, history });
  } catch (err) {
    console.error('[api/admin/market-shop/[id]] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load item' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/market-shop/[id]
// Updates a shop item's fields.  Developer-only.
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const item = await updateShopItem(MAIN_GUILD_ID, id, body as Parameters<typeof updateShopItem>[2]);

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    console.error('[api/admin/market-shop/[id]] PATCH failed:', err);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/market-shop/[id]
// Permanently deletes a shop item.  Developer-only.
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ok = await deleteShopItem(MAIN_GUILD_ID, id);

    if (!ok) {
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/admin/market-shop/[id]] DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
