"use client";

import { useState } from "react";
import {
  grantPremiumAction,
  revokePremiumAction,
  searchPlayers,
} from "@/lib/admin/actions";
import type { PlayerSearchResult } from "@/lib/admin/actions";
import type { ToastMessage } from "@/components/admin/Toast";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

interface PremiumToggleProps {
  player: PlayerSearchResult;
  onPremiumChanged: (premium: boolean) => void;
  onToast: (toast: ToastMessage) => void;
}

/**
 * Grant / revoke premium for a player.
 * Always waits for the server response before updating state.
 * On error, reloads the player from the server to restore correct state.
 */
export default function PremiumToggle({
  player,
  onPremiumChanged,
  onToast,
}: PremiumToggleProps) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (loading) return;
    setLoading(true);

    const grant = !player.premium;

    try {
      if (grant) {
        const result = await grantPremiumAction(player.user_id);

        if (result.success && result.data) {
          onPremiumChanged(result.data.premium);
          onToast({
            type: "success",
            message: `⭐ Premium granted to ${player.name}`,
          });
        } else {
          onToast({
            type: "error",
            message: result.error ?? "Failed to grant premium",
          });
          await reloadPlayer();
        }
      } else {
        const result = await revokePremiumAction(player.user_id);

        if (result.success) {
          onPremiumChanged(false);
          onToast({
            type: "success",
            message: `Premium revoked from ${player.name}`,
          });
        } else {
          onToast({
            type: "error",
            message: result.error ?? "Failed to revoke premium",
          });
          await reloadPlayer();
        }
      }
    } catch {
      onToast({ type: "error", message: "An unexpected error occurred" });
      await reloadPlayer();
    } finally {
      setLoading(false);
    }
  }

  async function reloadPlayer() {
    try {
      const result = await searchPlayers(player.user_id);
      const fresh = result.data?.[0];
      if (fresh) {
        onPremiumChanged(fresh.premium);
      }
    } catch {
      // Best-effort reload
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={player.premium ? "Revoke premium" : "Grant premium"}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black border-2 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
        player.premium
          ? "border-yellow-500/60 bg-yellow-950/30 text-yellow-300 hover:bg-red-950/30 hover:border-red-500/60 hover:text-red-300"
          : "border-zinc-700/60 bg-zinc-900/30 text-zinc-400 hover:bg-yellow-950/30 hover:border-yellow-500/60 hover:text-yellow-300"
      }`}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : player.premium ? (
        <>
          <span>⭐</span>
          <span>Premium — Click to Revoke</span>
        </>
      ) : (
        <>
          <span>—</span>
          <span>No Premium — Click to Grant</span>
        </>
      )}
    </button>
  );
}
