"use client";

import { useState } from "react";
import { updatePlayerStats } from "@/lib/admin/actions";
import type { PlayerSearchResult, PlayerStats } from "@/lib/admin/actions";
import type { ToastMessage } from "@/components/admin/Toast";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

interface StatEditorProps {
  player: PlayerSearchResult;
  onStatsChanged: (updated: PlayerSearchResult) => void;
  onToast: (toast: ToastMessage) => void;
}

const STAT_FIELDS: Array<{
  key: keyof PlayerStats;
  label: string;
  icon: string;
}> = [
  { key: "cr", label: "CR", icon: "⚡" },
  { key: "wins", label: "Wins", icon: "🏆" },
  { key: "losses", label: "Losses", icon: "💀" },
  { key: "kills", label: "Kills", icon: "⚔️" },
  { key: "matches", label: "Matches", icon: "🎮" },
  { key: "mvp_count", label: "MVPs", icon: "🌟" },
  { key: "placement_matches", label: "Placements", icon: "📋" },
];

/**
 * Inline stat editor for a player.
 * Shows current values with editable inputs.
 * Saves only changed fields on submit.
 */
export default function StatEditor({
  player,
  onStatsChanged,
  onToast,
}: StatEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    cr: String(player.cr),
    wins: String(player.wins),
    losses: String(player.losses),
    kills: String(player.kills),
    matches: String(player.matches),
    mvp_count: String(player.mvp_count),
    placement_matches: String(player.placement_matches),
  });

  function handleEdit() {
    // Reset to current player values when opening editor
    setValues({
      cr: String(player.cr),
      wins: String(player.wins),
      losses: String(player.losses),
      kills: String(player.kills),
      matches: String(player.matches),
      mvp_count: String(player.mvp_count),
      placement_matches: String(player.placement_matches),
    });
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);

    // Build patch from only changed numeric values
    const patch: PlayerStats = {};
    for (const field of STAT_FIELDS) {
      const raw = values[field.key];
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 0) {
        patch[field.key] = num;
      }
    }

    if (Object.keys(patch).length === 0) {
      onToast({ type: "error", message: "No valid stat values to save" });
      setSaving(false);
      return;
    }

    try {
      const result = await updatePlayerStats(player.user_id, patch);

      if (result.success && result.data) {
        onStatsChanged(result.data);
        setEditing(false);
        onToast({
          type: "success",
          message: `Stats updated for ${player.name}`,
        });
      } else {
        onToast({
          type: "error",
          message: result.error ?? "Failed to update stats",
        });
      }
    } catch {
      onToast({ type: "error", message: "An unexpected error occurred" });
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        {/* Stat display grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STAT_FIELDS.map((field) => (
            <div
              key={field.key}
              className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {field.icon} {field.label}
              </p>
              <p className="text-lg font-black text-white mt-0.5">
                {player[field.key as keyof PlayerSearchResult] as number}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={handleEdit}
          className="rounded-xl border-2 border-zinc-700/60 bg-zinc-900/30 px-4 py-2 text-sm font-black text-zinc-300 hover:bg-zinc-700/30 hover:border-zinc-500 transition-all active:scale-95"
        >
          ✏️ Edit Stats
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Editable inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STAT_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">
              {field.icon} {field.label}
            </label>
            <input
              type="number"
              min="0"
              value={values[field.key]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              className="w-full rounded-xl border-2 border-white/15 bg-zinc-900 px-3 py-2 text-sm font-black text-white focus:border-cyan-400 focus:outline-none transition"
              disabled={saving}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-green-500/60 bg-green-950/30 px-4 py-2 text-sm font-black text-green-300 hover:bg-green-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <LoadingSpinner size="sm" /> : "💾 Save Stats"}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="rounded-xl border-2 border-zinc-700/60 bg-zinc-900/30 px-4 py-2 text-sm font-black text-zinc-400 hover:bg-zinc-700/30 transition-all active:scale-95 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
