"use client";

import { useState, useRef, useEffect } from "react";
import { BadgePill, BADGE_DEFINITIONS } from "@/components/admin/BadgePill";
import type { PlayerResult } from "@/lib/admin/actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ASSIGNABLE_BADGES = [
  BADGE_DEFINITIONS.staff,
  BADGE_DEFINITIONS.contentCreator,
  BADGE_DEFINITIONS.tournamentWinner,
];

// ---------------------------------------------------------------------------
// PlayerInitials — avatar fallback
// ---------------------------------------------------------------------------

function PlayerInitials({ name }: { name: string | null }) {
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <div
      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-black select-none"
      style={{ background: "linear-gradient(135deg, #00FF88, #00D4FF)" }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddBadgeMenu — dropdown for assigning a badge
// ---------------------------------------------------------------------------

interface AddBadgeMenuProps {
  currentBadgeIds: string[];
  onAssign: (badgeId: string) => Promise<void>;
  onClose: () => void;
}

function AddBadgeMenu({ currentBadgeIds, onAssign, onClose }: AddBadgeMenuProps) {
  const [assigning, setAssigning] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  async function handleClick(badgeId: string) {
    if (assigning) return;
    setAssigning(badgeId);
    try {
      await onAssign(badgeId);
    } finally {
      setAssigning(null);
      onClose();
    }
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-40 rounded-2xl border-2 border-white/15 bg-zinc-900 shadow-[0_8px_40px_rgba(0,0,0,0.60)] overflow-hidden min-w-[220px]"
    >
      <p className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/8">
        Assign Badge
      </p>
      {ASSIGNABLE_BADGES.map((badge) => {
        const alreadyHas = currentBadgeIds.includes(badge.id);
        const isAssigning = assigning === badge.id;

        return (
          <button
            key={badge.id}
            onClick={() => !alreadyHas && handleClick(badge.id)}
            disabled={alreadyHas || Boolean(assigning)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-white/5 last:border-0 ${
              alreadyHas
                ? "opacity-40 cursor-not-allowed"
                : "cursor-pointer hover:bg-white/5 active:scale-[0.98]"
            }`}
          >
            <span
              className="text-xl"
              style={{
                filter: alreadyHas
                  ? "none"
                  : `drop-shadow(0 0 8px ${badge.color}80)`,
              }}
            >
              {badge.icon}
            </span>
            <div className="flex-1">
              <p
                className="font-black text-sm"
                style={{ color: alreadyHas ? "#52525b" : badge.color }}
              >
                {badge.label}
              </p>
              {alreadyHas && (
                <p className="text-[10px] text-zinc-600 font-bold">
                  Already assigned
                </p>
              )}
            </div>
            {isAssigning && (
              <span
                className="text-xs animate-pulse"
                style={{ color: badge.color }}
              >
                ⟳
              </span>
            )}
            {alreadyHas && !isAssigning && (
              <span className="text-xs text-zinc-600">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlayerRow — single player row with badges and premium toggle
// ---------------------------------------------------------------------------

interface PlayerRowProps {
  player: PlayerResult;
  onBadgeChange: (
    userId: string,
    badgeId: string,
    action: "add" | "remove"
  ) => Promise<void>;
  onPremiumChange: (userId: string, grant: boolean) => Promise<void>;
}

export function PlayerRow({
  player,
  onBadgeChange,
  onPremiumChange,
}: PlayerRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [removingBadge, setRemovingBadge] = useState<string | null>(null);
  const [togglingPremium, setTogglingPremium] = useState(false);

  async function handleAssign(badgeId: string) {
    await onBadgeChange(player.user_id, badgeId, "add");
    setMenuOpen(false);
  }

  async function handleRemove(badgeId: string) {
    setRemovingBadge(badgeId);
    try {
      await onBadgeChange(player.user_id, badgeId, "remove");
    } finally {
      setRemovingBadge(null);
    }
  }

  async function handlePremiumToggle() {
    if (togglingPremium) return;
    setTogglingPremium(true);
    try {
      await onPremiumChange(player.user_id, !player.premium);
    } finally {
      setTogglingPremium(false);
    }
  }

  // Only show assignable badges (not developer/premium which are auto-granted)
  const assignableBadgeIds = player.badges.filter((b) =>
    ["staff", "contentCreator", "tournamentWinner"].includes(b)
  );

  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
      {/* Avatar */}
      <PlayerInitials name={player.name} />

      {/* Name + ID */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm text-white truncate">
          {player.name || "Unknown Player"}
        </p>
        <p className="text-[11px] font-mono text-zinc-500 truncate">
          {player.user_id}
        </p>
      </div>

      {/* Current badges */}
      <div className="flex flex-wrap gap-1.5 items-center min-w-0 max-w-[260px]">
        {assignableBadgeIds.length === 0 ? (
          <span className="text-xs text-zinc-700 font-bold">No badges</span>
        ) : (
          assignableBadgeIds.map((badgeId) => (
            <BadgePill
              key={badgeId}
              badge={badgeId}
              onRemove={() => handleRemove(badgeId)}
              removing={removingBadge === badgeId}
            />
          ))
        )}
      </div>

      {/* Premium toggle */}
      <button
        onClick={handlePremiumToggle}
        disabled={togglingPremium}
        title={player.premium ? "Revoke premium" : "Grant premium"}
        className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black border-2 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
          player.premium
            ? "border-yellow-500/60 bg-yellow-950/30 text-yellow-300 hover:bg-red-950/30 hover:border-red-500/60 hover:text-red-300"
            : "border-zinc-700/60 bg-zinc-900/30 text-zinc-500 hover:bg-yellow-950/30 hover:border-yellow-500/60 hover:text-yellow-300"
        }`}
      >
        {togglingPremium ? (
          <span className="animate-spin">⟳</span>
        ) : player.premium ? (
          <>⭐ Premium</>
        ) : (
          <>— No Premium</>
        )}
      </button>

      {/* Add Badge button */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-xl border-2 border-cyan-700/50 bg-cyan-950/20 px-3 py-2 text-xs font-black text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_16px_rgba(0,212,255,0.25)] transition-all active:scale-95"
          aria-label="Add badge"
        >
          ➕ Add Badge
        </button>
        {menuOpen && (
          <AddBadgeMenu
            currentBadgeIds={assignableBadgeIds}
            onAssign={handleAssign}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
