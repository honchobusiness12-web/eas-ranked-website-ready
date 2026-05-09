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

interface PlayerRow {
  user_id: string;
  name: string;
  roles: string[];
}

interface PlayerBadgeData {
  userId: string;
  name: string | null;
  badges: BadgeInfo[];
  roles: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BADGE_OPTIONS = [
  { id: "staff",            label: "Staff",            icon: "👮", color: "#00FF88", bg: "from-green-950/30 to-black", border: "border-green-700/30", accent: "text-green-300" },
  { id: "contentCreator",   label: "Content Creator",  icon: "🎬", color: "#00D4FF", bg: "from-cyan-950/30 to-black",  border: "border-cyan-700/30",  accent: "text-cyan-300"  },
  { id: "tournamentWinner", label: "Tournament Winner", icon: "🏆", color: "#FFD700", bg: "from-yellow-950/30 to-black", border: "border-yellow-700/30", accent: "text-yellow-300" },
] as const;

type BadgeId = (typeof BADGE_OPTIONS)[number]["id"];
type MainTab = "badge" | "user" | "batch";

/** Client-side search cache: query → { players, expiresAt } */
const searchCache = new Map<string, { players: PlayerRow[]; expiresAt: number }>();
const SEARCH_CACHE_TTL_MS = 30_000;

// ---------------------------------------------------------------------------
// Small reusable components
// ---------------------------------------------------------------------------

function BadgePill({ badge }: { badge: BadgeInfo }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black"
      style={{
        background: `linear-gradient(135deg, ${badge.color}33, ${badge.color}18)`,
        border: `1px solid ${badge.color}60`,
        color: badge.color,
      }}
      title={badge.description}
    >
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
    </span>
  );
}

