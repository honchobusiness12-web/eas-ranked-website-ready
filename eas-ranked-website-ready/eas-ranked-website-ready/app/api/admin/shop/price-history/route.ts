import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { pool } from '@/lib/db';

const MAIN_GUILD_ID = '1467697766837915804';

// ---------------------------------------------------------------------------
// GET /api/admin/shop/price-history
// Query params: item_id, date_from, date_to, limit, offset
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Forbidden. Developer access required.' }, { status: 403 });
  }

  try {
    // Ensure table exists
    await pool.query(`
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
    `);

    const params = req.nextUrl.searchParams;
    const itemId = params.get('item_id');
    const dateFrom = params.get('date_from');
    const dateTo = params.get('date_to');
    const limit = Math.min(Number(params.get('limit') ?? 100), 500);
    const offset = Number(params.get('offset') ?? 0);

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let idx = 1;

    if (itemId) {
      conditions.push(`h.item_id = $${idx++}`);
      values.push(parseInt(itemId, 10));
    }
    if (dateFrom) {
      conditions.push(`h.created_at >= $${idx++}`);
      values.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`h.created_at <= $${idx++}`);
      values.push(dateTo);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         h.id, h.item_id, h.old_price, h.new_price,
         h.changed_by, h.reason, h.created_at,
         si.name AS item_name
       FROM market_item_value_history h
       LEFT JOIN market_shop_items si ON si.id = h.item_id
       ${where}
       ORDER BY h.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...values, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM market_item_value_history h
       ${where}`,
      values
    );

    return NextResponse.json({
      entries: result.rows,
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    });
  } catch (err) {
    console.error('[api/admin/shop/price-history] GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }
}
