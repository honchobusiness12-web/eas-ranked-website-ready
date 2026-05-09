"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumUpsell from "@/components/PremiumUpsell";
import PlayerSearch from "@/components/PlayerSearch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Player {
  user_id: string;
  name: string;
  username?: string | null;
  avatar_url?: string | null;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  ranked: boolean;
}

interface PlaystyleMetrics {
  aggression: number;
  consistency: number;
  efficiency: number;
  mvp_rate: number;
}

interface PremiumPlayerStats {
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
  recent_form: string[];
  playstyle: PlaystyleMetrics;
  strengths: string[];
  weaknesses: string[];
}

interface ComparisonResult {
  playerA: PremiumPlayerStats;
  playerB: PremiumPlayerStats;
  verdict: Record<string, string>;
  overall: string;
  scoreA: number;
  scoreB: number;
}

interface SavedComparison {
  id: string;
  playerA: Player;
  playerB: Player;
  savedAt: string;
  label?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatBar({
  label,
  valueA,
  valueB,
  nameA,
  nameB,
  format = (v: number) => v.toLocaleString(),
}: {
  label: string;
  valueA: number;
  valueB: number;
  nameA: string;
  nameB: string;
  format?: (v: number) => string;
}) {
  const total = valueA + valueB || 1;
  const pctA = Math.round((valueA / total) * 100);
  const pctB = 100 - pctA;
  const aWins = valueA > valueB;
  const bWins = valueB > valueA;

  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span className={aWins ? "font-black text-orange-300" : ""}>{format(valueA)}</span>
        <span className="text-zinc-500">{label}</span>
        <span className={bWins ? "font-black text-blue-300" : ""}>{format(valueB)}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${pctA}%`,
            background: aWins ? "#f97316" : "#6b7280",
          }}
        />
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${pctB}%`,
            background: bWins ? "#3b82f6" : "#4b5563",
          }}
        />
      </div>
    </div>
  );
}

