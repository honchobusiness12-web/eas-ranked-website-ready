"use client";

import { useState, useEffect, useRef } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerRow {
  user_id: string;
  name: string;
  roles: string[];
}

interface BadgeInfo {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

interface PlayerBadgeData {
  userId: string;
  name: string | null;
  badges: BadgeInfo[];
  roles: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BADGE_OPTIONS = [
  {
    id: "staff",
    label: "Staff",
    icon: "👮",
    color: "#00FF88",
    border: "border-green-700/40",
    bg: "bg-green-950/20",
    hoverBg: "hover:bg-green-950/40",
    text: "text-green-300",
    removeBorder: "border-red-700/40",
    removeBg: "bg-red-950/20",
    removeHover: "hover:bg-red-950/40",
    removeText: "text-red-300",
  },
  {
    id: "contentCreator",
    label: "Content Creator",
    icon: "🎬",
    color: "#00D4FF",
    border: "border-cyan-700/40",
    bg: "bg-cyan-950/20",
    hoverBg: "hover:bg-cyan-950/40",
    text: "text-cyan-300",
    removeBorder: "border-red-700/40",
    removeBg: "bg-red-950/20",
    removeHover: "hover:bg-red-950/40",
    removeText: "text-red-300",
  },
  {
    id: "tournamentWinner",
    label: "Tournament Winner",
    icon: "🏆",
    color: "#FFD700",
    border: "border-yellow-700/40",
    bg: "bg-yellow-950/20",
    hoverBg: "hover:bg-yellow-950/40",
    text: "text-yellow-300",
    removeBorder: "border-red-700/40",
    removeBg: "bg-red-950/20",
    removeHover: "hover:bg-red-950/40",
    removeText: "text-red-300",
  },
] as const;

type BadgeId = (typeof BADGE_OPTIONS)[number]["id"];

/** Client-side search cache: query → { players, expiresAt } */
const searchCache = new Map<string, { players: PlayerRow[]; expiresAt: number }>();
const SEARCH_CACHE_TTL_MS = 30_000;

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminBadgesPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Search state
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlayerRow[]>([]);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selected player state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerBadgeData | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [optimisticBadges, setOptimisticBadges] = useState<BadgeInfo[] | null>(null);
  const [actioning, setActioning] = useState<BadgeId | null>(null);

