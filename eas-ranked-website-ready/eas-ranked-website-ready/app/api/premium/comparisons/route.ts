import { NextRequest, NextResponse } from "next/server";
import { isPremiumUser } from "@/lib/premium";
import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerRow {
  user_id: string;
  name: string;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  history: string[];
}

interface PlayerStats {
  userId: string;
  name: string;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  win_rate: number;
  kda: number;
  avg_cr_per_match: number;
  avg_cr_gain: number;
  avg_cr_loss: number;
  win_streak: number;
  loss_streak: number;
  total_cr_gained: number;
  total_cr_lost: number;
  cr_deltas: number[];
  recent_form: string[]; // last 10 results as "W" | "L" | "?"
  playstyle: {
    aggression: number;   // kills per match (0–100 normalised)
    consistency: number;  // 100 - stddev of cr_deltas (normalised)
    efficiency: number;   // win_rate
    mvp_rate: number;     // mvp_count / matches * 100
  };
  strengths: string[];
  weaknesses: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcStreak(history: string[], wins: boolean): number {
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i].toLowerCase();
    const isWin = entry.includes("win") || entry.includes("+");
    if (wins ? isWin : !isWin) streak++;
    else break;
  }
  return streak;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function buildPlayerStats(row: PlayerRow): PlayerStats {
  const wins = Number(row.wins);
  const losses = Number(row.losses);
  const kills = Number(row.kills);
  const matches = Number(row.matches);
  const mvp_count = Number(row.mvp_count);
  const cr = Number(row.cr);
  const history: string[] = Array.isArray(row.history) ? row.history : [];

  // Parse CR deltas
  const crDeltas: number[] = [];
  for (const entry of history) {
    const m = entry.match(/([+-]\d+)\s*CR/i);
    if (m) crDeltas.push(parseInt(m[1], 10));
  }

  const gains = crDeltas.filter((d) => d > 0);
  const losses_cr = crDeltas.filter((d) => d < 0);

  const avgCrGain = gains.length
    ? Math.round(gains.reduce((a, b) => a + b, 0) / gains.length)
    : 0;
  const avgCrLoss = losses_cr.length
    ? Math.round(Math.abs(losses_cr.reduce((a, b) => a + b, 0) / losses_cr.length))
    : 0;
  const totalCrGained = gains.reduce((a, b) => a + b, 0);
  const totalCrLost = Math.abs(losses_cr.reduce((a, b) => a + b, 0));

  const winRate = matches ? Math.round((wins / matches) * 100) : 0;
  const kda = matches ? parseFloat((kills / matches).toFixed(2)) : 0;
  const avgCrPerMatch = crDeltas.length
    ? parseFloat((crDeltas.reduce((a, b) => a + b, 0) / crDeltas.length).toFixed(1))
    : 0;

  // Recent form — last 10 history entries
  const recentForm: string[] = history
    .slice(-10)
    .reverse()
    .map((entry) => {
      const lower = entry.toLowerCase();
      if (lower.includes("win") || lower.includes("+")) return "W";
      if (lower.includes("loss") || lower.includes("-")) return "L";
      return "?";
    });

  // Playstyle metrics (0–100)
  const aggressionRaw = matches ? kills / matches : 0;
  const aggression = Math.min(100, Math.round(aggressionRaw * 20)); // 5 kills/match = 100
  const consistencyRaw = crDeltas.length >= 2 ? stddev(crDeltas) : 0;
  const consistency = Math.max(0, Math.round(100 - consistencyRaw / 2)); // lower stddev = more consistent
  const efficiency = winRate;
  const mvpRate = matches ? parseFloat(((mvp_count / matches) * 100).toFixed(1)) : 0;

  // Strengths & weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (winRate >= 60) strengths.push("High win rate");
  else if (winRate < 40) weaknesses.push("Low win rate");

  if (aggression >= 70) strengths.push("Aggressive playstyle");
  else if (aggression < 30) weaknesses.push("Low kill output");

  if (consistency >= 70) strengths.push("Consistent CR gains");
  else if (consistency < 40) weaknesses.push("Inconsistent performance");

  if (mvpRate >= 20) strengths.push("Frequent MVP earner");
  else if (mvpRate < 5 && matches > 10) weaknesses.push("Rarely earns MVP");

  if (avgCrPerMatch > 0) strengths.push("Positive CR trend");
  else if (avgCrPerMatch < 0) weaknesses.push("Negative CR trend");

  if (strengths.length === 0) strengths.push("Balanced player");
  if (weaknesses.length === 0) weaknesses.push("No major weaknesses");

  return {
    userId: String(row.user_id),
    name: row.name,
    cr,
    wins,
    losses,
    kills,
    matches,
    mvp_count,
    win_rate: winRate,
    kda,
    avg_cr_per_match: avgCrPerMatch,
    avg_cr_gain: avgCrGain,
    avg_cr_loss: avgCrLoss,
    win_streak: calcStreak(history, true),
    loss_streak: calcStreak(history, false),
    total_cr_gained: totalCrGained,
    total_cr_lost: totalCrLost,
    cr_deltas: crDeltas.slice(-10),
    recent_form: recentForm,
    playstyle: { aggression, consistency, efficiency, mvp_rate: mvpRate },
    strengths,
    weaknesses,
  };
}

