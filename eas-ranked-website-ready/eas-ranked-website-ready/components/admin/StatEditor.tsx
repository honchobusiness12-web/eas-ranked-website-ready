"use client";

import { useState, useTransition } from "react";
import { editAllPlayerStats } from "@/lib/admin-actions";
import type { PlayerData } from "@/lib/admin-actions";

interface Props {
  player: PlayerData;
  onPlayerChange: (player: PlayerData) => void;
  onToast: (type: "success" | "error", text: string) => void;
}

const STAT_FIELDS = [
  { key: "cr",                label: "CR",           color: "text-orange-400" },
  { key: "wins",              label: "Wins",         color: "text-green-400" },
  { key: "losses",            label: "Losses",       color: "text-red-400" },
  { key: "kills",             label: "Kills",        color: "text-yellow-400" },
  { key: "matches",           label: "Matches",      color: "text-white" },
  { key: "mvp_count",         label: "MVPs",         color: "text-purple-400" },
  { key: "placement_matches", label: "Placements",   color: "text-blue-400" },
] as const;

type StatKey = (typeof STAT_FIELDS)[number]["key"];

export default function StatEditor({ player, onPlayerChange, onToast }: Props) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<StatKey, string>>({
    cr:                String(player.cr),
    wins:              String(player.wins),
    losses:            String(player.losses),
    kills:             String(player.kills),
    matches:           String(player.matches),
    mvp_count:         String(player.mvp_count),
    placement_matches: String(player.placement_matches),
  });
  const [isPending, startTransition] = useTransition();

  // Sync values when player changes externally
  function resetValues(p: PlayerData) {
    setValues({
      cr:                String(p.cr),
      wins:              String(p.wins),
      losses:            String(p.losses),
      kills:             String(p.kills),
      matches:           String(p.matches),
      mvp_count:         String(p.mvp_count),
      placement_matches: String(p.placement_matches),
    });
  }

  function handleOpen() {
    resetValues(player);
    setOpen(true);
  }

  function handleCancel() {
    setOpen(false);
    resetValues(player);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const stats = {
      cr:                parseInt(values.cr, 10),
      wins:              parseInt(values.wins, 10),
      losses:            parseInt(values.losses, 10),
      kills:             parseInt(values.kills, 10),
      matches:           parseInt(values.matches, 10),
      mvp_count:         parseInt(values.mvp_count, 10),
      placement_matches: parseInt(values.placement_matches, 10),
    };

    for (const [key, val] of Object.entries(stats)) {
      if (isNaN(val) || val < 0) {
        onToast("error", `Invalid value for ${key}: must be a non-negative number`);
        return;
      }
    }

    startTransition(async () => {
      const res = await editAllPlayerStats(player.user_id, stats);
      if (res.success && res.data) {
        onPlayerChange(res.data);
        resetValues(res.data);
        setOpen(false);
        onToast("success", "✅ Player stats updated successfully");
      } else {
        onToast("error", res.error ?? "Failed to update stats");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
          ✏️ Edit Stats
        </p>
        {!open && (
          <button
            onClick={handleOpen}
            className="rounded-lg border border-blue-700/30 bg-blue-950/10 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-950/20 transition"
          >
            Edit
          </button>
        )}
      </div>

      {!open ? (
        <div className="grid grid-cols-2 gap-2">
          {STAT_FIELDS.map(({ key, label, color }) => (
            <div key={key} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
              <p className={`text-base font-black ${color}`}>
                {player[key as keyof PlayerData]?.toLocaleString?.() ?? "0"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {STAT_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-[10px] text-zinc-500 mb-1">{label}</label>
                <input
                  type="number"
                  min="0"
                  value={values[key]}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
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
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
