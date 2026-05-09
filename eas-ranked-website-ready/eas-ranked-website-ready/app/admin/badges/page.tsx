"use client";

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

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

const BADGE_OPTIONS = [
  { id: "staff",           label: "Staff",            icon: "👮", color: "#00FF88" },
  { id: "contentCreator",  label: "Content Creator",  icon: "🎬", color: "#00D4FF" },
  { id: "tournamentWinner",label: "Tournament Winner", icon: "🏆", color: "#FFD700" },
] as const;

type BadgeId = (typeof BADGE_OPTIONS)[number]["id"];

function BadgePill({ badge }: { badge: BadgeInfo }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black"
      style={{
        background: `linear-gradient(135deg, ${badge.color}33, ${badge.color}18)`,
        border: `1px solid ${badge.color}60`,
        color: badge.color,
      }}
      title={badge.description}
    >
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
    </span>
  );
}

export default function AdminBadgesPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlayerRow[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected player
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerBadgeData | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);

  // Badge holders list
  const [badgeHolders, setBadgeHolders] = useState<PlayerRow[]>([]);
  const [loadingHolders, setLoadingHolders] = useState(false);

  // Action state
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actioning, setActioning] = useState(false);

  // Auth check
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.user) { setAuthChecked(true); return; }
        const res = await fetch("/api/admin/badges");
        setIsOwner(res.ok);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  const loadBadgeHolders = useCallback(async () => {
    setLoadingHolders(true);
    try {
      const res = await fetch("/api/admin/badges");
      if (res.ok) {
        const data = await res.json();
        setBadgeHolders(data.players ?? []);
      }
    } finally {
      setLoadingHolders(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) loadBadgeHolders();
  }, [isOwner, loadBadgeHolders]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/admin/badges?search=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.players ?? []);
      }
    } finally {
      setSearching(false);
    }
  }

  async function selectPlayer(userId: string) {
    setLoadingPlayer(true);
    setSelectedPlayer(null);
    setActionMsg(null);
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

  async function handleBadgeAction(badge: BadgeId, action: "assign" | "remove") {
    if (!selectedPlayer) return;
    setActioning(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/badges", {
        method: action === "assign" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedPlayer.userId, badge }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg({
          type: "success",
          text: `✅ Badge "${badge}" ${action === "assign" ? "assigned to" : "removed from"} ${selectedPlayer.name ?? selectedPlayer.userId}`,
        });
        // Refresh selected player badges
        await selectPlayer(selectedPlayer.userId);
        loadBadgeHolders();
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

  // -------------------------------------------------------------------------
  // Main UI
  // -------------------------------------------------------------------------

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-4xl font-black">🏅 Badge Manager</h1>
        <p className="mt-2 text-zinc-400">
          Assign and remove Staff, Content Creator, and Tournament Winner badges. Owner access only.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left column — search + selected player */}
        <div className="space-y-6">
          {/* Search */}
          <div className="rounded-2xl border border-red-700/30 bg-gradient-to-br from-red-950/20 to-black p-6">
            <h2 className="mb-4 text-xl font-black text-red-300">🔍 Find Player</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by player name…"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-red-600/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 font-black text-white hover:from-red-500 hover:to-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searching ? "…" : "Search"}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-1">
                {searchResults.map((player) => (
                  <button
                    key={player.user_id}
                    onClick={() => selectPlayer(player.user_id)}
                    className="w-full flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2.5 text-left hover:bg-white/[0.07] hover:border-white/10 transition"
                  >
                    <div>
                      <p className="font-bold text-sm text-white">{player.name}</p>
                      <p className="text-[10px] font-mono text-zinc-500">{player.user_id}</p>
                    </div>
                    <span className="text-xs text-zinc-500">Select →</span>
                  </button>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searching && (
              <p className="mt-3 text-sm text-zinc-500">No players found for &quot;{searchQuery}&quot;.</p>
            )}
          </div>

          {/* Selected player badge editor */}
          {loadingPlayer && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
              <p className="text-zinc-400 animate-pulse">Loading player…</p>
            </div>
          )}

          {selectedPlayer && !loadingPlayer && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-black">{selectedPlayer.name ?? "Unknown Player"}</h2>
                  <p className="text-[11px] font-mono text-zinc-500 mt-0.5">{selectedPlayer.userId}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPlayer.badges.length > 0
                    ? selectedPlayer.badges.map((b) => <BadgePill key={b.id} badge={b} />)
                    : <span className="text-xs text-zinc-500">No badges</span>
                  }
                </div>
              </div>

              {/* Action feedback */}
              {actionMsg && (
                <div
                  className={`mb-4 rounded-xl border px-4 py-3 text-sm font-bold ${
                    actionMsg.type === "success"
                      ? "border-green-700/40 bg-green-950/20 text-green-300"
                      : "border-red-700/40 bg-red-950/20 text-red-300"
                  }`}
                >
                  {actionMsg.text}
                </div>
              )}

              {/* Badge assignment grid */}
              <div className="space-y-3">
                {BADGE_OPTIONS.map((badge) => {
                  const hasBadge = selectedPlayer.badges.some((b) => b.id === badge.id);
                  return (
                    <div
                      key={badge.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{badge.icon}</span>
                        <div>
                          <p className="font-bold text-sm" style={{ color: badge.color }}>
                            {badge.label}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {hasBadge ? "Currently assigned" : "Not assigned"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!hasBadge ? (
                          <button
                            onClick={() => handleBadgeAction(badge.id, "assign")}
                            disabled={actioning}
                            className="rounded-lg border border-green-700/40 bg-green-950/20 px-3 py-1.5 text-xs font-bold text-green-300 hover:bg-green-950/40 transition disabled:opacity-50"
                          >
                            + Assign
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBadgeAction(badge.id, "remove")}
                            disabled={actioning}
                            className="rounded-lg border border-red-700/40 bg-red-950/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-950/40 transition disabled:opacity-50"
                          >
                            − Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column — current badge holders */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden h-fit">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="text-lg font-black">🏅 Badge Holders</h2>
            <button
              onClick={loadBadgeHolders}
              disabled={loadingHolders}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
            >
              {loadingHolders ? "…" : "↻"}
            </button>
          </div>

          {loadingHolders && badgeHolders.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 animate-pulse text-sm">Loading…</div>
          ) : badgeHolders.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">No badge holders yet.</div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
              {badgeHolders.map((player) => (
                <button
                  key={player.user_id}
                  onClick={() => selectPlayer(player.user_id)}
                  className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/5 transition"
                >
                  <div>
                    <p className="font-bold text-sm text-white">{player.name}</p>
                    <p className="text-[10px] font-mono text-zinc-600">{player.user_id}</p>
                  </div>
                  <span className="text-xs text-zinc-500 shrink-0">Edit →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
