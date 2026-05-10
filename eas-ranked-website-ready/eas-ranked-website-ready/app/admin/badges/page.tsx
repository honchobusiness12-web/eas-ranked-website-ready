"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import { BadgeManager } from "../_components/BadgeManager";
import { PlayerSearch } from "../_components/PlayerSearch";
import { usePlayerSearch } from "../_hooks/usePlayerSearch";
import { assignBadge, removeBadge, getPlayerDetail } from "../_actions";
import type { PlayerDetail, BadgeInfo } from "../_actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BADGE_OPTIONS = [
  {
    id: "staff",
    label: "Staff",
    icon: "👮",
    color: "#00FF88",
    description: "EAS Ranked Staff Member",
  },
  {
    id: "contentCreator",
    label: "Content Creator",
    icon: "🎬",
    color: "#00D4FF",
    description: "Verified Content Creator",
  },
  {
    id: "tournamentWinner",
    label: "Tournament Winner",
    icon: "🏆",
    color: "#FFD700",
    description: "Tournament Champion",
  },
] as const;

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({
  msg,
  onDismiss,
}: {
  msg: { type: "success" | "error"; text: string };
  onDismiss: () => void;
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-black shadow-2xl max-w-sm ${
        msg.type === "success"
          ? "border-green-400/60 bg-green-950/90 text-green-300"
          : "border-red-400/60 bg-red-950/90 text-red-300"
      }`}
    >
      <span className="flex-1">{msg.text}</span>
      <button
        onClick={onDismiss}
        className="opacity-60 hover:opacity-100 transition"
      >
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge Holders Tab — per-badge view
// ---------------------------------------------------------------------------

interface HolderEntry {
  user_id: string;
  name: string;
}

function BadgeHoldersTab({
  onToast,
}: {
  onToast: (type: "success" | "error", text: string) => void;
}) {
  const [selectedBadge, setSelectedBadge] = useState<string>(
    BADGE_OPTIONS[0].id
  );
  const [holders, setHolders] = useState<HolderEntry[]>([]);
  const [nonHolders, setNonHolders] = useState<HolderEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holderSearch, setHolderSearch] = useState("");
  const [nonHolderSearch, setNonHolderSearch] = useState("");
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const badgeOption = BADGE_OPTIONS.find((b) => b.id === selectedBadge)!;

  const loadHolders = useCallback(async (badgeId: string) => {
    setIsLoading(true);
    setError(null);
    setHolders([]);
    setNonHolders([]);
    try {
      const [holdersRes, allRes] = await Promise.all([
        fetch(`/api/admin/badges?role=${encodeURIComponent(badgeId)}`),
        fetch(`/api/admin/badges`),
      ]);

      let holderIds = new Set<string>();
      let holderList: HolderEntry[] = [];

      if (holdersRes.ok) {
        const data = await holdersRes.json();
        holderList = (data.members ?? []).map(
          (m: { userId: string; name: string }) => ({
            user_id: m.userId,
            name: m.name,
          })
        );
        holderIds = new Set(holderList.map((h) => h.user_id));
      }

      let nonHolderList: HolderEntry[] = [];
      if (allRes.ok) {
        const data = await allRes.json();
        const allPlayers: Array<{ user_id: string; name: string }> =
          data.players ?? [];
        nonHolderList = allPlayers
          .filter((p) => !holderIds.has(p.user_id))
          .map((p) => ({ user_id: p.user_id, name: p.name }));
      }

      setHolders(holderList);
      setNonHolders(nonHolderList);
    } catch {
      setError("Failed to load badge holders.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHolders(selectedBadge);
  }, [selectedBadge, loadHolders]);

  function handleRemove(userId: string) {
    setActingOn(userId);
    startTransition(async () => {
      const result = await removeBadge(userId, selectedBadge);
      if (result.success) {
        const entry = holders.find((h) => h.user_id === userId);
        if (entry) {
          setHolders((prev) => prev.filter((h) => h.user_id !== userId));
          setNonHolders((prev) => [entry, ...prev]);
        }
        const opt = BADGE_OPTIONS.find((b) => b.id === selectedBadge);
        onToast(
          "success",
          `✅ ${opt?.icon ?? ""} ${opt?.label ?? selectedBadge} removed from ${entry?.name ?? userId}.`
        );
      } else {
        onToast("error", result.error ?? "Failed to remove badge.");
      }
      setActingOn(null);
    });
  }

  function handleAdd(userId: string) {
    setActingOn(userId);
    startTransition(async () => {
      const result = await assignBadge(userId, selectedBadge);
      if (result.success) {
        const entry = nonHolders.find((h) => h.user_id === userId);
        if (entry) {
          setNonHolders((prev) => prev.filter((h) => h.user_id !== userId));
          setHolders((prev) => [entry, ...prev]);
        }
        const opt = BADGE_OPTIONS.find((b) => b.id === selectedBadge);
        onToast(
          "success",
          `✅ ${opt?.icon ?? ""} ${opt?.label ?? selectedBadge} assigned to ${entry?.name ?? userId}.`
        );
      } else {
        onToast("error", result.error ?? "Failed to assign badge.");
      }
      setActingOn(null);
    });
  }

  const filteredHolders = holders.filter(
    (h) =>
      !holderSearch ||
      h.name.toLowerCase().includes(holderSearch.toLowerCase()) ||
      h.user_id.includes(holderSearch)
  );

  const filteredNonHolders = nonHolders.filter(
    (h) =>
      !nonHolderSearch ||
      h.name.toLowerCase().includes(nonHolderSearch.toLowerCase()) ||
      h.user_id.includes(nonHolderSearch)
  );

  return (
    <div>
      {/* Badge selector */}
      <div className="flex flex-wrap gap-3 mb-8">
        {BADGE_OPTIONS.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              setSelectedBadge(b.id);
              setHolderSearch("");
              setNonHolderSearch("");
            }}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black border-2 transition-all active:scale-95 ${
              selectedBadge === b.id
                ? "scale-105"
                : "opacity-50 hover:opacity-80"
            }`}
            style={
              selectedBadge === b.id
                ? {
                    background: `linear-gradient(135deg, ${b.color}28, ${b.color}10)`,
                    border: `2px solid ${b.color}80`,
                    color: b.color,
                    boxShadow: `0 0 20px ${b.color}30`,
                  }
                : {
                    background: "rgba(255,255,255,0.03)",
                    border: "2px solid rgba(255,255,255,0.10)",
                    color: "#71717a",
                  }
            }
          >
            <span>{b.icon}</span>
            <span>{b.label}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-zinc-400 animate-pulse font-bold text-lg">
            Loading badge holders…
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border-2 border-red-500/40 bg-red-950/20 px-6 py-5 text-center">
          <p className="text-red-400 font-black">{error}</p>
          <button
            onClick={() => loadHolders(selectedBadge)}
            className="mt-3 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-black text-red-300 hover:bg-red-500/10 transition"
          >
            ↻ Retry
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Has Badge */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              border: `2px solid ${badgeOption.color}40`,
              background: `linear-gradient(135deg, ${badgeOption.color}08, rgba(0,0,0,0.60))`,
            }}
          >
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: `${badgeOption.color}25` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{badgeOption.icon}</span>
                <div>
                  <p
                    className="font-black text-sm"
                    style={{ color: badgeOption.color }}
                  >
                    Has {badgeOption.label}
                  </p>
                  <p className="text-[11px] text-zinc-500 font-bold">
                    {filteredHolders.length} player
                    {filteredHolders.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <span
                className="text-2xl font-black"
                style={{ color: badgeOption.color }}
              >
                {holders.length}
              </span>
            </div>
            <div className="px-4 py-3 border-b border-white/5">
              <input
                type="text"
                value={holderSearch}
                onChange={(e) => setHolderSearch(e.target.value)}
                placeholder="Filter holders…"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-xs font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
              />
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
              {filteredHolders.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm font-bold text-zinc-600">
                  {holderSearch ? "No matches" : "No holders yet"}
                </p>
              ) : (
                filteredHolders.map((h) => (
                  <div
                    key={h.user_id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-black bg-gradient-to-br from-green-400 to-cyan-400">
                      {h.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-white truncate">
                        {h.name}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-600 truncate">
                        {h.user_id}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(h.user_id)}
                      disabled={actingOn === h.user_id || isPending}
                      className="flex-shrink-0 rounded-xl border-2 border-red-700/50 bg-red-950/20 px-3 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 hover:border-red-400 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {actingOn === h.user_id ? "⟳" : "✕ Remove"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Doesn't Have Badge */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              border: "2px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.01)",
            }}
          >
            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between bg-white/[0.02]">
              <div>
                <p className="font-black text-sm text-zinc-300">
                  Doesn&apos;t Have {badgeOption.label}
                </p>
                <p className="text-[11px] text-zinc-500 font-bold">
                  {filteredNonHolders.length} player
                  {filteredNonHolders.length !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-2xl font-black text-zinc-500">
                {nonHolders.length}
              </span>
            </div>
            <div className="px-4 py-3 border-b border-white/5">
              <input
                type="text"
                value={nonHolderSearch}
                onChange={(e) => setNonHolderSearch(e.target.value)}
                placeholder="Filter players…"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-xs font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
              />
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
              {filteredNonHolders.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm font-bold text-zinc-600">
                  {nonHolderSearch ? "No matches" : "Everyone has this badge"}
                </p>
              ) : (
                filteredNonHolders.map((h) => (
                  <div
                    key={h.user_id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-black bg-gradient-to-br from-zinc-400 to-zinc-600">
                      {h.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-white truncate">
                        {h.name}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-600 truncate">
                        {h.user_id}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAdd(h.user_id)}
                      disabled={actingOn === h.user_id || isPending}
                      className="flex-shrink-0 rounded-xl border-2 border-cyan-700/50 bg-cyan-950/20 px-3 py-1.5 text-xs font-black text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {actingOn === h.user_id ? "⟳" : "➕ Add"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player Search + Badge Assignment Tab
// ---------------------------------------------------------------------------

function PlayerBadgeTab({
  onToast,
}: {
  onToast: (type: "success" | "error", text: string) => void;
}) {
  const search = usePlayerSearch();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null);
  const [playerBadges, setPlayerBadges] = useState<BadgeInfo[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  async function handleSelect(player: { user_id: string; name: string }) {
    search.clear();
    setIsLoadingDetail(true);
    setSelectedPlayer(null);
    try {
      const [detailResult, badgesRes] = await Promise.all([
        getPlayerDetail(player.user_id),
        fetch(`/api/admin/badges?userId=${encodeURIComponent(player.user_id)}`),
      ]);
      if (detailResult.success && detailResult.data) {
        setSelectedPlayer(detailResult.data);
      }
      if (badgesRes.ok) {
        const data = await badgesRes.json();
        setPlayerBadges(data.badges ?? []);
      }
    } finally {
      setIsLoadingDetail(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
          Find a Player
        </p>
        <PlayerSearch
          query={search.query}
          results={search.results}
          isSearching={search.isSearching}
          isOpen={search.isOpen}
          selectedId={selectedPlayer?.user_id}
          onQueryChange={search.handleQueryChange}
          onSelect={handleSelect}
          onClose={search.close}
          onClear={() => {
            search.clear();
            setSelectedPlayer(null);
            setPlayerBadges([]);
          }}
        />
      </div>

      {/* Loading */}
      {isLoadingDetail && (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
          <p className="text-zinc-400 animate-pulse text-sm">Loading player…</p>
        </div>
      )}

      {/* Empty state */}
      {!selectedPlayer && !isLoadingDetail && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d0d14] p-12 text-center">
          <p className="text-4xl mb-3">🏅</p>
          <p className="text-sm font-bold text-zinc-400">No player selected</p>
          <p className="mt-1 text-xs text-zinc-600">
            Search above to find a player and manage their badges.
          </p>
        </div>
      )}

      {/* Player detail + badge manager */}
      {selectedPlayer && !isLoadingDetail && (
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-4">
          <div>
            <h3 className="text-lg font-black">{selectedPlayer.name}</h3>
            <p className="text-[11px] font-mono text-zinc-500">
              {selectedPlayer.user_id}
            </p>
          </div>
          <BadgeManager
            userId={selectedPlayer.user_id}
            badges={playerBadges}
            onBadgesChange={setPlayerBadges}
            onToast={onToast}
          />
          <div className="pt-1">
            <SoundLink
              href={`/profile/${selectedPlayer.user_id}`}
              soundType="click"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              👤 View Profile →
            </SoundLink>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type ActiveTab = "players" | "holders";

export default function AdminBadgesPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("players");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((data) => {
        setIsOwner(data.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (toast?.type === "success") {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  function handleToast(type: "success" | "error", text: string) {
    setToast({ type, text });
  }

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

  return (
    <Shell>
      {toast && (
        <Toast msg={toast} onDismiss={() => setToast(null)} />
      )}

      <div className="mb-8">
        <h1 className="text-4xl font-black">🏅 Badge Manager</h1>
        <p className="mt-2 text-zinc-400">
          Assign and remove achievement badges. All actions are audit-logged.
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("players")}
          className={`rounded-xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "players"
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg"
              : "border border-white/10 text-zinc-400 hover:bg-white/5"
          }`}
        >
          🔍 Search & Assign
        </button>
        <button
          onClick={() => setActiveTab("holders")}
          className={`rounded-xl px-5 py-2.5 text-sm font-black transition ${
            activeTab === "holders"
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg"
              : "border border-white/10 text-zinc-400 hover:bg-white/5"
          }`}
        >
          📋 Badge Holders
        </button>
      </div>

      {activeTab === "players" && (
        <PlayerBadgeTab onToast={handleToast} />
      )}
      {activeTab === "holders" && (
        <BadgeHoldersTab onToast={handleToast} />
      )}
    </Shell>
  );
}