  // Feedback
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ---------------------------------------------------------------------------
  // Auth check
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((data) => {
        setIsOwner(data.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // Auto-dismiss success messages
  useEffect(() => {
    if (msg?.type === "success") {
      const t = setTimeout(() => setMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [msg]);

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }

    const cached = searchCache.get(trimmed);
    if (cached && Date.now() < cached.expiresAt) {
      setResults(cached.players);
      setSearched(true);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/admin/badges?search=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const players: PlayerRow[] = data.players ?? [];
        searchCache.set(trimmed, { players, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
        setResults(players);
        setSearched(true);
      }
    } finally {
      setSearching(false);
    }
  }

  function handleSearchInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setSearched(false);
  }

  // ---------------------------------------------------------------------------
  // Select player
  // ---------------------------------------------------------------------------

  async function selectPlayer(userId: string) {
    setLoadingPlayer(true);
    setSelectedPlayer(null);
    setOptimisticBadges(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/badges?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPlayer(data);
      }
    } finally {
      setLoadingPlayer(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Add / remove badge
  // ---------------------------------------------------------------------------

  async function handleBadgeAction(badgeId: BadgeId, action: "assign" | "remove") {
    if (!selectedPlayer) return;
    setActioning(badgeId);
    setMsg(null);

    const currentBadges = optimisticBadges ?? selectedPlayer.badges;
    const badgeOption = BADGE_OPTIONS.find((b) => b.id === badgeId)!;

    // Optimistic update
    const nextBadges =
      action === "assign"
        ? currentBadges.some((b) => b.id === badgeId)
          ? currentBadges
          : [
              ...currentBadges,
              {
                id: badgeId,
                label: badgeOption.label,
                icon: badgeOption.icon,
                color: badgeOption.color,
                description: "",
              },
            ]
        : currentBadges.filter((b) => b.id !== badgeId);
    setOptimisticBadges(nextBadges);

    try {
      const res = await fetch("/api/admin/badges", {
        method: action === "assign" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedPlayer.userId, badge: badgeId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg({
          type: "success",
          text: `✅ ${badgeOption.icon} ${badgeOption.label} ${
            action === "assign" ? "added to" : "removed from"
          } ${selectedPlayer.name ?? selectedPlayer.userId}`,
        });
        setOptimisticBadges(data.badges ?? null);
        setSelectedPlayer((prev) =>
          prev ? { ...prev, badges: data.badges ?? prev.badges } : prev
        );
        // Bust the search cache so re-searches reflect the change
        searchCache.clear();
      } else {
        setOptimisticBadges(null);
        setMsg({ type: "error", text: data.error ?? "Action failed." });
      }
    } catch {
      setOptimisticBadges(null);
      setMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setActioning(null);
    }
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
  // Derived state
  // ---------------------------------------------------------------------------

  const displayBadges = optimisticBadges ?? selectedPlayer?.badges ?? [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Shell>
      {/* ── Page header ── */}
      <div className="mb-8">
        <h1 className="text-4xl font-black">🏅 Badge Manager</h1>
        <p className="mt-2 text-zinc-400 text-sm">
          Search for a player and manage their badges. Simple.
        </p>
      </div>

      {/* ── Search box ── */}
      <div className="mb-6">
        <div className="relative flex items-center">
          <span className="absolute left-4 text-zinc-500 text-lg pointer-events-none">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search by player name or Discord ID…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-12 text-base text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none focus:bg-white/[0.07] transition"
            autoFocus
          />
          {searching && (
            <span className="absolute right-4 text-zinc-500 text-sm animate-pulse">
              Searching…
            </span>
          )}
          {!searching && query && (
            <button
              onClick={clearSearch}
              className="absolute right-4 text-zinc-500 hover:text-zinc-200 text-lg transition"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

        {/* ── LEFT: Search results ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="font-black text-sm uppercase tracking-wider text-zinc-400">
              Search Results
            </h2>
          </div>

          <div className="divide-y divide-white/5">
            {/* Empty / prompt state */}
            {!searched && !searching && (
              <div className="px-5 py-12 text-center">
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-zinc-500 text-sm">
                  Type a name or Discord ID above to find players.
                </p>
              </div>
            )}

            {/* Searching spinner */}
            {searching && (
              <div className="px-5 py-12 text-center">
                <p className="text-zinc-500 text-sm animate-pulse">Searching…</p>
              </div>
            )}

            {/* No results */}
            {searched && !searching && results.length === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="text-2xl mb-3">😕</p>
                <p className="text-zinc-500 text-sm">
                  No players found for &quot;{query}&quot;
                </p>
              </div>
            )}

            {/* Results list */}
            {results.map((player) => {
              const isSelected = selectedPlayer?.userId === player.user_id;
              return (
                <button
                  key={player.user_id}
                  onClick={() => selectPlayer(player.user_id)}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left transition ${
                    isSelected
                      ? "bg-white/[0.08] border-l-2 border-l-red-500"
                      : "hover:bg-white/[0.05] border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-white truncate">
                      {player.name ?? "Unknown"}
                    </p>
                    <p className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                      {player.user_id}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500 shrink-0 ml-3">
                    {isSelected ? "✓ Selected" : "Select →"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Selected player card ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">

          {/* Loading state */}
          {loadingPlayer && (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <p className="text-zinc-400 animate-pulse">Loading player…</p>
            </div>
          )}

          {/* No player selected */}
          {!loadingPlayer && !selectedPlayer && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] px-8 text-center">
              <p className="text-5xl mb-4">👈</p>
              <p className="text-zinc-400 font-bold">Select a player</p>
              <p className="text-zinc-600 text-sm mt-1">
                Search and click a player on the left to manage their badges.
              </p>
            </div>
          )}

          {/* Player details */}
          {!loadingPlayer && selectedPlayer && (
            <div>
              {/* Player header */}
              <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5">
                {/* Avatar */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-700 to-indigo-800 text-2xl font-black select-none">
                  {(selectedPlayer.name ?? "?")[0].toUpperCase()}
                </div>
                {/* Name + ID */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black truncate">
                    {selectedPlayer.name ?? "Unknown Player"}
                  </h2>
                  <p className="text-[11px] font-mono text-zinc-500 mt-0.5 truncate">
                    {selectedPlayer.userId}
                  </p>
                </div>
                {/* Refresh + clear */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => selectPlayer(selectedPlayer.userId)}
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
                    title="Refresh"
                  >
                    ↻
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPlayer(null);
                      setOptimisticBadges(null);
                      setMsg(null);
                    }}
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
                    title="Clear selection"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Feedback banner */}
              {msg && (
                <div
                  className={`mx-6 mt-5 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold ${
                    msg.type === "success"
                      ? "border-green-700/40 bg-green-950/20 text-green-300"
                      : "border-red-700/40 bg-red-950/20 text-red-300"
                  }`}
                >
                  <span>{msg.text}</span>
                  <button
                    onClick={() => setMsg(null)}
                    className="ml-3 text-xs opacity-60 hover:opacity-100 transition"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Badge list */}
              <div className="px-6 py-5 space-y-3">
                {/* Section: Current badges */}
                <div className="mb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                    Current Badges
                  </p>
                  {displayBadges.length === 0 ? (
                    <p className="text-sm text-zinc-600 italic py-1">
                      No badges assigned yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {displayBadges.map((badge) => {
                        const opt = BADGE_OPTIONS.find((b) => b.id === badge.id);
                        const isRemoving = actioning === badge.id;
                        return (
                          <div
                            key={badge.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{badge.icon}</span>
                              <div>
                                <p
                                  className="font-black text-sm"
                                  style={{ color: badge.color }}
                                >
                                  {badge.label}
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  ✓ Currently assigned
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleBadgeAction(badge.id as BadgeId, "remove")}
                              disabled={!!actioning}
                              className={`rounded-xl border px-4 py-2 text-sm font-black transition disabled:opacity-40 disabled:cursor-not-allowed ${
                                opt
                                  ? `${opt.removeBorder} ${opt.removeBg} ${opt.removeHover} ${opt.removeText}`
                                  : "border-red-700/40 bg-red-950/20 hover:bg-red-950/40 text-red-300"
                              }`}
                            >
                              {isRemoving ? "Removing…" : "− Remove"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-white/5 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
                    Add Badges
                  </p>
                  <div className="space-y-2">
                    {BADGE_OPTIONS.filter(
                      (opt) => !displayBadges.some((b) => b.id === opt.id)
                    ).map((opt) => {
                      const isAdding = actioning === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleBadgeAction(opt.id, "assign")}
                          disabled={!!actioning}
                          className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition disabled:opacity-40 disabled:cursor-not-allowed ${opt.border} ${opt.bg} ${opt.hoverBg}`}
                        >
                          <span className="text-xl">{opt.icon}</span>
                          <span className={`font-black text-sm ${opt.text}`}>
                            {isAdding ? `Adding ${opt.label}…` : `+ Add ${opt.label}`}
                          </span>
                        </button>
                      );
                    })}

                    {/* All badges assigned */}
                    {BADGE_OPTIONS.every((opt) =>
                      displayBadges.some((b) => b.id === opt.id)
                    ) && (
                      <p className="text-sm text-zinc-600 italic py-1">
                        All available badges are assigned.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
