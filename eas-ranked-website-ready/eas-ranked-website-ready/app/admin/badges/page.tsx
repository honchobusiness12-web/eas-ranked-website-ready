"use client";

import { useState, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import Toast, { type ToastMessage } from "@/components/admin/Toast";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import PlayerSearch from "@/components/admin/PlayerSearch";
import PlayerCard from "@/components/admin/PlayerCard";
import { resetAllStats, searchPlayers } from "@/lib/admin/actions";
import type { PlayerSearchResult } from "@/lib/admin/actions";

// ---------------------------------------------------------------------------
// Admin Badge Manager — rebuilt from scratch
//
// Architecture:
//   - Flat state: selectedPlayer, loading, error, toast
//   - Server actions handle ALL database logic (lib/admin/actions.ts)
//   - Components are dumb: they display data and call actions
//   - No optimistic updates — always wait for server response
//   - Every action is logged via lib/admin/audit.ts
// ---------------------------------------------------------------------------

export default function AdminBadgesPage() {
  // ── Auth state ──────────────────────────────────────────────────────────
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // ── Core state ──────────────────────────────────────────────────────────
  const [selectedPlayer, setSelectedPlayer] =
    useState<PlayerSearchResult | null>(null);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // ── Reset stats confirmation ─────────────────────────────────────────────
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // ── Auth check on mount ─────────────────────────────────────────────────
  const [authInitiated, setAuthInitiated] = useState(false);
  if (!authInitiated) {
    setAuthInitiated(true);
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((data) => {
        setIsOwner(data.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }

  // ── Select player ────────────────────────────────────────────────────────

  function handleSelectPlayer(player: PlayerSearchResult) {
    setSelectedPlayer(player);
  }

  // ── Player updated (badges, premium, stats changed) ──────────────────────

  const handlePlayerChanged = useCallback((updated: PlayerSearchResult) => {
    setSelectedPlayer(updated);
  }, []);

  // ── Reset all stats ──────────────────────────────────────────────────────

  async function handleResetAllStats() {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    setResetting(true);
    setResetConfirm(false);
    try {
      const result = await resetAllStats();
      if (result.success && result.data) {
        setToast({
          type: "success",
          message: `Reset stats for ${result.data.count} players`,
        });
        // Reload selected player to show zeroed stats
        if (selectedPlayer) {
          const refreshed = await searchPlayers(selectedPlayer.user_id);
          if (refreshed.data?.[0]) {
            setSelectedPlayer(refreshed.data[0]);
          }
        }
      } else {
        setToast({
          type: "error",
          message: result.error ?? "Failed to reset stats",
        });
      }
    } catch {
      setToast({ type: "error", message: "An unexpected error occurred" });
    } finally {
      setResetting(false);
    }
  }

  // ── Auth gate ────────────────────────────────────────────────────────────

  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoadingSpinner size="lg" label="Checking access…" />
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

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <Shell>
      {/* Toast notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* ── Page header ── */}
      <div
        className="relative mb-8 rounded-3xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0a0a14 0%, #0d0d1a 40%, #0a0a14 100%)",
          border: "2px solid rgba(0,255,136,0.30)",
          boxShadow:
            "0 0 80px rgba(0,255,136,0.08), 0 0 40px rgba(0,212,255,0.06)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #00FF88, transparent)",
            transform: "translate(-30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #00D4FF, transparent)",
            transform: "translate(30%, 30%)",
          }}
        />

        <div className="relative px-8 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className="text-5xl"
              style={{ filter: "drop-shadow(0 0 20px rgba(0,255,136,0.80))" }}
            >
              🏅
            </span>
            <div>
              <h1
                className="text-4xl font-black tracking-tight leading-none"
                style={{
                  background:
                    "linear-gradient(90deg, #00FF88, #00D4FF, #FFD700)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 30px rgba(0,255,136,0.40))",
                }}
              >
                BADGE MANAGER
              </h1>
              <p className="text-sm font-bold text-zinc-400 mt-1">
                🔐 Developer Access Only — Assign &amp; Remove Player Badges
              </p>
            </div>
          </div>

          {/* Danger zone: reset all stats */}
          <div className="flex items-center gap-3">
            {resetConfirm ? (
              <>
                <p className="text-sm font-black text-red-400">
                  ⚠️ This resets ALL players. Are you sure?
                </p>
                <button
                  onClick={handleResetAllStats}
                  disabled={resetting}
                  className="rounded-xl border-2 border-red-500/60 bg-red-950/40 px-4 py-2 text-sm font-black text-red-300 hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {resetting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    "Yes, Reset All"
                  )}
                </button>
                <button
                  onClick={() => setResetConfirm(false)}
                  className="rounded-xl border-2 border-zinc-700/60 bg-zinc-900/30 px-4 py-2 text-sm font-black text-zinc-400 hover:bg-zinc-700/30 transition-all active:scale-95"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleResetAllStats}
                className="rounded-xl border-2 border-red-800/40 bg-red-950/20 px-4 py-2 text-sm font-black text-red-500 hover:bg-red-950/40 hover:border-red-600/60 hover:text-red-300 transition-all active:scale-95"
              >
                🗑️ Reset All Stats
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* ── Left: Search panel ── */}
        <div className="space-y-4">
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              border: "2px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.01)",
            }}
          >
            <div className="px-5 py-4 border-b border-white/8 bg-white/[0.02]">
              <h2 className="font-black text-sm text-white">🔍 Find Player</h2>
              <p className="text-[11px] text-zinc-500 font-bold mt-0.5">
                Search by name or Discord ID
              </p>
            </div>
            <div className="p-4">
              <PlayerSearch
                onSelect={handleSelectPlayer}
                selectedPlayerId={selectedPlayer?.user_id}
              />
            </div>
          </div>

          {/* Selected player summary (compact) */}
          {selectedPlayer && (
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{
                border: "1.5px solid rgba(0,212,255,0.30)",
                background: "rgba(0,212,255,0.04)",
              }}
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-black"
                style={{
                  background: "linear-gradient(135deg, #00FF88, #00D4FF)",
                }}
              >
                {selectedPlayer.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "??"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-cyan-300 truncate">
                  {selectedPlayer.name}
                </p>
                <p className="text-[10px] font-mono text-zinc-500 truncate">
                  {selectedPlayer.user_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="flex-shrink-0 text-zinc-500 hover:text-white transition text-sm font-black"
                aria-label="Deselect player"
              >
                ✕
              </button>
            </div>
          )}

          {/* Hint when no player selected */}
          {!selectedPlayer && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.01] px-5 py-8 text-center">
              <p className="text-3xl mb-2">👆</p>
              <p className="text-sm font-bold text-zinc-500">
                Search for a player above to view and edit their profile
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Player detail panel ── */}
        <div>
          {loading && (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" label="Loading player…" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-3xl border-2 border-red-500/40 bg-red-950/20 px-6 py-10 text-center">
              <p className="text-4xl mb-3">⚠️</p>
              <p className="text-base font-black text-red-400">{error}</p>
            </div>
          )}

          {!loading && !error && selectedPlayer && (
            <PlayerCard
              player={selectedPlayer}
              onPlayerChanged={handlePlayerChanged}
              onToast={setToast}
            />
          )}

          {!loading && !error && !selectedPlayer && (
            <div
              className="rounded-3xl flex flex-col items-center justify-center py-24 text-center"
              style={{
                border: "2px dashed rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.005)",
              }}
            >
              <p className="text-5xl mb-4">🏅</p>
              <p className="text-lg font-black text-zinc-500">
                No player selected
              </p>
              <p className="text-sm font-bold text-zinc-600 mt-1">
                Use the search panel to find and select a player
              </p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
