"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PremiumBadge from "@/components/PremiumBadge";
import PremiumUpsell from "@/components/PremiumUpsell";

interface AdvancedStats {
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  win_rate: number;
  kda: number;
  win_streak: number;
  loss_streak: number;
  avg_cr_gain: number;
  avg_cr_loss: number;
  total_cr_gained: number;
  total_cr_lost: number;
  history_entries: number;
  cr_deltas: number[];
}

export default function AdvancedStatsPage() {
  const [sessionUserId, setSessionUserId] = useState("");
  const [sessionIsPremium, setSessionIsPremium] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [inputId, setInputId] = useState("");
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPremium, setIsPremium] = useState(true);

  // Auto-load the authenticated user's ID and premium status on mount
  useEffect(() => {
    setSessionLoading(true);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          const uid: string = data.user.id;
          setSessionUserId(uid);
          return fetch(`/api/premium/status?userId=${uid}`)
            .then((r) => r.json())
            .then((s) => setSessionIsPremium(s.premium ?? false));
        }
      })
      .catch(() => {})
      .finally(() => setSessionLoading(false));
  }, []);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputId.trim()) return;
    const uid = inputId.trim();
    setUserId(uid);
    setLoading(true);
    setError("");
    setStats(null);

    try {
      const res = await fetch(`/api/premium/stats?userId=${uid}`);
      if (res.status === 403) {
        setIsPremium(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setIsPremium(true);
        setStats(data.stats);
      }
    } catch {
      setError("Failed to load stats.");
    } finally {
      setLoading(false);
    }
  }

  // Whether the currently viewed stats belong to the authenticated user
  const isOwnStats = sessionUserId !== "" && userId === sessionUserId;

  // Show loading while checking session
  if (sessionLoading) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse">Checking premium status…</p>
        </div>
      </Shell>
    );
  }

  // Gate: must be logged in and have premium
  if (!sessionLoading && sessionUserId && !sessionIsPremium) {
    return (
      <Shell>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black">📊 Advanced Stats</h1>
            <p className="mt-2 text-zinc-400">Deep-dive analytics for Premium members.</p>
          </div>
          <PremiumBadge size="lg" />
        </div>
        <PremiumUpsell message="Advanced Stats are a Premium-only feature. Upgrade to unlock deep-dive analytics, CR trend charts, and more." />
      </Shell>
    );
  }

  // Mini sparkline from cr_deltas
  function renderSparkline(deltas: number[]) {
    if (!deltas || deltas.length < 2) return null;
    const W = 300;
    const H = 80;
    const PAD = 8;

    // Build running totals
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

    const isUp = points[points.length - 1] >= points[0];

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        <path d={pathD} fill="none" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={toX(points.length - 1)} cy={toY(points[points.length - 1])} r="3" fill={isUp ? "#22c55e" : "#ef4444"} />
      </svg>
    );
  }

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">📊 Advanced Stats</h1>
          <p className="mt-2 text-zinc-400">Deep-dive analytics for Premium members.</p>
        </div>
        <PremiumBadge size="lg" />
      </div>

      {/* Session info */}
      {sessionUserId && (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-4 mb-6 flex items-center gap-3">
          <span className="text-lg">🔒</span>
          <p className="text-sm text-zinc-400">
            Signed in as{" "}
            <span className="text-zinc-300 font-mono text-xs">{sessionUserId}</span>
            {sessionIsPremium ? (
              <span className="ml-2 text-yellow-400 font-bold text-xs">💎 Premium</span>
            ) : (
              <span className="ml-2 text-zinc-500 text-xs">(no premium)</span>
            )}
          </p>
          <p className="ml-auto text-xs text-zinc-600">You can view any player's stats. Only your own stats can be exported.</p>
        </div>
      )}

      {/* Lookup */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6 mb-6">
        <h2 className="mb-3 text-lg font-black">🔍 Enter a Discord User ID</h2>
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
            {loading ? "Loading…" : "Load Stats"}
          </button>
        </form>
        {userId && (
          <p className={`mt-2 text-xs font-bold ${isOwnStats ? "text-green-400" : "text-zinc-500"}`}>
            {isOwnStats ? "✅ Viewing your own stats" : "👁️ Viewing another player's stats (read-only)"}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-700/40 bg-red-950/20 p-4 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {userId && !isPremium && (
        <PremiumUpsell message="Advanced Stats are a Premium-only feature. Upgrade to unlock deep-dive analytics, CR trend charts, and more." />
      )}

      {stats && (
        <div className="space-y-6 animate-fade-in">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { label: "CR", value: stats.cr.toLocaleString(), color: "text-orange-400" },
              { label: "Win Rate", value: `${stats.win_rate}%`, color: "text-green-400" },
              { label: "KDA", value: stats.kda.toFixed(2), color: "text-teal-400" },
              { label: "Total Matches", value: stats.matches.toLocaleString(), color: "text-zinc-300" },
              { label: "Win Streak", value: stats.win_streak.toString(), color: "text-yellow-400" },
              { label: "Loss Streak", value: stats.loss_streak.toString(), color: "text-red-400" },
              { label: "Avg CR Gain", value: `+${stats.avg_cr_gain}`, color: "text-green-400" },
              { label: "Avg CR Loss", value: `-${stats.avg_cr_loss}`, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-[#0d0d14] p-4">
                <p className="text-xs text-zinc-400">{label}</p>
                <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* CR trend sparkline */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-xl font-black">📈 CR Trend (Last 30 Matches)</h2>
            {stats.cr_deltas.length >= 2 ? (
              <>
                {renderSparkline(stats.cr_deltas)}
                <div className="mt-3 flex justify-between text-xs text-zinc-500">
                  <span>Oldest</span>
                  <span className={stats.cr_deltas.reduce((a, b) => a + b, 0) >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                    Net: {stats.cr_deltas.reduce((a, b) => a + b, 0) >= 0 ? "+" : ""}{stats.cr_deltas.reduce((a, b) => a + b, 0)} CR
                  </span>
                  <span>Latest</span>
                </div>
              </>
            ) : (
              <p className="text-zinc-500 text-sm">Not enough match history to display trend.</p>
            )}
          </div>

          {/* CR breakdown */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
              <h2 className="mb-4 text-xl font-black">💰 CR Breakdown</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-green-950/20 border border-green-800/30 px-4 py-3">
                  <span className="text-sm text-zinc-400">Total CR Gained</span>
                  <span className="font-black text-green-400">+{stats.total_cr_gained.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-red-950/20 border border-red-800/30 px-4 py-3">
                  <span className="text-sm text-zinc-400">Total CR Lost</span>
                  <span className="font-black text-red-400">-{stats.total_cr_lost.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <span className="text-sm text-zinc-400">Net CR Change</span>
                  <span className={`font-black ${stats.total_cr_gained - stats.total_cr_lost >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {stats.total_cr_gained - stats.total_cr_lost >= 0 ? "+" : ""}{(stats.total_cr_gained - stats.total_cr_lost).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <span className="text-sm text-zinc-400">History Entries</span>
                  <span className="font-black text-zinc-300">{stats.history_entries}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
              <h2 className="mb-4 text-xl font-black">🎯 Performance</h2>
              <div className="space-y-3">
                {[
                  { label: "Wins", value: stats.wins, color: "#22c55e" },
                  { label: "Losses", value: stats.losses, color: "#ef4444" },
                  { label: "Kills", value: stats.kills, color: "#f97316" },
                  { label: "MVPs", value: stats.mvp_count, color: "#FFD700" },
                ].map(({ label, value, color }) => {
                  const max = Math.max(stats.wins, stats.losses, stats.kills, stats.mvp_count, 1);
                  const pct = Math.round((value / max) * 100);
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-400">{label}</span>
                        <span className="font-black" style={{ color }}>{value.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent CR deltas */}
          {stats.cr_deltas.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
              <h2 className="mb-4 text-xl font-black">📋 Recent CR Changes</h2>
              <div className="flex flex-wrap gap-2">
                {stats.cr_deltas.slice(-20).reverse().map((delta, i) => (
                  <span
                    key={i}
                    className={`rounded-lg px-3 py-1.5 text-sm font-black border ${
                      delta > 0
                        ? "border-green-800/30 bg-green-950/20 text-green-400"
                        : delta < 0
                        ? "border-red-800/30 bg-red-950/20 text-red-400"
                        : "border-white/10 bg-white/5 text-zinc-400"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}{delta}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!userId && (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-12 text-center">
          <p className="text-5xl mb-4">📊</p>
          <h2 className="text-xl font-black text-zinc-300">Enter your Discord User ID to view advanced stats</h2>
          <p className="mt-2 text-sm text-zinc-500">Premium members get access to deep-dive analytics and CR trend charts.</p>
        </div>
      )}
    </Shell>
  );
}
