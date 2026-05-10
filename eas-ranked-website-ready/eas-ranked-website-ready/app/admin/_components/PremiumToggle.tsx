"use client";

import { useState, useTransition } from "react";
import { grantPremiumAction, revokePremiumAction } from "../_actions";

interface Props {
  userId: string;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  onPremiumChange: (isPremium: boolean, expiresAt: string | null) => void;
  onToast: (type: "success" | "error", message: string) => void;
}

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDateInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function PremiumToggle({
  userId,
  isPremium,
  premiumExpiresAt,
  onPremiumChange,
  onToast,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [customExpiry, setCustomExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState(
    fmtDateInput(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
  );

  const manualGrantActive =
    !!premiumExpiresAt && new Date(premiumExpiresAt) > new Date();

  function handleGrant() {
    startTransition(async () => {
      const expiresAt = customExpiry
        ? new Date(expiryDate).toISOString()
        : undefined;
      const result = await grantPremiumAction(userId, expiresAt);
      if (result.success) {
        const newExpiry = customExpiry
          ? new Date(expiryDate).toISOString()
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        onPremiumChange(true, newExpiry);
        onToast("success", `✅ Premium granted. Expires: ${fmt(newExpiry)}`);
      } else {
        onToast("error", result.error ?? "Failed to grant premium.");
      }
    });
  }

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokePremiumAction(userId);
      if (result.success) {
        onPremiumChange(false, null);
        onToast("success", "✅ Manual premium revoked.");
      } else {
        onToast("error", result.error ?? "Failed to revoke premium.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
        💎 Premium
      </p>

      {/* Status */}
      <div className="flex items-center gap-2">
        {isPremium ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-700/40 bg-yellow-950/30 px-2.5 py-1 text-xs font-black text-yellow-300">
            ⭐ Premium Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-black text-zinc-500">
            — No Premium
          </span>
        )}
        {premiumExpiresAt && (
          <span className="text-[10px] text-zinc-600">
            Expires {fmt(premiumExpiresAt)}
          </span>
        )}
      </div>

      {/* Grant controls */}
      {!manualGrantActive && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={customExpiry}
              onChange={(e) => setCustomExpiry(e.target.checked)}
              className="rounded"
            />
            Custom expiry date
          </label>
          {customExpiry && (
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              min={fmtDateInput(new Date())}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-yellow-600/50 focus:outline-none"
            />
          )}
          <button
            onClick={handleGrant}
            disabled={isPending}
            className="w-full rounded-xl border border-yellow-700/40 bg-yellow-950/20 px-4 py-2 text-xs font-black text-yellow-300 hover:bg-yellow-950/40 transition disabled:opacity-50"
          >
            {isPending ? "Processing…" : "⭐ Grant Premium"}
          </button>
        </div>
      )}

      {/* Revoke control */}
      {manualGrantActive && (
        <button
          onClick={handleRevoke}
          disabled={isPending}
          className="w-full rounded-xl border border-red-700/40 bg-red-950/20 px-4 py-2 text-xs font-black text-red-300 hover:bg-red-950/40 transition disabled:opacity-50"
        >
          {isPending ? "Processing…" : "✕ Revoke Manual Grant"}
        </button>
      )}
    </div>
  );
}