function StatusBanner({
  msg,
  onDismiss,
}: {
  msg: { type: "success" | "error"; text: string };
  onDismiss: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold ${
        msg.type === "success"
          ? "border-green-700/40 bg-green-950/20 text-green-300"
          : "border-red-700/40 bg-red-950/20 text-red-300"
      }`}
    >
      <span>{msg.text}</span>
      <button onClick={onDismiss} className="ml-3 text-xs opacity-60 hover:opacity-100 transition">✕</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline search-and-select input (reused in Badge View per-badge)
// ---------------------------------------------------------------------------

function PlayerSearchInput({
  placeholder,
  onSelect,
}: {
  placeholder?: string;
  onSelect: (player: PlayerRow) => void;
}) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<PlayerRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen]         = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); setOpen(false); return; }

    const cached = searchCache.get(trimmed);
    if (cached && Date.now() < cached.expiresAt) {
      setResults(cached.players);
      setOpen(true);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/admin/badges?search=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const players: PlayerRow[] = data.players ?? [];
        searchCache.set(trimmed, { players, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
        setResults(players);
        setOpen(true);
      }
    } finally {
      setSearching(false);
    }
  }

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  }

  function handleSelect(player: PlayerRow) {
    onSelect(player);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "Search by name or Discord ID…"}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 pr-8 text-sm text-white placeholder-zinc-600 focus:border-white/20 focus:outline-none"
        />
        {searching && (
          <span className="absolute right-3 text-zinc-500 text-xs animate-pulse">…</span>
        )}
        {!searching && query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-3 text-zinc-500 hover:text-zinc-300 text-xs transition"
          >
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d14] shadow-2xl overflow-hidden">
          {results.map((player) => (
            <button
              key={player.user_id}
              onMouseDown={() => handleSelect(player)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.07] transition border-b border-white/5 last:border-0"
            >
              <div>
                <p className="font-bold text-sm text-white">{player.name}</p>
                <p className="text-[10px] font-mono text-zinc-500">{player.user_id}</p>
              </div>
              <span className="text-xs text-zinc-500 shrink-0">Add →</span>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && query.trim() && !searching && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-zinc-500 shadow-2xl">
          No players found for &quot;{query}&quot;
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
  const [isOwner, setIsOwner]         = useState(false);

  // Active main tab
  const [activeTab, setActiveTab] = useState<MainTab>("badge");

  // All badge holders (for Badge View)
  const [badgeHolders,   setBadgeHolders]   = useState<PlayerRow[]>([]);
  const [loadingHolders, setLoadingHolders] = useState(false);

  // Per-badge add-search loading state
  const [addingTo, setAddingTo] = useState<BadgeId | null>(null);

  // User View state
  const [userQuery,        setUserQuery]        = useState("");
  const [userResults,      setUserResults]      = useState<PlayerRow[]>([]);
  const [userSearching,    setUserSearching]    = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [selectedUser,     setSelectedUser]     = useState<PlayerBadgeData | null>(null);
  const [loadingUser,      setLoadingUser]      = useState(false);
  const [optimisticBadges, setOptimisticBadges] = useState<BadgeInfo[] | null>(null);
  const [userMsg,          setUserMsg]          = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actioning,        setActioning]        = useState(false);
  const userDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userSearchRef   = useRef<HTMLDivElement>(null);

  // Batch state
  const [batchBadge,   setBatchBadge]   = useState<BadgeId>("staff");
  const [batchAction,  setBatchAction]  = useState<"assign" | "remove">("assign");
  const [batchInput,   setBatchInput]   = useState("");
  const [batchList,    setBatchList]    = useState<{ userId: string; name: string }[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchMsg,     setBatchMsg]     = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [batchSearchResults, setBatchSearchResults] = useState<PlayerRow[]>([]);
  const [batchSearchOpen,    setBatchSearchOpen]    = useState(false);
  const [batchSearching,     setBatchSearching]     = useState(false);
  const batchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batchSearchRef   = useRef<HTMLDivElement>(null);

  // Global action feedback (badge view)
  const [badgeMsg, setBadgeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync roles
  const [syncing,    setSyncing]    = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

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
  // Auto-dismiss success messages
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (badgeMsg?.type === "success") {
      const t = setTimeout(() => setBadgeMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [badgeMsg]);

  useEffect(() => {
    if (userMsg?.type === "success") {
      const t = setTimeout(() => setUserMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [userMsg]);

  useEffect(() => {
    if (batchMsg?.type === "success") {
      const t = setTimeout(() => setBatchMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [batchMsg]);

  // ---------------------------------------------------------------------------
  // Close user-search dropdown on outside click
  // ---------------------------------------------------------------------------

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (userSearchRef.current && !userSearchRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (batchSearchRef.current && !batchSearchRef.current.contains(e.target as Node)) {
        setBatchSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // ---------------------------------------------------------------------------
  // Load all badge holders
  // ---------------------------------------------------------------------------

  const loadBadgeHolders = useCallback(async () => {
    setLoadingHolders(true);
    try {
      const res = await fetch("/api/admin/badges");
      if (res.ok) {
        const data = await res.json();
        setBadgeHolders(data.players ?? []);
      }
    } finally {
      setLoadingHolders(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) loadBadgeHolders();
  }, [isOwner, loadBadgeHolders]);

  // ---------------------------------------------------------------------------
  // Badge View — add a user to a badge
  // ---------------------------------------------------------------------------

  async function handleAddToBadge(player: PlayerRow, badgeId: BadgeId) {
    setAddingTo(badgeId);
    setBadgeMsg(null);
    try {
      const res = await fetch("/api/admin/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: player.user_id, badge: badgeId }),
      });
      const data = await res.json();
      const badgeOption = BADGE_OPTIONS.find((b) => b.id === badgeId)!;
      if (res.ok && data.success) {
        setBadgeMsg({
          type: "success",
          text: `✅ ${badgeOption.icon} ${badgeOption.label} assigned to ${player.name ?? player.user_id}`,
        });
        loadBadgeHolders();
      } else {
        setBadgeMsg({ type: "error", text: data.error ?? "Failed to assign badge." });
      }
    } catch {
      setBadgeMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setAddingTo(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Badge View — remove a user from a badge
  // ---------------------------------------------------------------------------

  async function handleRemoveFromBadge(userId: string, userName: string | null, badgeId: BadgeId) {
    setBadgeMsg(null);
    try {
      const res = await fetch("/api/admin/badges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, badge: badgeId }),
      });
      const data = await res.json();
      const badgeOption = BADGE_OPTIONS.find((b) => b.id === badgeId)!;
      if (res.ok && data.success) {
        setBadgeMsg({
          type: "success",
          text: `✅ ${badgeOption.icon} ${badgeOption.label} removed from ${userName ?? userId}`,
        });
        loadBadgeHolders();
      } else {
        setBadgeMsg({ type: "error", text: data.error ?? "Failed to remove badge." });
      }
    } catch {
      setBadgeMsg({ type: "error", text: "An unexpected error occurred." });
    }
  }

  // ---------------------------------------------------------------------------
  // User View — search
  // ---------------------------------------------------------------------------

  async function runUserSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) { setUserResults([]); setUserDropdownOpen(false); return; }

    const cached = searchCache.get(trimmed);
    if (cached && Date.now() < cached.expiresAt) {
      setUserResults(cached.players);
      setUserDropdownOpen(true);
      return;
    }

    setUserSearching(true);
    try {
      const res = await fetch(`/api/admin/badges?search=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const players: PlayerRow[] = data.players ?? [];
        searchCache.set(trimmed, { players, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
        setUserResults(players);
        setUserDropdownOpen(true);
      }
    } finally {
      setUserSearching(false);
    }
  }

  function handleUserSearchInput(value: string) {
    setUserQuery(value);
    if (userDebounceRef.current) clearTimeout(userDebounceRef.current);
    if (!value.trim()) { setUserResults([]); setUserDropdownOpen(false); return; }
    userDebounceRef.current = setTimeout(() => runUserSearch(value), 300);
  }

  async function selectUser(userId: string) {
    setLoadingUser(true);
    setSelectedUser(null);
    setOptimisticBadges(null);
    setUserMsg(null);
    setUserDropdownOpen(false);
    setUserQuery("");
    setUserResults([]);
    try {
      const res = await fetch(`/api/admin/badges?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
      }
    } finally {
      setLoadingUser(false);
    }
  }

  // ---------------------------------------------------------------------------
  // User View — assign / remove badge with optimistic update
  // ---------------------------------------------------------------------------

  async function handleUserBadgeAction(badgeId: BadgeId, action: "assign" | "remove") {
    if (!selectedUser) return;
    setActioning(true);
    setUserMsg(null);

    const currentBadges = optimisticBadges ?? selectedUser.badges;
    const badgeOption   = BADGE_OPTIONS.find((b) => b.id === badgeId)!;
    const nextBadges =
      action === "assign"
        ? currentBadges.some((b) => b.id === badgeId)
          ? currentBadges
          : [...currentBadges, { id: badgeId, label: badgeOption.label, icon: badgeOption.icon, color: badgeOption.color, description: "" }]
        : currentBadges.filter((b) => b.id !== badgeId);
    setOptimisticBadges(nextBadges);

    try {
      const res = await fetch("/api/admin/badges", {
        method: action === "assign" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.userId, badge: badgeId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserMsg({
          type: "success",
          text: `✅ ${badgeOption.icon} ${badgeOption.label} ${action === "assign" ? "assigned to" : "removed from"} ${selectedUser.name ?? selectedUser.userId}`,
        });
        setOptimisticBadges(data.badges ?? null);
        setSelectedUser((prev) => prev ? { ...prev, badges: data.badges ?? prev.badges } : prev);
        loadBadgeHolders();
      } else {
        setOptimisticBadges(null);
        setUserMsg({ type: "error", text: data.error ?? "Action failed." });
      }
    } catch {
      setOptimisticBadges(null);
      setUserMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setActioning(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Batch View — search
  // ---------------------------------------------------------------------------

  async function runBatchSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) { setBatchSearchResults([]); setBatchSearchOpen(false); return; }

    const cached = searchCache.get(trimmed);
    if (cached && Date.now() < cached.expiresAt) {
      setBatchSearchResults(cached.players);
      setBatchSearchOpen(true);
      return;
    }

    setBatchSearching(true);
    try {
      const res = await fetch(`/api/admin/badges?search=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const players: PlayerRow[] = data.players ?? [];
        searchCache.set(trimmed, { players, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
        setBatchSearchResults(players);
        setBatchSearchOpen(true);
      }
    } finally {
      setBatchSearching(false);
    }
  }

  function handleBatchSearchInput(value: string) {
    setBatchInput(value);
    if (batchDebounceRef.current) clearTimeout(batchDebounceRef.current);
    if (!value.trim()) { setBatchSearchResults([]); setBatchSearchOpen(false); return; }
    batchDebounceRef.current = setTimeout(() => runBatchSearch(value), 300);
  }

  function addToBatchList(player: PlayerRow) {
    if (batchList.some((p) => p.userId === player.user_id)) return;
    setBatchList((prev) => [...prev, { userId: player.user_id, name: player.name }]);
    setBatchInput("");
    setBatchSearchResults([]);
    setBatchSearchOpen(false);
  }

  function removeFromBatchList(userId: string) {
    setBatchList((prev) => prev.filter((p) => p.userId !== userId));
  }

  // ---------------------------------------------------------------------------
  // Batch View — run batch operation
  // ---------------------------------------------------------------------------

  async function handleBatchAction() {
    if (batchList.length === 0) return;
    setBatchRunning(true);
    setBatchMsg(null);
    try {
      const res = await fetch("/api/admin/badges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: batchList.map((p) => p.userId),
          badge: batchBadge,
          action: batchAction,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const badgeOption = BADGE_OPTIONS.find((b) => b.id === batchBadge)!;
        setBatchMsg({
          type: "success",
          text: `✅ ${badgeOption.icon} ${badgeOption.label} ${batchAction === "assign" ? "assigned to" : "removed from"} ${data.succeeded.length} player${data.succeeded.length !== 1 ? "s" : ""}${data.failed.length > 0 ? ` (${data.failed.length} failed)` : ""}`,
        });
        setBatchList([]);
        loadBadgeHolders();
      } else {
        setBatchMsg({ type: "error", text: data.error ?? "Batch action failed." });
      }
    } catch {
      setBatchMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setBatchRunning(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Sync roles
  // ---------------------------------------------------------------------------

  async function handleSyncRoles(force = false) {
    setSyncing(true);
    setSyncResult(null);
    try {
      const url  = force ? "/api/admin/sync-roles?force=true" : "/api/admin/sync-roles";
      const res  = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        const r = data.result;
        if (r.cachedRun) {
          setSyncResult("⏱ Sync skipped — ran recently. Use Force Sync to override.");
        } else {
          setSyncResult(
            `✅ Synced in ${r.durationMs}ms — ` +
            `premium: ${r.premiumUpdated}, staff: ${r.staffUpdated}, cc: ${r.contentCreatorUpdated}`
          );
        }
        loadBadgeHolders();
      } else {
        setSyncResult(`❌ ${data.error ?? "Sync failed."}`);
      }
    } catch {
      setSyncResult("❌ Unexpected error during sync.");
    } finally {
      setSyncing(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Auth gate
  // ---------------------------------------------------------------------------

  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse">Checking access…</p>
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
            <p className="mt-2 text-zinc-400">This page is restricted to the EAS Arena developer.</p>
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
  // Derived state
  // ---------------------------------------------------------------------------

  const displayBadges = optimisticBadges ?? selectedUser?.badges ?? [];

  // For Badge View: group badge holders by badge id
  function holdersForBadge(badgeId: BadgeId): PlayerRow[] {
    return badgeHolders.filter((p) => {
      const roles: string[] = p.roles ?? [];
      // The API returns players whose data->'badges' contains the badge id
      // The raw row has a `badges` field but the type only has `roles` — we cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const badges: string[] = (p as any).badges ?? [];
      return badges.includes(badgeId) || roles.includes(badgeId);
    });
  }

  // ---------------------------------------------------------------------------
  // Tab content renderers
  // ---------------------------------------------------------------------------

  function renderBadgeView() {
    return (
      <div className="space-y-6">
        {/* Global feedback */}
        {badgeMsg && (
          <StatusBanner msg={badgeMsg} onDismiss={() => setBadgeMsg(null)} />
        )}

        {/* One card per badge */}
        {BADGE_OPTIONS.map((badge) => {
          const holders = holdersForBadge(badge.id);
          const isAdding = addingTo === badge.id;

          return (
            <div
              key={badge.id}
              className={`rounded-2xl border ${badge.border} bg-gradient-to-br ${badge.bg} overflow-hidden`}
            >
              {/* Badge header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{badge.icon}</span>
                  <div>
                    <h2 className={`text-lg font-black ${badge.accent}`}>{badge.label}</h2>
                    <p className="text-xs text-zinc-500">
                      {holders.length} holder{holders.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadBadgeHolders}
                  disabled={loadingHolders}
                  className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
                >
                  {loadingHolders ? "…" : "↻ Refresh"}
                </button>
              </div>

              {/* Current holders list */}
              <div className="px-6 pt-4 pb-2">
                {loadingHolders && holders.length === 0 ? (
                  <p className="text-sm text-zinc-500 animate-pulse py-2">Loading…</p>
                ) : holders.length === 0 ? (
                  <p className="text-sm text-zinc-600 py-2 italic">No users have this badge yet.</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {holders.map((player) => (
                      <div
                        key={player.user_id}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2.5"
                      >
                        <div>
                          <p className="font-bold text-sm text-white">{player.name ?? "Unknown"}</p>
                          <p className="text-[10px] font-mono text-zinc-600">{player.user_id}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFromBadge(player.user_id, player.name, badge.id)}
                          className="rounded-lg border border-red-700/40 bg-red-950/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-950/40 transition"
                        >
                          − Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add user row */}
                <div className="border-t border-white/5 pt-4 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                    Add a user to {badge.label}
                  </p>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <PlayerSearchInput
                        placeholder={`Search player to add as ${badge.label}…`}
                        onSelect={(player) => handleAddToBadge(player, badge.id)}
                      />
                    </div>
                    {isAdding && (
                      <span className="text-xs text-zinc-500 animate-pulse pt-2.5">Adding…</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderUserView() {
    return (
      <div className="space-y-6">
        {/* Search box */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
          <h2 className="text-lg font-black mb-1">🔍 Find a Player</h2>
          <p className="text-xs text-zinc-500 mb-4">Search by name or Discord ID to view and manage their badges.</p>

          <div ref={userSearchRef} className="relative">
            <div className="relative flex items-center">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => handleUserSearchInput(e.target.value)}
                onFocus={() => userResults.length > 0 && setUserDropdownOpen(true)}
                placeholder="Player name or Discord ID (e.g. 733871667788644445)…"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm text-white placeholder-zinc-600 focus:border-white/20 focus:outline-none"
              />
              {userSearching && (
                <span className="absolute right-3 text-zinc-500 text-xs animate-pulse">…</span>
              )}
              {!userSearching && userQuery && (
                <button
                  onClick={() => { setUserQuery(""); setUserResults([]); setUserDropdownOpen(false); }}
                  className="absolute right-3 text-zinc-500 hover:text-zinc-300 text-xs transition"
                >
                  ✕
                </button>
              )}
            </div>

            {userDropdownOpen && userResults.length > 0 && (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d14] shadow-2xl overflow-hidden">
                {userResults.map((player) => (
                  <button
                    key={player.user_id}
                    onMouseDown={() => selectUser(player.user_id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.07] transition border-b border-white/5 last:border-0"
                  >
                    <div>
                      <p className="font-bold text-sm text-white">{player.name}</p>
                      <p className="text-[10px] font-mono text-zinc-500">{player.user_id}</p>
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">Select →</span>
                  </button>
                ))}
              </div>
            )}

            {userDropdownOpen && userResults.length === 0 && userQuery.trim() && !userSearching && (
              <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-zinc-500 shadow-2xl">
                No players found for &quot;{userQuery}&quot;
              </div>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loadingUser && (
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
            <p className="text-zinc-400 animate-pulse">Loading player…</p>
          </div>
        )}

        {/* Selected player card */}
        {selectedUser && !loadingUser && (
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
            {/* Player header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/5">
              <div>
                <h2 className="text-xl font-black">{selectedUser.name ?? "Unknown Player"}</h2>
                <p className="text-[11px] font-mono text-zinc-500 mt-0.5">{selectedUser.userId}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-end pt-1">
                {displayBadges.length > 0
                  ? displayBadges.map((b) => <BadgePill key={b.id} badge={b} />)
                  : <span className="text-xs text-zinc-500 pt-1">No badges</span>
                }
              </div>
            </div>

            {/* Feedback */}
            {userMsg && (
              <div className="px-6 pt-4">
                <StatusBanner msg={userMsg} onDismiss={() => setUserMsg(null)} />
              </div>
            )}

            {/* Badge rows */}
            <div className="px-6 py-5 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Badge Management</p>
              {BADGE_OPTIONS.map((badge) => {
                const hasBadge = displayBadges.some((b) => b.id === badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                      hasBadge
                        ? "border-white/10 bg-white/[0.04]"
                        : "border-white/5 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{badge.icon}</span>
                      <div>
                        <p className="font-bold text-sm" style={{ color: badge.color }}>
                          {badge.label}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {hasBadge ? "✓ Currently assigned" : "Not assigned"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!hasBadge ? (
                        <button
                          onClick={() => handleUserBadgeAction(badge.id, "assign")}
                          disabled={actioning}
                          className="rounded-lg border border-green-700/40 bg-green-950/20 px-3 py-1.5 text-xs font-bold text-green-300 hover:bg-green-950/40 transition disabled:opacity-50"
                        >
                          + Assign
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserBadgeAction(badge.id, "remove")}
                          disabled={actioning}
                          className="rounded-lg border border-red-700/40 bg-red-950/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-950/40 transition disabled:opacity-50"
                        >
                          − Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick actions footer */}
            <div className="px-6 pb-5 flex gap-2 flex-wrap">
              <button
                onClick={() => selectUser(selectedUser.userId)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => { setSelectedUser(null); setOptimisticBadges(null); setUserMsg(null); }}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 transition"
              >
                ✕ Clear
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedUser && !loadingUser && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-zinc-500 text-sm">Search for a player above to view and manage their badges.</p>
          </div>
        )}
      </div>
    );
  }

  function renderBatchView() {
    const badgeOption = BADGE_OPTIONS.find((b) => b.id === batchBadge)!;

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-purple-700/30 bg-gradient-to-br from-purple-950/20 to-black p-6">
          <h2 className="text-lg font-black text-purple-300 mb-1">⚡ Batch Operations</h2>
          <p className="text-xs text-zinc-500 mb-6">
            Build a list of players, choose a badge and action, then run it all at once. Max 50 players per batch.
          </p>

          {/* Badge + action selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Badge</label>
              <select
                value={batchBadge}
                onChange={(e) => setBatchBadge(e.target.value as BadgeId)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-600/60"
              >
                {BADGE_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#0d0d14]">
                    {b.icon} {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Action</label>
              <select
                value={batchAction}
                onChange={(e) => setBatchAction(e.target.value as "assign" | "remove")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-600/60"
              >
                <option value="assign" className="bg-[#0d0d14]">+ Assign badge</option>
                <option value="remove" className="bg-[#0d0d14]">− Remove badge</option>
              </select>
            </div>
          </div>

          {/* Player search to add to batch */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
              Add Players to Batch
            </label>
            <div ref={batchSearchRef} className="relative">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={batchInput}
                  onChange={(e) => handleBatchSearchInput(e.target.value)}
                  onFocus={() => batchSearchResults.length > 0 && setBatchSearchOpen(true)}
                  placeholder="Search by name or Discord ID…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-8 text-sm text-white placeholder-zinc-600 focus:border-purple-600/60 focus:outline-none"
                />
                {batchSearching && (
                  <span className="absolute right-3 text-zinc-500 text-xs animate-pulse">…</span>
                )}
                {!batchSearching && batchInput && (
                  <button
                    onClick={() => { setBatchInput(""); setBatchSearchResults([]); setBatchSearchOpen(false); }}
                    className="absolute right-3 text-zinc-500 hover:text-zinc-300 text-xs transition"
                  >
                    ✕
                  </button>
                )}
              </div>

              {batchSearchOpen && batchSearchResults.length > 0 && (
                <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d14] shadow-2xl overflow-hidden">
                  {batchSearchResults.map((player) => (
                    <button
                      key={player.user_id}
                      onMouseDown={() => addToBatchList(player)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.07] transition border-b border-white/5 last:border-0"
                    >
                      <div>
                        <p className="font-bold text-sm text-white">{player.name}</p>
                        <p className="text-[10px] font-mono text-zinc-500">{player.user_id}</p>
                      </div>
                      <span className="text-xs text-zinc-500 shrink-0">
                        {batchList.some((p) => p.userId === player.user_id) ? "✓ Added" : "+ Add"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {batchSearchOpen && batchSearchResults.length === 0 && batchInput.trim() && !batchSearching && (
                <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-zinc-500 shadow-2xl">
                  No players found for &quot;{batchInput}&quot;
                </div>
              )}
            </div>
          </div>

          {/* Batch player list */}
          {batchList.length > 0 ? (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Players in Batch ({batchList.length})
                </p>
                <button
                  onClick={() => setBatchList([])}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {batchList.map((player) => (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2"
                  >
                    <div>
                      <p className="font-bold text-sm text-white">{player.name}</p>
                      <p className="text-[10px] font-mono text-zinc-600">{player.userId}</p>
                    </div>
                    <button
                      onClick={() => removeFromBatchList(player.userId)}
                      className="text-xs text-zinc-500 hover:text-red-400 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-5 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-6 text-center">
              <p className="text-sm text-zinc-600">No players added yet. Search above to add players.</p>
            </div>
          )}

          {/* Run button */}
          <button
            onClick={handleBatchAction}
            disabled={batchRunning || batchList.length === 0}
            className="w-full rounded-xl border border-purple-700/40 bg-purple-950/20 py-3 text-sm font-black text-purple-300 hover:bg-purple-950/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {batchRunning
              ? "Running…"
              : `${batchAction === "assign" ? "+ Assign" : "− Remove"} ${badgeOption.icon} ${badgeOption.label} → ${batchList.length} player${batchList.length !== 1 ? "s" : ""}`}
          </button>

          {/* Batch feedback */}
          {batchMsg && (
            <div className="mt-4">
              <StatusBanner msg={batchMsg} onDismiss={() => setBatchMsg(null)} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const TAB_CONFIG: { id: MainTab; label: string; icon: string; desc: string }[] = [
    { id: "badge", label: "By Badge",  icon: "🏅", desc: "See all holders per badge, add or remove users" },
    { id: "user",  label: "By User",   icon: "👤", desc: "Search a player and manage all their badges" },
    { id: "batch", label: "Batch",     icon: "⚡", desc: "Assign or remove a badge from multiple users at once" },
  ];

  return (
    <Shell>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">🏅 Badge Manager</h1>
          <p className="mt-2 text-zinc-400 text-sm">
            Assign and remove Staff, Content Creator, and Tournament Winner badges. Developer access only.
          </p>
        </div>

        {/* Sync controls */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => handleSyncRoles(false)}
              disabled={syncing}
              className="rounded-xl border border-blue-700/40 bg-blue-950/20 px-4 py-2 text-xs font-bold text-blue-300 hover:bg-blue-950/40 transition disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "⚡ Sync Roles"}
            </button>
            <button
              onClick={() => handleSyncRoles(true)}
              disabled={syncing}
              className="rounded-xl border border-orange-700/40 bg-orange-950/20 px-4 py-2 text-xs font-bold text-orange-300 hover:bg-orange-950/40 transition disabled:opacity-50"
            >
              {syncing ? "…" : "🔄 Force Sync"}
            </button>
          </div>
          {syncResult && (
            <p className="text-[11px] text-zinc-400 max-w-xs text-right">{syncResult}</p>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold transition ${
              activeTab === tab.id
                ? "border-red-600/50 bg-red-950/20 text-white"
                : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="text-xs text-zinc-500 mb-6 -mt-2">
        {TAB_CONFIG.find((t) => t.id === activeTab)?.desc}
      </p>

      {/* Tab content */}
      {activeTab === "badge" && renderBadgeView()}
      {activeTab === "user"  && renderUserView()}
      {activeTab === "batch" && renderBatchView()}
    </Shell>
  );
}
