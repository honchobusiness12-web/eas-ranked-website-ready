"use client";

/**
 * app/admin/components/PremiumToggle.tsx
 *
 * Grant / revoke premium for a selected player.
 * Calls grantPremium / revokePremium server actions.
 */

import { useState } from "react";
import { grantPremium, revokePremium } from "@/lib/admin/actions";

interface Props {
  userId: string;
  playerName: string;
  /** Whether the player currently has premium */
  hasPremium: boolean;
  premiumExpiresAt: string | null;
  onSuccess: (msg: string, premium: boolean) => void;
  onError: (msg: string) => void;
}

export default function PremiumToggle({
  userId,
  playerName,
  hasPremium,
  premiumExpiresAt,
  onSuccess,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleGrant() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await grantPremium(userId);
      if (result.success) {
        onSuccess(`⭐ Premium granted to ${playerName}`, true);
      } else {
        onError(result.error ?? "Failed to grant premium.");
      }
    } catch {
      onError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await revokePremium(userId);
      if (result.success) {
        onSuccess(`🗑️ Premium revoked from ${playerName}`, false);
      } else {
        onError(result.error ?? "Failed to revoke premium.");
      }
    } catch {
      onError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const isExpired =
    premiumExpiresAt && new Date(premiumExpiresAt) <= new Date();
  const effectivePremium = hasPremium && !isExpired;

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        border: effectivePremium
          ? "2px solid rgba(234,179,8,0.30)"
          : "2px solid rgba(255,255,255,0.08)",
        background: effectivePremium
          ? "linear-gradient(135deg, rgba(234,179,8,0.06), rgba(0,0,0,0.60))"
          : "rgba(255,255,255,0.01)",
      }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/8 bg-white/[0.02] flex items-center justify-between">
        <div>
          <p className="font-black text-sm text-zinc-300">⭐ Premium Status</p>
          <p className="text-[11px] font-bold mt-0.5">
            {effectivePremium ? (
              <span className="text-yellow-400">Active</span>
            ) : (
              <span className="text-zinc-500">Not active</span>
            )}
          </p>
        </div>
        {effectivePremium && (
          <span className="text-2xl" style={{ filter: "drop-shadow(0 0 8px rgba(234,179,8,0.60))" }}>
            ⭐
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {premiumExpiresAt && (
          <p className="text-xs font-bold text-zinc-500 text-center">
            {isExpired ? (
              <>
                Expired:{" "}
                <span className="text-red-400">
                  {new Date(premiumExpiresAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </>
            ) : (
              <>
                Expires:{" "}
                <span className="text-yellow-400">
                  {new Date(premiumExpiresAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </>
            )}
          </p>
        )}

        {effectivePremium ? (
          <button
            onClick={handleRevoke}
            disabled={loading}
            className="w-full rounded-2xl border-2 border-red-700/50 bg-red-950/20 px-4 py-3 text-sm font-black text-red-400 hover:bg-red-500/20 hover:border-red-400 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-spin inline-block">⟳</span>
            ) : (
              "🗑️ Revoke Premium"
            )}
          </button>
        ) : (
          <button
            onClick={handleGrant}
            disabled={loading}
            className="w-full rounded-2xl border-2 border-yellow-600/50 bg-yellow-950/20 px-4 py-3 text-sm font-black text-yellow-300 hover:bg-yellow-500/20 hover:border-yellow-400 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-spin inline-block">⟳</span>
            ) : (
              "⭐ Grant Premium (1 Year)"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
