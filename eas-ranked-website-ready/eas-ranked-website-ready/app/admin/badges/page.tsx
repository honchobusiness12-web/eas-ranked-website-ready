"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

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
  cr?: number;
  wins?: number;
  losses?: number;
}

interface PlayerBadgeData {
  userId: string;
  name: string | null;
  badges: BadgeInfo[];
  roles: string[];
  cr: number;
  wins: number;
  losses: number;
  matches: number;
  exists: boolean;
}

interface DiscordRoleMember {
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

const BADGE_OPTIONS = [
  { id: "staff",           label: "Staff",            icon: "👮", color: "#00FF88" },
  { id: "contentCreator",  label: "Content Creator",  icon: "🎬", color: "#00D4FF" },
  { id: "tournamentWinner",label: "Tournament Winner", icon: "🏆", color: "#FFD700" },
] as const;

type BadgeId = (typeof BADGE_OPTIONS)[number]["id"];

type SidebarTab = "all" | "contentCreator" | "staff" | "premium";

const SIDEBAR_TABS: { id: SidebarTab; label: string; icon: string }[] = [
  { id: "all",           label: "All Players",     icon: "👥" },
  { id: "contentCreator",label: "Content Creators", icon: "🎬" },
  { id: "staff",         label: "Staff",            icon: "👮" },
  { id: "premium",       label: "Premium",          icon: "💎" },
];

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

export default function AdminBadgesPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // ── Search All Players ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]       = useState("");
  const [searchResults, setSearchResults]   = useState<PlayerRow[]>([]);
  const [searching, setSearching]           = useState(false);
  const [showDropdown, setShowDropdown]     = useState(false);
  const searchDebounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Quick Add ───────────────────────────────────────────────────────────
  const [quickAddId, setQuickAddId]         = useState("");
  const [quickAddName, setQuickAddName]     = useState("");
  const [quickAdding, setQuickAdding]       = useState(false);
  const [quickAddMsg, setQuickAddMsg]       = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Selected player ─────────────────────────────────────────────────────
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerBadgeData | null>(null);
  const [loadingPlayer, setLoadingPlayer]   = useState(false);

  // ── All-players sidebar list ─────────────────────────────────────────────
  const [allPlayers, setAllPlayers]         = useState<PlayerRow[]>([]);
  const [loadingAll, setLoadingAll]         = useState(false);
  const [sidebarSearch, setSidebarSearch]   = useState("");

  // ── Discord role member lists ────────────────────────────────────────────
  const [ccMembers, setCcMembers]           = useState<DiscordRoleMember[]>([]);
  const [staffMembers, setStaffMembers]     = useState<DiscordRoleMember[]>([]);
  const [premiumMembers, setPremiumMembers] = useState<DiscordRoleMember[]>([]);
  const [loadingRole, setLoadingRole]       = useState<SidebarTab | null>(null);

  // ── Sidebar tab ──────────────────────────────────────────────────────────
  const [sidebarTab, setSidebarTab]         = useState<SidebarTab>("all");

  // ── Sync-roles state ─────────────────────────────────────────────────────
  const [syncing, setSyncing]               = useState(false);
  const [syncResult, setSyncResult]         = useState<string | null>(null);

