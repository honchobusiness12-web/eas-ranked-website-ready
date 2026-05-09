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
  subscription: {
    status: string | null;
    periodEnd: string | null;
    subscriptionId: string | null;
  } | null;
  isDeveloper: boolean;
}

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
  // Returns YYYY-MM-DD for <input type="date">
  return date.toISOString().split("T")[0];
}

function SourceBadge({ source }: { source: PremiumStatusResult["source"] }) {
  if (!source) return <span className="text-zinc-500">—</span>;

  const map: Record<string, { label: string; cls: string }> = {
    developer:     { label: "👑 Developer",        cls: "from-yellow-600 to-amber-600" },
    subscription:  { label: "💳 Subscription",     cls: "from-blue-600 to-indigo-600" },
    giveaway_code: { label: "🎁 Giveaway Code",    cls: "from-purple-600 to-violet-600" },
    discord_role:  { label: "🎮 Discord Role",     cls: "from-indigo-600 to-blue-600" },
  };

  const config = map[source] ?? { label: source, cls: "from-zinc-600 to-zinc-500" };

  return (
    <span
      className={`inline-flex items-center rounded-lg bg-gradient-to-r ${config.cls} px-2.5 py-0.5 text-xs font-black text-white`}
    >
      {config.label}
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
      <button
        onClick={onDismiss}
        className="ml-3 text-xs opacity-60 hover:opacity-100 transition"
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

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlayerRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Selected player state
  const [selected, setSelected] = useState<PremiumStatusResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Grant form state
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

  // ---------------------------------------------------------------------------
  // Auto-dismiss success messages
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (actionMsg?.type === "success") {
      const t = setTimeout(() => setActionMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [actionMsg]);

  // ---------------------------------------------------------------------------
  // Close dropdown on outside click
  // ---------------------------------------------------------------------------

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
  // Player search
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

  async function selectPlayer(userId: string) {
    setDropdownOpen(false);
    setQuery("");
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
      }
    } finally {
      setLoadingStatus(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Grant premium
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
        // Refresh status
        await selectPlayer(selected.userId);
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
  // Revoke premium
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
        // Refresh status
        await selectPlayer(selected.userId);
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
  // Main UI
  // ---------------------------------------------------------------------------

  return (
    <Shell>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-4xl font-black">💎 Premium Management</h1>
        <p className="mt-2 text-zinc-400">
          Search for players, inspect their premium status, and manually grant or
          revoke access. Developer access only.
        </p>
      </div>

      {/* Premium sources reference card */}
      <div className="mb-6 rounded-2xl border border-yellow-700/30 bg-gradient-to-br from-yellow-950/20 to-black p-5">
        <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-yellow-500/80">
          📋 Premium Sources (priority order)
        </h2>
        <ol className="space-y-2 text-sm">
          {[
            {
              num: "1",
              label: "Developer ID",
              desc: "Permanent — hardcoded to user 733871667788644445",
              color: "text-yellow-300",
            },
            {
              num: "2",
              label: "Lemonsqueezy Subscription",
              desc: "Active subscription row in the subscriptions table",
              color: "text-blue-300",
            },
            {
              num: "3",
              label: "Giveaway / Manual Grant",
              desc: "premium_expires_at > NOW() in the players table",
              color: "text-purple-300",
            },
            {
              num: "4",
              label: "Discord Premium Role",
              desc: "data->>'premium' = true in the players table (set by bot)",
              color: "text-indigo-300",
            },
          ].map(({ num, label, desc, color }) => (
            <li key={num} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-zinc-400">
                {num}
              </span>
              <div>
                <span className={`font-bold ${color}`}>{label}</span>
                <span className="ml-2 text-zinc-500">{desc}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left — search */}
        <div className="space-y-5">
          {/* Search input */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-zinc-500">
              🔍 Find Player
            </h2>
            <div ref={searchRef} className="relative">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                  placeholder="Search by name or Discord ID…"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-8 text-sm text-white placeholder-zinc-600 focus:border-yellow-600/50 focus:outline-none"
                />
                {searching && (
                  <span className="absolute right-3 text-zinc-500 text-xs animate-pulse">
                    …
                  </span>
                )}
                {!searching && query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setSearchResults([]);
                      setDropdownOpen(false);
                    }}
                    className="absolute right-3 text-zinc-500 hover:text-zinc-300 text-xs transition"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Dropdown results */}
              {dropdownOpen && searchResults.length > 0 && (
                <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d14] shadow-2xl overflow-hidden">
                  {searchResults.map((player) => (
                    <button
                      key={player.user_id}
                      onMouseDown={() => selectPlayer(player.user_id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.07] transition border-b border-white/5 last:border-0"
                    >
                      <div>
                        <p className="font-bold text-sm text-white">{player.name}</p>
                        <p className="text-[10px] font-mono text-zinc-500">
                          {player.user_id}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        {player.premium_expires_at &&
                        new Date(player.premium_expires_at) > new Date() ? (
                          <span className="rounded-md bg-yellow-950/40 border border-yellow-700/40 px-2 py-0.5 text-[10px] font-black text-yellow-400">
                            PREMIUM
                          </span>
                        ) : (
                          <span className="rounded-md bg-zinc-900 border border-white/5 px-2 py-0.5 text-[10px] font-black text-zinc-500">
                            FREE
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {dropdownOpen &&
                searchResults.length === 0 &&
                query.trim() &&
                !searching && (
                  <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-zinc-500 shadow-2xl">
                    No players found for &quot;{query}&quot;
                  </div>
                )}
            </div>
          </div>

          {/* Loading state */}
          {loadingStatus && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
              <p className="text-zinc-400 animate-pulse text-sm">
                Loading premium status…
              </p>
            </div>
          )}

          {/* Empty state */}
          {!selected && !loadingStatus && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-10 text-center">
              <p className="text-4xl mb-3">💎</p>
              <p className="text-zinc-500 text-sm">
                Search for a player above to view and manage their premium status.
              </p>
            </div>
          )}

          {/* Player premium status card */}
          {selected && !loadingStatus && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-5">
              {/* Player header */}
              <div className="flex items-center gap-3">
                {selected.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.avatarUrl}
                    alt={selected.name ?? "Player"}
                    className="h-12 w-12 rounded-full border border-white/10"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl">
                    👤
                  </div>
                )}
                <div>
                  <p className="font-black text-lg text-white">
                    {selected.name ?? "Unknown Player"}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-500">
                    {selected.userId}
                  </p>
                </div>
                <div className="ml-auto">
                  {selected.premium ? (
                    <span className="rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 px-3 py-1 text-sm font-black text-white">
                      💎 PREMIUM
                    </span>
                  ) : (
                    <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm font-black text-zinc-400">
                      FREE
                    </span>
                  )}
                </div>
              </div>

              {/* Status breakdown */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
                  Premium Status Breakdown
                </h3>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1">
                      Active Source
                    </p>
                    <SourceBadge source={selected.source} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1">
                      Expires At
                    </p>
                    <p className="text-white font-bold">
                      {selected.expiresAt ? fmt(selected.expiresAt) : "Never / N/A"}
                    </p>
                  </div>
                </div>

                {/* Individual source rows */}
                <div className="mt-2 space-y-2 border-t border-white/5 pt-3">
                  {/* Developer */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">👑 Developer ID</span>
                    <span
                      className={
                        selected.isDeveloper ? "text-yellow-400 font-bold" : "text-zinc-600"
                      }
                    >
                      {selected.isDeveloper ? "✓ Active" : "—"}
                    </span>
                  </div>

                  {/* Subscription */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">💳 Lemonsqueezy Subscription</span>
                    <span
                      className={
                        selected.subscription?.status === "active"
                          ? "text-blue-400 font-bold"
                          : "text-zinc-600"
                      }
                    >
                      {selected.subscription?.status === "active"
                        ? `✓ Active (ends ${fmt(selected.subscription.periodEnd)})`
                        : selected.subscription?.status
                        ? `✗ ${selected.subscription.status}`
                        : "—"}
                    </span>
                  </div>

                  {/* Giveaway / manual */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">🎁 Giveaway / Manual Grant</span>
                    <span
                      className={
                        selected.premiumExpiresAt &&
                        new Date(selected.premiumExpiresAt) > new Date()
                          ? "text-purple-400 font-bold"
                          : "text-zinc-600"
                      }
                    >
                      {selected.premiumExpiresAt &&
                      new Date(selected.premiumExpiresAt) > new Date()
                        ? `✓ Active (expires ${fmt(selected.premiumExpiresAt)})`
                        : selected.premiumExpiresAt
                        ? `✗ Expired ${fmt(selected.premiumExpiresAt)}`
                        : "—"}
                    </span>
                  </div>

                  {/* Discord role */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">🎮 Discord Premium Role</span>
                    <span
                      className={
                        selected.discordPremium ? "text-indigo-400 font-bold" : "text-zinc-600"
                      }
                    >
                      {selected.discordPremium ? "✓ Active" : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action feedback */}
              {actionMsg && (
                <StatusBanner
                  msg={actionMsg}
                  onDismiss={() => setActionMsg(null)}
                />
              )}
            </div>
          )}
        </div>

        {/* Right — grant / revoke panel */}
        <div className="space-y-4">
          {/* Grant premium */}
          <div className="rounded-2xl border border-yellow-700/30 bg-gradient-to-br from-yellow-950/20 to-black p-5">
            <h2 className="mb-1 text-sm font-black uppercase tracking-widest text-yellow-500/80">
              ✨ Grant Premium
            </h2>
            <p className="mb-4 text-xs text-zinc-500">
              Sets{" "}
              <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-zinc-400">
                premium_expires_at
              </code>{" "}
              on the player record. Defaults to 1 year from now.
            </p>

            {!selected && (
              <p className="text-xs text-zinc-600 italic">
                Search for a player first.
              </p>
            )}

            {selected && (
              <div className="space-y-3">
                {/* Selected player pill */}
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-sm">👤</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">
                      {selected.name ?? selected.userId}
                    </p>
                    <p className="truncate text-[10px] font-mono text-zinc-500">
                      {selected.userId}
                    </p>
                  </div>
                </div>

                {/* Custom expiry toggle */}
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={customExpiry}
                    onChange={(e) => setCustomExpiry(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 accent-yellow-500"
                  />
                  Set custom expiry date
                </label>

                {customExpiry && (
                  <input
                    type="date"
                    value={expiryDate}
                    min={fmtDateInput(new Date(Date.now() + 86400000))}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:border-yellow-600/50 focus:outline-none"
                  />
                )}

                {!customExpiry && (
                  <p className="text-xs text-zinc-600">
                    Will expire:{" "}
                    <span className="text-zinc-400 font-bold">
                      {fmt(
                        new Date(
                          Date.now() + 365 * 24 * 60 * 60 * 1000
                        ).toISOString()
                      )}
                    </span>
                  </p>
                )}

                <button
                  onClick={handleGrant}
                  disabled={granting || revoking}
                  className="w-full rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 py-2.5 font-black text-white hover:from-yellow-500 hover:to-amber-500 transition-all disabled:opacity-50"
                >
                  {granting ? "Granting…" : "💎 Grant Premium"}
                </button>
              </div>
            )}
          </div>

          {/* Revoke premium */}
          <div className="rounded-2xl border border-red-700/30 bg-gradient-to-br from-red-950/20 to-black p-5">
            <h2 className="mb-1 text-sm font-black uppercase tracking-widest text-red-500/80">
              🚫 Revoke Manual Premium
            </h2>
            <p className="mb-4 text-xs text-zinc-500">
              Clears{" "}
              <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-zinc-400">
                premium_expires_at
              </code>
              . Does not cancel Lemonsqueezy subscriptions or Discord role
              premium.
            </p>

            {!selected && (
              <p className="text-xs text-zinc-600 italic">
                Search for a player first.
              </p>
            )}

            {selected && (
              <div className="space-y-3">
                {/* Selected player pill */}
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-sm">👤</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">
                      {selected.name ?? selected.userId}
                    </p>
                    <p className="truncate text-[10px] font-mono text-zinc-500">
                      {selected.userId}
                    </p>
                  </div>
                </div>

                {selected.premiumExpiresAt &&
                new Date(selected.premiumExpiresAt) > new Date() ? (
                  <p className="text-xs text-zinc-400">
                    Current manual expiry:{" "}
                    <span className="font-bold text-purple-400">
                      {fmt(selected.premiumExpiresAt)}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-zinc-600 italic">
                    No active manual premium grant to revoke.
                  </p>
                )}

                <button
                  onClick={handleRevoke}
                  disabled={
                    revoking ||
                    granting ||
                    !selected.premiumExpiresAt ||
                    new Date(selected.premiumExpiresAt) <= new Date()
                  }
                  className="w-full rounded-xl border border-red-700/40 bg-red-950/20 py-2.5 font-black text-red-400 hover:bg-red-950/40 transition-all disabled:opacity-40"
                >
                  {revoking ? "Revoking…" : "🚫 Revoke Manual Premium"}
                </button>
              </div>
            )}
          </div>

          {/* Quick reference */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-zinc-500">
              ℹ️ Quick Reference
            </h2>
            <ul className="space-y-2 text-xs text-zinc-500">
              <li>
                <span className="font-bold text-zinc-400">Grant</span> sets{" "}
                <code className="rounded bg-white/5 px-1 font-mono">
                  premium_expires_at
                </code>{" "}
                — takes effect immediately.
              </li>
              <li>
                <span className="font-bold text-zinc-400">Revoke</span> only
                clears the manual grant — subscriptions and Discord roles are
                unaffected.
              </li>
              <li>
                To cancel a Lemonsqueezy subscription, use the{" "}
                <SoundLink
                  href="/premium/manage"
                  soundType="click"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Manage Subscription
                </SoundLink>{" "}
                page or the Lemonsqueezy dashboard.
              </li>
              <li>
                Discord role premium is synced by the bot — remove the role in
                Discord to revoke it.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Shell>
  );
}
