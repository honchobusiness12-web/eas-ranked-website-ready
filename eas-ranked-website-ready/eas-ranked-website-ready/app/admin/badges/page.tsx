"use client";

import { useState, useCallback } from "react";
import Shell from "@/components/Shell";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlayerSearch } from "@/components/admin/PlayerSearch";
import { PlayerRow } from "@/components/admin/PlayerRow";
import { Toast } from "@/components/admin/Toast";
import { LoadingSpinner } from "@/components/admin/LoadingSpinner";
import {
  searchPlayers,
  assignBadge,
  removeBadge,
  grantPremiumAction,
  revokePremiumAction,
} from "@/lib/admin/actions";
import type { PlayerResult } from "@/lib/admin/actions";
import type { ToastMessage } from "@/components/admin/Toast";

type ToastState = ToastMessage | null;

// ---------------------------------------------------------------------------
// Badge Manager Page
// ---------------------------------------------------------------------------

export default function BadgesPage() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);

    if (!q.trim()) {
      setPlayers([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await searchPlayers(q);

    if (result.success && result.data) {
      setPlayers(result.data.players);
    } else {
      setError(result.error ?? "Search failed");
      setPlayers([]);
    }

    setLoading(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Badge change (add / remove)
  // ---------------------------------------------------------------------------

  const handleBadgeChange = useCallback(
    async (userId: string, badgeId: string, action: "add" | "remove") => {
      const fn = action === "add" ? assignBadge : removeBadge;
      const result = await fn(userId, badgeId);

      if (result.success && result.data) {
        setToast({
          type: "success",
          text: `Badge ${action === "add" ? "assigned" : "removed"} successfully`,
        });
        // Update the player's badge list in-place
        setPlayers((prev) =>
          prev.map((p) =>
            p.user_id === userId
              ? { ...p, badges: result.data!.badges }
              : p
          )
        );
      } else {
        setToast({
          type: "error",
          text: result.error ?? `Failed to ${action} badge`,
        });
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Premium change (grant / revoke)
  // ---------------------------------------------------------------------------

  const handlePremiumChange = useCallback(
    async (userId: string, grant: boolean) => {
      const fn = grant ? grantPremiumAction : revokePremiumAction;
      const result = await fn(userId);

      if (result.success && result.data) {
        setToast({
          type: "success",
          text: grant ? "Premium granted" : "Premium revoked",
        });
        setPlayers((prev) =>
          prev.map((p) =>
            p.user_id === userId
              ? { ...p, premium: result.data!.premium }
              : p
          )
        );
      } else {
        setToast({
          type: "error",
          text: result.error ?? `Failed to ${grant ? "grant" : "revoke"} premium`,
        });
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Shell>
      <AdminLayout
        title="🏅 Badge Manager"
        subtitle="Search for a player, then assign or remove badges and premium status."
      >
        {/* Search input */}
        <div className="mb-6">
          <PlayerSearch
            value={query}
            onChange={handleSearch}
            loading={loading}
            placeholder="Search by name or Discord ID…"
          />
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 rounded-2xl border-2 border-red-500/40 bg-red-950/20 px-5 py-4">
            <p className="text-sm font-black text-red-400">⚠️ {error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" label="Searching players…" />
          </div>
        )}

        {/* Empty state — no query */}
        {!loading && !query.trim() && (
          <div className="rounded-3xl border-2 border-white/5 bg-white/[0.02] px-8 py-16 text-center">
            <p className="text-4xl mb-4">🔍</p>
            <p className="font-black text-zinc-400 text-lg">
              Search for a player to get started
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Enter a name or Discord ID (17–19 digit snowflake)
            </p>
          </div>
        )}

        {/* Empty state — query but no results */}
        {!loading && query.trim() && players.length === 0 && !error && (
          <div className="rounded-3xl border-2 border-white/5 bg-white/[0.02] px-8 py-16 text-center">
            <p className="text-4xl mb-4">😶</p>
            <p className="font-black text-zinc-400 text-lg">No players found</p>
            <p className="mt-2 text-sm text-zinc-600">
              Try a different name or Discord ID
            </p>
          </div>
        )}

        {/* Player list */}
        {!loading && players.length > 0 && (
          <div className="rounded-3xl border-2 border-white/8 bg-zinc-900/40 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-white/8 bg-white/[0.02] flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                {players.length} player{players.length !== 1 ? "s" : ""} found
              </p>
              <p className="text-xs text-zinc-600 font-bold">
                Click ➕ to add a badge · Click ✕ on a badge to remove it
              </p>
            </div>

            {/* Rows */}
            {players.map((player) => (
              <PlayerRow
                key={player.user_id}
                player={player}
                onBadgeChange={handleBadgeChange}
                onPremiumChange={handlePremiumChange}
              />
            ))}
          </div>
        )}
      </AdminLayout>

      {/* Toast notification */}
      {toast && (
        <Toast msg={toast} onDismiss={() => setToast(null)} />
      )}
    </Shell>
  );
}
