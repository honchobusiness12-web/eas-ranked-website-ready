import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAIN_GUILD_ID = "1467697766837915804";

// Cache: 30 seconds
let cachedShop: unknown = null;
let cacheExpiry = 0;

// ---------------------------------------------------------------------------
// GET /api/market/shop
// Returns active shop items from market_shop_items (main server only).
// Falls back to legacy shop_items table if no items are found.
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const now = Date.now();
    if (cachedShop && now < cacheExpiry) {
      return NextResponse.json(cachedShop, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      });
    }

    // Primary: market_shop_items table (new dynamic pricing system)
    const marketResult = await pool.query(
      `SELECT
         id,
         item_id,
         name,
         description,
         type,
         rarity,
         current_stock,
         max_stock,
         resale_supply,
         is_limited,
         is_sold_out,
         current_value,
         base_value,
         resale_percent,
         total_bought,
         total_resold,
         last_value_update
       FROM market_shop_items
       WHERE guild_id = $1
         AND is_active = true
       ORDER BY current_value DESC`,
      [MAIN_GUILD_ID]
    ).catch(() => ({ rows: [] }));

    // Compute 24h value change for each item
    const itemIds: string[] = marketResult.rows.map((r: Record<string, unknown>) => String(r.item_id));
    let changeMap: Record<string, number> = {};

    if (itemIds.length > 0) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const histResult = await pool.query(
        `SELECT DISTINCT ON (item_id)
           item_id,
           old_value
         FROM market_item_value_history
         WHERE guild_id = $1
           AND item_id = ANY($2)
           AND created_at >= $3
         ORDER BY item_id, created_at ASC`,
        [MAIN_GUILD_ID, itemIds, since]
      ).catch(() => ({ rows: [] }));

      for (const row of histResult.rows) {
        changeMap[String(row.item_id)] = parseFloat(String(row.old_value));
      }
    }

    let items: Array<{
      id: number;
      item_id: string;
      name: string;
      description: string | null;
      type: string;
      rarity: string | null;
      current_stock: number;
      max_stock: number;
      resale_supply: number;
      is_limited: boolean;
      is_sold_out: boolean;
      current_value: number;
      base_value: number;
      resale_percent: number;
      total_bought: number;
      total_resold: number;
      value_24h_change: number;
      value_24h_change_percent: number;
      last_value_update: string | null;
      // Legacy compat fields
      price: number;
      category: string;
      stock_remaining: number;
      total_sold: number;
    }>;

    if (marketResult.rows.length > 0) {
      items = marketResult.rows.map((row: Record<string, unknown>) => {
        const currentValue = parseFloat(String(row.current_value)) || 0;
        const oldValue24h  = changeMap[String(row.item_id)] ?? currentValue;
        const change24h    = currentValue - oldValue24h;
        const changePct    = oldValue24h > 0 ? (change24h / oldValue24h) * 100 : 0;

        return {
          id:                       Number(row.id),
          item_id:                  String(row.item_id),
          name:                     String(row.name),
          description:              row.description != null ? String(row.description) : null,
          type:                     String(row.type),
          rarity:                   row.rarity != null ? String(row.rarity) : null,
          current_stock:            Number(row.current_stock),
          max_stock:                Number(row.max_stock),
          resale_supply:            Number(row.resale_supply),
          is_limited:               Boolean(row.is_limited),
          is_sold_out:              Boolean(row.is_sold_out),
          current_value:            currentValue,
          base_value:               parseFloat(String(row.base_value)) || 0,
          resale_percent:           Number(row.resale_percent),
          total_bought:             Number(row.total_bought),
          total_resold:             Number(row.total_resold),
          value_24h_change:         change24h,
          value_24h_change_percent: changePct,
          last_value_update:        row.last_value_update != null ? String(row.last_value_update) : null,
          // Legacy compat
          price:                    currentValue,
          category:                 String(row.type),
          stock_remaining:          Number(row.current_stock),
          total_sold:               Number(row.total_bought),
        };
      });
    } else {
      // Fallback: legacy shop_items table
      const legacyResult = await pool.query(
        `SELECT
           si.id,
           si.name,
           si.price,
           si.category,
           si.max_stock,
           COALESCE(sold.total_sold, 0) AS total_sold
         FROM shop_items si
         LEFT JOIN (
           SELECT item_id, COUNT(*) AS total_sold
           FROM shop_purchases
           WHERE guild_id = $1
           GROUP BY item_id
         ) sold ON sold.item_id = si.id
         WHERE si.guild_id = $1 OR si.guild_id IS NULL
         ORDER BY si.price ASC`,
        [MAIN_GUILD_ID]
      ).catch(() => ({ rows: [] }));

      items = legacyResult.rows.map((row: Record<string, unknown>) => {
        const maxStock       = parseInt(String(row.max_stock), 10) || 50;
        const totalSold      = parseInt(String(row.total_sold), 10) || 0;
        const stockRemaining = Math.max(0, maxStock - totalSold);
        const price          = parseInt(String(row.price), 10) || 0;
        return {
          id:                       Number(row.id),
          item_id:                  String(row.id),
          name:                     String(row.name),
          description:              null,
          type:                     String(row.category ?? "item"),
          rarity:                   null,
          current_stock:            stockRemaining,
          max_stock:                maxStock,
          resale_supply:            0,
          is_limited:               false,
          is_sold_out:              stockRemaining === 0,
          current_value:            price,
          base_value:               price,
          resale_percent:           80,
          total_bought:             totalSold,
          total_resold:             0,
          value_24h_change:         0,
          value_24h_change_percent: 0,
          last_value_update:        null,
          price,
          category:                 String(row.category ?? "item"),
          stock_remaining:          stockRemaining,
          total_sold:               totalSold,
        };
      });
    }

    const response = { items };
    cachedShop = response;
    cacheExpiry = now + 30_000;

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[api/market/shop] GET failed:", error);
    return NextResponse.json({ error: "Failed to load shop data" }, { status: 500 });
  }
}
