"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerRow {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  cr: number;
  wins: number;
  losses: number;
  blacklisted: boolean;
}

interface ModerationLog {
  id: string;
  player_id: string;
  player_name: string;
  action: string;
  reason: string;
  performed_by: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtTs(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminModerationPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner]         = useState(false);

  // View toggle: blacklisted | all
  const [viewType, setViewType] = useState<"blacklisted" | "all">("blacklisted");

  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [logs, setLogs]       = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset]   = useState(0);
  const LIMIT = 50;

  // Manual ban form
  const [banUserId, setBanUserId]   = useState("");
  const [banReason, setBanReason]   = useState("");
  const [banAction, setBanAction]   = useState<"blacklist" | "unblacklist">("blacklist");
  const [banMsg, setBanMsg]         = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [banning, setBanning]       = useState(false);

  // Auth check
  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => { setIsOwner(d.isDeveloper === true); setAuthChecked(true); })
      .catch(() => setAuthChecked(true));
  }, []);

  const fetchData = useCallback(async (type: "blacklisted" | "all", off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, limit: String(LIMIT), offset: String(off) });
      const res = await fetch(`/api/admin/moderation?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players ?? []);
        setTotal(data.total ?? 0);
        setLogs(data.logs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) fetchData(viewType, 0);
  }, [isOwner, fetchData, viewType]);

  async function handleBanAction(e: React.FormEvent) {
    e.preventDefault();
    if (!banUserId.trim()) {
      setBanMsg({ type: "error", text: "Player ID is required." });
      return;
    }
    setBanning(true);
    setBanMsg(null);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: banUserId.trim(),
          action: banAction,
          reason: banReason.trim() || `Admin ${banAction} via Moderation Panel`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBanMsg({
          type: "success",
          text: `✅ Player ${banUserId.trim()} has been ${banAction === "blacklist" ? "blacklisted" : "unblacklisted"}.`,
        });
        setBanUserId("");
        setBanReason("");
        fetchData(viewType, offset);
      } else {
        setBanMsg({ type: "error", text: data.error ?? "Action failed." });
      }
    } catch {
      setBanMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setBanning(false);
    }
  }

  async function handleQuickAction(userId: string, action: "blacklist" | "unblacklist") {
    setBanning(true);
    setBanMsg(null);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action,
          reason: `Admin ${action} via Moderation Panel`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBanMsg({
          type: "success",
          text: `✅ Player ${action === "blacklist" ? "blacklisted" : "unblacklisted"} successfully.`,
        });
        fetchData(viewType, offset);
      } else {
        setBanMsg({ type: "error", text: data.error ?? "Action failed." });
      }
    } catch {
      setBanMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setBanning(false);
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

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-4xl font-black">🛡️ Moderation Panel</h1>
        <p className="mt-2 text-zinc-400">
          Manage blacklisted players, perform bans, and review moderation history. Developer access only.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left — player list */}
        <div className="space-y-5">
          {/* View toggle + feedback */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl border border-white/10 overflow-hidden">
              {(["blacklisted", "all"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setViewType(t); setOffset(0); }}
                  className={`px-4 py-2 text-xs font-bold transition ${
                    viewType === t
                      ? "bg-red-600 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {t === "blacklisted" ? "🚫 Blacklisted" : "👥 All Players"}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchData(viewType, offset)}
              disabled={loading}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
            >
              {loading ? "…" : "↻ Refresh"}
            </button>
            <span className="text-xs text-zinc-600">
              {total.toLocaleString()} player{total !== 1 ? "s" : ""}
            </span>
          </div>

          {banMsg && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                banMsg.type === "success"
                  ? "border-green-700/40 bg-green-950/20 text-green-300"
                  : "border-red-700/40 bg-red-950/20 text-red-300"
              }`}
            >
              {banMsg.text}
            </div>
          )}

          {/* Player table */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] font-black uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3 text-right">CR</th>
                    <th className="px-4 py-3 text-right">W/L</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading && players.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 animate-pulse">
                        Loading…
                      </td>
                    </tr>
                  ) : players.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                        {viewType === "blacklisted" ? "No blacklisted players. 🎉" : "No players found."}
                      </td>
                    </tr>
                  ) : (
                    players.map((p) => (
                      <tr key={p.user_id} className="hover:bg-white/[0.03] transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-white">{p.name}</p>
                          <p className="text-[10px] font-mono text-zinc-600">{p.user_id}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-orange-400">
                          {p.cr.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-400">
                          {p.wins}/{p.losses}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.blacklisted ? (
                            <span className="rounded-md bg-red-950/40 border border-red-700/40 px-2 py-0.5 text-[10px] font-black text-red-400">
                              BANNED
                            </span>
                          ) : (
                            <span className="rounded-md bg-green-950/40 border border-green-700/40 px-2 py-0.5 text-[10px] font-black text-green-400">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.blacklisted ? (
                            <button
                              onClick={() => handleQuickAction(p.user_id, "unblacklist")}
                              disabled={banning}
                              className="rounded-lg border border-green-700/40 bg-green-950/20 px-3 py-1.5 text-xs font-bold text-green-300 hover:bg-green-950/40 transition disabled:opacity-50"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickAction(p.user_id, "blacklist")}
                              disabled={banning}
                              className="rounded-lg border border-red-700/40 bg-red-950/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-950/40 transition disabled:opacity-50"
                            >
                              Ban
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
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
                    onClick={() => { const o = Math.max(0, offset - LIMIT); setOffset(o); fetchData(viewType, o); }}
                    disabled={offset === 0 || loading}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => { const o = offset + LIMIT; setOffset(o); fetchData(viewType, o); }}
                    disabled={offset + LIMIT >= total || loading}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — manual action + log */}
        <div className="space-y-5">
          {/* Manual ban/unban form */}
          <div className="rounded-2xl border border-red-700/30 bg-gradient-to-br from-red-950/20 to-black p-5">
            <h2 className="mb-4 text-lg font-black text-red-300">⚡ Quick Action</h2>
            <form onSubmit={handleBanAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-500">Player Discord ID</label>
                <input
                  type="text"
                  value={banUserId}
                  onChange={(e) => setBanUserId(e.target.value)}
                  placeholder="e.g. 733871667788644445"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-red-600/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-500">Reason (optional)</label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Reason for action…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-red-600/60 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBanAction("blacklist")}
                  className={`flex-1 rounded-xl py-2 text-xs font-black transition ${
                    banAction === "blacklist"
                      ? "bg-red-600 text-white"
                      : "border border-white/10 text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  🚫 Blacklist
                </button>
                <button
                  type="button"
                  onClick={() => setBanAction("unblacklist")}
                  className={`flex-1 rounded-xl py-2 text-xs font-black transition ${
                    banAction === "unblacklist"
                      ? "bg-green-600 text-white"
                      : "border border-white/10 text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  ✅ Unblacklist
                </button>
              </div>
              <button
                type="submit"
                disabled={banning || !banUserId.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-2.5 font-black text-white hover:from-red-500 hover:to-rose-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {banning ? "Processing…" : `Apply ${banAction === "blacklist" ? "Ban" : "Unban"}`}
              </button>
            </form>
          </div>

          {/* Moderation log */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="text-lg font-black">📋 Recent Actions</h2>
            </div>
            {logs.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No moderation actions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white truncate">{log.player_name}</p>
                        <p className="text-[10px] font-mono text-zinc-600">{log.player_id}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black ${
                          log.action === "blacklist"
                            ? "bg-red-950/40 border border-red-700/40 text-red-400"
                            : "bg-green-950/40 border border-green-700/40 text-green-400"
                        }`}
                      >
                        {log.action.toUpperCase()}
                      </span>
                    </div>
                    {log.reason && (
                      <p className="mt-1 text-[11px] text-zinc-500 truncate">{log.reason}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-zinc-700">{fmtTs(log.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
