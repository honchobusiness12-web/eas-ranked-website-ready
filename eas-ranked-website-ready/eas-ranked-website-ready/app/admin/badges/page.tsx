"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BadgeInfo {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

interface Player {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  cr: number;
  wins: number;
  losses: number;
  matches: number;
  blacklisted: boolean;
  ranked: boolean;
}

/** Per-player badge state tracked in the UI */
interface PlayerBadgeState {
  badges: BadgeInfo[];
  loading: boolean;
  loaded: boolean;
}

/** Per-player premium state tracked in the UI */
interface PlayerPremiumState {
  premium: boolean;
  loading: boolean;
  loaded: boolean;
}

/** A holder entry returned by the badge-holders view */
interface HolderEntry {
  user_id: string;
  name: string;
}

type ActiveTab = "players" | "holders";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BADGE_OPTIONS = [
  {
    id: "staff",
    label: "Staff",
    icon: "👮",
    color: "#00FF88",
    bg: "from-green-950/40 to-black",
    border: "border-green-600/50",
    accent: "text-green-300",
    hoverBg: "hover:bg-green-500/20",
    hoverBorder: "hover:border-green-400",
    hoverShadow: "hover:shadow-[0_0_20px_rgba(0,255,136,0.30)]",
  },
  {
    id: "contentCreator",
    label: "Content Creator",
    icon: "🎬",
    color: "#00D4FF",
    bg: "from-cyan-950/40 to-black",
    border: "border-cyan-600/50",
    accent: "text-cyan-300",
    hoverBg: "hover:bg-cyan-500/20",
    hoverBorder: "hover:border-cyan-400",
    hoverShadow: "hover:shadow-[0_0_20px_rgba(0,212,255,0.30)]",
  },
  {
    id: "tournamentWinner",
    label: "Tournament Winner",
    icon: "🏆",
    color: "#FFD700",
    bg: "from-yellow-950/40 to-black",
    border: "border-yellow-600/50",
    accent: "text-yellow-300",
    hoverBg: "hover:bg-yellow-500/20",
    hoverBorder: "hover:border-yellow-400",
    hoverShadow: "hover:shadow-[0_0_20px_rgba(255,215,0,0.30)]",
  },
] as const;

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Small helpers
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
    >
      {initials}
    </div>
  );
}

function BadgePill({
  badge,
  onRemove,
  removing,
}: {
  badge: BadgeInfo;
  onRemove?: () => void;
  removing?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-black shadow-md group"
      style={{
        background: `linear-gradient(135deg, ${badge.color}33, ${badge.color}18)`,
        border: `1.5px solid ${badge.color}80`,
        color: badge.color,
      }}
      title={badge.description}
    >
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          disabled={removing}
          className="ml-0.5 opacity-50 hover:opacity-100 transition text-xs leading-none disabled:cursor-not-allowed"
          title={`Remove ${badge.label}`}
        >
          {removing ? "⟳" : "✕"}
        </button>
      )}
    </span>
  );
}

