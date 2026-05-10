"use client";

import { useState } from "react";
import { assignBadge, removeBadge, searchPlayers } from "@/lib/admin/actions";
import type { PlayerSearchResult } from "@/lib/admin/actions";
import type { ToastMessage } from "@/components/admin/Toast";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

// ---------------------------------------------------------------------------
// Badge definitions
// ---------------------------------------------------------------------------

const BADGE_OPTIONS = [
  {
    id: "staff",
    label: "Staff",
    icon: "👮",
    color: "#00FF88",
    hoverBg: "hover:bg-green-500/20",
  },
  {
    id: "contentCreator",
    label: "Content Creator",
    icon: "🎬",
    color: "#00D4FF",
    hoverBg: "hover:bg-cyan-500/20",
  },
  {
    id: "tournamentWinner",
    label: "Tournament Winner",
    icon: "🏆",
    color: "#FFD700",
    hoverBg: "hover:bg-yellow-500/20",
  },
] as const;

type BadgeId = (typeof BADGE_OPTIONS)[number]["id"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BadgeManagerProps {
  player: PlayerSearchResult;
  onBadgesChanged: (updatedBadges: PlayerSearchResult["badges"]) => void;
  onToast: (toast: ToastMessage) => void;
}

/**
 * Displays the player's current badges with remove buttons,
 * and an "Add Badge" section for assigning new ones.
 * All mutations wait for the server response before updating state.
 */
export default function BadgeManager({
  player,
  onBadgesChanged,
  onToast,
}: BadgeManagerProps) {
  const [removingBadge, setRemovingBadge] = useState<string | null>(null);
  const [assigningBadge, setAssigningBadge] = useState<string | null>(null);

  const currentBadgeIds = new Set(player.badges.map((b) => b.id));

  // Badges that can be assigned (staff, contentCreator, tournamentWinner only)
  const assignableBadges = BADGE_OPTIONS.filter(
    (b) => !currentBadgeIds.has(b.id)
  );

  // ---------------------------------------------------------------------------
  // Remove badge
  // ---------------------------------------------------------------------------

  async function handleRemove(badgeId: string) {
    if (removingBadge) return;
    setRemovingBadge(badgeId);
    try {
      const result = await removeBadge(player.user_id, badgeId);

      if (result.success && result.data) {
        onBadgesChanged(result.data.badges);
        const badge = BADGE_OPTIONS.find((b) => b.id === badgeId);
        onToast({
          type: "success",
          message: `${badge?.icon ?? ""} ${badge?.label ?? badgeId} removed from ${player.name}`,
        });
      } else {
        onToast({
          type: "error",
          message: result.error ?? "Failed to remove badge",
        });
        // Reload player from server to ensure UI is consistent
        await reloadPlayer();
      }
    } catch {
      onToast({ type: "error", message: "An unexpected error occurred" });
      await reloadPlayer();
    } finally {
      setRemovingBadge(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Assign badge
  // ---------------------------------------------------------------------------

  async function handleAssign(badgeId: BadgeId) {
    if (assigningBadge) return;
    setAssigningBadge(badgeId);
    try {
      const result = await assignBadge(player.user_id, badgeId);

      if (result.success && result.data) {
        onBadgesChanged(result.data.badges);
        const badge = BADGE_OPTIONS.find((b) => b.id === badgeId);
        onToast({
          type: "success",
          message: `${badge?.icon ?? ""} ${badge?.label ?? badgeId} assigned to ${player.name}`,
        });
      } else {
        onToast({
          type: "error",
          message: result.error ?? "Failed to assign badge",
        });
        await reloadPlayer();
      }
    } catch {
      onToast({ type: "error", message: "An unexpected error occurred" });
      await reloadPlayer();
    } finally {
      setAssigningBadge(null);
    }
  }

  // Reload the player's badges from the server to recover from any error state
  async function reloadPlayer() {
    try {
      const result = await searchPlayers(player.user_id);
      const fresh = result.data?.[0];
      if (fresh) {
        onBadgesChanged(fresh.badges);
      }
    } catch {
      // Best-effort reload — ignore failures
    }
  }

  return (
    <div className="space-y-4">
      {/* Current badges */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
          Current Badges
        </p>
        {player.badges.length === 0 ? (
          <p className="text-sm font-bold text-zinc-600">No badges assigned</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {player.badges.map((badge) => {
              const isRemoving = removingBadge === badge.id;
              const isAssignable = BADGE_OPTIONS.some((b) => b.id === badge.id);
              return (
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
                  {/* Only show remove button for admin-assignable badges */}
                  {isAssignable && (
                    <button
                      onClick={() => handleRemove(badge.id)}
                      disabled={Boolean(removingBadge)}
                      className="ml-0.5 opacity-50 hover:opacity-100 transition text-xs leading-none disabled:cursor-not-allowed"
                      title={`Remove ${badge.label}`}
                      aria-label={`Remove ${badge.label} badge`}
                    >
                      {isRemoving ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        "✕"
                      )}
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Add badge section */}
      {assignableBadges.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
            Add Badge
          </p>
          <div className="flex flex-wrap gap-2">
            {assignableBadges.map((badge) => {
              const isAssigning = assigningBadge === badge.id;
              return (
                <button
                  key={badge.id}
                  onClick={() => handleAssign(badge.id)}
                  disabled={Boolean(assigningBadge)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black border-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${badge.hoverBg}`}
                  style={{
                    background: `${badge.color}10`,
                    border: `1.5px solid ${badge.color}40`,
                    color: badge.color,
                  }}
                >
                  {isAssigning ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <span>{badge.icon}</span>
                      <span>+ {badge.label}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {assignableBadges.length === 0 && player.badges.length > 0 && (
        <p className="text-xs font-bold text-zinc-600">
          All assignable badges have been granted
        </p>
      )}
    </div>
  );
}