  // ── Action state ─────────────────────────────────────────────────────────
  const [actionMsg, setActionMsg]           = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actioning, setActioning] = useState(false);

  // Auth check
  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((data) => {
        setIsOwner(data.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // ── Load all players for sidebar ─────────────────────────────────────────
  const loadAllPlayers = useCallback(async () => {
    setLoadingAll(true);
    try {
      const res = await fetch("/api/admin/badges");
      if (res.ok) {
        const data = await res.json();
        setAllPlayers(data.players ?? []);
      }
    } finally {
      setLoadingAll(false);
    }
  }, []);

  // ── Load Discord role members for a given tab ────────────────────────────
  const loadRoleMembers = useCallback(async (tab: SidebarTab, force = false) => {
    if (tab === "all") return;
    setLoadingRole(tab);
    try {
      const params = new URLSearchParams({ role: tab });
      if (force) params.set("force", "true");
      const res = await fetch(`/api/admin/badges?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const members: DiscordRoleMember[] = data.members ?? [];
        if (tab === "contentCreator") setCcMembers(members);
        else if (tab === "staff")     setStaffMembers(members);
        else if (tab === "premium")   setPremiumMembers(members);
      }
    } finally {
      setLoadingRole(null);
    }
  }, []);

  useEffect(() => {
    if (isOwner) {
      loadAllPlayers();
    }
  }, [isOwner, loadAllPlayers]);

  // Load role members when switching tabs
  useEffect(() => {
    if (!isOwner || sidebarTab === "all") return;
    const alreadyLoaded =
      (sidebarTab === "contentCreator" && ccMembers.length > 0) ||
      (sidebarTab === "staff"          && staffMembers.length > 0) ||
      (sidebarTab === "premium"        && premiumMembers.length > 0);
    if (!alreadyLoaded) {
      loadRoleMembers(sidebarTab);
    }
  }, [sidebarTab, isOwner, ccMembers.length, staffMembers.length, premiumMembers.length, loadRoleMembers]);

  // ── Live search with debounce ────────────────────────────────────────────
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/badges?search=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.players ?? []);
          setShowDropdown(true);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  async function selectPlayer(userId: string) {
    setShowDropdown(false);
    setSearchQuery("");
    setSearchResults([]);
    setLoadingPlayer(true);
    setSelectedPlayer(null);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/badges?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPlayer(data);
      }
    } finally {
      setLoadingPlayer(false);
    }
  }

  // Refresh the selected player's data without clearing the action message
  async function refreshSelectedPlayer(userId: string) {
    try {
      const res = await fetch(`/api/admin/badges?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPlayer(data);
      }
    } catch {
      // silently ignore refresh errors
    }
  }

  async function handleBadgeAction(badge: BadgeId, action: "assign" | "remove") {
    if (!selectedPlayer) return;
    setActioning(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/badges", {
        method: action === "assign" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedPlayer.userId, badge }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg({
          type: "success",
          text: `✅ Badge "${badge}" ${action === "assign" ? "assigned to" : "removed from"} ${selectedPlayer.name ?? selectedPlayer.userId}`,
        });
        // Refresh player data without clearing the success message
        await refreshSelectedPlayer(selectedPlayer.userId);
        loadAllPlayers();
      } else {
        setActionMsg({ type: "error", text: data.error ?? "Action failed." });
      }
    } catch {
      setActionMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setActioning(false);
    }
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAddId.trim()) return;
    setQuickAdding(true);
    setQuickAddMsg(null);
    try {
      const res = await fetch("/api/admin/badges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: quickAddId.trim(), name: quickAddName.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuickAddMsg({
          type: "success",
          text: data.created
            ? `✅ Created player record for "${data.name}" (${data.userId})`
            : `ℹ️ Player "${data.name}" already exists — loaded their profile`,
        });
        setQuickAddId("");
        setQuickAddName("");
        // Select the player immediately
        setSelectedPlayer({
          userId:  data.userId,
          name:    data.name,
          badges:  data.badges,
          roles:   data.roles,
          cr:      data.cr,
          wins:    data.wins,
          losses:  data.losses,
          matches: data.matches,
          exists:  true,
        });
        setActionMsg(null);
        loadAllPlayers();
      } else {
        setQuickAddMsg({ type: "error", text: data.error ?? "Failed to add player." });
      }
    } catch {
      setQuickAddMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setQuickAdding(false);
    }
  }

  async function handleSyncRoles(force = false) {
    setSyncing(true);
    setSyncResult(null);
    try {
      const url = force
        ? "/api/admin/sync-roles?force=true"
        : "/api/admin/sync-roles";
      const res = await fetch(url, { method: "POST" });
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
        loadAllPlayers();
        if (force) {
          loadRoleMembers("contentCreator", true);
          loadRoleMembers("staff", true);
          loadRoleMembers("premium", true);
        }
      } else {
        setSyncResult(`❌ ${data.error ?? "Sync failed."}`);
      }
    } catch {
      setSyncResult("❌ Unexpected error during sync.");
    } finally {
      setSyncing(false);
    }
  }

  // ── Filtered sidebar list ────────────────────────────────────────────────
  const filteredAllPlayers = sidebarSearch.trim()
    ? allPlayers.filter((p) =>
        p.name?.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
        p.user_id.includes(sidebarSearch.trim())
      )
    : allPlayers;

  // -------------------------------------------------------------------------
  // Auth gate
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Sidebar content for the active tab
  // -------------------------------------------------------------------------

  function renderSidebarContent() {
    if (sidebarTab === "all") {
      return (
        <>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h2 className="text-lg font-black">👥 All Players</h2>
            <button
              onClick={loadAllPlayers}
              disabled={loadingAll}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
            >
              {loadingAll ? "…" : "↻"}
            </button>
          </div>
          {/* Sidebar search filter */}
          <div className="px-4 py-3 border-b border-white/5">
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Filter by name or ID…"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-white/20 focus:outline-none"
            />
          </div>
          {loadingAll && allPlayers.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 animate-pulse text-sm">Loading…</div>
          ) : filteredAllPlayers.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              {sidebarSearch ? "No players match your filter." : "No players found."}
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[460px] overflow-y-auto">
              {filteredAllPlayers.map((player) => (
                <button
                  key={player.user_id}
                  onClick={() => selectPlayer(player.user_id)}
                  className={`w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/5 transition ${
                    selectedPlayer?.userId === player.user_id ? "bg-white/[0.06]" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-white truncate">{player.name}</p>
                    <p className="text-[10px] font-mono text-zinc-600 truncate">{player.user_id}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {player.cr !== undefined && (
                      <span className="text-[10px] font-bold text-zinc-500">{player.cr} CR</span>
                    )}
                    <span className="text-xs text-zinc-500">→</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="px-5 py-3 border-t border-white/5 text-[10px] text-zinc-600">
            {filteredAllPlayers.length} of {allPlayers.length} players
          </div>
        </>
      );
    }

    const tabConfig: Record<Exclude<SidebarTab, "all">, { label: string; icon: string; color: string; members: DiscordRoleMember[] }> = {
      contentCreator: { label: "Content Creators", icon: "🎬", color: "#00D4FF", members: ccMembers },
      staff:          { label: "Staff Members",    icon: "👮", color: "#00FF88", members: staffMembers },
      premium:        { label: "Premium Members",  icon: "💎", color: "#FF9F43", members: premiumMembers },
    };

    const cfg = tabConfig[sidebarTab as Exclude<SidebarTab, "all">];
    const isLoading = loadingRole === sidebarTab;

    return (
      <>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-lg font-black" style={{ color: cfg.color }}>
            {cfg.icon} {cfg.label}
          </h2>
          <button
            onClick={() => loadRoleMembers(sidebarTab, true)}
            disabled={isLoading}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:bg-white/5 transition disabled:opacity-50"
          >
            {isLoading ? "…" : "↻"}
          </button>
        </div>
        {isLoading && cfg.members.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 animate-pulse text-sm">
            Fetching from Discord…
          </div>
        ) : cfg.members.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            No members found with this role.
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
            {cfg.members.map((member) => (
              <button
                key={member.userId}
                onClick={() => selectPlayer(member.userId)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/5 transition ${
                  selectedPlayer?.userId === member.userId ? "bg-white/[0.06]" : ""
                }`}
              >
                {member.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatar}
                    alt={member.username}
                    className="w-7 h-7 rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-xs text-zinc-400">
                    {member.username[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-white truncate">
                    {member.displayName ?? member.username}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-600 truncate">{member.userId}</p>
                </div>
                <span className="text-xs text-zinc-500 shrink-0">→</span>
              </button>
            ))}
          </div>
        )}
        <div className="px-5 py-3 border-t border-white/5 text-[10px] text-zinc-600">
          {cfg.members.length} member{cfg.members.length !== 1 ? "s" : ""} · cached 5 min
        </div>
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Main UI
  // -------------------------------------------------------------------------

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">🏅 Badge Manager</h1>
          <p className="mt-2 text-zinc-400">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* ── Search All Players ──────────────────────────────────────── */}
          <div className="rounded-2xl border border-red-700/30 bg-gradient-to-br from-red-950/20 to-black p-6">
            <h2 className="mb-1 text-xl font-black text-red-300">🔍 Search All Players</h2>
            <p className="mb-4 text-xs text-zinc-500">Search by name or Discord ID — finds any player in the database</p>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  placeholder="Player name or Discord ID…"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-red-600/60 focus:outline-none"
                />
                {searching && (
                  <div className="flex items-center px-3 text-zinc-500 text-sm animate-pulse">…</div>
                )}
              </div>

              {/* Live dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d14] shadow-2xl overflow-hidden">
                  {searchResults.map((player) => (
                    <button
                      key={player.user_id}
                      onClick={() => selectPlayer(player.user_id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.07] transition border-b border-white/5 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-white truncate">{player.name}</p>
                        <p className="text-[10px] font-mono text-zinc-500 truncate">{player.user_id}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {player.cr !== undefined && (
                          <span className="text-[10px] font-bold text-zinc-400">{player.cr} CR</span>
                        )}
                        <span className="text-xs text-zinc-500">Select →</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && searchResults.length === 0 && searchQuery.trim() && !searching && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d14] shadow-2xl px-4 py-3">
                  <p className="text-sm text-zinc-500">No players found for &quot;{searchQuery}&quot;</p>
                  <p className="text-xs text-zinc-600 mt-1">Use Quick Add below to create a new player record.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Quick Add Player ────────────────────────────────────────── */}
          <div className="rounded-2xl border border-purple-700/30 bg-gradient-to-br from-purple-950/20 to-black p-6">
            <h2 className="mb-1 text-xl font-black text-purple-300">⚡ Quick Add Player</h2>
            <p className="mb-4 text-xs text-zinc-500">
              Add a player by Discord ID — creates a minimal record if they don&apos;t exist yet, then lets you assign badges immediately
            </p>
            <form onSubmit={handleQuickAdd} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickAddId}
                  onChange={(e) => setQuickAddId(e.target.value)}
                  placeholder="Discord User ID (required)…"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-600/60 focus:outline-none font-mono"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  placeholder="Display name (optional)…"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-600/60 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={quickAdding || !quickAddId.trim()}
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-2.5 font-black text-white hover:from-purple-500 hover:to-violet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {quickAdding ? "Adding…" : "Add Player"}
                </button>
              </div>
            </form>
            {quickAddMsg && (
              <div
                className={`mt-3 rounded-xl border px-4 py-3 text-sm font-bold ${
                  quickAddMsg.type === "success"
                    ? "border-green-700/40 bg-green-950/20 text-green-300"
                    : "border-red-700/40 bg-red-950/20 text-red-300"
                }`}
              >
                {quickAddMsg.text}
              </div>
            )}
          </div>

          {/* ── Selected player badge editor ─────────────────────────── */}
          {loadingPlayer && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
              <p className="text-zinc-400 animate-pulse">Loading player…</p>
            </div>
          )}

          {selectedPlayer && !loadingPlayer && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
              {/* Player header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-black">{selectedPlayer.name ?? "Unknown Player"}</h2>
                  <p className="text-[11px] font-mono text-zinc-500 mt-0.5">{selectedPlayer.userId}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {selectedPlayer.badges.length > 0
                    ? selectedPlayer.badges.map((b) => <BadgePill key={b.id} badge={b} />)
                    : <span className="text-xs text-zinc-500 mt-1">No badges</span>
                  }
                </div>
              </div>

              {/* Player stats */}
              <div className="grid grid-cols-4 gap-2 mb-5">
                {[
                  { label: "CR",      value: selectedPlayer.cr },
                  { label: "Wins",    value: selectedPlayer.wins },
                  { label: "Losses",  value: selectedPlayer.losses },
                  { label: "Matches", value: selectedPlayer.matches },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-center"
                  >
                    <p className="text-lg font-black text-white">{value}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
                  </div>
                ))}
              </div>

              {/* Action feedback */}
              {actionMsg && (
                <div
                  className={`mb-4 rounded-xl border px-4 py-3 text-sm font-bold ${
                    actionMsg.type === "success"
                      ? "border-green-700/40 bg-green-950/20 text-green-300"
                      : "border-red-700/40 bg-red-950/20 text-red-300"
                  }`}
                >
                  {actionMsg.text}
                </div>
              )}

              {/* Badge assignment grid */}
              <div className="space-y-3">
                {BADGE_OPTIONS.map((badge) => {
                  const hasBadge = selectedPlayer.badges.some((b) => b.id === badge.id);
                  return (
                    <div
                      key={badge.id}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{badge.icon}</span>
                        <div>
                          <p className="font-bold text-sm" style={{ color: badge.color }}>
                            {badge.label}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {hasBadge ? "Currently assigned" : "Not assigned"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!hasBadge ? (
                          <button
                            onClick={() => handleBadgeAction(badge.id, "assign")}
                            disabled={actioning}
                            className="rounded-lg border border-green-700/40 bg-green-950/20 px-3 py-1.5 text-xs font-bold text-green-300 hover:bg-green-950/40 transition disabled:opacity-50"
                          >
                            + Assign
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBadgeAction(badge.id, "remove")}
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
            </div>
          )}

          {/* Empty state — no player selected */}
          {!selectedPlayer && !loadingPlayer && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center">
              <p className="text-4xl mb-3">🏅</p>
              <p className="font-bold text-zinc-400">No player selected</p>
              <p className="text-sm text-zinc-600 mt-1">
                Search for a player above, use Quick Add, or click a player in the sidebar.
              </p>
            </div>
          )}
        </div>

        {/* ── Right column — tabbed sidebar ───────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden h-fit">
          {/* Tab bar */}
          <div className="flex border-b border-white/10 overflow-x-auto">
            {SIDEBAR_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id)}
                className={`flex-1 min-w-0 px-3 py-3 text-xs font-bold transition whitespace-nowrap ${
                  sidebarTab === tab.id
                    ? "text-white border-b-2 border-red-500 bg-white/[0.04]"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {renderSidebarContent()}
        </div>
      </div>
    </Shell>
  );
}
