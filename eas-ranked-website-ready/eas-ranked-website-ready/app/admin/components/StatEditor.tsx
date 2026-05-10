"use client";

/**
 * app/admin/components/StatEditor.tsx
 *
 * Edit player stats (CR, wins, losses, kills, matches, mvp_count, placement_matches).
 * Calls editPlayerStats server action.
 */

import { useState } from "react";
import { editPlayerStats, type AdminPlayer } from "@/lib/admin/actions";

interface Props {
  player: AdminPlayer;
  onSuccess: (msg: string, updated: AdminPlayer) => void;
  onError: (msg: string) => void;
}

type StatKey =
  | "cr"
  | "wins"
  | "losses"
  | "kills"
  | "matches"
  | "mvp_count"
  | "placement_matches";

const STAT_FIELDS: { key: StatKey; label: string; min: number; max: number }[] =
  [
    { key: "cr", label: "CR", min: 0, max: 9999 },
    { key: "wins", label: "Wins", min: 0, max: 99999 },
    { key: "losses", label: "Losses", min: 0, max: 99999 },
    { key: "kills", label: "Kills", min: 0, max: 999999 },
    { key: "matches", label: "Matches", min: 0, max: 99999 },
    { key: "mvp_count", label: "MVPs", min: 0, max: 99999 },
    { key: "placement_matches", label: "Placements", min: 0, max: 99 },
  ];

export default function StatEditor({ player, onSuccess, onError }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<StatKey, string>>({
    cr: String(player.cr),
    wins: String(player.wins),
    losses: String(player.losses),
    kills: String(player.kills),
    matches: String(player.matches),
    mvp_count: String(player.mvp_count),
    placement_matches: String(player.placement_matches),
  });

  // Reset form values when player changes
  function resetToPlayer() {
    setValues({
      cr: String(player.cr),
      wins: String(player.wins),
      losses: String(player.losses),
      kills: String(player.kills),
      matches: String(player.matches),
      mvp_count: String(player.mvp_count),
      placement_matches: String(player.placement_matches),
    });
  }

  function handleOpen() {
    resetToPlayer();
    setOpen(true);
  }

  function handleCancel() {
    setOpen(false);
    resetToPlayer();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const stats: Partial<Record<StatKey, number>> = {};
    for (const field of STAT_FIELDS) {
      const raw = values[field.key];
      const parsed = parseInt(raw, 10);
      if (isNaN(parsed)) {
        onError(`${field.label} must be a valid number.`);
        return;
      }
      if (parsed < field.min || parsed > field.max) {
        onError(
          `${field.label} must be between ${field.min} and ${field.max}.`
        );
        return;
      }
      stats[field.key] = parsed;
    }

    setSaving(true);
    try {
      const result = await editPlayerStats(player.user_id, stats);
      if (result.success && result.data) {
        setOpen(false);
        onSuccess("✅ Player stats updated successfully.", result.data);
      } else {
        onError(result.error ?? "Failed to update stats.");
      }
    } catch {
      onError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        border: "2px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.01)",
      }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/8 bg-white/[0.02] flex items-center justify-between">
        <div>
          <p className="font-black text-sm text-zinc-300">📊 Stat Editor</p>
          <p className="text-[11px] text-zinc-500 font-bold mt-0.5">
            Edit CR, wins, losses, and more
          </p>
        </div>
        {!open && (
          <button
            onClick={handleOpen}
            className="rounded-xl border-2 border-cyan-700/50 bg-cyan-950/20 px-3 py-1.5 text-xs font-black text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all active:scale-95"
          >
            ✏️ Edit
          </button>
        )}
      </div>

      {/* Collapsed view */}
      {!open && (
        <div className="p-4 grid grid-cols-4 gap-2">
          {STAT_FIELDS.map((f) => (
            <div
              key={f.key}
              className="rounded-xl border border-white/6 bg-white/[0.02] px-2 py-2 text-center"
            >
              <p className="text-sm font-black text-white">
                {player[f.key].toLocaleString()}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mt-0.5">
                {f.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Edit form */}
      {open && (
        <form onSubmit={handleSave} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {STAT_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">
                  {field.label}
                </label>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={values[field.key]}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm font-bold text-white placeholder-zinc-600 focus:border-cyan-500/60 focus:outline-none transition"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-2xl border-2 border-green-700/50 bg-green-950/20 px-4 py-2.5 text-sm font-black text-green-300 hover:bg-green-500/20 hover:border-green-400 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="animate-spin inline-block">⟳</span>
              ) : (
                "💾 Save Changes"
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-2xl border-2 border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-zinc-400 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
