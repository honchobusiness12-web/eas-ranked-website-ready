"use client";

import { useState, useTransition } from "react";
import { assignBadge, removeBadge } from "../_actions";
import type { BadgeInfo } from "../_actions";

const BADGE_OPTIONS = [
  {
    id: "staff",
    label: "Staff",
    icon: "👮",
    color: "#00FF88",
    description: "EAS Ranked Staff Member",
  },
  {
    id: "contentCreator",
    label: "Content Creator",
    icon: "🎬",
    color: "#00D4FF",
    description: "Verified Content Creator",
  },
  {
    id: "tournamentWinner",
    label: "Tournament Winner",
    icon: "🏆",
    color: "#FFD700",
    description: "Tournament Champion",
  },
] as const;

interface Props {
  userId: string;
  badges: BadgeInfo[];
  onBadgesChange: (badges: BadgeInfo[]) => void;
  onToast: (type: "success" | "error", message: string) => void;
}

export function BadgeManager({
  userId,
  badges,
  onBadgesChange,
  onToast,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [actingOn, setActingOn] = useState<string | null>(null);

  const currentIds = new Set(badges.map((b) => b.id));

  function handleAssign(badgeId: string) {
    setActingOn(badgeId);
    startTransition(async () => {
      const result = await assignBadge(userId, badgeId);
      if (result.success && result.data) {
        onBadgesChange(result.data);
        const opt = BADGE_OPTIONS.find((b) => b.id === badgeId);
        onToast(
          "success",
          `✅ ${opt?.icon ?? ""} ${opt?.label ?? badgeId} assigned successfully.`
        );
      } else {
        onToast("error", result.error ?? "Failed to assign badge.");
      }
      setActingOn(null);
    });
  }

  function handleRemove(badgeId: string) {
    setActingOn(badgeId);
    startTransition(async () => {
      const result = await removeBadge(userId, badgeId);
      if (result.success && result.data) {
        onBadgesChange(result.data);
        const opt = BADGE_OPTIONS.find((b) => b.id === badgeId);
        onToast(
          "success",
          `✅ ${opt?.icon ?? ""} ${opt?.label ?? badgeId} removed successfully.`
        );
      } else {
        onToast("error", result.error ?? "Failed to remove badge.");
      }
      setActingOn(null);
    });
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
        🏅 Badges
      </p>

      {/* Current badges */}
      {badges.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {badges
            .filter((b) =>
              ["staff", "contentCreator", "tournamentWinner"].includes(b.id)
            )
            .map((badge) => (
              <span
                key={badge.id}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-zinc-300"
                style={{ borderColor: `${badge.color}40`, color: badge.color }}
              >
                {badge.icon} {badge.label}
              </span>
            ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">No badges assigned.</p>
      )}

      {/* Badge controls */}
      <div className="grid grid-cols-1 gap-1.5">
        {BADGE_OPTIONS.map((opt) => {
          const hasBadge = currentIds.has(opt.id);
          const isActioning = actingOn === opt.id && isPending;
          return (
            <div
              key={opt.id}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-xs text-zinc-400">
                {opt.icon} {opt.label}
              </span>
              <button
                onClick={() =>
                  hasBadge ? handleRemove(opt.id) : handleAssign(opt.id)
                }
                disabled={isActioning || isPending}
                className={`rounded-lg px-3 py-1 text-[11px] font-black transition disabled:opacity-50 ${
                  hasBadge
                    ? "border border-red-700/40 bg-red-950/20 text-red-300 hover:bg-red-950/40"
                    : "border border-green-700/40 bg-green-950/20 text-green-300 hover:bg-green-950/40"
                }`}
              >
                {isActioning ? "…" : hasBadge ? "Remove" : "Assign"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
