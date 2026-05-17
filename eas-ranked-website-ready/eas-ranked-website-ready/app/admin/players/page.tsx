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
  matches: number;
  blacklisted: boolean;
  ranked: boolean;
}

interface PlayerDetail extends PlayerRow {
  kills: number;
  mvp_count: number;
  placement_matches: number;
  registered: boolean;
  premium_expires_at: string | null;
}

interface BadgeInfo {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

interface EditStats {
  cr: string;
  wins: string;
  losses: string;
  kills: string;
  matches: string;
  mvp_count: string;
  placement_matches: string;
}

const BADGE_OPTIONS = [
  { id: "staff",            label: "Staff",            icon: "👮" },
  { id: "contentCreator",   label: "Content Creator",  icon: "🎬" },
  { id: "tournamentWinner", label: "Tournament Winner", icon: "🏆" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function WinRate({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return <span className="text-zinc-500">—</span>;
  const pct = Math.round((wins / total) * 100);
  const color = pct >= 60 ? "text-green-400" : pct >= 45 ? "text-yellow-400" : "text-red-400";
  return <span className={color}>{pct}%</span>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminPlayersPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner]         = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [players, setPlayers]         = useState<PlayerRow[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(false);
  const [offset, setOffset]           = useState(0);
  const LIMIT = 20;

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null);
  const [loadingDetail, setLoadingDetail]   = useState(false);

  const [actionMsg, setActionMsg]   = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actioning, setActioning]   = useState(false);

  // Edit stats panel
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editStats, setEditStats]         = useState<EditStats>({ cr: "", wins: "", losses: "", kills: "", matches: "", mvp_count: "", placement_matches: "" });
  const [editSaving, setEditSaving]       = useState(false);

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting]               = useState(false);

