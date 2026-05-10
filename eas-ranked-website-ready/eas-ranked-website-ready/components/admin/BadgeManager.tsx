"use client";

import { useState, useTransition } from "react";
import { assignBadge, removeBadge } from "@/lib/admin-actions";
import type { BadgeData } from "@/lib/admin-actions";

const BADGE_OPTIONS = [
  { id: "staff",            label: "Staff",            icon: "👮" },
  { id: "contentCreator",   label: "Content Creator",  icon: "🎬" },
  { id: "tournamentWinner", label: "Tournament Winner", icon: "🏆" },
] as const;

interface Props {
  userId: string;
  badges: BadgeData[];
  onBadgesChange: (badges: BadgeData[]) => void;
  onToast: (type: "success" | "error", text: string) => void;
}

export default function BadgeManager({
  userId,
  badges,
  onBadgesChange,
  onToast,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [actioning, setActioning] = useState<string | null>(null);

  function handleBadgeAction(badgeId: string, action: "assign" | "remove") {
    setActioning(badgeId);
    startTransition(async () => {
      const res =
        action === "assign"
          ? await assignBadge(userId, badgeId)
          : await removeBadge(userId, badgeId);

      if (res.success && res.data) {
        onBadgesChange(res.data);
        const opt = BADGE_OPTIONS.find((b) => b.id === badgeId);
        onToast(
          "success",
          `${opt?.icon ?? ""} ${opt?.label ?? badgeId} ${
            action === "assign" ? "assigned" : "removed"
          } successfully`
        );
      } else {
        onToast("error", res.error ?? "Badge action failed");
      }
      setActioning(null);
    });
  }

  const badgeIds = new Set(badges.map((b) => b.id));

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-4">
      <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
        🏅 Badge Manager
      </p>

      {/* Current badges */}
      {badges.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <span
              key={b.id}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-zinc-300"
            >
              {b.icon} {b.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">No badges assigned.</p>
      )}

      {/* Badge controls */}
      <div className="space-y-2">
        {BADGE_OPTIONS.map((opt) => {
          const has = badgeIds.has(opt.id);
          const isActioning = actioning === opt.id && isPending;
          return (
            <div key={opt.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-300">
                {opt.icon} {opt.label}
              </span>
              <button
                onClick={() => handleBadgeAction(opt.id, has ? "remove" : "assign")}
                disabled={isPending}
                className={`rounded-lg px-4 py-1.5 text-xs font-black transition disabled:opacity-50 ${
                  has
                    ? "border border-red-700/40 bg-red-950/20 text-red-300 hover:bg-red-950/40"
                    : "border border-green-700/40 bg-green-950/20 text-green-300 hover:bg-green-950/40"
                }`}
              >
                {isActioning ? "…" : has ? "Remove" : "Assign"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
