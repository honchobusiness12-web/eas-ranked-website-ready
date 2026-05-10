"use client";

import { useState } from "react";
import { assignBadge, removeBadge, type BadgeInfo } from "@/app/admin/actions";
import type { ToastMessage } from "./Toast";

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

interface BadgeManagerProps {
  userId: string;
  badges: BadgeInfo[];
  onBadgesChange: (badges: BadgeInfo[]) => void;
  onToast: (msg: ToastMessage) => void;
}

export default function BadgeManager({
  userId,
  badges,
  onBadgesChange,
  onToast,
}: BadgeManagerProps) {
  const [acting, setActing] = useState<string | null>(null);

  const currentIds = new Set(badges.map((b) => b.id));

  async function handleAssign(badgeId: string) {
    if (acting) return;
    setActing(badgeId);
    try {
      const result = await assignBadge(userId, badgeId);
      if (result.success) {
        onBadgesChange(result.badges);
        const opt = BADGE_OPTIONS.find((b) => b.id === badgeId);
        onToast({
          type: "success",
          text: `${opt?.icon ?? ""} ${opt?.label ?? badgeId} badge assigned successfully`,
        });
      } else {
        onToast({ type: "error", text: result.error ?? "Failed to assign badge" });
      }
    } finally {
      setActing(null);
    }
  }

  async function handleRemove(badgeId: string) {
    if (acting) return;
    setActing(badgeId);
    try {
      const result = await removeBadge(userId, badgeId);
      if (result.success) {
        onBadgesChange(result.badges);
        const opt = BADGE_OPTIONS.find((b) => b.id === badgeId);
        onToast({
          type: "success",
          text: `${opt?.icon ?? ""} ${opt?.label ?? badgeId} badge removed`,
        });
      } else {
        onToast({ type: "error", text: result.error ?? "Failed to remove badge" });
      }
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Badges</p>

      {/* Current badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {badges
            .filter((b) => ["staff", "contentCreator", "tournamentWinner"].includes(b.id))
            .map((badge) => (
              <span
                key={badge.id}
                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-black shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${badge.color}33, ${badge.color}18)`,
                  border: `1.5px solid ${badge.color}80`,
                  color: badge.color,
                }}
                title={badge.description}
              >
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </span>
            ))}
        </div>
      )}

      {/* Badge action buttons */}
      <div className="space-y-2">
        {BADGE_OPTIONS.map((opt) => {
          const has = currentIds.has(opt.id);
          const isActing = acting === opt.id;

          return (
            <div
              key={opt.id}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="text-lg"
                  style={{ filter: has ? `drop-shadow(0 0 6px ${opt.color}80)` : "none" }}
                >
                  {opt.icon}
                </span>
                <div>
                  <p
                    className="text-sm font-black"
                    style={{ color: has ? opt.color : "#71717a" }}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-zinc-600">{opt.description}</p>
                </div>
              </div>

              {has ? (
                <button
                  onClick={() => handleRemove(opt.id)}
                  disabled={!!acting}
                  className="rounded-lg border border-red-700/40 bg-red-950/20 px-3 py-1.5 text-xs font-black text-red-400 hover:bg-red-950/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActing ? "⟳" : "Remove"}
                </button>
              ) : (
                <button
                  onClick={() => handleAssign(opt.id)}
                  disabled={!!acting}
                  className="rounded-lg border border-cyan-700/40 bg-cyan-950/20 px-3 py-1.5 text-xs font-black text-cyan-400 hover:bg-cyan-950/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActing ? "⟳" : "Assign"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
