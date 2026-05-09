"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeaderboardPlayer {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  blacklisted: boolean;
  ranked: boolean;
}

type SortKey = "cr" | "wins" | "losses" | "matches" | "name";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminLeaderboardPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner]         = useState(false);

  const [players, setPlayers]   = useState<LeaderboardPlayer[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [sort, setSort]         = useState<SortKey>("cr");
  const [offset, setOffset]     = useState(0);
  const LIMIT = 100;

  // Inline CR edit
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editCR, setEditCR]           = useState("");
  const [editReason, setEditReason]   = useState("");
  const [editMsg, setEditMsg]         = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving]           = useState(false);

  // Auth check
  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => { setIsOwner(d.isDeveloper === true); setAuthChecked(true); })
      .catch(() => setAuthChecked(true));
  }, []);

  const fetchLeaderboard = useCallback(async (s: SortKey, off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: s, limit: String(LIMIT), offset: String(off) });
      const res = await fetch(`/api/admin/leaderboard?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) fetchLeaderboard(sort, 0);
  }, [isOwner, fetchLeaderboard, sort]);

  function handleSortChange(s: SortKey) {
    setSort(s);
    setOffset(0);
    fetchLeaderboard(s, 0);
  }

  async function handleCRSave(userId: string) {
    const newCR = parseInt(editCR, 10);
    if (isNaN(newCR)) {
      setEditMsg({ type: "error", text: "CR must be a number." });
      return;
    }
    if (!editReason.trim()) {
      setEditMsg({ type: "error", text: "Reason is required." });
      return;
    }
    setSaving(true);
    setEditMsg(null);
    try {
      const res = await fetch("/api/admin/leaderboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newCR, reason: editReason.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditMsg({ type: "success", text: `✅ CR updated: ${data.oldCR} → ${data.newCR}` });
        setEditingId(null);
        setEditCR("");
        setEditReason("");
        fetchLeaderboard(sort, offset);
      } else {
        setEditMsg({ type: "error", text: data.error ?? "Update failed." });
      }
    } catch {
      setEditMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  }

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

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "cr",      label: "CR" },
    { key: "wins",    label: "Wins" },
    { key: "losses",  label: "Losses" },
    { key: "matches", label: "Matches" },
    { key: "name",    label: "Name" },
  ];

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">🏆 Leaderboard Management</h1>
          <p className="mt-2 text-zinc-400">
            View all players, sort by stats, and edit CR inline. Developer access only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLeaderboard(sort, offset)}
            disabled={loading}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
          >
            {loading ? "…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Edit feedback */}
      {editMsg && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm font-bold ${
            editMsg.type === "success"
              ? "border-green-700/40 bg-green-950/20 text-green-300"
              : "border-red-700/40 bg-red-950/20 text-red-300"
          }`}
        >
          {editMsg.text}
        </div>
      )}

      {/* Sort controls */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-xs text-zinc-500 self-center mr-1">Sort by:</span>
        {SORT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleSortChange(key)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              sort === key
                ? "bg-orange-600 text-white"
                : "border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-600 self-center">
          {total.toLocaleString()} total players
        </span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] font-black uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3 text-right">CR</th>
                <th className="px-4 py-3 text-right">W</th>
                <th className="px-4 py-3 text-right">L</th>
                <th className="px-4 py-3 text-right">Matches</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Edit CR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && players.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-zinc-500 animate-pulse">
                    Loading leaderboard…
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                    No players found.
                  </td>
                </tr>
              ) : (
                players.map((p, i) => {
                  const isEditing = editingId === p.user_id;
                  return (
                    <tr key={p.user_id} className="hover:bg-white/[0.03] transition">
                      <td className="px-4 py-3 text-zinc-600 font-mono text-xs">
                        {offset + i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-white">{p.name}</p>
                        <p className="text-[10px] font-mono text-zinc-600">{p.user_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-zinc-400">
                          {p.cr >= 2100 ? "🔴" : p.cr >= 1200 ? "🟠" : p.cr >= 700 ? "🟡" : "⚪"}{" "}
                          {p.cr >= 4500 ? "Hall of Fame" : p.cr >= 3550 ? "Unreal" : p.cr >= 2750 ? "Legend" : p.cr >= 2100 ? "Remorseless" : p.cr >= 1600 ? "SuperStar" : p.cr >= 1200 ? "All-Star" : p.cr >= 1000 ? "Elite" : p.cr >= 700 ? "Pro" : p.cr >= 400 ? "Amateur" : "Rookie"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-orange-400">
                        {p.cr.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-green-400">{p.wins}</td>
                      <td className="px-4 py-3 text-right text-red-400">{p.losses}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{p.matches}</td>
                      <td className="px-4 py-3 text-center">
                        {p.blacklisted ? (
                          <span className="rounded-md bg-red-950/40 border border-red-700/40 px-2 py-0.5 text-[10px] font-black text-red-400">
                            BANNED
                          </span>
                        ) : p.ranked ? (
                          <span className="rounded-md bg-green-950/40 border border-green-700/40 px-2 py-0.5 text-[10px] font-black text-green-400">
                            RANKED
                          </span>
                        ) : (
                          <span className="rounded-md bg-zinc-900 border border-white/5 px-2 py-0.5 text-[10px] font-black text-zinc-500">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <input
                              type="number"
                              value={editCR}
                              onChange={(e) => setEditCR(e.target.value)}
                              placeholder="New CR"
                              className="w-20 rounded-lg border border-orange-700/40 bg-orange-950/20 px-2 py-1 text-xs text-white focus:outline-none"
                            />
                            <input
                              type="text"
                              value={editReason}
                              onChange={(e) => setEditReason(e.target.value)}
                              placeholder="Reason"
                              className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white focus:outline-none"
                            />
                            <button
                              onClick={() => handleCRSave(p.user_id)}
                              disabled={saving}
                              className="rounded-lg bg-orange-600 px-2 py-1 text-xs font-black text-white hover:bg-orange-500 transition disabled:opacity-50"
                            >
                              {saving ? "…" : "✓"}
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setEditCR(""); setEditReason(""); setEditMsg(null); }}
                              className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 transition"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingId(p.user_id); setEditCR(String(p.cr)); setEditReason(""); setEditMsg(null); }}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-orange-300 transition"
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
            <p className="text-xs text-zinc-500">
              Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total.toLocaleString()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { const o = Math.max(0, offset - LIMIT); setOffset(o); fetchLeaderboard(sort, o); }}
                disabled={offset === 0 || loading}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={() => { const o = offset + LIMIT; setOffset(o); fetchLeaderboard(sort, o); }}
                disabled={offset + LIMIT >= total || loading}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
