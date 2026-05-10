"use client";

/**
 * app/admin/badges/page.tsx
 *
 * Admin control panel — rebuilt with clean architecture.
 *
 * State:
 *   selectedPlayer  — the player currently being managed
 *   playerBadges    — badge IDs for the selected player
 *   loading         — global loading flag (player detail fetch)
 *   error           — global error string
 *   toast           — { type, text } | null
 *
 * All business logic is delegated to server actions (lib/admin/actions.ts).
 * Components are dumb and call back via onSuccess / onError.
 */

import { useState, useEffect, useCallback } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";

import PlayerSearch from "@/app/admin/components/PlayerSearch";
import PlayerCard from "@/app/admin/components/PlayerCard";
import BadgeManager from "@/app/admin/components/BadgeManager";
import PremiumToggle from "@/app/admin/components/PremiumToggle";
import StatEditor from "@/app/admin/components/StatEditor";
import ResetTools from "@/app/admin/components/ResetTools";
import AuditLog from "@/app/admin/components/AuditLog";

import {
  getPlayerDetail,
  getPlayerBadgeList,
  type AdminPlayer,
  type PlayerSearchResult,
} from "@/lib/admin/actions";

// ---------------------------------------------------------------------------
// Toast component
// ---------------------------------------------------------------------------

