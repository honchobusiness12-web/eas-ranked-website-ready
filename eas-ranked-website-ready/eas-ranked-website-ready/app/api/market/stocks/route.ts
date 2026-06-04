import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAIN_GUILD_ID = "1467697766837915804";
const FAKE_PLAYER_IDS = [
  "9000000001","9000000002","9000000003","9000000004","9000000005",
  "9000000006","9000000007","9000000008","9000000009","9000000010",
];

// Cache: 30 seconds
let cachedStocks: unknown = null;
let cacheExpiry = 0;

// ---------------------------------------------------------------------------
// Derive a stock price from CR (mirrors typical EAS economy formulas)
// Price = CR * 100 + base 10,000
// ---------------------------------------------------------------------------

function crToPrice(cr: number): number {
  return Math.max(10_000, cr * 100 + 10_000);
}

// ---------------------------------------------------------------------------
// GET /api/market/stocks
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const now = Date.now();
    if (cachedStocks && now < cacheExpiry) {
      return NextResponse.json(cachedStocks, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      });
    }

    // Try to fetch from a dedicated stocks table first
    const stocksTableResult = await pool.query(
      `SELECT
         s.player_id,
         s.price,
         s.price_change,
         s.status,
         p.data->>'display_name' AS player_name,
         COALESCE((p.data->>'cr')::int, 0) AS cr,
         COALESCE((p.data->>'wins')::int, 0) AS wins,
         COALESCE((p.data->>'losses')::int, 0) AS losses,
         COALESCE((p.data->>'mvp_count')::int, 0) AS mvps
       FROM player_stocks s
       JOIN players p ON p.user_id = s.player_id::text
       WHERE p.guild_id = $1
         AND s.player_id::text NOT IN (${FAKE_PLAYER_IDS.map((_, i) => `$${i + 2}`).join(",")})
         AND COALESCE((p.data->>'blacklisted')::boolean, false) = false
       ORDER BY s.price DESC
       LIMIT 10`,
      [MAIN_GUILD_ID, ...FAKE_PLAYER_IDS]
    ).catch(() => ({ rows: [] }));

    let stocks;

    if (stocksTableResult.rows.length > 0) {
      // Use dedicated stocks table data
      stocks = stocksTableResult.rows.map((row: any, idx: number) => {
        const price = parseInt(row.price, 10) || 0;
        const priceChange = parseInt(row.price_change, 10) || 0;
        const priceChangePct = price > 0 ? parseFloat(((priceChange / (price - priceChange)) * 100).toFixed(2)) : 0;
        return {
          rank: idx + 1,
          player_id: row.player_id,
          player_name: row.player_name || "Unknown Player",
          price,
          price_change: priceChange,
          price_change_percent: priceChangePct,
          cr: parseInt(row.cr, 10) || 0,
          status: row.status || "active",
          wins: parseInt(row.wins, 10) || 0,
          losses: parseInt(row.losses, 10) || 0,
          mvps: parseInt(row.mvps, 10) || 0,
        };
      });
    } else {
      // Fallback: derive stock prices from player CR data
      const playersResult = await pool.query(
        `SELECT
           user_id AS player_id,
           COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS player_name,
           COALESCE((data->>'cr')::int, 0) AS cr,
           COALESCE((data->>'wins')::int, 0) AS wins,
           COALESCE((data->>'losses')::int, 0) AS losses,
           COALESCE((data->>'mvp_count')::int, 0) AS mvps,
           COALESCE((data->>'ranked')::boolean, false) AS ranked
         FROM players
         WHERE guild_id = $1
           AND COALESCE((data->>'blacklisted')::boolean, false) = false
           AND COALESCE((data->>'ranked')::boolean, false) = true
           AND user_id NOT IN (${FAKE_PLAYER_IDS.map((_, i) => `$${i + 2}`).join(",")})
         ORDER BY cr DESC
         LIMIT 10`,
        [MAIN_GUILD_ID, ...FAKE_PLAYER_IDS]
      );

      stocks = playersResult.rows.map((row: any, idx: number) => {
        const cr = parseInt(row.cr, 10) || 0;
        const price = crToPrice(cr);
        // Simulate a small price change based on win/loss ratio
        const wins = parseInt(row.wins, 10) || 0;
        const losses = parseInt(row.losses, 10) || 0;
        const total = wins + losses;
        const winRate = total > 0 ? wins / total : 0.5;
        const priceChange = Math.round(price * (winRate - 0.5) * 0.1);
        const priceChangePct = price > 0 ? parseFloat(((priceChange / price) * 100).toFixed(2)) : 0;

        return {
          rank: idx + 1,
          player_id: row.player_id,
          player_name: row.player_name || "Unknown Player",
          price,
          price_change: priceChange,
          price_change_percent: priceChangePct,
          cr,
          status: "active",
          wins,
          losses,
          mvps: parseInt(row.mvps, 10) || 0,
        };
      });
    }

    const response = { stocks };
    cachedStocks = response;
    cacheExpiry = now + 30_000;

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[api/market/stocks] GET failed:", error);
    return NextResponse.json({ error: "Failed to load market stocks" }, { status: 500 });
  }
}