  // Badge management
  const [playerBadges, setPlayerBadges]   = useState<BadgeInfo[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [badgeActioning, setBadgeActioning] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => { setIsOwner(d.isDeveloper === true); setAuthChecked(true); })
      .catch(() => setAuthChecked(true));
  }, []);

  const fetchPlayers = useCallback(async (query: string, off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (query.trim()) params.set("search", query.trim());
      const res = await fetch(`/api/admin/players?${params}`);
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
    if (isOwner) fetchPlayers("", 0);
  }, [isOwner, fetchPlayers]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    fetchPlayers(searchQuery, 0);
  }

  async function selectPlayer(userId: string) {
    setLoadingDetail(true);
    setSelectedPlayer(null);
    setActionMsg(null);
    setShowEditPanel(false);
    setShowResetConfirm(false);
    try {
      const [playerRes, badgesRes] = await Promise.all([
        fetch(`/api/admin/players?userId=${encodeURIComponent(userId)}`),
        fetch(`/api/admin/badges?userId=${encodeURIComponent(userId)}`),
      ]);
      if (playerRes.ok) {
        const data = await playerRes.json();
        const player = data.player ?? null;
        setSelectedPlayer(player);
        if (player) {
          setEditStats({
            cr:                String(player.cr),
            wins:              String(player.wins),
            losses:            String(player.losses),
            kills:             String(player.kills),
            matches:           String(player.matches),
            mvp_count:         String(player.mvp_count),
            placement_matches: String(player.placement_matches),
          });
        }
      }
      if (badgesRes.ok) {
        const badgeData = await badgesRes.json();
        setPlayerBadges(badgeData.badges ?? []);
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleEditStats(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlayer) return;
    setEditSaving(true);
    setActionMsg(null);
    try {
      const stats = {
        cr:                parseInt(editStats.cr, 10),
        wins:              parseInt(editStats.wins, 10),
        losses:            parseInt(editStats.losses, 10),
        kills:             parseInt(editStats.kills, 10),
        matches:           parseInt(editStats.matches, 10),
        mvp_count:         parseInt(editStats.mvp_count, 10),
        placement_matches: parseInt(editStats.placement_matches, 10),
      };
      const res = await fetch("/api/admin/players", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedPlayer.user_id, action: "edit", stats }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedPlayer(data.player);
        setShowEditPanel(false);
        setActionMsg({ type: "success", text: "✅ Player stats updated successfully." });
        fetchPlayers(searchQuery, offset);
      } else {
        setActionMsg({ type: "error", text: data.error ?? "Failed to update stats." });
      }
    } catch {
      setActionMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleReset(userId: string) {
    setResetting(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/players", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "reset" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedPlayer(data.player);
        setShowResetConfirm(false);
        setEditStats({
          cr: "0", wins: "0", losses: "0", kills: "0",
          matches: "0", mvp_count: "0", placement_matches: "0",
        });
        setActionMsg({ type: "success", text: "✅ Player stats reset to zero." });
        fetchPlayers(searchQuery, offset);
      } else {
        setActionMsg({ type: "error", text: data.error ?? "Failed to reset player." });
      }
    } catch {
      setActionMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setResetting(false);
    }
  }

  async function handleBadgeAction(badge: string, action: "assign" | "remove") {
    if (!selectedPlayer) return;
    setBadgeActioning(badge);
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/badges", {
        method: action === "assign" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedPlayer.user_id, badge }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPlayerBadges(data.badges ?? []);
        const opt = BADGE_OPTIONS.find((b) => b.id === badge);
        setActionMsg({
          type: "success",
          text: `✅ ${opt?.icon ?? ""} ${opt?.label ?? badge} ${action === "assign" ? "assigned" : "removed"} successfully.`,
        });
      } else {
        setActionMsg({ type: "error", text: data.error ?? "Badge action failed." });
      }
    } catch {
      setActionMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setBadgeActioning(null);
    }
  }

  async function handleBlacklist(userId: string, blacklist: boolean) {
    setActioning(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: blacklist ? "blacklist" : "unblacklist",
          reason: blacklist ? "Admin blacklist via Player Management" : "Admin unblacklist via Player Management",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg({ type: "success", text: `✅ Player ${blacklist ? "blacklisted" : "unblacklisted"} successfully.` });
        // Refresh detail and list
        await selectPlayer(userId);
        fetchPlayers(searchQuery, offset);
      } else {
        setActionMsg({ type: "error", text: data.error ?? "Action failed." });
      }
    } catch {
      setActionMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setActioning(false);
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
        <h1 className="text-4xl font-black">👥 Player Management</h1>
        <p className="mt-2 text-zinc-400">
          Search players, view stats, and manage blacklist status. Developer access only.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left — search + table */}
        <div className="space-y-5">
          {/* Search bar */}
          <div className="rounded-2xl border border-red-700/30 bg-gradient-to-br from-red-950/20 to-black p-5">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or Discord ID…"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-red-600/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 font-black text-white hover:from-red-500 hover:to-rose-500 transition-all disabled:opacity-50"
              >
                {loading ? "…" : "Search"}
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setOffset(0); fetchPlayers("", 0); }}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-400 hover:bg-white/5 transition"
                >
                  Clear
                </button>
              )}
            </form>
            <p className="mt-2 text-xs text-zinc-600">
              {total.toLocaleString()} player{total !== 1 ? "s" : ""} found
            </p>
          </div>

          {/* Player table */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] font-black uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3 text-right">CR</th>
                    <th className="px-4 py-3 text-right">W/L</th>
                    <th className="px-4 py-3 text-right">Win%</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading && players.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-zinc-500 animate-pulse">
                        Loading players…
                      </td>
                    </tr>
                  ) : players.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                        No players found.
                      </td>
                    </tr>
                  ) : (
                    players.map((p) => (
                      <tr
                        key={p.user_id}
                        className={`hover:bg-white/[0.03] transition ${
                          selectedPlayer?.user_id === p.user_id ? "bg-white/[0.05]" : ""
                        }`}
                      >
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
                        <td className="px-4 py-3 text-right">
                          <WinRate wins={p.wins} losses={p.losses} />
                        </td>
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
                              UNRANKED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => selectPlayer(p.user_id)}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white transition"
                          >
                            View →
                          </button>
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
                    onClick={() => { const o = Math.max(0, offset - LIMIT); setOffset(o); fetchPlayers(searchQuery, o); }}
                    disabled={offset === 0 || loading}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => { const o = offset + LIMIT; setOffset(o); fetchPlayers(searchQuery, o); }}
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

        {/* Right — player detail panel */}
        <div className="space-y-4">
          {!selectedPlayer && !loadingDetail && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
              <p className="text-4xl mb-3">👤</p>
              <p className="text-zinc-500 text-sm">Select a player to view details and actions.</p>
            </div>
          )}

          {loadingDetail && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
              <p className="text-zinc-400 animate-pulse text-sm">Loading player…</p>
            </div>
          )}

          {selectedPlayer && !loadingDetail && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">{selectedPlayer.name}</h2>
                  <p className="text-[11px] font-mono text-zinc-500 mt-0.5">{selectedPlayer.user_id}</p>
                  {selectedPlayer.username && (
                    <p className="text-xs text-zinc-500">@{selectedPlayer.username}</p>
                  )}
                </div>
                {selectedPlayer.blacklisted && (
                  <span className="rounded-lg bg-red-950/40 border border-red-700/40 px-3 py-1 text-xs font-black text-red-400">
                    🚫 BANNED
                  </span>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "CR",           value: selectedPlayer.cr.toLocaleString(),                color: "text-orange-400" },
                  { label: "Matches",      value: selectedPlayer.matches.toLocaleString(),           color: "text-white" },
                  { label: "Wins",         value: selectedPlayer.wins.toLocaleString(),              color: "text-green-400" },
                  { label: "Losses",       value: selectedPlayer.losses.toLocaleString(),            color: "text-red-400" },
                  { label: "Kills",        value: selectedPlayer.kills.toLocaleString(),             color: "text-yellow-400" },
                  { label: "MVPs",         value: selectedPlayer.mvp_count.toLocaleString(),         color: "text-purple-400" },
                  { label: "Placements",   value: selectedPlayer.placement_matches.toLocaleString(), color: "text-blue-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                    <p className={`text-lg font-black ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Win rate */}
              <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-zinc-500">Win Rate</p>
                  <WinRate wins={selectedPlayer.wins} losses={selectedPlayer.losses} />
                </div>
                {selectedPlayer.wins + selectedPlayer.losses > 0 && (
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-600 to-emerald-500"
                      style={{
                        width: `${Math.round((selectedPlayer.wins / (selectedPlayer.wins + selectedPlayer.losses)) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-2">
                {selectedPlayer.ranked && (
                  <span className="rounded-lg bg-green-950/30 border border-green-700/30 px-2.5 py-1 text-xs font-bold text-green-400">
                    ✅ Ranked
                  </span>
                )}
                {selectedPlayer.registered && (
                  <span className="rounded-lg bg-blue-950/30 border border-blue-700/30 px-2.5 py-1 text-xs font-bold text-blue-400">
                    📋 Registered
                  </span>
                )}

              </div>

              {/* Action feedback */}
              {actionMsg && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                    actionMsg.type === "success"
                      ? "border-green-700/40 bg-green-950/20 text-green-300"
                      : "border-red-700/40 bg-red-950/20 text-red-300"
                  }`}
                >
                  {actionMsg.text}
                </div>
              )}

              {/* ── Edit Stats Panel ── */}
              {showEditPanel && (
                <form
                  onSubmit={handleEditStats}
                  className="rounded-xl border border-blue-700/30 bg-blue-950/10 p-4 space-y-3"
                >
                  <p className="text-xs font-black uppercase tracking-wider text-blue-400">✏️ Edit Stats</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { key: "cr",                label: "CR" },
                        { key: "wins",              label: "Wins" },
                        { key: "losses",            label: "Losses" },
                        { key: "kills",             label: "Kills" },
                        { key: "matches",           label: "Matches" },
                        { key: "mvp_count",         label: "MVPs" },
                        { key: "placement_matches", label: "Placements" },
                      ] as { key: keyof EditStats; label: string }[]
                    ).map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-[10px] text-zinc-500 mb-1">{label}</label>
                        <input
                          type="number"
                          min="0"
                          value={editStats[key]}
                          onChange={(e) => setEditStats((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white focus:border-blue-600/60 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-xs font-black text-white hover:from-blue-500 hover:to-blue-400 transition disabled:opacity-50"
                    >
                      {editSaving ? "Saving…" : "💾 Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditPanel(false)}
                      className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* ── Reset Confirmation ── */}
              {showResetConfirm && (
                <div className="rounded-xl border border-orange-700/40 bg-orange-950/20 p-4 space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-400">⚠️ Confirm Reset</p>
                  <p className="text-xs text-zinc-400">
                    This will set all stats (CR, wins, losses, kills, matches, MVPs, placements) to zero and mark the player as unranked. This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReset(selectedPlayer.user_id)}
                      disabled={resetting}
                      className="flex-1 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 px-4 py-2 text-xs font-black text-white hover:from-orange-500 hover:to-red-500 transition disabled:opacity-50"
                    >
                      {resetting ? "Resetting…" : "🔄 Confirm Reset"}
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* ── Badge Management ── */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">🏅 Badges</p>
                  {badgesLoading && <span className="text-[10px] text-zinc-500 animate-pulse">Loading…</span>}
                </div>
                {playerBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {playerBadges.map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-zinc-300"
                      >
                        {b.icon} {b.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">No badges assigned.</p>
                )}
                <div className="grid grid-cols-1 gap-1.5">
                  {BADGE_OPTIONS.map((opt) => {
                    const hasBadge = playerBadges.some((b) => b.id === opt.id);
                    const isActioning = badgeActioning === opt.id;
                    return (
                      <div key={opt.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-400">
                          {opt.icon} {opt.label}
                        </span>
                        <button
                          onClick={() => handleBadgeAction(opt.id, hasBadge ? "remove" : "assign")}
                          disabled={isActioning}
                          className={`rounded-lg px-3 py-1 text-[11px] font-black transition disabled:opacity-50 ${
                            hasBadge
                              ? "border border-red-700/40 bg-red-950/20 text-red-300 hover:bg-red-950/40"
                              : "border border-green-700/40 bg-green-950/20 text-green-300 hover:bg-green-950/40"
                          }`}
                        >
                          {isActioning ? "…" : hasBadge ? "Remove" : "Assign"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  <SoundLink
                    href={`/profile/${selectedPlayer.user_id}`}
                    soundType="click"
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5 transition"
                  >
                    👤 View Profile
                  </SoundLink>
                  <button
                    onClick={() => { setShowEditPanel((v) => !v); setShowResetConfirm(false); }}
                    className="rounded-xl border border-blue-700/30 bg-blue-950/10 px-4 py-2 text-xs font-bold text-blue-300 hover:bg-blue-950/20 transition"
                  >
                    ✏️ Edit Stats
                  </button>
                  <button
                    onClick={() => { setShowResetConfirm((v) => !v); setShowEditPanel(false); }}
                    className="rounded-xl border border-orange-700/30 bg-orange-950/10 px-4 py-2 text-xs font-bold text-orange-300 hover:bg-orange-950/20 transition"
                  >
                    🔄 Reset Player
                  </button>
                  <SoundLink
                    href={`/admin/cr?player=${selectedPlayer.user_id}`}
                    soundType="click"
                    className="rounded-xl border border-orange-700/30 bg-orange-950/10 px-4 py-2 text-xs font-bold text-orange-300 hover:bg-orange-950/20 transition"
                  >
                    ⚙️ Edit CR
                  </SoundLink>
                </div>

                {/* Blacklist toggle */}
                {selectedPlayer.blacklisted ? (
                  <button
                    onClick={() => handleBlacklist(selectedPlayer.user_id, false)}
                    disabled={actioning}
                    className="w-full rounded-xl border border-green-700/40 bg-green-950/20 px-4 py-2.5 text-sm font-black text-green-300 hover:bg-green-950/40 transition disabled:opacity-50"
                  >
                    {actioning ? "Processing…" : "✅ Unblacklist Player"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBlacklist(selectedPlayer.user_id, true)}
                    disabled={actioning}
                    className="w-full rounded-xl border border-red-700/40 bg-red-950/20 px-4 py-2.5 text-sm font-black text-red-300 hover:bg-red-950/40 transition disabled:opacity-50"
                  >
                    {actioning ? "Processing…" : "🚫 Blacklist Player"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
