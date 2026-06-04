import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

const MAIN_GUILD_ID = '1467697766837915804';

// ---------------------------------------------------------------------------
// Ensure required tables exist
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
      total_bought    INTEGER       NOT NULL DEFAULT 0,
      total_resold    INTEGER       NOT NULL DEFAULT 0,
      created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
    )
  `);

  // Add missing columns to existing tables (safe to run multiple times)
  const alterColumns = [
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS total_bought INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE market_shop_items ADD COLUMN IF NOT EXISTS total_resold INTEGER NOT NULL DEFAULT 0`,
  ];
  for (const sql of alterColumns) {
    await pool.query(sql).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// GET /api/shop/items
// Query params: category, rarity, search, limited, limit, offset
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await ensureShopTables();

    const params = req.nextUrl.searchParams;
    const category = params.get('category');
    const rarity = params.get('rarity');
    const search = params.get('search');
    const limited = params.get('limited');
    const limit = Math.min(Number(params.get('limit') ?? 50), 200);
    const offset = Number(params.get('offset') ?? 0);

    const conditions: string[] = ['active = TRUE'];
    const values: (string | number | boolean)[] = [];
    let idx = 1;

    if (category) {
      conditions.push(`category = $${idx++}`);
      values.push(category);
    }
    if (rarity) {
      conditions.push(`rarity = $${idx++}`);
      values.push(rarity);
    }
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
      idx++;
      values.push(`%${search}%`);
    }
    if (limited === 'true') {
      conditions.push(`limited = TRUE`);
    } else if (limited === 'false') {
      conditions.push(`limited = FALSE`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const result = await pool.query(
      `SELECT id, name, description, price, category, rarity, active, limited,
              max_stock, current_stock, min_value, max_value, resale_percent,
              badge_id, role_id, total_bought, total_resold, created_at, updated_at
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
    console.error('[api/shop/items] GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch shop items' }, { status: 500 });
  }
}
