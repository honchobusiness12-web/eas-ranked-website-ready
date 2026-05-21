import { ranks, getRank } from "@/lib/ranks";
import type { CachedPlayer } from "@/lib/cache";

// ---------------------------------------------------------------------------
// Win rate calculation
// ---------------------------------------------------------------------------

export function calcWinRate(wins: number, matches: number): number {
  if (!matches) return 0;
  return Math.round((wins / matches) * 100);
}

// ---------------------------------------------------------------------------
// Rank distribution — how many players sit in each rank tier
// ---------------------------------------------------------------------------

export interface RankBucket {
  tier: string;   // e.g. "R1 Rookie"
  count: number;
  color: string;
}

const TIER_COLORS: Record<string, string> = {
  "R1 Rookie":       "#6b7280",
  "R2 Amateur":      "#10b981",
  "R3 Pro":          "#3b82f6",
  "R4 Elite":        "#8b5cf6",
  "R5 All-Star":     "#f59e0b",
  "R6 SuperStar":    "#ef4444",
  "R7 Remorseless":  "#ec4899",
  "R8 Legend":       "#f97316",
  "R9 Unreal":       "#06b6d4",
  "R10 Hall Of Fame":"#fbbf24",
};

export function getTierColor(rankName: string): string {
  for (const [tier, color] of Object.entries(TIER_COLORS)) {
    if (rankName.startsWith(tier)) return color;
  }
  return "#6b7280";
}

export function getRankDistribution(players: CachedPlayer[]): RankBucket[] {
  const buckets: Record<string, number> = {};

  for (const p of players) {
    const rankName = getRank(Number(p.cr || 0));
    // Extract tier prefix (e.g. "R3 Pro" from "R3 Pro High")
    const parts = rankName.split(" ");
    const tier = parts.slice(0, 2).join(" ");
    buckets[tier] = (buckets[tier] || 0) + 1;
  }

  return Object.entries(buckets)
    .map(([tier, count]) => ({ tier, count, color: TIER_COLORS[tier] || "#6b7280" }))
    .sort((a, b) => {
      const aIdx = Object.keys(TIER_COLORS).indexOf(a.tier);
      const bIdx = Object.keys(TIER_COLORS).indexOf(b.tier);
      return aIdx - bIdx;
    });
}

// ---------------------------------------------------------------------------
// CR progression — build a rich dataset from history strings
// ---------------------------------------------------------------------------

export interface CrPoint {
  label: string;
  cr: number;
  matchNumber?: number;
  crBefore?: number;
  crAfter?: number;
  crDelta?: number;
  result?: "win" | "loss";
  rank?: string;
  note?: string;
  mvp?: boolean;
  timestamp?: string;
}

/**
 * Parse history entries like "+25 CR (Win)" or "-10 CR (Loss)" to extract
 * a rich CR progression array with per-match metadata.  Falls back to a
 * single point if no parseable history exists.
 */
export function parseCrProgression(history: string[], currentCr: number): CrPoint[] {
  if (!history || history.length === 0) {
    return [{ label: "Now", cr: currentCr, matchNumber: 0, crBefore: currentCr, crAfter: currentCr, crDelta: 0 }];
  }

  // Walk history in chronological order (oldest first) and reconstruct CR
  const deltas: number[] = [];
  const results: Array<"win" | "loss" | undefined> = [];
  const mvpFlags: boolean[] = [];
  const notes: Array<string | undefined> = [];

  for (const entry of history) {
    const deltaMatch = entry.match(/([+-]\d+)\s*CR/i);
    if (!deltaMatch) continue;

    deltas.push(parseInt(deltaMatch[1], 10));

    // Detect win/loss
    const lower = entry.toLowerCase();
    if (lower.includes("win")) {
      results.push("win");
    } else if (lower.includes("loss") || lower.includes("lose") || lower.includes("lost")) {
      results.push("loss");
    } else {
      results.push(deltaMatch[1].startsWith("+") ? "win" : "loss");
    }

    // Detect MVP
    mvpFlags.push(lower.includes("mvp"));

    // Extract any parenthetical note beyond Win/Loss/MVP
    const noteMatch = entry.match(/\(([^)]+)\)/g);
    if (noteMatch && noteMatch.length > 0) {
      const cleaned = noteMatch
        .map((n) => n.replace(/[()]/g, "").trim())
        .filter((n) => !["win", "loss", "mvp"].includes(n.toLowerCase()))
        .join(", ");
      notes.push(cleaned || undefined);
    } else {
      notes.push(undefined);
    }
  }

  if (deltas.length === 0) {
    return [{ label: "Now", cr: currentCr, matchNumber: 0, crBefore: currentCr, crAfter: currentCr, crDelta: 0 }];
  }

  // Reconstruct CR values backwards from current CR
  const crValues: number[] = new Array(deltas.length + 1);
  crValues[deltas.length] = currentCr;
  for (let i = deltas.length - 1; i >= 0; i--) {
    crValues[i] = Math.max(0, crValues[i + 1] - deltas[i]);
  }

  // Build rich points array (one point per match, representing state AFTER that match)
  const points: CrPoint[] = [];
  for (let i = 0; i < deltas.length; i++) {
    const matchNum = i + 1;
    const crBefore = crValues[i];
    const crAfter = crValues[i + 1];
    points.push({
      label: `Match ${matchNum}`,
      cr: crAfter,
      matchNumber: matchNum,
      crBefore,
      crAfter,
      crDelta: deltas[i],
      result: results[i],
      rank: getRank(crAfter),
      mvp: mvpFlags[i] || false,
      note: notes[i],
    });
  }

  return points.slice(-20); // last 20 data points
}

// ---------------------------------------------------------------------------
// Top gainers / losers — derived from history
// ---------------------------------------------------------------------------

export interface GainerEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  delta: number;
  cr: number;
}

export function getTopGainers(players: CachedPlayer[], limit = 5): GainerEntry[] {
  return players
    .map((p) => {
      const history = (p as any).history || [];
      let delta = 0;
      for (const entry of history.slice(-5)) {
        const m = entry.match?.(/([+-]\d+)\s*CR/i);
        if (m) delta += parseInt(m[1], 10);
      }
      return { user_id: p.user_id, name: p.name, avatar_url: p.avatar_url, delta, cr: Number(p.cr || 0) };
    })
    .filter((e) => e.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, limit);
}

export function getTopLosers(players: CachedPlayer[], limit = 5): GainerEntry[] {
  return players
    .map((p) => {
      const history = (p as any).history || [];
      let delta = 0;
      for (const entry of history.slice(-5)) {
        const m = entry.match?.(/([+-]\d+)\s*CR/i);
        if (m) delta += parseInt(m[1], 10);
      }
      return { user_id: p.user_id, name: p.name, avatar_url: p.avatar_url, delta, cr: Number(p.cr || 0) };
    })
    .filter((e) => e.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, limit);
}
