"use client";

import { useState, useTransition } from "react";
import { updatePlayerStats } from "../_actions";
import type { PlayerDetail, PlayerStats } from "../_actions";

interface Props {
  player: PlayerDetail;
  onPlayerChange: (player: PlayerDetail) => void;
  onToast: (type: "success" | "error", message: string) => void;
  onClose: () => void;
}

type EditStats = {
  [K in keyof PlayerStats]: string;
};

const STAT_FIELDS: { key: keyof PlayerStats; label: string }[] = [
  { key: "cr", label: "CR" },
  { key: "wins", label: "Wins" },
  { key: "losses", label: "Losses" },
  { key: "kills", label: "Kills" },
  { key: "matches", label: "Matches" },
  { key: "mvp_count", label: "MVPs" },
  { key: "placement_matches", label: "Placements" },
];

export function StatEditor({ player, onPlayerChange, onToast, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [editStats, setEditStats] = useState<EditStats>({
    cr: String(player.cr),
    wins: String(player.wins),
    losses: String(player.losses),
    kills: String(player.kills),
    matches: String(player.matches),
    mvp_count: String(player.mvp_count),
    placement_matches: String(player.placement_matches),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const stats: Partial<PlayerStats> = {};
      for (const { key } of STAT_FIELDS) {
        const val = parseInt(editStats[key], 10);
        if (!isNaN(val) && val >= 0) {
          stats[key] = val;
        }
      }
      const result = await updatePlayerStats(player.user_id, stats);
      if (result.success && result.data) {
        onPlayerChange(result.data);
        onToast("success", "✅ Player stats updated successfully.");
        onClose();
      } else {
        onToast("error", result.error ?? "Failed to update stats.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-blue-700/30 bg-blue-950/10 p-4 space-y-3"
    >
      <p className="text-xs font-black uppercase tracking-wider text-blue-400">
        ✏️ Edit Stats
      </p>
      <div className="grid grid-cols-2 gap-2">
        {STAT_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-[10px] text-zinc-500 mb-1">
              {label}
            </label>
            <input
              type="number"
              min="0"
              value={editStats[key]}
              onChange={(e) =>
                setEditStats((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white focus:border-blue-600/60 focus:outline-none"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-xs font-black text-white hover:from-blue-500 hover:to-blue-400 transition disabled:opacity-50"
        >
          {isPending ? "Saving…" : "💾 Save Changes"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
