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
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const now = Date.now();
    if (cachedShop && now < cacheExpiry) {
      return NextResponse.json(cachedShop, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      });
    }

    // Try dedicated shop_items table
    const shopResult = await pool.query(
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

    let items;

    if (shopResult.rows.length > 0) {
      items = shopResult.rows.map((row: any) => {
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
      // Fallback: empty shop (no items configured yet)
      items = [];
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
