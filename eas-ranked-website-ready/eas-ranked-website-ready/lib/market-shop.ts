/**
 * lib/market-shop.ts
 *
 * Core Market Shop library.
 * Handles DB table initialisation, shop item CRUD, value history, and
 * dynamic pricing.  All public-facing operations are scoped to the main guild.
 */

import { pool } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The main EAS Arena guild ID — all shop operations are scoped to this. */
export const MAIN_GUILD_ID = '1467697766837915804';

/** The test server guild ID — kept separate from the main server. */
export const TEST_GUILD_ID = '1511958538333851688';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShopItem {
  id: number;
  guild_id: string;
  item_id: string;
  name: string;
  description: string | null;
  type: string;
  rarity: string | null;
  badge_id: string | null;
  role_id: string | null;
  current_stock: number;
  max_stock: number;
  resale_supply: number;
  is_limited: boolean;
  is_active: boolean;
  is_sold_out: boolean;
  base_value: number;
  current_value: number;
  min_value: number;
  max_value: number;
  resale_percent: number;
  demand_score: number;
  total_bought: number;
  total_resold: number;
  total_traded: number;
  last_value_update: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValueHistoryEntry {
  id: number;
  guild_id: string;
  item_id: string;
  old_value: number;
  new_value: number;
  change_amount: number;
  change_percent: number;
  reason: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// DB initialisation
// ---------------------------------------------------------------------------

let tablesEnsured = false;

export async function ensureMarketShopTables(): Promise<void> {
  if (tablesEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_shop_items (
        id                SERIAL        PRIMARY KEY,
        guild_id          BIGINT        NOT NULL,
        item_id           TEXT          NOT NULL UNIQUE,
        name              TEXT          NOT NULL,
        description       TEXT,
        type              TEXT          NOT NULL,
        rarity            TEXT,
        badge_id          TEXT,
        role_id           TEXT,
        current_stock     INTEGER       NOT NULL DEFAULT 0,
        max_stock         INTEGER       NOT NULL DEFAULT 100,
        resale_supply     INTEGER       NOT NULL DEFAULT 0,
        is_limited        BOOLEAN       NOT NULL DEFAULT FALSE,
        is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
        is_sold_out       BOOLEAN       NOT NULL DEFAULT FALSE,
        base_value        BIGINT        NOT NULL DEFAULT 100000,
        current_value     BIGINT        NOT NULL DEFAULT 100000,
        min_value         BIGINT        NOT NULL DEFAULT 50000,
        max_value         BIGINT        NOT NULL DEFAULT 500000,
        resale_percent    INTEGER       NOT NULL DEFAULT 80,
        demand_score      DECIMAL(10,2) NOT NULL DEFAULT 1.0,
        total_bought      INTEGER       NOT NULL DEFAULT 0,
        total_resold      INTEGER       NOT NULL DEFAULT 0,
        total_traded      INTEGER       NOT NULL DEFAULT 0,
        last_value_update TIMESTAMP,
        created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMP     NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_item_value_history (
        id             SERIAL        PRIMARY KEY,
        guild_id       BIGINT        NOT NULL,
        item_id        TEXT          NOT NULL,
        old_value      BIGINT        NOT NULL,
        new_value      BIGINT        NOT NULL,
        change_amount  BIGINT        NOT NULL,
        change_percent DECIMAL(10,2) NOT NULL,
        reason         TEXT,
        created_at     TIMESTAMP     NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_item_resales (
        id              SERIAL      PRIMARY KEY,
        guild_id        BIGINT      NOT NULL,
        seller_id       VARCHAR(32) NOT NULL,
        item_id         TEXT        NOT NULL,
        payout_amount   BIGINT      NOT NULL,
        value_at_resale BIGINT      NOT NULL,
        resale_percent  INTEGER     NOT NULL,
        created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_item_trades (
        id             SERIAL      PRIMARY KEY,
        guild_id       BIGINT      NOT NULL,
        seller_id      VARCHAR(32) NOT NULL,
        buyer_id       VARCHAR(32) NOT NULL,
        item_id        TEXT        NOT NULL,
        trade_price    BIGINT      NOT NULL,
        currency_type  TEXT        NOT NULL,
        value_at_trade BIGINT      NOT NULL,
        created_at     TIMESTAMP   NOT NULL DEFAULT NOW()
      )
    `);

    // Indexes (IF NOT EXISTS so re-runs are safe)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_market_shop_items_guild_id ON market_shop_items(guild_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_market_shop_items_item_id  ON market_shop_items(item_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_market_shop_items_active   ON market_shop_items(is_active)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_market_item_value_history_item_id    ON market_item_value_history(item_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_market_item_value_history_created_at ON market_item_value_history(created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_market_item_resales_item_id   ON market_item_resales(item_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_market_item_resales_seller_id ON market_item_resales(seller_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_market_item_trades_item_id    ON market_item_trades(item_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_market_item_trades_seller_id  ON market_item_trades(seller_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_market_item_trades_buyer_id   ON market_item_trades(buyer_id)`);

    tablesEnsured = true;
  } catch (err) {
    console.error('[market-shop] ensureMarketShopTables failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/** Returns all shop items for a guild, ordered by name. */
export async function getShopItems(guildId: string): Promise<ShopItem[]> {
  await ensureMarketShopTables();
  try {
    const result = await pool.query(
      `SELECT * FROM market_shop_items WHERE guild_id = $1 ORDER BY name ASC`,
      [guildId]
    );
    return result.rows;
  } catch (err) {
    console.error('[market-shop] getShopItems failed:', err);
    return [];
  }
}

/** Returns a single shop item by item_id, or null if not found. */
export async function getShopItem(guildId: string, itemId: string): Promise<ShopItem | null> {
  await ensureMarketShopTables();
  try {
    const result = await pool.query(
      `SELECT * FROM market_shop_items WHERE guild_id = $1 AND item_id = $2 LIMIT 1`,
      [guildId, itemId]
    );
    return result.rows[0] ?? null;
  } catch (err) {
    console.error('[market-shop] getShopItem failed:', err);
    return null;
  }
}

/** Returns active shop items only (for public-facing pages). */
export async function getActiveShopItems(guildId: string): Promise<ShopItem[]> {
  await ensureMarketShopTables();
  try {
    const result = await pool.query(
      `SELECT * FROM market_shop_items WHERE guild_id = $1 AND is_active = TRUE ORDER BY name ASC`,
      [guildId]
    );
    return result.rows;
  } catch (err) {
    console.error('[market-shop] getActiveShopItems failed:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/** Creates a new shop item. Returns the created item or null on failure. */
export async function createShopItem(
  guildId: string,
  data: Omit<ShopItem, 'id' | 'guild_id' | 'created_at' | 'updated_at'>
): Promise<ShopItem | null> {
  await ensureMarketShopTables();
  try {
    const result = await pool.query(
      `INSERT INTO market_shop_items (
        guild_id, item_id, name, description, type, rarity, badge_id, role_id,
        current_stock, max_stock, resale_supply, is_limited, is_active, is_sold_out,
        base_value, current_value, min_value, max_value, resale_percent, demand_score
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *`,
      [
        guildId,
        data.item_id,
        data.name,
        data.description ?? null,
        data.type,
        data.rarity ?? null,
        data.badge_id ?? null,
        data.role_id ?? null,
        data.current_stock,
        data.max_stock,
        data.resale_supply,
        data.is_limited,
        data.is_active,
        data.is_sold_out,
        data.base_value,
        data.current_value,
        data.min_value,
        data.max_value,
        data.resale_percent,
        data.demand_score,
      ]
    );
    revalidatePath('/market');
    revalidatePath('/admin/market-shop');
    return result.rows[0] ?? null;
  } catch (err) {
    console.error('[market-shop] createShopItem failed:', err);
    return null;
  }
}

/** Updates a shop item's fields. Returns the updated item or null on failure. */
export async function updateShopItem(
  guildId: string,
  itemId: string,
  updates: Partial<ShopItem>
): Promise<ShopItem | null> {
  await ensureMarketShopTables();
  try {
    const fields: string[] = [];
    const values: unknown[] = [guildId, itemId];
    let paramCount = 2;

    const updateableFields = [
      'name', 'description', 'type', 'rarity', 'badge_id', 'role_id',
      'current_stock', 'max_stock', 'resale_supply', 'is_limited', 'is_active',
      'is_sold_out', 'base_value', 'current_value', 'min_value', 'max_value',
      'resale_percent', 'demand_score', 'total_bought', 'total_resold',
      'total_traded', 'last_value_update',
    ] as const;

    for (const field of updateableFields) {
      if (field in updates) {
        fields.push(`${field} = $${++paramCount}`);
        values.push((updates as Record<string, unknown>)[field]);
      }
    }

    if (fields.length === 0) return getShopItem(guildId, itemId);

    fields.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE market_shop_items
       SET ${fields.join(', ')}
       WHERE guild_id = $1 AND item_id = $2
       RETURNING *`,
      values
    );

    revalidatePath('/market');
    revalidatePath('/admin/market-shop');
    return result.rows[0] ?? null;
  } catch (err) {
    console.error('[market-shop] updateShopItem failed:', err);
    return null;
  }
}

/** Permanently deletes a shop item. Returns true on success. */
export async function deleteShopItem(guildId: string, itemId: string): Promise<boolean> {
  await ensureMarketShopTables();
  try {
    await pool.query(
      `DELETE FROM market_shop_items WHERE guild_id = $1 AND item_id = $2`,
      [guildId, itemId]
    );
    revalidatePath('/market');
    revalidatePath('/admin/market-shop');
    return true;
  } catch (err) {
    console.error('[market-shop] deleteShopItem failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Value history
// ---------------------------------------------------------------------------

/** Records a value change event in the history table. */
export async function recordValueChange(
  guildId: string,
  itemId: string,
  oldValue: number,
  newValue: number,
  reason: string
): Promise<void> {
  await ensureMarketShopTables();
  try {
    const changeAmount = newValue - oldValue;
    const changePercent = oldValue > 0 ? (changeAmount / oldValue) * 100 : 0;

    await pool.query(
      `INSERT INTO market_item_value_history
         (guild_id, item_id, old_value, new_value, change_amount, change_percent, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [guildId, itemId, oldValue, newValue, changeAmount, changePercent, reason]
    );
  } catch (err) {
    console.error('[market-shop] recordValueChange failed:', err);
  }
}

/** Returns value history for an item, newest first. */
export async function getValueHistory(
  guildId: string,
  itemId: string,
  limit = 100
): Promise<ValueHistoryEntry[]> {
  await ensureMarketShopTables();
  try {
    const result = await pool.query(
      `SELECT * FROM market_item_value_history
       WHERE guild_id = $1 AND item_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [guildId, itemId, limit]
    );
    return result.rows;
  } catch (err) {
    console.error('[market-shop] getValueHistory failed:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Dynamic pricing
// ---------------------------------------------------------------------------

/**
 * Adjusts an item's current_value by `adjustmentPercent` (positive = increase,
 * negative = decrease), clamped to [min_value, max_value].  Records the change
 * in value history.
 */
export async function adjustItemValue(
  guildId: string,
  itemId: string,
  reason: 'purchase' | 'resale' | 'trade' | 'daily_adjustment' | 'manual_edit',
  adjustmentPercent: number
): Promise<ShopItem | null> {
  const item = await getShopItem(guildId, itemId);
  if (!item) return null;

  const oldValue = item.current_value;
  let newValue = Math.round(oldValue * (1 + adjustmentPercent / 100));

  // Clamp to configured bounds
  newValue = Math.max(item.min_value, Math.min(item.max_value, newValue));

  if (newValue === oldValue) return item;

  await recordValueChange(guildId, itemId, oldValue, newValue, reason);
  return updateShopItem(guildId, itemId, {
    current_value: newValue,
    last_value_update: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Adds stock to an item (capped at max_stock) and clears sold-out flag. */
export async function restockItem(
  guildId: string,
  itemId: string,
  amount: number
): Promise<ShopItem | null> {
  const item = await getShopItem(guildId, itemId);
  if (!item) return null;

  const newStock = Math.min(item.max_stock, item.current_stock + amount);
  return updateShopItem(guildId, itemId, {
    current_stock: newStock,
    is_sold_out: newStock === 0,
  });
}

/** Marks an item as sold out (stock = 0). */
export async function markSoldOut(guildId: string, itemId: string): Promise<ShopItem | null> {
  return updateShopItem(guildId, itemId, { is_sold_out: true, current_stock: 0 });
}

/** Disables an item so it no longer appears in the public shop. */
export async function disableItem(guildId: string, itemId: string): Promise<ShopItem | null> {
  return updateShopItem(guildId, itemId, { is_active: false });
}

/** Re-enables a previously disabled item. */
export async function enableItem(guildId: string, itemId: string): Promise<ShopItem | null> {
  return updateShopItem(guildId, itemId, { is_active: true });
}