// ---------------------------------------------------------------------------
// GET /api/premium/comparisons?userIdA=...&userIdB=...&requesterId=...
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const userIdA = searchParams.get("userIdA");
  const userIdB = searchParams.get("userIdB");
  const requesterId = searchParams.get("requesterId");

  if (!userIdA || !userIdB) {
    return NextResponse.json(
      { error: "userIdA and userIdB are required" },
      { status: 400 }
    );
  }

  // Verify the requester has premium (if provided)
  if (requesterId) {
    const premium = await isPremiumUser(requesterId);
    if (!premium) {
      return NextResponse.json(
        { error: "Premium subscription required" },
        { status: 403 }
      );
    }
  }

  try {
    const result = await pool.query(
      `
      SELECT
        user_id,
        COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
        COALESCE((data->>'cr')::int, 0)        AS cr,
        COALESCE((data->>'wins')::int, 0)       AS wins,
        COALESCE((data->>'losses')::int, 0)     AS losses,
        COALESCE((data->>'kills')::int, 0)      AS kills,
        COALESCE((data->>'matches')::int, 0)    AS matches,
        COALESCE((data->>'mvp_count')::int, 0)  AS mvp_count,
        COALESCE(data->'history', '[]'::jsonb)  AS history
      FROM players
      WHERE user_id = ANY($1::bigint[])
      `,
      [[userIdA, userIdB]]
    );

    const rowMap = new Map<string, PlayerRow>();
    for (const row of result.rows) {
      rowMap.set(String(row.user_id), row as PlayerRow);
    }

    const rowA = rowMap.get(userIdA);
    const rowB = rowMap.get(userIdB);

    if (!rowA) {
      return NextResponse.json({ error: `Player A (${userIdA}) not found` }, { status: 404 });
    }
    if (!rowB) {
      return NextResponse.json({ error: `Player B (${userIdB}) not found` }, { status: 404 });
    }

    const statsA = buildPlayerStats(rowA);
    const statsB = buildPlayerStats(rowB);

    // Head-to-head verdict
    const verdict = {
      higher_cr: statsA.cr > statsB.cr ? statsA.name : statsB.cr > statsA.cr ? statsB.name : "Tied",
      better_win_rate:
        statsA.win_rate > statsB.win_rate
          ? statsA.name
          : statsB.win_rate > statsA.win_rate
          ? statsB.name
          : "Tied",
      more_kills:
        statsA.kills > statsB.kills
          ? statsA.name
          : statsB.kills > statsA.kills
          ? statsB.name
          : "Tied",
      more_mvps:
        statsA.mvp_count > statsB.mvp_count
          ? statsA.name
          : statsB.mvp_count > statsA.mvp_count
          ? statsB.name
          : "Tied",
      better_avg_cr:
        statsA.avg_cr_per_match > statsB.avg_cr_per_match
          ? statsA.name
          : statsB.avg_cr_per_match > statsA.avg_cr_per_match
          ? statsB.name
          : "Tied",
      more_consistent:
        statsA.playstyle.consistency > statsB.playstyle.consistency
          ? statsA.name
          : statsB.playstyle.consistency > statsA.playstyle.consistency
          ? statsB.name
          : "Tied",
    };

    // Overall score (count wins across categories)
    const categories = Object.values(verdict);
    const scoreA = categories.filter((v) => v === statsA.name).length;
    const scoreB = categories.filter((v) => v === statsB.name).length;
    const overall =
      scoreA > scoreB ? statsA.name : scoreB > scoreA ? statsB.name : "Tied";

    return NextResponse.json({
      playerA: statsA,
      playerB: statsB,
      verdict,
      overall,
      scoreA,
      scoreB,
    });
  } catch (err) {
    console.error("[premium/comparisons] error:", err);
    return NextResponse.json({ error: "Failed to load comparison data" }, { status: 500 });
  }
}
