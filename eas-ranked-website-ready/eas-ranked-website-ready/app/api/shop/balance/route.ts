import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';

const MAIN_GUILD_ID = '1467697766837915804';

// ---------------------------------------------------------------------------
// GET /api/shop/balance
// Returns the logged-in user's StarPoints balance from market_users
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ balance: 0 });
  }

  const userId = session.userId;

  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_users (
        id          SERIAL        PRIMARY KEY,
        guild_id    VARCHAR(32)   NOT NULL DEFAULT '${MAIN_GUILD_ID}',
        user_id     VARCHAR(32)   NOT NULL,
        balance     BIGINT        NOT NULL DEFAULT 0,
        created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
        UNIQUE (guild_id, user_id)
      )
    `);

    const result = await pool.query(
      `SELECT balance FROM market_users WHERE guild_id = $1 AND user_id = $2`,
      [MAIN_GUILD_ID, userId]
    );

    const balance = parseInt(result.rows[0]?.balance ?? '0', 10);
    return NextResponse.json({ balance });
  } catch (err) {
    console.error('[api/shop/balance] GET failed:', err);
    return NextResponse.json({ balance: 0 });
  }
}
