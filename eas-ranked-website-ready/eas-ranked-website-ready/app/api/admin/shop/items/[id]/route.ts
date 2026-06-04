import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { pool } from '@/lib/db';

const MAIN_GUILD_ID = '1467697766837915804';

async function requireDeveloper() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized', status: 401 };
  if (session.userId !== DEVELOPER_USER_ID) return { error: 'Forbidden. Developer access required.', status: 403 };
  return { session };
}

// ---------------------------------------------------------------------------
// GET /api/admin/shop/items/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireDeveloper();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, description, price, category, rarity, active, limited,
              max_stock, current_stock, min_value, max_value, resale_percent,
              badge_id, role_id, created_at, updated_at
       FROM market_shop_items
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item: result.rows[0] });
  } catch (err) {
    console.error(`[api/admin/shop/items/${id}] GET failed:`, err);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/admin/shop/items/[id] — Update item
// ---------------------------------------------------------------------------

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireDeveloper();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { session } = auth;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    // Fetch current item
    const current = await pool.query(
      `SELECT * FROM market_shop_items WHERE id = $1`,
      [id]
    );
    if (current.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    const old = current.rows[0];

    const {
      name, description, price, category, rarity, active, limited,
      max_stock, current_stock, min_value, max_value, resale_percent,
      badge_id, role_id,
    } = body as Record<string, unknown>;

    // Validation
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    }
    if (price !== undefined) {
      const p = Number(price);
      if (isNaN(p) || p < 0) return NextResponse.json({ error: 'price must be >= 0' }, { status: 400 });
    }
    if (resale_percent !== undefined) {
      const r = Number(resale_percent);
      if (isNaN(r) || r < 0 || r > 100) return NextResponse.json({ error: 'resale_percent must be 0–100' }, { status: 400 });
    }

    // Check name uniqueness if changing name
    if (name && String(name).trim().toLowerCase() !== old.name.toLowerCase()) {
      const existing = await pool.query(
        `SELECT id FROM market_shop_items WHERE LOWER(name) = LOWER($1) AND id != $2 LIMIT 1`,
        [String(name).trim(), id]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: `An item named "${String(name).trim()}" already exists` }, { status: 409 });
      }
    }

    const newName = name !== undefined ? String(name).trim() : old.name;
    const newDesc = description !== undefined ? (description ? String(description).trim() : null) : old.description;
    const newPrice = price !== undefined ? Number(price) : old.price;
    const newCategory = category !== undefined ? String(category) : old.category;
    const newRarity = rarity !== undefined ? String(rarity) : old.rarity;
    const newActive = active !== undefined ? Boolean(active) : old.active;
    const newLimited = limited !== undefined ? Boolean(limited) : old.limited;
    const newMaxStock = max_stock !== undefined ? (max_stock != null ? Number(max_stock) : null) : old.max_stock;
    const newCurrentStock = current_stock !== undefined ? (current_stock != null ? Number(current_stock) : null) : old.current_stock;
    const newMinValue = min_value !== undefined ? (min_value != null ? Number(min_value) : null) : old.min_value;
    const newMaxValue = max_value !== undefined ? (max_value != null ? Number(max_value) : null) : old.max_value;
    const newResale = resale_percent !== undefined ? Number(resale_percent) : old.resale_percent;
    const newBadgeId = badge_id !== undefined ? (badge_id ? String(badge_id) : null) : old.badge_id;
    const newRoleId = role_id !== undefined ? (role_id ? String(role_id) : null) : old.role_id;

    const result = await pool.query(
      `UPDATE market_shop_items
       SET name=$1, description=$2, price=$3, category=$4, rarity=$5,
           active=$6, limited=$7, max_stock=$8, current_stock=$9,
           min_value=$10, max_value=$11, resale_percent=$12,
           badge_id=$13, role_id=$14, updated_at=NOW()
       WHERE id=$15
       RETURNING *`,
      [
        newName, newDesc, newPrice, newCategory, newRarity,
        newActive, newLimited, newMaxStock, newCurrentStock,
        newMinValue, newMaxValue, newResale,
        newBadgeId, newRoleId, id,
      ]
    );

    const updated = result.rows[0];

    // Audit log — log each changed field
    const fields: Array<{ field: string; oldVal: unknown; newVal: unknown }> = [
      { field: 'name', oldVal: old.name, newVal: newName },
      { field: 'description', oldVal: old.description, newVal: newDesc },
      { field: 'price', oldVal: old.price, newVal: newPrice },
      { field: 'category', oldVal: old.category, newVal: newCategory },
      { field: 'rarity', oldVal: old.rarity, newVal: newRarity },
      { field: 'active', oldVal: old.active, newVal: newActive },
      { field: 'limited', oldVal: old.limited, newVal: newLimited },
      { field: 'max_stock', oldVal: old.max_stock, newVal: newMaxStock },
      { field: 'current_stock', oldVal: old.current_stock, newVal: newCurrentStock },
      { field: 'resale_percent', oldVal: old.resale_percent, newVal: newResale },
      { field: 'badge_id', oldVal: old.badge_id, newVal: newBadgeId },
      { field: 'role_id', oldVal: old.role_id, newVal: newRoleId },
    ];

    for (const { field, oldVal, newVal } of fields) {
      const oldStr = oldVal == null ? '' : String(oldVal);
      const newStr = newVal == null ? '' : String(newVal);
      if (oldStr !== newStr) {
        await pool.query(
          `INSERT INTO market_shop_audit
             (item_id, item_name, action, field, old_value, new_value, changed_by, created_at)
           VALUES ($1, $2, 'update', $3, $4, $5, $6, NOW())`,
          [id, updated.name, field, oldStr || null, newStr || null, session.userId]
        );
      }
    }

    // If price changed, also log to market_item_value_history
    if (old.price !== newPrice) {
      await pool.query(
        `INSERT INTO market_item_value_history
           (item_id, old_price, new_price, changed_by, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [id, old.price, newPrice, session.userId, `Price updated via admin panel`]
      ).catch(() => {
        // Table may not exist yet — create it
        pool.query(`
          CREATE TABLE IF NOT EXISTS market_item_value_history (
            id          SERIAL      PRIMARY KEY,
            guild_id    VARCHAR(32) NOT NULL DEFAULT '${MAIN_GUILD_ID}',
            item_id     INTEGER     NOT NULL,
            old_price   INTEGER     NOT NULL,
            new_price   INTEGER     NOT NULL,
            changed_by  VARCHAR(32) NOT NULL,
            reason      TEXT,
            created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
          )
        `).then(() =>
          pool.query(
            `INSERT INTO market_item_value_history
               (item_id, old_price, new_price, changed_by, reason, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [id, old.price, newPrice, session.userId, `Price updated via admin panel`]
          )
        ).catch(() => {});
      });
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (err) {
    console.error(`[api/admin/shop/items/${id}] PUT failed:`, err);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/shop/items/[id]
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireDeveloper();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { session } = auth;

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
  }

  try {
    const current = await pool.query(
      `SELECT id, name FROM market_shop_items WHERE id = $1`,
      [id]
    );
    if (current.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    const item = current.rows[0];

    await pool.query(`DELETE FROM market_shop_items WHERE id = $1`, [id]);

    // Audit log
    await pool.query(
      `INSERT INTO market_shop_audit
         (item_id, item_name, action, changed_by, note, created_at)
       VALUES ($1, $2, 'delete', $3, $4, NOW())`,
      [id, item.name, session.userId, `Deleted shop item "${item.name}"`]
    );

    return NextResponse.json({ success: true, deleted: id });
  } catch (err) {
    console.error(`[api/admin/shop/items/${id}] DELETE failed:`, err);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
