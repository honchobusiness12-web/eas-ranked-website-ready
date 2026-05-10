"use client";

import { useState, useTransition } from "react";
import { resetPlayerStats, resetAllStats } from "../_actions";
import type { PlayerDetail } from "../_actions";

interface Props {
  player: PlayerDetail;
  onPlayerChange: (player: PlayerDetail) => void;
  onToast: (type: "success" | "error", message: string) => void;
  onClose: () => void;
}

export function ResetTools({ player, onPlayerChange, onToast, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirmAll, setConfirmAll] = useState(false);

  function handleResetPlayer() {
    startTransition(async () => {
      const result = await resetPlayerStats(player.user_id);
      if (result.success && result.data) {
        onPlayerChange(result.data);
        onToast("success", "✅ Player stats reset to zero.");
        onClose();
      } else {
        onToast("error", result.error ?? "Failed to reset player stats.");
      }
    });
  }

  function handleResetAll() {
    startTransition(async () => {
      const result = await resetAllStats();
      if (result.success && result.data) {
        onToast(
          "success",
          `✅ All stats reset. ${result.data.count.toLocaleString()} players affected.`
        );
        setConfirmAll(false);
        onClose();
      } else {
        onToast("error", result.error ?? "Failed to reset all stats.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-orange-700/40 bg-orange-950/10 p-4 space-y-4">
      <p className="text-xs font-black uppercase tracking-wider text-orange-400">
        ⚠️ Reset Tools
      </p>

      {/* Reset single player */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-400">
          Reset <span className="font-bold text-white">{player.name}</span> — sets
          all stats to zero and marks as unranked. Cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleResetPlayer}
            disabled={isPending}
            className="flex-1 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 px-4 py-2 text-xs font-black text-white hover:from-orange-500 hover:to-red-500 transition disabled:opacity-50"
          >
            {isPending ? "Resetting…" : "🔄 Reset This Player"}
          </button>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Reset ALL players */}
      <div className="space-y-2">
        <p className="text-xs text-red-400 font-bold">
          ☢️ DANGER: Reset ALL players
        </p>
        <p className="text-xs text-zinc-500">
          Resets every player&apos;s stats to zero. This is irreversible and
          affects the entire database.
        </p>
        {!confirmAll ? (
          <button
            onClick={() => setConfirmAll(true)}
            disabled={isPending}
            className="w-full rounded-xl border border-red-700/60 bg-red-950/20 px-4 py-2 text-xs font-black text-red-400 hover:bg-red-950/40 transition disabled:opacity-50"
          >
            ☢️ Reset ALL Players
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-black text-red-300 text-center">
              Are you absolutely sure?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleResetAll}
                disabled={isPending}
                className="flex-1 rounded-xl bg-gradient-to-r from-red-700 to-red-600 px-4 py-2 text-xs font-black text-white hover:from-red-600 hover:to-red-500 transition disabled:opacity-50"
              >
                {isPending ? "Resetting…" : "☢️ YES, Reset All"}
              </button>
              <button
                onClick={() => setConfirmAll(false)}
                disabled={isPending}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
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
