"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditEntry {
  id: string;
  user_id: string;
  old_cr: number | null;
  new_cr: number | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string;
  reason: string;
  changed_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PlayerHistoryPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Filters
  const [userId, setUserId] = useState("");
  const [minutes, setMinutes] = useState<number | "">("");

  // Results
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Recent changes (default view)
  const [recentChanges, setRecentChanges] = useState<AuditEntry[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // ---------------------------------------------------------------------------
  // Auth check
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.user) {
          setAuthChecked(true);
          return;
        }
        const check = await fetch("/api/giveaway/list");
        setIsOwner(check.ok);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // ---------------------------------------------------------------------------
  // Load recent changes on mount
  // ---------------------------------------------------------------------------

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch("/api/admin/recent-changes?minutes=1440");
      if (res.ok) {
        const data = await res.json();
        setRecentChanges(data.changes ?? []);
      }
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) loadRecent();
  }, [isOwner, loadRecent]);

  // ---------------------------------------------------------------------------
  // Search player history
  // ---------------------------------------------------------------------------

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) return;

    setLoading(true);
    setError(null);
    setHistory([]);
    setSearched(false);

    try {
      const params = new URLSearchParams({ userId: userId.trim() });
      if (minutes !== "") params.set("limit", "200");

      const res = await fetch(`/api/admin/player-history?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setHistory(data.history ?? []);
        setSearched(true);
        if ((data.history ?? []).length === 0) {
          setError("No audit history found for this player.");
        }
      } else {
        setError(data.error ?? "Failed to load history.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

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
            <p className="mt-2 text-zinc-400">This page is restricted to EAS Arena owners.</p>
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

  return (
    <Shell>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black">📋 Audit Log</h1>
          <p className="mt-2 text-zinc-400">
            Full change history for all player data. Owner access only.
          </p>
        </div>
        <SoundLink
          href="/admin/player-editor"
          soundType="click"
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/5 transition"
        >
          🔧 Player Editor
        </SoundLink>
      </div>

      {/* Search by player */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
        <h2 className="mb-4 text-lg font-black">🔍 Search Player History</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Discord User ID…"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:border-orange-600/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !userId.trim()}
            className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-black text-white hover:bg-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "…" : "Load History"}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {searched && history.length > 0 && (
          <div className="mt-5">
            <p className="mb-3 text-sm text-zinc-400">
              {history.length} change{history.length !== 1 ? "s" : ""} found for{" "}
              <span className="font-mono text-white">{userId}</span>
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-black uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3 text-left">When</th>
                    <th className="px-4 py-3 text-left">Old CR</th>
                    <th className="px-4 py-3 text-left">New CR</th>
                    <th className="px-4 py-3 text-left">Δ CR</th>
                    <th className="px-4 py-3 text-left">Changed By</th>
                    <th className="px-4 py-3 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => {
                    const delta =
                      entry.old_cr !== null && entry.new_cr !== null
                        ? entry.new_cr - entry.old_cr
                        : null;
                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                          {fmt(entry.changed_at)}
                        </td>
                        <td className="px-4 py-3 font-mono text-red-400">
                          {entry.old_cr?.toLocaleString() ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-green-400">
                          {entry.new_cr?.toLocaleString() ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {delta !== null ? (
                            <span
                              className={
                                delta > 0
                                  ? "text-green-400"
                                  : delta < 0
                                  ? "text-red-400"
                                  : "text-zinc-500"
                              }
                            >
                              {delta > 0 ? "+" : ""}
                              {delta.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                          {entry.changed_by}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-300 max-w-xs truncate">
                          {entry.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Recent changes — last 24h */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-black">🕐 All Changes — Last 24 Hours</h2>
          <button
            onClick={loadRecent}
            disabled={loadingRecent}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
          >
            {loadingRecent ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {loadingRecent && recentChanges.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 animate-pulse">Loading…</div>
        ) : recentChanges.length === 0 ? (
          <div className="p-10 text-center text-zinc-500">No changes in the last 24 hours.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-black uppercase tracking-wider text-zinc-500">
                  <th className="px-6 py-3 text-left">When</th>
                  <th className="px-4 py-3 text-left">Player ID</th>
                  <th className="px-4 py-3 text-left">Old CR</th>
                  <th className="px-4 py-3 text-left">New CR</th>
                  <th className="px-4 py-3 text-left">Δ</th>
                  <th className="px-4 py-3 text-left">Changed By</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {recentChanges.map((entry) => {
                  const delta =
                    entry.old_cr !== null && entry.new_cr !== null
                      ? entry.new_cr - entry.old_cr
                      : null;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="px-6 py-3 text-xs text-zinc-400 whitespace-nowrap">
                        {fmt(entry.changed_at)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                        {entry.user_id}
                      </td>
                      <td className="px-4 py-3 font-mono text-red-400">
                        {entry.old_cr?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-green-400">
                        {entry.new_cr?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {delta !== null ? (
                          <span
                            className={
                              delta > 0
                                ? "text-green-400"
                                : delta < 0
                                ? "text-red-400"
                                : "text-zinc-500"
                            }
                          >
                            {delta > 0 ? "+" : ""}
                            {delta.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                        {entry.changed_by}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-300 max-w-xs truncate">
                        {entry.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
