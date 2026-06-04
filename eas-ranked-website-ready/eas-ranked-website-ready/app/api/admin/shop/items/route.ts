import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { pool } from '@/lib/db';

const MAIN_GUILD_ID = '1467697766837915804';

// ---------------------------------------------------------------------------
// Ensure market_shop_items table exists with all required columns
// ---------------------------------------------------------------------------

async function ensureShopTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS market_shop_items (
      id              SERIAL        PRIMARY KEY,
      guild_id        VARCHAR(32)   NOT NULL DEFAULT '${MAIN_GUILD_ID}',
      name            TEXT          NOT NULL,
      description     TEXT,
      price           INTEGER       NOT NULL DEFAULT 0,
      category        TEXT          NOT NULL DEFAULT 'item',
      rarity          TEXT          NOT NULL DEFAULT 'common',
      active          BOOLEAN       NOT NULL DEFAULT TRUE,
      limited         BOOLEAN       NOT NULL DEFAULT FALSE,
      max_stock       INTEGER,
      current_stock   INTEGER,
      min_value       INTEGER,
      max_value       INTEGER,
      resale_percent  INTEGER       NOT NULL DEFAULT 0,
      badge_id        TEXT,
      role_id         TEXT,
      created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS market_shop_audit (
      id          SERIAL        PRIMARY KEY,
      guild_id    VARCHAR(32)   NOT NULL DEFAULT '${MAIN_GUILD_ID}',
      item_id     INTEGER,
      item_name   TEXT,
      action      TEXT          NOT NULL,
      field       TEXT,
      old_value   TEXT,
      new_value   TEXT,
      changed_by  VARCHAR(32)   NOT NULL,
      note        TEXT,
      created_at  TIMESTAMP     NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS market_item_value_history (
      id          SERIAL        PRIMARY KEY,
      guild_id    VARCHAR(32)   NOT NULL DEFAULT '${MAIN_GUILD_ID}',
      item_id     INTEGER       NOT NULL,
      old_price   INTEGER       NOT NULL,
      new_price   INTEGER       NOT NULL,
      changed_by  VARCHAR(32)   NOT NULL,
      reason      TEXT,
      created_at  TIMESTAMP     NOT NULL DEFAULT NOW()
    )
  `);

  // Add missing columns to existing tables (safe to run multiple times)
  const alterColumns = [
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS rarity TEXT NOT NULL DEFAULT 'common'`,
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE`,
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS limited BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS current_stock INTEGER`,
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS min_value INTEGER`,
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS max_value INTEGER`,
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS resale_percent INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS badge_id TEXT`,
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS role_id TEXT`,
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`,
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS description TEXT`,
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS guild_id VARCHAR(32) NOT NULL DEFAULT '${MAIN_GUILD_ID}'`,
  ];

  for (const sql of alterColumns) {
    await pool.query(sql).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requireDeveloper() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized', status: 401 };
  if (session.userId !== DEVELOPER_USER_ID) return { error: 'Forbidden. Developer access required.', status: 403 };
  return { session };
}

// ---------------------------------------------------------------------------
// GET /api/admin/shop/items
// Query params: category, rarity, active, limited, search, limit, offset
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const auth = await requireDeveloper();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    await ensureShopTables();

    const params = req.nextUrl.searchParams;
    const category = params.get('category');
    const rarity = params.get('rarity');
    const active = params.get('active');
    const limited = params.get('limited');
    const search = params.get('search');
    const limit = Math.min(Number(params.get('limit') ?? 100), 200);
    const offset = Number(params.get('offset') ?? 0);

    const conditions: string[] = [];
    const values: (string | number | boolean)[] = [];
    let idx = 1;

    if (category) { conditions.push(`category = $${idx++}`); values.push(category); }
    if (rarity) { conditions.push(`rarity = $${idx++}`); values.push(rarity); }
    if (active !== null && active !== '') {
      conditions.push(`active = $${idx++}`);
      values.push(active === 'true');
    }
    if (limited !== null && limited !== '') {
      conditions.push(`limited = $${idx++}`);
      values.push(limited === 'true');
    }
    if (search) {
      conditions.push(`name ILIKE $${idx++}`);
      values.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT id, name, description, price, category, rarity, active, limited,
              max_stock, current_stock, min_value, max_value, resale_percent,
              badge_id, role_id, created_at, updated_at
       FROM market_shop_items
       ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...values, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM market_shop_items ${where}`,
      values
    );

    return NextResponse.json({
      items: result.rows,
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    });
  } catch (err) {
    console.error('[api/admin/shop/items] GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch shop items' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/shop/items — Create new item
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const auth = await requireDeveloper();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { session } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    name, description, price, category, rarity, active, limited,
    max_stock, current_stock, min_value, max_value, resale_percent,
    badge_id, role_id,
  } = body as Record<string, unknown>;

  // Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const priceNum = Number(price);
  if (isNaN(priceNum) || priceNum < 0) {
    return NextResponse.json({ error: 'price must be >= 0' }, { status: 400 });
  }
  const resaleNum = Number(resale_percent ?? 0);
  if (isNaN(resaleNum) || resaleNum < 0 || resaleNum > 100) {
    return NextResponse.json({ error: 'resale_percent must be 0–100' }, { status: 400 });
  }

  try {
    await ensureShopTables();

    // Check name uniqueness
    const existing = await pool.query(
      `SELECT id FROM market_shop_items WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name.trim()]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: `An item named "${name.trim()}" already exists` }, { status: 409 });
    }

    const result = await pool.query(
      `INSERT INTO market_shop_items
         (name, description, price, category, rarity, active, limited,
          max_stock, current_stock, min_value, max_value, resale_percent,
          badge_id, role_id, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
       RETURNING *`,
      [
        name.trim(),
        description ? String(description).trim() : null,
        priceNum,
        category ? String(category) : 'item',
        rarity ? String(rarity) : 'common',
        active !== false,
        limited === true,
        max_stock != null ? Number(max_stock) : null,
        current_stock != null ? Number(current_stock) : null,
        min_value != null ? Number(min_value) : null,
        max_value != null ? Number(max_value) : null,
        resaleNum,
        badge_id ? String(badge_id) : null,
        role_id ? String(role_id) : null,
      ]
    );

    const item = result.rows[0];

    // Audit log
    await pool.query(
      `INSERT INTO market_shop_audit
         (item_id, item_name, action, changed_by, note, created_at)
       VALUES ($1, $2, 'create', $3, $4, NOW())`,
      [item.id, item.name, session.userId, `Created shop item "${item.name}" at price ${priceNum}`]
    );

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/shop/items] POST failed:', err);
    return NextResponse.json({ error: 'Failed to create shop item' }, { status: 500 });
  }
}
