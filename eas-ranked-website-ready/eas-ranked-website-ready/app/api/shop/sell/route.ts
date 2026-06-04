import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';

const MAIN_GUILD_ID = '1467697766837915804';

// ---------------------------------------------------------------------------
// POST /api/shop/sell
// Body: { item_id: number }
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Auth check
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'You must be logged in to sell items.' }, { status: 401 });
  }

  const userId = session.userId;

  let body: { item_id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const itemId = Number(body.item_id);
  if (!itemId || isNaN(itemId)) {
    return NextResponse.json({ error: 'item_id is required.' }, { status: 400 });
  }

  try {
    // Check ownership
    const ownedResult = await pool.query(
      `SELECT mui.id, msi.name, msi.price, msi.resale_percent, msi.limited, msi.category, msi.badge_id, msi.role_id
       FROM market_user_items mui
       JOIN market_shop_items msi ON msi.id = mui.item_id
       WHERE mui.guild_id = $1 AND mui.user_id = $2 AND mui.item_id = $3`,
      [MAIN_GUILD_ID, userId, itemId]
    );

    if (ownedResult.rows.length === 0) {
      return NextResponse.json({ error: 'You do not own this item.' }, { status: 400 });
    }

    const item = ownedResult.rows[0];
    const refundAmount = Math.floor(item.price * (item.resale_percent / 100));

    // Execute resale in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Remove from inventory
      await client.query(
        `DELETE FROM market_user_items
         WHERE guild_id = $1 AND user_id = $2 AND item_id = $3`,
        [MAIN_GUILD_ID, userId, itemId]
      );

      // Add refund to balance
      await client.query(
        `INSERT INTO market_users (guild_id, user_id, balance)
         VALUES ($1, $2, $3)
         ON CONFLICT (guild_id, user_id) DO UPDATE
           SET balance = market_users.balance + $3, updated_at = NOW()`,
        [MAIN_GUILD_ID, userId, refundAmount]
      );

      // Increment stock if limited
      if (item.limited) {
        await client.query(
          `UPDATE market_shop_items
           SET current_stock = COALESCE(current_stock, 0) + 1, updated_at = NOW()
           WHERE id = $1`,
          [itemId]
        );
      }

      // Increment total_resold
      await client.query(
        `UPDATE market_shop_items
         SET total_resold = total_resold + 1, updated_at = NOW()
         WHERE id = $1`,
        [itemId]
      );

      // Log transaction
      await client.query(
        `INSERT INTO market_transactions
           (guild_id, investor_id, type, amount, item_id, item_name, note)
         VALUES ($1, $2, 'shop_resale', $3, $4, $5, $6)`,
        [MAIN_GUILD_ID, userId, refundAmount, itemId, item.name, `Sold "${item.name}" back to shop for ${refundAmount} SP`]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Fetch new balance
    const newBalanceResult = await pool.query(
      `SELECT balance FROM market_users WHERE guild_id = $1 AND user_id = $2`,
      [MAIN_GUILD_ID, userId]
    );
    const newBalance = parseInt(newBalanceResult.rows[0]?.balance ?? '0', 10);

    return NextResponse.json({
      success: true,
      refund: refundAmount,
      newBalance,
      item: {
        id: itemId,
        name: item.name,
      },
    });
  } catch (err) {
    console.error('[api/shop/sell] POST failed:', err);
    return NextResponse.json({ error: 'Sale failed. Please try again.' }, { status: 500 });
  }
}
