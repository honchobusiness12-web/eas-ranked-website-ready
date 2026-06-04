import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';
import { addBadgeToPlayer, ensureBadgeTables, BOT_USER_ID } from '@/lib/badges';

const MAIN_GUILD_ID = '1467697766837915804';

// ---------------------------------------------------------------------------
// Ensure required tables exist
// ---------------------------------------------------------------------------

async function ensureMarketUserTables(): Promise<void> {
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS market_user_items (
      id           SERIAL        PRIMARY KEY,
      guild_id     VARCHAR(32)   NOT NULL DEFAULT '${MAIN_GUILD_ID}',
      user_id      VARCHAR(32)   NOT NULL,
      item_id      INTEGER       NOT NULL,
      purchased_at TIMESTAMP     NOT NULL DEFAULT NOW(),
      UNIQUE (guild_id, user_id, item_id)
    )
  `);

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

  // Add missing columns to existing market_transactions
  const alterCols = [
    `ALTER TABLE market_transactions ADD COLUMN IF NOT EXISTS item_id INTEGER`,
    `ALTER TABLE market_transactions ADD COLUMN IF NOT EXISTS item_name TEXT`,
    `ALTER TABLE market_transactions ADD COLUMN IF NOT EXISTS note TEXT`,
  ];
  for (const sql of alterCols) {
    await pool.query(sql).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Assign Discord role via bot API
// ---------------------------------------------------------------------------

async function assignDiscordRole(userId: string, roleId: string): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID ?? MAIN_GUILD_ID;

  if (!botToken) {
    console.warn('[shop/buy] DISCORD_BOT_TOKEN not set — skipping role assignment');
    return;
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
          'X-Audit-Log-Reason': 'Shop purchase',
        },
        cache: 'no-store',
      }
    );
    if (!res.ok && res.status !== 204) {
      const text = await res.text();
      console.warn(`[shop/buy] Failed to assign role ${roleId} to ${userId}: ${res.status} ${text}`);
    }
  } catch (err) {
    console.warn('[shop/buy] assignDiscordRole error:', err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/shop/buy
// Body: { item_id: number }
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Auth check
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'You must be logged in to purchase items.' }, { status: 401 });
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
    await ensureMarketUserTables();
    await ensureBadgeTables();

    // Fetch item
    const itemResult = await pool.query(
      `SELECT id, name, description, price, category, rarity, active, limited,
              max_stock, current_stock, resale_percent, badge_id, role_id
       FROM market_shop_items
       WHERE id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    const item = itemResult.rows[0];

    if (!item.active) {
      return NextResponse.json({ error: 'This item is not currently available.' }, { status: 400 });
    }

    // Check stock
    if (item.limited && item.current_stock !== null && item.current_stock <= 0) {
      return NextResponse.json({ error: 'This item is out of stock.' }, { status: 400 });
    }

    // Get or create user balance
    const balanceResult = await pool.query(
      `INSERT INTO market_users (guild_id, user_id, balance)
       VALUES ($1, $2, 0)
       ON CONFLICT (guild_id, user_id) DO UPDATE SET updated_at = NOW()
       RETURNING balance`,
      [MAIN_GUILD_ID, userId]
    );

    const currentBalance = parseInt(balanceResult.rows[0]?.balance ?? '0', 10);

    // Check balance
    if (currentBalance < item.price) {
      return NextResponse.json({
        error: `Insufficient balance. You need ${item.price.toLocaleString()} SP but only have ${currentBalance.toLocaleString()} SP.`,
      }, { status: 400 });
    }

    // Check already owned
    const ownedResult = await pool.query(
      `SELECT id FROM market_user_items
       WHERE guild_id = $1 AND user_id = $2 AND item_id = $3`,
      [MAIN_GUILD_ID, userId, itemId]
    );

    if (ownedResult.rows.length > 0) {
      return NextResponse.json({ error: 'You already own this item.' }, { status: 400 });
    }

    // --- Execute purchase in a transaction ---
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Deduct balance
      await client.query(
        `UPDATE market_users
         SET balance = balance - $1, updated_at = NOW()
         WHERE guild_id = $2 AND user_id = $3`,
        [item.price, MAIN_GUILD_ID, userId]
      );

      // Insert into market_user_items
      await client.query(
        `INSERT INTO market_user_items (guild_id, user_id, item_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (guild_id, user_id, item_id) DO NOTHING`,
        [MAIN_GUILD_ID, userId, itemId]
      );

      // Decrement stock if limited
      if (item.limited && item.current_stock !== null) {
        await client.query(
          `UPDATE market_shop_items
           SET current_stock = current_stock - 1, updated_at = NOW()
           WHERE id = $1 AND current_stock > 0`,
          [itemId]
        );
      }

      // Increment total_bought
      await client.query(
        `UPDATE market_shop_items
         SET total_bought = total_bought + 1, updated_at = NOW()
         WHERE id = $1`,
        [itemId]
      );

      // Log transaction
      await client.query(
        `INSERT INTO market_transactions
           (guild_id, investor_id, type, amount, item_id, item_name, note)
         VALUES ($1, $2, 'shop_purchase', $3, $4, $5, $6)`,
        [MAIN_GUILD_ID, userId, -item.price, itemId, item.name, `Purchased "${item.name}" from shop`]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // --- Post-purchase side effects (outside transaction, non-fatal) ---

    // If badge: grant badge
    if (item.badge_id) {
      try {
        await addBadgeToPlayer(
          userId,
          item.badge_id,
          BOT_USER_ID,
          `Purchased from shop for ${item.price} SP`,
          'market'
        );
      } catch (err) {
        console.warn('[shop/buy] Failed to grant badge:', err);
      }
    }

    // If role: assign Discord role
    if (item.role_id) {
      try {
        await assignDiscordRole(userId, item.role_id);
      } catch (err) {
        console.warn('[shop/buy] Failed to assign Discord role:', err);
      }
    }

    // Fetch new balance
    const newBalanceResult = await pool.query(
      `SELECT balance FROM market_users WHERE guild_id = $1 AND user_id = $2`,
      [MAIN_GUILD_ID, userId]
    );
    const newBalance = parseInt(newBalanceResult.rows[0]?.balance ?? '0', 10);

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        rarity: item.rarity,
        badge_id: item.badge_id,
        role_id: item.role_id,
      },
      newBalance,
    });
  } catch (err) {
    console.error('[api/shop/buy] POST failed:', err);
    return NextResponse.json({ error: 'Purchase failed. Please try again.' }, { status: 500 });
  }
}
