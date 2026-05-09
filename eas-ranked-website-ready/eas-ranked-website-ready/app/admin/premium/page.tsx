"use client";

import { useState, useEffect, useRef } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerRow {
  user_id: string;
  name: string;
  avatar_url: string | null;
  premium_expires_at: string | null;
}

interface PremiumStatusResult {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  premium: boolean;
  source: "developer" | "subscription" | "giveaway_code" | "discord_role" | null;
  expiresAt: string | null;
  premiumExpiresAt: string | null;
  discordPremium: boolean;
  premiumRoleSynced: boolean;
  premiumGrantedAt: string | null;
  subscription: {
    status: string | null;
    periodEnd: string | null;
    subscriptionId: string | null;
  } | null;
  isDeveloper: boolean;
}

// ---------------------------------------------------------------------------
// Source label map
// ---------------------------------------------------------------------------

const SOURCE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  developer:     { label: "👑 Developer",      color: "text-yellow-300", bg: "bg-yellow-950/30", border: "border-yellow-700/40" },
  subscription:  { label: "💳 Subscription",   color: "text-blue-300",   bg: "bg-blue-950/30",   border: "border-blue-700/40"   },
  giveaway_code: { label: "🎁 Manual Grant",   color: "text-purple-300", bg: "bg-purple-950/30", border: "border-purple-700/40" },
  discord_role:  { label: "🎮 Discord Role",   color: "text-indigo-300", bg: "bg-indigo-950/30", border: "border-indigo-700/40" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function hasActiveManualGrant(premiumExpiresAt: string | null): boolean {
  return !!premiumExpiresAt && new Date(premiumExpiresAt) > new Date();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-lg border border-green-700/40 bg-green-950/30 px-2.5 py-1 text-xs font-black text-green-400">
      ✓ {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-black text-zinc-500">
      ✗ {label}
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
      className={`flex items-start justify-between gap-3 rounded-2xl border px-5 py-4 text-sm font-bold shadow-xl ${
        msg.type === "success"
          ? "border-green-700/40 bg-green-950/20 text-green-300"
          : "border-red-700/40 bg-red-950/20 text-red-300"
      }`}
    >
      <span className="leading-snug">{msg.text}</span>
      <button
        onClick={onDismiss}
        className="mt-0.5 shrink-0 text-xs opacity-50 hover:opacity-100 transition"
      >
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminPremiumPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlayerRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Selected player
  const [selected, setSelected] = useState<PremiumStatusResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Actions
  const [customExpiry, setCustomExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState(
    fmtDateInput(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
  );
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [actionMsg, setActionMsg] = useState<{
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

  // Auto-dismiss success toasts
  useEffect(() => {
    if (actionMsg?.type === "success") {
      const t = setTimeout(() => setActionMsg(null), 6000);
      return () => clearTimeout(t);
    }
  }, [actionMsg]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async function runSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/admin/premium?search=${encodeURIComponent(trimmed)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.players ?? []);
        setDropdownOpen(true);
      }
    } finally {
      setSearching(false);
    }
  }

  function handleSearchInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  }

  async function selectPlayer(userId: string, displayName?: string) {
    setDropdownOpen(false);
    setQuery(displayName ?? "");
    setSearchResults([]);
    setSelected(null);
    setActionMsg(null);
    setLoadingStatus(true);
    try {
      const res = await fetch(
        `/api/admin/premium?userId=${encodeURIComponent(userId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSelected(data);
        setQuery(data.name ?? displayName ?? "");
      }
    } finally {
      setLoadingStatus(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Grant
  // ---------------------------------------------------------------------------

  async function handleGrant() {
    if (!selected) return;
    setGranting(true);
    setActionMsg(null);
    try {
      const body: { userId: string; expiresAt?: string } = {
        userId: selected.userId,
      };
      if (customExpiry) {
        body.expiresAt = new Date(expiryDate).toISOString();
      }
      const res = await fetch("/api/admin/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg({
          type: "success",
          text: `✅ Premium granted to ${selected.name ?? selected.userId}. Expires: ${fmt(data.expiresAt)}`,
        });
        await selectPlayer(selected.userId, selected.name ?? undefined);
      } else {
        setActionMsg({ type: "error", text: data.error ?? "Failed to grant premium." });
      }
    } catch {
      setActionMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setGranting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Revoke
  // ---------------------------------------------------------------------------

  async function handleRevoke() {
    if (!selected) return;
    setRevoking(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/premium", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.userId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg({
          type: "success",
          text: `✅ Manual premium revoked from ${selected.name ?? selected.userId}.`,
        });
        await selectPlayer(selected.userId, selected.name ?? undefined);
      } else {
        setActionMsg({ type: "error", text: data.error ?? "Failed to revoke premium." });
      }
    } catch {
      setActionMsg({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setRevoking(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Auth gate
  // ---------------------------------------------------------------------------

  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="animate-pulse text-zinc-400">Checking access…</p>
        </div>
      </Shell>
    );
  }

  if (!isOwner) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-5xl">🚫</p>
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
  // Derived state
  // ---------------------------------------------------------------------------

  const manualGrantActive = selected ? hasActiveManualGrant(selected.premiumExpiresAt) : false;
  const sourceConfig = selected?.source ? SOURCE_CONFIG[selected.source] : null;

  // ---------------------------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------------------------

  return (
    <Shell>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight">💎 Premium Manager</h1>
        <p className="mt-2 text-zinc-400">
          Search for a player, check their status, then grant or revoke premium access.
        </p>
      </div>

      {/* Toast */}
      {actionMsg && (
        <div className="mb-6">
          <Toast msg={actionMsg} onDismiss={() => setActionMsg(null)} />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">

        {/* ── LEFT: Search + Player Card ── */}
        <div className="space-y-5">

          {/* Search box */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
              Step 1 — Find a Player
            </p>
            <div ref={searchRef} className="relative">
              <div className="relative flex items-center">
                <span className="absolute left-4 text-zinc-500 text-base pointer-events-none">🔍</span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                  placeholder="Type a player name or Discord ID…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-10 text-sm text-white placeholder-zinc-600 focus:border-yellow-600/50 focus:outline-none transition"
                />
                {searching && (
                  <span className="absolute right-4 animate-pulse text-xs text-zinc-500">…</span>
                )}
                {!searching && query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setSearchResults([]);
                      setDropdownOpen(false);
                      setSelected(null);
                      setActionMsg(null);
                    }}
                    className="absolute right-4 text-zinc-500 hover:text-zinc-300 text-xs transition"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {dropdownOpen && searchResults.length > 0 && (
                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0d0d14] shadow-2xl">
                  {searchResults.map((player) => (
                    <button
                      key={player.user_id}
                      onMouseDown={() => selectPlayer(player.user_id, player.name)}
                      className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition last:border-0 hover:bg-white/[0.07]"
                    >
                      {/* Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base">
                        👤
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{player.name}</p>
                        <p className="truncate font-mono text-[10px] text-zinc-500">{player.user_id}</p>
                      </div>
                      <div className="shrink-0">
                        {player.premium_expires_at &&
                        new Date(player.premium_expires_at) > new Date() ? (
                          <span className="rounded-md border border-yellow-700/40 bg-yellow-950/40 px-2 py-0.5 text-[10px] font-black text-yellow-400">
                            PREMIUM
                          </span>
                        ) : (
                          <span className="rounded-md border border-white/5 bg-zinc-900 px-2 py-0.5 text-[10px] font-black text-zinc-500">
                            FREE
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {dropdownOpen && searchResults.length === 0 && query.trim() && !searching && (
                <div className="absolute z-30 mt-2 w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-zinc-500 shadow-2xl">
                  No players found for &quot;{query}&quot;
                </div>
              )}
            </div>
          </div>

          {/* Loading */}
          {loadingStatus && (
            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#0d0d14] p-12">
              <p className="animate-pulse text-sm text-zinc-400">Loading player status…</p>
            </div>
          )}

          {/* Empty state */}
          {!selected && !loadingStatus && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0d0d14] p-14 text-center">
              <p className="mb-3 text-5xl">💎</p>
              <p className="text-sm font-bold text-zinc-400">No player selected</p>
              <p className="mt-1 text-xs text-zinc-600">
                Search above to load a player&apos;s premium status.
              </p>
            </div>
          )}

          {/* ── Player Status Card ── */}
          {selected && !loadingStatus && (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d14]">

              {/* Card header — avatar + name + big YES/NO badge */}
              <div
                className={`flex items-center gap-4 p-6 ${
                  selected.premium
                    ? "bg-gradient-to-r from-yellow-950/30 to-transparent"
                    : "bg-gradient-to-r from-zinc-900/50 to-transparent"
                }`}
              >
                {/* Avatar */}
                {selected.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.avatarUrl}
                    alt={selected.name ?? "Player"}
                    className="h-16 w-16 rounded-full border-2 border-white/10 shadow-lg"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/10 bg-white/5 text-2xl shadow-lg">
                    👤
                  </div>
                )}

                {/* Name + ID */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-black text-white">
                    {selected.name ?? "Unknown Player"}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">
                    {selected.userId}
                  </p>
                </div>

                {/* Big premium YES/NO */}
                <div className="shrink-0 text-right">
                  {selected.premium ? (
                    <div className="rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 px-4 py-2 shadow-lg shadow-yellow-900/30">
                      <p className="text-xs font-black uppercase tracking-widest text-yellow-100/80">
                        Premium
                      </p>
                      <p className="text-2xl font-black text-white leading-none">YES</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
                      <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                        Premium
                      </p>
                      <p className="text-2xl font-black text-zinc-400 leading-none">NO</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status rows */}
              <div className="divide-y divide-white/5 border-t border-white/10">

                {/* Active source */}
                <div className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-zinc-600">
                      Active Source
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-400">
                      Where premium is coming from
                    </p>
                  </div>
                  {sourceConfig ? (
                    <span
                      className={`rounded-xl border px-3 py-1.5 text-sm font-black ${sourceConfig.color} ${sourceConfig.bg} ${sourceConfig.border}`}
                    >
                      {sourceConfig.label}
                    </span>
                  ) : (
                    <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-black text-zinc-500">
                      None
                    </span>
                  )}
                </div>

                {/* Discord role synced */}
                <div className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-zinc-600">
                      Discord Role Synced
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {selected.premiumRoleSynced
                        ? `Bot synced role ${selected.premiumGrantedAt ? `at ${fmt(selected.premiumGrantedAt)}` : ""}`
                        : selected.discordPremium
                        ? "Premium flag set (legacy — no timestamp)"
                        : "Bot has NOT synced the Premium User role — use !premiumsync in Discord"}
                    </p>
                  </div>
                  <StatusPill
                    active={selected.discordPremium || selected.premiumRoleSynced}
                    label={(selected.discordPremium || selected.premiumRoleSynced) ? "YES" : "NO"}
                  />
                </div>

                {/* Manual grant */}
                <div className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-zinc-600">
                      Manual Grant
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {manualGrantActive
                        ? `Expires ${fmt(selected.premiumExpiresAt)}`
                        : selected.premiumExpiresAt
                        ? `Expired ${fmt(selected.premiumExpiresAt)}`
                        : "No manual grant on record"}
                    </p>
                  </div>
                  <StatusPill active={manualGrantActive} label={manualGrantActive ? "Active" : "Inactive"} />
                </div>

                {/* Developer */}
                {selected.isDeveloper && (
                  <div className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-zinc-600">
                        Developer
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">Permanent premium — hardcoded</p>
                    </div>
                    <StatusPill active label="Active" />
                  </div>
                )}

                {/* Subscription */}
                {selected.subscription && (
                  <div className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-zinc-600">
                        Subscription
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {selected.subscription.status === "active"
                          ? `Active — renews ${fmt(selected.subscription.periodEnd)}`
                          : `Status: ${selected.subscription.status ?? "none"}`}
                      </p>
                    </div>
                    <StatusPill
                      active={selected.subscription.status === "active"}
                      label={selected.subscription.status === "active" ? "Active" : "Inactive"}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Actions ── */}
        <div className="space-y-5">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
            Step 2 — Take Action
          </p>

          {/* Grant Premium */}
          <div
            className={`rounded-2xl border p-6 transition-all ${
              selected && !selected.premium
                ? "border-green-700/40 bg-gradient-to-br from-green-950/20 to-black"
                : "border-white/10 bg-[#0d0d14] opacity-60"
            }`}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-950/50 text-xl border border-green-700/30">
                ✨
              </div>
              <div>
                <h2 className="text-base font-black text-white">Grant Premium</h2>
                <p className="text-xs text-zinc-500">
                  Sets <code className="rounded bg-white/5 px-1 font-mono text-zinc-400">premium_expires_at</code> on the player
                </p>
              </div>
            </div>

            {!selected ? (
              <p className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs text-zinc-600 italic">
                Search for a player first to enable this action.
              </p>
            ) : selected.premium ? (
              <p className="rounded-xl border border-yellow-700/20 bg-yellow-950/10 px-4 py-3 text-xs font-bold text-yellow-600">
                This player already has premium — no need to grant.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Expiry toggle */}
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={customExpiry}
                    onChange={(e) => setCustomExpiry(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 accent-green-500"
                  />
                  Set custom expiry date
                </label>

                {customExpiry ? (
                  <input
                    type="date"
                    value={expiryDate}
                    min={fmtDateInput(new Date(Date.now() + 86400000))}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:border-green-600/50 focus:outline-none"
                  />
                ) : (
                  <p className="text-xs text-zinc-600">
                    Default expiry:{" "}
                    <span className="font-bold text-zinc-400">
                      {fmt(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString())}
                    </span>
                  </p>
                )}

                <button
                  onClick={handleGrant}
                  disabled={granting || revoking}
                  className="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 py-3.5 text-base font-black text-white shadow-lg shadow-green-900/30 transition-all hover:from-green-500 hover:to-emerald-500 disabled:opacity-50"
                >
                  {granting ? "Granting…" : "✨ Grant Premium"}
                </button>
              </div>
            )}
          </div>

          {/* Revoke Manual Grant */}
          <div
            className={`rounded-2xl border p-6 transition-all ${
              manualGrantActive
                ? "border-red-700/40 bg-gradient-to-br from-red-950/20 to-black"
                : "border-white/10 bg-[#0d0d14] opacity-60"
            }`}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/50 text-xl border border-red-700/30">
                🚫
              </div>
              <div>
                <h2 className="text-base font-black text-white">Revoke Manual Grant</h2>
                <p className="text-xs text-zinc-500">
                  Clears <code className="rounded bg-white/5 px-1 font-mono text-zinc-400">premium_expires_at</code> only
                </p>
              </div>
            </div>

            {!selected ? (
              <p className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs text-zinc-600 italic">
                Search for a player first to enable this action.
              </p>
            ) : !manualGrantActive ? (
              <p className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs text-zinc-600 italic">
                No active manual grant to revoke.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="rounded-xl border border-red-700/20 bg-red-950/10 px-4 py-3 text-xs text-zinc-400">
                  Current expiry:{" "}
                  <span className="font-bold text-red-400">
                    {fmt(selected.premiumExpiresAt)}
                  </span>
                  <br />
                  <span className="text-zinc-600">
                    This will not cancel subscriptions or remove the Discord role.
                  </span>
                </p>

                <button
                  onClick={handleRevoke}
                  disabled={revoking || granting}
                  className="w-full rounded-xl border border-red-700/50 bg-red-950/30 py-3.5 text-base font-black text-red-400 shadow-lg transition-all hover:bg-red-950/50 disabled:opacity-50"
                >
                  {revoking ? "Revoking…" : "🚫 Revoke Manual Grant"}
                </button>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
              ℹ️ How It Works
            </h3>
            <ul className="space-y-2.5 text-xs text-zinc-500">
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-green-500">✓</span>
                <span>
                  <span className="font-bold text-zinc-400">Grant</span> sets a manual expiry date — takes effect immediately.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-red-500">✗</span>
                <span>
                  <span className="font-bold text-zinc-400">Revoke</span> only clears the manual grant. Subscriptions and Discord roles are unaffected.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-indigo-400">🎮</span>
                <span>
                  <span className="font-bold text-zinc-400">Discord role</span> premium is synced by the bot. Assign or remove the role in Discord to change it.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-blue-400">💳</span>
                <span>
                  To cancel a subscription, use the{" "}
                  <SoundLink
                    href="/premium/manage"
                    soundType="click"
                    className="text-blue-400 underline hover:text-blue-300"
                  >
                    Manage Subscription
                  </SoundLink>{" "}
                  page.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Shell>
  );
}
