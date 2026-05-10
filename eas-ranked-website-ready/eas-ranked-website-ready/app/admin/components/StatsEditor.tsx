"use client";

import { useState } from "react";
import { editStats, resetPlayer, type PlayerResult, type StatsPayload } from "@/app/admin/actions";
import type { ToastMessage } from "./Toast";

interface StatsEditorProps {
  player: PlayerResult;
  onPlayerChange: (player: PlayerResult) => void;
  onToast: (msg: ToastMessage) => void;
}

const STAT_FIELDS: Array<{
  key: keyof StatsPayload;
  label: string;
  icon: string;
}> = [
  { key: "cr",                label: "CR",                icon: "⚡" },
  { key: "wins",              label: "Wins",              icon: "✅" },
  { key: "losses",            label: "Losses",            icon: "❌" },
  { key: "kills",             label: "Kills",             icon: "🎯" },
  { key: "matches",           label: "Matches",           icon: "🎮" },
  { key: "mvp_count",         label: "MVP Count",         icon: "🏅" },
  { key: "placement_matches", label: "Placement Matches", icon: "📋" },
];

export default function StatsEditor({ player, onPlayerChange, onToast }: StatsEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const [form, setForm] = useState<Record<string, string>>({
    cr:                String(player.cr),
    wins:              String(player.wins),
    losses:            String(player.losses),
    kills:             String(player.kills),
    matches:           String(player.matches),
    mvp_count:         String(player.mvp_count),
    placement_matches: String(player.placement_matches),
  });

  function handleEdit() {
    setForm({
      cr:                String(player.cr),
      wins:              String(player.wins),
      losses:            String(player.losses),
      kills:             String(player.kills),
      matches:           String(player.matches),
      mvp_count:         String(player.mvp_count),
      placement_matches: String(player.placement_matches),
    });
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const stats: StatsPayload = {};
      for (const field of STAT_FIELDS) {
        const val = parseInt(form[field.key] ?? "", 10);
        if (!isNaN(val)) stats[field.key] = val;
      }

      const result = await editStats(player.user_id, stats);
      if (result.success) {
        // Merge updated stats into the player object
        const updated: PlayerResult = {
          ...player,
          cr:                stats.cr              ?? player.cr,
          wins:              stats.wins            ?? player.wins,
          losses:            stats.losses          ?? player.losses,
          kills:             stats.kills           ?? player.kills,
          matches:           stats.matches         ?? player.matches,
          mvp_count:         stats.mvp_count       ?? player.mvp_count,
          placement_matches: stats.placement_matches ?? player.placement_matches,
        };
        onPlayerChange(updated);
        setEditing(false);
        onToast({ type: "success", text: "✅ Player stats updated successfully" });
      } else {
        onToast({ type: "error", text: result.error ?? "Failed to update stats" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const result = await resetPlayer(player.user_id);
      if (result.success) {
        const zeroed: PlayerResult = {
          ...player,
          cr: 0, wins: 0, losses: 0, kills: 0,
          matches: 0, mvp_count: 0, placement_matches: 0,
          ranked: false,
        };
        onPlayerChange(zeroed);
        setConfirmReset(false);
        setEditing(false);
        onToast({ type: "success", text: "✅ Player stats reset to zero" });
      } else {
        onToast({ type: "error", text: result.error ?? "Failed to reset player" });
      }
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Stats</p>
        {!editing && (
          <button
            onClick={handleEdit}
            className="rounded-lg border border-cyan-700/40 bg-cyan-950/20 px-3 py-1 text-xs font-black text-cyan-400 hover:bg-cyan-950/40 transition"
          >
            ✏️ Edit
          </button>
        )}
      </div>

      {/* View mode */}
      {!editing && (
        <div className="grid grid-cols-2 gap-2">
          {STAT_FIELDS.map(({ key, label, icon }) => (
            <div
              key={key}
              className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5"
            >
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">
                {icon} {label}
              </p>
              <p className="text-sm font-black text-white mt-0.5">
                {(player[key as keyof PlayerResult] as number ?? 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <form onSubmit={handleSave} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {STAT_FIELDS.map(({ key, label, icon }) => (
              <div key={key}>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1">
                  {icon} {label}
                </label>
                <input
                  type="number"
                  min="0"
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-cyan-600/50 focus:outline-none"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl border border-green-700/40 bg-green-950/20 py-2.5 text-sm font-black text-green-400 hover:bg-green-950/40 transition disabled:opacity-50"
            >
              {saving ? "⟳ Saving…" : "✅ Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-zinc-400 hover:bg-white/10 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reset section */}
      <div className="pt-2 border-t border-white/5">
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full rounded-xl border border-red-900/40 bg-red-950/10 py-2 text-xs font-black text-red-500 hover:bg-red-950/30 hover:text-red-400 transition"
          >
            🗑️ Reset All Stats to Zero
          </button>
        ) : (
          <div className="rounded-xl border border-red-700/40 bg-red-950/20 p-3 space-y-2">
            <p className="text-xs font-black text-red-400 text-center">
              ⚠️ This will zero all stats. Are you sure?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 rounded-lg border border-red-700/40 bg-red-950/40 py-2 text-xs font-black text-red-300 hover:bg-red-900/40 transition disabled:opacity-50"
              >
                {resetting ? "⟳ Resetting…" : "Yes, Reset"}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-black text-zinc-400 hover:bg-white/10 transition disabled:opacity-50"
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
