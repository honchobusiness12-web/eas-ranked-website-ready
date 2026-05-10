"use client";

import { useState } from "react";
import { grantPremiumAction, revokePremiumAction, type PremiumInfo } from "@/app/admin/actions";
import type { ToastMessage } from "./Toast";

interface PremiumToggleProps {
  userId: string;
  playerName: string;
  premium: PremiumInfo;
  onPremiumChange: (premium: PremiumInfo) => void;
  onToast: (msg: ToastMessage) => void;
}

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const SOURCE_LABELS: Record<string, string> = {
  developer: "👑 Developer",
  subscription: "💳 Subscription",
  giveaway_code: "🎁 Manual Grant",
  discord_role: "🎮 Discord Role",
};

export default function PremiumToggle({
  userId,
  playerName,
  premium,
  onPremiumChange,
  onToast,
}: PremiumToggleProps) {
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [customExpiry, setCustomExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  async function handleGrant() {
    setGranting(true);
    try {
      const result = await grantPremiumAction(
        userId,
        customExpiry ? new Date(expiryDate).toISOString() : undefined
      );
      if (result.success && result.premium) {
        onPremiumChange(result.premium);
        onToast({
          type: "success",
          text: `⭐ Premium granted to ${playerName}. Expires: ${fmt(result.premium.expiresAt)}`,
        });
      } else {
        onToast({ type: "error", text: result.error ?? "Failed to grant premium" });
      }
    } finally {
      setGranting(false);
    }
  }

  async function handleRevoke() {
    setRevoking(true);
    try {
      const result = await revokePremiumAction(userId);
      if (result.success && result.premium) {
        onPremiumChange(result.premium);
        onToast({
          type: "success",
          text: `Premium revoked from ${playerName}`,
        });
      } else {
        onToast({ type: "error", text: result.error ?? "Failed to revoke premium" });
      }
    } finally {
      setRevoking(false);
    }
  }

  const isManualGrant =
    premium.source === "giveaway_code" &&
    !!premium.expiresAt &&
    new Date(premium.expiresAt) > new Date();

  return (
    <div className="space-y-3">
      <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Premium Status</p>

      {/* Current status */}
      <div
        className={`rounded-xl border px-4 py-3 ${
          premium.premium
            ? "border-yellow-700/40 bg-yellow-950/20"
            : "border-white/8 bg-white/[0.02]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className={`text-sm font-black ${
                premium.premium ? "text-yellow-300" : "text-zinc-500"
              }`}
            >
              {premium.premium ? "⭐ Premium Active" : "— No Premium"}
            </p>
            {premium.source && (
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {SOURCE_LABELS[premium.source] ?? premium.source}
              </p>
            )}
            {premium.expiresAt && (
              <p className="text-[10px] text-zinc-600 mt-0.5">
                Expires: {fmt(premium.expiresAt)}
              </p>
            )}
          </div>
          <span
            className={`text-2xl ${premium.premium ? "opacity-100" : "opacity-20"}`}
          >
            💎
          </span>
        </div>
      </div>

      {/* Grant section */}
      {!premium.premium && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={customExpiry}
              onChange={(e) => setCustomExpiry(e.target.checked)}
              className="rounded"
            />
            Set custom expiry date
          </label>
          {customExpiry && (
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-yellow-600/50 focus:outline-none"
            />
          )}
          <button
            onClick={handleGrant}
            disabled={granting}
            className="w-full rounded-xl border border-yellow-700/40 bg-yellow-950/20 py-2.5 text-sm font-black text-yellow-300 hover:bg-yellow-950/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {granting ? "⟳ Granting…" : "⭐ Grant Premium"}
          </button>
        </div>
      )}

      {/* Revoke section — only for manual grants */}
      {premium.premium && isManualGrant && (
        <button
          onClick={handleRevoke}
          disabled={revoking}
          className="w-full rounded-xl border border-red-700/40 bg-red-950/20 py-2.5 text-sm font-black text-red-400 hover:bg-red-950/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {revoking ? "⟳ Revoking…" : "✕ Revoke Manual Grant"}
        </button>
      )}

      {premium.premium && !isManualGrant && (
        <p className="text-[11px] text-zinc-600 text-center">
          Premium via {SOURCE_LABELS[premium.source ?? ""] ?? premium.source} — cannot revoke here
        </p>
      )}
    </div>
  );
}
