"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyticsTotals {
  totalPlayers: number;
  rankedPlayers: number;
  blacklistedPlayers: number;
  avgCR: number;
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  maxCR: number;
  minCR: number;
}

interface CRBucket {
  bucket: string;
  count: number;
}

interface ActivePlayer {
  user_id: string;
  name: string;
  cr: number;
  matches: number;
  wins: number;
  losses: number;
}

interface CREdit {
  player_id: string;
  player_name: string;
  old_cr: number;
  new_cr: number;
  edited_by: string;
  edited_at: string;
  reason: string;
}

interface AnalyticsData {
  totals: AnalyticsTotals;
  crDistribution: CRBucket[];
  topActivePlayers: ActivePlayer[];
  recentCREdits: CREdit[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  color = "text-white",
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
          <p className={`mt-1 text-3xl font-black ${color}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function fmtTs(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminAnalyticsPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner]         = useState(false);

  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => { setIsOwner(d.isDeveloper === true); setAuthChecked(true); })
      .catch(() => setAuthChecked(true));
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        setData(await res.json());
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to load analytics.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) fetchAnalytics();
  }, [isOwner, fetchAnalytics]);

  // -------------------------------------------------------------------------
  // Auth gate
  // -------------------------------------------------------------------------

  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse">Checking access…</p>
        </div>
      </Shell>
    );
  }

  if (!isOwner) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🚫</p>
            <h1 className="text-2xl font-black text-red-400">Access Denied</h1>
            <p className="mt-2 text-zinc-400">This page is restricted to the EAS Arena developer.</p>
            <SoundLink
              href="/"
              soundType="click"
              className="mt-6 inline-block rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-zinc-300 hover:bg-white/5 transition"
            >
              ← Back to Dashboard
            </SoundLink>
          </div>
        </div>
      </Shell>
    );
  }

  // -------------------------------------------------------------------------
  // Main UI
  // -------------------------------------------------------------------------

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">📊 Analytics Dashboard</h1>
          <p className="mt-2 text-zinc-400">
            Platform-wide statistics and activity metrics. Developer access only.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-700/40 bg-red-950/20 px-4 py-3 text-sm font-bold text-red-300">
          ❌ {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse">Loading analytics…</p>
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* Top stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard
              label="Total Players"
              value={data.totals.totalPlayers}
              icon="👥"
              color="text-white"
            />
            <StatCard
              label="Ranked Players"
              value={data.totals.rankedPlayers}
              sub={`${data.totals.totalPlayers > 0 ? Math.round((data.totals.rankedPlayers / data.totals.totalPlayers) * 100) : 0}% of total`}
              icon="🏆"
              color="text-orange-400"
            />
            <StatCard
              label="Total Matches"
              value={data.totals.totalMatches}
              icon="⚔️"
              color="text-blue-400"
            />
            <StatCard
              label="Average CR"
              value={data.totals.avgCR}
              sub={`Max: ${data.totals.maxCR.toLocaleString()}`}
              icon="📈"
              color="text-yellow-400"
            />
            <StatCard
              label="Total Wins"
              value={data.totals.totalWins}
              icon="✅"
              color="text-green-400"
            />
            <StatCard
              label="Total Losses"
              value={data.totals.totalLosses}
              icon="❌"
              color="text-red-400"
            />
            <StatCard
              label="Blacklisted"
              value={data.totals.blacklistedPlayers}
              icon="🚫"
              color="text-red-400"
            />
            <StatCard
              label="Overall Win Rate"
              value={
                data.totals.totalWins + data.totals.totalLosses > 0
                  ? `${Math.round((data.totals.totalWins / (data.totals.totalWins + data.totals.totalLosses)) * 100)}%`
                  : "—"
              }
              icon="🎯"
              color="text-purple-400"
            />
          </div>

          {/* CR Distribution */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-5 text-xl font-black">📊 CR Distribution</h2>
            {data.crDistribution.length === 0 ? (
              <p className="text-zinc-500 text-sm">No data available.</p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const maxCount = Math.max(...data.crDistribution.map((b) => b.count), 1);
                  return data.crDistribution.map((bucket) => (
                    <div key={bucket.bucket} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-right text-xs font-bold text-zinc-400">
                        {bucket.bucket}
                      </span>
                      <div className="flex-1 h-6 rounded-lg bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-lg bg-gradient-to-r from-orange-600 to-amber-500 transition-all"
                          style={{ width: `${Math.round((bucket.count / maxCount) * 100)}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-xs font-black text-white">
                        {bucket.count.toLocaleString()}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Active Players */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
              <h2 className="mb-4 text-xl font-black">🔥 Most Active Players</h2>
              {data.topActivePlayers.length === 0 ? (
                <p className="text-zinc-500 text-sm">No data available.</p>
              ) : (
                <div className="space-y-2">
                  {data.topActivePlayers.map((p, i) => (
                    <div
                      key={p.user_id}
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5"
                    >
                      <span className="w-5 text-center text-xs font-black text-zinc-600">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-zinc-600">{p.matches} matches</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-orange-400">{p.cr.toLocaleString()} CR</p>
                        <p className="text-[10px] text-zinc-500">
                          {p.wins}W / {p.losses}L
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent CR Edits */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
              <h2 className="mb-4 text-xl font-black">✏️ Recent CR Edits</h2>
              {data.recentCREdits.length === 0 ? (
                <p className="text-zinc-500 text-sm">No CR edits recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentCREdits.map((edit, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sm text-white truncate">{edit.player_name}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-zinc-500">{edit.old_cr}</span>
                          <span className="text-xs text-zinc-600">→</span>
                          <span
                            className={`text-xs font-black ${
                              edit.new_cr > edit.old_cr ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {edit.new_cr}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[10px] text-zinc-600 truncate">{edit.reason}</p>
                        <p className="text-[10px] text-zinc-600 shrink-0 ml-2">{fmtTs(edit.edited_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <SoundLink
                  href="/admin/cr"
                  soundType="click"
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                >
                  View full CR audit log →
                </SoundLink>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
