"use client";

/**
 * app/admin/components/BadgeManager.tsx
 *
 * Add / remove badges for a selected player.
 * Calls assignBadge / removeBadge server actions.
 * Notifies parent of success/error via onSuccess / onError callbacks.
 */

import { useState } from "react";
import { assignBadge, removeBadge, BADGE_OPTIONS } from "@/lib/admin/actions";

interface Props {
  userId: string;
  playerName: string;
  /** Current badge IDs held by the player */
  badges: string[];
  onSuccess: (msg: string, newBadges: string[]) => void;
  onError: (msg: string) => void;
}

export default function BadgeManager({
  userId,
  playerName,
  badges,
  onSuccess,
  onError,
}: Props) {
  const [acting, setActing] = useState<string | null>(null);

  async function handleAssign(badgeId: string) {
    if (acting) return;
    setActing(badgeId);
    try {
      const result = await assignBadge(userId, badgeId);
      if (result.success && result.data) {
        const badge = BADGE_OPTIONS.find((b) => b.id === badgeId);
        onSuccess(
          `${badge?.icon ?? ""} ${badge?.label ?? badgeId} assigned to ${playerName}`,
          result.data.badges
        );
      } else {
        onError(result.error ?? "Failed to assign badge.");
      }
    } catch {
      onError("An unexpected error occurred.");
    } finally {
      setActing(null);
    }
  }

  async function handleRemove(badgeId: string) {
    if (acting) return;
    setActing(badgeId);
    try {
      const result = await removeBadge(userId, badgeId);
      if (result.success && result.data) {
        const badge = BADGE_OPTIONS.find((b) => b.id === badgeId);
        onSuccess(
          `${badge?.icon ?? ""} ${badge?.label ?? badgeId} removed from ${playerName}`,
          result.data.badges
        );
      } else {
        onError(result.error ?? "Failed to remove badge.");
      }
    } catch {
      onError("An unexpected error occurred.");
    } finally {
      setActing(null);
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
      <div className="px-5 py-3.5 border-b border-white/8 bg-white/[0.02]">
        <p className="font-black text-sm text-zinc-300">🏅 Badge Manager</p>
        <p className="text-[11px] text-zinc-500 font-bold mt-0.5">
          {badges.length === 0
            ? "No badges assigned"
            : `${badges.length} badge${badges.length !== 1 ? "s" : ""} assigned`}
        </p>
      </div>

      {/* Badge list */}
      <div className="p-4 space-y-2">
        {BADGE_OPTIONS.map((badge) => {
          const has = badges.includes(badge.id);
          const isActing = acting === badge.id;

          return (
            <div
              key={badge.id}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all"
              style={{
                background: has
                  ? `linear-gradient(135deg, ${badge.color}12, ${badge.color}06)`
                  : "rgba(255,255,255,0.02)",
                border: has
                  ? `1.5px solid ${badge.color}40`
                  : "1.5px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Icon + label */}
              <span
                className="text-2xl flex-shrink-0"
                style={{
                  filter: has
                    ? `drop-shadow(0 0 8px ${badge.color}80)`
                    : "none",
                }}
              >
                {badge.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="font-black text-sm"
                  style={{ color: has ? badge.color : "#71717a" }}
                >
                  {badge.label}
                </p>
                <p className="text-[10px] text-zinc-600 font-bold">
                  {badge.description}
                </p>
              </div>

              {/* Action button */}
              {has ? (
                <button
                  onClick={() => handleRemove(badge.id)}
                  disabled={Boolean(acting)}
                  className="flex-shrink-0 rounded-xl border-2 border-red-700/50 bg-red-950/20 px-3 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 hover:border-red-400 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActing ? (
                    <span className="animate-spin inline-block">⟳</span>
                  ) : (
                    "✕ Remove"
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleAssign(badge.id)}
                  disabled={Boolean(acting)}
                  className="flex-shrink-0 rounded-xl border-2 border-cyan-700/50 bg-cyan-950/20 px-3 py-1.5 text-xs font-black text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActing ? (
                    <span className="animate-spin inline-block">⟳</span>
                  ) : (
                    "➕ Assign"
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
