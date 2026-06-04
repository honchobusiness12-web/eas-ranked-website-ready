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
let cachedLeaderboard: unknown = null;
let cacheExpiry = 0;

// ---------------------------------------------------------------------------
// Wealth role thresholds
// ---------------------------------------------------------------------------

function getWealthRole(netWorth: number): string {
  if (netWorth >= 10_000_000) return "EAS Tycoon";
  if (netWorth >= 5_000_000)  return "Market Mogul";
  if (netWorth >= 2_000_000)  return "Millionaire";
  if (netWorth >= 1_000_000)  return "Investor";
  if (netWorth >= 500_000)    return "Trader";
  if (netWorth >= 100_000)    return "Apprentice";
  return "Newcomer";
}

// ---------------------------------------------------------------------------
// GET /api/market/leaderboard
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const now = Date.now();
    if (cachedLeaderboard && now < cacheExpiry) {
      return NextResponse.json(cachedLeaderboard, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      });
    }

    // Try dedicated economy/wallet tables first
    const economyResult = await pool.query(
      `SELECT
         u.user_id,
         COALESCE(p.data->>'display_name', p.data->>'username', 'Unknown User') AS username,
         COALESCE(u.balance, 0) AS balance,
         COALESCE(u.portfolio_value, 0) AS portfolio_value
       FROM user_economy u
       LEFT JOIN players p ON p.user_id = u.user_id::text AND p.guild_id = $1
       WHERE u.guild_id = $1
         AND u.user_id::text NOT IN (${FAKE_PLAYER_IDS.map((_, i) => `$${i + 2}`).join(",")})
       ORDER BY (COALESCE(u.balance, 0) + COALESCE(u.portfolio_value, 0)) DESC
       LIMIT 10`,
      [MAIN_GUILD_ID, ...FAKE_PLAYER_IDS]
    ).catch(() => ({ rows: [] }));

    let users;

    if (economyResult.rows.length > 0) {
      users = economyResult.rows.map((row: any, idx: number) => {
        const balance = parseInt(row.balance, 10) || 0;
        const portfolioValue = parseInt(row.portfolio_value, 10) || 0;
        const netWorth = balance + portfolioValue;
        return {
          rank: idx + 1,
          user_id: row.user_id,
          username: row.username || "Unknown User",
          net_worth: netWorth,
          balance,
          portfolio_value: portfolioValue,
          wealth_role: getWealthRole(netWorth),
        };
      });
    } else {
      // Fallback: use player CR as a proxy for wealth
      const playersResult = await pool.query(
        `SELECT
           user_id,
           COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS username,
           COALESCE((data->>'cr')::int, 0) AS cr,
           COALESCE((data->>'wins')::int, 0) AS wins,
           COALESCE((data->>'matches')::int, 0) AS matches
         FROM players
         WHERE guild_id = $1
           AND COALESCE((data->>'blacklisted')::boolean, false) = false
           AND user_id NOT IN (${FAKE_PLAYER_IDS.map((_, i) => `$${i + 2}`).join(",")})
         ORDER BY cr DESC
         LIMIT 10`,
        [MAIN_GUILD_ID, ...FAKE_PLAYER_IDS]
      );

      users = playersResult.rows.map((row: any, idx: number) => {
        const cr = parseInt(row.cr, 10) || 0;
        // Derive a simulated net worth from CR
        const balance = cr * 500;
        const portfolioValue = cr * 200;
        const netWorth = balance + portfolioValue;
        return {
          rank: idx + 1,
          user_id: row.user_id,
          username: row.username || "Unknown User",
          net_worth: netWorth,
          balance,
          portfolio_value: portfolioValue,
          wealth_role: getWealthRole(netWorth),
        };
      });
    }

    const response = { users };
    cachedLeaderboard = response;
    cacheExpiry = now + 30_000;

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[api/market/leaderboard] GET failed:", error);
    return NextResponse.json({ error: "Failed to load market leaderboard" }, { status: 500 });
  }
}
