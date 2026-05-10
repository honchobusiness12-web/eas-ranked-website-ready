"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import { PlayerSearch } from "../_components/PlayerSearch";
import { PlayerRow } from "../_components/PlayerRow";
import { BadgeManager } from "../_components/BadgeManager";
import { PremiumToggle } from "../_components/PremiumToggle";
import { StatEditor } from "../_components/StatEditor";
import { ResetTools } from "../_components/ResetTools";
import { AuditLog } from "../_components/AuditLog";
import { usePlayerSearch } from "../_hooks/usePlayerSearch";
import { getPlayerDetail } from "../_actions";
import type { PlayerDetail, PlayerRow as PlayerRowType, BadgeInfo } from "../_actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Toast {
  type: "success" | "error";
  message: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function WinRate({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return <span className="text-zinc-500">—</span>;
  const pct = Math.round((wins / total) * 100);
  const color =
    pct >= 60
      ? "text-green-400"
      : pct >= 45
      ? "text-yellow-400"
      : "text-red-400";
  return <span className={color}>{pct}%</span>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminPlayersPage() {
  // Auth
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Player list
  const [players, setPlayers] = useState<PlayerRowType[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [offset, setOffset] = useState(0);
  const [listQuery, setListQuery] = useState("");
  const LIMIT = 20;

  // Selected player
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [playerBadges, setPlayerBadges] = useState<BadgeInfo[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);

  // UI panels
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Toast
  const [toast, setToast] = useState<Toast | null>(null);

  // Search hook
  const search = usePlayerSearch();

  // ---------------------------------------------------------------------------
  // Auth check
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => {
        setIsOwner(d.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // Auto-dismiss success toasts
  useEffect(() => {
    if (toast?.type === "success") {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ---------------------------------------------------------------------------
  // Fetch player list
  // ---------------------------------------------------------------------------

  const fetchPlayers = useCallback(async (q: string, off: number) => {
    setIsLoadingList(true);
    try {
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(off),
      });
      if (q.trim()) params.set("search", q.trim());
      const res = await fetch(`/api/admin/players?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) fetchPlayers("", 0);
  }, [isOwner, fetchPlayers]);

  // ---------------------------------------------------------------------------
  // Select player
  // ---------------------------------------------------------------------------

  async function selectPlayer(player: PlayerRowType) {
    setIsLoadingDetail(true);
    setSelectedPlayer(null);
    setShowEditPanel(false);
    setShowResetPanel(false);
    setShowAuditLog(false);
    search.close();

    try {
      const [detailResult, badgesRes] = await Promise.all([
        getPlayerDetail(player.user_id),
        fetch(`/api/admin/badges?userId=${encodeURIComponent(player.user_id)}`),
      ]);

      if (detailResult.success && detailResult.data) {
        const p = detailResult.data;
        setSelectedPlayer(p);
        const premiumActive =
          !!p.premium_expires_at && new Date(p.premium_expires_at) > new Date();
        setIsPremium(premiumActive);
        setPremiumExpiresAt(p.premium_expires_at);
      }

      if (badgesRes.ok) {
        const badgeData = await badgesRes.json();
        setPlayerBadges(badgeData.badges ?? []);
      }
    } finally {
      setIsLoadingDetail(false);
    }
  }

  function handleSearchSelect(player: PlayerRowType) {
    search.clear();
    selectPlayer(player);
  }

  function handleListSelect(player: PlayerRowType) {
    selectPlayer(player);
  }

  function handleToast(type: "success" | "error", message: string) {
    setToast({ type, message });
  }

  function handlePlayerChange(updated: PlayerDetail) {
    setSelectedPlayer(updated);
    fetchPlayers(listQuery, offset);
  }

  function handlePremiumChange(premium: boolean, expiresAt: string | null) {
    setIsPremium(premium);
    setPremiumExpiresAt(expiresAt);
  }

  // ---------------------------------------------------------------------------
  // Auth gate
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
            <p className="mt-2 text-zinc-400">
              This page is restricted to the EAS Arena developer.
            </p>
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

  // ---------------------------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------------------------

  return (
    <Shell>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-black shadow-2xl max-w-sm ${
            toast.type === "success"
              ? "border-green-400/60 bg-green-950/90 text-green-300"
              : "border-red-400/60 bg-red-950/90 text-red-300"
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="opacity-60 hover:opacity-100 transition"
          >
            ✕
          </button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-4xl font-black">👥 Player Management</h1>
        <p className="mt-2 text-zinc-400">
          Search players, manage badges, premium, and stats. All actions are
          audit-logged.
        </p>
        <div className="mt-3 flex gap-2">
          <SoundLink
            href="/admin/audit-logs"
            soundType="click"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white transition"
          >
            📋 View Audit Log
          </SoundLink>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* ── LEFT: Search + Table ── */}
        <div className="space-y-5">
          {/* Quick Search */}
          <div className="rounded-2xl border border-red-700/30 bg-gradient-to-br from-red-950/20 to-black p-5">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
              Quick Search
            </p>
            <PlayerSearch
              query={search.query}
              results={search.results}
              isSearching={search.isSearching}
              isOpen={search.isOpen}
              selectedId={selectedPlayer?.user_id}
              onQueryChange={search.handleQueryChange}
              onSelect={handleSearchSelect}
              onClose={search.close}
              onClear={search.clear}
            />
          </div>

          {/* Player table */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
                All Players ({total.toLocaleString()})
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setOffset(0);
                  fetchPlayers(listQuery, 0);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={listQuery}
                  onChange={(e) => setListQuery(e.target.value)}
                  placeholder="Filter list…"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-red-600/50 focus:outline-none w-40"
                />
                <button
                  type="submit"
                  disabled={isLoadingList}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
                >
                  {isLoadingList ? "…" : "Search"}
                </button>
                {listQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setListQuery("");
                      setOffset(0);
                      fetchPlayers("", 0);
                    }}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-500 hover:bg-white/5 transition"
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>

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
                  {isLoadingList && players.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-zinc-500 animate-pulse"
                      >
                        Loading players…
                      </td>
                    </tr>
                  ) : players.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-zinc-500"
                      >
                        No players found.
                      </td>
                    </tr>
                  ) : (
                    players.map((p) => (
                      <PlayerRow
                        key={p.user_id}
                        player={p}
                        isSelected={selectedPlayer?.user_id === p.user_id}
                        onSelect={handleListSelect}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                <p className="text-xs text-zinc-500">
                  {offset + 1}–{Math.min(offset + LIMIT, total)} of{" "}
                  {total.toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const o = Math.max(0, offset - LIMIT);
                      setOffset(o);
                      fetchPlayers(listQuery, o);
                    }}
                    disabled={offset === 0 || isLoadingList}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => {
                      const o = offset + LIMIT;
                      setOffset(o);
                      fetchPlayers(listQuery, o);
                    }}
                    disabled={offset + LIMIT >= total || isLoadingList}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Player Detail Panel ── */}
        <div className="space-y-4">
          {!selectedPlayer && !isLoadingDetail && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
              <p className="text-4xl mb-3">👤</p>
              <p className="text-zinc-500 text-sm">
                Select a player to view details and actions.
              </p>
            </div>
          )}

          {isLoadingDetail && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
              <p className="text-zinc-400 animate-pulse text-sm">
                Loading player…
              </p>
            </div>
          )}

          {selectedPlayer && !isLoadingDetail && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">{selectedPlayer.name}</h2>
                  <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                    {selectedPlayer.user_id}
                  </p>
                  {selectedPlayer.username && (
                    <p className="text-xs text-zinc-500">
                      @{selectedPlayer.username}
                    </p>
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
                  {
                    label: "CR",
                    value: selectedPlayer.cr.toLocaleString(),
                    color: "text-orange-400",
                  },
                  {
                    label: "Matches",
                    value: selectedPlayer.matches.toLocaleString(),
                    color: "text-white",
                  },
                  {
                    label: "Wins",
                    value: selectedPlayer.wins.toLocaleString(),
                    color: "text-green-400",
                  },
                  {
                    label: "Losses",
                    value: selectedPlayer.losses.toLocaleString(),
                    color: "text-red-400",
                  },
                  {
                    label: "Kills",
                    value: selectedPlayer.kills.toLocaleString(),
                    color: "text-yellow-400",
                  },
                  {
                    label: "MVPs",
                    value: selectedPlayer.mvp_count.toLocaleString(),
                    color: "text-purple-400",
                  },
                  {
                    label: "Placements",
                    value: selectedPlayer.placement_matches.toLocaleString(),
                    color: "text-blue-400",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
                  >
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      {label}
                    </p>
                    <p className={`text-lg font-black ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Win rate bar */}
              <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-zinc-500">Win Rate</p>
                  <WinRate
                    wins={selectedPlayer.wins}
                    losses={selectedPlayer.losses}
                  />
                </div>
                {selectedPlayer.wins + selectedPlayer.losses > 0 && (
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-600 to-emerald-500"
                      style={{
                        width: `${Math.round(
                          (selectedPlayer.wins /
                            (selectedPlayer.wins + selectedPlayer.losses)) *
                            100
                        )}%`,
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
                {isPremium && (
                  <span className="rounded-lg bg-yellow-950/30 border border-yellow-700/30 px-2.5 py-1 text-xs font-bold text-yellow-400">
                    💎 Premium
                  </span>
                )}
              </div>

              {/* Badge Manager */}
              <BadgeManager
                userId={selectedPlayer.user_id}
                badges={playerBadges}
                onBadgesChange={setPlayerBadges}
                onToast={handleToast}
              />

              {/* Premium Toggle */}
              <PremiumToggle
                userId={selectedPlayer.user_id}
                isPremium={isPremium}
                premiumExpiresAt={premiumExpiresAt}
                onPremiumChange={handlePremiumChange}
                onToast={handleToast}
              />

              {/* Edit Stats Panel */}
              {showEditPanel && (
                <StatEditor
                  player={selectedPlayer}
                  onPlayerChange={handlePlayerChange}
                  onToast={handleToast}
                  onClose={() => setShowEditPanel(false)}
                />
              )}

              {/* Reset Tools Panel */}
              {showResetPanel && (
                <ResetTools
                  player={selectedPlayer}
                  onPlayerChange={handlePlayerChange}
                  onToast={handleToast}
                  onClose={() => setShowResetPanel(false)}
                />
              )}

              {/* Audit Log for this player */}
              {showAuditLog && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                    📋 Player Audit Log
                  </p>
                  <AuditLog userId={selectedPlayer.user_id} compact />
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                  Quick Actions
                </p>
                <div className="flex flex-wrap gap-2">
                  <SoundLink
                    href={`/profile/${selectedPlayer.user_id}`}
                    soundType="click"
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5 transition"
                  >
                    👤 View Profile
                  </SoundLink>
                  <button
                    onClick={() => {
                      setShowEditPanel((v) => !v);
                      setShowResetPanel(false);
                    }}
                    className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                      showEditPanel
                        ? "border-blue-600/60 bg-blue-950/30 text-blue-300"
                        : "border-blue-700/30 bg-blue-950/10 text-blue-300 hover:bg-blue-950/20"
                    }`}
                  >
                    ✏️ Edit Stats
                  </button>
                  <button
                    onClick={() => {
                      setShowResetPanel((v) => !v);
                      setShowEditPanel(false);
                    }}
                    className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                      showResetPanel
                        ? "border-orange-600/60 bg-orange-950/30 text-orange-300"
                        : "border-orange-700/30 bg-orange-950/10 text-orange-300 hover:bg-orange-950/20"
                    }`}
                  >
                    🔄 Reset Stats
                  </button>
                  <button
                    onClick={() => setShowAuditLog((v) => !v)}
                    className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                      showAuditLog
                        ? "border-zinc-500/60 bg-zinc-800/50 text-zinc-300"
                        : "border-white/10 text-zinc-400 hover:bg-white/5"
                    }`}
                  >
                    📋 Audit Log
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
