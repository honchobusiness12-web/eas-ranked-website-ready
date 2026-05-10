"use client";

/**
 * app/admin/components/ResetTools.tsx
 *
 * Reset a single player's stats or all players' stats.
 * Requires double-confirmation for the nuclear "reset all" option.
 */

import { useState } from "react";
import { resetPlayerStats, resetAllStats, type AdminPlayer } from "@/lib/admin/actions";

interface Props {
  player: AdminPlayer;
  onPlayerReset: (msg: string, updated: AdminPlayer) => void;
  onAllReset: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function ResetTools({
  player,
  onPlayerReset,
  onAllReset,
  onError,
}: Props) {
  const [confirmPlayer, setConfirmPlayer] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmAllText, setConfirmAllText] = useState("");
  const [resettingPlayer, setResettingPlayer] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);

  async function handleResetPlayer() {
    if (resettingPlayer) return;
    setResettingPlayer(true);
    try {
      const result = await resetPlayerStats(player.user_id);
      if (result.success && result.data) {
        setConfirmPlayer(false);
        onPlayerReset(
          `✅ Stats reset to zero for ${player.name}`,
          result.data
        );
      } else {
        onError(result.error ?? "Failed to reset player stats.");
      }
    } catch {
      onError("An unexpected error occurred.");
    } finally {
      setResettingPlayer(false);
    }
  }

  async function handleResetAll() {
    if (resettingAll) return;
    if (confirmAllText !== "RESET ALL") {
      onError('Type "RESET ALL" to confirm.');
      return;
    }
    setResettingAll(true);
    try {
      const result = await resetAllStats();
      if (result.success && result.data) {
        setConfirmAll(false);
        setConfirmAllText("");
        onAllReset(
          `✅ All stats reset — ${result.data.affected} players affected`
        );
      } else {
        onError(result.error ?? "Failed to reset all stats.");
      }
    } catch {
      onError("An unexpected error occurred.");
    } finally {
      setResettingAll(false);
    }
  }

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        border: "2px solid rgba(239,68,68,0.20)",
        background: "linear-gradient(135deg, rgba(239,68,68,0.04), rgba(0,0,0,0.60))",
      }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-red-500/15 bg-red-950/10">
        <p className="font-black text-sm text-red-400">⚠️ Reset Tools</p>
        <p className="text-[11px] text-zinc-500 font-bold mt-0.5">
          Irreversible — use with caution
        </p>
      </div>

      <div className="p-4 space-y-3">
        {/* Reset single player */}
        {!confirmPlayer ? (
          <button
            onClick={() => setConfirmPlayer(true)}
            className="w-full rounded-2xl border-2 border-orange-700/50 bg-orange-950/20 px-4 py-3 text-sm font-black text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 transition-all active:scale-[0.98]"
          >
            🔄 Reset {player.name}&apos;s Stats
          </button>
        ) : (
          <div className="rounded-2xl border-2 border-orange-500/40 bg-orange-950/20 p-4 space-y-3">
            <p className="text-sm font-black text-orange-300 text-center">
              Reset all stats for{" "}
              <span className="text-white">{player.name}</span>?
            </p>
            <p className="text-xs text-zinc-500 font-bold text-center">
              CR, wins, losses, kills, matches, MVPs, and placements will be
              set to 0.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleResetPlayer}
                disabled={resettingPlayer}
                className="flex-1 rounded-xl border-2 border-orange-500/60 bg-orange-950/30 px-3 py-2 text-xs font-black text-orange-300 hover:bg-orange-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resettingPlayer ? (
                  <span className="animate-spin inline-block">⟳</span>
                ) : (
                  "✓ Confirm Reset"
                )}
              </button>
              <button
                onClick={() => setConfirmPlayer(false)}
                disabled={resettingPlayer}
                className="rounded-xl border-2 border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-zinc-400 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-red-500/10" />

        {/* Reset ALL players */}
        {!confirmAll ? (
          <button
            onClick={() => setConfirmAll(true)}
            className="w-full rounded-2xl border-2 border-red-700/50 bg-red-950/20 px-4 py-3 text-sm font-black text-red-400 hover:bg-red-500/20 hover:border-red-400 transition-all active:scale-[0.98]"
          >
            💣 Reset ALL Player Stats
          </button>
        ) : (
          <div className="rounded-2xl border-2 border-red-500/50 bg-red-950/20 p-4 space-y-3">
            <p className="text-sm font-black text-red-300 text-center">
              ⚠️ This will reset stats for EVERY player
            </p>
            <p className="text-xs text-zinc-500 font-bold text-center">
              Type <span className="text-red-400 font-black">RESET ALL</span>{" "}
              to confirm this irreversible action.
            </p>
            <input
              type="text"
              value={confirmAllText}
              onChange={(e) => setConfirmAllText(e.target.value)}
              placeholder="RESET ALL"
              className="w-full rounded-xl border border-red-500/40 bg-zinc-900/80 px-3 py-2 text-sm font-black text-red-300 placeholder-zinc-700 focus:border-red-400 focus:outline-none transition text-center tracking-widest"
            />
            <div className="flex gap-2">
              <button
                onClick={handleResetAll}
                disabled={
                  resettingAll || confirmAllText !== "RESET ALL"
                }
                className="flex-1 rounded-xl border-2 border-red-500/60 bg-red-950/30 px-3 py-2 text-xs font-black text-red-300 hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resettingAll ? (
                  <span className="animate-spin inline-block">⟳</span>
                ) : (
                  "💣 Reset Everything"
                )}
              </button>
              <button
                onClick={() => {
                  setConfirmAll(false);
                  setConfirmAllText("");
                }}
                disabled={resettingAll}
                className="rounded-xl border-2 border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-zinc-400 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
