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
let cachedTransactions: unknown = null;
let cacheExpiry = 0;

// ---------------------------------------------------------------------------
// GET /api/market/transactions
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const now = Date.now();
    if (cachedTransactions && now < cacheExpiry) {
      return NextResponse.json(cachedTransactions, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      });
    }

    // Try dedicated market_transactions table
    const txResult = await pool.query(
      `SELECT
         t.id,
         t.type,
         t.player_id,
         COALESCE(p.data->>'display_name', p.data->>'username', 'Unknown Player') AS player_name,
         t.shares,
         t.price,
         t.total,
         t.created_at AS timestamp
       FROM market_transactions t
       LEFT JOIN players p ON p.user_id = t.player_id::text AND p.guild_id = $1
       WHERE t.guild_id = $1
         AND t.player_id::text NOT IN (${FAKE_PLAYER_IDS.map((_, i) => `$${i + 2}`).join(",")})
       ORDER BY t.created_at DESC
       LIMIT 20`,
      [MAIN_GUILD_ID, ...FAKE_PLAYER_IDS]
    ).catch(() => ({ rows: [] }));

    let transactions;

    if (txResult.rows.length > 0) {
      transactions = txResult.rows.map((row: any) => ({
        id: row.id,
        type: row.type || "buy",
        player_name: row.player_name || "Unknown Player",
        shares: parseInt(row.shares, 10) || 0,
        price: parseInt(row.price, 10) || 0,
        total: parseInt(row.total, 10) || 0,
        timestamp: row.timestamp,
      }));
    } else {
      // Fallback: empty transactions
      transactions = [];
    }

    const response = { transactions };
    cachedTransactions = response;
    cacheExpiry = now + 30_000;

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[api/market/transactions] GET failed:", error);
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}
