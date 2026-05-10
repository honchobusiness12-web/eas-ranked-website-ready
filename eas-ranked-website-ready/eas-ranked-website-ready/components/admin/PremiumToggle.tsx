"use client";

import { useTransition } from "react";
import { grantPremiumAction, revokePremiumAction } from "@/lib/admin-actions";
import type { PlayerData } from "@/lib/admin-actions";

interface Props {
  player: PlayerData;
  onPlayerChange: (player: PlayerData) => void;
  onToast: (type: "success" | "error", text: string) => void;
}

export default function PremiumToggle({ player, onPlayerChange, onToast }: Props) {
  const [isPending, startTransition] = useTransition();

  const isPremiumActive =
    player.premium ||
    (player.premium_expires_at != null &&
      new Date(player.premium_expires_at) > new Date());

  function handleGrant() {
    startTransition(async () => {
      const res = await grantPremiumAction(player.user_id);
      if (res.success) {
        onPlayerChange({ ...player, premium: true });
        onToast("success", "💎 Premium granted (1 year)");
      } else {
        onToast("error", res.error ?? "Failed to grant premium");
      }
    });
  }

  function handleRevoke() {
    startTransition(async () => {
      const res = await revokePremiumAction(player.user_id);
      if (res.success) {
        onPlayerChange({ ...player, premium: false, premium_expires_at: null });
        onToast("success", "Premium revoked");
      } else {
        onToast("error", res.error ?? "Failed to revoke premium");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 space-y-4">
      <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
        💎 Premium Status
      </p>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">
            {isPremiumActive ? "Active" : "Inactive"}
          </p>
          {player.premium_expires_at && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Expires: {new Date(player.premium_expires_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <span
          className={`rounded-lg px-3 py-1 text-xs font-black ${
            isPremiumActive
              ? "bg-yellow-950/30 border border-yellow-700/30 text-yellow-400"
              : "bg-zinc-900 border border-white/5 text-zinc-500"
          }`}
        >
          {isPremiumActive ? "💎 PREMIUM" : "FREE"}
        </span>
      </div>

      {isPremiumActive ? (
        <button
          onClick={handleRevoke}
          disabled={isPending}
          className="w-full rounded-xl border border-red-700/40 bg-red-950/20 px-4 py-2.5 text-sm font-black text-red-300 hover:bg-red-950/40 transition disabled:opacity-50"
        >
          {isPending ? "Processing…" : "🚫 Revoke Premium"}
        </button>
      ) : (
        <button
          onClick={handleGrant}
          disabled={isPending}
          className="w-full rounded-xl border border-yellow-700/40 bg-yellow-950/20 px-4 py-2.5 text-sm font-black text-yellow-300 hover:bg-yellow-950/40 transition disabled:opacity-50"
        >
          {isPending ? "Processing…" : "💎 Grant Premium (1 Year)"}
        </button>
      )}
    </div>
  );
}
