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
      className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-black shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${badge.color}44, ${badge.color}22)`,
        border: `2px solid ${badge.color}90`,
        color: badge.color,
        textShadow: `0 0 12px ${badge.color}80`,
        boxShadow: `0 0 16px ${badge.color}30`,
      }}
      title={badge.description}
    >
      <span className="text-base">{badge.icon}</span>
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
      className={`flex items-center justify-between rounded-2xl border-2 px-6 py-4 text-base font-black shadow-xl ${
        msg.type === "success"
          ? "border-green-400/60 bg-green-950/40 text-green-300 shadow-green-900/40"
          : "border-red-400/60 bg-red-950/40 text-red-300 shadow-red-900/40"
      }`}
    >
      <span className="text-lg">{msg.text}</span>
      <button onClick={onDismiss} className="ml-4 text-lg opacity-60 hover:opacity-100 transition font-black">✕</button>
    </div>
  );
}

function PlayerInitials({ name }: { name: string | null }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";
  return (
    <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-black"
      style={{ background: "linear-gradient(135deg, #00FF88, #00D4FF)" }}>
      {initials}
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
        <span className="absolute left-4 text-xl text-cyan-400 pointer-events-none">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "🔎 Search by name or Discord ID…"}
          className="w-full rounded-2xl border-2 border-cyan-700/50 bg-zinc-900 px-4 py-3 pl-12 pr-10 text-base font-bold text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none focus:shadow-[0_0_20px_rgba(0,212,255,0.25)] transition-all"
        />
        {searching && (
          <span className="absolute right-4 text-cyan-400 text-sm animate-pulse font-black">⟳</span>
        )}
        {!searching && query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-4 text-zinc-400 hover:text-white text-base transition font-black"
          >
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border-2 border-cyan-700/40 bg-zinc-900 shadow-[0_8px_40px_rgba(0,212,255,0.15)] overflow-hidden">
          {results.map((player, i) => (
            <button
              key={player.user_id}
              onMouseDown={() => handleSelect(player)}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-cyan-950/40 transition border-b border-white/5 last:border-0 ${i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800/50"}`}
            >
              <PlayerInitials name={player.name} />
              <div className="flex-1">
                <p className="font-black text-base text-white">{player.name}</p>
                <p className="text-xs font-mono text-zinc-500">{player.user_id}</p>
              </div>
              <span className="text-sm font-black text-cyan-400 shrink-0">➕ Add</span>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && query.trim() && !searching && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border-2 border-zinc-700 bg-zinc-900 px-5 py-4 text-base font-bold text-zinc-400 shadow-2xl">
          😕 No players found for &quot;{query}&quot;
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
      <div className="space-y-8">
        {/* Global feedback */}
        {badgeMsg && (
          <StatusBanner msg={badgeMsg} onDismiss={() => setBadgeMsg(null)} />
        )}

        {/* Section label */}
        <div className="flex items-center gap-4">
          <div className="h-1 flex-1 rounded-full" style={{ background: "linear-gradient(90deg, #00FF88, transparent)" }} />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-green-400">🏅 Badge Holders</span>
          <div className="h-1 flex-1 rounded-full" style={{ background: "linear-gradient(270deg, #00FF88, transparent)" }} />
        </div>

        {/* One card per badge */}
        {BADGE_OPTIONS.map((badge) => {
          const holders = holdersForBadge(badge.id);
          const isAdding = addingTo === badge.id;

          return (
            <div
              key={badge.id}
              className="rounded-3xl overflow-hidden"
              style={{
                border: `2px solid ${badge.color}50`,
                boxShadow: `0 0 40px ${badge.color}15, inset 0 1px 0 ${badge.color}20`,
                background: `linear-gradient(135deg, ${badge.color}08 0%, #09090b 60%)`,
              }}
            >
              {/* Badge header */}
              <div
                className="flex items-center justify-between px-8 py-5"
                style={{
                  borderBottom: `2px solid ${badge.color}25`,
                  background: `linear-gradient(90deg, ${badge.color}15, transparent)`,
                }}
              >
                <div className="flex items-center gap-4">
                  <span
                    className="text-5xl drop-shadow-lg"
                    style={{ filter: `drop-shadow(0 0 12px ${badge.color}80)` }}
                  >
                    {badge.icon}
                  </span>
                  <div>
                    <h2
                      className="text-2xl font-black tracking-tight"
                      style={{ color: badge.color, textShadow: `0 0 20px ${badge.color}60` }}
                    >
                      {badge.label}
                    </h2>
                    <p className="text-sm font-bold text-zinc-400 mt-0.5">
                      <span
                        className="font-black text-lg"
                        style={{ color: badge.color }}
                      >
                        {holders.length}
                      </span>{" "}
                      holder{holders.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadBadgeHolders}
                  disabled={loadingHolders}
                  className="rounded-2xl border-2 border-white/20 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 hover:border-white/40 transition-all disabled:opacity-50"
                >
                  {loadingHolders ? "⟳ Loading…" : "↻ Refresh"}
                </button>
              </div>

              {/* Current holders list */}
              <div className="px-8 pt-6 pb-4">
                {loadingHolders && holders.length === 0 ? (
                  <p className="text-base font-bold text-zinc-500 animate-pulse py-4">⟳ Loading holders…</p>
                ) : holders.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-zinc-700 py-8 text-center mb-4">
                    <p className="text-3xl mb-2">🫙</p>
                    <p className="text-base font-bold text-zinc-500">No users have this badge yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: badge.color }}>
                      ▼ Current Holders
                    </p>
                    {holders.map((player, i) => (
                      <div
                        key={player.user_id}
                        className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all hover:scale-[1.01]"
                        style={{
                          background: i % 2 === 0
                            ? `linear-gradient(90deg, ${badge.color}08, transparent)`
                            : "rgba(255,255,255,0.02)",
                          border: `1px solid ${badge.color}20`,
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <PlayerInitials name={player.name} />
                          <div>
                            <p className="font-black text-lg text-white">{player.name ?? "Unknown"}</p>
                            <p className="text-xs font-mono text-zinc-500">{player.user_id}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFromBadge(player.user_id, player.name, badge.id)}
                          className="rounded-xl border-2 border-red-500/50 bg-red-950/30 px-5 py-2.5 text-sm font-black text-red-300 hover:bg-red-500/20 hover:border-red-400 hover:text-red-200 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all active:scale-95"
                        >
                          🗑️ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add user row */}
                <div
                  className="rounded-2xl p-5"
                  style={{
                    border: `2px dashed ${badge.color}40`,
                    background: `${badge.color}05`,
                  }}
                >
                  <p className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: badge.color }}>
                    ➕ Add a Player to {badge.label}
                  </p>
                  <div className="flex gap-3 items-start">
                    <div className="flex-1">
                      <PlayerSearchInput
                        placeholder={`🔎 Search player to grant ${badge.label}…`}
                        onSelect={(player) => handleAddToBadge(player, badge.id)}
                      />
                    </div>
                    {isAdding && (
                      <span className="text-sm font-black text-cyan-400 animate-pulse pt-3.5">⟳ Adding…</span>
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
      <div className="space-y-8">
        {/* Section label */}
        <div className="flex items-center gap-4">
          <div className="h-1 flex-1 rounded-full" style={{ background: "linear-gradient(90deg, #00D4FF, transparent)" }} />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400">👤 Player Badge Manager</span>
          <div className="h-1 flex-1 rounded-full" style={{ background: "linear-gradient(270deg, #00D4FF, transparent)" }} />
        </div>

        {/* Search box */}
        <div
          className="rounded-3xl p-8"
          style={{
            border: "2px solid rgba(0,212,255,0.35)",
            background: "linear-gradient(135deg, rgba(0,212,255,0.06) 0%, #09090b 70%)",
            boxShadow: "0 0 50px rgba(0,212,255,0.08)",
          }}
        >
          <h2 className="text-2xl font-black text-cyan-300 mb-1">🔍 Find a Player</h2>
          <p className="text-sm font-bold text-zinc-400 mb-6">Search by name or Discord ID to view and manage their badges.</p>

          <div ref={userSearchRef} className="relative">
            <div className="relative flex items-center">
              <span className="absolute left-4 text-xl text-cyan-400 pointer-events-none">🔍</span>
              <input
                type="text"
                value={userQuery}
                onChange={(e) => handleUserSearchInput(e.target.value)}
                onFocus={() => userResults.length > 0 && setUserDropdownOpen(true)}
                placeholder="🔎 Player name or Discord ID (e.g. 733871667788644445)…"
                className="w-full rounded-2xl border-2 border-cyan-700/50 bg-zinc-900 px-4 py-4 pl-12 pr-10 text-base font-bold text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none focus:shadow-[0_0_20px_rgba(0,212,255,0.25)] transition-all"
              />
              {userSearching && (
                <span className="absolute right-4 text-cyan-400 text-sm animate-pulse font-black">⟳</span>
              )}
              {!userSearching && userQuery && (
                <button
                  onClick={() => { setUserQuery(""); setUserResults([]); setUserDropdownOpen(false); }}
                  className="absolute right-4 text-zinc-400 hover:text-white text-base transition font-black"
                >
                  ✕
                </button>
              )}
            </div>

            {userDropdownOpen && userResults.length > 0 && (
              <div className="absolute z-30 mt-2 w-full rounded-2xl border-2 border-cyan-700/40 bg-zinc-900 shadow-[0_8px_40px_rgba(0,212,255,0.15)] overflow-hidden">
                {userResults.map((player, i) => (
                  <button
                    key={player.user_id}
                    onMouseDown={() => selectUser(player.user_id)}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-cyan-950/40 transition border-b border-white/5 last:border-0 ${i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800/50"}`}
                  >
                    <PlayerInitials name={player.name} />
                    <div className="flex-1">
                      <p className="font-black text-base text-white">{player.name}</p>
                      <p className="text-xs font-mono text-zinc-500">{player.user_id}</p>
                    </div>
                    <span className="text-sm font-black text-cyan-400 shrink-0">👆 Select</span>
                  </button>
                ))}
              </div>
            )}

            {userDropdownOpen && userResults.length === 0 && userQuery.trim() && !userSearching && (
              <div className="absolute z-30 mt-2 w-full rounded-2xl border-2 border-zinc-700 bg-zinc-900 px-5 py-4 text-base font-bold text-zinc-400 shadow-2xl">
                😕 No players found for &quot;{userQuery}&quot;
              </div>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loadingUser && (
          <div className="rounded-3xl border-2 border-cyan-700/30 bg-zinc-900/50 p-12 text-center">
            <p className="text-2xl font-black text-cyan-400 animate-pulse">⟳ Loading player…</p>
          </div>
        )}

        {/* Selected player card */}
        {selectedUser && !loadingUser && (
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              border: "2px solid rgba(0,212,255,0.40)",
              boxShadow: "0 0 60px rgba(0,212,255,0.10)",
              background: "linear-gradient(135deg, rgba(0,212,255,0.06) 0%, #09090b 60%)",
            }}
          >
            {/* Player header */}
            <div
              className="flex items-start justify-between gap-6 px-8 py-6"
              style={{
                borderBottom: "2px solid rgba(0,212,255,0.20)",
                background: "linear-gradient(90deg, rgba(0,212,255,0.12), transparent)",
              }}
            >
              <div className="flex items-center gap-5">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl text-black flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #00FF88, #00D4FF)", boxShadow: "0 0 20px rgba(0,212,255,0.40)" }}
                >
                  {selectedUser.name ? selectedUser.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "??"}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white">{selectedUser.name ?? "Unknown Player"}</h2>
                  <p className="text-xs font-mono text-zinc-500 mt-1">{selectedUser.userId}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end pt-1">
                {displayBadges.length > 0
                  ? displayBadges.map((b) => <BadgePill key={b.id} badge={b} />)
                  : <span className="text-sm font-bold text-zinc-500 pt-2">No badges yet</span>
                }
              </div>
            </div>

            {/* Feedback */}
            {userMsg && (
              <div className="px-8 pt-6">
                <StatusBanner msg={userMsg} onDismiss={() => setUserMsg(null)} />
              </div>
            )}

            {/* Badge rows */}
            <div className="px-8 py-6 space-y-4">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-400 mb-4">🎖️ Badge Management</p>
              {BADGE_OPTIONS.map((badge) => {
                const hasBadge = displayBadges.some((b) => b.id === badge.id);
                return (
                  <div
                    key={badge.id}
                    className="flex items-center justify-between rounded-2xl px-6 py-5 transition-all"
                    style={{
                      border: hasBadge ? `2px solid ${badge.color}50` : "2px solid rgba(255,255,255,0.06)",
                      background: hasBadge
                        ? `linear-gradient(90deg, ${badge.color}10, transparent)`
                        : "rgba(255,255,255,0.02)",
                      boxShadow: hasBadge ? `0 0 20px ${badge.color}10` : "none",
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className="text-4xl"
                        style={{ filter: hasBadge ? `drop-shadow(0 0 10px ${badge.color}80)` : "none" }}
                      >
                        {badge.icon}
                      </span>
                      <div>
                        <p className="font-black text-lg" style={{ color: hasBadge ? badge.color : "#a1a1aa" }}>
                          {badge.label}
                        </p>
                        <p className="text-sm font-bold" style={{ color: hasBadge ? `${badge.color}90` : "#52525b" }}>
                          {hasBadge ? "✅ Currently assigned" : "⬜ Not assigned"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {!hasBadge ? (
                        <button
                          onClick={() => handleUserBadgeAction(badge.id, "assign")}
                          disabled={actioning}
                          className="rounded-xl border-2 border-green-500/50 bg-green-950/30 px-6 py-3 text-sm font-black text-green-300 hover:bg-green-500/20 hover:border-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all active:scale-95 disabled:opacity-50"
                        >
                          ✅ Assign Badge
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserBadgeAction(badge.id, "remove")}
                          disabled={actioning}
                          className="rounded-xl border-2 border-red-500/50 bg-red-950/30 px-6 py-3 text-sm font-black text-red-300 hover:bg-red-500/20 hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all active:scale-95 disabled:opacity-50"
                        >
                          🗑️ Remove Badge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick actions footer */}
            <div className="px-8 pb-6 flex gap-3 flex-wrap border-t border-white/5 pt-5">
              <button
                onClick={() => selectUser(selectedUser.userId)}
                className="rounded-xl border-2 border-white/20 bg-white/5 px-5 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 hover:border-white/40 transition-all"
              >
                ↻ Refresh Player
              </button>
              <button
                onClick={() => { setSelectedUser(null); setOptimisticBadges(null); setUserMsg(null); }}
                className="rounded-xl border-2 border-zinc-700 bg-zinc-800/50 px-5 py-2.5 text-sm font-black text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 transition-all"
              >
                ✕ Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedUser && !loadingUser && (
          <div
            className="rounded-3xl border-2 border-dashed border-zinc-700 py-16 text-center"
            style={{ background: "rgba(255,255,255,0.01)" }}
          >
            <p className="text-6xl mb-4">👤</p>
            <p className="text-xl font-black text-zinc-400 mb-2">No Player Selected</p>
            <p className="text-sm font-bold text-zinc-600">Search for a player above to view and manage their badges.</p>
          </div>
        )}
      </div>
    );
  }

  function renderBatchView() {
    const badgeOption = BADGE_OPTIONS.find((b) => b.id === batchBadge)!;

    return (
      <div className="space-y-8">
        {/* Section label */}
        <div className="flex items-center gap-4">
          <div className="h-1 flex-1 rounded-full" style={{ background: "linear-gradient(90deg, #a855f7, transparent)" }} />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-purple-400">⚡ Batch Operations</span>
          <div className="h-1 flex-1 rounded-full" style={{ background: "linear-gradient(270deg, #a855f7, transparent)" }} />
        </div>

        <div
          className="rounded-3xl p-8"
          style={{
            border: "2px solid rgba(168,85,247,0.40)",
            background: "linear-gradient(135deg, rgba(168,85,247,0.08) 0%, #09090b 70%)",
            boxShadow: "0 0 60px rgba(168,85,247,0.10)",
          }}
        >
          <h2 className="text-2xl font-black text-purple-300 mb-1">⚡ Batch Operations</h2>
          <p className="text-sm font-bold text-zinc-400 mb-8">
            Build a list of players, choose a badge and action, then run it all at once. Max 50 players per batch.
          </p>

          {/* Badge + action selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-purple-400 mb-3">🏅 Badge</label>
              <select
                value={batchBadge}
                onChange={(e) => setBatchBadge(e.target.value as BadgeId)}
                className="w-full rounded-2xl border-2 border-purple-700/50 bg-zinc-900 px-4 py-4 text-base font-black text-white focus:outline-none focus:border-purple-400 focus:shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-all"
              >
                {BADGE_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id} className="bg-zinc-900">
                    {b.icon} {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-purple-400 mb-3">⚙️ Action</label>
              <select
                value={batchAction}
                onChange={(e) => setBatchAction(e.target.value as "assign" | "remove")}
                className="w-full rounded-2xl border-2 border-purple-700/50 bg-zinc-900 px-4 py-4 text-base font-black text-white focus:outline-none focus:border-purple-400 focus:shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-all"
              >
                <option value="assign" className="bg-zinc-900">✅ Assign badge</option>
                <option value="remove" className="bg-zinc-900">🗑️ Remove badge</option>
              </select>
            </div>
          </div>

          {/* Player search to add to batch */}
          <div className="mb-6">
            <label className="block text-xs font-black uppercase tracking-widest text-purple-400 mb-3">
              👥 Add Players to Batch
            </label>
            <div ref={batchSearchRef} className="relative">
              <div className="relative flex items-center">
                <span className="absolute left-4 text-xl text-purple-400 pointer-events-none">🔍</span>
                <input
                  type="text"
                  value={batchInput}
                  onChange={(e) => handleBatchSearchInput(e.target.value)}
                  onFocus={() => batchSearchResults.length > 0 && setBatchSearchOpen(true)}
                  placeholder="🔎 Search by name or Discord ID…"
                  className="w-full rounded-2xl border-2 border-purple-700/50 bg-zinc-900 px-4 py-4 pl-12 pr-10 text-base font-bold text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-all"
                />
                {batchSearching && (
                  <span className="absolute right-4 text-purple-400 text-sm animate-pulse font-black">⟳</span>
                )}
                {!batchSearching && batchInput && (
                  <button
                    onClick={() => { setBatchInput(""); setBatchSearchResults([]); setBatchSearchOpen(false); }}
                    className="absolute right-4 text-zinc-400 hover:text-white text-base transition font-black"
                  >
                    ✕
                  </button>
                )}
              </div>

              {batchSearchOpen && batchSearchResults.length > 0 && (
                <div className="absolute z-30 mt-2 w-full rounded-2xl border-2 border-purple-700/40 bg-zinc-900 shadow-[0_8px_40px_rgba(168,85,247,0.15)] overflow-hidden">
                  {batchSearchResults.map((player, i) => (
                    <button
                      key={player.user_id}
                      onMouseDown={() => addToBatchList(player)}
                      className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-purple-950/40 transition border-b border-white/5 last:border-0 ${i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800/50"}`}
                    >
                      <PlayerInitials name={player.name} />
                      <div className="flex-1">
                        <p className="font-black text-base text-white">{player.name}</p>
                        <p className="text-xs font-mono text-zinc-500">{player.user_id}</p>
                      </div>
                      <span className="text-sm font-black shrink-0" style={{ color: batchList.some((p) => p.userId === player.user_id) ? "#22c55e" : "#a855f7" }}>
                        {batchList.some((p) => p.userId === player.user_id) ? "✅ Added" : "➕ Add"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {batchSearchOpen && batchSearchResults.length === 0 && batchInput.trim() && !batchSearching && (
                <div className="absolute z-30 mt-2 w-full rounded-2xl border-2 border-zinc-700 bg-zinc-900 px-5 py-4 text-base font-bold text-zinc-400 shadow-2xl">
                  😕 No players found for &quot;{batchInput}&quot;
                </div>
              )}
            </div>
          </div>

          {/* Batch player list */}
          {batchList.length > 0 ? (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black uppercase tracking-widest text-purple-400">
                  👥 Players in Batch
                  <span className="ml-2 rounded-full bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 text-purple-300">
                    {batchList.length}
                  </span>
                </p>
                <button
                  onClick={() => setBatchList([])}
                  className="rounded-xl border-2 border-red-700/40 bg-red-950/20 px-4 py-2 text-sm font-black text-red-400 hover:bg-red-950/40 hover:border-red-500 transition-all"
                >
                  🗑️ Clear All
                </button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {batchList.map((player, i) => (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all"
                    style={{
                      background: i % 2 === 0 ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(168,85,247,0.20)",
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <PlayerInitials name={player.name} />
                      <div>
                        <p className="font-black text-base text-white">{player.name}</p>
                        <p className="text-xs font-mono text-zinc-500">{player.userId}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromBatchList(player.userId)}
                      className="rounded-xl border-2 border-red-700/40 bg-red-950/20 px-4 py-2 text-sm font-black text-red-400 hover:bg-red-950/40 hover:border-red-500 transition-all"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-8 rounded-2xl border-2 border-dashed border-purple-700/30 py-10 text-center">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-base font-black text-zinc-500">No players added yet.</p>
              <p className="text-sm font-bold text-zinc-600 mt-1">Search above to add players to the batch.</p>
            </div>
          )}

          {/* Run button */}
          <button
            onClick={handleBatchAction}
            disabled={batchRunning || batchList.length === 0}
            className="w-full rounded-2xl border-2 border-purple-500/60 bg-purple-950/30 py-5 text-lg font-black text-purple-200 hover:bg-purple-500/20 hover:border-purple-400 hover:shadow-[0_0_30px_rgba(168,85,247,0.30)] transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            {batchRunning
              ? "⟳ Running Batch…"
              : `${batchAction === "assign" ? "✅ Assign" : "🗑️ Remove"} ${badgeOption.icon} ${badgeOption.label} → ${batchList.length} player${batchList.length !== 1 ? "s" : ""}`}
          </button>

          {/* Batch feedback */}
          {batchMsg && (
            <div className="mt-6">
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

  const TAB_CONFIG: { id: MainTab; label: string; icon: string; desc: string; color: string; glow: string }[] = [
    { id: "badge", label: "Badge View",  icon: "🏅", desc: "See all holders per badge, add or remove users", color: "#00FF88", glow: "rgba(0,255,136,0.25)" },
    { id: "user",  label: "User View",   icon: "👤", desc: "Search a player and manage all their badges",    color: "#00D4FF", glow: "rgba(0,212,255,0.25)" },
    { id: "batch", label: "Batch View",  icon: "⚡", desc: "Assign or remove a badge from multiple users at once", color: "#a855f7", glow: "rgba(168,85,247,0.25)" },
  ];

  const activeTabConfig = TAB_CONFIG.find((t) => t.id === activeTab)!;

  return (
    <Shell>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO BANNER                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="relative mb-10 rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a0a14 0%, #0d0d1a 40%, #0a0a14 100%)",
          border: "2px solid rgba(0,255,136,0.30)",
          boxShadow: "0 0 80px rgba(0,255,136,0.08), 0 0 40px rgba(0,212,255,0.06)",
        }}
      >
        {/* Decorative gradient blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #00FF88, transparent)", transform: "translate(-30%, -30%)" }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #00D4FF, transparent)", transform: "translate(30%, 30%)" }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-32 opacity-5 pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #FFD700, transparent)", transform: "translate(-50%, -50%)" }} />

        <div className="relative px-8 py-10 flex flex-wrap items-center justify-between gap-6">
          {/* Title block */}
          <div>
            <div className="flex items-center gap-4 mb-3">
              <span className="text-6xl" style={{ filter: "drop-shadow(0 0 20px rgba(0,255,136,0.80))" }}>🏅</span>
              <div>
                <h1
                  className="text-5xl font-black tracking-tight leading-none"
                  style={{
                    background: "linear-gradient(90deg, #00FF88, #00D4FF, #FFD700)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    textShadow: "none",
                    filter: "drop-shadow(0 0 30px rgba(0,255,136,0.40))",
                  }}
                >
                  BADGE MANAGER
                </h1>
                <p className="text-sm font-bold text-zinc-400 mt-1">
                  🔐 Developer Access Only — Assign &amp; Remove Badges
                </p>
              </div>
            </div>

            {/* Badge type pills */}
            <div className="flex flex-wrap gap-2 mt-4">
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

          {/* Sync controls */}
          <div className="flex flex-col items-end gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">🔄 Role Sync</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleSyncRoles(false)}
                disabled={syncing}
                className="rounded-2xl border-2 border-blue-500/50 bg-blue-950/30 px-5 py-3 text-sm font-black text-blue-300 hover:bg-blue-500/20 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.30)] transition-all active:scale-95 disabled:opacity-50"
              >
                {syncing ? "⟳ Syncing…" : "⚡ Sync Roles"}
              </button>
              <button
                onClick={() => handleSyncRoles(true)}
                disabled={syncing}
                className="rounded-2xl border-2 border-orange-500/50 bg-orange-950/30 px-5 py-3 text-sm font-black text-orange-300 hover:bg-orange-500/20 hover:border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.30)] transition-all active:scale-95 disabled:opacity-50"
              >
                {syncing ? "⟳" : "🔄 Force Sync"}
              </button>
            </div>
            {syncResult && (
              <p className="text-xs font-bold text-zinc-400 max-w-xs text-right bg-zinc-900/60 rounded-xl px-3 py-2 border border-white/10">
                {syncResult}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* GIANT TAB BAR                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {TAB_CONFIG.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative rounded-2xl p-5 text-left transition-all duration-200 active:scale-[0.98]"
              style={{
                border: isActive ? `2px solid ${tab.color}70` : "2px solid rgba(255,255,255,0.08)",
                background: isActive
                  ? `linear-gradient(135deg, ${tab.color}15, ${tab.color}05)`
                  : "rgba(255,255,255,0.02)",
                boxShadow: isActive ? `0 0 30px ${tab.glow}, inset 0 1px 0 ${tab.color}20` : "none",
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div
                  className="absolute top-0 left-6 right-6 h-0.5 rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent, ${tab.color}, transparent)` }}
                />
              )}
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="text-3xl"
                  style={{ filter: isActive ? `drop-shadow(0 0 10px ${tab.color}90)` : "none" }}
                >
                  {tab.icon}
                </span>
                <span
                  className="text-lg font-black"
                  style={{ color: isActive ? tab.color : "#a1a1aa" }}
                >
                  {tab.label}
                </span>
              </div>
              <p className="text-xs font-bold" style={{ color: isActive ? `${tab.color}90` : "#52525b" }}>
                {tab.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active tab accent line */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="h-0.5 flex-1 rounded-full"
          style={{ background: `linear-gradient(90deg, ${activeTabConfig.color}60, transparent)` }}
        />
        <span
          className="text-xs font-black uppercase tracking-[0.3em]"
          style={{ color: activeTabConfig.color }}
        >
          {activeTabConfig.icon} {activeTabConfig.label}
        </span>
        <div
          className="h-0.5 flex-1 rounded-full"
          style={{ background: `linear-gradient(270deg, ${activeTabConfig.color}60, transparent)` }}
        />
      </div>

      {/* Tab content */}
      {activeTab === "badge" && renderBadgeView()}
      {activeTab === "user"  && renderUserView()}
      {activeTab === "batch" && renderBatchView()}
    </Shell>
  );
}