function Toast({
  msg,
  onDismiss,
}: {
  msg: { type: "success" | "error"; text: string };
  onDismiss: () => void;
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-black shadow-2xl max-w-sm animate-fade-in ${
        msg.type === "success"
          ? "border-green-400/60 bg-green-950/90 text-green-300 shadow-green-900/40"
          : "border-red-400/60 bg-red-950/90 text-red-300 shadow-red-900/40"
      }`}
    >
      <span className="flex-1">{msg.text}</span>
      <button
        onClick={onDismiss}
        className="opacity-60 hover:opacity-100 transition font-black text-base"
      >
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-Badge dropdown (inline per row)
// ---------------------------------------------------------------------------

function AddBadgeMenu({
  userId,
  currentBadgeIds,
  onAssign,
  onClose,
}: {
  userId: string;
  currentBadgeIds: string[];
  onAssign: (badgeId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [assigning, setAssigning] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
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
      {BADGE_OPTIONS.map((badge) => {
        const alreadyHas = currentBadgeIds.includes(badge.id);
        const isAssigning = assigning === badge.id;
        return (
          <button
            key={badge.id}
            onClick={() => !alreadyHas && handleClick(badge.id)}
            disabled={alreadyHas || Boolean(assigning)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-white/5 last:border-0 ${
              alreadyHas
                ? "opacity-40 cursor-not-allowed bg-transparent"
                : `cursor-pointer ${badge.hoverBg} active:scale-[0.98]`
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
              <span className="text-xs animate-pulse" style={{ color: badge.color }}>
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
// Premium toggle button
// ---------------------------------------------------------------------------

function PremiumToggle({
  userId,
  premiumState,
  onToggle,
}: {
  userId: string;
  premiumState: PlayerPremiumState;
  onToggle: (userId: string, grant: boolean) => Promise<void>;
}) {
  const [toggling, setToggling] = useState(false);

  async function handleClick() {
    if (toggling || !premiumState.loaded) return;
    setToggling(true);
    try {
      await onToggle(userId, !premiumState.premium);
    } finally {
      setToggling(false);
    }
  }

  if (!premiumState.loaded) {
    return (
      <span className="text-xs text-zinc-600 animate-pulse font-bold">…</span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={toggling}
      title={premiumState.premium ? "Revoke premium" : "Grant premium"}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black border-2 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
        premiumState.premium
          ? "border-yellow-500/60 bg-yellow-950/30 text-yellow-300 hover:bg-red-950/30 hover:border-red-500/60 hover:text-red-300"
          : "border-zinc-700/60 bg-zinc-900/30 text-zinc-500 hover:bg-yellow-950/30 hover:border-yellow-500/60 hover:text-yellow-300"
      }`}
    >
      {toggling ? (
        <span className="animate-spin">⟳</span>
      ) : premiumState.premium ? (
        <>⭐ Premium</>
      ) : (
        <>— No Premium</>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Player row
// ---------------------------------------------------------------------------

function PlayerRow({
  player,
  badgeState,
  premiumState,
  onLoadBadges,
  onAssignBadge,
  onRemoveBadge,
  onTogglePremium,
}: {
  player: Player;
  badgeState: PlayerBadgeState;
  premiumState: PlayerPremiumState;
  onLoadBadges: (userId: string) => void;
  onAssignBadge: (userId: string, badgeId: string) => Promise<void>;
  onRemoveBadge: (userId: string, badgeId: string) => Promise<void>;
  onTogglePremium: (userId: string, grant: boolean) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [removingBadge, setRemovingBadge] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load badges on first render
  useEffect(() => {
    if (!badgeState.loaded && !badgeState.loading) {
      onLoadBadges(player.user_id);
    }
  }, [player.user_id, badgeState.loaded, badgeState.loading, onLoadBadges]);

  async function handleAssign(badgeId: string) {
    await onAssignBadge(player.user_id, badgeId);
    setMenuOpen(false);
  }

  async function handleRemove(badgeId: string) {
    setRemovingBadge(badgeId);
    try {
      await onRemoveBadge(player.user_id, badgeId);
    } finally {
      setRemovingBadge(null);
    }
  }

  const currentBadgeIds = badgeState.badges.map((b) => b.id);

  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
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
        {badgeState.loading ? (
          <span className="text-xs text-zinc-600 animate-pulse font-bold">
            Loading…
          </span>
        ) : badgeState.badges.length === 0 ? (
          <span className="text-xs text-zinc-700 font-bold">No badges</span>
        ) : (
          badgeState.badges
            .filter((b) =>
              ["staff", "contentCreator", "tournamentWinner"].includes(b.id)
            )
            .map((badge) => (
              <BadgePill
                key={badge.id}
                badge={badge}
                onRemove={() => handleRemove(badge.id)}
                removing={removingBadge === badge.id}
              />
            ))
        )}
      </div>

      {/* Premium toggle */}
      <div className="flex-shrink-0">
        <PremiumToggle
          userId={player.user_id}
          premiumState={premiumState}
          onToggle={onTogglePremium}
        />
      </div>

      {/* Add Badge button */}
      <div ref={menuRef} className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-xl border-2 border-cyan-700/50 bg-cyan-950/20 px-3 py-2 text-xs font-black text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_0_16px_rgba(0,212,255,0.25)] transition-all active:scale-95"
        >
          ➕ Add Badge
        </button>
        {menuOpen && (
          <AddBadgeMenu
            userId={player.user_id}
            currentBadgeIds={currentBadgeIds}
            onAssign={handleAssign}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge Holders Tab — per-badge view with holders / non-holders
// ---------------------------------------------------------------------------

function BadgeHoldersTab({
  onAssignBadge,
  onRemoveBadge,
  setToast,
}: {
  onAssignBadge: (userId: string, badgeId: string) => Promise<void>;
  onRemoveBadge: (userId: string, badgeId: string) => Promise<void>;
  setToast: (t: { type: "success" | "error"; text: string } | null) => void;
}) {
  const [selectedBadge, setSelectedBadge] = useState<string>(
    BADGE_OPTIONS[0].id
  );
  const [holders, setHolders] = useState<HolderEntry[]>([]);
  const [nonHolders, setNonHolders] = useState<HolderEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holderSearch, setHolderSearch] = useState("");
  const [nonHolderSearch, setNonHolderSearch] = useState("");
  const [actingOn, setActingOn] = useState<string | null>(null);

  const badgeOption = BADGE_OPTIONS.find((b) => b.id === selectedBadge)!;

  const loadHolders = useCallback(async (badgeId: string) => {
    setLoading(true);
    setError(null);
    setHolders([]);
    setNonHolders([]);
    try {
      // Fetch all players with any badge data, then split by whether they have this badge
      const [holdersRes, allRes] = await Promise.all([
        // Players who have this badge (from DB badges field)
        fetch(`/api/admin/badges?role=${encodeURIComponent(badgeId)}`),
        // All players with badge data (to find non-holders)
        fetch(`/api/admin/badges`),
      ]);

      let holderIds = new Set<string>();
      let holderList: HolderEntry[] = [];

      if (holdersRes.ok) {
        const data = await holdersRes.json();
        // role endpoint returns { members: [{userId, name}] }
        holderList = (data.members ?? []).map(
          (m: { userId: string; name: string }) => ({
            user_id: m.userId,
            name: m.name,
          })
        );
        holderIds = new Set(holderList.map((h) => h.user_id));
      }

      let nonHolderList: HolderEntry[] = [];
      if (allRes.ok) {
        const data = await allRes.json();
        // GET /api/admin/badges (no params) returns { players: [{user_id, name, badges}] }
        const allPlayers: Array<{
          user_id: string;
          name: string;
          badges?: string[];
        }> = data.players ?? [];
        nonHolderList = allPlayers
          .filter((p) => !holderIds.has(p.user_id))
          .map((p) => ({ user_id: p.user_id, name: p.name }));
      }

      setHolders(holderList);
      setNonHolders(nonHolderList);
    } catch {
      setError("Failed to load badge holders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHolders(selectedBadge);
  }, [selectedBadge, loadHolders]);

  async function handleRemove(userId: string) {
    setActingOn(userId);
    try {
      await onRemoveBadge(userId, selectedBadge);
      // Move from holders → nonHolders
      const entry = holders.find((h) => h.user_id === userId);
      if (entry) {
        setHolders((prev) => prev.filter((h) => h.user_id !== userId));
        setNonHolders((prev) => [entry, ...prev]);
      }
    } finally {
      setActingOn(null);
    }
  }

  async function handleAdd(userId: string) {
    setActingOn(userId);
    try {
      await onAssignBadge(userId, selectedBadge);
      // Move from nonHolders → holders
      const entry = nonHolders.find((h) => h.user_id === userId);
      if (entry) {
        setNonHolders((prev) => prev.filter((h) => h.user_id !== userId));
        setHolders((prev) => [entry, ...prev]);
      }
    } finally {
      setActingOn(null);
    }
  }

  const filteredHolders = holders.filter(
    (h) =>
      !holderSearch ||
      h.name.toLowerCase().includes(holderSearch.toLowerCase()) ||
      h.user_id.includes(holderSearch)
  );

  const filteredNonHolders = nonHolders.filter(
    (h) =>
      !nonHolderSearch ||
      h.name.toLowerCase().includes(nonHolderSearch.toLowerCase()) ||
      h.user_id.includes(nonHolderSearch)
  );

  return (
    <div>
      {/* Badge selector */}
      <div className="flex flex-wrap gap-3 mb-8">
        {BADGE_OPTIONS.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              setSelectedBadge(b.id);
              setHolderSearch("");
              setNonHolderSearch("");
            }}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black border-2 transition-all active:scale-95 ${
              selectedBadge === b.id
                ? "scale-105"
                : "opacity-50 hover:opacity-80"
            }`}
            style={
              selectedBadge === b.id
                ? {
                    background: `linear-gradient(135deg, ${b.color}28, ${b.color}10)`,
                    border: `2px solid ${b.color}80`,
                    color: b.color,
                    boxShadow: `0 0 20px ${b.color}30`,
                  }
                : {
                    background: "rgba(255,255,255,0.03)",
                    border: "2px solid rgba(255,255,255,0.10)",
                    color: "#71717a",
                  }
            }
          >
            <span>{b.icon}</span>
            <span>{b.label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <p className="text-zinc-400 animate-pulse font-bold text-lg">
            Loading badge holders…
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border-2 border-red-500/40 bg-red-950/20 px-6 py-5 text-center">
          <p className="text-red-400 font-black">{error}</p>
          <button
            onClick={() => loadHolders(selectedBadge)}
            className="mt-3 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-black text-red-300 hover:bg-red-500/10 transition"
          >
            ↻ Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Has Badge ── */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              border: `2px solid ${badgeOption.color}40`,
              background: `linear-gradient(135deg, ${badgeOption.color}08, rgba(0,0,0,0.60))`,
            }}
          >
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: `${badgeOption.color}25` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{badgeOption.icon}</span>
                <div>
                  <p
                    className="font-black text-sm"
                    style={{ color: badgeOption.color }}
                  >
                    Has {badgeOption.label}
                  </p>
                  <p className="text-[11px] text-zinc-500 font-bold">
                    {filteredHolders.length} player
                    {filteredHolders.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <span
                className="text-2xl font-black"
                style={{ color: badgeOption.color }}
              >
                {holders.length}
              </span>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-white/5">
              <input
                type="text"
                value={holderSearch}
                onChange={(e) => setHolderSearch(e.target.value)}
                placeholder="Filter holders…"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-xs font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
              />
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
              {filteredHolders.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm font-bold text-zinc-600">
                  {holderSearch ? "No matches" : "No holders yet"}
                </p>
              ) : (
                filteredHolders.map((h) => (
                  <div
                    key={h.user_id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <PlayerInitials name={h.name} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-white truncate">
                        {h.name}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-600 truncate">
                        {h.user_id}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(h.user_id)}
                      disabled={actingOn === h.user_id}
                      className="flex-shrink-0 rounded-xl border-2 border-red-700/50 bg-red-950/20 px-3 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 hover:border-red-400 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actingOn === h.user_id ? (
                        <span className="animate-spin inline-block">⟳</span>
                      ) : (
                        "✕ Remove"
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Doesn't Have Badge ── */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              border: "2px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.01)",
            }}
          >
            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between bg-white/[0.02]">
              <div>
                <p className="font-black text-sm text-zinc-300">
                  Doesn&apos;t Have {badgeOption.label}
                </p>
                <p className="text-[11px] text-zinc-500 font-bold">
                  {filteredNonHolders.length} player
                  {filteredNonHolders.length !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-2xl font-black text-zinc-500">
                {nonHolders.length}
              </span>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-white/5">
              <input
                type="text"
                value={nonHolderSearch}
                onChange={(e) => setNonHolderSearch(e.target.value)}
                placeholder="Filter players…"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-xs font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
              />
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
              {filteredNonHolders.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm font-bold text-zinc-600">
                  {nonHolderSearch ? "No matches" : "Everyone has this badge"}
                </p>
              ) : (
                filteredNonHolders.map((h) => (
                  <div
                    key={h.user_id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <PlayerInitials name={h.name} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-white truncate">
                        {h.name}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-600 truncate">
                        {h.user_id}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAdd(h.user_id)}
                      disabled={actingOn === h.user_id}
                      className="flex-shrink-0 rounded-xl border-2 border-cyan-700/50 bg-cyan-950/20 px-3 py-1.5 text-xs font-black text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actingOn === h.user_id ? (
                        <span className="animate-spin inline-block">⟳</span>
                      ) : (
                        "➕ Add"
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminBadgesPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("players");

  // Player list state
  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // 0-indexed
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-player badge state: userId → { badges, loading, loaded }
  const [badgeStates, setBadgeStates] = useState<
    Record<string, PlayerBadgeState>
  >({});

  // Per-player premium state: userId → { premium, loading, loaded }
  const [premiumStates, setPremiumStates] = useState<
    Record<string, PlayerPremiumState>
  >({});

  // Global toast
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Auth check
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((data) => {
        setIsOwner(data.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // ---------------------------------------------------------------------------
  // Auto-dismiss toast
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (toast?.type === "success") {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ---------------------------------------------------------------------------
  // Load players
  // ---------------------------------------------------------------------------

  const loadPlayers = useCallback(
    async (search: string, pageIndex: number) => {
      setLoadingPlayers(true);
      setPlayersError(null);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(pageIndex * PAGE_SIZE),
        });
        if (search.trim()) params.set("search", search.trim());

        const res = await fetch(`/api/admin/players?${params}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setPlayersError(data.error ?? "Failed to load players.");
          return;
        }
        const data = await res.json();
        setPlayers(data.players ?? []);
        setTotal(data.total ?? 0);
      } catch {
        setPlayersError("An unexpected error occurred.");
      } finally {
        setLoadingPlayers(false);
      }
    },
    []
  );

  // Load on mount and when auth is confirmed
  useEffect(() => {
    if (isOwner) {
      loadPlayers(activeSearch, page);
    }
  }, [isOwner, activeSearch, page, loadPlayers]);

  // ---------------------------------------------------------------------------
  // Search handling (debounced)
  // ---------------------------------------------------------------------------

  function handleSearchInput(value: string) {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(0);
      setActiveSearch(value);
    }, 350);
  }

  function clearSearch() {
    setSearchInput("");
    setActiveSearch("");
    setPage(0);
  }

  // ---------------------------------------------------------------------------
  // Load badges for a single player
  // ---------------------------------------------------------------------------

  const loadPlayerBadges = useCallback(async (userId: string) => {
    setBadgeStates((prev) => ({
      ...prev,
      [userId]: { badges: prev[userId]?.badges ?? [], loading: true, loaded: false },
    }));
    try {
      const res = await fetch(
        `/api/admin/badges?userId=${encodeURIComponent(userId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setBadgeStates((prev) => ({
          ...prev,
          [userId]: { badges: data.badges ?? [], loading: false, loaded: true },
        }));
      } else {
        setBadgeStates((prev) => ({
          ...prev,
          [userId]: { badges: [], loading: false, loaded: true },
        }));
      }
    } catch {
      setBadgeStates((prev) => ({
        ...prev,
        [userId]: { badges: [], loading: false, loaded: true },
      }));
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Assign badge
  // ---------------------------------------------------------------------------

  async function handleAssignBadge(userId: string, badgeId: string) {
    const badgeOption = BADGE_OPTIONS.find((b) => b.id === badgeId);
    const playerName =
      players.find((p) => p.user_id === userId)?.name ?? userId;

    try {
      const res = await fetch("/api/admin/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, badge: badgeId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Update badge state immediately with the fresh list returned by the server
        setBadgeStates((prev) => ({
          ...prev,
          [userId]: {
            badges: data.badges ?? prev[userId]?.badges ?? [],
            loading: false,
            loaded: true,
          },
        }));
        // Force a server reload to ensure the UI reflects the persisted state
        loadPlayerBadges(userId);
        setToast({
          type: "success",
          text: `✅ ${badgeOption?.icon ?? ""} ${badgeOption?.label ?? badgeId} assigned to ${playerName}`,
        });
      } else {
        // Reload to clear any stale state
        loadPlayerBadges(userId);
        setToast({
          type: "error",
          text: data.error ?? "Failed to assign badge.",
        });
      }
    } catch {
      // Reload badges so the UI stays consistent even if the request failed
      loadPlayerBadges(userId);
      setToast({ type: "error", text: "An unexpected error occurred." });
    }
  }

  // ---------------------------------------------------------------------------
  // Remove badge
  // ---------------------------------------------------------------------------

  async function handleRemoveBadge(userId: string, badgeId: string) {
    const badgeOption = BADGE_OPTIONS.find((b) => b.id === badgeId);
    const playerName =
      players.find((p) => p.user_id === userId)?.name ?? userId;

    // Optimistic update
    setBadgeStates((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        badges: (prev[userId]?.badges ?? []).filter((b) => b.id !== badgeId),
      },
    }));

    try {
      const res = await fetch("/api/admin/badges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, badge: badgeId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Update badge state immediately with the authoritative list from the server
        setBadgeStates((prev) => ({
          ...prev,
          [userId]: {
            badges: data.badges ?? prev[userId]?.badges ?? [],
            loading: false,
            loaded: true,
          },
        }));
        // Force a server reload to ensure stale/old badges are cleared
        loadPlayerBadges(userId);
        setToast({
          type: "success",
          text: `🗑️ ${badgeOption?.icon ?? ""} ${badgeOption?.label ?? badgeId} removed from ${playerName}`,
        });
      } else {
        // Revert optimistic update by reloading from server
        loadPlayerBadges(userId);
        setToast({
          type: "error",
          text: data.error ?? "Failed to remove badge.",
        });
      }
    } catch {
      loadPlayerBadges(userId);
      setToast({ type: "error", text: "An unexpected error occurred." });
    }
  }

  // ---------------------------------------------------------------------------
  // Load premium status for a single player
  // ---------------------------------------------------------------------------

  const loadPlayerPremium = useCallback(async (userId: string) => {
    setPremiumStates((prev) => ({
      ...prev,
      [userId]: { premium: prev[userId]?.premium ?? false, loading: true, loaded: false },
    }));
    try {
      const res = await fetch(
        `/api/admin/premium?userId=${encodeURIComponent(userId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setPremiumStates((prev) => ({
          ...prev,
          [userId]: { premium: data.premium ?? false, loading: false, loaded: true },
        }));
      } else {
        setPremiumStates((prev) => ({
          ...prev,
          [userId]: { premium: false, loading: false, loaded: true },
        }));
      }
    } catch {
      setPremiumStates((prev) => ({
        ...prev,
        [userId]: { premium: false, loading: false, loaded: true },
      }));
    }
  }, []);

  // Load premium for all visible players whenever the player list changes
  useEffect(() => {
    for (const player of players) {
      if (!premiumStates[player.user_id]?.loaded && !premiumStates[player.user_id]?.loading) {
        loadPlayerPremium(player.user_id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, loadPlayerPremium]);

  // ---------------------------------------------------------------------------
  // Toggle premium
  // ---------------------------------------------------------------------------

  async function handleTogglePremium(userId: string, grant: boolean) {
    const playerName =
      players.find((p) => p.user_id === userId)?.name ?? userId;

    // Optimistic update
    setPremiumStates((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], premium: grant },
    }));

    try {
      const res = await fetch("/api/admin/premium", {
        method: grant ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPremiumStates((prev) => ({
          ...prev,
          [userId]: { premium: data.premium ?? grant, loading: false, loaded: true },
        }));
        setToast({
          type: "success",
          text: grant
            ? `⭐ Premium granted to ${playerName}`
            : `🗑️ Premium revoked from ${playerName}`,
        });
      } else {
        // Revert
        setPremiumStates((prev) => ({
          ...prev,
          [userId]: { ...prev[userId], premium: !grant },
        }));
        setToast({
          type: "error",
          text: data.error ?? "Failed to update premium.",
        });
      }
    } catch {
      // Revert
      setPremiumStates((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], premium: !grant },
      }));
      setToast({ type: "error", text: "An unexpected error occurred." });
    }
  }

  // ---------------------------------------------------------------------------
  // Auth gate
  // ---------------------------------------------------------------------------

  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse font-bold">
            Checking access…
          </p>
        </div>
      </Shell>
    );
  }

  if (!isOwner) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🚫</p>
            <h1 className="text-2xl font-black text-red-400">Access Denied</h1>
            <p className="mt-2 text-zinc-400">
              This page is restricted to the EAS Arena developer.
            </p>
            <SoundLink
              href="/"
              soundType="click"
              className="mt-6 inline-block rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-zinc-300 hover:bg-white/5 transition"
            >
              ← Back to Dashboard
            </SoundLink>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE + 1;
  const pageEnd = Math.min((page + 1) * PAGE_SIZE, total);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Shell>
      {/* Toast */}
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

      {/* ─── Hero Banner ─────────────────────────────────────────────────── */}
      <div
        className="relative mb-8 rounded-3xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0a0a14 0%, #0d0d1a 40%, #0a0a14 100%)",
          border: "2px solid rgba(0,255,136,0.30)",
          boxShadow:
            "0 0 80px rgba(0,255,136,0.08), 0 0 40px rgba(0,212,255,0.06)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #00FF88, transparent)",
            transform: "translate(-30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #00D4FF, transparent)",
            transform: "translate(30%, 30%)",
          }}
        />

        <div className="relative px-8 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className="text-5xl"
              style={{ filter: "drop-shadow(0 0 20px rgba(0,255,136,0.80))" }}
            >
              🏅
            </span>
            <div>
              <h1
                className="text-4xl font-black tracking-tight leading-none"
                style={{
                  background:
                    "linear-gradient(90deg, #00FF88, #00D4FF, #FFD700)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 30px rgba(0,255,136,0.40))",
                }}
              >
                BADGE MANAGER
              </h1>
              <p className="text-sm font-bold text-zinc-400 mt-1">
                🔐 Developer Access Only — Assign &amp; Remove Player Badges
              </p>
            </div>
          </div>

          {/* Badge type legend */}
          <div className="flex flex-wrap gap-2">
            {BADGE_OPTIONS.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black"
                style={{
                  background: `${b.color}18`,
                  border: `1.5px solid ${b.color}50`,
                  color: b.color,
                  boxShadow: `0 0 12px ${b.color}20`,
                }}
              >
                <span>{b.icon}</span>
                <span>{b.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Tab Switcher ────────────────────────────────────────────────── */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab("players")}
          className={`rounded-2xl px-5 py-2.5 text-sm font-black border-2 transition-all active:scale-95 ${
            activeTab === "players"
              ? "border-cyan-400/60 bg-cyan-950/30 text-cyan-300 shadow-[0_0_16px_rgba(0,212,255,0.20)]"
              : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
          }`}
        >
          👥 Player List
        </button>
        <button
          onClick={() => setActiveTab("holders")}
          className={`rounded-2xl px-5 py-2.5 text-sm font-black border-2 transition-all active:scale-95 ${
            activeTab === "holders"
              ? "border-green-400/60 bg-green-950/30 text-green-300 shadow-[0_0_16px_rgba(0,255,136,0.20)]"
              : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
          }`}
        >
          🏅 Badge Holders
        </button>
      </div>

      {/* ─── Badge Holders Tab ───────────────────────────────────────────── */}
      {activeTab === "holders" && (
        <BadgeHoldersTab
          onAssignBadge={handleAssignBadge}
          onRemoveBadge={handleRemoveBadge}
          setToast={setToast}
        />
      )}

      {/* ─── Player List Tab ─────────────────────────────────────────────── */}
      {activeTab === "players" && (
        <>
          {/* ─── Search Bar ──────────────────────────────────────────────── */}
          <div className="mb-6">
            <div className="relative flex items-center">
              <span className="absolute left-4 text-lg text-cyan-400 pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search by player name or Discord ID…"
                className="w-full rounded-2xl border-2 border-cyan-700/40 bg-zinc-900 px-4 py-3.5 pl-11 pr-10 text-base font-bold text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none focus:shadow-[0_0_20px_rgba(0,212,255,0.20)] transition-all"
              />
              {loadingPlayers && (
                <span className="absolute right-4 text-cyan-400 text-sm animate-pulse font-black">
                  ⟳
                </span>
              )}
              {!loadingPlayers && searchInput && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 text-zinc-400 hover:text-white text-base transition font-black"
                >
                  ✕
                </button>
              )}
            </div>
            {activeSearch && (
              <p className="mt-2 text-xs font-bold text-zinc-500 pl-1">
                Showing results for &quot;{activeSearch}&quot; — {total} player
                {total !== 1 ? "s" : ""} found
              </p>
            )}
          </div>

          {/* ─── Player Table ────────────────────────────────────────────── */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              border: "2px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.01)",
              boxShadow: "0 0 40px rgba(0,0,0,0.40)",
            }}
          >
            {/* Table header */}
            <div
              className="grid px-5 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/8"
              style={{
                gridTemplateColumns: "40px 1fr 1fr auto auto",
                gap: "1rem",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div />
              <div>Player</div>
              <div>Badges</div>
              <div>Premium</div>
              <div>Actions</div>
            </div>

            {/* Error state */}
            {playersError && (
              <div className="px-6 py-12 text-center">
                <p className="text-4xl mb-3">⚠️</p>
                <p className="text-base font-black text-red-400">
                  {playersError}
                </p>
                <button
                  onClick={() => loadPlayers(activeSearch, page)}
                  className="mt-4 rounded-xl border-2 border-red-500/40 bg-red-950/20 px-5 py-2.5 text-sm font-black text-red-300 hover:bg-red-500/20 transition-all"
                >
                  ↻ Retry
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {loadingPlayers && !playersError && (
              <div className="divide-y divide-white/5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-4 animate-pulse"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-zinc-800 rounded-full w-32" />
                      <div className="h-2.5 bg-zinc-800/60 rounded-full w-48" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-20 bg-zinc-800 rounded-xl" />
                    </div>
                    <div className="h-8 w-28 bg-zinc-800 rounded-xl" />
                    <div className="h-8 w-24 bg-zinc-800 rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loadingPlayers && !playersError && players.length === 0 && (
              <div className="px-6 py-16 text-center">
                <p className="text-5xl mb-4">😕</p>
                <p className="text-lg font-black text-zinc-400">
                  {activeSearch
                    ? `No players found for "${activeSearch}"`
                    : "No players found"}
                </p>
                {activeSearch && (
                  <button
                    onClick={clearSearch}
                    className="mt-4 rounded-xl border-2 border-zinc-700 bg-zinc-800/50 px-5 py-2.5 text-sm font-black text-zinc-300 hover:bg-zinc-700/50 transition-all"
                  >
                    ✕ Clear Search
                  </button>
                )}
              </div>
            )}

            {/* Player rows */}
            {!loadingPlayers && !playersError && players.length > 0 && (
              <div>
                {players.map((player) => {
                  const badgeState: PlayerBadgeState = badgeStates[
                    player.user_id
                  ] ?? {
                    badges: [],
                    loading: false,
                    loaded: false,
                  };
                  const premiumState: PlayerPremiumState = premiumStates[
                    player.user_id
                  ] ?? {
                    premium: false,
                    loading: false,
                    loaded: false,
                  };
                  return (
                    <PlayerRow
                      key={player.user_id}
                      player={player}
                      badgeState={badgeState}
                      premiumState={premiumState}
                      onLoadBadges={loadPlayerBadges}
                      onAssignBadge={handleAssignBadge}
                      onRemoveBadge={handleRemoveBadge}
                      onTogglePremium={handleTogglePremium}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Pagination ──────────────────────────────────────────────── */}
          {!loadingPlayers && !playersError && total > PAGE_SIZE && (
            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-sm font-bold text-zinc-500">
                Showing{" "}
                <span className="text-white font-black">
                  {pageStart}–{pageEnd}
                </span>{" "}
                of{" "}
                <span className="text-white font-black">{total}</span> players
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-zinc-300 hover:bg-white/10 hover:border-white/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>

                {/* Page number pills */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }).map(
                    (_, i) => {
                      let pageNum = i;
                      if (totalPages > 7) {
                        if (page <= 3) {
                          pageNum = i;
                        } else if (page >= totalPages - 4) {
                          pageNum = totalPages - 7 + i;
                        } else {
                          pageNum = page - 3 + i;
                        }
                      }
                      const isActive = pageNum === page;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-9 h-9 rounded-xl text-sm font-black transition-all ${
                            isActive
                              ? "bg-cyan-500/30 border-2 border-cyan-400/60 text-cyan-300"
                              : "border-2 border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {pageNum + 1}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2 text-sm font-black text-zinc-300 hover:bg-white/10 hover:border-white/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ─── Stats footer ────────────────────────────────────────────── */}
          {!loadingPlayers && !playersError && players.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-zinc-600">
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <span>·</span>
              <span>{total} total players</span>
              <span>·</span>
              <button
                onClick={() => loadPlayers(activeSearch, page)}
                className="text-zinc-500 hover:text-zinc-300 transition font-black"
              >
                ↻ Refresh
              </button>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
