import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { createShopItem, MAIN_GUILD_ID } from '@/lib/market-shop';

// ---------------------------------------------------------------------------
// POST /api/admin/market-shop/create
// Creates a new shop item.  Developer-only.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate required fields
  if (!body.item_id || typeof body.item_id !== 'string' || !body.item_id.trim()) {
    return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
  }
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!body.type || typeof body.type !== 'string') {
    return NextResponse.json({ error: 'type is required' }, { status: 400 });
  }

  const validTypes = ['badge', 'role', 'cosmetic', 'title', 'trophy'];
  if (!validTypes.includes(body.type)) {
    return NextResponse.json(
      { error: `type must be one of: ${validTypes.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const item = await createShopItem(MAIN_GUILD_ID, {
      item_id: String(body.item_id).trim(),
      name: String(body.name).trim(),
      description: body.description ? String(body.description) : null,
      type: String(body.type),
      rarity: body.rarity ? String(body.rarity) : null,
      badge_id: body.badge_id ? String(body.badge_id) : null,
      role_id: body.role_id ? String(body.role_id) : null,
      current_stock: Number(body.current_stock ?? 0),
      max_stock: Number(body.max_stock ?? 100),
      resale_supply: Number(body.resale_supply ?? 0),
      is_limited: Boolean(body.is_limited ?? false),
      is_active: Boolean(body.is_active ?? true),
      is_sold_out: Boolean(body.is_sold_out ?? false),
      base_value: Number(body.base_value ?? 100000),
      current_value: Number(body.current_value ?? body.base_value ?? 100000),
      min_value: Number(body.min_value ?? 50000),
      max_value: Number(body.max_value ?? 500000),
      resale_percent: Number(body.resale_percent ?? 80),
      demand_score: Number(body.demand_score ?? 1.0),
      total_bought: 0,
      total_resold: 0,
      total_traded: 0,
      last_value_update: null,
    });

    if (!item) {
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/market-shop/create] POST failed:', err);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
