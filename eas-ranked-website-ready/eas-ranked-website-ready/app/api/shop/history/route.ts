import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';

const MAIN_GUILD_ID = '1467697766837915804';

// ---------------------------------------------------------------------------
// GET /api/shop/history
// Returns the logged-in user's shop transaction history (purchases + resales)
// Query params: limit, offset
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'You must be logged in to view transaction history.' }, { status: 401 });
  }

  const userId = session.userId;
  const params = req.nextUrl.searchParams;
  const limit = Math.min(Number(params.get('limit') ?? 50), 200);
  const offset = Number(params.get('offset') ?? 0);

  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_transactions (
        id          SERIAL        PRIMARY KEY,
        guild_id    VARCHAR(32)   NOT NULL DEFAULT '${MAIN_GUILD_ID}',
        investor_id VARCHAR(32)   NOT NULL,
        type        TEXT          NOT NULL,
        amount      BIGINT        NOT NULL DEFAULT 0,
        item_id     INTEGER,
        item_name   TEXT,
        note        TEXT,
        created_at  TIMESTAMP     NOT NULL DEFAULT NOW()
      )
    `);

    const result = await pool.query(
      `SELECT id, type, amount, item_id, item_name, note, created_at
       FROM market_transactions
       WHERE guild_id = $1
         AND investor_id = $2
         AND type IN ('shop_purchase', 'shop_resale')
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [MAIN_GUILD_ID, userId, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM market_transactions
       WHERE guild_id = $1
         AND investor_id = $2
         AND type IN ('shop_purchase', 'shop_resale')`,
      [MAIN_GUILD_ID, userId]
    );

    return NextResponse.json({
      transactions: result.rows,
      total: parseInt(countResult.rows[0]?.total ?? '0', 10),
    });
  } catch (err) {
    console.error('[api/shop/history] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load transaction history.' }, { status: 500 });
  }
}
