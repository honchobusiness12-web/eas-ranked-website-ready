"use client";

import { useState, useEffect, useRef } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BadgeInfo {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

interface PlayerRow {
  user_id: string;
  name: string;
  roles: string[];
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
    activeClass: "border-green-500/60 bg-green-950/30 text-green-300",
    inactiveClass: "border-white/10 bg-white/[0.03] text-zinc-400",
    addClass: "border-green-700/50 bg-green-950/20 text-green-300 hover:bg-green-950/40",
    removeClass: "border-red-700/50 bg-red-950/20 text-red-300 hover:bg-red-950/40",
  },
  {
    id: "contentCreator",
    label: "Content Creator",
    icon: "🎬",
    color: "#00D4FF",
    activeClass: "border-cyan-500/60 bg-cyan-950/30 text-cyan-300",
    inactiveClass: "border-white/10 bg-white/[0.03] text-zinc-400",
    addClass: "border-cyan-700/50 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-950/40",
    removeClass: "border-red-700/50 bg-red-950/20 text-red-300 hover:bg-red-950/40",
  },
  {
    id: "tournamentWinner",
    label: "Tournament Winner",
    icon: "🏆",
    color: "#FFD700",
    activeClass: "border-yellow-500/60 bg-yellow-950/30 text-yellow-300",
    inactiveClass: "border-white/10 bg-white/[0.03] text-zinc-400",
    addClass: "border-yellow-700/50 bg-yellow-950/20 text-yellow-300 hover:bg-yellow-950/40",
    removeClass: "border-red-700/50 bg-red-950/20 text-red-300 hover:bg-red-950/40",
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
  const [hasSearched, setHasSearched] = useState(false);
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
      setHasSearched(false);
      return;
    }

    const cached = searchCache.get(trimmed);
    if (cached && Date.now() < cached.expiresAt) {
      setResults(cached.players);
      setHasSearched(true);
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
        setHasSearched(true);
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
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  }

  // ---------------------------------------------------------------------------
  // Select a player
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
  // Toggle badge (assign or remove) with optimistic update
  // ---------------------------------------------------------------------------

  async function toggleBadge(badgeId: BadgeId) {
    if (!selectedPlayer || actioning) return;

    const currentBadges = optimisticBadges ?? selectedPlayer.badges;
    const hasBadge = currentBadges.some((b) => b.id === badgeId);
    const action = hasBadge ? "remove" : "assign";
    const badgeOption = BADGE_OPTIONS.find((b) => b.id === badgeId)!;

    // Optimistic update
    const nextBadges = hasBadge
      ? currentBadges.filter((b) => b.id !== badgeId)
      : [
          ...currentBadges,
          {
            id: badgeId,
            label: badgeOption.label,
            icon: badgeOption.icon,
            color: badgeOption.color,
            description: "",
          },
        ];
    setOptimisticBadges(nextBadges);
    setActioning(badgeId);
    setMsg(null);

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
          text: `✅ ${badgeOption.icon} ${badgeOption.label} ${action === "assign" ? "added to" : "removed from"} ${selectedPlayer.name ?? selectedPlayer.userId}`,
        });
        setOptimisticBadges(data.badges ?? null);
        setSelectedPlayer((prev) =>
          prev ? { ...prev, badges: data.badges ?? prev.badges } : prev
        );
        // Invalidate search cache so results reflect new badge state
        searchCache.clear();
      } else {
        // Revert optimistic update
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

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const displayBadges = optimisticBadges ?? selectedPlayer?.badges ?? [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Shell>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black">🏅 Badge Manager</h1>
        <p className="mt-2 text-zinc-400 text-sm">
          Search for a player, then add or remove their badges. Developer access only.
        </p>
      </div>

      {/* ── Search box ── */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
          🔍 Search Players
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search by name or Discord ID…"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-base text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
            autoFocus
          />
          {searching && (
            <span className="absolute right-4 text-zinc-500 text-sm animate-pulse">…</span>
          )}
          {!searching && query && (
            <button
              onClick={clearSearch}
              className="absolute right-4 text-zinc-500 hover:text-zinc-300 text-sm transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── LEFT: Search results ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="font-black text-base">Search Results</h2>
            {hasSearched && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {results.length === 0
                  ? `No players found for "${query}"`
                  : `${results.length} player${results.length !== 1 ? "s" : ""} found`}
              </p>
            )}
          </div>

          <div className="divide-y divide-white/5">
            {/* Empty / prompt state */}
            {!hasSearched && !searching && (
              <div className="px-5 py-12 text-center">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-zinc-500 text-sm">Type a name or Discord ID above to find players.</p>
              </div>
            )}

            {/* Searching spinner */}
            {searching && (
              <div className="px-5 py-12 text-center">
                <p className="text-zinc-400 animate-pulse text-sm">Searching…</p>
              </div>
            )}

            {/* No results */}
            {hasSearched && !searching && results.length === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="text-3xl mb-3">😶</p>
                <p className="text-zinc-500 text-sm">No players found for &quot;{query}&quot;</p>
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
                  <div>
                    <p className="font-bold text-sm text-white">{player.name ?? "Unknown"}</p>
                    <p className="text-[11px] font-mono text-zinc-500 mt-0.5">{player.user_id}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ml-3 ${isSelected ? "text-red-400" : "text-zinc-600"}`}>
                    {isSelected ? "Selected ✓" : "Select →"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Selected player + badge controls ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
          {/* Loading state */}
          {loadingPlayer && (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <p className="text-zinc-400 animate-pulse text-sm">Loading player…</p>
            </div>
          )}

          {/* No player selected */}
          {!selectedPlayer && !loadingPlayer && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] px-5 text-center">
              <p className="text-5xl mb-4">👤</p>
              <p className="text-zinc-500 text-sm">Select a player from the search results to manage their badges.</p>
            </div>
          )}

          {/* Player card */}
          {selectedPlayer && !loadingPlayer && (
            <div className="flex flex-col h-full">
              {/* Player header */}
              <div className="px-6 py-5 border-b border-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">👤</span>
                      <h2 className="text-xl font-black">{selectedPlayer.name ?? "Unknown Player"}</h2>
                    </div>
                    <p className="text-[11px] font-mono text-zinc-500">ID: {selectedPlayer.userId}</p>
                  </div>
                  <button
                    onClick={() => selectPlayer(selectedPlayer.userId)}
                    className="shrink-0 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
                  >
                    ↻ Refresh
                  </button>
                </div>

                {/* Current badges summary */}
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Current Badges</p>
                  <div className="flex flex-wrap gap-2">
                    {displayBadges.length === 0 ? (
                      <span className="text-xs text-zinc-600 italic">No badges assigned</span>
                    ) : (
                      displayBadges.map((badge) => (
                        <span
                          key={badge.id}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black"
                          style={{
                            background: `linear-gradient(135deg, ${badge.color}33, ${badge.color}18)`,
                            border: `1px solid ${badge.color}60`,
                            color: badge.color,
                          }}
                        >
                          <span>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                      ))
                    )}
                  </div>
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

              {/* Badge toggle buttons */}
              <div className="px-6 py-5 space-y-3 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-4">
                  Manage Badges
                </p>

                {BADGE_OPTIONS.map((badge) => {
                  const hasBadge = displayBadges.some((b) => b.id === badge.id);
                  const isActioning = actioning === badge.id;

                  return (
                    <div
                      key={badge.id}
                      className={`rounded-2xl border p-4 transition-colors ${
                        hasBadge ? badge.activeClass : badge.inactiveClass
                      }`}
                    >
                      {/* Badge info row */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">{badge.icon}</span>
                        <div>
                          <p className="font-black text-base" style={{ color: badge.color }}>
                            {badge.label}
                          </p>
                          <p className="text-xs mt-0.5">
                            {hasBadge ? (
                              <span className="text-green-400 font-bold">✓ Has this badge</span>
                            ) : (
                              <span className="text-zinc-500">✗ Does not have this badge</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Big action button */}
                      <button
                        onClick={() => toggleBadge(badge.id)}
                        disabled={!!actioning}
                        className={`w-full rounded-xl border py-3 text-sm font-black transition disabled:opacity-50 disabled:cursor-not-allowed ${
                          hasBadge ? badge.removeClass : badge.addClass
                        }`}
                      >
                        {isActioning
                          ? hasBadge
                            ? "Removing…"
                            : "Adding…"
                          : hasBadge
                          ? `− Remove ${badge.label}`
                          : `+ Add ${badge.label}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-6 pb-5">
                <button
                  onClick={() => {
                    setSelectedPlayer(null);
                    setOptimisticBadges(null);
                    setMsg(null);
                  }}
                  className="w-full rounded-xl border border-white/10 py-2.5 text-xs font-bold text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition"
                >
                  ✕ Deselect Player
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
