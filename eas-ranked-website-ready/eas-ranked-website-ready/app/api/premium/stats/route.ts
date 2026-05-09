import { NextRequest, NextResponse } from "next/server";
import { isPremiumUser } from "@/lib/premium";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Require the requester to be authenticated
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // The target user must have premium (stats are a premium feature)
  const premium = await isPremiumUser(userId);
  if (!premium) {
    return NextResponse.json({ error: "Premium subscription required" }, { status: 403 });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        user_id,
        COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
        COALESCE((data->>'cr')::int, 0) AS cr,
        COALESCE((data->>'wins')::int, 0) AS wins,
        COALESCE((data->>'losses')::int, 0) AS losses,
        COALESCE((data->>'kills')::int, 0) AS kills,
        COALESCE((data->>'matches')::int, 0) AS matches,
        COALESCE((data->>'mvp_count')::int, 0) AS mvp_count,
        COALESCE(data->'history', '[]'::jsonb) AS history
      FROM players
      WHERE user_id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const p = result.rows[0];
    const wins = Number(p.wins);
    const losses = Number(p.losses);
    const matches = Number(p.matches);
    const kills = Number(p.kills);
    const history: string[] = Array.isArray(p.history) ? p.history : [];

    // Parse CR deltas from history
    const crDeltas: number[] = [];
    for (const entry of history) {
      const m = entry.match(/([+-]\d+)\s*CR/i);
      if (m) crDeltas.push(parseInt(m[1], 10));
    }

    const winStreak = calcStreak(history, true);
    const lossStreak = calcStreak(history, false);
    const avgCrGain = crDeltas.filter((d) => d > 0).length
      ? Math.round(crDeltas.filter((d) => d > 0).reduce((a, b) => a + b, 0) / crDeltas.filter((d) => d > 0).length)
      : 0;
    const avgCrLoss = crDeltas.filter((d) => d < 0).length
      ? Math.round(Math.abs(crDeltas.filter((d) => d < 0).reduce((a, b) => a + b, 0) / crDeltas.filter((d) => d < 0).length))
      : 0;

    return NextResponse.json({
      userId,
      stats: {
        cr: Number(p.cr),
        wins,
        losses,
        kills,
        matches,
        mvp_count: Number(p.mvp_count),
        win_rate: matches ? Math.round((wins / matches) * 100) : 0,
        kda: matches ? parseFloat((kills / matches).toFixed(2)) : 0,
        win_streak: winStreak,
        loss_streak: lossStreak,
        avg_cr_gain: avgCrGain,
        avg_cr_loss: avgCrLoss,
        total_cr_gained: crDeltas.filter((d) => d > 0).reduce((a, b) => a + b, 0),
        total_cr_lost: Math.abs(crDeltas.filter((d) => d < 0).reduce((a, b) => a + b, 0)),
        history_entries: history.length,
        cr_deltas: crDeltas.slice(-30),
      },
    });
  } catch (err) {
    console.error("[premium/stats] error:", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}

function calcStreak(history: string[], wins: boolean): number {
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i].toLowerCase();
    const isWin = entry.includes("win") || entry.includes("+");
    if (wins ? isWin : !isWin) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
