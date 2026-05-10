"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PlayerSearch from "@/app/admin/components/PlayerSearch";
import PlayerRow from "@/app/admin/components/PlayerRow";
import BadgeManager from "@/app/admin/components/BadgeManager";
import Toast, { type ToastMessage } from "@/app/admin/components/Toast";
import LoadingSpinner from "@/app/admin/components/LoadingSpinner";
import { getPlayerBadges, type PlayerResult, type BadgeInfo } from "@/app/admin/actions";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminBadgesPage() {
  // Auth
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Flat state — no nested objects, no per-player maps
  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [badges, setBadges] = useState<BadgeInfo[]>([]);

  // Auth check
  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => {
        setIsOwner(d.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // Load badges when a player is selected
  async function handleSelectPlayer(player: PlayerResult) {
    setSelectedPlayer(player);
    setBadges([]);
    setError(null);
    setLoading(true);
    try {
      const result = await getPlayerBadges(player.user_id);
      if (result.error) {
        setError(result.error);
      } else {
        setBadges(result.badges);
      }
    } finally {
      setLoading(false);
    }
  }

  // Auth gate
  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoadingSpinner text="Checking access…" size="lg" />
        </div>
      </Shell>
    );
  }

  if (!isOwner) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-5xl">🚫</p>
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight">🏅 Badge Manager</h1>
        <p className="mt-2 text-zinc-400">
          Search for a player, then assign or remove achievement badges.
        </p>
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* LEFT: Search + results */}
        <div className="space-y-5">
          {/* Step 1 — Search */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
              Step 1 — Find a Player
            </p>
            <PlayerSearch
              onSelect={handleSelectPlayer}
              placeholder="Search by player name or Discord ID…"
            />
          </div>

          {/* Search results list */}
          {players.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
              <p className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">
                Results
              </p>
              {players.map((p) => (
                <PlayerRow
                  key={p.user_id}
                  player={p}
                  selected={selectedPlayer?.user_id === p.user_id}
                  onSelect={handleSelectPlayer}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Badge management panel */}
        <div className="space-y-4">
          {!selectedPlayer && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0d0d14] p-14 text-center">
              <p className="mb-3 text-5xl">🏅</p>
              <p className="text-sm font-bold text-zinc-400">No player selected</p>
              <p className="mt-1 text-xs text-zinc-600">
                Search above and click a player to manage their badges.
              </p>
            </div>
          )}

          {selectedPlayer && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-5">
              {/* Player header */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/8">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-sm text-black"
                  style={{ background: "linear-gradient(135deg, #00FF88, #00D4FF)" }}
                >
                  {selectedPlayer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-white truncate">{selectedPlayer.name}</p>
                  <p className="text-[11px] font-mono text-zinc-500 truncate">
                    {selectedPlayer.user_id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-orange-400">
                    {selectedPlayer.cr.toLocaleString()} CR
                  </p>
                </div>
              </div>

              {/* Step 2 label */}
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                Step 2 — Manage Badges
              </p>

              {/* Loading state */}
              {loading && <LoadingSpinner text="Loading badges…" />}

              {/* Error state */}
              {error && !loading && (
                <p className="text-sm text-red-400 font-bold">{error}</p>
              )}

              {/* Badge manager */}
              {!loading && !error && (
                <BadgeManager
                  userId={selectedPlayer.user_id}
                  badges={badges}
                  onBadgesChange={setBadges}
                  onToast={setToast}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
