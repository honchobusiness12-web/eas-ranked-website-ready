"use client";

import { useState, useTransition } from "react";
import { resetPlayerStats, resetAllPlayers, getPlayer } from "@/lib/admin-actions";
import type { PlayerData } from "@/lib/admin-actions";

interface Props {
  player: PlayerData;
  onPlayerChange: (player: PlayerData) => void;
  onToast: (type: "success" | "error", text: string) => void;
}

export default function ResetTools({ player, onPlayerChange, onToast }: Props) {
  const [confirmPlayer, setConfirmPlayer] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleResetPlayer() {
    startTransition(async () => {
      const res = await resetPlayerStats(player.user_id);
      if (res.success && res.data) {
        onPlayerChange(res.data);
        setConfirmPlayer(false);
        onToast("success", "🔄 Player stats reset to zero");
      } else {
        onToast("error", res.error ?? "Failed to reset player");
      }
    });
  }

  function handleResetAll() {
    startTransition(async () => {
      const res = await resetAllPlayers();
      if (res.success && res.data) {
        setConfirmAll(false);
        onToast(
          "success",
          `🔄 All players reset (${res.data.count.toLocaleString()} affected)`
        );
        // Refresh current player data (stats are now zeroed)
        const refreshRes = await getPlayer(player.user_id);
        if (refreshRes.success && refreshRes.data) {
          onPlayerChange(refreshRes.data);
        }
      } else {
        onToast("error", res.error ?? "Failed to reset all players");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-4">
      <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
        🔄 Reset Tools
      </p>

      {/* Reset single player */}
      {!confirmPlayer ? (
        <button
          onClick={() => { setConfirmPlayer(true); setConfirmAll(false); }}
          disabled={isPending}
          className="w-full rounded-xl border border-orange-700/30 bg-orange-950/10 px-4 py-2.5 text-sm font-black text-orange-300 hover:bg-orange-950/20 transition disabled:opacity-50"
        >
          🔄 Reset This Player's Stats
        </button>
      ) : (
        <div className="rounded-xl border border-orange-700/40 bg-orange-950/20 p-4 space-y-3">
          <p className="text-xs font-black text-orange-400">⚠️ Confirm Reset Player</p>
          <p className="text-xs text-zinc-400">
            This will zero out all stats for <strong className="text-white">{player.name}</strong> and mark them as unranked. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleResetPlayer}
              disabled={isPending}
              className="flex-1 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 px-4 py-2 text-xs font-black text-white hover:from-orange-500 hover:to-red-500 transition disabled:opacity-50"
            >
              {isPending ? "Resetting…" : "✅ Confirm Reset"}
            </button>
            <button
              onClick={() => setConfirmPlayer(false)}
              disabled={isPending}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reset ALL players */}
      {!confirmAll ? (
        <button
          onClick={() => { setConfirmAll(true); setConfirmPlayer(false); }}
          disabled={isPending}
          className="w-full rounded-xl border border-red-700/40 bg-red-950/20 px-4 py-2.5 text-sm font-black text-red-300 hover:bg-red-950/40 transition disabled:opacity-50"
        >
          ☢️ Reset ALL Players
        </button>
      ) : (
        <div className="rounded-xl border border-red-700/50 bg-red-950/30 p-4 space-y-3">
          <p className="text-xs font-black text-red-400">☢️ DANGER: Reset ALL Players</p>
          <p className="text-xs text-zinc-400">
            This will zero out stats for <strong className="text-white">every player</strong> in the database. This is irreversible and should only be used for a new season.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleResetAll}
              disabled={isPending}
              className="flex-1 rounded-xl bg-gradient-to-r from-red-700 to-red-600 px-4 py-2 text-xs font-black text-white hover:from-red-600 hover:to-red-500 transition disabled:opacity-50"
            >
              {isPending ? "Resetting…" : "☢️ Confirm Reset ALL"}
            </button>
            <button
              onClick={() => setConfirmAll(false)}
              disabled={isPending}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
