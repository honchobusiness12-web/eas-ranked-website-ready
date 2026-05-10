"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import PlayerSearch from "@/app/admin/components/PlayerSearch";
import StatsEditor from "@/app/admin/components/StatsEditor";
import Toast, { type ToastMessage } from "@/app/admin/components/Toast";
import LoadingSpinner from "@/app/admin/components/LoadingSpinner";
import { type PlayerResult } from "@/app/admin/actions";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminStatsPage() {
  // Auth
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Flat state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

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

  async function handleSelectPlayer(player: PlayerResult) {
    setSelectedPlayer(player);
    setError(null);
    setLoading(false);
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
        <h1 className="text-4xl font-black tracking-tight">📊 Stats Editor</h1>
        <p className="mt-2 text-zinc-400">
          Search for a player, then edit their stats or reset everything to zero.
        </p>
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        {/* LEFT: Search */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
              Step 1 — Find a Player
            </p>
            <PlayerSearch
              onSelect={handleSelectPlayer}
              placeholder="Search by player name or Discord ID…"
            />
          </div>

          {/* Selected player summary */}
          {selectedPlayer && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-sm text-black"
                  style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9F43)" }}
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
                  <p className="text-[10px] text-zinc-500">
                    {selectedPlayer.wins}W / {selectedPlayer.losses}L
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Stats editor panel */}
        <div className="space-y-4">
          {!selectedPlayer && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0d0d14] p-14 text-center">
              <p className="mb-3 text-5xl">📊</p>
              <p className="text-sm font-bold text-zinc-400">No player selected</p>
              <p className="mt-1 text-xs text-zinc-600">
                Search above and click a player to edit their stats.
              </p>
            </div>
          )}

          {selectedPlayer && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-5">
              {/* Player header */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/8">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-sm text-black"
                  style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9F43)" }}
                >
                  {selectedPlayer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-white truncate">{selectedPlayer.name}</p>
                  <p className="text-[11px] font-mono text-zinc-500 truncate">
                    {selectedPlayer.user_id}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {selectedPlayer.blacklisted && (
                    <span className="rounded-md border border-red-700/40 bg-red-950/40 px-2 py-0.5 text-[10px] font-black text-red-400">
                      BANNED
                    </span>
                  )}
                  {selectedPlayer.ranked && !selectedPlayer.blacklisted && (
                    <span className="rounded-md border border-green-700/40 bg-green-950/40 px-2 py-0.5 text-[10px] font-black text-green-400">
                      RANKED
                    </span>
                  )}
                </div>
              </div>

              {/* Step 2 label */}
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                Step 2 — Edit Stats
              </p>

              {/* Loading */}
              {loading && <LoadingSpinner text="Loading player…" />}

              {/* Error */}
              {error && !loading && (
                <p className="text-sm text-red-400 font-bold">{error}</p>
              )}

              {/* Stats editor */}
              {!loading && !error && (
                <StatsEditor
                  player={selectedPlayer}
                  onPlayerChange={setSelectedPlayer}
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