function PlaystyleBar({
  label,
  valueA,
  valueB,
}: {
  label: string;
  valueA: number;
  valueB: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="text-zinc-600 text-[10px]">{valueA} vs {valueB}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500 transition-all duration-700"
            style={{ width: `${Math.min(100, valueA)}%` }}
          />
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-700"
            style={{ width: `${Math.min(100, valueB)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function FormBadge({ result }: { result: string }) {
  if (result === "W")
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-green-900/40 border border-green-700/40 text-xs font-black text-green-400">
        W
      </span>
    );
  if (result === "L")
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-900/40 border border-red-700/40 text-xs font-black text-red-400">
        L
      </span>
    );
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-black text-zinc-500">
      ?
    </span>
  );
}

function Sparkline({ deltas, color }: { deltas: number[]; color: string }) {
  if (deltas.length < 2) return <p className="text-xs text-zinc-600">Not enough data</p>;
  const W = 200;
  const H = 50;
  const PAD = 4;
  const points: number[] = [0];
  let running = 0;
  for (const d of deltas) {
    running += d;
    points.push(running);
  }
  const minV = Math.min(...points);
  const maxV = Math.max(...points);
  const range = maxV - minV || 1;
  const toX = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const toY = (v: number) => H - PAD - ((v - minV) / range) * (H - PAD * 2);
  const pathD = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 50 }}>
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={toX(points.length - 1)}
        cy={toY(points[points.length - 1])}
        r="3"
        fill={color}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ComparisonsPage() {
  const [userId, setUserId] = useState("");
  const [inputId, setInputId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [checking, setChecking] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const [playerA, setPlayerA] = useState<Player | null>(null);
  const [playerB, setPlayerB] = useState<Player | null>(null);

  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [compError, setCompError] = useState("");

  const [saved, setSaved] = useState<SavedComparison[]>([]);

  // Load players list and saved comparisons on mount
  useEffect(() => {
    setLoadingPlayers(true);
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingPlayers(false));

    try {
      const stored = localStorage.getItem("eas_premium_comparisons");
      if (stored) setSaved(JSON.parse(stored));
    } catch {}
  }, []);

  // Auto-check session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          const uid: string = data.user.id;
          setUserId(uid);
          setInputId(uid);
          return fetch(`/api/premium/status?userId=${uid}`)
            .then((r) => r.json())
            .then((s) => setIsPremium(s.premium ?? false));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch premium comparison whenever both players are selected and user is premium
  const fetchComparison = useCallback(async () => {
    if (!playerA || !playerB || playerA.user_id === playerB.user_id) return;
    setLoadingComparison(true);
    setCompError("");
    setComparison(null);
    try {
      const params = new URLSearchParams({
        userIdA: playerA.user_id,
        userIdB: playerB.user_id,
        ...(userId ? { requesterId: userId } : {}),
      });
      const res = await fetch(`/api/premium/comparisons?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setCompError(data.error ?? "Failed to load comparison.");
      } else {
        setComparison(data);
      }
    } catch {
      setCompError("Failed to load comparison data.");
    } finally {
      setLoadingComparison(false);
    }
  }, [playerA, playerB, userId]);

  useEffect(() => {
    if (isPremium && playerA && playerB && playerA.user_id !== playerB.user_id) {
      fetchComparison();
    } else {
      setComparison(null);
    }
  }, [isPremium, playerA, playerB, fetchComparison]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputId.trim()) return;
    const uid = inputId.trim();
    setUserId(uid);
    setChecking(true);
    try {
      const res = await fetch(`/api/premium/status?userId=${uid}`);
      const data = await res.json();
      setIsPremium(data.premium ?? false);
    } catch {
      setIsPremium(false);
    } finally {
      setChecking(false);
    }
  }

  function saveComparison() {
    if (!playerA || !playerB) return;
    const newComp: SavedComparison = {
      id: `${Date.now()}`,
      playerA,
      playerB,
      savedAt: new Date().toISOString(),
      label: `${playerA.name} vs ${playerB.name}`,
    };
    const updated = [newComp, ...saved].slice(0, 20);
    setSaved(updated);
    try {
      localStorage.setItem("eas_premium_comparisons", JSON.stringify(updated));
    } catch {}
  }

  function deleteComparison(id: string) {
    const updated = saved.filter((c) => c.id !== id);
    setSaved(updated);
    try {
      localStorage.setItem("eas_premium_comparisons", JSON.stringify(updated));
    } catch {}
  }

  return (
    <Shell>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">⚔️ Premium Comparisons</h1>
          <p className="mt-2 text-zinc-400">
            Deep head-to-head analysis with playstyle breakdowns, performance trends, and AI-powered insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PremiumBadge size="lg" />
          <SoundLink
            href="/compare"
            soundType="click"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-400 hover:bg-white/5 transition"
          >
            Free Compare →
          </SoundLink>
        </div>
      </div>

      {/* Premium features callout */}
      <div className="rounded-2xl border border-yellow-700/30 bg-gradient-to-br from-yellow-950/20 to-black p-5 mb-6">
        <p className="text-sm font-black text-yellow-300 mb-2">💎 Premium-Exclusive Features</p>
        <div className="flex flex-wrap gap-2">
          {[
            "Head-to-head deep stats",
            "Avg CR per match",
            "Playstyle analysis",
            "Strengths & weaknesses",
            "Recent form (last 10)",
            "Performance trends",
            "Skill breakdown",
            "Overall verdict score",
            "Save comparisons",
          ].map((f) => (
            <span
              key={f}
              className="rounded-lg border border-yellow-700/30 bg-yellow-950/20 px-2.5 py-1 text-xs font-bold text-yellow-400"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Premium verification */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 mb-6">
        <h2 className="mb-3 text-lg font-black">🔍 Verify Premium Status</h2>
        <form onSubmit={handleLookup} className="flex gap-3">
          <input
            type="text"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            placeholder="Discord User ID (e.g. 123456789012345678)"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-yellow-600/60 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-2.5 text-sm font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
          >
            {checking ? "Checking…" : "Verify"}
          </button>
        </form>
        {userId && !checking && (
          <p className={`mt-2 text-xs font-bold ${isPremium ? "text-green-400" : "text-red-400"}`}>
            {isPremium ? "✅ Premium active — all features unlocked" : "❌ No premium — upgrade to access this page"}
          </p>
        )}
      </div>

      {/* Upsell if not premium */}
      {userId && !checking && !isPremium && (
        <PremiumUpsell message="Unlock deep head-to-head analysis, playstyle breakdowns, performance trends, and more with Premium." />
      )}

      {/* Main content — only shown when premium */}
      {isPremium && (
        <>
          {/* Player selectors */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black">⚔️ Select Players</h2>
              {playerA && playerB && playerA.user_id !== playerB.user_id && (
                <button
                  onClick={saveComparison}
                  className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 text-sm font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
                >
                  💾 Save Comparison
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-orange-700/40 bg-orange-950/10 p-4">
                <p className="mb-3 text-sm font-bold text-orange-300">🟠 Player A</p>
                {loadingPlayers ? (
                  <p className="text-xs text-zinc-500 animate-pulse">Loading players…</p>
                ) : (
                  <PlayerSearch
                    players={players}
                    onSelect={setPlayerA}
                    placeholder="Search for Player A…"
                  />
                )}
                {playerA && (
                  <p className="mt-2 text-sm text-zinc-400">
                    <span className="text-green-400">✓</span>{" "}
                    <span className="font-bold text-white">{playerA.name}</span>
                    <span className="ml-2 text-zinc-600 text-xs">{playerA.cr} CR</span>
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-blue-700/40 bg-blue-950/10 p-4">
                <p className="mb-3 text-sm font-bold text-blue-300">🔵 Player B</p>
                {loadingPlayers ? (
                  <p className="text-xs text-zinc-500 animate-pulse">Loading players…</p>
                ) : (
                  <PlayerSearch
                    players={players}
                    onSelect={setPlayerB}
                    placeholder="Search for Player B…"
                  />
                )}
                {playerB && (
                  <p className="mt-2 text-sm text-zinc-400">
                    <span className="text-green-400">✓</span>{" "}
                    <span className="font-bold text-white">{playerB.name}</span>
                    <span className="ml-2 text-zinc-600 text-xs">{playerB.cr} CR</span>
                  </p>
                )}
              </div>
            </div>

            {playerA && playerB && playerA.user_id === playerB.user_id && (
              <div className="mt-4 rounded-xl border border-yellow-700/40 bg-yellow-950/20 p-4 text-center">
                <p className="text-yellow-300 font-bold">⚠️ Please select two different players.</p>
              </div>
            )}
          </div>

          {/* Loading state */}
          {loadingComparison && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-12 text-center">
              <p className="text-zinc-400 animate-pulse text-lg">⚔️ Analysing players…</p>
            </div>
          )}

          {/* Error state */}
          {compError && !loadingComparison && (
            <div className="rounded-2xl border border-red-700/40 bg-red-950/20 p-4 text-sm text-red-400 mb-4">
              {compError}
            </div>
          )}

          {/* Comparison results */}
          {comparison && !loadingComparison && (
            <div className="space-y-6 animate-fade-in">
              {/* Overall verdict banner */}
              <div className="rounded-2xl border border-yellow-700/40 bg-gradient-to-br from-yellow-950/30 to-black p-6 text-center">
                <p className="text-xs font-black uppercase tracking-widest text-yellow-600 mb-2">Overall Verdict</p>
                <p className="text-3xl font-black text-yellow-300">
                  {comparison.overall === "Tied" ? "🤝 Tied Match" : `🏆 ${comparison.overall} Wins`}
                </p>
                <div className="mt-3 flex justify-center gap-6 text-sm">
                  <span className="text-orange-400 font-black">
                    {comparison.playerA.name}: {comparison.scoreA} pts
                  </span>
                  <span className="text-zinc-600">vs</span>
                  <span className="text-blue-400 font-black">
                    {comparison.playerB.name}: {comparison.scoreB} pts
                  </span>
                </div>
              </div>

              {/* Player headers */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="rounded-2xl border border-orange-700/40 bg-orange-950/10 p-5 text-center">
                  <p className="text-xl font-black text-orange-300">{comparison.playerA.name}</p>
                  <p className="text-3xl font-black mt-1">{comparison.playerA.cr.toLocaleString()} CR</p>
                  <p className="text-xs text-zinc-500 mt-1">Win Rate: {comparison.playerA.win_rate}%</p>
                </div>
                <div className="text-2xl font-black text-zinc-600">VS</div>
                <div className="rounded-2xl border border-blue-700/40 bg-blue-950/10 p-5 text-center">
                  <p className="text-xl font-black text-blue-300">{comparison.playerB.name}</p>
                  <p className="text-3xl font-black mt-1">{comparison.playerB.cr.toLocaleString()} CR</p>
                  <p className="text-xs text-zinc-500 mt-1">Win Rate: {comparison.playerB.win_rate}%</p>
                </div>
              </div>

              {/* Head-to-head stat bars */}
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-black">📊 Head-to-Head Stats</h2>
                  <div className="flex gap-3 text-xs font-bold">
                    <span className="text-orange-400">🟠 {comparison.playerA.name}</span>
                    <span className="text-blue-400">🔵 {comparison.playerB.name}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <StatBar
                    label="CR"
                    valueA={comparison.playerA.cr}
                    valueB={comparison.playerB.cr}
                    nameA={comparison.playerA.name}
                    nameB={comparison.playerB.name}
                  />
                  <StatBar
                    label="Win Rate"
                    valueA={comparison.playerA.win_rate}
                    valueB={comparison.playerB.win_rate}
                    nameA={comparison.playerA.name}
                    nameB={comparison.playerB.name}
                    format={(v) => `${v}%`}
                  />
                  <StatBar
                    label="Avg CR / Match"
                    valueA={Math.max(0, comparison.playerA.avg_cr_per_match)}
                    valueB={Math.max(0, comparison.playerB.avg_cr_per_match)}
                    nameA={comparison.playerA.name}
                    nameB={comparison.playerB.name}
                    format={(v) => `${v > 0 ? "+" : ""}${v}`}
                  />
                  <StatBar
                    label="Kills"
                    valueA={comparison.playerA.kills}
                    valueB={comparison.playerB.kills}
                    nameA={comparison.playerA.name}
                    nameB={comparison.playerB.name}
                  />
                  <StatBar
                    label="KDA"
                    valueA={comparison.playerA.kda}
                    valueB={comparison.playerB.kda}
                    nameA={comparison.playerA.name}
                    nameB={comparison.playerB.name}
                    format={(v) => v.toFixed(2)}
                  />
                  <StatBar
                    label="MVPs"
                    valueA={comparison.playerA.mvp_count}
                    valueB={comparison.playerB.mvp_count}
                    nameA={comparison.playerA.name}
                    nameB={comparison.playerB.name}
                  />
                  <StatBar
                    label="Matches Played"
                    valueA={comparison.playerA.matches}
                    valueB={comparison.playerB.matches}
                    nameA={comparison.playerA.name}
                    nameB={comparison.playerB.name}
                  />
                </div>
              </div>

              {/* Playstyle analysis */}
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                <h2 className="mb-5 text-xl font-black">🎮 Playstyle Analysis</h2>
                <div className="space-y-4">
                  <PlaystyleBar
                    label="Aggression (kills/match)"
                    valueA={comparison.playerA.playstyle.aggression}
                    valueB={comparison.playerB.playstyle.aggression}
                  />
                  <PlaystyleBar
                    label="Consistency (CR stability)"
                    valueA={comparison.playerA.playstyle.consistency}
                    valueB={comparison.playerB.playstyle.consistency}
                  />
                  <PlaystyleBar
                    label="Efficiency (win rate)"
                    valueA={comparison.playerA.playstyle.efficiency}
                    valueB={comparison.playerB.playstyle.efficiency}
                  />
                  <PlaystyleBar
                    label="MVP Rate (%)"
                    valueA={comparison.playerA.playstyle.mvp_rate}
                    valueB={comparison.playerB.playstyle.mvp_rate}
                  />
                </div>
                <div className="mt-4 flex gap-3 text-xs font-bold">
                  <span className="text-orange-400">🟠 {comparison.playerA.name}</span>
                  <span className="text-blue-400">🔵 {comparison.playerB.name}</span>
                </div>
              </div>

              {/* Strengths & weaknesses */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Player A */}
                <div className="rounded-2xl border border-orange-700/30 bg-orange-950/5 p-5">
                  <p className="text-sm font-black text-orange-300 mb-3">🟠 {comparison.playerA.name}</p>
                  <div className="space-y-2">
                    {comparison.playerA.strengths.map((s) => (
                      <div key={s} className="flex items-center gap-2 text-sm">
                        <span className="text-green-400">✓</span>
                        <span className="text-zinc-300">{s}</span>
                      </div>
                    ))}
                    {comparison.playerA.weaknesses.map((w) => (
                      <div key={w} className="flex items-center gap-2 text-sm">
                        <span className="text-red-400">✗</span>
                        <span className="text-zinc-400">{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Player B */}
                <div className="rounded-2xl border border-blue-700/30 bg-blue-950/5 p-5">
                  <p className="text-sm font-black text-blue-300 mb-3">🔵 {comparison.playerB.name}</p>
                  <div className="space-y-2">
                    {comparison.playerB.strengths.map((s) => (
                      <div key={s} className="flex items-center gap-2 text-sm">
                        <span className="text-green-400">✓</span>
                        <span className="text-zinc-300">{s}</span>
                      </div>
                    ))}
                    {comparison.playerB.weaknesses.map((w) => (
                      <div key={w} className="flex items-center gap-2 text-sm">
                        <span className="text-red-400">✗</span>
                        <span className="text-zinc-400">{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent form — last 10 matches */}
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                <h2 className="mb-5 text-xl font-black">📋 Recent Form (Last 10 Matches)</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-orange-300 mb-2">🟠 {comparison.playerA.name}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {comparison.playerA.recent_form.length > 0 ? (
                        comparison.playerA.recent_form.map((r, i) => (
                          <FormBadge key={i} result={r} />
                        ))
                      ) : (
                        <p className="text-xs text-zinc-600">No recent match data</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-300 mb-2">🔵 {comparison.playerB.name}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {comparison.playerB.recent_form.length > 0 ? (
                        comparison.playerB.recent_form.map((r, i) => (
                          <FormBadge key={i} result={r} />
                        ))
                      ) : (
                        <p className="text-xs text-zinc-600">No recent match data</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance trends */}
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                <h2 className="mb-5 text-xl font-black">📈 Performance Trends (Last 10 Matches)</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold text-orange-300 mb-2">🟠 {comparison.playerA.name}</p>
                    <Sparkline deltas={comparison.playerA.cr_deltas} color="#f97316" />
                    <p className="text-xs text-zinc-500 mt-1">
                      Avg CR/match:{" "}
                      <span className={comparison.playerA.avg_cr_per_match >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                        {comparison.playerA.avg_cr_per_match >= 0 ? "+" : ""}
                        {comparison.playerA.avg_cr_per_match}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-300 mb-2">🔵 {comparison.playerB.name}</p>
                    <Sparkline deltas={comparison.playerB.cr_deltas} color="#3b82f6" />
                    <p className="text-xs text-zinc-500 mt-1">
                      Avg CR/match:{" "}
                      <span className={comparison.playerB.avg_cr_per_match >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                        {comparison.playerB.avg_cr_per_match >= 0 ? "+" : ""}
                        {comparison.playerB.avg_cr_per_match}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed breakdown table */}
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 overflow-x-auto">
                <h2 className="mb-5 text-xl font-black">🔢 Detailed Breakdown</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="pb-3 text-left text-xs font-black uppercase tracking-wider text-zinc-500">Stat</th>
                      <th className="pb-3 text-center text-xs font-black uppercase tracking-wider text-orange-400">
                        🟠 {comparison.playerA.name}
                      </th>
                      <th className="pb-3 text-center text-xs font-black uppercase tracking-wider text-blue-400">
                        🔵 {comparison.playerB.name}
                      </th>
                      <th className="pb-3 text-center text-xs font-black uppercase tracking-wider text-zinc-500">Edge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      {
                        stat: "CR",
                        a: comparison.playerA.cr.toLocaleString(),
                        b: comparison.playerB.cr.toLocaleString(),
                        aVal: comparison.playerA.cr,
                        bVal: comparison.playerB.cr,
                      },
                      {
                        stat: "Win Rate",
                        a: `${comparison.playerA.win_rate}%`,
                        b: `${comparison.playerB.win_rate}%`,
                        aVal: comparison.playerA.win_rate,
                        bVal: comparison.playerB.win_rate,
                      },
                      {
                        stat: "Avg CR / Match",
                        a: `${comparison.playerA.avg_cr_per_match >= 0 ? "+" : ""}${comparison.playerA.avg_cr_per_match}`,
                        b: `${comparison.playerB.avg_cr_per_match >= 0 ? "+" : ""}${comparison.playerB.avg_cr_per_match}`,
                        aVal: comparison.playerA.avg_cr_per_match,
                        bVal: comparison.playerB.avg_cr_per_match,
                      },
                      {
                        stat: "KDA",
                        a: comparison.playerA.kda.toFixed(2),
                        b: comparison.playerB.kda.toFixed(2),
                        aVal: comparison.playerA.kda,
                        bVal: comparison.playerB.kda,
                      },
                      {
                        stat: "Kills",
                        a: comparison.playerA.kills.toLocaleString(),
                        b: comparison.playerB.kills.toLocaleString(),
                        aVal: comparison.playerA.kills,
                        bVal: comparison.playerB.kills,
                      },
                      {
                        stat: "MVPs",
                        a: comparison.playerA.mvp_count.toString(),
                        b: comparison.playerB.mvp_count.toString(),
                        aVal: comparison.playerA.mvp_count,
                        bVal: comparison.playerB.mvp_count,
                      },
                      {
                        stat: "Win Streak",
                        a: comparison.playerA.win_streak.toString(),
                        b: comparison.playerB.win_streak.toString(),
                        aVal: comparison.playerA.win_streak,
                        bVal: comparison.playerB.win_streak,
                      },
                      {
                        stat: "Avg CR Gain",
                        a: `+${comparison.playerA.avg_cr_gain}`,
                        b: `+${comparison.playerB.avg_cr_gain}`,
                        aVal: comparison.playerA.avg_cr_gain,
                        bVal: comparison.playerB.avg_cr_gain,
                      },
                      {
                        stat: "Avg CR Loss",
                        a: `-${comparison.playerA.avg_cr_loss}`,
                        b: `-${comparison.playerB.avg_cr_loss}`,
                        aVal: comparison.playerB.avg_cr_loss, // lower is better
                        bVal: comparison.playerA.avg_cr_loss,
                      },
                      {
                        stat: "Total Matches",
                        a: comparison.playerA.matches.toLocaleString(),
                        b: comparison.playerB.matches.toLocaleString(),
                        aVal: comparison.playerA.matches,
                        bVal: comparison.playerB.matches,
                      },
                    ].map(({ stat, a, b, aVal, bVal }) => {
                      const aWins = aVal > bVal;
                      const bWins = bVal > aVal;
                      return (
                        <tr key={stat} className="hover:bg-white/5 transition">
                          <td className="py-3 text-zinc-400">{stat}</td>
                          <td className={`py-3 text-center font-black ${aWins ? "text-orange-300" : "text-zinc-300"}`}>
                            {a}
                          </td>
                          <td className={`py-3 text-center font-black ${bWins ? "text-blue-300" : "text-zinc-300"}`}>
                            {b}
                          </td>
                          <td className="py-3 text-center text-xs font-bold">
                            {aWins ? (
                              <span className="text-orange-400">🟠</span>
                            ) : bWins ? (
                              <span className="text-blue-400">🔵</span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Recommendation */}
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
                <h2 className="mb-4 text-xl font-black">💡 Recommendation Engine</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-orange-700/30 bg-orange-950/10 p-4">
                    <p className="text-xs font-black text-orange-300 mb-2">🟠 {comparison.playerA.name} — Tips</p>
                    <ul className="space-y-1.5 text-sm text-zinc-400">
                      {comparison.playerA.win_rate < 50 && (
                        <li>• Focus on positioning to improve win rate above 50%</li>
                      )}
                      {comparison.playerA.avg_cr_per_match < 0 && (
                        <li>• CR is trending negative — consider a more conservative playstyle</li>
                      )}
                      {comparison.playerA.playstyle.consistency < 50 && (
                        <li>• High variance in CR gains — aim for more consistent match performance</li>
                      )}
                      {comparison.playerA.playstyle.mvp_rate < 10 && comparison.playerA.matches > 5 && (
                        <li>• Low MVP rate — try to be more impactful in team fights</li>
                      )}
                      {comparison.playerA.win_rate >= 60 && comparison.playerA.avg_cr_per_match > 0 && (
                        <li>• Strong performance — keep up the momentum!</li>
                      )}
                      {comparison.playerA.win_rate >= 50 && comparison.playerA.avg_cr_per_match >= 0 && comparison.playerA.playstyle.consistency >= 50 && (
                        <li>• Well-rounded player — consider pushing for higher CR goals</li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-blue-700/30 bg-blue-950/10 p-4">
                    <p className="text-xs font-black text-blue-300 mb-2">🔵 {comparison.playerB.name} — Tips</p>
                    <ul className="space-y-1.5 text-sm text-zinc-400">
                      {comparison.playerB.win_rate < 50 && (
                        <li>• Focus on positioning to improve win rate above 50%</li>
                      )}
                      {comparison.playerB.avg_cr_per_match < 0 && (
                        <li>• CR is trending negative — consider a more conservative playstyle</li>
                      )}
                      {comparison.playerB.playstyle.consistency < 50 && (
                        <li>• High variance in CR gains — aim for more consistent match performance</li>
                      )}
                      {comparison.playerB.playstyle.mvp_rate < 10 && comparison.playerB.matches > 5 && (
                        <li>• Low MVP rate — try to be more impactful in team fights</li>
                      )}
                      {comparison.playerB.win_rate >= 60 && comparison.playerB.avg_cr_per_match > 0 && (
                        <li>• Strong performance — keep up the momentum!</li>
                      )}
                      {comparison.playerB.win_rate >= 50 && comparison.playerB.avg_cr_per_match >= 0 && comparison.playerB.playstyle.consistency >= 50 && (
                        <li>• Well-rounded player — consider pushing for higher CR goals</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loadingComparison && !comparison && !compError && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-12 text-center">
              <p className="text-5xl mb-4">⚔️</p>
              <h2 className="text-xl font-black text-zinc-300">Select two players to begin premium analysis</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Premium comparisons include playstyle analysis, performance trends, and detailed breakdowns.
              </p>
            </div>
          )}

          {/* Saved comparisons */}
          {saved.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 mt-6">
              <h2 className="mb-4 text-xl font-black">📚 Saved Comparisons</h2>
              <div className="space-y-3">
                {saved.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:border-yellow-600/30 transition"
                  >
                    <div>
                      <p className="font-bold text-sm">{comp.label}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(comp.savedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setPlayerA(comp.playerA);
                          setPlayerB(comp.playerB);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="rounded-lg border border-yellow-600/50 px-3 py-1.5 text-xs font-bold text-yellow-300 hover:bg-yellow-950/30 transition"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteComparison(comp.id)}
                        className="rounded-lg border border-red-700/40 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-950/20 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Not logged in / no ID entered yet */}
      {!userId && !checking && (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-12 text-center">
          <p className="text-5xl mb-4">💎</p>
          <h2 className="text-xl font-black text-zinc-300">Enter your Discord User ID to get started</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Premium members unlock deep head-to-head analysis, playstyle breakdowns, and more.
          </p>
          <SoundLink
            href="/premium/subscribe"
            soundType="success"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-3 font-black text-white hover:from-yellow-400 hover:to-orange-400 transition-all"
          >
            💎 Get Premium →
          </SoundLink>
        </div>
      )}
    </Shell>
  );
}