function Toast({
  msg,
  onDismiss,
}: {
  msg: { type: "success" | "error"; text: string };
  onDismiss: () => void;
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-black shadow-2xl max-w-sm ${
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
// Main page
// ---------------------------------------------------------------------------

export default function AdminBadgesPage() {
  // Auth
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Core state — flat, no nesting
  const [selectedPlayer, setSelectedPlayer] = useState<AdminPlayer | null>(null);
  const [playerBadges, setPlayerBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  // Auto-dismiss success toasts
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (toast?.type === "success") {
      const t = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ---------------------------------------------------------------------------
  // Load player detail + badges
  // ---------------------------------------------------------------------------

  const loadPlayer = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [playerResult, badgesResult] = await Promise.all([
        getPlayerDetail(userId),
        getPlayerBadgeList(userId),
      ]);

      if (!playerResult.success) {
        setError(playerResult.error ?? "Failed to load player.");
        setSelectedPlayer(null);
        setPlayerBadges([]);
        return;
      }

      setSelectedPlayer(playerResult.data ?? null);
      setPlayerBadges(badgesResult.success ? (badgesResult.data ?? []) : []);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Handle player selection from search
  // ---------------------------------------------------------------------------

  function handleSelectPlayer(result: PlayerSearchResult) {
    loadPlayer(result.user_id);
  }

  // ---------------------------------------------------------------------------
  // Callbacks from child components
  // ---------------------------------------------------------------------------

  function showSuccess(text: string) {
    setToast({ type: "success", text });
  }

  function showError(text: string) {
    setToast({ type: "error", text });
  }

  function handleBadgeSuccess(msg: string, newBadges: string[]) {
    setPlayerBadges(newBadges);
    showSuccess(msg);
  }

  function handlePremiumSuccess(msg: string, premium: boolean) {
    if (selectedPlayer) {
      setSelectedPlayer({
        ...selectedPlayer,
        premium,
        premium_expires_at: premium
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      });
    }
    showSuccess(msg);
  }

  function handleStatsSuccess(msg: string, updated: AdminPlayer) {
    setSelectedPlayer(updated);
    showSuccess(msg);
  }

  function handlePlayerReset(msg: string, updated: AdminPlayer) {
    setSelectedPlayer(updated);
    showSuccess(msg);
  }

  function handleAllReset(msg: string) {
    // Reload the selected player's data since their stats were also reset
    if (selectedPlayer) {
      loadPlayer(selectedPlayer.user_id);
    }
    showSuccess(msg);
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
              🛡️
            </span>
            <div>
              <h1
                className="text-4xl font-black tracking-tight leading-none"
                style={{
                  background: "linear-gradient(90deg, #00FF88, #00D4FF, #FFD700)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 30px rgba(0,255,136,0.40))",
                }}
              >
                ADMIN PANEL
              </h1>
              <p className="text-sm font-bold text-zinc-400 mt-1">
                🔐 Developer Access Only — Player Management &amp; Badge Control
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black text-zinc-500">
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
              🏅 Badges
            </span>
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
              ⭐ Premium
            </span>
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
              📊 Stats
            </span>
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
              📋 Audit Log
            </span>
          </div>
        </div>
      </div>

      {/* ─── Search ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <PlayerSearch onSelect={handleSelectPlayer} disabled={loading} />
      </div>

      {/* ─── Main content ────────────────────────────────────────────────── */}
      {!selectedPlayer && !loading && !error && (
        <div className="rounded-3xl border-2 border-white/8 bg-white/[0.01] px-8 py-16 text-center">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-lg font-black text-zinc-400">
            Search for a player to get started
          </p>
          <p className="text-sm font-bold text-zinc-600 mt-2">
            Search by name or Discord ID — results include DB players and
            Discord members
          </p>
        </div>
      )}

      {loading && (
        <div className="rounded-3xl border-2 border-white/8 bg-white/[0.01] px-8 py-16 text-center">
          <p className="text-zinc-400 animate-pulse font-bold text-lg">
            Loading player…
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-3xl border-2 border-red-500/30 bg-red-950/10 px-8 py-10 text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-base font-black text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-4 rounded-xl border-2 border-red-500/40 bg-red-950/20 px-5 py-2.5 text-sm font-black text-red-300 hover:bg-red-500/20 transition-all"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {selectedPlayer && !loading && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          {/* ── Left column ── */}
          <div className="space-y-5">
            {/* Player card */}
            <PlayerCard player={selectedPlayer} />

            {/* Stat editor */}
            <StatEditor
              player={selectedPlayer}
              onSuccess={handleStatsSuccess}
              onError={showError}
            />

            {/* Reset tools */}
            <ResetTools
              player={selectedPlayer}
              onPlayerReset={handlePlayerReset}
              onAllReset={handleAllReset}
              onError={showError}
            />

            {/* Audit log for this player */}
            <AuditLog
              targetUserId={selectedPlayer.user_id}
              pageSize={8}
            />
          </div>

          {/* ── Right column ── */}
          <div className="space-y-5">
            {/* Badge manager */}
            <BadgeManager
              userId={selectedPlayer.user_id}
              playerName={selectedPlayer.name}
              badges={playerBadges}
              onSuccess={handleBadgeSuccess}
              onError={showError}
            />

            {/* Premium toggle */}
            <PremiumToggle
              userId={selectedPlayer.user_id}
              playerName={selectedPlayer.name}
              hasPremium={selectedPlayer.premium}
              premiumExpiresAt={selectedPlayer.premium_expires_at}
              onSuccess={handlePremiumSuccess}
              onError={showError}
            />

            {/* Quick links */}
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                border: "2px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.01)",
              }}
            >
              <div className="px-5 py-3.5 border-b border-white/8 bg-white/[0.02]">
                <p className="font-black text-sm text-zinc-300">🔗 Quick Links</p>
              </div>
              <div className="p-4 space-y-2">
                <a
                  href={`/profile/${selectedPlayer.user_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5 text-xs font-black text-zinc-400 hover:bg-white/[0.05] hover:text-white transition-all"
                >
                  <span>👤</span>
                  <span>View Public Profile</span>
                  <span className="ml-auto opacity-50">↗</span>
                </a>
                <a
                  href="/admin/players"
                  className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5 text-xs font-black text-zinc-400 hover:bg-white/[0.05] hover:text-white transition-all"
                >
                  <span>👥</span>
                  <span>Player Management</span>
                  <span className="ml-auto opacity-50">→</span>
                </a>
                <a
                  href="/admin/cr"
                  className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5 text-xs font-black text-zinc-400 hover:bg-white/[0.05] hover:text-white transition-all"
                >
                  <span>📈</span>
                  <span>CR Admin</span>
                  <span className="ml-auto opacity-50">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Global Audit Log (shown when no player selected) ────────────── */}
      {!selectedPlayer && !loading && !error && (
        <div className="mt-8">
          <AuditLog pageSize={15} />
        </div>
      )}
    </Shell>
  );
}
