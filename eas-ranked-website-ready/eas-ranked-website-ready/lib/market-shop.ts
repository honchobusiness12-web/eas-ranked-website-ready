import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAIN_GUILD_ID = "1467697766837915804";

// Rarity-based daily move caps (as decimal fractions)
const RARITY_DAILY_CAPS: Record<string, number> = {
  common:     0.10,
  uncommon:   0.12,
  rare:       0.15,
  epic:       0.20,
  legendary:  0.25,
  mythic:     0.35,
};

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
  reason: string | null;
  created_at: string;
}

export interface CreateShopItemInput {
  item_id: string;
  name: string;
  description?: string;
  type: string;
  rarity?: string;
  badge_id?: string;
  role_id?: string;
  max_stock?: number;
  base_value?: number;
  min_value?: number;
  max_value?: number;
  resale_percent?: number;
  is_limited?: boolean;
}

export interface UpdateShopItemInput {
  name?: string;
  description?: string;
  type?: string;
  rarity?: string;
  badge_id?: string;
  role_id?: string;
  current_stock?: number;
  max_stock?: number;
  current_value?: number;
  min_value?: number;
  max_value?: number;
  resale_percent?: number;
  is_limited?: boolean;
  is_active?: boolean;
  is_sold_out?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseRow(row: Record<string, unknown>): ShopItem {
  return {
    id:                 Number(row.id),
    guild_id:           String(row.guild_id),
    item_id:            String(row.item_id),
    name:               String(row.name),
    description:        row.description != null ? String(row.description) : null,
    type:               String(row.type),
    rarity:             row.rarity != null ? String(row.rarity) : null,
    badge_id:           row.badge_id != null ? String(row.badge_id) : null,
    role_id:            row.role_id != null ? String(row.role_id) : null,
    current_stock:      Number(row.current_stock),
    max_stock:          Number(row.max_stock),
    resale_supply:      Number(row.resale_supply),
    is_limited:         Boolean(row.is_limited),
    is_active:          Boolean(row.is_active),
    is_sold_out:        Boolean(row.is_sold_out),
    base_value:         parseFloat(String(row.base_value)),
    current_value:      parseFloat(String(row.current_value)),
    min_value:          parseFloat(String(row.min_value)),
    max_value:          parseFloat(String(row.max_value)),
    resale_percent:     Number(row.resale_percent),
    demand_score:       parseFloat(String(row.demand_score)),
    total_bought:       Number(row.total_bought),
    total_resold:       Number(row.total_resold),
    total_traded:       Number(row.total_traded),
    last_value_update:  row.last_value_update != null ? String(row.last_value_update) : null,
    created_at:         String(row.created_at),
    updated_at:         String(row.updated_at),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// getShopItems — fetch all items for the main guild
// ---------------------------------------------------------------------------

export async function getShopItems(filters?: {
  active?: boolean;
  disabled?: boolean;
  limited?: boolean;
  sold_out?: boolean;
  type?: string;
  rarity?: string;
  search?: string;
}): Promise<ShopItem[]> {
  const conditions: string[] = ["guild_id = $1"];
  const params: unknown[] = [MAIN_GUILD_ID];
  let idx = 2;

  if (filters?.active === true)   { conditions.push(`is_active = true`); }
  if (filters?.disabled === true) { conditions.push(`is_active = false`); }
  if (filters?.limited === true)  { conditions.push(`is_limited = true`); }
  if (filters?.sold_out === true) { conditions.push(`is_sold_out = true`); }
  if (filters?.type) {
    conditions.push(`type = $${idx++}`);
    params.push(filters.type);
  }
  if (filters?.rarity) {
    conditions.push(`rarity = $${idx++}`);
    params.push(filters.rarity);
  }
  if (filters?.search) {
    conditions.push(`name ILIKE $${idx++}`);
    params.push(`%${filters.search}%`);
  }

  const where = conditions.join(" AND ");
  const result = await pool.query(
    `SELECT * FROM market_shop_items WHERE ${where} ORDER BY created_at DESC`,
    params
  );
  return result.rows.map(parseRow);
}

// ---------------------------------------------------------------------------
// getShopItem — fetch a single item by numeric id
// ---------------------------------------------------------------------------

export async function getShopItem(id: number): Promise<ShopItem | null> {
  const result = await pool.query(
    `SELECT * FROM market_shop_items WHERE id = $1 AND guild_id = $2 LIMIT 1`,
    [id, MAIN_GUILD_ID]
  );
  if (result.rows.length === 0) return null;
  return parseRow(result.rows[0]);
}

// ---------------------------------------------------------------------------
// createShopItem
// ---------------------------------------------------------------------------

export async function createShopItem(input: CreateShopItemInput): Promise<ShopItem> {
  const baseValue = input.base_value ?? 0;
  const result = await pool.query(
    `INSERT INTO market_shop_items (
       guild_id, item_id, name, description, type, rarity,
       badge_id, role_id, max_stock, current_stock,
       base_value, current_value, min_value, max_value,
       resale_percent, is_limited
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $9,
       $10, $10, $11, $12,
       $13, $14
     )
     RETURNING *`,
    [
      MAIN_GUILD_ID,
      input.item_id,
      input.name,
      input.description ?? null,
      input.type,
      input.rarity ?? null,
      input.badge_id ?? null,
      input.role_id ?? null,
      input.max_stock ?? 100,
      baseValue,
      input.min_value ?? 0,
      input.max_value ?? 1000000,
      input.resale_percent ?? 80,
      input.is_limited ?? false,
    ]
  );
  return parseRow(result.rows[0]);
}

// ---------------------------------------------------------------------------
// updateShopItem
// ---------------------------------------------------------------------------

export async function updateShopItem(id: number, input: UpdateShopItemInput): Promise<ShopItem | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const fields: Array<[keyof UpdateShopItemInput, string]> = [
    ["name",           "name"],
    ["description",    "description"],
    ["type",           "type"],
    ["rarity",         "rarity"],
    ["badge_id",       "badge_id"],
    ["role_id",        "role_id"],
    ["current_stock",  "current_stock"],
    ["max_stock",      "max_stock"],
    ["current_value",  "current_value"],
    ["min_value",      "min_value"],
    ["max_value",      "max_value"],
    ["resale_percent", "resale_percent"],
    ["is_limited",     "is_limited"],
    ["is_active",      "is_active"],
    ["is_sold_out",    "is_sold_out"],
  ];

  for (const [key, col] of fields) {
    if (key in input && input[key] !== undefined) {
      sets.push(`${col} = $${idx++}`);
      params.push(input[key]);
    }
  }

  if (sets.length === 0) return getShopItem(id);

  sets.push(`updated_at = NOW()`);
  params.push(id, MAIN_GUILD_ID);

  const result = await pool.query(
    `UPDATE market_shop_items SET ${sets.join(", ")}
     WHERE id = $${idx++} AND guild_id = $${idx}
     RETURNING *`,
    params
  );
  if (result.rows.length === 0) return null;
  return parseRow(result.rows[0]);
}

// ---------------------------------------------------------------------------
// restockItem — add stock to an item
// ---------------------------------------------------------------------------

export async function restockItem(id: number, amount: number): Promise<ShopItem | null> {
  const result = await pool.query(
    `UPDATE market_shop_items
     SET current_stock = current_stock + $1,
         is_sold_out   = CASE WHEN current_stock + $1 > 0 THEN false ELSE is_sold_out END,
         updated_at    = NOW()
     WHERE id = $2 AND guild_id = $3
     RETURNING *`,
    [amount, id, MAIN_GUILD_ID]
  );
  if (result.rows.length === 0) return null;
  return parseRow(result.rows[0]);
}

// ---------------------------------------------------------------------------
// disableItem / enableItem
// ---------------------------------------------------------------------------

export async function disableItem(id: number): Promise<ShopItem | null> {
  const result = await pool.query(
    `UPDATE market_shop_items SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND guild_id = $2 RETURNING *`,
    [id, MAIN_GUILD_ID]
  );
  if (result.rows.length === 0) return null;
  return parseRow(result.rows[0]);
}

export async function enableItem(id: number): Promise<ShopItem | null> {
  const result = await pool.query(
    `UPDATE market_shop_items SET is_active = true, updated_at = NOW()
     WHERE id = $1 AND guild_id = $2 RETURNING *`,
    [id, MAIN_GUILD_ID]
  );
  if (result.rows.length === 0) return null;
  return parseRow(result.rows[0]);
}

// ---------------------------------------------------------------------------
// logValueChange — internal helper to record a value history entry
// ---------------------------------------------------------------------------

async function logValueChange(
  itemId: string,
  oldValue: number,
  newValue: number,
  reason: string
): Promise<void> {
  const changeAmount  = newValue - oldValue;
  const changePct     = oldValue > 0 ? (changeAmount / oldValue) * 100 : 0;
  await pool.query(
    `INSERT INTO market_item_value_history
       (guild_id, item_id, old_value, new_value, change_amount, change_percent, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [MAIN_GUILD_ID, itemId, oldValue, newValue, changeAmount, changePct, reason]
  );
}

// ---------------------------------------------------------------------------
// calculateDynamicValue — compute new value after an event
// ---------------------------------------------------------------------------

export function calculateDynamicValue(
  currentValue: number,
  minValue: number,
  maxValue: number,
  pressurePercent: number,
  rarity: string | null
): number {
  const cap = RARITY_DAILY_CAPS[rarity ?? "common"] ?? 0.10;
  const clamped = clamp(pressurePercent, -cap, cap);
  const newValue = currentValue * (1 + clamped);
  return clamp(newValue, minValue, maxValue);
}

// ---------------------------------------------------------------------------
// recordPurchase — called when a player buys an item
// ---------------------------------------------------------------------------

export async function recordPurchase(itemId: string): Promise<ShopItem | null> {
  const result = await pool.query(
    `SELECT * FROM market_shop_items WHERE item_id = $1 AND guild_id = $2 LIMIT 1`,
    [itemId, MAIN_GUILD_ID]
  );
  if (result.rows.length === 0) return null;
  const item = parseRow(result.rows[0]);

  const oldValue    = item.current_value;
  const newStock    = Math.max(0, item.current_stock - 1);
  const soldOut     = newStock === 0;

  // Value increase: 0.5–2% on purchase; extra 5–15% if just sold out
  let pressurePct = 0.005 + Math.random() * 0.015;
  if (soldOut) pressurePct += 0.05 + Math.random() * 0.10;

  const newValue = calculateDynamicValue(
    oldValue,
    item.min_value,
    item.max_value,
    pressurePct,
    item.rarity
  );

  const updated = await pool.query(
    `UPDATE market_shop_items
     SET current_stock     = $1,
         is_sold_out       = $2,
         current_value     = $3,
         demand_score      = demand_score + 1,
         total_bought      = total_bought + 1,
         last_value_update = NOW(),
         updated_at        = NOW()
     WHERE item_id = $4 AND guild_id = $5
     RETURNING *`,
    [newStock, soldOut, newValue, itemId, MAIN_GUILD_ID]
  );

  await logValueChange(itemId, oldValue, newValue, soldOut ? "sold_out" : "purchase");
  return parseRow(updated.rows[0]);
}

// ---------------------------------------------------------------------------
// recordResale — called when a player resells an item back to the shop
// ---------------------------------------------------------------------------

export async function recordResale(
  itemId: string,
  sellerId: string
): Promise<{ item: ShopItem; payout: number } | null> {
  const result = await pool.query(
    `SELECT * FROM market_shop_items WHERE item_id = $1 AND guild_id = $2 LIMIT 1`,
    [itemId, MAIN_GUILD_ID]
  );
  if (result.rows.length === 0) return null;
  const item = parseRow(result.rows[0]);

  const oldValue    = item.current_value;
  const payout      = oldValue * (item.resale_percent / 100);

  // Value decrease: 0.5–2% on resale
  const pressurePct = -(0.005 + Math.random() * 0.015);
  const newValue    = calculateDynamicValue(
    oldValue,
    item.min_value,
    item.max_value,
    pressurePct,
    item.rarity
  );

  const updated = await pool.query(
    `UPDATE market_shop_items
     SET resale_supply     = resale_supply + 1,
         current_value     = $1,
         total_resold      = total_resold + 1,
         last_value_update = NOW(),
         updated_at        = NOW()
     WHERE item_id = $2 AND guild_id = $3
     RETURNING *`,
    [newValue, itemId, MAIN_GUILD_ID]
  );

  await pool.query(
    `INSERT INTO market_item_resales
       (guild_id, seller_id, item_id, payout_amount, value_at_resale, resale_percent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [MAIN_GUILD_ID, sellerId, itemId, payout, oldValue, item.resale_percent]
  );

  await logValueChange(itemId, oldValue, newValue, "resale");
  return { item: parseRow(updated.rows[0]), payout };
}

// ---------------------------------------------------------------------------
// recordTrade — called when two players trade an item
// ---------------------------------------------------------------------------

export async function recordTrade(
  itemId: string,
  sellerId: string,
  buyerId: string,
  tradePrice: number,
  currencyType: string
): Promise<ShopItem | null> {
  const result = await pool.query(
    `SELECT * FROM market_shop_items WHERE item_id = $1 AND guild_id = $2 LIMIT 1`,
    [itemId, MAIN_GUILD_ID]
  );
  if (result.rows.length === 0) return null;
  const item = parseRow(result.rows[0]);

  const oldValue = item.current_value;

  // If trade price > current value: +1–5%; if lower: -1–5%
  const direction = tradePrice >= oldValue ? 1 : -1;
  const pressurePct = direction * (0.01 + Math.random() * 0.04);
  const newValue = calculateDynamicValue(
    oldValue,
    item.min_value,
    item.max_value,
    pressurePct,
    item.rarity
  );

  const updated = await pool.query(
    `UPDATE market_shop_items
     SET current_value     = $1,
         demand_score      = demand_score + 0.5,
         total_traded      = total_traded + 1,
         last_value_update = NOW(),
         updated_at        = NOW()
     WHERE item_id = $2 AND guild_id = $3
     RETURNING *`,
    [newValue, itemId, MAIN_GUILD_ID]
  );

  await pool.query(
    `INSERT INTO market_item_trades
       (guild_id, seller_id, buyer_id, item_id, trade_price, currency_type, value_at_trade)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [MAIN_GUILD_ID, sellerId, buyerId, itemId, tradePrice, currencyType, oldValue]
  );

  await logValueChange(itemId, oldValue, newValue, "trade");
  return parseRow(updated.rows[0]);
}

// ---------------------------------------------------------------------------
// getValueHistory — price history for charts
// ---------------------------------------------------------------------------

export async function getValueHistory(
  itemId: string,
  limit = 100
): Promise<ValueHistoryEntry[]> {
  const result = await pool.query(
    `SELECT * FROM market_item_value_history
     WHERE item_id = $1 AND guild_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [itemId, MAIN_GUILD_ID, limit]
  );
  return result.rows.map((row) => ({
    id:             Number(row.id),
    guild_id:       String(row.guild_id),
    item_id:        String(row.item_id),
    old_value:      parseFloat(String(row.old_value)),
    new_value:      parseFloat(String(row.new_value)),
    change_amount:  parseFloat(String(row.change_amount)),
    change_percent: parseFloat(String(row.change_percent)),
    reason:         row.reason != null ? String(row.reason) : null,
    created_at:     String(row.created_at),
  }));
}

// ---------------------------------------------------------------------------
// runDailyAdjustment — recalculate all item values based on 24h activity
// ---------------------------------------------------------------------------

export async function runDailyAdjustment(): Promise<{
  processed: number;
  errors: number;
  log: Array<{ item_id: string; old_value: number; new_value: number; pressure: number }>;
}> {
  const items = await getShopItems();
  let processed = 0;
  let errors = 0;
  const log: Array<{ item_id: string; old_value: number; new_value: number; pressure: number }> = [];

  for (const item of items) {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Count 24h purchases
      const buyResult = await pool.query(
        `SELECT COUNT(*) AS cnt FROM market_item_value_history
         WHERE item_id = $1 AND guild_id = $2 AND reason = 'purchase' AND created_at >= $3`,
        [item.item_id, MAIN_GUILD_ID, since]
      );
      const purchases24h = parseInt(buyResult.rows[0]?.cnt ?? "0", 10);

      // Count 24h resales
      const resaleResult = await pool.query(
        `SELECT COUNT(*) AS cnt FROM market_item_resales
         WHERE item_id = $1 AND guild_id = $2 AND created_at >= $3`,
        [item.item_id, MAIN_GUILD_ID, since]
      );
      const resales24h = parseInt(resaleResult.rows[0]?.cnt ?? "0", 10);

      // Average trade price vs current value in last 24h
      const tradeResult = await pool.query(
        `SELECT AVG(trade_price) AS avg_price FROM market_item_trades
         WHERE item_id = $1 AND guild_id = $2 AND created_at >= $3`,
        [item.item_id, MAIN_GUILD_ID, since]
      );
      const avgTradePrice = parseFloat(tradeResult.rows[0]?.avg_price ?? "0") || 0;

      // Pressure calculations
      const buyPressure    = purchases24h * 0.015;   // +1.5% per purchase
      const resalePressure = resales24h   * -0.0125; // -1.25% per resale

      // Trade pressure: deviation from current value
      let tradePressure = 0;
      if (avgTradePrice > 0 && item.current_value > 0) {
        tradePressure = ((avgTradePrice - item.current_value) / item.current_value) * 0.1;
      }

      // Scarcity pressure
      let scarcityPressure = 0;
      if (item.current_stock === 0) {
        scarcityPressure = 0.08;
      } else if (item.max_stock > 0) {
        const stockRatio = item.current_stock / item.max_stock;
        if (stockRatio < 0.10)      scarcityPressure = 0.05;
        else if (stockRatio < 0.25) scarcityPressure = 0.02;
      }

      // Inactivity pressure
      const inactivityPressure = (purchases24h === 0 && resales24h === 0) ? -0.02 : 0;

      const totalPressure = buyPressure + resalePressure + tradePressure + scarcityPressure + inactivityPressure;
      const oldValue      = item.current_value;
      const newValue      = calculateDynamicValue(
        oldValue,
        item.min_value,
        item.max_value,
        totalPressure,
        item.rarity
      );

      if (Math.abs(newValue - oldValue) < 0.01) {
        processed++;
        continue;
      }

      await pool.query(
        `UPDATE market_shop_items
         SET current_value     = $1,
             last_value_update = NOW(),
             updated_at        = NOW()
         WHERE item_id = $2 AND guild_id = $3`,
        [newValue, item.item_id, MAIN_GUILD_ID]
      );

      await logValueChange(item.item_id, oldValue, newValue, "daily_adjustment");

      log.push({ item_id: item.item_id, old_value: oldValue, new_value: newValue, pressure: totalPressure });
      processed++;
    } catch (err) {
      console.error(`[market-shop] runDailyAdjustment error for ${item.item_id}:`, err);
      errors++;
    }
  }

  return { processed, errors, log };
}
