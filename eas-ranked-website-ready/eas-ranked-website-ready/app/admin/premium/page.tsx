"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import { PlayerSearch } from "../_components/PlayerSearch";
import { PremiumToggle } from "../_components/PremiumToggle";
import { AuditLog } from "../_components/AuditLog";
import { usePlayerSearch } from "../_hooks/usePlayerSearch";
import type { PlayerRow } from "../_actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  developer:     { label: "👑 Developer",    color: "text-yellow-300", bg: "bg-yellow-950/30", border: "border-yellow-700/40" },
  subscription:  { label: "💳 Subscription", color: "text-blue-300",   bg: "bg-blue-950/30",   border: "border-blue-700/40"   },
  giveaway_code: { label: "🎁 Manual Grant", color: "text-purple-300", bg: "bg-purple-950/30", border: "border-purple-700/40" },
  discord_role:  { label: "🎮 Discord Role", color: "text-indigo-300", bg: "bg-indigo-950/30", border: "border-indigo-700/40" },
};

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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminPremiumPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Selected player
  const [selected, setSelected] = useState<PremiumStatusResult | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Premium state (managed by PremiumToggle)
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Show audit log
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Search hook
  const search = usePlayerSearch();

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
    if (toast?.type === "success") {
      const t = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ---------------------------------------------------------------------------
  // Select player
  // ---------------------------------------------------------------------------

  async function selectPlayer(player: PlayerRow) {
    search.clear();
    setSelected(null);
    setLoadingStatus(true);
    try {
      const res = await fetch(
        `/api/admin/premium?userId=${encodeURIComponent(player.user_id)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSelected(data);
        const premiumActive =
          !!data.premiumExpiresAt &&
          new Date(data.premiumExpiresAt) > new Date();
        setIsPremium(premiumActive || data.premium);
        setPremiumExpiresAt(data.premiumExpiresAt);
      }
    } finally {
      setLoadingStatus(false);
    }
  }

  function handlePremiumChange(premium: boolean, expiresAt: string | null) {
    setIsPremium(premium);
    setPremiumExpiresAt(expiresAt);
    if (selected) {
      setSelected((prev) =>
        prev ? { ...prev, premium, premiumExpiresAt: expiresAt } : prev
      );
    }
  }

  function handleToast(type: "success" | "error", message: string) {
    setToast({ type, text: message });
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

  const sourceConfig = selected?.source ? SOURCE_CONFIG[selected.source] : null;

  // ---------------------------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------------------------

  return (
    <Shell>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-black shadow-2xl max-w-sm ${
            toast.type === "success"
              ? "border-green-400/60 bg-green-950/90 text-green-300"
              : "border-red-400/60 bg-red-950/90 text-red-300"
          }`}
        >
          <span className="flex-1">{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="opacity-60 hover:opacity-100 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight">💎 Premium Manager</h1>
        <p className="mt-2 text-zinc-400">
          Search for a player, check their status, then grant or revoke premium
          access. All actions are audit-logged.
        </p>
        <div className="mt-3 flex gap-2">
          <SoundLink
            href="/admin/audit-logs"
            soundType="click"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white transition"
          >
            📋 View Audit Log
          </SoundLink>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* ── LEFT: Search + Player Card ── */}
        <div className="space-y-5">
          {/* Search box */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
              Step 1 — Find a Player
            </p>
            <PlayerSearch
              query={search.query}
              results={search.results}
              isSearching={search.isSearching}
              isOpen={search.isOpen}
              selectedId={selected?.userId}
              onQueryChange={search.handleQueryChange}
              onSelect={selectPlayer}
              onClose={search.close}
              onClear={() => {
                search.clear();
                setSelected(null);
              }}
            />
          </div>

          {/* Loading */}
          {loadingStatus && (
            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#0d0d14] p-12">
              <p className="animate-pulse text-sm text-zinc-400">
                Loading player status…
              </p>
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

          {/* Player Status Card */}
          {selected && !loadingStatus && (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d14]">
              {/* Card header */}
              <div
                className={`flex items-center gap-4 p-6 ${
                  selected.premium
                    ? "bg-gradient-to-r from-yellow-950/30 to-transparent"
                    : "bg-gradient-to-r from-zinc-900/50 to-transparent"
                }`}
              >
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
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black text-white">
                    {selected.name ?? selected.userId}
                  </h2>
                  <p className="font-mono text-[11px] text-zinc-500">
                    {selected.userId}
                  </p>
                  {sourceConfig && (
                    <span
                      className={`mt-1.5 inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-black ${sourceConfig.color} ${sourceConfig.bg} ${sourceConfig.border}`}
                    >
                      {sourceConfig.label}
                    </span>
                  )}
                </div>
                <div className="shrink-0">
                  {isPremium ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border-2 border-yellow-500/60 bg-yellow-950/40 px-4 py-2 text-sm font-black text-yellow-300">
                      ⭐ PREMIUM
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border-2 border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-zinc-500">
                      — FREE
                    </span>
                  )}
                </div>
              </div>

              {/* Status details */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatusPill active={selected.premium} label="Premium Active" />
                  <StatusPill active={selected.discordPremium} label="Discord Role" />
                  <StatusPill active={selected.premiumRoleSynced} label="Role Synced" />
                  <StatusPill active={!!selected.subscription} label="Subscription" />
                </div>

                {premiumExpiresAt && (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      Manual Grant Expires
                    </p>
                    <p className="mt-0.5 text-sm font-black text-white">
                      {fmt(premiumExpiresAt)}
                    </p>
                  </div>
                )}

                {selected.subscription && (
                  <div className="rounded-xl border border-blue-700/30 bg-blue-950/10 px-4 py-3 space-y-1">
                    <p className="text-[10px] text-blue-400 uppercase tracking-wider font-black">
                      Subscription
                    </p>
                    <p className="text-xs text-zinc-300">
                      Status:{" "}
                      <span className="font-bold">
                        {selected.subscription.status ?? "—"}
                      </span>
                    </p>
                    {selected.subscription.periodEnd && (
                      <p className="text-xs text-zinc-300">
                        Period ends:{" "}
                        <span className="font-bold">
                          {fmt(selected.subscription.periodEnd)}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* Audit log toggle */}
                <button
                  onClick={() => setShowAuditLog((v) => !v)}
                  className={`w-full rounded-xl border px-4 py-2 text-xs font-bold transition ${
                    showAuditLog
                      ? "border-zinc-500/60 bg-zinc-800/50 text-zinc-300"
                      : "border-white/10 text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  📋 {showAuditLog ? "Hide" : "Show"} Premium Audit Log
                </button>

                {showAuditLog && (
                  <AuditLog userId={selected.userId} compact />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Premium Toggle ── */}
        <div className="space-y-4">
          {!selected && !loadingStatus && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
              <p className="text-4xl mb-3">💎</p>
              <p className="text-zinc-500 text-sm">
                Select a player to manage their premium.
              </p>
            </div>
          )}

          {selected && !loadingStatus && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                Step 2 — Manage Premium
              </p>
              <PremiumToggle
                userId={selected.userId}
                isPremium={isPremium}
                premiumExpiresAt={premiumExpiresAt}
                onPremiumChange={handlePremiumChange}
                onToast={handleToast}
              />
              <div className="pt-2">
                <SoundLink
                  href={`/profile/${selected.userId}`}
                  soundType="click"
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                >
                  👤 View Profile →
                </SoundLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
