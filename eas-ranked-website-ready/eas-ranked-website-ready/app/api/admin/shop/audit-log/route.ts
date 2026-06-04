import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { DEVELOPER_USER_ID } from '@/lib/premium';
import { pool } from '@/lib/db';

const MAIN_GUILD_ID = '1467697766837915804';

// ---------------------------------------------------------------------------
// GET /api/admin/shop/audit-log
// Query params: action, item_id, user_id, date_from, date_to, limit, offset
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

    const params = req.nextUrl.searchParams;
    const action = params.get('action');
    const itemId = params.get('item_id');
    const userId = params.get('user_id');
    const dateFrom = params.get('date_from');
    const dateTo = params.get('date_to');
    const limit = Math.min(Number(params.get('limit') ?? 100), 500);
    const offset = Number(params.get('offset') ?? 0);

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    let idx = 1;

    if (action) { conditions.push(`action = $${idx++}`); values.push(action); }
    if (itemId) { conditions.push(`item_id = $${idx++}`); values.push(parseInt(itemId, 10)); }
    if (userId) { conditions.push(`changed_by = $${idx++}`); values.push(userId); }
    if (dateFrom) { conditions.push(`created_at >= $${idx++}`); values.push(dateFrom); }
    if (dateTo) { conditions.push(`created_at <= $${idx++}`); values.push(dateTo); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT id, item_id, item_name, action, field, old_value, new_value,
              changed_by, note, created_at
       FROM market_shop_audit
       ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...values, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM market_shop_audit ${where}`,
      values
    );

    return NextResponse.json({
      entries: result.rows,
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    });
  } catch (err) {
    console.error('[api/admin/shop/audit-log] GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/shop/audit-log — Log an action (internal use)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: 'Forbidden. Developer access required.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { item_id, item_name, action, field, old_value, new_value, note } = body as Record<string, unknown>;

  if (!action || typeof action !== 'string') {
    return NextResponse.json({ error: 'action is required' }, { status: 400 });
  }

  try {
    await pool.query(
      `INSERT INTO market_shop_audit
         (item_id, item_name, action, field, old_value, new_value, changed_by, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        item_id != null ? Number(item_id) : null,
        item_name ? String(item_name) : null,
        String(action),
        field ? String(field) : null,
        old_value != null ? String(old_value) : null,
        new_value != null ? String(new_value) : null,
        session.userId,
        note ? String(note) : null,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/admin/shop/audit-log] POST failed:', err);
    return NextResponse.json({ error: 'Failed to log audit entry' }, { status: 500 });
  }
}
