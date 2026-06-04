import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAIN_GUILD_ID = "1467697766837915804";
const FAKE_PLAYER_MIN = 9000000001n;
const FAKE_PLAYER_MAX = 9000000010n;

function isFakePlayer(playerId: string): boolean {
  try {
    const id = BigInt(playerId);
    return id >= FAKE_PLAYER_MIN && id <= FAKE_PLAYER_MAX;
  } catch {
    return false;
  }
}

// Cache: 30 seconds
let cachedOverview: unknown = null;
let cacheExpiry = 0;

// ---------------------------------------------------------------------------
// GET /api/market/overview
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const now = Date.now();
    if (cachedOverview && now < cacheExpiry) {
      return NextResponse.json(cachedOverview, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      });
    }

    // Total stocks (players with stock data in main guild)
    const stocksResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM players
       WHERE guild_id = $1
         AND COALESCE((data->>'blacklisted')::boolean, false) = false
         AND user_id NOT IN (
           '9000000001','9000000002','9000000003','9000000004','9000000005',
           '9000000006','9000000007','9000000008','9000000009','9000000010'
         )
         AND COALESCE((data->>'ranked')::boolean, false) = true`,
      [MAIN_GUILD_ID]
    ).catch(() => ({ rows: [{ total: 0 }] }));

    // Total registered users in main guild
    const usersResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM players
       WHERE guild_id = $1
         AND user_id NOT IN (
           '9000000001','9000000002','9000000003','9000000004','9000000005',
           '9000000006','9000000007','9000000008','9000000009','9000000010'
         )`,
      [MAIN_GUILD_ID]
    ).catch(() => ({ rows: [{ total: 0 }] }));

    // Starpoint value from economy/market tables (graceful fallback)
    const starpointResult = await pool.query(
      `SELECT value, change_24h
       FROM starpoint_rates
       ORDER BY recorded_at DESC
       LIMIT 1`
    ).catch(() => ({ rows: [] }));

    const starpointValue = starpointResult.rows[0]?.value ?? 1.0;
    const starpoint24hChange = starpointResult.rows[0]?.change_24h ?? 0.0;

    // Active players (played at least 1 match in main guild)
    const activeResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM players
       WHERE guild_id = $1
         AND COALESCE((data->>'matches')::int, 0) > 0
         AND COALESCE((data->>'blacklisted')::boolean, false) = false
         AND user_id NOT IN (
           '9000000001','9000000002','9000000003','9000000004','9000000005',
           '9000000006','9000000007','9000000008','9000000009','9000000010'
         )`,
      [MAIN_GUILD_ID]
    ).catch(() => ({ rows: [{ total: 0 }] }));

    const overview = {
      total_stocks: parseInt(stocksResult.rows[0]?.total ?? "0", 10),
      active_players: parseInt(activeResult.rows[0]?.total ?? "0", 10),
      total_users: parseInt(usersResult.rows[0]?.total ?? "0", 10),
      last_updated: new Date().toISOString(),
      starpoint_value: parseFloat(starpointValue) || 1.0,
      starpoint_24h_change: parseFloat(starpoint24hChange) || 0.0,
    };

    cachedOverview = overview;
    cacheExpiry = now + 30_000;

    return NextResponse.json(overview, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[api/market/overview] GET failed:", error);
    return NextResponse.json({ error: "Failed to load market overview" }, { status: 500 });
  }
}
