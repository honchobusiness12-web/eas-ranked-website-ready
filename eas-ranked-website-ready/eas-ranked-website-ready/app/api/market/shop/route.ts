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
// Returns active shop items from market_shop_items (new system), falling back
// to the legacy shop_items table if no items are found.
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const now = Date.now();
    if (cachedShop && now < cacheExpiry) {
      return NextResponse.json(cachedShop, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      });
    }

    // Try new market_shop_items table first
    const newShopResult = await pool.query(
      `SELECT
         id,
         item_id,
         name,
         description,
         type        AS category,
         rarity,
         current_value AS price,
         current_stock AS stock_remaining,
         max_stock,
         resale_supply,
         is_limited,
         is_sold_out,
         total_bought AS total_sold,
         total_resold,
         demand_score,
         last_value_update
       FROM market_shop_items
       WHERE guild_id = $1 AND is_active = TRUE
       ORDER BY name ASC`,
      [MAIN_GUILD_ID]
    ).catch(() => ({ rows: [] }));

    let items: Array<{
      id: string | number;
      name: string;
      price: number;
      category: string;
      stock_remaining: number;
      total_sold: number;
      rarity?: string | null;
      is_sold_out?: boolean;
      is_limited?: boolean;
      resale_supply?: number;
    }>;

    if (newShopResult.rows.length > 0) {
      // Use new market_shop_items data
      items = newShopResult.rows.map((row: any) => ({
        id: row.item_id ?? row.id,
        name: row.name,
        price: parseInt(row.price, 10) || 0,
        category: row.category || "item",
        stock_remaining: parseInt(row.stock_remaining, 10) || 0,
        total_sold: parseInt(row.total_sold, 10) || 0,
        rarity: row.rarity ?? null,
        is_sold_out: Boolean(row.is_sold_out),
        is_limited: Boolean(row.is_limited),
        resale_supply: parseInt(row.resale_supply, 10) || 0,
      }));
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

      if (legacyResult.rows.length > 0) {
        items = legacyResult.rows.map((row: any) => {
          const maxStock = parseInt(row.max_stock, 10) || 50;
          const totalSold = parseInt(row.total_sold, 10) || 0;
          const stockRemaining = Math.max(0, maxStock - totalSold);
          return {
            id: row.id,
            name: row.name,
            price: parseInt(row.price, 10) || 0,
            category: row.category || "item",
            stock_remaining: stockRemaining,
            total_sold: totalSold,
          };
        });
      } else {
        items = [];
      }
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
