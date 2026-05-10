"use client";

import { useState, useEffect, useTransition } from "react";
import Shell from "@/components/Shell";
import PlayerSearch from "@/components/admin/PlayerSearch";
import PlayerCard from "@/components/admin/PlayerCard";
import BadgeManager from "@/components/admin/BadgeManager";
import PremiumToggle from "@/components/admin/PremiumToggle";
import StatEditor from "@/components/admin/StatEditor";
import ResetTools from "@/components/admin/ResetTools";
import AuditLog from "@/components/admin/AuditLog";
import { getPlayer, getPlayerBadges } from "@/lib/admin-actions";
import type { PlayerData, BadgeData } from "@/lib/admin-actions";

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface ToastState {
  type: "success" | "error";
  text: string;
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-black shadow-2xl max-w-sm animate-fade-in ${
        toast.type === "success"
          ? "border-green-400/60 bg-green-950/90 text-green-300 shadow-green-900/40"
          : "border-red-400/60 bg-red-950/90 text-red-300 shadow-red-900/40"
      }`}
    >
      <span className="flex-1">{toast.text}</span>
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
// Main Page
// ---------------------------------------------------------------------------

export default function AdminPage() {
  // Auth state
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Core state — flat, no nesting
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [isPending, startTransition] = useTransition();

  // Auth check
  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => {
        setIsOwner(d.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  function showToast(type: "success" | "error", text: string) {
    setToast({ type, text });
  }

  function dismissToast() {
    setToast(null);
  }

  function handleSelectPlayer(player: PlayerData) {
    setSelectedPlayer(null);
    setBadges([]);

    startTransition(async () => {
      const [playerRes, badgesRes] = await Promise.all([
        getPlayer(player.user_id),
        getPlayerBadges(player.user_id),
      ]);

      if (playerRes.success && playerRes.data) {
        setSelectedPlayer(playerRes.data);
      } else {
        showToast("error", playerRes.error ?? "Failed to load player");
      }

      if (badgesRes.success && badgesRes.data) {
        setBadges(badgesRes.data);
      }
    });
  }

  function handlePlayerChange(updated: PlayerData) {
    setSelectedPlayer(updated);
  }

  function handleBadgesChange(updated: BadgeData[]) {
    setBadges(updated);
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
            <a
              href="/"
              className="mt-6 inline-block rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-zinc-300 hover:bg-white/5 transition"
            >
              ← Back to Dashboard
            </a>
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
      {/* Toast */}
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black">🔐 Admin Panel</h1>
        <p className="mt-2 text-zinc-400">
          Search players, manage badges, premium, and stats. Every action is
          logged.
        </p>
      </div>

      {/* Quick nav to other admin pages */}
      <div className="mb-8 flex flex-wrap gap-2">
        {[
          { label: "👥 Players",       href: "/admin/players" },
          { label: "🏅 Badges",        href: "/admin/badges" },
          { label: "💎 Premium",       href: "/admin/premium" },
          { label: "⚙️ CR Admin",      href: "/admin/cr" },
          { label: "🏆 Seasons",       href: "/admin/seasons" },
          { label: "📢 Announcements", href: "/admin/announcements" },
          { label: "🎁 Giveaways",     href: "/admin/giveaways" },
          { label: "🛡️ Moderation",    href: "/admin/moderation" },
          { label: "📊 Analytics",     href: "/admin/analytics" },
          { label: "📋 Leaderboard",   href: "/admin/leaderboard" },
        ].map(({ label, href }) => (
          <a
            key={href}
            href={href}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/[0.06] hover:text-white transition"
          >
            {label}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        {/* ── Left column: search + action panels ── */}
        <div className="space-y-6">
          {/* Player Search */}
          <div className="rounded-2xl border border-red-700/30 bg-gradient-to-br from-red-950/20 to-black p-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-red-400 mb-4">
              🔍 Player Search
            </h2>
            <PlayerSearch
              onSelect={handleSelectPlayer}
              selectedId={selectedPlayer?.user_id}
            />
          </div>

          {/* Action panels — only shown when a player is selected */}
          {isPending && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
              <p className="text-zinc-400 animate-pulse text-sm">Loading player…</p>
            </div>
          )}

          {selectedPlayer && !isPending && (
            <div className="space-y-4">
              {/* Badge Manager */}
              <BadgeManager
                userId={selectedPlayer.user_id}
                badges={badges}
                onBadgesChange={handleBadgesChange}
                onToast={showToast}
              />

              {/* Premium Toggle */}
              <PremiumToggle
                player={selectedPlayer}
                onPlayerChange={handlePlayerChange}
                onToast={showToast}
              />

              {/* Stat Editor */}
              <StatEditor
                player={selectedPlayer}
                onPlayerChange={handlePlayerChange}
                onToast={showToast}
              />

              {/* Reset Tools */}
              <ResetTools
                player={selectedPlayer}
                onPlayerChange={handlePlayerChange}
                onToast={showToast}
              />
            </div>
          )}

          {!selectedPlayer && !isPending && (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-10 text-center">
              <p className="text-4xl mb-3">👤</p>
              <p className="text-zinc-500 text-sm">
                Search for a player above and click Select to manage them.
              </p>
            </div>
          )}
        </div>

        {/* ── Right column: player card + audit log ── */}
        <div className="space-y-6">
          {/* Player Card */}
          {selectedPlayer && !isPending ? (
            <PlayerCard player={selectedPlayer} badges={badges} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-zinc-500 text-sm">
                Player details will appear here.
              </p>
            </div>
          )}

          {/* Audit Log */}
          <AuditLog />
        </div>
      </div>
    </Shell>
  );
}
